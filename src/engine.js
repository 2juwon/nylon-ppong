/* 나일롱뽕 규칙 엔진
 * - 상태는 JSON으로 그대로 저장/전송할 수 있는 순수 데이터
 * - apply(state, action)로만 상태가 바뀜 → 2차(온라인 방)에서도 그대로 재사용
 * - 규칙 출처: 나무위키 '나이롱뽕' 문서
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NP = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MONTH_NAMES = ['', '송학', '매조', '벚꽃', '흑싸리', '난초', '모란', '홍싸리', '공산', '국진', '단풍', '오동', '비'];

  const DEFAULT_RULES = Object.freeze({
    stopLimit: 5,           // 손패 합이 이 값 이하일 때 스톱 가능 (지역에 따라 10)
    stopPenalty: 30,        // 스톱 실패 시 손패 합에 더하는 점수 (지역에 따라 50)
    bagaji: 20,             // 박·자연바가지를 맞은 사람이 더 받는 점수
    chongtongStrict: false, // true면 4-2 형태만 총통으로 인정
    naturalFree: true,      // 손패 속 자연뽕(같은 월 3장)은 점수에서 뺌 (기본값, 끄면 그대로 셈)
    battle: false,          // 전투모드: 뽕은 기다려 주지 않음. 다음 사람이 패를 가져가기 전에 먼저 눌러야 함 (박·자연바가지는 자동)
  });

  const monthOf = (id) => (id >> 2) + 1; // 카드 id 0~47 → 월 1~12

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffledDeck(rand) {
    const a = [];
    for (let i = 0; i < 48; i++) a.push(i);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function sumMonths(hand) {
    let s = 0;
    for (const c of hand) s += monthOf(c);
    return s;
  }

  // 점수로 세는 손패 합 (하우스 룰이 켜져 있으면 자연뽕 3장은 뺌)
  function handTotal(hand, rules) {
    let s = sumMonths(hand);
    if (rules && rules.naturalFree) {
      const cnt = new Array(13).fill(0);
      for (const c of hand) cnt[monthOf(c)]++;
      for (let m = 1; m <= 12; m++) if (cnt[m] >= 3) s -= 3 * m;
    }
    return s;
  }

  // 6장 족보. 여러 개에 해당하면 점수가 가장 좋은(낮은) 것을 고름
  function findJokbo(hand, rules) {
    if (!hand || hand.length !== 6) return null;
    const cnt = new Array(13).fill(0);
    let sum = 0;
    for (const c of hand) { const m = monthOf(c); cnt[m]++; sum += m; }
    const groups = cnt.filter((x) => x > 0).sort((a, b) => b - a);
    const found = [];
    if (groups[0] === 4) {
      const strictOk = groups.length === 2 && groups[1] === 2;
      if (!(rules && rules.chongtongStrict) || strictOk) found.push({ key: 'chongtong', name: '총통', score: -100 });
    }
    if (sum <= 10) found.push({ key: 'under10', name: '10 부족', score: -100 });
    if (sum >= 60) found.push({ key: 'over60', name: '60 이상', score: -100 });
    if (groups.length === 6) {
      let lo = 13, hi = 0;
      for (let m = 1; m <= 12; m++) if (cnt[m]) { lo = Math.min(lo, m); hi = Math.max(hi, m); }
      if (hi - lo === 5) found.push({ key: 'straight', name: '스트레이트', score: -sum });
    }
    const ttoi = (groups.length === 2 && groups[0] === 3 && groups[1] === 3) ||
      (groups.length === 3 && groups.every((g) => g === 2));
    if (ttoi) found.push({ key: 'ttoi', name: '또이또이', score: 0 });
    if (!found.length) return null;
    found.sort((a, b) => a.score - b.score);
    return { key: found[0].key, name: found[0].name, score: found[0].score, sum, all: found.map((f) => f.name) };
  }

  // 지금 손패로 바로 끝낼 수 있는지: 6장 족보, 또는 뽕한 뒤 남은 3장이 모두 같은 월(자연뽕 → 패를 다 턴 것)
  function findWin(hand, rules) {
    if (!hand) return null;
    if (hand.length === 6) return findJokbo(hand, rules);
    if (hand.length === 3 && hand.every((c) => monthOf(c) === monthOf(hand[0]))) {
      return { key: 'natural3', name: '자연뽕', score: 0, sum: sumMonths(hand), all: ['자연뽕 — 패를 다 털었어요'] };
    }
    return null;
  }

  // 버림패 card에 대해 이 손패로 할 수 있는 것: null | 'ppong' | 'bak' | 'jayeon'
  function claimKind(hand, card) {
    const m = monthOf(card);
    const same = hand.filter((x) => monthOf(x) === m);
    if (same.length < 2) return null;
    if (hand.length === 2) return 'bak'; // 이미 한 번 뽕해서 남은 2장이 모두 같은 월
    if (hand.length === 5) {
      const used = same.slice(0, 2);
      const rest = hand.filter((x) => !used.includes(x));
      if (rest.length === 3 && rest.every((x) => monthOf(x) === monthOf(rest[0]))) return 'jayeon';
    }
    return 'ppong';
  }

  function createGame(opts) {
    if (!opts || !Array.isArray(opts.players)) throw new Error('players가 필요해요');
    const n = opts.players.length;
    if (n < 2 || n > 6) throw new Error('2~6명까지 할 수 있어요');
    const state = {
      v: 1,
      rules: Object.assign({}, DEFAULT_RULES, opts.rules || {}),
      players: opts.players.map((p) => ({
        name: String(p.name || '플레이어'),
        kind: p.kind === 'human' ? 'human' : 'ai',
        persona: p.persona || null,
        hand: [], melds: [], score: 0, drawsSinceMeld: 0,
      })),
      rounds: Math.max(1, (opts.rounds | 0) || 5),
      round: 0,
      dealer: Math.min(n - 1, Math.max(0, opts.firstDealer | 0)),
      seed: (opts.seed >>> 0) || 1,
      deck: [], pile: [],
      turn: 0, phase: 'idle', claim: null,
      result: null, history: [],
      step: 0,
    };
    deal(state);
    return state;
  }

  // 반시계방향으로 3장씩, 이어서 선에게 3장·나머지 2장씩 → 선 6장, 나머지 5장
  function deal(state) {
    state.round += 1;
    const rand = mulberry32((state.seed + Math.imul(state.round, 0x9E3779B9)) >>> 0);
    const deck = shuffledDeck(rand);
    const n = state.players.length;
    for (const p of state.players) { p.hand = []; p.melds = []; p.drawsSinceMeld = 0; }
    const order = [];
    for (let k = 0; k < n; k++) order.push((state.dealer + k) % n);
    for (const i of order) for (let c = 0; c < 3; c++) state.players[i].hand.push(deck.pop());
    for (const i of order) {
      const extra = i === state.dealer ? 3 : 2;
      for (let c = 0; c < extra; c++) state.players[i].hand.push(deck.pop());
    }
    state.pile = [{ card: deck.pop(), by: -1, kind: 'open' }];
    state.deck = deck;
    state.turn = state.dealer;
    state.phase = 'discard'; // 선은 이미 6장이므로 버리기부터
    state.claim = null;
    state.result = null;
  }

  function canStop(state, p) {
    if (state.phase !== 'draw' || state.turn !== p) return false;
    return handTotal(state.players[p].hand, state.rules) <= state.rules.stopLimit;
  }

  function findClaimer(state, from, card) {
    const n = state.players.length;
    for (let k = 1; k < n; k++) {
      const q = (from + k) % n;
      if (claimKind(state.players[q].hand, card)) return q;
    }
    return -1;
  }

  // 지금 결정을 내려야 하는 사람
  function actorOf(state) {
    if (state.phase === 'claim' && state.claim) return state.claim.p;
    if (state.phase === 'draw' || state.phase === 'discard') return state.turn;
    return -1;
  }

  function legalActions(state, p) {
    const out = [];
    const pl = state.players[p];
    if (!pl) return out;
    switch (state.phase) {
      case 'draw':
        if (state.claim && state.claim.open && state.claim.p === p) out.push({ type: 'claim', p });
        if (state.turn === p) {
          out.push({ type: 'draw', p });
          if (canStop(state, p)) out.push({ type: 'stop', p });
        }
        break;
      case 'discard':
        if (state.turn === p) {
          if (findWin(pl.hand, state.rules)) out.push({ type: 'declare', p });
          for (const c of pl.hand) out.push({ type: 'discard', p, card: c });
        }
        break;
      case 'claim':
        if (state.claim && state.claim.p === p) {
          out.push({ type: 'claim', p });
          out.push({ type: 'pass', p });
        }
        break;
      case 'roundEnd':
        out.push({ type: 'next', p });
        break;
    }
    return out;
  }

  // 전투모드: 다음 사람이 움직이면 열려 있던 뽕 기회가 사라짐
  function closeClaim(state, ev) {
    if (state.claim && state.claim.open) {
      ev.push({ t: 'missed', p: state.claim.p });
      state.claim = null;
    }
  }

  function advance(state, q, ev) {
    state.turn = q;
    if (state.deck.length === 0) {
      ev.push({ t: 'exhaust' });
      endRound(state, { kind: 'exhaust' }, ev);
    } else {
      state.phase = 'draw';
      ev.push({ t: 'turn', p: q });
    }
  }

  function endRound(state, info, ev) {
    const r = state.rules;
    const P = state.players;
    const n = P.length;
    const totals = P.map((pl) => handTotal(pl.hand, r));
    const scores = totals.slice();
    const notes = P.map(() => []);
    let success = null;
    if (info.kind === 'bak' || info.kind === 'jayeon') {
      scores[info.p] = 0;
      notes[info.p].push(info.kind === 'bak' ? '박' : '자연바가지');
      scores[info.from] = totals[info.from] + r.bagaji;
      notes[info.from].push('바가지 +' + r.bagaji);
    } else if (info.kind === 'stop') {
      const mine = totals[info.p];
      success = totals.every((t, i) => i === info.p || t > mine); // 같은 점수가 있으면 실패
      if (success) { scores[info.p] = 0; notes[info.p].push('스톱 성공'); }
      else { scores[info.p] = mine + r.stopPenalty; notes[info.p].push('스톱 실패 +' + r.stopPenalty); }
    } else if (info.kind === 'jokbo') {
      scores[info.p] = info.jokbo.score;
      notes[info.p].push(info.jokbo.name);
    }
    // 다음 선: 이번 판 점수가 가장 낮은 사람 (동점이면 지금 선부터 차례 순서로 먼저인 사람)
    let best = -1;
    for (let k = 0; k < n; k++) {
      const i = (state.dealer + k) % n;
      if (best < 0 || scores[i] < scores[best]) best = i;
    }
    P.forEach((pl, i) => { pl.score += scores[i]; });
    state.result = {
      round: state.round,
      kind: info.kind,
      p: info.p == null ? -1 : info.p,
      from: info.from == null ? -1 : info.from,
      jokbo: info.jokbo || null,
      success,
      totals, scores, notes,
      hands: P.map((pl) => pl.hand.slice()),
      melds: P.map((pl) => pl.melds.map((m) => m.slice())),
      cumulative: P.map((pl) => pl.score),
      best,
      nextDealer: best,
      last: state.round >= state.rounds,
    };
    state.history.push({ round: state.round, kind: info.kind, p: state.result.p, scores: scores.slice() });
    state.phase = 'roundEnd';
    state.claim = null;
    ev.push({ t: 'roundEnd', result: state.result });
  }

  function apply(state, a) {
    if (!a || typeof a.type !== 'string') throw new Error('잘못된 행동이에요');
    const p = a.p;
    const n = state.players.length;
    const pl = state.players[p];
    const ev = [];
    const fail = (msg) => { throw new Error(msg); };
    if (a.type !== 'next' && !pl) fail('없는 플레이어예요');
    switch (a.type) {
      case 'draw': {
        if (state.phase !== 'draw' || state.turn !== p) fail('지금은 패를 가져올 수 없어요');
        closeClaim(state, ev);
        const card = state.deck.pop();
        pl.hand.push(card);
        pl.drawsSinceMeld += 1;
        state.phase = 'discard';
        ev.push({ t: 'draw', p, card });
        break;
      }
      case 'stop': {
        if (!canStop(state, p)) fail('지금은 스톱할 수 없어요');
        closeClaim(state, ev);
        ev.push({ t: 'stop', p });
        endRound(state, { kind: 'stop', p }, ev);
        break;
      }
      case 'declare': {
        if (state.phase !== 'discard' || state.turn !== p) fail('지금은 족보를 낼 수 없어요');
        const jk = findWin(pl.hand, state.rules);
        if (!jk) fail('족보가 아니에요');
        ev.push({ t: 'declare', p, jokbo: jk });
        endRound(state, { kind: 'jokbo', p, jokbo: jk }, ev);
        break;
      }
      case 'discard': {
        if (state.phase !== 'discard' || state.turn !== p) fail('지금은 버릴 수 없어요');
        const idx = pl.hand.indexOf(a.card);
        if (idx < 0) fail('손에 없는 패예요');
        pl.hand.splice(idx, 1);
        state.pile.push({ card: a.card, by: p, kind: 'discard' });
        ev.push({ t: 'discard', p, card: a.card });
        const q = findClaimer(state, p, a.card);
        if (q >= 0) {
          const kind = claimKind(state.players[q].hand, a.card);
          if (state.rules.battle && kind === 'ppong' && state.deck.length > 0) {
            // 전투모드: 바로 다음 사람 차례로 넘어가고, 그 사람이 가져가기 전까지만 뽕할 수 있음
            state.claim = { p: q, from: p, card: a.card, kind, open: true };
            ev.push({ t: 'claimChance', p: q, from: p, card: a.card, kind, open: true });
            advance(state, (p + 1) % n, ev);
          } else {
            state.claim = { p: q, from: p, card: a.card, kind };
            state.phase = 'claim';
            ev.push({ t: 'claimChance', p: q, from: p, card: a.card, kind });
          }
        } else {
          advance(state, (p + 1) % n, ev);
        }
        break;
      }
      case 'claim': {
        const c = state.claim;
        const openNow = !!(c && c.open && state.phase === 'draw');
        if (!c || c.p !== p || !(state.phase === 'claim' || openNow)) fail('지금은 뽕할 수 없어요');
        const m = monthOf(c.card);
        const used = pl.hand.filter((x) => monthOf(x) === m).slice(0, 2);
        pl.hand = pl.hand.filter((x) => !used.includes(x));
        state.pile.push({ card: used[0], by: p, kind: 'meld' }, { card: used[1], by: p, kind: 'meld' });
        pl.melds.push([c.card, used[0], used[1]]);
        pl.drawsSinceMeld = 0;
        state.claim = null;
        ev.push({ t: 'claim', p, from: c.from, card: c.card, used, kind: c.kind });
        if (c.kind === 'bak' || c.kind === 'jayeon') {
          endRound(state, { kind: c.kind, p, from: c.from }, ev);
        } else {
          state.turn = p;
          state.phase = 'discard';
        }
        break;
      }
      case 'pass': {
        const c = state.claim;
        if (state.phase !== 'claim' || !c || c.p !== p) fail('지금은 넘길 수 없어요');
        state.claim = null;
        ev.push({ t: 'pass', p });
        advance(state, (c.from + 1) % n, ev);
        break;
      }
      case 'next': {
        if (state.phase !== 'roundEnd') fail('아직 판이 끝나지 않았어요');
        if (state.round >= state.rounds) {
          state.phase = 'gameEnd';
          ev.push({ t: 'gameEnd' });
        } else {
          state.dealer = state.result.nextDealer;
          deal(state);
          ev.push({ t: 'deal', round: state.round, dealer: state.dealer });
        }
        break;
      }
      default:
        fail('알 수 없는 행동이에요');
    }
    state.step += 1;
    return ev;
  }

  // 플레이어 p가 볼 수 있는 정보만 담은 사본 (컴퓨터도 이것만 보고 판단 → 남의 패를 훔쳐보지 않음)
  function viewFor(state, p) {
    const reveal = state.phase === 'roundEnd' || state.phase === 'gameEnd';
    let claim = null;
    if (state.claim) {
      if (state.claim.p === p) claim = Object.assign({}, state.claim);
      else if (!state.claim.open) claim = { pending: true, from: state.claim.from, card: state.claim.card };
      // 전투모드의 열린 뽕 기회는 본인만 앎
    }
    return {
      v: state.v, rules: state.rules, rounds: state.rounds, round: state.round, dealer: state.dealer,
      turn: state.turn, phase: state.phase, step: state.step, me: p, claim,
      deckCount: state.deck.length,
      pile: state.pile.map((e) => Object.assign({}, e)),
      players: state.players.map((pl, i) => ({
        name: pl.name, kind: pl.kind, persona: pl.persona, score: pl.score,
        melds: pl.melds.map((m) => m.slice()),
        handCount: pl.hand.length,
        drawsSinceMeld: pl.drawsSinceMeld,
        hand: (i === p || reveal) ? pl.hand.slice() : null,
      })),
      result: state.result,
      history: state.history,
    };
  }

  // 누적 점수 순위 (낮을수록 위, 동점은 같은 순위)
  function standings(state) {
    const rows = state.players.map((pl, i) => ({ i, name: pl.name, score: pl.score }));
    rows.sort((a, b) => a.score - b.score || a.i - b.i);
    let rank = 0, prev = null;
    rows.forEach((r, k) => { if (prev === null || r.score !== prev) rank = k + 1; r.rank = rank; prev = r.score; });
    return rows;
  }

  return {
    MONTH_NAMES, DEFAULT_RULES, monthOf, mulberry32, handTotal, sumMonths, findJokbo, findWin, claimKind,
    createGame, legalActions, apply, actorOf, canStop, viewFor, standings,
  };
});
