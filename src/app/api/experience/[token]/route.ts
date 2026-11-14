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
  if (access.recipient_user_id !== user.id || String(access.recipient_email).toLowerCase() !== String(user.email ?? "").toLowerCase()) {
    return NextResponse.json({ error: "QR ini hanya dapat dibuka oleh akun email penerima yang dituju." }, { status: 403 });
  }
  if (new Date(access.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "Masa akses cerita sudah berakhir. QR berlaku selama 7 hari sejak pembayaran." }, { status: 410 });

  const { data: order, error: orderError } = await admin.from("orders")
    .select("order_number,payment_status,gift_card_design,recipient_name,recipient_email")
    .eq("id", access.order_id).maybeSingle();
  if (orderError || !order || order.payment_status !== "paid") return NextResponse.json({ error: "Pembayaran atau akses cerita belum aktif." }, { status: 409 });

  const { data: items, error: itemsError } = await admin.from("order_items")
    .select("product_id,product_name").eq("order_id", access.order_id);
  if (itemsError || !items?.length) return NextResponse.json({ error: "Cerita dalam pesanan tidak ditemukan." }, { status: 404 });
  const productIds = items.map(item => item.product_id).filter((id): id is string => Boolean(id));
  const { data: products, error: productsError } = await admin.from("products")
    .select("id,slug,name,description,story_pages(id,page_number,page_title,body,illustration_url,audio_url,audio_duration_seconds)")
    .in("id", productIds).eq("delivery_type", "digital-audio");
  if (productsError || !products?.length) return NextResponse.json({ error: "Konten cerita belum tersedia." }, { status: 404 });

  const stories = await Promise.all(products.map(async product => {
    const pages = await Promise.all((product.story_pages ?? []).sort((a,b)=>a.page_number-b.page_number).map(async page => {
      const audio = await admin.storage.from("story-media").createSignedUrl(page.audio_url, 3600);
      return { id: page.id, pageNumber: page.page_number, title: page.page_title, body: page.body, imageUrl: page.illustration_url, audioUrl: audio.data?.signedUrl ?? "", duration: page.audio_duration_seconds };
    }));
    return { slug: product.slug, title: product.name, description: product.description ?? "", pages };
  }));
  return NextResponse.json({ orderNumber: order.order_number, expiresAt: access.expires_at, giftCardDesign: order.gift_card_design, recipientName: order.recipient_name, stories });
}
