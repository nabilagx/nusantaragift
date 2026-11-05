import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role_id").eq("id", user.id).single();
  if (profile?.role_id !== "admin") return NextResponse.json({ error: "Akses khusus admin." }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = body.status;
  if (status !== "active" && status !== "rejected") return NextResponse.json({ error: "Keputusan moderasi tidak valid." }, { status: 400 });
  const note = typeof body.note === "string" ? body.note.trim().slice(0,500) : null;
  const { data, error } = await supabase.from("products").update({
    status,
    moderation_note: status === "rejected" ? note || "Perlu perbaikan sebelum diterbitkan." : null,
    updated_at: new Date().toISOString(),
  }).eq("id",id).eq("status","pending_review").select("id,name,status").maybeSingle();
  if (error) return NextResponse.json({ error: "Gagal memperbarui status produk." }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Produk tidak ditemukan atau sudah ditinjau." }, { status: 404 });
  return NextResponse.json({ product: data });
}
