import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Context = { params: Promise<{ slug: string }> };
export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login dengan akun penerima untuk membaca cerita." }, { status: 401 });
  const token = new URL(_request.url).searchParams.get("access");
  if (!token) return NextResponse.json({ error: "Cerita hanya dapat dibuka melalui QR Gift Card yang aktif." }, { status: 403 });
  const admin = createAdminClient();
  const { data: access } = await admin.from("story_gift_access").select("order_id,recipient_user_id,recipient_email,expires_at").eq("access_token", token).maybeSingle();
  if (!access || access.recipient_user_id !== user.id || String(access.recipient_email).toLowerCase() !== String(user.email ?? "").toLowerCase()) return NextResponse.json({ error: "QR ini bukan untuk akun penerima ini." }, { status: 403 });
  if (new Date(access.expires_at).getTime() <= Date.now()) return NextResponse.json({ error: "Masa akses cerita sudah berakhir." }, { status: 410 });
  const { data: story, error } = await admin.from("products")
    .select("id,slug,name,description,price,stock,metadata,created_at")
    .eq("slug", slug).eq("delivery_type", "digital-audio").eq("status", "active").maybeSingle();
  if (error || !story) return NextResponse.json({ error: "Cerita tidak ditemukan atau belum dipublikasikan." }, { status: 404 });
  const { data: purchased } = await admin.from("order_items").select("id").eq("order_id", access.order_id).eq("product_id", story.id).maybeSingle();
  if (!purchased) return NextResponse.json({ error: "Cerita ini tidak termasuk dalam Gift Card." }, { status: 403 });
  const { data: pages, error: pageError } = await admin.from("story_pages")
    .select("id,page_number,page_title,body,illustration_url,audio_url,audio_duration_seconds")
    .eq("product_id", story.id).order("page_number", { ascending: true });
  if (pageError || !pages?.length) return NextResponse.json({ error: "Halaman cerita belum tersedia." }, { status: 404 });
  const signedPages = await Promise.all(pages.map(async (page) => {
    const audio = await admin.storage.from("story-media").createSignedUrl(page.audio_url, 3600);
    if (!audio.data?.signedUrl) throw new Error("Audio cerita tidak dapat diakses.");
    return { id: page.id, pageNumber: page.page_number, title: page.page_title, body: page.body, imageUrl: page.illustration_url, audioUrl: audio.data.signedUrl, duration: page.audio_duration_seconds };
  }));
  return NextResponse.json({ story: { slug: story.slug, title: story.name, description: story.description ?? "", price: Number(story.price ?? 0), stock: Number(story.stock ?? 0), category: String((story.metadata as Record<string, unknown> | null)?.story_category ?? "budaya"), pages: signedPages } });
}
