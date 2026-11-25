'use strict';
/* =========================================================
   ZONA MUERTA - LÓGICA Y DIBUJO DEL JUEGO
   Archivos: core.js (utilidades/sonido) · mapas.js · datos.js
             audio.js (efectos/música) · game.js · ui.js (pantallas/controles)
   ========================================================= */

const G = {
  state: 'menu', mode: 'campaign', level: 0, L: null, tier: 0, map: null, theme: null, mapCanvas: null, decal: null, dg: null, mini: null, mg: null,
  p: null, zombies: [], bullets: [], particles: [], pickups: [], allies: [], enemyShots: [], puddles: [],
  turrets: [], mines: [], barricades: [], barrels: [], survivors: [], gen: null, heli: null, pendingBarrels: [],
  cam: { x: 0, y: 0 }, shake: 0, flash: 0, lightFlash: 0, intro: 0, time: 0, banner: null, toasts: [], hint: null,
  kills: 0, spawned: 0, spawnTimer: 0, score: 0, shots: 0, hits: 0, boss: null, phase: 'mission', heartT: 0, coinsLevel: 0,
  rescued: 0, defT: 0, wave: 0, waveLeft: 0, breakT: 0, keys: 0, order: 'follow', gadget: 0, cine: null,
  rain: [], lightning: 0, lightT: 8, dmgTaken: 0, bossNonPistol: false, achT: 1,
  flow: null, flowFrom: -1, menuT: 0, target: null, targetT: 0, shopFrom: 'menu',
};
const keys = {};
const mouse = { x: 0, y: 0, down: false };

function audioInit() { const first = !Sfx.ctx; Sfx.init(); if (first && Sfx.ctx) { Sfx.applyVolumes(); Music.start(); } }

/* =========================================================
   PREPARAR NIVELES
   ========================================================= */
function loadLevelMap(L) {
  const th = THEMES[L.map], rng = mulberry32(L.seed);
  const m = finalizeMap(th.gen(rng));
  addBreakables(m, rng, 6); addVaults(m, rng, 2);
  G.map = m; G.theme = th; G.mapCanvas = renderMap(m, th, rng); G.mini = renderMini(m); G.mg = G.mini.getContext('2d');
  G.decal = document.createElement('canvas'); G.decal.width = m.pw; G.decal.height = m.ph; G.dg = G.decal.getContext('2d');
  G.flow = new Int32Array(m.w * m.h); G.flowFrom = -1;
}
function randomFloor(minDist, from) {
  const m = G.map;
  for (let tries = 0; tries < 80; tries++) {
    const i = m.reach[Math.random() * m.reach.length | 0], x = (i % m.w + .5) * T, y = (((i / m.w) | 0) + .5) * T;
    if (!from || Math.hypot(x - from.x, y - from.y) > minDist) return { x, y };
  }
  const i = m.reach[Math.random() * m.reach.length | 0]; return { x: (i % m.w + .5) * T, y: (((i / m.w) | 0) + .5) * T };
}
function farthestFloor(from) { let far = null, fd = -1; for (let k = 0; k < 60; k++) { const c = randomFloor(0); const d = Math.hypot(c.x - from.x, c.y - from.y); if (d > fd) { fd = d; far = c; } } return far; }
function bestOwned() { return Math.max(...save.owned.filter(i => i < 7), 0); }
function makeAlly(cls, i, p) {
  const c = ALLY_CLASSES[cls];
  return { kind: 'human', cls, c, name: c.name.split(' · ')[0], color: c.color, x: p.x + (i ? -34 : 34), y: p.y + 34, r: 14, hp: c.hp, maxHp: c.hp, angle: 0, cool: 0, down: false, target: null, targetT: 0, walk: 0, regenT: 0, muzzle: 0, hurtT: 0, holdX: 0, holdY: 0 };
}
function makeDog(p) { return { kind: 'dog', name: DOG_INFO.name, color: DOG_INFO.color, x: p.x, y: p.y + 40, r: 11, hp: DOG_INFO.hp, maxHp: DOG_INFO.hp, angle: 0, cool: 0, down: false, target: null, targetT: 0, walk: 0, regenT: 0, hurtT: 0, holdX: 0, holdY: 0 }; }

function startLevel(idx) { G.mode = 'campaign'; G.level = idx; beginRun(LEVELS[idx], idx); }
function startSurvival() {
  const maps = Object.keys(THEMES), bossKeys = Object.keys(BOSSES), weathers = [null, null, 'rain', 'fog', 'storm'];
  const L = M({ map: maps[Math.random() * maps.length | 0], seed: (Math.random() * 1e6) | 0, title: 'Supervivencia', mix: { normal: 1 }, weather: weathers[Math.random() * weathers.length | 0], daynight: true, boss: bossKeys[0] });
  G.mode = 'survival'; beginRun(L, 0);
}
function beginRun(L, tier) {
  audioInit();
  G.L = L; G.tier = tier; loadLevelMap(L);
  const m = G.map, maxArmor = ARMORS[save.armorTier].max, maxHp = 100 + save.hpUp * 25 + skill('vida') * 10;
  G.p = {
    x: (m.sx + .5) * T, y: (m.sy + .5) * T, r: 16, hp: maxHp, maxHp, armor: maxArmor, maxArmor, stamina: 1, running: false,
    adrenT: 0, slowT: 0, acidT: 0, angle: 0, wi: bestOwned(), cool: 0, reloading: 0, muzzle: 0, walk: 0, hurtT: 0, emptyClick: false,
    meleeCD: 0, swingT: 0, ammo: WEAPONS.map((w, i) => ({ mag: wMag(i), reserve: w.reserve })),
  };
  Object.assign(G, {
    zombies: [], bullets: [], particles: [], pickups: [], enemyShots: [], puddles: [], turrets: [], mines: [], barricades: [], barrels: [], survivors: [], pendingBarrels: [],
    gen: null, heli: null, kills: 0, spawned: 0, spawnTimer: 2, score: 0, shots: 0, hits: 0, time: 0, coinsLevel: 0, rescued: 0, defT: L.defend || 0,
    boss: null, phase: G.mode === 'survival' ? 'wave' : 'mission', banner: null, toasts: [], hint: null, flash: 0, shake: 0, intro: 3.2, keys: 0, cine: null,
    dmgTaken: 0, bossNonPistol: false, lightning: 0, lightT: rand(6, 12), wave: 0, target: null, order: 'follow',
  });
  G.allies = save.team.map((cls, i) => makeAlly(cls, i, G.p)); if (save.dog) G.allies.push(makeDog(G.p));
  // objetos del mapa
  for (let i = 0; i < 3; i++) { G.pickups.push(makePickup('health', randomFloor(300, G.p))); G.pickups.push(makePickup('ammo', randomFloor(300, G.p))); }
  G.pickups.push(makePickup('armor', randomFloor(300, G.p))); G.pickups.push(makePickup('adren', randomFloor(400, G.p)));
  for (let i = 0; i < 9; i++) { const b = randomFloor(260, G.p); G.barrels.push({ x: b.x, y: b.y, r: 14, hp: 25 }); }
  m.vaults.forEach(v => { G.pickups.push(makePickup('chest', { x: v.cx, y: v.cy })); G.pickups.push(makePickup('key', randomFloor(500, G.p))); });
  if (L.mission === 'rescue') for (let i = 0; i < L.rescue; i++) { const s = randomFloor(600, G.p); G.survivors.push({ x: s.x, y: s.y, r: 14, t: Math.random() * 5, rescued: false }); }
  if (L.mission === 'defend') { let g = null; for (let k = 0; k < 40; k++) { const c = randomFloor(0); const d = Math.hypot(c.x - G.p.x, c.y - G.p.y); if (d > 120 && d < 320) { g = c; break; } } g = g || randomFloor(0); G.gen = { x: g.x, y: g.y, r: 24, hp: 700, maxHp: 700 }; }
  if (G.mode === 'survival') startWave(1); else for (let i = 0; i < 3; i++) spawnZombie(pickType(L.mix));
  G.rain = []; for (let i = 0; i < 140; i++) G.rain.push({ x: Math.random(), y: Math.random(), s: rand(.8, 1.2) });
  if (L.weather === 'rain' || L.weather === 'storm') Sfx.startRain(L.weather === 'storm' ? 1.3 : 1); else Sfx.stopRain();
  G.cam.x = G.p.x - VW / 2 / Z; G.cam.y = G.p.y - VH / 2 / Z; touch.joy = touch.fire = null;
  G.state = 'play'; cv.classList.add('playing'); hideScreen();
}
function makePickup(type, pos, extra) { return Object.assign({ type, x: pos.x, y: pos.y, t: Math.random() * 3, life: Infinity, value: 0 }, extra || {}); }
function pickType(mix) { const tot = Object.values(mix).reduce((a, b) => a + b, 0); let r = Math.random() * tot, acc = 0; for (const k in mix) { acc += mix[k]; if (r < acc) return k; } return 'normal'; }
function spawnZombie(type, pos, bossKey) {
  const def = bossKey ? Object.assign({ coins: 150, score: 500, cd: 1.0 }, BOSSES[bossKey]) : ZTYPES[type];
  pos = pos || randomFloor(Math.max(650, Math.min(VW, VH) / Z * 0.7), G.p);
  const tier = G.tier, d = DIFF[settings.diff].hp;
  const hp = (bossKey ? def.hp * (1 + tier * .1) * (G.L.final ? 1.3 : 1) : def.hp * (1 + tier * .06)) * d;
  const z = {
    type: bossKey ? 'boss' : type, bossKey, t: def, x: pos.x, y: pos.y, r: def.r, hp, maxHp: hp, speed: def.speed * (bossKey ? 1 : rand(.9, 1.1)),
    angle: 0, walk: Math.random() * 10, atk: 0, hit: 0, kx: 0, ky: 0, groan: rand(1, 6), burn: 0, rage: 0, fuse: 0, lastHit: 'bullet',
    state: null, stateT: 0, chargeCD: rand(2, 5), spitCD: rand(1.5, 3), sumCD: 6, screamCD: rand(3, 6), dashA: 0, dashHit: false, enraged: false,
    objTarget: !!G.gen && Math.random() < .4,
  };
  G.zombies.push(z); if (!bossKey) G.spawned++;
  return z;
}
function spawnGroup(type) {
  if (type !== 'dog') { spawnZombie(type); return 1; }
  const c = randomFloor(Math.max(650, Math.min(VW, VH) / Z * 0.7), G.p), n = 2 + (Math.random() * 2 | 0);
  for (let i = 0; i < n; i++) { const z = spawnZombie('dog', { x: c.x + rand(-20, 20), y: c.y + rand(-20, 20) }); collide(z); }
  return n;
}

/* =========================================================
   COLISIONES Y CAMINOS
   ========================================================= */
function solid(tx, ty) { return getT(G.map, tx, ty) !== 0; }
function collide(e) {
  const r = e.r, x0 = Math.floor((e.x - r) / T), x1 = Math.floor((e.x + r) / T), y0 = Math.floor((e.y - r) / T), y1 = Math.floor((e.y + r) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!solid(tx, ty)) continue;
    const cx = clamp(e.x, tx * T, tx * T + T), cy = clamp(e.y, ty * T, ty * T + T);
    const dx = e.x - cx, dy = e.y - cy, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    if (d2 > 0.0001) { const d = Math.sqrt(d2); e.x += dx / d * (r - d); e.y += dy / d * (r - d); }
    else {
      const l = e.x - tx * T, rt = tx * T + T - e.x, u = e.y - ty * T, dn = ty * T + T - e.y, mn = Math.min(l, rt, u, dn);
      if (mn === l) e.x = tx * T - r; else if (mn === rt) e.x = tx * T + T + r; else if (mn === u) e.y = ty * T - r; else e.y = ty * T + T + r;
    }
  }
}
function pushCircles(e) { // barriles, barricadas, torretas y generador también estorban
  const list = [G.barricades, G.barrels, G.turrets]; if (G.gen) list.push([G.gen]);
  for (const arr of list) for (const o of arr) {
    const dx = e.x - o.x, dy = e.y - o.y, d = Math.hypot(dx, dy), min = e.r + o.r;
    if (d < min && d > .01) { e.x += dx / d * (min - d); e.y += dy / d * (min - d); }
  }
}
function lineOfSight(x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 16);
  for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (solid(Math.floor(x / T), Math.floor(y / T))) return false; }
  return true;
}
function computeFlow() {
  const m = G.map, p = G.p, start = Math.floor(p.y / T) * m.w + Math.floor(p.x / T);
  if (start === G.flowFrom) return; G.flowFrom = start;
  const f = G.flow; f.fill(-1); if (m.t[start] !== 0) return;
  const q = new Int32Array(m.w * m.h); let h = 0, tl = 0; q[tl++] = start; f[start] = 0;
  while (h < tl) {
    const i = q[h++], x = i % m.w, y = (i / m.w) | 0, d = f[i] + 1;
    const nb = [x > 0 ? i - 1 : -1, x < m.w - 1 ? i + 1 : -1, y > 0 ? i - m.w : -1, y < m.h - 1 ? i + m.w : -1];
    for (const ni of nb) if (ni >= 0 && passable(m.t[ni]) && f[ni] < 0) { f[ni] = d; q[tl++] = ni; }
  }
}
function flowTarget(z) {
  const m = G.map, tx = Math.floor(z.x / T), ty = Math.floor(z.y / T), cur = G.flow[ty * m.w + tx];
  if (cur === undefined || cur < 0) return null;
  let best = cur, bx = -1, by = -1;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue; const nx = tx + dx, ny = ty + dy;
    if (!passable(getT(m, nx, ny))) continue;
    if (dx && dy && (getT(m, tx + dx, ty) !== 0 || getT(m, tx, ty + dy) !== 0)) continue;
    const v = G.flow[ny * m.w + nx]; if (v >= 0 && v < best) { best = v; bx = nx; by = ny; }
  }
  return bx < 0 ? null : { x: (bx + .5) * T, y: (by + .5) * T };
}
function lineOfSightCached(z, v) { z.losT = (z.losT || 0) - 1; if (z.losT <= 0 || z.losV !== v) { z.los = lineOfSight(z.x, z.y, v.x, v.y); z.losT = 8; z.losV = v; } return z.los; }
function findTarget(from, range) {
  let best = null, bd = range;
  for (const z of G.zombies) { const d = Math.hypot(z.x - from.x, z.y - from.y) - z.r; if (d < bd && lineOfSight(from.x, from.y, z.x, z.y)) { bd = d; best = z; } }
  return best;
}

