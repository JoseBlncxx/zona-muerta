'use strict';
/* =========================================================
   ZONA MUERTA - lógica del juego
   (usa core.js = utilidades y sonidos, mapas.js = mapas)
   ========================================================= */

/* ---------- sonidos extra ---------- */
Object.assign(Sfx, {
  lastCoin: 0, lastFlame: 0, lastArmor: 0,
  vomit(pan, vol) {
    if (!this.ok() || vol < .03) return; const t = this.ctx.currentTime, o = this.out(vol, pan);
    this.nz(o, t, .45, 'lowpass', 700, 6, 1.1);
    const osc = this.ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(170, t); osc.frequency.exponentialRampToValueAtTime(60, t + .4);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 22; const lg = this.ctx.createGain(); lg.gain.value = 40; lfo.connect(lg); lg.connect(osc.frequency);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(.45, t); g.gain.exponentialRampToValueAtTime(.001, t + .45);
    osc.connect(g); g.connect(o); osc.start(t); lfo.start(t); osc.stop(t + .5); lfo.stop(t + .5);
  },
  bark(pan, vol) {
    if (!this.ok() || vol < .03) return; const t = this.ctx.currentTime, o = this.out(vol, pan);
    for (let i = 0; i < 2; i++) { const s = t + i * .17; this.tone(o, s, .11, 'square', rand(380, 470), 170, .35); this.nz(o, s, .09, 'bandpass', 900, 2, .9); }
  },
  coin() { if (!this.ok()) return; const t = this.ctx.currentTime; if (t - this.lastCoin < .05) return; this.lastCoin = t; const o = this.out(.3); this.tone(o, t, .07, 'square', 1320, 0, .25); this.tone(o, t + .06, .16, 'square', 1760, 0, .25); },
  buy() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(.4); [990, 1320, 1760, 2640].forEach((f, i) => this.tone(o, t + i * .06, .14, 'square', f, 0, .2)); },
  explode() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(1.3); this.nz(o, t, .9, 'lowpass', 900, .7, 1.4); this.tone(o, t, .6, 'sine', 90, 25, 1.3); this.nz(o, t, .12, 'highpass', 2500, 1, .6); },
  launch() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(.8); this.tone(o, t, .15, 'sine', 220, 70, .9); this.nz(o, t, .12, 'lowpass', 1200, 1, .6); },
  flame() { if (!this.ok()) return; const t = this.ctx.currentTime; if (t - this.lastFlame < .07) return; this.lastFlame = t; const o = this.out(.5); this.nz(o, t, .15, 'bandpass', rand(400, 700), .8, .9); },
  allyShot(pan) { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(.45, pan); this.nz(o, t, .1, 'bandpass', 1900, .8, 1); this.tone(o, t, .06, 'sine', 160, 50, .5); },
  armor() { if (!this.ok()) return; const t = this.ctx.currentTime; if (t - this.lastArmor < .15) return; this.lastArmor = t; const o = this.out(.6); this.nz(o, t, .12, 'bandpass', 3200, 6, 1); this.tone(o, t, .2, 'triangle', 950, 700, .3); },
  adren() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(.6); this.tone(o, t, .6, 'sawtooth', 200, 900, .2); this.heart(); },
  charge(pan, vol) { if (!this.ok()) return; this.groan(pan, Math.min(1.4, vol * 1.5), true); const t = this.ctx.currentTime, o = this.out(vol, pan); this.nz(o, t, .5, 'lowpass', 300, 2, 1); },
  bossIntro() { if (!this.ok()) return; this.groan(0, 1.5, true); const t = this.ctx.currentTime, o = this.out(1); for (let i = 0; i < 4; i++) this.tone(o, t + i * .35, .3, 'sine', 70, 35, 1); },
});

/* =========================================================
   ARMAS, ZOMBIS, JEFES, TIENDA Y NIVELES
   ========================================================= */
const WEAPONS = [
  { id: 'pistol', name: 'Pistola', price: 0, dmg: 28, rate: .22, mag: 12, reserve: Infinity, reload: 1.0, spread: .03, pellets: 1, speed: 1300, len: 14, shake: 2, knock: 90, give: 0, desc: 'Munición infinita.' },
  { id: 'shotgun', name: 'Escopeta', price: 150, dmg: 17, rate: .75, mag: 6, reserve: 36, reload: 1.7, spread: .2, pellets: 8, speed: 1100, len: 22, shake: 8, knock: 200, give: 12, desc: 'Devastadora de cerca.' },
  { id: 'rifle', name: 'Rifle de Asalto', price: 300, dmg: 22, rate: .09, mag: 30, reserve: 180, reload: 1.5, spread: .05, pellets: 1, speed: 1550, len: 26, shake: 2.5, knock: 70, give: 60, desc: 'Automático y preciso.' },
  { id: 'sniper', name: 'Francotirador', price: 450, dmg: 130, rate: 1.0, mag: 5, reserve: 30, reload: 2.0, spread: .004, pellets: 1, speed: 2600, len: 34, shake: 6, knock: 250, give: 10, pierce: 4, desc: 'Atraviesa hasta 4 zombis.' },
  { id: 'flame', name: 'Lanzallamas', price: 650, dmg: 7, rate: .04, mag: 120, reserve: 360, reload: 2.2, spread: .22, pellets: 1, speed: 480, len: 24, shake: 1, knock: 12, give: 120, flame: true, desc: 'ESPECIAL: quema a corta distancia.' },
  { id: 'grenade', name: 'Lanzagranadas', price: 800, dmg: 160, rate: .8, mag: 4, reserve: 20, reload: 2.4, spread: .03, pellets: 1, speed: 650, len: 24, shake: 5, knock: 0, give: 6, grenade: true, desc: 'ESPECIAL: explosiones de área.' },
  { id: 'minigun', name: 'Minigun', price: 1100, dmg: 15, rate: .05, mag: 150, reserve: 450, reload: 3.2, spread: .11, pellets: 1, speed: 1500, len: 30, shake: 2, knock: 50, give: 150, desc: 'ESPECIAL: una lluvia de balas.' },
];
const ZTYPES = {
  normal: { name: 'Zombi', hp: 60, speed: 72, dmg: 10, r: 15, body: '#5d7f3a', head: '#7fa356', arm: '#4f6d30', score: 10, coins: 5, cd: .8 },
  runner: { name: 'Corredor', hp: 35, speed: 150, dmg: 7, r: 12, body: '#8a8a3a', head: '#b0b060', arm: '#70702c', score: 15, coins: 5, cd: .6 },
  tank: { name: 'Tanque', hp: 300, speed: 46, dmg: 25, r: 24, body: '#4b5a3a', head: '#6b7d50', arm: '#3b4a2c', score: 40, coins: 20, cd: 1.1, abil: ['charge'] },
  spitter: { name: 'Vomitador', hp: 80, speed: 58, dmg: 8, r: 17, body: '#8a9a2a', head: '#b8c840', arm: '#6a7a20', score: 25, coins: 12, cd: .9, abil: ['spit'], ranged: true },
  dog: { name: 'Perro infectado', hp: 32, speed: 195, dmg: 8, r: 11, body: '#5a4636', head: '#6e5642', arm: '#4a3828', score: 12, coins: 4, cd: .5, dog: true },
};
const BOSSES = {
  carnicero: { name: 'El Carnicero', r: 40, body: '#6b2a2a', head: '#8f4040', arm: '#552020', speed: 70, dmg: 30, hp: 1300, abil: ['charge'] },
  alfa: { name: 'Alfa Rabioso', r: 32, dog: true, body: '#3e3024', head: '#5a4632', arm: '#2e2418', speed: 125, dmg: 22, hp: 1300, abil: ['summonDogs', 'charge'] },
  experimento: { name: 'Experimento X-13', r: 40, body: '#5a7a20', head: '#8aaa30', arm: '#4a6a18', speed: 55, dmg: 28, hp: 1800, abil: ['spit', 'summon'] },
  sargento: { name: 'Sargento Podrido', r: 42, body: '#3f4a2a', head: '#5f6a40', arm: '#2f3a1f', speed: 65, dmg: 32, hp: 2200, abil: ['charge', 'spit'] },
  sepulturero: { name: 'El Sepulturero', r: 40, body: '#3a3a44', head: '#5a5a66', arm: '#2a2a33', speed: 75, dmg: 30, hp: 2400, abil: ['summon', 'charge'] },
  rey: { name: 'Rey Zombi', r: 46, body: '#5a2a66', head: '#7f3f8f', arm: '#46204f', speed: 62, dmg: 35, hp: 3200, abil: ['summon', 'spit', 'charge'], crown: true },
};
const LEVELS = [
  { map: 'ciudad', seed: 11, goal: 20, maxAlive: 8, rate: 1.6, mix: { normal: 1 }, title: 'Primer contacto', boss: 'carnicero' },
  { map: 'ciudad', seed: 12, goal: 30, maxAlive: 12, rate: 1.2, mix: { normal: .6, runner: .25, dog: .15 }, title: 'Calles infestadas', boss: 'carnicero' },
  { map: 'bosque', seed: 21, goal: 35, maxAlive: 14, rate: 1.1, mix: { normal: .45, runner: .25, dog: .3 }, title: 'Entre los árboles', boss: 'alfa' },
  { map: 'bosque', seed: 22, goal: 40, maxAlive: 16, rate: 1.0, mix: { normal: .4, runner: .2, dog: .25, tank: .08, spitter: .07 }, title: 'La cabaña perdida', boss: 'alfa' },
  { map: 'laboratorio', seed: 31, goal: 45, maxAlive: 18, rate: .9, mix: { normal: .4, runner: .25, spitter: .2, tank: .1, dog: .05 }, title: 'Paciente cero', boss: 'experimento' },
  { map: 'laboratorio', seed: 32, goal: 50, maxAlive: 20, rate: .8, mix: { normal: .35, runner: .25, spitter: .2, tank: .15, dog: .05 }, title: 'Fuga del laboratorio', boss: 'experimento' },
  { map: 'base', seed: 51, goal: 55, maxAlive: 22, rate: .75, mix: { normal: .3, runner: .25, dog: .15, spitter: .15, tank: .15 }, title: 'Última defensa', boss: 'sargento' },
  { map: 'cementerio', seed: 41, goal: 60, maxAlive: 24, rate: .7, mix: { normal: .3, runner: .25, dog: .15, spitter: .15, tank: .15 }, title: 'Noche de difuntos', boss: 'sepulturero' },
  { map: 'cementerio', seed: 42, goal: 40, maxAlive: 22, rate: .75, mix: { normal: .3, runner: .25, dog: .15, spitter: .15, tank: .15 }, title: 'El Rey Zombi', boss: 'rey', final: true },
];
const ARMORS = [
  { name: 'Sin armadura', max: 0, price: 0 },
  { name: 'Chaleco ligero', max: 50, price: 200 },
  { name: 'Chaleco táctico', max: 100, price: 450 },
  { name: 'Armadura pesada', max: 150, price: 800, reduce: .15 },
];
const ALLY_INFO = [{ name: 'Diego', color: '#a8642a' }, { name: 'Marta', color: '#8a3a9a' }];

