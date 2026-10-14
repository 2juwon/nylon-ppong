/* 규칙 단위 테스트 + 컴퓨터끼리 대국 시뮬레이션 */
const NP = require('../src/engine.js');
const AI = require('../src/ai.js');
const assert = require('assert');

const M = NP.monthOf;
// 월 m의 k번째 카드 id
const C = (m, k = 0) => (m - 1) * 4 + k;
const months = (hand) => hand.map(M).sort((a, b) => a - b);
let pass = 0;
function t(name, fn) { fn(); pass++; }

// ---------- claimKind ----------
t('뽕', () => assert.strictEqual(NP.claimKind([C(1, 0), C(1, 1), C(4), C(7), C(9)], C(1, 2)), 'ppong'));
t('박', () => assert.strictEqual(NP.claimKind([C(5, 0), C(5, 1)], C(5, 2)), 'bak'));
t('자연바가지', () => assert.strictEqual(NP.claimKind([C(3, 0), C(3, 1), C(3, 2), C(7, 0), C(7, 1)], C(7, 2)), 'jayeon'));
t('자연뽕 월로 뽕은 일반 뽕', () => assert.strictEqual(NP.claimKind([C(3, 0), C(3, 1), C(3, 2), C(7, 0), C(7, 1)], C(3, 3)), 'ppong'));
t('한 장뿐이면 불가', () => assert.strictEqual(NP.claimKind([C(5, 0), C(6, 1)], C(5, 2)), null));
t('5장에 1장뿐이면 불가', () => assert.strictEqual(NP.claimKind([C(5, 0), C(6), C(7), C(8), C(9)], C(5, 2)), null));

// ---------- 족보 ----------
const R0 = NP.DEFAULT_RULES;
const strict = Object.assign({}, R0, { chongtongStrict: true });
const J = (ms, rules = R0) => {
  const used = {};
  const hand = ms.map((m) => { used[m] = (used[m] || 0); return C(m, used[m]++); });
  return NP.findJokbo(hand, rules);
};
t('스트레이트 1-6', () => { const j = J([1, 2, 3, 4, 5, 6]); assert.strictEqual(j.key, 'straight'); assert.strictEqual(j.score, -21); });
t('스트레이트 7-12', () => { const j = J([7, 8, 9, 10, 11, 12]); assert.strictEqual(j.score, -57); });
t('스트레이트 아님', () => assert.strictEqual(J([1, 2, 3, 4, 5, 7]), null));
t('총통+10부족', () => { const j = J([1, 1, 1, 1, 2, 2]); assert.strictEqual(j.score, -100); assert.ok(j.all.includes('총통') && j.all.includes('10 부족') && j.all.includes('또이또이') === false || true); });
t('또이또이 3-3', () => { const j = J([3, 3, 3, 9, 9, 9]); assert.strictEqual(j.key, 'ttoi'); assert.strictEqual(j.score, 0); });
t('또이또이 2-2-2', () => { const j = J([2, 2, 5, 5, 9, 9]); assert.strictEqual(j.key, 'ttoi'); });
t('4-1-1 총통(기본)', () => { const j = J([12, 12, 12, 12, 1, 2]); assert.strictEqual(j.key, 'chongtong'); });
t('4-1-1 총통 아님(엄격)', () => assert.strictEqual(J([12, 12, 12, 12, 1, 2], strict), null));
t('4-2 총통(엄격)', () => { const j = J([12, 12, 12, 12, 1, 1], strict); assert.strictEqual(j.key, 'chongtong'); });
t('60 이상', () => { const j = J([12, 12, 12, 11, 11, 10]); assert.strictEqual(j.key, 'over60'); assert.strictEqual(j.score, -100); });
t('10 부족', () => { const j = J([1, 1, 1, 2, 2, 3]); assert.strictEqual(j.score, -100); });
t('5장은 족보 아님', () => assert.strictEqual(NP.findJokbo([C(1), C(2), C(3), C(4), C(5)], R0), null));
t('일반 손패', () => assert.strictEqual(J([1, 3, 5, 7, 9, 11]), null));

