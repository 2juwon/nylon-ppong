/* 화투패 48장 그림 (직접 그린 SVG, 50×80)
 * 전통 화투 구도를 따름: 빨간 테두리 + 흰 바탕, 검정·빨강·노랑·파랑의 납작한 색면.
 * HW.sprite() → <defs> 안에 넣을 48장 그림, HW.use(id) → 카드 한 장을 그리는 <use>.
 * 카드 id 0~47: 월 = (id >> 2) + 1, 같은 월 안의 순서 = id & 3 (TYPES 순서와 같음)
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HW = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const R = '#d7261d', K = '#121212', Y = '#f2c014', B = '#2565b8', W = '#ffffff', PK = '#f7aaa6', TL = '#1d8c86';
  const f = (n) => Math.round(n * 100) / 100;
  const rad = (d) => (d * Math.PI) / 180;
  const poly = (pts) => pts.map(([x, y], i) => (i ? 'L' : 'M') + f(x) + ' ' + f(y)).join('') + 'Z';

  // 각 월 네 장의 종류 (게임 점수와는 상관없이 모양새만)
  const TYPES = {
    1: ['gwang', 'hong', 'pi', 'pi'], 2: ['yeol', 'hong', 'pi', 'pi'], 3: ['gwang', 'hong', 'pi', 'pi'],
    4: ['yeol', 'cho', 'pi', 'pi'], 5: ['yeol', 'cho', 'pi', 'pi'], 6: ['yeol', 'cheong', 'pi', 'pi'],
    7: ['yeol', 'cho', 'pi', 'pi'], 8: ['gwang', 'yeol', 'pi', 'pi'], 9: ['yeol', 'cheong', 'pi', 'pi'],
    10: ['yeol', 'cheong', 'pi', 'pi'], 11: ['gwang', 'pi', 'pi', 'ssang'], 12: ['gwang', 'yeol', 'tti', 'ssang'],
  };

  /* ───── 공통 조각 ───── */
  const gwang = (x, y) => `<circle cx="${x}" cy="${y}" r="4.7" fill="${R}" stroke="${W}" stroke-width="0.9"/><text x="${x}" y="${f(y + 2.25)}" font-size="6.3" text-anchor="middle" fill="${W}" font-weight="700" font-family="'Noto Serif CJK KR','Noto Serif KR','Batang','AppleMyungjo',serif">光</text>`;
  // 띠: 아래 끝이 갈라진 긴 종이. label이 있으면 세로 글씨
  function ribbon(x, y, rot, color, label, len = 32) {
    const w = 9.6;
    const body = `<path d="M0 0H${w}V${len}L${w / 2} ${len - 3.2}L0 ${len}Z" fill="${color}" stroke="${K}" stroke-width="0.5"/>`;
    let txt = '';
    if (label) {
      const fill = K;
      txt = Array.from(label).map((ch, i) => `<text x="${w / 2}" y="${f(8.6 + i * 9.4)}" font-size="7.4" text-anchor="middle" fill="${fill}" font-weight="700" font-family="'Nanum Brush Script','Nanum Pen Script','Gungsuh','Batang',serif">${ch}</text>`).join('');
    }
    return `<g transform="translate(${x} ${y}) rotate(${rot})">${body}${txt}</g>`;
  }
  const hong = (x, y, rot) => ribbon(x, y, rot, R, '홍단');
  const cheong = (x, y, rot) => ribbon(x, y, rot, B, '청단');
  const cho = (x, y, rot) => ribbon(x, y, rot, R, '', 30);

  // 산등성이: 꼭짓점 목록 → 검은 산 + 가장자리 흰 솔잎 결 + 봉우리마다 노란 솔잎
  function ridge(pts, tips) {
    let s = `<path d="${poly([[pts[0][0], 82], ...pts, [pts[pts.length - 1][0], 82]])}" fill="${K}"/>`;
    let d = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const L = Math.hypot(x1 - x0, y1 - y0), n = Math.floor(L / 1.25);
      const nx = -(y1 - y0) / L, ny = (x1 - x0) / L; // 아래쪽(산 안쪽)으로 향하는 법선
      const sgn = ny > 0 ? 1 : -1;
      for (let k = 1; k < n; k++) {
        const t = k / n, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t;
        const len = 1.4 + ((k * 7) % 3) * 0.45;
        d += `M${f(px)} ${f(py)}l${f(nx * sgn * len + (x1 - x0) / L * 0.5)} ${f(ny * sgn * len)}`;
      }
    }
    s += `<path d="${d}" stroke="${W}" stroke-width="0.45" fill="none"/>`;
    (tips || []).forEach(([x, y, r = 1.6]) => {
      s += `<path d="M${f(x - r)} ${f(y + 0.6)}Q${x} ${f(y - r * 1.6)} ${f(x + r)} ${f(y + 0.6)}Z" fill="${Y}" stroke="${K}" stroke-width="0.3"/>`;
    });
    return s;
  }

  // 매화: 꽃잎 다섯 장 + 노란 수술
  function plum(cx, cy, r, rot = 0) {
    let s = `<g transform="translate(${cx} ${cy}) rotate(${rot})">`;
    for (let i = 0; i < 5; i++) {
      const a = rad(i * 72 - 90);
      s += `<circle cx="${f(Math.cos(a) * r * 0.5)}" cy="${f(Math.sin(a) * r * 0.5)}" r="${f(r * 0.52)}" fill="${R}" stroke="${K}" stroke-width="0.35"/>`;
    }
    s += `<circle r="${f(r * 0.34)}" fill="${Y}"/>`;
    for (let i = 0; i < 6; i++) { const a = rad(i * 60); s += `<circle cx="${f(Math.cos(a) * r * 0.22)}" cy="${f(Math.sin(a) * r * 0.22)}" r="0.32" fill="${R}"/>`; }
    return s + '</g>';
  }
  const bud = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${R}" stroke="${K}" stroke-width="0.35"/><path d="M${f(cx - r * 0.7)} ${f(cy + r * 0.6)}L${cx} ${f(cy + r * 1.5)}L${f(cx + r * 0.7)} ${f(cy + r * 0.6)}Z" fill="${K}"/>`;

  // 벚꽃: 끝이 파인 꽃잎 다섯 장
  function cherry(cx, cy, r, fill, rot = 0) {
    const edge = fill === R ? K : R;
    let s = `<g transform="translate(${cx} ${cy}) rotate(${rot})">`;
    const pet = `M0 0C${f(-r * 0.55)} ${f(-r * 0.3)} ${f(-r * 0.62)} ${f(-r * 0.95)} ${f(-r * 0.2)} ${f(-r * 1.02)}L0 ${f(-r * 0.82)}L${f(r * 0.2)} ${f(-r * 1.02)}C${f(r * 0.62)} ${f(-r * 0.95)} ${f(r * 0.55)} ${f(-r * 0.3)} 0 0Z`;
    for (let i = 0; i < 5; i++) s += `<path d="${pet}" transform="rotate(${i * 72})" fill="${fill}" stroke="${edge}" stroke-width="0.4"/>`;
    s += `<circle r="${f(r * 0.24)}" fill="${fill === R ? Y : R}"/>`;
    for (let i = 0; i < 5; i++) { const a = rad(i * 72 + 36); s += `<path d="M0 0L${f(Math.cos(a) * r * 0.5)} ${f(Math.sin(a) * r * 0.5)}" stroke="${fill === R ? Y : R}" stroke-width="0.35"/>`; }
    return s + '</g>';
  }

  // 줄기에 동그란 잎이 번갈아 달림 (흑싸리·홍싸리)
  function stem(x0, y0, cx, cy, x1, y1, n, size, colors, sideways = 0) {
    let s = `<path d="M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}" stroke="${K}" stroke-width="0.7" fill="none"/>`;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 0.6);
      const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      const side = i % 2 ? 1 : -1;
      const sz = size * (1 - t * 0.35);
      const col = colors[i % colors.length];
      s += `<ellipse cx="0" cy="${f(-sz * 0.9)}" rx="${f(sz * 0.5)}" ry="${f(sz * 0.95)}" fill="${col}" transform="translate(${f(px)} ${f(py)}) rotate(${f(ang + 90 + side * (50 + sideways))})"/>`;
    }
    return s;
  }

  // 길쭉한 칼잎 (난초·창포)
  const blade = (x, y, h, lean, w = 3.2) => `<path d="M${f(x - w / 2)} ${y}Q${f(x + lean * 0.3)} ${f(y - h * 0.6)} ${f(x + lean)} ${f(y - h)}Q${f(x + lean * 0.2 + w * 0.3)} ${f(y - h * 0.5)} ${f(x + w / 2)} ${y}Z" fill="${K}"/>`;
  // 붓꽃
  function iris(cx, cy, s) {
    const p = (d) => `<path d="${d}" fill="${B}" stroke="${K}" stroke-width="0.35"/>`;
    return `<g transform="translate(${cx} ${cy}) scale(${s})">` +
      p('M0 0C-1.6 -3 -1.2 -6.5 0 -8C1.2 -6.5 1.6 -3 0 0Z') +
      p('M0 0C-2.5 -1.5 -6 -1 -7 2C-5.5 4.5 -3 4 -1 1.5Z') +
      p('M0 0C2.5 -1.5 6 -1 7 2C5.5 4.5 3 4 1 1.5Z') +
      `<path d="M-4.8 1.6L-2 0.8M4.8 1.6L2 0.8" stroke="${Y}" stroke-width="0.7"/><path d="M0 0.5L0 6" stroke="${K}" stroke-width="0.7"/></g>`;
  }

  // 모란
  function peony(cx, cy, r) {
    let s = `<g transform="translate(${cx} ${cy})">`;
    for (let i = 0; i < 9; i++) { const a = rad(i * 40 + 10); s += `<circle cx="${f(Math.cos(a) * r * 0.62)}" cy="${f(Math.sin(a) * r * 0.62)}" r="${f(r * 0.42)}" fill="${R}" stroke="${K}" stroke-width="0.4"/>`; }
    s += `<circle r="${f(r * 0.66)}" fill="${R}"/>`;
    for (let i = 0; i < 6; i++) { const a = rad(i * 60 + 30); s += `<path d="M${f(Math.cos(a) * r * 0.2)} ${f(Math.sin(a) * r * 0.2)}Q${f(Math.cos(a + 0.5) * r * 0.62)} ${f(Math.sin(a + 0.5) * r * 0.62)} ${f(Math.cos(a + 1) * r * 0.45)} ${f(Math.sin(a + 1) * r * 0.45)}" stroke="${K}" stroke-width="0.4" fill="none"/>`; }
    s += `<path d="M${f(-r * 0.25)} ${f(r * 0.05)}Q0 ${f(-r * 0.4)} ${f(r * 0.25)} ${f(r * 0.05)}Q0 ${f(r * 0.25)} ${f(-r * 0.25)} ${f(r * 0.05)}Z" fill="${Y}" stroke="${K}" stroke-width="0.3"/>`;
    return s + '</g>';
  }
  // 끝이 셋으로 갈라진 검은 잎 (모란)
  const peonyLeaf = (x, y, s, rot) => `<path d="M0 2C-3 -1 -7 -2 -9 -6L-6.5 -6.4L-8.5 -10L-5 -9.4L-5.6 -13.5L-2.4 -11L-1 -16L0.6 -11.4L3.4 -14.6L3.6 -10L7.6 -11.6L6 -7.4L9.6 -6.6C7 -2.5 3 -1 0 2Z" fill="${K}" transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"/>`;

  // 국화
  function chrys(cx, cy, r, outer, inner) {
    let s = `<g transform="translate(${cx} ${cy})">`;
    for (let i = 0; i < 22; i++) { const a = i * (360 / 22); s += `<path d="M0 0L${f(-r * 0.12)} ${f(-r * 0.7)}L0 ${f(-r)}L${f(r * 0.12)} ${f(-r * 0.7)}Z" fill="${outer}" stroke="${K}" stroke-width="0.25" transform="rotate(${f(a)})"/>`; }
    for (let i = 0; i < 16; i++) { const a = i * 22.5 + 11; s += `<path d="M0 0L${f(-r * 0.1)} ${f(-r * 0.45)}L0 ${f(-r * 0.62)}L${f(r * 0.1)} ${f(-r * 0.45)}Z" fill="${inner}" stroke="${K}" stroke-width="0.2" transform="rotate(${f(a)})"/>`; }
    return s + `<circle r="${f(r * 0.2)}" fill="${Y}" stroke="${K}" stroke-width="0.3"/></g>`;
  }
  // 몽글몽글한 검은 잎 덩어리 (국화·오동)
  function blob(cx, cy, r, n = 7, seed = 1) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = rad(i * (360 / n) + seed * 17);
      const rr = r * (0.55 + ((i * 37 + seed * 13) % 10) / 40);
      s += `<circle cx="${f(cx + Math.cos(a) * r * 0.55)}" cy="${f(cy + Math.sin(a) * r * 0.45)}" r="${f(rr * 0.6)}" fill="${K}"/>`;
    }
    return s + `<ellipse cx="${cx}" cy="${cy}" rx="${f(r * 0.7)}" ry="${f(r * 0.55)}" fill="${K}"/>`;
  }

  // 단풍잎
  function maple(cx, cy, r, fill, rot = 0) {
    const pts = [];
    const lobes = [[-90, 1], [-62, 0.42], [-38, 0.95], [-10, 0.4], [18, 0.82], [45, 0.36], [70, 0.35], [90, 0.25], [110, 0.35], [135, 0.36], [162, 0.82], [190, 0.4], [218, 0.95], [242, 0.42]];
    lobes.forEach(([a, k]) => pts.push([Math.cos(rad(a)) * r * k, Math.sin(rad(a)) * r * k]));
    let s = `<g transform="translate(${cx} ${cy}) rotate(${rot})"><path d="${poly(pts)}" fill="${fill}" stroke="${fill === K ? K : K}" stroke-width="0.35" stroke-linejoin="round"/>`;
    if (fill !== K) s += `<path d="M0 ${f(r * 0.25)}L0 ${f(-r * 0.85)}M0 0L${f(r * 0.8)} ${f(-r * 0.4)}M0 0L${f(-r * 0.8)} ${f(-r * 0.4)}M0 0L${f(r * 0.65)} ${f(r * 0.3)}M0 0L${f(-r * 0.65)} ${f(r * 0.3)}" stroke="${K}" stroke-width="0.3"/>`;
    return s + `<path d="M0 ${f(r * 0.25)}L0 ${f(r * 0.75)}" stroke="${K}" stroke-width="0.5"/></g>`;
  }

  // 오동잎: 크고 넓은 검은 잎
  const paulLeaf = (x, y, s, rot = 0) => `<path d="M0 0C-6 1 -12 -2 -13 -8C-14 -13 -10 -15 -7 -14C-6 -17 -2 -19 0 -18C2 -19 6 -17 7 -14C10 -15 14 -13 13 -8C12 -2 6 1 0 0Z" fill="${K}" transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"/>`;
  // 오동꽃 (파란 별 모양)
  function star(cx, cy, r) {
    const pts = [];
    for (let i = 0; i < 10; i++) { const a = rad(i * 36 - 90); const k = i % 2 ? 0.45 : 1; pts.push([cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k]); }
    return `<path d="${poly(pts)}" fill="${B}" stroke="${K}" stroke-width="0.35" stroke-linejoin="round"/><circle cx="${cx}" cy="${cy}" r="${f(r * 0.18)}" fill="${W}"/>`;
  }

  // 버드나무 가지: 위에서 늘어지는 굵은 검은 줄기
  const willow = (x, w, sway, len) => `<path d="M${f(x - w / 2)} -2C${f(x - w / 2 + sway)} ${f(len * 0.4)} ${f(x + sway * 0.4)} ${f(len * 0.8)} ${f(x + sway * 0.8)} ${len}C${f(x + sway * 0.4 + w * 0.6)} ${f(len * 0.75)} ${f(x + w / 2 + sway)} ${f(len * 0.4)} ${f(x + w / 2)} -2Z" fill="${K}"/>`;

  // 붉은 구름 (테두리만)
  const cloud = (x, y, s, col = R) => `<path d="M0 0C-1 -3 2 -5 4 -3C5 -6 9 -6 10 -3C12 -5 15 -3 14 0Z" fill="${W}" stroke="${col}" stroke-width="0.8" transform="translate(${x} ${y}) scale(${s})"/><path d="M${f(x + 2 * s)} ${f(y - 1.2 * s)}q${f(1.5 * s)} ${f(-1.2 * s)} ${f(3 * s)} 0M${f(x + 7 * s)} ${f(y - 1.5 * s)}q${f(1.5 * s)} ${f(-1.2 * s)} ${f(3 * s)} 0" stroke="${col}" stroke-width="0.6" fill="none"/>`;

  // 새: 몸·배·날개·부리 (dir 1 = 오른쪽을 봄)
  function songbird(x, y, s, dir, body, belly, wing) {
    return `<g transform="translate(${x} ${y}) scale(${f(s * dir)} ${s})">` +
      `<path d="M-9 4L-15 7L-14 4L-16 2L-9 2Z" fill="${wing}" stroke="${K}" stroke-width="0.4"/>` +
      `<path d="M-10 3C-8 -3 -1 -5 4 -4C7 -4 8 -2 7 0C5 3 0 5 -5 5C-8 5 -10 4 -10 3Z" fill="${body}" stroke="${K}" stroke-width="0.5"/>` +
      `<path d="M-6 4C-3 2 2 2 6 0C5 3 0 5 -5 5Z" fill="${belly}" stroke="${K}" stroke-width="0.4"/>` +
      `<path d="M-8 1C-5 -2 -1 -2 1 0C-2 1 -5 2 -8 1Z" fill="${wing}" stroke="${K}" stroke-width="0.4"/>` +
      `<path d="M7 -2.4L10 -1.6L7 -0.6Z" fill="${K}"/><circle cx="4.6" cy="-2.2" r="0.6" fill="${K}"/></g>`;
  }
  // 날아가는 새 (뻐꾸기·기러기·제비)
  function flyer(x, y, s, rot, body, wing, accent) {
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">` +
      `<path d="M-2 -1C-6 -7 -11 -9 -15 -8C-11 -5 -8 -2 -5 1Z" fill="${wing}" stroke="${K}" stroke-width="0.5"/>` +
      `<path d="M-11 1C-7 -2 0 -3 6 -2C9 -1.5 10 0 9 1C7 3 0 4 -6 3L-12 5L-11 2Z" fill="${body}" stroke="${K}" stroke-width="0.5"/>` +
      `<path d="M-1 0C2 4 3 8 2 12C0 9 -3 5 -5 2Z" fill="${wing}" stroke="${K}" stroke-width="0.5"/>` +
      (accent ? `<path d="M2 1C4 2 6 2 8 1" stroke="${accent}" stroke-width="1.1" fill="none"/>` : '') +
      `<path d="M9 -0.5L12 0.3L9 1.1Z" fill="${K}"/><circle cx="7" cy="-0.6" r="0.55" fill="${K}"/></g>`;
  }

  /* ───── 48장 ───── */
  const ART = {};

  // 1월 송학
  ART[0] = `<circle cx="9" cy="10" r="13" fill="${R}"/>` +
    ridge([[20, 82], [24, 66], [29, 56], [33, 50], [37, 44], [41, 40], [45, 36], [50, 33]], [[37, 44], [45, 36]]) +
    ridge([[-1, 66], [4, 62], [8, 66], [12, 72], [14, 82]], [[4, 62, 1.3]]) +
    // 학
    `<path d="M8 50L1 54L5 55L1 59L8 56L11 55Z" fill="${K}"/>` +
    `<path d="M7 51C7 44 16 40 24 43C29 45 29 53 23 56C17 59 9 57 7 51Z" fill="${W}" stroke="${K}" stroke-width="0.7"/>` +
    `<path d="M11 49C14 46 18 45 22 46M12 52C15 50 19 49 23 50" stroke="${K}" stroke-width="0.5" fill="none"/>` +
    `<path d="M24 44C27 36 24 28 23 21C22.5 17 24 14 26.5 13.6" stroke="${K}" stroke-width="2.6" fill="none" stroke-linecap="round"/>` +
    `<path d="M24 44C27 36 24 28 23 21C22.5 17 24 14 26.5 13.6" stroke="${W}" stroke-width="1.4" fill="none" stroke-linecap="round"/>` +
    `<circle cx="27" cy="13.6" r="1.9" fill="${W}" stroke="${K}" stroke-width="0.6"/><circle cx="26.6" cy="12.4" r="0.9" fill="${R}"/>` +
    `<path d="M28.6 13.4L33.5 14.6L28.6 14.6Z" fill="${K}"/><circle cx="27.4" cy="13.5" r="0.35" fill="${K}"/>` +
    `<path d="M15 57L14 77M20 57.5L21 77M14 77h-2.4M21 77h2.4" stroke="${K}" stroke-width="0.8"/>` +
    gwang(41, 71);
  ART[1] = ridge([[-1, 52], [6, 40], [11, 33], [16, 42], [22, 52], [28, 42], [33, 32], [38, 40], [43, 48], [47, 42], [51, 38]], [[11, 33], [33, 32], [47, 42, 1.3]]) +
    hong(6, 5, -10);
  ART[2] = ridge([[-1, 40], [5, 28], [10, 18], [15, 28], [20, 40], [25, 30], [30, 20], [35, 30], [40, 40], [45, 30], [51, 22]], [[10, 18], [30, 20], [45, 30, 1.3], [20, 40, 1.2]]);
  ART[3] = ridge([[-1, 14], [5, 22], [10, 32], [15, 44], [20, 56], [25, 62], [30, 54], [35, 42], [40, 30], [45, 20], [51, 12]], [[25, 62, 1.3], [5, 22, 1.2], [45, 20, 1.2]]);

  // 2월 매조
  const plumBranch = `<path d="M-2 58C10 52 18 48 26 40C32 34 40 30 52 26" stroke="${K}" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M26 40C24 32 22 26 22 18M36 33C40 40 42 46 44 54" stroke="${K}" stroke-width="1.6" fill="none"/>`;
  ART[4] = plumBranch + songbird(24, 23, 1.15, 1, TL, Y, B) + plum(8, 66, 5.5) + plum(20, 72, 5) + plum(36, 62, 5.2, 20) + plum(44, 54, 4) + plum(42, 14, 4.5) + bud(30, 70, 1.6) + bud(14, 58, 1.4) + bud(46, 72, 1.6) + bud(36, 8, 1.3);
  ART[5] = `<path d="M-2 66C12 58 24 54 52 50" stroke="${K}" stroke-width="3" fill="none"/><path d="M30 54C32 46 34 40 38 34" stroke="${K}" stroke-width="1.4" fill="none"/>` +
    plum(10, 14, 5.5) + plum(38, 30, 5) + plum(40, 46, 4.5) + plum(10, 58, 4.8) + plum(28, 68, 5.2) + plum(44, 66, 5) + bud(42, 18, 1.5) + bud(18, 64, 1.4) + bud(20, 22, 1.4) +
    hong(17, 6, -6);
  ART[6] = `<path d="M10 -2C11 14 9 30 14 46M24 -2C24 16 26 30 22 50M36 -2C38 14 34 26 40 44" stroke="${K}" stroke-width="1.7" fill="none"/>` +
    plum(14, 50, 5.2) + plum(26, 58, 5.6) + plum(38, 50, 5) + plum(18, 68, 5) + plum(34, 70, 5.2) + plum(44, 62, 4) + plum(8, 62, 4.2) +
    bud(14, 34, 1.4) + bud(24, 38, 1.5) + bud(38, 30, 1.4) + bud(26, 76, 1.4);
  ART[7] = `<path d="M30 -2C30 14 28 22 32 34M40 -2C42 12 44 20 42 36M18 -2C20 10 18 20 22 30" stroke="${K}" stroke-width="1.7" fill="none"/><path d="M-2 66C14 60 26 58 40 54" stroke="${K}" stroke-width="2.6" fill="none"/>` +
    plum(32, 38, 5) + plum(44, 40, 4.5) + plum(20, 34, 4.6) + plum(12, 50, 5.4) + plum(26, 50, 5) + plum(40, 54, 4.8) + plum(16, 68, 5) + plum(34, 70, 5) +
    bud(32, 22, 1.4) + bud(42, 24, 1.4) + bud(46, 70, 1.4);

  // 3월 벚꽃
  ART[8] = cherry(10, 10, 6.5, R) + cherry(24, 8, 6, PK, 20) + cherry(38, 12, 6.5, R, 10) + cherry(16, 24, 6, PK, 30) + cherry(32, 26, 6.5, R, 40) + cherry(45, 28, 5, PK) + cherry(5, 34, 5, R) +
    `<rect x="0" y="40" width="50" height="6" fill="${K}"/>` +
    [3, 9, 15, 21, 27, 33, 39, 45].map((x) => `<rect x="${x - 1.4}" y="41.6" width="2.8" height="2.8" fill="${B}" stroke="${W}" stroke-width="0.4"/>`).join('') +
    [6, 12, 18, 24, 30, 36, 42].map((x) => `<path d="M${x - 1} 42l2 2m0 -2l-2 2" stroke="${R}" stroke-width="0.6"/>`).join('') +
    `<path d="M0 46H50V62C44 66 38 62 32 65C26 68 20 62 14 66C8 69 4 64 0 66Z" fill="${K}"/>` +
    `<path d="M0 66C4 64 8 69 14 66C20 62 26 68 32 65C38 62 44 66 50 62V80H0Z" fill="${R}"/>` +
    `<path d="M0 70C10 66 30 74 50 68" stroke="${K}" stroke-width="0.6" fill="none"/>` + gwang(9, 70);
  ART[9] = `<path d="M-2 78C8 66 14 58 22 46C28 38 36 28 52 20" stroke="${K}" stroke-width="3.4" fill="none"/>` +
    cherry(8, 12, 6, PK) + cherry(40, 10, 6.5, R) + cherry(10, 30, 6, R, 30) + cherry(36, 34, 6.5, PK) + cherry(42, 50, 5.5, R) + cherry(12, 52, 6, PK, 10) + cherry(30, 66, 6, R) + cherry(44, 70, 5, PK) + cherry(6, 70, 5, R) +
    hong(18, 8, -8);
  ART[10] = `<path d="M-2 76C10 64 18 56 22 44C26 34 22 22 30 10M22 44C30 40 38 42 48 36" stroke="${K}" stroke-width="3.2" fill="none"/>` +
    cherry(10, 10, 6.5, R) + cherry(24, 12, 6, PK, 20) + cherry(40, 14, 6.5, R) + cherry(14, 28, 6, PK) + cherry(34, 28, 6.5, R, 30) + cherry(8, 46, 6, R) + cherry(44, 44, 5.5, PK) + cherry(32, 52, 6, R, 10) + cherry(16, 62, 5.5, PK) + cherry(40, 66, 5.5, R);
  ART[11] = `<path d="M52 72C40 62 34 56 30 46C26 34 30 22 22 8M30 46C22 42 12 44 2 38" stroke="${K}" stroke-width="3.2" fill="none"/>` +
    cherry(10, 12, 6, PK) + cherry(30, 10, 6.5, R) + cherry(42, 22, 6, PK, 20) + cherry(12, 30, 6.5, R, 10) + cherry(28, 30, 5.5, PK) + cherry(42, 42, 6, R) + cherry(8, 50, 6, PK) + cherry(22, 56, 6.5, R, 30) + cherry(38, 64, 5.5, PK) + cherry(10, 70, 5.5, R);

  // 4월 흑싸리
  const kStems = (dir) => [8, 16, 24, 32, 40].map((x, i) => dir > 0
    ? stem(x + 2, 82, x - 2 + (i % 2) * 4, 50, x + (i % 2 ? 3 : -3), 18 + (i % 3) * 6, 7, 4.6, [K])
    : stem(x + 2, -2, x + (i % 2) * 4, 30, x + (i % 2 ? 4 : -2), 62 - (i % 3) * 6, 7, 4.6, [K]));
  ART[12] = flyer(26, 16, 1.25, -18, Y, Y, R) + cloud(4, 74, 0.9) +
    stem(4, 82, 6, 60, 14, 40, 6, 4.6, [K]) + stem(14, 82, 18, 64, 24, 50, 5, 4.4, [K]) + stem(28, 82, 30, 70, 36, 58, 4, 4.2, [K]) + stem(42, 82, 44, 72, 46, 62, 3, 4, [K]) +
    `<path d="M14 40c2 -2 4 -1 3 1M24 50c2 -2 4 -1 3 1" stroke="${K}" stroke-width="0.5" fill="none"/>`;
  ART[13] = kStems(1).slice(0, 4).join('') + cho(16, 4, 14);
  ART[14] = kStems(-1).join('') + `<path d="M12 64c2 2 1 4 -1 3M30 58c2 2 1 4 -1 3" stroke="${K}" stroke-width="0.5" fill="none"/>`;
  ART[15] = kStems(1).join('');

  // 5월 난초
  const blades = (seed) => [[6, 50, -4], [12, 62, 3], [18, 44, -6], [25, 70, 2], [32, 48, 6], [38, 60, -3], [45, 52, 5]]
    .map(([x, h, l], i) => blade(x + ((seed + i) % 3) - 1, 82, h - ((seed * 5 + i * 3) % 9), l * (seed % 2 ? -1 : 1), 5)).join('');
  ART[16] = cloud(30, 10, 1.1) + blades(1).slice(0) + iris(14, 22, 1.25) +
    `<path d="M0 66L50 58V80H0Z" fill="${B}"/><path d="M2 72q4 -2 8 0t8 0t8 0t8 0t8 0" stroke="${W}" stroke-width="0.6" fill="none"/>` +
    `<path d="M-2 62L30 52L34 56L2 68Z" fill="${Y}" stroke="${K}" stroke-width="0.5"/><path d="M8 60L10 65M16 58L18 63M24 55L26 60" stroke="${K}" stroke-width="0.5"/>` +
    `<rect x="26" y="50" width="3.4" height="14" fill="${Y}" stroke="${K}" stroke-width="0.5"/><rect x="4" y="58" width="3.4" height="14" fill="${Y}" stroke="${K}" stroke-width="0.5"/>`;
  ART[17] = blades(2) + iris(10, 36, 1.1) + cho(18, 4, 14);
  ART[18] = blades(3) + iris(14, 30, 1.3) + iris(34, 46, 1.1);
  ART[19] = blades(4) + iris(30, 26, 1.3) + iris(12, 50, 1);

  // 6월 모란
  const pLeaves = (list) => list.map(([x, y, s, r]) => peonyLeaf(x, y, s, r)).join('');
  ART[20] = pLeaves([[8, 32, 1.4, -40], [42, 30, 1.4, 40], [26, 46, 1.2, 180], [6, 12, 1.1, -70], [46, 10, 1.1, 70]]) + peony(25, 22, 11) +
    cloud(2, 76, 1.2) + cloud(32, 78, 1) +
    `<g transform="translate(14 60) rotate(-10)"><path d="M0 0C-4 -6 -10 -5 -9 0C-8 3 -3 3 0 0C-2 4 -6 7 -3 8C0 8 1 4 0 0Z" fill="${Y}" stroke="${K}" stroke-width="0.4"/><circle cx="-6" cy="-1" r="1" fill="${R}"/><path d="M0 0L2 -4M0 0L3 -3" stroke="${K}" stroke-width="0.4"/></g>` +
    `<g transform="translate(36 62) rotate(14) scale(-1 1)"><path d="M0 0C-4 -6 -10 -5 -9 0C-8 3 -3 3 0 0C-2 4 -6 7 -3 8C0 8 1 4 0 0Z" fill="${Y}" stroke="${K}" stroke-width="0.4"/><circle cx="-6" cy="-1" r="1" fill="${R}"/><path d="M0 0L2 -4M0 0L3 -3" stroke="${K}" stroke-width="0.4"/></g>`;
  ART[21] = pLeaves([[10, 20, 1.3, -30], [40, 16, 1.2, 30], [6, 60, 1.3, -60], [44, 58, 1.3, 60], [26, 78, 1, 0]]) + peony(30, 62, 11) + cheong(14, 8, -12);
  ART[22] = pLeaves([[10, 16, 1.4, -30], [40, 12, 1.4, 30], [8, 50, 1.3, -60], [44, 48, 1.3, 60], [26, 76, 1.3, 0], [24, 8, 1, 0]]) + peony(26, 34, 11) + peony(36, 62, 7);
  ART[23] = pLeaves([[8, 28, 1.4, -40], [42, 26, 1.4, 40], [10, 64, 1.3, -70], [42, 70, 1.3, 60], [26, 12, 1, 0]]) + peony(24, 44, 12) + peony(40, 16, 6);

  // 7월 홍싸리
  const rStems = (seed) => [0, 1, 2, 3, 4].map((i) => {
    const x0 = 6 + i * 9 + (seed % 3), top = 6 + ((i * 7 + seed * 3) % 14);
    return stem(x0, 82, x0 + (i % 2 ? 8 : -6), 44, x0 + (i % 2 ? 2 : -4) + seed % 2 * 3, top, 8, 3.6, [R, K, R]);
  }).join('');
  ART[24] = [0, 1, 2].map((i) => stem(14 + i * 12, -2, 22 + i * 10, 20, 46 - i * 4, 38 + i * 6, 7, 3.4, [R, K])).join('') +
    `<g transform="translate(20 62) scale(1.05)"><path d="M-14 0C-14 -6 -8 -10 0 -10C8 -10 13 -6 14 -2L17 -1L14 1C13 4 8 6 0 6C-8 6 -14 4 -14 0Z" fill="${Y}" stroke="${K}" stroke-width="0.7"/>` +
    `<path d="M-10 -7C-6 -9 -2 -9 2 -9M-12 -3C-6 -6 2 -6 8 -6M-12 2C-6 0 2 0 8 0" stroke="${K}" stroke-width="0.5" fill="none"/><path d="M-10 5L-13 11M-5 6L-4 12M5 6L4 12M10 4L13 10" stroke="${K}" stroke-width="1.6" stroke-linecap="round"/>` +
    `<circle cx="10" cy="-4" r="0.8" fill="${K}"/><path d="M13 -6L15 -9L15 -5Z" fill="${K}"/><path d="M15 0l2 -1" stroke="${W}" stroke-width="0.8"/></g>` +
    stem(4, 82, 8, 74, 2, 66, 3, 2.4, [R, K]);
  ART[25] = rStems(1) + cho(14, 6, 16);
  ART[26] = rStems(2);
  ART[27] = rStems(3);

  // 8월 공산
  ART[28] = `<rect x="0" y="0" width="50" height="56" fill="${R}"/><circle cx="25" cy="24" r="13.5" fill="${W}"/>` +
    `<path d="M-1 54C12 44 30 42 51 50V82H-1Z" fill="${K}"/>` + gwang(10, 70);
  ART[29] = flyer(14, 14, 0.85, 12, Y, R, R) + flyer(34, 10, 0.75, -6, Y, R, R) + flyer(24, 26, 0.8, 4, Y, R, R) +
    `<path d="M-1 48C14 40 32 40 51 46V82H-1Z" fill="${K}"/>`;
  ART[30] = `<path d="M-1 50C16 42 34 42 51 48V82H-1Z" fill="${K}"/>`;
  ART[31] = `<path d="M-1 52C14 44 34 44 51 50V82H-1Z" fill="${K}"/>`;

  // 9월 국진
  ART[32] = blob(14, 58, 12, 8, 2) + chrys(16, 24, 9, R, Y) + cloud(30, 8, 1.1) +
    `<path d="M0 62L50 56V80H0Z" fill="${B}"/><path d="M4 70q4 -2 8 0t8 0t8 0t8 0t8 0M2 76q4 -2 8 0t8 0t8 0t8 0t8 0" stroke="${W}" stroke-width="0.6" fill="none"/>` +
    `<g transform="translate(34 46) rotate(-20)"><ellipse rx="12" ry="7" fill="${R}" stroke="${K}" stroke-width="0.7"/><ellipse cy="-2" rx="9" ry="3.5" fill="#b81d15" stroke="${K}" stroke-width="0.5"/>` +
    `<text x="0" y="4.4" font-size="7.4" text-anchor="middle" fill="${Y}" font-weight="700" font-family="'Noto Serif CJK KR','Batang',serif">壽</text></g>`;
  ART[33] = blob(30, 60, 14, 9, 3) + blob(10, 72, 8, 6, 1) + chrys(32, 52, 8, Y, R) + `<path d="M30 30L30 44" stroke="${K}" stroke-width="0.8"/>` + chrys(32, 22, 7, R, Y) + cheong(6, 6, -6);
  ART[34] = `<path d="M24 22L22 48" stroke="${K}" stroke-width="0.9"/>` + blob(24, 58, 16, 9, 4) + blob(10, 40, 8, 6, 2) + chrys(24, 16, 9, R, Y) + chrys(28, 50, 7, Y, R);
  ART[35] = `<path d="M24 24L26 44" stroke="${K}" stroke-width="0.9"/>` + blob(22, 62, 15, 9, 5) + blob(40, 44, 8, 6, 3) + chrys(26, 18, 9, Y, R) + chrys(22, 52, 7.5, R, Y);

  // 10월 단풍
  ART[36] = `<path d="M52 4C44 10 40 20 42 34" stroke="${K}" stroke-width="2" fill="none"/>` +
    maple(10, 10, 7, R, 10) + maple(26, 8, 6, R, -20) + maple(42, 16, 7, R, 30) + maple(44, 34, 5.5, K, 10) +
    `<g transform="translate(22 52)"><path d="M-10 -2C-10 -6 -4 -8 2 -8C6 -8 8 -6 8 -3C8 1 4 3 -2 3C-6 3 -10 2 -10 -2Z" fill="${Y}" stroke="${K}" stroke-width="0.7"/>` +
    `<path d="M5 -6C6 -12 8 -16 10 -18L14 -17L12 -14C10 -12 9 -8 8 -4Z" fill="${Y}" stroke="${K}" stroke-width="0.7"/>` +
    `<path d="M11 -17L10 -23M10 -21L7 -24M10 -21L12 -25M12 -17L14 -22M14 -21L17 -23" stroke="${K}" stroke-width="0.7" fill="none"/><circle cx="12" cy="-15.5" r="0.5" fill="${K}"/>` +
    `<path d="M-8 2L-9 20M-4 3L-4 20M3 3L3 20M6 2L8 20" stroke="${K}" stroke-width="1.3"/><path d="M-6 -5l3 3M-1 -6l3 3M3 -6l2 3" stroke="${K}" stroke-width="0.45"/>` +
    `<path d="M-10 -3L-13 -5L-11 -1Z" fill="${Y}" stroke="${K}" stroke-width="0.4"/></g>`;
  ART[37] = maple(36, 12, 8, R, 20) + maple(40, 32, 7, K, -10) + maple(14, 52, 8, R) + maple(34, 58, 7, K, 30) + maple(12, 72, 6, K, 20) + maple(40, 74, 6.5, R, -20) + cheong(10, 6, -6);
  ART[38] = maple(12, 12, 7.5, R) + maple(36, 10, 7, K, 20) + maple(24, 30, 8, R, -15) + maple(42, 36, 6.5, K) + maple(8, 44, 6.5, K, 30) + maple(26, 54, 7.5, R, 10) + maple(42, 64, 7, R, -30) + maple(12, 70, 7, K, 15);
  ART[39] = maple(36, 12, 7.5, K, 20) + maple(12, 14, 7, R) + maple(22, 32, 8, K, -15) + maple(42, 36, 6.5, R) + maple(8, 50, 7, R, 30) + maple(30, 56, 7.5, K, 10) + maple(16, 70, 7, R, -30) + maple(42, 70, 6.5, R, 15);

  // 11월 오동
  ART[40] = paulLeaf(14, 70, 1.15, 10) + paulLeaf(38, 56, 0.8, -20) + star(30, 70, 3.2) + star(40, 74, 2.6) +
    `<path d="M-2 48C0 30 10 14 26 9C38 5 48 12 47 21C46 28 39 31 33 28C29 26 30 21 34 21C30 30 20 30 14 40C10 46 6 52 -2 56Z" fill="${R}" stroke="${K}" stroke-width="0.7"/>` +
    `<path d="M4 44C8 34 14 26 22 20M8 48C12 40 18 34 24 30M2 38C6 28 12 22 18 16" stroke="${K}" stroke-width="0.5" fill="none"/>` +
    `<path d="M26 16C30 14 34 15 36 18" stroke="${Y}" stroke-width="1.2" fill="none"/>` +
    `<path d="M14 12C10 6 12 2 16 0C16 4 18 6 20 8M22 9C20 3 23 0 26 -1C25 3 26 6 28 8" fill="${R}" stroke="${K}" stroke-width="0.5"/>` +
    `<circle cx="38" cy="14" r="3" fill="${Y}" stroke="${K}" stroke-width="0.6"/><circle cx="38" cy="14" r="1.2" fill="${K}"/>` +
    `<path d="M44 12L50 13L45 16Z" fill="${Y}" stroke="${K}" stroke-width="0.5"/>` +
    `<path d="M4 40C10 36 16 38 20 44M0 46C8 42 14 46 16 52" stroke="${R}" stroke-width="1.6" fill="none"/>` + gwang(41, 70);
  ART[41] = paulLeaf(25, 40, 1.6, 180) + star(14, 66, 3.4) + star(26, 72, 3) + star(38, 64, 3.4) + `<path d="M25 40L25 58" stroke="${K}" stroke-width="1"/>`;
  ART[42] = paulLeaf(25, 54, 1.6) + star(16, 14, 3.4) + star(30, 10, 3) + star(36, 22, 3.2) + `<path d="M25 36L25 22M25 26L16 16M25 24L34 20" stroke="${K}" stroke-width="0.9"/>`;
  ART[43] = `<rect x="0" y="62" width="50" height="20" fill="${R}"/>` + paulLeaf(25, 60, 1.5) + star(14, 12, 3.2) + star(28, 8, 3) + star(36, 18, 3.2) + `<path d="M25 40L25 20M25 26L16 14M25 22L33 18" stroke="${K}" stroke-width="0.9"/>`;

  // 12월 비
  ART[44] = willow(40, 5, 6, 46) + willow(48, 4, -4, 38) + willow(32, 3, 4, 30) +
    `<path d="M0 66C12 62 20 70 34 66C40 64 46 66 50 64V80H0Z" fill="${B}"/><path d="M4 72q4 -2 8 0t8 0t8 0t8 0" stroke="${W}" stroke-width="0.6" fill="none"/>` +
    // 우산
    `<path d="M10 28C12 18 26 16 32 24Z" fill="${Y}" stroke="${K}" stroke-width="0.6"/><path d="M21 22L13 27M21 22L18 27M21 22L24 26M21 22L29 25" stroke="${K}" stroke-width="0.4"/><path d="M21 22L22 40" stroke="${B}" stroke-width="1"/>` +
    // 사람
    `<path d="M15 32C16 30 20 30 21 32L24 52L28 66H12L15 52Z" fill="${R}" stroke="${K}" stroke-width="0.6"/><path d="M15 40L10 46L13 47M21 40L23 46" stroke="${K}" stroke-width="0.6" fill="none"/>` +
    `<circle cx="18" cy="30" r="2.6" fill="${W}" stroke="${K}" stroke-width="0.5"/><path d="M15.4 29h5.2l-2.6 -3.4z" fill="${K}"/><path d="M14 66h4M22 66h4" stroke="${K}" stroke-width="1.2"/>` +
    // 개구리
    `<g transform="translate(9 72)"><ellipse rx="4" ry="2.8" fill="${Y}" stroke="${K}" stroke-width="0.5"/><circle cx="-2" cy="-2.4" r="1" fill="${Y}" stroke="${K}" stroke-width="0.4"/><circle cx="1.6" cy="-2.6" r="1" fill="${Y}" stroke="${K}" stroke-width="0.4"/><path d="M-4 1l-2 2M4 1l2 2" stroke="${K}" stroke-width="0.6"/></g>` +
    gwang(9, 9);
  ART[45] = willow(10, 7, 8, 60) + willow(22, 5, 4, 70) + willow(44, 6, -6, 50) + willow(34, 3, 3, 32) + flyer(28, 50, 1.05, -32, Y, Y, R);
  ART[46] = willow(8, 7, 8, 72) + willow(20, 4, 3, 50) + willow(44, 6, -6, 70) + willow(34, 4, 4, 34) + cho(20, 40, -8);
  ART[47] = `<rect x="0" y="0" width="50" height="80" fill="${K}"/>` +
    `<path d="M4 4H46V12H40V76H34V12H16V76H10V12H4Z" fill="${R}" stroke="${K}" stroke-width="0.6"/>` +
    [6, 10, 14, 18, 22, 26, 30, 34, 38, 42].map((x) => `<path d="M${x} 5.6l2 5" stroke="${K}" stroke-width="0.6"/>`).join('') +
    [16, 22, 28, 34, 40, 46, 52, 58, 64, 70].map((y) => `<path d="M10.6 ${y}l4.8 -3M34.6 ${y}l4.8 -3" stroke="${K}" stroke-width="0.6"/>`).join('') +
    `<path d="M18 20C24 26 22 38 28 46C24 52 26 62 30 70" stroke="${R}" stroke-width="1.2" fill="none" stroke-dasharray="2 1.2"/>`;

  const FRAME = `<rect width="50" height="80" rx="3.2" fill="${R}"/><rect x="2.4" y="2.4" width="45.2" height="75.2" rx="1.8" fill="${W}"/>`;
  function sprite() {
    let s = `<clipPath id="hw-in"><rect x="2.4" y="2.4" width="45.2" height="75.2" rx="1.8"/></clipPath>`;
    for (let id = 0; id < 48; id++) s += `<g id="hw${id}">${FRAME}<g clip-path="url(#hw-in)">${ART[id]}</g><rect x="2.4" y="2.4" width="45.2" height="75.2" rx="1.8" fill="none" stroke="${K}" stroke-width="0.35"/></g>`;
    return s;
  }
  const use = (id) => `<use href="#hw${id}"/>`;
  const typeOf = (id) => TYPES[(id >> 2) + 1][id & 3];
  return { sprite, use, typeOf, TYPES };
});
