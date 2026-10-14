/* 랭킹: 1등 한 게임의 최종 점수를 닉네임과 함께 저장 (낮을수록 위)
 * - 혼자 하기: 시작할 때 받은 표(씨앗)로 서버가 게임을 처음부터 다시 둬서 점수를 확인
 * - 사람들과: 방 서버가 판을 끝내며 1등에게 점수가 적힌 표를 줌
 * 표는 한 번만 쓸 수 있고 3일 지나면 사라짐. 판 수 × 인원마다 따로 상위 100개만 보관
 */
import { DurableObject } from 'cloudflare:workers';
import NP from '../../src/engine.js';
import NPReplay from '../../src/replay.js';

const KEEP = 100;
const TICKET_TTL = 3 * 24 * 3600 * 1000;
const TICKETS_PER_HOUR = 60;
export const BOARDS = [3, 5, 10].flatMap((r) => [2, 3, 4].map((n) => `${r}-${n}`));

function rand32() { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0]; }
const hex = (bytes) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('');
export function cleanRankName(s) {
  s = String(s || '').replace(/[\u0000-\u001f\u007f<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim();
  return Array.from(s).slice(0, 8).join('');
}
export const defaultRules = (r) => !!r && Object.keys(NP.DEFAULT_RULES).every((k) => r[k] === NP.DEFAULT_RULES[k]);

export class Rank extends DurableObject {
  async tidy() {
    const now = Date.now();
    if (now - (this.lastTidy || 0) < 3600 * 1000) return;
    this.lastTidy = now;
    const old = await this.ctx.storage.list({ prefix: 't:', end: 't:' + (now - TICKET_TTL).toString(36), limit: 500 });
    if (old.size) await this.ctx.storage.delete([...old.keys()]);
  }
  async newTicket(data) {
    const id = Date.now().toString(36) + hex(8);
    await this.ctx.storage.put('t:' + id, { ...data, at: Date.now() });
    return id;
  }
  // 혼자 하기 시작할 때: 씨앗과 표
  async soloTicket(who) {
    await this.tidy();
    const hour = Math.floor(Date.now() / 3600000);
    const rk = 'r:' + who;
    const r = (await this.ctx.storage.get(rk)) || { hour, n: 0 };
    if (r.hour !== hour) { r.hour = hour; r.n = 0; }
    if (r.n >= TICKETS_PER_HOUR) return { error: '잠시 뒤에 다시 해 주세요' };
    r.n += 1;
    await this.ctx.storage.put(rk, r);
    const seed = rand32() || 1;
    return { ticket: await this.newTicket({ kind: 'solo', seed }), seed };
  }
  // 사람들과: 방이 1등에게 줌
  async onlineTicket({ score, rounds, n }) {
    return this.newTicket({ kind: 'online', score, rounds, n });
  }
  async submit(body) {
    const tid = String(body.ticket || '');
    if (!/^[a-z0-9]{6,12}[a-f0-9]{16}$/.test(tid)) return { error: '기록 표가 이상해요' };
    const t = await this.ctx.storage.get('t:' + tid);
    if (!t || Date.now() - t.at > TICKET_TTL) return { error: '이미 등록했거나 너무 오래된 기록이에요' };
    const name = cleanRankName(body.name);
    if (!name) return { error: '이름을 넣어 주세요' };
    let score, rounds, n, mode;
    if (t.kind === 'solo') {
      const cpu = body.cpu | 0;
      rounds = body.rounds | 0;
      const r = NPReplay.replay({ seed: t.seed, cpu, rounds }, body.log);
      if (!r.ok) return { error: r.error };
      if (r.score == null) return { error: '1등 한 게임만 올릴 수 있어요' };
      score = r.score; n = cpu + 1; mode = 'solo';
    } else {
      score = t.score; rounds = t.rounds; n = t.n; mode = 'online';
    }
    const key = `${rounds}-${n}`;
    if (!BOARDS.includes(key)) return { error: '이 설정은 랭킹이 없어요' };
    await this.ctx.storage.delete('t:' + tid);
    const b = (await this.ctx.storage.get('b:' + key)) || { list: [], total: 0 };
    const entry = { id: hex(6), name, score, mode, at: Date.now() };
    b.list.push(entry);
    b.list.sort((x, y) => x.score - y.score || x.at - y.at);
    const place = b.list.indexOf(entry) + 1;
    b.list = b.list.slice(0, KEEP);
    b.total += 1;
    await this.ctx.storage.put('b:' + key, b);
    return { ok: true, board: key, id: entry.id, place: place <= KEEP ? place : null, score, total: b.total };
  }
  async board(key) {
    const b = (await this.ctx.storage.get('b:' + key)) || { list: [], total: 0 };
    return { board: key, list: b.list, total: b.total };
  }
  async all() {
    const out = {};
    for (const k of BOARDS) out[k] = await this.board(k);
    return out;
  }
  async remove(key, id) {
    const b = await this.ctx.storage.get('b:' + key);
    if (!b) return false;
    const before = b.list.length;
    b.list = b.list.filter((e) => e.id !== id);
    await this.ctx.storage.put('b:' + key, b);
    return b.list.length < before;
  }
}