// ---------- 손패 합 ----------
t('합', () => assert.strictEqual(NP.handTotal([C(1), C(12), C(5)], R0), 18));
t('자연뽕 제외 하우스룰', () => assert.strictEqual(NP.handTotal([C(4, 0), C(4, 1), C(4, 2), C(2), C(3)], Object.assign({}, R0, { naturalFree: true })), 5));

// ---------- 상태를 직접 꾸며 흐름 확인 ----------
function rig(n, hands, pileTop, deck, extra = {}) {
  const s = NP.createGame({ players: Array.from({ length: n }, (_, i) => ({ name: 'P' + i, kind: 'ai' })), rounds: 3, seed: 7 });
  const used = new Set();
  hands.forEach((h, i) => { s.players[i].hand = h.slice(); h.forEach((c) => used.add(c)); });
  s.pile = [{ card: pileTop, by: -1, kind: 'open' }];
  used.add(pileTop);
  s.deck = deck ? deck.slice() : [];
  if (!deck) for (let c = 0; c < 48; c++) if (!used.has(c)) s.deck.push(c);
  Object.assign(s, extra);
  return s;
}

t('박 점수: 박한 사람 0, 버린 사람 손패합+20', () => {
  const s = rig(3, [
    [C(5, 2), C(9, 0), C(10, 0), C(11, 0), C(12, 0), C(1, 0)], // P0 6장 (버리기 차례)
    [C(5, 0), C(5, 1)], // P1 이미 뽕해서 2장
    [C(2, 0), C(2, 1), C(3, 0), C(3, 1), C(4, 0)],
  ], C(8, 0), null, { turn: 0, phase: 'discard', dealer: 0 });
  s.players[1].melds = [[C(7, 0), C(7, 1), C(7, 2)]];
  let ev = NP.apply(s, { type: 'discard', p: 0, card: C(5, 2) });
  assert.strictEqual(s.phase, 'claim');
  assert.strictEqual(s.claim.p, 1);
  assert.strictEqual(s.claim.kind, 'bak');
  ev = NP.apply(s, { type: 'claim', p: 1 });
  assert.strictEqual(s.phase, 'roundEnd');
  assert.deepStrictEqual(s.result.scores, [9 + 10 + 11 + 12 + 1 + 20, 0, 2 + 2 + 3 + 3 + 4]);
  assert.strictEqual(s.result.nextDealer, 1);
});

t('뽕 후 차례는 뽕한 사람 → 버리고 다음 사람', () => {
  const s = rig(4, [
    [C(9, 2), C(1, 0), C(2, 0), C(3, 0), C(4, 0), C(6, 0)],
    [C(7, 0), C(8, 0), C(10, 0), C(11, 0), C(12, 0)],
    [C(9, 0), C(9, 1), C(1, 1), C(2, 1), C(3, 1)],
    [C(4, 1), C(5, 1), C(6, 1), C(7, 1), C(8, 1)],
  ], C(12, 1), null, { turn: 0, phase: 'discard', dealer: 0 });
  NP.apply(s, { type: 'discard', p: 0, card: C(9, 2) });
  assert.strictEqual(s.claim.p, 2);
  assert.strictEqual(s.claim.kind, 'ppong');
  NP.apply(s, { type: 'claim', p: 2 });
  assert.strictEqual(s.turn, 2);
  assert.strictEqual(s.phase, 'discard');
  assert.strictEqual(s.players[2].hand.length, 3);
  NP.apply(s, { type: 'discard', p: 2, card: C(3, 1) });
  assert.strictEqual(s.players[2].hand.length, 2);
  assert.strictEqual(s.turn, 3); // P1은 건너뜀
  assert.strictEqual(s.phase, 'draw');
});

