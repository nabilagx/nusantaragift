import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Context = { params: Promise<{ orderNumber: string }> };

export async function GET(_request: Request, context: Context) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Silakan login untuk melihat pesanan." }, { status: 401 });

  const { orderNumber } = await context.params;
  const { data: order, error } = await supabase
    .from("orders")
    .select("id,order_number,recipient_name,recipient_email,recipient_phone,subtotal,shipping_cost,gift_card_fee,total_amount,order_status,payment_status,shipping_quote_status,shipping_courier,tracking_number,payment_method,created_at")
    .eq("order_number", orderNumber)
    .eq("buyer_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Gagal mengambil pesanan." }, { status: 500 });
  if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });

  const { data: items, error: itemError } = await supabase
    .from("order_items")
    .select("product_name,product_image_url,unit_price,quantity,line_total")
    .eq("order_id", order.id);
  if (itemError) return NextResponse.json({ error: "Gagal mengambil item pesanan." }, { status: 500 });

  return NextResponse.json({
    order: {
      id: order.id,
      orderId: order.order_number,
      name: order.recipient_name,
      email: order.recipient_email,
      phone: order.recipient_phone,
      paymentMethod: order.payment_method ?? "qris",
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shipping_cost),
      giftCardPrice: Number(order.gift_card_fee),
      total: Number(order.total_amount),
      shippingQuoteStatus: order.shipping_quote_status,
      paymentStatus: order.payment_status === "paid" ? "PAID" : order.payment_status === "failed" ? "CANCELLED" : order.payment_status.toUpperCase(),
      orderStatus: order.order_status,
      courier: order.shipping_courier,
      trackingNumber: order.tracking_number,
      createdAt: order.created_at,
      items: (items ?? []).map((item) => ({
        title: item.product_name,
        image: item.product_image_url,
        price: Number(item.unit_price),
        quantity: item.quantity,
        subtotal: Number(item.line_total),
      })),
    },
  });
}
