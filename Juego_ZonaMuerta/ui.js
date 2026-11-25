'use strict';
/* =========================================================
   ZONA MUERTA - PANTALLAS, TIENDA, OPCIONES Y CONTROLES
   ========================================================= */
const ov = document.getElementById('overlay');
function showScreen(html, wide) { ov.innerHTML = '<div class="panel' + (wide ? ' wide' : '') + '">' + html + '</div>'; ov.classList.remove('hidden'); cv.classList.remove('playing'); }
function hideScreen() { ov.classList.add('hidden'); }
const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);

/* ---------- menú principal ---------- */
function showMenu() {
  if (G.state !== 'menu') persist();
  G.state = 'menu'; G.p = null; Sfx.stopRain(); Music.setIntensity(0);
  Object.assign(G, { zombies: [], bullets: [], particles: [], allies: [], enemyShots: [], puddles: [], pickups: [], turrets: [], mines: [], barricades: [], barrels: [], survivors: [], gen: null, heli: null, boss: null, cine: null });
  if (!G.map) { G.L = LEVELS[0]; loadLevelMap(LEVELS[0]); }
  checkAch();
  const cont = Math.min(unlocked, LEVELS.length - 1), achN = Object.keys(save.ach).length;
  showScreen(`<h1>ZONA MUERTA</h1><div class="sub">SOBREVIVE A LA INVASIÓN ZOMBI</div>
    <div class="coins">🪙 ${save.coins} &nbsp;·&nbsp; <span style="color:#7fd0ff">Nivel ${save.xpLevel}</span>${save.skillPts ? ' &nbsp;·&nbsp; <span style="color:#9bd14b">¡' + save.skillPts + ' punto(s) de habilidad!</span>' : ''}</div>
    <div class="menu-grid">
      <button data-a="play" class="big">📖 ${unlocked > 0 ? 'HISTORIA (Nivel ' + (cont + 1) + ')' : 'HISTORIA'}</button>
      <button data-a="survival" class="big red">☠ SUPERVIVENCIA <small>Récord: oleada ${save.stats.bestWave}</small></button>
      <button data-a="shop">🛒 TIENDA</button>
      <button data-a="character">🧍 PERSONAJE${save.skillPts ? ' ●' : ''}</button>
      <button data-a="levels">🗺 ELEGIR NIVEL</button>
      <button data-a="achievements">🏆 LOGROS (${achN}/${ACHIEVEMENTS.length})</button>
      <button data-a="records">📊 RÉCORDS</button>
      <button data-a="options">⚙ OPCIONES</button>
      <button data-a="controls" style="grid-column:1/-1">🎮 CONTROLES</button>
    </div>`);
}
function showStory(idx) {
  G.level = idx;
  showScreen(`<h2>Nivel ${idx + 1}: ${LEVELS[idx].title}</h2><p class="story">${STORY[idx]}</p>
    <p style="color:#ffd34d">${LEVELS[idx].mission === 'rescue' ? '🙋 Misión: rescata a ' + LEVELS[idx].rescue + ' sobrevivientes' : LEVELS[idx].mission === 'defend' ? '⚡ Misión: defiende el generador ' + LEVELS[idx].defend + ' segundos' : '🧟 Misión: elimina ' + LEVELS[idx].goal + ' zombis'} · Jefe: ${BOSSES[LEVELS[idx].boss].name}${LEVELS[idx].escape ? ' · 🚁 Escapa en helicóptero' : ''}</p>
    <button data-a="level" data-v="${idx}">¡A JUGAR! ▶</button><button data-a="menu" class="red">VOLVER</button>`);
}
function showLevels() {
  let h = '<h2>Elige un nivel</h2><div class="grid">';
  LEVELS.forEach((L, i) => {
    const lock = i > unlocked, st = save.stars[i] || 0;
    h += `<button data-a="story" data-v="${i}" ${lock ? 'disabled' : ''}>${lock ? '🔒 ' : ''}Nivel ${i + 1}<small>${lock ? 'Bloqueado' : THEMES[L.map].name}</small><small class="st">${lock ? '' : stars(st)}</small></button>`;
  });
  showScreen(h + '</div><button data-a="menu">VOLVER</button>', true);
}

