#!/usr/bin/env node

const { execSync } = require('child_process');

let theQuery = (process.argv[2] || '').trim();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function emit(items) {
  process.stdout.write(JSON.stringify({ items }));
}

function buildIcon(processPath) {
  const appMatch = processPath.match(/.*?\.app\//);
  if (appMatch) return { type: 'fileicon', path: appMatch[0] };
  return { path: '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/ExecutableBinaryIcon.icns' };
}

function getProcessInfo(pid) {
  try {
    const out = execSync(`ps -p ${pid} -o pid= -o %cpu= -o comm=`, { encoding: 'utf8' }).trim();
    const m = out.match(/^(\d+)\s+([\d.,]+)\s+(.*)$/);
    if (!m) return null;
    return { pid: m[1], cpu: m[2], path: m[3] };
  } catch (e) {
    return null;
  }
}

if (!theQuery) {
  emit([{
    title: 'please enter a process name or port',
    subtitle: 'e.g., kill chrome  /  kill node:server  /  kill -p 3000',
    valid: false,
  }]);
  process.exit(0);
}

if (/^-p\b/i.test(theQuery)) {
  const port = theQuery.replace(/^-p\s*/i, '').trim();
  if (!port) {
    emit([{ title: 'please enter a port number', subtitle: 'e.g., kill -p 3000', valid: false }]);
    process.exit(0);
  }
  if (!/^\d+$/.test(port)) {
    emit([{ title: `'${port}' is not a valid port number`, valid: false }]);
    process.exit(0);
  }

  let pids = [];
  try {
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (out) pids = [...new Set(out.split('\n').map(s => s.trim()).filter(Boolean))];
  } catch (e) {
    // lsof exits non-zero when no match; treat as empty
  }

  const portItems = [];
  for (const pid of pids) {
    const info = getProcessInfo(pid);
    if (!info) continue;
    const name = info.path.split('/').pop() || info.path;
    portItems.push({
      uid: `port-${port}-${pid}`,
      title: `${name} (PID ${pid})`,
      subtitle: `LISTEN on port ${port} · ${info.cpu}% CPU @ ${info.path}`,
      arg: pid,
      icon: buildIcon(info.path),
    });
  }

  if (portItems.length === 0) {
    portItems.push({ title: `No process is listening on port ${port}`, valid: false });
  }

  emit(portItems);
  process.exit(0);
}

let argsQuery = null;
if (theQuery.includes(':')) {
  const parts = theQuery.split(':');
  theQuery = parts[0];
  argsQuery = parts[1];
}

let psOutput;
try {
  psOutput = execSync('ps -A -o pid= -o %cpu= -o comm=', { encoding: 'utf8' });
} catch (e) {
  emit([{ title: 'failed to execute ps command', subtitle: e.message, valid: false }]);
  process.exit(0);
}

const queryRegex = new RegExp(`[^/]*${escapeRegex(theQuery)}[^/]*$`, 'i');
const items = [];

for (const line of psOutput.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed) continue;

  const match = trimmed.match(/^(\d+)\s+([\d.,]+)\s+(.*)$/);
  if (!match) continue;

  const [, pid, cpu, processPath] = match;

  const nameMatch = processPath.match(queryRegex);
  if (!nameMatch) continue;

  let matchedArgs = [];
  if (argsQuery) {
    try {
      const cmdOutput = execSync(`ps -p ${pid} -o command=`, { encoding: 'utf8' });
      const argRegex = new RegExp(`\\s+-{1,2}[^\\s]*${escapeRegex(argsQuery)}[^\\s]*`, 'gi');
      matchedArgs = cmdOutput.match(argRegex) || [];
      if (matchedArgs.length < 1) continue;
    } catch (e) {
      continue;
    }
  }

  const processName = nameMatch[0];

  items.push({
    uid: `${processName}-${pid}`,
    title: processName + (matchedArgs.length ? matchedArgs.join(' ') : ''),
    subtitle: `${cpu}% CPU @ ${processPath}`,
    arg: pid,
    icon: buildIcon(processPath),
  });
}

if (items.length === 0) {
  items.push({ title: `No processes found for '${theQuery}'`, valid: false });
}

emit(items);
