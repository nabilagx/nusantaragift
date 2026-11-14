import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products")
    .select("id,slug,name,description,metadata,created_at,story_pages(page_number,page_title,body,illustration_url,audio_url,audio_duration_seconds)")
    .eq("delivery_type", "digital-audio").eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Cerita belum dapat dimuat." }, { status: 500 });
  const stories = await Promise.all((data ?? []).map(async (story) => {
    const pages = (story.story_pages ?? []).sort((a, b) => Number(a.page_number) - Number(b.page_number));
    const first = pages[0];
    let cover = "";
    if (first?.illustration_url) {
      const signed = await supabase.storage.from("story-media").createSignedUrl(first.illustration_url, 3600);
      cover = signed.data?.signedUrl ?? "";
    }
    return { id: story.id, slug: story.slug, title: story.name, description: story.description ?? "", category: String((story.metadata as Record<string, unknown> | null)?.story_category ?? "budaya"), pageCount: pages.length, cover, createdAt: story.created_at };
  }));
  return NextResponse.json({ stories });
}
