# Kill Process for Alfred

An Alfred workflow that searches running processes and terminates them with the `kill` command. Search by process name, by command-line argument, or by listening TCP port.

Inspired by [ngreenstein/alfred-process-killer](https://github.com/ngreenstein/alfred-process-killer), rewritten in Node.js with a port-lookup mode added.

## Features

- Fuzzy search running processes by executable name or `.app` bundle name (`kill chrome`, `kill harry agents switch`)
- Contiguous substring matches always rank above fuzzy-only matches
- Filter results by command-line argument (`kill node:server`)
- Find and kill the process listening on a TCP port (`kill -p 3000`)
- Shows the owning app next to the executable name (`agents-manager — Harry Agents Switch`), omitted when redundant
- Shows CPU usage and the executable path for each match
- Uses the `.app` bundle icon when available, falls back to the generic executable icon
- Notification feedback after the kill is sent

## Installation

### 설치 / 재설치 (원라이너)

```bash
curl -sL https://git.ehdtn.com/harryhan24/kill-process-for-alfred/raw/branch/main/scripts/install.sh | bash
```

- 최신 릴리스의 `.alfredworkflow`를 받아 Alfred workflows 폴더에 바로 풀어넣는다 — import 대화상자가 뜨지 않는다.
- 재실행하면 기존 설치를 덮어쓴다.
- 개발용 심링크(`install.sh`로 만든 것)가 이미 있으면 덮어쓰지 않고 거부한다.

### 직접 import

1. [Releases](https://git.ehdtn.com/harryhan24/kill-process-for-alfred/releases)에서 `Kill-Process-for-Alfred.alfredworkflow`를 받는다.
2. 파일을 더블클릭해 Alfred에 import한다.

### 개발 체크아웃 연결

repo를 이미 클론해 뒀다면 릴리스 대신 체크아웃을 그대로 링크한다:

```bash
./install.sh
```

파일을 수정하면 Alfred가 읽는 워크플로가 바로 바뀐다.

## Requirements

- macOS
- [Alfred](https://www.alfredapp.com/) 4 or later with the [Powerpack](https://www.alfredapp.com/powerpack/)
- Node.js, available either at `/opt/homebrew/bin/node` (Apple Silicon Homebrew), `/usr/local/bin/node` (Intel Homebrew), or anywhere on the default `PATH`

## Usage

| Query              | What it does                                                       |
| ------------------ | ------------------------------------------------------------------ |
| `kill <name>`      | Searches processes by executable name and enclosing `.app` bundle name |
| `kill <name>:<arg>`| Same as above, then filters to processes whose CLI args match `<arg>` |
| `kill -p <port>`   | Lists processes currently `LISTEN`ing on TCP `<port>`              |

Pressing Enter on a result sends `SIGTERM` to that PID. To force-kill, edit the workflow's Run Script action and change `kill "$PID"` to `kill -9 "$PID"`.

## How it works

- **Name / arg search** — runs `ps -A -o pid= -o %cpu= -o comm=` and filters the results in Node.js. Each process is matched against its executable name plus every `.app` bundle name in its path, so `Harry Agents Switch` finds the `agents-manager` binary inside it.
- **Port search** — runs `lsof -nP -iTCP:<port> -sTCP:LISTEN -t` to find PIDs, then looks each one up with `ps`.
- The Script Filter passes the selected PID to a Run Script action that executes `kill <pid>` and posts a macOS notification with the result.

## Development

The workflow consists of two files:

- `info.plist` — Alfred workflow definition (Script Filter → Run Script → Notification)
- `script.js` — Node.js Script Filter that produces Alfred JSON output

Plus the scripts:

- `scripts/install.sh` — downloads the latest release and unpacks it into Alfred's workflows directory (for machines that just want to use the workflow)
- `install.sh` — symlinks the checkout it lives in into Alfred's workflows directory (for development)
- `.woodpecker/release.yml` — `prod` 브랜치 push 시 Woodpecker가 `.alfredworkflow`를 빌드해 Forgejo 릴리스로 발행한다

릴리스 절차:

1. `info.plist`의 `version`을 올려 `main`에 커밋한다.
2. `main`을 `prod`로 승격해 push한다:

```bash
git push origin main:prod
```

Woodpecker가 version에서 태그(`v<ver>`)를 따고, 릴리스와 `.alfredworkflow` asset을 만든다. 같은 태그의 릴리스가 이미 있으면 빌드가 실패하므로 version을 먼저 올려야 한다.

## License

MIT
