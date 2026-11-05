import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ orderNumber: string }> };

export async function POST(request: Request, context: Context) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login kembali." }, { status: 401 });

  const { orderNumber } = await context.params;
  const body = await request.json().catch(() => ({}));
  const status = body.status;
  if (status !== "PAID" && status !== "CANCELLED") {
    return NextResponse.json({ error: "Status simulasi tidak valid." }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("update_demo_payment", {
    p_order_number: orderNumber,
    p_status: status,
  });
  if (error) {
    const message = error.message || "Gagal memperbarui pembayaran.";
    const code = message.includes("SHIPPING_NOT_QUOTED") ? 409
      : message.includes("ORDER_NOT_FOUND") ? 404
      : message.includes("AUTH_REQUIRED") ? 401 : 400;
    return NextResponse.json({ error: message }, { status: code });
  }
  return NextResponse.json({ result: data });
}
