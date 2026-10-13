const DEFAULT_DESTINATION = "/app";

/**
 * Where to go after signing in. The `callbackUrl` query parameter is
 * attacker-controllable, so only same-origin destinations inside the app are
 * honoured (prevents open-redirect phishing links).
 */
export function safeCallbackUrl(raw: string | null, origin: string): string {
  if (!raw) return DEFAULT_DESTINATION;
  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin || !url.pathname.startsWith("/app")) return DEFAULT_DESTINATION;
    return `${url.pathname}${url.search}`;
  } catch {
    return DEFAULT_DESTINATION;
  }
}
