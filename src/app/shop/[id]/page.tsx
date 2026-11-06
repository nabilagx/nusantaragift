import ProductDetailClient from "./ProductDetailClient";

export const instant = false;

type PageProps = { params: Promise<{ id: string }> };

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <ProductDetailClient id={id} />;
}