/* ---------- tienda ---------- */
let shopTab = 'armas';
function card(title, desc, info, price, can, id, done, extraBtn) {
  return `<div class="card${done ? ' owned' : ''}"><b>${title}</b><small>${desc}</small>${info ? `<i>${info}</i>` : ''}
    ${done ? '<span class="tag">✔ ' + done + '</span>' : `<button data-a="buy" data-v="${id}" ${!can || save.coins < price ? 'disabled' : ''}>🪙 ${price}</button>`}${extraBtn || ''}</div>`;
}
function showShop(from, tab) {
  if (from) G.shopFrom = from; if (tab) shopTab = tab;
  const tabs = { armas: '🔫 Armas', mejoras: '⬆ Mejoras', equipo: '🛡 Equipo', equipo2: '🧨 Trampas', aliados: '👥 Compañeros', skins: '🎨 Skins' };
  let h = `<h2>🛒 Tienda</h2><div class="coins">Tienes 🪙 ${save.coins} monedas</div><div class="tabs">`;
  for (const k in tabs) h += `<button data-a="tab" data-v="${k}" class="${shopTab === k ? 'on' : ''}">${tabs[k]}</button>`;
  h += '</div><div class="shop">';
  if (shopTab === 'armas') WEAPONS.forEach((w, i) => {
    if (i === 0) return;
    if (w.legend) h += card('🌟 ' + w.name, w.desc, 'Solo la sueltan los jefes', 0, false, '', ownedWeapon(i) ? 'La tienes' : null, ownedWeapon(i) ? '' : '<span class="tag" style="color:#d080ff">Derrota jefes para conseguirla</span>').replace(/<button[^>]*>🪙 0<\/button>/, '');
    else h += card(w.name, w.desc, `Daño ${w.dmg}${w.pellets > 1 ? '×' + w.pellets : ''} · Cargador ${w.mag}`, w.price, true, 'weapon:' + i, ownedWeapon(i) ? 'Comprada' : null);
  });
  if (shopTab === 'mejoras') {
    const names = ['Daño +15%', 'Cargador +20%', 'Recarga −12%'];
    save.owned.slice().sort((a, b) => a - b).forEach(wi => {
      const u = upg(wi); let rows = '';
      names.forEach((n, k) => { const p = upgPrice(wi, k); rows += `<div class="row"><span>${n} <i>${u[k]}/3</i></span>${u[k] >= 3 ? '<span class="tag">MÁX</span>' : `<button data-a="buy" data-v="upg:${wi}:${k}" ${save.coins < p ? 'disabled' : ''}>🪙 ${p}</button>`}</div>`; });
      h += `<div class="card wide"><b>${WEAPONS[wi].name}</b>${rows}</div>`;
    });
  }
  if (shopTab === 'equipo') {
    ARMORS.forEach((a, i) => { if (i) h += card(a.name, `Absorbe daño hasta ${a.max} puntos${a.reduce ? ' y reduce 15% extra' : ''}.`, '', a.price, i === save.armorTier + 1, 'armor:' + i, save.armorTier >= i ? 'Tienes' : null); });
    SHOP_GEAR.filter(g => !GADGETS.includes(g.id)).forEach(g => { h += card(g.name, g.desc, g.info(), g.price(), g.can(), 'gear:' + g.id, g.can() ? null : 'Máximo'); });
  }
  if (shopTab === 'equipo2') SHOP_GEAR.filter(g => GADGETS.includes(g.id) || g.id === 'grenades').forEach(g => { h += card(g.name, g.desc, g.info(), g.price(), g.can(), 'gear:' + g.id, g.can() ? null : 'Máximo'); });
  if (shopTab === 'aliados') {
    h += `<div class="sect">Equipo: ${save.team.length}/2 compañeros</div>`;
    for (const k in ALLY_CLASSES) {
      const c = ALLY_CLASSES[k], hired = save.team.includes(k);
      h += card(c.name, c.desc, `Vida ${c.hp} · Daño ${c.dmg}${c.pellets > 1 ? '×' + c.pellets : ''}`, c.price, save.team.length < 2, 'ally:' + k, hired ? 'En tu equipo' : null, hired ? `<button data-a="buy" data-v="fire:${k}" class="red small">Despedir</button>` : '');
    }
    h += card('🐕 Perro ' + DOG_INFO.name, 'Muerde zombis y te trae monedas. No ocupa lugar en el equipo.', `Vida ${DOG_INFO.hp} · Mordida ${DOG_INFO.dmg}`, DOG_INFO.price, true, 'dog', save.dog ? 'Te acompaña' : null);
  }
  if (shopTab === 'skins') SKINS.forEach(s => {
    const own = save.skins.includes(s.id), using = save.skin === s.id;
    h += `<div class="card${using ? ' owned' : ''}"><b><span class="dot" style="background:${s.color}"></span>${s.name}</b><small>Color de tu personaje</small>
      ${using ? '<span class="tag">✔ En uso</span>' : own ? `<button data-a="buy" data-v="use:${s.id}">Usar</button>` : `<button data-a="buy" data-v="skin:${s.id}" ${save.coins < s.price ? 'disabled' : ''}>🪙 ${s.price}</button>`}</div>`;
  });
  h += '</div>';
  h += G.shopFrom === 'level' && G.level < LEVELS.length - 1 ? '<button data-a="next">SIGUIENTE NIVEL ▶</button><button data-a="menu" class="red">MENÚ</button>' : G.shopFrom === 'over' ? '<button data-a="retry">INTENTAR DE NUEVO</button><button data-a="menu" class="red">MENÚ</button>' : '<button data-a="menu">VOLVER</button>';
  showScreen(h, true);
}
function buy(id) {
  const [kind, a, b] = id.split(':'); let price = 0, ok = false;
  if (kind === 'weapon') { const i = +a; price = WEAPONS[i].price; if (!ownedWeapon(i) && save.coins >= price) { save.owned.push(i); ok = true; } }
  else if (kind === 'armor') { const i = +a; price = ARMORS[i].price; if (i === save.armorTier + 1 && save.coins >= price) { save.armorTier = i; ok = true; } }
  else if (kind === 'gear') { const g = SHOP_GEAR.find(x => x.id === a); price = g.price(); if (g.can() && save.coins >= price) { g.buy(); ok = true; } }
  else if (kind === 'upg') { const wi = +a, k = +b, u = upg(wi).slice(); price = upgPrice(wi, k); if (u[k] < 3 && save.coins >= price) { u[k]++; save.upg[wi] = u; ok = true; } }
  else if (kind === 'ally') { price = ALLY_CLASSES[a].price; if (save.team.length < 2 && !save.team.includes(a) && save.coins >= price) { save.team.push(a); ok = true; } }
  else if (kind === 'fire') { save.team = save.team.filter(x => x !== a); persist(); return showShop(); }
  else if (kind === 'dog') { price = DOG_INFO.price; if (!save.dog && save.coins >= price) { save.dog = true; ok = true; } }
  else if (kind === 'skin') { const s = SKINS.find(x => x.id === a); price = s.price; if (!save.skins.includes(a) && save.coins >= price) { save.skins.push(a); save.skin = a; ok = true; } }
  else if (kind === 'use') { save.skin = a; persist(); Sfx.ui(); return showShop(); }
  if (ok) { save.coins -= price; Sfx.buy(); checkAch(); persist(); }
  showShop();
}