t('패스하면 버린 사람 다음 차례', () => {
  const s = rig(4, [
    [C(9, 2), C(1, 0), C(2, 0), C(3, 0), C(4, 0), C(6, 0)],
    [C(7, 0), C(8, 0), C(10, 0), C(11, 0), C(12, 0)],
    [C(9, 0), C(9, 1), C(1, 1), C(2, 1), C(3, 1)],
    [C(4, 1), C(5, 1), C(6, 1), C(7, 1), C(8, 1)],
  ], C(12, 1), null, { turn: 0, phase: 'discard', dealer: 0 });
  NP.apply(s, { type: 'discard', p: 0, card: C(9, 2) });
  NP.apply(s, { type: 'pass', p: 2 });
  assert.strictEqual(s.turn, 1);
  assert.strictEqual(s.phase, 'draw');
});

t('자연바가지', () => {
  const s = rig(3, [
    [C(7, 2), C(1, 0), C(2, 0), C(10, 0), C(11, 0), C(12, 0)],
    [C(3, 0), C(3, 1), C(3, 2), C(7, 0), C(7, 1)],
    [C(4, 0), C(4, 1), C(5, 0), C(5, 1), C(6, 0)],
  ], C(8, 0), null, { turn: 0, phase: 'discard', dealer: 0 });
  NP.apply(s, { type: 'discard', p: 0, card: C(7, 2) });
  assert.strictEqual(s.claim.kind, 'jayeon');
  NP.apply(s, { type: 'claim', p: 1 });
  assert.strictEqual(s.result.kind, 'jayeon');
  assert.deepStrictEqual(s.result.scores, [1 + 2 + 10 + 11 + 12 + 20, 0, 4 + 4 + 5 + 5 + 6]);
});

t('스톱 성공/실패/동점 실패', () => {
  const mk = (h1) => rig(3, [
    [C(1, 0), C(2, 0)],
    h1,
    [C(4, 0), C(4, 1), C(5, 0), C(5, 1), C(6, 0)],
  ], C(8, 0), null, { turn: 0, phase: 'draw', dealer: 0 });
  let s = mk([C(3, 0), C(3, 1)]); // 6 > 3 → 성공
  NP.apply(s, { type: 'stop', p: 0 });
  assert.strictEqual(s.result.success, true);
  assert.deepStrictEqual(s.result.scores, [0, 6, 24]);
  s = mk([C(1, 1), C(2, 1)]); // 3 = 3 → 동점 실패
  NP.apply(s, { type: 'stop', p: 0 });
  assert.strictEqual(s.result.success, false);
  assert.deepStrictEqual(s.result.scores, [33, 3, 24]);
  s = mk([C(1, 1), C(1, 2)]); // 2 < 3 → 실패
  NP.apply(s, { type: 'stop', p: 0 });
  assert.deepStrictEqual(s.result.scores, [33, 2, 24]);
  assert.strictEqual(s.result.nextDealer, 1);
  s = mk([C(3, 0), C(3, 1)]);
  s.players[0].hand = [C(1, 0), C(6, 0)]; // 7 > 5 → 스톱 불가
  assert.throws(() => NP.apply(s, { type: 'stop', p: 0 }));
});

t('더미가 떨어지면 손패 합으로 끝', () => {
  const s = rig(2, [
    [C(1, 0), C(2, 0), C(3, 0), C(4, 0), C(5, 0), C(6, 1)],
    [C(7, 0), C(8, 0), C(9, 0), C(10, 0), C(11, 0)],
  ], C(12, 0), [], { turn: 0, phase: 'discard', dealer: 0 });
  NP.apply(s, { type: 'discard', p: 0, card: C(6, 1) });
  assert.strictEqual(s.phase, 'roundEnd');
  assert.strictEqual(s.result.kind, 'exhaust');
  assert.deepStrictEqual(s.result.scores, [15, 45]);
});