/* ---------- tablas y puertas ---------- */
function damageTile(tx, ty, d) {
  const m = G.map, v = getT(m, tx, ty); if (v !== 4 && v !== 5) return;
  const i = ty * m.w + tx; m.thp[i] -= d; Sfx.wood();
  for (let k = 0; k < 3; k++) G.particles.push({ x: (tx + .5) * T + rand(-15, 15), y: (ty + .5) * T + rand(-15, 15), vx: rand(-120, 120), vy: rand(-120, 120), life: .4, max: .4, color: v === 5 ? '#8a6236' : '#777', size: 3 });
  if (m.thp[i] <= 0) breakTile(tx, ty);
}
function breakTile(tx, ty, opened) {
  const m = G.map, i = ty * m.w + tx; m.t[i] = 0;
  const g = G.mapCanvas.getContext('2d'); g.fillStyle = G.theme.floor; g.fillRect(tx * T, ty * T, T, T);
  if (!opened) { g.fillStyle = 'rgba(90,60,30,.6)'; for (let k = 0; k < 6; k++) g.fillRect(tx * T + rand(4, 40), ty * T + rand(4, 40), rand(6, 14), 3); }
  G.mg.fillStyle = 'rgba(30,40,30,1)'; G.mg.fillRect(tx * 3, ty * 3, 3, 3);
  G.flowFrom = -1;
  if (!opened) for (let k = 0; k < 12; k++) G.particles.push({ x: (tx + .5) * T, y: (ty + .5) * T, vx: rand(-200, 200), vy: rand(-200, 200), life: .6, max: .6, color: '#8a6236', size: rand(2, 5) });
}

/* =========================================================
   ACCIONES DEL JUGADOR
   ========================================================= */
function screenToWorld() { return { x: mouse.x / Z + G.cam.x, y: mouse.y / Z + G.cam.y }; }
function aimPoint(dist) { // a dónde apunta (para granadas y gadgets)
  const p = G.p;
  if (G.target) return { x: G.target.x, y: G.target.y };
  if (!TOUCH) return screenToWorld();
  return { x: p.x + Math.cos(p.angle) * dist, y: p.y + Math.sin(p.angle) * dist };
}
function spatial(x, y, range) { const dx = x - G.p.x, d = Math.hypot(dx, y - G.p.y); return { pan: clamp(dx / 700, -1, 1), vol: clamp(1 - d / (range || 1100), 0, 1) }; }
function blood(x, y, n, spd, col) { for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = rand(30, spd); G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.3, .7), max: .7, color: col || '#8a0e0e', size: rand(2, 4), stain: !col }); } }
function stain(x, y, r, col) { const g = G.dg; g.fillStyle = col || 'rgba(110,8,8,.55)'; for (let i = 0; i < 6; i++) circle(g, x + rand(-r, r) * .6, y + rand(-r, r) * .6, rand(r * .3, r * .7)); }
function toast(title, sub, col) { G.toasts.push({ title, sub, col: col || '#fff', t: 3.5 }); if (G.toasts.length > 4) G.toasts.shift(); }

function tryShoot() {
  const p = G.p, wi = p.wi, w = WEAPONS[wi], a = p.ammo[wi];
  if (p.reloading > 0 || p.cool > 0) return;
  if (a.mag <= 0) { if (!p.emptyClick) { Sfx.empty(); p.emptyClick = true; } startReload(); p.cool = .25; return; }
  if (G.phase === 'boss' && wi !== 0) G.bossNonPistol = true;
  a.mag--; p.cool = w.rate; p.muzzle = w.flame ? 0 : .06; G.shake = Math.max(G.shake, w.shake); if (!w.flame) G.lightFlash = .07;
  if (w.flame) Sfx.flame(); else if (w.grenade || w.bolt) Sfx.launch(); else if (w.laser) Sfx.laser(); else Sfx.shoot(w.id === 'sniper' ? 'shotgun' : w.id === 'minigun' ? 'rifle' : w.id);
  const ca = Math.cos(p.angle), sa = Math.sin(p.angle), tipX = p.x + ca * (p.r + w.len), tipY = p.y + sa * (p.r + w.len);
  for (let i = 0; i < w.pellets; i++) {
    const ang = p.angle + (Math.random() - .5) * w.spread * 2, sp = w.speed * rand(.92, 1.08);
    const b = { x: tipX, y: tipY, px: tipX, py: tipY, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, dmg: wDmg(wi), life: .6, knock: w.knock, kind: 'bullet', pierce: w.pierce || 0, hit: null, age: 0 };
    if (w.flame) { b.kind = 'flame'; b.life = rand(.32, .42); b.hit = new Set(); }
    if (w.laser) { b.kind = 'laser'; b.life = .25; }
    if (w.bolt) b.kind = 'bolt';
    if (w.grenade) { b.kind = 'grenade'; const t = aimPoint(420); b.life = clamp(Math.hypot(t.x - p.x, t.y - p.y) / sp, .2, 1.1); }
    if (b.pierce) b.hit = new Set();
    G.bullets.push(b); G.shots++;
  }
  if (!w.flame && !w.grenade && !w.laser && !w.bolt) { const sa2 = p.angle + Math.PI / 2; G.particles.push({ x: p.x, y: p.y, vx: Math.cos(sa2) * rand(80, 150), vy: Math.sin(sa2) * rand(80, 150), life: .8, max: .8, color: '#d9ab45', size: 3, shell: true }); }
  if (a.mag === 0) startReload();
}
function startReload() {
  const p = G.p, a = p.ammo[p.wi];
  if (p.reloading > 0 || a.mag >= wMag(p.wi) || a.reserve <= 0) return;
  p.reloading = wReload(p.wi); p.reloadMax = p.reloading; Sfx.reload(p.reloading);
}
function switchWeapon(i) { const p = G.p; if (!p || i === p.wi || i < 0 || i >= WEAPONS.length || !ownedWeapon(i)) return; p.wi = i; p.reloading = 0; p.cool = .25; Sfx.switchW(); }
function cycleWeapon(dir) { const n = WEAPONS.length; let i = G.p.wi; for (let k = 0; k < n; k++) { i = (i + (dir > 0 ? 1 : n - 1)) % n; if (ownedWeapon(i)) break; } switchWeapon(i); }
function toggleRun() { const p = G.p; if (!p) return; if (!p.running && p.stamina < .1 && p.adrenT <= 0) return; p.running = !p.running; }
function useMedkit() { const p = G.p; if (!p || save.medkit <= 0 || p.hp >= p.maxHp) return; save.medkit--; p.hp = Math.min(p.maxHp, p.hp + 50); Sfx.pickup(); blood(p.x, p.y, 10, 120, '#ff7070'); }
function useAdren() { const p = G.p; if (!p || save.adren <= 0 || p.adrenT > 0) return; save.adren--; p.adrenT = 10; p.stamina = 1; p.hp = Math.min(p.maxHp, p.hp + 10); Sfx.adren(); }
function throwGrenade() {
  const p = G.p; if (!p || save.grenades <= 0) return; save.grenades--;
  const t = aimPoint(320), ang = Math.atan2(t.y - p.y, t.x - p.x), dist = clamp(Math.hypot(t.x - p.x, t.y - p.y), 80, 420);
  G.bullets.push({ x: p.x, y: p.y, px: p.x, py: p.y, vx: Math.cos(ang) * dist * 1.6, vy: Math.sin(ang) * dist * 1.6, dmg: 180, life: 1.2, knock: 0, kind: 'hand', pierce: 0, hit: null, age: 0 });
  Sfx.swish();
}
function melee() {
  const p = G.p; if (!p || p.meleeCD > 0) return; p.meleeCD = .45; p.swingT = .2; Sfx.swish();
  const dmg = 55 * DIFF[1].hp; let hitAny = false;
  for (const z of G.zombies) {
    const dx = z.x - p.x, dy = z.y - p.y, d = Math.hypot(dx, dy); if (d > 72 + z.r) continue;
    if (Math.abs(angDiff(Math.atan2(dy, dx), p.angle)) > 1.0) continue;
    hurtZombie(z, dmg, 'melee'); hitAny = true; blood(z.x, z.y, 8, 160);
    if (z.type !== 'boss') { z.kx += dx / d * 320; z.ky += dy / d * 320; }
  }
  if (hitAny) G.shake = Math.max(G.shake, 4);
}
function placeGadget(kind) {
  const p = G.p; if (!p || save[kind] <= 0) return;
  const x = p.x + Math.cos(p.angle) * 44, y = p.y + Math.sin(p.angle) * 44; if (solid(Math.floor(x / T), Math.floor(y / T))) return;
  save[kind]--; if (Sfx.ok()) Sfx.click(Sfx.ctx.currentTime, 1500, .6);
  if (kind === 'turrets') G.turrets.push({ x, y, r: 16, hp: 220, maxHp: 220, life: 60, cool: 0, angle: p.angle, target: null, tt: 0, isTurret: true });
  else if (kind === 'mines') G.mines.push({ x, y, arm: .6 });
  else G.barricades.push({ x, y, r: 24, hp: 320, maxHp: 320 });
  toast(GADGET_NAME[kind] + ' colocada', 'Te quedan ' + save[kind], '#9bd14b');
}
function cycleGadget() { G.gadget = (G.gadget + 1) % GADGETS.length; }
function cycleOrder() {
  const o = ['follow', 'hold', 'attack'], i = (o.indexOf(G.order) + 1) % 3; G.order = o[i];
  for (const a of G.allies) { a.holdX = a.x; a.holdY = a.y; }
  toast('Orden: ' + { follow: 'Síganme', hold: 'Quédense aquí', attack: '¡Ataquen!' }[G.order], '', '#7fd0ff');
}

/* ---------- daño ---------- */
function damagePlayer(dmg, from, quiet) {
  const p = G.p; if (G.state !== 'play' || G.cine) return;
  dmg *= DIFF[settings.diff].dmg; if (p.adrenT > 0) dmg *= .7;
  if (p.armor > 0) { const ab = Math.min(p.armor, dmg * .7); p.armor -= ab; dmg -= ab; dmg *= 1 - (ARMORS[save.armorTier].reduce || 0); Sfx.armor(); }
  p.hp -= dmg; G.dmgTaken += dmg; p.hurtT = .3; G.flash = Math.max(G.flash, quiet ? .25 : .55);
  if (TOUCH && settings.vibrate && navigator.vibrate) try { navigator.vibrate(quiet ? 25 : 70); } catch (e) { }
  if (!quiet) {
    G.shake = Math.max(G.shake, 9); Sfx.hurt(); blood(p.x, p.y, 10, 160); stain(p.x, p.y, 14);
    if (from) { const a = Math.atan2(p.y - from.y, p.x - from.x); p.x += Math.cos(a) * 10; p.y += Math.sin(a) * 10; collide(p); }
  }
  if (p.hp <= 0) { p.hp = 0; gameOver('¡TE ATRAPARON!'); }
}
function damageAlly(a, dmg) {
  if (a.down) return; a.hp -= dmg; a.hurtT = .25; a.regenT = 4; blood(a.x, a.y, 5, 120);
  if (a.hp <= 0) { a.down = true; a.hp = 0; stain(a.x, a.y, 16); toast('¡' + a.name + ' cayó!', 'Volverá en el siguiente nivel', '#ff8080'); Sfx.hurt(); }
}
function hitVictim(v, dmg, from) {
  if (v === G.p) damagePlayer(dmg, from);
  else if (v === G.gen) { G.gen.hp -= dmg; blood(v.x, v.y, 4, 100, '#ffd34d'); if (G.gen.hp <= 0) gameOver('¡DESTRUYERON EL GENERADOR!'); }
  else if (v.isTurret) { v.hp -= dmg; }
  else damageAlly(v, dmg);
}
function hurtZombie(z, dmg, kind) {
  if ((z.t.armored) && (kind === 'bullet')) dmg *= z.type === 'boss' ? .6 : .4; // los cascos aguantan balas normales
  z.hp -= dmg; z.hit = .08; z.lastHit = kind;
  if (z.type === 'boss' && !z.enraged && z.hp > 0 && z.hp < z.maxHp * .5) enrage(z);
}
function enrage(z) {
  z.enraged = true; z.speed *= 1.35; z.chargeCD *= .5; z.spitCD *= .5; z.sumCD *= .5;
  G.banner = { title: '¡' + z.t.name.toUpperCase() + ' ESTÁ FURIOSO!', sub: 'Fase 2', t: 2.2 }; Sfx.bossIntro(); G.shake = 14;
}