/* ---------- personaje, logros, récords ---------- */
function showCharacter() {
  let h = `<h2>🧍 Personaje</h2><div class="coins" style="color:#7fd0ff">Nivel ${save.xpLevel}</div>
    <div class="xpbar"><div style="width:${Math.round(save.xp / xpNeed(save.xpLevel) * 100)}%"></div></div>
    <p>${save.xp} / ${xpNeed(save.xpLevel)} XP · Ganas XP al eliminar zombis</p>
    <div class="coins" style="color:#9bd14b">Puntos disponibles: ${save.skillPts}</div><div class="shop">`;
  SKILLS.forEach(s => { const lv = skill(s.id); h += `<div class="card${lv >= s.max ? ' owned' : ''}"><b>${s.name}</b><small>${s.desc}</small><i>${lv}/${s.max}</i>${lv >= s.max ? '<span class="tag">MÁX</span>' : `<button data-a="skill" data-v="${s.id}" ${save.skillPts <= 0 ? 'disabled' : ''}>+1 punto</button>`}</div>`; });
  showScreen(h + '</div><button data-a="menu">VOLVER</button>', true);
}
function addSkill(id) { const s = SKILLS.find(x => x.id === id); if (save.skillPts > 0 && skill(id) < s.max) { save.skills[id] = skill(id) + 1; save.skillPts--; Sfx.levelUp(); persist(); } showCharacter(); }
function showAchievements() {
  let h = `<h2>🏆 Logros</h2><div class="coins">${Object.keys(save.ach).length} de ${ACHIEVEMENTS.length} · cada uno da 🪙 50</div><div class="shop">`;
  ACHIEVEMENTS.forEach(a => { const ok = save.ach[a.id]; h += `<div class="card${ok ? ' owned' : ''}"><b>${ok ? '🏆' : '🔒'} ${a.name}</b><small>${a.desc}</small></div>`; });
  const s = save.stats;
  h += `</div><p style="font-size:13px">Zombis: ${s.kills} · Jefes: ${s.bosses} · Perros: ${s.dogs} · Con machete: ${s.melee} · Rescatados: ${s.rescued} · Cofres: ${s.chests} · Monedas totales: ${s.coinsTotal}</p>`;
  showScreen(h + '<button data-a="menu">VOLVER</button>', true);
}
function showRecords() {
  let h = '<h2>📊 Récords</h2>';
  if (!save.records.length) h += '<p>Todavía no hay récords. ¡Juega una partida!</p>';
  else { h += '<table class="rec"><tr><th>#</th><th>Puntos</th><th>Partida</th><th>Fecha</th></tr>'; save.records.forEach((r, i) => { h += `<tr><td>${i + 1}</td><td><b>${r.score}</b></td><td>${r.label}</td><td>${r.date}</td></tr>`; }); h += '</table>'; }
  h += `<p>Mejor oleada en Supervivencia: <b style="color:#ffd34d">${save.stats.bestWave}</b></p>`;
  showScreen(h + '<button data-a="menu">VOLVER</button>');
}

