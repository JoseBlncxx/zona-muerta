'use strict';
/* =========================================================
   ZONA MUERTA - EFECTOS DE SONIDO EXTRA Y MÚSICA DINÁMICA
   Todo se genera con código (Web Audio), sin archivos de audio.
   ========================================================= */
Object.assign(Sfx, {
  lastCoin: 0, lastFlame: 0, lastArmor: 0, lastWood: 0, rain: null,
  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = settings.vol * settings.sfx * .7;
    if (Music.gain) Music.gain.gain.value = settings.vol * settings.music * .35;
  },
  vomit(pan, vol) {
    if (!this.ok() || vol < .03) return; const t = this.ctx.currentTime, o = this.out(vol, pan);
    this.nz(o, t, .45, 'lowpass', 700, 6, 1.1);
    const osc = this.ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(170, t); osc.frequency.exponentialRampToValueAtTime(60, t + .4);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 22; const lg = this.ctx.createGain(); lg.gain.value = 40; lfo.connect(lg); lg.connect(osc.frequency);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(.45, t); g.gain.exponentialRampToValueAtTime(.001, t + .45);
    osc.connect(g); g.connect(o); osc.start(t); lfo.start(t); osc.stop(t + .5); lfo.stop(t + .5);
  },
  bark(pan, vol) { if (!this.ok() || vol < .03) return; const t = this.ctx.currentTime, o = this.out(vol, pan); for (let i = 0; i < 2; i++) { const s = t + i * .17; this.tone(o, s, .11, 'square', rand(380, 470), 170, .35); this.nz(o, s, .09, 'bandpass', 900, 2, .9); } },
  coin() { if (!this.ok()) return; const t = this.ctx.currentTime; if (t - this.lastCoin < .05) return; this.lastCoin = t; const o = this.out(.3); this.tone(o, t, .07, 'square', 1320, 0, .25); this.tone(o, t + .06, .16, 'square', 1760, 0, .25); },
  buy() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(.4); [990, 1320, 1760, 2640].forEach((f, i) => this.tone(o, t + i * .06, .14, 'square', f, 0, .2)); },
  explode(vol) { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(1.3 * (vol || 1)); this.nz(o, t, .9, 'lowpass', 900, .7, 1.4); this.tone(o, t, .6, 'sine', 90, 25, 1.3); this.nz(o, t, .12, 'highpass', 2500, 1, .6); },
  launch() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(.8); this.tone(o, t, .15, 'sine', 220, 70, .9); this.nz(o, t, .12, 'lowpass', 1200, 1, .6); },
  laser() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(.35); this.tone(o, t, .08, 'sawtooth', 1800, 500, .3); },
  flame() { if (!this.ok()) return; const t = this.ctx.currentTime; if (t - this.lastFlame < .07) return; this.lastFlame = t; this.nz(this.out(.5), t, .15, 'bandpass', rand(400, 700), .8, .9); },
  allyShot(pan, vol) { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(.45 * (vol || 1), pan); this.nz(o, t, .1, 'bandpass', 1900, .8, 1); this.tone(o, t, .06, 'sine', 160, 50, .5); },
  armor() { if (!this.ok()) return; const t = this.ctx.currentTime; if (t - this.lastArmor < .15) return; this.lastArmor = t; const o = this.out(.6); this.nz(o, t, .12, 'bandpass', 3200, 6, 1); this.tone(o, t, .2, 'triangle', 950, 700, .3); },
  adren() { if (!this.ok()) return; this.tone(this.out(.6), this.ctx.currentTime, .6, 'sawtooth', 200, 900, .2); this.heart(); },
  charge(pan, vol) { if (!this.ok()) return; this.groan(pan, Math.min(1.4, vol * 1.5), true); this.nz(this.out(vol, pan), this.ctx.currentTime, .5, 'lowpass', 300, 2, 1); },
  bossIntro() { if (!this.ok()) return; this.groan(0, 1.5, true); const t = this.ctx.currentTime, o = this.out(1); for (let i = 0; i < 4; i++) this.tone(o, t + i * .35, .3, 'sine', 70, 35, 1); },
  swish() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(.6); this.nz(o, t, .18, 'bandpass', 2500, 1.5, 1); this.tone(o, t, .12, 'sine', 600, 200, .15); },
  shriek(pan, vol) {
    if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(Math.min(1.3, vol * 1.3), pan);
    const osc = this.ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(700, t); osc.frequency.linearRampToValueAtTime(1300, t + .3); osc.frequency.linearRampToValueAtTime(500, t + 1);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 30; const lg = this.ctx.createGain(); lg.gain.value = 90; lfo.connect(lg); lg.connect(osc.frequency);
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 2;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(.5, t + .1); g.gain.exponentialRampToValueAtTime(.001, t + 1.1);
    osc.connect(f); f.connect(g); g.connect(o); osc.start(t); lfo.start(t); osc.stop(t + 1.2); lfo.stop(t + 1.2);
  },
  beep(pan, vol) { if (!this.ok()) return; this.tone(this.out(vol, pan), this.ctx.currentTime, .07, 'square', 1500, 0, .3); },
  thunder() { if (!this.ok()) return; const t = this.ctx.currentTime + rand(.1, .6), o = this.out(1.2); this.nz(o, t, 2.2, 'lowpass', 220, .5, 1.5); this.nz(o, t, .3, 'lowpass', 1200, .5, .7); },
  wood() { if (!this.ok()) return; const t = this.ctx.currentTime; if (t - this.lastWood < .1) return; this.lastWood = t; const o = this.out(.7); this.nz(o, t, .25, 'bandpass', 700, 3, 1.2); this.tone(o, t, .15, 'square', 140, 60, .2); },
  unlock() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(.6); this.click(t, 2400, .7); this.click(t + .12, 1600, .7); this.tone(o, t + .2, .3, 'triangle', 300, 150, .4); },
  chest() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(.5); [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(o, t + i * .07, .3, 'triangle', f, 0, .5)); },
  achievement() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(.5); [784, 988, 1175, 1568].forEach((f, i) => this.tone(o, t + i * .09, .35, 'square', f, 0, .18)); },
  levelUp() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(.5); [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(o, t + i * .08, .25, 'triangle', f, 0, .5)); },
  rescue() { if (!this.ok()) return; const t = this.ctx.currentTime, o = this.out(.5); [660, 880].forEach((f, i) => this.tone(o, t + i * .1, .25, 'sine', f, 0, .6)); },
  startRain(level) { // lluvia continua
    this.stopRain(); if (!this.ctx) return;
    const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2500; f.Q.value = .4;
    const g = this.ctx.createGain(); g.gain.value = .12 * level; s.connect(f); f.connect(g); g.connect(this.master); s.start();
    this.rain = { s, g };
  },
  stopRain() { if (this.rain) { try { this.rain.s.stop(); } catch (e) { } this.rain = null; } },
});

