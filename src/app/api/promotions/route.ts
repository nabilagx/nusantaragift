import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: promotions, error } = await supabase.from("promotions")
    .select("id,title,description,image_url,product_ids,created_at")
    .eq("status", "active").order("created_at", { ascending: false }).limit(12);
  if (error) return NextResponse.json({ error: "Iklan belum dapat dimuat." }, { status: 500 });
  const ids = [...new Set((promotions ?? []).flatMap((item) => item.product_ids ?? []))];
  const { data: products } = ids.length
    ? await supabase.from("products").select("id,slug,name,price,stock,metadata").eq("status", "active").in("id", ids)
    : { data: [] };
  const mapped = (promotions ?? []).map((promotion) => ({
    ...promotion,
    products: (products ?? []).filter((product) => promotion.product_ids.includes(product.id)),
  })).filter((promotion) => promotion.products.length > 0);
  return NextResponse.json({ promotions: mapped });
}
