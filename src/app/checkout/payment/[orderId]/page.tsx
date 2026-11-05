import PaymentClient from "./PaymentClient";

type PageProps = { params: Promise<{ orderId: string }> };

export default async function PaymentPage({ params }: PageProps) {
  const { orderId } = await params;
  return (
    <PaymentClient orderId={orderId} />
  );
}
