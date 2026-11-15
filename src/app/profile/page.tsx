import ProfileClient from "./ProfileClient";

// The profile is account-specific and should render at request time.
export const instant = false;

export default function ProfilePage() {
  return <ProfileClient />;
}