/* ---------- ataques especiales de zombis ---------- */
function spit(z, v, n) {
  const s = spatial(z.x, z.y, 1300); Sfx.vomit(s.pan, s.vol);
  const lead = .35, tx = v.x + (v === G.p ? (G.p.lastVx || 0) * lead : 0), ty = v.y + (v === G.p ? (G.p.lastVy || 0) * lead : 0);
  const base = Math.atan2(ty - z.y, tx - z.x), dist = Math.min(520, Math.hypot(tx - z.x, ty - z.y));
  for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * .28, sp = 330; G.enemyShots.push({ x: z.x + Math.cos(a) * z.r, y: z.y + Math.sin(a) * z.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: dist / sp + .05, dmg: z.type === 'boss' ? 14 : 10, t: 0 }); }
}
function scream(z) {
  const s = spatial(z.x, z.y, 1500); Sfx.shriek(s.pan, Math.max(.3, s.vol));
  G.particles.push({ x: z.x, y: z.y, vx: 0, vy: 0, life: .6, max: .6, color: 'rgba(200,160,255,.5)', size: 10, ring: true });
  for (const o of G.zombies) if (Math.hypot(o.x - z.x, o.y - z.y) < 350) o.rage = 4;
  if (G.zombies.length < 34) for (let k = 0; k < 3; k++) { const n = spawnZombie('normal', { x: z.x + rand(-60, 60), y: z.y + rand(-60, 60) }); G.spawned--; collide(n); }
}
function addPuddle(x, y, r) { G.puddles.push({ x, y, r: r || 42, life: 5, max: 5 }); }
function explode(x, y, dmg, radius, hurtsPlayer) {
  const s = spatial(x, y, 1600); Sfx.explode(Math.max(.4, s.vol)); G.shake = Math.max(G.shake, 14 * Math.max(.3, s.vol)); G.lightFlash = .15;
  for (let i = 0; i < 40; i++) { const a = Math.random() * TAU, sp = rand(60, 420); G.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(.3, .7), max: .7, color: ['#ffd27a', '#ff8a2a', '#ff4a1a', '#555'][i % 4], size: rand(3, 7), glow: true }); }
  const g = G.dg; g.fillStyle = 'rgba(20,15,10,.6)'; for (let i = 0; i < 8; i++) circle(g, x + rand(-30, 30), y + rand(-30, 30), rand(15, 35));
  let killed = 0;
  for (const z of G.zombies) {
    const d = Math.hypot(z.x - x, z.y - y); if (d > radius + z.r) continue;
    const k = 1 - Math.min(1, d / radius) * .6, was = z.hp > 0; hurtZombie(z, dmg * k, 'explosion'); G.hits++;
    if (was && z.hp <= 0) killed++;
    if (z.type !== 'boss') { const a = Math.atan2(z.y - y, z.x - x); z.kx += Math.cos(a) * 420 * k; z.ky += Math.sin(a) * 420 * k; }
  }
  if (killed >= 5) unlockAch('boom');
  for (const b of G.barrels) if (b.hp > 0 && Math.hypot(b.x - x, b.y - y) < radius + b.r) { b.hp = 0; G.pendingBarrels.push({ b, t: .12 }); }
  for (const t of G.turrets) if (Math.hypot(t.x - x, t.y - y) < radius) t.hp -= dmg * .3;
  for (const t of G.barricades) if (Math.hypot(t.x - x, t.y - y) < radius) t.hp -= dmg * .5;
  const r2 = Math.ceil(radius / T); for (let ty = Math.floor(y / T) - r2; ty <= Math.floor(y / T) + r2; ty++) for (let tx = Math.floor(x / T) - r2; tx <= Math.floor(x / T) + r2; tx++) if (Math.hypot((tx + .5) * T - x, (ty + .5) * T - y) < radius) damageTile(tx, ty, dmg);
  if (hurtsPlayer) { const p = G.p, d = Math.hypot(p.x - x, p.y - y); if (d < radius + p.r) damagePlayer(30 * (1 - d / (radius + p.r) * .6), { x, y }); for (const a of G.allies) if (!a.down && Math.hypot(a.x - x, a.y - y) < radius) damageAlly(a, 30); }
}

/* ---------- progreso: monedas, experiencia y logros ---------- */
function addCoins(v) { v = Math.round(v * DIFF[settings.diff].coins); save.coins += v; G.coinsLevel += v; save.stats.coinsTotal += v; }
function gainXP(v) {
  save.xp += v;
  while (save.xp >= xpNeed(save.xpLevel)) { save.xp -= xpNeed(save.xpLevel); save.xpLevel++; save.skillPts++; toast('⬆ ¡Nivel ' + save.xpLevel + '!', '+1 punto de habilidad (menú → Personaje)', '#7fd0ff'); Sfx.levelUp(); }
}
function unlockAch(id) {
  if (save.ach[id]) return; const a = ACHIEVEMENTS.find(x => x.id === id); if (!a) return;
  save.ach[id] = true; save.coins += 50; save.stats.coinsTotal += 50;
  if (G.state === 'play') toast('🏆 ' + a.name, a.desc + ' (+50 🪙)', '#ffd34d'); Sfx.achievement(); persist();
}
function checkAch() { for (const a of ACHIEVEMENTS) if (!save.ach[a.id] && a.test(save.stats)) unlockAch(a.id); }
function addRecord(score, label) {
  if (score <= 0) return; save.records.push({ score, label, date: new Date().toLocaleDateString() });
  save.records.sort((a, b) => b.score - a.score); save.records = save.records.slice(0, 10);
}

function killZombie(z) {
  const s = spatial(z.x, z.y); Sfx.zdie(s.pan, s.vol);
  blood(z.x, z.y, 18, 220); stain(z.x, z.y, z.r * 1.6);
  const g = G.dg; g.save(); g.translate(z.x, z.y); g.rotate(z.angle); g.fillStyle = z.t.dog ? 'rgba(60,45,30,.75)' : 'rgba(40,55,25,.75)'; g.beginPath(); g.ellipse(0, 0, z.r * 1.2, z.r * .8, 0, 0, TAU); g.fill(); g.restore();
  G.score += z.t.score; gainXP(z.t.score);
  const n = z.type === 'boss' ? 15 : 1, val = Math.round(z.t.coins / n);
  for (let i = 0; i < n; i++) G.pickups.push(makePickup('coin', { x: z.x + rand(-z.r, z.r), y: z.y + rand(-z.r, z.r) }, { value: val, life: 30 }));
  if (z.t.bomber) explode(z.x, z.y, 120, 95, true);
  if (z.type === 'spitter') addPuddle(z.x, z.y, 34);
  if (z.type === 'boss') {
    save.stats.bosses++; if (z.bossKey === 'rey') save.stats.king++;
    if (!G.bossNonPistol) unlockAch('pistol');
    const legends = [7, 8].filter(i => !ownedWeapon(i));
    if (legends.length && (z.bossKey === 'rey' || Math.random() < .35)) G.pickups.push(makePickup('legend', { x: z.x, y: z.y }, { value: legends[Math.random() * legends.length | 0] }));
    if (G.boss === z) G.boss = null;
    G.shake = 25; for (let i = 0; i < 4; i++) stain(z.x + rand(-40, 40), z.y + rand(-40, 40), 40);
    if (G.mode === 'campaign') { if (G.L.escape) startEscape(); else setTimeout(() => { if (G.state === 'play') levelComplete(); }, 1200); }
    checkAch(); return;
  }
  G.kills++; save.stats.kills++; if (z.t.dog) save.stats.dogs++; if (z.lastHit === 'melee') save.stats.melee++;
  const r = Math.random() / (1 + .25 * skill('suerte'));
  if (r < .06) G.pickups.push(makePickup('health', z, { life: 20 }));
  else if (r < .16) G.pickups.push(makePickup('ammo', z, { life: 20 }));
  else if (r < .2) G.pickups.push(makePickup('armor', z, { life: 20 }));
  else if (r < .23) G.pickups.push(makePickup('adren', z, { life: 20 }));
  else if (r < .25) G.pickups.push(makePickup('grenade', z, { life: 20 }));
}

/* ---------- misiones, jefes, escape y oleadas ---------- */
function startBossPhase(key, cinematic = true) {
  const p = G.p; if (G.mode === 'campaign') G.phase = 'boss';
  const pos = farthestFloor(p);
  G.boss = spawnZombie(null, pos, key);
  if (cinematic) G.cine = { t: 2.8, x: pos.x, y: pos.y, name: BOSSES[key].name };
  G.banner = null; Sfx.bossIntro(); G.shake = 10;
}
function startEscape() {
  G.phase = 'escape'; const h = farthestFloor(G.p); G.heli = { x: h.x, y: h.y, t: 0 };
  G.banner = { title: '¡CORRE AL HELICÓPTERO!', sub: 'Sigue la flecha amarilla', t: 3 };
}
function startWave(n) {
  const L = G.L; G.wave = n; G.phase = 'wave'; G.waveLeft = 6 + n * 4;
  L.maxAlive = Math.min(30, 8 + Math.floor(n * 1.5)); L.rate = Math.max(.3, 1.3 - n * .06); G.tier = Math.min(14, n * .6);
  const mix = { normal: 1 }; if (n >= 2) mix.runner = .5; if (n >= 3) mix.dog = .35; if (n >= 4) mix.bomber = .25; if (n >= 5) mix.spitter = .3; if (n >= 6) mix.tank = .2; if (n >= 7) mix.armored = .3; if (n >= 8) mix.screamer = .25;
  L.mix = mix; save.stats.bestWave = Math.max(save.stats.bestWave, n);
  G.banner = { title: 'OLEADA ' + n, sub: n % 5 === 0 ? '¡Viene un jefe!' : (n === 1 ? 'Sobrevive todo lo que puedas' : 'Prepárate'), t: 2.5 };
  if (n % 5 === 0) { const bk = Object.keys(BOSSES); startBossPhase(bk[(n / 5 - 1) % bk.length], n === 5); }
}

