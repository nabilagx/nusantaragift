
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Package,
  Search,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import ShopLayout from "@/components/shop/ShopLayout";

type OrderItem = {
  productId: string;
  title: string;
  price: string;
  quantity: number;
  subtotal: number;
};

type OrderStatus = "PENDING" | "PAID" | "CANCELLED";

type CustomerOrder = {
  orderId: string;
  name: string;
  phone?: string;
  total: number;
  totalItems?: number;
  paymentStatus: OrderStatus;
  orderStatus?: string;
  shippingQuoteStatus?: "pending" | "quoted";
  shippingCost?: number;
  courier?: string | null;
  trackingNumber?: string | null;
  createdAt: string;
  items: OrderItem[];
};

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusInfo(status: OrderStatus, shippingQuoteStatus?: "pending" | "quoted", orderStatus?: string) {
  if (status === "PAID") {
    const states: Record<string, {label:string;description:string}> = {
      paid: { label: "Menunggu konfirmasi UMKM", description: "Pembayaran berhasil. Mitra UMKM akan menerima dan menyiapkan pesanan." },
      processing: { label: "Pesanan sedang disiapkan", description: "Mitra UMKM sudah menerima pesanan dan sedang menyiapkan produk." },
      shipped: { label: "Pesanan dalam pengiriman", description: "Pesanan sudah dikirim oleh mitra UMKM." },
      delivered: { label: "Pesanan telah diterima", description: "Pesanan telah sampai di tujuan." },
      completed: { label: "Pesanan selesai", description: "Terima kasih sudah berbelanja di NusantaraGift." },
    };
    const current = states[orderStatus ?? "paid"] ?? states.paid;
    return { ...current, className: "bg-green-100 text-green-800", icon: CheckCircle2 };
  }

  if (status === "CANCELLED") {
    return {
      label: "Pesanan dibatalkan",
      description: "Pesanan ini telah dibatalkan.",
      className: "bg-red-100 text-red-800",
      icon: XCircle,
    };
  }

  return {
    label: shippingQuoteStatus === "quoted" ? "Menunggu pembayaran" : "Menunggu ongkos kirim",
    description: shippingQuoteStatus === "quoted" ? "Admin telah menetapkan ongkir. Selesaikan pembayaran simulasi." : "Pesanan sudah diterima. Admin sedang menetapkan ongkos kirim.",
    className: "bg-amber-100 text-amber-800",
    icon: Clock3,
  };
}

