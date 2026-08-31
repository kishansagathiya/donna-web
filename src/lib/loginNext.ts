const LOGIN_NEXT_KEY = "donna.login_next.v1";

export function isSafeNextPath(path: string): boolean {
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("://") &&
    !path.includes("\\")
  );
}

export function rememberLoginNext(path: string | null | undefined): void {
  if (!path || !isSafeNextPath(path)) return;
  try {
    sessionStorage.setItem(LOGIN_NEXT_KEY, path);
  } catch {
    // Ignore quota / private-mode failures; the query param still works.
  }
}

export function takeLoginNext(): string | null {
  try {
    const stored = sessionStorage.getItem(LOGIN_NEXT_KEY);
    sessionStorage.removeItem(LOGIN_NEXT_KEY);
    return stored && isSafeNextPath(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function resolvePostLoginPath(
  nextParam: string | null | undefined,
  hasConsent: boolean,
): string {
  if (nextParam && isSafeNextPath(nextParam)) return nextParam;
  const stored = takeLoginNext();
  if (stored) return stored;
  return hasConsent ? "/app" : "/consent";
}