/* ---------- opciones ---------- */
function showOptions() {
  const sl = (k, label) => `<label class="opt">${label}<input type="range" min="0" max="1" step="0.05" value="${settings[k]}" data-set="${k}"></label>`;
  const tg = (k, label, txt) => `<button data-a="opt" data-v="${k}">${label}: ${txt}</button>`;
  showScreen(`<h2>⚙ Opciones</h2>
    ${sl('vol', '🔊 Volumen general')}${sl('music', '🎵 Música')}${sl('sfx', '💥 Efectos')}
    <div class="menu-grid">
      ${tg('diff', 'Dificultad', DIFF[settings.diff].name)}
      ${tg('autoAim', 'Autoapuntado', settings.autoAim ? 'SÍ' : 'NO')}
      ${tg('vibrate', 'Vibrar al recibir daño', settings.vibrate ? 'SÍ' : 'NO')}
      ${tg('joySens', 'Sensibilidad joystick', ['Baja', 'Media', 'Alta'][settings.joySens])}
    </div>
    <p style="font-size:12px">Fácil: recibes menos daño. Difícil: zombis más resistentes, pero ganas 30% más monedas.</p>
    <button data-a="menu">VOLVER</button>`);
}
function toggleOpt(k) {
  if (k === 'diff') settings.diff = (settings.diff + 1) % 3;
  else if (k === 'joySens') settings.joySens = (settings.joySens + 1) % 3;
  else settings[k] = !settings[k];
  saveSettings(); showOptions();
}
ov.addEventListener('input', e => { const k = e.target.dataset && e.target.dataset.set; if (!k) return; settings[k] = +e.target.value; saveSettings(); audioInit(); Sfx.applyVolumes(); });
function toggleAutoAim() { settings.autoAim = !settings.autoAim; G.target = null; saveSettings(); }

