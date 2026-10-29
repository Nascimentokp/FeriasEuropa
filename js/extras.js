// Recursos que só funcionam fora do Claude: fotos da Wikipédia, mapa, tempo e gastos.
// Usa variáveis do script principal do index.html (ITINERARY, STAYS, hotelState, db, dbReady, esc...).
(function () {
  "use strict";

  // ---------- utilidades ----------
  const store = {
    get(k, maxAgeMs) {
      try {
        const raw = localStorage.getItem(k); if (!raw) return null;
        const o = JSON.parse(raw);
        if (maxAgeMs && (Date.now() - o.t) > maxAgeMs) return null;
        return o.v;
      } catch (e) { return null; }
    },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify({ t: Date.now(), v })); } catch (e) {} }
  };
  const DAY = 86400000;
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const eur = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "EUR" });
  const pad = (n) => String(n).padStart(2, "0");
  const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const stripTags = (h) => { const d = document.createElement("div"); d.innerHTML = h || ""; return (d.textContent || "").trim(); };

  // ---------- locais ----------
  const LOC = {
    paris:     { name: "Paris",             lat: 48.8566, lon: 2.3522, c: "--fr" },
    rennes:    { name: "Rennes",            lat: 48.1035, lon: -1.6722, c: "--fr" },
    msm:       { name: "Mont Saint-Michel", lat: 48.6361, lon: -1.5115, c: "--fr" },
    bruxelas:  { name: "Bruxelas",          lat: 50.8467, lon: 4.3525, c: "--be" },
    ghent:     { name: "Ghent",             lat: 51.0543, lon: 3.7174, c: "--be" },
    bruges:    { name: "Bruges",            lat: 51.2093, lon: 3.2247, c: "--be" },
    antuerpia: { name: "Antuérpia",         lat: 51.2172, lon: 4.4211, c: "--be" },
    amsterda:  { name: "Amsterdã",          lat: 52.3728, lon: 4.8936, c: "--nl" },
    zaanse:    { name: "Zaanse Schans",     lat: 52.4740, lon: 4.8180, c: "--nl" },
    haarlem:   { name: "Haarlem",           lat: 52.3874, lon: 4.6462, c: "--nl" },
    rotterdam: { name: "Rotterdam",         lat: 51.9244, lon: 4.4777, c: "--nl" },
    kinderdijk:{ name: "Kinderdijk",        lat: 51.8838, lon: 4.6377, c: "--nl" },
    cdg:       { name: "Aeroporto CDG",     lat: 49.0097, lon: 2.5479, c: "--home" }
  };
  // Onde vocês estão em cada dia (para o tempo) e a foto de cada dia (títulos da Wikipédia em inglês).
  const DAYS = {
    6:  { loc: "paris",     photo: ["Eiffel_Tower", "Paris"] },
    7:  { loc: "msm",       photo: ["Mont-Saint-Michel"] },
    8:  { loc: "msm",       photo: ["Mont-Saint-Michel_Abbey", "Mont-Saint-Michel"] },
    9:  { loc: "paris",     photo: ["Musée_d'Orsay", "Montmartre"] },
    10: { loc: "bruxelas",  photo: ["Grand-Place", "Brussels"] },
    11: { loc: "bruxelas",  photo: ["Royal_Galleries_of_Saint-Hubert", "Brussels"] },
    12: { loc: "ghent",     photo: ["Gravensteen", "Ghent"] },
    13: { loc: "bruges",    photo: ["Bruges"] },
    14: { loc: "bruges",    photo: ["Begijnhof,_Bruges", "Minnewater", "Bruges"] },
    15: { loc: "antuerpia", photo: ["Antwerpen-Centraal_railway_station", "Antwerp"] },
    16: { loc: "amsterda",  photo: ["Canals_of_Amsterdam", "Amsterdam"] },
    17: { loc: "amsterda",  photo: ["Rijksmuseum"] },
    18: { loc: "zaanse",    photo: ["Zaanse_Schans"] },
    19: { loc: "kinderdijk",photo: ["Kinderdijk"] },
    20: { loc: "paris",     photo: ["Gare_du_Nord", "Paris"] },
    21: { loc: "cdg",       photo: ["Charles_de_Gaulle_Airport"] }
  };
  const TRIP_START = new Date(2027, 1, 5), TRIP_END = new Date(2027, 1, 21);

  // ================================================================
  // 1. FOTOS (Wikipédia + créditos do Wikimedia Commons)
  // ================================================================
  const photoMem = {};
  async function wikiPhoto(titles) {
    const key = "wp:" + titles.join("|");
    if (photoMem[key]) return photoMem[key];
    const cached = store.get(key, 30 * DAY);
    if (cached) return (photoMem[key] = Promise.resolve(cached));
    photoMem[key] = (async () => {
      for (const title of titles) {
        try {
          const r = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title));
          if (!r.ok) continue;
          const j = await r.json();
          const orig = j.originalimage, th = j.thumbnail;
          if (!orig || !th || !/\/wikipedia\/commons\//.test(th.source)) continue;
          const file = decodeURIComponent(orig.source.split("/").pop());
          const sized = (w) => (orig.width <= w ? orig.source : th.source.replace(/\/\d+px-/, `/${w}px-`));
          const out = { card: sized(960), hero: sized(1920), page: j.content_urls && j.content_urls.desktop && j.content_urls.desktop.page, file, title: j.title, credit: "" };
          try {
            const m = await fetch("https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=extmetadata&titles=File:" + encodeURIComponent(file));
            const mj = await m.json();
            const pg = mj.query && Object.values(mj.query.pages)[0];
            const md = pg && pg.imageinfo && pg.imageinfo[0].extmetadata;
            if (md) {
              const artist = stripTags(md.Artist && md.Artist.value).slice(0, 80);
              const lic = stripTags(md.LicenseShortName && md.LicenseShortName.value);
              out.credit = [artist, lic].filter(Boolean).join(" · ");
            }
          } catch (e) {}
          out.filePage = "https://commons.wikimedia.org/wiki/File:" + encodeURIComponent(file);
          store.set(key, out);
          return out;
        } catch (e) { /* tenta o próximo título */ }
      }
      return null;
    })();
    return photoMem[key];
  }
  function creditHTML(p) {
    return `Foto: <a href="${esc(p.filePage)}" target="_blank" rel="noopener">${esc(p.credit || "Wikimedia Commons")}</a> · <a href="${esc(p.page || p.filePage)}" target="_blank" rel="noopener">Wikipédia</a>`;
  }
  function fillDayPhotos() {
    document.querySelectorAll("figure.dphoto:not([data-done])").forEach((fig) => {
      fig.setAttribute("data-done", "1");
      const info = DAYS[Number(fig.dataset.day)]; if (!info) return;
      const load = () => wikiPhoto(info.photo).then((p) => {
        if (!p) return;
        fig.innerHTML = `<img alt="${esc(p.title)}" loading="lazy" decoding="async"><figcaption>${creditHTML(p)}</figcaption>`;
        const img = fig.querySelector("img");
        img.onload = () => img.classList.add("ok");
        img.onerror = () => { fig.hidden = true; };
        img.src = p.card;
        fig.hidden = false;
      });
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: "600px" });
        // figura escondida não tem tamanho: observa o cartão
        io.observe(fig.closest(".card") || fig);
      } else load();
    });
  }
  function heroPhoto() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    let dn = 7;  // antes da viagem: Mont Saint-Michel
    if (now >= TRIP_START && now <= TRIP_END) dn = Math.max(6, now.getDate());
    const info = DAYS[dn] || DAYS[7];
    wikiPhoto(info.photo).then((p) => {
      if (!p) return;
      const el = document.getElementById("herophoto");
      const img = new Image();
      img.onload = () => {
        el.style.backgroundImage = `linear-gradient(180deg, color-mix(in srgb, var(--hero) 55%, transparent) 0%, color-mix(in srgb, var(--hero) 80%, transparent) 55%, var(--hero) 100%), url("${p.hero}")`;
        el.classList.add("on");
        document.getElementById("herocredit").innerHTML = creditHTML(p);
      };
      img.src = p.hero;
    });
  }

  // ================================================================
  // 2. TEMPO (Open-Meteo: previsão até 16 dias; antes disso, média de fevereiro 2022–2026)
  // ================================================================
  const WMO = (c) => {
    if (c === 0) return ["☀️", "Céu limpo"];
    if (c <= 2) return ["🌤️", "Poucas nuvens"];
    if (c === 3) return ["☁️", "Nublado"];
    if (c === 45 || c === 48) return ["🌫️", "Neblina"];
    if (c >= 51 && c <= 57) return ["🌦️", "Garoa"];
    if (c >= 61 && c <= 67) return ["🌧️", "Chuva"];
    if (c >= 71 && c <= 77) return ["❄️", "Neve"];
    if (c >= 80 && c <= 82) return ["🌦️", "Pancadas de chuva"];
    if (c === 85 || c === 86) return ["🌨️", "Neve"];
    if (c >= 95) return ["⛈️", "Tempestade"];
    return ["🌡️", ""];
  };
  const climMem = {};
  function febAverage(locKey) {
    if (climMem[locKey]) return climMem[locKey];
    const key = "clim2:" + locKey;
    const cached = store.get(key, 120 * DAY);
    if (cached) return (climMem[locKey] = Promise.resolve(cached));
    const L = LOC[locKey];
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${L.lat}&longitude=${L.lon}&start_date=2022-02-01&end_date=2026-02-28&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Europe%2FParis`;
    climMem[locKey] = fetch(url).then((r) => r.json()).then((j) => {
      const d = j.daily; let n = 0, mx = 0, mn = 0, wet = 0;
      d.time.forEach((t, i) => {
        if (t.slice(5, 7) !== "02" || d.temperature_2m_max[i] == null) return;
        n++; mx += d.temperature_2m_max[i]; mn += d.temperature_2m_min[i];
        if ((d.precipitation_sum[i] || 0) >= 1) wet++;
      });
      if (!n) return null;
      const out = { max: Math.round(mx / n), min: Math.round(mn / n), wet: Math.round(wet / n * 100) };
      store.set(key, out);
      return out;
    }).catch(() => null);
    return climMem[locKey];
  }
  let forecastP = null;
  function forecasts() {
    if (forecastP) return forecastP;
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const horizon = new Date(now.getTime() + 15 * DAY);
    if (horizon < new Date(2027, 1, 6) || now > TRIP_END) return (forecastP = Promise.resolve({}));
    const cached = store.get("fc", 3 * 3600000);
    if (cached) return (forecastP = Promise.resolve(cached));
    const keys = [...new Set(Object.values(DAYS).map((d) => d.loc))];
    const start = isoDay(now > new Date(2027, 1, 6) ? now : new Date(2027, 1, 6));
    const end = isoDay(horizon < TRIP_END ? horizon : TRIP_END);
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${keys.map((k) => LOC[k].lat).join(",")}&longitude=${keys.map((k) => LOC[k].lon).join(",")}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FParis&start_date=${start}&end_date=${end}`;
    forecastP = fetch(url).then((r) => r.json()).then((j) => {
      const arr = Array.isArray(j) ? j : [j]; const out = {};
      arr.forEach((res, i) => {
        const k = keys[i]; out[k] = {};
        (res.daily && res.daily.time || []).forEach((t, n) => {
          out[k][t] = { code: res.daily.weather_code[n], max: Math.round(res.daily.temperature_2m_max[n]), min: Math.round(res.daily.temperature_2m_min[n]), rain: res.daily.precipitation_probability_max[n] };
        });
      });
      store.set("fc", out);
      return out;
    }).catch(() => ({}));
    return forecastP;
  }
  async function weatherFor(dn) {
    const info = DAYS[dn]; if (!info) return null;
    const fc = await forecasts();
    const f = fc[info.loc] && fc[info.loc][`2027-02-${pad(dn)}`];
    if (f) { const [ic, label] = WMO(f.code); return { kind: "fc", html: `${ic} <b>${f.max}°</b>/${f.min}°${f.rain != null ? ` · ${f.rain}% chuva` : ""}`, label }; }
    const a = await febAverage(info.loc);
    if (a) return { kind: "avg", html: `Média fev.: <b>${a.max}°</b>/${a.min}° · chuva em ${a.wet}% dos dias`, label: "" };
    return null;
  }
  function fillWeatherChips() {
    document.querySelectorAll(".wxchip:not([data-done])").forEach((el) => {
      el.setAttribute("data-done", "1");
      weatherFor(Number(el.dataset.day)).then((w) => { if (w) { el.innerHTML = w.html; if (w.label) el.title = w.label; } });
    });
  }
  async function fillTodayWeather() {
    const tile = document.getElementById("wxtoday"); if (!tile || tile.dataset.done) return;
    tile.dataset.done = "1";
    const now = new Date(); now.setHours(0, 0, 0, 0);
    let list;
    if (now >= TRIP_START && now <= TRIP_END) {
      const d = now.getDate(); list = [d, d + 1, d + 2].filter((n) => DAYS[n]);
    } else {
      list = ["paris", "msm", "bruxelas", "bruges", "amsterda"];
    }
    const rows = await Promise.all(list.map(async (x) => {
      if (typeof x === "number") {
        const w = await weatherFor(x);
        return `<div class="wxrow"><span>${x} fev · ${esc(LOC[DAYS[x].loc].name)}</span><span class="t">${w ? w.html : "—"}</span></div>`;
      }
      const a = await febAverage(x);
      return `<div class="wxrow"><span>${esc(LOC[x].name)}</span><span class="t">${a ? `<b>${a.max}°</b>/${a.min}°` : "—"}</span>${a ? `<small>chuva em ${a.wet}% dos dias de fevereiro</small>` : ""}</div>`;
    }));
    const inTrip = now >= TRIP_START && now <= TRIP_END;
    tile.innerHTML = `<h3>${inTrip ? "Tempo nos próximos dias" : "Como costuma ser fevereiro"}</h3>
      <div class="wxlist">${rows.join("")}</div>
      <span class="eyebrow">${inTrip ? "Previsão Open-Meteo" : "Média real de fevereiro 2022–2026 · máx/mín"}</span>`;
  }

  // ================================================================
  // 3. MAPA (Leaflet + CARTO / OpenStreetMap)
  // ================================================================
  const STOPS = [
    { loc: "paris",    nights: "6 fev · 1 noite",     stay: "paris1" },
    { loc: "msm",      nights: "7–8 fev · 2 noites",  stay: "mont" },
    { loc: "paris",    nights: "9 fev · 1 noite",     stay: "paris2", dup: true },
    { loc: "bruxelas", nights: "10–12 fev · 3 noites", stay: "bru" },
    { loc: "bruges",   nights: "13–14 fev · 2 noites", stay: "bruges" },
    { loc: "amsterda", nights: "15–19 fev · 5 noites", stay: "ams" },
    { loc: "cdg",      nights: "20 fev · 1 noite",    stay: "paris3" }
  ];
  const LEGS = [
    ["paris", "rennes", "--fr"], ["rennes", "msm", "--fr"], ["msm", "rennes", "--fr"], ["rennes", "paris", "--fr"],
    ["paris", "bruxelas", "--be"], ["bruxelas", "bruges", "--be"], ["bruges", "antuerpia", "--be"],
    ["antuerpia", "amsterda", "--nl"], ["amsterda", "paris", "--home"], ["paris", "cdg", "--home"]
  ];
  const TRIPS = [["bruxelas", "ghent"], ["amsterda", "zaanse"], ["zaanse", "haarlem"], ["haarlem", "amsterda"], ["amsterda", "rotterdam"], ["rotterdam", "kinderdijk"]];
  let map = null, tiles = null, stopMarkers = {};
  const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#1F4E79";
  const isDark = () => {
    const t = document.documentElement.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  function chosenHotel(stayId) {
    try {
      const st = STAYS.find((x) => x.id === stayId); if (!st) return null;
      const ch = hotelState[stayId] && hotelState[stayId].choice;
      return ch ? stayOptions(st).find((o) => o.id === ch) || null : null;
    } catch (e) { return null; }
  }
  function stopPopup(s) {
    const L = LOC[s.loc], h = chosenHotel(s.stay);
    const q = encodeURIComponent(h ? `${h.name} ${L.name}` : L.name);
    return `<b>${esc(L.name)}</b><br>${esc(s.nights)}<br>${h ? `Hotel: ${esc(h.name)}` : "<i>Hotel ainda não escolhido</i>"}<br><a href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener">Abrir no Google Maps</a>`;
  }
  function renderStops() {
    const ol = document.getElementById("stops"); if (!ol) return;
    ol.innerHTML = STOPS.map((s, i) => {
      const L = LOC[s.loc], h = chosenHotel(s.stay);
      return `<li tabindex="0" data-i="${i}" style="--c:var(${L.c})"><span class="eyebrow">${esc(s.nights)}</span><b>${esc(L.name)}</b><span class="h">${h ? esc(h.name) : "Hotel a escolher"}</span></li>`;
    }).join("");
  }
  function setTiles() {
    if (!map) return;
    if (tiles) map.removeLayer(tiles);
    const style = isDark() ? "dark_all" : "light_all";
    tiles = L.tileLayer(`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`, {
      subdomains: "abcd", maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);
  }
  function initMap() {
    const box = document.getElementById("map");
    if (map || !box) return;
    if (typeof L === "undefined") { box.innerHTML = '<p class="mapmsg">O mapa precisa de internet para carregar. Tente de novo quando estiverem conectados.</p>'; return; }
    map = L.map(box, { scrollWheelZoom: false, zoomSnap: 0.5 });
    setTiles();
    LEGS.forEach(([a, b, c]) => L.polyline([[LOC[a].lat, LOC[a].lon], [LOC[b].lat, LOC[b].lon]], { color: cssVar(c), weight: 4, opacity: 0.9 }).addTo(map));
    TRIPS.forEach(([a, b]) => L.polyline([[LOC[a].lat, LOC[a].lon], [LOC[b].lat, LOC[b].lon]], { color: cssVar("--muted"), weight: 2.5, dashArray: "4 7" }).addTo(map));
    ["ghent", "antuerpia", "zaanse", "haarlem", "rotterdam", "kinderdijk", "rennes"].forEach((k) => {
      const P = LOC[k];
      L.marker([P.lat, P.lon], { icon: L.divIcon({ className: "", html: `<span class="pin small" style="--c:var(${P.c})"></span>`, iconSize: [14, 14], iconAnchor: [7, 7] }) })
        .addTo(map).bindPopup(`<b>${esc(P.name)}</b><br>${k === "rennes" ? "Troca de trem para o Mont" : "Bate-volta ou parada"}`);
    });
    let n = 0;
    STOPS.forEach((s, i) => {
      if (s.dup) { stopMarkers[i] = stopMarkers[0]; return; }
      n++;
      const P = LOC[s.loc];
      stopMarkers[i] = L.marker([P.lat, P.lon], { icon: L.divIcon({ className: "", html: `<span class="pin" style="--c:var(${P.c})">${n}</span>`, iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(map);
    });
    refreshPopups();
    map.fitBounds(Object.values(LOC).map((p) => [p.lat, p.lon]), { padding: [24, 24] });
    if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", setTiles);
    document.getElementById("stops").addEventListener("click", (e) => focusStop(e.target.closest("li")));
    document.getElementById("stops").addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); focusStop(e.target.closest("li")); } });
  }
  function focusStop(li) {
    if (!li || !map) return;
    const s = STOPS[Number(li.dataset.i)], P = LOC[s.loc];
    map.setView([P.lat, P.lon], 12);
    const m = stopMarkers[Number(li.dataset.i)];
    if (m) m.setPopupContent(stopPopup(s)).openPopup();
    document.getElementById("map").scrollIntoView({ block: "center", behavior: "smooth" });
  }
  function refreshPopups() {
    renderStops();
    if (!map) return;
    STOPS.forEach((s, i) => {
      if (s.dup) return;
      const extra = STOPS.filter((x) => x.dup && x.loc === s.loc);
      const html = [s].concat(extra).map(stopPopup).join("<hr>");
      stopMarkers[i].bindPopup(html);
    });
  }

  // ================================================================
  // 4. GASTOS (Firestore: coleções expenses e settings)
  // ================================================================
  const CATS = ["Hospedagem", "Transporte", "Comida", "Passeios", "Compras", "Outros"];
  const CITIES = ["Paris", "Mont Saint-Michel", "Bruxelas", "Ghent", "Bruges", "Antuérpia", "Amsterdã", "Zaanse Schans", "Haarlem", "Rotterdam", "Kinderdijk", "Antes da viagem", "Outro"];
  const expenses = {};       // id -> doc
  let budget = null;         // em BRL
  let rate = store.get("eurbrl-manual") || null;    // cotação manual (por aparelho)
  let liveRate = null, liveDate = "";
  let gReady = false;

  async function loadRate() {
    const c = store.get("eurbrl", 6 * 3600000);
    if (c) { liveRate = c.r; liveDate = c.d; return; }
    const tries = [
      ["https://api.frankfurter.dev/v1/latest?base=EUR&symbols=BRL", (j) => [j.rates && j.rates.BRL, j.date]],
      ["https://api.frankfurter.app/latest?from=EUR&to=BRL", (j) => [j.rates && j.rates.BRL, j.date]]
    ];
    for (const [u, pick] of tries) {
      try {
        const j = await (await fetch(u)).json(); const [r, d] = pick(j);
        if (r) { liveRate = r; liveDate = d || ""; store.set("eurbrl", { r, d: liveDate }); return; }
      } catch (e) {}
    }
  }
  const currentRate = () => rate || liveRate || null;
  const parseMoney = (s) => { const t = String(s).trim().replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."); const n = Number(t); return isFinite(n) ? n : NaN; };
  const fmtDate = (iso) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };
  function defaultDate() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    return isoDay(now);
  }
  function defaultCity() {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    if (now >= TRIP_START && now <= TRIP_END) {
      const d = DAYS[now.getDate()]; if (d) { const n = LOC[d.loc].name; return CITIES.includes(n) ? n : "Outro"; }
    }
    return "Antes da viagem";
  }
  function renderExpenses() {
    const box = document.getElementById("gastos"); if (!box) return;
    const items = Object.entries(expenses).map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.at || 0) - (a.at || 0));
    const totalBRL = items.reduce((s, x) => s + (x.brl || 0), 0);
    const totalEUR = items.reduce((s, x) => s + (x.eur || 0), 0);
    const byCat = {}, byCity = {};
    items.forEach((x) => { byCat[x.cat] = (byCat[x.cat] || 0) + (x.brl || 0); byCity[x.city] = (byCity[x.city] || 0) + (x.brl || 0); });
    const bars = (obj) => {
      const rows = Object.entries(obj).sort((a, b) => b[1] - a[1]); const max = Math.max(1, ...rows.map((r) => r[1]));
      return rows.length ? rows.map(([k, v]) => `<div class="gbar"><span>${esc(k)}</span><span class="track"><span style="width:${Math.max(2, v / max * 100)}%"></span></span><span class="v">${brl.format(v)}</span></div>`).join("") : '<p class="gmsg">Nada lançado ainda.</p>';
    };
    const r = currentRate();
    const pct = budget ? Math.round(totalBRL / budget * 100) : 0;
    let lastDay = "";
    const list = items.length ? items.map((x) => {
      const head = x.date !== lastDay ? `<li class="gday" aria-hidden="true" style="display:block;border:0">${esc(fmtDate(x.date))}</li>` : "";
      lastDay = x.date;
      const main = x.cur === "EUR" ? eur.format(x.amount) : brl.format(x.amount);
      const other = x.cur === "EUR" ? brl.format(x.brl) : (x.eur ? eur.format(x.eur) : "");
      return `${head}<li><span><span class="d">${esc(x.desc)}</span><br><span class="m">${esc(x.cat)} · ${esc(x.city)}${x.by ? " · " + esc(x.by) : ""}</span></span>
        <span class="a">${main}${other ? `<small>${other}</small>` : ""}</span>
        <span></span><button type="button" class="gdel" data-del="${esc(x.id)}">Apagar</button></li>`;
    }).join("") : '<li><span class="m">Nenhum gasto lançado. Use o formulário acima.</span></li>';

    const keep = document.activeElement && document.activeElement.id;
    const formVals = {};
    ["g-desc", "g-amount", "g-cur", "g-cat", "g-city", "g-date"].forEach((id) => { const el = document.getElementById(id); if (el) formVals[id] = el.value; });

    box.innerHTML = `<div class="gwrap">
      <div class="thead"><span class="eyebrow">Compartilhado entre os dois</span><h2>Gastos da viagem</h2></div>
      <div class="gtop">
        <div class="gstat"><span class="eyebrow">Total em reais</span><span class="big">${brl.format(totalBRL)}</span><span class="gmsg">${eur.format(totalEUR)} em euros</span></div>
        <div class="gstat gbudget"><span class="eyebrow">Orçamento</span>
          ${budget ? `<span class="big">${pct}%</span><span class="track"><span class="${pct > 100 ? "over" : ""}" style="width:${Math.min(100, pct)}%"></span></span><span class="gmsg">${brl.format(totalBRL)} de ${brl.format(budget)}</span>` : '<span class="gmsg">Definam um valor total abaixo para acompanhar.</span>'}
          <form id="gbudgetform" style="display:flex;gap:6px;margin-top:4px"><input id="g-budget" inputmode="decimal" placeholder="Ex.: 30.000" aria-label="Orçamento total em reais" style="flex:1;min-width:0;font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink)"><button class="gbtn ghost" type="submit">Salvar</button></form>
        </div>
        <div class="gstat"><span class="eyebrow">Cotação do euro</span><span class="big">${r ? brl.format(r) : "—"}</span>
          <span class="gmsg">${rate ? "Cotação definida por vocês" : (liveRate ? `Cotação de referência ${liveDate ? "de " + esc(fmtDate(liveDate)) : ""}` : "Sem cotação: definam uma abaixo")}</span>
          <form id="grateform" style="display:flex;gap:6px;margin-top:4px"><input id="g-rate" inputmode="decimal" placeholder="Ex.: 6,30" aria-label="Cotação do euro em reais" style="flex:1;min-width:0;font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink)"><button class="gbtn ghost" type="submit">Usar</button>${rate ? '<button class="gbtn ghost" type="button" id="g-rate-reset">Automática</button>' : ""}</form>
        </div>
      </div>
      <form class="gform" id="gform">
        <label for="g-desc" class="wide">Descrição<input id="g-desc" maxlength="80" required autocomplete="off" placeholder="Ex.: Jantar em Bruges"></label>
        <label for="g-amount">Valor<input id="g-amount" inputmode="decimal" required autocomplete="off" placeholder="0,00"></label>
        <label for="g-cur">Moeda<select id="g-cur"><option value="EUR">Euro (€)</option><option value="BRL">Real (R$)</option></select></label>
        <label for="g-cat">Categoria<select id="g-cat">${CATS.map((c) => `<option>${c}</option>`).join("")}</select></label>
        <label for="g-city">Cidade<select id="g-city">${CITIES.map((c) => `<option>${esc(c)}</option>`).join("")}</select></label>
        <label for="g-date">Data<input id="g-date" type="date"></label>
        <button class="gbtn" type="submit">Lançar gasto</button>
        <p class="gmsg wide" id="g-msg" role="status"></p>
      </form>
      <div class="gcols">
        <div class="gpanel"><h3>Por categoria</h3><div class="gbars">${bars(byCat)}</div></div>
        <div class="gpanel"><h3>Por cidade</h3><div class="gbars">${bars(byCity)}</div></div>
      </div>
      <div class="gpanel"><h3>Lançamentos</h3><ul class="glist">${list}</ul></div>
    </div>`;

    document.getElementById("g-date").value = formVals["g-date"] || defaultDate();
    document.getElementById("g-city").value = formVals["g-city"] || defaultCity();
    if (formVals["g-cur"]) document.getElementById("g-cur").value = formVals["g-cur"];
    if (formVals["g-cat"]) document.getElementById("g-cat").value = formVals["g-cat"];
    if (formVals["g-desc"]) document.getElementById("g-desc").value = formVals["g-desc"];
    if (formVals["g-amount"]) document.getElementById("g-amount").value = formVals["g-amount"];
    if (keep && document.getElementById(keep)) document.getElementById(keep).focus();
  }
  function gMsg(t) { const m = document.getElementById("g-msg"); if (m) m.textContent = t; }
  function bindExpenses() {
    const box = document.getElementById("gastos");
    box.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (e.target.id === "grateform") {
        const v = parseMoney(document.getElementById("g-rate").value);
        if (!(v > 0)) { gMsg("Digitem a cotação, por exemplo 6,30."); return; }
        rate = v; store.set("eurbrl-manual", v); renderExpenses(); return;
      }
      if (e.target.id === "gbudgetform") {
        const v = parseMoney(document.getElementById("g-budget").value);
        if (!(v > 0)) return;
        budget = v; renderExpenses();
        if (db) { try { await db.collection("settings").doc("budget").set({ brl: v, at: Date.now() }); } catch (err) { gMsg("Não foi possível salvar o orçamento."); } }
        return;
      }
      if (e.target.id !== "gform") return;
      if (!db) { gMsg("Entrem com a conta Google para lançar gastos."); return; }
      const desc = document.getElementById("g-desc").value.trim();
      const amount = parseMoney(document.getElementById("g-amount").value);
      const cur = document.getElementById("g-cur").value;
      if (!desc) { gMsg("Escrevam uma descrição."); return; }
      if (!(amount > 0)) { gMsg("Digitem um valor, por exemplo 12,50."); return; }
      const r = currentRate();
      if (cur === "EUR" && !r) { gMsg("Sem cotação do euro: definam uma no quadro acima."); return; }
      const doc = {
        desc, amount: Math.round(amount * 100) / 100, cur,
        brl: Math.round((cur === "EUR" ? amount * r : amount) * 100) / 100,
        eur: r ? Math.round((cur === "EUR" ? amount : amount / r) * 100) / 100 : 0,
        rate: r || 0,
        cat: document.getElementById("g-cat").value,
        city: document.getElementById("g-city").value,
        date: document.getElementById("g-date").value || defaultDate(),
        by: (window.__tripUser && window.__tripUser.name) || "",
        at: Date.now()
      };
      const id = "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      try {
        await db.collection("expenses").doc(id).set(doc);
        document.getElementById("g-desc").value = ""; document.getElementById("g-amount").value = "";
        gMsg(`Lançado: ${desc}.`);
        document.getElementById("g-desc").focus();
      } catch (err) { gMsg("Não foi possível salvar. Confiram se entraram com a conta autorizada e se as regras incluem 'expenses'."); }
    });
    box.addEventListener("click", async (e) => {
      if (e.target.id === "g-rate-reset") { rate = null; try { localStorage.removeItem("eurbrl-manual"); } catch (x) {} renderExpenses(); return; }
      const b = e.target.closest(".gdel"); if (!b) return;
      if (!b.classList.contains("sure")) { b.classList.add("sure"); b.textContent = "Confirmar"; setTimeout(() => { if (b.isConnected) { b.classList.remove("sure"); b.textContent = "Apagar"; } }, 4000); return; }
      if (!db) return;
      try { await db.collection("expenses").doc(b.dataset.del).delete(); } catch (err) { gMsg("Não foi possível apagar."); }
    });
  }
  function startExpenses() {
    if (gReady) return; gReady = true;
    renderExpenses(); bindExpenses();
    loadRate().then(renderExpenses);
    dbReady.then((adapter) => {
      adapter.collection("expenses").onSnapshot((snap) => {
        for (const k in expenses) delete expenses[k];
        snap.docs.forEach((d) => { const v = d.data(); if (v && v.desc) expenses[d.id] = v; });
        renderExpenses();
      }, () => {});
      adapter.collection("settings").onSnapshot((snap) => {
        snap.docs.forEach((d) => { if (d.id === "budget") { const v = d.data(); budget = v && v.brl || null; } });
        renderExpenses();
      }, () => {});
    });
  }

  // ================================================================
  // ganchos do script principal
  // ================================================================
  window.afterRender = function () { fillDayPhotos(); fillWeatherChips(); fillTodayWeather(); };
  window.onViewShown = function (v) {
    if (v === "mapa") { initMap(); refreshPopups(); setTimeout(() => map && map.invalidateSize(), 60); }
    if (v === "gastos") startExpenses();
  };
  // "Mais" no celular
  const mb = document.getElementById("morebtn"), sheet = document.getElementById("moresheet");
  if (mb && sheet) {
    mb.addEventListener("click", () => { sheet.hidden = !sheet.hidden; mb.setAttribute("aria-expanded", String(!sheet.hidden)); });
    sheet.addEventListener("click", (e) => { if (e.target.dataset.close) { sheet.hidden = true; mb.setAttribute("aria-expanded", "false"); } });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) { sheet.hidden = true; mb.setAttribute("aria-expanded", "false"); mb.focus(); } });
  }
  // escolha de hotel muda o mapa
  if (typeof dbReady !== "undefined") dbReady.then((adapter) => adapter.collection("hotels").onSnapshot(() => setTimeout(refreshPopups, 0), () => {}));

  heroPhoto();
  window.afterRender();
  // a aba aberta ao carregar já foi mostrada antes deste arquivo existir
  const open = (typeof VIEWS !== "undefined") && VIEWS.find((v) => { const el = document.getElementById(v); return el && !el.hidden; });
  if (open) window.onViewShown(open);
})();
