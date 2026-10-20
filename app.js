(function () {
  'use strict';

  var DESIGN_W = 1366;
  var pages = [].slice.call(document.querySelectorAll('.pg'));
  var fade = document.getElementById('fade');
  var current = null;
  var running = [];
  var busy = false;
  var OFFSET = 380; // animasi mulai setelah layar putih memudar
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pilih versi tata letak dan skalanya, meniru aturan situs Canva:
  // PC (1094px ke atas) memakai desain 1366px, tidak diperbesar melebihi
  // ukuran aslinya dan diletakkan di tengah. Tablet dan HP memakai susunan
  // Canva untuk layar kecil, diskalakan ke lebar layar.
  function variantFor(vw) { return vw >= 1094 ? 'd' : vw >= 560 ? 't' : 'm'; }

  function layout(pg) {
    var vw = document.documentElement.clientWidth || window.innerWidth;
    var vh = window.innerHeight;
    var v = variantFor(vw);
    pg.classList.remove('v-d', 'v-t', 'v-m');
    pg.classList.add('v-' + v);
    var cv = pg.querySelector('.cv-' + v);
    var w = +cv.getAttribute('data-w'), h = +cv.getAttribute('data-h');
    var s = v === 'd' ? Math.min(1, vw / w) : vw / w;
    var ch = h * s;
    var secH = Math.max(ch, vh);
    var x = v === 'd' ? (vw - w * s) / 2 : 0;
    var y = v === 'd' && pg.classList.contains('full') ? (secH - ch) / 2 : 0;
    cv.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')';
    pg.style.height = secH + 'px';
    pg.style.setProperty('--s', s.toString());
    var bgi = pg.querySelector('.bgi');
    if (bgi) {
      var cover = Math.max(vw / 1366, secH / 768);
      bgi.style.transform = 'translate(-50%,-50%) scale(' + cover + ')';
    }
    return v;
  }

  var lastV = null;
  window.addEventListener('resize', function () {
    if (!current) return;
    var v = layout(current);
    if (v !== lastV) { lastV = v; playVideos(current); }
  });

  // #page-N -> halaman
  function pageFor(hash) {
    var h = (hash || '').replace(/^#/, '');
    for (var i = 0; i < pages.length; i++) {
      if ((' ' + pages[i].getAttribute('data-hash') + ' ').indexOf(' ' + h + ' ') >= 0) return pages[i];
    }
    return pages[0];
  }

  // ---------- Video ----------
  var SPK_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  var SPK_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9 6 6"/><path d="m22 9-6 6"/></svg>';

  [].forEach.call(document.querySelectorAll('.cv video, .bgl video'), function (v) {
    v.muted = true;
    v.preload = 'none';
    // Canva menaruh gambar sampul di atas video; jadikan poster
    var ov = v.nextElementSibling;
    var img = ov && ov.querySelector('img');
    if (img) { v.poster = img.getAttribute('src'); ov.parentNode.removeChild(ov); }
    var isBg = /hero-amsterdam/.test(v.getAttribute('src'));
    if (isBg) return;
    var box = v.closest('.cv > div > div') || v.parentNode;
    box.classList.add('vbox');
    var b = document.createElement('button');
    b.className = 'snd';
    b.type = 'button';
    b.setAttribute('aria-label', 'Sound on/off');
    b.innerHTML = SPK_OFF;
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var turnOn = v.muted;
      // hanya satu video bersuara
      [].forEach.call(document.querySelectorAll('.cv video, .bgl video'), function (o) {
        if (o !== v && !o.muted) { o.muted = true; var ob = o.__snd; if (ob) ob.innerHTML = SPK_OFF; }
      });
      v.muted = !turnOn;
      b.innerHTML = turnOn ? SPK_ON : SPK_OFF;
      if (v.paused) v.play().catch(function () {});
    });
    v.__snd = b;
    box.appendChild(b);
  });

  function playVideos(pg) {
    [].forEach.call(document.querySelectorAll('.cv video, .bgl video'), function (v) {
      if (pg.contains(v) && v.getClientRects().length) {
        v.preload = 'auto';
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      } else {
        v.pause();
        if (!v.muted) { v.muted = true; if (v.__snd) v.__snd.innerHTML = SPK_OFF; }
      }
    });
  }

  // ---------- Animasi masuk (meniru animasi Canva) ----------
  function letters(el) {
    // huruf satu per satu, dari lapisan garis tepi dan lapisan isi
    return [].slice.call(el.querySelectorAll('p')).map(function (p) {
      return [].slice.call(p.querySelectorAll('span')).filter(function (s) {
        return !s.children.length && s.textContent.trim().length === 1;
      });
    });
  }

  function anim(target, frames, opts) {
    opts.fill = 'both';
    var a = target.animate(frames, opts);
    running.push(a);
    return a;
  }

  function playAnims(pg) {
    running.forEach(function (a) { a.cancel(); });
    running = [];
    if (reduce || !pg.animate) return;
    var box = pg.querySelector('.cv-' + lastV) || pg;
    var els = [].slice.call(box.querySelectorAll('[data-anim]'));

    // tipe 6: memudar masuk bergiliran dari atas ke bawah
    var fades = els.filter(function (e) { return e.getAttribute('data-anim') === '6'; });
    fades.sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top; });
    fades.forEach(function (e, i) {
      anim(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 550, delay: OFFSET + 350 + i * 110, easing: 'ease-out' });
    });

    els.forEach(function (e) {
      var t = e.getAttribute('data-anim');
      if (t === '20') {
        // naik sambil memudar
        anim(e, [{ opacity: 0, translate: '0 22px' }, { opacity: 1, translate: '0 0' }], { duration: 380, delay: OFFSET + 80, easing: 'cubic-bezier(.2,.7,.3,1)' });
      } else if (t === '19') {
        // huruf tumbuh satu per satu
        letters(e).forEach(function (row) {
          row.forEach(function (s, i) {
            if (getComputedStyle(s).display === 'inline') s.style.display = 'inline-block';
            s.style.transformOrigin = '50% 85%';
            anim(s, [{ scale: '0.15', opacity: 0 }, { scale: '1', opacity: 1, offset: 0.7 }, { scale: '1', opacity: 1 }], { duration: 300, delay: OFFSET + 230 + i * 125, easing: 'cubic-bezier(.25,.9,.35,1.15)' });
          });
        });
      } else if (t === '26') {
        // huruf terbuka dari kiri ke kanan
        letters(e).forEach(function (row) {
          row.forEach(function (s, i) {
            if (getComputedStyle(s).display === 'inline') s.style.display = 'inline-block';
            anim(s, [{ clipPath: 'inset(-30% 100% -30% -10%)' }, { clipPath: 'inset(-30% -30% -30% -10%)' }], { duration: 150, delay: OFFSET + 280 + i * 85, easing: 'linear' });
          });
        });
      } else if (t === '30') {
        // foto muncul halus setelah judul selesai, tapi baru setelah gambarnya siap
        var t0 = performance.now();
        var hold = anim(e, [{ opacity: 0 }, { opacity: 0 }], { duration: 1e9 });
        var img = e.querySelector('img');
        var ready = img && img.decode ? img.decode().catch(function () {}) : Promise.resolve();
        ready.then(function () {
          if (running.indexOf(hold) < 0) return; // halaman sudah berganti
          hold.cancel();
          var wait = Math.max(0, OFFSET + 1500 - (performance.now() - t0));
          anim(e, [{ opacity: 0, translate: '0 14px' }, { opacity: 1, translate: '0 0' }], { duration: 550, delay: wait, easing: 'cubic-bezier(.2,.8,.3,1)' });
        });
      }
    });
  }

  // ---------- Pindah halaman ----------
  function show(pg, first) {
    if (current) current.classList.remove('on');
    pg.classList.add('on');
    current = pg;
    lastV = layout(pg);
    [].forEach.call(pg.querySelectorAll('img[loading="lazy"]'), function (im) {
      if (im.getClientRects().length) im.loading = 'eager';
    });
    window.scrollTo(0, 0);
    playVideos(pg);
    playAnims(pg);
    requestAnimationFrame(function () { fade.classList.add('out'); });
  }

  function go(pg) {
    if (pg === current || busy) return;
    busy = true;
    fade.classList.remove('out');
    setTimeout(function () {
      show(pg);
      busy = false;
    }, reduce ? 0 : 420);
  }

  window.addEventListener('hashchange', function () { go(pageFor(location.hash)); });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#page-"]');
    if (!a) return;
    e.preventDefault();
    var h = a.getAttribute('href');
    if (location.hash !== h) history.pushState(null, '', h);
    go(pageFor(h));
  });
  window.addEventListener('popstate', function () { go(pageFor(location.hash)); });

  // Lebar tiap huruf judul diukur dari Obra Letra. Kalau file font belum
  // dipasang, biarkan huruf pengganti memakai lebarnya sendiri.
  function fallbackLetters() {
    if (!document.fonts || document.fonts.check('700 60px "Obra Letra"') && [].some.call(document.fonts, function (f) { return f.family.replace(/"/g, '') === 'Obra Letra' && f.status === 'loaded'; })) return;
    [].forEach.call(document.querySelectorAll('.cv p'), function (p) {
      if (getComputedStyle(p).fontFamily.indexOf('Obra Letra') < 0) return;
      [].forEach.call(p.querySelectorAll('span'), function (sp) {
        if (!sp.children.length && sp.style.width) sp.style.width = 'auto';
      });
    });
  }

  function start() { fallbackLetters(); show(pageFor(location.hash), true); }
  if (document.fonts && document.fonts.ready) {
    var done = false;
    document.fonts.ready.then(function () { if (!done) { done = true; start(); } });
    setTimeout(function () { if (!done) { done = true; start(); } }, 1000);
  } else {
    start();
  }
})();