function showControls() {
  const extra = `<p>Gana <b style="color:#ffd34d">monedas</b> y <b style="color:#7fd0ff">experiencia</b>. Compra armas, mejoras, trampas y compañeros. Busca <b>llaves 🔑</b> para abrir bóvedas con cofres, y dispárale a los <b>barriles rojos</b> para explotar grupos de zombis.</p>`;
  if (TOUCH) return showScreen(`<h2>Controles (celular)</h2><table>
    <tr><td class="k">Mitad izquierda</td><td>Joystick: moverse</td></tr>
    <tr><td class="k">Mitad derecha / FUEGO</td><td>Disparar (arrastra para apuntar a mano)</td></tr>
    <tr><td class="k">CORRER · 🔪 · R · ⇄</td><td>Correr · Machete · Recargar · Cambiar arma</td></tr>
    <tr><td class="k">🩹 · ⚡ · 💣</td><td>Botiquín · Adrenalina · Granada</td></tr>
    <tr><td class="k">🛠 / ⟳</td><td>Colocar trampa / elegir cuál</td></tr>
    <tr><td class="k">📢 · II</td><td>Orden a compañeros · Pausa</td></tr></table>${extra}<button data-a="menu">VOLVER</button>`);
  showScreen(`<h2>Controles</h2><table>
    <tr><td class="k">W A S D · Mouse · Clic</td><td>Moverse · Apuntar · Disparar</td></tr>
    <tr><td class="k">Shift</td><td>Activar / desactivar correr</td></tr>
    <tr><td class="k">R · 1–9 / Rueda</td><td>Recargar · Cambiar arma</td></tr>
    <tr><td class="k">V · G</td><td>Machete · Lanzar granada</td></tr>
    <tr><td class="k">Q · E</td><td>Botiquín · Adrenalina</td></tr>
    <tr><td class="k">C · X · Z</td><td>Torreta · Mina · Barricada</td></tr>
    <tr><td class="k">O</td><td>Orden a compañeros (síganme / quietos / ataquen)</td></tr>
    <tr><td class="k">T · M · P</td><td>Autoapuntado · Silenciar · Pausa</td></tr></table>${extra}<button data-a="menu">VOLVER</button>`);
}