/* ---------- música de fondo: tranquila al explorar, intensa con jefes y hordas ---------- */
const Music = {
  gain: null, nextT: 0, step: 0, intensity: 0, target: 0, timer: null, filter: null,
  start() {
    if (!Sfx.ctx || this.timer) return;
    const c = Sfx.ctx;
    this.gain = c.createGain(); this.filter = c.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 2200;
    this.filter.connect(this.gain); this.gain.connect(c.destination); Sfx.applyVolumes();
    this.nextT = c.currentTime + .1;
    this.timer = setInterval(() => this.tick(), 90);
  },
  setIntensity(x) { this.target = clamp(x, 0, 1); },
  tick() {
    const c = Sfx.ctx; if (!c || c.state !== 'running') return;
    this.intensity += (this.target - this.intensity) * .05;
    this.gain.gain.value = Sfx.muted ? 0 : settings.vol * settings.music * .35;
    if (Sfx.muted || settings.music <= 0) { this.nextT = c.currentTime + .1; return; }
    while (this.nextT < c.currentTime + .3) { this.play(this.step, this.nextT); this.nextT += 60 / (84 + this.intensity * 56) / 2; this.step++; }
  },
  play(s, t) {
    const c = Sfx.ctx, I = this.intensity, bar = (s >> 3) % 4, st = s % 8;
    const prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [52, 56, 59]]; // La menor, Fa, Do, Mi
    const hz = n => 440 * Math.pow(2, (n - 69) / 12), ch = prog[bar], dur = 60 / (84 + I * 56) / 2;
    const env = (node, a, d, v) => { const g = c.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); node.connect(g); g.connect(this.filter); return g; };
    const osc = (type, f, a, d, v) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; env(o, a, d, v); o.start(t); o.stop(t + a + d + .05); };
    if (st === 0) ch.forEach(n => osc('triangle', hz(n), .4, dur * 8, .05)); // acordes suaves
    if (st === 0 || st === 3 || st === 6) osc('sine', hz(ch[0] - 24), .01, dur * 2.5, .28); // bajo
    if (I > .35) { // percusión cuando hay acción
      if (st === 0 || st === 4) { const o = c.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + .15); env(o, .005, .18, .5 * I); o.start(t); o.stop(t + .25); }
      if (st === 2 || st === 6) { const n = c.createBufferSource(); n.buffer = Sfx.noise; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; n.connect(f); env(f, .002, .12, .25 * I); n.start(t, Math.random()); n.stop(t + .15); }
      if (st % 2 === 1) { const n = c.createBufferSource(); n.buffer = Sfx.noise; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000; n.connect(f); env(f, .001, .04, .12 * I); n.start(t, Math.random()); n.stop(t + .06); }
    }
    if (I > .6) osc('square', hz(ch[st % 3] + 12 + (st > 3 ? 12 : 0)), .005, dur * .9, .04 * I); // arpegio tenso
  },
};
