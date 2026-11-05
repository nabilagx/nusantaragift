import type { ShopCategory } from "@/components/shop/CategoryTabs";
import type { ShopProduct } from "@/data/produk";
import { createClient } from "@/lib/supabase/client";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number | string;
  stock: number;
  delivery_type: "physical" | "digital-audio";
  metadata: Record<string, unknown> | null;
  categories: { name: string } | { name: string }[] | null;
};

function asString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function toShopProduct(row: ProductRow): ShopProduct {
  const meta = row.metadata ?? {};
  const categoryRow = Array.isArray(row.categories) ? row.categories[0] : row.categories;
  const rawCategory = categoryRow?.name;
  const category: ShopCategory =
    rawCategory === "Rasa" || rawCategory === "Budaya" ? rawCategory : "Cerita";
  const amount = Number(row.price);

  return {
    id: row.slug,
    title: row.name,
    description: row.description ?? "",
    price: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount),
    image: asString(meta.image, ""),
    imageAlt: asString(meta.imageAlt, row.name),
    cardColor: asString(meta.cardColor, "#E6DBBC"),
    accentColor: asString(meta.accentColor, "#ECD7A1"),
    category,
    region: asString(meta.region, "Indonesia"),
    stock: row.stock,
    size: asString(meta.size, "1 Paket"),
    summary: {
      type: asString((meta.summary as Record<string, unknown> | undefined)?.type, category),
      format: asString((meta.summary as Record<string, unknown> | undefined)?.format, "Belum ditentukan"),
      unlock: asString((meta.summary as Record<string, unknown> | undefined)?.unlock, "Belum ditentukan"),
    },
    detailDescription: asString(meta.detailDescription, row.description ?? ""),
    deliveryType: row.delivery_type,
  };
}

export async function getCatalogProducts(): Promise<ShopProduct[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,slug,name,description,price,stock,delivery_type,metadata,categories(name)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as ProductRow[]).map(toShopProduct);
}

export async function getCatalogProduct(slug: string): Promise<ShopProduct | undefined> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id,slug,name,description,price,stock,delivery_type,metadata,categories(name)")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data ? toShopProduct(data as unknown as ProductRow) : undefined;
}