/* ---------- pausa, derrota y victoria ---------- */
function pauseGame() { if (G.state !== 'play' || G.cine) return; G.state = 'pause'; mouse.down = false; touch.joy = touch.fire = null; showScreen(`<h2>Pausa</h2><button data-a="resume">CONTINUAR</button><button data-a="options2">⚙ OPCIONES</button><button data-a="retry">REINICIAR</button><button data-a="menu" class="red">MENÚ PRINCIPAL</button>`); }
function resume() { G.state = 'play'; hideScreen(); cv.classList.add('playing'); }
function stats() {
  const acc = G.shots ? Math.round(G.hits / G.shots * 100) : 0, t = Math.floor(G.time);
  return `<div class="stats">Zombis: <b>${G.kills}</b> · Puntos: <b>${G.score}</b> · Precisión: <b>${acc}%</b> · Tiempo: <b>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b><br>Monedas ganadas: <b>🪙 ${G.coinsLevel}</b> · Total: <b>🪙 ${save.coins}</b></div>`;
}
function gameOver(msg) {
  if (G.state !== 'play') return;
  G.state = 'over'; mouse.down = false; touch.joy = touch.fire = null; Sfx.lose(); Sfx.stopRain();
  const surv = G.mode === 'survival';
  addRecord(G.score, surv ? 'Supervivencia · oleada ' + G.wave : 'Nivel ' + (G.level + 1) + ' (no terminado)'); checkAch(); persist();
  setTimeout(() => showScreen(`<h2 style="color:#e33">${msg}</h2>${surv ? `<div class="coins">Llegaste a la oleada ${G.wave} · Récord: ${save.stats.bestWave}</div>` : ''}${stats()}<p>Conservas las monedas y la experiencia. ¡Mejora tu equipo!</p>
    <button data-a="${surv ? 'survival' : 'retry'}">INTENTAR DE NUEVO</button><button data-a="shopOver">🛒 TIENDA</button><button data-a="menu" class="red">MENÚ PRINCIPAL</button>`), 900);
}
function levelComplete() {
  if (G.state !== 'play') return;
  G.state = 'complete'; mouse.down = false; touch.joy = touch.fire = null; Sfx.win(); Sfx.stopRain();
  const p = G.p, acc = G.shots ? G.hits / G.shots * 100 : 0;
  const st = 1 + (p.hp >= p.maxHp * .5 ? 1 : 0) + (acc >= 40 ? 1 : 0);
  save.stars[G.level] = Math.max(save.stars[G.level] || 0, st);
  if (G.dmgTaken === 0) unlockAch('nodmg');
  const bonus = 50 + G.level * 25; addCoins(bonus);
  unlocked = Math.max(unlocked, G.level + 1); addRecord(G.score, 'Nivel ' + (G.level + 1) + ' · ' + G.L.title); checkAch(); saveProgress();
  const last = G.level >= LEVELS.length - 1;
  const starHtml = `<div class="bigstars">${stars(st)}</div><p style="font-size:13px">★ Completar ${p.hp >= p.maxHp * .5 ? '· ★' : '· ☆'} Vida ≥ 50% ${acc >= 40 ? '· ★' : '· ☆'} Precisión ≥ 40%</p>`;
  setTimeout(() => showScreen(last
    ? `<h1 style="font-size:46px">¡VICTORIA!</h1><p class="story">Escapaste en el helicóptero con los sobrevivientes. El Rey Zombi cayó y la ciudad tiene esperanza otra vez. ¡Eres una leyenda!</p>${starHtml}${stats()}<button data-a="survival">☠ PROBAR SUPERVIVENCIA</button><button data-a="menu">MENÚ PRINCIPAL</button>`
    : `<h2>¡Nivel ${G.level + 1} superado!</h2>${starHtml}<p>Bono por nivel: 🪙 ${bonus}</p>${stats()}<button data-a="nextStory">SIGUIENTE NIVEL ▶</button><button data-a="shopLevel">🛒 TIENDA</button><button data-a="retry">REPETIR</button><button data-a="menu" class="red">MENÚ</button>`), 900);
}

const actions = {
  play: () => showStory(Math.min(unlocked, LEVELS.length - 1)), story: v => showStory(+v), level: v => startLevel(+v),
  survival: startSurvival, levels: showLevels, controls: showControls, menu: showMenu, resume,
  retry: () => G.mode === 'survival' ? startSurvival() : startLevel(G.level), next: () => showStory(Math.min(G.level + 1, LEVELS.length - 1)), nextStory: () => showStory(Math.min(G.level + 1, LEVELS.length - 1)),
  shop: () => showShop('menu'), shopLevel: () => showShop('level'), shopOver: () => showShop('over'), tab: v => showShop(null, v), buy,
  character: showCharacter, skill: addSkill, achievements: showAchievements, records: showRecords, options: showOptions, opt: toggleOpt,
  options2: () => { showOptions(); ov.querySelector('[data-a="menu"]').outerHTML = '<button data-a="pauseBack">VOLVER</button>'; }, pauseBack: () => { G.state = 'play'; pauseGame(); },
};
ov.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return; audioInit(); Sfx.ui();
  if (TOUCH && !document.fullscreenElement && !matchMedia('(display-mode: standalone)').matches) {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { })).catch(() => { });
  }
  const fn = actions[b.dataset.a]; if (fn) fn(b.dataset.v);
});

