// Strangers with a favour to ask. Six people round the mainland, each where
// you can find them — a ? over their head, and on the radar once you are
// near — with one odd job apiece: a salesman late for a plane, a wife who
// wants a car followed, a kid whose bike has been taken, an old lady's lost
// dog, a crew whose driver never showed, and a nervous man with a date.
// And six more on Isla Verde, once the bridges are open — a photographer, an
// astronomer, the ice cream factory, a fisherman's lost brother, a film star
// with a photographer on her tail, and a man owed money down at the port.
//
// Walk up (or pull up) and they ask — face to face, the way Lola's jobs
// open (scenes.js). A favour runs like a job: a title, an objective, a route
// on the map; X twice walks away from it. Done is done — they thank you,
// face to face again, and go about their business: out of your car and off
// up the street, through the door they were making for, or away on what you
// brought back. Nobody blinks out of the street in front of you. Lola keeps
// the tally.
GAME.strangers = (function () {
  var NEAR_R = 120, KEEP_R = 170, TALK_R = 4.5, CAR_TALK_R = 8;
  var people = null;        // { def, at, ped, mark, asked }
  var job = null;           // the favour under way
  var routeT = 0, route = null, ring = null, abandonAsk = 0;
  var leavers = [];         // a dog at its owner's heel, or running off
  // (the regression suite stands them down, the way it pins the CITY knob)
  var enabled = true;

  function P() { return GAME.player; }
  function prefs() { GAME.prefs = GAME.prefs || {}; return GAME.prefs; }
  function done(id) { var s = prefs().strangers || {}; return !!s[id]; }
  function doneCount() { var n = 0; for (var i = 0; i < DEFS.length; i++) if (done(DEFS[i].id)) n++; return n; }
  // the island's six are there once the bridges are
  function avail(d) { return !d.isla || !!(GAME.isla && GAME.isla.isOpen()); }
  function reachable() { var n = 0; for (var i = 0; i < DEFS.length; i++) if (avail(DEFS[i])) n++; return n; }
  function onIsla(x, z) { return !!(GAME.isla && GAME.isla.contains(x, z)); }
  function say(t, s) { GAME.hud.message(t, s || 3.5); }
  function dist(a, x, z) { return Math.sqrt(U.dist2(a.x, a.z, x, z)); }
  function land(car) { return !!car && !car.dead && !car.spec.boat && !car.spec.heli && !car.spec.plane; }
  function inLand() { var p = P(); return p.inCar && land(p.car) ? p.car : null; }

  // ---------- places ----------
  // A pavement spot near (x, z): off the nearest road, clear of anything solid.
  function pavement(x, z) {
    var C = GAME.city, rp = C.nearestRoadPoint(x, z);
    // a corner first: if this stretch is a crossing, step along the road
    // until it is not
    for (var w = 0; w < 6; w++) {
      var tryAt = pavementAt(rp);
      if (tryAt) return tryAt;
      var hh = roadHeading(rp);
      rp = C.nearestRoadPoint(rp.x + Math.sin(hh) * 14, rp.z + Math.cos(hh) * 14);
    }
    var h0 = roadHeading(rp);
    return { x: rp.x + Math.cos(h0) * 7.8, z: rp.z - Math.sin(h0) * 7.8 };
  }
  function pavementAt(rp) {
    var C = GAME.city;
    var h = rp.axis === 'z' ? 0 : rp.axis === 'x' ? Math.PI / 2 : rp.heading || 0;
    var sx = Math.cos(h), sz = -Math.sin(h);
    var sides = [1, -1], offs = [7.8, 8.6, 7];
    for (var i = 0; i < 2; i++) for (var k = 0; k < offs.length; k++) {
      var px = rp.x + sx * offs[k] * sides[i], pz = rp.z + sz * offs[k] * sides[i];
      if (C.isInWater(px, pz) || C.inAirport(px, pz)) continue;
      // (off every road, not only this one: a corner has a cross street)
      var rq = C.nearestRoadPoint(px, pz);
      if (U.dist2(rq.x, rq.z, px, pz) < 6.6 * 6.6) continue;
      var r = GAME.resolveCircle(px, pz, 0.5);
      if (Math.abs(r.x - px) + Math.abs(r.z - pz) < 0.05) return { x: px, z: pz };
    }
    return null;
  }
  // a road point some way off, on the mainland, for a job to send you to
  function roadAway(from, r0, r1) {
    var C = GAME.city;
    for (var t = 0; t < 30; t++) {
      var a = Math.random() * Math.PI * 2, r = U.randRange(Math.random, r0, r1);
      var rp = C.nearestRoadPoint(from.x + Math.cos(a) * r, from.z + Math.sin(a) * r);
      if (!rp || rp.kind === 'local' || C.isInWater(rp.x, rp.z) || C.inAirport(rp.x, rp.z)) continue;
      // (on the same island as wherever it is from)
      if (onIsla(rp.x, rp.z) !== onIsla(from.x, from.z)) continue;
      var d = dist(from, rp.x, rp.z);
      if (d < r0 * 0.75 || d > r1 * 1.25) continue;
      return rp;
    }
    return null;
  }
  function roadHeading(rp) { return rp.axis === 'net' ? rp.heading : rp.axis === 'z' ? 0 : Math.PI / 2; }

  // ---------- the six ----------
  var LOOK = {
    ray: { shirt: 0xf0f0e8, pants: 0x2a2a34, skin: 0xeac8a8, hair: 'crew', hairCol: 0x5a3c22 },
    dani: { shirt: 0xf7a8c4, pants: 0xd8d0c0, skin: 0xc89878, hair: 'ponytail', hairCol: 0x1c1a18 },
    tito: { shirt: 0x9fe8d8, pants: 0x3a4a68, skin: 0x8a6848, hair: 'afro', hairCol: 0x1c1a18 },
    rosa: { shirt: 0x8a6ae8, pants: 0x684a3a, skin: 0xf0d8c0, hair: 'pompadour', hairCol: 0x8a8a90 },
    vince: { shirt: 0x2a2a34, pants: 0x2a2a34, skin: 0xeac8a8, hair: 'flattop', hairCol: 0x2e2018 },
    marco: { shirt: 0xf9d99a, pants: 0x3a4a68, skin: 0x6a4c34, hair: 'pompadour', hairCol: 0x1c1a18 },
    nina: { shirt: 0x60c890, pants: 0xd8d0c0, skin: 0xeac8a8, hair: 'ponytail', hairCol: 0xd8b86a },
    sal: { shirt: 0xf0f0e8, pants: 0x684a3a, skin: 0xc89878, hair: 'crew', hairCol: 0x8a8a90 },
    cookie: { shirt: 0xf7a8c4, pants: 0xf0f0e8, skin: 0x8a6848, hair: 'afro', hairCol: 0x2e2018 },
    gus: { shirt: 0x8fd0f0, pants: 0x3a4a68, skin: 0x6a4c34, hair: 'crew', hairCol: 0x1c1a18 },
    lupe: { shirt: 0xe86a8a, pants: 0x2a2a34, skin: 0xc89878, hair: 'ponytail', hairCol: 0x1c1a18 },
    walt: { shirt: 0x9fe8d8, pants: 0x684a3a, skin: 0xf0d8c0, hair: 'flattop', hairCol: 0x8a8a90 }
  };
  var DEFS = [
    { id: 'ray', who: "РЭЙ", title: "СРОЧНО В АЭРОПОРТ", pay: 400, where: [262, -40],
      ask: "Мой рейс через пару минут, а такси так и не приехало. В аэропорт, пожалуйста! Я хорошо заплачу.",
      begin: rayBegin, step: rayStep },
    { id: 'dani', who: "ДАНИ", title: "СЛЕДИ ЗА МАШИНОЙ", pay: 350, where: [60, -205],
      ask: "Муж говорит, что задерживается на работе. Вон его машина, белая. Проследи за ним и ради бога не попадись ему на глаза.",
      begin: daniBegin, step: daniStep },
    { id: 'tito', who: "ТИТО", title: "УКРАДЕННЫЙ МОТОЦИКЛ", pay: 300, where: [-250, 150],
      ask: "Какой-то гад только что украл мой мотоцикл! Красный! Вон он! Вернёшь мне его? Пожалуйста?",
      begin: titoBegin, step: titoStep },
    { id: 'rosa', who: "ГОСПОЖА АЛБЕСКУ", title: "БИСКВИТ", pay: 200, where: [-150, -300],
      ask: "Вы не видели моего Бисквита? Маленький коричневый пёс, вот такой. Сорвался с поводка и убежал. К доброму человеку он сам подойдёт.",
      begin: rosaBegin, step: rosaStep },
    { id: 'vince', who: "ВИНС", title: "ВОДИТЕЛЬ НЕ ПРИШЁЛ", pay: 1200, where: [150, 250],
      ask: "Наш водитель не явился, а дело уже началось. Банк за углом. Подожди с заведённым мотором, потом вывези нас оттуда.",
      begin: vinceBegin, step: vinceStep },
    { id: 'marco', who: "МАРКО", title: "СВИДАНИЕ С ШИКОМ", pay: 500, where: [340, 160],
      ask: "У меня свидание с девушкой мечты, а машина в ремонте. Забери её на чём-нибудь роскошном — лимузине или спорткаре — и отвези в казино. Аккуратно.",
      begin: marcoBegin, step: marcoStep },
    // Isla Verde, once the bridges are open: placed off its own landmarks
    { id: 'nina', who: "НИНА", title: "СНИМОК МАЯКА", pay: 450, isla: true, near: function (I) { return [I.lighthouse.x - 70, I.lighthouse.z - 40]; },
      ask: "Я снимаю для журнала о путешествиях, но камера сломалась. У тебя есть? Сними маяк — вся башня должна быть в кадре. Я куплю снимок.",
      begin: ninaBegin, step: ninaStep },
    { id: 'sal', who: "СЭЛ", title: "ЗВЕЗДОЧЁТ", pay: 500, isla: true, near: function (I) { return [I.police.x + 30, I.police.z + 40]; },
      ask: "Сорок лет ждал эту комету, а автобус сломался. В обсерваторию на холме! Она низко в небе и уже заходит. Пожалуйста.",
      begin: salBegin, step: salStep },
    { id: 'cookie', who: "КУКИ", title: "ВСЁ ТАЕТ", pay: 400, isla: true, near: function (I) { return [I.factory.x - 40, I.factory.z - 30]; },
      ask: "Рефрижератор сломался, а в бухте целый пляж детей ждёт этот холодильник. Довези, пока не превратилось в суп. И осторожно — всё во льду.",
      begin: cookieBegin, step: cookieStep },
    { id: 'gus', who: "ГАС", title: "ЧЕЛОВЕК ЗА БОРТОМ", pay: 550, isla: true, near: function (I) { return [I.marina.x + 10, I.marina.z - 45]; },
      ask: "Брат ушёл на лодке, но мотор заглох. Его несёт за мыс. Возьмёшь катер с причала и вернёшь его?",
      begin: gusBegin, step: gusStep },
    { id: 'lupe', who: "ЛУПЕ", title: "БЕЗ ФОТОГРАФИЙ", pay: 600, isla: true, near: function (I) { return [I.hospital.x - 40, I.hospital.z + 30]; },
      ask: "Не смотри. Мужчина с камерой преследует меня от марины. Я должна быть на съёмках в Голливуде, а не здесь. Увези меня и оторвись от него.",
      begin: lupeBegin, step: lupeStep },
    { id: 'walt', who: "УОЛТ", title: "СТАРЫЙ ДОЛГ", pay: 450, isla: true, near: function (I) { return [I.container.x - 20, I.container.z + 55]; },
      ask: "Тип на контейнерной площадке с весны должен мне за лодочный мотор. Увидит тебя — побежит. Верни мои деньги.",
      begin: waltBegin, step: waltStep }
  ];
  function def(id) { for (var i = 0; i < DEFS.length; i++) if (DEFS[i].id === id) return DEFS[i]; return null; }

  // Marco's date, and the two Vince brought along
  var GINA = { shirt: 0xe86a8a, pants: 0x2a2a34, skin: 0xc89878, hair: 'ponytail', hairCol: 0xa8482a };
  var CREW = [{ shirt: 0x3a3a46, pants: 0x2a2a34, skin: 0xc89878, hair: 'crew', hairCol: 0x1c1a18 },
    { shirt: 0x4a3a2a, pants: 0x2a2a34, skin: 0x8a6848, hair: 'mullet', hairCol: 0x2e2018 }];
  // the two who are nowhere near you when it is done: they ring
  var PHONE = { dani: true, nina: true };
  // what they say when it is done
  var THANKS = {
    ray: function () { return [['ray', "Аэропорт! И время ещё осталось! Не верю."], ['you', "Давай, беги."], ['ray', "За поездку. И за твоё вождение — никогда не меняйся."]]; },
    dani: function (j, line) {
      return /motel/i.test(line || '')
        ? [['dani', "Ну? Куда он ездил?"], ['you', "В мотель. Рядом с бульваром."], ['dani', "Конечно, в мотель… Спасибо. Правда. Деньги переведу."]]
        : [['dani', "Ну? Куда он ездил?"], ['you', "В основном по кругу. Никуда."], ['dani', "Никуда. Ну, отлегло. Наверное. Деньги переведу."]];
    },
    tito: function () { return [['tito', "Мой мотоцикл! Ни царапины. Почти."], ['you', "Этот гад сегодня больше ничего не украдёт."], ['tito', "Ты лучший, друг. Держи. А я куплю замок получше."]]; },
    rosa: function () { return [['rosa', "Бисквит! Ах ты негодник!"], ['rosa', "Спасибо, дорогой. Нет, я настаиваю. Он бы уже полпути до порта пробежал."]]; },
    vince: function () { return [['vince', "Чистая работа. Будто родился за рулём."], ['you', "Только больше меня не проси."], ['vince', "Твоя доля. Через год в то же время?"]]; },
    marco: function () { return [['marco', "Вот она. Джина, ты выглядишь… вау."], ['marco', "А ты — ни царапины, точно вовремя. Я твой должник, друг."]]; },
    nina: function () { return [['nina', "Смотрю сейчас: вся башня, свет идеальный."], ['nina', "Это обложка. Деньги твои. Захочешь работу — звони в журнал."]]; },
    sal: function () { return [['sal', "Смотри! Вон, над хребтом. Сорок лет."], ['you', "Вижу."], ['sal', "Спасибо, друг мой. Спасибо."]]; },
    cookie: function () { return [['cookie', "Ещё заморожено! Слышишь? Целый пляж счастливых детей."], ['cookie', "Для них ты герой. Держи. И рожок за мой счёт."]]; },
    gus: function () { return [['gus', "Ты вернул его! Мокрый насквозь и улыбается как дурак."], ['gus', "Спасибо. Теперь ключи от лодки будут у меня."]]; },
    lupe: function () { return [['lupe', "Пропал. Ни одного снимка. Дорогой, твой талант пропадает на этом острове."], ['lupe', "За хлопоты. Если кто спросит — ты меня не видел."]]; },
    walt: function () { return [['walt', "До цента? Дай пересчитаю… До цента."], ['walt', "С весны за ним гонялся. Твоя доля, и немного сверху."]]; }
  };
  // and then they go about their business
  var AFTER = {
    ray: function (j) {
      var car = inLand() || j.car, r = car && outOf(car, LOOK.ray, 1, 0);
      if (r) goIn(r, GATE.x, GATE.z + 12, 8);
    },
    sal: function (j) {
      var car = inLand() || j.car, r = car && outOf(car, LOOK.sal, 1, 0), O = GAME.city.islaPois.observatory;
      if (r) goIn(r, O.x, O.z, 14);
    },
    cookie: function (j) {
      var car = inLand() || j.car, r = car && outOf(car, LOOK.cookie, 1, 0), V = GAME.city.islaPois.cove;
      if (r) goIn(r, V.x, V.z, 12);
    },
    lupe: function (j) { var car = inLand() || j.car; if (car) walkOff(outOf(car, LOOK.lupe, 1, 0)); },
    vince: function (j) {
      var car = inLand() || j.car;
      if (car) [LOOK.vince, CREW[0], CREW[1]].forEach(function (lk, i) { walkOff(outOf(car, lk, i % 2 ? -1 : 1, i)); });
    },
    // Gina out of the car, Marco waiting for her at the foot of the pier,
    // and up it to the casino together
    marco: function (j) {
      var car = inLand() || j.car, g = car && outOf(car, GINA, 1, 0);
      var spot = pavement(CASINO.x, CASINO.z + 4), m = GAME.peds.spawnPed(spot.x, spot.z, { look: LOOK.marco });
      var door = { x: 452, z: 255.3 };
      if (g) goIn(g, door.x, door.z, 40);
      if (m) goIn(m, door.x, door.z + 1.2, 40);
      // (the Marco back on his corner, if nobody can see him go)
      var w = j.who;
      if (w.ped && !GAME.inPlainView(w.ped.pos.x, w.ped.pos.y + 1, w.ped.pos.z)) takeIn(w);
    },
    // Tito takes his bike back and rides off on it; you are on your feet
    tito: function (j) {
      var b = j.bike, P0 = P();
      if (!b || b.gone || b.dead) return;
      if (P0.inCar && P0.car === b) GAME.exitCar();
      j.bits = j.bits.filter(function (x) { return x.o !== b; });
      takeIn(j.who);
      b.mission = false; b.outlaw = false; b.speed = 0;
      GAME.vehicles.seatOccupant(b, LOOK.tito);
      b.ai = { mode: 'traffic', desired: 12, laneX: 0, laneZ: 0 };
    },
    // Mrs. Albescu walks off with Biscuit at her heel
    rosa: function (j) {
      if (!j.dog) return;
      j.bits = j.bits.filter(function (x) { return x.o !== j.dog; });
      var w = j.who, owner = w.ped;
      if (owner) { release(w); leavers.push({ mesh: j.dog, follow: owner }); }
      else leavers.push({ mesh: j.dog, flee: true });
    },
    // his brother out of your boat and onto the quay beside him
    gus: function (j) {
      var at = j.who.at, s = pavement(at.x + 1.5, at.z + 1.5);
      var bro = GAME.peds.spawnPed(s.x, s.z, { look: { shirt: 0xf0f0e8, pants: 0x3a4a68, skin: 0x6a4c34, hair: 'crew', hairCol: 0x1c1a18 } });
      walkOff(bro);
    }
  };

  // ---------- the people on the pavement ----------
  function setup() {
    var I = GAME.city.islaPois;
    people = DEFS.filter(function (d) { return !d.isla || I; }).map(function (d) {
      var w = d.isla ? d.near(I) : d.where;
      return { def: d, at: pavement(w[0], w[1]), ped: null, mark: null, asked: false };
    });
  }
  var markGeo = null, markMat = null;
  function markMesh() {
    if (!markGeo) {
      markGeo = new THREE.OctahedronGeometry(0.32, 0); markGeo.userData.shared = true;
      markMat = new THREE.MeshBasicMaterial({ color: 0xc86bff }); markMat.userData.shared = true;
    }
    var m = new THREE.Mesh(markGeo, markMat);
    GAME.scene.add(m);
    return m;
  }
  function putOut(p) {
    var ped = GAME.peds.spawnPed(p.at.x, p.at.z, { look: LOOK[p.def.id] });
    if (!ped) return;
    ped.jobPed = true; ped.state = 'wait'; ped.speed = 0; ped.stranger = p.def.id;
    p.ped = ped; p.mark = markMesh();
  }
  function takeIn(p) {
    if (p.ped && !p.ped.gone && !p.ped.dead) GAME.peds.removePed(p.ped);
    p.ped = null;
    if (p.mark) { GAME.scene.remove(p.mark); p.mark = null; }
  }
  function tend(dt) {
    var f = GAME.focus();
    for (var i = 0; i < people.length; i++) {
      var p = people[i], d2 = U.dist2(p.at.x, p.at.z, f.x, f.z);
      var gone = done(p.def.id) || !avail(p.def) || (job && job.def === p.def && job.away);
      if (p.ped && (p.ped.dead || p.ped.gone)) { if (p.mark) { GAME.scene.remove(p.mark); p.mark = null; } p.ped = null; }
      // (someone who got out of your car on a favour that went wrong is
      // walking off up the street: not back on their spot until you have gone)
      if (p.hold && d2 > KEEP_R * KEEP_R) p.hold = false;
      if (!p.ped && !gone && !p.hold && d2 < NEAR_R * NEAR_R) putOut(p);
      else if (p.ped && (gone || d2 > KEEP_R * KEEP_R)) {
        // done, and stood there in front of you: off about their business on
        // foot, not out of the world
        if (done(p.def.id) && d2 < KEEP_R * KEEP_R) release(p); else takeIn(p);
      }
      if (p.ped && p.mark) {
        p.mark.visible = !job;
        p.mark.position.set(p.ped.pos.x, p.ped.pos.y + 2.5 + Math.sin(GAME.time * 3 + i) * 0.12, p.ped.pos.z);
        p.mark.rotation.y += dt * 1.6;
        // and they face whoever is coming up to them
        if (d2 < 30 * 30) {
          p.ped.heading = Math.atan2(f.x - p.ped.pos.x, f.z - p.ped.pos.z);
          p.ped.mesh.rotation.y = p.ped.heading;
        }
      }
      if (p.asked && d2 > 14 * 14) p.asked = false;
    }
  }
  // close enough, at the right pace, with nothing else going on: they ask
  function canAsk() {
    var p = P(), M = GAME.missions;
    if (job || p.state !== 'alive' || p.interior || p.swimming || GAME.lolaOpen || GAME.shopOpen || GAME.mapOpen) return false;
    if (M && M.active) return false;
    if (GAME.heist && GAME.heist.busy) return false;
    if (GAME.police.wanted > 0) return false;
    if (GAME.guide && GAME.guide.step) return false;
    if (p.inCar && (!land(p.car) || Math.abs(p.car.speed) > 2.5)) return false;
    return true;
  }
  function listen() {
    if (!canAsk()) return;
    var p = P(), at = p.inCar ? p.car.pos : p.pos, r = p.inCar ? CAR_TALK_R : TALK_R;
    for (var i = 0; i < people.length; i++) {
      var q = people[i];
      if (!q.ped || q.asked || done(q.def.id) || !avail(q.def)) continue;
      if (dist(q.ped.pos, at.x, at.z) > r) continue;
      q.asked = true;
      ask(q);
      return;
    }
  }
  function ask(q) {
    var d = q.def;
    face(d.id, q.ped ? spotSet(q.ped.pos.x, q.ped.pos.z) : 'here', pitch(d), function () { offer(q); }, [q.ped, q.mark]);
  }
  function offer(q) {
    var d = q.def;
    if (job || !canAsk()) return;
    GAME.lola.offer({
      from: '🗣 ' + d.who,
      face: d.id,
      say: d.ask,
      top: true,
      escSays: "пройти мимо",
      list: [
        { label: "✓ Я ПОМОГУ", fn: function () { GAME.lola.close(); begin(q); } },
        { label: "✗ НЕ СЕЙЧАС", fn: function () { GAME.lola.close(); } }
      ]
    });
  }

  // ---------- a favour under way ----------
  function begin(q) {
    var d = q.def;
    job = { def: d, who: q, t: 0, phase: '', target: null, timer: null, away: false, bits: [] };
    GAME.hud.missionStart(d.title, '');
    GAME.audio.pickup();
    if (GAME.track) GAME.track('stranger-started');
    d.begin(job);
  }
  function objective(t) { if (job) { job.obj = t; GAME.hud.missionObjective(t); } }
  function target(x, z) {
    if (!job) return;
    if (x === null) { job.target = null; route = null; if (ring) ring.visible = false; return; }
    job.target = [x, z]; routeT = 0;
  }
  function tidy() {
    if (!job) return;
    for (var i = 0; i < job.bits.length; i++) {
      var b = job.bits[i];
      if (b.kind === 'car' && !b.o.gone) {
        // back to being nobody's business: traffic, or towed away
        b.o.mission = false; b.o.outlaw = false;
        if (b.o.ai && b.o.occupied === 'ai') { b.o.ai = { mode: 'traffic', desired: 11, laneX: 0, laneZ: 0 }; }
      } else if (b.kind === 'mesh') leavers.push({ mesh: b.o, flee: true });
      else if (b.kind === 'ped') walkOff(b.o);
    }
    GAME.hud.missionEnd();
    target(null);
    job = null;
  }
  function win(line) {
    var j = job, d = j.def;
    if (j.ending) return;
    j.ending = true;
    target(null);
    GAME.hud.missionTimer && GAME.hud.missionTimer(null);
    var set = PHONE[d.id] ? null : d.id === 'gus' ? spotSet(j.who.at.x, j.who.at.z) : 'here';
    var ls = THANKS[d.id] ? THANKS[d.id](j, line) : [[d.id, "Спасибо."]];
    face(d.id, set, ls, function () { paid(j, line); }, PHONE[d.id] ? [] : [j.who.ped, j.who.mark]);
  }
  function paid(j, line) {
    if (job !== j) return;
    if (AFTER[j.def.id]) AFTER[j.def.id](j);
    var d = job.def, s = prefs();
    s.strangers = s.strangers || {};
    s.strangers[d.id] = true;
    GAME.addCash(d.pay);
    GAME.audio.sting('win');
    if (GAME.haptics && GAME.haptics.win) GAME.haptics.win();
    say("ПРОСЬБА ВЫПОЛНЕНА — " + d.title + '  +$' + d.pay + (line ? '  ·  ' + line : '') + "  ·  незнакомцы: " + doneCount() + " из " + reachable(), 5);
    if (GAME.track) GAME.track('stranger-done');
    GAME.save();
    tidy();
    // every one of them, both islands: the papers have heard about you
    if (doneCount() === DEFS.length && GAME.herald) GAME.herald.front('samaritan');
  }
  function fail(reason) {
    var j = job, car = (P().inCar && P().car) || (j.car && !j.car.gone ? j.car : null);
    // anyone sat in your car is out of it and off up the street, and not
    // back on their spot until you have gone
    if (car && !car.dead && dist(car.pos, GAME.focus().x, GAME.focus().z) < 30) {
      if (j.away) (j.def.id === 'vince' ? [LOOK.vince, CREW[0], CREW[1]] : [LOOK[j.def.id]]).forEach(function (lk, i) { walkOff(outOf(car, lk, i % 2 ? -1 : 1, i)); });
      if (j.def.id === 'marco' && j.phase === 'drive') walkOff(outOf(car, GINA, 1, 0));
    }
    if (j.away) j.who.hold = true;
    GAME.audio.sting('wasted');
    say("ПРОСЬБА ПРОВАЛЕНА — " + reason + "  ·  они могут попросить снова", 4);
    var q = job.who;
    tidy();
    if (q) q.asked = true;   // (not again until you have walked off and come back)
  }
  function abandon() {
    if (!job) return false;
    abandonAsk = 0;
    fail("ты отказался");
    return true;
  }

  // what the way there looks like on the map, along the streets
  function stepRoute(dt) {
    if (!job || !job.target) return;
    routeT -= dt;
    if (routeT > 0) return;
    routeT = 1;
    var f = GAME.focus(), t = job.target;
    var nodes = GAME.nav.roadPath(f.x, f.z, t[0], t[1]), pts = [];
    for (var i = 0; i < nodes.length; i++) pts.push([nodes[i].x, nodes[i].z]);
    pts.push([t[0], t[1]]);
    route = pts;
    if (!ring) {
      ring = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 6, 20, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xc86bff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
      GAME.scene.add(ring);
    }
    ring.visible = true;
    ring.position.set(t[0], GAME.city.groundY(t[0], t[1]) + 3, t[1]);
  }

  // ---------- a ride against the clock (RAY, SAL, COOKIE) ----------
  // Into a car near them; then wherever it is, before time runs out. A clock
  // fitted to the drive (the route, at a fair lick, and some to spare), and
  // — for anything fragile — a limit on what the car can take on the way.
  function ferryBegin(j, o) {
    j.ferry = o;
    j.phase = 'car';
    if (inLand()) ferryAboard(j);
    else objective(o.needCar);
  }
  function ferryAboard(j) {
    var o = j.ferry, to = o.to();
    takeIn(j.who); j.away = true;
    say(o.aboard, 3);
    var f = GAME.focus(), nodes = GAME.nav.roadPath(f.x, f.z, to.x, to.z), len = 0;
    for (var i = 1; i < nodes.length; i++) len += Math.sqrt(U.dist2(nodes[i].x, nodes[i].z, nodes[i - 1].x, nodes[i - 1].z));
    j.timer = Math.max(70, Math.round(len / (o.pace || 13) + 30));
    j.to = to; j.phase = 'drive'; j.car = inLand(); j.hp0 = j.car.hp;
    objective(o.go);
    target(to.x, to.z);
  }
  function ferryStep(j, dt) {
    var car = inLand(), o = j.ferry;
    if (j.phase === 'car') {
      if (car && dist(car.pos, j.who.at.x, j.who.at.z) < 30) ferryAboard(j);
      else target(j.who.at.x, j.who.at.z);
      return;
    }
    j.timer -= dt;
    GAME.hud.missionTimer(j.timer, true);
    if (!car) { j.outT = (j.outT || 0) + dt; if (j.outT > 6) return fail(o.left); }
    else j.outT = 0;
    if (P().car && P().car.dead) return fail(o.wreck);
    if (o.fragile && j.car && j.car.hp < j.hp0 - j.car.spec.hp * o.fragile) return fail(o.broke);
    if (j.timer <= 0) return fail(o.late);
    if (car && dist(car.pos, j.to.x, j.to.z) < 14) win(o.there);
  }

  // RAY: the airport
  var GATE = { x: -160, z: 396 };
  function rayBegin(j) {
    ferryBegin(j, { to: function () { return GATE; },
      needCar: "Найди машину — Рэй едет с тобой.",
      aboard: "Рэй садится с чемоданом образцов. «В аэропорт! Жми на газ!»",
      go: "Отвези Рэя к воротам аэропорта до вылета.",
      left: "Рэй поймал такси.", wreck: "Рэй больше не сядет в развалюху с тобой.",
      late: "Он опоздал на рейс.", there: "Рэй бежит к воротам с чемоданом." });
  }
  function rayStep(j, dt) { ferryStep(j, dt); }

  // SAL: the observatory, up the hill, before the comet sets
  function obsGate() { var O = GAME.city.islaPois.observatory, rp = GAME.city.nearestRoadPoint(O.x, O.z); return { x: rp.x, z: rp.z }; }
  function salBegin(j) {
    ferryBegin(j, { to: obsGate, pace: 11,
      needCar: "Найди машину — Сэл едет с тобой на холм.",
      aboard: "Сэл втискивается с футляром телескопа. «Наверх! На холм!»",
      go: "Довези Сэла в обсерваторию до захода кометы.",
      left: "Сэл остановил фермерский грузовик.", wreck: "Сэл идёт пешком. «Сорок лет. Подожду следующую».",
      late: "Комета зашла. Сэл говорит, что всё в порядке. Это не так.", there: "Сэл вбегает в дверь ещё до остановки. «Спасибо, спасибо!»" });
  }
  function salStep(j, dt) { ferryStep(j, dt); }

  // COOKIE: a cooler of ice cream to the cove, against the melt, and gently
  function coveKiosk() { var V = GAME.city.islaPois.cove, rp = GAME.city.nearestRoadPoint(V.x, V.z); return { x: rp.x, z: rp.z }; }
  function cookieBegin(j) {
    ferryBegin(j, { to: coveKiosk, pace: 12, fragile: 0.2,
      needCar: "Найди машину — Куки загрузит холодильник.",
      aboard: "Куки заталкивает холодильник. «Без тряски. Уже тает».",
      go: "Довези холодильник в бухту, пока всё не растаяло. Не тряси груз.",
      left: "Куки ловит грузовик с фруктами.", wreck: "Холодильник разлетелся. Мороженое тоже.",
      broke: "Слишком трясло. Теперь это суп.", late: "Поздно. Теперь это суп.",
      there: "Дети на пляже радостно встречают холодильник." });
  }
  function cookieStep(j, dt) { ferryStep(j, dt); }

  // ---------- DANI: follow that car ----------
  function daniBegin(j) {
    var at = j.who.at, rp = roadAway(at, 35, 70);
    // (a junction, not mid-block: making for a node, a driver gets there)
    var far = roadAway(at, 520, 720), to = far ? GAME.city.nearestNode(far.x, far.z) : null;
    if (!rp || !to) return fail("Его нигде не видно.");
    var car = GAME.vehicles.spawnCar('sedan', rp.x, rp.z, roadHeading(rp), { occupied: 'ai', mission: true, color: 0xf0f0f4,
      ai: { mode: 'traffic', desired: 0.01, laneX: 0, laneZ: 0, toward: { x: to.x, z: to.z } } });
    if (!car) return fail("Его нигде не видно.");
    j.husband = car; j.dest = to; j.bits.push({ kind: 'car', o: car });
    j.phase = 'car';
    objective(inLand() ? "Следи за белой машиной. Держи дистанцию." : "Найди машину — он вот-вот выедет.");
  }
  function daniStep(j, dt) {
    var h = j.husband, car = P().inCar ? P().car : null;
    if (!h || h.gone || h.dead) return fail("С его машиной что-то случилось. Дани за это не заплатит.");
    if (j.phase === 'car') {
      target(h.pos.x, h.pos.z);
      if (car && !car.dead) { j.phase = 'tail'; h.ai.desired = 11; objective("Следи за белой машиной. Держи дистанцию."); }
      return;
    }
    j.t += dt;
    target(null);
    if (!car || car.dead) { j.outT = (j.outT || 0) + dt; if (j.outT > 8) return fail("Ты его потерял."); }
    else j.outT = 0;
    var at = car ? car.pos : P().pos, d = dist(at, h.pos.x, h.pos.z);
    if (d < 14) { j.closeT = (j.closeT || 0) + dt; if (j.closeT > 3) return fail("Он тебя заметил. Дани этого не забудут."); }
    else j.closeT = Math.max(0, (j.closeT || 0) - dt);
    if (d > 110) { j.farT = (j.farT || 0) + dt; if (j.farT > 5) return fail("Ты его потерял."); }
    else j.farT = 0;
    if (GAME.frame % 20 === 0) objective(d < 18 ? "Слишком близко! Отстань!" : d > 80 ? "Ты теряешь его…" : "Следи за белой машиной. Держи дистанцию.");
    // he gets where he is going, or goes nowhere in particular for long enough
    if (dist(h.pos, j.dest.x, j.dest.z) < 25) {
      h.ai.desired = 0.01;
      j.parkedT = (j.parkedT || 0) + dt;
      if (j.parkedT > 2) win("Мотель. Ну конечно, мотель.");
    } else if (j.t > 150) win("Он просто ездил кругами. Дани успокоилась. Наверное.");
  }

  // ---------- TITO: the stolen bike ----------
  function titoBegin(j) {
    var at = j.who.at, rp = roadAway(at, 45, 80), to = roadAway(at, 500, 700);
    if (!rp || !to) return fail("Вор давно скрылся.");
    var bike = GAME.vehicles.spawnCar('motorcycle', rp.x, rp.z, roadHeading(rp), { occupied: 'ai', mission: true, color: 0xe83838,
      ai: { mode: 'traffic', desired: 14, laneX: 0, laneZ: 0, reckless: true, toward: { x: to.x, z: to.z } } });
    if (!bike) return fail("Вор давно скрылся.");
    bike.outlaw = true;
    j.bike = bike; j.bits.push({ kind: 'car', o: bike });
    j.phase = 'chase';
    objective("Отбери у вора красный мотоцикл Тито.");
  }
  function titoStep(j) {
    var b = j.bike, p = P();
    if (!b || b.gone) return fail("Вор сбежал.");
    if (b.dead) return fail("Мотоцикл разбит.");
    if (j.phase === 'chase') {
      target(b.pos.x, b.pos.z);
      if (b.occupied !== 'ai') { j.phase = 'back'; objective("Вернись на мотоцикле к Тито."); say("Он слез! Теперь верни мотоцикл Тито.", 2.5); }
      else if (U.dist2(b.pos.x, b.pos.z, GAME.focus().x, GAME.focus().z) > 320 * 320) return fail("Вор сбежал.");
      return;
    }
    var at = j.who.at;
    if (p.inCar && p.car === b) {
      target(at.x, at.z);
      if (dist(b.pos, at.x, at.z) < 9) win("Улыбка Тито шириной с залив.");
    } else target(b.pos.x, b.pos.z);
  }

  // ---------- MRS. ALBESCU: Biscuit ----------
  // a little brown dog: a body, a head with ears, four legs that trot, a tail
  function dogMesh() {
    var g = new THREE.Group(), fur = sharedLambert(0x8a5a32), dark = sharedLambert(0x3a2414);
    function box(w, h, d, x, y, z, m) { var b = new THREE.Mesh(sharedBoxGeo(w, h, d), m); b.position.set(x, y, z); g.add(b); return b; }
    box(0.3, 0.26, 0.62, 0, 0.36, 0, fur);
    box(0.24, 0.22, 0.24, 0, 0.56, 0.38, fur);
    box(0.12, 0.1, 0.14, 0, 0.5, 0.54, dark);                 // nose
    box(0.06, 0.12, 0.06, 0.09, 0.7, 0.36, dark);              // ears
    box(0.06, 0.12, 0.06, -0.09, 0.7, 0.36, dark);
    var tail = box(0.06, 0.06, 0.24, 0, 0.48, -0.38, fur);
    tail.rotation.x = -0.6;
    var legs = [];
    [[0.1, 0.22], [-0.1, 0.22], [0.1, -0.22], [-0.1, -0.22]].forEach(function (q) {
      var pv = new THREE.Group(); pv.position.set(q[0], 0.26, q[1]);
      var l = new THREE.Mesh(sharedBoxGeo(0.07, 0.26, 0.07), fur); l.position.y = -0.13; pv.add(l);
      g.add(pv); legs.push(pv);
    });
    g.userData.legs = legs; g.userData.tail = tail;
    GAME.scene.add(g);
    return g;
  }
  function rosaBegin(j) {
    var at = j.who.at, rp = roadAway(at, 110, 180);
    if (!rp) return fail("Бисквита поблизости нет.");
    var spot = pavement(rp.x, rp.z);
    var dog = dogMesh();
    dog.position.set(spot.x, GAME.city.groundY(spot.x, spot.z), spot.z);
    j.dog = dog; j.home = { x: spot.x, z: spot.z }; j.bits.push({ kind: 'mesh', o: dog });
    var a = Math.random() * Math.PI * 2, r = U.randRange(Math.random, 8, 26);
    j.area = [spot.x + Math.cos(a) * r, spot.z + Math.sin(a) * r];
    j.phase = 'find'; j.wagT = 0;
    objective("Найди Бисквита рядом с отметкой. Подойди к нему.");
    target(j.area[0], j.area[1]);
  }
  function rosaStep(j, dt) {
    var dog = j.dog, p = P(), dp = dog.position, at = j.who.at;
    var tx = dp.x, tz = dp.z, run = 0;
    if (j.phase === 'find') {
      // pottering about where he got to
      j.wagT -= dt;
      if (j.wagT <= 0) { j.wagT = U.randRange(Math.random, 1.5, 3.5); var a = Math.random() * Math.PI * 2; j.sniff = [j.home.x + Math.cos(a) * 4, j.home.z + Math.sin(a) * 4]; }
      if (j.sniff) { tx = j.sniff[0]; tz = j.sniff[1]; run = 1.4; }
      if (!p.inCar && dist(p.pos, dp.x, dp.z) < 5) {
        j.phase = 'home'; say("Бисквит виляет всей задней частью и бежит за тобой.", 3);
        objective("Отведи Бисквита домой к госпоже Албеску.");
        target(at.x, at.z);
      }
    } else {
      if (p.inCar) {
        if (!j.toldCar) { j.toldCar = true; say("Бисквит не сядет в машину. Отведи его пешком.", 3); }
      } else {
        // at your heel, a couple of metres back
        var bx = p.pos.x - Math.sin(p.heading) * 1.6, bz = p.pos.z - Math.cos(p.heading) * 1.6;
        var gap = dist(p.pos, dp.x, dp.z);
        if (gap < 80) { tx = bx; tz = bz; run = Math.min(8, dist(dp, bx, bz) * 2.2); }
        // A dog finds his own way round a corner: hung up on a wall with you
        // getting away, he turns up at your heel rather than sitting there.
        if (gap > 12 && run > 0) {
          j.lastGap = j.lastGap === undefined ? gap : j.lastGap;
          if (gap >= j.lastGap - 0.05) j.stuckT = (j.stuckT || 0) + dt; else j.stuckT = 0;
          j.lastGap = gap;
          if (j.stuckT > 1.5) {
            j.stuckT = 0; j.lastGap = undefined;
            var r0 = GAME.resolveCircle(bx - Math.sin(p.heading) * 1.5, bz - Math.cos(p.heading) * 1.5, 0.3);
            dp.x = r0.x; dp.z = r0.z;
          }
        } else j.stuckT = 0;
      }
      if (dist(dp, at.x, at.z) < 6) return win("«Бисквит!» Он облизывает ей всё лицо.");
    }
    var dx = tx - dp.x, dz = tz - dp.z, dd = Math.sqrt(dx * dx + dz * dz);
    var legs = dog.userData.legs;
    if (dd > 0.3 && run > 0) {
      var step = Math.min(dd, run * dt);
      var nx = dp.x + dx / dd * step, nz = dp.z + dz / dd * step;
      var r = GAME.resolveCircle(nx, nz, 0.3);
      dp.x = r.x; dp.z = r.z;
      dp.y = GAME.city.groundY(dp.x, dp.z);
      dog.rotation.y = Math.atan2(dx, dz);
      var sw = Math.sin(GAME.time * 16) * 0.6;
      legs[0].rotation.x = legs[3].rotation.x = sw; legs[1].rotation.x = legs[2].rotation.x = -sw;
    } else for (var i = 0; i < 4; i++) legs[i].rotation.x = 0;
    dog.userData.tail.rotation.y = Math.sin(GAME.time * 12) * 0.5;
  }

  // ---------- VINCE: the no-show ----------
  function vinceBegin(j) {
    var at = j.who.at, bank = roadAway(at, 150, 240), lock = roadAway(at, 420, 620);
    if (!bank || !lock) return fail("Дело отменено.");
    j.bank = bank; j.lock = lock;
    j.phase = 'car';
    if (vinceCar()) vinceGo(j); else objective("Найди четырёхдверную машину. Два колеса не подойдут.");
  }
  function vinceCar() { var c = inLand(); return c && !c.spec.bike ? c : null; }
  function vinceGo(j) {
    takeIn(j.who); j.away = true;
    say("Винс и двое друзей садятся с большой сумкой. «В банк. Спокойно и без спешки».", 3);
    j.phase = 'bank';
    objective("Езжай к банку и остановись у входа.");
    target(j.bank.x, j.bank.z);
  }
  function vinceStep(j, dt) {
    var car = vinceCar();
    if (j.phase === 'car') {
      if (car && dist(car.pos, j.who.at.x, j.who.at.z) < 30) vinceGo(j);
      else target(j.who.at.x, j.who.at.z);
      return;
    }
    if (!car) { j.outT = (j.outT || 0) + dt; if (j.outT > 4) return fail("Команда убегает пешком. Нет водителя — нет доли."); }
    else j.outT = 0;
    if (!car) return;
    if (j.phase === 'bank') {
      if (dist(car.pos, j.bank.x, j.bank.z) < 10 && Math.abs(car.speed) < 2) {
        j.phase = 'wait'; j.waitT = 8;
        target(null);
        objective("Не глуши мотор…");
        say("Они внутри. Мотор не глуши.", 2.5);
      }
      return;
    }
    if (j.phase === 'wait') {
      j.waitT -= dt;
      GAME.hud.missionTimer(j.waitT, false);
      if (dist(car.pos, j.bank.x, j.bank.z) > 25) return fail("Ты их бросил. Они это запомнят.");
      if (j.waitT <= 0) {
        j.phase = 'run';
        GAME.police.setWanted(Math.max(GAME.police.wanted, 3));
        say("«ГАЗУ! ГАЗУ! ГАЗУ!» Сигнализацию слышно по всей улице.", 3);
        objective("Сбрось розыск и отвези их в гараж.");
        target(j.lock.x, j.lock.z);
      }
      return;
    }
    // the getaway
    var hot = GAME.police.wanted > 0;
    if (GAME.frame % 20 === 0) objective(hot ? "Сбрось розыск и отвези их в гараж." : "Чисто. Теперь в гараж.");
    if (dist(car.pos, j.lock.x, j.lock.z) < 12) {
      if (hot) { if (!j.toldHot) { j.toldHot = true; say("С полицией на хвосте нельзя! Сначала оторвись.", 2.5); } }
      else win("Винс отсчитывает долю. «Через год в то же время?»");
    }
  }

  // ---------- MARCO: a date in style ----------
  var CLASSY = { limo: 1, sports: 1 };
  var CASINO = { x: 346, z: 250 };   // the kerb at the foot of the casino pier
  function marcoCar() { var c = inLand(); return c && CLASSY[c.type] ? c : null; }
  function marcoBegin(j) {
    var her = roadAway(j.who.at, 150, 240);
    if (!her) return fail("Она отменила свидание.");
    j.her = pavement(her.x, her.z);
    var gina = GAME.peds.spawnPed(j.her.x, j.her.z, { look: GINA });
    if (gina) { gina.jobPed = true; gina.state = 'wait'; gina.speed = 0; j.gina = gina; j.bits.push({ kind: 'ped', o: gina }); }
    j.phase = 'car';
    marcoNext(j);
  }
  function marcoNext(j) {
    if (j.phase === 'car' && marcoCar()) j.phase = 'pick';
    if (j.phase === 'car') { objective("Найди роскошный транспорт — лимузин или спорткар."); target(null); }
    else if (j.phase === 'pick') { objective("Забери Джину."); target(j.her.x, j.her.z); }
  }
  function marcoStep(j, dt) {
    var car = marcoCar();
    if (j.phase === 'car' || j.phase === 'pick') {
      var was = j.phase;
      j.phase = car ? 'pick' : 'car';
      if (j.phase !== was) marcoNext(j);
      if (car && dist(car.pos, j.her.x, j.her.z) < 9 && Math.abs(car.speed) < 2) {
        if (j.gina && !j.gina.gone) GAME.peds.removePed(j.gina);
        j.gina = null;
        j.phase = 'drive'; j.hp0 = car.hp; j.car = car; j.heat0 = GAME.police.wanted;
        say("Джина садится. «Марко прислал машину? Шикарно».", 3);
        objective("Отвези Джину в казино. Плавно.");
        target(CASINO.x, CASINO.z);
      }
      return;
    }
    var c = P().inCar ? P().car : null;
    if (c !== j.car) return fail("Джина в этих каблуках никуда пешком не пойдёт.");
    if (c.dead || c.hp < j.hp0 - c.spec.hp * 0.15) return fail("Ей надоело твоё вождение. Она выходит.");
    if (GAME.police.wanted > j.heat0) return fail("Полиция? На первом свидании? Она выходит на светофоре.");
    if (dist(c.pos, CASINO.x, CASINO.z) < 12 && Math.abs(c.speed) < 3) win("Она улыбается. Марко твой должник.");
  }

  // ---------- NINA: the lighthouse, in the frame ----------
  // Your camera (photo.js): a picture taken from near enough, with the tower
  // in the view, is the one she wants.
  function ninaBegin(j) {
    var L = GAME.city.islaPois.lighthouse;
    j.tower = { x: L.x, z: L.z, y: GAME.city.groundY(L.x, L.z) + 8 };
    j.snap0 = GAME.photo ? GAME.photo.lastSnap : 0;
    j.phase = 'shoot';
    objective("Сфотографируй маяк (" + (GAME.isTouch ? '📷' : GAME.controls ? GAME.controls.label('KeyC') : 'C') + ") с достаточно близкого расстояния.");
    target(L.x, L.z);
  }
  function ninaStep(j) {
    var snap = GAME.photo ? GAME.photo.lastSnap : 0;
    if (snap === j.snap0) return;
    j.snap0 = snap;
    var t = j.tower, f = GAME.focus(), d = dist(f, t.x, t.z);
    if (d > 170) { say("Слишком далеко. Ей нужна башня, а не точка.", 2.5); return; }
    // (looked at a few metres in front of it: a line to its middle runs
    // into the tower itself, which hides nothing)
    var cam = GAME.cameraObj.position, cd = Math.max(1, dist(cam, t.x, t.z));
    var ax = t.x + (cam.x - t.x) / cd * 7, az = t.z + (cam.z - t.z) / cd * 7;
    if (!GAME.inPlainView(ax, t.y, az)) { say("Маяка в кадре нет. Попробуй снова.", 2.5); return; }
    win("«Это обложка», — говорит Нина.");
  }

  // ---------- GUS: his brother, adrift ----------
  // A boat off the jetty (the marina keeps one), out to the dinghy, and back.
  function gusBegin(j) {
    var M = GAME.city.islaPois.marina, SL = GAME.sealife, spot = null;
    for (var t = 0; t < 60 && !spot; t++) {
      var a = Math.random() * Math.PI * 2, r = U.randRange(Math.random, 150, 260);
      var x = M.x + Math.cos(a) * r, z = M.z + Math.sin(a) * r;
      if (SL && SL.roomy(x, z, 14)) spot = { x: x, z: z };
    }
    if (!spot) return fail("Береговая охрана добралась первой.");
    var dinghy = GAME.vehicles.spawnCar('boat', spot.x, spot.z, Math.random() * 6.28, { occupied: 'ai', mission: true, color: 0x2a2e3a, ai: { mode: 'parked' } });
    if (!dinghy) return fail("Береговая охрана добралась первой.");
    dinghy.pos.y = GAME.city.seaY(spot.x, spot.z);
    j.dinghy = dinghy; j.bits.push({ kind: 'car', o: dinghy });
    j.home = { x: M.x, z: M.z };
    j.phase = 'out';
    objective("Возьми лодку и доберись до дрейфующей шлюпки.");
    target(spot.x, spot.z);
  }
  function gusStep(j) {
    var p = P(), boat = p.inCar && p.car && p.car.spec.boat ? p.car : null, dg = j.dinghy;
    if (!dg || dg.gone) return fail("Шлюпка затонула.");
    if (j.phase === 'out') {
      target(dg.pos.x, dg.pos.z);
      if (boat && dist(boat.pos, dg.pos.x, dg.pos.z) < 12) {
        // over the side and into yours
        if (dg.riderMesh) { dg.mesh.remove(dg.riderMesh); disposeTree(dg.riderMesh); dg.riderMesh = null; }
        dg.occupied = null; dg.ai = null;
        j.phase = 'back';
        say("Он перебирается к тебе, мокрый насквозь. «Думал, мне конец».", 3);
        objective("Отвези его обратно в марину.");
        target(j.home.x, j.home.z);
      }
      return;
    }
    if (boat && dist(boat.pos, j.home.x, j.home.z) < 45) win("Гас обнимает брата, потом даёт ему подзатыльник.");
  }

  // ---------- LUPE: no pictures ----------
  // A photographer on a moped, on your bumper. Get far enough away for long
  // enough and he has lost you; let him sit beside you and he has his shot.
  function lupeBegin(j) {
    j.phase = 'car';
    if (inLand()) lupeGo(j);
    else objective("Найди машину — Лупе едет с тобой.");
  }
  function lupeGo(j) {
    var car = inLand(), C = GAME.city;
    takeIn(j.who); j.away = true;
    var fx = Math.sin(car.heading), fz = Math.cos(car.heading);
    var rp = C.nearestRoadPoint(car.pos.x - fx * 45, car.pos.z - fz * 45);
    var pap = GAME.vehicles.spawnCar('motorcycle', rp.x, rp.z, car.heading, { occupied: 'ai', mission: true, color: 0xf0f0f4,
      ai: { mode: 'traffic', desired: 21, laneX: 0, laneZ: 0, reckless: true, follow: car } });
    if (!pap) return fail("Он пропал. Лупе почти разочарована.");
    j.pap = pap; j.bits.push({ kind: 'car', o: pap });
    j.phase = 'lose'; j.timer = 120; j.awayT = 0; j.closeT = 0;
    say("Лупе прячется за очками. «Вон тот, на мопеде. Оторвись от него».", 3);
    objective("Оторвись от фотографа.");
    target(null);
  }
  function lupeStep(j, dt) {
    var car = inLand();
    if (j.phase === 'car') {
      if (car && dist(car.pos, j.who.at.x, j.who.at.z) < 30) lupeGo(j);
      else target(j.who.at.x, j.who.at.z);
      return;
    }
    var pap = j.pap;
    if (!pap || pap.gone || pap.dead || pap.occupied !== 'ai') return win("Ни одного снимка. Лупе шлёт воздушный поцелуй.");
    if (!car) { j.outT = (j.outT || 0) + dt; if (j.outT > 5) return fail("Ты оставил её в машине. Он сделал снимок."); }
    else j.outT = 0;
    j.timer -= dt;
    GAME.hud.missionTimer(j.timer, true);
    var at = car ? car.pos : P().pos, d = dist(at, pap.pos.x, pap.pos.z);
    // Further back he rides the streets after you; close up he rides at your
    // shoulder, matching your pace — the streets' own driving would carry
    // him straight past a car that had stopped, never to come back round.
    var tgt = car || P();
    if (d < 30) {
      if (pap.ai.mode !== 'race') pap.ai = { mode: 'race' };
      alongside(pap, tgt.pos || tgt.pos, car ? car.heading : P().heading, car ? car.speed : 0);
    } else if (pap.ai.mode !== 'traffic') {
      pap.ai = { mode: 'traffic', desired: 21, laneX: 0, laneZ: 0, reckless: true, follow: car };
    } else if (car) pap.ai.follow = car;
    if (d < 12 && Math.abs((car ? car.speed : 0)) < 6) { j.closeT += dt; if (j.closeT > 4) return fail("Он сделал снимок."); }
    else j.closeT = Math.max(0, j.closeT - dt);
    if (d > 160) { j.awayT += dt; if (j.awayT > 4 || d > 240) return win("Ни одного снимка. Лупе шлёт воздушный поцелуй."); }
    else j.awayT = 0;
    if (GAME.frame % 20 === 0) objective(d < 40 ? "Оторвись от фотографа — он прямо за тобой!" : "Оторвись от фотографа — продолжай ехать…");
    if (j.timer <= 0) return fail("Он продержался достаточно. Завтрашние газеты, третья полоса.");
  }

  // ride at somebody's left shoulder: steer for the spot, at their pace
  function alongside(rider, at, heading, speed) {
    var c = rider.controls, fx = Math.sin(heading), fz = Math.cos(heading);
    var tx = at.x + fz * 3 + fx * 0.5, tz = at.z - fx * 3 + fz * 0.5;
    var dx = tx - rider.pos.x, dz = tz - rider.pos.z, d = Math.sqrt(dx * dx + dz * dz);
    var dh = U.wrapPI((d > 2 ? Math.atan2(dx, dz) : heading) - rider.heading);
    var vd = Math.min(24, Math.max(0, speed) + d * 0.8);
    c.steer = U.clamp(dh * 2.2, -1, 1);
    c.throttle = U.clamp((vd - rider.speed) * 0.35, -1, 1);
    c.handbrake = false;
  }

  // ---------- WALT: what he owes ----------
  // The man at the container yard runs when you come for him. Put him down —
  // he is fair game — and the money is yours to take back.
  function waltBegin(j) {
    var K = GAME.city.islaPois.container, spot = pavement(K.x + 20, K.z - 20);
    var man = GAME.peds.spawnPed(spot.x, spot.z, { look: { shirt: 0x684a3a, pants: 0x2a2a34, skin: 0xc89878, hair: 'mullet', hairCol: 0x5a3c22 } });
    if (!man) return fail("Он сбежал с острова.");
    man.jobPed = true; man.state = 'wait'; man.speed = 0; man.outlaw = true; man.hp0 = man.hp;
    j.man = man; j.bits.push({ kind: 'ped', o: man });
    j.phase = 'find';
    objective("Найди человека на контейнерной площадке. Он побежит.");
    target(spot.x, spot.z);
  }
  function waltStep(j) {
    var m = j.man, f = GAME.focus();
    if (j.phase === 'find') {
      if (!m || m.gone) return fail("Он сбежал с острова.");
      target(m.pos.x, m.pos.z);
      if (dist(m.pos, f.x, f.z) < 25 && m.state === 'wait') {
        m.jobPed = false;
        GAME.peds.startFlee(m, f.x, f.z, 40);
        say("Он видит тебя и бросается бежать!", 2);
        objective("Поймай его.");
      }
      if (m.dead || (m.knockT || 0) > 0 || m.hp < (m.hp0 || 30) * 0.6) {
        j.phase = 'back';
        say("Он раскошеливается — пачка купюр, влажных от пота.", 3);
        objective("Верни деньги Уолту.");
        target(j.who.at.x, j.who.at.z);
        return;
      }
      if (m.state !== 'wait' && dist(m.pos, f.x, f.z) > 150) return fail("Он скрылся на площадке.");
      return;
    }
    if (dist(f, j.who.at.x, j.who.at.z) < 8) win("Уолт пересчитывает дважды. «До цента».");
  }

  // ---------- face to face ----------
  // A cut to the two of you (scenes.js), the stranger as they stand in the
  // street; the real one is hidden while their double talks. With scenes
  // off, or nothing to say, it goes straight on.
  function face(id, set, ls, then, hide) {
    hide = hide || [];
    // (a ped, or a bare mesh like their marker)
    hide.forEach(function (h) { if (h) (h.mesh || h).visible = false; });
    var back = function () {
      hide.forEach(function (h) { if (h && !h.gone) (h.mesh || h).visible = true; });
      then();
    };
    var ok = GAME.scenes && GAME.scenes.play({ id: 'stranger-' + id, shots: [{ set: set, cast: [id, 'you'], lines: ls }] }, back);
    if (!ok) back();
  }
  // a set where somebody stands, the camera out toward the road
  function spotSet(x, z) {
    return function () {
      var rp = GAME.city.nearestRoadPoint(x, z), nx = rp.x - x, nz = rp.z - z, nl = Math.hypot(nx, nz);
      if (nl < 1) { nx = 1; nz = 0; nl = 1; }
      return { x: x, z: z, nx: nx / nl, nz: nz / nl };
    };
  }
  // what they want, a sentence or two at a time
  function pitch(d) {
    var parts = d.ask.match(/[^.!?—]+[.!?—]+["”']?\s*/g) || [d.ask], out = [], cur = '';
    parts.forEach(function (t) {
      if (cur && (cur + t).length > 110) { out.push([d.id, cur.trim()]); cur = ''; }
      cur += t;
    });
    if (cur.trim()) out.push([d.id, cur.trim()]);
    return out;
  }
  // Out of your car, at the kerb side — n spaces a party along it
  function outOf(car, look, side, n) {
    var h = car.heading + (side || 1) * Math.PI / 2, off = (car.spec.w || 1.8) / 2 + 0.9, back = (n || 0) * 1.1;
    var x = car.pos.x + Math.sin(h) * off - Math.sin(car.heading) * back, z = car.pos.z + Math.cos(h) * off - Math.cos(car.heading) * back;
    var r = GAME.resolveCircle ? GAME.resolveCircle(x, z, 0.35) : { x: x, z: z };
    var ped = GAME.peds.spawnPed(r.x, r.z, { look: look });
    if (ped) { ped.heading = car.heading; ped.mesh.rotation.y = ped.heading; }
    return ped;
  }
  // back to being somebody in the street: walking, and gone by the usual
  // way of things once you are well off
  function walkOff(ped) {
    if (!ped || ped.gone || ped.dead) return;
    ped.jobPed = false; ped.stranger = null; ped.outlaw = false;
    ped.state = 'walk'; ped.wpT = 0; ped.mesh.visible = true;
  }
  // through a door: the airport gate, the observatory, the casino
  function goIn(ped, x, z, t) {
    if (!ped || ped.gone || ped.dead) return;
    ped.stranger = null; ped.jobPed = true; ped.mesh.visible = true;
    GAME.peds.walkInto(ped, x, z, t || 20);
  }
  function release(p) {
    walkOff(p.ped);
    p.ped = null;
    if (p.mark) { GAME.scene.remove(p.mark); p.mark = null; }
  }
  // the dog: at his owner's heel until they are well off, or off and away
  // from you until he is out of sight
  function stepLeavers(dt) {
    var f = GAME.focus();
    for (var i = leavers.length - 1; i >= 0; i--) {
      var L = leavers[i], m = L.mesh, dp = m.position, tx, tz, run;
      var far = dist(dp, f.x, f.z);
      var owner = L.follow && !L.follow.gone && !L.follow.dead ? L.follow : null;
      if ((L.follow && !owner) || far > 90 || (L.flee && far > 25 && !GAME.inPlainView(dp.x, dp.y + 0.4, dp.z))) {
        GAME.scene.remove(m); disposeTree(m); leavers.splice(i, 1); continue;
      }
      if (owner) {
        tx = owner.pos.x - Math.sin(owner.heading) * 1.2; tz = owner.pos.z - Math.cos(owner.heading) * 1.2;
        run = Math.min(7, dist(dp, tx, tz) * 2.4);
      } else {
        var ax = dp.x - f.x, az = dp.z - f.z, al = Math.hypot(ax, az) || 1;
        tx = dp.x + ax / al * 5; tz = dp.z + az / al * 5; run = 6;
      }
      var dx = tx - dp.x, dz = tz - dp.z, dd = Math.hypot(dx, dz), legs = m.userData.legs;
      if (dd > 0.3 && run > 0.2) {
        var st = Math.min(dd, run * dt), r = GAME.resolveCircle(dp.x + dx / dd * st, dp.z + dz / dd * st, 0.3);
        dp.x = r.x; dp.z = r.z; dp.y = GAME.city.groundY(dp.x, dp.z);
        m.rotation.y = Math.atan2(dx, dz);
        var sw = Math.sin(GAME.time * 16) * 0.6;
        if (legs) { legs[0].rotation.x = legs[3].rotation.x = sw; legs[1].rotation.x = legs[2].rotation.x = -sw; }
      } else if (legs) for (var k = 0; k < 4; k++) legs[k].rotation.x = 0;
      if (m.userData.tail) m.userData.tail.rotation.y = Math.sin(GAME.time * 12) * 0.5;
    }
  }

  // ---------- each tick ----------
  function update(dt) {
    if (!GAME.started) return;
    if (!enabled) { if (people) { if (job) tidy(); people.forEach(takeIn); } return; }
    if (!people) setup();
    tend(dt);
    stepLeavers(dt);
    if (!job) { listen(); return; }
    if (job.ending) return;
    var p = P();
    job.t0 = (job.t0 || 0) + dt;
    if (p.state !== 'alive') return fail(p.state === 'busted' ? "тебя арестовали" : "ты погиб");
    // X twice walks away from it, as from any job
    if (GAME.keyPressed('KeyX')) {
      if (GAME.time < abandonAsk) { abandon(); return; }
      abandonAsk = GAME.time + 3;
      say((GAME.controls ? GAME.controls.label('KeyX') : 'X') + " ещё раз, чтобы отказаться от " + job.def.title, 3);
    }
    job.def.step(job, dt);
    if (!job) return;
    stepRoute(dt);
    if (ring && ring.visible) ring.material.opacity = 0.25 + 0.12 * Math.sin(GAME.time * 4);
  }

  // the radar: the strangers waiting, and the white car / the bike / the dog
  var blipBuf = [];
  function blips() {
    var n = 0, f = GAME.focus();
    function put(x, z, color, size) {
      var b = blipBuf[n] || (blipBuf[n] = { x: 0, z: 0, color: '', size: 0 });
      b.x = x; b.z = z; b.color = color; b.size = size; n++;
    }
    if (people && !job) {
      for (var i = 0; i < people.length; i++) {
        var q = people[i];
        if (done(q.def.id) || !avail(q.def)) continue;
        if (U.dist2(q.at.x, q.at.z, f.x, f.z) < 220 * 220) put(q.at.x, q.at.z, '#c86bff', 3.5);
      }
    }
    if (job && job.husband && !job.husband.gone) put(job.husband.pos.x, job.husband.pos.z, '#f0f0f4', 3.5);
    blipBuf.length = n;
    return blipBuf;
  }

  return {
    update: update,
    blips: blips,
    abandon: abandon,
    get busy() { return !!job; },
    get enabled() { return enabled; },
    set enabled(v) { enabled = !!v; },
    get job() { return job; },
    // the pause screen's ABANDON button, and the map's route and marker
    get activeJob() { return job ? { def: { job: false, name: job.def.title } } : null; },
    route: function () { return job && job.target ? route : null; },
    target: function () { return job ? job.target : null; },
    get done() { return doneCount(); },
    // how each of them looks in the street, for the scenes (cast.js)
    look: function (id) { return LOOK[id] || null; },
    get leavers() { return leavers.length; },
    // as many as can be reached: the mainland's, and the island's once it is open
    get total() { return reachable(); },
    // headless: who is where, and asking one of them straight away
    people: function () { if (!people) setup(); return people; },
    ask: function (id) { if (!people) setup(); for (var i = 0; i < people.length; i++) if (people[i].def.id === id) { begin(people[i]); return true; } return false; },
    // headless: the favour under way, done (its thanks and its going)
    finish: function (line) { if (job && !job.ending) { win(line || ''); return true; } return false; },
    reset: function () {
      if (job) tidy(); if (people) people.forEach(takeIn); people = null;
      leavers.forEach(function (L) { GAME.scene.remove(L.mesh); disposeTree(L.mesh); }); leavers = [];
    }
  };
})();
