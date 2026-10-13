/* 나일롱뽕 온라인 서버 (Cloudflare Workers + Durable Objects)
 * - Room: 방 하나. 규칙 엔진(NP)으로 판을 진행하고, 사람마다 그 사람에게 보이는 정보(viewFor)만 보낸다.
 *         빈자리·자리 비운 사람·시간 초과는 컴퓨터(NPAI)가 대신 둔다.
 * - Lobby: 빠른 참가용 공개 방 목록 (하나뿐)
 */
import { DurableObject } from 'cloudflare:workers';
import NP from '../../src/engine.js';
import NPAI from '../../src/ai.js';
import { Inbox, ADMIN_HTML } from './inbox.js';
export { Inbox };

const TURN_MS = 25000;   // 내 차례 제한 시간
const CLAIM_MS = 10000;  // 뽕·박 결정 시간
const NEXT_MS = 30000;   // 판이 끝나고 다음 판까지 최대 대기
const AWAY_MS = 1500;    // 자리 비운 사람 대신 둘 때
const AI_MS = { draw: 800, discard: 1000, claim: 700 };
const EMPTY_ROOM_MS = 30 * 60 * 1000;  // 아무도 없으면 30분 뒤 방 정리
const OPEN_ROOM_TTL = 10 * 60 * 1000;  // 빠른 참가에서 오래된 방은 제외
const AI_POOL = [['삼촌', 'bold'], ['할머니', 'careful'], ['이모', 'normal'], ['고모', 'bold'], ['큰아빠', 'careful']];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
};
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
});

