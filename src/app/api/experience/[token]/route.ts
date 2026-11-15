import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: Context) {
  const { token } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ error: "QR Gift Card tidak valid." }, { status: 404 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login dengan email penerima untuk membuka cerita." }, { status: 401 });

  const admin = createAdminClient();
  const { data: access, error: accessError } = await admin.from("story_gift_access")
    .select("order_id,recipient_user_id,recipient_email,expires_at")
    .eq("access_token", token).maybeSingle();
  if (accessError || !access) return NextResponse.json({ error: "QR Gift Card tidak ditemukan." }, { status: 404 });

  const verifiedEmail = Boolean(user.email_confirmed_at);
  const normalizedUserEmail = String(user.email ?? "").trim().toLowerCase();
  const normalizedRecipientEmail = String(access.recipient_email ?? "").trim().toLowerCase();

  const { data: recipientProfile, error: profileError } = await supabase.from("profiles")
    .select("role_id").eq("id", user.id).maybeSingle();

  if (profileError) {
    console.error("[experience] recipient profile lookup failed", {
      code: profileError.code ?? "unknown",
      message: profileError.message,
      hasUser: true,
      hasVerifiedEmail: verifiedEmail,
    });
    return NextResponse.json({ error: "Sistem belum dapat memverifikasi akun penerima. Silakan coba lagi nanti." }, { status: 500 });
  }

  const isCustomer = recipientProfile?.role_id === "customer";
  const hasRecipientEmail = Boolean(normalizedRecipientEmail);
  const emailMatches = hasRecipientEmail && normalizedRecipientEmail === normalizedUserEmail;
  if (!verifiedEmail || !isCustomer || !emailMatches) {
    console.info("[experience] recipient access denied", {
      verifiedEmail,
      isCustomer,
      hasRecipientEmail,
      emailMatches,
    });
    return NextResponse.json({
      error: !verifiedEmail
        ? "Email akun ini belum diverifikasi. Verifikasi email akun terlebih dahulu."
        : !isCustomer
          ? "Akses cerita digital hanya tersedia untuk akun Customer."
          : "Akun yang sedang digunakan bukan akun dengan email penerima hadiah ini.",
    }, { status: 403 });
  }
  if (new Date(access.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "Masa akses cerita sudah berakhir. QR berlaku selama 7 hari sejak pembayaran." }, { status: 410 });

  const { data: order, error: orderError } = await admin.from("orders")
    .select("order_number,payment_status,gift_card_design,recipient_name,recipient_email")
    .eq("id", access.order_id).maybeSingle();
  if (orderError || !order || order.payment_status !== "paid") return NextResponse.json({ error: "Pembayaran atau akses cerita belum aktif." }, { status: 409 });

  const { data: items, error: itemsError } = await admin.from("order_items")
    .select("product_id,product_name").eq("order_id", access.order_id);
  if (itemsError || !items?.length) return NextResponse.json({ error: "Cerita dalam pesanan tidak ditemukan." }, { status: 404 });

  const productIds = [...new Set(items.map(item => item.product_id).filter((id): id is string => Boolean(id)))];
  if (!productIds.length) return NextResponse.json({ error: "Produk cerita dalam pesanan tidak ditemukan." }, { status: 404 });

  // Query products and story pages separately. This avoids relying on a nested
  // PostgREST relationship embed, which can fail when its schema cache is stale.
  const { data: products, error: productsError } = await admin.from("products")
    .select("id,slug,name,description")
    .in("id", productIds)
    .eq("delivery_type", "digital-audio");

  if (productsError) {
    console.error("[experience] product lookup failed", {
      code: productsError.code ?? "unknown",
      message: productsError.message,
      productCount: productIds.length,
    });
    return NextResponse.json({ error: "Gagal memuat produk cerita. Silakan coba lagi nanti." }, { status: 500 });
  }
  if (!products?.length) {
    console.warn("[experience] no digital story products matched order", {
      productCount: productIds.length,
    });
    return NextResponse.json({ error: "Produk cerita pada pesanan tidak tersedia." }, { status: 404 });
  }

  const matchedProductIds = products.map(product => product.id);
  const { data: storyPages, error: storyPagesError } = await admin.from("story_pages")
    .select("id,product_id,page_number,page_title,body,illustration_url,audio_url,audio_duration_seconds")
    .in("product_id", matchedProductIds)
    .order("page_number", { ascending: true });

  if (storyPagesError) {
    console.error("[experience] story pages lookup failed", {
      code: storyPagesError.code ?? "unknown",
      message: storyPagesError.message,
      productCount: matchedProductIds.length,
    });
    return NextResponse.json({ error: "Gagal memuat halaman cerita. Silakan coba lagi nanti." }, { status: 500 });
  }
  if (!storyPages?.length) {
    console.warn("[experience] no story pages found for matched products", {
      productCount: matchedProductIds.length,
    });
    return NextResponse.json({ error: "Konten cerita belum tersedia." }, { status: 404 });
  }

  const stories = await Promise.all(products.map(async product => {
    const pages = await Promise.all(storyPages
      .filter(page => page.product_id === product.id)
      .map(async page => {
        const audio = page.audio_url
          ? await admin.storage.from("story-media").createSignedUrl(page.audio_url, 3600)
          : null;
        return {
          id: page.id,
          pageNumber: page.page_number,
          title: page.page_title,
          body: page.body,
          imageUrl: page.illustration_url,
          audioUrl: audio?.data?.signedUrl ?? "",
          duration: page.audio_duration_seconds,
        };
      }));
    return { slug: product.slug, title: product.name, description: product.description ?? "", pages };
  }));

  return NextResponse.json({
    orderNumber: order.order_number,
    expiresAt: access.expires_at,
    giftCardDesign: order.gift_card_design,
    recipientName: order.recipient_name,
    stories,
  });
}