/* ---------- progreso guardado ---------- */
let unlocked = 0;
try { unlocked = parseInt(localStorage.getItem('zonaMuerta_nivel') || '0', 10) || 0; } catch (e) { }
function saveProgress() { try { localStorage.setItem('zonaMuerta_nivel', String(unlocked)); } catch (e) { } persist(); }
const save = { coins: 0, owned: [0], armorTier: 0, hpUp: 0, medkit: 1, adren: 1, allies: 0 };
try { Object.assign(save, JSON.parse(localStorage.getItem('zonaMuerta_save') || '{}')); } catch (e) { }
function persist() { try { localStorage.setItem('zonaMuerta_save', JSON.stringify(save)); } catch (e) { } }
const settings = { autoAim: true };
try { const s = localStorage.getItem('zonaMuerta_auto'); if (s !== null) settings.autoAim = s === '1'; } catch (e) { }
function toggleAutoAim() { settings.autoAim = !settings.autoAim; G.target = null; try { localStorage.setItem('zonaMuerta_auto', settings.autoAim ? '1' : '0'); } catch (e) { } }

const SHOP_GEAR = [
  { id: 'hp', name: 'Vida máxima +25', desc: 'Más resistencia en cada nivel.', price: () => 300 + save.hpUp * 200, can: () => save.hpUp < 3, buy: () => save.hpUp++, info: () => `Nivel ${save.hpUp}/3` },
  { id: 'medkit', name: 'Botiquín (Q)', desc: 'Cura 50 de vida cuando quieras.', price: () => 60, can: () => save.medkit < 9, buy: () => save.medkit++, info: () => `Tienes ${save.medkit}` },
  { id: 'adren', name: 'Adrenalina (E)', desc: '10 s: más rápido, energía infinita y menos daño.', price: () => 80, can: () => save.adren < 9, buy: () => save.adren++, info: () => `Tienes ${save.adren}` },
  { id: 'ally', name: 'Contratar compañero', desc: 'Te sigue, dispara a los zombis y reaparece cada nivel.', price: () => 500 + save.allies * 300, can: () => save.allies < 2, buy: () => save.allies++, info: () => `${save.allies}/2` },
];

/* =========================================================
   ESTADO DEL JUEGO
   ========================================================= */
const G = {
  state: 'menu', level: 0, map: null, theme: null, mapCanvas: null, decal: null, dg: null, mini: null,
  p: null, zombies: [], bullets: [], particles: [], pickups: [], allies: [], enemyShots: [], puddles: [],
  cam: { x: 0, y: 0 }, shake: 0, flash: 0, lightFlash: 0, intro: 0, time: 0, banner: null,
  kills: 0, spawned: 0, spawnTimer: 0, score: 0, shots: 0, hits: 0, boss: null, bossPhase: false, heartT: 0, coinsLevel: 0,
  flow: null, flowFrom: -1, menuT: 0, target: null, targetT: 0, shopFrom: 'menu',
};
const keys = {};
const mouse = { x: 0, y: 0, down: false };

function loadMap(levelIdx) {
  const L = LEVELS[levelIdx], th = THEMES[L.map], rng = mulberry32(L.seed);
  const m = finalizeMap(th.gen(rng));
  G.map = m; G.theme = th; G.mapCanvas = renderMap(m, th, rng); G.mini = renderMini(m);
  G.decal = document.createElement('canvas'); G.decal.width = m.pw; G.decal.height = m.ph; G.dg = G.decal.getContext('2d');
  G.flow = new Int32Array(m.w * m.h); G.flowFrom = -1;
}
function randomFloor(minDist, from) {
  const m = G.map;
  for (let tries = 0; tries < 60; tries++) {
    const i = m.reach[Math.random() * m.reach.length | 0], x = (i % m.w + .5) * T, y = (((i / m.w) | 0) + .5) * T;
    if (!from || Math.hypot(x - from.x, y - from.y) > minDist) return { x, y };
  }
  const i = m.reach[Math.random() * m.reach.length | 0]; return { x: (i % m.w + .5) * T, y: (((i / m.w) | 0) + .5) * T };
}
function bestOwned() { return Math.max(...save.owned); }
function makeAlly(i, p) {
  const info = ALLY_INFO[i];
  return { name: info.name, color: info.color, x: p.x + (i ? -34 : 34), y: p.y + 34, r: 14, hp: 150, maxHp: 150, angle: 0, cool: 0, down: false, target: null, targetT: 0, walk: 0, regenT: 0, muzzle: 0, hurtT: 0 };
}

function startLevel(idx) {
  Sfx.init();
  G.level = idx; loadMap(idx);
  const m = G.map, L = LEVELS[idx], maxArmor = ARMORS[save.armorTier].max, maxHp = 100 + save.hpUp * 25;
  G.p = {
    x: (m.sx + .5) * T, y: (m.sy + .5) * T, r: 16, hp: maxHp, maxHp, armor: maxArmor, maxArmor, stamina: 1, running: false,
    adrenT: 0, slowT: 0, acidT: 0, angle: 0, wi: bestOwned(), cool: 0, reloading: 0, muzzle: 0, walk: 0, hurtT: 0, emptyClick: false,
    ammo: WEAPONS.map(w => ({ mag: w.mag, reserve: w.reserve })),
  };
  G.zombies = []; G.bullets = []; G.particles = []; G.pickups = []; G.enemyShots = []; G.puddles = [];
  G.allies = []; for (let i = 0; i < save.allies; i++) G.allies.push(makeAlly(i, G.p));
  G.kills = 0; G.spawned = 0; G.spawnTimer = 2; G.score = 0; G.shots = 0; G.hits = 0; G.time = 0; G.coinsLevel = 0;
  G.boss = null; G.bossPhase = false; G.banner = null; G.flash = 0; G.shake = 0; G.intro = 3.2;
  for (let i = 0; i < 3; i++) { G.pickups.push(makePickup('health', randomFloor(300, G.p))); G.pickups.push(makePickup('ammo', randomFloor(300, G.p))); }
  G.pickups.push(makePickup('armor', randomFloor(300, G.p))); G.pickups.push(makePickup('adren', randomFloor(400, G.p)));
  for (let i = 0; i < 3; i++) spawnZombie(pickType(L.mix));
  G.cam.x = G.p.x - VW / 2 / Z; G.cam.y = G.p.y - VH / 2 / Z; G.target = null; touch.joy = touch.fire = null;
  G.state = 'play'; cv.classList.add('playing'); hideScreen();
}
function makePickup(type, pos, extra) { return Object.assign({ type, x: pos.x, y: pos.y, t: Math.random() * 3, life: Infinity, value: 0 }, extra || {}); }
function pickType(mix) { let r = Math.random(), acc = 0; for (const k in mix) { acc += mix[k]; if (r < acc) return k; } return 'normal'; }
function spawnZombie(type, pos, bossKey) {
  const def = bossKey ? Object.assign({ coins: 150, score: 500, cd: 1.0 }, BOSSES[bossKey]) : ZTYPES[type];
  pos = pos || randomFloor(Math.max(650, Math.min(VW, VH) / Z * 0.7), G.p);
  const lvl = G.level, hp = bossKey ? def.hp * (1 + lvl * .12) * (LEVELS[lvl].final ? 1.3 : 1) : def.hp * (1 + lvl * .06);
  const z = {
    type: bossKey ? 'boss' : type, t: def, x: pos.x, y: pos.y, r: def.r, hp, maxHp: hp, speed: def.speed * (bossKey ? 1 : rand(.9, 1.1)),
    angle: 0, walk: Math.random() * 10, atk: 0, hit: 0, kx: 0, ky: 0, groan: rand(1, 6), burn: 0,
    state: null, stateT: 0, chargeCD: rand(2, 5), spitCD: rand(1.5, 3), sumCD: 6, dashA: 0, dashHit: false,
  };
  G.zombies.push(z); if (!bossKey) G.spawned++;
  return z;
}
function spawnGroup(type) { // los perros llegan en manada
  if (type !== 'dog') return spawnZombie(type);
  const c = randomFloor(Math.max(650, Math.min(VW, VH) / Z * 0.7), G.p), n = 2 + (Math.random() * 2 | 0);
  for (let i = 0; i < n; i++) { const z = spawnZombie('dog', { x: c.x + rand(-20, 20), y: c.y + rand(-20, 20) }); collide(z); }
}

/* ---------- colisiones con el mapa ---------- */
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
function lineOfSight(x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 16);
  for (let i = 1; i < n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (solid(Math.floor(x / T), Math.floor(y / T))) return false; }
  return true;
}

/* ---------- camino de los zombis (mapa de distancias al jugador) ---------- */
function computeFlow() {
  const m = G.map, p = G.p, start = Math.floor(p.y / T) * m.w + Math.floor(p.x / T);
  if (start === G.flowFrom) return; G.flowFrom = start;
  const f = G.flow; f.fill(-1); if (m.t[start] !== 0) return;
  const q = new Int32Array(m.w * m.h); let h = 0, tl = 0; q[tl++] = start; f[start] = 0;
  while (h < tl) {
    const i = q[h++], x = i % m.w, y = (i / m.w) | 0, d = f[i] + 1;
    if (x > 0 && m.t[i - 1] === 0 && f[i - 1] < 0) { f[i - 1] = d; q[tl++] = i - 1; }
    if (x < m.w - 1 && m.t[i + 1] === 0 && f[i + 1] < 0) { f[i + 1] = d; q[tl++] = i + 1; }
    if (y > 0 && m.t[i - m.w] === 0 && f[i - m.w] < 0) { f[i - m.w] = d; q[tl++] = i - m.w; }
    if (y < m.h - 1 && m.t[i + m.w] === 0 && f[i + m.w] < 0) { f[i + m.w] = d; q[tl++] = i + m.w; }
  }
}
function flowTarget(z) {
  const m = G.map, tx = Math.floor(z.x / T), ty = Math.floor(z.y / T), cur = G.flow[ty * m.w + tx];
  if (cur === undefined || cur < 0) return null;
  let best = cur, bx = -1, by = -1;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue; const nx = tx + dx, ny = ty + dy;
    if (solid(nx, ny)) continue;
    if (dx && dy && (solid(tx + dx, ty) || solid(tx, ty + dy))) continue;
    const v = G.flow[ny * m.w + nx]; if (v >= 0 && v < best) { best = v; bx = nx; by = ny; }
  }
  return bx < 0 ? null : { x: (bx + .5) * T, y: (by + .5) * T };
}

/* =========================================================
   ACCIONES
   ========================================================= */
function screenToWorld() { return { x: mouse.x / Z + G.cam.x, y: mouse.y / Z + G.cam.y }; }
function spatial(x, y, range) { const dx = x - G.p.x, d = Math.hypot(dx, y - G.p.y); return { pan: clamp(dx / 700, -1, 1), vol: clamp(1 - d / (range || 1100), 0, 1) }; }
function blood(x, y, n, spd, col) {
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = rand(30, spd); G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.3, .7), max: .7, color: col || '#8a0e0e', size: rand(2, 4), stain: !col }); }
}
function stain(x, y, r, col) { const g = G.dg; g.fillStyle = col || 'rgba(110,8,8,.55)'; for (let i = 0; i < 6; i++) circle(g, x + rand(-r, r) * .6, y + rand(-r, r) * .6, rand(r * .3, r * .7)); }
function ownedWeapon(i) { return save.owned.includes(i); }

