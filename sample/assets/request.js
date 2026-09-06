/** JSON transport shared by examples. No automatic write retries. */
export class RequestError extends Error {
  constructor(message, status = 0, body = null) { super(message); this.name = 'RequestError'; this.status = status; this.body = body; }
}
export async function requestJSON(url, { signal, timeout = 10000, ...options } = {}) {
  const response = await fetch(url, { ...options, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeout)]) : AbortSignal.timeout(timeout), headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } });
  let body;
  try { body = await response.json(); } catch { throw new RequestError('The service returned an unreadable response.', response.status); }
  if (!response.ok) throw new RequestError(typeof body?.message === 'string' ? body.message : 'The request failed.', response.status, body);
  return body;
}
