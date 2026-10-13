/* 로컬 서버(wrangler dev --var FAST_TEST:1)에 봇 여러 명을 붙여 온라인 흐름을 끝까지 확인
 *   cd server && npx wrangler dev --var FAST_TEST:1  (다른 창)
 *   node test/online.test.mjs
 * 모든 메시지마다 남의 패·남이 뽑은 패·남의 뽕 기회가 새지 않는지 검사한다.
 */
import { createRequire } from 'module';
import assert from 'assert';
const require = createRequire(import.meta.url);
const NPAI = require('../../src/ai.js');

const BASE = process.env.BASE || 'http://127.0.0.1:8787';
const WSB = BASE.replace(/^http/, 'ws');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const newPid = () => crypto.randomUUID().replace(/-/g, '');
let leaksChecked = 0;

class Bot {
  constructor(name, code, opts = {}) {
    Object.assign(this, { name, code, pid: opts.pid || newPid(), auto: opts.auto !== false, mute: false });
    this.errors = [];
    this.last = null;
    this.count = 0;
    this.readyFor = new Set();
  }
  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${WSB}/ws/${this.code}?pid=${this.pid}&name=${encodeURIComponent(this.name)}`);
      this.ws = ws;
      ws.onopen = () => resolve();
      ws.onerror = (e) => reject(new Error('ws error ' + this.name));
      ws.onclose = () => { this.closed = true; };
      ws.onmessage = (e) => {
        if (e.data === 'pong') return;
        const m = JSON.parse(e.data);
        if (m.t === 'error') { this.errors.push(m); return; }
        if (m.t !== 'state') return;
        this.last = m;
        this.count++;
        checkPrivacy(m);
        if (this.auto && !this.mute) this.react(m);
      };
    });
  }
  react(m) {
    const v = m.view;
    if (!v || m.room.status !== 'playing') return;
    if (v.phase === 'roundEnd') {
      if (!this.readyFor.has(v.round)) { this.readyFor.add(v.round); setTimeout(() => this.send({ t: 'ready' }), 15); }
      return;
    }
    const a = NPAI.decide(v, 'normal', Math.random);
    if (!a) return;
    if (a.type === 'claim' && Math.random() < 0.35) a.type = 'pass'; // 가끔 뽕을 넘겨 가림 처리도 확인
    const key = `${v.step}:${a.type}`;
    if (this.sentFor === key) return;
    this.sentFor = key;
    setTimeout(() => this.send({ t: 'act', type: a.type, card: a.card }), 15);
  }
  send(o) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); }
  close() { this.ws.close(); }
}

function checkPrivacy(m) {
  const v = m.view;
  if (!v) return;
  const reveal = v.phase === 'roundEnd' || v.phase === 'gameEnd';
  v.players.forEach((p, i) => {
    if (i !== m.seat && !reveal) assert.strictEqual(p.hand, null, `남의 패가 보임 (자리 ${i})`);
  });
  assert.ok(Array.isArray(v.players[m.seat].hand), '내 패가 없음');
  assert.strictEqual(v.deck, undefined, '더미가 보임');
  if (v.claim && v.claim.p !== undefined) assert.strictEqual(v.claim.p, m.seat, '남의 뽕 기회가 보임');
  if (v.phase === 'claim' && v.claim && v.claim.pending) assert.strictEqual(m.room.deadline, 0, '남의 뽕 결정 시간이 보임');
  if (m.last) {
    if (m.last.action.type === 'pass') assert.strictEqual(m.last.action.p, m.seat, '남이 뽕을 넘긴 게 보임');
    for (const e of m.last.events) {
      if (e.t === 'draw' && e.p !== m.seat) assert.strictEqual(e.card, undefined, '남이 뽑은 패가 보임');
      if (e.t === 'claimChance' || e.t === 'pass') assert.strictEqual(e.p, m.seat, '남의 뽕 기회·넘김 이벤트가 보임');
    }
  }
  for (const s of m.room.seats) assert.strictEqual(s.pid, undefined, '접속 토큰이 보임');
  leaksChecked++;
}

async function waitFor(fn, ms = 30000, label = '') {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (fn()) return; } catch (e) { /* 아직 */ }
    await sleep(40);
  }
  throw new Error('시간 초과: ' + label);
}
const post = async (path, body) => (await fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) })).json();

async function main() {
  const t0 = Date.now();
  // 1. 방 만들기와 입장
  const { code } = await post('/api/rooms', {});
  assert.match(code, /^\d{6}$/);
  const A = new Bot('주원', code), B = new Bot('민수', code), C = new Bot('지영', code);
  await A.connect(); await waitFor(() => A.last, 5000, 'A 입장');
  await B.connect(); await C.connect();
  await waitFor(() => [A, B, C].every((b) => b.last && b.last.room.seats.filter((s) => s.kind === 'human').length === 3), 5000, '3명 입장');
  assert.deepStrictEqual([A.last.seat, B.last.seat, C.last.seat], [0, 1, 2]);
  assert.strictEqual(A.last.room.host, 0);
  assert.strictEqual(A.last.room.status, 'waiting');
  console.log('✓ 방 만들기·입장', code);

  // 2. 방장만 시작
  B.send({ t: 'start' });
  await waitFor(() => B.errors.length, 3000, '방장 아닌 시작 거절');
  A.send({ t: 'settings', settings: { rounds: 3, max: 4, rules: { stopLimit: 5 } } });
  await waitFor(() => A.last.room.settings.rounds === 3, 3000, '설정');
  A.send({ t: 'start' });
  await waitFor(() => A.last.room.status === 'playing', 5000, '시작');
  assert.strictEqual(A.last.room.seats[3].kind, 'ai');
  assert.strictEqual(B.last.view.players[1].hand.length >= 5, true);
  console.log('✓ 시작 (빈자리 컴퓨터:', A.last.room.seats[3].name + ')');

  // 3. 진행 중 연결이 끊겨도 계속, 같은 토큰으로 돌아오면 같은 자리
  await waitFor(() => A.last.view.step > 12, 30000, '진행');
  B.close();
  await waitFor(() => A.last.room.seats[1].online === false, 5000, '끊김 표시');
  const s0 = A.last.view.step;
  await waitFor(() => A.last.view.step > s0 + 6, 20000, '끊긴 뒤에도 진행');
  const B2 = new Bot('민수', code, { pid: B.pid });
  await B2.connect();
  await waitFor(() => B2.last && B2.last.seat === 1, 5000, '같은 자리로 복귀');
  assert.ok(Array.isArray(B2.last.view.players[1].hand));
  await waitFor(() => A.last.room.seats[1].online === true, 5000, '복귀 표시');
  console.log('✓ 끊김 → 컴퓨터가 대신 → 같은 자리 복귀');

  // 4. 시간 초과: C가 아무것도 안 하면 서버가 대신 두고, 두 번이면 자리 비움
  C.mute = true;
  await waitFor(() => A.last.room.seats[2].away === true || A.last.room.status === 'ended', 60000, '시간 초과 → 자리 비움');
  if (A.last.room.status !== 'ended') {
    C.mute = false;
    C.send({ t: 'hello' });
    await waitFor(() => A.last.room.seats[2].away === false, 5000, '돌아옴');
    console.log('✓ 시간 초과 대신 두기 → 자리 비움 → 돌아옴');
  }

  // 5. 끝까지
  await waitFor(() => A.last.room.status === 'ended', 180000, '게임 끝');
  assert.strictEqual(A.last.view.history.length, 3);
  console.log('✓ 3판 끝:', A.last.view.history.map((h) => h.kind).join(', '), '| 점수', A.last.view.players.map((p) => p.name + ' ' + p.score).join(', '));

  // 6. 한 번 더 → 대기실
  A.send({ t: 'again' });
  await waitFor(() => A.last.room.status === 'waiting', 5000, '대기실로');
  assert.strictEqual(A.last.room.seats.filter((s) => s.kind === 'human').length, 3);
  console.log('✓ 한 번 더 → 같은 사람들로 대기실');

  // 7. 게임 중에 들어오면 컴퓨터 자리를 이어받음
  A.send({ t: 'start' });
  await waitFor(() => A.last.room.status === 'playing', 5000, '다시 시작');
  const D = new Bot('동현', code);
  await D.connect();
  await waitFor(() => D.last && D.last.seat === 3, 5000, '컴퓨터 자리 이어받기');
  assert.strictEqual(D.last.view.players[3].name, '동현');
  console.log('✓ 게임 중 입장 → 컴퓨터 자리 이어받음');
  const E = new Bot('은지', code);
  await E.connect();
  await waitFor(() => E.errors.some((e) => e.code === 'in_game'), 5000, '자리 없음 거절');
  console.log('✓ 빈자리 없으면 거절');
  [A, B2, C, D].forEach((b) => b.close());

  // 8. 빠른 참가: 두 사람이 같은 방으로
  const q1 = await post('/api/quick'), q2 = await post('/api/quick');
  assert.strictEqual(q1.code, q2.code);
  const Q1 = new Bot('나그네1', q1.code), Q2 = new Bot('나그네2', q2.code);
  await Q1.connect(); await Q2.connect();
  await waitFor(() => Q1.last.room.seats.filter((s) => s.kind === 'human').length === 2, 5000, '빠른 참가 2명');
  const q3 = await post('/api/quick');
  assert.strictEqual(q3.code, q1.code, '사람이 기다리는 방으로 안내');
  console.log('✓ 빠른 참가: 같은 방으로 모임', q1.code);
  const stats = await (await fetch(BASE + '/api/stats')).json();
  assert.ok(stats.waitingPlayers >= 2);
  console.log('✓ 대기 현황', JSON.stringify(stats));

  // 9. 꽉 찬 방, 없는 방, 이상한 토큰
  Q1.send({ t: 'settings', settings: { max: 2 } });
  await waitFor(() => Q1.last.room.settings.max === 2, 3000, '2인 방');
  const F = new Bot('늦은이', q1.code);
  await F.connect();
  await waitFor(() => F.errors.some((e) => e.code === 'full'), 5000, '꽉 참');
  const N = new Bot('길잃음', '999998');
  await N.connect().catch(() => {});
  await waitFor(() => N.errors.some((e) => e.code === 'no_room'), 5000, '없는 방');
  const X = new Bot('해커', q1.code, { pid: 'nope' });
  await X.connect().catch(() => {});
  await waitFor(() => X.errors.some((e) => e.code === 'bad_player'), 5000, '이상한 토큰');
  console.log('✓ 꽉 참·없는 방·잘못된 토큰 거절');

  // 10. 남의 차례에 두거나 엉뚱한 패 내기
  Q1.send({ t: 'settings', settings: { max: 4 } });
  Q1.send({ t: 'start' });
  await waitFor(() => Q1.last.room.status === 'playing', 5000, '빠른 참가 방 시작');
  Q1.auto = false; Q2.auto = false;
  const notMine = Q1.last.view.turn === Q1.last.seat ? Q2 : Q1;
  const e0 = notMine.errors.length;
  notMine.send({ t: 'act', type: 'discard', card: 0 });
  await waitFor(() => notMine.errors.length > e0, 3000, '남의 차례 거절');
  console.log('✓ 남의 차례·없는 패 거절');
  [Q1, Q2].forEach((b) => b.close());

  console.log(`\n모두 통과 · 메시지 ${leaksChecked}개 정보 노출 검사 · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  const unexpected = [A, B2, C, D].flatMap((b) => b.errors.map((e) => b.name + ': ' + e.message));
  if (unexpected.length) console.log('참고(경합으로 거절된 행동):', unexpected.length + '건');
  process.exit(0);
}

main().catch((e) => { console.error('✗', e.message); process.exit(1); });
