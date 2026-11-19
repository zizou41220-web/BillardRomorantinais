/* ===== Tableau de bord statistiques : chiffres clés + classement des articles ===== */
(function () {
  'use strict';

  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  let allRows = [];
  let state = { period: 'cur', cat: 'all', showAll: false };
  let root = null;

  const eur = n => (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' €';
  const monthStart = (y, m) => new Date(y, m, 1);

  function periodRange(key) {
    const now = new Date();
    let y = now.getFullYear(), m = now.getMonth(), span = 1, start;
    if (key === 'cur') { start = monthStart(y, m); }
    else if (key === 'prev') { start = monthStart(y, m - 1); }
    else if (key === '3m') { start = monthStart(y, m - 2); span = 3; }
    else if (key === 'year') { start = monthStart(y, 0); span = 12; }
    else if (key === 'all') { return { start: null, end: null, prevStart: null, prevEnd: null, label: 'Toute la période' }; }
    else { // 'YYYY-MM'
      const p = key.split('-');
      start = monthStart(parseInt(p[0], 10), parseInt(p[1], 10) - 1);
    }
    const end = new Date(start.getFullYear(), start.getMonth() + span, 1);
    const prevStart = new Date(start.getFullYear(), start.getMonth() - span, 1);
    let prevEnd = start;
    // Période en cours : on compare au même nombre de jours écoulés (ex. du 1er au 18)
    if (now >= start && now < end) {
      const cut = new Date(now.getFullYear(), now.getMonth() - span, now.getDate() + 1);
      if (cut < prevEnd) prevEnd = cut;
    }
    const d2 = function (d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); };
    const lastDay = new Date(prevEnd.getTime() - 86400000);
    const cmp = 'vs ' + d2(prevStart) + ' → ' + d2(lastDay);
    let label;
    if (span === 1) label = MONTHS[start.getMonth()] + ' ' + start.getFullYear();
    else if (key === 'year') label = 'Année ' + start.getFullYear();
    else label = '3 derniers mois';
    return { start: start, end: end, prevStart: prevStart, prevEnd: prevEnd, label: label, cmp: cmp };
  }

  function catOf(d) {
    if (!d) return 'bar';
    try { if (typeof getItemCategory === 'function') return getItemCategory(d); } catch (e) { /* ignore */ }
    return d.category === 'billard' ? 'billard' : 'bar';
  }

  function aggregate(from, to, cat) {
    const items = {};
    let qty = 0, revenue = 0;
    allRows.forEach(function (r) {
      const t = new Date(r.created_at);
      if (from && (t < from || t >= to)) return;
      const d = r.drinks;
      if (cat !== 'all' && catOf(d) !== cat) return;
      const q = r.quantity || 1;
      const price = (r.price_at_time !== null && r.price_at_time !== undefined) ? r.price_at_time : ((d && d.price) || 0);
      const key = d ? (d.id + '') : 'inconnu';
      if (!items[key]) items[key] = { name: d ? d.name : 'Article supprimé', img: d ? d.image_url : null, qty: 0, revenue: 0 };
      items[key].qty += q;
      items[key].revenue += price * q;
      qty += q;
      revenue += price * q;
    });
    const list = Object.keys(items).map(function (k) { return items[k]; }).sort(function (a, b) { return b.qty - a.qty; });
    return { qty: qty, revenue: revenue, list: list };
  }

  function variation(cur, prev) {
    if (!prev) return cur ? '<span class="vs-up">Nouveau</span>' : '<span class="vs-flat">—</span>';
    const pct = Math.round((cur - prev) / prev * 100);
    if (pct > 0) return '<span class="vs-up">▲ +' + pct + ' %</span>';
    if (pct < 0) return '<span class="vs-down">▼ ' + pct + ' %</span>';
    return '<span class="vs-flat">= stable</span>';
  }

  function availableMonths() {
    const set = {};
    allRows.forEach(function (r) {
      const d = new Date(r.created_at);
      set[d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')] = true;
    });
    return Object.keys(set).sort().reverse();
  }

  function build() {
    const pane = document.getElementById('adm-stats');
    if (!pane) return false;
    if (document.getElementById('vie-stats')) { root = document.getElementById('vie-stats'); return true; }

    root = document.createElement('div');
    root.id = 'vie-stats';
    pane.appendChild(root);

    return true;
  }

  function render() {
    if (!root) return;
    const rng = periodRange(state.period);
    const cur = aggregate(rng.start, rng.end, state.cat);
    const prev = rng.prevStart ? aggregate(rng.prevStart, rng.prevEnd, state.cat) : null;

    const monthsOpts = availableMonths().map(function (k) {
      const p = k.split('-');
      return '<option value="' + k + '"' + (state.period === k ? ' selected' : '') + '>' + MONTHS[parseInt(p[1], 10) - 1] + ' ' + p[0] + '</option>';
    }).join('');

    const sel = function (v, t) { return '<option value="' + v + '"' + (state.period === v ? ' selected' : '') + '>' + t + '</option>'; };
    const chip = function (v, t) { return '<button type="button" class="vs-chip' + (state.cat === v ? ' active' : '') + '" data-cat="' + v + '">' + t + '</button>'; };

    const top = cur.list[0];
    const shown = state.showAll ? cur.list : cur.list.slice(0, 10);
    const max = cur.list.length ? cur.list[0].qty : 1;
    const medal = ['🥇', '🥈', '🥉'];

    let html = '';
    html += '<div class="vs-head"><h3>🏆 Tableau de bord — ' + rng.label + '</h3><div class="vs-controls">' +
      '<select id="vs-period">' +
      sel('cur', 'Mois en cours') + sel('prev', 'Mois précédent') + sel('3m', '3 derniers mois') + sel('year', 'Année en cours') + sel('all', 'Tout') +
      (monthsOpts ? '<optgroup label="Un mois précis">' + monthsOpts + '</optgroup>' : '') +
      '</select>' +
      '<div class="vs-chips">' + chip('all', 'Tout') + chip('bar', '🍹 Bar') + chip('billard', '🎱 Autres') + '</div>' +
      '</div></div>';

    html += '<div class="vs-kpis">' +
      '<div class="vs-kpi"><div class="vs-label">Consommations</div><div class="vs-value">' + cur.qty + '</div><div class="vs-sub">' +
        (prev ? variation(cur.qty, prev.qty) + ' ' + rng.cmp : 'articles servis') + '</div></div>' +
      '<div class="vs-kpi"><div class="vs-label">Chiffre d\'affaires</div><div class="vs-value">' + eur(cur.revenue) + '</div><div class="vs-sub">' +
        (prev ? variation(cur.revenue, prev.revenue) + ' ' + rng.cmp : 'montant des ventes') + '</div></div>' +
      '<div class="vs-kpi"><div class="vs-label">Article n°1</div><div class="vs-top-name">' +
        (top ? '<span class="vs-img" style="width:38px;height:38px;">' + (top.img ? '<img src="' + String(top.img).replace(/"/g, '&quot;') + '" alt="">' : '🥤') + '</span><span id="vs-top-name"></span>' : '—') +
        '</div><div class="vs-sub">' + (top ? top.qty + ' vendus · ' + eur(top.revenue) : 'Aucune vente') + '</div></div>' +
      '<div class="vs-kpi"><div class="vs-label">Articles différents</div><div class="vs-value">' + cur.list.length + '</div><div class="vs-sub">vendus sur la période</div></div>' +
      '</div>';

    html += '<div class="vs-rank-title"><span>Classement des articles les plus vendus</span></div>';
    if (!shown.length) {
      html += '<div class="vs-empty">Aucune consommation sur cette période.</div>';
    } else {
      html += shown.map(function (it, i) {
        const img = it.img ? '<img src="' + String(it.img).replace(/"/g, '&quot;') + '" alt="">' : '🥤';
        return '<div class="vs-row" style="--i:' + i + '">' +
          '<div class="vs-pos">' + (medal[i] || (i + 1)) + '</div>' +
          '<div class="vs-img">' + img + '</div>' +
          '<div class="vs-name" data-i="' + i + '"></div>' +
          '<div class="vs-bar-track"><div class="vs-bar" data-w="' + Math.max(3, Math.round(it.qty / max * 100)) + '"></div></div>' +
          '<div class="vs-qty"><strong>' + it.qty + '</strong><small>' + eur(it.revenue) + '</small></div>' +
          '</div>';
      }).join('');
      if (cur.list.length > 10) {
        html += '<div class="vs-more"><button type="button" class="vs-btn" id="vs-more">' +
          (state.showAll ? 'Réduire le classement' : 'Voir les ' + cur.list.length + ' articles') + '</button></div>';
      }
    }
    root.innerHTML = html;

    // Noms insérés en texte (pas en HTML) par sécurité
    root.querySelectorAll('.vs-name').forEach(function (el) { el.textContent = shown[parseInt(el.dataset.i, 10)].name; });
    const tn = root.querySelector('#vs-top-name');
    if (tn && top) tn.textContent = top.name;

    // Animation des barres
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        root.querySelectorAll('.vs-bar').forEach(function (b) { b.style.width = b.dataset.w + '%'; });
      });
    });

    root.querySelector('#vs-period').onchange = function (e) { state.period = e.target.value; state.showAll = false; render(); };
    root.querySelectorAll('.vs-chip').forEach(function (c) { c.onclick = function () { state.cat = c.dataset.cat; state.showAll = false; render(); }; });
    const more = root.querySelector('#vs-more');
    if (more) more.onclick = function () { state.showAll = !state.showAll; render(); };
  }

  async function load(tries) {
    tries = tries || 0;
    if (!build()) return;
    root.innerHTML = '<div class="vs-empty">⏳ Chargement des statistiques…</div>';
    if (!window.supabaseClient) {
      if (tries < 20) setTimeout(function () { load(tries + 1); }, 500);
      else root.innerHTML = '<div class="vs-empty">Connexion à la base indisponible.</div>';
      return;
    }
    try {
      let res = await window.supabaseClient
        .from('consumptions')
        .select('created_at, quantity, price_at_time, drinks(id, name, price, image_url, category)')
        .order('created_at', { ascending: true });
      if (res.error) {
        // repli si la colonne category n'existe pas
        res = await window.supabaseClient
          .from('consumptions')
          .select('created_at, quantity, price_at_time, drinks(id, name, price, image_url)')
          .order('created_at', { ascending: true });
      }
      if (res.error) throw res.error;
      allRows = res.data || [];
      render();
    } catch (err) {
      console.error('Statistiques :', err);
      if (root) root.innerHTML = '<div class="vs-empty">Impossible de charger les statistiques : ' + String(err.message || err).replace(/</g, '&lt;') + '</div>';
    }
  }

  // Charge quand l'onglet Statistiques devient actif
  const wait = setInterval(function () {
    const pane = document.getElementById('adm-stats');
    if (!pane) return;
    clearInterval(wait);
    build();
    let was = pane.classList.contains('active');
    if (was) load();
    new MutationObserver(function () {
      const now = pane.classList.contains('active');
      if (now && !was) load();
      was = now;
    }).observe(pane, { attributes: true, attributeFilter: ['class'] });
  }, 400);
})();
