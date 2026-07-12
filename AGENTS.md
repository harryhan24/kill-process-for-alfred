# AGENTS.md

이 repo는 **Alfred 워크플로**다. `info.plist` + `script.js` + `icon.png`이 워크플로 본체.

## Alfred와의 연결 (symlink)

이 폴더는 Alfred의 workflows 경로에 **symlink로 마운트**되어 동작한다:

```
~/Library/Application Support/Alfred/Alfred.alfredpreferences/workflows/user.workflow.182984EF-F3B5-4AA9-821E-51FC0A165B33
  → /Users/harry/para/20-59_area/27_alfred/27.01_plugins/kill-process-for-alfred
```

- 링크는 `install.sh`로 생성·검증한다 (idempotent, 기존 폴더/타 링크가 있으면 덮어쓰지 않고 종료).
- 새 머신에서는 repo clone 후 `./install.sh` 한 번 실행.
- repo 파일을 수정하면 그대로 Alfred가 읽는 워크플로가 바뀐다 — 별도 export/import 불필요.
- UUID(`182984EF-...`)는 Alfred가 폴더명으로 워크플로를 식별하므로 절대 바꾸지 말 것. bundleid는 `info.plist` 안에 따로 있음.
