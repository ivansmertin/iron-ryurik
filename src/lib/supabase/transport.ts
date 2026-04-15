import http from "node:http";
import https from "node:https";
import { Buffer } from "node:buffer";

const HTTP_TIMEOUT_MS = 15_000;
const NO_BODY_STATUS_CODES = new Set([204, 205, 304]);

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true, family: 4 });

export function getNodeTransportResponseBody(
  statusCode: number,
  method: string,
  chunks: Buffer[],
) {
  if (method === "HEAD" || NO_BODY_STATUS_CODES.has(statusCode)) {
    return null;
  }

  return Buffer.concat(chunks);
}

/**
 * Custom fetch that bypasses Next.js patched fetch and uses native node:http/https.
 * Required for outbound requests to Supabase Auth API from Node.js runtime
 * (ISP network restrictions block direct connection to AWS eu-central-1).
 */
export async function nodeTransportFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  const request = new Request(input, init);
  const url = new URL(request.url);
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : Buffer.from(await request.arrayBuffer());

  const headers = new Headers(request.headers);
  if (body && !headers.has("content-length")) {
    headers.set("content-length", String(body.byteLength));
  }

  return new Promise<Response>((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(
      url,
      {
        method: request.method,
        headers: Object.fromEntries(headers.entries()),
        agent: url.protocol === "https:" ? httpsAgent : httpAgent,
        family: 4,
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        res.on("end", () => {
          const responseHeaders = new Headers();
          Object.entries(res.headers).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach((item) => responseHeaders.append(key, item));
            } else if (value !== undefined) {
              responseHeaders.set(key, value);
            }
          });

          const statusCode = res.statusCode ?? 500;
          const responseBody = getNodeTransportResponseBody(
            statusCode,
            request.method,
            chunks,
          );

          resolve(
            new Response(responseBody, {
              status: statusCode,
              statusText: res.statusMessage ?? "",
              headers: responseHeaders,
            }),
          );
        });
      },
    );

    req.on("error", reject);
    req.setTimeout(HTTP_TIMEOUT_MS, () => {
      req.destroy(
        new Error(`Supabase request timed out after ${HTTP_TIMEOUT_MS}ms: ${request.url}`),
      );
    });

    const abortHandler = () =>
      req.destroy(new Error(`Supabase request aborted: ${request.url}`));

    request.signal.addEventListener("abort", abortHandler, { once: true });
    req.on("close", () => request.signal.removeEventListener("abort", abortHandler));

    if (body) req.write(body);
    req.end();
  });
}
