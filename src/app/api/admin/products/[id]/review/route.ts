import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login." }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: "Role gagal diverifikasi." }, { status: 500 });
  if (profile?.role_id !== "admin") return NextResponse.json({ error: "Akses khusus moderator." }, { status: 403 });

  const { id } = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = body.status;
  if (status !== "active" && status !== "rejected") {
    return NextResponse.json({ error: "Keputusan moderasi tidak valid." }, { status: 400 });
  }
  const reason = typeof body.note === "string" ? body.note.trim() : "";
  const action = status === "active" ? "approve" : "request_revision";
  const finalReason = reason.length >= 10 ? reason.slice(0, 500)
    : status === "active" ? "Produk memenuhi standar kurasi." : "Mohon perbaiki informasi produk sebelum diajukan kembali.";

  const { data, error } = await supabase.rpc("admin_moderate_product", {
    p_product_id: id, p_action: action, p_reason: finalReason,
  });
  if (error) {
    const code = error.message.includes("ADMIN_ONLY") ? 403
      : error.message.includes("PRODUCT_NOT_FOUND") ? 404
      : error.message.includes("NOT_PENDING") ? 409 : 500;
    return NextResponse.json({ error: code === 500 ? "Gagal menyimpan keputusan kurasi." : error.message }, { status: code });
  }
  return NextResponse.json({ product: data });
}
