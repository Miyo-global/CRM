import { ForgotPasswordForm } from "./forgot-password-form";

// Server wrapper so the no-JS form post (R3-SET-03) lands on a rendered result:
// the API redirects back with ?sent=1 or ?error=invalid, never with the address.
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { sent, error } = await searchParams;
  return <ForgotPasswordForm sentWithoutJs={sent === "1"} invalidWithoutJs={error === "invalid"} />;
}
