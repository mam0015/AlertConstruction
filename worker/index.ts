/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

function securityHeaders(response: Response, url: URL) {
  const headers = new Headers(response.headers);
  // A route may set a stricter policy of its own (downloaded files use "sandbox"); only fill the default when it did not.
  if (!headers.has("Content-Security-Policy")) headers.set("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self'; worker-src 'self' blob:");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  if (url.protocol === "https:") headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (/^\/(?:api|owner|admin|site-supervisor|worker|team|track)(?:\/|$)/.test(url.pathname)) {
    headers.set("Cache-Control", "private, no-store, max-age=0");
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

// Browsers parse every /api answer as JSON. A plain-text error (the framework's "Payload Too Large", an unhandled exception)
// used to show up as "Unexpected token 'P'..." in the interface, so errors from /api/* always leave as {"error": "..."}.
async function jsonErrors(response: Response, url: URL) {
  if (!url.pathname.startsWith("/api/") || response.status < 400 || /json/i.test(response.headers.get("content-type") ?? "")) return response;
  const text = (await response.text()).slice(0, 200).trim();
  const error = response.status === 413 ? "That file is too large to upload."
    : response.status >= 500 ? "Something went wrong on the server. Please try again."
    : text || response.statusText || "The request could not be completed.";
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "application/json");
  headers.delete("Content-Length");
  return new Response(JSON.stringify({ error }), { status: response.status, headers });
}

async function appResponse(request: Request, env: Env, ctx: ExecutionContext, url: URL) {
  try {
    return await jsonErrors(await handler.fetch(request, env, ctx), url);
  } catch (error) {
    console.error("Unhandled error:", error instanceof Error ? error.message : error);
    return url.pathname.startsWith("/api/")
      ? Response.json({ error: "Something went wrong on the server. Please try again." }, { status: 500 })
      : new Response("Something went wrong on the server. Please try again.", { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const imageResponse = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return securityHeaders(imageResponse, url);
    }

    return securityHeaders(await appResponse(request, env, ctx, url), url);
  },
};

export default worker;
