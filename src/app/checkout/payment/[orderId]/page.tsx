import { Suspense } from "react";
import ShopLayout from "@/components/shop/ShopLayout";
import PaymentClient from "./PaymentClient";

export default function PaymentPage() {
  return (
    <Suspense fallback={<ShopLayout><div className="flex min-h-[65vh] items-center justify-center text-sm text-[#77716A]">Memuat detail pembayaran...</div></ShopLayout>}>
      <PaymentClient />
    </Suspense>
  );
}
