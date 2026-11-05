import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login untuk melihat pesanan." }, { status: 401 });

  const { data: orders, error } = await supabase.from("orders")
    .select("id,order_number,recipient_name,subtotal,gift_card_fee,shipping_cost,total_amount,order_status,payment_status,shipping_quote_status,created_at,order_items(product_name,unit_price,quantity,line_total)")
    .eq("buyer_id", user.id).order("created_at",{ascending:false});
  if (error) return NextResponse.json({ error: "Gagal mengambil daftar pesanan." }, { status: 500 });

  return NextResponse.json({ orders: (orders ?? []).map((order) => ({
    orderId: order.order_number,
    name: order.recipient_name,
    total: Number(order.total_amount),
    totalItems: (order.order_items ?? []).reduce((sum,item)=>sum+item.quantity,0),
    paymentStatus: order.payment_status === "paid" ? "PAID" : order.payment_status === "failed" ? "CANCELLED" : order.payment_status.toUpperCase(),
    orderStatus: order.order_status,
    shippingQuoteStatus: order.shipping_quote_status,
    shippingCost: Number(order.shipping_cost),
    createdAt: order.created_at,
    items: (order.order_items ?? []).map((item)=>({title:item.product_name,price:Number(item.unit_price),quantity:item.quantity,subtotal:Number(item.line_total)})),
  })) });
}