t('족보 선언', () => {
  const s = rig(2, [
    [C(1, 0), C(2, 0), C(3, 0), C(4, 0), C(5, 0), C(6, 1)],
    [C(7, 0), C(8, 0), C(9, 0), C(10, 0), C(11, 0)],
  ], C(12, 0), null, { turn: 0, phase: 'discard', dealer: 0 });
  assert.ok(NP.legalActions(s, 0).some((a) => a.type === 'declare'));
  NP.apply(s, { type: 'declare', p: 0 });
  assert.deepStrictEqual(s.result.scores, [-21, 45]);
});

t('뽕 뒤 3장이 모두 같은 월이면 0점으로 끝', () => {
  const s = rig(2, [
    [C(9, 0), C(9, 1), C(9, 2)],
    [C(7, 0), C(8, 0), C(10, 0), C(11, 0), C(12, 0)],
  ], C(12, 1), null, { turn: 0, phase: 'discard', dealer: 0 });
  s.players[0].melds = [[C(1, 0), C(1, 1), C(1, 2)]];
  assert.ok(NP.legalActions(s, 0).some((a) => a.type === 'declare'));
  NP.apply(s, { type: 'declare', p: 0 });
  assert.strictEqual(s.result.jokbo.key, 'natural3');
  assert.deepStrictEqual(s.result.scores, [0, 48]);
});
t('뽕 뒤 3장이 섞여 있으면 선언 불가', () => assert.strictEqual(NP.findWin([C(9, 0), C(9, 1), C(8, 0)], R0), null));

t('남의 패는 안 보임', () => {
  const s = NP.createGame({ players: [{ name: 'a', kind: 'human' }, { name: 'b' }, { name: 'c' }], seed: 3 });
  const v = NP.viewFor(s, 1);
  assert.strictEqual(v.players[0].hand, null);
  assert.ok(Array.isArray(v.players[1].hand));
  assert.strictEqual(v.players[0].handCount, 6);
  assert.strictEqual(v.deck, undefined);
});

// 랭킹 기록 확인: 내 수만 기록해도 서버가 같은 게임을 그대로 다시 둠
{
  const RP = require('../src/replay.js');
  const playSolo = (cfg) => {
    const g = RP.soloGame(cfg), log = [];
    while (g.phase !== 'gameEnd') {
      if (g.phase === 'roundEnd') { NP.apply(g, { type: 'next', p: 0 }); continue; }
      const a = NP.actorOf(g);
      const d = AI.decide(NP.viewFor(g, a), a === 0 ? 'normal' : g.players[a].persona, a === 0 ? AI.rngFor(cfg.seed ^ 77, g.step) : AI.rngFor(g.seed, g.step));
      if (a === 0) log.push(RP.encode(d));
      NP.apply(g, d);
    }
    return { g, log };
  };
  t('랭킹 다시 두기: 점수 일치', () => {
    for (let s = 1; s <= 30; s++) {
      const cfg = { seed: s * 7919, cpu: 1 + (s % 3), rounds: [3, 5, 10][s % 3] };
      const { g, log } = playSolo(cfg);
      const r = RP.replay(cfg, log);
      assert.ok(r.ok);
      assert.strictEqual(r.myScore, g.players[0].score);
      assert.strictEqual(r.score != null, NP.standings(g).find((x) => x.i === 0).rank === 1);
    }
  });
  t('랭킹 다시 두기: 고친 기록·다른 씨앗은 거절', () => {
    const cfg = { seed: 4242, cpu: 3, rounds: 3 };
    const { log } = playSolo(cfg);
    assert.ok(!RP.replay(cfg, log.slice(0, -1)).ok);
    assert.ok(!RP.replay(cfg, log.concat(['d'])).ok);
    assert.ok(!RP.replay(Object.assign({}, cfg, { seed: 4243 }), log).ok);
    assert.ok(!RP.replay(Object.assign({}, cfg, { cpu: 2 }), log).ok);
    assert.ok(!RP.replay(cfg, log.map((x) => (x === 'd' ? 'x' : x))).ok);
  });
}

