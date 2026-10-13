/** Thin typed wrapper around fetch for our JSON API. */

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/** Read the `{ error }` message our API returns, with a sensible fallback. */
export async function errorMessageFrom(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
      return body.error;
    }
  } catch {
    // not JSON — fall through
  }
  if (response.status === 401) return "Your session has expired. Please sign in again.";
  return `Request failed (${response.status}).`;
}

export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const response = await fetch(path, {
    ...rest,
    ...(json !== undefined
      ? { body: JSON.stringify(json), headers: { "Content-Type": "application/json", ...rest.headers } }
      : {}),
  });
  if (!response.ok) throw new ApiClientError(response.status, await errorMessageFrom(response));
  return (await response.json()) as T;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