/* ---------- teclado y mouse ---------- */
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyP' || e.code === 'Escape') { if (G.state === 'play') pauseGame(); else if (G.state === 'pause') resume(); }
  if (e.code === 'KeyM') Sfx.muted = !Sfx.muted;
  if (e.code === 'KeyT') toggleAutoAim();
  if (G.state !== 'play' || G.cine) return;
  if (e.code === 'KeyR') startReload();
  if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) toggleRun();
  if (e.code === 'KeyQ') useMedkit();
  if (e.code === 'KeyE') useAdren();
  if (e.code === 'KeyG' && !e.repeat) throwGrenade();
  if (e.code === 'KeyV') melee();
  if (e.code === 'KeyC' && !e.repeat) placeGadget('turrets');
  if (e.code === 'KeyX' && !e.repeat) placeGadget('mines');
  if (e.code === 'KeyZ' && !e.repeat) placeGadget('barricades');
  if (e.code === 'KeyO' && !e.repeat && G.allies.length) cycleOrder();
  const m = /^Digit([1-9])$/.exec(e.code); if (m) switchWeapon(+m[1] - 1);
  if (e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'Tab') e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
cv.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
cv.addEventListener('mousedown', e => { if (e.button === 0) { mouse.down = true; audioInit(); } if (e.button === 2 && G.state === 'play') melee(); });
addEventListener('mouseup', e => { if (e.button === 0) { mouse.down = false; if (G.p) G.p.emptyClick = false; } });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { if (G.state === 'play') cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: true });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; pauseGame(); });

