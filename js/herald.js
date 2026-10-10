// The papers. After the big moments — a manhunt you slipped, an armoured van
// hit, a getaway stopped by somebody passing, Rico Salazar's last ride — the
// next morning's front page slides in for a few seconds: the masthead, the
// date, the headline, and the scene in newsprint grey (photo.js takes it).
//
// It never stops the game: it hangs at the top of the screen, waits out any
// menu or map, goes when it has been read, and a click sends it away sooner.
// The same kind of story twice reads differently, and a big one comes once.
GAME.herald = (function () {
  var SHOW = 9, COOLDOWN = 150;   // seconds on screen, and between front pages
  var lastT = -1e9, queue = [], showing = null, showT = 0, el = null, printed = [], total = 0;
  var MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
  var DAYS = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];

  // what each kind of story says, by how many times it has run before
  var STORIES = {
    manhunt: [
      function (o) { return { head: "ОБЛАВА ЗАКОНЧИЛАСЬ НИЧЕМ", sub: "Розыск с уровнем " + o.stars + " звёзд по всему городу прекращён. «Он был у нас, а потом исчез», — говорит капитан, пожелавший остаться неизвестным." }; },
      function (o) { return { head: "ПОЛИЦИЯ СНОВА УПУСТИЛА ПОДОЗРЕВАЕМОГО", sub: "Машины, блокпосты, вертолёт — и ни одного ареста. Управление «пересматривает процедуры»." }; },
      function (o) { return { head: "КТО ТАКОЙ ПРИЗРАК КОСТА-РОСЫ?", sub: "Ещё одна погоня с уровнем " + o.stars + " звёзд, ещё одна пустая улица. Неофициально полицейские признаются: не знают ни имени, ни лица." }; }
    ],
    van: [
      function () { return { head: "БРОНЕФУРГОН ОГРАБЛЕН СРЕДЬ БЕЛА ДНЯ", sub: "Выручка исчезла, охранники напуганы, но целы. Охранная фирма «крайне смущена»." }; },
      function () { return { head: "НОВЫЙ ФУРГОН — НОВОЕ ОГРАБЛЕНИЕ", sub: "Охранные фирмы удваивают охрану. Страховщики сомневаются, что этого хватит." }; }
    ],
    hero: [
      function (o) { return o.what === 'thief'
        ? { head: "ПРОХОЖИЙ СОРВАЛ ОГРАБЛЕНИЕ", sub: "Прохожий остановил вора, убегавшего из " + (o.shop || "магазина") + " с выручкой. «Он не раздумывал», — говорит очевидец." }
        : { head: "ПОБЕГ ЗАКОНЧИЛСЯ ГРУДОЙ МЕТАЛЛА", sub: "Во время погони прохожий вытеснил машину беглеца с дороги. Полиция официально благодарит его." }; },
      function (o) { return { head: "ТАИНСТВЕННЫЙ БОРЕЦ С ПРЕСТУПНОСТЬЮ СНОВА В ДЕЛЕ", sub: "Ещё один задержанный, ещё один незнакомец, не назвавший имени. Полиция благодарна. В основном." }; }
    ],
    samaritan: [
      function () { return { head: "НЕЗНАКОМЕЦ, ПОМОГАЮЩИЙ НЕЗНАКОМЦАМ", sub: "Пропущенный рейс, украденный мотоцикл, потерянная собака, свидание. В Коста-Росе многие рассказывают об одном добром человеке. Имени никто не знает." }; }
    ],
    rico: [
      function () { return { head: "ПОСЛЕДНЯЯ ПОЕЗДКА САЛАЗАРА ОБОРВАЛАСЬ В МАРИНЕ", sub: "Рико Салазар, давно считавшийся хозяином порта, погиб во время прилива. Говорят, теперь бульвар принадлежит Лоле Рейес." }; }
    ],
    heist: [
      function (o) { return { head: "СБЕРЕГАТЕЛЬНЫЙ БАНК ОПУСТОШЁН", sub: o.alarm
        ? "Сигнализация звенела, улица была полна полиции, а сейф на бульваре всё равно пуст. «Профессионалы», — говорит детектив с оттенком уважения."
        : "Никто ничего не слышал. Сейф на бульваре вскрыли как консервную банку, а цвет машины для побега свидетели описывают по-разному." }; }
    ]
  };
  var ONCE = { rico: true, samaritan: true, heist: true };

  function prefs() { GAME.prefs = GAME.prefs || {}; return GAME.prefs; }
  function runs(kind) { var h = prefs().herald || {}; return h[kind] || 0; }
  function counted(kind) {
    var p = prefs(); p.herald = p.herald || {};
    p.herald[kind] = (p.herald[kind] || 0) + 1;
    if (GAME.save) GAME.save();
  }
  // the camera's way with the date: today's, in 1986
  function dateline() {
    var now = new Date(), d = new Date(1986, now.getMonth(), now.getDate());
    return DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' 1986';
  }

  function build() {
    el = document.getElementById('herald');
    if (!el) return;
    el.addEventListener('click', function () { if (showing) showT = Math.min(showT, 0.35); });
  }
  function busy() {
    return GAME.paused || GAME.mapOpen || GAME.shopOpen || GAME.shareOpen || GAME.lolaOpen ||
      (GAME.photo && (GAME.photo.albumOpen || GAME.photo.viewing));
  }

  // Run a story. Returns whether it made the paper — a once-only story that
  // already ran, or anything inside the cooldown of the last one, does not
  // (unless it is `big`).
  function front(kind, o) {
    var list = STORIES[kind];
    if (!list) return false;
    var n = runs(kind);
    if (ONCE[kind] && n > 0) return false;
    if (!ONCE[kind] && GAME.time - lastT < COOLDOWN) return false;
    lastT = GAME.time;
    var story = list[Math.min(n, list.length - 1)](o || {});
    counted(kind);
    var page = { kind: kind, head: story.head, sub: story.sub, date: dateline(), photo: null };
    printed.push(page); total++;
    if (printed.length > 3) printed.shift();   // (a photograph each: keep only the last few)
    // the scene, as it is right now
    if (GAME.photo && GAME.photo.grab) GAME.photo.grab(function (c) { page.photo = c; if (showing === page) fill(page); });
    queue.push(page);
    if (GAME.track) GAME.track('front-page');
    return true;
  }

  function fill(page) {
    if (!el) return;
    el.querySelector('.hd-date').textContent = page.date + "  ·  Последний выпуск  ·  25¢";
    el.querySelector('.hd-head').textContent = page.head;
    el.querySelector('.hd-sub').textContent = page.sub;
    var ph = el.querySelector('.hd-photo');
    ph.innerHTML = '';
    if (page.photo) ph.appendChild(page.photo);
    ph.style.display = page.photo ? '' : 'none';
  }
  function update(dt) {
    if (!el) return;
    if (showing) {
      // a menu over it puts it away until the game is back
      if (busy()) { el.classList.remove('on'); return; }
      el.classList.add('on');
      showT -= dt;
      if (showT <= 0) { showing = null; el.classList.remove('on'); }
      return;
    }
    if (!queue.length || busy()) return;
    showing = queue.shift();
    showT = SHOW;
    fill(showing);
    el.classList.add('on');
  }

  return {
    init: build,
    front: front,
    update: update,
    get showing() { return showing; },
    get printed() { return printed; },
    get total() { return total; },   // pages run this session (printed keeps the last few)
    // headless hook: let the next story run whatever ran last
    resetCooldown: function () { lastT = -1e9; }
  };
})();
