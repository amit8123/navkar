(function () {
  'use strict';
  var doc = document.documentElement, body = document.body;
  doc.classList.add('js');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = false /* animations on every device */;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ---------- split text into masked words ---------- */
  function mkWord(i) {
    var w = document.createElement('span'), wi = document.createElement('span');
    w.className = 'w'; wi.className = 'wi'; wi.style.setProperty('--i', i); w.appendChild(wi);
    return { w: w, wi: wi };
  }
  function splitWords(el, cls) {
    var i = 0;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(' ')); return; }
            if (cls) { var s = document.createElement('span'); s.className = cls; s.textContent = p; frag.appendChild(s); }
            else { var k = mkWord(i++); k.wi.textContent = p; frag.appendChild(k.w); }
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') {
          if (cls) walk(n);
          else { var k2 = mkWord(i++); node.replaceChild(k2.w, n); k2.wi.appendChild(n); }
        }
      });
    })(el);
  }
  $$('[data-split]').forEach(function (el) { splitWords(el); });
  $$('.scrub').forEach(function (el) { splitWords(el, 'sw'); });
  $$('.sl-h').forEach(function (el) { splitWords(el); });

  /* ---------- preloader ---------- */
  var loaded = false, queue = [];
  var pre = $('#pre'), preBar = $('#pre i');
  var t0 = performance.now(), MIN = reduce ? 0 : 1700, winLoaded = document.readyState === 'complete';
  window.addEventListener('load', function () { winLoaded = true; });
  (function tick() {
    var p = Math.min((performance.now() - t0) / MIN, 1);
    if (preBar) preBar.style.transform = 'scaleX(' + (winLoaded ? p : Math.min(p, .85)) + ')';
    if (p >= 1 && winLoaded || performance.now() - t0 > 4500) return done();
    requestAnimationFrame(tick);
  })();
  function done() {
    if (loaded) return;
    loaded = true; body.classList.add('loaded');
    if (pre) { pre.classList.add('done'); setTimeout(function () { pre.remove(); }, 1400); }
    queue.forEach(function (f) { f(); }); queue = [];
  }
  function whenLoaded(f) { loaded ? f() : queue.push(f); }

  /* ---------- reveal on scroll ---------- */
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target; io.unobserve(el);
      whenLoaded(function () {
        el.classList.add('in');
        $$('[data-count]', el).concat(el.hasAttribute('data-count') ? [el] : []).forEach(count);
        setTimeout(function () { el.classList.add('done'); }, 1500);
      });
    });
  }, { threshold: .15, rootMargin: '0px 0px -6% 0px' });
  $$('.rv,[data-split],.am,.donut,.ft-word').forEach(function (el) { io.observe(el); });

  function count(el) {
    if (el._c) return; el._c = 1;
    var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    var pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', st = null;
    (function step(t) {
      st = st || t;
      var p = Math.max(0, Math.min((t - st) / 1900, 1)), v = end * (1 - Math.pow(1 - p, 4));
      el.textContent = pre + v.toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(step);
    })(0);
  }

  /* ---------- svg icon stroke-draw ---------- */
  $$('.am svg *').forEach(function (n) { n.setAttribute('pathLength', '1'); });

  /* ---------- mobile menu ---------- */
  var burger = $('.burger'), menu = $('.menu');
  burger.addEventListener('click', function () { burger.classList.toggle('open'); menu.classList.toggle('open'); });
  $$('.menu a').forEach(function (a) {
    a.addEventListener('click', function () { burger.classList.remove('open'); menu.classList.remove('open'); });
  });

  /* ---------- section dots + active link ---------- */
  var dotsBox = $('.dots'), secs = $$('section[id]');
  var links = $$('.menu a[href^="#"]');
  secs.forEach(function (s) {
    var a = document.createElement('a');
    a.href = '#' + s.id; a.dataset.l = s.dataset.dot || s.id; a.setAttribute('aria-label', a.dataset.l);
    dotsBox.appendChild(a);
  });
  var dotEls = $$('a', dotsBox);
  var spy = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      var id = e.target.id;
      links.forEach(function (l) { l.classList.toggle('active', l.getAttribute('href') === '#' + id); });
      dotEls.forEach(function (d) { d.classList.toggle('on', d.getAttribute('href') === '#' + id); });
      dotsBox.classList.toggle('light', e.target.classList.contains('amen') || e.target.classList.contains('cta'));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(function (s) { spy.observe(s); });

  /* ---------- scroll loop: progress, header, scrub, parallax ---------- */
  var header = $('header'), prog = $('.progress i'), toTop = $('.top');
  var scrubs = $$('.scrub'), pars = $$('[data-par]');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY, h = doc.scrollHeight - innerHeight;
    prog.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    header.classList.toggle('scrolled', y > 40);
    toTop.classList.toggle('show', y > 700);
    scrubs.forEach(function (el) {
      var r = el.getBoundingClientRect();
      var p = (innerHeight * .85 - r.top) / (innerHeight * .45 + r.height * .6);
      var words = el.querySelectorAll('.sw'), n = words.length;
      for (var i = 0; i < n; i++) words[i].classList.toggle('lit', p > i / n);
    });
    if (!reduce) pars.forEach(function (el) {
      var r = el.parentNode.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      var c = (r.top + r.height / 2 - innerHeight / 2) * (parseFloat(el.dataset.par) || .1), lim = r.height * .09; c = Math.max(-lim, Math.min(lim, c));
      el.style.translate = '0 ' + (-c).toFixed(1) + 'px';
    });
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  /* ---------- hero slider ---------- */
  var hero = $('.hero');
  var slides = $$('.sl'), N = slides.length, cur = -1, DUR = 6800, el = 0, hold = false, hvis = true;
  var barsW = $('.sl-bars'), lbl = $('.sl-lbl'), cnt = $('.sl-cnt');
  var pad2 = function (v) { return (v < 10 ? '0' : '') + v; };
  slides.forEach(function (s, k) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'sl-bar'; b.setAttribute('aria-label', 'Go to slide ' + (k + 1));
    b.appendChild(document.createElement('i')); b.addEventListener('click', function () { go(k); });
    barsW.appendChild(b);
  });
  var bars = $$('.sl-bar i');
  function go(i) {
    i = (i + N) % N; if (i === cur) return;
    var prev = cur; cur = i; el = 0;
    slides.forEach(function (s, k) { s.classList.toggle('on', k === i); s.classList.toggle('out', k === prev); s.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
    bars.forEach(function (b, k) { b.style.transform = 'scaleX(' + (k < i ? 1 : 0) + ')'; });
    cnt.innerHTML = '<b>' + pad2(i + 1) + '</b> / ' + pad2(N);
    if (lbl) lbl.textContent = '';
  }
  $('.sl-prev').addEventListener('click', function () { go(cur - 1); });
  $('.sl-next').addEventListener('click', function () { go(cur + 1); });
  document.addEventListener('keydown', function (e) {
    if (!hvis || (lb && lb.classList.contains('open'))) return;
    if (e.key === 'ArrowLeft') go(cur - 1); else if (e.key === 'ArrowRight') go(cur + 1);
  });
  var tx = 0, ty = 0;
  hero.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; hold = true; }, { passive: true });
  hero.addEventListener('touchend', function (e) {
    var dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; hold = false;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) go(cur + (dx < 0 ? 1 : -1));
  });
  if (fine) {
    hero.addEventListener('mouseenter', function () { hold = true; });
    hero.addEventListener('mouseleave', function () { hold = false; });
  }
  new IntersectionObserver(function (es) { hvis = es[0].isIntersecting; }, { threshold: .25 }).observe(hero);
  var mx = 0, my = 0, cx = 0, cy = 0;
  if (fine && !reduce) hero.addEventListener('mousemove', function (e) { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });
  whenLoaded(function () {
    go(0);
    var last = performance.now();
    (function tick(t) {
      var dt = t - last; last = t; if (dt < 0 || dt > 200) dt = 16;
      if (!hold && hvis && !document.hidden && !reduce) { el += dt; if (el >= DUR) go(cur + 1); }
      bars[cur].style.transform = 'scaleX(' + Math.min(el / DUR, 1).toFixed(3) + ')';
      if (hvis && !reduce) {
        cx = lerp(cx, mx, .06); cy = lerp(cy, my, .06);
        hero.style.setProperty('--cx', cx.toFixed(3)); hero.style.setProperty('--cy', cy.toFixed(3));
        hero.style.setProperty('--sy', Math.min(window.scrollY, innerHeight).toFixed(0));
      }
      requestAnimationFrame(tick);
    })(last);
  });
  /* ---------- 3D tilt + glare + spotlight (mouse AND touch) ---------- */
  if (!reduce) {
    $$('[data-tilt]').forEach(function (el) {
      var max = parseFloat(el.dataset.tilt) || 8, g = document.createElement('i');
      g.className = 'glare'; el.appendChild(g);
      function move(cx, cy) {
        var r = el.getBoundingClientRect(), x = (cx - r.left) / r.width, y = (cy - r.top) / r.height;
        el.style.transform = 'perspective(900px) rotateX(' + ((.5 - y) * max).toFixed(2) + 'deg) rotateY(' + ((x - .5) * max).toFixed(2) + 'deg) translateZ(0) scale(1.02)';
        el.style.setProperty('--gx', (x * 100) + '%'); el.style.setProperty('--gy', (y * 100) + '%');
        el.style.setProperty('--mx', (cx - r.left) + 'px'); el.style.setProperty('--my', (cy - r.top) + 'px');
      }
      function reset() { el.style.transform = ''; el.classList.toggle('touching', false); }
      el.addEventListener('mousemove', function (e) { move(e.clientX, e.clientY); });
      el.addEventListener('mouseleave', reset);
      el.addEventListener('touchstart', function (e) { el.classList.add('touching'); move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
      el.addEventListener('touchmove', function (e) { move(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
      el.addEventListener('touchend', function () { setTimeout(reset, 380); });
      el.addEventListener('touchcancel', reset);
    });
    if (fine) {
      /* magnetic buttons (mouse only) */
      $$('.btn,.dock a').forEach(function (b) {
        b.addEventListener('mousemove', function (e) {
          var r = b.getBoundingClientRect();
          b.style.translate = ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * .35).toFixed(1) + 'px';
        });
        b.addEventListener('mouseleave', function () { b.style.translate = ''; });
      });
    } else {
      /* touch equivalent of the custom cursor: a ripple ring where you tap */
      document.addEventListener('touchstart', function (e) {
        var t = e.touches[0], s = document.createElement('span');
        s.className = 'tap'; s.style.left = t.clientX + 'px'; s.style.top = t.clientY + 'px';
        body.appendChild(s); setTimeout(function () { body.removeChild(s); }, 720);
      }, { passive: true });
    }
  }
  /* click ripple */
  $$('.btn').forEach(function (b) {
    b.addEventListener('click', function (e) {
      var r = b.getBoundingClientRect(), s = document.createElement('span');
      s.className = 'rip'; s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px';
      b.appendChild(s); setTimeout(function () { s.remove(); }, 800);
    });
  });

  /* ---------- custom cursor ---------- */
  if (false) { /* custom cursor disabled: normal mouse pointer */
    var dot = $('.cur-dot'), ring = $('.cur-ring'), px = -100, py = -100, rx = -100, ry = -100;
    body.classList.add('has-cur');
    window.addEventListener('mousemove', function (e) { px = e.clientX; py = e.clientY; });
    document.addEventListener('mouseleave', function () { ring.style.opacity = dot.style.opacity = 0; });
    document.addEventListener('mouseenter', function () { ring.style.opacity = dot.style.opacity = 1; });
    document.addEventListener('mouseover', function (e) {
      var h = e.target.closest && e.target.closest('a,button,[data-zoom],select,.tab,input,textarea');
      ring.classList.toggle('hov', !!h);
      ring.classList.toggle('zoom', !!(e.target.closest && e.target.closest('[data-zoom]')));
    });
    (function loop() {
      rx = lerp(rx, px, .16); ry = lerp(ry, py, .16);
      dot.style.transform = 'translate(' + px + 'px,' + py + 'px)';
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- floor plan tabs with sliding pill ---------- */
  var tabs = $$('.tab'), ind = $('.tab-ind');
  function moveInd() {
    var on = $('.tab.on'); if (!on || !ind) return;
    ind.style.width = on.offsetWidth + 'px'; ind.style.height = on.offsetHeight + 'px';
    ind.style.transform = 'translate(' + on.offsetLeft + 'px,' + on.offsetTop + 'px)';
  }
  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      tabs.forEach(function (x) { x.classList.toggle('on', x === t); });
      $$('.panel').forEach(function (p) { p.classList.toggle('on', p.id === t.dataset.t); });
      moveInd();
    });
  });
  window.addEventListener('resize', moveInd); window.addEventListener('load', moveInd); moveInd();

  /* ---------- lightbox with prev / next / swipe ---------- */
  var lb = document.createElement('div');
  lb.className = 'lb';
  lb.innerHTML = '<button class="lb-x" aria-label="Close">&times;</button><button class="lb-p" aria-label="Previous">&#8592;</button><button class="lb-n" aria-label="Next">&#8594;</button><img alt=""><span class="lb-c"></span>';
  body.appendChild(lb);
  var lbImg = $('img', lb), lbC = $('.lb-c', lb), group = [], gi = 0;
  function show(i) {
    gi = (i + group.length) % group.length;
    lbImg.classList.remove('in'); lbImg.src = group[gi].dataset.zoom;
    lbImg.onload = function () { lbImg.classList.add('in'); };
    lbC.textContent = (gi + 1) + ' / ' + group.length;
    lb.classList.toggle('single', group.length < 2);
  }
  $$('[data-zoom]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      var g = a.dataset.group; group = g ? $$('[data-group="' + g + '"]') : [a];
      lb.classList.add('open'); body.style.overflow = 'hidden'; show(group.indexOf(a));
    });
  });
  function close() { lb.classList.remove('open'); body.style.overflow = ''; }
  lb.addEventListener('click', function (e) {
    if (e.target.closest('.lb-p')) show(gi - 1);
    else if (e.target.closest('.lb-n')) show(gi + 1);
    else if (e.target !== lbImg) close();
  });
  document.addEventListener('keydown', function (e) {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(gi - 1); if (e.key === 'ArrowRight') show(gi + 1);
  });
  var sx = 0;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    var d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 50) show(gi + (d < 0 ? 1 : -1));
  });

  /* ---------- footer: dusk skyline ---------- */
  var sky = $('#sky');
  if (sky) {
    var seed = 11, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    var W = 1440, H = 250, out = '', i, x, w, h, c, r, cols, rows, lit;
    for (i = 0; i < 80; i++) out += '<circle class="st" cx="' + (rnd() * W).toFixed(0) + '" cy="' + (rnd() * 130).toFixed(0) + '" r="' + (.5 + rnd() * 1.1).toFixed(2) + '" style="animation-delay:' + (rnd() * 4).toFixed(2) + 's"/>';
    out += '<circle class="moon" cx="1130" cy="78" r="24"/><circle cx="1140" cy="72" r="21" fill="#1a2650" opacity=".55"/>';
    function layer(cls, minH, maxH, minW, maxW, litP, gap) {
      x = -20;
      while (x < W + 20) {
        w = minW + rnd() * (maxW - minW); h = minH + rnd() * (maxH - minH);
        out += '<rect class="' + cls + '" x="' + x.toFixed(0) + '" y="' + (H - h).toFixed(0) + '" width="' + w.toFixed(0) + '" height="' + (h + 2).toFixed(0) + '"/>';
        if (rnd() > .55) out += '<rect class="' + cls + '" x="' + (x + w / 2 - 1).toFixed(0) + '" y="' + (H - h - 16).toFixed(0) + '" width="2" height="16"/>';
        cols = Math.floor((w - 8) / 11); rows = Math.floor((h - 10) / 15);
        for (r = 0; r < rows; r++) for (c = 0; c < cols; c++) {
          if (rnd() < litP) out += '<rect class="wn' + (rnd() > .78 ? ' b' : '') + '" x="' + (x + 6 + c * 11).toFixed(0) + '" y="' + (H - h + 8 + r * 15).toFixed(0) + '" width="5" height="7" rx="1" style="animation-delay:' + (rnd() * 6).toFixed(2) + 's;animation-duration:' + (4 + rnd() * 5).toFixed(1) + 's"/>';
        }
        x += w + gap;
      }
    }
    layer('back', 60, 150, 36, 70, .06, 4);
    layer('front', 40, 195, 46, 92, .3, 8);
    sky.innerHTML = out;
  }

  /* ---------- footer: wordmark spotlight, copy RERA, back to top ---------- */
  var word = $('.ft-word');
  if (word) {
    var wm = function (cx, cy) { var r = word.getBoundingClientRect(); word.style.setProperty('--mx', (cx - r.left) + 'px'); word.style.setProperty('--my', (cy - r.top) + 'px'); };
    word.addEventListener('mousemove', function (e) { wm(e.clientX, e.clientY); });
    word.addEventListener('touchstart', function (e) { wm(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    word.addEventListener('touchmove', function (e) { wm(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    word.addEventListener('mouseleave', function () { word.style.setProperty('--mx', '50%'); word.style.setProperty('--my', '50%'); });
  }
  var toast = $('.toast'), tt;
  function say(m) { toast.textContent = m; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('show'); }, 2200); }
  $$('.ft-pill').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.dataset.copy, fin = function () { b.classList.add('ok'); say('Copied ' + v); setTimeout(function () { b.classList.remove('ok'); }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(fin, fin); else fin();
    });
  });
  $$('[data-top]').forEach(function (b) { b.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); }); });

  /* ---------- instagram reels ---------- */
  var rsec = $('#reels');
  if (rsec) {
    var ig = rsec.dataset.ig || 'https://www.instagram.com/';
    $$('[data-ig-link]').forEach(function (a) { a.href = ig; });
    var track = $('.rl-track'), first = $('.rl-card'), down = false, sx0 = 0, sl0 = 0, moved = false;
    var prog = $('.rl-prog'), thumb = prog ? $('i', prog) : null, btnP = $('.rl-prev'), btnN = $('.rl-next');
    var stepW = function () { return (first ? first.offsetWidth : 262) + 18; };
    var maxL = function () { return Math.max(0, track.scrollWidth - track.clientWidth); };
    var raf = 0, lastUser = 0, hoverHold = false, vis = false;
    var touchUser = function () { lastUser = Date.now(); };

    /* eased glide (cubic in-out) */
    function glide(to, dur) {
      cancelAnimationFrame(raf); to = Math.max(0, Math.min(maxL(), to));
      var from = track.scrollLeft, t0 = performance.now(); dur = dur || 850;
      if (Math.abs(to - from) < 2) { track.classList.remove('gliding'); return; }
      track.classList.add('gliding');
      (function f(t) {
        var p = Math.min((t - t0) / dur, 1), e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
        track.scrollLeft = from + (to - from) * e;
        if (p < 1) raf = requestAnimationFrame(f); else track.classList.remove('gliding');
      })(t0);
    }
    var snapNearest = function () { glide(Math.round(track.scrollLeft / stepW()) * stepW(), 520); };

    /* progress bar + arrow state */
    function sync() {
      var sw = track.scrollWidth, cw = track.clientWidth, l = track.scrollLeft, m = maxL();
      if (thumb) { thumb.style.width = Math.max(cw / sw * 100, 12) + '%'; thumb.style.left = (m ? l / m * (100 - Math.max(cw / sw * 100, 12)) : 0) + '%'; }
      if (btnP) btnP.classList.toggle('dis', l < 4); if (btnN) btnN.classList.toggle('dis', l > m - 4);
    }
    track.addEventListener('scroll', sync, { passive: true }); window.addEventListener('resize', sync); sync();
    if (prog) prog.addEventListener('click', function (e) { touchUser(); var r = prog.getBoundingClientRect(); glide((e.clientX - r.left) / r.width * maxL(), 900); });

    var cardTo = function (dir) { return Math.round((track.scrollLeft + dir * stepW() * 1.5) / stepW()) * stepW(); };
    if (btnP) btnP.addEventListener('click', function () { touchUser(); glide(Math.min(cardTo(-1), Math.round(track.scrollLeft / stepW()) * stepW() - stepW()), 800); });
    if (btnN) btnN.addEventListener('click', function () { touchUser(); glide(Math.max(cardTo(1), Math.round(track.scrollLeft / stepW()) * stepW() + stepW()), 800); });

    /* mouse drag with momentum */
    var vx = 0, lastX = 0, lastT = 0;
    track.addEventListener('mousedown', function (e) { cancelAnimationFrame(raf); track.classList.remove('gliding'); down = true; moved = false; sx0 = e.pageX; sl0 = track.scrollLeft; lastX = e.pageX; lastT = performance.now(); vx = 0; touchUser(); });
    window.addEventListener('mousemove', function (e) {
      if (!down) return; var d = e.pageX - sx0, now = performance.now();
      if (Math.abs(d) > 6) { moved = true; track.classList.add('drag'); }
      if (moved) { track.scrollLeft = sl0 - d; var dt = Math.max(now - lastT, 1); vx = .8 * vx + .2 * ((lastX - e.pageX) / dt * 16); lastX = e.pageX; lastT = now; }
    });
    window.addEventListener('mouseup', function () {
      if (!down) return; down = false; track.classList.toggle('drag', false); touchUser();
      if (!moved) return;
      (function coast() {
        if (Math.abs(vx) < .35) { track.classList.remove('gliding'); snapNearest(); return; }
        track.classList.add('gliding'); track.scrollLeft += vx; vx *= .94;
        if (track.scrollLeft <= 0 || track.scrollLeft >= maxL()) { vx = 0; }
        raf = requestAnimationFrame(coast);
      })();
    });
    track.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

    /* touch: native momentum, just pause the auto-glide */
    track.addEventListener('touchstart', function () { cancelAnimationFrame(raf); touchUser(); }, { passive: true });
    track.addEventListener('touchend', touchUser, { passive: true });
    track.addEventListener('wheel', function (e) { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) touchUser(); }, { passive: true });
    track.addEventListener('mouseenter', function () { hoverHold = true; }); track.addEventListener('mouseleave', function () { hoverHold = false; touchUser(); });
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }, { threshold: .3 }).observe(track);

    /* gentle auto-glide: one card every few seconds while idle & visible */
    setInterval(function () {
      if (reduce || !vis || hoverHold || down || document.hidden || Date.now() - lastUser < 4500) return;
      if (rm && rm.classList.contains('open')) return;
      if (track.scrollLeft >= maxL() - 4) glide(0, 1300); else glide(Math.round(track.scrollLeft / stepW()) * stepW() + stepW(), 900);
    }, 3600);

    /* inline reel videos: autoplay (muted) while on screen */
    $$('.rl-vid video').forEach(function (v) {
      var card = v.parentNode;
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && !reduce) { var p = v.play(); if (p && p.catch) p.catch(function () { }); card.classList.add('playing'); }
        else { v.pause(); card.classList.toggle('playing', false); }
      }, { threshold: .5 }).observe(card);
    });

    var rm = document.createElement('div'); rm.className = 'rl-modal';
    rm.innerHTML = '<button class="rl-x" aria-label="Close">&times;</button><div class="rl-frame"></div>';
    body.appendChild(rm);
    var frame = $('.rl-frame', rm);
    function openReel(card) {
      var v = card.dataset.video, r = card.dataset.reel, m;
      if (v) frame.innerHTML = '<video src="' + v + '" poster="' + ((card.querySelector('video') || document.createElement('video')).getAttribute('poster') || '') + '" controls autoplay playsinline loop></video>';
      else if (r && (m = r.match(/instagram\.com\/(?:reels?|p)\/([A-Za-z0-9_-]+)/))) frame.innerHTML = '<iframe src="https://www.instagram.com/reel/' + m[1] + '/embed" allow="autoplay; encrypted-media; fullscreen" allowfullscreen title="Instagram reel"></iframe>';
      else return false;
      rm.classList.add('open'); body.style.overflow = 'hidden'; return true;
    }
    function closeReel() { rm.classList.toggle('open', false); frame.innerHTML = ''; body.style.overflow = ''; }
    $$('.rl-card').forEach(function (c) { c.addEventListener('click', function (e) { if ((c.dataset.video || c.dataset.reel) && openReel(c)) e.preventDefault(); }); });
    rm.addEventListener('click', function (e) { if (!e.target.closest('.rl-frame')) closeReel(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && rm.classList.contains('open')) closeReel(); });
  }


  /* ---------- lead popup (gates the brochure) ---------- */
  var BROCHURE = 'assets/brochure/NB-Brochure-c.pdf', KEY = 'navkar_lead_v1', SKEY = 'navkar_lead_closed';
  var store = {
    get: function (k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
    set: function (k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) { } }
  };
  var lm = $('#leadModal');
  if (lm) {
    var lbox = $('.lm-box', lm), lform = $('.lm-form', lm), lerr = $('.lm-err', lm), pending = false, lopen = false;
    var goDownload = function () {
      var a = document.createElement('a');
      a.href = BROCHURE; a.download = 'Navkar-City-Brochure.pdf'; a.rel = 'noopener';
      body.appendChild(a); a.click(); body.removeChild(a);
    };
    var openLead = function () {
      if (lopen) return; lopen = true; lm.classList.add('open'); body.style.overflow = 'hidden';
      setTimeout(function () { var n = lform.elements.name; if (n && fine) n.focus(); }, 650);
    };
    var closeLead = function () {
      lopen = false; lm.classList.toggle('open', false); body.style.overflow = ''; store.set(SKEY, '1', true);
    };
    var filled = function () { return store.get(KEY) === '1'; };
    var showDone = function () { lbox.classList.add('sent'); $('.lm-done .again', lm).onclick = function (e) { e.preventDefault(); goDownload(); }; };
    /* every brochure button asks for details first (once) */
    $$('[data-brochure]').forEach(function (b) {
      b.setAttribute('href', '#brochure');
      b.addEventListener('click', function (e) {
        e.preventDefault();
        if (filled()) { goDownload(); say('Your brochure is downloading'); return; }
        pending = true; lbox.classList.remove('sent'); openLead();
      });
    });
    $('.lm-x', lm).addEventListener('click', closeLead);
    lm.addEventListener('click', function (e) { if (e.target === lm) closeLead(); });
    $$('[data-lm-close]', lm).forEach(function (b) { b.addEventListener('click', closeLead); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && lopen) closeLead(); });
    var bad = function (el, msg) {
      el.classList.add('bad'); lerr.textContent = msg; el.focus();
      lform.classList.add('shake'); setTimeout(function () { lform.classList.remove('shake'); }, 550);
    };
    $$('input', lform).forEach(function (i) { i.addEventListener('input', function () { i.classList.remove('bad'); lerr.textContent = ''; }); });
    $$('input[name=consent]', lform).forEach(function (c) { c.addEventListener('change', function () { var l = c.closest('.lm-consent'); if (l) l.classList.remove('bad'); lerr.textContent = ''; }); });
    lform.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = lform.elements, name = f.name.value.trim(), phone = f.phone.value.trim(), email = f.email.value.trim();
      if (!/^[A-Za-zÀ-ɏ .'-]{2,80}$/.test(name)) return bad(f.name, 'Please enter your full name.');
      if (!/^[0-9+() -]{7,20}$/.test(phone) || phone.replace(/\D/g, '').length < 7) return bad(f.phone, 'Please enter a valid phone number.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return bad(f.email, 'Please enter a valid email address.');
      if (f.consent && !f.consent.checked) { var cl = f.consent.closest('.lm-consent'); cl.classList.add('bad'); lerr.textContent = 'Please tick the checkbox to receive your brochure.'; f.consent.focus(); lform.classList.add('shake'); setTimeout(function () { lform.classList.remove('shake'); }, 550); return; }
      var btn = $('button[type=submit]', lform); btn.classList.add('loading'); btn.querySelector('span').textContent = 'Please wait…';
      var fd = new FormData(lform); fd.set('source', 'brochure_popup');
      postLead(fd).then(function (r) {
        btn.classList.remove('loading'); btn.querySelector('span').textContent = 'Get the Brochure';
        if (r.ok) {
          store.set(KEY, '1'); if (window.navkarTrack) navkarTrack('generate_lead', { lead_source: 'brochure_popup' }); showDone(); celebrate(); setTimeout(goDownload, 700);
          setTimeout(function () { if (lopen) closeLead(); }, 6500);
        } else if (r.status === 422) {
          lerr.textContent = r.message || 'Please check your details and try again.';
          lform.classList.add('shake'); setTimeout(function () { lform.classList.remove('shake'); }, 550);
        } else {
          lerr.textContent = 'We could not save your details right now, but your brochure is downloading.';
          goDownload();
        }
      });
    });    /* auto popup on load: only until the form has been filled once */
    whenLoaded(function () {
      if (filled()) return;
      setTimeout(function () { if (!filled() && !lopen) openLead(); }, 1600);
    });
  }


  /* ---------- lead submit (server) + success celebration ---------- */
  function postLead(fd) {
    if (!window.fetch || !/^https?:/.test(location.protocol)) return Promise.resolve({ ok: false, status: 0, message: 'offline' });
    var ctl = window.AbortController ? new AbortController() : null, timer = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    return fetch('lead.php', { method: 'POST', body: fd, headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }, signal: ctl ? ctl.signal : undefined })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (j) { return { ok: !!j.ok && res.ok, status: res.status, message: j.message || '' }; }); })
      .catch(function () { return { ok: false, status: 0, message: 'network' }; })
      .then(function (r) { clearTimeout(timer); return r; });
  }

  var fwCv = document.createElement('canvas'); fwCv.id = 'fw'; fwCv.setAttribute('aria-hidden', 'true'); body.appendChild(fwCv);
  var fwRun = 0;
  function celebrate() {
    if (reduce) return;
    var c = fwCv, ctx = c.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), W = innerWidth, H = innerHeight;
    c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); c.classList.add('on');
    cancelAnimationFrame(fwRun);
    var pals = [['#f58a4b', '#ffd08a', '#ffffff'], ['#1e94d6', '#8fd3ff', '#ffffff'], ['#a31f24', '#ff7b7f', '#ffd1d1'], ['#ffd166', '#fff3c4', '#f58a4b'], ['#ffffff', '#cfe9ff', '#ffd08a']];
    var rockets = [], sparks = [], conf = [], t0 = performance.now(), fired = 0, small = W < 700, TOTAL = small ? 5 : 8;
    var rnd = function (a, b) { return a + Math.random() * (b - a); };
    function launch() {
      var x = rnd(W * .14, W * .86);
      rockets.push({ x: x, y: H + 10, vx: rnd(-.6, .6), vy: -rnd(H * .0125, H * .0165), tgt: rnd(H * .16, H * .46), pal: pals[fired % pals.length], tr: [] });
      fired++;
    }
    function burst(x, y, pal) {
      var n = small ? 56 : 84, ring = Math.random() < .35;
      for (var i = 0; i < n; i++) {
        var a = Math.PI * 2 * i / n + rnd(-.04, .04), sp = ring ? 3.6 : rnd(1.2, 4.6);
        sparks.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, dec: rnd(.0075, .014), col: pal[(Math.random() * pal.length) | 0], r: rnd(1.3, 2.4), tr: [] });
      }
    }
    function cannon(side) {
      for (var i = 0; i < (small ? 34 : 54); i++) {
        var a = (side < 0 ? -Math.PI / 2 + rnd(.1, .8) : -Math.PI / 2 - rnd(.1, .8)), sp = rnd(H * .012, H * .021);
        conf.push({ x: side < 0 ? 0 : W, y: H, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: rnd(5, 9), h: rnd(8, 15), rot: rnd(0, 6.28), vr: rnd(-.25, .25), col: pals[(Math.random() * 4) | 0][(Math.random() * 3) | 0], life: 1, dec: rnd(.0035, .006) });
      }
    }
    cannon(-1); cannon(1);
    var next = 120;
    (function frame(t) {
      var el = t - t0; ctx.clearRect(0, 0, W, H);
      if (fired < TOTAL && el > next) { launch(); next += rnd(240, 420); }
      rockets = rockets.filter(function (r) {
        r.x += r.vx; r.y += r.vy; r.vy += .12; r.tr.push([r.x, r.y]); if (r.tr.length > 8) r.tr.shift();
        ctx.lineWidth = 2; for (var i = 1; i < r.tr.length; i++) { ctx.strokeStyle = 'rgba(255,224,170,' + (i / r.tr.length * .8) + ')'; ctx.beginPath(); ctx.moveTo(r.tr[i - 1][0], r.tr[i - 1][1]); ctx.lineTo(r.tr[i][0], r.tr[i][1]); ctx.stroke(); }
        if (r.y <= r.tgt || r.vy > -1.2) { burst(r.x, r.y, r.pal); return false; } return true;
      });
      sparks = sparks.filter(function (s) {
        s.vx *= .985; s.vy = s.vy * .985 + .045; s.x += s.vx; s.y += s.vy; s.life -= s.dec; if (s.life <= 0) return false;
        s.tr.push([s.x, s.y]); if (s.tr.length > 5) s.tr.shift();
        ctx.globalAlpha = Math.max(s.life, 0); ctx.strokeStyle = s.col; ctx.lineWidth = s.r; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(s.tr[0][0], s.tr[0][1]); ctx.lineTo(s.x, s.y); ctx.stroke();
        ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * .8, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; return true;
      });
      conf = conf.filter(function (p) {
        p.vx *= .99; p.vy = p.vy * .985 + .22; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= p.dec; if (p.life <= 0 || p.y > H + 30) return false;
        ctx.save(); ctx.globalAlpha = Math.min(1, p.life * 2); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.rot * 1.7));
        ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); return true;
      });
      if (el < 1000 || rockets.length || sparks.length || conf.length || fired < TOTAL) fwRun = requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, W, H); c.classList.remove('on'); }
    })(t0);
  }
  window.addEventListener('resize', function () { if (fwCv.classList.contains('on')) { fwCv.width = innerWidth * Math.min(window.devicePixelRatio || 1, 2); fwCv.height = innerHeight * Math.min(window.devicePixelRatio || 1, 2); } });

  /* ---------- enquiry form (AJAX) + success dialog ---------- */
  var enq = $('form.enq'), okm = $('#okModal');
  if (enq && okm) {
    var enqErr = document.createElement('p'); enqErr.className = 'enq-err'; enqErr.setAttribute('role', 'alert'); $('.consent', enq).before(enqErr);
    var okOpen = false;
    var openOk = function (name, phone) {
      $('.ok-name', okm).textContent = name; $('.ok-phone', okm).textContent = phone;
      okOpen = true; okm.classList.add('open'); body.style.overflow = 'hidden'; celebrate();
    };
    var closeOk = function () { okOpen = false; okm.classList.toggle('open', false); body.style.overflow = ''; };
    $('.ok-x', okm).addEventListener('click', closeOk);
    $$('[data-ok-close]', okm).forEach(function (b) { b.addEventListener('click', closeOk); });
    okm.addEventListener('click', function (e) { if (e.target === okm) closeOk(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && okOpen) closeOk(); });
    $$('[data-ok-brochure]', okm).forEach(function (b) { b.addEventListener('click', function () { closeOk(); var a = document.createElement('a'); a.href = BROCHURE; a.download = 'Navkar-City-Brochure.pdf'; body.appendChild(a); a.click(); body.removeChild(a); say('Your brochure is downloading'); }); });
    var shakeEnq = function () { enq.classList.add('shake'); setTimeout(function () { enq.classList.remove('shake'); }, 600); };
    $$('input,textarea', enq).forEach(function (i) { i.addEventListener('input', function () { enqErr.textContent = ''; i.classList.remove('bad'); var cl = i.closest && i.closest('.lm-consent'); if (cl) cl.classList.remove('bad'); }); });
    enq.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = enq.name.value.trim(), phone = enq.phone.value.trim(), email = enq.email.value.trim();
      var fail = function (el, msg) { el.classList.add('bad'); enqErr.textContent = msg; el.focus(); shakeEnq(); };
      if (!/^[A-Za-zÀ-ɏ .'-]{2,80}$/.test(name)) return fail(enq.name, 'Please enter your full name.');
      if (!/^[0-9+() -]{7,20}$/.test(phone) || phone.replace(/\D/g, '').length < 7) return fail(enq.phone, 'Please enter a valid phone number.');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail(enq.email, 'Please enter a valid email address.');
      if (enq.consent && !enq.consent.checked) { enq.consent.closest('.lm-consent').classList.add('bad'); return fail(enq.consent, 'Please tick the checkbox to submit your enquiry.'); }
      var b = $('button[type=submit]', enq), lbl = b.querySelector('span'), old = lbl.textContent;
      b.classList.add('loading'); lbl.textContent = 'Sending…';
      var fd = new FormData(enq); fd.set('source', 'enquiry_form');
      postLead(fd).then(function (r) {
        b.classList.remove('loading'); lbl.textContent = old;
        if (r.ok) {
          store.set(KEY, '1'); if (window.navkarTrack) navkarTrack('generate_lead', { lead_source: 'enquiry_form' }); var cc = enq.country_code.value;
          enq.reset(); enqErr.textContent = ''; openOk(name.split(' ')[0], '+' + cc + ' ' + phone);
          setTimeout(function () { var a = document.createElement('a'); a.href = BROCHURE; a.download = 'Navkar-City-Brochure.pdf'; a.rel = 'noopener'; body.appendChild(a); a.click(); body.removeChild(a); say('Your brochure is downloading'); }, 700);
        } else if (r.status === 422) { enqErr.textContent = r.message || 'Please check the details and try again.'; shakeEnq(); }
        else { enqErr.textContent = 'We could not send your enquiry right now. Please call or WhatsApp us on +91 77239 98811.'; shakeEnq(); }
      });
    });
  }

  /* ---------- location tabs ---------- */
  $$('.loc-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.loc-tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
      $$('.loc-pane').forEach(function (p) { p.classList.toggle('on', p.id === b.dataset.p); });
    });
  });


  /* ---------- mobile: lock scroll while menu is open, hide floating buttons over form/footer ---------- */
  if (burger) burger.addEventListener('click', function () { body.classList.toggle('menu-open', menu.classList.contains('open')); });
  $$('.menu a').forEach(function (a) { a.addEventListener('click', function () { body.classList.remove('menu-open'); }); });
  var offSet = new Set();
  var offIO = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) offSet.add(e.target); else offSet.delete(e.target); });
    body.classList.toggle('dock-off', offSet.size > 0);
  }, { threshold: .15 });
  [$('form.enq'), $('footer')].forEach(function (el) { if (el) offIO.observe(el); });


  /* ---------- towers row: arrows ---------- */
  var twT = $('.tw-track');
  if (twT) {
    var twStep = function () { var c = $('.tw-card'); return (c ? c.offsetWidth : 236) + 16; };
    var twP = $('.tw-prev'), twN = $('.tw-next');
    if (twP) twP.addEventListener('click', function () { twT.scrollBy({ left: -twStep() * 2, behavior: 'smooth' }); });
    if (twN) twN.addEventListener('click', function () { twT.scrollBy({ left: twStep() * 2, behavior: 'smooth' }); });
  }

  /* ---------- towers showcase ---------- */
  var tws = $('#twShow');
  if (tws) {
    var twI = $('.tw-img', tws), twB = $('.tw-bg', tws), twTh = $$('.tw-th', tws), twZ = $$('.tw-zoomset a', tws), twC = 0, twBusy = 0;
    var twName = $('.tw-title', tws), twSub = $('.tw-sub', tws), twCnt = $('.tw-count', tws), twBox = $('.tw-thumbs', tws);
    var pad2t = function (n) { return (n < 10 ? '0' : '') + n; };
    function twGo(i) {
      i = (i + twTh.length) % twTh.length; if (i === twC && twI.getAttribute('src') === twTh[i].dataset.src) return;
      twC = i; var b = twTh[i];
      twTh.forEach(function (t, k) { t.classList.toggle('on', k === i); });
      twI.classList.add('swap');
      setTimeout(function () {
        twI.onload = function () { twI.classList.remove('swap'); };
        twI.src = b.dataset.src; twI.alt = b.querySelector('img').alt; twB.style.backgroundImage = 'url(' + b.dataset.src + ')';
        if (twI.complete) twI.classList.remove('swap');
      }, 220);
      twName.innerHTML = b.dataset.name; if (twSub) twSub.textContent = b.dataset.sub; twCnt.innerHTML = '<b>' + pad2t(i + 1) + '</b> / ' + pad2t(twTh.length);
      if (twBox.scrollWidth > twBox.clientWidth + 2) twBox.scrollTo({ left: b.offsetLeft - twBox.clientWidth / 2 + b.offsetWidth / 2, behavior: 'smooth' });
    }
    twB.style.backgroundImage = 'url(' + twI.getAttribute('src') + ')';
    twTh.forEach(function (t, k) { t.addEventListener('click', function () { twGo(k); }); });
    $('.tw-prev2', tws).addEventListener('click', function (e) { e.stopPropagation(); twGo(twC - 1); });
    $('.tw-next2', tws).addEventListener('click', function (e) { e.stopPropagation(); twGo(twC + 1); });
    $('.tw-stage', tws).addEventListener('click', function (e) { if (!e.target.closest('.tw-arr') && twZ[twC]) twZ[twC].click(); });
    var twx = 0;
    $('.tw-stage', tws).addEventListener('touchstart', function (e) { twx = e.touches[0].clientX; }, { passive: true });
    $('.tw-stage', tws).addEventListener('touchend', function (e) { var d = e.changedTouches[0].clientX - twx; if (Math.abs(d) > 50) { twGo(twC + (d < 0 ? 1 : -1)); twx = 1e5; } });
  }

})();
