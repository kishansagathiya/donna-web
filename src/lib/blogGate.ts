const BLOG_SIGNUP_KEY = "donna.blog_signup.v1";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidSignupEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function getBlogSignupEmail(): string | null {
  try {
    const value = localStorage.getItem(BLOG_SIGNUP_KEY)?.trim() ?? "";
    return isValidSignupEmail(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveBlogSignupEmail(email: string): void {
  const normalized = email.trim().toLowerCase();
  if (!isValidSignupEmail(normalized)) {
    throw new Error("Enter a valid email.");
  }
  localStorage.setItem(BLOG_SIGNUP_KEY, normalized);
}

export function isBlogUnlocked(): boolean {
  return getBlogSignupEmail() !== null;
}
