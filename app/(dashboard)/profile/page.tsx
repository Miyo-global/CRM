import { redirect } from "next/navigation";

/**
 * The user menu's Profile entry. Account details and contact fields live in
 * account settings, so /profile is a stable alias for them (A25).
 */
export default function ProfilePage() {
  redirect("/settings#profile");
}