function OrderProgress({ status, shippingQuoteStatus, orderStatus }: {
  status: OrderStatus;
  shippingQuoteStatus?: "pending" | "quoted";
  orderStatus?: string;
}) {
  if (status === "CANCELLED") {
    return <div className="mt-5 rounded-xl border border-red-100 bg-red-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-red-800"><XCircle size={18}/>Pesanan dibatalkan</div><p className="mt-1 text-xs leading-relaxed text-red-700">Pesanan ini telah dibatalkan.</p></div>;
  }
  const rank: Record<string,number> = { pending_payment:0, paid:1, processing:2, shipped:3, delivered:4, completed:5 };
  const current = status === "PAID" ? (rank[orderStatus ?? "paid"] ?? 1) : 0;
  const steps = [
    { title:"Pesanan dibuat", description:"Pesanan berhasil dicatat.", level:0 },
    { title:shippingQuoteStatus === "quoted" ? "Pembayaran dikonfirmasi" : "Menunggu ongkos kirim", description:shippingQuoteStatus === "quoted" ? "Admin sudah menetapkan ongkir. Selesaikan pembayaran." : "Admin sedang menghitung ongkos kirim.", level:1 },
    { title:"Diproses UMKM", description:"Mitra menerima pesanan dan menyiapkan produk.", level:2 },
    { title:"Dalam pengiriman", description:"Pesanan sudah diserahkan kepada kurir.", level:3 },
    { title:"Pesanan diterima", description:"Pesanan sampai di alamat tujuan.", level:4 },
  ];
  return <div className="mt-5 rounded-xl bg-[#FAF6EF] p-4"><h3 className="mb-4 text-sm font-bold text-[#34291F]">Perjalanan pesanan</h3><div className="space-y-3">{steps.map((step,index)=>{const done=current>=step.level;const active=current===step.level;return <div key={step.title} className="flex gap-3"><div className="flex flex-col items-center"><div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${done?"bg-green-100 text-green-700":active?"bg-amber-100 text-amber-700":"bg-[#E9DFCE] text-[#9C897F]"}`}>{done?<CheckCircle2 size={16}/>:<Clock3 size={15}/>}</div>{index!==steps.length-1&&<div className="mt-1 h-5 w-px bg-[#D9C9AF]"/>}</div><div className="pb-1"><p className="text-sm font-semibold text-[#34291F]">{step.title}</p><p className="mt-0.5 text-xs text-[#8B7B6C]">{step.description}</p></div></div>;})}</div></div>;
}

export default function TrackOrderPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/orders", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gagal memuat pesanan.");
        if (active) setOrders(result.orders ?? []);
      })
      .catch((error) => {
        console.error("Gagal memuat daftar pesanan:", error);
        if (active) setOrders([]);
      })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return orders;

    return orders.filter(
      (order) =>
        order.orderId.toLowerCase().includes(keyword) ||
        (order.name || "").toLowerCase().includes(keyword)
    );
  }, [orders, search]);

  if (!loaded) {
    return (
      <ShopLayout>
        <div className="flex min-h-[65vh] items-center justify-center text-sm text-[#77716A]">
          Memuat daftar pesanan...
        </div>
      </ShopLayout>
    );
  }

  return (
    <ShopLayout>
      <header className="flex items-center gap-4 pb-6 pt-7">
        <Link
          href="/shop"
          aria-label="Kembali ke toko"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
        >
          <ArrowLeft size={19} />
        </Link>

        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#93372A]">
            NusantaraGift
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Lacak Pesanan
          </h1>
        </div>
      </header>

      <section className="mx-auto max-w-2xl pb-12">
        <div className="mb-6">
          <p className="text-sm leading-relaxed text-[#77716A]">
            Pantau status pesanan dan pembayaranmu di sini.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#E9DFCE] bg-white px-4 py-3 shadow-sm">
          <Search size={19} className="shrink-0 text-[#9C897F]" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nomor pesanan atau nama penerima..."
            className="w-full bg-transparent text-sm text-[#34291F] outline-none placeholder:text-[#B5A89A]"
          />
        </div>

        {orders.length === 0 ? (
          <div className="rounded-2xl border border-[#E9DFCE] bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F0CDD5]/40 text-[#93372A]">
              <ShoppingBag size={28} />
            </div>

            <h2 className="mt-5 text-lg font-bold text-[#34291F]">
              Belum ada pesanan
            </h2>

            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#77716A]">
              Pesanan yang berhasil kamu buat akan muncul di halaman ini.
            </p>

            <Link
              href="/shop"
              className="mt-6 inline-flex rounded-full bg-[#93372A] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#76291F]"
            >
              Mulai Belanja
            </Link>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-[#E9DFCE] bg-white px-6 py-10 text-center">
            <Search size={30} className="mx-auto text-[#B5A89A]" />
            <h2 className="mt-3 font-bold text-[#34291F]">
              Pesanan tidak ditemukan
            </h2>
            <p className="mt-1 text-sm text-[#77716A]">
              Coba periksa kembali kata kunci pencarianmu.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredOrders.map((order) => {
              const status = getStatusInfo(order.paymentStatus, order.shippingQuoteStatus, order.orderStatus);
              const StatusIcon = status.icon;

              const itemCount =
                order.totalItems ??
                (order.items || []).reduce(
                  (sum, item) => sum + item.quantity,
                  0
                );

              return (
                <article
                  key={order.orderId}
                  className="overflow-hidden rounded-2xl border border-[#E9DFCE] bg-white shadow-sm"
                >
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-[#8B7B6C]">
                          Nomor pesanan
                        </p>
                        <p className="mt-1 text-base font-bold tracking-wide text-[#34291F]">
                          {order.orderId}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${status.className}`}
                      >
                        <StatusIcon size={14} />
                        {status.label}
                      </span>
                    </div>

                    <div className="my-4 border-t border-dashed border-[#E9DFCE]" />

                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-[#8B7B6C]">
                        Nama penerima
                      </span>
                      <span className="font-semibold text-[#34291F]">
                        {order.name || "-"}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span className="text-[#8B7B6C]">
                        Jumlah produk
                      </span>
                      <span className="font-semibold text-[#34291F]">
                        {itemCount} item
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                      <span className="text-[#8B7B6C]">
                        Total pesanan
                      </span>
                      <span className="font-bold text-[#93372A]">
                        {formatRupiah(order.total)}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-[#A99B89]">
                      Dibuat {formatDate(order.createdAt)}
                    </p>

                    <OrderProgress status={order.paymentStatus} shippingQuoteStatus={order.shippingQuoteStatus} orderStatus={order.orderStatus} />
                    {order.courier && order.trackingNumber && <div className="mt-3 rounded-xl border border-[#E9DFCE] bg-white p-3 text-xs"><p className="font-bold text-[#34291F]">Informasi pengiriman</p><p className="mt-1 text-[#776650]">Kurir: {order.courier}</p><p className="mt-1 text-[#776650]">Nomor resi: <strong className="text-[#93372A]">{order.trackingNumber}</strong></p></div>}

                    {order.paymentStatus === "PENDING" && (
                      <Link
                        href={`/checkout/payment/${order.orderId}`}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#93372A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#76291F]"
                      >
                        <Package size={17} />
                        Lihat Status Pesanan
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-6 rounded-xl bg-[#F5F0E7] p-4 text-xs leading-relaxed text-[#776650]">Data pesanan diambil langsung dari akunmu dan tersimpan di database NusantaraGift.</p>
      </section>
    </ShopLayout>
  );
}
