'use strict';
/* =========================================================
   ZONA MUERTA - Juego de zombis visto desde arriba
   Solo abre index.html en el navegador. No necesita instalar nada.
   ========================================================= */

const T = 48;               // tamaño de cada casilla del mapa (pixeles)
const TAU = Math.PI * 2;
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let VW = 0, VH = 0;
const TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;   // ¿es celular/tablet?
let Z = 1;                  // zoom de la cámara (en pantallas chicas se ve más mapa)
function resize() { VW = cv.width = innerWidth; VH = cv.height = innerHeight; Z = Math.max(0.55, Math.min(1, Math.min(VW, VH) / 720)); }
addEventListener('resize', resize); resize();

/* ---------- utilidades ---------- */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function hexToRgb(h) { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
function jit(h, a, rng) { const c = hexToRgb(h), d = (rng() * 2 - 1) * a; return `rgb(${clamp(c[0] + d | 0, 0, 255)},${clamp(c[1] + d | 0, 0, 255)},${clamp(c[2] + d | 0, 0, 255)})`; }
function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* =========================================================
   SONIDOS (generados con Web Audio, sin archivos)
   ========================================================= */
const Sfx = {
  ctx: null, master: null, noise: null, muted: false, lastGroan: 0, lastHit: 0,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.55;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp); comp.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
  },
  ok() { return this.ctx && !this.muted; },
  out(vol = 1, pan = 0) {
    const g = this.ctx.createGain(); g.gain.value = vol;
    if (this.ctx.createStereoPanner) { const p = this.ctx.createStereoPanner(); p.pan.value = clamp(pan, -1, 1); g.connect(p); p.connect(this.master); }
    else g.connect(this.master);
    return g;
  },
  nz(dest, t, dur, type, freq, q, vol) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noise;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  },
  tone(dest, t, dur, type, f0, f1, vol) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  },
  shoot(kind) {
    if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(1);
    if (kind === 'pistol') { this.nz(o, t, 0.2, 'lowpass', 2600, 1, 0.9); this.tone(o, t, 0.13, 'sine', 190, 50, 0.9); this.nz(o, t, 0.04, 'highpass', 3500, 1, 0.5); }
    else if (kind === 'shotgun') { this.nz(o, t, 0.5, 'lowpass', 1300, 0.7, 1.3); this.tone(o, t, 0.3, 'sine', 120, 32, 1.2); this.nz(o, t, 0.09, 'highpass', 2000, 1, 0.8); }
    else { this.nz(o, t, 0.13, 'bandpass', 1700, 0.8, 1.1); this.tone(o, t, 0.09, 'square', 230, 60, 0.25); this.tone(o, t, 0.08, 'sine', 150, 45, 0.6); }
  },
  click(t, freq, vol) { const o = this.out(vol); this.nz(o, t, 0.05, 'bandpass', freq, 5, 1.2); this.tone(o, t, 0.03, 'square', freq / 2, freq / 4, 0.15); },
  reload(dur) {
    if (!this.ok()) return; const t = this.ctx.currentTime;
    this.click(t + 0.05, 1700, 0.7); this.click(t + dur * 0.45, 1100, 0.8);
    this.click(t + dur * 0.82, 2600, 0.9); this.click(t + dur * 0.9, 1500, 0.7);
  },
  empty() { if (!this.ok()) return; this.click(this.ctx.currentTime, 3200, 0.6); },
  switchW() { if (!this.ok()) return; const t = this.ctx.currentTime; this.click(t, 2000, 0.5); this.click(t + 0.08, 1400, 0.5); },
  hurt() {
    if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(0.9);
    this.nz(o, t, 0.18, 'lowpass', 700, 1, 1); this.tone(o, t, 0.25, 'square', 170, 70, 0.25); this.tone(o, t, 0.2, 'sine', 90, 40, 0.8);
  },
  groan(pan, vol, low) {
    if (!this.ok() || vol < 0.03) return; const t = this.ctx.currentTime, o = this.out(vol, pan);
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = low ? 350 : 550; lp.Q.value = 3; lp.connect(o);
    const osc = this.ctx.createOscillator(); osc.type = 'sawtooth';
    const base = low ? rand(40, 55) : rand(70, 115), dur = low ? 1.8 : rand(0.8, 1.3);
    osc.frequency.setValueAtTime(base, t); osc.frequency.linearRampToValueAtTime(base * rand(0.8, 1.35), t + dur * 0.4); osc.frequency.linearRampToValueAtTime(base * 0.6, t + dur);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = rand(5, 10);
    const lg = this.ctx.createGain(); lg.gain.value = base * 0.1; lfo.connect(lg); lg.connect(osc.frequency);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.6, t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g); g.connect(lp); osc.start(t); lfo.start(t); osc.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  },
  zhit(pan, vol) {
    if (!this.ok()) return; const t = this.ctx.currentTime; if (t - this.lastHit < 0.05) return; this.lastHit = t;
    const o = this.out(vol, pan); this.nz(o, t, 0.09, 'lowpass', 900, 1, 0.9); this.tone(o, t, 0.06, 'sine', 120, 60, 0.4);
  },
  zdie(pan, vol) {
    if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(vol, pan);
    this.nz(o, t, 0.3, 'lowpass', 500, 1, 1); this.tone(o, t, 0.5, 'sawtooth', 110, 35, 0.25);
  },
  pickup() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(0.5); [660, 880, 1320].forEach((f, i) => this.tone(o, t + i * 0.06, 0.15, 'sine', f, 0, 0.6)); },
  heart() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(0.8); this.tone(o, t, 0.15, 'sine', 70, 40, 0.9); this.tone(o, t + 0.22, 0.15, 'sine', 65, 38, 0.6); },
  win() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(0.5); [440, 554, 659, 880, 1108].forEach((f, i) => this.tone(o, t + i * 0.12, 0.4, 'triangle', f, 0, 0.6)); },
  lose() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(0.6); [392, 330, 262, 196].forEach((f, i) => this.tone(o, t + i * 0.25, 0.5, 'triangle', f, f * 0.95, 0.6)); this.groan(0, 0.8, true); },
  ui() { if (!this.ok()) return; this.tone(this.out(0.3), this.ctx.currentTime, 0.06, 'square', 880, 660, 0.3); },
};

