import { Suspense } from "react";
import ProfileClient from "./ProfileClient";

// The profile is account-specific and should render at request time.
export const instant = false;

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F1E3]" />}>
      <ProfileClient />
    </Suspense>
  );
}
