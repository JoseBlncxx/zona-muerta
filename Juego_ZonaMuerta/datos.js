'use strict';
/* =========================================================
   ZONA MUERTA - DATOS DEL JUEGO
   Armas, zombis, jefes, niveles, historia, tienda, logros,
   habilidades, skins, progreso guardado y opciones.
   ========================================================= */

/* ---------- armas (las 2 últimas son legendarias: solo las sueltan los jefes) ---------- */
const WEAPONS = [
  { id: 'pistol', name: 'Pistola', price: 0, dmg: 28, rate: .22, mag: 12, reserve: Infinity, reload: 1.0, spread: .03, pellets: 1, speed: 1300, len: 14, shake: 2, knock: 90, give: 0, desc: 'Munición infinita.' },
  { id: 'shotgun', name: 'Escopeta', price: 150, dmg: 17, rate: .75, mag: 6, reserve: 36, reload: 1.7, spread: .2, pellets: 8, speed: 1100, len: 22, shake: 8, knock: 200, give: 12, desc: 'Devastadora de cerca.' },
  { id: 'rifle', name: 'Rifle de Asalto', price: 300, dmg: 22, rate: .09, mag: 30, reserve: 180, reload: 1.5, spread: .05, pellets: 1, speed: 1550, len: 26, shake: 2.5, knock: 70, give: 60, desc: 'Automático y preciso.' },
  { id: 'sniper', name: 'Francotirador', price: 450, dmg: 130, rate: 1.0, mag: 5, reserve: 30, reload: 2.0, spread: .004, pellets: 1, speed: 2600, len: 34, shake: 6, knock: 250, give: 10, pierce: 4, desc: 'Atraviesa hasta 4 zombis y cascos.' },
  { id: 'flame', name: 'Lanzallamas', price: 650, dmg: 7, rate: .04, mag: 120, reserve: 360, reload: 2.2, spread: .22, pellets: 1, speed: 480, len: 24, shake: 1, knock: 12, give: 120, flame: true, desc: 'ESPECIAL: quema a corta distancia.' },
  { id: 'grenade', name: 'Lanzagranadas', price: 800, dmg: 160, rate: .8, mag: 4, reserve: 20, reload: 2.4, spread: .03, pellets: 1, speed: 650, len: 24, shake: 5, knock: 0, give: 6, grenade: true, desc: 'ESPECIAL: explosiones de área.' },
  { id: 'minigun', name: 'Minigun', price: 1100, dmg: 15, rate: .05, mag: 150, reserve: 450, reload: 3.2, spread: .11, pellets: 1, speed: 1500, len: 30, shake: 2, knock: 50, give: 150, desc: 'ESPECIAL: una lluvia de balas.' },
  { id: 'laser', name: 'Rayo Láser', price: 0, legend: true, dmg: 16, rate: .06, mag: 60, reserve: 300, reload: 1.8, spread: .01, pellets: 1, speed: 4200, len: 30, shake: 1, knock: 30, give: 60, pierce: 20, laser: true, desc: 'LEGENDARIA: atraviesa todo.' },
  { id: 'crossbow', name: 'Ballesta Explosiva', price: 0, legend: true, dmg: 95, rate: .55, mag: 8, reserve: 40, reload: 1.9, spread: .01, pellets: 1, speed: 1300, len: 28, shake: 4, knock: 0, give: 8, bolt: true, desc: 'LEGENDARIA: flechas que explotan.' },
];

