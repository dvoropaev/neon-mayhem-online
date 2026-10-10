// Lola's first day. A brand new save used to open on one line from her —
// "start with a race, and win it" — and two hints, and the nearest race was
// three hundred metres off with nothing pointing at it. Now she asks: SHOW
// ME AROUND, or I'LL FIND MY OWN WAY.
//
// Shown around, you are walked through one thing of each kind the town is
// made of: a ride (a bike at the kerb, marked, with the button for whatever
// you play on), a job (BEACH RUN, a few blocks in off the strip from where a
// new game starts, so there is a drive to it — three drops instead of four, on a kinder
// clock, because failing your first job is a bad first five minutes), and
// what the money is for (CORTES CUTS, a short drive up into Las Colinas: a new look with the
// pay). Then the wider picture: the other rings, what opens the bridges to
// Isla Verde, and that she is a button away. Until then the island is only
// mentioned as shut.
//
// It never holds you: abandon the job or wander off and she lets you go with
// a line, and SHOW ME THE ROPES on her menu picks it back up until it has
// been seen through once. A save with any job done is never offered it.
GAME.guide = (function () {
  var COURIER = 'courier2';           // BEACH RUN
  var step = null;                    // what she is waiting for, or null
  var car = null, arrow = null, hudText = '', hudTitle = '';
  var waitT = 0, stepT = 0, saidHeat = false, saidGo = false, saidWrongRide = false;
  var shopCash = null, shopLook = null, ringAt = null, barberAt = null;
  // how far off the step's goal you were when it began: a job can end a
  // kilometre from the barber, and a failed run far from its ring, and only
  // heading further away than that is walking off
  var startD = 0;
  function walkedOff(at, slack) {
    if (!at) return false;
    var f = where(), d = Math.sqrt(U.dist2(f.x, f.z, at.x, at.z));
    return d > Math.max(slack, startD + 300);
  }
  function startFrom(at) {
    var f = where();
    startD = at ? Math.sqrt(U.dist2(f.x, f.z, at.x, at.z)) : 0;
  }

  function prefs() { GAME.prefs = GAME.prefs || {}; return GAME.prefs; }
  function save() { if (GAME.save) GAME.save(); }
  function touch() { return !!GAME.isTouch; }
  function onPad() { return !!(GAME.controls && GAME.controls.usingPad && GAME.controls.usingPad()); }
  function K(code) { return GAME.controls ? GAME.controls.label(code) : code.replace(/^Key/, ''); }
  // the buttons as whatever you are playing on calls them
  function getIn() { return touch() ? "СЕСТЬ" : K('KeyF'); }
  function mapKey() { return touch() ? "касание радара" : K('KeyP'); }
  function callMe() { return touch() ? "«СПРОСИТЬ ЛОЛУ» в меню паузы" : onPad() ? "START, затем «СПРОСИТЬ ЛОЛУ»" : K('KeyL'); }
  function retryKey() { return touch() ? "ПОВТОР" : K('KeyY'); }
  function say(text, dur) { if (GAME.hud && GAME.hud.pager) GAME.hud.pager("ЛОЛА", text, dur); }

  function courierDef() {
    var M = GAME.missions;
    return M ? M.DEFS.filter(function (d) { return d.id === COURIER; })[0] : null;
  }
  function barberLoc() {
    return GAME.shops ? GAME.shops.locations().filter(function (l) { return l.kind === 'barber'; })[0] : null;
  }
  function fresh() {
    for (var k in (GAME.bests || {})) return false;
    return true;
  }
  function landCar(c) { return !!c && !c.dead && !c.spec.heli && !c.spec.plane && !c.spec.boat; }
  function where() { return GAME.focus(); }

  // ---------- the top of the screen and the map ----------
  // Her steps borrow the job panel while no job is using it.
  function objective(title, text) {
    if (GAME.missions && GAME.missions.active) { hudTitle = hudText = ''; return; }
    if (title === hudTitle && text === hudText) return;
    hudTitle = title; hudText = text;
    GAME.hud.missionStart(title, text);
  }
  function clearHud() {
    if (hudTitle && !(GAME.missions && GAME.missions.active)) GAME.hud.missionEnd();
    hudTitle = hudText = '';
  }
  function route(x, z) { if (GAME.nav) GAME.nav.setDest(x, z); }
  function unroute(x, z) {
    var d = GAME.nav && GAME.nav.dest;
    if (d && Math.abs(d.x - x) < 1 && Math.abs(d.z - z) < 1) GAME.nav.clear();
  }

  // a yellow arrow over the car she means, the same as over a fare
  function showArrow(c) {
    if (!arrow) {
      // big enough to find from forty metres off down a busy street
      var g = new THREE.ConeGeometry(0.9, 1.9, 4);
      g.rotateX(Math.PI);
      arrow = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffe14f }));
      GAME.scene.add(arrow);
    }
    arrow.visible = true;
    arrow.position.set(c.pos.x, c.pos.y + 3.4 + Math.sin(GAME.time * 3) * 0.25, c.pos.z);
    arrow.rotation.y += 0.04;
  }
  function hideArrow() { if (arrow) arrow.visible = false; }
  function dropArrow() {
    if (!arrow) return;
    GAME.scene.remove(arrow);
    arrow.geometry.dispose(); arrow.material.dispose();
    arrow = null;
  }

  // A bike for the first ride: the nearest one parked nearby, or one stood
  // at the kerb for you. (It was the nearest parked car, which is a sedan
  // more often than not; the strip on two wheels is a better first minute.)
  function pickCar() {
    var P = GAME.player, best = null, bd = 90 * 90;
    GAME.world.cars.forEach(function (c) {
      if (!landCar(c) || !c.spec.bike || c.occupied === 'ai' || c.mission || !c.ai || c.ai.mode !== 'parked') return;
      var d = U.dist2(c.pos.x, c.pos.z, P.pos.x, P.pos.z);
      if (d < bd) { bd = d; best = c; }
    });
    if (best) return best;
    var rp = GAME.city.nearestRoadPoint(P.pos.x, P.pos.z);
    var along = rp.axis === 'z', side = along ? (P.pos.x > rp.x ? 1 : -1) : (P.pos.z > rp.z ? 1 : -1);
    var x = rp.x + (along ? side * 4.6 : 0), z = rp.z + (along ? 0 : side * 4.6);
    return GAME.vehicles.spawnCar('motorcycle', x, z, along ? 0 : Math.PI / 2, { ai: { mode: 'parked' } });
  }

  // ---------- the steps ----------
  function go(s) { step = s; stepT = 0; }
  function toRide() {
    go('ride');
    car = null;
  }
  function toRing() {
    go('ring');
    hideArrow();
    var d = courierDef();
    ringAt = d ? { x: d.start.x, z: d.start.z } : null;
    startFrom(ringAt);
    if (ringAt) route(ringAt.x, ringAt.z);
  }
  // Paid: she comes to you and says so, face to face (scenes.js — the
  // pager in the corner undersold your first job), then marks the barber.
  var FIRST_PAY = { id: 'guide-paid', shots: [{ set: 'here', cast: ['lola', 'you'], lines: [
    ['lola', "Три доставки, всё вовремя, и товар без единой царапины. Молодец, парень."],
    ['you', "Самые лёгкие деньги в моей жизни."],
    ['lola', "Не привыкай. И без обид — выглядишь так, будто только утром сошёл с автобуса."],
    ['lola', "Смени имидж. На свой вкус и за свои деньги. В «СТРИЖКАХ КОРТЕСА» отлично стригут — это в Лас-Колинас, рядом с больницей."],
    ['lola', "Я отметила место на карте. Встань на светящийся коврик у двери и заходи."]
  ] }] };
  function toBarber() {
    go('barber');
    var b = barberLoc();
    barberAt = b ? { x: b.at.x, z: b.at.z } : null;
    startFrom(barberAt);
    if (barberAt) route(barberAt.x, barberAt.z);
    // she is about to say how a shop works herself: her general first-shop
    // tip would say it again on the way in
    var pr = prefs(); pr.lolaSeen = pr.lolaSeen || {}; pr.lolaSeen.shop = true;
    if (GAME.scenes && GAME.scenes.play(FIRST_PAY)) return;
    say("Вот твоя первая зарплата. Молодец, парень. Теперь — без обид — выглядишь ты так, будто утром сошёл с автобуса. Смени имидж: в «СТРИЖКАХ КОРТЕСА» отлично стригут, это в Лас-Колинас у больницы. Место на карте. Заходи через коврик у двери.", 9);
  }
  function threadsLoc() {
    return GAME.shops ? GAME.shops.locations().filter(function (l) { return l.kind === 'dress'; })[0] : null;
  }
  // Out of the barber's: she is there on the pavement. The clothes are the
  // same deal at THREADS — does she mark it, or are you on your own now?
  function outro(bought) {
    go('outro');
    clearHud();
    var first = bought === true ? "Теперь на бульваре ты свой." : bought === false ? "Твои деньги — твой выбор." : "Не сегодня? Как скажешь.";
    var lines = [
      ['lola', first],
      ['lola', "С одеждой так же. «НИТКИ» в Сентро-Альто оденут с головы до ног. Всё купленное появится в домашнем гардеробе."],
      ['lola', "Отметить магазин или дальше сам найдёшь дорогу?"]
    ];
    var ask = function () { askThreads(); };
    if (GAME.scenes && GAME.scenes.play({ id: 'guide-threads', shots: [{ set: 'here', cast: ['lola', 'you'], lines: lines }] }, ask)) return;
    say(first + ' ' + lines[1][1], 7);
    ask();
  }
  function askThreads() {
    var th = threadsLoc();
    var ok = th && GAME.lola && GAME.lola.offer && GAME.lola.offer({
      say: "За одеждой — в «НИТКИ». Отметить магазин или дальше сам разберёшься?",
      top: true,
      escSays: "найти дорогу самостоятельно",
      list: [
        { label: "🧭 ОТМЕТЬ «НИТКИ» НА КАРТЕ", fn: function () {
          GAME.lola.close();
          route(th.at.x, th.at.z);
          wrap("Готово. Заходи через коврик у двери, как в парикмахерской.");
        } },
        { label: "🗺 ДАЛЬШЕ Я САМ", fn: function () { GAME.lola.close(); wrap(null); } }
      ],
      // closing her without an answer is exploring on your own
      onClose: function () { if (step === 'outro') wrap(null); }
    });
    if (!ok) wrap(null);
  }
  // the island, while it is still shut: mentioned, and no more than that
  function islandTease(lead) {
    if (GAME.isla && GAME.isla.isOpen()) return '';
    return lead + "Исла-Верде. Мосты пока закрыты. Держись меня — и это изменится.";
  }
  function islandLine() {
    if (GAME.isla && GAME.isla.isOpen()) return "Мосты на Исла-Верде открыты. Мои задания там тоже тебя ждут.";
    return "Выполни любые четыре задания — и мосты на Исла-Верде откроют. Или пройди все уникальные прыжки в городе — это тоже сработает.";
  }
  // the end of it: the wider picture, and that she is a call away
  function wrap(first) {
    if (first) say(first, 6);
    say("Теперь город твой. Остальные кольца на карте — гонки, погромы и устранение целей. " + islandLine() + " Нужна помощь? " + callMe() + '.', 10);
    finishUp('done');
    if (GAME.track) GAME.track('guide-done');
  }
  // walked off part way: let them go, with the way back
  function leave(line) {
    say(line + " Я на связи через " + callMe() + ". Выбери «ОБУЧИ МЕНЯ» — и продолжим знакомство с городом.", 8);
    finishUp('left');
    if (GAME.track) GAME.track('guide-left');
  }
  function finishUp(state) {
    if (ringAt) unroute(ringAt.x, ringAt.z);
    if (barberAt) unroute(barberAt.x, barberAt.z);
    clearHud();
    dropArrow();
    step = null; car = null; shopCash = null; shopLook = null;
    prefs().guide = state;
    save();
  }

  // ---------- her question ----------
  function offer() {
    var pr = prefs();
    if (pr.guide || !fresh() || !GAME.lola || !GAME.lola.offer) return false;
    var ok = GAME.lola.offer({
      say: "Добро пожаловать в Коста-Росу, парень. Я Лола, этот бульвар мой. Ты здесь новенький. Могу дать работу и показать, как тут всё устроено. Или разбирайся сам. Решай.",
      top: true,
      escSays: "найти дорогу самостоятельно",
      list: [
        { label: "🧭 ПОКАЖИ МНЕ ГОРОД", fn: function () { GAME.lola.close(); begin(); } },
        { label: "🗺 Я РАЗБЕРУСЬ САМ", fn: function () { GAME.lola.close(); skip(); } }
      ],
      // closing her without an answer is finding your own way
      onClose: function () { skip(); }
    });
    if (!ok) return false;
    pr.guide = 'offered';
    save();
    if (GAME.track) GAME.track('guide-offered');
    return true;
  }
  function skip() {
    // (and if she was part way through, that is over too)
    if (step) finishUp('skipped');
    else { prefs().guide = 'skipped'; save(); }
    say("Как скажешь. Кольца на карте — мои задания. Клавиша " + mapKey() + " открывает карту. " +
      islandTease("Кстати, остров на той стороне воды? ") + (GAME.isla && GAME.isla.isOpen() ? '' : ' ') + "Нужна помощь? " + callMe() + '.', 10);
    if (GAME.track) GAME.track('guide-skipped');
  }
  function begin() {
    if (step) return;
    saidHeat = saidGo = saidWrongRide = false;
    prefs().guide = 'on';
    save();
    var P = GAME.player;
    if (P.inCar && landCar(P.car)) {
      toRing();
      say("Хорошо, транспорт у тебя есть. Нужна доставка — кольцо на карте. Следуй по линии, заезжай и остановись.", 7);
    } else {
      toRide();
      say("Хорошо. Сначала транспорт. Видишь стрелку? Этот мотоцикл на сегодня твой. Нажми " + getIn() + ", чтобы сесть.", 7);
    }
    var tease = islandTease("А остров на той стороне воды? ");
    if (tease) say(tease, 7);
    if (GAME.track) GAME.track('guide-begun');
  }

  // ---------- the run, made kinder ----------
  // The ring starts BEACH RUN; while she is showing you around, the run it
  // starts is three drops on shorter legs and half again the clock. Same
  // job (its id, its pay, her lines, your record), easier first go.
  function jobFor(d) {
    if ((step !== 'ring' && step !== 'job') || d.id !== COURIER) return d;
    go('job');
    hideArrow();
    var c = {};
    for (var k in d) c[k] = d[k];
    c.orig = d; c.drops = 3; c.legMin = 170; c.legMax = 340; c.time = 150;
    return c;
  }
  function finished(d, win, quit) {
    if (step !== 'job' || (d.orig || d).id !== COURIER) return;
    if (win) { go('paid'); waitT = 1.5; return; }
    if (quit) { leave("Ладно. Кольцо никуда не денется — приезжай, когда захочешь."); return; }
    // a failed first run: go again, no lecture
    toRing();
    say("С кем не бывает. Клавиша " + retryKey() + " сразу начнёт заново. Или вернись к кольцу.", 7);
  }

  // ---------- every tick ----------
  function update(dt) {
    if (!step) return;
    var P = GAME.player, M = GAME.missions, a = M && M.active;
    stepT += dt;
    if (P.state !== 'alive') { hideArrow(); return; }
    var f = where();

    if (step === 'ride') {
      if (P.inCar && landCar(P.car)) {
        toRing();
        say("Вот теперь поехали. Нужна доставка — кольцо на карте, в нескольких кварталах от бульвара, у «Неонового прилива». Следуй по линии, заезжай и остановись.", 7);
        return;
      }
      if (P.inCar && !saidWrongRide) { saidWrongRide = true; say("Нужны колёса, парень. Эта работа на дороге.", 5); }
      if (!car || car.dead || GAME.world.cars.indexOf(car) < 0 || car.occupied === 'ai' ||
        U.dist2(car.pos.x, car.pos.z, f.x, f.z) > 140 * 140) car = pickCar();
      if (car && !P.interior) showArrow(car); else hideArrow();
      objective("ПЕРВЫЙ ДЕНЬ", "Сядь на мотоцикл под стрелкой — " + getIn());
      if (a) leave("Уже на транспорте? Отлично.");
      return;
    }

    if (step === 'ring') {
      if (a) {
        // straight back in through a retry: the same gentler run
        if ((a.def.orig || a.def).id === COURIER) { go('job'); return; }
        leave("Уже нашёл транспорт? Отлично.");
        return;
      }
      if (!P.inCar) {
        // out of the car: back to it (or another), without a fuss
        if (stepT > 1.5) { toRide(); }
        return;
      }
      objective("ПЕРВЫЙ ДЕНЬ", "Заедь в кольцо доставки на карте и остановись");
      if (GAME.police.wanted > 0 && !saidHeat) { saidHeat = true; say("Сначала сбрось розыск. С полицией на хвосте работу не начинают.", 6); }
      if (ringAt && GAME.nav && !GAME.nav.dest && U.dist2(f.x, f.z, ringAt.x, ringAt.z) > 30 * 30) route(ringAt.x, ringAt.z);
      if (walkedOff(ringAt, 550)) leave("Передумал? Без проблем. Задание на карте, берись когда захочешь.");
      return;
    }

    if (step === 'job') {
      if (a && a.state === 'run' && !saidGo) {
        saidGo = true;
        say("Следуй по линии на радаре к каждой доставке и останавливайся в кольце. Таймер наверху — время ещё есть.", 7);
      }
      return;
    }

    if (step === 'paid') {
      // after the result card, and a breath
      if (GAME.shareOpen) return;
      waitT -= dt;
      if (waitT <= 0) toBarber();
      return;
    }

    if (step === 'barber') {
      if (P.interior && P.interior.shop === 'barber') {
        go('counter');
        say("Присаживайся. Стрижка, цвет — твои деньги, твой образ.", 5);
        return;
      }
      objective("НОВЫЙ ОБРАЗ", "Зайди в «СТРИЖКИ КОРТЕСА» — место на карте");
      if (barberAt && GAME.nav && !GAME.nav.dest && U.dist2(f.x, f.z, barberAt.x, barberAt.z) > 30 * 30) route(barberAt.x, barberAt.z);
      if (a || stepT > 300 || walkedOff(barberAt, 700)) wrap(null);
      return;
    }

    if (step === 'counter') {
      var S = GAME.shops, inShop = GAME.shopOpen && S.current && S.current.kind === 'barber';
      if (inShop) {
        if (shopCash === null) { shopCash = P.cash; shopLook = JSON.stringify(prefs().outfit || {}); clearHud(); }
        return;
      }
      // out of the chair: she waits for you on the pavement
      if (P.interior || (GAME.interiors && GAME.interiors.busy)) {
        if (shopCash === null) objective("НОВЫЙ ОБРАЗ", "Подойди к стойке в глубине помещения");
        else clearHud();
        return;
      }
      // (a new look, paid for or on the house in a shop that is yours)
      outro(shopCash === null ? null : shopLook !== JSON.stringify(prefs().outfit || {}));
      return;
    }
  }

  return {
    offer: offer,
    begin: begin,
    skip: skip,
    jobFor: jobFor,
    finished: finished,
    update: update,
    // her menu offers it until it has been seen through once
    canStart: function () {
      return !step && prefs().guide !== 'done' && !!GAME.started && !(GAME.missions && GAME.missions.active);
    },
    // what she would tell you to do right now (her WHAT NEXT answer)
    now: function () {
      return {
        ride: "Сядь на мотоцикл под стрелкой — " + getIn() + '.',
        ring: "Заедь в кольцо доставки на карте и остановись в нём.",
        job: "Развези посылки — следуй по линии на радаре.",
        paid: "Отличная работа. Погоди секунду.",
        barber: "Езжай в «СТРИЖКИ КОРТЕСА» — место на карте. Заходи через коврик.",
        counter: "Подойди к стойке в глубине и выбери новый образ.",
        outro: "За одеждой — в «НИТКИ». Отметить на карте?"
      }[step] || '';
    },
    get step() { return step; },
    // headless
    get car() { return car; }
  };
})();
