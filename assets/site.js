// /assets/site.js

(function () {
  // 1) Sprache aus dem Pfad ableiten
  const pathLang = (location.pathname.split('/')[1] || 'de').toLowerCase();
  const SUPPORTED = ['de', 'en', 'it', 'hr', 'fr'];
  const LANG = SUPPORTED.includes(pathLang) ? pathLang : 'de';

  // 2) Dictionary laden
  fetch(`/assets/i18n/${LANG}.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`i18n not found for ${LANG}`);
      return r.json();
    })
    .then((dict) => {
      applyI18n(dict);
      wireCta(dict);
      highlightLang(LANG);
    })
    .catch((err) => {
      console.warn('i18n load failed:', err);
    });

  // 3) Alle data-i18n und data-i18n-attr befüllen
  function applyI18n(dict) {
    // data-i18n (innerText)
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = t(dict, key);
      if (val != null) el.textContent = val;
    });

    // data-i18n-attr="attr:key" (z.B. content:meta.description)
    document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      const spec = el.getAttribute('data-i18n-attr');
      // mehrere Zuordnungen per Semikolon möglich: "title:meta.title;content:meta.description"
      spec.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        const val = t(dict, key);
        if (attr && val != null) el.setAttribute(attr, val);
      });
    });

    // Fallback: document.title updaten, falls vorhanden
    const titleEl = document.querySelector('title[data-i18n="meta.title"]');
    if (titleEl) {
      const titleVal = t(dict, 'meta.title');
      if (titleVal) titleEl.textContent = titleVal;
    }
  }

  // 4) CTA-Button verlinken
  function wireCta() {
    const cta = document.getElementById('cta-map');
    if (cta) {
      // Falls die Map auf derselben Domain served wird:
      cta.href = `/${LANG}/map`;
      // Wenn sie auf beta läuft, nimm stattdessen:
      // cta.href = `https://beta.wind2horizon.com/${LANG}/map`;
    }
  }

  // 5) Aktive Sprache im Header markieren (optional)
  function highlightLang(lang) {
    const active = document.getElementById(`lng-${lang}`);
    if (active) active.classList.add('underline', 'font-semibold');
  }

  // 6) Helper: Tiefenzugriff per Key-Pfad "a.b.c"
  function t(dict, key) {
    try {
      return key.split('.').reduce((o, k) => (o ? o[k] : undefined), dict);
    } catch {
      return undefined;
    }
  }
})();