/* ---------- zombis ---------- */
const ZTYPES = {
  normal: { name: 'Zombi', hp: 60, speed: 72, dmg: 10, r: 15, body: '#5d7f3a', head: '#7fa356', arm: '#4f6d30', score: 10, coins: 5, cd: .8 },
  runner: { name: 'Corredor', hp: 35, speed: 150, dmg: 7, r: 12, body: '#8a8a3a', head: '#b0b060', arm: '#70702c', score: 15, coins: 5, cd: .6 },
  tank: { name: 'Tanque', hp: 300, speed: 46, dmg: 25, r: 24, body: '#4b5a3a', head: '#6b7d50', arm: '#3b4a2c', score: 40, coins: 20, cd: 1.1, abil: ['charge'] },
  spitter: { name: 'Vomitador', hp: 80, speed: 58, dmg: 8, r: 17, body: '#8a9a2a', head: '#b8c840', arm: '#6a7a20', score: 25, coins: 12, cd: .9, abil: ['spit'], ranged: true },
  dog: { name: 'Perro infectado', hp: 32, speed: 195, dmg: 8, r: 11, body: '#5a4636', head: '#6e5642', arm: '#4a3828', score: 12, coins: 4, cd: .5, dog: true },
  bomber: { name: 'Explosivo', hp: 50, speed: 92, dmg: 0, r: 17, body: '#a05a2a', head: '#c8783a', arm: '#804820', score: 20, coins: 8, cd: 1, bomber: true },
  screamer: { name: 'Gritón', hp: 70, speed: 64, dmg: 9, r: 14, body: '#6a5a7a', head: '#9a8aaa', arm: '#54486a', score: 25, coins: 12, cd: .8, abil: ['scream'], ranged: true },
  armored: { name: 'Blindado', hp: 140, speed: 62, dmg: 14, r: 17, body: '#3a4a5a', head: '#7a8a9a', arm: '#2a3a4a', score: 30, coins: 15, cd: .9, armored: true },
};

/* ---------- jefes ---------- */
const BOSSES = {
  carnicero: { name: 'El Carnicero', r: 40, body: '#6b2a2a', head: '#8f4040', arm: '#552020', speed: 70, dmg: 30, hp: 1300, abil: ['charge'] },
  enfermera: { name: 'La Enfermera', r: 38, body: '#c8c8b0', head: '#e4e4d4', arm: '#a8a890', speed: 66, dmg: 26, hp: 1500, abil: ['spit', 'summon'] },
  alfa: { name: 'Alfa Rabioso', r: 32, dog: true, body: '#3e3024', head: '#5a4632', arm: '#2e2418', speed: 125, dmg: 22, hp: 1400, abil: ['summonDogs', 'charge'] },
  guardia: { name: 'El Guardia', r: 40, body: '#2a3a5a', head: '#8a9aaa', arm: '#1a2a4a', speed: 64, dmg: 30, hp: 1800, abil: ['charge'], armored: true },
  experimento: { name: 'Experimento X-13', r: 40, body: '#5a7a20', head: '#8aaa30', arm: '#4a6a18', speed: 55, dmg: 28, hp: 1900, abil: ['spit', 'summon'] },
  conductor: { name: 'El Conductor', r: 40, body: '#4a3a2a', head: '#6a5a4a', arm: '#3a2a1a', speed: 82, dmg: 32, hp: 2100, abil: ['charge', 'summon'] },
  sargento: { name: 'Sargento Podrido', r: 42, body: '#3f4a2a', head: '#5f6a40', arm: '#2f3a1f', speed: 65, dmg: 32, hp: 2300, abil: ['charge', 'spit'] },
  piloto: { name: 'El Piloto', r: 42, body: '#2a4a6a', head: '#c8b08a', arm: '#1a3a5a', speed: 70, dmg: 32, hp: 2500, abil: ['spit', 'summonDogs', 'charge'] },
  sepulturero: { name: 'El Sepulturero', r: 40, body: '#3a3a44', head: '#5a5a66', arm: '#2a2a33', speed: 75, dmg: 30, hp: 2600, abil: ['summon', 'charge', 'scream'] },
  rey: { name: 'Rey Zombi', r: 46, body: '#5a2a66', head: '#7f3f8f', arm: '#46204f', speed: 62, dmg: 35, hp: 3400, abil: ['summon', 'spit', 'charge'], crown: true },
};

