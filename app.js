(function () {
  'use strict';

  var DESIGN_W = 1366;
  var pages = [].slice.call(document.querySelectorAll('.pg'));
  var fade = document.getElementById('fade');
  var current = null;
  var running = [];
  var busy = false;
  var queued = null;
  var onReveal = []; // dijalankan saat layar putih mulai memudar
  var OFFSET = 380; // animasi mulai setelah layar putih memudar
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pilih versi tata letak dan skalanya, meniru aturan situs Canva:
  // PC (1094px ke atas) memakai desain 1366px, tidak diperbesar melebihi
  // ukuran aslinya dan diletakkan di tengah. Tablet dan HP memakai susunan
  // Canva untuk layar kecil, diskalakan ke lebar layar.
  function variantFor(vw) { return vw >= 1094 ? 'd' : vw >= 560 ? 't' : 'm'; }

  function layout(pg) {
    if (pg.classList.contains('flow')) return 'f'; // halaman tengah: tata letak web biasa
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

  [].forEach.call(document.querySelectorAll('.cv video, .bgl video, .flow video'), function (v) {
    v.muted = true;
    v.preload = 'none';
    // Canva menaruh gambar sampul di atas video; jadikan poster
    var ov = v.nextElementSibling;
    var img = ov && ov.querySelector('img');
    // sampul video baru diunduh saat videonya hampir terlihat
    if (img) { v.setAttribute('data-poster', img.getAttribute('src')); ov.parentNode.removeChild(ov); }
    var isBg = /hero-amsterdam/.test(v.getAttribute('src'));
    if (isBg) return;
    var box = v.closest('.m') || v.closest('.cv > div > div') || v.parentNode;
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
      [].forEach.call(document.querySelectorAll('.cv video, .bgl video, .flow video'), function (o) {
        if (o !== v && !o.muted) { o.muted = true; var ob = o.__snd; if (ob) ob.innerHTML = SPK_OFF; }
      });
      v.muted = !turnOn;
      b.innerHTML = turnOn ? SPK_ON : SPK_OFF;
      if (v.paused) v.play().catch(function () {});
    });
    v.__snd = b;
    box.appendChild(b);
  });

  // Video hanya diputar saat terlihat di layar, supaya HP tidak berat
  var seen = new Set();
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (list) {
    list.forEach(function (en) {
      if (en.isIntersecting) seen.add(en.target); else seen.delete(en.target);
      sync(en.target);
    });
  }, { rootMargin: '600px 0px' }) : null;

  function sync(v) {
    var on = current && current.contains(v) && v.getClientRects().length && (!io || seen.has(v));
    if (on) {
      if (!v.poster && v.getAttribute('data-poster')) v.poster = v.getAttribute('data-poster');
      v.preload = 'auto';
      if (v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    } else if (!v.paused) {
      v.pause();
    }
  }

  function playVideos(pg) {
    [].forEach.call(document.querySelectorAll('.cv video, .bgl video, .flow video'), function (v) {
      if (io && !v.__obs) { io.observe(v); v.__obs = true; }
      if (!pg.contains(v) && !v.muted) { v.muted = true; if (v.__snd) v.__snd.innerHTML = SPK_OFF; }
      sync(v);
    });
  }

  // ---------- Kontak bisa diklik ----------
  var CONTACTS = [
    { re: /@gmail\.com/i, href: 'mailto:afikrirabbani11@gmail.com', label: 'Email' },
    { re: /^\+90/, href: 'https://wa.me/905056832904', label: 'WhatsApp', blank: true },
    { re: /linkedin\.com/i, href: 'https://www.linkedin.com/in/fikriirabbani', label: 'LinkedIn', blank: true }
  ];
  [].forEach.call(document.querySelectorAll('#kontak .cv > div > div'), function (el) {
    var txt = el.textContent.replace(/\s+/g, ' ').trim();
    CONTACTS.forEach(function (c) {
      if (!c.re.test(txt) || el.querySelector('.lnk-a')) return;
      var a = document.createElement('a');
      a.className = 'lnk-a';
      a.href = c.href;
      a.setAttribute('aria-label', c.label + ': ' + txt);
      if (c.blank) { a.target = '_blank'; a.rel = 'noopener'; }
      el.classList.add('lnk');
      el.appendChild(a);
    });
  });

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
    onReveal = [];
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
            s.style.transformOrigin = '50% 85%';
            anim(s, [{ scale: '0.15', opacity: 0 }, { scale: '1', opacity: 1, offset: 0.7 }, { scale: '1', opacity: 1 }], { duration: 300, delay: OFFSET + 230 + i * 125, easing: 'cubic-bezier(.25,.9,.35,1.15)' });
          });
        });
      } else if (t === '26') {
        // huruf terbuka dari kiri ke kanan
        letters(e).forEach(function (row) {
          row.forEach(function (s, i) {
            anim(s, [{ clipPath: 'inset(-30% 100% -30% -10%)' }, { clipPath: 'inset(-30% -30% -30% -10%)' }], { duration: 150, delay: OFFSET + 280 + i * 85, easing: 'linear' });
          });
        });
      } else if (t === '30') {
        // foto muncul halus setelah judul selesai, tapi baru setelah gambarnya siap
        // 0.001, bukan 0: browser tetap menggambar foto sejak awal, jadi saat
        // muncul tidak ada frame yang tersendat
        e.style.willChange = 'opacity, translate';
        var hold = anim(e, [{ opacity: 0.001 }, { opacity: 0.001 }], { duration: 1e9 });
        var img = e.querySelector('img');
        var ready = img && img.decode ? img.decode().catch(function () {}) : Promise.resolve();
        // waktu dihitung dari saat layar putih mulai memudar
        onReveal.push(function () {
          var t0 = performance.now();
          ready.then(function () {
            if (running.indexOf(hold) < 0) return; // halaman sudah berganti
            hold.cancel();
            var wait = Math.max(0, OFFSET + 1500 - (performance.now() - t0));
            anim(e, [{ opacity: 0.001, translate: '0 14px' }, { opacity: 1, translate: '0 0' }], { duration: 550, delay: wait, easing: 'cubic-bezier(.2,.8,.3,1)' });
          });
        });
      }
    });
  }

  // ---------- Halaman tengah (kartu-map) ----------
  // judul: huruf dibungkus satu per satu untuk efek terbuka dari kiri
  [].forEach.call(document.querySelectorAll('.flow [data-wipe]'), function (h) {
    var walk = function (node) {
      [].slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          // huruf dikelompokkan per kata, supaya baris hanya patah di antara kata
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (word) {
            if (!word) return;
            if (/^\s+$/.test(word)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            word.split('').forEach(function (ch) {
              var sp = document.createElement('span'); sp.className = 'ch'; sp.textContent = ch; w.appendChild(sp);
            });
            frag.appendChild(w);
          });
          c.parentNode.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    };
    walk(h);
  });

  var rvIo = 'IntersectionObserver' in window ? new IntersectionObserver(function (list) {
    list.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      rvIo.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;

  function playFlow(pg) {
    var panel = pg.querySelector('.panel'), tabs = pg.querySelector('.tabs');
    // tab aktif digeser ke tengah kalau deretan tab lebih lebar dari layar (HP)
    var on = tabs && tabs.querySelector('.tab.on');
    if (on && tabs.scrollWidth > tabs.clientWidth) tabs.scrollLeft = on.offsetLeft - (tabs.clientWidth - on.offsetWidth) / 2;
    [panel, tabs].forEach(function (el) { if (el) { el.classList.remove('rise'); void el.offsetWidth; el.classList.add('rise'); } });
    // isi muncul bergiliran saat terlihat; urutan per baris layar
    var rvs = [].slice.call(pg.querySelectorAll('.rv'));
    var rowTop = null, k = 0;
    rvs.forEach(function (e) {
      e.classList.remove('in');
      var t = Math.round(e.getBoundingClientRect().top / 40);
      k = t === rowTop ? k + 1 : 0;
      rowTop = t;
      e.style.setProperty('--d', (Math.min(k, 8) * 0.06 + 0.25) + 's');
      if (rvIo) rvIo.observe(e); else e.classList.add('in');
    });
    if (reduce || !pg.animate) return;
    [].forEach.call(pg.querySelectorAll('[data-wipe]'), function (h) {
      [].forEach.call(h.querySelectorAll('.ch'), function (s, i) {
        anim(s, [{ clipPath: 'inset(-30% 100% -30% -10%)' }, { clipPath: 'inset(-30% -30% -30% -10%)' }], { duration: 160, delay: OFFSET + 250 + i * 55, easing: 'linear' });
      });
    });
  }

  // ---------- Tombol kembali ke atas ----------
  var totop = document.getElementById('totop');
  var topTick = false;
  function topCheck() {
    topTick = false;
    totop.classList.toggle('show', window.scrollY > 160);
  }
  window.addEventListener('scroll', function () {
    if (!topTick) { topTick = true; requestAnimationFrame(topCheck); }
  }, { passive: true });
  totop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  // ---------- Pindah halaman ----------
  function show(pg, first) {
    if (current) current.classList.remove('on');
    pg.classList.add('on');
    current = pg;
    lastV = layout(pg);
    window.scrollTo(0, 0);
    totop.classList.remove('show');
    playAnims(pg);
    if (lastV === 'f') playFlow(pg);
    // Gambar di layar pertama didekode dulu di balik layar putih (maks 0,9 detik),
    // tunggu 2 frame sampai halaman selesai digambar, baru layar putih memudar
    // dan animasi berjalan. Dengan begitu tidak ada frame yang tersendat.
    running.forEach(function (a) { a.pause(); });
    var vh = window.innerHeight;
    var imgs = [].filter.call(pg.querySelectorAll('img'), function (im) {
      var r = im.getBoundingClientRect();
      return r.width > 0 && r.top < vh && r.bottom > 0;
    });
    // sampul video halaman ini disiapkan di balik layar putih
    [].forEach.call(pg.querySelectorAll('video'), function (v) {
      if (!v.poster && v.getAttribute('data-poster') && v.getClientRects().length) v.poster = v.getAttribute('data-poster');
    });
    var dec = imgs.map(function (im) {
      im.loading = 'eager';
      return im.decode ? im.decode().catch(function () {}) : Promise.resolve();
    });
    var cap = new Promise(function (res) { setTimeout(res, 900); });
    Promise.race([Promise.all(dec), cap]).then(function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (current !== pg) return;
          running.forEach(function (a) { a.play(); });
          fade.classList.add('out');
          onReveal.forEach(function (f) { f(); });
          onReveal = [];
          // video baru diputar setelah layar putih selesai pudar
          setTimeout(function () { if (current === pg) playVideos(pg); }, 480);
          // sisa gambar halaman ini diunduh dan didekode di belakang layar setelah
          // layar putih hilang, supaya siap sebelum digulir
          setTimeout(function () {
            if (current !== pg) return;
            [].forEach.call(pg.querySelectorAll((lastV === 'f' ? '' : '.cv-' + lastV + ' ') + 'img[loading="lazy"]'), function (im) {
              im.loading = 'eager';
              if (im.decode) im.decode().catch(function () {});
            });
            // video halaman ini juga mulai diunduh sekarang (diputar hanya saat terlihat)
            [].forEach.call(pg.querySelectorAll('video'), function (v) {
              if (v.getClientRects().length && v.preload !== 'auto') v.preload = 'auto';
            });
          }, 700);
        });
      });
    });
  }

  function go(pg) {
    // klik saat transisi berjalan: simpan tujuan terakhir, dijalankan sesudahnya
    if (busy) { queued = pg; return; }
    if (pg === current) return;
    busy = true;
    fade.classList.remove('out');
    setTimeout(function () {
      show(pg);
      busy = false;
      var q = queued;
      queued = null;
      if (q && q !== current) go(q);
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
  var obraOk = false;
  function fallbackLetters() {
    if (!obraOk) document.documentElement.classList.add('no-obra');
  }

  function start() { fallbackLetters(); show(pageFor(location.hash), true); }

  // Semua halaman masih tersembunyi saat dimuat, jadi browser belum meminta
  // font. Minta sekarang supaya teks tidak berganti font saat animasi berjalan.
  if (document.fonts && document.fonts.load) {
    var done = false;
    var begin = function () { if (!done) { done = true; start(); } };
    var want = ['500 16px Inter', '600 16px Inter', '700 16px Inter', '800 16px Inter', '400 60px Amarante'];
    var loads = want.map(function (f) { return document.fonts.load(f).catch(function () {}); });
    loads.push(document.fonts.load('700 60px "Obra Letra"').then(function (l) { obraOk = l.length > 0; }, function () {}));
    Promise.all(loads).then(begin);
    setTimeout(begin, 1500);
  } else {
    start();
  }
})();