function rand32() { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0]; }
const randomCode = () => String(100000 + (rand32() % 900000));
const randomSeed = () => rand32() || 1;
const lobbyStub = (env) => env.LOBBY.get(env.LOBBY.idFromName('main'));
const roomStub = (env, code) => env.ROOM.get(env.ROOM.idFromName(code));
const inboxStub = (env) => env.INBOX.get(env.INBOX.idFromName('main'));
function adminOk(request, env) {
  const want = env.ADMIN_KEY || '';
  const got = request.headers.get('x-admin-key') || '';
  if (!want || got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

function cleanName(s) {
  s = String(s || '').replace(/[\u0000-\u001f\u007f<>&"']/g, '').replace(/\s+/g, ' ').trim();
  return Array.from(s).slice(0, 8).join('') || '손님';
}
const emptySeat = () => ({ kind: 'empty', pid: null, name: '', persona: null, away: false, ready: false, timeouts: 0, formerPid: null });

function cleanSettings(cur, s) {
  const out = JSON.parse(JSON.stringify(cur));
  if (!s || typeof s !== 'object') return out;
  if ([2, 3, 4].includes(s.max)) out.max = s.max;
  if ([3, 5, 10].includes(s.rounds)) out.rounds = s.rounds;
  if (typeof s.public === 'boolean') out.public = s.public;
  const r = s.rules;
  if (r && typeof r === 'object') {
    if ([5, 10].includes(r.stopLimit)) out.rules.stopLimit = r.stopLimit;
    if ([30, 50].includes(r.stopPenalty)) out.rules.stopPenalty = r.stopPenalty;
    if ([20, 30].includes(r.bagaji)) out.rules.bagaji = r.bagaji;
    if (typeof r.chongtongStrict === 'boolean') out.rules.chongtongStrict = r.chongtongStrict;
    if (typeof r.naturalFree === 'boolean') out.rules.naturalFree = r.naturalFree;
  }
  return out;
}

// 남이 뽑은 패, 남의 뽕 기회, 남이 뽕을 넘긴 사실은 가림 (넘겼다는 것만으로 짝이 있었다는 게 드러나므로)
function redact(last, seat) {
  const action = last.action.type === 'pass' && last.action.p !== seat ? { type: 'wait' } : last.action;
  const events = last.events
    .filter((e) => (e.t !== 'claimChance' && e.t !== 'pass') || e.p === seat)
    .map((e) => (e.t === 'draw' && e.p !== seat ? { t: 'draw', p: e.p } : e));
  return { action, events, step: last.step };
}

export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.room = null;
    this.last = null;
    this.speed = env && env.FAST_TEST === '1' ? 0.1 : 1; // 로컬 테스트에서만 시간을 줄임
    ctx.blockConcurrencyWhile(async () => { this.room = (await ctx.storage.get('room')) || null; });
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  /* ── 방 만들기 (워커·로비가 RPC로 부름). 이미 있는 번호면 false ── */
  async init(code, isPublic) {
    if (this.room) return false;
    this.room = {
      v: 1, code, created: Date.now(), hostPid: null, gen: 0,
      settings: { max: 4, rounds: 5, public: !!isPublic, rules: { ...NP.DEFAULT_RULES } },
      seats: Array.from({ length: 4 }, emptySeat),
      status: 'waiting', game: null, deadline: 0, pending: null,
    };
    await this.arm({ kind: 'cleanup', at: Date.now() + EMPTY_ROOM_MS });
    await this.save();
    return true;
  }

  async save() { if (this.room) await this.ctx.storage.put('room', this.room); }

  async arm(p) {
    if (!this.room) return;
    this.room.pending = p || null;
    this.room.deadline = p && p.visible ? p.at : 0;
    if (p) await this.ctx.storage.setAlarm(p.at);
    else await this.ctx.storage.deleteAlarm();
  }

  /* ── 접속 정보 ── */
  sockets() { return this.ctx.getWebSockets().filter((ws) => ws.readyState === 1); }
  pidOf(ws) { try { return (ws.deserializeAttachment() || {}).pid || null; } catch (e) { return null; } }
  connectedPids(except) {
    const set = new Set();
    for (const ws of this.sockets()) if (ws !== except) { const p = this.pidOf(ws); if (p) set.add(p); }
    return set;
  }
  seatOf(pid) { return pid && this.room ? this.room.seats.findIndex((s) => s.pid === pid) : -1; }
  nextHost(exclude, online) {
    online = online || this.connectedPids();
    const s = this.room.seats.find((x) => x.kind === 'human' && x.pid !== exclude && online.has(x.pid));
    return s ? s.pid : null;
  }
  uniqueName(name, idx) {
    const taken = new Set(this.room.seats.filter((s, i) => i !== idx && s.kind !== 'empty').map((s) => s.name));
    if (!taken.has(name)) return name;
    for (let k = 2; k < 50; k++) { const n = Array.from(name).slice(0, 7).join('') + k; if (!taken.has(n)) return n; }
    return name;
  }

  /* ── 웹소켓 연결 ── */
  async fetch(request) {
    const url = new URL(request.url);
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426 });
    const pair = new WebSocketPair();
    const client = pair[0], server = pair[1];
    this.ctx.acceptWebSocket(server);
    const pid = (url.searchParams.get('pid') || '').toLowerCase();
    const name = cleanName(url.searchParams.get('name'));
    server.serializeAttachment({ pid });
    const fail = (code, message) => {
      try { server.send(JSON.stringify({ t: 'error', fatal: true, code, message })); server.close(4000, code); } catch (e) { /* 이미 닫힘 */ }
      return new Response(null, { status: 101, webSocket: client });
    };
    if (!/^[a-f0-9]{16,64}$/.test(pid)) return fail('bad_player', '접속 정보가 올바르지 않아요. 새로고침해 주세요');
    if (!this.room) return fail('no_room', '없는 방이에요. 방 번호를 확인해 주세요');
    const res = this.join(pid, name);
    if (!res.ok) return fail(res.code, res.message);
    await this.afterChange({ lobby: true });
    return new Response(null, { status: 101, webSocket: client });
  }

  join(pid, name) {
    const r = this.room;
    let i = this.seatOf(pid);
    if (i >= 0) { // 다시 들어옴
      const s = r.seats[i];
      s.away = false; s.timeouts = 0;
      if (r.status === 'waiting') s.name = this.uniqueName(name, i);
      if (!r.hostPid || this.seatOf(r.hostPid) < 0) r.hostPid = pid;
      return { ok: true, seat: i };
    }
    if (r.status === 'waiting') {
      i = r.seats.findIndex((s) => s.kind === 'empty');
      if (i < 0) return { ok: false, code: 'full', message: '방이 꽉 찼어요' };
      r.seats[i] = { ...emptySeat(), kind: 'human', pid, name: this.uniqueName(name, i) };
      if (!r.hostPid || this.seatOf(r.hostPid) < 0) r.hostPid = pid;
      return { ok: true, seat: i };
    }
    // 게임 중이면 컴퓨터 자리를 이어받음 (예전 내 자리 먼저)
    let k = r.seats.findIndex((s) => s.kind === 'ai' && s.formerPid === pid);
    if (k < 0) k = r.seats.findIndex((s) => s.kind === 'ai');
    if (k < 0) return { ok: false, code: 'in_game', message: '게임이 진행 중이고 빈자리가 없어요' };
    const nm = this.uniqueName(name, k);
    r.seats[k] = { ...emptySeat(), kind: 'human', pid, name: nm };
    if (r.game) { r.game.players[k].name = nm; r.game.players[k].kind = 'human'; }
    if (!r.hostPid || this.seatOf(r.hostPid) < 0) r.hostPid = pid;
    return { ok: true, seat: k };
  }

  async webSocketMessage(ws, data) {
    if (typeof data !== 'string' || data.length > 4000) return;
    let msg;
    try { msg = JSON.parse(data); } catch (e) { return; }
    const r = this.room;
    if (!r || !msg || typeof msg.t !== 'string') return;
    const pid = this.pidOf(ws);
    const seat = this.seatOf(pid);
    if (seat < 0) return;
    const s = r.seats[seat];
    const err = (message) => { try { ws.send(JSON.stringify({ t: 'error', message })); } catch (e) { /* 무시 */ } };
    if (s.away || s.timeouts) { s.away = false; s.timeouts = 0; } // 무엇이든 보내면 돌아온 것으로
    try {
      switch (msg.t) {
        case 'act': {
          if (r.status !== 'playing' || !r.game) return err('지금은 할 수 없어요');
          const a = { type: String(msg.type), p: seat };
          if (msg.card != null) a.card = msg.card | 0;
          const ok = NP.legalActions(r.game, seat).some((l) => l.type === a.type && l.type !== 'next' &&
            (l.card === undefined ? a.card === undefined : l.card === a.card));
          if (!ok) { err('지금은 할 수 없는 행동이에요'); return this.afterChange(); }
          return this.play(a);
        }
        case 'ready': {
          if (r.game && r.game.phase === 'roundEnd') {
            s.ready = true;
            const online = this.connectedPids();
            const need = r.seats.filter((x) => x.kind === 'human' && online.has(x.pid) && !x.away);
            if (need.every((x) => x.ready)) return this.play({ type: 'next', p: seat });
          }
          return this.afterChange();
        }
        case 'start':
          if (r.hostPid !== pid) return err('방장만 시작할 수 있어요');
          if (r.status !== 'waiting') return;
          return this.start();
        case 'settings': {
          if (r.hostPid !== pid || r.status !== 'waiting') return;
          const next = cleanSettings(r.settings, msg.settings);
          const humans = r.seats.filter((x) => x.kind === 'human').length;
          if (next.max < humans) { err('지금 들어온 사람보다 적게 줄일 수는 없어요'); next.max = r.settings.max; }
          // 자리 수 맞추기: 사람은 앞으로 모으고 빈자리로 채움
          const people = r.seats.filter((x) => x.kind === 'human');
          r.seats = people.concat(Array.from({ length: next.max - people.length }, emptySeat));
          r.settings = next;
          return this.afterChange({ lobby: true });
        }
        case 'again':
          if (r.hostPid !== pid || r.status !== 'ended') return;
          return this.backToWaiting();
        case 'leave':
          return this.leave(pid);
        case 'hello':
          return this.afterChange();
      }
    } catch (e) {
      console.error('message', e);
      err('서버에서 처리하지 못했어요');
    }
  }

  async webSocketClose(ws, code, reason) {
    try { ws.close(code, reason); } catch (e) { /* 이미 닫힘 */ }
    await this.dropped(ws);
  }
  async webSocketError(ws) { await this.dropped(ws); }

  async dropped(ws) {
    const r = this.room;
    if (!r) return;
    const pid = this.pidOf(ws);
    const i = this.seatOf(pid);
    if (i < 0) return;
    const online = this.connectedPids(ws);
    if (!online.has(pid)) {
      if (r.status === 'waiting') r.seats[i] = emptySeat();
      // 게임 중에는 자리를 남겨 두고 컴퓨터가 대신 둠. 다시 들어오면 이어서
      if (r.hostPid === pid) { const h = this.nextHost(pid, online); if (h) r.hostPid = h; }
    }
    await this.afterChange({ lobby: true, except: ws });
  }

  async leave(pid) {
    const r = this.room;
    const i = this.seatOf(pid);
    if (i >= 0) {
      if (r.status === 'waiting') r.seats[i] = emptySeat();
      else {
        const s = r.seats[i];
        r.seats[i] = { ...emptySeat(), kind: 'ai', name: s.name, persona: 'normal', formerPid: pid };
        if (r.game) r.game.players[i].kind = 'ai';
      }
      if (r.hostPid === pid) r.hostPid = this.nextHost(pid);
    }
    for (const w of this.ctx.getWebSockets()) if (this.pidOf(w) === pid) { try { w.close(1000, 'left'); } catch (e) { /* 무시 */ } }
    await this.afterChange({ lobby: true });
  }

  async start() {
    const r = this.room;
    const used = new Set(r.seats.filter((s) => s.kind === 'human').map((s) => s.name));
    const pool = AI_POOL.filter(([n]) => !used.has(n));
    let k = 0;
    r.seats = r.seats.slice(0, r.settings.max).map((s) => {
      if (s.kind !== 'empty') return { ...s, ready: false, away: false, timeouts: 0 };
      const [name, persona] = pool[k++ % pool.length];
      return { ...emptySeat(), kind: 'ai', name, persona };
    });
    const players = r.seats.map((s) => ({ name: s.name, kind: s.kind === 'ai' ? 'ai' : 'human', persona: s.persona }));
    r.game = NP.createGame({ players, rounds: r.settings.rounds, rules: r.settings.rules, seed: randomSeed(), firstDealer: rand32() % players.length });
    r.status = 'playing';
    r.gen += 1;
    this.last = { action: { type: 'start' }, events: [{ t: 'deal', round: 1, dealer: r.game.dealer }], step: r.game.step };
    await this.afterChange({ last: true, lobby: true });
  }

  async backToWaiting() {
    const r = this.room;
    const online = this.connectedPids();
    const people = r.seats.filter((s) => s.kind === 'human' && online.has(s.pid))
      .map((s) => ({ ...emptySeat(), kind: 'human', pid: s.pid, name: s.name }));
    r.seats = people.concat(Array.from({ length: Math.max(0, r.settings.max - people.length) }, emptySeat));
    r.status = 'waiting';
    r.game = null;
    this.last = null;
    await this.afterChange({ lobby: true });
  }

  async play(a) {
    const r = this.room;
    const g = r.game;
    const events = NP.apply(g, a);
    this.last = { action: a, events, step: g.step };
    if (g.phase === 'roundEnd') r.seats.forEach((s) => { s.ready = false; });
    if (g.phase === 'gameEnd') r.status = 'ended';
    await this.afterChange({ last: true, lobby: g.phase === 'gameEnd' });
  }

  /* ── 다음에 할 일 예약: 사람 차례면 제한 시간, 컴퓨터·자리 비움이면 잠깐 뒤 대신 두기 ── */
  async schedule(online) {
    const r = this.room;
    if (!r) return;
    const now = Date.now();
    const anyone = r.seats.some((s) => s.kind === 'human' && online.has(s.pid));
    if (!anyone) return this.arm({ kind: 'cleanup', at: now + EMPTY_ROOM_MS });
    if (r.status !== 'playing' || !r.game) return this.arm(null);
    const g = r.game;
    const p = r.pending;
    if (g.phase === 'roundEnd') {
      if (p && p.kind === 'next' && p.step === g.step) return this.arm(p);
      return this.arm({ kind: 'next', step: g.step, at: now + NEXT_MS * this.speed, visible: true });
    }
    const actor = NP.actorOf(g);
    if (actor < 0) return this.arm(null);
    const seat = r.seats[actor];
    const live = seat.kind === 'human' && online.has(seat.pid) && !seat.away;
    const kind = live ? 'timeout' : 'ai';
    if (p && p.step === g.step && p.seat === actor && p.kind === kind) return this.arm(p); // 이미 기다리는 중
    if (live) return this.arm({ kind, seat: actor, step: g.step, at: now + (g.phase === 'claim' ? CLAIM_MS : TURN_MS) * this.speed, visible: true });
    const ms = seat.kind === 'human' ? AWAY_MS : (AI_MS[g.phase] || AI_MS.discard);
    return this.arm({ kind, seat: actor, step: g.step, at: now + ms * this.speed });
  }

  async alarm() {
    const r = this.room;
    if (!r || !r.pending) return;
    const p = r.pending;
    try {
      if (p.kind === 'cleanup') {
        if (this.connectedPids().size) { await this.afterChange(); return; }
        await this.removeFromLobby();
        await this.ctx.storage.deleteAlarm();
        await this.ctx.storage.deleteAll();
        this.room = null;
        return;
      }
      const g = r.game;
      if (!g || r.status !== 'playing' || g.step !== p.step) { r.pending = null; await this.afterChange(); return; }
      if (p.kind === 'next') { await this.play({ type: 'next', p: 0 }); return; }
      const seat = r.seats[p.seat];
      if (p.kind === 'timeout') {
        seat.timeouts = (seat.timeouts || 0) + 1;
        if (seat.timeouts >= 2) seat.away = true; // 두 번 연속 시간 초과면 자리 비움으로 보고 빨리 대신 둠
      }
      const a = NPAI.decide(NP.viewFor(g, p.seat), seat.persona || 'normal', Math.random);
      if (a) await this.play(a);
      else { r.pending = null; await this.afterChange(); }
    } catch (e) {
      console.error('alarm', e);
      r.pending = null;
      await this.afterChange();
    }
  }

  async afterChange(opt = {}) {
    const online = this.connectedPids(opt.except);
    await this.schedule(online);
    await this.save();
    this.broadcast(opt.last ? this.last : null, online);
    if (opt.lobby) await this.notifyLobby(online);
  }

  broadcast(last, online) {
    const r = this.room;
    if (!r) return;
    const seats = r.seats.map((s) => ({
      kind: s.kind, name: s.name, away: !!s.away, ready: !!s.ready,
      online: s.kind === 'human' && online.has(s.pid),
    }));
    const base = {
      t: 'state', now: Date.now(),
      room: { code: r.code, status: r.status, settings: r.settings, seats, host: this.seatOf(r.hostPid), gen: r.gen, deadline: r.deadline || 0 },
    };
    const claimWait = r.game && r.game.phase === 'claim' && r.pending ? r.pending.seat : -1;
    for (const ws of this.sockets()) {
      const seat = this.seatOf(this.pidOf(ws));
      const msg = {
        ...base, seat,
        room: claimWait >= 0 && claimWait !== seat ? { ...base.room, deadline: 0 } : base.room,
        view: r.game && seat >= 0 ? NP.viewFor(r.game, seat) : null,
        last: last && seat >= 0 ? redact(last, seat) : null,
      };
      try { ws.send(JSON.stringify(msg)); } catch (e) { /* 끊긴 소켓 */ }
    }
  }

  async notifyLobby(online) {
    const r = this.room;
    if (!r) return;
    online = online || this.connectedPids();
    const humans = r.seats.filter((s) => s.kind === 'human' && online.has(s.pid)).length;
    try {
      await lobbyStub(this.env).update({ code: r.code, public: r.settings.public, status: r.status, humans, max: r.settings.max });
    } catch (e) { console.error('lobby', e); }
  }
  async removeFromLobby() { try { await lobbyStub(this.env).remove(this.room.code); } catch (e) { /* 무시 */ } }
}

export class Lobby extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.rooms = {};
    ctx.blockConcurrencyWhile(async () => { this.rooms = (await ctx.storage.get('rooms')) || {}; });
  }
  async save() { await this.ctx.storage.put('rooms', this.rooms); }
  prune() {
    const now = Date.now();
    for (const [c, r] of Object.entries(this.rooms)) if (now - r.updated > 2 * 60 * 60 * 1000) delete this.rooms[c];
  }
  async update(info) {
    if (!info || !info.code) return;
    const cur = this.rooms[info.code];
    if (!info.public) { if (cur) { delete this.rooms[info.code]; await this.save(); } return; }
    this.rooms[info.code] = { ...cur, ...info, created: cur ? cur.created : Date.now(), updated: Date.now() };
    this.prune();
    await this.save();
  }
  async remove(code) { if (this.rooms[code]) { delete this.rooms[code]; await this.save(); } }
  open() {
    const now = Date.now();
    return Object.values(this.rooms).filter((r) => r.public && r.status === 'waiting' && r.humans < r.max && now - r.updated < OPEN_ROOM_TTL);
  }
  // 사람이 기다리는 공개 방 → 막 만든 빈 공개 방 → 새로 만들기
  async quick() {
    const open = this.open().sort((a, b) => b.humans - a.humans || a.created - b.created);
    if (open.length) {
      open[0].updated = Date.now();
      return { code: open[0].code };
    }
    for (let k = 0; k < 6; k++) {
      const code = randomCode();
      if (await roomStub(this.env, code).init(code, true)) {
        const now = Date.now();
        this.rooms[code] = { code, public: true, status: 'waiting', humans: 0, max: 4, created: now, updated: now };
        await this.save();
        return { code };
      }
    }
    throw new Error('방을 만들지 못했어요');
  }
  async stats() {
    const now = Date.now();
    const open = this.open();
    const playing = Object.values(this.rooms).filter((r) => r.public && r.status === 'playing' && now - r.updated < 60 * 60 * 1000).length;
    return { waitingRooms: open.filter((r) => r.humans > 0).length, waitingPlayers: open.reduce((n, r) => n + r.humans, 0), playingRooms: playing };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      if (url.pathname === '/api/quick' && request.method === 'POST') return json(await lobbyStub(env).quick());
      if (url.pathname === '/api/rooms' && request.method === 'POST') {
        let body = {};
        try { body = await request.json(); } catch (e) { /* 빈 본문 */ }
        const isPublic = !!(body && body.public);
        for (let k = 0; k < 6; k++) {
          const code = randomCode();
          if (await roomStub(env, code).init(code, isPublic)) {
            if (isPublic) await lobbyStub(env).update({ code, public: true, status: 'waiting', humans: 0, max: 4 });
            return json({ code });
          }
        }
        return json({ error: '방을 만들지 못했어요' }, 500);
      }
      if (url.pathname === '/api/stats') return json(await lobbyStub(env).stats());
      if (url.pathname === '/api/feedback' && request.method === 'POST') {
        const len = +(request.headers.get('content-length') || 0);
        if (len > 40000) return json({ error: '내용이 너무 길어요' }, 413);
        let body = {};
        try { body = await request.json(); } catch (e) { return json({ error: '보낸 내용을 읽지 못했어요' }, 400); }
        const who = request.headers.get('CF-Connecting-IP') || 'anon';
        const r = await inboxStub(env).add({ ...body, ua: request.headers.get('User-Agent') || '' }, who);
        return json(r, r.error ? 429 : 200);
      }
      if (url.pathname === '/admin') return new Response(ADMIN_HTML, { headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex', 'cache-control': 'no-store' } });
      if (url.pathname.startsWith('/api/admin/')) {
        if (!env.ADMIN_KEY) return json({ error: '관리자 비밀번호(ADMIN_KEY)가 아직 설정되지 않았어요' }, 503);
        if (!adminOk(request, env)) return json({ error: '비밀번호가 맞지 않아요' }, 401);
        if (url.pathname === '/api/admin/feedback' && request.method === 'GET') return json({ items: await inboxStub(env).list() });
        const fm = url.pathname.match(/^\/api\/admin\/feedback\/([\w-]{6,40})$/);
        if (fm && request.method === 'POST') {
          let b = {};
          try { b = await request.json(); } catch (e) { /* 빈 본문 */ }
          return json({ ok: await inboxStub(env).setStatus(fm[1], b.status) });
        }
        if (fm && request.method === 'DELETE') return json({ ok: await inboxStub(env).remove(fm[1]) });
        return json({ error: 'not found' }, 404);
      }
      const m = url.pathname.match(/^\/ws\/(\d{6})$/);
      if (m) {
        if (request.headers.get('Upgrade') !== 'websocket') return new Response('websocket only', { status: 426, headers: CORS });
        return roomStub(env, m[1]).fetch(request);
      }
      if (url.pathname === '/') return new Response('나일롱뽕 서버가 돌고 있어요', { headers: { 'content-type': 'text/plain; charset=utf-8', ...CORS } });
      return json({ error: 'not found' }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: '서버 오류가 났어요' }, 500);
    }
  },
};