function tryShoot() {
  const p = G.p, w = WEAPONS[p.wi], a = p.ammo[p.wi];
  if (p.reloading > 0 || p.cool > 0) return;
  if (a.mag <= 0) { if (!p.emptyClick) { Sfx.empty(); p.emptyClick = true; } startReload(); p.cool = .25; return; }
  a.mag--; p.cool = w.rate; p.muzzle = w.flame ? 0 : .06; G.shake = Math.max(G.shake, w.shake); if (!w.flame) G.lightFlash = .07;
  if (w.flame) Sfx.flame(); else if (w.grenade) Sfx.launch(); else Sfx.shoot(w.id === 'sniper' ? 'shotgun' : w.id === 'minigun' ? 'rifle' : w.id);
  const ca = Math.cos(p.angle), sa = Math.sin(p.angle), tipX = p.x + ca * (p.r + w.len), tipY = p.y + sa * (p.r + w.len);
  for (let i = 0; i < w.pellets; i++) {
    const ang = p.angle + (Math.random() - .5) * w.spread * 2, sp = w.speed * rand(.9, 1.1);
    const b = { x: tipX, y: tipY, px: tipX, py: tipY, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, dmg: w.dmg, life: .6, knock: w.knock, kind: 'bullet', pierce: w.pierce || 0, hit: null, age: 0 };
    if (w.flame) { b.kind = 'flame'; b.life = rand(.32, .42); b.hit = new Set(); }
    if (w.grenade) {
      b.kind = 'grenade'; let dist = 420;
      if (G.target) dist = Math.hypot(G.target.x - p.x, G.target.y - p.y); else if (!TOUCH) { const mw = screenToWorld(); dist = Math.hypot(mw.x - p.x, mw.y - p.y); }
      b.life = clamp(dist / sp, .2, 1.1);
    }
    if (b.pierce) b.hit = new Set();
    G.bullets.push(b); G.shots++;
  }
  if (!w.flame && !w.grenade) { const sa2 = p.angle + Math.PI / 2; G.particles.push({ x: p.x, y: p.y, vx: Math.cos(sa2) * rand(80, 150), vy: Math.sin(sa2) * rand(80, 150), life: .8, max: .8, color: '#d9ab45', size: 3, shell: true }); }
  if (a.mag === 0) startReload();
}
function startReload() {
  const p = G.p, w = WEAPONS[p.wi], a = p.ammo[p.wi];
  if (p.reloading > 0 || a.mag >= w.mag || a.reserve <= 0) return;
  p.reloading = w.reload; Sfx.reload(w.reload);
}
function switchWeapon(i) {
  const p = G.p; if (!p || i === p.wi || i < 0 || i >= WEAPONS.length || !ownedWeapon(i)) return;
  p.wi = i; p.reloading = 0; p.cool = .25; Sfx.switchW();
}
function cycleWeapon(dir) {
  const n = WEAPONS.length; let i = G.p.wi;
  for (let k = 0; k < n; k++) { i = (i + (dir > 0 ? 1 : n - 1)) % n; if (ownedWeapon(i)) break; }
  switchWeapon(i);
}
function toggleRun() { const p = G.p; if (!p) return; if (!p.running && p.stamina < .1 && p.adrenT <= 0) return; p.running = !p.running; }
function useMedkit() { const p = G.p; if (!p || save.medkit <= 0 || p.hp >= p.maxHp) return; save.medkit--; p.hp = Math.min(p.maxHp, p.hp + 50); Sfx.pickup(); blood(p.x, p.y, 10, 120, '#ff7070'); }
function useAdren() { const p = G.p; if (!p || save.adren <= 0 || p.adrenT > 0) return; save.adren--; p.adrenT = 10; p.stamina = 1; p.hp = Math.min(p.maxHp, p.hp + 10); Sfx.adren(); }

function damagePlayer(dmg, from, quiet) {
  const p = G.p; if (G.state !== 'play') return;
  if (p.adrenT > 0) dmg *= .7;
  if (p.armor > 0) { const ab = Math.min(p.armor, dmg * .7); p.armor -= ab; dmg -= ab; dmg *= 1 - (ARMORS[save.armorTier].reduce || 0); Sfx.armor(); }
  p.hp -= dmg; p.hurtT = .3; G.flash = Math.max(G.flash, quiet ? .25 : .55);
  if (!quiet) {
    G.shake = Math.max(G.shake, 9); Sfx.hurt(); blood(p.x, p.y, 10, 160); stain(p.x, p.y, 14);
    if (from) { const a = Math.atan2(p.y - from.y, p.x - from.x); p.x += Math.cos(a) * 10; p.y += Math.sin(a) * 10; collide(p); }
  }
  if (p.hp <= 0) { p.hp = 0; gameOver(); }
}
function damageAlly(a, dmg) {
  if (a.down) return; a.hp -= dmg; a.hurtT = .25; a.regenT = 4; blood(a.x, a.y, 5, 120);
  if (a.hp <= 0) { a.down = true; a.hp = 0; stain(a.x, a.y, 16); G.banner = { title: '¡' + a.name + ' cayó!', sub: 'Volverá en el siguiente nivel', t: 2.2, small: true }; Sfx.hurt(); }
}
function hitVictim(v, dmg, from) { if (v === G.p) damagePlayer(dmg, from); else damageAlly(v, dmg); }

function spit(z, v, n) {
  const s = spatial(z.x, z.y, 1300); Sfx.vomit(s.pan, s.vol);
  const lead = .35, tx = v.x + (v === G.p && G.p.lastVx ? G.p.lastVx * lead : 0), ty = v.y + (v === G.p && G.p.lastVy ? G.p.lastVy * lead : 0);
  const base = Math.atan2(ty - z.y, tx - z.x), dist = Math.min(520, Math.hypot(tx - z.x, ty - z.y));
  for (let i = 0; i < n; i++) {
    const a = base + (i - (n - 1) / 2) * .28, sp = 330;
    G.enemyShots.push({ x: z.x + Math.cos(a) * z.r, y: z.y + Math.sin(a) * z.r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: dist / sp + .05, dmg: z.type === 'boss' ? 14 : 10, t: 0 });
  }
}
function addPuddle(x, y, r) { G.puddles.push({ x, y, r: r || 42, life: 5, max: 5 }); }
function explode(x, y, dmg, radius) {
  Sfx.explode(); G.shake = Math.max(G.shake, 14); G.lightFlash = .15;
  for (let i = 0; i < 40; i++) { const a = Math.random() * TAU, s = rand(60, 420); G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.3, .7), max: .7, color: ['#ffd27a', '#ff8a2a', '#ff4a1a', '#555'][i % 4], size: rand(3, 7), glow: true }); }
  const g = G.dg; g.fillStyle = 'rgba(20,15,10,.6)'; for (let i = 0; i < 8; i++) circle(g, x + rand(-30, 30), y + rand(-30, 30), rand(15, 35));
  for (const z of G.zombies) {
    const d = Math.hypot(z.x - x, z.y - y); if (d > radius + z.r) continue;
    const k = 1 - Math.min(1, d / radius) * .6; z.hp -= dmg * k; z.hit = .1; G.hits++;
    if (z.type !== 'boss') { const a = Math.atan2(z.y - y, z.x - x); z.kx += Math.cos(a) * 420 * k; z.ky += Math.sin(a) * 420 * k; }
  }
}
function killZombie(z) {
  const s = spatial(z.x, z.y); Sfx.zdie(s.pan, s.vol);
  blood(z.x, z.y, 18, 220); stain(z.x, z.y, z.r * 1.6);
  const g = G.dg; g.save(); g.translate(z.x, z.y); g.rotate(z.angle); g.fillStyle = z.t.dog ? 'rgba(60,45,30,.75)' : 'rgba(40,55,25,.75)'; g.beginPath(); g.ellipse(0, 0, z.r * 1.2, z.r * .8, 0, 0, TAU); g.fill(); g.restore();
  G.score += z.t.score;
  // monedas
  const n = z.type === 'boss' ? 15 : 1, val = Math.round(z.t.coins / n);
  for (let i = 0; i < n; i++) G.pickups.push(makePickup('coin', { x: z.x + rand(-z.r, z.r), y: z.y + rand(-z.r, z.r) }, { value: val, life: 30 }));
  if (z.type === 'boss') { G.boss = null; G.shake = 25; for (let i = 0; i < 4; i++) stain(z.x + rand(-40, 40), z.y + rand(-40, 40), 40); levelComplete(); return; }
  G.kills++;
  const r = Math.random();
  if (r < .06) G.pickups.push(makePickup('health', z, { life: 20 }));
  else if (r < .16) G.pickups.push(makePickup('ammo', z, { life: 20 }));
  else if (r < .2) G.pickups.push(makePickup('armor', z, { life: 20 }));
  else if (r < .23) G.pickups.push(makePickup('adren', z, { life: 20 }));
  if (z.type === 'spitter') addPuddle(z.x, z.y, 34);
  const L = LEVELS[G.level];
  if (!G.bossPhase && G.kills >= L.goal) startBossPhase();
}
function startBossPhase() {
  const L = LEVELS[G.level], p = G.p; G.bossPhase = true;
  let far = null, fd = 0; for (let k = 0; k < 40; k++) { const c = randomFloor(0); const d = Math.hypot(c.x - p.x, c.y - p.y); if (d > fd) { fd = d; far = c; } }
  G.boss = spawnZombie(null, far, L.boss);
  G.banner = { title: L.final ? '¡JEFE FINAL!' : '¡APARECIÓ EL JEFE!', sub: BOSSES[L.boss].name, t: 3.2 };
  Sfx.bossIntro(); G.shake = 14;
}

/* =========================================================
   ACTUALIZACIÓN
   ========================================================= */
