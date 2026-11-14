type MidtransConfig = {
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
  snapApiBaseUrl: string;
};

export function getMidtransConfig(): MidtransConfig {
  const serverKey = process.env.MIDTRANS_SERVER_KEY?.trim();
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim();
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum diatur.");
  }

  if (!clientKey) {
    throw new Error("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY belum diatur.");
  }

  // Cegah key dari environment yang salah tertukar tanpa sengaja.
  if (!isProduction && !serverKey.startsWith("SB-Mid-server-")) {
    throw new Error("Gunakan Sandbox Server Key saat MIDTRANS_IS_PRODUCTION=false.");
  }

  if (isProduction && serverKey.startsWith("SB-Mid-server-")) {
    throw new Error("Sandbox Server Key tidak boleh digunakan di Production.");
  }

  return {
    serverKey,
    clientKey,
    isProduction,
    snapApiBaseUrl: isProduction
      ? "https://app.midtrans.com/snap/v1"
      : "https://app.sandbox.midtrans.com/snap/v1",
  };
}

/**
 * Membuat transaksi Snap dari backend.
 * Panggil hanya dari Route Handler/server action setelah order tervalidasi
 * dan nominal dihitung ulang dari database, bukan dari input browser.
 */
export async function createSnapTransaction(
  transaction: Record<string, unknown>
): Promise<{ token: string; redirect_url: string }> {
  const config = getMidtransConfig();
  const authorization = Buffer.from(`${config.serverKey}:`).toString("base64");

  const response = await fetch(`${config.snapApiBaseUrl}/transactions`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${authorization}`,
    },
    body: JSON.stringify(transaction),
    cache: "no-store",
  });

  const result = (await response.json().catch(() => ({}))) as {
    token?: string;
    redirect_url?: string;
    error_messages?: string[];
    status_message?: string;
  };

  if (!response.ok || !result.token || !result.redirect_url) {
    // Jangan pernah memasukkan Server Key atau header Authorization ke log.
    throw new Error(
      result.error_messages?.join("; ") ||
        result.status_message ||
        `Midtrans Snap gagal membuat transaksi (HTTP ${response.status}).`
    );
  }

  return {
    token: result.token,
    redirect_url: result.redirect_url,
  };
}
