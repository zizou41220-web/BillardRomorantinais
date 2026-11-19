/* ===== Constructeur QR Code (Admin) & Menu Smartphone Public (?menu=1) ===== */
(function () {
  'use strict';

  const STORAGE_KEY = 'bbr_menu_du_jour_v1';
  let menuDrinks = [];
  let menuConfig = {
    includeAll: true,
    selectedIds: [],
    title: 'Menu du Jour'
  };
  let activeCat = 'all';
  let searchText = '';
  let lastUpdated = null;
  let qrGenerated = false;

  const isPublicMode = () =>
    window.location.search.includes('menu=1') || window.location.hash === '#menu';

  const eur = n => (parseFloat(n) || 0).toFixed(2).replace('.', ',') + ' €';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getMenuUrl() {
    const customInput = document.getElementById('mb-custom-qr-url');
    if (customInput && customInput.value.trim()) {
      return customInput.value.trim();
    }
    const base = window.location.origin && window.location.origin !== 'null'
      ? window.location.origin + window.location.pathname
      : window.location.href.split('?')[0].split('#')[0];
    return base + '?menu=1';
  }

  function isLocalHost() {
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || window.location.protocol === 'file:';
  }

  function catOf(d) {
    try { if (typeof getItemCategory === 'function') return getItemCategory(d); } catch (e) { /* ignore */ }
    return d.category === 'billard' ? 'billard' : 'bar';
  }

  async function fetchMenuData() {
    if (!window.supabaseClient) return;
    try {
      const [drinksRes, settingsRes] = await Promise.all([
        window.supabaseClient.from('drinks').select('*').order('name', { ascending: true }),
        window.supabaseClient.from('settings').select('*').eq('id', 1).maybeSingle()
      ]);

      if (!drinksRes.error && drinksRes.data) {
        menuDrinks = drinksRes.data.filter(d => {
          if (d.archived) return false;
          const n = (d.name || '').toLowerCase();
          if (n.includes('adhésion') || n.includes('adhesion') || n.includes('abonnement')) return false;
          return catOf(d) !== 'billard';
        });
      }

      if (!settingsRes.error && settingsRes.data && settingsRes.data.menu_du_jour) {
        const raw = settingsRes.data.menu_du_jour;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        menuConfig = Object.assign({
          includeAll: true,
          selectedIds: [],
          title: 'Menu du Jour'
        }, parsed || {});
      } else {
        try {
          const cached = localStorage.getItem(STORAGE_KEY);
          if (cached) menuConfig = Object.assign(menuConfig, JSON.parse(cached));
        } catch (e) { /* ignore */ }
      }
      lastUpdated = new Date();
    } catch (err) {
      console.warn('Erreur chargement Menu Smartphone :', err);
    }
  }

  /* =====================================================================
     1. PAGE ADMIN : CONSTRUCTION & IMPRESSION DU QR CODE (#adm-menu)
     ===================================================================== */
  function renderAdminBuilder() {
    const root = document.getElementById('menu-admin-builder-root');
    if (!root) return;

    const url = getMenuUrl();
    const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=' + encodeURIComponent(url);
    const selectedSet = new Set((menuConfig.selectedIds || []).map(String));

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:1rem; flex-wrap:wrap; margin-bottom:1.25rem;">
        <div>
          <h3 style="margin:0; display:flex; align-items:center; gap:0.5rem;">
            📲 Menu Smartphone & QR Code
          </h3>
          <p style="margin:4px 0 0; font-size:0.86rem; color:var(--text-muted);">
            Les articles, prix et stocks proviennent directement d'<strong>Articles & Stocks</strong>. Choisissez tout ou partie de la carte et générez le QR Code.
          </p>
        </div>
        <a href="${esc(url)}" target="_blank" class="menu-admin-btn" style="text-decoration:none;">
          👁️ Aperçu Smartphone
        </a>
      </div>

      <div class="menu-builder-grid">
        <!-- Colonne gauche : sélection depuis Articles & Stocks -->
        <div class="menu-builder-panel">
          <h4> Choix des articles (Articles & Stocks)</h4>

          <div style="margin-bottom:0.9rem;">
            <label style="font-size:0.82rem; color:var(--text-muted); display:block; margin-bottom:0.3rem;">Titre affiché sur le téléphone</label>
            <input type="text" id="mb-day-title" value="${esc(menuConfig.title || 'Menu du Jour')}"
              placeholder="Ex: Menu du Jour — Tournoi"
              style="width:100%; background:rgba(255,255,255,0.07); border:1px solid var(--border); border-radius:8px; padding:0.55rem 0.75rem; color:var(--text-main); font-family:inherit;">
          </div>

          <label style="display:flex; align-items:center; gap:0.6rem; cursor:pointer; font-weight:700; padding:0.55rem 0.75rem; background:rgba(229,179,65,0.1); border:1px solid rgba(229,179,65,0.35); border-radius:10px;">
            <input type="checkbox" id="mb-include-all" style="width:18px; height:18px; accent-color:var(--accent-gold);" ${menuConfig.includeAll !== false ? 'checked' : ''}>
            <span>Prendre la totalité des articles (${menuDrinks.length} articles)</span>
          </label>

          <div id="mb-pick-wrap" class="${menuConfig.includeAll !== false ? 'hidden' : ''}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:0.7rem; gap:0.5rem; flex-wrap:wrap;">
              <span style="font-size:0.8rem; color:var(--text-muted);">Cochez les articles à afficher dans le Menu du Jour :</span>
              <div style="display:flex; gap:0.4rem;">
                <button type="button" class="menu-admin-btn" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="selectAllMenuDrinks(true)">Tout cocher</button>
                <button type="button" class="menu-admin-btn" style="padding:0.25rem 0.6rem; font-size:0.75rem;" onclick="selectAllMenuDrinks(false)">Tout décocher</button>
              </div>
            </div>
            <div class="menu-pick-list">
              ${menuDrinks.map(d => `
                <label class="menu-pick-item">
                  <input type="checkbox" class="mb-drink-cb" value="${esc(d.id)}" ${selectedSet.has(String(d.id)) ? 'checked' : ''}>
                  <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(d.name)} — <strong>${eur(d.price)}</strong></span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Colonne droite : Génération & Impression QR Code -->
        <div class="menu-builder-panel" style="text-align:center;">
                    <button type="button" class="menu-admin-btn primary" style="width:100%; justify-content:center; padding:0.75rem 1rem; font-size:0.95rem;" onclick="generateAndSaveMenuQr()">
            📲 Valider & Générer le QR Code
          </button>

          <div id="mb-qr-result" class="${qrGenerated ? '' : 'hidden'}" style="margin-top:1rem;">
            ${isLocalHost() ? `
              <div style="background:rgba(245,158,11,0.14); border:1px solid rgba(245,158,11,0.45); color:#fde68a; border-radius:10px; padding:0.65rem 0.8rem; font-size:0.78rem; text-align:left; margin-bottom:0.75rem;">
                ⚠️ <strong>Mode local détecté :</strong> un téléphone ne peut pas ouvrir une adresse en <code>localhost</code>. Une fois l'application en ligne (ou en remplaçant <code>localhost</code> par l'IP Wi-Fi de ce PC ci-dessous), le scan ouvrira directement la page sur smartphone.
              </div>
            ` : ''}
            <div style="text-align:left; margin-bottom:0.75rem;">
              <label style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:0.25rem;">Adresse encodée dans le QR Code :</label>
              <input type="text" id="mb-custom-qr-url" value="${esc(url)}"
                oninput="updateQrPreviewFromInput()"
                style="width:100%; background:rgba(255,255,255,0.07); border:1px solid var(--border); border-radius:8px; padding:0.45rem 0.65rem; color:var(--text-main); font-size:0.78rem;">
            </div>
            <div class="menu-qr-box">
              <strong style="font-size:0.98rem;">🎱 Billard Blackball Romorantinais</strong>
              <div style="font-size:0.78rem; color:#475569; margin-top:2px;">Scannez pour voir le Menu du Jour en temps réel</div>
              <img id="mb-qr-img" src="${qrGenerated ? qrSrc : ''}" alt="QR Code Menu">
              <div id="mb-qr-url-label" style="font-size:0.7rem; color:#64748b; word-break:break-all;">${esc(url)}</div>
            </div>
            <div style="display:flex; gap:0.6rem; justify-content:center; flex-wrap:wrap; margin-top:0.75rem;">
              <button type="button" class="menu-admin-btn primary" onclick="printMenuQrPoster()">
                🖨️ Imprimer le QR Code
              </button>
              <button type="button" class="menu-admin-btn" onclick="copyMenuQrUrl()">
                📋 Copier le lien
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    root.innerHTML = html;

    const incAll = document.getElementById('mb-include-all');
    if (incAll) {
      incAll.onchange = () => {
        menuConfig.includeAll = incAll.checked;
        document.getElementById('mb-pick-wrap')?.classList.toggle('hidden', incAll.checked);
      };
    }
  }

  window.selectAllMenuDrinks = function (checked) {
    document.querySelectorAll('.mb-drink-cb').forEach(cb => { cb.checked = checked; });
  };

  window.generateAndSaveMenuQr = async function () {
    const incAll = document.getElementById('mb-include-all');
    menuConfig.includeAll = incAll ? incAll.checked : true;
    menuConfig.title = document.getElementById('mb-day-title')?.value.trim() || 'Menu du Jour';

    const cbs = document.querySelectorAll('.mb-drink-cb');
    menuConfig.selectedIds = Array.from(cbs).filter(c => c.checked).map(c => c.value);

    if (!menuConfig.includeAll && menuConfig.selectedIds.length === 0) {
      alert('⚠️ Veuillez cocher au moins un article (ou cocher « Prendre la totalité des articles »).');
      return;
    }

    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(menuConfig)); } catch (e) { /* ignore */ }

    if (window.supabaseClient) {
      const { error } = await window.supabaseClient
        .from('settings')
        .upsert({ id: 1, menu_du_jour: menuConfig });
      if (error) {
        alert('⚠️ QR Code généré localement, mais erreur Supabase : ' + error.message + '\n\nExécutez setup_menu_smartphone.sql sur Supabase pour le partage en temps réel.');
      } else {
        alert('✅ Menu enregistré et QR Code prêt à imprimer !');
      }
    }

    qrGenerated = true;
    renderAdminBuilder();
  };

  window.updateQrPreviewFromInput = function () {
    const url = getMenuUrl();
    const img = document.getElementById('mb-qr-img');
    const lbl = document.getElementById('mb-qr-url-label');
    if (img) img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=' + encodeURIComponent(url);
    if (lbl) lbl.textContent = url;
  };

  window.copyMenuQrUrl = function () {
    const url = getMenuUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => alert('✅ Lien copié !'));
    } else {
      prompt('Copiez ce lien :', url);
    }
  };

  window.printMenuQrPoster = function () {
    const url = getMenuUrl();
    const qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=12&data=' + encodeURIComponent(url);
    const title = menuConfig.title || 'Menu du Jour';
    const w = window.open('', '_blank', 'width=720,height=900');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Affiche QR Code Menu</title>
      <style>
        body{font-family:sans-serif;text-align:center;padding:40px 24px;color:#0a2540;}
        .card{border:4px solid #e5b341;border-radius:24px;padding:36px 24px;max-width:520px;margin:0 auto;}
        h1{font-size:28px;margin:0 0 8px;} h2{font-size:20px;color:#b45309;margin:0 0 12px;}
        p{color:#475569;font-size:16px;margin:0 0 24px;}
        img.qr{width:300px;height:300px;border:1px solid #cbd5e1;border-radius:16px;padding:10px;}
        .url{font-size:12px;color:#64748b;margin-top:16px;word-break:break-all;}
      </style></head><body>
      <div class="card">
        <h1>🎱 Billard Blackball Romorantinais</h1>
        <h2>${esc(title)}</h2>
        <p>Scannez ce QR Code avec votre téléphone pour découvrir les boissons, casse-croûtes et disponibilités en temps réel !</p>
        <img class="qr" src="${qrSrc}" onload="setTimeout(function(){window.print();},250)">
        <div class="url">${esc(url)}</div>
      </div></body></html>`);
    w.document.close();
  };

  /* =====================================================================
     2. PAGE PUBLIQUE SMARTPHONE (?menu=1) — LORSQU'ON SCANNE LE QR CODE
     ===================================================================== */
  function renderPublicMenu() {
    const root = document.getElementById('public-menu-view');
    if (!root) return;

    const timeStr = lastUpdated
      ? lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : '';

    const selectedSet = new Set((menuConfig.selectedIds || []).map(String));
    const allowedDrinks = (menuConfig.includeAll !== false)
      ? menuDrinks
      : menuDrinks.filter(d => selectedSet.has(String(d.id)));

    const q = searchText.trim().toLowerCase();
    const filtered = allowedDrinks.filter(d => {
      if (activeCat !== 'all' && catOf(d) !== activeCat) return false;
      if (q && !(d.name || '').toLowerCase().includes(q)) return false;
      return true;
    });

    const barItems = filtered.filter(d => catOf(d) === 'bar');
    const otherItems = filtered.filter(d => catOf(d) === 'billard');

    const renderCard = d => {
      const track = d.track_stock !== false && d.stock !== null && d.stock !== undefined;
      let dispoHtml = '<span class="menu-dispo ok">● Disponible</span>';
      let soldOut = false;
      if (track) {
        if (d.stock <= 0) {
          dispoHtml = '<span class="menu-dispo out">● Épuisé</span>';
          soldOut = true;
        } else if (d.stock <= 5) {
          dispoHtml = `<span class="menu-dispo low">● Plus que ${d.stock}</span>`;
        } else {
          dispoHtml = `<span class="menu-dispo ok">● Disponible (${d.stock})</span>`;
        }
      }
      const imgHtml = d.image_url
        ? `<img src="${esc(d.image_url)}" alt="${esc(d.name)}">`
        : `<span style="font-size:1.6rem;">${catOf(d) === 'billard' ? '🎱' : '🍹'}</span>`;

      return `
        <div class="menu-item-card ${soldOut ? 'sold-out' : ''}">
          <div class="menu-item-img">${imgHtml}</div>
          <div class="menu-item-info">
            <div class="menu-item-name">${esc(d.name)}</div>
            <div class="menu-item-meta">
              <span class="menu-item-price">${eur(d.price)}</span>
              ${dispoHtml}
            </div>
          </div>
        </div>
      `;
    };

    const hasBar = allowedDrinks.some(d => catOf(d) === 'bar');
    const hasBillard = allowedDrinks.some(d => catOf(d) === 'billard');

    let html = `<div class="menu-page-wrap">`;
    html += `
      <div class="menu-hero">
        <div class="menu-hero-brand">
          <img src="Logo.jpg" alt="Logo" class="menu-hero-logo" onerror="this.style.display='none'">
          <div>
            <h2>${esc(menuConfig.title || 'Menu du Jour')}</h2>
            <div class="menu-hero-sub">
              <span class="menu-live-pill"><span class="menu-live-dot"></span> En direct ${timeStr ? '· ' + timeStr : ''}</span>
              <span>Billard Blackball Romorantinais</span>
            </div>
          </div>
        </div>
        <button type="button" class="menu-admin-btn" id="menu-pub-refresh">🔄 Actualiser</button>
      </div>

      <div class="menu-controls">
        ${(hasBar && hasBillard) ? `
          <div class="menu-tabs">
            <button type="button" class="menu-tab ${activeCat === 'all' ? 'active' : ''}" data-cat="all">Tout</button>
            <button type="button" class="menu-tab ${activeCat === 'bar' ? 'active' : ''}" data-cat="bar">🍹 Bar & Casse-croûte</button>
            <button type="button" class="menu-tab ${activeCat === 'billard' ? 'active' : ''}" data-cat="billard">🎱 Matériel Billard</button>
          </div>
        ` : ''}
        <input type="search" class="menu-search" id="menu-pub-search" placeholder="🔍 Rechercher..." value="${esc(searchText)}">
      </div>
    `;

    if (filtered.length === 0) {
      html += `<div style="text-align:center; padding:2rem; color:var(--text-muted);">Aucun article trouvé.</div>`;
    } else {
      if (barItems.length > 0) {
        html += `<div class="menu-section-label">🍹 Bar, Boissons & Casse-croûte (${barItems.length})</div>`;
        html += `<div class="menu-items-grid">${barItems.map(renderCard).join('')}</div>`;
      }
      if (otherItems.length > 0) {
        html += `<div class="menu-section-label">🎱 Matériel Billard (${otherItems.length})</div>`;
        html += `<div class="menu-items-grid">${otherItems.map(renderCard).join('')}</div>`;
      }
    }

    html += `
      <div style="text-align:center; margin-top:2rem; padding-top:1rem; border-top:1px solid var(--border); font-size:0.82rem; color:var(--text-muted);">
        Pour commander, adressez-vous au comptoir du bar.<br>
        <a href="${esc(window.location.pathname)}" style="color:var(--accent-gold); text-decoration:none; display:inline-block; margin-top:0.5rem;">🔐 Accès membre / Connexion</a>
      </div>
    </div>`;

    root.innerHTML = html;

    root.querySelectorAll('.menu-tab').forEach(btn => {
      btn.onclick = () => { activeCat = btn.dataset.cat; renderPublicMenu(); };
    });

    const searchInput = document.getElementById('menu-pub-search');
    if (searchInput) {
      searchInput.oninput = e => {
        searchText = e.target.value;
        const pos = e.target.selectionStart;
        renderPublicMenu();
        const again = document.getElementById('menu-pub-search');
        if (again) { again.focus(); again.setSelectionRange(pos, pos); }
      };
    }

    const refBtn = document.getElementById('menu-pub-refresh');
    if (refBtn) {
      refBtn.onclick = async () => {
        refBtn.textContent = '⏳ Chargement...';
        await fetchMenuData();
        renderPublicMenu();
      };
    }
  }

  /* ---------- Initialisation ---------- */
  document.addEventListener('DOMContentLoaded', async () => {
    if (isPublicMode()) {
      document.getElementById('login-view')?.classList.add('hidden');
      document.getElementById('app-shell')?.classList.add('hidden');
      document.getElementById('loading')?.classList.add('hidden');
      const pub = document.getElementById('public-menu-view');
      if (pub) {
        pub.classList.remove('hidden');
        pub.innerHTML = '<div style="text-align:center; padding:3rem; color:var(--text-muted);">⏳ Chargement du menu...</div>';
        await fetchMenuData();
        renderPublicMenu();
      }
      return;
    }

    const pane = document.getElementById('adm-menu');
    if (pane) {
      let was = pane.classList.contains('active');
      const openBuilder = async () => {
        await fetchMenuData();
        renderAdminBuilder();
      };
      if (was) openBuilder();
      new MutationObserver(() => {
        const now = pane.classList.contains('active');
        if (now && !was) openBuilder();
        was = now;
      }).observe(pane, { attributes: true, attributeFilter: ['class'] });
    }
  });
})();
