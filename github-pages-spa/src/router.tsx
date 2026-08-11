import type { AnchorHTMLAttributes, ReactNode } from "react";

const base = import.meta.env.BASE_URL.endsWith("/")
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;

function destination(href: string) {
  if (/^(?:https?:|mailto:|tel:|#)/i.test(href)) return href;
  if (href === "/" || href === "") return base;
  if (href === "/#request") return `${base}#request`;
  if (href.startsWith("/track/")) {
    return `${base}track/?code=${encodeURIComponent(href.slice("/track/".length))}`;
  }

  const clean = href.replace(/^\/+|\/+$/g, "");
  return `${base}${clean}${clean.includes("?") || clean.includes("#") ? "" : "/"}`;
}

export function Link({ href, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) {
  return <a href={destination(href)} {...props}>{children}</a>;
}

export function useRouter() {
  return {
    push(href: string) {
      window.location.assign(destination(href));
    },
    refresh() {
      window.location.reload();
    },
  };
}

export function useParams<T extends { code?: string }>() {
  const queryCode = new URLSearchParams(window.location.search).get("code");
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const trackIndex = pathParts.indexOf("track");
  const pathCode = trackIndex >= 0 ? pathParts[trackIndex + 1] : undefined;
  return { code: queryCode ?? pathCode ?? "ATP-2026-00124" } as T;
}

export { base as appBase };
