/* 나일롱뽕 컴퓨터 플레이어
 * viewFor()로 받은 '자기 눈에 보이는 정보'만 사용한다.
 */
(function (root, factory) {
  const NP = root.NP || (typeof require === 'function' ? require('./engine.js') : null);
  const api = factory(NP);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NPAI = api;
})(typeof self !== 'undefined' ? self : this, function (NP) {
  'use strict';
  const M = NP.monthOf;

  // stopAt: 스톱 성공 확률이 이 이상이면 스톱 / danger: 남에게 뽕·박 줄 패를 꺼리는 정도 / noise: 판단 흔들림
  const PERSONAS = {
    careful: { stopAt: 0.74, danger: 1.35, noise: 0.2 },
    normal: { stopAt: 0.64, danger: 1.0, noise: 0.3 },
    bold: { stopAt: 0.54, danger: 0.75, noise: 0.45 },
  };

  function comb(n, k) {
    if (k < 0 || k > n) return 0;
    let r = 1;
    for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
    return r;
  }

  // 모르는 패 N장 중 해당 월이 K장일 때, h장을 쥔 사람이 그 월을 2장 이상 가졌을 확률
  function pAtLeast2(N, K, h) {
    if (K < 2 || h < 2 || N < h) return 0;
    const tot = comb(N, h);
    if (!tot) return 0;
    return Math.max(0, 1 - (comb(N - K, h) + K * comb(N - K, h - 1)) / tot);
  }

  function knowledge(view) {
    const me = view.players[view.me];
    const seen = new Array(13).fill(0);
    const mine = new Array(13).fill(0);
    const unk = new Array(13).fill(0);
    for (const e of view.pile) seen[M(e.card)]++;
    for (const c of me.hand) mine[M(c)]++;
    let N = 0;
    for (let m = 1; m <= 12; m++) { unk[m] = Math.max(0, 4 - seen[m] - mine[m]); N += unk[m]; }
    return { seen, mine, unk, N };
  }

  // 아직 안 보인 같은 월 u장 중 하나라도 남이 버려 줄 가능성 (남은 더미가 많을수록 큼)
  function pComplete(u, deckCount) {
    if (u <= 0) return 0;
    const time = Math.min(1, deckCount / 14);
    const perCopy = 0.18 + 0.2 * time;
    return 1 - Math.pow(1 - perCopy, u);
  }

  // 남길 손패 R의 '예상 비용' (낮을수록 좋음)
  function handCost(R, know, view) {
    const rules = view.rules;
    const total = NP.handTotal(R, rules);
    const cnt = new Array(13).fill(0);
    for (const c of R) cnt[M(c)]++;
    let cost = total;
    if (R.length >= 5) {
      const hasTriple = (except) => {
        for (let m = 1; m <= 12; m++) if (m !== except && cnt[m] === 3) return true;
        return false;
      };
      for (let m = 1; m <= 12; m++) {
        if (cnt[m] < 2) continue;
        const p = pComplete(know.unk[m], view.deckCount);
        if (!p) continue;
        let gain;
        if (cnt[m] === 2 && hasTriple(m)) {
          gain = total + 10; // 자연뽕 + 이 짝 → 뽕 한 번이면 끝(자연바가지)
        } else {
          // 뽕하면 짝 2장이 빠지고, 남은 3장 중 좋은 2장만 쥠
          const rest = [];
          let skipped = 0;
          for (const c of R) {
            if (M(c) === m && skipped < 2) { skipped++; continue; }
            rest.push(M(c));
          }
          rest.sort((a, b) => a - b);
          const after = (rest[0] || 0) + (rest[1] || 0);
          gain = Math.max(0, total - after);
        }
        cost -= p * gain;
      }
    } else if (R.length === 2) {
      const a = M(R[0]), b = M(R[1]);
      if (a === b) {
        const p = pComplete(know.unk[a], view.deckCount);
        cost -= p * (total + 10); // 박 기대
      }
      if (total <= rules.stopLimit) cost -= 1.5;
    }
    return cost;
  }

  // 월 m을 버렸을 때 남에게 뽕/박을 줄 위험
  function dangerOf(m, know, view) {
    const u = know.unk[m];
    if (u < 2) return 0; // 남은 패가 1장 이하면 아무도 뽕 못 함
    let d = 0;
    view.players.forEach((pl, i) => {
      if (i === view.me) return;
      const h = pl.handCount;
      if (h === 2) {
        const base = comb(u, 2) / Math.max(1, comb(know.N, 2));
        const bias = 4 + Math.min(5, pl.drawsSinceMeld * 1.5); // 뽕한 사람은 짝을 남기려 함
        d += Math.min(0.9, base * bias) * (view.rules.bagaji + 12);
      } else if (h >= 5) {
        d += pAtLeast2(know.N, u, h) * 4;
      }
    });
    return d;
  }

  function chooseDiscard(view, persona, rng) {
    const me = view.players[view.me];
    const hand = me.hand;
    const know = knowledge(view);
    const per = PERSONAS[persona] || PERSONAS.normal;
    let best = hand[hand.length - 1];
    let bestCost = Infinity;
    const tried = new Set();
    // 같은 월은 어느 장을 버려도 같으므로 월마다 한 번만 따짐
    const sorted = hand.slice().sort((a, b) => a - b);
    for (const c of sorted) {
      const m = M(c);
      if (tried.has(m)) continue;
      tried.add(m);
      const R = hand.filter((x) => x !== c);
      let cost = handCost(R, know, view) + per.danger * dangerOf(m, know, view);
      cost += (rng() - 0.5) * per.noise;
      if (cost < bestCost) { bestCost = cost; best = c; }
    }
    return best;
  }

  // 스톱 성공 확률(내가 가장 낮을 확률)을 모의로 추정
  function stopChance(view, rng, trials) {
    const me = view.players[view.me];
    const mine = NP.handTotal(me.hand, view.rules);
    const know = knowledge(view);
    const pool = [];
    for (let m = 1; m <= 12; m++) for (let k = 0; k < know.unk[m]; k++) pool.push(m);
    const opps = [];
    view.players.forEach((pl, i) => { if (i !== view.me) opps.push(pl); });
    const T = trials || 400;
    let win = 0;
    const arr = pool.slice();
    for (let t = 0; t < T; t++) {
      let top = arr.length;
      const take = (k) => {
        const out = [];
        for (let j = 0; j < k && top > 0; j++) {
          const r = Math.floor(rng() * top);
          top--;
          const tmp = arr[r]; arr[r] = arr[top]; arr[top] = tmp;
          out.push(arr[top]);
        }
        return out;
      };
      let ok = true;
      for (const o of opps) {
        const h = o.handCount;
        // 상대도 낮은 패를 남기려 하므로, 본 장수 중 낮은 h장을 쥐었다고 봄
        const seenCards = h <= 3 ? Math.min(6, h + 1 + o.drawsSinceMeld) : h + 1;
        const cards = take(seenCards).sort((a, b) => a - b).slice(0, h);
        let s = 0;
        for (const x of cards) s += x;
        if (s <= mine) { ok = false; break; }
      }
      if (ok) win++;
    }
    return win / T;
  }

  function shouldStop(view, persona, rng) {
    const me = view.players[view.me];
    if (NP.handTotal(me.hand, view.rules) > view.rules.stopLimit) return false;
    const per = PERSONAS[persona] || PERSONAS.normal;
    return stopChance(view, rng) >= per.stopAt;
  }

  // 지금 이 컴퓨터가 할 행동 하나를 고름 (할 일이 없으면 null)
  function decide(view, persona, rng) {
    const p = view.me;
    const me = view.players[p];
    rng = rng || Math.random;
    switch (view.phase) {
      case 'claim':
        if (view.claim && view.claim.p === p) return { type: 'claim', p };
        return null;
      case 'draw':
        if (view.turn !== p) return null;
        if (shouldStop(view, persona, rng)) return { type: 'stop', p };
        return { type: 'draw', p };
      case 'discard':
        if (view.turn !== p) return null;
        if (NP.findWin(me.hand, view.rules)) return { type: 'declare', p };
        return { type: 'discard', p, card: chooseDiscard(view, persona, rng) };
      default:
        return null;
    }
  }

  // 컴퓨터 판단에 쓰는 난수: 판의 씨앗과 진행 단계로 정해짐 → 서버가 같은 판을 그대로 다시 둘 수 있음 (랭킹 기록 확인용)
  function rngFor(seed, step) {
    return NP.mulberry32(((seed >>> 0) ^ Math.imul((step | 0) + 1, 0x85EBCA6B) ^ 0x5bd1e995) >>> 0 || 1);
  }
  // 혼자 하기의 컴퓨터 자리 (1번이 내 오른쪽)
  const SOLO_CPUS = [['삼촌', 'bold'], ['할머니', 'careful'], ['이모', 'normal']];

  return { PERSONAS, SOLO_CPUS, rngFor, decide, chooseDiscard, shouldStop, stopChance, knowledge, pAtLeast2 };
});
