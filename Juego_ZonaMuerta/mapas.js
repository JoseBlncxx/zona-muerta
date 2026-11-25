'use strict';
/* =========================================================
   MAPAS (generados por código, cada uno con su estilo)
   0 = suelo, 1 = muro/edificio, 2 = objeto (auto, roca, mesa, lápida), 3 = árbol,
   4 = puerta con llave, 5 = barricada de madera (se puede romper)
   ========================================================= */
const passable = v => v === 0 || v === 4 || v === 5;   // para calcular caminos (los zombis rompen puertas y tablas)
function makeGrid(w, h) { return { w, h, t: new Uint8Array(w * h) }; }
function setT(m, x, y, v) { if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.t[y * m.w + x] = v; }
function getT(m, x, y) { return (x < 0 || y < 0 || x >= m.w || y >= m.h) ? 1 : m.t[y * m.w + x]; }
function border(m, v) { for (let x = 0; x < m.w; x++) { setT(m, x, 0, v); setT(m, x, m.h - 1, v); } for (let y = 0; y < m.h; y++) { setT(m, 0, y, v); setT(m, m.w - 1, y, v); } }
function clearArea(m, cx, cy, r) { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if (x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1) setT(m, x, y, 0); }
function scatter(m, rng, n, v) { for (let i = 0; i < n; i++) { const x = 1 + (rng() * (m.w - 2) | 0), y = 1 + (rng() * (m.h - 2) | 0); if (getT(m, x, y) === 0) setT(m, x, y, v); } }

function genCity(rng) {
  const m = makeGrid(66, 46); border(m, 1);
  for (let by = 2; by < m.h - 6; by += 11) for (let bx = 2; bx < m.w - 7; bx += 13) {
    const bw = 5 + (rng() * 4 | 0), bh = 4 + (rng() * 4 | 0);
    const ox = bx + 1 + (rng() * (11 - bw) | 0), oy = by + 1 + (rng() * (9 - bh) | 0);
    for (let y = oy; y < oy + bh; y++) for (let x = ox; x < ox + bw; x++) setT(m, x, y, 1);
  }
  scatter(m, rng, 45, 2);
  m.sx = m.w >> 1; m.sy = m.h >> 1; clearArea(m, m.sx, m.sy, 3); return m;
}
function genForest(rng) {
  const m = makeGrid(66, 46); border(m, 3);
  for (let i = 0; i < 16; i++) {
    const cx = rng() * m.w | 0, cy = rng() * m.h | 0, r = 1.2 + rng() * 2.5;
    for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++)
      if (Math.hypot(x - cx, y - cy) < r && rng() < 0.75) setT(m, x, y, 3);
  }
  scatter(m, rng, m.w * m.h * 0.04, 3); scatter(m, rng, 30, 2);
  m.sx = m.w >> 1; m.sy = m.h >> 1; clearArea(m, m.sx, m.sy, 4); return m;
}
function genLab(rng) {
  const m = makeGrid(61, 43);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (x % 10 === 0 || y % 7 === 0) setT(m, x, y, 1);
  for (let k = 1; k <= 5; k++) for (let r = 0; r < 6; r++) if (rng() < 0.85) { const y = r * 7 + 1 + (rng() * 4 | 0); setT(m, k * 10, y, 0); setT(m, k * 10, y + 1, 0); }
  for (let k = 1; k <= 5; k++) for (let c = 0; c < 6; c++) if (rng() < 0.85) { const x = c * 10 + 2 + (rng() * 5 | 0); setT(m, x, k * 7, 0); setT(m, x + 1, k * 7, 0); setT(m, x + 2, k * 7, 0); }
  for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
    const n = 1 + (rng() * 4 | 0);
    for (let i = 0; i < n; i++) setT(m, c * 10 + 3 + (rng() * 5 | 0), r * 7 + 2 + (rng() * 4 | 0), 2);
  }
  m.sx = 25; m.sy = 24;
  for (let y = 22; y <= 27; y++) for (let x = 21; x <= 29; x++) setT(m, x, y, 0);
  return m;
}
function genCemetery(rng) {
  const m = makeGrid(66, 46); border(m, 1);
  for (let y = 3; y < m.h - 3; y += 4) for (let x = 3; x < m.w - 3; x += 2) {
    if (x % 16 < 3) continue;
    if (rng() < 0.65) setT(m, x, y, 2);
  }
  for (let i = 0; i < 6; i++) {
    const x = 3 + (rng() * (m.w - 8) | 0), y = 3 + (rng() * (m.h - 8) | 0);
    for (let yy = y; yy < y + 3; yy++) for (let xx = x; xx < x + 3; xx++) setT(m, xx, yy, 1);
  }
  scatter(m, rng, 28, 3);
  m.sx = m.w >> 1; m.sy = m.h >> 1; clearArea(m, m.sx, m.sy, 4); return m;
}
function genBase(rng) {
  const m = makeGrid(66, 46); border(m, 1);
  for (let i = 0; i < 9; i++) { // barracas
    const w = 5 + (rng() * 4 | 0), h = 3 + (rng() * 3 | 0), x = 3 + (rng() * (m.w - w - 6) | 0), y = 3 + (rng() * (m.h - h - 6) | 0);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) setT(m, xx, yy, 1);
  }
  for (let i = 0; i < 22; i++) { // líneas de costales de arena
    const horiz = rng() < 0.5, len = 2 + (rng() * 4 | 0), x = 2 + (rng() * (m.w - 8) | 0), y = 2 + (rng() * (m.h - 8) | 0);
    for (let k = 0; k < len; k++) setT(m, horiz ? x + k : x, horiz ? y : y + k, 2);
  }
  m.sx = m.w >> 1; m.sy = m.h >> 1; clearArea(m, m.sx, m.sy, 4); return m;
}

