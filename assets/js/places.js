/* Prime Location: tap a place -> viewer with its map / satellite view (+ optional local photos) */
(function () {
  'use strict';
  var modal = document.getElementById('placeModal');
  if (!modal) return;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var box = $('.pv-box', modal), frame = $('iframe', modal), gal = $('.pv-gal', modal);
  var nameEl = $('.pv-name', modal), tagEl = $('.pv-tag', modal), icUse = $('.pv-ic use', modal);
  var openA = $('.pv-open', modal), dirA = $('.pv-dir', modal), views = $$('.pv-views button', modal);
  var current = null, lastFocus = null;

  var ORIGIN = 'Survey No. 332/7, Near Don Bosco High School, Naigaon (E), Tal. Vasai, Dist. Palghar 401208';
  function embed(q, view) {
    if (view === 'r') return 'https://www.google.com/maps?saddr=' + encodeURIComponent(ORIGIN) + '&daddr=' + encodeURIComponent(q) + '&dirflg=d&output=embed';
    return 'https://www.google.com/maps?q=' + encodeURIComponent(q) + '&t=' + (view === 'k' ? 'k' : 'm') + '&z=16&output=embed';
  }
  function setView(v) {
    views.forEach(function (b) { b.classList.toggle('on', b.dataset.view === v); });
    if (current) frame.src = embed(current.q, v);
  }
  function open(btn) {
    var q = btn.dataset.q;
    current = { q: q };
    lastFocus = btn;
    nameEl.innerHTML = btn.dataset.name;
    tagEl.textContent = btn.dataset.tag || '';
    icUse.setAttribute('href', '#i-pin');
    openA.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
    dirA.href = 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(ORIGIN) + '&destination=' + encodeURIComponent(q) + '&travelmode=driving';
    var photos = (btn.dataset.photos || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    gal.innerHTML = '';
    photos.forEach(function (src) {
      var im = new Image(); im.loading = 'lazy'; im.alt = btn.dataset.name.replace(/<[^>]+>/g, ''); im.src = src;
      im.onerror = function () { im.remove(); gal.hidden = !gal.children.length; };
      gal.appendChild(im);
    });
    gal.hidden = !photos.length;
    setView('r');
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { modal.classList.add('open'); });
    setTimeout(function () { var x = $('.pv-x', modal); if (x) x.focus({ preventScroll: true }); }, 60);
  }
  function close() {
    if (modal.hidden) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(function () { modal.hidden = true; frame.src = 'about:blank'; gal.innerHTML = ''; }, 380);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  $$('.place').forEach(function (b) { b.addEventListener('click', function () { open(b); }); });
  var chips = $$('.pl-filter button');
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (x) { x.classList.toggle('on', x === c); });
      $$('.place').forEach(function (p) {
        var show = c.dataset.f === 'all' || p.dataset.cat === c.dataset.f;
        p.hidden = !show; p.classList.remove('in');
        if (show) { void p.offsetWidth; p.classList.add('in'); }
      });
    });
  });
  views.forEach(function (b) { b.addEventListener('click', function () { setView(b.dataset.view); }); });
  $('.pv-x', modal).addEventListener('click', close);
  modal.addEventListener('click', function (e) { if (!box.contains(e.target)) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
})();