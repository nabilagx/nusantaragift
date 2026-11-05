import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login ulang." }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role_id").eq("id", user.id).maybeSingle();
  if (profile?.role_id !== "umkm") return NextResponse.json({ error: "Akses khusus UMKM." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber : "";
  const status = body.status === "processing" || body.status === "shipped" ? body.status : "";
  const courier = typeof body.courier === "string" ? body.courier.trim().slice(0, 60) : "";
  const trackingNumber = typeof body.trackingNumber === "string" ? body.trackingNumber.trim().slice(0, 100) : "";
  if (!orderNumber || !status || (status === "shipped" && (!courier || !trackingNumber))) {
    return NextResponse.json({ error: "Data status atau nomor resi belum lengkap." }, { status: 400 });
  }
  const { data, error } = await supabase.rpc("seller_update_order_status", {
    p_order_number: orderNumber, p_status: status, p_courier: courier || null, p_tracking_number: trackingNumber || null,
  });
  if (error) {
    console.error("Seller order status:", error);
    return NextResponse.json({ error: error.message || "Status pesanan gagal diperbarui." }, { status: error.message.includes("SELLER_ONLY") ? 403 : 400 });
  }
  return NextResponse.json({ result: data });
}