/* =========================================================
   ACTUALIZACIÓN
   ========================================================= */
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }
function update(dt) {
  const p = G.p, L = G.L;
  G.time += dt; G.intro = Math.max(0, G.intro - dt); if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  for (const t of G.toasts) t.t -= dt; G.toasts = G.toasts.filter(t => t.t > 0); if (G.hint) { G.hint.t -= dt; if (G.hint.t <= 0) G.hint = null; }
  G.achT -= dt; if (G.achT <= 0) { G.achT = 1; checkAch(); }
  // música: más intensa con el jefe o muchos zombis cerca
  let near = 0; for (const z of G.zombies) if (Math.hypot(z.x - p.x, z.y - p.y) < 450) near++;
  Music.setIntensity(G.boss || G.phase === 'escape' ? 1 : near >= 8 ? .75 : near >= 3 ? .45 : .15);
  // cinemática del jefe: la cámara va hacia él y el juego espera
  if (G.cine) {
    G.cine.t -= dt; const c = G.cine, vw = VW / Z, vh = VH / Z;
    const tx = (c.t > .5 ? c.x : p.x) - vw / 2, ty = (c.t > .5 ? c.y : p.y) - vh / 2;
    G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 4); G.cam.y += (ty - G.cam.y) * Math.min(1, dt * 4);
    if (c.t <= 0) G.cine = null; return;
  }
  updateWeather(dt);
  updatePlayer(dt);
  computeFlow();
  updateSpawning(dt);
  updateMission(dt);
  if (G.state !== 'play') return;
  updateZombies(dt); if (G.state !== 'play') return;
  updateAllies(dt);
  updateGadgets(dt);
  updateBullets(dt);
  for (let i = G.zombies.length - 1; i >= 0; i--) if (G.zombies[i].hp <= 0) { const z = G.zombies[i]; G.zombies.splice(i, 1); if (G.target === z) G.target = null; killZombie(z); if (G.state !== 'play') return; }
  updateEnemyShots(dt); if (G.state !== 'play') return;
  for (let i = G.pendingBarrels.length - 1; i >= 0; i--) { const pb = G.pendingBarrels[i]; pb.t -= dt; if (pb.t <= 0) { G.pendingBarrels.splice(i, 1); const k = G.barrels.indexOf(pb.b); if (k >= 0) { G.barrels.splice(k, 1); explode(pb.b.x, pb.b.y, 150, 110, true); if (G.state !== 'play') return; } } }
  // partículas
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const q = G.particles[i]; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.pow(.02, dt); q.vy *= Math.pow(.02, dt); q.life -= dt;
    if (q.life <= 0) {
      if (q.stain) { G.dg.fillStyle = 'rgba(110,8,8,.5)'; circle(G.dg, q.x, q.y, q.size); }
      if (q.shell) { G.dg.fillStyle = 'rgba(190,150,60,.7)'; G.dg.fillRect(q.x, q.y, 3, 2); }
      G.particles.splice(i, 1);
    }
  }
  updatePickups(dt); if (G.state !== 'play') return;
  // charcos de ácido
  for (let i = G.puddles.length - 1; i >= 0; i--) {
    const pu = G.puddles[i]; pu.life -= dt; if (pu.life <= 0) { G.puddles.splice(i, 1); continue; }
    if (Math.hypot(p.x - pu.x, p.y - pu.y) < pu.r + p.r * .5) { p.acidT += dt; p.slowT = Math.max(p.slowT, .3); if (p.acidT >= .5) { p.acidT = 0; damagePlayer(6, null, true); if (G.state !== 'play') return; } }
    for (const a of G.allies) if (!a.down && Math.hypot(a.x - pu.x, a.y - pu.y) < pu.r) damageAlly(a, 10 * dt);
  }
  G.shake = Math.max(0, G.shake - dt * 30); G.flash = Math.max(0, G.flash - dt); G.lightFlash -= dt;
  updateCamera(dt);
}
function updatePlayer(dt) {
  const p = G.p;
  let dx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let dy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  if (touch.joy) { const R = joyRadius(), jx = (touch.joy.x - touch.joy.ox) / R, jy = (touch.joy.y - touch.joy.oy) / R; if (Math.hypot(jx, jy) > .15) { dx = jx; dy = jy; } }
  let mv = Math.hypot(dx, dy); if (mv > 1) { dx /= mv; dy /= mv; mv = 1; }
  const adren = p.adrenT > 0; if (adren) p.adrenT -= dt;
  if (p.running && mv > .1 && !adren) p.stamina -= .28 * (1 - .1 * skill('resistencia')) * dt; else if (!p.running || mv <= .1) p.stamina = Math.min(1, p.stamina + .2 * dt);
  if (adren) p.stamina = 1;
  if (p.stamina <= 0) { p.stamina = 0; p.running = false; }
  p.slowT -= dt;
  const spd = 200 * (1 + .05 * skill('velocidad')) * (p.running ? 1.6 : 1) * (adren ? 1.25 : 1) * (p.slowT > 0 ? .55 : 1);
  const ox0 = p.x, oy0 = p.y;
  p.x += dx * spd * dt; p.y += dy * spd * dt; collide(p); pushCircles(p);
  p.lastVx = (p.x - ox0) / dt; p.lastVy = (p.y - oy0) / dt;
  if (mv) p.walk += dt * (p.running ? 16 : 10);
  // puertas con llave
  const ptx = Math.floor(p.x / T), pty = Math.floor(p.y / T);
  for (let ty = pty - 1; ty <= pty + 1; ty++) for (let tx = ptx - 1; tx <= ptx + 1; tx++) {
    if (getT(G.map, tx, ty) !== 4) continue;
    const cx = clamp(p.x, tx * T, tx * T + T), cy = clamp(p.y, ty * T, ty * T + T);
    if (Math.hypot(p.x - cx, p.y - cy) < p.r + 6) {
      if (G.keys > 0) { G.keys--; breakTile(tx, ty, true); Sfx.unlock(); toast('🔓 Puerta abierta', 'Busca el cofre adentro', '#ffd34d'); }
      else if (!G.hint) G.hint = { text: '🔒 Necesitas una llave 🔑 para abrir esta puerta', t: 1.5 };
    }
  }
  // apuntar
  G.targetT -= dt;
  if (G.targetT <= 0 || (G.target && G.target.hp <= 0)) { G.targetT = .1; G.target = settings.autoAim ? findTarget(p, Math.min(700, Math.max(VW, VH) / Z * .6)) : null; }
  const fireAim = touchAimAngle();
  let desired;
  if (fireAim !== null) desired = fireAim;
  else if (G.target) desired = Math.atan2(G.target.y - p.y, G.target.x - p.x);
  else if (TOUCH) desired = mv ? Math.atan2(dy, dx) : p.angle;
  else { const mw = screenToWorld(); desired = Math.atan2(mw.y - p.y, mw.x - p.x); }
  if (TOUCH || G.target) p.angle += angDiff(desired, p.angle) * Math.min(1, dt * 20); else p.angle = desired;
  p.cool -= dt; p.muzzle -= dt; p.hurtT -= dt; p.meleeCD -= dt; p.swingT -= dt;
  if (p.reloading > 0) {
    p.reloading -= dt;
    if (p.reloading <= 0) { const a = p.ammo[p.wi], take = Math.min(wMag(p.wi) - a.mag, a.reserve); a.mag += take; a.reserve -= take; p.reloading = 0; }
  }
  if (mouse.down || touch.fire) tryShoot();
  if (p.hp < p.maxHp * .3) { G.heartT -= dt; if (G.heartT <= 0) { Sfx.heart(); G.heartT = .6 + p.hp / 60; } }
}
function updateSpawning(dt) {
  const L = G.L; G.spawnTimer -= dt;
  let cap = L.maxAlive, rate = L.rate, can = false;
  if (G.mode === 'survival') can = G.phase === 'wave' && G.waveLeft > 0;
  else if (G.phase === 'mission') can = L.mission === 'kill' ? G.spawned < L.goal : true;
  else if (G.phase === 'boss') { can = true; cap = Math.ceil(cap * .5); rate *= 1.6; }
  else if (G.phase === 'escape') { can = true; rate *= .6; }
  if (L.daynight && G.time > 100) rate *= .75; // de noche salen más
  if (can && G.spawnTimer <= 0 && G.zombies.length < cap) { const n = spawnGroup(pickType(L.mix)); if (G.mode === 'survival') G.waveLeft -= n; G.spawnTimer = rate * rand(.6, 1.4); }
}
function updateMission(dt) {
  const L = G.L, p = G.p;
  if (G.mode === 'survival') {
    if (G.phase === 'wave' && G.waveLeft <= 0 && G.zombies.length === 0) {
      G.phase = 'break'; G.breakT = 7; const bonus = 20 + G.wave * 5; addCoins(bonus);
      G.banner = { title: '¡OLEADA ' + G.wave + ' SUPERADA!', sub: '+' + bonus + ' monedas', t: 2.5 };
    } else if (G.phase === 'break') { G.breakT -= dt; if (G.breakT <= 0) startWave(G.wave + 1); }
    return;
  }
  if (G.phase === 'mission') {
    if (L.mission === 'kill' && G.kills >= L.goal) startBossPhase(L.boss);
    if (L.mission === 'rescue') {
      for (const s of G.survivors) if (!s.rescued && Math.hypot(s.x - p.x, s.y - p.y) < 38) {
        s.rescued = true; G.rescued++; save.stats.rescued++; addCoins(25); Sfx.rescue();
        toast('🙋 ¡Sobreviviente rescatado!', G.rescued + ' de ' + L.rescue + ' (+25 🪙)', '#9bd14b');
        for (let k = 0; k < 12; k++) G.particles.push({ x: s.x, y: s.y, vx: rand(-90, 90), vy: rand(-140, -20), life: .8, max: .8, color: '#9bd14b', size: 3 });
      }
      if (G.rescued >= L.rescue) startBossPhase(L.boss);
    }
    if (L.mission === 'defend') { G.defT -= dt; if (G.defT <= 0) { G.defT = 0; addCoins(50); toast('⚡ ¡Generador a salvo!', '+50 🪙', '#ffd34d'); for (const z of G.zombies) z.objTarget = false; startBossPhase(L.boss); } }
  }
  if (G.phase === 'escape' && G.heli) { G.heli.t += dt; if (Math.hypot(G.heli.x - p.x, G.heli.y - p.y) < 70) levelComplete(); }
  for (const s of G.survivors) s.t += dt;
}
function updateWeather(dt) {
  const w = G.L.weather;
  if (w === 'storm') { G.lightT -= dt; if (G.lightT <= 0) { G.lightT = rand(6, 14); G.lightning = .3; Sfx.thunder(); } }
  G.lightning = Math.max(0, G.lightning - dt);
}
function updateZombies(dt) {
  const p = G.p, zs = G.zombies;
  for (const z of zs) {
    // ¿a quién ataca? jugador, compañero, torreta o generador
    let v = p, dist = Math.hypot(p.x - z.x, p.y - z.y);
    for (const a of G.allies) if (!a.down) { const d = Math.hypot(a.x - z.x, a.y - z.y); if (d < dist && d < T * 3.5) { dist = d; v = a; } }
    for (const t of G.turrets) { const d = Math.hypot(t.x - z.x, t.y - z.y); if (d < dist && d < T * 3.5) { dist = d; v = t; } }
    if (z.objTarget && G.gen && G.gen.hp > 0 && G.phase === 'mission' && Math.hypot(p.x - z.x, p.y - z.y) > 130) { const d = Math.hypot(G.gen.x - z.x, G.gen.y - z.y); if (d < 260 || lineOfSightCached(z, G.gen)) { v = G.gen; dist = d; } }
    if (z.burn > 0) { z.burn -= dt; z.hp -= 12 * dt; z.lastHit = 'fire'; if (Math.random() < dt * 12) G.particles.push({ x: z.x + rand(-z.r, z.r), y: z.y + rand(-z.r, z.r), vx: rand(-20, 20), vy: rand(-60, -20), life: .4, max: .4, color: '#ff8a2a', size: rand(3, 5), glow: true }); }
    z.hit -= dt; z.atk -= dt; z.rage -= dt; z.walk += dt * z.speed * .08;
    const ab = z.t.abil || [];
    // zombi explosivo: se infla y explota cerca
    if (z.t.bomber) {
      if (z.fuse > 0) { z.fuse -= dt; if (Math.random() < dt * 8) { const s = spatial(z.x, z.y); Sfx.beep(s.pan, s.vol * .6); } if (z.fuse <= 0) { z.hp = 0; continue; } }
      else if (dist < z.r + v.r + 30) { z.fuse = .7; }
    }
    if (z.state === 'wind') {
      z.stateT -= dt; z.angle += angDiff(Math.atan2(v.y - z.y, v.x - z.x), z.angle) * Math.min(1, dt * 6);
      if (z.stateT <= 0) { z.state = 'dash'; z.stateT = .75; z.dashA = Math.atan2(v.y - z.y, v.x - z.x); z.dashHit = false; }
    } else if (z.state === 'dash') {
      const sp = z.type === 'boss' ? 400 : 440, ex = Math.cos(z.dashA) * sp * dt, ey = Math.sin(z.dashA) * sp * dt, bx = z.x, by = z.y;
      z.x += ex; z.y += ey; collide(z); pushCircles(z); z.stateT -= dt; z.angle = z.dashA;
      if (Math.random() < .5) G.particles.push({ x: z.x, y: z.y, vx: -ex * 8, vy: -ey * 8, life: .3, max: .3, color: 'rgba(120,100,80,.6)', size: rand(4, 8) });
      if (!z.dashHit && Math.hypot(v.x - z.x, v.y - z.y) < z.r + v.r + 6) {
        z.dashHit = true; hitVictim(v, z.t.dmg * 1.4, z); if (G.state !== 'play') return;
        if (v === p) { p.x += Math.cos(z.dashA) * 40; p.y += Math.sin(z.dashA) * 40; collide(p); G.shake = 16; }
      }
      if (Math.hypot(z.x - bx, z.y - by) < sp * dt * .35) { // chocó: rompe tablas y puertas al embestir
        const fx = Math.floor((z.x + Math.cos(z.dashA) * (z.r + 8)) / T), fy = Math.floor((z.y + Math.sin(z.dashA) * (z.r + 8)) / T);
        const fv = getT(G.map, fx, fy); if (fv === 4 || fv === 5) breakTile(fx, fy);
        z.state = 'stun'; z.stateT = .8; if (spatial(z.x, z.y).vol > .4) G.shake = Math.max(G.shake, 6);
      } else if (z.stateT <= 0) z.state = null;
      continue;
    } else if (z.state === 'stun') { z.stateT -= dt; if (z.stateT <= 0) z.state = null; }
    else {
      let tx = v.x, ty = v.y;
      if (v === p && dist > T * 2.2) { const ft = flowTarget(z); if (ft) { tx = ft.x; ty = ft.y; } }
      if (v === G.gen && !lineOfSightCached(z, G.gen)) { const ft = flowTarget(z); if (ft) { tx = ft.x; ty = ft.y; } }
      let vx = tx - z.x, vy = ty - z.y; const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
      let speed = z.speed * (z.rage > 0 ? 1.4 : 1) * (z.fuse > 0 ? .3 : 1);
      if (z.t.ranged && dist < 330 && lineOfSightCached(z, v)) {
        if (dist < 210) { vx = -vx; vy = -vy; speed *= .8; } else { const s = Math.sin(G.time + z.walk) > 0 ? 1 : -1; const ox = -vy * s, oy = vx * s; vx = ox * .5; vy = oy * .5; }
      }
      if (z.t.dog && dist < 140) speed *= 1.5;
      for (const o of zs) { if (o === z) continue; const sx = z.x - o.x, sy = z.y - o.y, sd = Math.hypot(sx, sy), min = z.r + o.r; if (sd < min && sd > .01) { const push = (min - sd) / min; vx += sx / sd * push * 1.5; vy += sy / sd * push * 1.5; } }
      const bx = z.x, by = z.y;
      z.x += (vx * speed + z.kx) * dt; z.y += (vy * speed + z.ky) * dt;
      z.kx *= Math.pow(.002, dt); z.ky *= Math.pow(.002, dt);
      collide(z); pushCircles(z);
      // atorado: golpea barricadas, tablas o puertas que tenga enfrente
      if (z.atk <= 0 && Math.hypot(z.x - bx, z.y - by) < speed * dt * .3) {
        for (const b of G.barricades) if (Math.hypot(b.x - z.x, b.y - z.y) < b.r + z.r + 4) { b.hp -= z.t.dmg * 1.5 + 5; z.atk = z.t.cd; Sfx.wood(); break; }
        if (z.atk <= 0) { const a = Math.atan2(vy, vx), fx = Math.floor((z.x + Math.cos(a) * (z.r + 8)) / T), fy = Math.floor((z.y + Math.sin(a) * (z.r + 8)) / T), fv = getT(G.map, fx, fy); if (fv === 4 || fv === 5) { damageTile(fx, fy, (z.t.dmg || 10) * (z.type === 'tank' || z.type === 'boss' ? 4 : 1.5)); z.atk = z.t.cd; } }
      }
      const face = z.t.ranged && dist < 330 ? Math.atan2(v.y - z.y, v.x - z.x) : Math.atan2(vy, vx);
      z.angle += angDiff(face, z.angle) * Math.min(1, dt * 8);
      if (ab.includes('charge')) { z.chargeCD -= dt; if (z.chargeCD <= 0 && dist > 130 && dist < 480 && lineOfSight(z.x, z.y, v.x, v.y)) { z.state = 'wind'; z.stateT = z.type === 'boss' ? .7 : .6; z.chargeCD = rand(5, 8) * (z.enraged ? .6 : 1); const s = spatial(z.x, z.y, 1400); Sfx.charge(s.pan, s.vol); } }
      if (ab.includes('spit')) { z.spitCD -= dt; if (z.spitCD <= 0 && dist < 480 && lineOfSight(z.x, z.y, v.x, v.y)) { spit(z, v, z.type === 'boss' ? (z.enraged ? 5 : 3) : 1); z.spitCD = (z.type === 'boss' ? 3 : rand(2.5, 3.5)) * (z.enraged ? .6 : 1); } }
      if (ab.includes('scream')) { z.screamCD -= dt; if (z.screamCD <= 0 && dist < 520 && lineOfSightCached(z, v)) { scream(z); z.screamCD = rand(6, 9); } }
      if (ab.includes('summon') || ab.includes('summonDogs')) {
        z.sumCD -= dt;
        if (z.sumCD <= 0 && zs.length < 30) {
          z.sumCD = (ab.includes('summonDogs') ? 9 : 8) * (z.enraged ? .6 : 1); const s = spatial(z.x, z.y, 1400); Sfx.groan(s.pan, s.vol * 1.4, true);
          for (let k = 0; k < 3; k++) { const n = spawnZombie(ab.includes('summonDogs') ? 'dog' : 'runner', { x: z.x + rand(-50, 50), y: z.y + rand(-50, 50) }); G.spawned--; collide(n); }
        }
      }
      if (!z.t.bomber && dist < z.r + v.r + 5 && z.atk <= 0) { z.atk = z.t.cd; hitVictim(v, z.t.dmg, z); if (G.state !== 'play') return; }
    }
    z.groan -= dt;
    if (z.groan <= 0) {
      z.groan = z.t.dog ? rand(2, 5) : rand(2.5, 7); const s = spatial(z.x, z.y, 1400);
      if (G.time - Sfx.lastGroan > .3 && s.vol > .04) { Sfx.lastGroan = G.time; if (z.t.dog) Sfx.bark(s.pan, s.vol * 1.1); else Sfx.groan(s.pan, s.vol * 1.35, z.type === 'boss' || z.type === 'tank'); }
    }
  }
}
function updateAllies(dt) {
  const p = G.p;
  G.allies.forEach((a, i) => {
    if (a.down) return;
    a.regenT -= dt; a.hurtT -= dt; a.muzzle = (a.muzzle || 0) - dt; if (a.regenT <= 0) a.hp = Math.min(a.maxHp, a.hp + 5 * dt);
    const dp = Math.hypot(a.x - p.x, a.y - p.y);
    if (dp > 750 && G.order !== 'hold') { const ang = rand(0, TAU); a.x = p.x + Math.cos(ang) * 40; a.y = p.y + Math.sin(ang) * 40; collide(a); }
    a.targetT -= dt;
    if (a.targetT <= 0 || (a.target && a.target.hp <= 0)) { a.targetT = .3; a.target = findTarget(a, a.kind === 'dog' ? 320 : G.order === 'attack' ? 650 : a.c.range); }
    // ¿a dónde camina?
    const side = i % 2 ? -1 : 1;
    let tx = p.x + Math.cos(p.angle + side * 2.2) * 55, ty = p.y + Math.sin(p.angle + side * 2.2) * 55, move = Math.hypot(a.x - tx, a.y - ty) > 20, speedK = 1;
    let coin = null;
    if (a.kind === 'dog') {
      if (a.target) { tx = a.target.x; ty = a.target.y; move = true; speedK = 1.35; }
      else { for (const k of G.pickups) if (k.type === 'coin' && Math.hypot(k.x - a.x, k.y - a.y) < 260) { coin = k; break; } if (coin) { tx = coin.x; ty = coin.y; move = true; speedK = 1.2; } }
    } else if (G.order === 'attack' && a.target) { const d = Math.hypot(a.target.x - a.x, a.target.y - a.y); tx = a.target.x; ty = a.target.y; move = d > a.c.range * .5; }
    if (G.order === 'hold' && a.kind !== 'dog') { tx = a.holdX; ty = a.holdY; move = Math.hypot(a.x - tx, a.y - ty) > 16; }
    let vx = 0, vy = 0;
    if (move) {
      const farFromTarget = Math.hypot(tx - a.x, ty - a.y) > T * 2.5;
      if (farFromTarget && !lineOfSight(a.x, a.y, tx, ty)) { const ft = flowTarget(a); if (ft) { tx = ft.x; ty = ft.y; } }
      vx = tx - a.x; vy = ty - a.y; const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l;
    }
    for (const o of [p, ...G.allies]) { if (o === a || o.down) continue; const sx = a.x - o.x, sy = a.y - o.y, sd = Math.hypot(sx, sy), min = a.r + o.r + 6; if (sd < min && sd > .01) { vx += sx / sd; vy += sy / sd; } }
    const spd = (a.kind === 'dog' ? 280 : (p.running ? 310 : 220)) * speedK * (dp > 300 ? 1.3 : 1);
    a.x += vx * spd * dt; a.y += vy * spd * dt; collide(a); pushCircles(a); if (move) a.walk += dt * 10;
    if (coin && Math.hypot(coin.x - a.x, coin.y - a.y) < 22) { addCoins(coin.value); Sfx.coin(); G.pickups.splice(G.pickups.indexOf(coin), 1); }
    // médica: cura al jugador cerca
    if (a.c && a.c.heal && dp < 130 && p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + 5 * dt); if (Math.random() < dt * 6) G.particles.push({ x: p.x + rand(-10, 10), y: p.y, vx: 0, vy: -50, life: .6, max: .6, color: '#7fff7f', size: 3 }); }
    // atacar
    if (a.target && a.target.hp > 0) {
      const want = Math.atan2(a.target.y - a.y, a.target.x - a.x), da = angDiff(want, a.angle); a.angle += da * Math.min(1, dt * 12);
      a.cool -= dt;
      if (a.kind === 'dog') {
        if (a.cool <= 0 && Math.hypot(a.target.x - a.x, a.target.y - a.y) < a.r + a.target.r + 6) { a.cool = DOG_INFO.rate; hurtZombie(a.target, DOG_INFO.dmg, 'melee'); blood(a.target.x, a.target.y, 6, 120); Sfx.bark(spatial(a.x, a.y).pan, .4); }
      } else if (a.cool <= 0 && Math.abs(da) < .3) {
        const c = a.c; a.cool = c.rate; a.muzzle = .05;
        for (let k = 0; k < c.pellets; k++) {
          const ang = a.angle + rand(-c.spread, c.spread), sp = 1400, tipX = a.x + Math.cos(a.angle) * 30, tipY = a.y + Math.sin(a.angle) * 30;
          G.bullets.push({ x: tipX, y: tipY, px: tipX, py: tipY, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, dmg: c.dmg, life: c.range / 1400 + .1, knock: 50, kind: 'bullet', ally: true, pierce: c.pierce || 0, hit: c.pierce ? new Set() : null, age: 0 });
        }
        Sfx.allyShot(spatial(a.x, a.y).pan, a.cls === 'franco' ? 1.4 : 1);
      }
    } else if (move) a.angle += angDiff(Math.atan2(vy, vx), a.angle) * Math.min(1, dt * 8);
  });
}
function updateGadgets(dt) {
  for (let i = G.turrets.length - 1; i >= 0; i--) {
    const t = G.turrets[i]; t.life -= dt; t.cool -= dt; t.tt -= dt;
    if (t.life <= 0 || t.hp <= 0) { G.turrets.splice(i, 1); blood(t.x, t.y, 14, 160, '#999'); continue; }
    if (t.tt <= 0 || (t.target && t.target.hp <= 0)) { t.tt = .3; t.target = findTarget(t, 430); }
    if (t.target) {
      const want = Math.atan2(t.target.y - t.y, t.target.x - t.x), da = angDiff(want, t.angle); t.angle += da * Math.min(1, dt * 10);
      if (t.cool <= 0 && Math.abs(da) < .25) {
        t.cool = .15; const ang = t.angle + rand(-.05, .05), tx = t.x + Math.cos(t.angle) * 22, ty = t.y + Math.sin(t.angle) * 22;
        G.bullets.push({ x: tx, y: ty, px: tx, py: ty, vx: Math.cos(ang) * 1500, vy: Math.sin(ang) * 1500, dmg: 13, life: .35, knock: 40, kind: 'bullet', ally: true, pierce: 0, hit: null, age: 0 });
        Sfx.allyShot(spatial(t.x, t.y).pan, .6);
      }
    }
  }
  for (let i = G.mines.length - 1; i >= 0; i--) {
    const m = G.mines[i]; m.arm -= dt; if (m.arm > 0) continue;
    if (G.zombies.some(z => Math.hypot(z.x - m.x, z.y - m.y) < 26 + z.r)) { G.mines.splice(i, 1); explode(m.x, m.y, 170, 95, false); }
  }
  for (let i = G.barricades.length - 1; i >= 0; i--) { const b = G.barricades[i]; if (b.hp <= 0) { G.barricades.splice(i, 1); blood(b.x, b.y, 16, 180, '#a89366'); Sfx.wood(); } }
}
function updateBullets(dt) {
  const zs = G.zombies;
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i]; b.px = b.x; b.py = b.y; b.life -= dt; b.age += dt;
    let dead = false;
    if (b.life <= 0) { if (b.kind === 'grenade' || b.kind === 'hand') explode(b.x, b.y, b.dmg, b.kind === 'hand' ? 120 : 115, false); G.bullets.splice(i, 1); continue; }
    if (b.kind === 'flame') { b.vx *= Math.pow(.25, dt); b.vy *= Math.pow(.25, dt); }
    if (b.kind === 'hand') { b.vx *= Math.pow(.15, dt); b.vy *= Math.pow(.15, dt); }
    const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 8));
    for (let s = 0; s < steps && !dead; s++) {
      b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
      const tx = Math.floor(b.x / T), ty = Math.floor(b.y / T);
      if (solid(tx, ty)) {
        if (b.kind === 'hand') { b.x -= b.vx * dt / steps; b.y -= b.vy * dt / steps; b.vx *= -.4; b.vy *= -.4; break; }
        dead = true;
        if (getT(G.map, tx, ty) === 5 && b.kind !== 'flame') damageTile(tx, ty, b.dmg);
        if (b.kind === 'grenade' || b.kind === 'bolt') explode(b.x - b.vx * dt / steps, b.y - b.vy * dt / steps, b.dmg, b.kind === 'bolt' ? 75 : 115, false);
        else if (b.kind === 'bullet' || b.kind === 'laser') for (let k = 0; k < 5; k++) { const a = Math.random() * TAU; G.particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * rand(50, 200), vy: Math.sin(a) * rand(50, 200), life: .2, max: .2, color: b.kind === 'laser' ? '#70f0ff' : '#ffd27a', size: 2 }); }
        break;
      }
      if (b.kind !== 'hand' && b.kind !== 'flame') for (const br of G.barrels) if (br.hp > 0 && (b.x - br.x) ** 2 + (b.y - br.y) ** 2 < br.r * br.r) { br.hp -= b.dmg; if (br.hp <= 0) G.pendingBarrels.push({ b: br, t: 0 }); dead = true; break; }
      if (dead || b.kind === 'hand') continue;
      for (const z of zs) {
        if (z.hp <= 0 || (b.hit && b.hit.has(z))) continue;
        const rr2 = b.kind === 'flame' ? z.r + 8 + b.age * 30 : z.r;
        if ((b.x - z.x) ** 2 + (b.y - z.y) ** 2 >= rr2 * rr2) continue;
        if (b.kind === 'grenade' || b.kind === 'bolt') { explode(b.x, b.y, b.dmg, b.kind === 'bolt' ? 75 : 115, false); dead = true; break; }
        hurtZombie(z, b.dmg, b.kind === 'flame' ? 'fire' : (b.pierce > 0 ? 'pierce' : 'bullet')); if (!b.ally) G.hits++;
        const sp = Math.hypot(b.vx, b.vy) || 1, kb = z.type === 'boss' ? .1 : z.type === 'tank' ? .35 : 1;
        z.kx += b.vx / sp * b.knock * kb; z.ky += b.vy / sp * b.knock * kb;
        if (b.kind === 'flame') { z.burn = 2.5; b.hit.add(z); continue; }
        blood(b.x, b.y, 5, 140); const s2 = spatial(z.x, z.y); Sfx.zhit(s2.pan, s2.vol * .7);
        if (b.pierce > 0) { b.hit.add(z); b.pierce--; b.dmg *= .85; continue; }
        dead = true; break;
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
}
function updateEnemyShots(dt) {
  const p = G.p;
  for (let i = G.enemyShots.length - 1; i >= 0; i--) {
    const s = G.enemyShots[i]; s.t += dt; s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    let done = false;
    if (Math.hypot(p.x - s.x, p.y - s.y) < p.r + 9) { damagePlayer(s.dmg, s); if (G.state !== 'play') return; p.slowT = 1.5; G.flash = Math.max(G.flash, .35); done = true; }
    else for (const a of G.allies) if (!a.down && Math.hypot(a.x - s.x, a.y - s.y) < a.r + 9) { damageAlly(a, s.dmg); done = true; break; }
    if (!done && G.gen && Math.hypot(G.gen.x - s.x, G.gen.y - s.y) < G.gen.r + 8) { hitVictim(G.gen, s.dmg, s); if (G.state !== 'play') return; done = true; }
    const wall = solid(Math.floor(s.x / T), Math.floor(s.y / T));
    if (!done && (s.life <= 0 || wall)) done = true;
    if (done) { const bx = wall ? s.x - s.vx * .05 : s.x, by = wall ? s.y - s.vy * .05 : s.y; addPuddle(bx, by, 38); blood(bx, by, 8, 120, '#9acd32'); G.enemyShots.splice(i, 1); }
  }
}
function updatePickups(dt) {
  const p = G.p, magnet = 120 + 30 * skill('iman');
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const k = G.pickups[i]; k.t += dt; k.life -= dt;
    if (k.life <= 0) { G.pickups.splice(i, 1); continue; }
    const d = Math.hypot(k.x - p.x, k.y - p.y);
    if (k.type === 'coin' && d < magnet) { const a = Math.atan2(p.y - k.y, p.x - k.x), s = 420 * (1 - d / (magnet + 20)); k.x += Math.cos(a) * s * dt; k.y += Math.sin(a) * s * dt; }
    if (d >= 34) continue;
    switch (k.type) {
      case 'coin': addCoins(k.value); Sfx.coin(); G.pickups.splice(i, 1); continue;
      case 'health': if (p.hp >= p.maxHp) continue; p.hp = Math.min(p.maxHp, p.hp + 35); break;
      case 'armor': { const capA = Math.max(p.maxArmor, 50); if (p.armor >= capA) continue; p.armor = Math.min(capA, p.armor + 40); break; }
      case 'adren': if (save.adren >= 9) continue; save.adren++; break;
      case 'grenade': if (save.grenades >= 9) continue; save.grenades++; break;
      case 'key': G.keys++; toast('🔑 ¡Encontraste una llave!', 'Abre una puerta dorada del mapa', '#ffd34d'); break;
      case 'chest': {
        const gifts = [['grenades', 2, '💣 2 granadas'], ['medkit', 1, '🩹 1 botiquín'], ['adren', 1, '⚡ 1 adrenalina'], ['mines', 2, '💥 2 minas'], ['turrets', 1, '🗼 1 torreta']];
        const g = gifts[Math.random() * gifts.length | 0], coins = 60 + Math.round(G.tier * 10); save[g[0]] += g[1]; addCoins(coins); save.stats.chests++;
        toast('📦 ¡Cofre abierto!', '+' + coins + ' 🪙 y ' + g[2], '#ffd34d'); Sfx.chest(); G.pickups.splice(i, 1); continue;
      }
      case 'legend': save.owned.push(k.value); persist(); toast('🌟 ¡ARMA LEGENDARIA!', WEAPONS[k.value].name + ' (tecla ' + (k.value + 1) + ')', '#d080ff'); Sfx.chest(); G.pickups.splice(i, 1); switchWeapon(k.value); continue;
      default: WEAPONS.forEach((w, wi) => { if (w.give) p.ammo[wi].reserve += w.give; });
    }
    Sfx.pickup(); G.pickups.splice(i, 1);
  }
}
function updateCamera(dt) {
  const p = G.p, m = G.map, vw = VW / Z, vh = VH / Z;
  const ox = TOUCH ? Math.cos(p.angle) * 70 : (mouse.x - VW / 2) / Z * .18, oy = TOUCH ? Math.sin(p.angle) * 50 : (mouse.y - VH / 2) / Z * .18;
  const tx = p.x - vw / 2 + ox, ty = p.y - vh / 2 + oy;
  G.cam.x += (tx - G.cam.x) * Math.min(1, dt * 8); G.cam.y += (ty - G.cam.y) * Math.min(1, dt * 8);
  G.cam.x = m.pw > vw ? clamp(G.cam.x, 0, m.pw - vw) : (m.pw - vw) / 2;
  G.cam.y = m.ph > vh ? clamp(G.cam.y, 0, m.ph - vh) : (m.ph - vh) / 2;
}

