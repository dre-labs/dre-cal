import process from "node:process";

const allowedSignupEmailDomains: string[] = (process.env.ALLOWED_SIGNUP_EMAIL_DOMAINS ?? "")
  .split(",")
  .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
  .filter(Boolean);

export function isEmailAllowedForSignup(email: string): boolean {
  if (allowedSignupEmailDomains.length === 0) return true;

  const emailDomain = email.toLowerCase().split("@")[1];
  if (!emailDomain) return false;

  return allowedSignupEmailDomains.includes(emailDomain);
}
