import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber : "";
  const shippingCost = Number(body.shippingCost);
  if (!orderNumber || !Number.isSafeInteger(shippingCost) || shippingCost < 0) {
    return NextResponse.json({ error: "Nomor pesanan atau ongkir tidak valid." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("set_order_shipping_quote", {
    p_order_number: orderNumber,
    p_shipping_cost: shippingCost,
  });
  if (error) {
    const message = error.message || "Gagal menetapkan ongkir.";
    const status = message.includes("ADMIN_ONLY") ? 403 : message.includes("ORDER_NOT_FOUND") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
  return NextResponse.json({ result: data });
}
