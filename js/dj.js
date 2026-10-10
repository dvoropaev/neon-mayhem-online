// The radio's personality. Every station on the dial is somewhere on it, a
// sound and a voice: a frequency, what it plays, a DJ, and a jingle of its
// own when you tune in. Every minute or so the songs dip and the DJ talks,
// or an ad comes on — 1986's finest — in a caption under the station's
// name and a voice that is all pitch and no words, the way the people in
// the story talk (cast.js). It is all on the music's side: MUSIC: OFF, the
// car door and mute take it with the songs.
GAME.dj = (function () {
  var enabled = true;
  // the stations, by the name audio.js gives them
  var ID = {
    "ВОЛНА 84": { freq: "84,3 FM", genre: "НОВАЯ ВОЛНА И СИНТИ-ПОП", dj: "ДЖОННИ ВОЛНА", color: '#38e8ff',
      jingle: [64, 67, 71, 76], wave: 'sawtooth',
      voice: { base: 180, wave: 'square', cps: 40, spread: 9, formant: 1300, q: 1.6 },
      lines: [
        "Это «Волна 84», звук завтрашнего дня уже сегодня. Завтрашний день в основном состоит из лака для волос.",
        "Если в машине нет кассетника, даже не знаю, что сказать. Купи новую. Укради — мне всё равно.",
        "Кто-то позвонил и заявил, что синтезаторы — ненастоящие инструменты. Этот кто-то неправ.",
        "С вами Джонни Волна. Прямой эфир из кабинки без окон, зато с кучей мнений.",
        "Пробка на бульваре растянулась дальше «Неонового прилива». Опять. Может, пешком? Ха! Тут никто не ходит пешком.",
        "Забавный факт: следующий трек целиком записан на домашнем компьютере. Будущее странное, Коста-Роса."
      ] },
    "РИВЬЕРА FM": { freq: "96,1 FM", genre: "ДИСКО, БУГИ И ПОП", dj: "КОКО РИВЬЕРА", color: '#ffe14f',
      jingle: [72, 76, 79, 84, 79], wave: 'triangle',
      voice: { base: 300, wave: 'triangle', cps: 38, spread: 8, formant: 1600, q: 1.7 },
      lines: [
        "«Ривьера FM», дорогие! Крышу вниз, громкость вверх, заботы в бардачок.",
        "Диско не умерло. Оно переехало в Коста-Росу и купило лодку.",
        "С вами Коко. Послание господину в белом костюме: мы вас видим, и нам нравится.",
        "Сегодня жара. Завтра жара. Здесь всегда жара. Поэтому вы тут и живёте.",
        "Танец — это просто прогулка под ритм. Так что танцуй до магазина, дорогой.",
        "Если ты это слышишь, значит, танцуешь недостаточно усердно."
      ] },
    "СУМЕРКИ": { freq: "101,9 FM", genre: "МЕДЛЕННЫЕ МЕЛОДИИ И ПОЗДНИЕ НОЧИ", dj: "БАРХАТНЫЙ ДИ", color: '#c86bff',
      jingle: [57, 64, 67, 72], wave: 'sine',
      voice: { base: 140, wave: 'sine', cps: 26, spread: 5, formant: 900, q: 1.4 },
      lines: [
        "«Сумерки». Сто один и девять. Приглушите свет, голос и ожидания.",
        "Этот трек для тех, кто сегодня едет один. Вы не одни. Я здесь. В вашей приборной панели.",
        "Бархатный Ди с вами, пока не встанет солнце и не испортит всё.",
        "Говорят, любовь — поле боя. В этом городе это скорее автопогоня.",
        "Помедленнее, малыш. Песня медленная. Ночь медленная. Полиция — нет.",
        "Если кто-то разбил сердце, звоните на радио. Если кто-то разбил лобовое стекло, звоните кому-нибудь другому."
      ] },
    "КАССЕТНИК FM": { freq: "88,8 ПИРАТСКАЯ", genre: "ИТАЛО-ДИСКО С ПИРСА", dj: "КАПИТАН КАССЕТА", color: '#7dff6a',
      jingle: [69, 72, 76, 81, 76, 81], wave: 'square',
      voice: { base: 210, wave: 'sawtooth', cps: 44, spread: 11, formant: 1450, q: 1.5 },
      lines: [
        "Капитан Кассета снова в эфире с края пирса! Меня прикрыли, вы нашли мои кассеты. Уважение.",
        "У этого эфира нет лицензии. Этот эфир незаконный. Зато этот эфир ХОРОШИЙ.",
        "Каждая подобранная вами кассета — песня, которую я сделал в гараже. Спасибо, парень.",
        "Если спросит береговая охрана — вы никогда не слышали эту станцию.",
        "Итало-диско — как обычное диско, только ездит быстрее и не пристёгивается."
      ] }
  };
  // the ads, on any station
  var ADS = [
    "Ипподром «Чайка»: каждая лошадь победитель, пока не началась скачка. Ипподром «Чайка» в «Счастливой чайке».",
    "Ваши волосы достаточно объёмные? А чьи-нибудь? Мусс «Америкэн». Для волос, которые входят в комнату раньше вас.",
    "«Стервятник GT». От нуля до ста за «лучше не спрашивай». Гран-Роса Моторс на бульваре.",
    "Мороженое «Солнечные шарики»: сделано на Исла-Верде, заморожено наглухо, совершенно законно. «Солнечные шарики»!",
    "Стали жертвой преступления? Адвокат Стэн Пайк добивается результата. Результат не гарантирован. Стэн не адвокат.",
    "Сберегательный банк Коста-Росы. Ваши деньги в безопасности. Мы совершенно уверены. Пожалуйста, перестаньте спрашивать.",
    "Новый «Карманный телефон» — всего четыре килограмма! Звоните отовсюду, куда сможете донести четыре килограмма.",
    "«НИТКИ» в Сентро-Альто: пастель — не цвет, а образ жизни. Льняные пиджаки за полцены."
  ];
  var talkT = 40, seg = null, caption = null, deal = {};

  function $(id) { return document.getElementById(id); }
  function titleCase(t) { return String(t).toLowerCase().replace(/(^|\s|[-«])[a-zа-яё]/g, function (c) { return c.toUpperCase(); }); }
  function idOf(name) { return ID[name] || null; }
  // where it is on the dial, under its name, as you tune in — and its jingle
  function tuned(name) {
    var id = idOf(name), box = $('radio-popup');
    if (box) {
      box.innerHTML = '';
      box.appendChild(document.createTextNode('♪ ' + name));
      if (id) {
        var sub = document.createElement('div');
        sub.className = 'rsub';
        // (and who is on: a DJ's name in a caption meant nothing to anybody
        // who had not been told it was the radio talking)
        sub.textContent = id.freq + '  ·  ' + id.genre + "  ·  диджей " + titleCase(id.dj);
        sub.style.color = id.color;
        box.appendChild(sub);
      }
    }
    stopTalk();
    talkT = 20 + Math.random() * 25;
    if (enabled && id && GAME.audio && GAME.audio.radio && GAME.audio.radio.jingle) GAME.audio.radio.jingle(id.jingle, id.wave);
  }
  // the next of a list, round it, never the same twice running
  function next(key, list) {
    var i = deal[key] === undefined ? Math.floor(Math.random() * list.length) : (deal[key] + 1) % list.length;
    deal[key] = i;
    return list[i];
  }
  // a minute or so on: the DJ, or an ad
  function segment() {
    var R = GAME.audio && GAME.audio.radio;
    if (!R || !R.audible) return null;
    var id = idOf(R.name);
    if (!id) return null;
    // (an ad is for cruising: never in the middle of a job, a race, a favour
    // or a heist — Gull Downs' horses came on in the middle of a first
    // delivery. The DJ can still say a word; the ads wait.)
    var ad = roaming() && Math.random() < 0.4;
    var text = ad ? next('ads', ADS) : next(R.name, id.lines);
    var who = ad ? "РЕКЛАМА" : id.dj;
    var dur = Math.min(9, 2.5 + text.length * 0.045);
    seg = { text: text, who: who, t: 0, dur: dur, i: 0, voice: ad ? ID["РИВЬЕРА FM"].voice : id.voice, letters: text.replace(/[^A-Za-zА-Яа-яЁё]/g, '') };
    R.duck(0.35, dur);
    var c = $('radio-talk');
    if (c) {
      c.innerHTML = '';
      var w = document.createElement('b');
      // which station, and whether it is its DJ talking or an advert
      w.textContent = '📻 ' + R.name + (ad ? " · РЕКЛАМА: " : " · ДИДЖЕЙ " + titleCase(who) + ': ');
      w.style.color = id.color;
      c.appendChild(w);
      c.appendChild(document.createTextNode(text));
      c.classList.add('on');
    }
    if (GAME.track) GAME.track(ad ? 'radio-ad' : 'radio-dj');
    return seg;
  }
  function roaming() {
    var G = GAME;
    return !((G.missions && G.missions.active) || (G.strangers && G.strangers.busy) || (G.heist && G.heist.busy) ||
      (G.rc && G.rc.running) || (G.robbery && G.robbery.busy) || (G.guide && G.guide.step) || G.player.interior);
  }
  function stopTalk() {
    seg = null;
    var c = $('radio-talk');
    if (c) c.classList.remove('on');
  }
  function update(dt) {
    if (!enabled || !GAME.started) return;
    var P = GAME.player, R = GAME.audio && GAME.audio.radio;
    var on = P.inCar && P.state === 'alive' && R && R.audible;
    if (!on) { if (seg) stopTalk(); return; }
    if (seg) {
      // (a job started half way through an ad: the ad is over)
      if (seg.who === "РЕКЛАМА" && !roaming()) { stopTalk(); R.duck(1, 0.3); return; }
      seg.t += dt;
      var v = seg.voice, want = Math.floor(seg.t * v.cps / 2);
      while (seg.i < want && seg.i * 2 < seg.letters.length) { R.talk(v, seg.letters.charAt(seg.i * 2)); seg.i++; }
      if (seg.t >= seg.dur) { stopTalk(); talkT = 45 + Math.random() * 35; }
      return;
    }
    talkT -= dt;
    if (talkT <= 0) { talkT = 50; segment(); }
  }

  return {
    update: update,
    tuned: tuned,
    segment: segment,
    get talking() { return seg ? { who: seg.who, text: seg.text } : null; },
    identity: idOf,
    roaming: roaming,
    get enabled() { return enabled; },
    set enabled(v) { enabled = !!v; if (!enabled) stopTalk(); },
    ADS: ADS
  };
})();
