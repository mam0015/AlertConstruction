#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "${script_dir}/.." && pwd)"
release_name="Alert-Tradie-Pro-V75-Production-Complete"
output_file="${1:-${project_root}/${release_name}.zip}"
staging_root="$(mktemp -d)"
release_root="${staging_root}/${release_name}"

cleanup() {
  rm -rf "${staging_root}"
}
trap cleanup EXIT

mkdir -p "${release_root}"

tar -C "${project_root}" \
  --exclude='./.git' \
  --exclude='./.env' \
  --exclude='./.env.*' \
  --exclude='./.dev.vars' \
  --exclude='./.sites-runtime' \
  --exclude='./.wrangler' \
  --exclude='./.vinext' \
  --exclude='./.next' \
  --exclude='./node_modules' \
  --exclude='./dist' \
  --exclude='./dist-github' \
  --exclude='./github-pages-spa' \
  --exclude='./github-pages.vite.config.ts' \
  --exclude='./examples' \
  --exclude='./tsconfig.tsbuildinfo' \
  --exclude='./release-docs/UPLOAD-TO-GITHUB-V64.md' \
  --exclude='./release-docs/UPLOAD-TO-GITHUB-V65.md' \
  --exclude='./release-docs/V64-ARCHITECTURE-AND-ROADMAP.md' \
  --exclude='./release-docs/V65-PROJECT-WORKFLOW.md' \
  --exclude='./release-docs/PRIVATE-BACKEND-V65.md' \
  --exclude='./release-docs/verify-github-release.mjs' \
  --exclude='./Alert-Tradie-Pro-*.zip' \
  -cf - . | tar -C "${release_root}" -xf -

if find "${release_root}" -type d \( -iname '*demo*' -o -iname '*preview*' \) -print -quit | grep -q .; then
  echo "Refusing to package a demo or preview directory." >&2
  exit 65
fi

mkdir -p "$(dirname "${output_file}")"
rm -f "${output_file}"
(cd "${staging_root}" && zip -qr "${output_file}" "${release_name}")

echo "Created complete production package: ${output_file}"