/* Quita zonas encerradas a las que no se puede llegar */
function finalizeMap(m) {
  const reach = new Uint8Array(m.w * m.h), q = [m.sy * m.w + m.sx]; reach[q[0]] = 1;
  while (q.length) {
    const i = q.pop(), x = i % m.w, y = (i / m.w) | 0;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
      const nx = x + dx, ny = y + dy; if (!passable(getT(m, nx, ny))) return;
      const ni = ny * m.w + nx; if (!reach[ni]) { reach[ni] = 1; q.push(ni); }
    });
  }
  m.reach = [];
  for (let i = 0; i < m.t.length; i++) { if (m.t[i] === 0 && !reach[i]) m.t[i] = 1; else if (m.t[i] === 0) m.reach.push(i); }
  m.pw = m.w * T; m.ph = m.h * T; m.thp = new Float32Array(m.w * m.h); m.vaults = [];
  return m;
}
/* Barricadas de madera en pasillos angostos */
function addBreakables(m, rng, n) {
  const cand = m.reach.filter(i => {
    const x = i % m.w, y = (i / m.w) | 0;
    if (Math.abs(x - m.sx) < 6 && Math.abs(y - m.sy) < 6) return false;
    const h = getT(m, x - 1, y) !== 0 && getT(m, x + 1, y) !== 0, v = getT(m, x, y - 1) !== 0 && getT(m, x, y + 1) !== 0;
    return h !== v;
  });
  for (let k = 0; k < n && cand.length; k++) { const i = cand.splice(rng() * cand.length | 0, 1)[0]; m.t[i] = 5; m.thp[i] = 150; }
  m.reach = m.reach.filter(i => m.t[i] === 0);
}
/* Bóvedas: cuartos cerrados con puerta de llave y un cofre dentro */
function addVaults(m, rng, n) {
  let tries = 0;
  while (m.vaults.length < n && tries++ < 400) {
    const x = 3 + (rng() * (m.w - 9) | 0), y = 3 + (rng() * (m.h - 9) | 0);
    if (Math.abs(x + 2 - m.sx) < 9 && Math.abs(y + 2 - m.sy) < 7) continue;
    let ok = true;
    for (let yy = y - 1; yy <= y + 5 && ok; yy++) for (let xx = x - 1; xx <= x + 5; xx++) if (getT(m, xx, yy) !== 0) { ok = false; break; }
    if (!ok || m.vaults.some(v => Math.abs(v.x - x) < 9 && Math.abs(v.y - y) < 9)) continue;
    for (let i = 0; i < 5; i++) { setT(m, x + i, y, 1); setT(m, x + i, y + 4, 1); setT(m, x, y + i, 1); setT(m, x + 4, y + i, 1); }
    const door = [[x + 2, y], [x + 2, y + 4], [x, y + 2], [x + 4, y + 2]][rng() * 4 | 0];
    setT(m, door[0], door[1], 4); m.thp[door[1] * m.w + door[0]] = 500;
    m.vaults.push({ x: x + 1, y: y + 1, door, cx: (x + 2.5) * T, cy: (y + 2.5) * T });
  }
  m.reach = m.reach.filter(i => { const tx = i % m.w, ty = (i / m.w) | 0; return m.t[i] === 0 && !m.vaults.some(v => tx >= v.x && tx < v.x + 3 && ty >= v.y && ty < v.y + 3); });
}
function drawDoorTile(g, px, py) {
  g.fillStyle = '#3a3f46'; g.fillRect(px, py, T, T);
  g.fillStyle = '#6a737d'; g.fillRect(px + 4, py + 4, T - 8, T - 8);
  g.strokeStyle = '#2a2f36'; g.lineWidth = 2; for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo(px + 4, py + 4 + i * 10); g.lineTo(px + T - 4, py + 4 + i * 10); g.stroke(); }
  g.fillStyle = '#ffcc33'; circle(g, px + T / 2, py + T / 2, 7); g.fillStyle = '#3a2a00'; g.fillRect(px + T / 2 - 1.5, py + T / 2 - 2, 3, 7);
}
function drawPlanks(g, px, py, rng) {
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(px + 5, py + 7, T - 4, T - 6);
  for (let i = 0; i < 3; i++) { g.fillStyle = jit('#8a6236', 14, rng); g.fillRect(px + 2, py + 4 + i * 14, T - 4, 11); g.fillStyle = '#5a3a1a'; circle(g, px + 7, py + 9 + i * 14, 1.5); circle(g, px + T - 7, py + 9 + i * 14, 1.5); }
  g.save(); g.translate(px + T / 2, py + T / 2); g.rotate(.6); g.fillStyle = '#6e4a26'; g.fillRect(-T / 2, -4, T, 8); g.restore();
}

