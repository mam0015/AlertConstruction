import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const root = fileURLToPath(new URL("./github-pages-spa", import.meta.url));

export default defineConfig({
  root,
  base: "/AlertConstruction/",
  plugins: [react()],
  build: {
    outDir: fileURLToPath(new URL("./dist-github", import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL("./github-pages-spa/index.html", import.meta.url)),
        owner: fileURLToPath(new URL("./github-pages-spa/owner/index.html", import.meta.url)),
        admin: fileURLToPath(new URL("./github-pages-spa/admin/index.html", import.meta.url)),
        supervisor: fileURLToPath(new URL("./github-pages-spa/site-supervisor/index.html", import.meta.url)),
        tracking: fileURLToPath(new URL("./github-pages-spa/track/index.html", import.meta.url)),
        customer: fileURLToPath(new URL("./github-pages-spa/customer/index.html", import.meta.url)),
        pending: fileURLToPath(new URL("./github-pages-spa/team/pending/index.html", import.meta.url)),
      },
    },
  },
});
