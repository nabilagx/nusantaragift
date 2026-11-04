import type { ShopCategory } from "@/components/shop/CategoryTabs";

export type ShopProduct = {
  id: string;
  title: string;
  description: string;
  price: string;
  image?: string;
  imageAlt?: string;
  cardColor: string;
  accentColor: string;
  category: ShopCategory;
  region: string;
  detailPrice?: string;
  stock: number;
  size: string;
  summary: {
    type: string;
    format: string;
    unlock: string;
  };
  detailDescription: string;
  deliveryType?: "physical" | "digital-audio";
};

export const produk: ShopProduct[] = [
  {
    id: "cerita-timur",
    title: "Kado Cerita – Edisi Timur Indonesia",
    description: "Jelajahi kisah dan kekayaan cerita dari wilayah Timur Indonesia.",
    price: "Rp20.000",
    image: "/images/shop/cerita-timur.png",
    imageAlt: "Kado Cerita Edisi Timur Indonesia",
    cardColor: "#E6DBBC",
    accentColor: "#ECD7A1",
    category: "Cerita",
    region: "NTT, Maluku, Papua",
    detailPrice: "Rp35.000",
    deliveryType: "digital-audio",
    stock: 50,
    size: "1 Paket Cerita",
    summary: {
      type: "Cerita",
      format: "Audio",
      unlock: "QR Code",
    },
    detailDescription:
      "Kado Cerita Edisi Timur Indonesia membawa kamu menyelami dongeng lokal penuh makna. Dapatkan kisah seperti Putri Mandalika, Naga Komodo, hingga Legenda Asal Mula Tifa – dibawakan dalam narasi suara & visual digital yang hanya bisa diakses setelah box dibuka. Setiap kado dirancang untuk memicu rasa penasaran dan cinta budaya lokal.",
  },
  {
    id: "cerita-barat",
    title: "Kado Cerita – Edisi Barat Indonesia",
    description: "Kenali ragam kisah dan keunikan dari wilayah Barat Indonesia.",
    price: "Rp35.000",
    image: "/images/shop/cerita-barat.png",
    imageAlt: "Kado Cerita Edisi Barat Indonesia",
    cardColor: "#E9D8C3",
    accentColor: "#D8BE9A",
    category: "Cerita",
    region: "Barat Indonesia",
    deliveryType: "digital-audio",
    size: "1 Paket Cerita",
    stock: 50,
    summary: {
      type: "Cerita",
      format: "Audio",
      unlock: "QR Code",
    },
    detailDescription:
      "Kenali ragam kisah dan keunikan dari wilayah Barat Indonesia.",
  },
  {
    id: "rasa-timur",
    title: "Kado Rasa – Edisi Timur Indonesia",
    description: "Makanan khas dari daerah Timur Indonesia.",
    price: "Rp50.000",
    image: "/images/shop/be6dc.png",
    imageAlt: "Kado Rasa Edisi Timur Indonesia",
    cardColor: "#E6DBBC",
    accentColor: "#ECD7A1",
    category: "Rasa",
    region: "Timur Indonesia",
    stock: 50,
    size: "1 Paket",
    summary: {
      type: "Rasa",
      format: "Belum ditentukan",
      unlock: "Belum ditentukan",
    },
    detailDescription: "Makanan khas dari daerah Timur Indonesia.",
  },
  {
    id: "budaya-timur",
    title: "Kado Budaya – Edisi Timur Indonesia",
    description: "Budaya khas dari daerah Timur Indonesia.",
    price: "Rp70.000",
    image: "/images/shop/c90ac.png",
    imageAlt: "Kado Budaya Edisi Timur Indonesia",
    cardColor: "#B3AD93",
    accentColor: "#D1C297",
    category: "Budaya",
    region: "Timur Indonesia",
    stock: 50,
    size: "1 Paket",
    summary: {
      type: "Budaya",
      format: "Belum ditentukan",
      unlock: "Belum ditentukan",
    },
    detailDescription: "Budaya khas dari daerah Timur Indonesia.",
  },
];

export function getProdukById(id: string) {
  return produk.find((item) => item.id === id);
}