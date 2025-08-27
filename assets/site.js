(function () {
  const pathLang = (location.pathname.split('/')[1] || 'de').toLowerCase();
  const LANG = ['de','en','it','hr','fr'].includes(pathLang) ? pathLang : 'de';

  fetch(`/assets/i18n/${LANG}.json`)
    .then(r => r.json())
    .then(dict => applyI18n(dict))
    .catch(() => console.warn('i18n file missing for', LANG));

  function t(dict, key) {
    return key.split('.').reduce((a,k) => (a && a[k] != null ? a[k] : ''), dict) || '';
  }

  function applyI18n(dict) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(dict, key);
    });

    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
      const spec = el.getAttribute('data-i18n-attr'); // "content:meta.description"
      const [attr, key] = spec.split(':');
      el.setAttribute(attr, t(dict, key));
    });

    const cta = document.getElementById('cta-map');
    if (cta) cta.href = `https://map.wind2horizon.com/${LANG}`;

    document.documentElement.setAttribute('lang', LANG);
  }
})();