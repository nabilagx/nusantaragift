import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CheckoutPayload = {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  giftCardType?: "none" | "plain" | "special" | "luxury";
  giftRecipient?: string;
  giftSender?: string;
  giftMessage?: string;
  paymentMethod?: "qris" | "va" | "bank";
  items?: { productId: string; quantity: number }[];
  giftCardDesign?: Record<string, unknown> | null;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Silakan login sebagai pelanggan untuk membuat pesanan." }, { status: 401 });
    }

    const payload = (await request.json()) as CheckoutPayload;
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      return NextResponse.json({ error: "Keranjang masih kosong." }, { status: 400 });
    }
    if (payload.items.some((item) => !item || typeof item.productId !== "string" ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)) {
      return NextResponse.json({ error: "Data produk atau jumlah pesanan tidak valid." }, { status: 400 });
    }

    const { data, error } = await supabase.rpc("create_demo_order", {
      p_payload: {
        name: payload.name,
        phone: payload.phone,
        email: payload.email,
        address: payload.address,
        notes: payload.notes,
        giftCardType: payload.giftCardType ?? "none",
        giftRecipient: payload.giftRecipient,
        giftSender: payload.giftSender,
        giftMessage: payload.giftMessage,
        paymentMethod: payload.paymentMethod ?? "qris",
        items: payload.items,
        giftCardDesign: payload.giftCardDesign ?? null,
      },
    });

    if (error) {
      const message = error.message || "Pesanan gagal dibuat.";
      const status = message.includes("AUTH_REQUIRED") || message.includes("CUSTOMER_ONLY") ? 403
        : message.includes("UNAVAILABLE") || message.includes("STOCK") ? 409 : 400;
      return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ order: data }, { status: 201 });
  } catch (error) {
    console.error("Checkout API error:", error);
    return NextResponse.json({ error: "Terjadi kesalahan saat membuat pesanan." }, { status: 500 });
  }
}