/* ---------- mapas nuevos ---------- */
function genHospital(rng) {
  const m = makeGrid(63, 45);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (x % 12 === 0 || y % 11 === 0) setT(m, x, y, 1);
  for (let y = 0; y < m.h; y++) for (let x = 1; x < m.w - 1; x++) if (y % 11 === 5 || y % 11 === 6) setT(m, x, y, 0); // pasillo central de cada piso
  for (let k = 1; k < 4; k++) for (let c = 0; c < 5; c++) if (rng() < .8) { const x = c * 12 + 3 + (rng() * 6 | 0); setT(m, x, k * 11, 0); setT(m, x + 1, k * 11, 0); }
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) for (let i = 0; i < 3; i++) if (rng() < .7) setT(m, c * 12 + 2 + i * 3, r * 11 + 2, 2);
  border(m, 1); m.sx = 30; m.sy = 27; clearArea(m, m.sx, m.sy, 2); return m;
}
function genMall(rng) {
  const m = makeGrid(68, 46); border(m, 1);
  for (let by = 3; by < m.h - 8; by += 14) for (let bx = 3; bx < m.w - 10; bx += 16) { // tiendas con entrada
    const w = 9 + (rng() * 3 | 0), h = 7 + (rng() * 3 | 0);
    for (let y = by; y < by + h; y++) for (let x = bx; x < bx + w; x++) if (y === by || y === by + h - 1 || x === bx || x === bx + w - 1) setT(m, x, y, 1);
    const dx = bx + 2 + (rng() * (w - 5) | 0); setT(m, dx, by + h - 1, 0); setT(m, dx + 1, by + h - 1, 0); setT(m, dx + 2, by + h - 1, 0);
    for (let i = 0; i < 4; i++) setT(m, bx + 2 + (rng() * (w - 4) | 0), by + 2 + (rng() * (h - 5) | 0), 2);
  }
  scatter(m, rng, 30, 2); scatter(m, rng, 14, 3);
  m.sx = m.w >> 1; m.sy = m.h >> 1; clearArea(m, m.sx, m.sy, 3); return m;
}
function genMetro(rng) {
  const m = makeGrid(68, 46);
  m.t.fill(1);
  const rows = [5, 15, 25, 35];
  rows.forEach(r => { for (let y = r; y < r + 5; y++) for (let x = 1; x < m.w - 1; x++) setT(m, x, y, 0); });
  for (let k = 0; k < 7; k++) { const x = 4 + (rng() * (m.w - 10) | 0); for (let y = 5; y < 40; y++) for (let xx = x; xx < x + 3; xx++) setT(m, xx, y, 0); }
  for (let i = 0; i < 5; i++) { const r = rows[rng() * 4 | 0], x = 6 + (rng() * (m.w - 20) | 0); for (let xx = x; xx < x + 8; xx++) setT(m, xx, r + 1, 2); } // vagones abandonados
  for (let i = 0; i < 40; i++) { const r = rows[rng() * 4 | 0], x = 2 + (rng() * (m.w - 4) | 0); if (rng() < .5) setT(m, x, r, 2); else setT(m, x, r + 4, 2); } // columnas
  m.sx = m.w >> 1; m.sy = 27; clearArea(m, m.sx, m.sy, 2); return m;
}
function genAirport(rng) {
  const m = makeGrid(70, 48); border(m, 1);
  for (let x = 2; x < m.w - 2; x++) for (let y = 2; y < 9; y++) setT(m, x, y, 1); // terminal
  for (let k = 0; k < 6; k++) { const x = 5 + k * 11; setT(m, x, 8, 0); setT(m, x + 1, 8, 0); for (let y = 3; y < 8; y++) setT(m, x, y, 0), setT(m, x + 1, y, 0); }
  for (let p = 0; p < 4; p++) { // aviones (en forma de cruz)
    const cx = 10 + p * 15 + (rng() * 4 | 0), cy = 20 + (rng() * 16 | 0);
    for (let x = cx - 1; x <= cx + 1; x++) for (let y = cy - 5; y <= cy + 5; y++) setT(m, x, y, 1);
    for (let x = cx - 5; x <= cx + 5; x++) setT(m, x, cy - 1, 1), setT(m, x, cy, 1);
    for (let x = cx - 2; x <= cx + 2; x++) setT(m, x, cy + 5, 1);
  }
  scatter(m, rng, 40, 2);
  m.sx = m.w >> 1; m.sy = 14; clearArea(m, m.sx, m.sy, 3); return m;
}
function extraThemes() { return {
  hospital: {
    name: 'Hospital San Judas', gen: genHospital, floor: '#b7c7c4', wallTop: '#e2e6e4', wallSide: '#7a8a88', dark: 0.5,
    floorDeco(g, m, x, y, px, py, rng) {
      g.strokeStyle = 'rgba(0,60,60,.12)'; g.lineWidth = 1; g.strokeRect(px + .5, py + .5, T / 2, T / 2); g.strokeRect(px + T / 2 + .5, py + T / 2 + .5, T / 2 - 1, T / 2 - 1);
      if (rng() < .04) { g.fillStyle = 'rgba(130,0,0,.35)'; circle(g, px + rng() * T, py + rng() * T, 5 + rng() * 9); }
    },
    wallDeco(g, px, py, rng) { if (rng() < .1) { g.fillStyle = '#d02020'; g.fillRect(px + 20, py + 8, 8, 20); g.fillRect(px + 14, py + 14, 20, 8); } },
    prop(g, px, py, rng) { // camas
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(px + 9, py + 5, 32, 42);
      g.fillStyle = '#f0f0f0'; g.fillRect(px + 7, py + 2, 32, 42); g.fillStyle = jit('#4a7ab0', 15, rng); g.fillRect(px + 7, py + 18, 32, 26);
      g.fillStyle = '#fff'; rr(g, px + 11, py + 5, 24, 10, 4); g.fill();
    },
  },
  mall: {
    name: 'Centro Comercial', gen: genMall, floor: '#d8ccb0', wallTop: '#9a8a7a', wallSide: '#5a4e44', dark: 0.3,
    floorDeco(g, m, x, y, px, py, rng) {
      if ((x + y) % 2) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(px, py, T, T); }
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(px + 4, py + 4, 10, 3);
      if (rng() < .03) { g.fillStyle = 'rgba(120,0,0,.3)'; circle(g, px + rng() * T, py + rng() * T, 6 + rng() * 8); }
    },
    wallDeco(g, px, py, rng) { if (rng() < .15) { g.fillStyle = ['#e04a4a', '#3a9ae0', '#e0b030', '#40b060'][rng() * 4 | 0]; g.fillRect(px + 4, py + 10, T - 8, 12); } },
    prop(g, px, py, rng) { // kioscos y bancas
      if (rng() < .5) { g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(px + 6, py + 8, 40, 38); g.fillStyle = jit('#b05a30', 20, rng); g.fillRect(px + 4, py + 4, 40, 38); g.fillStyle = '#f0e0c0'; g.fillRect(px + 8, py + 8, 32, 8); }
      else { g.fillStyle = '#5a3a20'; g.fillRect(px + 4, py + 18, 40, 12); g.fillStyle = '#7a5a30'; g.fillRect(px + 4, py + 16, 40, 4); }
    },
    tree(g, px, py, rng) { g.fillStyle = '#7a6a5a'; circle(g, px + T / 2, py + T / 2, 16); drawTree(g, px, py, rng, false); },
  },
  metro: {
    name: 'Túneles del Metro', gen: genMetro, floor: '#4a4a4e', wallTop: '#2e2e33', wallSide: '#18181c', dark: 0.72,
    floorDeco(g, m, x, y, px, py, rng) {
      if (getT(m, x, y - 1) !== 0 && getT(m, x, y - 1) !== 2 || getT(m, x, y + 1) === 1) { g.fillStyle = 'rgba(200,180,60,.35)'; g.fillRect(px, getT(m, x, y - 1) === 1 ? py : py + T - 6, T, 6); }
      if (getT(m, x - 1, y) !== 1 && getT(m, x + 1, y) !== 1 && getT(m, x, y - 2) === 1 && getT(m, x, y + 3) === 1) { g.fillStyle = '#6a5a4a'; g.fillRect(px, py + 14, T, 4); g.fillRect(px, py + 30, T, 4); }
      if (rng() < .3) { g.fillStyle = 'rgba(80,60,40,.5)'; g.fillRect(px + rng() * 30, py + 18, 14, 12); }
    },
    wallDeco(g, px, py, rng) { if (rng() < .08) { g.fillStyle = 'rgba(255,240,180,.5)'; g.fillRect(px + 10, py + 6, 28, 5); } },
    prop(g, px, py, rng) { g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(px + 6, py + 6, T - 4, T - 4); g.fillStyle = jit('#5a7a9a', 20, rng); g.fillRect(px + 2, py + 2, T - 4, T - 4); g.fillStyle = 'rgba(200,230,255,.35)'; g.fillRect(px + 8, py + 8, T - 16, 10); },
  },
  aeropuerto: {
    name: 'Aeropuerto', gen: genAirport, floor: '#5a5d60', wallTop: '#c8ccd0', wallSide: '#70757a', dark: 0.25,
    floorDeco(g, m, x, y, px, py, rng) {
      if (y % 12 === 0) { g.fillStyle = '#e0c030'; g.fillRect(px + 6, py + T / 2 - 2, T - 12, 4); }
      if (x % 15 === 0 && y > 9) { g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(px + T / 2 - 2, py + 4, 4, T - 8); }
      if (rng() < .05) { g.fillStyle = 'rgba(0,0,0,.25)'; circle(g, px + rng() * T, py + rng() * T, 6 + rng() * 12); }
    },
    wallDeco(g, px, py, rng) { if (rng() < .2) { g.fillStyle = 'rgba(100,170,230,.6)'; g.fillRect(px + 3, py + 8, T - 6, 14); } },
    prop(g, px, py, rng) { // carritos de equipaje
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(px + 8, py + 10, 36, 32); g.fillStyle = '#9a9a9a'; g.fillRect(px + 5, py + 7, 36, 32);
      const c = ['#a0402a', '#2a5a9a', '#3a7a3a', '#c0a030']; for (let i = 0; i < 3; i++) { g.fillStyle = c[rng() * 4 | 0]; rr(g, px + 8 + i * 11, py + 11, 9, 22, 2); g.fill(); }
    },
  },
}; }