/* ---------- niveles: misión 'kill' (eliminar), 'rescue' (rescatar) o 'defend' (defender el generador) ---------- */
const M = (o) => Object.assign({ mission: 'kill', goal: 30, maxAlive: 14, rate: 1.1, weather: null, daynight: false }, o);
const LEVELS = [
  M({ map: 'ciudad', seed: 11, goal: 20, maxAlive: 8, rate: 1.6, mix: { normal: 1 }, title: 'Primer contacto', boss: 'carnicero' }),
  M({ map: 'ciudad', seed: 12, mission: 'rescue', rescue: 3, maxAlive: 11, rate: 1.2, mix: { normal: .55, runner: .25, dog: .12, bomber: .08 }, title: 'Calles infestadas', boss: 'carnicero', weather: 'rain' }),
  M({ map: 'hospital', seed: 61, goal: 35, maxAlive: 13, rate: 1.1, mix: { normal: .45, runner: .25, spitter: .1, bomber: .1, armored: .1 }, title: 'Hospital San Judas', boss: 'enfermera' }),
  M({ map: 'bosque', seed: 21, goal: 35, maxAlive: 14, rate: 1.1, mix: { normal: .4, runner: .2, dog: .3, bomber: .1 }, title: 'Entre los árboles', boss: 'alfa', weather: 'fog', daynight: true }),
  M({ map: 'bosque', seed: 22, mission: 'defend', defend: 90, maxAlive: 15, rate: 1.0, mix: { normal: .35, runner: .2, dog: .2, tank: .08, spitter: .07, screamer: .1 }, title: 'La cabaña perdida', boss: 'alfa', weather: 'storm' }),
  M({ map: 'mall', seed: 71, goal: 45, maxAlive: 17, rate: .9, mix: { normal: .35, runner: .25, armored: .15, bomber: .1, screamer: .1, dog: .05 }, title: 'Centro comercial', boss: 'guardia' }),
  M({ map: 'laboratorio', seed: 31, goal: 45, maxAlive: 18, rate: .9, mix: { normal: .35, runner: .2, spitter: .2, tank: .1, bomber: .1, armored: .05 }, title: 'Paciente cero', boss: 'experimento' }),
  M({ map: 'laboratorio', seed: 32, mission: 'rescue', rescue: 4, maxAlive: 18, rate: .85, mix: { normal: .3, runner: .25, spitter: .15, tank: .1, screamer: .1, armored: .1 }, title: 'Fuga del laboratorio', boss: 'experimento' }),
  M({ map: 'metro', seed: 81, goal: 55, maxAlive: 20, rate: .8, mix: { normal: .3, runner: .25, dog: .15, bomber: .1, tank: .1, armored: .1 }, title: 'Túneles del metro', boss: 'conductor' }),
  M({ map: 'base', seed: 51, mission: 'defend', defend: 110, maxAlive: 21, rate: .75, mix: { normal: .25, runner: .2, dog: .15, spitter: .1, tank: .1, armored: .1, bomber: .1 }, title: 'Última defensa', boss: 'sargento', weather: 'rain', daynight: true }),
  M({ map: 'aeropuerto', seed: 91, goal: 60, maxAlive: 22, rate: .7, mix: { normal: .25, runner: .2, dog: .15, spitter: .1, tank: .1, armored: .1, screamer: .1 }, title: 'Aeropuerto', boss: 'piloto', weather: 'storm', daynight: true }),
  M({ map: 'cementerio', seed: 41, goal: 60, maxAlive: 24, rate: .7, mix: { normal: .25, runner: .2, dog: .15, spitter: .1, tank: .1, bomber: .1, screamer: .1 }, title: 'Noche de difuntos', boss: 'sepulturero', weather: 'fog' }),
  M({ map: 'cementerio', seed: 42, goal: 40, maxAlive: 22, rate: .75, mix: { normal: .25, runner: .2, dog: .15, spitter: .1, tank: .1, armored: .1, bomber: .1 }, title: 'El Rey Zombi', boss: 'rey', final: true, escape: true, weather: 'storm' }),
];
const STORY = [
  'Día 1. Un virus desconocido convirtió a la ciudad en un infierno. La radio repite lo mismo: "Busquen refugio". Tú tienes otros planes.',
  'Hay sobrevivientes atrapados en las calles. Las pistas en la radio dicen que son tres. Encuéntralos antes que los muertos.',
  'Los sobrevivientes hablan del Hospital San Judas: ahí comenzaron los primeros casos. Tal vez haya respuestas… o algo peor.',
  'En el hospital encontraste una nota: "Los envíos venían de un laboratorio en el bosque". Hay que cruzarlo.',
  'Una cabaña con un generador. Si lo mantienes encendido, el radio podrá pedir ayuda. Defiéndelo cueste lo que cueste.',
  'La ayuda no llegó. Las provisiones están en el centro comercial, aunque algo grande vigila los pasillos.',
  'Al fin, el Laboratorio X-13. Aquí nació la infección. Los registros mencionan al "Paciente cero".',
  'Hay científicos vivos en los cuartos sellados. Ellos saben cómo detener esto. Sácalos de ahí.',
  'Los científicos dicen que el Rey Zombi controla a los demás. Su guarida está al otro lado de los túneles del metro.',
  'La base militar sigue en pie. Si el generador del radar resiste, sabremos dónde está el Rey.',
  'El radar lo ubicó: el cementerio. Pero primero necesitamos un avión de rescate listo en el aeropuerto.',
  'La niebla cubre el cementerio. El Sepulturero cuida la entrada a la cripta del Rey.',
  'Es ahora o nunca. Derrota al Rey Zombi y corre al helicóptero. La ciudad depende de ti.',
];

