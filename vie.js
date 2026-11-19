/* ============================================================
   LOT "VIE" — animations & effets visuels (non invasif)
   Aucune modification de la logique de app.js.
   ============================================================ */
(function () {
  'use strict';

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 18. Toasts ---------- */
  function toastBox() {
    let box = document.getElementById('vie-toasts');
    if (!box) {
      box = document.createElement('div');
      box.id = 'vie-toasts';
      document.body.appendChild(box);
    }
    return box;
  }

  function showToast(message, ms) {
    ms = ms || 3800;
    const t = document.createElement('div');
    t.className = 'vie-toast';
    t.style.setProperty('--vie-dur', ms + 'ms');
    t.textContent = message;
    const bar = document.createElement('div');
    bar.className = 'vie-toast-bar';
    t.appendChild(bar);
    toastBox().appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { t.remove(); }, 380);
    }, ms);
  }
  window.vieToast = showToast;

  /* ---------- 12. Célébration (coche + confettis) ---------- */
  function celebrate() {
    if (reduce) return;
    const check = document.createElement('div');
    check.className = 'vie-check';
    check.innerHTML = '<svg viewBox="0 0 64 64"><path d="M14 34 L27 47 L50 20"/></svg>';
    document.body.appendChild(check);
    setTimeout(function () { check.remove(); }, 1150);

    const colors = ['#e5b84b', '#fcd34d', '#10b981', '#ffffff', '#3b82f6', '#ef4444'];
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('div');
      p.className = 'vie-confetti';
      p.style.background = colors[i % colors.length];
      document.body.appendChild(p);
      const angle = Math.random() * Math.PI * 2;
      const speed = 160 + Math.random() * 320;
      const dx = Math.cos(angle) * speed;
      const dy = Math.sin(angle) * speed - 140;
      const rot = (Math.random() - 0.5) * 900;
      const fall = 260 + Math.random() * 260;
      const anim = p.animate([
        { transform: 'translate(' + cx + 'px,' + cy + 'px) rotate(0deg)', opacity: 1 },
        { transform: 'translate(' + (cx + dx * 0.6) + 'px,' + (cy + dy * 0.6) + 'px) rotate(' + rot * 0.6 + 'deg)', opacity: 1, offset: 0.45 },
        { transform: 'translate(' + (cx + dx) + 'px,' + (cy + dy + fall) + 'px) rotate(' + rot + 'deg)', opacity: 0 }
      ], { duration: 1300 + Math.random() * 700, easing: 'cubic-bezier(.2,.6,.4,1)' });
      anim.onfinish = function () { p.remove(); };
    }
  }
  window.vieCelebrate = celebrate;

  /* Les alertes de succès (✅ ...) deviennent des toasts non bloquants + célébration.
     Les alertes d'erreur / d'avertissement restent des alertes natives. */
  const nativeAlert = window.alert.bind(window);
  window.alert = function (msg) {
    const s = String(msg == null ? '' : msg);
    if (s.trim().indexOf('✅') === 0) {
      showToast(s);
      celebrate();
      return;
    }
    return nativeAlert(msg);
  };

  /* ---------- 7. Ripple sur les boutons ---------- */
  document.addEventListener('pointerdown', function (e) {
    if (reduce) return;
    const b = e.target.closest && e.target.closest(
      '.btn, .caisse-btn-mini, .caisse-btn-credit, .caisse-btn-primary, .caisse-member-free, .caisse-member-direct, .caisse-cat-tab'
    );
    if (!b) return;
    const r = b.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2;
    const s = document.createElement('span');
    s.className = 'vie-ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = (e.clientX - r.left - size / 2) + 'px';
    s.style.top = (e.clientY - r.top - size / 2) + 'px';
    b.appendChild(s);
    setTimeout(function () { s.remove(); }, 650);
  }, { passive: true });

  /* ---------- 5. Cascade sur les listes ---------- */
  function cascade(container) {
    if (reduce || !container) return;
    let i = 0;
    Array.prototype.forEach.call(container.children, function (el) {
      el.style.setProperty('--vie-i', Math.min(i++, 20));
      el.classList.add('vie-cascade');
    });
  }
  const cascadeIds = ['drinks-bar-list', 'drinks-billiard-list'];
  cascadeIds.forEach(function (id) {
    const wait = setInterval(function () {
      const el = document.getElementById(id);
      if (!el) return;
      clearInterval(wait);
      let pending = false;
      new MutationObserver(function () {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () {
          pending = false;
          // ne rejoue que si de nouveaux éléments non animés sont arrivés
          const fresh = Array.prototype.some.call(el.children, function (c) { return !c.classList.contains('vie-cascade'); });
          if (fresh) cascade(el);
        });
      }).observe(el, { childList: true });
    }, 400);
  });

  /* ---------- 8. Compteurs animés ---------- */
  const NUM = /-?\d+(?:[.,]\d+)?/;
  function animateNumber(el) {
    if (reduce || el.__vieBusy) return;
    const text = el.textContent;
    const m = text.match(NUM);
    if (!m) return;
    const to = parseFloat(m[0].replace(',', '.'));
    const from = el.__vieLast;
    el.__vieLast = to;
    if (from === undefined || from === to || isNaN(from)) return;
    const decimals = (m[0].split(/[.,]/)[1] || '').length;
    const sep = m[0].indexOf(',') >= 0 ? ',' : '.';
    const start = performance.now(), dur = 700;
    el.__vieBusy = true;
    (function step(now) {
      const k = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      const v = (from + (to - from) * e).toFixed(decimals).replace('.', sep);
      el.textContent = text.replace(NUM, v);
      if (k < 1) requestAnimationFrame(step);
      else { el.textContent = text; el.__vieBusy = false; }
    })(start);
  }
  ['mem-balance', 'mem-credit', 'caisse-total-amount', 'caisse-current-solde'].forEach(function (id) {
    const wait = setInterval(function () {
      const el = document.getElementById(id);
      if (!el) return;
      clearInterval(wait);
      const m = el.textContent.match(NUM);
      el.__vieLast = m ? parseFloat(m[0].replace(',', '.')) : undefined;
      new MutationObserver(function () { animateNumber(el); })
        .observe(el, { childList: true, characterData: true, subtree: true });
    }, 400);
  });

  /* ---------- 10 & 11. Caisse : badge qui pop, tuile qui "bump", ticket qui glisse ---------- */
  const lastQty = {};
  function watchGrid() {
    const grid = document.getElementById('caisse-products-grid');
    if (!grid) return false;
    new MutationObserver(function () {
      grid.querySelectorAll('.caisse-product-tile').forEach(function (tile) {
        const nameEl = tile.querySelector('.caisse-product-name');
        const badge = tile.querySelector('.caisse-product-qty-badge');
        if (!nameEl) return;
        const key = nameEl.textContent;
        const qty = badge ? parseInt(badge.textContent.replace(/\D/g, ''), 10) || 0 : 0;
        const prev = lastQty[key] || 0;
        if (qty > prev && !reduce) {
          if (badge) badge.classList.add('vie-pop');
          tile.classList.add('vie-tile-bump');
        }
        lastQty[key] = qty;
      });
    }).observe(grid, { childList: true });
    return true;
  }

  const seenRows = {};
  function watchTicket() {
    const box = document.getElementById('caisse-ticket-items');
    if (!box) return false;
    new MutationObserver(function () {
      const current = {};
      Array.prototype.forEach.call(box.children, function (row) {
        const key = row.textContent.replace(/\s+/g, ' ').trim().replace(/\d+/g, '#');
        current[key] = true;
        if (!seenRows[key] && !reduce) row.classList.add('vie-slide-in');
      });
      Object.keys(seenRows).forEach(function (k) { delete seenRows[k]; });
      Object.keys(current).forEach(function (k) { seenRows[k] = true; });

      const tot = document.getElementById('caisse-total-amount');
      if (tot && !reduce) {
        tot.classList.remove('vie-total-flash');
        void tot.offsetWidth;
        tot.classList.add('vie-total-flash');
      }
    }).observe(box, { childList: true });
    return true;
  }

  /* ---------- 10. Graphiques : laisser Chart.js v4 gérer son animation native ---------- */

  const waitCaisse = setInterval(function () {
    const a = watchGrid(), b = watchTicket();
    if (a && b) clearInterval(waitCaisse);
  }, 500);

  /* ---------- Bille de billard qui rebondit en fond de la Caisse Bar ---------- */
  if (!reduce) {
    const waitBall = setInterval(function () {
      const pane = document.getElementById('adm-caisse');
      if (!pane) return;
      clearInterval(waitBall);

      let ball = document.getElementById('vie-caisse-ball');
      if (!ball) {
        ball = document.createElement('div');
        ball.id = 'vie-caisse-ball';
        ball.textContent = '8';
        pane.insertBefore(ball, pane.firstChild);
      }

      let x = 40, y = 40, vx = 0.65, vy = 0.48, angle = 0;
      const size = 68;
      let rafId = null;

      function step() {
        if (!pane.classList.contains('active')) {
          rafId = null;
          return;
        }
        const maxX = Math.max(0, pane.clientWidth - size);
        const maxY = Math.max(0, pane.clientHeight - size);
        x += vx;
        y += vy;
        if (x <= 0) { x = 0; vx = Math.abs(vx); }
        else if (x >= maxX) { x = maxX; vx = -Math.abs(vx); }
        if (y <= 0) { y = 0; vy = Math.abs(vy); }
        else if (y >= maxY) { y = maxY; vy = -Math.abs(vy); }
        angle = (angle + 0.55) % 360;
        ball.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotate(' + angle.toFixed(1) + 'deg)';
        rafId = requestAnimationFrame(step);
      }

      function syncBall() {
        if (pane.classList.contains('active') && !rafId) {
          rafId = requestAnimationFrame(step);
        }
      }

      syncBall();
      new MutationObserver(syncBall).observe(pane, { attributes: true, attributeFilter: ['class'] });
    }, 500);
  }
})();
