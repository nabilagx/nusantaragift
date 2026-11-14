import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Pembayaran simulasi telah dinonaktifkan. Gunakan Midtrans." },
    { status: 410 }
  );
}