/* ---------- controles táctiles ---------- */
const touch = { joy: null, fire: null };
function joyRadius() { return [80, 60, 45][settings.joySens]; }
function btnLayout() {
  const s = Math.max(.8, Math.min(1.25, Math.min(VW, VH) / 400)), iy = VH - 225 * s;
  return {
    fire: { x: VW - 95 * s, y: VH - 95 * s, r: 56 * s },
    reload: { x: VW - 205 * s, y: VH - 50 * s, r: 28 * s },
    swap: { x: VW - 205 * s, y: VH - 140 * s, r: 28 * s },
    run: { x: VW - 95 * s, y: VH - 200 * s, r: 30 * s },
    melee: { x: VW - 295 * s, y: VH - 55 * s, r: 26 * s },
    gadget: { x: VW - 295 * s, y: VH - 140 * s, r: 26 * s },
    gcycle: { x: VW - 295 * s + 30 * s, y: VH - 140 * s - 30 * s, r: 13 },
    medkit: { x: 40, y: iy, r: 22 }, adren: { x: 94, y: iy, r: 22 }, grenade: { x: 148, y: iy, r: 22 }, order: { x: 202, y: iy, r: 22 },
    pause: { x: VW - (G.mini ? G.mini.width * .6 : 120) - 50, y: 40, r: 22 },
  };
}
function touchAimAngle() { const f = touch.fire; if (!f) return null; const dx = f.x - f.ox, dy = f.y - f.oy; return Math.hypot(dx, dy) > 22 ? Math.atan2(dy, dx) : null; }
function inBtn(b, x, y, k) { return Math.hypot(x - b.x, y - b.y) < b.r * k; }
cv.addEventListener('touchstart', e => {
  e.preventDefault(); audioInit(); if (G.state !== 'play' || G.cine) return;
  const L = btnLayout();
  for (const t of e.changedTouches) {
    const x = t.clientX, y = t.clientY;
    if (inBtn(L.pause, x, y, 1.5)) { pauseGame(); return; }
    const acts = [['gcycle', cycleGadget], ['reload', startReload], ['swap', () => cycleWeapon(1)], ['run', toggleRun], ['melee', melee], ['gadget', () => placeGadget(GADGETS[G.gadget])], ['medkit', useMedkit], ['adren', useAdren], ['grenade', throwGrenade]];
    if (G.allies.length) acts.push(['order', cycleOrder]);
    const hit = acts.find(([k]) => inBtn(L[k], x, y, k === 'gcycle' ? 1.6 : 1.25)); if (hit) { hit[1](); continue; }
    if (x >= VW * .45) { if (!touch.fire) touch.fire = { id: t.identifier, ox: x, oy: y, x, y }; }
    else if (!touch.joy) touch.joy = { id: t.identifier, ox: x, oy: y, x, y };
  }
}, { passive: false });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) for (const k of ['joy', 'fire']) {
    const o = touch[k]; if (!o || o.id !== t.identifier) continue; o.x = t.clientX; o.y = t.clientY;
    if (k === 'joy') { const R = joyRadius() + 10, dx = o.x - o.ox, dy = o.y - o.oy, d = Math.hypot(dx, dy); if (d > R) { o.ox = o.x - dx / d * R; o.oy = o.y - dy / d * R; } }
  }
}, { passive: false });
function touchEnd(e) { for (const t of e.changedTouches) { if (touch.joy && touch.joy.id === t.identifier) touch.joy = null; if (touch.fire && touch.fire.id === t.identifier) { touch.fire = null; if (G.p) G.p.emptyClick = false; } } }
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
  const L = btnLayout(), j = touch.joy, R = joyRadius() + 10;
  const jx = j ? j.ox : 110, jy = j ? j.oy : VH - 100;
  ctx.globalAlpha = j ? .5 : .25; ctx.fillStyle = '#000'; circle(ctx, jx, jy, R);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(jx, jy, R, 0, TAU); ctx.stroke();
  ctx.globalAlpha = j ? .85 : .4; ctx.fillStyle = '#9bd14b'; circle(ctx, j ? j.x : jx, j ? j.y : jy, 30); ctx.globalAlpha = 1;
  const f = touch.fire, gk = GADGETS[G.gadget];
  touchBtn(L.fire, 'FUEGO', '#b02020', !!f);
  if (f && touchAimAngle() !== null) { ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.ox, f.oy); ctx.lineTo(f.x, f.y); ctx.stroke(); }
  touchBtn(L.reload, 'R', '#806010', G.p.reloading > 0);
  touchBtn(L.swap, '⇄', '#305080', false);
  touchBtn(L.run, 'CORRER', '#206070', G.p.running);
  touchBtn(L.melee, '🔪', '#505050', G.p.swingT > 0);
  touchBtn(L.gadget, GADGET_ICON[gk], '#4a5a2a', false, save[gk]);
  touchBtn(L.gcycle, '⟳', '#333', false);
  touchBtn(L.medkit, '🩹', '#702020', false, save.medkit);
  touchBtn(L.adren, '⚡', '#706010', G.p.adrenT > 0, save.adren);
  touchBtn(L.grenade, '💣', '#3a5a2a', false, save.grenades);
  if (G.allies.length) touchBtn(L.order, '📢', '#205080', G.order !== 'follow');
  touchBtn(L.pause, 'II', '#333', false);
}

/* ---------- bucle principal ---------- */
let last = performance.now();
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  requestAnimationFrame(frame);
  try {
    if (G.state === 'play') update(dt);
    else if (G.state === 'menu' && G.map) { G.menuT += dt; G.cam.x = (G.map.pw - VW / Z) / 2 + Math.cos(G.menuT * .1) * 500; G.cam.y = (G.map.ph - VH / Z) / 2 + Math.sin(G.menuT * .13) * 300; }
    render();
  } catch (e) { if (!frame.err) { frame.err = true; console.error(e); } }
}
showMenu();
requestAnimationFrame(frame);

/* ---------- PWA: funciona sin Internet y se puede instalar en el celular ---------- */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
