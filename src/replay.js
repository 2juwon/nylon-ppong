/* 랭킹 기록 확인: 혼자 하기 한 게임을 씨앗과 '내가 둔 수'만으로 처음부터 다시 둔다.
 * 컴퓨터 수는 NPAI.rngFor로 정해지므로 서버에서도 똑같이 나온다.
 * 로그 형식: 숫자 = 그 패 버리기, 'd' 가져오기, 's' 스톱, 'j' 족보 내기, 'c' 뽕, 'p' 넘기기
 */
(function (root, factory) {
  const NP = root.NP || (typeof require === 'function' ? require('./engine.js') : null);
  const NPAI = root.NPAI || (typeof require === 'function' ? require('./ai.js') : null);
  const api = factory(NP, NPAI);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.NPReplay = api;
})(typeof self !== 'undefined' ? self : this, function (NP, NPAI) {
  'use strict';
  const CODE = { draw: 'd', stop: 's', declare: 'j', claim: 'c', pass: 'p' };
  const TYPE = { d: 'draw', s: 'stop', j: 'declare', c: 'claim', p: 'pass' };

  function encode(a) { return a.type === 'discard' ? a.card : CODE[a.type]; }
  function decode(x, p) {
    if (typeof x === 'number' && Number.isInteger(x) && x >= 0 && x < 48) return { type: 'discard', p, card: x };
    if (typeof x === 'string' && TYPE[x]) return { type: TYPE[x], p };
    return null;
  }
  function soloPlayers(cpu) {
    const players = [{ name: '나', kind: 'human' }];
    for (let k = 0; k < cpu; k++) players.push({ name: NPAI.SOLO_CPUS[k][0], kind: 'ai', persona: NPAI.SOLO_CPUS[k][1] });
    return players;
  }
  function soloGame(cfg) {
    return NP.createGame({ players: soloPlayers(cfg.cpu), rounds: cfg.rounds, rules: NP.DEFAULT_RULES, seed: cfg.seed, firstDealer: 0 });
  }
  // 성공하면 { ok, state, score, rank }, 아니면 { error }
  function replay(cfg, log) {
    if (![1, 2, 3].includes(cfg.cpu) || ![3, 5, 10].includes(cfg.rounds)) return { error: '설정이 이상해요' };
    if (!Array.isArray(log) || log.length > 4000) return { error: '기록이 이상해요' };
    const g = soloGame(cfg);
    let k = 0;
    for (let guard = 0; guard < 20000; guard++) {
      if (g.phase === 'gameEnd') break;
      if (g.phase === 'roundEnd') { NP.apply(g, { type: 'next', p: 0 }); continue; }
      const actor = NP.actorOf(g);
      if (actor < 0) return { error: '진행이 멈췄어요' };
      let a;
      if (actor === 0) {
        if (k >= log.length) return { error: '게임이 끝나지 않았어요' };
        a = decode(log[k++], 0);
        if (!a) return { error: '기록이 이상해요' };
      } else {
        a = NPAI.decide(NP.viewFor(g, actor), g.players[actor].persona, NPAI.rngFor(g.seed, g.step));
        if (!a) return { error: '진행이 멈췄어요' };
      }
      try { NP.apply(g, a); } catch (e) { return { error: '기록과 게임이 맞지 않아요' }; }
    }
    if (g.phase !== 'gameEnd') return { error: '게임이 끝나지 않았어요' };
    if (k !== log.length) return { error: '기록이 이상해요' };
    const me = NP.standings(g).find((r) => r.i === 0);
    return { ok: true, state: g, score: me.rank === 1 ? me.score : null, rank: me.rank, myScore: me.score };
  }
  return { encode, decode, soloPlayers, soloGame, replay };
});
