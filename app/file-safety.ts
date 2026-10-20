// Everything the app serves back from private storage goes through downloadHeaders(), so an uploaded file can never run as a
// web page in the signed-in person's browser (stored XSS), whatever it claims to be.

const INLINE_IMAGES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);
const ACTIVE_TYPES = /^(text\/html|application\/xhtml\+xml|image\/svg\+xml|text\/javascript|application\/javascript|application\/x-javascript|text\/xml|application\/xml|application\/x-msdownload|application\/x-sh|application\/x-httpd-php)\b/i;
const ACTIVE_EXTENSIONS = /\.(html?|xhtml|svgz?|xml|js|mjs|cjs|php\d?|exe|dll|bat|cmd|com|msi|scr|sh|ps1|vbs|jar|apk|hta|swf)$/i;

// Returns a message when the file is something that can execute (a web page, script or program), otherwise an empty string.
export function activeContentProblem(file: { name: string; type: string }) {
  return ACTIVE_TYPES.test(file.type || "") || ACTIVE_EXTENSIONS.test(file.name || "")
    ? "Web pages, scripts, SVG and program files cannot be uploaded. Use a photo, PDF or office document."
    : "";
}

function percentEncode(value: string) {
  return encodeURIComponent(value).replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function downloadHeaders(mimeType: string, fileName: string, options: { inlinePdf?: boolean } = {}): Record<string, string> {
  const type = String(mimeType || "").split(";")[0].trim().toLowerCase();
  const inline = INLINE_IMAGES.has(type) || (options.inlinePdf === true && type === "application/pdf");
  const shown = (String(fileName || "file").split(/[\\/]/).pop() || "file").slice(-120);
  const ascii = shown.replace(/[^\x20-\x7e]|["\;]/g, "_") || "file";
  return {
    "Content-Type": inline ? type : "application/octet-stream",
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${percentEncode(shown)}`,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": type === "application/pdf" && inline ? "default-src 'none'" : "default-src 'none'; img-src 'self' data:; sandbox",
    "Cache-Control": "private, no-store",
  };
}
