#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="${repo_root}/assets/regions"
target_dir="${repo_root}/extension/assets/regions"

mkdir -p "${target_dir}"
cp "${source_dir}"/*.webp "${target_dir}/"
cp "${source_dir}/README.md" "${target_dir}/README.md"

asset_count="$(find "${target_dir}" -maxdepth 1 -type f -name '*.webp' | wc -l | tr -d ' ')"
if [[ "${asset_count}" != "35" ]]; then
  echo "Expected 35 runtime assets, found ${asset_count}." >&2
  exit 1
fi

echo "Synced ${asset_count} SPACE AWS runtime assets."
