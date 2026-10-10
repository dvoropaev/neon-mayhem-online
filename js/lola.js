// Lola, as the voice in your ear and not only the one with work for you.
//
// The first time something happens that the game never explains — a cassette
// picked up off the pavement, a ramp that pays, a star, a boat — nobody said
// what it was or why it mattered. Now Lola pages it, once: the first tape,
// the first jump, the first star, the first time in each kind of vehicle, the
// first shift on offer, the first night in hospital. Each line is said once
// for the life of the save, and TIPS on the pause screen turns them off for
// anybody who knows the town already.
GAME.lola = (function () {
  function K(code) { return GAME.controls ? GAME.controls.label(code) : code.replace(/^Key/, ''); }
  function onPad() { return !!(GAME.controls && GAME.controls.usingPad && GAME.controls.usingPad()); }
  function touch() { return !!GAME.isTouch; }
  // the lines, written as she talks; a function where it names a control
  var TIPS = {
    tape: "Это потерянная кассета. Пиратский диджей вещал с края пирса, пока его не прикрыли. Его микстейпы разбросаны по обоим островам — всего тридцать. За каждую платят, а радар мерцает рядом с ней. Найди все — и он вернётся в эфир.",
    stunt: "Уникальный прыжок! Каждый трамплин в городе приносит деньги за первый успешный прыжок. Чем быстрее, тем лучше. Найди все — награда того стоит.",
    islaJump: "На Исла-Верде десять своих прыжков. Они считаются отдельно, и за все десять дают отдельный приз.",
    star: "Ты привлёк внимание полиции. Скройся из виду и заляг на дно — розыск спадёт. Перекраска снимает одну-две звезды, а дежурный сержант может потерять документы за плату.",
    stars3: "Три звезды: теперь тебя знают в лицо, краска не поможет. Скройся из виду и пережди или сходи к сержанту. Ночь дома тоже помогает.",
    wasted: "Жить будешь. После больницы деньги остаются, но оружие пропадает. Купи жильё — и проснёшься дома со всеми вещами.",
    busted: "Арест. С тебя берут штраф и отбирают оружие. В следующий раз сбрось звёзды, пока не зажали. Если остановишься рядом с полицейской машиной, тебя могут вытащить и заковать.",
    boat: "Лодка! Полицейские машины за тобой по воде не поедут, но у портового патруля есть катера. В заливе тоже есть работа — ищи кольца у пирсов.",
    heli: function () { return touch() ? "Теперь ты летаешь. «ВВЕРХ» и «ВНИЗ» меняют высоту. Потолок около двухсот метров. Полиция и здесь не отстанет — у неё свой вертолёт."
      : "Теперь ты летаешь. Клавиша " + K('Space') + " поднимает, " + K('ShiftLeft') + " — опускает. Потолок около двухсот метров. Полиция и здесь не отстанет — у неё свой вертолёт."; },
    plane: function () { return "Взлётная полоса там. Разгонись и тяни вверх. Если что-то пойдёт не так, " + (touch() ? "ВЫЙТИ" : K('KeyF')) + " поможет выпрыгнуть с парашютом."; },
    swim: "Плаваешь? В воде оружие не удержать. Выбирайся на песок, пирс или достаточно низкий край.",
    respray: "Свежая краска — свежий старт. Вместе со старым цветом уходят до двух звёзд. При трёх тебя знают в лицо, и краска не поможет.",
    job: function () { return "В этом транспорте есть работа. " + (touch() ? "Нажми «РАБОТА»" : "Нажми " + K('KeyJ')) + ", чтобы начать смену. Каждый рейс оплачивается, а каждый уровень требует большего."; },
    shop: "В магазины можно заходить: встань на светящийся коврик у двери. Оружие, одежда, машины, жильё — были бы деньги.",
    home: "Своё жильё. Поспи — пройдёт восемь часов, а розыск снизится. Если погибнешь поблизости, проснёшься здесь, а не в больнице.",
    casino: "«Счастливая чайка». Рулетка почти честная, справа на экранах скачки, а в баре можно поправить здоровье. Трать только то, что не жалко проиграть.",
    derby: "Ипподром «Чайка»! Выбери лошадь и ставку. Коэффициенты на табло: 4/1 приносит четырёхкратную ставку плюс возврат самой ставки. Аутсайдеры платят много, потому что чаще проигрывают. Дальше смотри скачку.",
    wardrobe: "Здесь висит вся твоя одежда. Переодеваться бесплатно. Покупки из «НИТОК» появляются в каждом твоём доме.",
    robbery: "Грабишь магазин? Держи продавца на мушке — пока целишься, касса опустошается. Тревога сработала, как только он поднял руки. Продумай отход.",
    business: "Твой бизнес. Касса наполняется весь день и хранит выручку максимум за три дня. Деньги ждут у стойки, пока не заберёшь. Затянешь — кто-нибудь в маске заберёт их за тебя.",
    photo: function () { return "Хороший снимок. Фото хранятся в альбоме: " + (touch() ? "ПАУЗА" : 'Esc') + ", затем «ФОТО». Понравившиеся можно скачать."; }
  };

  function prefs() { GAME.prefs = GAME.prefs || {}; return GAME.prefs; }
  function seen() { var p = prefs(); return p.lolaSeen || (p.lolaSeen = {}); }
  function tipsOn() { return !prefs().tipsOff; }

  // The first time `key` comes up: say it (if tips are on) and remember it
  // was said either way, so switching tips back on later does not bring a
  // backlog of everything that happened while they were off.
  function first(key) {
    var line = TIPS[key];
    if (!line) return false;
    var s = seen();
    if (s[key]) return false;
    s[key] = true;
    if (GAME.save) GAME.save();
    if (!tipsOn() || !GAME.hud || !GAME.hud.pager) return false;
    GAME.hud.pager("ЛОЛА", typeof line === 'function' ? line() : line);
    if (GAME.track) GAME.track('tip-' + key);
    return true;
  }
  function setTips(on) {
    prefs().tipsOff = !on;
    if (GAME.save) GAME.save();
  }

  // ---------- call her ----------
  // Lola as an assistant you can ask, not only a pager that goes off: L (or
  // ASK LOLA on the pause screen, which is how a phone reaches her) and she
  // asks what she can do for you — what to do next, how to lose the law,
  // where the money is, the way to a shop or home, what a thing is, how you
  // are doing, the controls. Where an answer is a place, she marks it on
  // your map. The game holds still while you talk, as it does on the map.
  var view = null, sel = 0, opts = [];
  function $(id) { return document.getElementById(id); }
  function F() { return GAME.focus(); }
  function dist(x, z) { var f = F(); return Math.hypot(x - f.x, z - f.z); }
  function far(x, z) {
    var d = dist(x, z);
    return d < 1000 ? Math.round(d / 10) * 10 + " м" : (d / 1000).toFixed(1).replace('.', ',') + " км";
  }
  // which way, as the map has it: north is up the map (-z), east is right (+x)
  function way(x, z) {
    var f = F(), a = Math.atan2(x - f.x, -(z - f.z)) * 180 / Math.PI;
    return ["к северу", "к северо-востоку", "к востоку", "к юго-востоку", "к югу", "к юго-западу", "к западу", "к северо-западу"][Math.round(((a + 360) % 360) / 45) % 8];
  }
  function there(x, z) { return far(x, z) + ' ' + way(x, z) + " от тебя"; }
  function islaOpen() { return !GAME.isla || GAME.isla.isOpen(); }
  function onIsla(x, z) { return !!(GAME.isla && GAME.isla.contains && GAME.isla.contains(x, z)); }
  function reachable(x, z) { return islaOpen() || !onIsla(x, z); }
  function nearest(list, xz) {
    var best = null, bd = 1e18;
    list.forEach(function (it) {
      var p = xz(it);
      if (!p || !reachable(p.x, p.z)) return;
      var d = dist(p.x, p.z);
      if (d < bd) { bd = d; best = { it: it, x: p.x, z: p.z }; }
    });
    return best;
  }
  function locs(kind) { return GAME.shops && GAME.shops.locations ? GAME.shops.locations().filter(function (l) { return l.kind === kind && l.at; }) : []; }
  function mark(x, z, what) {
    return { label: "📍 ОТМЕТЬ НА МОЕЙ КАРТЕ", fn: function () {
      if (GAME.nav) GAME.nav.setDest(x, z);
      close();
      if (GAME.hud && GAME.hud.pager) GAME.hud.pager("ЛОЛА", "Отмечено: " + what + ". Следуй по линии на радаре.");
    } };
  }

  // -- the answers --
  function nextThing() {
    var M = GAME.missions, a = M && M.active;
    if (!a && GAME.guide && GAME.guide.step) return { say: GAME.guide.now() };
    if (a) {
      return { say: "Сейчас у тебя задание «" + a.def.name + "»: " + (M.objectiveText() || "доведи дело до конца") +
        ". Закончи или нажми " + (touch() || onPad() ? "«ОТМЕНИТЬ» в меню паузы" : K('KeyX') + " дважды") + ", если хочешь отказаться." };
    }
    var bests = GAME.bests || {};
    var left = M ? M.DEFS.filter(function (d) { return bests[d.id] === undefined && (!d.isla || islaOpen()); }) : [];
    var n = nearest(left, function (d) { return d.start; });
    if (n) {
      var d = n.it, kind = { race: "гонка", courier: "доставка", takedown: "устранение", rampage: "погром" }[d.type] || "задание";
      var won = M.DEFS.filter(function (dd) { return bests[dd.id] !== undefined; }).length, more = Math.max(1, 4 - won);
      var shut = !islaOpen() ? " Выполни ещё " + (more === 1 ? "одно" : more + " заданий") + " — и мосты на Исла-Верде откроют." : '';
      return { say: d.name + ' — ' + kind + ', ' + there(n.x, n.z) + ". Это ближайшее из моих непройденных заданий." + shut,
        acts: [mark(n.x, n.z, d.name)] };
    }
    var ST = GAME.stunts, T = GAME.tapes;
    if (ST && ST.found < ST.total) return { say: "Все мои задания выполнены — отлично. Но ещё остались уникальные прыжки (" + ST.found + " из " + ST.total + "), а рядом с потерянными кассетами радар мерцает." };
    return { say: "Честно? Ты прошёл всё. Иди потрать деньги — казино на пирсе будет радо тебя видеть." };
  }
  function theLaw() {
    var w = GAME.police.wanted, acts = [];
    if (w <= 0) return { say: "Ты чист. Так и держи. Помни: если остановишься рядом с полицейской машиной, тебя могут вытащить из салона и арестовать." };
    var rs = nearest(GAME.city.pois.resprays || [], function (r) { return r.door; });
    var desk = nearest(locs('bribe'), function (l) { return l.at; });
    var home = nearest(locs('safehouse').filter(function (l) { return GAME.shops.owns(l.sh.id); }), function (l) { return l.at; });
    var say;
    if (w <= 2) {
      say = (w === 1 ? "Одна звезда." : "Две звезды.") + " Скройся из виду и заляг на дно — розыск спадёт. Или перекрась машину: " +
        (rs ? "ближайшая мастерская " + there(rs.x, rs.z) + '.' : "подойдёт любая мастерская перекраски.");
      if (rs) acts.push(mark(rs.x, rs.z, "мастерская перекраски"));
    } else {
      say = w + " звёзд. Тебя знают в лицо, краска не поможет. Скройся и пережди или поговори с дежурным сержантом" +
        (desk ? " в участке " + there(desk.x, desk.z) : '') + ". Он теряет документы за плату." +
        (home ? " Или поспи дома. Твоё жильё " + there(home.x, home.z) + '.' : '');
      if (desk) acts.push(mark(desk.x, desk.z, "дежурный сержант"));
    }
    if (home && w <= 2) say += " Твоё жильё " + there(home.x, home.z) + ". Никто не заглянет внутрь.";
    if (home) acts.push({ label: "🏠 ОТМЕТЬ МОЙ ДОМ", fn: mark(home.x, home.z, home.it.sh.name).fn });
    return { say: say, acts: acts };
  }
  function money() {
    var bests = GAME.bests || {}, M = GAME.missions, ST = GAME.stunts, T = GAME.tapes;
    var left = M ? M.DEFS.filter(function (d) { return bests[d.id] === undefined && (!d.isla || islaOpen()); }).length : 0;
    var lines = [];
    lines.push("Каждый рейс оплачивается. Сядь в такси, скорую или полицейскую машину и нажми " + (touch() ? "РАБОТА" : K('KeyJ')) + '.' + (islaOpen() ? " У фургона мороженого на Исла-Верде тоже есть работа. Гудок включает мелодию." : ''));
    if (left) lines.push(left + " моих заданий ещё ждут тебя. Первая победа в каждом оплачивается лучше всего.");
    if (ST && ST.found < ST.total) lines.push((ST.total - ST.found) + " уникальных прыжков ещё принесут деньги за первое прохождение.");
    if (T && T.found < T.total) lines.push((T.total - T.found) + " потерянных кассет ещё ждут тебя. Каждая чего-то стоит.");
    var B = GAME.business;
    if (B && B.count < B.total) lines.push("Или пусть деньги приходят сами: купи бизнес — парикмахерскую, «НИТКИ», оружейный магазин, бар «Счастливой чайки» или «ВЕРДЕ-ТАКСИ» за проливом. Касса наполняется каждый день.");
    else if (B && B.count) lines.push("Твой бизнес зарабатывает. Зайди и забери выручку.");
    lines.push("А если чувствуешь удачу — есть «Счастливая чайка».");
    return { say: lines.join(' ') };
  }
  var PLACES = [
    ['hardware', "🔫 ОРУЖИЕ И БРОНЯ", "оружейный магазин"], ['dress', "👕 ОДЕЖДА", "НИТКИ"], ['barber', "💈 СТРИЖКА", "парикмахерская"],
    ['showroom', "🏎 НОВЫЙ ТРАНСПОРТ", "автосалон"], ['home', "🏠 МОЙ ДОМ", "твоё жильё"], ['casino', "🎰 КАЗИНО", "«Счастливая чайка»"],
    ['hospital', "➕ БОЛЬНИЦА", "больница"], ['bribe', "🚔 ДЕЖУРНЫЙ СЕРЖАНТ", "дежурный в участке"]
  ];
  function placeOf(kind) {
    if (kind === 'hospital') return nearest(GAME.city.pois.hospitals || [], function (h) { return h; });
    if (kind === 'home') {
      var owned = locs('safehouse').filter(function (l) { return GAME.shops.owns(l.sh.id); });
      return nearest(owned.length ? owned : locs('safehouse'), function (l) { return l.at; });
    }
    return nearest(locs(kind), function (l) { return l.at; });
  }
  function takeMe() {
    return { say: "Куда хочешь? Отмечу на карте.", list: PLACES.map(function (p) {
      return { label: p[1], fn: function () {
        var n = placeOf(p[0]);
        if (!n) { answer({ say: "Сейчас до такого места не добраться." }); return; }
        var name = p[0] === 'home' && n.it.sh ? (GAME.shops.owns(n.it.sh.id) ? n.it.sh.name : n.it.sh.name + " (продаётся)") : n.it.name || p[2];
        answer({ say: (name || p[2]) + " находится " + there(n.x, n.z) + '.', acts: [mark(n.x, n.z, name || p[2])] });
      } };
    }) };
  }
  var TOPICS = [['tape', "Потерянные кассеты"], ['stunt', "Уникальные прыжки"], ['star', "Полиция"], ['job', "Работа на транспорте"],
    ['shop', "Магазины"], ['home', "Своё жильё"], ['wardrobe', "Гардероб"], ['casino', "Казино"], ['derby', "Скачки"],
    ['boat', "Лодки"], ['heli', "Вертолёты"], ['plane', "Самолёты"], ['swim', "Плавание"], ['respray', "Перекраска"], ['photo', "Камера"]];
  function explain() {
    return { say: "Спрашивай. Что хочешь узнать?", list: TOPICS.map(function (t) {
      return { label: t[1].toUpperCase(), fn: function () { answer({ say: lineOf(t[0]) }); } };
    }) };
  }
  function lineOf(k) { var l = TIPS[k]; return typeof l === 'function' ? l() : l; }
  function howAmI() {
    var bests = GAME.bests || {}, M = GAME.missions, ST = GAME.stunts, T = GAME.tapes, P = GAME.player, done = 0;
    if (M) M.DEFS.forEach(function (d) { if (bests[d.id] !== undefined) done++; });
    var homes = GAME.shops ? locs('safehouse').filter(function (l) { return GAME.shops.owns(l.sh.id); }).length : 0;
    var g = GAME.shops && GAME.shops.garage ? GAME.shops.garage().length : 0;
    var pct = Math.round(100 * (done + (ST ? ST.found + (ST.islaFound || 0) : 0) + (T ? T.found : 0)) /
      Math.max(1, (M ? M.DEFS.length : 0) + (ST ? ST.total + (ST.islaTotal || 0) : 0) + (T ? T.total : 0)));
    return { say: "Мои задания: " + done + " из " + (M ? M.DEFS.length : 0) + ". Уникальные прыжки: " + (ST ? ST.found + " из " + ST.total : '—') +
      (ST && ST.islaTotal && islaOpen() ? ", и " + ST.islaFound + " из " + ST.islaTotal + " на острове" : '') + ". Потерянные кассеты: " + (T ? T.found + " из " + T.total : '—') +
      (GAME.strangers ? ". Помощь незнакомцам: " + GAME.strangers.done + " из " + GAME.strangers.total : '') +
      (GAME.heist && (GAME.heist.offered() || GAME.heist.step > 0) ? ". Большой куш: " + Math.min(GAME.heist.step, 4) + " из 4 этапов" : '') +
      (GAME.business && GAME.business.count ? ". Бизнес: " + GAME.business.count + " из " + GAME.business.total : '') +
      ". У тебя $" + P.cash.toLocaleString('ru-RU') + ", жилья — " + homes + " из 3" + (g ? ", транспорта — " + g + " в гараже" : '') +
      ". Получается " + pct + "% Коста-Росы. " + (pct < 25 ? "Ещё многое впереди." : pct < 75 ? "Уже неплохо." : "Почти всё, парень.") };
  }
  // the Savings & Loan: where it stands, and the next part to go and do
  function bigScore() {
    var H = GAME.heist, b = H.board();
    return { say: b.say, list: b.next ? [{ label: '▶ ' + b.next, fn: function () { close(); H.begin(); } }] : [] };
  }
  function controlsHelp() {
    if (onPad()) return { say: "Левый стик — движение, правый — камера. Пешком RT стреляет, LT целится. В транспорте это газ и тормоз. " +
      "A — прыжок, B — бег, Y — сесть и выйти, X — работа. LB и RB — выбор цели или стрельба из окна, R3 — гудок, L3 — фото, крестовина — оружие и радио. " +
      "BACK — карта. START — пауза. Там ты найдёшь и меня." };
    if (touch()) return { say: "Левый большой палец: где коснёшься, там стик. Справа пешком — «ОГОНЬ», «ПРЫЖОК» и «БЕГ», в машине — педали. «СЕСТЬ» / «ВЫЙТИ» — транспорт, «РАБОТА» — начало смены, 📢 — гудок, 📷 — фото. В «ПАУЗЕ» карта, настройки и я." };
    return { say: K('KeyW') + K('KeyA') + K('KeyS') + K('KeyD') + " — движение, мышь — камера, левый щелчок — огонь, правый (или " + K('Tab') + ") — захват цели. " +
      K('KeyF') + " — сесть и выйти, " + K('Space') + " — прыжок или подъём, " + K('ShiftLeft') + " — бег. " + K('KeyJ') + " — начать работу, " + K('KeyG') + " — гудок, " +
      K('KeyC') + " — фото (" + K('KeyV') + " — посмотреть), " + K('KeyP') + " — карта, " + K('KeyL') + " — позвонить мне. В разделе «УПРАВЛЕНИЕ» меню паузы можно переназначить клавиши." };
  }

  function topLevel() {
    var w = GAME.police && GAME.police.wanted > 0, law;
    var list = [
      { label: "🧭 ЧТО ДЕЛАТЬ ДАЛЬШЕ?", fn: function () { answer(nextThing()); } },
      // her guided first day (guide.js), for anyone who turned it down or
      // walked off part way, until it has been seen through once
      GAME.guide && GAME.guide.canStart() ? { label: "🎓 ОБУЧИ МЕНЯ", fn: function () { close(); GAME.guide.begin(); } } : null,
      // her big score, once the bridges are open (heist.js)
      GAME.heist && GAME.heist.offered() && !GAME.heist.busy ? { label: "💰 БОЛЬШОЙ КУШ", fn: function () { answer(bigScore()); } } : null,
      law = { label: w ? "🚨 ПОЛИЦИЯ НА ХВОСТЕ" : "🚨 КАК СБРОСИТЬ РОЗЫСК?", fn: function () { answer(theLaw()); } },
      { label: "💰 ГДЕ ЗАРАБОТАТЬ?", fn: function () { answer(money()); } },
      { label: "📍 ПОКАЖИ МНЕ ДОРОГУ", fn: function () { answer(takeMe()); } },
      { label: "📖 РАССКАЖИ О…", fn: function () { answer(explain()); } },
      { label: "📊 КАК МОИ УСПЕХИ?", fn: function () { answer(howAmI()); } },
      { label: "🎮 НАПОМНИ УПРАВЛЕНИЕ", fn: function () { answer(controlsHelp()); } },
      { label: "👋 НИЧЕГО, СПАСИБО", fn: close }
    ];
    list = list.filter(Boolean);
    // with the law on you, that comes first
    if (w) { list.splice(list.indexOf(law), 1); list.unshift(law); }
    var h = GAME.timeOfDay !== undefined && GAME.timeOfDay < 0.35 ? "Не спится, парень?" : "Привет, парень.";
    return { say: h + (w ? " У тебя там шумно." : '') + " Чем помочь?", list: list, top: true };
  }

  // -- the screen --
  function render() {
    var v = view;
    // (somebody else asking — a stranger on the pavement: strangers.js)
    $('lola-from').textContent = v.from || "📟 ЛОЛА";
    $('lola-say').textContent = v.say;
    // whose face it is: hers, or the stranger asking (cast.js)
    var fc = $('lola-face'), id = v.face || (v.from ? GAME.cast && GAME.cast.idFor(v.from) : 'lola');
    if (fc && fc.getAttribute('data-who') !== String(id)) {
      fc.innerHTML = id && GAME.cast ? GAME.cast.portrait(id) : '';
      fc.setAttribute('data-who', String(id));
    }
    opts = (v.list || []).slice();
    (v.acts || []).forEach(function (a) { opts.push(a); });
    if (!v.top) {
      opts.push({ label: "↩ ДРУГОЙ ВОПРОС", fn: function () { show(topLevel()); }, back: true });
      opts.push({ label: "✓ СПАСИБО, ЛОЛА", fn: close });
    }
    sel = Math.min(sel, opts.length - 1);
    var box = $('lola-opts');
    box.innerHTML = '';
    opts.forEach(function (o, i) {
      var b = document.createElement('div');
      b.className = 'lola-opt' + (i === sel ? ' sel' : '');
      b.textContent = o.label;
      b.addEventListener('click', function (e) { e.preventDefault(); sel = i; pick(); });
      box.appendChild(b);
    });
    var cur = box.children[sel];
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
    $('lola-hint').textContent = touch() ? "Коснись варианта" : "↑↓ и Enter или щелчок  ·  Esc — " + (v.escSays || "назад");
  }
  function show(v) {
    view = v; sel = 0; render();
    // a word or two of it in their voice, as the card comes up
    var id = v.face || (v.from ? GAME.cast && GAME.cast.idFor(v.from) : 'lola');
    if (id && GAME.cast) GAME.cast.say(id, v.say, 1.4);
  }
  function answer(v) { if (GAME.audio) GAME.audio.cashTick(); show(v); }
  // a choice is an answer: whatever it does, closing after it is not a no
  function pick() { var o = opts[sel]; if (o) { onClose = null; o.fn(); } }
  function open() {
    if (GAME.lolaOpen || !GAME.started || GAME.mapOpen || GAME.shopOpen || GAME.shareOpen) return false;
    if (GAME.player.state !== 'alive') return false;
    if (GAME.paused) GAME.togglePause();
    GAME.lolaOpen = true;
    $('lola-screen').style.display = 'flex';
    if (GAME.audio && GAME.audio.pagerBeep) GAME.audio.pagerBeep();
    if (GAME.releasePointer) GAME.releasePointer();
    if (GAME.syncOverlayMusic) GAME.syncOverlayMusic();
    show(topLevel());
    if (GAME.track) GAME.track('lola-called');
    return true;
  }
  // Open on a question of somebody else's (guide.js), rather than her menu.
  // Closing it without an answer — Esc, L, B — is an answer too: onClose.
  var onClose = null;
  function offer(v) {
    if (!open()) return false;
    onClose = v.onClose || null;
    show(v);
    return true;
  }
  function close() {
    if (!GAME.lolaOpen) return;
    var then = onClose;
    onClose = null;
    GAME.lolaOpen = false;
    $('lola-screen').style.display = 'none';
    if (GAME.cast) GAME.cast.hush();
    if (GAME.syncOverlayMusic) GAME.syncOverlayMusic();
    if (GAME.regainPointer) GAME.regainPointer();
    if (then) then();
  }
  function key(code) {
    if (code === 'ArrowDown' || code === 'KeyS') { sel = (sel + 1) % opts.length; render(); }
    else if (code === 'ArrowUp' || code === 'KeyW') { sel = (sel - 1 + opts.length) % opts.length; render(); }
    else if (code === 'Enter' || code === 'Space' || code === 'KeyE') pick();
    else if (code === 'Escape' || code === 'Backspace' || code === 'KeyL') { if (view && !view.top) show(topLevel()); else close(); }
    else if (/^Digit[1-9]$/.test(code)) { var n = +code.slice(5) - 1; if (n < opts.length) { sel = n; pick(); } }
  }

  return {
    first: first,
    setTips: setTips,
    open: open,
    offer: offer,
    close: close,
    key: key,
    get isOpen() { return !!GAME.lolaOpen; },
    // headless: what is on offer, and choosing one by its label
    options: function () { return opts.map(function (o) { return o.label; }); },
    choose: function (re) { for (var i = 0; i < opts.length; i++) if (re.test(opts[i].label)) { sel = i; pick(); return true; } return false; },
    get says() { return view ? view.say : ''; },
    get tips() { return tipsOn(); },
    keys: function () { return Object.keys(TIPS); },
    // headless: what a tip says, as it would be said now
    line: function (key) { var l = TIPS[key]; return typeof l === 'function' ? l() : l; }
  };
})();
