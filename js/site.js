/*!
 * Arfah Internet — site.js   (vanilla JavaScript, no libraries; shared by every page)
 *
 * Each feature starts only when its HTML exists on the page, so this one file serves all pages:
 *   everywhere : language switch (हिंदी/EN), live "open now", header + menu, reveal-on-scroll, counters,
 *                WhatsApp links, share/copy (the button itself shows "copied" - the site has no pop-ups)
 *   home       : shop-card tilt, real customer reviews (from #reviews-data)
 *   service    : search + category filter (also from ?q= and ?cat= in the link), "documents needed" list opens inside the card
 *   contact    : WhatsApp message form      website-app : "send your requirement" form
 *
 * Phone / WhatsApp number and opening hours live in the <body data-…> attributes of each page.
 * Page title + description per language live in the <html data-title-hi / data-title-en / data-desc-…> attributes.
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------------ 1. helpers */
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var root = document.documentElement;
  var body = document.body;
  var WA_NUMBER = body.dataset.wa || '917703844756';
  var OPEN_H = Number(body.dataset.open || 8);     // opening hour, 24h, India time
  var CLOSE_H = Number(body.dataset.close || 22);  // closing hour, 24h, India time
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var EASE = 'cubic-bezier(.22,.8,.24,1)';

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode: ignore */ } }
  };
  function lang() { return root.lang === 'en' ? 'en' : 'hi'; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  /** reads data-<name>-hi / data-<name>-en for the current language */
  function dataFor(el, name) { return el.dataset[name + cap(lang())]; }
  /** writes text into the two language spans inside el (only when changed, so screen readers stay quiet) */
  function setBoth(el, hi, en) {
    var h = $('[lang="hi"]', el), e = $('[lang="en"]', el);
    if (h && h.textContent !== hi) h.textContent = hi;
    if (e && e.textContent !== en) e.textContent = en;
  }
  function waHref(text) { return 'https://wa.me/' + WA_NUMBER + (text ? '?text=' + encodeURIComponent(text) : ''); }
  function onVisible(els, cb, opts) {
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) { els.forEach(cb); return; }
    var io = new IntersectionObserver(function (entries, o) {
      entries.forEach(function (en) { if (en.isIntersecting) { o.unobserve(en.target); cb(en.target); } });
    }, opts);
    els.forEach(function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------ 2. language */
  var metaDesc = $('#meta-desc');
  function headText(kind, l) { return root.getAttribute('data-' + kind + '-' + l) || ''; }
  function translateOptions(sel) {
    $$('option[data-hi]', sel).forEach(function (o) {
      var t = o.dataset[lang()];
      if (t && o.textContent !== t) o.textContent = t;
    });
  }
  function applyLang(next, persist) {
    root.lang = next;
    if (persist) store.set('arfah-lang', next);
    var t = headText('title', next); if (t) document.title = t;
    var d = headText('desc', next); if (d && metaDesc) metaDesc.content = d;
    $$('[data-set-lang]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setLang === next)); });
    $$('[data-alt-hi]').forEach(function (el) { el.alt = dataFor(el, 'alt'); });
    $$('[data-ph-hi]').forEach(function (el) { el.placeholder = dataFor(el, 'ph'); });
    $$('select').forEach(translateOptions);
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: next } }));
  }
  $$('[data-set-lang]').forEach(function (b) {
    b.addEventListener('click', function () { applyLang(b.dataset.setLang, true); });
  });

  /* ------------------------------------------------------------------ 3. live "open now" */
  function istNow() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(new Date());
    var get = function (t) { var p = parts.filter(function (x) { return x.type === t; })[0]; return p ? p.value : ''; };
    var hour = Number(get('hour')) % 24;
    var minute = Number(get('minute'));
    return { t: hour + minute / 60, day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')) };
  }
  function en12(h) { return (h % 12 || 12) + ':00 ' + (h < 12 ? 'AM' : 'PM'); }
  function hiHour(h) {
    var part = h < 5 ? 'रात' : h < 12 ? 'सुबह' : h < 16 ? 'दोपहर' : h < 19 ? 'शाम' : 'रात';
    return part + ' ' + (h % 12 || 12) + ' बजे';
  }
  function renderStatus() {
    var now = istNow(), state, hi, en, hiS, enS;
    if (now.t >= OPEN_H && now.t < CLOSE_H) {
      if (CLOSE_H - now.t <= 1) {
        state = 'closing'; hiS = 'जल्द बंद होगा'; enS = 'Closing soon';
        hi = 'जल्द बंद होगा · ' + hiHour(CLOSE_H) + ' तक'; en = 'Closing soon · until ' + en12(CLOSE_H);
      } else {
        state = 'open'; hiS = 'अभी खुला है'; enS = 'Open now';
        hi = 'अभी खुला है · ' + hiHour(CLOSE_H) + ' तक'; en = 'Open now · until ' + en12(CLOSE_H);
      }
    } else {
      var later = now.t < OPEN_H;
      state = 'closed'; hiS = 'अभी बंद है'; enS = 'Closed now';
      hi = 'अभी बंद है · ' + (later ? 'आज ' : 'कल ') + hiHour(OPEN_H) + ' खुलेगा';
      en = 'Closed now · opens ' + (later ? 'today' : 'tomorrow') + ' at ' + en12(OPEN_H);
    }
    $$('[data-status]').forEach(function (el) {
      el.classList.remove('is-open', 'is-closing', 'is-closed');
      el.classList.add('is-' + state);
      var txt = $('.status-text', el);
      if (!txt) return;
      if (el.dataset.status === 'short') setBoth(txt, hiS, enS); else setBoth(txt, hi, en);
    });
    $$('.days [data-day]').forEach(function (d) { d.classList.toggle('today', Number(d.dataset.day) === now.day); });
  }
  renderStatus();
  setInterval(renderStatus, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) renderStatus(); });

  /* ------------------------------------------------------------------ 4. header, menu, scroll */
  var hdr = $('.hdr'), bar = $('.progress-top'), totop = $('#totop');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY, max = root.scrollHeight - window.innerHeight;
      if (hdr) hdr.classList.toggle('scrolled', y > 8);
      if (bar) bar.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : '0');
      if (totop) totop.classList.toggle('show', y > 700);
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
  if (totop) totop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); });

  var nav = $('#nav'), menuBtn = $('#menu-btn');
  function setMenu(open) { if (!nav || !menuBtn) return; nav.classList.toggle('open', open); menuBtn.setAttribute('aria-expanded', String(open)); }
  if (nav && menuBtn) {
    menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.hdr')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }

  /* ------------------------------------------------------------------ 5a. reviews (home page; only when real ones are added) */
  // Rendered before the reveal observer starts, so the new cards animate in like everything else.
  (function renderReviews() {
    var raw = $('#reviews-data'), list = [];
    if (!raw) return;
    try { list = JSON.parse(raw.textContent || '[]'); } catch (e) { console.warn('reviews-data is not valid JSON', e); }
    if (!Array.isArray(list) || !list.length) return;
    var host = $('#reviews-list');
    list.forEach(function (r) {
      var art = document.createElement('article'); art.className = 'review reveal';
      var stars = Math.max(0, Math.min(5, Math.round(Number(r.stars) || 0)));
      if (stars) {
        var s = document.createElement('div'); s.className = 'stars'; s.setAttribute('aria-label', stars + ' / 5');
        for (var i = 0; i < stars; i++) s.insertAdjacentHTML('beforeend', '<svg class="i" aria-hidden="true"><use href="#i-star-fill"/></svg>');
        art.append(s);
      }
      var q = document.createElement('blockquote');
      var hi = document.createElement('span'); hi.lang = 'hi'; hi.textContent = r.text_hi || r.text_en || '';
      var en = document.createElement('span'); en.lang = 'en'; en.textContent = r.text_en || r.text_hi || '';
      q.append(hi, en); art.append(q);
      var f = document.createElement('footer');
      f.textContent = [r.name, r.date, r.source].filter(Boolean).join(' · ');
      art.append(f);
      host.append(art);
    });
    $('#reviews').hidden = false;
  })();

  /* ------------------------------------------------------------------ 5. reveal + counters */
  $$('[data-stagger]').forEach(function (group) {
    Array.prototype.forEach.call(group.children, function (c, i) { c.style.setProperty('--d', Math.min(i, 8) * 70 + 'ms'); });
  });
  onVisible($$('.reveal'), function (el) { el.classList.add('in'); }, { threshold: 0.01, rootMargin: '0px 0px -6% 0px' });

  function countUp(el) {
    var to = Number(el.dataset.count);
    if (reduceMotion || !to) { el.textContent = to; return; }
    var t0 = performance.now(), dur = 1500;
    el.textContent = '0';
    (function step(now) {
      var k = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  onVisible($$('[data-count]'), countUp, { threshold: 0.6 });

  /* ------------------------------------------------------------------ 6. services page */
  var servicesApplyFilter = function () {};
  var openServiceFromHash = function () {};

  (function initServices() {
    var grid = $('#svc-grid');
    if (!grid) return;
    var cards = $$('.svc', grid);
    var tabs = $$('.tab[data-cat]');
    var searchBox = $('#svc-search'), input = $('#svc-q'), clearBtn = $('#svc-clear'), empty = $('#svc-empty');

    // keep every "19" on this page in sync with the real number of service cards
    $$('[data-svc-total]').forEach(function (el) { el.textContent = cards.length; });
    tabs.forEach(function (t) {
      var n = $('.n', t);
      if (n) n.textContent = t.dataset.cat === 'all' ? cards.length : cards.filter(function (c) { return c.dataset.cat === t.dataset.cat; }).length;
    });

    // search text = titles + blurb + keywords, in both languages; ignores case and the Hindi nukta
    function norm(s) { return s.toLowerCase().normalize('NFKD').replace(/[̀-़ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
    cards.forEach(function (c) { c._hay = norm($('h3', c).textContent + ' ' + $('p', c).textContent + ' ' + (c.dataset.kw || '')); });

    var state = { cat: 'all', q: '' };
    function setCat(cat) {
      state.cat = cat;
      tabs.forEach(function (t) { t.setAttribute('aria-pressed', String(t.dataset.cat === cat)); });
    }
    function applyFilter() {
      var words = norm(state.q).split(' ').filter(Boolean), shown = 0, revealed = 0;
      cards.forEach(function (c) {
        var okCat = state.cat === 'all' || c.dataset.cat === state.cat;
        var okText = words.every(function (w) { return c._hay.indexOf(w) !== -1; });
        var ok = okCat && okText, wasHidden = c.hidden;
        c.hidden = !ok;
        if (ok) {
          shown++;
          if (wasHidden && !reduceMotion && c.animate) {
            c.animate([{ opacity: 0, transform: 'translateY(14px) scale(.97)' }, { opacity: 1, transform: 'none' }],
              { duration: 420, delay: Math.min(revealed++, 8) * 40, easing: EASE, fill: 'backwards' });
          }
        }
      });
      $$('[data-svc-count]').forEach(function (el) { el.textContent = shown; });
      empty.hidden = shown !== 0;
      searchBox.classList.toggle('has-value', input.value.length > 0);
    }
    servicesApplyFilter = applyFilter;
    tabs.forEach(function (t) { t.addEventListener('click', function () { setCat(t.dataset.cat); applyFilter(); }); });
    input.addEventListener('input', function () { state.q = input.value; applyFilter(); });
    clearBtn.addEventListener('click', function () { input.value = ''; state.q = ''; applyFilter(); input.focus(); });
    $$('.chip[data-q]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        input.value = chip.dataset.q; state.q = chip.dataset.q; setCat('all'); applyFilter();
        grid.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });

    // links from other pages:  service.html?cat=travel   service.html?q=aadhaar
    var params = new URLSearchParams(location.search);
    var catParam = params.get('cat'), qParam = params.get('q');
    if (catParam && tabs.some(function (t) { return t.dataset.cat === catParam; })) setCat(catParam);
    if (qParam) { input.value = qParam; state.q = qParam; }

    // ----- "documents needed": the list opens right inside the card (no pop-up)
    function setOpen(card, open) {
      $$('.svc-docs, .svc-tips', card).forEach(function (ul) { ul.hidden = !open; });
      card.classList.toggle('open', open);
      var btn = $('.svc-open', card);
      if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    cards.forEach(function (card) { setOpen(card, false); });
    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.svc-open');
      if (!btn) return;
      var card = btn.closest('.svc');
      setOpen(card, !card.classList.contains('open'));
    });
    // service.html#svc-pan opens that card's list and scrolls to it
    openServiceFromHash = function () {
      if (location.hash.indexOf('#svc-') !== 0) return;
      var c = document.getElementById(location.hash.slice(1));
      if (!c || !c.classList.contains('svc')) return;
      setOpen(c, true);
      c.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    };
    window.addEventListener('hashchange', openServiceFromHash);
  })();

  // cursor-follow glow on cards (mouse devices only)
  if (finePointer) {
    document.addEventListener('pointermove', function (e) {
      var el = e.target.closest ? e.target.closest('.svc, .tcard, .cat, .offer') : null;
      if (!el) return;
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ 8. WhatsApp links + message forms */
  function generalMsg() {
    return lang() === 'hi' ? 'नमस्ते अरफा इंटरनेट, मुझे कुछ जानकारी चाहिए।' : "Hello Arfah Internet, I'd like some information.";
  }
  // every <a data-wa> opens WhatsApp; add data-wa-hi / data-wa-en to give a link its own ready-made message
  function refreshWaLinks() { $$('a[data-wa]').forEach(function (a) { a.href = waHref(dataFor(a, 'wa') || generalMsg()); }); }

  // contact page: name + service + message → WhatsApp
  (function initContactForm() {
    var el = $('#wa-form');
    if (!el) return;
    var name = $('#f-name'), svc = $('#f-svc'), msg = $('#f-msg'), send = $('#f-send');
    function selectedService() {
      var o = svc.options[svc.selectedIndex];
      return o && o.value && o.value !== 'other' ? o.textContent.trim() : '';
    }
    function build() {
      var n = name.value.trim(), m = msg.value.trim(), s = selectedService();
      var parts = lang() === 'hi'
        ? ['नमस्ते अरफा इंटरनेट,', n && 'मेरा नाम ' + n + ' है।', s && 'मुझे "' + s + '" के बारे में जानकारी / मदद चाहिए।', m]
        : ['Hello Arfah Internet,', n && 'My name is ' + n + '.', s && 'I need help with "' + s + '".', m];
      return parts.filter(Boolean).join(' ');
    }
    function refresh() { send.href = waHref(build()); }
    el.addEventListener('input', refresh);
    el.addEventListener('change', refresh);
    document.addEventListener('langchange', refresh);
  })();

  // website-app page: type + business + details → WhatsApp
  (function initBriefForm() {
    var el = $('#brief-form');
    if (!el) return;
    var biz = $('#bf-biz'), msg = $('#bf-msg'), send = $('#bf-send');
    var TYPES = {
      website: { hi: 'वेबसाइट', en: 'a website' },
      webapp: { hi: 'वेब एप्लिकेशन', en: 'a web application' },
      software: { hi: 'मैनेजमेंट सॉफ़्टवेयर', en: 'management software' },
      app: { hi: 'मोबाइल ऐप', en: 'a mobile app' },
      unsure: { hi: 'वेबसाइट, ऐप या सॉफ़्टवेयर (अभी पक्का नहीं पता)', en: 'a website, app or software (not sure which yet)' },
      none: { hi: 'वेबसाइट / ऐप / सॉफ़्टवेयर', en: 'a website / app / software' }
    };
    function build() {
      var r = $('input[name="bf-type"]:checked', el), t = TYPES[r ? r.value : 'none'];
      var b = biz.value.trim(), m = msg.value.trim();
      return (lang() === 'hi'
        ? ['नमस्ते अरफा इंटरनेट,', 'मुझे ' + t.hi + ' बनवाने के बारे में बात करनी है।', b && 'मेरा काम: ' + b + '।', m]
        : ['Hello Arfah Internet,', "I'd like to talk about getting " + t.en + ' built.', b && 'My business: ' + b + '.', m]
      ).filter(Boolean).join(' ');
    }
    function refresh() { send.href = waHref(build()); }
    el.addEventListener('input', refresh);
    el.addEventListener('change', refresh);
    document.addEventListener('langchange', refresh);
  })();

  /* ------------------------------------------------------------------ 9. small extras */
  // feedback is shown on the button itself for a moment (the site has no pop-ups / toasts)
  function flash(btn, hi, en) {
    var h = $('[lang="hi"]', btn), e = $('[lang="en"]', btn);
    if (!h || !e) return;
    if (!btn.dataset.origHi) { btn.dataset.origHi = h.textContent; btn.dataset.origEn = e.textContent; }
    setBoth(btn, hi, en);
    clearTimeout(btn.flashTimer);
    btn.flashTimer = setTimeout(function () { setBoth(btn, btn.dataset.origHi, btn.dataset.origEn); }, 2600);
  }
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return false; });
    }
    return new Promise(function (resolve) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0';
        body.append(ta); ta.select();
        var ok = document.execCommand('copy'); ta.remove(); resolve(ok);
      } catch (e) { resolve(false); }
    });
  }
  var copyBtn = $('#copy-addr');
  if (copyBtn) copyBtn.addEventListener('click', function () {
    copyText(copyBtn.dataset.address).then(function (ok) {
      if (ok) flash(copyBtn, 'पता कॉपी हो गया', 'Address copied'); else flash(copyBtn, 'कॉपी नहीं हो पाया', "Couldn't copy");
    });
  });
  $$('[data-share]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var url = new URL('./', location.href).href;   // always the site's home page
      copyText(url).then(function (ok) {
        if (ok) flash(btn, 'लिंक कॉपी हो गया', 'Link copied'); else flash(btn, 'लिंक कॉपी नहीं हो पाया', "Couldn't copy the link");
      });
    });
  });

  // gentle 3-D tilt on the shop card (home page, mouse devices only)
  var vcard = $('#vcard'), hv = $('.hero-visual');
  if (vcard && hv && finePointer && !reduceMotion) {
    hv.addEventListener('pointermove', function (e) {
      var r = hv.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      vcard.style.setProperty('--ry', (px * 7).toFixed(2) + 'deg');
      vcard.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
    });
    hv.addEventListener('pointerleave', function () { vcard.style.setProperty('--rx', '0deg'); vcard.style.setProperty('--ry', '0deg'); });
  }

  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------ start-up */
  document.addEventListener('langchange', refreshWaLinks);
  var wanted = new URLSearchParams(location.search).get('lang');
  var fromUrl = wanted === 'en' || wanted === 'hi';
  applyLang(fromUrl ? wanted : lang(), fromUrl);
  servicesApplyFilter();
  openServiceFromHash();
})();
