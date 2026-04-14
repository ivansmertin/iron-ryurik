import http from "node:http";
import https from "node:https";
import { Buffer } from "node:buffer";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

const HTTP_TIMEOUT_MS = 15_000;

const httpAgent = new http.Agent({
  keepAlive: true,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  family: 4,
});

async function nodeTransportFetch(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) {
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
              return;
            }

            if (value !== undefined) {
              responseHeaders.set(key, value);
            }
          });

          resolve(
            new Response(Buffer.concat(chunks), {
              status: res.statusCode ?? 500,
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
        new Error(
          `Supabase request timed out after ${HTTP_TIMEOUT_MS}ms: ${request.url}`,
        ),
      );
    });

    const abortHandler = () => {
      req.destroy(new Error(`Supabase request aborted: ${request.url}`));
    };

    request.signal.addEventListener("abort", abortHandler, { once: true });

    req.on("close", () => {
      request.signal.removeEventListener("abort", abortHandler);
    });

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        // Bypass Next.js patched fetch for outbound Supabase requests.
        fetch: nodeTransportFetch,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    },
  );
}
