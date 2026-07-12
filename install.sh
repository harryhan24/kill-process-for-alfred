#!/usr/bin/env bash
# Symlink this repo into Alfred's workflows directory so Alfred loads it in place.
# Idempotent: re-running is safe. Refuses to overwrite a real folder or a foreign symlink.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALFRED_WORKFLOWS="$HOME/Library/Application Support/Alfred/Alfred.alfredpreferences/workflows"
WORKFLOW_UUID="user.workflow.182984EF-F3B5-4AA9-821E-51FC0A165B33"
TARGET="$ALFRED_WORKFLOWS/$WORKFLOW_UUID"

if [ ! -d "$ALFRED_WORKFLOWS" ]; then
  echo "error: Alfred workflows directory not found:" >&2
  echo "  $ALFRED_WORKFLOWS" >&2
  echo "Is Alfred installed and run at least once?" >&2
  exit 1
fi

if [ -L "$TARGET" ]; then
  current="$(readlink "$TARGET")"
  if [ "$current" = "$SCRIPT_DIR" ]; then
    echo "ok: already linked"
    echo "  $TARGET -> $SCRIPT_DIR"
    exit 0
  fi
  echo "error: symlink exists but points elsewhere:" >&2
  echo "  $TARGET -> $current" >&2
  echo "Remove it manually if you want to relink." >&2
  exit 1
fi

if [ -e "$TARGET" ]; then
  echo "error: target already exists and is not a symlink:" >&2
  echo "  $TARGET" >&2
  echo "Move or remove it before running this script." >&2
  exit 1
fi

ln -s "$SCRIPT_DIR" "$TARGET"
echo "linked: $TARGET -> $SCRIPT_DIR"
