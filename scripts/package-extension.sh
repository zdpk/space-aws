#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
extension_dir="$repo_root/extension"
dist_dir="$repo_root/dist"
version="$(node -p "require('$extension_dir/manifest.json').version")"
output="$dist_dir/space-aws-$version.zip"
mkdir -p "$dist_dir"
temp_dir="$(mktemp -d "$dist_dir/.space-aws-$version.XXXXXX")"
temp_zip="$temp_dir/space-aws-$version.zip"

cleanup() {
  rm -rf -- "$temp_dir"
}
trap cleanup EXIT

(
  cd "$extension_dir"
  zip -qr "$temp_zip" . \
    -x '*.DS_Store' \
    -x 'icons/generate-icons.py' \
    -x 'icons/icon.html' \
    -x 'icons/icon_files/*' \
    -x 'assets/regions/README.md'
)

unzip -tq "$temp_zip" >/dev/null
unzip -l "$temp_zip" | awk '{print $4}' | grep -qx 'manifest.json'
mv -f "$temp_zip" "$output"
rm -rf -- "$temp_dir"
trap - EXIT

echo "Created $output"
