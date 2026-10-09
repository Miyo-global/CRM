export function isSignupEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SIGNUP_ENABLED === "true";
}