function update(dt) {
  const p = G.p, L = LEVELS[G.level];
  G.time += dt; G.intro = Math.max(0, G.intro - dt); if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  // --- movimiento del jugador ---
  let dx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let dy = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  if (touch.joy) { const jx = (touch.joy.x - touch.joy.ox) / 60, jy = (touch.joy.y - touch.joy.oy) / 60; if (Math.hypot(jx, jy) > .15) { dx = jx; dy = jy; } }
  let mv = Math.hypot(dx, dy); if (mv > 1) { dx /= mv; dy /= mv; mv = 1; }
  const adren = p.adrenT > 0; if (adren) p.adrenT -= dt;
  // correr: se activa con un botón; si se acaba la energía vuelve a caminar
  if (p.running && mv > .1 && !adren) p.stamina -= .28 * dt; else if (!p.running || mv <= .1) p.stamina = Math.min(1, p.stamina + .2 * dt);
  if (adren) p.stamina = 1;
  if (p.stamina <= 0) { p.stamina = 0; p.running = false; }
  p.slowT -= dt;
  const spd = 200 * (p.running ? 1.6 : 1) * (adren ? 1.25 : 1) * (p.slowT > 0 ? .55 : 1);
  const ox0 = p.x, oy0 = p.y;
  p.x += dx * spd * dt; p.y += dy * spd * dt; collide(p);
  p.lastVx = (p.x - ox0) / dt; p.lastVy = (p.y - oy0) / dt;
  if (mv) p.walk += dt * (p.running ? 16 : 10);
  // --- apuntar ---
  G.targetT -= dt;
  if (G.targetT <= 0 || (G.target && G.target.hp <= 0)) { G.targetT = .1; G.target = settings.autoAim ? findTarget(p, Math.min(700, Math.max(VW, VH) / Z * .6)) : null; }
  const fireAim = touchAimAngle();
  let desired;
  if (fireAim !== null) desired = fireAim;
  else if (G.target) desired = Math.atan2(G.target.y - p.y, G.target.x - p.x);
  else if (TOUCH) desired = mv ? Math.atan2(dy, dx) : p.angle;
  else { const mw = screenToWorld(); desired = Math.atan2(mw.y - p.y, mw.x - p.x); }
  if (TOUCH || G.target) p.angle += angDiff(desired, p.angle) * Math.min(1, dt * 20); else p.angle = desired;
  p.cool -= dt; p.muzzle -= dt; p.hurtT -= dt;
  if (p.reloading > 0) {
    p.reloading -= dt;
    if (p.reloading <= 0) { const w = WEAPONS[p.wi], a = p.ammo[p.wi], take = Math.min(w.mag - a.mag, a.reserve); a.mag += take; a.reserve -= take; p.reloading = 0; }
  }
  if (mouse.down || touch.fire) tryShoot();
  if (p.hp < p.maxHp * .3) { G.heartT -= dt; if (G.heartT <= 0) { Sfx.heart(); G.heartT = .6 + p.hp / 60; } }

  computeFlow();

  // --- aparición de zombis ---
  G.spawnTimer -= dt;
  const cap = G.bossPhase ? Math.ceil(L.maxAlive * .5) : L.maxAlive;
  const canSpawn = G.bossPhase || G.spawned < L.goal;
  if (canSpawn && G.spawnTimer <= 0 && G.zombies.length < cap) { spawnGroup(pickType(L.mix)); G.spawnTimer = L.rate * (G.bossPhase ? 1.6 : 1) * rand(.6, 1.4); }

  updateZombies(dt);
  if (G.state !== 'play') return;
  updateAllies(dt);
  updateBullets(dt);
  for (let i = G.zombies.length - 1; i >= 0; i--) if (G.zombies[i].hp <= 0) { const z = G.zombies[i]; G.zombies.splice(i, 1); if (G.target === z) G.target = null; killZombie(z); if (G.state !== 'play') return; }
  updateEnemyShots(dt);
  if (G.state !== 'play') return;

  // --- partículas ---
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const q = G.particles[i]; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.pow(.02, dt); q.vy *= Math.pow(.02, dt); q.life -= dt;
    if (q.life <= 0) {
      if (q.stain) { G.dg.fillStyle = 'rgba(110,8,8,.5)'; circle(G.dg, q.x, q.y, q.size); }
      if (q.shell) { G.dg.fillStyle = 'rgba(190,150,60,.7)'; G.dg.fillRect(q.x, q.y, 3, 2); }
      G.particles.splice(i, 1);
    }
  }
  // --- objetos ---
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const k = G.pickups[i]; k.t += dt; k.life -= dt;
    if (k.life <= 0) { G.pickups.splice(i, 1); continue; }
    const d = Math.hypot(k.x - p.x, k.y - p.y);
    if (k.type === 'coin' && d < 120) { const a = Math.atan2(p.y - k.y, p.x - k.x), s = 420 * (1 - d / 140); k.x += Math.cos(a) * s * dt; k.y += Math.sin(a) * s * dt; }
    if (d < 34) {
      if (k.type === 'coin') { save.coins += k.value; G.coinsLevel += k.value; Sfx.coin(); G.pickups.splice(i, 1); continue; }
      if (k.type === 'health') { if (p.hp >= p.maxHp) continue; p.hp = Math.min(p.maxHp, p.hp + 35); }
      else if (k.type === 'armor') { const capA = Math.max(p.maxArmor, 50); if (p.armor >= capA) continue; p.armor = Math.min(capA, p.armor + 40); }
      else if (k.type === 'adren') { if (save.adren >= 9) continue; save.adren++; }
      else WEAPONS.forEach((w, wi) => { if (w.give) p.ammo[wi].reserve += w.give; });
      Sfx.pickup(); G.pickups.splice(i, 1);
    }
  }
  // --- charcos de ácido ---
  for (let i = G.puddles.length - 1; i >= 0; i--) {
    const pu = G.puddles[i]; pu.life -= dt; if (pu.life <= 0) { G.puddles.splice(i, 1); continue; }
    if (Math.hypot(p.x - pu.x, p.y - pu.y) < pu.r + p.r * .5) { p.acidT += dt; p.slowT = Math.max(p.slowT, .3); if (p.acidT >= .5) { p.acidT = 0; damagePlayer(6, null, true); if (G.state !== 'play') return; } }
    for (const a of G.allies) if (!a.down && Math.hypot(a.x - pu.x, a.y - pu.y) < pu.r) damageAlly(a, 10 * dt);
  }
  G.shake = Math.max(0, G.shake - dt * 30); G.flash = Math.max(0, G.flash - dt); G.lightFlash -= dt;
  updateCamera(dt);
}
function angDiff(a, b) { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; }

function updateZombies(dt) {
  const p = G.p, zs = G.zombies;
  for (const z of zs) {
    // ¿a quién persigue? (jugador o compañero cercano)
    let v = p, dist = Math.hypot(p.x - z.x, p.y - z.y);
    for (const a of G.allies) if (!a.down) { const d = Math.hypot(a.x - z.x, a.y - z.y); if (d < dist && d < T * 3.5) { dist = d; v = a; } }
    if (z.burn > 0) { z.burn -= dt; z.hp -= 12 * dt; if (Math.random() < dt * 12) G.particles.push({ x: z.x + rand(-z.r, z.r), y: z.y + rand(-z.r, z.r), vx: rand(-20, 20), vy: rand(-60, -20), life: .4, max: .4, color: '#ff8a2a', size: rand(3, 5), glow: true }); }
    z.hit -= dt; z.atk -= dt; z.walk += dt * z.speed * .08;
    const ab = z.t.abil || [];
    if (z.state === 'wind') { // se prepara para embestir
      z.stateT -= dt; z.angle += angDiff(Math.atan2(v.y - z.y, v.x - z.x), z.angle) * Math.min(1, dt * 6);
      if (z.stateT <= 0) { z.state = 'dash'; z.stateT = .75; z.dashA = Math.atan2(v.y - z.y, v.x - z.x); z.dashHit = false; }
    } else if (z.state === 'dash') { // embestida
      const sp = z.type === 'boss' ? 400 : 440, ex = Math.cos(z.dashA) * sp * dt, ey = Math.sin(z.dashA) * sp * dt, bx = z.x, by = z.y;
      z.x += ex; z.y += ey; collide(z); z.stateT -= dt; z.angle = z.dashA;
      if (Math.random() < .5) G.particles.push({ x: z.x, y: z.y, vx: -ex * 8, vy: -ey * 8, life: .3, max: .3, color: 'rgba(120,100,80,.6)', size: rand(4, 8) });
      const moved = Math.hypot(z.x - bx, z.y - by);
      if (!z.dashHit && Math.hypot(v.x - z.x, v.y - z.y) < z.r + v.r + 6) {
        z.dashHit = true; hitVictim(v, z.t.dmg * 1.4, z); if (G.state !== 'play') return;
        if (v === p) { p.x += Math.cos(z.dashA) * 40; p.y += Math.sin(z.dashA) * 40; collide(p); G.shake = 16; }
      }
      if (moved < sp * dt * .35) { z.state = 'stun'; z.stateT = .8; const s = spatial(z.x, z.y); if (s.vol > .4) G.shake = Math.max(G.shake, 6); }
      else if (z.stateT <= 0) z.state = null;
      continue;
    } else if (z.state === 'stun') { z.stateT -= dt; if (z.stateT <= 0) z.state = null; }
    else {
      // movimiento normal
      let tx = v.x, ty = v.y;
      if (v === p && dist > T * 2.2) { const ft = flowTarget(z); if (ft) { tx = ft.x; ty = ft.y; } }
      let vx = tx - z.x, vy = ty - z.y; const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
      let speed = z.speed;
      if (z.t.ranged && dist < 330 && lineOfSightCached(z, v)) { // el vomitador guarda distancia
        if (dist < 210) { vx = -vx; vy = -vy; speed *= .8; } else { const s = Math.sin(G.time + z.walk) > 0 ? 1 : -1; const ox = -vy * s, oy = vx * s; vx = ox * .5; vy = oy * .5; }
      }
      if (z.t.dog && dist < 140) speed *= 1.5; // los perros se lanzan
      for (const o of zs) {
        if (o === z) continue; const sx = z.x - o.x, sy = z.y - o.y, sd = Math.hypot(sx, sy), min = z.r + o.r;
        if (sd < min && sd > .01) { const push = (min - sd) / min; vx += sx / sd * push * 1.5; vy += sy / sd * push * 1.5; }
      }
      z.x += (vx * speed + z.kx) * dt; z.y += (vy * speed + z.ky) * dt;
      z.kx *= Math.pow(.002, dt); z.ky *= Math.pow(.002, dt);
      collide(z);
      const face = z.t.ranged && dist < 330 ? Math.atan2(v.y - z.y, v.x - z.x) : Math.atan2(vy, vx);
      z.angle += angDiff(face, z.angle) * Math.min(1, dt * 8);
      // ataques especiales
      if (ab.includes('charge')) { z.chargeCD -= dt; if (z.chargeCD <= 0 && dist > 130 && dist < 480 && lineOfSight(z.x, z.y, v.x, v.y)) { z.state = 'wind'; z.stateT = z.type === 'boss' ? .7 : .6; z.chargeCD = rand(5, 8); const s = spatial(z.x, z.y, 1400); Sfx.charge(s.pan, s.vol); } }
      if (ab.includes('spit')) { z.spitCD -= dt; if (z.spitCD <= 0 && dist < 480 && lineOfSight(z.x, z.y, v.x, v.y)) { spit(z, v, z.type === 'boss' ? 3 : 1); z.spitCD = z.type === 'boss' ? 3 : rand(2.5, 3.5); } }
      if (ab.includes('summon') || ab.includes('summonDogs')) {
        z.sumCD -= dt;
        if (z.sumCD <= 0 && zs.length < 30) {
          z.sumCD = ab.includes('summonDogs') ? 9 : 8; const s = spatial(z.x, z.y, 1400); Sfx.groan(s.pan, s.vol * 1.4, true);
          for (let k = 0; k < 3; k++) { const n = spawnZombie(ab.includes('summonDogs') ? 'dog' : 'runner', { x: z.x + rand(-50, 50), y: z.y + rand(-50, 50) }); G.spawned--; collide(n); }
        }
      }
      // ataque cuerpo a cuerpo
      if (dist < z.r + v.r + 5 && z.atk <= 0) { z.atk = z.t.cd; hitVictim(v, z.t.dmg, z); if (G.state !== 'play') return; }
    }
    // sonidos (más fuertes y frecuentes)
    z.groan -= dt;
    if (z.groan <= 0) {
      z.groan = z.t.dog ? rand(2, 5) : rand(2.5, 7); const s = spatial(z.x, z.y, 1400);
      if (G.time - Sfx.lastGroan > .3 && s.vol > .04) { Sfx.lastGroan = G.time; if (z.t.dog) Sfx.bark(s.pan, s.vol * 1.1); else Sfx.groan(s.pan, s.vol * 1.35, z.type === 'boss' || z.type === 'tank'); }
    }
  }
}
function lineOfSightCached(z, v) { // evita revisar la línea de visión en cada cuadro
  z.losT = (z.losT || 0) - 1;
  if (z.losT <= 0) { z.los = lineOfSight(z.x, z.y, v.x, v.y); z.losT = 8; }
  return z.los;
}
function findTarget(from, range) {
  let best = null, bd = range;
  for (const z of G.zombies) {
    const d = Math.hypot(z.x - from.x, z.y - from.y) - z.r;
    if (d < bd && lineOfSight(from.x, from.y, z.x, z.y)) { bd = d; best = z; }
  }
  return best;
}

