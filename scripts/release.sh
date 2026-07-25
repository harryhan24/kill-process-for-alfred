#!/usr/bin/env bash
# .alfredworkflow를 만들어 Forgejo 릴리스로 올린다. 태그는 info.plist의 version에서 딴다.
# Forgejo Actions 러너가 없어 릴리스는 로컬에서 만든다.
#
#   ./scripts/release.sh
set -euo pipefail

REPO="harryhan24/kill-process-for-alfred"
ASSET="Kill-Process-for-Alfred.alfredworkflow"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

: "${GIT_USERNAME:?GIT_USERNAME이 필요합니다}"
: "${GIT_PASSWORD:?GIT_PASSWORD가 필요합니다}"

cd "$ROOT"
TAG="v$(/usr/libexec/PlistBuddy -c 'Print :version' info.plist)"

if [ -n "$(git status --porcelain)" ]; then
  echo "error: 커밋되지 않은 변경이 있습니다 — 릴리스 전에 정리하세요" >&2
  git status --short >&2
  exit 1
fi

if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "error: 태그 $TAG가 이미 있습니다 — info.plist의 version을 올리세요" >&2
  exit 1
fi

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Alfred가 읽는 파일만 담는다 — 개발용 스크립트·문서는 제외
zip -qr "$TMP/$ASSET" . \
  -x '.git/*' 'scripts/*' 'install.sh' 'AGENTS.md' 'CLAUDE.md' '.gitignore' '.DS_Store'

git tag "$TAG"
git push "https://$GIT_USERNAME:$GIT_PASSWORD@git.ehdtn.com/$REPO.git" "$TAG"
tea release create --login "$GIT_USERNAME" --repo "$REPO" \
  --tag "$TAG" --title "$TAG" --asset "$TMP/$ASSET"

echo "released: $TAG"
