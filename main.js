/* myfawlt — motion + interactions. Motion starts only after terms are accepted. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var isMobile = window.matchMedia('(max-width: 900px)').matches;
  var started = false;
  var lenis = null;

  gsap.registerPlugin(ScrollTrigger, CustomEase);
  CustomEase.create('studio', 'M0,0 C0.22,1 0.36,1 1,1');

  /* ---------- Motion / scene bootstrap ---------- */
  function initMotion() {
    if (started) return;
    started = true;

    if (!reduceMotion && typeof Lenis !== 'undefined') {
      lenis = new Lenis({
        duration: 1.15,
        easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
        smoothWheel: true,
        touchMultiplier: 1.4
      });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    window.addEventListener('site:locked', function () { if (lenis) lenis.stop(); });
    window.addEventListener('site:unlocked', function () {
      if (lenis) lenis.start();
      ScrollTrigger.refresh();
    });

    document.querySelectorAll('[data-scroll]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        var el = document.querySelector(id);
        if (!el) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(el, { offset: -72, duration: 1.2 });
        else el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });

    var nav = document.getElementById('nav');
    var lastY = 0;
    function onScrollPos(y) {
      nav.classList.toggle('nav--scrolled', y > 12);
      if (y > lastY && y > 140) nav.classList.add('nav--hidden');
      else nav.classList.remove('nav--hidden');
      lastY = y;
    }
    if (lenis) lenis.on('scroll', function (e) { onScrollPos(e.scroll); });
    else window.addEventListener('scroll', function () { onScrollPos(window.scrollY); }, { passive: true });

    var intro = document.getElementById('intro');
    var heroLines = document.querySelectorAll('.hero .line__inner');

    function revealHero() {
      if (reduceMotion) { gsap.set(heroLines, { yPercent: 0 }); return; }
      gsap.fromTo(heroLines, { yPercent: 115 }, { yPercent: 0, duration: 0.95, ease: 'studio', stagger: 0.08, delay: 0.15 });
    }

    if (reduceMotion) {
      if (intro) intro.remove();
      revealHero();
    } else {
      gsap.set(heroLines, { yPercent: 115 });
      var tl = gsap.timeline({ onComplete: function () { if (intro) intro.remove(); } });
      tl.fromTo('.intro__mark', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: 'studio' })
        .to('.intro__mark', { opacity: 0, y: -10, duration: 0.3, ease: 'studio' }, '+=0.2')
        .to(intro, { opacity: 0, duration: 0.3, ease: 'studio' }, '-=0.1')
        .add(revealHero, '-=0.2');
    }

    if (!reduceMotion) {
      gsap.utils.toArray('[data-reveal]').forEach(function (el) {
        gsap.fromTo(el, { opacity: 0, y: 36 }, {
          opacity: 1, y: 0, duration: 0.85, ease: 'studio',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
      });

      gsap.utils.toArray('.card__media').forEach(function (media) {
        gsap.fromTo(media, { clipPath: 'inset(0 0 100% 0)' }, {
          clipPath: 'inset(0 0 0% 0)', duration: 1, ease: 'studio',
          scrollTrigger: { trigger: media, start: 'top 85%', once: true }
        });
      });

      if (!isMobile) {
        gsap.utils.toArray('.card').forEach(function (card) {
          var layer = card.querySelector('.card__parallax');
          if (!layer) return;
          gsap.fromTo(layer, { yPercent: -5 }, {
            yPercent: 5, ease: 'none',
            scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true }
          });
        });
      }
    }

    var cursor = document.getElementById('cursor');
    if (cursor && finePointer && !reduceMotion) {
      gsap.set(cursor, { xPercent: -50, yPercent: -50, opacity: 0 });
      var xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3.out' });
      var yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3.out' });
      var cursorShown = false;
      window.addEventListener('mousemove', function (e) {
        if (!cursorShown) { cursorShown = true; gsap.to(cursor, { opacity: 1, duration: 0.25 }); }
        xTo(e.clientX); yTo(e.clientY);
      });
      document.addEventListener('mouseover', function (e) {
        if (e.target.closest('[data-cursor="view"]')) cursor.classList.add('is-view');
      });
      document.addEventListener('mouseout', function (e) {
        if (e.target.closest('[data-cursor="view"]')) cursor.classList.remove('is-view');
      });
      document.addEventListener('mouseleave', function () { gsap.to(cursor, { opacity: 0, duration: 0.2 }); });
      document.addEventListener('mouseenter', function () { gsap.to(cursor, { opacity: 1, duration: 0.2 }); });
    } else if (cursor) {
      cursor.remove();
    }

    var magnet = document.getElementById('discordBtn');
    if (magnet && finePointer && !reduceMotion) {
      magnet.addEventListener('mousemove', function (e) {
        var r = magnet.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        gsap.to(magnet, { x: dx * 0.22, y: dy * 0.22, duration: 0.6, ease: 'studio' });
      });
      magnet.addEventListener('mouseleave', function () {
        gsap.to(magnet, { x: 0, y: 0, duration: 0.7, ease: 'studio' });
      });
    }

    if (window.MyScenes) window.MyScenes.start();
    ScrollTrigger.refresh();
  }

  if (window.__termsAccepted) initMotion();
  else {
    window.addEventListener('site:unlocked', initMotion, { once: true });
    if (!document.getElementById('gate')) initMotion();
  }

  /* ---------- Project dialog ---------- */
  var projects = {
    plugins: {
      category: 'Minecraft · Service',
      title: 'Custom Server Plugins',
      meta: 'Spigot / Paper · Your version · Ongoing',
      desc: 'Bespoke server plugins built for your SMP or network. You describe the feature and the exact Minecraft version; I build it, test it live, and only then take payment.',
      list: ['Commands, economies, kits, warps, custom items', 'Version-specific builds (no one-size-fits-all)', 'Tested on a live server before delivery', 'Pure added functionality — no drawn packs'],
      price: '$10–20 depending on scope'
    },
    mods: {
      category: 'Minecraft · Service',
      title: 'Custom Minecraft Mods',
      meta: 'Forge / Fabric · Your version · Ongoing',
      desc: 'Custom mods that add the mechanics, items or systems you want. Built to your specified version and shown working before you pay.',
      list: ['New items, blocks, mechanics and systems', 'Forge or Fabric, matched to your version', 'Live demo / test before payment', 'Clean, functional additions only'],
      price: '$10–20 depending on scope'
    },
    websites: {
      category: 'Web · Non-hosted',
      title: 'Website Structure',
      meta: 'HTML / CSS / JS · Front-end · Ongoing',
      desc: 'Clean, responsive website structures built to your layout. Delivered as ready-to-deploy front-end files — hosting is not included, so you stay in control.',
      list: ['Responsive, hand-coded front-end', 'Portfolio, landing or server sites', 'Delivered as files, ready to host anywhere', 'Built and previewed before payment'],
      price: '$10–20 depending on scope'
    },
    smp: {
      category: 'Past work',
      title: 'SMP Plugin Commissions',
      meta: '5 custom plugins · Delivered',
      desc: 'A run of custom plugins commissioned for SMP servers — each one scoped to the owner’s version and rules, built first, tested, then handed over after payment.',
      list: ['5 custom plugins delivered', 'Scoped per server and version', 'Tested before payment, every time', 'Pure added functionality — no drawn packs'],
      price: '$10–20 depending on scope'
    }
  };

  var dialog = document.getElementById('projectDialog');
  var dCategory = document.getElementById('dialogCategory');
  var dTitle = document.getElementById('dialogTitle');
  var dMeta = document.getElementById('dialogMeta');
  var dDesc = document.getElementById('dialogDesc');
  var dList = document.getElementById('dialogList');
  var dPrice = document.getElementById('dialogPrice');

  function openProject(key) {
    var p = projects[key];
    if (!p || !dialog) return;
    dCategory.textContent = p.category;
    dTitle.textContent = p.title;
    dMeta.textContent = p.meta;
    dDesc.textContent = p.desc;
    dPrice.textContent = p.price;
    dList.innerHTML = '';
    p.list.forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      dList.appendChild(li);
    });
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    if (lenis) lenis.stop();
  }
  function closeDialog() {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    if (lenis) lenis.start();
  }

  document.querySelectorAll('[data-project]').forEach(function (card) {
    card.addEventListener('click', function () { openProject(card.dataset.project); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProject(card.dataset.project); }
    });
  });
  var closeBtn = document.getElementById('dialogClose');
  if (closeBtn) closeBtn.addEventListener('click', closeDialog);
  if (dialog) {
    dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDialog(); });
    dialog.addEventListener('close', function () { if (lenis) lenis.start(); });
  }

  /* ---------- Copy Discord + toast (clipboard only, on click) ---------- */
  var toast = document.getElementById('toast');
  var toastTimer;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }
  function copyDiscord() {
    var handle = 'myfawlt';
    function done() {
      showToast('Copied — Discord: ' + handle);
      var hint = document.getElementById('discordHint');
      if (hint) { hint.textContent = 'Copied!'; setTimeout(function () { hint.textContent = 'Click to copy'; }, 2200); }
      var cta = document.getElementById('dialogCta');
      if (cta && dialog && dialog.open) { cta.textContent = 'Copied!'; setTimeout(function () { cta.textContent = 'Copy Discord: myfawlt'; }, 2200); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(handle).then(done).catch(function () { fallbackCopy(handle, done); });
    } else fallbackCopy(handle, done);
  }
  function fallbackCopy(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); cb(); } catch (e) { showToast('Discord: ' + text); }
    document.body.removeChild(ta);
  }
  var discordBtn = document.getElementById('discordBtn');
  if (discordBtn) discordBtn.addEventListener('click', copyDiscord);
  var dialogCta = document.getElementById('dialogCta');
  if (dialogCta) dialogCta.addEventListener('click', copyDiscord);

  /* ---------- Live local time + year ---------- */
  var clock = document.getElementById('clock');
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  function tick() {
    if (!clock) return;
    var now = new Date();
    clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    clock.setAttribute('datetime', now.toISOString());
  }
  tick();
  setInterval(tick, 1000);

  window.addEventListener('load', function () { if (started) ScrollTrigger.refresh(); });
})();
