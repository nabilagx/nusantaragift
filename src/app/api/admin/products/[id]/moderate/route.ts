import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ id: string }> };
const actions = ["warn", "suspend", "ban", "restore"] as const;

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
  const action = body.action;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!actions.includes(action)) return NextResponse.json({ error: "Tindakan moderasi tidak valid." }, { status: 400 });
  if (reason.length < 10) return NextResponse.json({ error: "Alasan wajib diisi minimal 10 karakter." }, { status: 400 });

  const { data, error } = await supabase.rpc("admin_moderate_product", {
    p_product_id: id, p_action: action, p_reason: reason.slice(0, 500),
  });
  if (error) {
    const status = error.message.includes("ADMIN_ONLY") ? 403
      : error.message.includes("PRODUCT_NOT_FOUND") ? 404
      : error.message.includes("INVALID") || error.message.includes("REQUIRED") || error.message.includes("NOT_PENDING") || error.message.includes("NOT_SUSPENDED") ? 400 : 500;
    return NextResponse.json({ error: status === 500 ? "Tindakan moderasi gagal disimpan." : error.message }, { status });
  }
  return NextResponse.json({ result: data });
}