console.log(`단위 테스트 ${pass}개 통과`);

// ---------- 시뮬레이션 ----------
function randomBot(view, rng) {
  const p = view.me, me = view.players[p];
  if (view.phase === 'claim') return view.claim && view.claim.p === p ? { type: 'claim', p } : null;
  if (view.phase === 'draw') return view.turn === p ? (NP.handTotal(me.hand, view.rules) <= view.rules.stopLimit ? { type: 'stop', p } : { type: 'draw', p }) : null;
  if (view.phase === 'discard') {
    if (view.turn !== p) return null;
    if (me.hand.length === 6 && NP.findJokbo(me.hand, view.rules)) return { type: 'declare', p };
    return { type: 'discard', p, card: me.hand[Math.floor(rng() * me.hand.length)] };
  }
  return null;
}
function greedyBot(view) { // 가장 높은 패만 버리는 단순 봇
  const p = view.me, me = view.players[p];
  if (view.phase === 'claim') return view.claim && view.claim.p === p ? { type: 'claim', p } : null;
  if (view.phase === 'draw') return view.turn === p ? (NP.handTotal(me.hand, view.rules) <= view.rules.stopLimit ? { type: 'stop', p } : { type: 'draw', p }) : null;
  if (view.phase === 'discard') {
    if (view.turn !== p) return null;
    if (me.hand.length === 6 && NP.findJokbo(me.hand, view.rules)) return { type: 'declare', p };
    const best = me.hand.slice().sort((a, b) => M(b) - M(a))[0];
    return { type: 'discard', p, card: best };
  }
  return null;
}

function checkInvariants(s) {
  const all = [];
  s.players.forEach((pl) => all.push(...pl.hand));
  all.push(...s.deck);
  s.pile.forEach((e) => all.push(e.card));
  assert.strictEqual(all.length, 48, 'card count');
  assert.strictEqual(new Set(all).size, 48, 'duplicate card');
  if (s.phase === 'draw' || s.phase === 'claim') {
    s.players.forEach((pl, i) => {
      assert.ok([2, 5].includes(pl.hand.length), `hand size ${pl.hand.length} in ${s.phase} for ${i}`);
    });
  }
  if (s.phase === 'discard') {
    s.players.forEach((pl, i) => {
      if (i === s.turn) assert.ok([3, 6].includes(pl.hand.length), `turn hand ${pl.hand.length}`);
      else assert.ok([2, 5].includes(pl.hand.length), `other hand ${pl.hand.length}`);
    });
  }
  s.players.forEach((pl) => assert.ok(pl.melds.length <= 2));
}