/* ---------- tienda ---------- */
const ARMORS = [
  { name: 'Sin armadura', max: 0, price: 0 },
  { name: 'Chaleco ligero', max: 50, price: 200 },
  { name: 'Chaleco táctico', max: 100, price: 450 },
  { name: 'Armadura pesada', max: 150, price: 800, reduce: .15 },
];
const ALLY_CLASSES = {
  soldado: { name: 'Diego · Soldado', price: 500, color: '#a8642a', dmg: 15, rate: .22, range: 480, spread: .07, pellets: 1, hp: 150, desc: 'Rifle automático.' },
  medico: { name: 'Marta · Médica', price: 600, color: '#e8e8e8', dmg: 9, rate: .4, range: 420, spread: .05, pellets: 1, hp: 130, heal: true, desc: 'Te cura cuando estás cerca.' },
  franco: { name: 'Luis · Francotirador', price: 700, color: '#4a6a3a', dmg: 75, rate: 1.1, range: 720, spread: .008, pellets: 1, hp: 110, pierce: 2, desc: 'Disparos lentos y muy fuertes.' },
  escopeta: { name: 'Rosa · Escopetera', price: 650, color: '#9a3a3a', dmg: 11, rate: .85, range: 320, spread: .18, pellets: 5, hp: 170, desc: 'Devastadora de cerca.' },
};
const DOG_INFO = { name: 'Max', price: 600, color: '#c8a060', dmg: 20, rate: .6, hp: 120 };
const SKINS = [
  { id: 'azul', name: 'Azul (original)', color: '#2f5d8a', price: 0 },
  { id: 'rojo', name: 'Rojo', color: '#a02a2a', price: 100 },
  { id: 'camuflaje', name: 'Camuflaje', color: '#4a5a2a', price: 150 },
  { id: 'negro', name: 'Agente negro', color: '#222428', price: 200 },
  { id: 'blanco', name: 'Científico', color: '#d8dde0', price: 200 },
  { id: 'morado', name: 'Morado', color: '#6a2a8a', price: 250 },
  { id: 'dorado', name: 'Dorado', color: '#d4a520', price: 600 },
];
const SHOP_GEAR = [
  { id: 'hp', name: 'Vida máxima +25', desc: 'Más resistencia en cada nivel.', price: () => 300 + save.hpUp * 200, can: () => save.hpUp < 3, buy: () => save.hpUp++, info: () => `Nivel ${save.hpUp}/3` },
  { id: 'medkit', name: 'Botiquín (Q)', desc: 'Cura 50 de vida cuando quieras.', price: () => 60, can: () => save.medkit < 9, buy: () => save.medkit++, info: () => `Tienes ${save.medkit}` },
  { id: 'adren', name: 'Adrenalina (E)', desc: '10 s: más rápido, energía infinita y menos daño.', price: () => 80, can: () => save.adren < 9, buy: () => save.adren++, info: () => `Tienes ${save.adren}` },
  { id: 'grenades', name: 'Granada de mano (G)', desc: 'Lánzala para explotar grupos de zombis.', price: () => 50, can: () => save.grenades < 9, buy: () => save.grenades++, info: () => `Tienes ${save.grenades}` },
  { id: 'turrets', name: 'Torreta automática (C)', desc: 'Dispara sola a los zombis durante 60 s.', price: () => 180, can: () => save.turrets < 5, buy: () => save.turrets++, info: () => `Tienes ${save.turrets}` },
  { id: 'mines', name: 'Mina terrestre (X)', desc: 'Explota cuando un zombi la pisa.', price: () => 70, can: () => save.mines < 9, buy: () => save.mines++, info: () => `Tienes ${save.mines}` },
  { id: 'barricades', name: 'Barricada (Z)', desc: 'Costales que bloquean el paso de los zombis.', price: () => 60, can: () => save.barricades < 9, buy: () => save.barricades++, info: () => `Tienes ${save.barricades}` },
];
const GADGETS = ['turrets', 'mines', 'barricades'];
const GADGET_ICON = { turrets: '🗼', mines: '💥', barricades: '🧱' };
const GADGET_NAME = { turrets: 'Torreta', mines: 'Mina', barricades: 'Barricada' };

