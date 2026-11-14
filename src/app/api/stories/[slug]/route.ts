import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ slug: string }> };
export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: story, error } = await supabase.from("products")
    .select("id,slug,name,description,price,stock,metadata,created_at")
    .eq("slug", slug).eq("delivery_type", "digital-audio").eq("status", "active").maybeSingle();
  if (error || !story) return NextResponse.json({ error: "Cerita tidak ditemukan atau belum dipublikasikan." }, { status: 404 });
  const { data: pages, error: pageError } = await supabase.from("story_pages")
    .select("id,page_number,page_title,body,illustration_url,audio_url,audio_duration_seconds")
    .eq("product_id", story.id).order("page_number", { ascending: true });
  if (pageError || !pages?.length) return NextResponse.json({ error: "Halaman cerita belum tersedia." }, { status: 404 });
  const signedPages = await Promise.all(pages.map(async (page) => {
    const audio = await supabase.storage.from("story-media").createSignedUrl(page.audio_url, 3600);
    if (!audio.data?.signedUrl) throw new Error("Audio cerita tidak dapat diakses.");
    return { id: page.id, pageNumber: page.page_number, title: page.page_title, body: page.body, imageUrl: page.illustration_url, audioUrl: audio.data.signedUrl, duration: page.audio_duration_seconds };
  }));
  return NextResponse.json({ story: { slug: story.slug, title: story.name, description: story.description ?? "", price: Number(story.price ?? 0), stock: Number(story.stock ?? 0), category: String((story.metadata as Record<string, unknown> | null)?.story_category ?? "budaya"), pages: signedPages } });
}
