/* 전투모드 온라인 확인 (wrangler dev --var FAST_TEST:1 에서)
 * 봇 3명 + 컴퓨터 1명이 전투모드로 3판. 뽕 경쟁이 실제로 일어나고, 남에게 뽕 기회가 새지 않는지 검사
 */
import { createRequire } from 'module';
import assert from 'assert';
const require = createRequire(import.meta.url);
const NPAI = require('../../src/ai.js');
const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = async (p, b) => (await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) })).json();
const stat = { msgs: 0, chances: 0, claims: 0, missed: 0, aiClaims: 0, deadlinesInDraw: 0, drawNoDeadline: 0 };

class Bot {
  constructor(name, code) { this.name = name; this.code = code; this.pid = crypto.randomUUID().replace(/-/g, ''); this.last = null; this.sent = null; }
  connect() {
    return new Promise((ok) => {
      const ws = new WebSocket(`${BASE.replace(/^http/, 'ws')}/ws/${this.code}?pid=${this.pid}&name=${encodeURIComponent(this.name)}`);
      this.ws = ws; ws.onopen = ok;
      ws.onmessage = (e) => { if (e.data === 'pong') return; const m = JSON.parse(e.data); if (m.t === 'state') { this.last = m; check(m); this.react(m); } };
    });
  }
  send(o) { if (this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  react(m) {
    const v = m.view;
    if (!v || m.room.status !== 'playing') return;
    if (v.phase === 'roundEnd') { if (this.ready !== v.round) { this.ready = v.round; setTimeout(() => this.send({ t: 'ready' }), 10); } return; }
    const key = v.step;
    if (this.sent === key) return;
    if (v.claim && v.claim.open && v.claim.p === m.seat) { // 뽕 경쟁: 0~250ms 뒤에 누름
      this.sent = key; setTimeout(() => this.send({ t: 'act', type: 'claim' }), Math.random() * 250); return;
    }
    if (v.phase === 'claim') return; // 박은 서버가 자동
    const a = NPAI.decide(v, 'normal', Math.random);
    if (!a || a.type === 'claim') return;
    this.sent = key;
    setTimeout(() => this.send({ t: 'act', type: a.type, card: a.card }), a.type === 'draw' ? 60 + Math.random() * 200 : 10);
  }
}
function check(m) {
  stat.msgs++;
  const v = m.view;
  if (!v) return;
  if (v.claim && v.claim.open) assert.strictEqual(v.claim.p, m.seat, '남의 뽕 기회가 보임');
  if (v.claim && !v.claim.open && v.claim.p !== undefined) assert.strictEqual(v.claim.p, m.seat, '남의 박 기회가 보임');
  if (v.phase === 'draw' && m.room.seats[v.turn].kind === 'human' && m.room.seats[v.turn].online && !m.room.seats[v.turn].away) {
    if (m.room.deadline) stat.deadlinesInDraw++; else stat.drawNoDeadline++;
  }
  if (m.last) for (const e of m.last.events) {
    if (e.t === 'claimChance' || e.t === 'missed' || e.t === 'pass') assert.strictEqual(e.p, m.seat, '남의 뽕 이벤트가 보임: ' + e.t);
    if (e.t === 'claimChance' && e.open) stat.chances++;
    if (e.t === 'missed') stat.missed++;
  }
}

const { code } = await post('/api/rooms', {});
const bots = [new Bot('가', code), new Bot('나', code), new Bot('다', code)];
for (const b of bots) await b.connect();
await sleep(300);
bots[0].send({ t: 'settings', settings: { max: 4, rounds: 3, public: false, rules: { battle: true } } });
await sleep(200);
assert.strictEqual(bots[0].last.room.settings.rules.battle, true, '전투모드 설정');
bots[0].send({ t: 'start' });
const seenClaims = new Set();
const t0 = Date.now();
while (Date.now() - t0 < 240000) {
  const m = bots[0].last;
  if (m && m.last) for (const e of m.last.events) if (e.t === 'claim' && !seenClaims.has(m.last.step)) { seenClaims.add(m.last.step); stat.claims++; if (m.room.seats[e.p].kind === 'ai') stat.aiClaims++; }
  if (m && m.room.status === 'ended') break;
  await sleep(5);
}
assert.strictEqual(bots[0].last.room.status, 'ended', '게임이 끝나지 않음');
console.log('✓ 전투모드 3판 끝:', bots[0].last.view.history.map((h) => h.kind).join(', '));
console.log('  뽕 기회(본인에게만) ', stat.chances, '· 놓침', stat.missed, '· 뽕(가운데서 본 것)', stat.claims, '(컴퓨터', stat.aiClaims + ')');
console.log('  사람 차례 남은 시간 표시: 있음', stat.deadlinesInDraw, '/ 없음', stat.drawNoDeadline, '· 메시지', stat.msgs);
assert.ok(stat.chances > 0, '뽕 기회가 한 번도 없음');
assert.strictEqual(stat.drawNoDeadline, 0, '사람 차례인데 남은 시간이 빠진 적 있음 (뽕할 사람 티 남)');
for (const b of bots) b.ws.close();
console.log('모두 통과');
process.exit(0);
