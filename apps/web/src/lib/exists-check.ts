// Backend "exists" endpoints may respond with a raw boolean or a wrapped
// `{ exists }` / `{ data }` object depending on the resource — normalize both.
export async function resolvesExists(promise: Promise<unknown>): Promise<boolean> {
  try {
    const res = await promise;
    return (
      res === true ||
      (res != null &&
        typeof res === 'object' &&
        ((res as Record<string, unknown>).exists === true ||
          (res as Record<string, unknown>).data === true))
    );
  } catch {
    // Network/server error on the check shouldn't block the user — the
    // authoritative uniqueness check still happens server-side on submit.
    return false;
  }
}