/* ---------- dibujo de los mapas ---------- */
function adjWall(m, x, y) { return getT(m, x + 1, y) === 1 || getT(m, x - 1, y) === 1 || getT(m, x, y + 1) === 1 || getT(m, x, y - 1) === 1; }
function drawTree(g, px, py, rng, dead) {
  const cx = px + T / 2 + (rng() - .5) * 8, cy = py + T / 2 + (rng() - .5) * 8;
  g.fillStyle = 'rgba(0,0,0,.35)'; circle(g, cx + 7, cy + 7, 22);
  if (dead) {
    g.strokeStyle = '#3b2f25'; g.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = rng() * TAU, l = 12 + rng() * 14; g.lineWidth = 3 + rng() * 2;
      g.beginPath(); g.moveTo(cx, cy); const mx = cx + Math.cos(a) * l * .6, my = cy + Math.sin(a) * l * .6;
      g.lineTo(mx, my); g.lineTo(cx + Math.cos(a + .4) * l, cy + Math.sin(a + .4) * l); g.stroke();
    }
    g.fillStyle = '#4a3a2c'; circle(g, cx, cy, 7);
  } else {
    for (let i = 0; i < 5; i++) { g.fillStyle = jit('#2f6b2a', 22, rng); circle(g, cx + (rng() - .5) * 16, cy + (rng() - .5) * 16, 12 + rng() * 8); }
    g.fillStyle = 'rgba(160,220,110,.18)'; circle(g, cx - 5, cy - 5, 9);
  }
}
const THEMES = {
  ciudad: {
    name: 'Ciudad Abandonada', gen: genCity, floor: '#43464b', wallTop: '#6e5d52', wallSide: '#3a2f29', dark: 0.12,
    floorDeco(g, m, x, y, px, py, rng) {
      if (adjWall(m, x, y)) { g.fillStyle = jit('#77746d', 8, rng); g.fillRect(px, py, T, T); g.strokeStyle = 'rgba(0,0,0,.18)'; g.strokeRect(px + .5, py + .5, T - 1, T - 1); return; }
      if (rng() < .1) { g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px + rng() * T, py + rng() * T); g.lineTo(px + rng() * T, py + rng() * T); g.lineTo(px + rng() * T, py + rng() * T); g.stroke(); }
      if (rng() < .05) { g.fillStyle = 'rgba(0,0,0,.25)'; circle(g, px + rng() * T, py + rng() * T, 6 + rng() * 10); }
    },
    wallDeco(g, px, py, rng) { if (rng() < .12) { g.fillStyle = 'rgba(40,40,40,.7)'; g.fillRect(px + 10, py + 10, 18, 14); g.fillStyle = 'rgba(120,120,120,.5)'; g.fillRect(px + 12, py + 12, 14, 3); } },
    prop(g, px, py, rng) {
      const cols = ['#8b1e1e', '#1e4f8b', '#c9a227', '#3a6b35', '#777777', '#d8d8d8'];
      g.save(); g.translate(px + T / 2, py + T / 2); g.rotate((rng() < .5 ? 0 : Math.PI / 2) + (rng() - .5) * .35);
      g.fillStyle = 'rgba(0,0,0,.4)'; rr(g, -20, -11, 46, 28, 6); g.fill();
      g.fillStyle = cols[rng() * cols.length | 0]; rr(g, -23, -14, 46, 28, 6); g.fill();
      g.fillStyle = 'rgba(20,30,40,.85)'; g.fillRect(-11, -11, 8, 22); g.fillRect(9, -11, 6, 22);
      g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(-3, -12, 10, 24);
      g.restore();
    },
  },
  bosque: {
    name: 'Bosque Sombrío', gen: genForest, floor: '#2e4a25', wallTop: '#3d3a33', wallSide: '#24221d', dark: 0.42,
    floorDeco(g, m, x, y, px, py, rng) {
      if (rng() < .12) { g.fillStyle = 'rgba(80,60,30,.35)'; circle(g, px + rng() * T, py + rng() * T, 8 + rng() * 12); }
      g.strokeStyle = 'rgba(120,170,70,.35)'; g.lineWidth = 1;
      for (let i = 0; i < 4; i++) if (rng() < .5) { const gx = px + rng() * T, gy = py + rng() * T; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx - 2, gy - 5); g.moveTo(gx, gy); g.lineTo(gx + 2, gy - 5); g.stroke(); }
      if (rng() < .03) { g.fillStyle = rng() < .5 ? '#d8d060' : '#c060a0'; circle(g, px + rng() * T, py + rng() * T, 2); }
    },
    prop(g, px, py, rng) {
      const cx = px + T / 2, cy = py + T / 2;
      g.fillStyle = 'rgba(0,0,0,.35)'; circle(g, cx + 5, cy + 5, 17);
      g.fillStyle = jit('#77776f', 12, rng); g.beginPath();
      for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, r = 13 + rng() * 6; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.fill();
      g.fillStyle = 'rgba(255,255,255,.15)'; circle(g, cx - 4, cy - 4, 6);
    },
    tree(g, px, py, rng) { drawTree(g, px, py, rng, false); },
  },
  laboratorio: {
    name: 'Laboratorio X-13', gen: genLab, floor: '#8e989d', wallTop: '#56677a', wallSide: '#2b3540', dark: 0.6,
    floorDeco(g, m, x, y, px, py, rng) {
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; g.strokeRect(px + .5, py + .5, T - 1, T - 1);
      if (rng() < .03) { g.fillStyle = 'rgba(80,220,60,.35)'; circle(g, px + T / 2, py + T / 2, 8 + rng() * 10); }
      if (rng() < .02) { g.fillStyle = 'rgba(120,0,0,.35)'; circle(g, px + rng() * T, py + rng() * T, 6 + rng() * 8); }
    },
    wallDeco(g, px, py, rng) { if (rng() < .08) { g.fillStyle = '#d4b020'; for (let i = 0; i < 4; i++) g.fillRect(px + 4 + i * 11, py + 4, 6, 6); } },
    prop(g, px, py, rng) {
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(px + 7, py + 9, T - 8, T - 10);
      g.fillStyle = '#b8c2c8'; g.fillRect(px + 3, py + 4, T - 8, T - 10);
      g.fillStyle = '#dfe6ea'; g.fillRect(px + 3, py + 4, T - 8, 5);
      const cs = ['#3cff5a', '#3ab0ff', '#ff4f8a', '#ffd040'];
      for (let i = 0; i < 3; i++) { g.fillStyle = cs[rng() * 4 | 0]; circle(g, px + 11 + rng() * 24, py + 14 + rng() * 18, 3 + rng() * 2); }
    },
  },
  cementerio: {
    name: 'Cementerio Olvidado', gen: genCemetery, floor: '#27311f', wallTop: '#33333b', wallSide: '#15151a', dark: 0.84,
    floorDeco(g, m, x, y, px, py, rng) {
      if (getT(m, x, y - 1) === 2) { g.fillStyle = jit('#3d2f22', 8, rng); rr(g, px + 10, py + 2, T - 20, T - 8, 6); g.fill(); return; }
      if (rng() < .3) { g.fillStyle = 'rgba(60,80,40,.4)'; circle(g, px + rng() * T, py + rng() * T, 4 + rng() * 8); }
      if (rng() < .05) { g.fillStyle = 'rgba(200,200,190,.5)'; g.fillRect(px + rng() * T, py + rng() * T, 6, 2); } // huesitos
    },
    prop(g, px, py, rng) {
      const cx = px + T / 2, cy = py + T / 2 + 2;
      g.fillStyle = 'rgba(0,0,0,.45)'; rr(g, cx - 10, cy - 12, 26, 28, 10); g.fill();
      g.fillStyle = jit('#8a8a90', 14, rng); rr(g, cx - 13, cy - 16, 26, 28, 11); g.fill();
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(cx - 1.5, cy - 11, 3, 14); g.fillRect(cx - 6, cy - 7, 12, 3);
      g.fillStyle = 'rgba(70,110,50,.5)'; circle(g, cx + 8, cy + 8, 4);
    },
    tree(g, px, py, rng) { drawTree(g, px, py, rng, true); },
  },
  base: {
    name: 'Base Militar', gen: genBase, floor: '#7d7158', wallTop: '#4f5a3a', wallSide: '#2a3020', dark: 0.5,
    floorDeco(g, m, x, y, px, py, rng) {
      if (rng() < .15) { g.fillStyle = 'rgba(0,0,0,.12)'; circle(g, px + rng() * T, py + rng() * T, 5 + rng() * 12); }
      if (rng() < .04) { g.strokeStyle = 'rgba(60,40,20,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py + rng() * T); g.lineTo(px + T, py + rng() * T); g.stroke(); }
    },
    wallDeco(g, px, py, rng) { if (rng() < .1) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(px + 6, py + 18, 36, 4); } },
    prop(g, px, py, rng) {
      for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
        const bx = px + 2 + i * 15 + (r ? 7 : 0), by = py + 10 + r * 14;
        g.fillStyle = 'rgba(0,0,0,.3)'; rr(g, bx + 2, by + 3, 15, 13, 5); g.fill();
        g.fillStyle = jit('#a89366', 10, rng); rr(g, bx, by, 15, 13, 5); g.fill();
      }
    },
  },
};

