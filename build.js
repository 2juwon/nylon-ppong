/* src/의 엔진·컴퓨터·화면을 합쳐 한 파일로 만든다.
 *   node build.js             → index.html (GitHub Pages용 완성본)
 *   node build.js --artifact  → dist/artifact.html (claude.ai 아티팩트용, 문서 머리 없이)
 */
const fs = require('fs');
const path = require('path');

const SITE = 'https://2juwon.github.io/nylon-ppong/';
const TITLE = '나일롱뽕';
const DESC = '컴퓨터와 겨루는 화투 나일롱뽕 — 뽕! 박! 스톱! 손에 남은 패 합이 가장 낮으면 이겨요';

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const ui = read('src/ui.html');
const merged = ui
  .replace('/*__ENGINE__*/', () => read('src/engine.js').trim())
  .replace('/*__AI__*/', () => read('src/ai.js').trim());

// 인라인 스크립트 문법 확인
const scripts = [...merged.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
scripts.forEach((s, i) => { new Function(s); });

if (process.argv.includes('--artifact')) {
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'dist/artifact.html'), merged);
  console.log('dist/artifact.html', (merged.length / 1024).toFixed(1) + 'KB');
  process.exit(0);
}

// 8월 공산 패 모양 아이콘
const icon = "data:image/svg+xml," + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>" +
  "<rect x='6' y='1.5' width='20' height='29' rx='3' fill='#f1e7cf' stroke='#1c1913' stroke-width='1.2'/>" +
  "<rect x='8.6' y='4.2' width='14.8' height='23.6' rx='1.4' fill='#b8301d'/>" +
  "<circle cx='16' cy='11.5' r='5' fill='#f8f1dd'/>" +
  "<path d='M8.6 27.8V18.6c3-3 6-3.4 9-1.4 2 1.3 4 1.1 5.8-.4v11z' fill='#1c1913'/></svg>"
).replace(/'/g, '%27');

const cut = merged.indexOf('</style>') + '</style>'.length;
const headPart = merged.slice(0, cut);
const bodyPart = merged.slice(cut);

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="${DESC}">
<meta name="theme-color" content="#474e35">
<meta property="og:type" content="website">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESC}">
<meta property="og:url" content="${SITE}">
<meta property="og:image" content="${SITE}og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${icon}">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}img{max-width:100%}</style>
${headPart}
</head>
<body>
${bodyPart.trim()}
</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, 'index.html'), html);
console.log('index.html', (html.length / 1024).toFixed(1) + 'KB,', scripts.length, 'scripts OK');
