// LiveWind Embed + optional station picker (no hard 10-limit) v1.1
(function() {
  var NAME_CACHE = null;

  function asArray(mapOrArray) {
    if (Array.isArray(mapOrArray)) return mapOrArray;
    if (!mapOrArray) return [];
    return Object.keys(mapOrArray).map(function(code){ return { code: String(code), name: mapOrArray[code] }; });
  }

  async function loadGlobalNameMap() {
    if (NAME_CACHE) return NAME_CACHE;

    if (window.LIVEWIND_STATIONS) {
      const src = window.LIVEWIND_STATIONS;
      NAME_CACHE = Array.isArray(src)
        ? src.reduce((acc, s) => {
            acc[String(s.code)] = s.name || ('Station ' + s.code);
            return acc;
          }, {})
        : Object.keys(src).reduce((acc, k) => {
            acc[String(k)] = src[k]?.name || src[k] || ('Station ' + k);
            return acc;
          }, {});
      return NAME_CACHE;
    }

    const candidates = ['/assets/stations.json','/stations.json'];
    for (let i=0;i<candidates.length;i++) {
      try {
        const r = await fetch(candidates[i], {cache:'no-store'});
        if (!r.ok) continue;
        const j = await r.json();

        if (Array.isArray(j)) {
          NAME_CACHE = j.reduce((acc, s) => {
            if (s && s.code) acc[String(s.code)] = s.name || ('Station ' + s.code);
            return acc;
          }, {});
        } else if (j && typeof j === 'object') {
          NAME_CACHE = Object.keys(j).reduce((acc, k) => {
            acc[String(k)] = j[k]?.name || j[k] || ('Station ' + k);
            return acc;
          }, {});
        } else {
          NAME_CACHE = {};
        }
        return NAME_CACHE;
      } catch(e) {}
    }

    NAME_CACHE = {};
    return NAME_CACHE;
  }

  async function resolveStationName(code, host) {
    var viaAttr = host.getAttribute('data-station-name');
    if (viaAttr) return viaAttr;
    var global = await loadGlobalNameMap();
    if (global && global[String(code)]) return global[String(code)];
    return 'Station ' + code;
  }

  function makeFrame(station, height, nameCb) {
    var src = 'https://w2hlivewind.netlify.app?station=' + encodeURIComponent(station);
    var h = (height && !isNaN(+height)) ? +height : 76;

    var outer = document.createElement('div');
    outer.style.cssText = 'width:100%;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 6px 18px rgba(0,0,0,.12);background:#fff';

    var iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = 'LiveWind';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer';
    iframe.style.cssText = 'width:100%;height:'+h+'px;border:0;display:block';

    var footer = document.createElement('div');
    footer.style.cssText = 'padding:6px 10px;font-size:12px;color:#6b7280;background:#fff';
    footer.innerHTML = 'Echtzeit: <strong class="lw-name">Station '+station+'</strong> • ' +
      '<a class="lw-open" href="'+src+'" target="_blank" rel="noopener noreferrer">Vollansicht öffnen</a>';

    outer.appendChild(iframe);
    outer.appendChild(footer);

    nameCb().then(function(n){
      var el = footer.querySelector('.lw-name');
      if (el) el.textContent = n;
    });

    return outer;
  }

  function buildPicker(host, stations, currentCode, onChange) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'margin:10px 0 12px 0; display:flex; align-items:center; gap:8px; flex-wrap:wrap';

    var label = document.createElement('label');
    label.textContent = 'Station:';
    label.style.cssText = 'font-size:14px; font-weight:600';

    var select = document.createElement('select');
    select.style.cssText = 'padding:6px 10px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; font-size:14px';

    stations.forEach(function(s){
      var opt = document.createElement('option');
      opt.value = String(s.code);
      opt.textContent = s.name || ('Station ' + s.code);
      select.appendChild(opt);
    });

    select.value = String(currentCode);
    select.addEventListener('change', function(e){ onChange(e.target.value); });

    wrap.appendChild(label);
    wrap.appendChild(select);
    return {wrap: wrap, select: select};
  }

  async function loadStationsFromAttr(attr) {
    if (!attr) return null;
    try {
      var trimmed = attr.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        var j = JSON.parse(trimmed);
        return Array.isArray(j) ? j : asArray(j);
      } else {
        var r = await fetch(trimmed, {cache:'no-store'});
        if (r.ok) {
          var j = await r.json();
          return Array.isArray(j) ? j : asArray(j);
        }
      }
    } catch (e) {}
    return null;
  }

  async function renderOne(host) {
    var stationsAttr = host.getAttribute('data-stations');
    var stationsArr = await loadStationsFromAttr(stationsAttr);
    if (!stationsArr) {
      var global = await loadGlobalNameMap();
      stationsArr = asArray(global);
    }
    if (!stationsArr || stationsArr.length === 0) {
      var fallbackCode = host.getAttribute('data-station') || '16108';
      stationsArr = [{code: fallbackCode, name: 'Station ' + fallbackCode}];
    }
    var seen = new Set();
    var finalStations = [];
    stationsArr.forEach(function(s){
      if (!s || !s.code) return;
      var code = String(s.code);
      if (seen.has(code)) return;
      seen.add(code);
      finalStations.push({code: code, name: s.name || ('Station ' + code)});
    });

    var sp = new URLSearchParams(location.search);
    var saved = localStorage.getItem('w2h_station');
    var current = sp.get('station') || saved || host.getAttribute('data-station') || finalStations[0].code;

    function applyStation(code) {
      current = String(code);
      localStorage.setItem('w2h_station', current);
      var nameCb = function(){ return resolveStationName(current, host); };
      var newFrame = makeFrame(current, host.getAttribute('data-height') || '76', nameCb);
      hostFrame.replaceWith(newFrame);
      hostFrame = newFrame;

      var placeEl = document.getElementById('livewind-place');
      if (placeEl) nameCb().then(function(n){ placeEl.textContent = n; });

      var open = document.getElementById('livewind-open');
      if (open) open.href = 'https://w2hlivewind.netlify.app?station=' + encodeURIComponent(current);

      var boraLink = document.getElementById('bora-link');
      if (boraLink) {
        try {
          var u = new URL(boraLink.href);
          u.searchParams.set('station', current);
          boraLink.href = u.toString();
        } catch(e) {}
      }
    }

    var nameCb0 = function(){ return resolveStationName(current, host); };
    var hostFrame = makeFrame(current, host.getAttribute('data-height') || '76', nameCb0);

    if (host.getAttribute('data-picker') === '1') {
      var picker = buildPicker(host, finalStations, current, applyStation);
      var container = document.createElement('div');
      container.appendChild(picker.wrap);
      container.appendChild(hostFrame);
      host.replaceChildren(container);
    } else {
      host.replaceChildren(hostFrame);
    }

    nameCb0().then(function(n){
      var placeEl = document.getElementById('livewind-place');
      if (placeEl) placeEl.textContent = n;
    });
  }

  var one = document.getElementById('livewind-embed');
  if (one) renderOne(one);
  document.querySelectorAll('[data-livewind]').forEach(renderOne);
})();
