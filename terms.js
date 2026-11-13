/* Terms gate — in-memory only. No cookies, no storage, no network. */
(function () {
  'use strict';

  var gate = document.getElementById('gate');
  if (!gate) {
    window.__termsAccepted = true;
    window.dispatchEvent(new CustomEvent('site:unlocked'));
    return;
  }

  var scrollBox = document.getElementById('gateScroll');
  var bar = document.getElementById('gateBar');
  var hint = document.getElementById('gateHint');
  var check = document.getElementById('gateCheck');
  var accept = document.getElementById('gateAccept');
  var decline = document.getElementById('gateDecline');
  var closeBtn = document.getElementById('gateClose');
  var openBtn = document.getElementById('termsOpen');
  var title = document.getElementById('gateTitle');
  var desc = document.getElementById('gateDesc');

  var accepted = false;
  var reviewMode = false;
  var reachedEnd = false;
  var lastFocus = null;
  var background = [document.getElementById('nav'), document.querySelector('main'), document.querySelector('footer')];

  function setBackgroundInert(on) {
    background.forEach(function (el) {
      if (!el) return;
      if (on) {
        el.setAttribute('inert', '');
        el.setAttribute('aria-hidden', 'true');
      } else {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      }
    });
  }

  function lock() {
    document.body.classList.add('locked');
    setBackgroundInert(true);
    gate.hidden = false;
    window.dispatchEvent(new CustomEvent('site:locked'));
  }

  function unlock() {
    document.body.classList.remove('locked');
    setBackgroundInert(false);
    gate.hidden = true;
    window.dispatchEvent(new CustomEvent('site:unlocked'));
  }

  function focusables() {
    return Array.prototype.slice.call(
      gate.querySelectorAll('button:not([hidden]):not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')
    ).filter(function (el) { return el.offsetParent !== null || el === scrollBox; });
  }

  function trapTab(e) {
    if (e.key !== 'Tab') return;
    var items = focusables();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function updateProgress() {
    var max = scrollBox.scrollHeight - scrollBox.clientHeight;
    var pct = max <= 0 ? 1 : Math.min(1, Math.max(0, scrollBox.scrollTop / max));
    if (bar) bar.style.width = (pct * 100).toFixed(1) + '%';
    if (!reachedEnd && pct >= 0.995) {
      reachedEnd = true;
      check.disabled = false;
      if (hint) hint.textContent = 'You can now confirm the agreement.';
    }
  }

  function updateAccept() {
    accept.disabled = !(reachedEnd && check.checked);
  }

  function openInitial() {
    reviewMode = false;
    gate.classList.remove('gate--review');
    title.textContent = 'Read first.';
    desc.textContent = 'This site sets no cookies, runs no analytics, and stores nothing about you. To view the work, read and accept the terms below. If you do not agree, please close the page.';
    closeBtn.hidden = true;
    accept.hidden = false;
    decline.hidden = false;
    check.parentElement.hidden = false;
    if (hint) hint.hidden = false;
    lock();
    updateProgress();
    setTimeout(function () { scrollBox.focus(); }, 30);
  }

  function openReview() {
    if (!accepted) { openInitial(); return; }
    reviewMode = true;
    lastFocus = document.activeElement;
    gate.classList.add('gate--review');
    title.textContent = 'Terms & privacy';
    desc.textContent = 'This is the agreement you accepted for this page view. Nothing is stored; refreshing will ask again.';
    closeBtn.hidden = false;
    accept.hidden = true;
    decline.hidden = true;
    check.parentElement.hidden = true;
    if (hint) hint.hidden = true;
    lock();
    setTimeout(function () { closeBtn.focus(); }, 30);
  }

  function closeReview() {
    if (!reviewMode) return;
    reviewMode = false;
    unlock();
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  scrollBox.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  check.addEventListener('change', updateAccept);

  accept.addEventListener('click', function () {
    if (accept.disabled) return;
    accepted = true;
    window.__termsAccepted = true;
    unlock();
    var brand = document.querySelector('.nav__brand');
    if (brand) brand.focus();
  });

  decline.addEventListener('click', function () {
    if (hint) {
      hint.hidden = false;
      hint.textContent = 'You must accept to view the site. You can close this page, or message me on Discord (myfawlt) with questions.';
    }
    decline.disabled = true;
    setTimeout(function () { decline.disabled = false; }, 1200);
  });

  closeBtn.addEventListener('click', closeReview);
  if (openBtn) openBtn.addEventListener('click', openReview);

  gate.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && reviewMode) { e.preventDefault(); closeReview(); return; }
    trapTab(e);
  });

  // Initialize locked state.
  accepted = false;
  window.__termsAccepted = false;
  check.disabled = true;
  accept.disabled = true;
  openInitial();
})();