function renderMap(m, th, rng) {
  const c = document.createElement('canvas'); c.width = m.pw; c.height = m.ph; const g = c.getContext('2d');
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const px = x * T, py = y * T; g.fillStyle = jit(th.floor, 7, rng); g.fillRect(px, py, T, T);
    if (getT(m, x, y) !== 1) th.floorDeco(g, m, x, y, px, py, rng);
  }
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (getT(m, x, y) === 1) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x * T + 8, y * T + 8, T, T); }
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const v = getT(m, x, y), px = x * T, py = y * T;
    if (v === 1) {
      const below = getT(m, x, y + 1) === 1;
      g.fillStyle = th.wallSide; g.fillRect(px, py, T, T);
      g.fillStyle = jit(th.wallTop, 5, rng); g.fillRect(px, py, T, below ? T : T - 12);
      if (getT(m, x, y - 1) !== 1) { g.fillStyle = 'rgba(255,255,255,.13)'; g.fillRect(px, py, T, 3); }
      if (getT(m, x - 1, y) !== 1) { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(px, py, 3, T); }
      if (getT(m, x + 1, y) !== 1) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px + T - 3, py, 3, T); }
      if (th.wallDeco && below) th.wallDeco(g, px, py, rng);
    } else if (v === 2) th.prop(g, px, py, rng);
    else if (v === 3) (th.tree || ((g2, a, b, r) => drawTree(g2, a, b, r, false)))(g, px, py, rng);
    else if (v === 4) drawDoorTile(g, px, py);
    else if (v === 5) drawPlanks(g, px, py, rng);
  }
  return c;
}
function renderMini(m) {
  const s = 3, c = document.createElement('canvas'); c.width = m.w * s; c.height = m.h * s; const g = c.getContext('2d');
  g.fillStyle = 'rgba(30,40,30,.85)'; g.fillRect(0, 0, c.width, c.height);
  const cols = { 1: '#8a8f86', 2: '#566050', 3: '#566050', 4: '#ffcc33', 5: '#a07040' };
  for (let i = 0; i < m.t.length; i++) if (m.t[i]) { g.fillStyle = cols[m.t[i]]; g.fillRect((i % m.w) * s, ((i / m.w) | 0) * s, s, s); }
  return c;
}


Object.assign(THEMES, extraThemes()); // agrega hospital, centro comercial, metro y aeropuerto
