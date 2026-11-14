import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMidtransConfig } from "@/lib/midtrans/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MidtransNotification = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_id?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
};

function isValidSignature(body: MidtransNotification, serverKey: string) {
  if (!body.order_id || !body.status_code || !body.gross_amount || !body.signature_key) return false;
  const expected = createHash("sha512")
    .update(`${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`)
    .digest();
  let received: Buffer;
  try {
    received = Buffer.from(body.signature_key, "hex");
  } catch {
    return false;
  }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: Request) {
  try {
    const notification = (await request.json()) as MidtransNotification;
    const { serverKey, isProduction } = getMidtransConfig();

    if (!isValidSignature(notification, serverKey)) {
      return NextResponse.json({ error: "Invalid notification signature." }, { status: 401 });
    }

    const grossAmount = Number(notification.gross_amount);
    if (!Number.isFinite(grossAmount) || grossAmount < 0) {
      return NextResponse.json({ error: "Invalid gross amount." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc("apply_midtrans_notification", {
      p_provider_order_id: notification.order_id,
      p_transaction_id: notification.transaction_id ?? null,
      p_transaction_status: notification.transaction_status ?? "",
      p_fraud_status: notification.fraud_status ?? null,
      p_status_code: notification.status_code ?? "",
      p_gross_amount: grossAmount,
      p_payment_type: notification.payment_type ?? null,
      p_raw_response: {
        transaction_status: notification.transaction_status ?? null,
        status_code: notification.status_code ?? null,
        payment_type: notification.payment_type ?? null,
        fraud_status: notification.fraud_status ?? null,
        environment: isProduction ? "production" : "sandbox",
      },
    });

    if (error) {
      console.error("Midtrans notification database error:", error.message);
      return NextResponse.json({ error: "Notification could not be processed." }, { status: 500 });
    }

    return NextResponse.json({ received: true, result: data });
  } catch (error) {
    console.error("Midtrans notification error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Invalid notification payload." }, { status: 400 });
  }
}