/* =========================================================
   DIBUJO
   ========================================================= */
const lc = document.createElement('canvas'), lg = lc.getContext('2d');
function drawDog(e, r, body, head, arm, hit) {
  const step = Math.sin(e.walk * 1.6) * r * .35;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(3, 4, r * 1.5, r * .8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = arm;
  ctx.fillRect(r * .5 + step, -r * .85, r * .45, r * .3); ctx.fillRect(r * .5 - step, r * .55, r * .45, r * .3);
  ctx.fillRect(-r * .9 - step, -r * .85, r * .45, r * .3); ctx.fillRect(-r * .9 + step, r * .55, r * .45, r * .3);
  ctx.strokeStyle = body; ctx.lineWidth = r * .25; ctx.beginPath(); ctx.moveTo(-r * 1.2, 0); ctx.lineTo(-r * 1.8, Math.sin(e.walk * 2) * r * .4); ctx.stroke();
  ctx.fillStyle = hit ? '#fff' : body; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.35, r * .7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = hit ? '#fff' : head; circle(ctx, r * 1.25, 0, r * .6);
  ctx.beginPath(); ctx.moveTo(r * 1.0, -r * .4); ctx.lineTo(r * .8, -r * .85); ctx.lineTo(r * 1.3, -r * .5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(r * 1.0, r * .4); ctx.lineTo(r * .8, r * .85); ctx.lineTo(r * 1.3, r * .5); ctx.fill();
  ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.ellipse(r * 1.75, 0, r * .3, r * .25, 0, 0, TAU); ctx.fill();
}
function drawZombie(z) {
  const r = z.r, sway = Math.sin(z.walk) * r * .25, t = z.t, hit = z.hit > 0;
  let ox = 0, oy = 0; if (z.state === 'wind' || z.fuse > 0) { ox = rand(-2, 2); oy = rand(-2, 2); }
  ctx.save(); ctx.translate(z.x + ox, z.y + oy); ctx.rotate(z.angle);
  if (z.state === 'wind' || z.state === 'dash' || z.enraged) { ctx.fillStyle = `rgba(255,40,20,${z.enraged ? .2 + Math.sin(G.time * 8) * .1 : .35})`; circle(ctx, 0, 0, r * 1.45); }
  if (z.burn > 0) { ctx.fillStyle = 'rgba(255,120,30,.3)'; circle(ctx, 0, 0, r * 1.3); }
  if (z.rage > 0) { ctx.strokeStyle = 'rgba(200,120,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, TAU); ctx.stroke(); }
  if (t.dog) { drawDog(z, r, t.body, t.head, t.arm, hit); ctx.fillStyle = '#ff2a1a'; circle(ctx, r * 1.45, -r * .22, r * .12); circle(ctx, r * 1.45, r * .22, r * .12); }
  else {
    const swell = z.fuse > 0 ? 1 + (.7 - z.fuse) * .5 : 1;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; circle(ctx, 4, 4, r);
    ctx.fillStyle = t.arm; ctx.fillRect(r * .1, -r * .95 + sway, r * 1.15, r * .38); ctx.fillRect(r * .1, r * .57 - sway, r * 1.15, r * .38);
    ctx.fillStyle = hit ? '#fff' : t.body; circle(ctx, 0, 0, (z.type === 'spitter' || t.bomber ? r * 1.08 : r) * swell);
    if (z.type === 'spitter') { ctx.fillStyle = 'rgba(200,230,60,.6)'; circle(ctx, -r * .35, -r * .35, r * .3); circle(ctx, -r * .2, r * .45, r * .25); }
    if (t.bomber) { ctx.fillStyle = z.fuse > 0 && Math.floor(G.time * 12) % 2 ? '#ff3020' : '#e0a040'; circle(ctx, -r * .3, -r * .3, r * .28); circle(ctx, -r * .25, r * .35, r * .22); circle(ctx, r * .1, 0, r * .2); }
    ctx.fillStyle = hit ? '#fff' : t.head; circle(ctx, r * .18, 0, r * .6);
    if (t.armored) { ctx.fillStyle = '#4a5560'; ctx.beginPath(); ctx.arc(r * .1, 0, r * .66, Math.PI * .5, Math.PI * 1.5); ctx.fill(); ctx.fillStyle = '#8a959f'; ctx.fillRect(-r * .1, -r * .1, r * .45, r * .2); }
    if (z.type === 'screamer') { ctx.fillStyle = '#300'; ctx.beginPath(); ctx.ellipse(r * .62, 0, r * .16, r * .24, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = 'rgba(90,0,0,.5)'; circle(ctx, -r * .4, r * .3, r * .22);
    ctx.fillStyle = '#ff2a1a'; circle(ctx, r * .5, -r * .22, r * .12); circle(ctx, r * .5, r * .22, r * .12);
    if (z.type === 'spitter') { ctx.fillStyle = '#b6e33a'; circle(ctx, r * .78, 0, r * .18); }
    if (t.crown) { ctx.fillStyle = '#ffcc33'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-r * .2, i * r * .3 - 6); ctx.lineTo(-r * .55, i * r * .3); ctx.lineTo(-r * .2, i * r * .3 + 6); ctx.fill(); } }
  }
  ctx.restore();
  if (z.hp < z.maxHp && z.type !== 'boss') { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(z.x - r, z.y - r - 10, r * 2, 4); ctx.fillStyle = '#e33'; ctx.fillRect(z.x - r, z.y - r - 10, r * 2 * Math.max(0, z.hp / z.maxHp), 4); }
}
function drawSoldier(e, body, gunLen, gunW, label) {
  const r = e.r, step = Math.sin(e.walk) * 3;
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; circle(ctx, 4, 4, r);
  ctx.fillStyle = '#222'; ctx.fillRect(r * .3, -3, r + gunLen, gunW);
  ctx.fillStyle = '#d9a77a'; circle(ctx, r * .9, -4 + step * .3, 4.5); circle(ctx, r * .5, 6, 4.5);
  ctx.fillStyle = e.hurtT > 0 ? '#ff6060' : body; circle(ctx, 0, 0, r);
  ctx.fillStyle = '#4d3a2a'; circle(ctx, -1, 0, r * .62);
  if (e.c && e.c.heal) { ctx.fillStyle = '#e02020'; ctx.fillRect(-3, -7, 6, 14); ctx.fillRect(-7, -3, 14, 6); }
  if (e.muzzle > 0) { const mx = r + gunLen + 6; ctx.fillStyle = '#fff3a0'; circle(ctx, mx, 0, 7); ctx.fillStyle = '#ffae30'; circle(ctx, mx, 0, 4); }
  ctx.restore();
  if (label) {
    ctx.font = 'bold 11px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(label, e.x, e.y - r - 12);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(e.x - 16, e.y - r - 9, 32, 4); ctx.fillStyle = '#4fdf6f'; ctx.fillRect(e.x - 16, e.y - r - 9, 32 * e.hp / e.maxHp, 4);
  }
}
function drawAlly(a) {
  if (a.kind === 'dog') {
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.angle); drawDog(a, a.r, a.color, '#d8b070', '#a88050', a.hurtT > 0);
    ctx.fillStyle = '#d02020'; ctx.fillRect(a.r * .7, -a.r * .55, a.r * .2, a.r * 1.1); ctx.fillStyle = '#222'; circle(ctx, a.r * 1.45, -a.r * .22, a.r * .1); circle(ctx, a.r * 1.45, a.r * .22, a.r * .1); ctx.restore();
    ctx.font = 'bold 11px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(a.name, a.x, a.y - a.r - 10);
  } else drawSoldier(a, a.color, a.cls === 'franco' ? 32 : 22, a.cls === 'escopeta' ? 7 : 6, a.name);
}
function drawPlayer() {
  const p = G.p, w = WEAPONS[p.wi];
  if (p.adrenT > 0) { ctx.fillStyle = `rgba(255,220,60,${.18 + Math.sin(G.time * 10) * .08})`; circle(ctx, p.x, p.y, p.r + 10); }
  if (p.armor > 0) { ctx.strokeStyle = 'rgba(120,180,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 3, 0, TAU); ctx.stroke(); }
  drawSoldier(p, skinColor(), w.len, ['shotgun', 'minigun', 'flame', 'laser'].includes(w.id) ? 8 : 6, null);
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
  if (w.laser) { ctx.fillStyle = '#70f0ff'; ctx.fillRect(p.r + w.len - 4, -2, 6, 4); }
  if (p.muzzle > 0) {
    const mx = p.r + w.len + 6; ctx.fillStyle = w.laser ? '#a0f8ff' : '#fff3a0'; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rr2 = i % 2 ? 5 : 14; ctx.lineTo(mx + Math.cos(a) * rr2 * 1.3, Math.sin(a) * rr2 * .8); }
    ctx.fill();
  }
  if (p.swingT > 0) { // machete
    const k = 1 - p.swingT / .2, a = -1 + k * 2;
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 58, -1, a); ctx.stroke();
    ctx.rotate(a); ctx.fillStyle = '#ccd'; ctx.fillRect(p.r, -2, 40, 5); ctx.fillStyle = '#4a2a1a'; ctx.fillRect(p.r - 6, -3, 10, 7);
  }
  ctx.restore();
}
function drawPickup(k) {
  if (k.life < 5 && Math.floor(k.t * 8) % 2) return;
  const bob = Math.sin(k.t * 4) * 3;
  ctx.save(); ctx.translate(k.x, k.y + (k.type === 'chest' ? 0 : bob));
  if (k.type === 'coin') { ctx.fillStyle = '#b8860b'; circle(ctx, 1, 1, 8); ctx.fillStyle = '#ffd34d'; circle(ctx, 0, 0, 8); ctx.fillStyle = '#fff6b0'; ctx.fillRect(-1.5, -5, 3, 10); ctx.restore(); return; }
  const glow = { health: 'rgba(255,80,80,.25)', ammo: 'rgba(255,220,80,.25)', armor: 'rgba(90,160,255,.3)', adren: 'rgba(255,240,80,.3)', grenade: 'rgba(120,200,80,.3)', key: 'rgba(255,210,60,.4)', chest: 'rgba(255,210,60,.25)', legend: 'rgba(210,120,255,.5)' }[k.type];
  ctx.fillStyle = glow; circle(ctx, 0, 0, (k.type === 'legend' ? 30 : 22) + Math.sin(k.t * 6) * 3);
  if (k.type === 'health') { ctx.fillStyle = '#f2f2f2'; rr(ctx, -13, -11, 26, 22, 4); ctx.fill(); ctx.fillStyle = '#d42020'; ctx.fillRect(-3, -8, 6, 16); ctx.fillRect(-8, -3, 16, 6); }
  else if (k.type === 'armor') { ctx.fillStyle = '#3a6ab0'; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(12, -8); ctx.lineTo(10, 6); ctx.lineTo(0, 14); ctx.lineTo(-10, 6); ctx.lineTo(-12, -8); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#9cc4ff'; ctx.fillRect(-2, -8, 4, 16); }
  else if (k.type === 'adren') { ctx.rotate(-.6); ctx.fillStyle = '#ddd'; ctx.fillRect(-12, -4, 18, 8); ctx.fillStyle = '#ffd400'; ctx.fillRect(-10, -3, 12, 6); ctx.fillStyle = '#999'; ctx.fillRect(6, -1, 8, 2); ctx.fillRect(-15, -5, 3, 10); }
  else if (k.type === 'grenade') { ctx.fillStyle = '#3a5a2a'; circle(ctx, 0, 2, 9); ctx.fillStyle = '#888'; ctx.fillRect(-3, -10, 6, 6); ctx.strokeStyle = '#ccc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(5, -9, 4, 0, TAU); ctx.stroke(); }
  else if (k.type === 'key') { ctx.rotate(Math.sin(k.t * 2) * .3); ctx.fillStyle = '#ffcc33'; circle(ctx, -6, 0, 7); ctx.fillRect(-1, -2, 16, 4); ctx.fillRect(10, 0, 3, 6); ctx.fillRect(5, 0, 3, 5); ctx.fillStyle = '#7a5a00'; circle(ctx, -6, 0, 3); }
  else if (k.type === 'chest') { ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-15, -8, 34, 24); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-17, -11, 34, 24); ctx.fillStyle = '#6a4220'; ctx.fillRect(-17, -11, 34, 8); ctx.fillStyle = '#ffcc33'; ctx.fillRect(-17, -4, 34, 3); ctx.fillRect(-3, -6, 6, 9); }
  else if (k.type === 'legend') { ctx.rotate(G.time); ctx.strokeStyle = '#e0a0ff'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(22, 0); ctx.stroke(); } ctx.rotate(-G.time); ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Segoe UI'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', 0, 1); ctx.textBaseline = 'alphabetic'; }
  else { ctx.fillStyle = '#4c5a2a'; rr(ctx, -14, -10, 28, 20, 3); ctx.fill(); ctx.fillStyle = '#e0b040'; for (let i = 0; i < 4; i++) ctx.fillRect(-10 + i * 6, -6, 4, 12); }
  ctx.restore();
}
function drawWorldObjects() {
  for (const b of G.barrels) { ctx.fillStyle = 'rgba(0,0,0,.35)'; circle(ctx, b.x + 4, b.y + 4, b.r); ctx.fillStyle = '#b02a1a'; circle(ctx, b.x, b.y, b.r); ctx.strokeStyle = '#701a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * .65, 0, TAU); ctx.stroke(); ctx.fillStyle = '#ffd030'; ctx.font = 'bold 12px Segoe UI'; ctx.textAlign = 'center'; ctx.fillText('⚠', b.x, b.y + 4); }
  for (const m of G.mines) { ctx.fillStyle = '#3a3a2a'; circle(ctx, m.x, m.y, 9); ctx.fillStyle = m.arm <= 0 && Math.floor(G.time * 3) % 2 ? '#ff3020' : '#602010'; circle(ctx, m.x, m.y, 3); }
  for (const b of G.barricades) { for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; ctx.fillStyle = 'rgba(0,0,0,.3)'; circle(ctx, b.x + Math.cos(a) * 13 + 3, b.y + Math.sin(a) * 13 + 3, 10); ctx.fillStyle = '#a89366'; circle(ctx, b.x + Math.cos(a) * 13, b.y + Math.sin(a) * 13, 10); } ctx.fillStyle = '#8a7a50'; circle(ctx, b.x, b.y, 11); if (b.hp < b.maxHp) { ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(b.x - 18, b.y - 32, 36, 4); ctx.fillStyle = '#d0b060'; ctx.fillRect(b.x - 18, b.y - 32, 36 * b.hp / b.maxHp, 4); } }
  for (const t of G.turrets) { ctx.fillStyle = 'rgba(0,0,0,.35)'; circle(ctx, t.x + 3, t.y + 3, t.r); ctx.fillStyle = '#555c62'; circle(ctx, t.x, t.y, t.r); ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.angle); ctx.fillStyle = '#2a2e32'; ctx.fillRect(0, -4, 24, 8); ctx.restore(); ctx.fillStyle = '#7fd0ff'; circle(ctx, t.x, t.y, 5); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(t.x - 16, t.y - 26, 32, 3); ctx.fillStyle = '#7fd0ff'; ctx.fillRect(t.x - 16, t.y - 26, 32 * t.life / 60, 3); }
  for (const s of G.survivors) if (!s.rescued) {
    ctx.fillStyle = 'rgba(155,209,75,.25)'; circle(ctx, s.x, s.y, 26 + Math.sin(s.t * 5) * 4);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; circle(ctx, s.x + 3, s.y + 3, 13); ctx.fillStyle = '#d9a77a'; circle(ctx, s.x - 12, s.y - 6 + Math.sin(s.t * 8) * 3, 4); circle(ctx, s.x + 12, s.y - 6 - Math.sin(s.t * 8) * 3, 4);
    ctx.fillStyle = '#c8b040'; circle(ctx, s.x, s.y, 13); ctx.fillStyle = '#5a3a20'; circle(ctx, s.x, s.y, 8);
    ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 18px Segoe UI'; ctx.textAlign = 'center'; ctx.fillText('!', s.x, s.y - 20 + Math.sin(s.t * 4) * 3);
  }
  if (G.gen) { const g = G.gen; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(g.x - 20, g.y - 16, 46, 38); ctx.fillStyle = '#c8a020'; ctx.fillRect(g.x - 24, g.y - 20, 48, 40); ctx.fillStyle = '#2a2a2a'; ctx.fillRect(g.x - 18, g.y - 14, 36, 10); ctx.fillStyle = '#fff'; ctx.font = 'bold 18px Segoe UI'; ctx.textAlign = 'center'; ctx.fillText('⚡', g.x, g.y + 14); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(g.x - 28, g.y - 32, 56, 6); ctx.fillStyle = g.hp > g.maxHp * .3 ? '#ffd34d' : '#e33'; ctx.fillRect(g.x - 28, g.y - 32, 56 * Math.max(0, g.hp) / g.maxHp, 6); }
  if (G.heli) {
    const h = G.heli; ctx.strokeStyle = 'rgba(255,220,60,.8)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(h.x, h.y, 60, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,220,60,.8)'; ctx.font = 'bold 40px Segoe UI'; ctx.textAlign = 'center'; ctx.fillText('H', h.x, h.y + 14);
    ctx.save(); ctx.translate(h.x, h.y - 6); ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(8, 10, 34, 18, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#3a5a3a'; ctx.beginPath(); ctx.ellipse(0, 0, 32, 16, 0, 0, TAU); ctx.fill(); ctx.fillRect(-60, -4, 34, 8); ctx.fillStyle = '#9ac'; ctx.beginPath(); ctx.ellipse(18, 0, 10, 10, 0, 0, TAU); ctx.fill();
    ctx.rotate(h.t * 25); ctx.fillStyle = 'rgba(30,30,30,.7)'; ctx.fillRect(-60, -3, 120, 6); ctx.fillRect(-3, -60, 6, 120); ctx.restore();
  }
}
function drawTargetMark(z) {
  const r = z.r + 8, a = G.time * 3, k = 7;
  ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(a); ctx.strokeStyle = 'rgba(255,60,60,.9)'; ctx.lineWidth = 2.5;
  for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(r - k, -r); ctx.lineTo(r, -r); ctx.lineTo(r, -r + k); ctx.stroke(); }
  ctx.restore();
}
function curDark() {
  if (!G.theme) return 0; let d = G.theme.dark;
  if (G.L && G.L.daynight) { const k = clamp(G.time / 150, 0, 1); d = d * .4 + (Math.min(.88, d + .35) - d * .4) * k; }
  if (G.L && G.L.weather === 'storm') d = Math.min(.9, d + .12);
  if (G.lightning > 0) d *= .15;
  return d;
}
function drawDarkness(dark, sx, sy, angle) {
  if (dark <= 0) return;
  if (lc.width !== VW || lc.height !== VH) { lc.width = VW; lc.height = VH; }
  lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, VW, VH);
  lg.fillStyle = `rgba(0,0,10,${dark})`; lg.fillRect(0, 0, VW, VH);
  if (sx !== undefined) {
    lg.globalCompositeOperation = 'destination-out';
    const R1 = 180 * Z, R2 = 580 * Z, R3 = 450 * Z;
    let gr = lg.createRadialGradient(sx, sy, 10, sx, sy, R1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    lg.fillStyle = gr; lg.beginPath(); lg.arc(sx, sy, R1, 0, TAU); lg.fill();
    gr = lg.createRadialGradient(sx, sy, 20, sx, sy, R2); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.65, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    lg.fillStyle = gr; lg.beginPath(); lg.moveTo(sx, sy); lg.arc(sx, sy, R2, angle - .45, angle + .45); lg.closePath(); lg.fill();
    if (G.lightFlash > 0) { gr = lg.createRadialGradient(sx, sy, 0, sx, sy, R3); gr.addColorStop(0, 'rgba(0,0,0,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); lg.fillStyle = gr; lg.beginPath(); lg.arc(sx, sy, R3, 0, TAU); lg.fill(); }
    for (const q of G.particles) if (q.glow) { const x = (q.x - G.cam.x) * Z, y = (q.y - G.cam.y) * Z; lg.fillStyle = 'rgba(0,0,0,.25)'; lg.beginPath(); lg.arc(x, y, 30 * Z, 0, TAU); lg.fill(); }
    lg.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(lc, 0, 0);
}
function drawWeather(sx, sy) {
  const w = G.L && G.L.weather; if (!w) return;
  if (w === 'fog') {
    const gr = ctx.createRadialGradient(sx, sy, 120 * Z, sx, sy, Math.max(VW, VH) * .6);
    gr.addColorStop(0, 'rgba(190,200,205,0)'); gr.addColorStop(1, 'rgba(190,200,205,.62)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
  }
  if (w === 'rain' || w === 'storm') {
    ctx.strokeStyle = 'rgba(170,190,230,.45)'; ctx.lineWidth = 1.2; ctx.beginPath();
    const t = G.time;
    for (const d of G.rain) { const x = ((d.x * VW + t * 160 * d.s) % (VW + 40)) - 20, y = ((d.y * VH + t * 900 * d.s) % (VH + 40)) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 5, y - 16); }
    ctx.stroke();
  }
  if (G.lightning > 0) { ctx.fillStyle = `rgba(230,235,255,${G.lightning * 1.6})`; ctx.fillRect(0, 0, VW, VH); }
}
function bar(x, y, w, h, frac, col, label) {
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#300'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  if (label) { ctx.fillStyle = '#fff'; ctx.font = `bold ${h >= 18 ? 14 : 11}px Segoe UI, Arial`; ctx.textAlign = 'left'; ctx.fillText(label, x + 6, y + h - (h >= 18 ? 5 : 2)); }
}
function objectiveText() {
  const L = G.L;
  if (G.mode === 'survival') return G.phase === 'break' ? 'Siguiente oleada en ' + Math.ceil(G.breakT) + ' s' : (G.boss ? '¡Derrota a ' + G.boss.t.name + '!' : 'Zombis restantes: ' + (G.waveLeft + G.zombies.length));
  if (G.phase === 'boss') return G.boss ? '¡Derrota a ' + G.boss.t.name + '!' : '¡Jefe derrotado!';
  if (G.phase === 'escape') return '🚁 ¡Corre al helicóptero!';
  if (L.mission === 'rescue') return '🙋 Rescata sobrevivientes: ' + G.rescued + ' / ' + L.rescue;
  if (L.mission === 'defend') { const s = Math.ceil(G.defT); return '⚡ Defiende el generador: ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  return 'Zombis antes del jefe: ' + Math.max(0, L.goal - G.kills);
}
function drawArrow(tx, ty, col) { // flecha en el borde de la pantalla hacia el objetivo
  const sx = (tx - G.cam.x) * Z, sy = (ty - G.cam.y) * Z, m = 60;
  if (sx > m && sx < VW - m && sy > m && sy < VH - m) return;
  const cx = VW / 2, cy = VH / 2, a = Math.atan2(sy - cy, sx - cx);
  const k = Math.min((VW / 2 - m) / Math.abs(Math.cos(a) || 1e-3), (VH / 2 - m) / Math.abs(Math.sin(a) || 1e-3));
  ctx.save(); ctx.translate(cx + Math.cos(a) * k, cy + Math.sin(a) * k); ctx.rotate(a);
  ctx.fillStyle = col; ctx.globalAlpha = .7 + Math.sin(G.time * 6) * .3; ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -12); ctx.lineTo(-4, 0); ctx.lineTo(-10, 12); ctx.closePath(); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
}
function drawHUD() {
  const p = G.p, L = G.L, w = WEAPONS[p.wi], a = p.ammo[p.wi];
  ctx.textBaseline = 'alphabetic';
  // barra de experiencia arriba
  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, VW, 4); ctx.fillStyle = '#7fd0ff'; ctx.fillRect(0, 0, VW * save.xp / xpNeed(save.xpLevel), 4);
  // vida, armadura, energía
  const hw = TOUCH ? 180 : 260, showArmor = p.maxArmor > 0 || p.armor > 0;
  let y = TOUCH ? 12 : VH - (showArmor ? 92 : 64);
  bar(20, y, hw, TOUCH ? 18 : 22, p.hp / p.maxHp, p.hp > p.maxHp * .3 ? '#3fbf3f' : '#e03030', 'VIDA ' + Math.ceil(p.hp)); y += TOUCH ? 24 : 28;
  if (showArmor) { bar(20, y, hw, 12, p.armor / Math.max(p.maxArmor, 50), '#5a9ae0', 'ARMADURA ' + Math.ceil(p.armor)); y += 18; }
  bar(20, y, hw, 8, p.stamina, p.adrenT > 0 ? '#ffd400' : '#3fa0e0'); y += 14;
  ctx.textAlign = 'left'; ctx.font = 'bold 12px Segoe UI, Arial';
  const runCol = p.adrenT > 0 ? '#ffd400' : p.running ? '#7fd0ff' : '#aaa', runTxt = p.adrenT > 0 ? '⚡ ADRENALINA ' + Math.ceil(p.adrenT) + 's' : p.running ? '» CORRIENDO' : 'Caminando (Shift: correr)';
  if (!TOUCH) {
    ctx.fillStyle = runCol; ctx.fillText(runTxt, 20 + hw + 10, y - 6);
    ctx.fillStyle = '#ddd'; ctx.font = '13px Segoe UI, Arial';
    const gk = GADGETS[G.gadget];
    ctx.fillText(`[Q]🩹${save.medkit}  [E]⚡${save.adren}  [G]💣${save.grenades}  [V]🔪  [C]🗼${save.turrets}  [X]💥${save.mines}  [Z]🧱${save.barricades}` + (G.keys ? `  🔑${G.keys}` : ''), 20, VH - (showArmor ? 100 : 72));
  }
  // puntos, monedas, nivel de personaje
  const ty0 = TOUCH ? y + 14 : 32;
  ctx.fillStyle = '#ddd'; ctx.font = '16px Segoe UI, Arial'; ctx.fillText('Puntos: ' + G.score, 20, ty0);
  ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 16px Segoe UI, Arial'; ctx.fillText('🪙 ' + save.coins, 140, ty0);
  ctx.fillStyle = '#7fd0ff'; ctx.font = 'bold 13px Segoe UI, Arial'; ctx.fillText('Nv ' + save.xpLevel, TOUCH ? 220 : 230, ty0);
  ctx.fillStyle = settings.autoAim ? '#9bd14b' : '#888'; ctx.font = '13px Segoe UI, Arial';
  ctx.fillText('Autoapuntado: ' + (settings.autoAim ? 'SÍ' : 'NO') + (TOUCH ? '' : ' (T)'), 20, ty0 + 18);
  let ly = ty0 + 36;
  if (TOUCH && G.keys) { ctx.fillStyle = '#ffd34d'; ctx.fillText('🔑 ' + G.keys, 20, ly); ly += 16; }
  if (TOUCH && p.adrenT > 0) { ctx.fillStyle = runCol; ctx.font = 'bold 12px Segoe UI, Arial'; ctx.fillText(runTxt, 20, ly); ly += 16; }
  if (Sfx.muted) { ctx.fillStyle = '#ff8080'; ctx.font = '13px Segoe UI, Arial'; ctx.fillText('🔇 Sonido apagado (M)', 20, ly); ly += 16; }
  if (G.allies.length) {
    ctx.font = '12px Segoe UI, Arial';
    G.allies.forEach((al, i) => { ctx.fillStyle = al.down ? '#f66' : '#9f9'; ctx.fillText(`${al.name}: ${al.down ? 'caído' : Math.ceil(al.hp)}`, TOUCH ? 135 + i * 62 : 20, TOUCH ? ty0 + 18 : 70 + i * 16); });
    if (!TOUCH) { ctx.fillStyle = '#7fd0ff'; ctx.fillText('[O] Orden: ' + { follow: 'Síganme', hold: 'Quietos', attack: 'Ataquen' }[G.order], 20, 70 + G.allies.length * 16); }
  }
  // arma y balas
  const BL = btnLayout(), ay = TOUCH ? Math.min(BL.swap.y, BL.run.y) - BL.swap.r - 14 : VH - 30;
  ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = `bold ${TOUCH ? 26 : 34}px Segoe UI, Arial`;
  ctx.fillText(a.mag + ' / ' + (a.reserve === Infinity ? '∞' : a.reserve), VW - 24, ay);
  ctx.font = '16px Segoe UI, Arial'; ctx.fillStyle = w.legend ? '#d080ff' : '#ccc'; ctx.fillText(w.name, VW - 24, ay - (TOUCH ? 30 : 40));
  const msg = p.reloading > 0 ? ['RECARGANDO...', '#ffd34d'] : (a.mag === 0 && a.reserve <= 0) ? ['SIN BALAS - cambia de arma', '#ff5050'] : null;
  if (msg) { ctx.fillStyle = msg[1]; ctx.font = 'bold 18px Segoe UI, Arial'; if (TOUCH) { ctx.textAlign = 'center'; ctx.fillText(msg[0], VW / 2, VH - 18); } else ctx.fillText(msg[0], VW - 24, ay - 62); }
  if (p.reloading > 0 && !TOUCH) bar(VW - 184, VH - 20, 160, 6, 1 - p.reloading / (p.reloadMax || 1), '#ffd34d');
  if (!TOUCH) {
    const own = save.owned.slice().sort((x, y2) => x - y2);
    own.forEach((wi, k) => {
      const x = VW - 24 - (own.length - k) * 46, yy = VH - 150;
      ctx.fillStyle = wi === p.wi ? 'rgba(155,209,75,.85)' : WEAPONS[wi].legend ? 'rgba(120,40,160,.7)' : 'rgba(0,0,0,.55)'; ctx.fillRect(x, yy, 40, 36);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillText(String(wi + 1), x + 20, yy + 24);
    });
  }
  // título del nivel y objetivo
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Segoe UI, Arial';
  const icon = (L.weather === 'rain' ? '🌧 ' : L.weather === 'storm' ? '⛈ ' : L.weather === 'fog' ? '🌫 ' : '') + (L.daynight ? (G.time > 100 ? '🌙 ' : '☀ ') : '');
  ctx.fillText(icon + (G.mode === 'survival' ? 'Supervivencia · Oleada ' + G.wave : 'Nivel ' + (G.level + 1) + ' - ' + G.theme.name), VW / 2, 32);
  ctx.font = '17px Segoe UI, Arial'; ctx.fillStyle = '#ffd34d'; ctx.fillText(objectiveText(), VW / 2, 56);
  if (G.boss) { const bw = Math.max(200, Math.min(600, VW - 2 * (G.mini.width * (TOUCH ? .6 : 1) + 40))); bar(VW / 2 - bw / 2, 70, bw, 18, G.boss.hp / G.boss.maxHp, G.boss.enraged ? '#e03030' : '#a040c0', G.boss.t.name.toUpperCase() + (G.boss.enraged ? ' · FURIOSO' : '')); }
  // avisos (logros, nivel, rescates)
  G.toasts.forEach((t, i) => {
    const yy = (G.boss ? 110 : 84) + i * 44, al = Math.min(1, t.t);
    ctx.globalAlpha = al; ctx.fillStyle = 'rgba(0,0,0,.65)'; const tw = Math.max(260, ctx.measureText(t.sub).width + 40); ctx.fillRect(VW / 2 - tw / 2, yy - 4, tw, 40);
    ctx.fillStyle = t.col; ctx.font = 'bold 15px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillText(t.title, VW / 2, yy + 13);
    ctx.fillStyle = '#ddd'; ctx.font = '12px Segoe UI, Arial'; ctx.fillText(t.sub, VW / 2, yy + 30); ctx.globalAlpha = 1;
  });
  if (G.hint) { ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(VW / 2 - 200, VH - 140, 400, 30); ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 14px Segoe UI'; ctx.textAlign = 'center'; ctx.fillText(G.hint.text, VW / 2, VH - 120); }
  // flechas a los objetivos
  for (const s of G.survivors) if (!s.rescued) drawArrow(s.x, s.y, '#9bd14b');
  if (G.heli) drawArrow(G.heli.x, G.heli.y, '#ffd34d');
  if (G.gen && G.phase === 'mission') drawArrow(G.gen.x, G.gen.y, '#ffb030');
  // minimapa
  const mm = G.mini, ms = TOUCH ? .6 : 1, mmw = mm.width * ms, mmh = mm.height * ms, mx = VW - mmw - 16, my = 16, s = mmw / G.map.w / T;
  ctx.globalAlpha = .85; ctx.drawImage(mm, mx, my, mmw, mmh); ctx.globalAlpha = 1;
  ctx.strokeStyle = '#5f8a2e'; ctx.lineWidth = 2; ctx.strokeRect(mx, my, mmw, mmh);
  for (const z of G.zombies) { ctx.fillStyle = z.type === 'boss' ? '#d050ff' : '#ff3030'; const sz = z.type === 'boss' ? 6 : 3; ctx.fillRect(mx + z.x * s - sz / 2, my + z.y * s - sz / 2, sz, sz); }
  for (const k of G.pickups) if (k.type !== 'coin') { ctx.fillStyle = k.type === 'health' ? '#fff' : k.type === 'key' || k.type === 'chest' ? '#ffcc33' : k.type === 'legend' ? '#d080ff' : '#ffd34d'; ctx.fillRect(mx + k.x * s - 1, my + k.y * s - 1, 3, 3); }
  for (const sv of G.survivors) if (!sv.rescued) { ctx.fillStyle = '#9bd14b'; ctx.fillRect(mx + sv.x * s - 2, my + sv.y * s - 2, 5, 5); }
  if (G.heli) { ctx.fillStyle = '#ffd34d'; circle(ctx, mx + G.heli.x * s, my + G.heli.y * s, 4); }
  if (G.gen) { ctx.fillStyle = '#ffb030'; ctx.fillRect(mx + G.gen.x * s - 3, my + G.gen.y * s - 3, 6, 6); }
  for (const al of G.allies) if (!al.down) { ctx.fillStyle = '#60c0ff'; circle(ctx, mx + al.x * s, my + al.y * s, 2.5); }
  ctx.fillStyle = '#40ff60'; circle(ctx, mx + p.x * s, my + p.y * s, 3);
  // títulos grandes
  const big = (title, sub, sub2, alpha, col) => {
    ctx.globalAlpha = alpha; ctx.textAlign = 'center';
    ctx.fillStyle = col; ctx.font = `bold ${TOUCH ? 38 : 52}px Segoe UI, Arial`; ctx.fillText(title, VW / 2, VH / 2 - 50);
    ctx.fillStyle = '#fff'; ctx.font = `bold ${TOUCH ? 22 : 30}px Segoe UI, Arial`; ctx.fillText(sub, VW / 2, VH / 2 - 12);
    if (sub2) { ctx.font = '18px Segoe UI, Arial'; ctx.fillStyle = '#ccc'; ctx.fillText(sub2, VW / 2, VH / 2 + 18); }
    ctx.globalAlpha = 1;
  };
  if (G.intro > 0 && G.mode === 'campaign') {
    const goal = L.mission === 'rescue' ? `Rescata a ${L.rescue} sobrevivientes` : L.mission === 'defend' ? `Defiende el generador ${L.defend} segundos` : `Elimina ${L.goal} zombis`;
    big('NIVEL ' + (G.level + 1), L.title, goal + ' y vence al jefe: ' + BOSSES[L.boss].name, Math.min(1, G.intro), '#9bd14b');
  } else if (G.banner) big(G.banner.title, G.banner.sub, null, Math.min(1, G.banner.t), '#e04040');
}
function drawCrosshair() {
  const x = mouse.x, y = mouse.y, p = G.p, w = WEAPONS[p.wi], gap = 6 + w.spread * 60 + (p.cool > 0 ? 4 : 0);
  ctx.strokeStyle = p.reloading > 0 ? '#ffd34d' : '#fff'; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(x - gap - 8, y); ctx.lineTo(x - gap, y); ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + 8, y);
  ctx.moveTo(x, y - gap - 8); ctx.lineTo(x, y - gap); ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + 8);
  ctx.stroke(); ctx.fillStyle = '#ff4040'; ctx.fillRect(x - 1, y - 1, 2, 2);
}
function render() {
  if (!VW || !VH) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  if (!G.map) return;
  const shx = (Math.random() - .5) * G.shake, shy = (Math.random() - .5) * G.shake;
  const cx = Math.round(G.cam.x + shx), cy = Math.round(G.cam.y + shy);
  ctx.save(); ctx.scale(Z, Z); ctx.translate(-cx, -cy);
  const sx = Math.max(0, cx), sy = Math.max(0, cy), sw = Math.min(Math.ceil(VW / Z) + 2, G.map.pw - sx), sh = Math.min(Math.ceil(VH / Z) + 2, G.map.ph - sy);
  if (sw > 0 && sh > 0) { ctx.drawImage(G.mapCanvas, sx, sy, sw, sh, sx, sy, sw, sh); ctx.drawImage(G.decal, sx, sy, sw, sh, sx, sy, sw, sh); }
  for (const pu of G.puddles) {
    const al = Math.min(1, pu.life / 1.2); ctx.fillStyle = `rgba(130,200,30,${.4 * al})`; circle(ctx, pu.x, pu.y, pu.r); ctx.fillStyle = `rgba(190,240,60,${.5 * al})`;
    for (let i = 0; i < 3; i++) { const a = G.time * 2 + i * 2.1, rr2 = pu.r * .5; circle(ctx, pu.x + Math.cos(a) * rr2, pu.y + Math.sin(a * 1.3) * rr2, 3 + Math.sin(G.time * 5 + i) * 2); }
  }
  for (const k of G.pickups) drawPickup(k);
  drawWorldObjects();
  for (const q of G.particles) {
    ctx.globalAlpha = q.shell ? 1 : clamp(q.life / q.max * 1.5, 0, 1); ctx.fillStyle = q.color;
    if (q.ring) { ctx.strokeStyle = q.color; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(q.x, q.y, 350 * (1 - q.life / q.max), 0, TAU); ctx.stroke(); }
    else if (q.shell) ctx.fillRect(q.x, q.y, 4, 2); else circle(ctx, q.x, q.y, q.size);
  }
  ctx.globalAlpha = 1;
  for (const z of G.zombies) drawZombie(z);
  if (G.target && G.state === 'play') drawTargetMark(G.target);
  for (const al of G.allies) if (!al.down) drawAlly(al);
  if (G.p && G.state !== 'menu') drawPlayer();
  ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (const b of G.bullets) if (b.kind === 'bullet') { ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); }
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(90,230,255,.9)'; ctx.lineWidth = 5; ctx.beginPath(); for (const b of G.bullets) if (b.kind === 'laser') { ctx.moveTo(b.px - b.vx * .02, b.py - b.vy * .02); ctx.lineTo(b.x, b.y); } ctx.stroke();
  for (const b of G.bullets) if (b.kind === 'flame') { const k = b.age / .4, r = 6 + k * 18; ctx.fillStyle = `rgba(255,${Math.round(200 - k * 150)},${Math.round(60 - k * 60)},${.55 * (1 - k * .7)})`; circle(ctx, b.x, b.y, r); }
  ctx.globalCompositeOperation = 'source-over';
  for (const b of G.bullets) {
    if (b.kind === 'grenade' || b.kind === 'hand') { ctx.fillStyle = '#2e3a1e'; circle(ctx, b.x, b.y, b.kind === 'hand' ? 7 : 6); ctx.fillStyle = Math.floor(b.life * 10) % 2 ? '#ff5030' : '#600'; circle(ctx, b.x, b.y, 2.5); }
    if (b.kind === 'bolt') { ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx)); ctx.fillStyle = '#6a4a2a'; ctx.fillRect(-14, -1.5, 18, 3); ctx.fillStyle = '#ff6030'; circle(ctx, 4, 0, 3.5); ctx.restore(); }
  }
  for (const s of G.enemyShots) { ctx.fillStyle = 'rgba(150,210,40,.35)'; circle(ctx, s.x - s.vx * .03, s.y - s.vy * .03, 7); ctx.fillStyle = '#a6d83a'; circle(ctx, s.x, s.y, 8 + Math.sin(s.t * 20) * 1.5); ctx.fillStyle = '#d8ff70'; circle(ctx, s.x - 2, s.y - 2, 3); }
  ctx.restore();
  if (G.state === 'menu') { drawDarkness(.55); return; }
  const psx = (G.p.x - cx) * Z, psy = (G.p.y - cy) * Z;
  drawDarkness(curDark(), psx, psy, G.p.angle);
  drawWeather(psx, psy);
  if (G.flash > 0) { const gr = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .25, VW / 2, VH / 2, Math.max(VW, VH) * .7); gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(1, `rgba(200,0,0,${G.flash})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH); }
  if (G.p.slowT > 0) { ctx.fillStyle = 'rgba(120,200,30,.12)'; ctx.fillRect(0, 0, VW, VH); }
  if (G.p.hp < G.p.maxHp * .3) { ctx.fillStyle = `rgba(120,0,0,${.12 + Math.sin(G.time * 6) * .06})`; ctx.fillRect(0, 0, VW, VH); }
  if (G.cine) { // cinemática: barras de cine y nombre del jefe
    const k = Math.min(1, (2.8 - G.cine.t) * 3, G.cine.t * 3), bh = VH * .12 * k;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, bh); ctx.fillRect(0, VH - bh, VW, bh);
    ctx.globalAlpha = k; ctx.textAlign = 'center'; ctx.fillStyle = '#e04040'; ctx.font = `bold ${TOUCH ? 22 : 28}px Segoe UI`; ctx.fillText(G.L.final && G.mode === 'campaign' ? '¡JEFE FINAL!' : '¡APARECIÓ EL JEFE!', VW / 2, VH - bh - 60);
    ctx.fillStyle = '#fff'; ctx.font = `bold ${TOUCH ? 34 : 48}px Segoe UI`; ctx.fillText(G.cine.name.toUpperCase(), VW / 2, VH - bh - 18); ctx.globalAlpha = 1;
    return;
  }
  drawHUD();
  if (G.state === 'play') { if (TOUCH) drawTouch(); else drawCrosshair(); }
}
