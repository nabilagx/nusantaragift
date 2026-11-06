import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: promotion, error } = await supabase.from("promotions")
    .select("id,title,description,image_url,product_ids,created_at")
    .eq("id", id).eq("status", "active").maybeSingle();
  if (error || !promotion) return NextResponse.json({ error: "Iklan tidak ditemukan atau sudah tidak aktif." }, { status: 404 });
  const { data: products, error: productError } = await supabase.from("products")
    .select("id,slug,name,description,price,stock,metadata,categories(name)")
    .eq("status", "active").in("id", promotion.product_ids);
  if (productError) return NextResponse.json({ error: "Produk iklan gagal dimuat." }, { status: 500 });
  return NextResponse.json({ promotion: { ...promotion, products: products ?? [] } });
}
