// 자동 검사: PR마다 GitHub Actions에서 돌고, 로컬에서는 `node scripts/check.js`로 돌린다.
// 1) extension/ JS 문법  2) manifest.json  3) files.js 목록의 파일이 있는지
// 4) README 원칙: 외부 요청 금지, chrome.*은 background.js에서만
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const EXT = path.join(__dirname, '..', 'extension');
const errors = [];

const jsFiles = (function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : [];
  });
})(EXT);

// 1) 문법
for (const f of jsFiles) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) errors.push(`문법 오류: ${rel(f)}\n${r.stderr.trim()}`);
}

// 2) manifest.json
try {
  JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8'));
} catch (e) {
  errors.push(`manifest.json 형식 오류: ${e.message}`);
}

// 3) files.js 목록
const sandbox = {};
new Function('self', fs.readFileSync(path.join(EXT, 'files.js'), 'utf8'))(sandbox);
for (const f of sandbox.SG_FILES || []) {
  if (!fs.existsSync(path.join(EXT, f))) errors.push(`files.js에 있는 파일이 없음: ${f}`);
}

// 4) 원칙 (주석은 빼고 검사)
const FORBIDDEN = [
  [/\bfetch\s*\(/, 'fetch (외부 요청 금지)'],
  [/\bXMLHttpRequest\b/, 'XMLHttpRequest (외부 요청 금지)'],
  [/\bWebSocket\b/, 'WebSocket (외부 요청 금지)'],
  [/\bsendBeacon\b/, 'sendBeacon (외부 요청 금지)'],
  [/\bEventSource\b/, 'EventSource (외부 요청 금지)'],
];
const CHROME = [/\bchrome\s*(\?\.|\.|\[)/, 'chrome.* (background.js에서만 사용)'];

for (const f of jsFiles) {
  const rules = rel(f) === 'extension/background.js' ? FORBIDDEN : [...FORBIDDEN, CHROME];
  stripComments(fs.readFileSync(f, 'utf8')).split('\n').forEach((line, i) => {
    for (const [re, msg] of rules) {
      if (re.test(line)) errors.push(`${rel(f)}:${i + 1} ${msg}\n  ${line.trim()}`);
    }
  });
}

if (errors.length) {
  console.error(`검사 실패 ${errors.length}건\n\n${errors.join('\n\n')}`);
  process.exit(1);
}
console.log(`검사 통과 (JS ${jsFiles.length}개)`);

function rel(f) {
  return path.relative(path.join(EXT, '..'), f).split(path.sep).join('/');
}

// 줄 번호가 유지되도록 주석을 공백으로 바꾼다. 문자열 속 'https://'는 건드리지 않음 (앞이 줄 시작·공백일 때만 주석)
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|\s)\/\/.*$/gm, '$1');
}
