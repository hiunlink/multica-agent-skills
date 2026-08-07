#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_file="$repo_root/agents/opencode/multica-task-steward.md"
config_home="${XDG_CONFIG_HOME:-$HOME/.config}"
target_dir="$config_home/opencode/agents"
target_file="$target_dir/multica-task-steward.md"

mkdir -p "$target_dir"

if [[ -f "$target_file" ]] && cmp -s "$source_file" "$target_file"; then
  echo "Multica Task Steward is already up to date: $target_file"
  exit 0
fi

if [[ -f "$target_file" ]]; then
  backup_file="$target_file.backup-$(date +%Y%m%d%H%M%S)"
  cp "$target_file" "$backup_file"
  echo "Backed up existing agent to: $backup_file"
fi

install -m 0644 "$source_file" "$target_file"
echo "Installed Multica Task Steward to: $target_file"
echo "Restart OpenCode to load the updated agent."
