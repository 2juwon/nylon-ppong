/* 화투패 48장 그림 (직접 그린 SVG, 50×80) — 귀여운 그림체
 * 둥근 모양, 윤곽선 없는 색면, 부드러운 색, 동글한 눈과 볼 터치. 테두리는 빨강, 바탕은 크림색.
 * HW.sprite() → <defs> 안에 넣을 48장 그림, HW.use(id) → 카드 한 장을 그리는 <use>.
 * 카드 id 0~47: 월 = (id >> 2) + 1, 같은 월 안의 순서 = id & 3 (TYPES 순서와 같음)
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HW = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const RD = '#ee5246', RD2 = '#f47b70', NV = '#2d3552', NV2 = '#3d4870', YL = '#ffc93f', YL2 = '#ffe08a', BL = '#4b7fd6', BL2 = '#7aa3ea',
    PK = '#ffb3ad', PK2 = '#ffd3cf', GN = '#4fae73', GN2 = '#3b8f5d', SKY = '#e2f1fb', CR = '#fffaf1', OR = '#ff9b3d', OR2 = '#ffb866',
    BR = '#7a4a2e', WH = '#ffffff', SKIN = '#ffe2c4';
  const f = (n) => Math.round(n * 100) / 100;
  const rad = (d) => (d * Math.PI) / 180;

  const TYPES = {
    1: ['gwang', 'hong', 'pi', 'pi'], 2: ['yeol', 'hong', 'pi', 'pi'], 3: ['gwang', 'hong', 'pi', 'pi'],
    4: ['yeol', 'cho', 'pi', 'pi'], 5: ['yeol', 'cho', 'pi', 'pi'], 6: ['yeol', 'cheong', 'pi', 'pi'],
    7: ['yeol', 'cho', 'pi', 'pi'], 8: ['gwang', 'yeol', 'pi', 'pi'], 9: ['yeol', 'cheong', 'pi', 'pi'],
    10: ['yeol', 'cheong', 'pi', 'pi'], 11: ['gwang', 'pi', 'pi', 'ssang'], 12: ['gwang', 'yeol', 'tti', 'ssang'],
  };

  /* ───── 공통 조각 ───── */
  const bg = (c) => `<rect width="50" height="80" fill="${c}"/>`;
  const gwang = (x, y) => `<circle cx="${x}" cy="${y}" r="4.4" fill="${RD}" stroke="${WH}" stroke-width="0.8"/><text x="${x}" y="${f(y + 2.1)}" font-size="5.8" text-anchor="middle" fill="${WH}" font-weight="700" font-family="'Noto Sans CJK KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif">光</text>`;
  const eye = (x, y, r = 0.9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${NV}"/><circle cx="${f(x + r * 0.35)}" cy="${f(y - r * 0.35)}" r="${f(r * 0.38)}" fill="${WH}"/>`;
  const cheek = (x, y, s = 1) => `<ellipse cx="${x}" cy="${y}" rx="${f(1.6 * s)}" ry="${f(1 * s)}" fill="${PK}"/>`;
  // 띠: 끝이 둥근 막대 + 흰 글씨
  function pill(x, y, rot, color, label) {
    const txt = label ? Array.from(label).map((ch, i) => `<text x="5" y="${f(10.4 + i * 9)}" font-size="6.8" text-anchor="middle" fill="${WH}" font-weight="700" font-family="'Noto Sans CJK KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif">${ch}</text>`).join('') : '';
    return `<g transform="translate(${x} ${y}) rotate(${rot})"><rect width="10" height="30" rx="5" fill="${color}"/><rect x="1.6" y="2" width="2" height="26" rx="1" fill="${WH}" opacity="0.18"/>${txt}</g>`;
  }
  const hong = (x, y, r) => pill(x, y, r, RD, '홍단');
  const cheong = (x, y, r) => pill(x, y, r, BL, '청단');
  const cho = (x, y, r) => pill(x, y, r, RD, '');

  // 둥근 언덕 (송학의 산) + 노란 솔방울 점
  function humps(list, color = NV) {
    return list.map(([cx, top, w]) => `<path d="M${f(cx - w)} 84C${f(cx - w)} ${f(top + 4)} ${f(cx - w * 0.55)} ${top} ${cx} ${top}C${f(cx + w * 0.55)} ${top} ${f(cx + w)} ${f(top + 4)} ${f(cx + w)} 84Z" fill="${color}"/>` +
      `<circle cx="${f(cx - w * 0.38)}" cy="${f(top + 2.6)}" r="1.3" fill="${YL}"/><circle cx="${cx}" cy="${f(top + 1.1)}" r="1.4" fill="${YL}"/><circle cx="${f(cx + w * 0.38)}" cy="${f(top + 2.6)}" r="1.3" fill="${YL}"/>`).join('');
  }
  // 꽃잎 다섯 장 꽃 (매화·벚꽃·오동꽃)
  function flower5(cx, cy, r, col, mid = YL, notch = false) {
    let s = '';
    for (let i = 0; i < 5; i++) { const a = rad(i * 72 - 90); s += `<circle cx="${f(cx + Math.cos(a) * r * 0.55)}" cy="${f(cy + Math.sin(a) * r * 0.55)}" r="${f(r * 0.5)}" fill="${col}"/>`; }
    if (notch) for (let i = 0; i < 5; i++) { const a = rad(i * 72 - 90); s += `<circle cx="${f(cx + Math.cos(a) * r * 1.02)}" cy="${f(cy + Math.sin(a) * r * 1.02)}" r="${f(r * 0.13)}" fill="${CR}"/>`; }
    return s + `<circle cx="${cx}" cy="${cy}" r="${f(r * 0.3)}" fill="${mid}"/>`;
  }
  const dot = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
  // 나뭇가지 (둥근 끝 갈색 선)
  const branch = (d, w = 2.6, c = BR) => `<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  // 잎이 양쪽에 달린 줄기
  function sprig(x0, y0, cx, cy, x1, y1, n, size, cols, stemC = BR) {
    let s = `<path d="M${x0} ${y0}Q${cx} ${cy} ${x1} ${y1}" stroke="${stemC}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 0.3);
      const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1, py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
      const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y1 - cy);
      const ang = Math.atan2(dy, dx) * 180 / Math.PI;
      [-1, 1].forEach((side, k) => { s += `<ellipse cx="0" cy="${f(-size * 0.55)}" rx="${f(size * 0.32)}" ry="${f(size * 0.55)}" fill="${cols[(i + k) % cols.length]}" transform="translate(${f(px)} ${f(py)}) rotate(${f(ang + 90 + side * 55)})"/>`; });
    }
    return s;
  }
  // 위에서 늘어지는 줄기에 동그란 잎 (흑싸리)
  function hang(x, len, sway, n, r) {
    let s = `<path d="M${x} -2Q${f(x + sway)} ${f(len * 0.5)} ${f(x + sway * 0.4)} ${len}" stroke="${NV}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.7) / n;
      const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * (x + sway) + t * t * (x + sway * 0.4), py = (1 - t) * (1 - t) * -2 + 2 * (1 - t) * t * (len * 0.5) + t * t * len;
      const rr = r * (1 - t * 0.35);
      s += `<ellipse cx="${f(px - rr * 0.9)}" cy="${f(py)}" rx="${f(rr * 0.75)}" ry="${f(rr)}" fill="${NV}" transform="rotate(25 ${f(px - rr * 0.9)} ${f(py)})"/><ellipse cx="${f(px + rr * 0.9)}" cy="${f(py + rr * 0.5)}" rx="${f(rr * 0.75)}" ry="${f(rr)}" fill="${NV}" transform="rotate(-25 ${f(px + rr * 0.9)} ${f(py + rr * 0.5)})"/>`;
    }
    return s + dot(f(x + sway * 0.4), len + 0.6, f(r * 0.5), NV);
  }
  // 둥근 칼잎 (난초)
  const blade = (x, h, lean, w = 4.6, c = GN) => `<path d="M${f(x - w / 2)} 84C${f(x - w / 2)} ${f(84 - h * 0.6)} ${f(x + lean - w * 0.3)} ${f(84 - h * 0.95)} ${f(x + lean)} ${f(84 - h)}C${f(x + lean + w * 0.3)} ${f(84 - h * 0.9)} ${f(x + w / 2)} ${f(84 - h * 0.6)} ${f(x + w / 2)} 84Z" fill="${c}"/>`;
  const blades = (list) => list.map(([x, h, l], i) => blade(x, h, l, 4.6, i % 2 ? GN : GN2)).join('');
  // 붓꽃 (둥근 꽃잎 셋)
  function iris(cx, cy, s, stem = true) {
    return (stem ? `<path d="M${cx} ${cy}L${cx} ${f(cy + 16 * s)}" stroke="${GN2}" stroke-width="${f(1 * s)}" stroke-linecap="round"/>` : '') +
      `<g transform="translate(${cx} ${cy}) scale(${s})"><ellipse cx="-3.6" cy="1.2" rx="3.6" ry="2.4" fill="${BL}" transform="rotate(30 -3.6 1.2)"/><ellipse cx="3.6" cy="1.2" rx="3.6" ry="2.4" fill="${BL}" transform="rotate(-30 3.6 1.2)"/>` +
      `<ellipse cx="0" cy="-3.4" rx="2.2" ry="3.8" fill="${BL2}"/><ellipse cx="-3" cy="1.2" rx="1.4" ry="0.7" fill="${YL}" transform="rotate(30 -3 1.2)"/><ellipse cx="3" cy="1.2" rx="1.4" ry="0.7" fill="${YL}" transform="rotate(-30 3 1.2)"/></g>`;
  }
  // 모란 (겹꽃잎 동그라미)
  function peony(cx, cy, r) {
    let s = `<g transform="translate(${cx} ${cy})">`;
    for (let i = 0; i < 7; i++) { const a = rad(i * 51.4 - 90); s += `<circle cx="${f(Math.cos(a) * r * 0.62)}" cy="${f(Math.sin(a) * r * 0.62)}" r="${f(r * 0.48)}" fill="${RD}"/>`; }
    return s + `<circle r="${f(r * 0.66)}" fill="${RD2}"/><circle r="${f(r * 0.4)}" fill="${RD}"/><circle r="${f(r * 0.18)}" fill="${YL}"/></g>`;
  }
  const blobLeaf = (x, y, s, rot, col = GN) => `<path d="M0 0C-6 -2 -8 -9 -4 -13C-2 -15 2 -15 4 -13C8 -9 6 -2 0 0Z" fill="${col}" transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"/><path d="M0 -1L0 -11" stroke="${WH}" stroke-width="0.5" opacity="0.5" transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"/>`;
  // 국화 (둥근 꽃잎 고리 둘)
  function chrys(cx, cy, r, outer = OR, inner = YL) {
    let s = `<g transform="translate(${cx} ${cy})">`;
    for (let i = 0; i < 12; i++) { const a = rad(i * 30); s += `<ellipse cx="${f(Math.cos(a) * r * 0.66)}" cy="${f(Math.sin(a) * r * 0.66)}" rx="${f(r * 0.36)}" ry="${f(r * 0.2)}" fill="${outer}" transform="rotate(${i * 30} ${f(Math.cos(a) * r * 0.66)} ${f(Math.sin(a) * r * 0.66)})"/>`; }
    for (let i = 0; i < 9; i++) { const a = rad(i * 40 + 20); s += `<ellipse cx="${f(Math.cos(a) * r * 0.36)}" cy="${f(Math.sin(a) * r * 0.36)}" rx="${f(r * 0.24)}" ry="${f(r * 0.14)}" fill="${inner}" transform="rotate(${i * 40 + 20} ${f(Math.cos(a) * r * 0.36)} ${f(Math.sin(a) * r * 0.36)})"/>`; }
    return s + `<circle r="${f(r * 0.18)}" fill="${RD}"/></g>`;
  }
  // 둥근 구름 같은 잎 덩어리 (국화·오동)
  const puff = (cx, cy, r, c = NV) => `<circle cx="${f(cx - r * 0.55)}" cy="${f(cy + r * 0.1)}" r="${f(r * 0.55)}" fill="${c}"/><circle cx="${f(cx + r * 0.55)}" cy="${f(cy + r * 0.1)}" r="${f(r * 0.55)}" fill="${c}"/><circle cx="${cx}" cy="${f(cy - r * 0.3)}" r="${f(r * 0.65)}" fill="${c}"/><rect x="${f(cx - r * 1.1)}" y="${f(cy + r * 0.1)}" width="${f(r * 2.2)}" height="${f(r * 0.55)}" rx="${f(r * 0.27)}" fill="${c}"/>`;
  // 단풍잎 (끝이 둥근 별)
  function maple(cx, cy, r, col, rot = 0) {
    let s = `<g transform="translate(${cx} ${cy}) rotate(${rot})">`;
    [-90, -30, 30, 150, 210].forEach((a, i) => { const k = i === 0 ? 1 : i < 3 ? 0.9 : 0.75; s += `<ellipse cx="${f(Math.cos(rad(a)) * r * 0.5 * k)}" cy="${f(Math.sin(rad(a)) * r * 0.5 * k)}" rx="${f(r * 0.24)}" ry="${f(r * 0.5 * k)}" fill="${col}" transform="rotate(${a + 90} ${f(Math.cos(rad(a)) * r * 0.5 * k)} ${f(Math.sin(rad(a)) * r * 0.5 * k)})"/>`; });
    return s + `<circle r="${f(r * 0.32)}" fill="${col}"/><path d="M0 0L0 ${f(r * 0.85)}" stroke="${col}" stroke-width="${f(r * 0.1)}" stroke-linecap="round"/></g>`;
  }
  // 버들가지 (남색 긴 잎)
  function willow(x, len, sway, n) {
    let s = `<path d="M${x} -2Q${f(x + sway)} ${f(len * 0.6)} ${f(x + sway * 0.5)} ${len}" stroke="${NV}" stroke-width="1" fill="none" stroke-linecap="round"/>`;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.8) / n;
      const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * (x + sway) + t * t * (x + sway * 0.5), py = (1 - t) * (1 - t) * -2 + 2 * (1 - t) * t * (len * 0.6) + t * t * len;
      const side = k % 2 ? 1 : -1;
      s += `<ellipse cx="${f(px + side * 1.6)}" cy="${f(py + 2)}" rx="1.5" ry="4.4" fill="${NV}" transform="rotate(${side * -22} ${f(px + side * 1.6)} ${f(py + 2)})"/>`;
    }
    return s;
  }
  // 물결
  const water = (y, c = BL) => `<path d="M-2 ${y}C10 ${y - 4} 22 ${y + 3} 34 ${y - 1}C42 ${y - 3} 48 ${y - 1} 52 ${y - 2}V84H-2Z" fill="${c}"/><path d="M5 ${y + 6}q3 -1.6 6 0t6 0M25 ${y + 10}q3 -1.6 6 0t6 0" stroke="${WH}" stroke-width="0.8" fill="none" stroke-linecap="round"/>`;
  // 구름 (흰 동그라미 뭉치)
  const cloud = (x, y, s, c = WH) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="0" r="3" fill="${c}"/><circle cx="3.6" cy="-1.2" r="3.6" fill="${c}"/><circle cx="7.4" cy="0" r="2.8" fill="${c}"/><rect x="-1" y="0" width="9.4" height="2.8" rx="1.4" fill="${c}"/></g>`;

  /* ───── 동물·사람 ───── */
  // 학
  const crane = `<path d="M10 48C10 41 16 37 23 38C30 39 32 46 29 51C26 56 17 57 13 54C11 52.5 10 51 10 48Z" fill="${WH}"/>` +
    `<path d="M11 46C7 46 5 50 7 54C9 52 11 52 12 52Z" fill="${NV}"/><path d="M14 47C17 45 21 45 24 46" stroke="#dfe7ee" stroke-width="1" fill="none" stroke-linecap="round"/>` +
    `<path d="M26 41C29 35 27 29 28 24" stroke="${WH}" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M27.6 30C27.4 27 27.6 25 28 24" stroke="${NV}" stroke-width="3.4" fill="none" stroke-linecap="round"/>` +
    `<circle cx="29.5" cy="21" r="4.4" fill="${WH}"/><path d="M27 17.6C27.6 16 31.4 16 32 17.6Z" fill="${RD}"/>` + eye(30.6, 20.6) + cheek(28.4, 23) +
    `<path d="M33.6 20.4L38.6 21.6L33.6 23Z" fill="${OR}"/>` +
    `<path d="M17 55V70M22 55V70" stroke="${OR}" stroke-width="1.2" stroke-linecap="round"/><path d="M14.6 70h4.6M20 70h4.6" stroke="${OR}" stroke-width="1.2" stroke-linecap="round"/>`;
  // 앉아 있는 동그란 새
  const roundBird = (x, y, s, body, belly, wing, dir = 1) => `<g transform="translate(${x} ${y}) scale(${f(s * dir)} ${s})"><path d="M-8 2L-14 4L-12 0Z" fill="${body}"/><circle r="8" fill="${body}"/><ellipse cx="2" cy="3.4" rx="5.2" ry="4" fill="${belly}"/><ellipse cx="-3" cy="-0.5" rx="3.6" ry="2.6" fill="${wing}"/>` + eye(3.2, -2.6, 1.1) + cheek(5.4, 0.6) + `<path d="M7.4 -2.6L10.4 -1.4L7.4 -0.2Z" fill="${OR}"/></g>`;
  // 날아가는 동그란 새 (날개 펼침)
  const flyBird = (x, y, s, rot, body, wing, belly, beak = OR) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">` +
    `<path d="M-2 -1C-4 -9 -10 -12 -15 -11C-12 -7 -8 -3 -4 0Z" fill="${wing}"/>` +
    `<ellipse cx="0" cy="0" rx="8" ry="5.6" fill="${body}"/><ellipse cx="1.4" cy="2" rx="5" ry="3" fill="${belly}"/>` +
    `<path d="M-1 1C2 7 1 12 -3 14C-4 9 -5 5 -4 2Z" fill="${wing}"/><path d="M-7 1L-12 3L-11 -1Z" fill="${body}"/>` +
    eye(4.4, -1.6, 1) + cheek(5.6, 1.2, 0.8) + `<path d="M7.6 -1.4L10.6 -0.4L7.6 0.8Z" fill="${beak}"/></g>`;
  const butterfly = (x, y, s, rot) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><ellipse cx="-3.6" cy="-2.4" rx="3.6" ry="3" fill="${YL}"/><ellipse cx="3.6" cy="-2.4" rx="3.6" ry="3" fill="${YL}"/><ellipse cx="-2.8" cy="2.4" rx="2.6" ry="2.2" fill="${OR2}"/><ellipse cx="2.8" cy="2.4" rx="2.6" ry="2.2" fill="${OR2}"/>` +
    `<circle cx="-3.6" cy="-2.6" r="1" fill="${RD}"/><circle cx="3.6" cy="-2.6" r="1" fill="${RD}"/><ellipse rx="0.9" ry="4" fill="${NV}"/><path d="M-0.4 -3.6L-2 -6.6M0.4 -3.6L2 -6.6" stroke="${NV}" stroke-width="0.5" stroke-linecap="round"/></g>`;

  /* ───── 48장 ───── */
  const ART = {};
  // 1월 송학
  ART[0] = bg(SKY) + `<circle cx="36" cy="15" r="10" fill="${RD}"/><circle cx="32.5" cy="11.5" r="2.6" fill="${RD2}"/>` + humps([[40, 54, 13], [10, 62, 13]]) + crane + gwang(41, 71);
  ART[1] = bg(SKY) + humps([[12, 50, 14], [38, 44, 14], [26, 62, 11]]) + hong(35, 4, 8) + cloud(6, 26, 1);
  ART[2] = bg(SKY) + humps([[10, 40, 13], [38, 32, 14], [24, 52, 12]]) + cloud(6, 14, 0.9);
  ART[3] = bg(SKY) + humps([[38, 42, 13], [12, 34, 14], [26, 56, 12]]) + cloud(32, 12, 0.9);
  // 2월 매조
  ART[4] = branch('M-2 60C12 54 22 48 30 42C38 36 44 34 52 32', 3) + roundBird(24, 33, 1, GN, YL, GN2) +
    flower5(8, 70, 5.2, RD) + flower5(21, 74, 4.6, RD) + flower5(37, 66, 5, RD) + flower5(45, 53, 4, RD) + flower5(42, 13, 4.6, RD) + flower5(30, 18, 3.4, RD) + flower5(9, 36, 3.8, RD) +
    dot(30, 76, 1.5, RD) + dot(14, 62, 1.4, RD) + dot(47, 72, 1.5, RD);
  ART[5] = branch('M-2 68C14 62 28 58 52 54', 3) + branch('M30 59C33 50 36 44 40 38', 1.6) +
    flower5(10, 58, 4.6, RD) + flower5(26, 68, 5, RD) + flower5(42, 64, 4.8, RD) + flower5(42, 42, 4.4, RD) + flower5(12, 32, 4.6, RD) + flower5(24, 26, 3.6, RD) + dot(18, 64, 1.4, RD) + dot(46, 48, 1.4, RD) +
    hong(34, 4, 6);
  ART[6] = branch('M12 -2C12 14 10 30 14 46M26 -2C26 16 28 30 24 50M38 -2C40 14 36 26 40 44', 1.8) +
    flower5(14, 50, 5, RD) + flower5(26, 58, 5.4, RD) + flower5(38, 50, 4.8, RD) + flower5(18, 69, 4.8, RD) + flower5(34, 70, 5, RD) + flower5(45, 62, 3.8, RD) + flower5(7, 61, 4, RD) +
    dot(14, 34, 1.4, RD) + dot(24, 38, 1.5, RD) + dot(39, 30, 1.4, RD);
  ART[7] = branch('M-2 66C14 60 26 58 40 54M32 -2C32 14 30 22 33 34M42 -2C44 12 46 20 43 36', 2.2) +
    flower5(33, 38, 4.8, RD) + flower5(44, 40, 4.2, RD) + flower5(12, 50, 5.2, RD) + flower5(26, 50, 4.8, RD) + flower5(40, 55, 4.6, RD) + flower5(16, 68, 4.8, RD) + flower5(34, 70, 4.8, RD) +
    dot(33, 22, 1.4, RD) + dot(43, 24, 1.4, RD) + dot(46, 70, 1.4, RD);
  // 3월 벚꽃
  const sakura = (list) => list.map(([x, y, r, k]) => flower5(x, y, r, k ? PK : RD2, k ? RD : YL, true)).join('');
  ART[8] = sakura([[26, 9, 5.4, 1], [24, 26, 5, 0], [38, 11, 6, 1], [12, 30, 5, 0], [32, 25, 6, 1], [45, 26, 4.6, 0], [5, 33, 4.6, 1]]) +
    `<rect x="0" y="39" width="50" height="7" fill="${NV}"/>` + [4, 10, 16, 22, 28, 34, 40, 46].map((x) => dot(x, 42.5, 1.3, YL)).join('') +
    `<path d="M0 46H50V64C44 68 38 62 32 66C26 70 20 62 14 66C8 70 4 64 0 66Z" fill="${RD}"/><path d="M0 66C4 64 8 70 14 66C20 62 26 70 32 66C38 62 44 68 50 64V82H0Z" fill="${RD2}"/>` +
    [10, 25, 40].map((x) => `<path d="M${x} 46V64" stroke="${WH}" stroke-width="0.6" opacity="0.4"/>`).join('') + gwang(9, 71);
  ART[9] = branch('M-2 78C8 66 14 58 22 46C28 38 36 28 52 20', 3) + sakura([[26, 16, 5, 1], [8, 30, 5.4, 0], [24, 32, 5, 0], [40, 42, 6, 1], [44, 54, 5, 0], [12, 52, 5.4, 1], [30, 66, 5.4, 0], [44, 70, 4.6, 1], [6, 70, 4.6, 0]]) + hong(33, 4, 8);
  ART[10] = branch('M-2 76C10 64 18 56 22 44C26 34 22 22 30 10M22 44C30 40 38 42 48 36', 3) + sakura([[10, 10, 6, 0], [24, 12, 5.4, 1], [40, 14, 6, 0], [14, 28, 5.4, 1], [34, 28, 6, 0], [8, 46, 5.4, 0], [44, 44, 5, 1], [32, 52, 5.4, 0], [16, 62, 5, 1], [40, 66, 5, 0]]);
  ART[11] = branch('M52 72C40 62 34 56 30 46C26 34 30 22 22 8M30 46C22 42 12 44 2 38', 3) + sakura([[10, 12, 5.4, 1], [30, 10, 6, 0], [42, 22, 5.4, 1], [12, 30, 6, 0], [28, 30, 5, 1], [42, 42, 5.4, 0], [8, 50, 5.4, 1], [22, 56, 6, 0], [38, 64, 5, 1], [10, 70, 5, 0]]);
  // 4월 흑싸리
  const cuckoo = flyBird(28, 18, 1.1, -12, OR, YL, YL2, NV);
  ART[12] = bg(CR) + cuckoo + cloud(4, 72, 1.1, PK2) +
    sprig(6, 84, 8, 66, 14, 46, 5, 6.4, [NV, NV2]) + sprig(20, 84, 22, 70, 30, 56, 4, 6, [NV2, NV]) + sprig(36, 84, 38, 74, 44, 62, 3, 5.6, [NV, NV2]);
  ART[13] = hang(8, 62, 3, 6, 3.4) + hang(18, 72, -2, 7, 3.4) + hang(30, 56, 3, 5, 3.2) + hang(42, 70, -3, 7, 3.4) + cho(33, 4, 10);
  ART[14] = hang(6, 58, 3, 6, 3.4) + hang(16, 72, -2, 7, 3.4) + hang(26, 64, 3, 6, 3.4) + hang(36, 74, -3, 7, 3.4) + hang(46, 60, 2, 6, 3.2);
  ART[15] = hang(8, 70, -3, 7, 3.4) + hang(19, 60, 3, 6, 3.4) + hang(30, 74, -2, 7, 3.4) + hang(41, 64, 3, 6, 3.4);
  // 5월 난초 (붓꽃)
  ART[16] = bg(CR) + cloud(30, 6, 1.1, PK2) + iris(25, 25, 1.45) + iris(41, 30, 1.15) + blades([[34, 50, 4], [42, 60, -3], [47, 44, 2]]) + water(64) +
    `<rect x="-2" y="50" width="34" height="5.4" rx="2.7" fill="${YL}" transform="rotate(-8 15 52)"/><rect x="14" y="58" width="36" height="5.4" rx="2.7" fill="${YL}" transform="rotate(-8 32 60)"/>` +
    `<rect x="26" y="46" width="4" height="22" rx="2" fill="${OR}"/><rect x="11" y="56" width="4" height="20" rx="2" fill="${OR}"/><rect x="41" y="54" width="4" height="18" rx="2" fill="${OR}"/>`;
  ART[17] = blades([[4, 52, -4], [11, 64, 5], [18, 46, -7], [24, 72, 4], [30, 54, -5], [36, 68, 6], [43, 50, -3], [48, 62, 2]]) + iris(12, 36, 1.3) + cho(34, 4, 10);
  ART[18] = blades([[4, 50, -5], [10, 60, 4], [17, 44, -6], [23, 66, 3], [29, 50, -4], [35, 58, 5], [42, 46, -3], [47, 60, 2]]) + iris(29, 16, 1.5) + iris(42, 30, 1.25);
  ART[19] = blades([[4, 56, 4], [10, 46, -5], [16, 64, 4], [22, 50, -6], [28, 60, 3], [34, 44, -4], [40, 62, 5], [47, 50, -3]]) + iris(33, 14, 1.5) + iris(14, 28, 1.3);
  // 6월 모란
  const leaves = (list) => list.map(([x, y, s, r], i) => blobLeaf(x, y, s, r, i % 2 ? GN2 : GN)).join('');
  ART[20] = leaves([[18, 28, 0.95, -60], [40, 28, 0.95, 60], [22, 42, 0.85, -130], [37, 42, 0.85, 130]]) + peony(29, 26, 11) + butterfly(14, 60, 1.2, -14) + butterfly(36, 66, 1, 16) + cloud(2, 76, 1.2, PK2) + cloud(30, 77, 1, PK2);
  ART[21] = leaves([[17, 54, 0.95, -50], [39, 52, 0.95, 50], [18, 71, 0.9, -130], [38, 72, 0.9, 130], [16, 36, 0.8, -25]]) + peony(28, 62, 10.5) + cheong(33, 4, 10);
  ART[22] = leaves([[20, 30, 0.85, -55], [42, 28, 0.85, 55], [14, 62, 0.95, -55], [42, 60, 0.95, 55], [16, 76, 0.85, -130], [40, 76, 0.85, 130]]) + peony(31, 22, 8.5) + peony(28, 62, 10.5);
  ART[23] = leaves([[10, 38, 1, -55], [40, 36, 1, 55], [12, 56, 1, -125], [40, 56, 1, 125], [26, 30, 0.85, 0]]) + peony(25, 46, 12) + dot(10, 14, 1.2, PK) + dot(42, 70, 1.2, PK);
  // 7월 홍싸리
  ART[24] = sprig(52, -2, 32, 10, 16, 34, 7, 6, [RD, BR, RD]) + sprig(52, 18, 38, 28, 26, 46, 5, 5.6, [RD, RD, BR]) + sprig(28, -2, 22, 12, 6, 24, 5, 5.2, [BR, RD]) +
    `<g transform="translate(23 62)"><ellipse rx="15" ry="10" fill="${OR}"/><ellipse cx="-2" cy="2" rx="10" ry="6" fill="${OR2}"/>` +
    `<path d="M-14 -4L-18 -6L-16 -1Z" fill="${OR}"/><path d="M4 -9L6 -14L9 -9Z" fill="${OR}"/>` +
    `<ellipse cx="14" cy="1" rx="4" ry="3.4" fill="#f07c7c"/><circle cx="13" cy="0.6" r="0.6" fill="${NV}"/><circle cx="15.2" cy="0.6" r="0.6" fill="${NV}"/>` + eye(8, -3, 1.2) + cheek(9.4, 2) +
    `<path d="M-9 9V14M-3 9.6V14.4M4 9.6V14.4M10 8.6V13.4" stroke="${BR}" stroke-width="2.4" stroke-linecap="round"/></g>`;
  ART[25] = sprig(-2, 84, 8, 44, 30, 10, 8, 6.2, [RD, BR, RD]) + sprig(10, 84, 26, 52, 48, 26, 7, 6, [RD, RD, BR]) + sprig(30, 84, 40, 66, 52, 48, 4, 5.6, [BR, RD]) + cho(35, 4, 10);
  ART[26] = sprig(-2, 82, 12, 40, 40, 6, 9, 6.4, [RD, BR, RD]) + sprig(12, 84, 30, 54, 50, 30, 7, 6, [RD, RD, BR]) + sprig(-2, 50, 4, 30, 16, 10, 4, 5.2, [BR, RD]);
  ART[27] = sprig(52, 82, 38, 40, 10, 6, 9, 6.4, [RD, BR, RD]) + sprig(38, 84, 20, 54, 0, 30, 7, 6, [RD, RD, BR]) + sprig(52, 50, 46, 30, 34, 10, 4, 5.2, [BR, RD]);
  // 8월 공산
  const night = bg(NV) + dot(8, 10, 0.7, YL) + dot(44, 8, 0.6, YL) + dot(42, 40, 0.7, YL) + dot(6, 44, 0.6, YL2);
  ART[28] = night + `<circle cx="25" cy="25" r="16" fill="${NV2}"/><circle cx="25" cy="25" r="12.5" fill="${CR}"/><circle cx="21" cy="21" r="2.4" fill="#f3e8cf"/><circle cx="29" cy="28" r="1.6" fill="#f3e8cf"/>` +
    `<path d="M-2 58C12 48 30 48 52 54V84H-2Z" fill="#171c30"/>` + gwang(10, 71);
  ART[29] = night + flyBird(14, 16, 0.75, 8, WH, '#dfe7ee', WH) + flyBird(34, 12, 0.7, -4, WH, '#dfe7ee', WH) + flyBird(25, 30, 0.72, 4, WH, '#dfe7ee', WH) + `<path d="M-2 50C12 42 32 42 52 48V84H-2Z" fill="#171c30"/>`;
  ART[30] = night + dot(24, 20, 0.7, YL) + dot(36, 26, 0.5, YL2) + `<path d="M-2 52C14 44 34 44 52 50V84H-2Z" fill="#171c30"/>`;
  ART[31] = night + dot(18, 26, 0.6, YL2) + dot(30, 14, 0.7, YL) + `<path d="M-2 54C12 46 34 46 52 52V84H-2Z" fill="#171c30"/>`;
  // 9월 국진
  ART[32] = puff(14, 56, 10) + chrys(20, 32, 8.5) + cloud(30, 8, 1.1, PK2) + water(62) +
    `<g transform="translate(34 46) rotate(-16)"><ellipse rx="11" ry="6.6" fill="${RD}"/><ellipse cy="-2" rx="8.4" ry="3.2" fill="${RD2}"/><text x="0" y="4.2" font-size="7" text-anchor="middle" fill="${YL}" font-weight="700" font-family="'Noto Serif CJK KR','Batang',serif">壽</text></g>`;
  ART[33] = puff(30, 60, 12) + puff(10, 72, 7) + branch('M17 36L30 48', 1.2, GN2) + chrys(32, 52, 7.5, YL, OR) + chrys(16, 32, 7, OR, YL) + cheong(36, 4, 8);
  ART[34] = branch('M31 22L23 48', 1.2, GN2) + puff(24, 60, 14) + puff(10, 40, 7) + chrys(31, 17, 8.5) + chrys(28, 50, 6.5, YL, OR);
  ART[35] = branch('M32 24L26 44', 1.2, GN2) + puff(22, 64, 13) + puff(40, 46, 7) + chrys(32, 18, 8.5, YL, OR) + chrys(22, 54, 7);
  // 10월 단풍
  const mcols = [RD, OR, YL, RD2];
  const maples = (list) => list.map(([x, y, r, rot], i) => maple(x, y, r, mcols[i % mcols.length], rot)).join('');
  ART[36] = maples([[12, 28, 7.6, 10], [28, 10, 7, -20], [43, 15, 8, 25], [44, 36, 6.4, 0]]) +
    `<g transform="translate(22 54)"><ellipse rx="10" ry="6.4" fill="${OR2}"/><ellipse cx="-1" cy="2" rx="6" ry="3.4" fill="${YL2}"/>` +
    `<path d="M5 -3C6 -9 7 -12 9 -14" stroke="${OR2}" stroke-width="4.2" stroke-linecap="round"/><circle cx="10" cy="-16" r="4.4" fill="${OR2}"/>` +
    `<path d="M8 -20C7 -24 5 -25 3 -26M7 -22L5 -21M12 -20C13 -24 15 -25 17 -26M13 -22L15 -21" stroke="${BR}" stroke-width="1" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="6.6" cy="-19" rx="1.6" ry="1" fill="${OR}"/><ellipse cx="13.4" cy="-19" rx="1.6" ry="1" fill="${OR}"/>` + eye(11, -16.4, 0.9) + cheek(12.6, -14) + `<circle cx="14.2" cy="-15.6" r="0.8" fill="${BR}"/>` +
    `<path d="M-7 5V16M-3 6V16M3 6V16M7 5V16" stroke="${OR}" stroke-width="2" stroke-linecap="round"/>` + dot(-4, -2, 0.9, WH) + dot(0, -3.4, 0.9, WH) + dot(3, -1.6, 0.9, WH) + `<path d="M-10 -1L-13 -3" stroke="${OR2}" stroke-width="1.6" stroke-linecap="round"/></g>`;
  ART[37] = maples([[14, 32, 9, 20], [42, 42, 8, -10], [15, 52, 9, 0], [36, 60, 9, 30], [13, 72, 8, 20], [40, 76, 8, -20]]) + cheong(34, 4, 8);
  ART[38] = maples([[28, 12, 8, 0], [42, 22, 8, 20], [22, 32, 9.4, -15], [8, 46, 8, 30], [42, 42, 8, 0], [25, 58, 9, 10], [10, 72, 8, -30], [40, 71, 9, 15]]);
  ART[39] = maples([[30, 11, 8.4, 15], [44, 24, 7.6, 0], [22, 34, 9.4, -15], [42, 42, 8, 20], [8, 50, 8, 30], [28, 58, 9, 10], [12, 72, 8, -20], [40, 74, 8, 0]]);
  // 11월 오동
  const pflowers = (x, y, sp, up = 1) => [[-sp, -8 * up], [0, -11 * up], [sp, -7 * up]].map(([dx, dy], i) => branch(`M${x} ${y}Q${f(x + dx * 0.3)} ${f(y + dy * 0.6)} ${f(x + dx)} ${f(y + dy)}`, 0.8, GN2) + flower5(f(x + dx), f(y + dy), 3.4 - i * 0.2, BL, WH)).join('');
  ART[40] = puff(16, 70, 12) + pflowers(36, 76, 6) +
    `<g transform="translate(27 33)"><path d="M-14 22C-20 10 -16 -4 -4 -10C6 -15 18 -10 18 0C18 8 10 12 4 10C-4 8 -8 14 -8 22Z" fill="${RD}"/>` +
    `<path d="M-6 -10C-8 -16 -6 -20 -2 -22C-2 -18 0 -15 2 -13M2 -12C2 -18 5 -21 9 -22C8 -18 8 -15 10 -12M9 -10C11 -15 15 -17 19 -16C16 -13 14 -10 14 -7" fill="${OR}"/>` +
    `<circle cx="6" cy="-2" r="7.6" fill="${RD2}"/>` + eye(8, -3, 1.5) + cheek(10.8, 1.4, 1.1) + `<path d="M13 -1L19 1L13 3Z" fill="${YL}"/>` +
    `<path d="M-12 8C-8 4 -4 4 0 6M-12 14C-8 10 -4 10 -1 12" stroke="${OR}" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>` + gwang(42, 58);
  // 피·쌍피: 검은 잎 덩어리 윗가장자리에 파란 꽃이 바로 붙고, 그 위로 잎 달린 줄기가 올라감 (참고 이미지 구도)
  const stems = (list) => list.map(([x0, y0, cx, cy, x1, y1, n]) => sprig(x0, y0, cx, cy, x1, y1, n, 4.2, [NV, NV2], NV)).join('');
  const blooms = (list) => list.map(([x, y, r]) => flower5(x, y, r, BL, WH)).join('');
  ART[41] = stems([[20, 44, 18, 32, 14, 22, 4], [28, 42, 30, 30, 36, 20, 4], [34, 44, 40, 36, 44, 28, 3]]) + puff(25, 60, 17) + blooms([[19, 44, 5], [31, 42, 5.4], [41, 46, 4]]);
  ART[42] = stems([[18, 46, 16, 34, 24, 24, 4], [30, 44, 32, 32, 38, 22, 4], [40, 48, 44, 40, 46, 32, 3]]) + puff(26, 62, 16) + blooms([[17, 47, 4.6], [29, 44, 5.4], [40, 48, 4.4]]);
  ART[43] = `<rect x="0" y="64" width="50" height="20" fill="${RD}"/><path d="M0 64C8 60 14 66 22 62C30 58 38 64 50 60V66H0Z" fill="${RD}"/>` +
    stems([[20, 40, 18, 30, 24, 22, 3], [30, 38, 32, 28, 38, 20, 4], [38, 42, 44, 34, 46, 28, 3]]) + puff(25, 54, 15) + blooms([[19, 40, 4.8], [31, 38, 5.2], [40, 42, 4]]);
  // 12월 비
  ART[44] = bg(SKY) + willow(42, 30, 3, 4) + willow(48, 22, -1, 3) + willow(34, 18, 2, 3) + water(66) + `<g transform="translate(5 5)">` +
    `<path d="M6 28C8 16 30 14 34 26Z" fill="${YL}"/><path d="M12 27L20 18M20 18L20 27M20 18L28 26" stroke="${OR}" stroke-width="0.6" opacity="0.6"/><path d="M20 19L21 42" stroke="${BR}" stroke-width="1.1"/>` +
    `<path d="M12 62C12 48 15 38 20 38C25 38 28 48 28 62Z" fill="${RD}"/><path d="M14 52h12" stroke="#c8392e" stroke-width="1.4"/>` +
    `<circle cx="20" cy="33" r="5.4" fill="${SKIN}"/><path d="M14.6 32C14.6 26 25.4 26 25.4 32Z" fill="${NV}"/>` + eye(18.2, 33.4, 0.8) + eye(21.8, 33.4, 0.8) + cheek(17, 35.6) + cheek(23, 35.6) + `</g>` +
    `<g transform="translate(8 71)"><ellipse rx="4.6" ry="3.4" fill="${GN}"/><circle cx="-2" cy="-2.8" r="1.6" fill="${GN}"/><circle cx="2" cy="-2.8" r="1.6" fill="${GN}"/>` + eye(-2, -2.8, 0.7) + eye(2, -2.8, 0.7) + `<path d="M-1.4 0.4q1.4 1 2.8 0" stroke="${NV}" stroke-width="0.5" fill="none"/></g>` +
    gwang(42, 56);
  ART[45] = bg(SKY) + willow(8, 56, 4, 6) + willow(20, 40, 3, 4) + willow(44, 50, -3, 5) + willow(32, 28, 2, 3) + flyBird(26, 54, 1.1, -24, NV, NV2, WH, OR).replace(`fill="${WH}"/><path d="M-1 1`, `fill="${WH}"/><circle cx="5.4" cy="2.2" r="2" fill="${RD}"/><path d="M-1 1`);
  ART[46] = bg(SKY) + willow(6, 62, 4, 7) + willow(18, 36, 2, 4) + willow(44, 60, -3, 7) + willow(32, 24, 2, 3) + cho(20, 40, -8);
  ART[47] = bg(NV) + `<rect x="4" y="6" width="42" height="9" rx="4.5" fill="${RD}"/>` + [10, 18, 26, 34, 42].map((x) => dot(x - 2, 10.5, 1.2, YL)).join('') +
    `<rect x="6" y="15" width="7" height="66" rx="3.5" fill="${RD}"/><rect x="37" y="15" width="7" height="66" rx="3.5" fill="${RD}"/>` +
    `<path d="M27 20L19 40H26L20 62L33 36H26L31 20Z" fill="${YL}"/>` + dot(18, 26, 0.7, YL2) + dot(31, 48, 0.7, YL2) + dot(23, 70, 0.7, YL2);

  const FRAME = `<rect width="50" height="80" rx="4" fill="${RD}"/><rect x="1.6" y="1.6" width="46.8" height="76.8" rx="3" fill="${CR}"/>`;
  function sprite() {
    let s = `<clipPath id="hw-in"><rect x="1.6" y="1.6" width="46.8" height="76.8" rx="3"/></clipPath>`;
    for (let id = 0; id < 48; id++) s += `<g id="hw${id}">${FRAME}<g clip-path="url(#hw-in)">${ART[id]}</g></g>`;
    return s;
  }
  const use = (id) => `<use href="#hw${id}"/>`;
  const typeOf = (id) => TYPES[(id >> 2) + 1][id & 3];
  return { sprite, use, typeOf, TYPES };
});
