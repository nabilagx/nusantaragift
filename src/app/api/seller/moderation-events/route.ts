import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login." }, { status: 401 });
  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (profileError) return NextResponse.json({ error: "Role gagal diverifikasi." }, { status: 500 });
  if (profile?.role_id !== "umkm") return NextResponse.json({ error: "Akses khusus UMKM." }, { status: 403 });

  const { data, error } = await supabase.from("product_moderation_events")
    .select("id,product_id,action,reason,previous_status,new_status,created_at,products(name,slug)")
    .order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Histori moderasi gagal dimuat." }, { status: 500 });
  const events = (data ?? []).map((event) => ({ ...event, product_name: Array.isArray(event.products) ? event.products[0]?.name ?? "Produk" : event.products?.name ?? "Produk" }));
  return NextResponse.json({ events });
}
