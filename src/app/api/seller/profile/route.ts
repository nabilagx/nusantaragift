import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login." }, { status: 401 });

  const { data: role } = await supabase.from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (role?.role_id !== "umkm") return NextResponse.json({ error: "Akses khusus UMKM." }, { status: 403 });

  const { data, error } = await supabase.from("seller_profiles")
    .select("business_name,slug,description,status,created_at")
    .eq("user_id", user.id).maybeSingle();
  if (error) {
    console.error("Seller profile:", error);
    return NextResponse.json({ error: "Gagal memuat profil toko." }, { status: 500 });
  }
  return NextResponse.json({ profile: data });
}
