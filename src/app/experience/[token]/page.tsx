import { Suspense } from "react";
import DigitalGiftExperience from "./ExperienceClient";

// The recipient token is request-specific and must not be statically prerendered.
export const dynamic = "force-dynamic";

export default async function ExperiencePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center text-sm text-[#79552F]">Memverifikasi QR Gift Card...</div>}>
      <DigitalGiftExperience token={token} />
    </Suspense>
  );
}
