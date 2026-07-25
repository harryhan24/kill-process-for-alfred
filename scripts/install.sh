#!/usr/bin/env bash
# 최신 릴리스의 .alfredworkflow를 받아 Alfred workflows 폴더에 바로 설치한다.
# zip을 UUID 폴더로 직접 풀기 때문에 Alfred import 대화상자가 뜨지 않는다.
#
#   curl -sL https://raw.githubusercontent.com/harryhan24/kill-process-for-alfred/main/scripts/install.sh | bash
set -euo pipefail

REPO="harryhan24/kill-process-for-alfred"
ASSET="Kill-Process-for-Alfred.alfredworkflow"
URL="https://github.com/$REPO/releases/latest/download/$ASSET"

ALFRED_WORKFLOWS="$HOME/Library/Application Support/Alfred/Alfred.alfredpreferences/workflows"
# Alfred는 폴더명으로 워크플로를 식별한다 — 이 UUID는 바꾸면 안 된다
WORKFLOW_UUID="user.workflow.182984EF-F3B5-4AA9-821E-51FC0A165B33"
TARGET="$ALFRED_WORKFLOWS/$WORKFLOW_UUID"

if [ ! -d "$ALFRED_WORKFLOWS" ]; then
  echo "error: Alfred workflows 폴더가 없습니다:" >&2
  echo "  $ALFRED_WORKFLOWS" >&2
  echo "Alfred를 설치하고 한 번 실행했는지 확인하세요." >&2
  exit 1
fi

# 개발용 체크아웃 심링크(root install.sh가 만든 것)를 릴리스로 덮어쓰지 않는다
if [ -L "$TARGET" ]; then
  echo "error: 이미 개발 체크아웃이 링크돼 있습니다:" >&2
  echo "  $TARGET -> $(readlink "$TARGET")" >&2
  echo "릴리스 사본으로 바꾸려면 링크를 먼저 지우세요:" >&2
  echo "  rm \"$TARGET\"" >&2
  exit 1
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "downloading: $URL"
curl -sfL "$URL" -o "$TMP/workflow.zip"
unzip -q "$TMP/workflow.zip" -d "$TMP/workflow"

if [ -d "$TARGET" ]; then
  echo "replacing existing install: $TARGET"
fi
rm -rf "$TARGET"
cp -R "$TMP/workflow" "$TARGET"
echo "installed: $TARGET"

if ! command -v node >/dev/null 2>&1; then
  echo "warning: node가 PATH에 없습니다 — 워크플로 실행에 Node.js가 필요합니다" >&2
fi

echo "Alfred에서 'kill' 키워드가 안 보이면 Alfred를 재시작하세요."
