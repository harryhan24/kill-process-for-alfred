#!/usr/bin/env node

const { execSync } = require('child_process');

let theQuery = (process.argv[2] || '').trim();

function emit(items) {
  process.stdout.write(JSON.stringify({ items }));
}

function fuzzyScore(query, text) {
  if (!query) return 0;
  const q = query.toLowerCase();
  const t = text.toLowerCase();

  let score = 0;
  let qi = 0;
  let prevMatched = -2;
  let consecutive = 0;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      if (prevMatched === ti - 1) {
        consecutive++;
        score += 5 + consecutive * 2;
      } else {
        consecutive = 0;
        score += 1;
      }
      if (ti === 0 || /[\s\-_./]/.test(t[ti - 1])) score += 10;
      prevMatched = ti;
      qi++;
    }
  }

  if (qi < q.length) return -1;
  score -= (t.length - q.length) * 0.1;
  return score;
}

// 검색 대상 문자열 목록: 실행 파일명 + 경로에 포함된 모든 .app 번들명
// (예: /Applications/Harry Agents Switch.app/Contents/MacOS/agents-manager
//      → ['agents-manager', 'Harry Agents Switch'])
function searchTargets(processPath) {
  const targets = [processPath.split('/').pop() || processPath];
  for (const m of processPath.matchAll(/([^/]+)\.app(?=\/)/g)) {
    if (!targets.includes(m[1])) targets.push(m[1]);
  }
  return targets;
}

// 검색 대상 중 최고 점수를 고른다. tier 1 = 연속 부분문자열 매치, tier 0 = fuzzy 매치.
// 정렬 시 tier가 score보다 우선하므로 부분문자열 매치가 항상 fuzzy 매치보다 위에 온다.
function bestMatch(query, targets) {
  let best = null;
  const q = query.toLowerCase();
  for (const text of targets) {
    const score = fuzzyScore(query, text);
    if (score < 0) continue;
    const tier = text.toLowerCase().includes(q) ? 1 : 0;
    if (!best || tier > best.tier || (tier === best.tier && score > best.score)) {
      best = { tier, score };
    }
  }
  return best;
}

// title에 덧붙일 소유 앱 이름. 아이콘과 같은 기준으로 경로 최상위 .app을 쓰고,
// 실행 파일명이 이미 앱 이름을 포함하면(예: Google Chrome Helper) 중복이라 생략한다.
function appLabel(processPath, processName) {
  const m = processPath.match(/([^/]+)\.app(?=\/)/);
  if (!m) return null;
  return processName.toLowerCase().includes(m[1].toLowerCase()) ? null : m[1];
}

function buildIcon(processPath) {
  const appMatch = processPath.match(/.*?\.app\//);
  if (appMatch) return { type: 'fileicon', path: appMatch[0] };
  return { path: '/System/Library/CoreServices/CoreTypes.bundle/Contents/Resources/GenericApplicationIcon.icns' };
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

const items = [];

for (const line of psOutput.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed) continue;

  const match = trimmed.match(/^(\d+)\s+([\d.,]+)\s+(.*)$/);
  if (!match) continue;

  const [, pid, cpu, processPath] = match;
  const processName = processPath.split('/').pop() || processPath;

  const nameMatch = bestMatch(theQuery, searchTargets(processPath));
  if (!nameMatch) continue;

  let matchedArgs = [];
  let argsScore = 0;
  if (argsQuery) {
    try {
      const cmdOutput = execSync(`ps -p ${pid} -o command=`, { encoding: 'utf8' });
      const tokens = cmdOutput.split(/\s+/).filter(t => /^-{1,2}/.test(t));
      const scored = tokens
        .map(t => ({ token: t, score: fuzzyScore(argsQuery, t) }))
        .filter(t => t.score >= 0);
      if (scored.length < 1) continue;
      matchedArgs = scored.map(t => t.token);
      argsScore = Math.max(...scored.map(t => t.score));
    } catch (e) {
      continue;
    }
  }

  const label = appLabel(processPath, processName);

  items.push({
    _tier: nameMatch.tier,
    _score: nameMatch.score + argsScore,
    uid: `${processName}-${pid}`,
    title:
      processName +
      (matchedArgs.length ? ' ' + matchedArgs.join(' ') : '') +
      (label ? ` — ${label}` : ''),
    subtitle: `${cpu}% CPU @ ${processPath}`,
    arg: pid,
    icon: buildIcon(processPath),
  });
}

items.sort((a, b) => b._tier - a._tier || b._score - a._score);
items.forEach(item => {
  delete item._tier;
  delete item._score;
});

if (items.length === 0) {
  items.push({ title: `No processes found for '${theQuery}'`, valid: false });
}

emit(items);