/* ---------- habilidades del personaje (se ganan puntos al subir de nivel) ---------- */
const SKILLS = [
  { id: 'vida', name: 'Vida extra', desc: '+10 de vida máxima', max: 5 },
  { id: 'recarga', name: 'Recarga rápida', desc: 'Recargas 8% más rápido', max: 5 },
  { id: 'iman', name: 'Imán de monedas', desc: 'Atraes monedas desde más lejos', max: 3 },
  { id: 'velocidad', name: 'Piernas veloces', desc: 'Te mueves 5% más rápido', max: 3 },
  { id: 'resistencia', name: 'Resistencia', desc: 'Correr gasta 10% menos energía', max: 3 },
  { id: 'suerte', name: 'Suerte', desc: 'Los zombis sueltan más objetos', max: 3 },
];
function xpNeed(l) { return 100 + (l - 1) * 90; }

/* ---------- logros (cada uno da 50 monedas) ---------- */
const ACHIEVEMENTS = [
  { id: 'first', name: 'Primera sangre', desc: 'Elimina tu primer zombi', test: s => s.kills >= 1 },
  { id: 'k100', name: 'Cazador', desc: 'Elimina 100 zombis', test: s => s.kills >= 100 },
  { id: 'k1000', name: 'Exterminador', desc: 'Elimina 1000 zombis', test: s => s.kills >= 1000 },
  { id: 'boss1', name: 'Matagigantes', desc: 'Derrota a tu primer jefe', test: s => s.bosses >= 1 },
  { id: 'boss10', name: 'Cazajefes', desc: 'Derrota 10 jefes', test: s => s.bosses >= 10 },
  { id: 'king', name: 'Fin del reinado', desc: 'Derrota al Rey Zombi', test: s => s.king >= 1 },
  { id: 'nodmg', name: 'Intocable', desc: 'Termina un nivel sin recibir daño', test: () => false },
  { id: 'pistol', name: 'A la antigua', desc: 'Vence a un jefe usando solo la pistola', test: () => false },
  { id: 'melee', name: 'Ninja', desc: 'Elimina 25 zombis con el machete', test: s => s.melee >= 25 },
  { id: 'boom', name: 'Demoledor', desc: 'Elimina 5 zombis con una sola explosión', test: () => false },
  { id: 'dogs', name: 'Perrera', desc: 'Elimina 50 perros infectados', test: s => s.dogs >= 50 },
  { id: 'rich', name: 'Millonario', desc: 'Junta 3000 monedas en total', test: s => s.coinsTotal >= 3000 },
  { id: 'arsenal', name: 'Arsenal completo', desc: 'Compra las 6 armas de la tienda', test: () => [1, 2, 3, 4, 5, 6].every(i => save.owned.includes(i)) },
  { id: 'legend', name: 'Leyenda', desc: 'Consigue un arma legendaria', test: () => save.owned.includes(7) || save.owned.includes(8) },
  { id: 'wave10', name: 'Superviviente', desc: 'Llega a la oleada 10 en Supervivencia', test: s => s.bestWave >= 10 },
  { id: 'stars', name: 'Perfeccionista', desc: 'Consigue 3 estrellas en 5 niveles', test: () => Object.values(save.stars).filter(v => v >= 3).length >= 5 },
  { id: 'hero', name: 'Héroe', desc: 'Rescata 10 sobrevivientes', test: s => s.rescued >= 10 },
  { id: 'vault', name: 'Ladrón de bóvedas', desc: 'Abre 5 cofres', test: s => s.chests >= 5 },
  { id: 'lvl10', name: 'Veterano', desc: 'Llega al nivel 10 de personaje', test: () => save.xpLevel >= 10 },
  { id: 'team', name: 'Escuadrón', desc: 'Ten 2 compañeros y al perro a la vez', test: () => save.team.length >= 2 && save.dog },
];

