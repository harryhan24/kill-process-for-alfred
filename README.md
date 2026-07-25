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

1. Download the latest `Kill-Process-for-Alfred.alfredworkflow` from the [Releases](https://github.com/harryhan24/kill-process-for-alfred/releases) page.
2. Double-click the file to import it into Alfred.

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

To package a release:

```sh
zip -r Kill-Process-for-Alfred.alfredworkflow info.plist script.js
```

## License

MIT