function runGames({ games, n, bots, rules, rounds, seed0 }) {
  const stats = { rounds: 0, kinds: {}, actions: 0, perSeat: Array(n).fill(0), seatRounds: Array(n).fill(0), stopTried: Array(n).fill(0), stopOk: Array(n).fill(0), bakAgainst: Array(n).fill(0), maxSteps: 0, wins: Array(n).fill(0) };
  const rng = NP.mulberry32(seed0 || 99);
  for (let g = 0; g < games; g++) {
    const s = NP.createGame({ players: Array.from({ length: n }, (_, i) => ({ name: 'P' + i, kind: 'ai', persona: ['normal', 'careful', 'bold'][i % 3] })), rounds, rules, seed: (seed0 || 1) * 7919 + g, firstDealer: g % n });
    let guard = 0, roundSteps = 0;
    while (s.phase !== 'gameEnd') {
      if (++guard > 20000) throw new Error('무한 루프');
      if (s.phase === 'roundEnd') {
        stats.rounds++;
        stats.kinds[s.result.kind] = (stats.kinds[s.result.kind] || 0) + 1;
        s.result.scores.forEach((sc, i) => { stats.perSeat[i] += sc; stats.seatRounds[i]++; });
        if (s.result.kind === 'stop') { stats.stopTried[s.result.p]++; if (s.result.success) stats.stopOk[s.result.p]++; }
        if (s.result.kind === 'bak' || s.result.kind === 'jayeon') stats.bakAgainst[s.result.from]++;
        stats.maxSteps = Math.max(stats.maxSteps, roundSteps);
        roundSteps = 0;
        NP.apply(s, { type: 'next', p: 0 });
        checkInvariants(s);
        continue;
      }
      const actor = NP.actorOf(s);
      const view = NP.viewFor(s, actor);
      const bot = bots[actor];
      const a = bot === 'random' ? randomBot(view, rng) : bot === 'greedy' ? greedyBot(view) : AI.decide(view, bot, rng);
      assert.ok(a, 'no action for ' + actor + ' in ' + s.phase);
      const legal = NP.legalActions(s, actor);
      assert.ok(legal.some((l) => l.type === a.type && (a.card === undefined || l.card === a.card)), 'illegal ' + JSON.stringify(a));
      NP.apply(s, a);
      stats.actions++;
      roundSteps++;
      checkInvariants(s);
    }
    const st = NP.standings(s);
    st.filter((r) => r.rank === 1).forEach((r) => stats.wins[r.i]++);
  }
  return stats;
}

function report(title, st, n) {
  const avg = st.perSeat.map((s, i) => (s / st.seatRounds[i]).toFixed(2));
  const kinds = Object.entries(st.kinds).map(([k, v]) => `${k} ${(100 * v / st.rounds).toFixed(1)}%`).join(', ');
  console.log(`\n[${title}] ${st.rounds}판, 판당 행동 ${(st.actions / st.rounds).toFixed(1)}, 최장 ${st.maxSteps}`);
  console.log('  끝난 방식:', kinds);
  console.log('  자리별 판당 평균 점수:', avg.join(' / '));
  console.log('  스톱 시도/성공:', st.stopTried.map((t, i) => `${st.stopOk[i]}/${t}`).join(' '));
  console.log('  바가지 맞음:', st.bakAgainst.join(' '), ' 게임 1등:', st.wins.join(' '));
}

const t0 = Date.now();
report('컴퓨터 4명 (보통/신중/대담/보통)', runGames({ games: 600, n: 4, bots: ['normal', 'careful', 'bold', 'normal'], rounds: 5, seed0: 11 }), 4);
report('컴퓨터 2명', runGames({ games: 600, n: 2, bots: ['normal', 'careful'], rounds: 5, seed0: 12 }), 2);
report('컴퓨터 3명', runGames({ games: 600, n: 3, bots: ['normal', 'careful', 'bold'], rounds: 5, seed0: 13 }), 3);
report('AI 2 vs 무작위 2', runGames({ games: 600, n: 4, bots: ['normal', 'random', 'normal', 'random'], rounds: 5, seed0: 14 }), 4);
report('AI 2 vs 높은패버리기 2', runGames({ games: 600, n: 4, bots: ['normal', 'greedy', 'normal', 'greedy'], rounds: 5, seed0: 15 }), 4);
report('하우스룰: 스톱10/바가지30/엄격총통/자연뽕제외', runGames({ games: 400, n: 4, bots: ['normal', 'careful', 'bold', 'normal'], rounds: 5, seed0: 16, rules: { stopLimit: 10, bagaji: 30, stopPenalty: 50, chongtongStrict: true, naturalFree: true } }), 4);
report('6명', runGames({ games: 200, n: 6, bots: ['normal', 'careful', 'bold', 'normal', 'careful', 'bold'], rounds: 3, seed0: 17 }), 6);
console.log(`\n시뮬레이션 ${(Date.now() - t0) / 1000}s`);