function updateAllies(dt) {
  const p = G.p;
  G.allies.forEach((a, i) => {
    if (a.down) return;
    a.regenT -= dt; a.hurtT -= dt; a.muzzle -= dt; if (a.regenT <= 0) a.hp = Math.min(a.maxHp, a.hp + 5 * dt);
    const dp = Math.hypot(a.x - p.x, a.y - p.y);
    if (dp > 750) { const ang = rand(0, TAU); a.x = p.x + Math.cos(ang) * 40; a.y = p.y + Math.sin(ang) * 40; collide(a); }
    // seguir al jugador (a un lado)
    const side = i ? -1 : 1, fx = p.x + Math.cos(p.angle + side * 2.2) * 55, fy = p.y + Math.sin(p.angle + side * 2.2) * 55;
    let tx = fx, ty = fy, move = Math.hypot(a.x - fx, a.y - fy) > 20;
    if (dp > T * 2.5) { const ft = flowTarget(a); if (ft) { tx = ft.x; ty = ft.y; } else { tx = p.x; ty = p.y; } move = true; }
    let vx = 0, vy = 0;
    if (move) { vx = tx - a.x; vy = ty - a.y; const l = Math.hypot(vx, vy) || 1; vx /= l; vy /= l; }
    for (const o of [p, ...G.allies]) { if (o === a || o.down) continue; const sx = a.x - o.x, sy = a.y - o.y, sd = Math.hypot(sx, sy), min = a.r + o.r + 6; if (sd < min && sd > .01) { vx += sx / sd; vy += sy / sd; } }
    const spd = (p.running ? 310 : 220) * (dp > 300 ? 1.3 : 1);
    a.x += vx * spd * dt; a.y += vy * spd * dt; collide(a); if (move) a.walk += dt * 10;
    // disparar
    a.targetT -= dt;
    if (a.targetT <= 0 || (a.target && a.target.hp <= 0)) { a.targetT = .3; a.target = findTarget(a, 480); }
    if (a.target && a.target.hp > 0) {
      const want = Math.atan2(a.target.y - a.y, a.target.x - a.x), da = angDiff(want, a.angle); a.angle += da * Math.min(1, dt * 12);
      a.cool -= dt;
      if (a.cool <= 0 && Math.abs(da) < .3) {
        a.cool = .22; a.muzzle = .05;
        const ang = a.angle + rand(-.07, .07), sp = 1400, tipX = a.x + Math.cos(a.angle) * 30, tipY = a.y + Math.sin(a.angle) * 30;
        G.bullets.push({ x: tipX, y: tipY, px: tipX, py: tipY, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, dmg: 15, life: .5, knock: 50, kind: 'bullet', ally: true, pierce: 0, hit: null, age: 0 });
        Sfx.allyShot(spatial(a.x, a.y).pan);
      }
    } else if (move) a.angle += angDiff(Math.atan2(vy, vx), a.angle) * Math.min(1, dt * 8);
  });
}