/* ---------- progreso guardado ---------- */
let unlocked = 0;
try { unlocked = parseInt(localStorage.getItem('zonaMuerta_nivel') || '0', 10) || 0; } catch (e) { }
const save = {
  coins: 0, owned: [0], armorTier: 0, hpUp: 0, medkit: 1, adren: 1, grenades: 2, turrets: 0, mines: 0, barricades: 0,
  team: [], dog: false, upg: {}, skin: 'azul', skins: ['azul'], xp: 0, xpLevel: 1, skillPts: 0, skills: {},
  stats: { kills: 0, bosses: 0, king: 0, melee: 0, dogs: 0, coinsTotal: 0, rescued: 0, chests: 0, bestWave: 0 },
  ach: {}, records: [], stars: {},
};
try {
  const s = JSON.parse(localStorage.getItem('zonaMuerta_save') || '{}');
  if (typeof s.allies === 'number') { s.team = Array(Math.min(2, s.allies)).fill('soldado'); delete s.allies; } // partidas viejas
  Object.assign(save, s); save.stats = Object.assign({ kills: 0, bosses: 0, king: 0, melee: 0, dogs: 0, coinsTotal: 0, rescued: 0, chests: 0, bestWave: 0 }, s.stats || {});
} catch (e) { }
function persist() { try { localStorage.setItem('zonaMuerta_save', JSON.stringify(save)); } catch (e) { } }
function saveProgress() { try { localStorage.setItem('zonaMuerta_nivel', String(unlocked)); } catch (e) { } persist(); }

/* ---------- opciones ---------- */
const DIFF = [
  { name: 'Fácil', dmg: .6, hp: .8, coins: 1 },
  { name: 'Normal', dmg: 1, hp: 1, coins: 1 },
  { name: 'Difícil', dmg: 1.4, hp: 1.25, coins: 1.3 },
];
const settings = { autoAim: true, vol: .8, music: .5, sfx: 1, diff: 1, vibrate: true, joySens: 1 };
try {
  const old = localStorage.getItem('zonaMuerta_auto'); if (old !== null) settings.autoAim = old === '1';
  Object.assign(settings, JSON.parse(localStorage.getItem('zonaMuerta_settings') || '{}'));
} catch (e) { }
function saveSettings() { try { localStorage.setItem('zonaMuerta_settings', JSON.stringify(settings)); } catch (e) { } }

/* ---------- ayudas ---------- */
function ownedWeapon(i) { return save.owned.includes(i); }
function skill(id) { return save.skills[id] || 0; }
function upg(wi) { return save.upg[wi] || [0, 0, 0]; }
function wDmg(wi) { return WEAPONS[wi].dmg * (1 + .15 * upg(wi)[0]); }
function wMag(wi) { return Math.round(WEAPONS[wi].mag * (1 + .2 * upg(wi)[1])); }
function wReload(wi) { return WEAPONS[wi].reload * (1 - .12 * upg(wi)[2]) * (1 - .08 * skill('recarga')); }
function upgPrice(wi, k) { return Math.round(120 + upg(wi)[k] * 110 + WEAPONS[wi].price * .15); }
function skinColor() { const s = SKINS.find(k => k.id === save.skin); return s ? s.color : '#2f5d8a'; }
