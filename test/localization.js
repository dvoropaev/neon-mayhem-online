// Russian UI, Cyrillic dialogue/voice, and save compatibility.
// CHROMIUM_PATH=/usr/bin/chromium node test/localization.js
var assert = require('assert/strict');
var fs = require('fs');
var http = require('http');
var path = require('path');
var chromium = require('playwright').chromium;
var root = path.resolve(__dirname, '..');
var mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };
var server = http.createServer(function (req, res) {
  var file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (file === root) file = path.join(root, 'index.html');
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, function (err, bytes) {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(bytes);
  });
});
(async function () {
  var browser;
  try {
    await new Promise(function (resolve) { server.listen(0, '127.0.0.1', resolve); });
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--enable-unsafe-swiftshader'] });
    var page = await browser.newPage({ viewport: { width: 1280, height: 720 }, locale: 'en-US' });
    var errors = [];
    page.on('pageerror', function (e) { errors.push(e.message); });
    await page.addInitScript(function () {
      Element.prototype.requestPointerLock = function () { return Promise.resolve(); };
    });
    await page.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(function () { return window.GAME && GAME.test && GAME.city.nodes.length; }, null, { timeout: 60000 });
    assert.equal(await page.getAttribute('html', 'lang'), 'ru');
    assert.equal(await page.title(), 'НЕОНОВЫЙ ХАОС');
    assert.match(await page.locator('#press-enter').innerText(), /НАЖМИ ENTER/);
    var titleBounds = await page.locator('#title-logo').boundingBox();
    assert.ok(titleBounds.x >= 0 && titleBounds.x + titleBounds.width <= 1280, 'title fits desktop');
    if (process.env.LOCALIZATION_SHOTS) await page.screenshot({ path: path.join(process.env.LOCALIZATION_SHOTS, 'title-ru.png') });
    await page.evaluate(function () { GAME.test.start(); GAME.guide.offer(); });
    assert.match(await page.locator('#lola-say').innerText(), /Добро пожаловать в Коста-Росу/);
    assert.match((await page.locator('#lola-opts').innerText()), /ПОКАЖИ МНЕ ГОРОД/);
    await page.evaluate(function () { GAME.lola.choose(/РАЗБЕРУСЬ САМ/); GAME.prefs.guide = 'done'; });
    var data = await page.evaluate(function () {
      return {
        identities: GAME.cast.ids().every(function (id) { return GAME.cast.idFor('📟 ' + GAME.cast.name(id)) === id; }),
        missions: GAME.missions.DEFS.every(function (d) { return /[А-ЯЁ]/.test(d.name); }),
        vehicles: Object.keys(GAME.vehicles.TYPES).every(function (k) { return /[А-Яа-яЁё]/.test(GAME.vehicles.TYPES[k].label); }),
        radio: GAME.audio.radio.stations.every(function (s) { return !!GAME.dj.identity(s.name); }),
        tips: GAME.lola.keys().every(function (k) { return /[А-Яа-яЁё]/.test(GAME.lola.line(k)); }),
        goods: GAME.shops.locations().every(function (l) { return GAME.shops.items(l).every(function (i) { return /[А-Яа-яЁё]/.test(i.name); }); }),
        plural: [0, 1, 2, 5, 11, 14, 21, 24, 111].map(function (n) { return U.ruPlural(n, ['поездка', 'поездки', 'поездок']); })
      };
    });
    for (var key of ['identities', 'missions', 'vehicles', 'radio', 'tips', 'goods']) assert.equal(data[key], true, key);
    assert.deepEqual(data.plural, ['поездок', 'поездка', 'поездки', 'поездок', 'поездок', 'поездок', 'поездка', 'поездки', 'поездок']);
    console.log('PASS Russian title, tutorial, names, shops, tips and counts');
    await page.evaluate(function () { GAME.togglePause(true); });
    assert.match(await page.locator('#pause-gfx').innerText(), /ГРАФИКА: ВЫСОКАЯ/);
    await page.locator('#pause-gfx').click();
    assert.match(await page.locator('#pause-gfx').innerText(), /ГРАФИКА: СРЕДНЯЯ/);
    await page.locator('#pause-weather').click();
    assert.match(await page.locator('#pause-weather').innerText(), /ПОГОДА: ЯСНО/);
    if (process.env.LOCALIZATION_SHOTS) await page.screenshot({ path: path.join(process.env.LOCALIZATION_SHOTS, 'pause-ru.png') });
    await page.evaluate(function () { GAME.togglePause(false); GAME.hud.toggleMap(true); });
    assert.match(await page.locator('#map-legend').innerText(), /Гонка.*Доставка.*Погром/s);
    if (process.env.LOCALIZATION_SHOTS) await page.screenshot({ path: path.join(process.env.LOCALIZATION_SHOTS, 'map-ru.png') });
    await page.evaluate(function () { GAME.hud.toggleMap(false); });
    // An English browser locale must not break Russian actor lookup or sounds.
    await page.evaluate(function () {
      window.__ruBlips = [];
      GAME.audio.babble = function (voice, letter) { window.__ruBlips.push(letter); };
      GAME.scenes.play([['lola', 'Ёжик, привет! Проверяем русскую речь.'], ['you', 'Всё работает.']]);
      for (var i = 0; i < 60; i++) GAME.scenes.update(1 / 60);
    });
    assert.match(await page.locator('#scene-name').innerText(), /ЛОЛА/);
    assert.ok(await page.evaluate(function () { return window.__ruBlips.some(function (ch) { return /[А-Яа-яЁё]/.test(ch); }); }), 'Cyrillic triggers scene speech');
    await page.evaluate(function () { GAME.scenes.skip(); window.__ruBlips = []; GAME.cast.say('lola', 'Ёжик привет', 1); });
    await page.waitForFunction(function () { return window.__ruBlips.length > 0; });
    assert.ok(await page.evaluate(function () { return /^[А-Яа-яЁё]+$/.test(window.__ruBlips.join('')); }), 'Cyrillic triggers pager speech');
    await page.evaluate(function () { GAME.cast.hush(); });
    var save = await page.evaluate(function () {
      GAME.player.cash = 12345;
      var exported = GAME.exportSave(), data = JSON.parse(exported);
      return { tag: data.game, imported: GAME.importSave(exported).ok, cash: JSON.parse(localStorage.getItem('neonMayhemSave')).cash, error: GAME.importSave('{}').why };
    });
    assert.equal(save.tag, 'neon-mayhem');
    assert.equal(save.imported, true);
    assert.equal(save.cash, 12345);
    assert.match(save.error, /не является сохранением/);
    console.log('PASS dynamic settings, map, Cyrillic portraits/speech and save roundtrip');
    // Responsive checks share the world; mobile gets its own input detection.
    await page.setViewportSize({ width: 360, height: 800 });
    await page.evaluate(function () { GAME.started = false; document.getElementById('title-screen').style.display = 'flex'; });
    titleBounds = await page.locator('#title-logo').boundingBox();
    assert.ok(titleBounds.x >= 0 && titleBounds.x + titleBounds.width <= 360, 'title fits narrow screen');
    await page.close();
    var phone = await browser.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
    phone.on('pageerror', function (e) { errors.push(e.message); });
    await phone.goto('http://127.0.0.1:' + server.address().port + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await phone.waitForFunction(function () { return window.GAME && GAME.test && GAME.city.nodes.length; }, null, { timeout: 60000 });
    assert.match(await phone.locator('#press-enter').innerText(), /КОСНИСЬ ДЛЯ НАЧАЛА/);
    await phone.evaluate(function () { GAME.prefs.guide = 'done'; GAME.test.start(); });
    assert.match(await phone.locator('#touch-layer').innerText(), /ОГОНЬ/);
    assert.match(await phone.locator('#touch-layer').innerText(), /СЕСТЬ/);
    await phone.evaluate(function () { GAME.togglePause(true); });
    if (process.env.LOCALIZATION_SHOTS) await phone.screenshot({ path: path.join(process.env.LOCALIZATION_SHOTS, 'phone-pause-ru.png') });
    assert.deepEqual(errors, []);
    console.log('PASS mobile labels, responsive title and no browser errors');
    console.log('LOCALIZATION: all checks passed');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(function (error) { console.error(error); process.exitCode = 1; });
