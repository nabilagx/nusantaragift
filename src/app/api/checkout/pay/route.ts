import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createSnapTransaction } from "@/lib/midtrans/config";

export const runtime = "nodejs";

type OrderRow = {
  id: string;
  order_number: string;
  recipient_name: string;
  recipient_email: string | null;
  recipient_phone: string;
  subtotal: number | string;
  shipping_cost: number | string;
  gift_card_fee: number | string;
  total_amount: number | string;
  shipping_quote_status: string;
  payment_status: string;
  shipping_address: Record<string, unknown> | null;
};

type OrderItemRow = {
  product_name: string;
  unit_price: number | string;
  quantity: number;
  line_total: number | string;
};

function amount(value: number | string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error("Nominal pesanan tidak valid untuk pembayaran.");
  }
  return parsed;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Silakan login kembali." }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const orderNumber = typeof body.orderNumber === "string" ? body.orderNumber.trim() : "";
    if (!orderNumber || orderNumber.length > 40) {
      return NextResponse.json({ error: "Nomor pesanan tidak valid." }, { status: 400 });
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,order_number,recipient_name,recipient_email,recipient_phone,subtotal,shipping_cost,gift_card_fee,total_amount,shipping_quote_status,payment_status,shipping_address")
      .eq("order_number", orderNumber)
      .eq("buyer_id", user.id)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });

    const typedOrder = order as OrderRow;
    if (typedOrder.payment_status !== "pending") {
      return NextResponse.json({ error: "Pesanan ini tidak lagi menunggu pembayaran." }, { status: 409 });
    }
    if (typedOrder.shipping_quote_status !== "quoted") {
      return NextResponse.json({ error: "Pembayaran tersedia setelah admin menetapkan ongkos kirim." }, { status: 409 });
    }

    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("product_name,unit_price,quantity,line_total")
      .eq("order_id", typedOrder.id);
    if (itemsError) throw itemsError;
    const orderItems = (items ?? []) as OrderItemRow[];
    if (!orderItems.length) {
      return NextResponse.json({ error: "Item pesanan tidak ditemukan." }, { status: 409 });
    }

    const total = amount(typedOrder.total_amount);
    const itemDetails = orderItems.map((item) => ({
      id: item.product_name.slice(0, 50),
      price: amount(item.unit_price),
      quantity: item.quantity,
      name: item.product_name.slice(0, 50),
    }));

    const shipping = amount(typedOrder.shipping_cost);
    const giftCardFee = amount(typedOrder.gift_card_fee);
    if (shipping > 0) itemDetails.push({ id: "SHIPPING", price: shipping, quantity: 1, name: "Ongkos kirim" });
    if (giftCardFee > 0) itemDetails.push({ id: "GIFT-CARD", price: giftCardFee, quantity: 1, name: "Gift Card" });

    const itemTotal = itemDetails.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (itemTotal !== total) {
      return NextResponse.json({ error: "Total item tidak cocok dengan total pesanan. Hubungi admin sebelum membayar." }, { status: 409 });
    }

    const providerOrderId = `${typedOrder.order_number}-${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
    const siteOrigin = new URL(request.url).origin;
    const snap = await createSnapTransaction({
      transaction_details: { order_id: providerOrderId, gross_amount: total },
      item_details: itemDetails,
      customer_details: {
        first_name: typedOrder.recipient_name.slice(0, 50),
        email: typedOrder.recipient_email || user.email || undefined,
        phone: typedOrder.recipient_phone,
      },
      callbacks: {
        finish: `${siteOrigin}/checkout/payment/${encodeURIComponent(orderNumber)}?payment=finish`,
      },
    });

    const { data: savedPayment, error: saveError } = await supabase.rpc("record_midtrans_payment", {
      p_order_number: orderNumber,
      p_provider_order_id: providerOrderId,
      p_payment_url: snap.redirect_url,
      p_amount: total,
    });
    if (saveError) {
      console.error("Failed to save Midtrans payment reference:", saveError.message);
      return NextResponse.json({ error: "Transaksi berhasil dibuat, tetapi data pembayaran belum tersimpan. Hubungi admin sebelum mencoba lagi." }, { status: 500 });
    }

    return NextResponse.json({ payment: savedPayment });
  } catch (error) {
    console.error("Midtrans checkout error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Gagal memulai pembayaran Midtrans.",
    }, { status: 500 });
  }
}