function updateBullets(dt) {
  const zs = G.zombies;
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i]; b.px = b.x; b.py = b.y; b.life -= dt; b.age += dt;
    let dead = false;
    if (b.life <= 0) { if (b.kind === 'grenade') explode(b.x, b.y, b.dmg, 115); G.bullets.splice(i, 1); continue; }
    if (b.kind === 'flame') { b.vx *= Math.pow(.25, dt); b.vy *= Math.pow(.25, dt); }
    const steps = Math.max(1, Math.ceil(Math.hypot(b.vx, b.vy) * dt / 8));
    for (let s = 0; s < steps && !dead; s++) {
      b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
      if (solid(Math.floor(b.x / T), Math.floor(b.y / T))) {
        dead = true;
        if (b.kind === 'grenade') explode(b.x - b.vx * dt / steps, b.y - b.vy * dt / steps, b.dmg, 115);
        else if (b.kind === 'bullet') for (let k = 0; k < 5; k++) { const a = Math.random() * TAU; G.particles.push({ x: b.x, y: b.y, vx: Math.cos(a) * rand(50, 200), vy: Math.sin(a) * rand(50, 200), life: .2, max: .2, color: '#ffd27a', size: 2 }); }
        break;
      }
      for (const z of zs) {
        if (z.hp <= 0 || (b.hit && b.hit.has(z))) continue;
        const rr2 = b.kind === 'flame' ? z.r + 8 + b.age * 30 : z.r;
        if ((b.x - z.x) ** 2 + (b.y - z.y) ** 2 >= rr2 * rr2) continue;
        if (b.kind === 'grenade') { explode(b.x, b.y, b.dmg, 115); dead = true; break; }
        z.hp -= b.dmg; z.hit = .08; if (!b.ally) G.hits++;
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
    if (!done && (s.life <= 0 || solid(Math.floor(s.x / T), Math.floor(s.y / T)))) done = true;
    if (done) {
      const bx = solid(Math.floor(s.x / T), Math.floor(s.y / T)) ? s.x - s.vx * .05 : s.x, by = solid(Math.floor(s.x / T), Math.floor(s.y / T)) ? s.y - s.vy * .05 : s.y;
      addPuddle(bx, by, 38); blood(bx, by, 8, 120, '#9acd32'); G.enemyShots.splice(i, 1);
    }
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
function drawDog(z, r, body, head) {
  const step = Math.sin(z.walk * 1.6) * r * .35;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(3, 4, r * 1.5, r * .8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = z.t.arm; // patas
  ctx.fillRect(r * .5 + step, -r * .85, r * .45, r * .3); ctx.fillRect(r * .5 - step, r * .55, r * .45, r * .3);
  ctx.fillRect(-r * .9 - step, -r * .85, r * .45, r * .3); ctx.fillRect(-r * .9 + step, r * .55, r * .45, r * .3);
  ctx.strokeStyle = body; ctx.lineWidth = r * .25; ctx.beginPath(); ctx.moveTo(-r * 1.2, 0); ctx.lineTo(-r * 1.8, Math.sin(z.walk * 2) * r * .4); ctx.stroke(); // cola
  ctx.fillStyle = z.hit > 0 ? '#fff' : body; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.35, r * .7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(120,20,20,.6)'; circle(ctx, -r * .3, r * .2, r * .25);
  ctx.fillStyle = z.hit > 0 ? '#fff' : head; circle(ctx, r * 1.25, 0, r * .6);
  ctx.beginPath(); ctx.moveTo(r * 1.0, -r * .4); ctx.lineTo(r * .8, -r * .85); ctx.lineTo(r * 1.3, -r * .5); ctx.fill(); // orejas
  ctx.beginPath(); ctx.moveTo(r * 1.0, r * .4); ctx.lineTo(r * .8, r * .85); ctx.lineTo(r * 1.3, r * .5); ctx.fill();
  ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.ellipse(r * 1.75, 0, r * .3, r * .25, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ff2a1a'; circle(ctx, r * 1.45, -r * .22, r * .12); circle(ctx, r * 1.45, r * .22, r * .12);
}
function drawZombie(z) {
  const r = z.r, sway = Math.sin(z.walk) * r * .25, t = z.t;
  let ox = 0, oy = 0; if (z.state === 'wind') { ox = rand(-2, 2); oy = rand(-2, 2); }
  ctx.save(); ctx.translate(z.x + ox, z.y + oy); ctx.rotate(z.angle);
  if (z.state === 'wind' || z.state === 'dash') { ctx.fillStyle = 'rgba(255,40,20,.35)'; circle(ctx, 0, 0, r * 1.45); }
  if (z.burn > 0) { ctx.fillStyle = 'rgba(255,120,30,.3)'; circle(ctx, 0, 0, r * 1.3); }
  if (t.dog) drawDog(z, r, t.body, t.head);
  else {
    ctx.fillStyle = 'rgba(0,0,0,.35)'; circle(ctx, 4, 4, r);
    ctx.fillStyle = t.arm; ctx.fillRect(r * .1, -r * .95 + sway, r * 1.15, r * .38); ctx.fillRect(r * .1, r * .57 - sway, r * 1.15, r * .38);
    ctx.fillStyle = z.hit > 0 ? '#fff' : t.body; circle(ctx, 0, 0, z.type === 'spitter' ? r * 1.08 : r);
    if (z.type === 'spitter') { ctx.fillStyle = 'rgba(200,230,60,.6)'; circle(ctx, -r * .35, -r * .35, r * .3); circle(ctx, -r * .2, r * .45, r * .25); }
    ctx.fillStyle = z.hit > 0 ? '#fff' : t.head; circle(ctx, r * .18, 0, r * .6);
    ctx.fillStyle = 'rgba(90,0,0,.5)'; circle(ctx, -r * .4, r * .3, r * .22);
    ctx.fillStyle = '#ff2a1a'; circle(ctx, r * .5, -r * .22, r * .12); circle(ctx, r * .5, r * .22, r * .12);
    if (z.type === 'spitter') { ctx.fillStyle = '#b6e33a'; circle(ctx, r * .78, 0, r * .18); }
    if (t.crown) { ctx.fillStyle = '#ffcc33'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-r * .2, i * r * .3 - 6); ctx.lineTo(-r * .55, i * r * .3); ctx.lineTo(-r * .2, i * r * .3 + 6); ctx.fill(); } }
  }
  ctx.restore();
  if (z.hp < z.maxHp && z.type !== 'boss') {
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(z.x - r, z.y - r - 10, r * 2, 4);
    ctx.fillStyle = '#e33'; ctx.fillRect(z.x - r, z.y - r - 10, r * 2 * Math.max(0, z.hp / z.maxHp), 4);
  }
}
function drawSoldier(e, body, gunLen, gunW, label) {
  const r = e.r, step = Math.sin(e.walk) * 3;
  ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; circle(ctx, 4, 4, r);
  ctx.fillStyle = '#222'; ctx.fillRect(r * .3, -3, r + gunLen, gunW);
  ctx.fillStyle = '#d9a77a'; circle(ctx, r * .9, -4 + step * .3, 4.5); circle(ctx, r * .5, 6, 4.5);
  ctx.fillStyle = e.hurtT > 0 ? '#ff6060' : body; circle(ctx, 0, 0, r);
  ctx.fillStyle = '#4d3a2a'; circle(ctx, -1, 0, r * .62);
  if (e.muzzle > 0) { const mx = r + gunLen + 6; ctx.fillStyle = '#fff3a0'; circle(ctx, mx, 0, 7); ctx.fillStyle = '#ffae30'; circle(ctx, mx, 0, 4); }
  ctx.restore();
  if (label) {
    ctx.font = 'bold 11px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(label, e.x, e.y - r - 12);
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(e.x - 16, e.y - r - 9, 32, 4); ctx.fillStyle = '#4fdf6f'; ctx.fillRect(e.x - 16, e.y - r - 9, 32 * e.hp / e.maxHp, 4);
  }
}
function drawPlayer() {
  const p = G.p, w = WEAPONS[p.wi];
  if (p.adrenT > 0) { ctx.fillStyle = `rgba(255,220,60,${.18 + Math.sin(G.time * 10) * .08})`; circle(ctx, p.x, p.y, p.r + 10); }
  if (p.armor > 0) { ctx.strokeStyle = 'rgba(120,180,255,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 3, 0, TAU); ctx.stroke(); }
  drawSoldier(p, '#2f5d8a', w.len, w.id === 'shotgun' || w.id === 'minigun' || w.id === 'flame' ? 8 : 6, null);
  if (p.muzzle > 0) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    const mx = p.r + w.len + 6; ctx.fillStyle = '#fff3a0'; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, rr2 = i % 2 ? 5 : 14; ctx.lineTo(mx + Math.cos(a) * rr2 * 1.3, Math.sin(a) * rr2 * .8); }
    ctx.fill(); ctx.restore();
  }
}
function drawPickup(k) {
  if (k.life < 5 && Math.floor(k.t * 8) % 2) return;
  const bob = Math.sin(k.t * 4) * 3;
  ctx.save(); ctx.translate(k.x, k.y + bob);
  if (k.type === 'coin') {
    ctx.fillStyle = '#b8860b'; circle(ctx, 1, 1, 8); ctx.fillStyle = '#ffd34d'; circle(ctx, 0, 0, 8);
    ctx.fillStyle = '#fff6b0'; ctx.fillRect(-1.5, -5, 3, 10); ctx.restore(); return;
  }
  const glow = { health: 'rgba(255,80,80,.25)', ammo: 'rgba(255,220,80,.25)', armor: 'rgba(90,160,255,.3)', adren: 'rgba(255,240,80,.3)' }[k.type];
  ctx.fillStyle = glow; circle(ctx, 0, 0, 22 + Math.sin(k.t * 6) * 3);
  if (k.type === 'health') {
    ctx.fillStyle = '#f2f2f2'; rr(ctx, -13, -11, 26, 22, 4); ctx.fill();
    ctx.fillStyle = '#d42020'; ctx.fillRect(-3, -8, 6, 16); ctx.fillRect(-8, -3, 16, 6);
  } else if (k.type === 'armor') {
    ctx.fillStyle = '#3a6ab0'; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(12, -8); ctx.lineTo(10, 6); ctx.lineTo(0, 14); ctx.lineTo(-10, 6); ctx.lineTo(-12, -8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#9cc4ff'; ctx.fillRect(-2, -8, 4, 16);
  } else if (k.type === 'adren') {
    ctx.rotate(-.6); ctx.fillStyle = '#ddd'; ctx.fillRect(-12, -4, 18, 8); ctx.fillStyle = '#ffd400'; ctx.fillRect(-10, -3, 12, 6);
    ctx.fillStyle = '#999'; ctx.fillRect(6, -1, 8, 2); ctx.fillRect(-15, -5, 3, 10);
  } else {
    ctx.fillStyle = '#4c5a2a'; rr(ctx, -14, -10, 28, 20, 3); ctx.fill();
    ctx.fillStyle = '#e0b040'; for (let i = 0; i < 4; i++) ctx.fillRect(-10 + i * 6, -6, 4, 12);
  }
  ctx.restore();
}
function drawTargetMark(z) {
  const r = z.r + 8, a = G.time * 3, k = 7;
  ctx.save(); ctx.translate(z.x, z.y); ctx.rotate(a); ctx.strokeStyle = 'rgba(255,60,60,.9)'; ctx.lineWidth = 2.5;
  for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(r - k, -r); ctx.lineTo(r, -r); ctx.lineTo(r, -r + k); ctx.stroke(); }
  ctx.restore();
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
    // las explosiones y el fuego también iluminan
    for (const q of G.particles) if (q.glow) { const x = (q.x - G.cam.x) * Z, y = (q.y - G.cam.y) * Z; lg.fillStyle = 'rgba(0,0,0,.25)'; lg.beginPath(); lg.arc(x, y, 30 * Z, 0, TAU); lg.fill(); }
    lg.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(lc, 0, 0);
}
function bar(x, y, w, h, frac, col, label) {
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#300'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(frac, 0, 1), h);
  if (label) { ctx.fillStyle = '#fff'; ctx.font = `bold ${h >= 18 ? 14 : 11}px Segoe UI, Arial`; ctx.textAlign = 'left'; ctx.fillText(label, x + 6, y + h - (h >= 18 ? 5 : 2)); }
}
function drawHUD() {
  const p = G.p, L = LEVELS[G.level], w = WEAPONS[p.wi], a = p.ammo[p.wi];
  ctx.textBaseline = 'alphabetic';
  // vida, armadura y energía
  const hw = TOUCH ? 180 : 260, showArmor = p.maxArmor > 0 || p.armor > 0;
  let y = TOUCH ? 12 : VH - (showArmor ? 92 : 64);
  bar(20, y, hw, TOUCH ? 18 : 22, p.hp / p.maxHp, p.hp > p.maxHp * .3 ? '#3fbf3f' : '#e03030', 'VIDA ' + Math.ceil(p.hp)); y += TOUCH ? 24 : 28;
  if (showArmor) { bar(20, y, hw, 12, p.armor / Math.max(p.maxArmor, 50), '#5a9ae0', 'ARMADURA ' + Math.ceil(p.armor)); y += 18; }
  bar(20, y, hw, 8, p.stamina, p.adrenT > 0 ? '#ffd400' : '#3fa0e0'); y += 14;
  ctx.textAlign = 'left'; ctx.font = 'bold 12px Segoe UI, Arial';
  const runCol = p.adrenT > 0 ? '#ffd400' : p.running ? '#7fd0ff' : '#aaa';
  const runTxt = p.adrenT > 0 ? '⚡ ADRENALINA ' + Math.ceil(p.adrenT) + 's' : p.running ? '» CORRIENDO' : 'Caminando (Shift: correr)';
  if (!TOUCH) { ctx.fillStyle = runCol; ctx.fillText(runTxt, 20 + hw + 10, y - 6); }
  if (!TOUCH) { ctx.fillStyle = '#ddd'; ctx.font = '14px Segoe UI, Arial'; ctx.fillText(`[Q] 🩹 ${save.medkit}    [E] ⚡ ${save.adren}`, 20, VH - (showArmor ? 100 : 72)); }
  // puntos y monedas
  const ty0 = TOUCH ? y + 14 : 32;
  ctx.fillStyle = '#ddd'; ctx.font = '16px Segoe UI, Arial'; ctx.fillText('Puntos: ' + G.score, 20, ty0);
  ctx.fillStyle = '#ffd34d'; ctx.font = 'bold 16px Segoe UI, Arial'; ctx.fillText('🪙 ' + save.coins, 140, ty0);
  ctx.fillStyle = settings.autoAim ? '#9bd14b' : '#888'; ctx.font = '13px Segoe UI, Arial';
  ctx.fillText('Autoapuntado: ' + (settings.autoAim ? 'SÍ' : 'NO') + (TOUCH ? '' : ' (T)'), 20, ty0 + 18);
  let ly = ty0 + 36;
  if (TOUCH && p.adrenT > 0) { ctx.fillStyle = runCol; ctx.font = 'bold 12px Segoe UI, Arial'; ctx.fillText(runTxt, 20, ly); ly += 16; }
  if (Sfx.muted) { ctx.fillStyle = '#ff8080'; ctx.font = '13px Segoe UI, Arial'; ctx.fillText('🔇 Sonido apagado (M)', 20, ly); ly += 16; }
  // arma y balas
  const BL = btnLayout(), ay = TOUCH ? Math.min(BL.swap.y, BL.run.y) - BL.swap.r - 14 : VH - 30;
  ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.font = `bold ${TOUCH ? 26 : 34}px Segoe UI, Arial`;
  ctx.fillText(a.mag + ' / ' + (a.reserve === Infinity ? '∞' : a.reserve), VW - 24, ay);
  ctx.font = '16px Segoe UI, Arial'; ctx.fillStyle = '#ccc'; ctx.fillText(w.name, TOUCH ? VW - 24 : VW - 24, ay - (TOUCH ? 30 : 40));
  const msg = p.reloading > 0 ? ['RECARGANDO...', '#ffd34d'] : (a.mag === 0 && a.reserve <= 0) ? ['SIN BALAS - cambia de arma', '#ff5050'] : null;
  if (msg) { ctx.fillStyle = msg[1]; ctx.font = 'bold 18px Segoe UI, Arial'; if (TOUCH) { ctx.textAlign = 'center'; ctx.fillText(msg[0], VW / 2, VH - 18); } else ctx.fillText(msg[0], VW - 24, ay - 62); }
  if (p.reloading > 0 && !TOUCH) bar(VW - 184, VH - 20, 160, 6, 1 - p.reloading / w.reload, '#ffd34d');
  if (!TOUCH) { // ranuras de armas compradas
    const own = save.owned.slice().sort((x, y2) => x - y2);
    own.forEach((wi, k) => {
      const x = VW - 24 - (own.length - k) * 46, yy = VH - 150;
      ctx.fillStyle = wi === p.wi ? 'rgba(155,209,75,.85)' : 'rgba(0,0,0,.55)'; ctx.fillRect(x, yy, 40, 36);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillText(String(wi + 1), x + 20, yy + 24);
    });
  }
  // nivel y objetivo
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Segoe UI, Arial';
  ctx.fillText('Nivel ' + (G.level + 1) + ' - ' + G.theme.name, VW / 2, 32);
  ctx.font = '17px Segoe UI, Arial'; ctx.fillStyle = '#ffd34d';
  ctx.fillText(G.bossPhase ? (G.boss ? '¡Derrota a ' + G.boss.t.name + '!' : '¡Jefe derrotado!') : 'Zombis antes del jefe: ' + Math.max(0, L.goal - G.kills), VW / 2, 56);
  if (G.boss) { const bw = Math.max(200, Math.min(600, VW - 2 * (G.mini.width * (TOUCH ? .6 : 1) + 40))); bar(VW / 2 - bw / 2, 70, bw, 18, G.boss.hp / G.boss.maxHp, '#a040c0', G.boss.t.name.toUpperCase()); }
  // compañeros
  if (G.allies.length) {
    ctx.textAlign = 'left'; ctx.font = '12px Segoe UI, Arial';
    G.allies.forEach((al, i) => { ctx.fillStyle = al.down ? '#f66' : '#9f9'; ctx.fillText(`${al.name}: ${al.down ? 'caído' : Math.ceil(al.hp)}`, TOUCH ? 135 + i * 72 : 20, TOUCH ? ty0 + 18 : 70 + i * 16); });
  }
  // minimapa
  const mm = G.mini, ms = TOUCH ? .6 : 1, mmw = mm.width * ms, mmh = mm.height * ms, mx = VW - mmw - 16, my = 16, s = mmw / G.map.w / T;
  ctx.globalAlpha = .85; ctx.drawImage(mm, mx, my, mmw, mmh); ctx.globalAlpha = 1;
  ctx.strokeStyle = '#5f8a2e'; ctx.lineWidth = 2; ctx.strokeRect(mx, my, mmw, mmh);
  for (const z of G.zombies) { ctx.fillStyle = z.type === 'boss' ? '#d050ff' : '#ff3030'; const sz = z.type === 'boss' ? 6 : 3; ctx.fillRect(mx + z.x * s - sz / 2, my + z.y * s - sz / 2, sz, sz); }
  for (const k of G.pickups) if (k.type !== 'coin') { ctx.fillStyle = k.type === 'health' ? '#fff' : '#ffd34d'; ctx.fillRect(mx + k.x * s - 1, my + k.y * s - 1, 3, 3); }
  for (const al of G.allies) if (!al.down) { ctx.fillStyle = '#60c0ff'; circle(ctx, mx + al.x * s, my + al.y * s, 2.5); }
  ctx.fillStyle = '#40ff60'; circle(ctx, mx + p.x * s, my + p.y * s, 3);
  // títulos
  const big = (title, sub, sub2, alpha, col) => {
    ctx.globalAlpha = alpha; ctx.textAlign = 'center';
    ctx.fillStyle = col; ctx.font = `bold ${TOUCH ? 40 : 54}px Segoe UI, Arial`; ctx.fillText(title, VW / 2, VH / 2 - 50);
    ctx.fillStyle = '#fff'; ctx.font = `bold ${TOUCH ? 22 : 30}px Segoe UI, Arial`; ctx.fillText(sub, VW / 2, VH / 2 - 12);
    if (sub2) { ctx.font = '18px Segoe UI, Arial'; ctx.fillStyle = '#ccc'; ctx.fillText(sub2, VW / 2, VH / 2 + 18); }
    ctx.globalAlpha = 1;
  };
  if (G.intro > 0) big('NIVEL ' + (G.level + 1), L.title, `Elimina ${L.goal} zombis y vence al jefe: ${BOSSES[L.boss].name}`, Math.min(1, G.intro), '#9bd14b');
  else if (G.banner) big(G.banner.title, G.banner.sub, null, Math.min(1, G.banner.t), G.banner.small ? '#ff8080' : '#e04040');
}
function drawCrosshair() {
  const x = mouse.x, y = mouse.y, p = G.p, w = WEAPONS[p.wi], gap = 6 + w.spread * 60 + (p.cool > 0 ? 4 : 0);
  ctx.strokeStyle = p.reloading > 0 ? '#ffd34d' : '#fff'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - gap - 8, y); ctx.lineTo(x - gap, y); ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + 8, y);
  ctx.moveTo(x, y - gap - 8); ctx.lineTo(x, y - gap); ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + 8);
  ctx.stroke(); ctx.fillStyle = '#ff4040'; ctx.fillRect(x - 1, y - 1, 2, 2);
}
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, VH);
  if (!G.map) return;
  const shx = (Math.random() - .5) * G.shake, shy = (Math.random() - .5) * G.shake;
  const cx = Math.round(G.cam.x + shx), cy = Math.round(G.cam.y + shy);
  ctx.save(); ctx.scale(Z, Z); ctx.translate(-cx, -cy);
  const sx = Math.max(0, cx), sy = Math.max(0, cy), sw = Math.min(Math.ceil(VW / Z) + 2, G.map.pw - sx), sh = Math.min(Math.ceil(VH / Z) + 2, G.map.ph - sy);
  if (sw > 0 && sh > 0) { ctx.drawImage(G.mapCanvas, sx, sy, sw, sh, sx, sy, sw, sh); ctx.drawImage(G.decal, sx, sy, sw, sh, sx, sy, sw, sh); }
  // charcos de ácido
  for (const pu of G.puddles) {
    const al = Math.min(1, pu.life / 1.2);
    ctx.fillStyle = `rgba(130,200,30,${.4 * al})`; circle(ctx, pu.x, pu.y, pu.r);
    ctx.fillStyle = `rgba(190,240,60,${.5 * al})`;
    for (let i = 0; i < 3; i++) { const a = G.time * 2 + i * 2.1, rr2 = pu.r * .5; circle(ctx, pu.x + Math.cos(a) * rr2, pu.y + Math.sin(a * 1.3) * rr2, 3 + Math.sin(G.time * 5 + i) * 2); }
  }
  for (const k of G.pickups) drawPickup(k);
  for (const q of G.particles) {
    ctx.globalAlpha = q.shell ? 1 : clamp(q.life / q.max * 1.5, 0, 1); ctx.fillStyle = q.color;
    if (q.shell) ctx.fillRect(q.x, q.y, 4, 2); else circle(ctx, q.x, q.y, q.size);
  }
  ctx.globalAlpha = 1;
  for (const z of G.zombies) drawZombie(z);
  if (G.target && G.state === 'play') drawTargetMark(G.target);
  for (const al of G.allies) if (!al.down) drawSoldier(al, al.color, 22, 6, al.name);
  if (G.p && G.state !== 'menu') drawPlayer();
  // balas, fuego, granadas y vómito
  ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 2.5; ctx.beginPath();
  for (const b of G.bullets) if (b.kind === 'bullet') { ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); }
  ctx.stroke();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of G.bullets) if (b.kind === 'flame') {
    const k = b.age / .4, r = 6 + k * 18; ctx.fillStyle = `rgba(${255},${Math.round(200 - k * 150)},${Math.round(60 - k * 60)},${.55 * (1 - k * .7)})`; circle(ctx, b.x, b.y, r);
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const b of G.bullets) if (b.kind === 'grenade') { ctx.fillStyle = '#2e3a1e'; circle(ctx, b.x, b.y, 6); ctx.fillStyle = '#ff5030'; circle(ctx, b.x, b.y, 2); }
  for (const s of G.enemyShots) {
    ctx.fillStyle = 'rgba(150,210,40,.35)'; circle(ctx, s.x - s.vx * .03, s.y - s.vy * .03, 7);
    ctx.fillStyle = '#a6d83a'; circle(ctx, s.x, s.y, 8 + Math.sin(s.t * 20) * 1.5); ctx.fillStyle = '#d8ff70'; circle(ctx, s.x - 2, s.y - 2, 3);
  }
  ctx.restore();
  if (G.state === 'menu') { drawDarkness(.55); return; }
  drawDarkness(G.theme.dark, (G.p.x - cx) * Z, (G.p.y - cy) * Z, G.p.angle);
  if (G.flash > 0) {
    const gr = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .25, VW / 2, VH / 2, Math.max(VW, VH) * .7);
    gr.addColorStop(0, 'rgba(255,0,0,0)'); gr.addColorStop(1, `rgba(200,0,0,${G.flash})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
  }
  if (G.p.slowT > 0) { ctx.fillStyle = 'rgba(120,200,30,.12)'; ctx.fillRect(0, 0, VW, VH); }
  if (G.p.hp < G.p.maxHp * .3) { ctx.fillStyle = `rgba(120,0,0,${.12 + Math.sin(G.time * 6) * .06})`; ctx.fillRect(0, 0, VW, VH); }
  drawHUD();
  if (G.state === 'play') { if (TOUCH) drawTouch(); else drawCrosshair(); }
}

/* =========================================================
   PANTALLAS (menú, tienda, pausa, fin de nivel...)
   ========================================================= */
const ov = document.getElementById('overlay');
function showScreen(html, wide) { ov.innerHTML = '<div class="panel' + (wide ? ' wide' : '') + '">' + html + '</div>'; ov.classList.remove('hidden'); cv.classList.remove('playing'); }
function hideScreen() { ov.classList.add('hidden'); }
function showMenu() {
  if (G.state === 'play' || G.state === 'pause' || G.state === 'over' || G.state === 'complete') persist();
  G.state = 'menu'; G.p = null; G.zombies = []; G.bullets = []; G.particles = []; G.allies = []; G.enemyShots = []; G.puddles = []; G.pickups = [];
  if (!G.map) loadMap(0);
  const cont = Math.min(unlocked, LEVELS.length - 1);
  showScreen(`<h1>ZONA MUERTA</h1><div class="sub">SOBREVIVE A LA INVASIÓN ZOMBI</div>
    <div class="coins">🪙 ${save.coins} monedas</div>
    <button data-a="play">${unlocked > 0 ? 'CONTINUAR (Nivel ' + (cont + 1) + ')' : 'JUGAR'}</button>
    <button data-a="shop">🛒 TIENDA</button>
    <button data-a="levels">ELEGIR NIVEL</button>
    <button data-a="controls">CONTROLES</button>
    <button data-a="auto">AUTOAPUNTADO: ${settings.autoAim ? 'SÍ ✔' : 'NO ✖'}</button>
    <p style="font-size:13px;margin-top:12px">9 niveles · 9 jefes · 7 armas · compañeros</p>`);
}
function showShop(from) {
  if (from) G.shopFrom = from;
  const card = (title, desc, info, price, can, id, owned) =>
    `<div class="card${owned ? ' owned' : ''}"><b>${title}</b><small>${desc}</small>${info ? `<i>${info}</i>` : ''}
     ${owned ? '<span class="tag">✔ ' + owned + '</span>' : `<button data-a="buy" data-v="${id}" ${!can || save.coins < price ? 'disabled' : ''}>🪙 ${price}</button>`}</div>`;
  let h = `<h2>🛒 Tienda</h2><div class="coins">Tienes 🪙 ${save.coins} monedas</div><div class="shop">`;
  h += '<div class="sect">Armas</div>';
  WEAPONS.forEach((w, i) => { if (i === 0) return; h += card(w.name, w.desc, `Daño ${w.dmg}${w.pellets > 1 ? '×' + w.pellets : ''} · Cargador ${w.mag}`, w.price, true, 'weapon:' + i, ownedWeapon(i) ? 'Comprada' : null); });
  h += '<div class="sect">Armadura</div>';
  ARMORS.forEach((a, i) => { if (i === 0) return; h += card(a.name, `Absorbe daño hasta ${a.max} puntos${a.reduce ? ' y reduce 15% extra' : ''}.`, '', a.price, i === save.armorTier + 1, 'armor:' + i, save.armorTier >= i ? 'Tienes' : null); });
  h += '<div class="sect">Equipo y compañeros</div>';
  SHOP_GEAR.forEach(g => { h += card(g.name, g.desc, g.info(), g.price(), g.can(), g.id, g.can() ? null : 'Máximo'); });
  h += '</div>';
  h += G.shopFrom === 'level' && G.level < LEVELS.length - 1 ? '<button data-a="next">SIGUIENTE NIVEL ▶</button><button data-a="menu" class="red">MENÚ</button>' : '<button data-a="menu">VOLVER</button>';
  showScreen(h, true);
}
function buy(id) {
  let price = 0, ok = false;
  const [kind, num] = id.split(':'), i = +num;
  if (kind === 'weapon') { price = WEAPONS[i].price; if (!ownedWeapon(i) && save.coins >= price) { save.owned.push(i); ok = true; } }
  else if (kind === 'armor') { price = ARMORS[i].price; if (i === save.armorTier + 1 && save.coins >= price) { save.armorTier = i; ok = true; } }
  else { const g = SHOP_GEAR.find(x => x.id === id); if (!g) return showShop(); price = g.price(); if (g.can() && save.coins >= price) { g.buy(); ok = true; } }
  if (ok) { save.coins -= price; persist(); Sfx.buy(); }
  showShop();
}
function showLevels() {
  let h = '<h2>Elige un nivel</h2><div class="grid">';
  LEVELS.forEach((L, i) => {
    const lock = i > unlocked;
    h += `<button data-a="level" data-v="${i}" ${lock ? 'disabled' : ''}>${lock ? '🔒 ' : ''}Nivel ${i + 1}<small>${lock ? 'Bloqueado' : THEMES[L.map].name}</small></button>`;
  });
  showScreen(h + '</div><button data-a="menu">VOLVER</button>');
}
function showControls() {
  const extra = `<p>Ganas <b style="color:#ffd34d">monedas</b> al eliminar zombis. Úsalas en la <b>tienda</b> para comprar armas, armadura, botiquines, adrenalina y <b>compañeros</b>.<br>
    Cuidado con los <b>vomitadores</b> (lanzan ácido), los <b>perros</b> (atacan en manada) y los <b>tanques</b> (embisten). Cada nivel termina con un <b>jefe</b>.</p>`;
  if (TOUCH) return showScreen(`<h2>Controles (celular)</h2><table>
    <tr><td class="k">Mitad izquierda</td><td>Joystick: moverse</td></tr>
    <tr><td class="k">Mitad derecha / FUEGO</td><td>Disparar (arrastra para apuntar a mano)</td></tr>
    <tr><td class="k">CORRER</td><td>Activa/desactiva correr (si se acaba la energía caminas)</td></tr>
    <tr><td class="k">R · ⇄ · II</td><td>Recargar · Cambiar arma · Pausa</td></tr>
    <tr><td class="k">🩹 · ⚡</td><td>Botiquín · Adrenalina</td></tr></table>${extra}
    <button data-a="menu">VOLVER</button>`);
  showScreen(`<h2>Controles</h2><table>
    <tr><td class="k">W A S D / Flechas</td><td>Moverse</td></tr>
    <tr><td class="k">Mouse · Clic izquierdo</td><td>Apuntar · Disparar</td></tr>
    <tr><td class="k">Shift</td><td>Activar/desactivar correr (sin energía vuelves a caminar)</td></tr>
    <tr><td class="k">R</td><td>Recargar</td></tr>
    <tr><td class="k">1 – 7 / Rueda</td><td>Cambiar de arma</td></tr>
    <tr><td class="k">Q · E</td><td>Usar botiquín · Usar adrenalina</td></tr>
    <tr><td class="k">T · M · P</td><td>Autoapuntado · Silenciar · Pausa</td></tr></table>${extra}
    <button data-a="menu">VOLVER</button>`);
}
function pauseGame() { if (G.state !== 'play') return; G.state = 'pause'; mouse.down = false; touch.joy = touch.fire = null; showScreen(`<h2>Pausa</h2><button data-a="resume">CONTINUAR</button><button data-a="retry">REINICIAR NIVEL</button><button data-a="menu" class="red">MENÚ PRINCIPAL</button>`); }
function resume() { G.state = 'play'; hideScreen(); cv.classList.add('playing'); }
function stats() {
  const acc = G.shots ? Math.round(G.hits / G.shots * 100) : 0, t = Math.floor(G.time);
  return `<div class="stats">Zombis: <b>${G.kills}</b> · Puntos: <b>${G.score}</b> · Precisión: <b>${acc}%</b> · Tiempo: <b>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b><br>Monedas ganadas: <b>🪙 ${G.coinsLevel}</b> · Total: <b>🪙 ${save.coins}</b></div>`;
}
function gameOver() {
  G.state = 'over'; mouse.down = false; touch.joy = touch.fire = null; Sfx.lose(); persist();
  setTimeout(() => showScreen(`<h2 style="color:#e33">¡TE ATRAPARON!</h2>${stats()}<p>Conservas las monedas que juntaste. ¡Mejora tu equipo en la tienda!</p><button data-a="retry">INTENTAR DE NUEVO</button><button data-a="shop">🛒 TIENDA</button><button data-a="menu" class="red">MENÚ PRINCIPAL</button>`), 900);
}
function levelComplete() {
  G.state = 'complete'; mouse.down = false; touch.joy = touch.fire = null; Sfx.win();
  const bonus = 50 + G.level * 25; save.coins += bonus; G.coinsLevel += bonus;
  unlocked = Math.max(unlocked, G.level + 1); saveProgress();
  const last = G.level >= LEVELS.length - 1;
  setTimeout(() => showScreen(last
    ? `<h1 style="font-size:48px">¡VICTORIA!</h1><p>Derrotaste al Rey Zombi y salvaste a la ciudad. (Bono: 🪙 ${bonus})</p>${stats()}<button data-a="shop">🛒 TIENDA</button><button data-a="menu">MENÚ PRINCIPAL</button>`
    : `<h2>¡Nivel ${G.level + 1} superado!</h2><p>Bono por nivel: 🪙 ${bonus}</p>${stats()}<button data-a="next">SIGUIENTE NIVEL ▶</button><button data-a="shopLevel">🛒 TIENDA</button><button data-a="retry">REPETIR</button><button data-a="menu" class="red">MENÚ</button>`), 900);
}
const actions = {
  play: () => startLevel(Math.min(unlocked, LEVELS.length - 1)), levels: showLevels, controls: showControls, menu: showMenu,
  level: v => startLevel(+v), resume, retry: () => startLevel(G.level), next: () => startLevel(Math.min(G.level + 1, LEVELS.length - 1)),
  auto: () => { toggleAutoAim(); showMenu(); }, shop: () => showShop('menu'), shopLevel: () => showShop('level'), buy,
};
ov.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return; Sfx.init(); Sfx.ui();
  if (TOUCH && !document.fullscreenElement && !matchMedia('(display-mode: standalone)').matches) {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { })).catch(() => { });
  }
  actions[b.dataset.a](b.dataset.v);
});

/* ---------- controles de teclado y mouse ---------- */
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyP' || e.code === 'Escape') { if (G.state === 'play') pauseGame(); else if (G.state === 'pause') resume(); }
  if (e.code === 'KeyM') Sfx.muted = !Sfx.muted;
  if (e.code === 'KeyT') toggleAutoAim();
  if (G.state !== 'play') return;
  if (e.code === 'KeyR') startReload();
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) toggleRun();
  if (e.code === 'KeyQ') useMedkit();
  if (e.code === 'KeyE') useAdren();
  const m = /^Digit([1-7])$/.exec(e.code); if (m) switchWeapon(+m[1] - 1);
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
cv.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
cv.addEventListener('mousedown', e => { if (e.button === 0) { mouse.down = true; Sfx.init(); } });
addEventListener('mouseup', e => { if (e.button === 0) { mouse.down = false; if (G.p) G.p.emptyClick = false; } });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { if (G.state === 'play') cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: true });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; pauseGame(); });

/* ---------- controles táctiles (celular) ---------- */
const touch = { joy: null, fire: null };
function btnLayout() {
  const s = Math.max(.8, Math.min(1.25, Math.min(VW, VH) / 400));
  return {
    fire: { x: VW - 95 * s, y: VH - 95 * s, r: 56 * s },
    reload: { x: VW - 205 * s, y: VH - 50 * s, r: 28 * s },
    swap: { x: VW - 205 * s, y: VH - 140 * s, r: 28 * s },
    run: { x: VW - 95 * s, y: VH - 200 * s, r: 30 * s },
    medkit: { x: 42, y: VH - 230 * s, r: 24 },
    adren: { x: 100, y: VH - 230 * s, r: 24 },
    pause: { x: VW - (G.mini ? G.mini.width * .6 : 120) - 50, y: 40, r: 22 },
  };
}
function touchAimAngle() {
  const f = touch.fire; if (!f) return null;
  const dx = f.x - f.ox, dy = f.y - f.oy; return Math.hypot(dx, dy) > 22 ? Math.atan2(dy, dx) : null;
}
function inBtn(b, x, y, k) { return Math.hypot(x - b.x, y - b.y) < b.r * k; }
cv.addEventListener('touchstart', e => {
  e.preventDefault(); Sfx.init(); if (G.state !== 'play') return;
  const L = btnLayout();
  for (const t of e.changedTouches) {
    const x = t.clientX, y = t.clientY;
    if (inBtn(L.pause, x, y, 1.5)) { pauseGame(); return; }
    if (inBtn(L.reload, x, y, 1.3)) { startReload(); continue; }
    if (inBtn(L.swap, x, y, 1.3)) { cycleWeapon(1); continue; }
    if (inBtn(L.run, x, y, 1.3)) { toggleRun(); continue; }
    if (inBtn(L.medkit, x, y, 1.3)) { useMedkit(); continue; }
    if (inBtn(L.adren, x, y, 1.3)) { useAdren(); continue; }
    if (x >= VW * .45) { if (!touch.fire) touch.fire = { id: t.identifier, ox: x, oy: y, x, y }; }
    else if (!touch.joy) touch.joy = { id: t.identifier, ox: x, oy: y, x, y };
  }
}, { passive: false });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) for (const k of ['joy', 'fire']) {
    const o = touch[k]; if (!o || o.id !== t.identifier) continue; o.x = t.clientX; o.y = t.clientY;
    if (k === 'joy') { const dx = o.x - o.ox, dy = o.y - o.oy, d = Math.hypot(dx, dy); if (d > 70) { o.ox = o.x - dx / d * 70; o.oy = o.y - dy / d * 70; } }
  }
}, { passive: false });
function touchEnd(e) {
  for (const t of e.changedTouches) {
    if (touch.joy && touch.joy.id === t.identifier) touch.joy = null;
    if (touch.fire && touch.fire.id === t.identifier) { touch.fire = null; if (G.p) G.p.emptyClick = false; }
  }
}
cv.addEventListener('touchend', touchEnd); cv.addEventListener('touchcancel', touchEnd);
function touchBtn(b, label, col, active, count) {
  ctx.globalAlpha = active ? .8 : .45; ctx.fillStyle = col; circle(ctx, b.x, b.y, b.r);
  ctx.globalAlpha = .9; ctx.strokeStyle = active ? '#ffd34d' : '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(b.r * (label.length > 3 ? .36 : .55))}px Segoe UI, Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, b.x, b.y + 1);
  if (count !== undefined) { ctx.font = 'bold 12px Segoe UI, Arial'; ctx.fillStyle = '#ffd34d'; ctx.fillText(String(count), b.x + b.r * .8, b.y - b.r * .8); }
  ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
}
function drawTouch() {
  const L = btnLayout(), j = touch.joy;
  const jx = j ? j.ox : 110, jy = j ? j.oy : VH - 100;
  ctx.globalAlpha = j ? .5 : .25; ctx.fillStyle = '#000'; circle(ctx, jx, jy, 70);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(jx, jy, 70, 0, TAU); ctx.stroke();
  ctx.globalAlpha = j ? .85 : .4; ctx.fillStyle = '#9bd14b'; circle(ctx, j ? j.x : jx, j ? j.y : jy, 30); ctx.globalAlpha = 1;
  const f = touch.fire;
  touchBtn(L.fire, 'FUEGO', '#b02020', !!f);
  if (f && touchAimAngle() !== null) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.ox, f.oy); ctx.lineTo(f.x, f.y); ctx.stroke(); }
  touchBtn(L.reload, 'R', '#806010', G.p.reloading > 0);
  touchBtn(L.swap, '⇄', '#305080', false);
  touchBtn(L.run, 'CORRER', '#206070', G.p.running);
  touchBtn(L.medkit, '🩹', '#702020', false, save.medkit);
  touchBtn(L.adren, '⚡', '#706010', G.p.adrenT > 0, save.adren);
  touchBtn(L.pause, 'II', '#333', false);
}

/* ---------- bucle principal ---------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  requestAnimationFrame(frame); // primero, para que un error nunca congele el juego
  try {
    if (G.state === 'play') update(dt);
    else if (G.state === 'menu' && G.map) { G.menuT += dt; G.cam.x = (G.map.pw - VW / Z) / 2 + Math.cos(G.menuT * .1) * 500; G.cam.y = (G.map.ph - VH / Z) / 2 + Math.sin(G.menuT * .13) * 300; }
    render();
  } catch (e) { if (!frame.err) { frame.err = true; console.error(e); } }
}
showMenu();
requestAnimationFrame(frame);

/* ---------- PWA: funciona sin Internet y se puede instalar en el celular ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
}
