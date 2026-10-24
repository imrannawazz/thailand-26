// Shared behaviour for the Round-2 prototypes. No framework. State lives in localStorage until the real backend exists.
(function () {
  const T = window.TRIP;
  const LS = { locks: "trip.locks.v1", notes: "trip.notes.v1", who: "trip.who.v1" };
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const S = window.STORE;
  const state = { who: read(LS.who, "") };
  Object.defineProperty(state, "locks", { get: () => { const out = {}; const l = S.locks(); for (const k in l) out[k] = l[k].optionId; return out; } });
  Object.defineProperty(state, "notes", { get: () => { const out = {}; for (const n of S.state.notes) (out[n.day] || (out[n.day] = [])).push({ id: n.id, who: n.who, text: n.body, at: n.at }); return out; } });

  const fmtINR = n => n ? new Intl.NumberFormat("en-IN").format(Math.round(n)) : "—";
  const fmtK = n => n ? (n >= 1000 ? (Math.round(n / 100) / 10).toString().replace(/\.0$/, "") + "k" : String(n)) : "—";
  const thbToInr = thb => Math.round(thb * T.fx.inrPerThb);

  function decision(id) { return T.decisions.find(d => d.id === id); }
  function lockedOption(d) { const l = S.locks()[d.id]; return d.options.find(o => o.id === (l && l.optionId)) || null; }
  function lock(decisionId, optionId, who) { const l = S.locks()[decisionId]; S.setLock(decisionId, l && l.optionId === optionId ? null : optionId, who || state.who || null); }
  function budget() {
    let total = 0; const lines = [];
    for (const d of T.decisions) { const o = lockedOption(d); if (o && o.costINR) { total += o.costINR; lines.push({ d, o }); } }
    return { total, perHead: total / T.travellers, lines };
  }
  function addNote(dayN, text) { if (!text.trim()) return; S.addNote(dayN, state.who || "someone", text.trim()); }
  function setWho(name) { state.who = name.trim(); write(LS.who, state.who); emit(); }

  const listeners = []; function onChange(fn) { listeners.push(fn); } function emit() { listeners.forEach(fn => fn()); }
  S.onChange(emit);

  // ---- Map: satellite imagery draped on 3D terrain, a warm sky, pins that sit on the ground, journey paths drawn into the map ----
  // Settings live in window.MAPWORLD (world.js); every effect can be switched off.
  const MW = () => window.MAPWORLD || { satellite: true, terrain: true, buildings: true, tilt: true, paths: true, pins: true, labels: true, mode: "tilt" };
  const HOT = "#ffaa00";
  function style(p) {
    return {
      version: 8, glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
      sources: {
        omt: { type: "vector", url: "https://tiles.openfreemap.org/planet" },
        sat: { type: "raster", tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"], tileSize: 256, maxzoom: 17, attribution: "Imagery: Esri, Maxar, Earthstar Geographics" },
        dem: { type: "raster-dem", tiles: ["https://tiles.mapterhorn.com/{z}/{x}/{y}.webp"], encoding: "terrarium", tileSize: 512, maxzoom: 12, attribution: "Terrain: Mapterhorn, Copernicus DEM" },
      },
      sky: { "sky-color": "#6fa6c9", "horizon-color": "#f1d9b8", "fog-color": "#dfe8ee", "fog-ground-blend": 0.55, "horizon-fog-blend": 0.7, "sky-horizon-blend": 0.65, "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 6, 1, 8, 0] },
      layers: [
        { id: "bg", type: "background", paint: { "background-color": "#0a1e2a" } },
        { id: "sat", type: "raster", source: "sat", paint: { "raster-saturation": 0.5, "raster-contrast": 0.2, "raster-brightness-min": 0, "raster-fade-duration": 200 } },
        { id: "water-tint", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": "#0aa3c7", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.25, 9, 0.1, 12, 0] } },
        { id: "hills", type: "hillshade", source: "dem", layout: { visibility: "none" }, paint: { "hillshade-exaggeration": 0.22, "hillshade-shadow-color": "#102030", "hillshade-highlight-color": "#fff5e0", "hillshade-accent-color": "#4a4a3a" } },
        { id: "roads", type: "line", source: "omt", "source-layer": "transportation", minzoom: 11, filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary"]]], paint: { "line-color": "#fff6e4", "line-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0.15, 14, 0.5], "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.5, 15, 2] } },
        { id: "buildings", type: "fill-extrusion", source: "omt", "source-layer": "building", minzoom: 13.5, paint: { "fill-extrusion-color": "#f3ead9", "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6], "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0], "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 13.5, 0, 14.5, 0.78] } },
        { id: "places", type: "symbol", source: "omt", "source-layer": "place", filter: ["in", ["get", "class"], ["literal", ["city", "town", "island"]]], minzoom: 9.5,
          layout: { "text-field": ["coalesce", ["get", "name:latin"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 13, 13], "text-letter-spacing": 0.14, "text-transform": "uppercase" },
          paint: { "text-color": "#ffffff", "text-opacity": 1, "text-halo-color": "rgba(5,20,30,.95)", "text-halo-width": 1.3 } },
      ],
    };
  }
  // journey legs as 3D paths for deck.gl: the flight arcs into the sky, ferries ride a few metres above the sea
  const BLR = [77.7066, 13.1989], HKT = T.places.airport.lngLat, TOWN = [98.3923, 7.8804], KATA = [98.2955, 7.8125];
  const rev = a => a.slice().reverse(), rt = id => (T.routes.find(x => x.id === id) || { coords: [] }).coords;
  const toRad = d => d * Math.PI / 180, toDeg = x => x * 180 / Math.PI;
  function greatCircle(a, b, n) { const [l1, p1, l2, p2] = [toRad(a[0]), toRad(a[1]), toRad(b[0]), toRad(b[1])]; const d = 2 * Math.asin(Math.sqrt(Math.sin((p1 - p2) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l1 - l2) / 2) ** 2)); const out = []; for (let i = 0; i <= n; i++) { const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d); const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2), y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2), z = A * Math.sin(p1) + B * Math.sin(p2); out.push([toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), Math.sin(f * Math.PI) * d * 6371000 * 0.12]); } return out; }
  function densify(pts, alt, n) { const out = []; for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < n; k++) { const f = k / n; out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f, alt]); } out.push([...pts[pts.length - 1].slice(0, 2), alt]); return out; }
  const LEGS = { flight: { kind: "air", pts: [BLR, HKT], seconds: 7 }, L1: { kind: "road", pts: [HKT, [98.34, 8.0], TOWN], seconds: 4 }, L2b: { kind: "sea", pts: rev(rt("r3")), seconds: 6 }, L3b: { kind: "sea", pts: rt("r4"), seconds: 6 }, L5b: { kind: "road", pts: rev(rt("r1")).concat([KATA]), seconds: 7 }, L6: { kind: "road", pts: [KATA, [98.31, 7.95], HKT], seconds: 4 } };
  for (const id in LEGS) { const L = LEGS[id]; if (L.pts.length < 2) { delete LEGS[id]; continue; } L.path = L.kind === "air" ? greatCircle(L.pts[0], L.pts[1], 64) : densify(L.pts, L.kind === "sea" ? 15 : 25, 12); L.times = L.path.map((_, i) => i / (L.path.length - 1) * L.seconds); }
  const DAY_LEG = { 1: "L1", 2: "L2b", 3: "L3b", 5: "L5b", 8: "L6" };
  let overlay = null, activeLeg = null, legT0 = performance.now(), lastDeck = 0;
  function setLeg(dayN) { activeLeg = DAY_LEG[dayN] || null; legT0 = performance.now(); }
  function deckLayers(now) {
    if (!MW().paths || !window.deck) return [];
    const legs = Object.entries(LEGS).map(([id, L]) => ({ id, ...L }));
    const cur = activeLeg && LEGS[activeLeg] ? { id: activeLeg, ...LEGS[activeLeg] } : null;
    const out = [new deck.PathLayer({ id: "legs", data: legs, getPath: l => l.path, getColor: l => cur && l.id === cur.id ? [255, 170, 0, 255] : [64, 214, 255, 255], getWidth: l => cur && l.id === cur.id ? 3 : 1.6, widthUnits: "pixels", capRounded: true, jointRounded: true, beforeId: "places", updateTriggers: { getColor: activeLeg, getWidth: activeLeg } })];
    if (cur) { out.push(new deck.PathLayer({ id: "leg-core", data: [cur], getPath: l => l.path, getColor: [255, 255, 255, 190], widthMinPixels: 1, capRounded: true, jointRounded: true, beforeId: "places" })); const t = ((now - legT0) / 1000) % (cur.seconds + 1.6); out.push(new deck.TripsLayer({ id: "leg-light", data: [cur], getPath: l => l.path, getTimestamps: l => l.times, getColor: [255, 255, 255, 255], widthMinPixels: 5, capRounded: true, jointRounded: true, trailLength: cur.seconds * 0.38, currentTime: t, beforeId: "places" })); }
    return out;
  }
  function initMap(opts) {
    const w = MW();
    const map = window.__tripMap = new maplibregl.Map({ container: opts.container, style: style(opts.palette), center: [98.6, 7.95], zoom: 8.6, pitch: 0, bearing: 0, attributionControl: false, interactive: true, maxPitch: 70, fadeDuration: 150, maxTileCacheSize: 80, pixelRatio: Math.min(window.devicePixelRatio || 1, 2) });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), opts.attribution || "bottom-right");
    // set up on style.load, not load: with satellite and terrain, "load" waits for every tile (often 10 s or more on a phone), and a link opened straight to a day page would sit on the wrong map until then
    map.once("style.load", () => {
      // globe only when zoomed far out (the opening from Bengaluru); flat over Thailand, where it looks the same and saves about 10 fps with terrain on
      const projFor = () => map.getZoom() < 6.5 ? "globe" : "mercator";
      map.setProjection({ type: projFor() });
      map.on("zoom", () => { const want = projFor(); if ((map.getProjection() || {}).type !== want) map.setProjection({ type: want }); });
      // progressive: the first paint is flat satellite; terrain and the tilt arrive once the first tiles are in (keeps a phone from freezing on open)
      map.once("idle", () => { const ww = MW(); if (ww.terrain) map.setTerrain({ source: "dem", exaggeration: 1.25 }); if (ww.tilt && map.getPitch() === 0 && !map.isMoving()) map.easeTo({ pitch: document.body.classList.contains("has-sheet") ? (innerWidth <= 720 ? 30 : 50) : (innerWidth <= 720 ? 34 : 42), duration: 1200 }); });
      map.addSource("routes", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "route-road", type: "line", source: "routes", paint: { "line-color": HOT, "line-width": 0 } });
      map.addLayer({ id: "route-sea", type: "line", source: "routes", paint: { "line-color": HOT, "line-width": 0 } });
      map.addSource("stops", { type: "geojson", data: { type: "FeatureCollection", features: ["phuket", "aonang", "phiphi"].map(k => ({ type: "Feature", properties: { name: T.places[k].name }, geometry: { type: "Point", coordinates: T.places[k].lngLat } })) } });
      map.addLayer({ id: "stops", type: "circle", source: "stops", maxzoom: 10.5, paint: { "circle-radius": 5, "circle-color": HOT, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
      map.addSource("items", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "items-all", type: "circle", source: "items", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 14, 4.6], "circle-color": "#ffffff", "circle-opacity": 0.9, "circle-stroke-color": "#0a1e2a", "circle-stroke-width": 1.2, "circle-stroke-opacity": 0.6 } });
      map.addLayer({ id: "items-glow", type: "circle", source: "items", filter: ["==", ["get", "hot"], 1], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 5, 13, 11, 15, 16], "circle-color": HOT, "circle-opacity": 0.5, "circle-blur": 0.6 } });
      map.addLayer({ id: "items-hot", type: "circle", source: "items", filter: ["==", ["get", "hot"], 1], paint: { "circle-radius": 6, "circle-color": HOT, "circle-opacity": 0.95, "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } });
      map.addLayer({ id: "items-label", type: "symbol", source: "items", filter: ["==", ["get", "hot"], 1], layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-offset": [0, 1.2], "text-anchor": "top", "text-optional": true, "text-max-width": 9 }, paint: { "text-color": "#ffffff", "text-halo-color": "rgba(5,20,30,.95)", "text-halo-width": 1.4 } });
      map.addSource("zones", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "zones-fill", type: "circle", source: "zones", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 16, 13, 48], "circle-color": "#ffffff", "circle-opacity": 0.08, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1, "circle-stroke-opacity": 0.35 } });
      map.addLayer({ id: "zones-label", type: "symbol", source: "zones", layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-letter-spacing": 0.14, "text-transform": "uppercase", "text-offset": [0, -1.8], "text-anchor": "bottom" }, paint: { "text-color": "#ffffff", "text-opacity": 0.9, "text-halo-color": "rgba(10,30,42,.8)", "text-halo-width": 1.3 } });
      map.on("click", e => { const hit = map.queryRenderedFeatures(e.point, { layers: ["items-all", "items-hot", "zones-fill", "measure-pt"].filter(l => map.getLayer(l)) }); if (!hit.length && opts.onEmptyClick) opts.onEmptyClick(); });
      map.on("click", "zones-fill", e => { const f = e.features[0]; if (opts.onZoneClick) opts.onZoneClick(f.properties.id); });
      map.on("mouseenter", "zones-fill", () => { map.getCanvas().style.cursor = "pointer"; }); map.on("mouseleave", "zones-fill", () => { map.getCanvas().style.cursor = ""; });
      const pop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, className: "mw-pop", maxWidth: "260px" });
      const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
      const preview = id => { const it = T.items[id]; if (!it) return ""; const img = it.images && it.images[0]; const kind = { stay: "Stay", do: "Do", eat: "Eat", drink: "Drink", dive: "Dive" }[it.type] || ""; const price = it.priceINR ? `${new Intl.NumberFormat("en-IN").format(Math.round(it.priceINR))} INR` : it.priceTHB ? `฿${it.priceTHB}` : ""; return `${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ""}<div class="pv"><b>${esc(it.name)}</b><small>${esc([kind, it.rating ? it.rating + "/" + (it.scale || 10) : "", price].filter(Boolean).join(" · "))}</small><span>${esc(it.tagline || "")}</span></div>`; };
      for (const layer of ["items-all", "items-hot"]) {
        map.on("mouseenter", layer, e => { map.getCanvas().style.cursor = "pointer"; const f = e.features[0]; pop.setLngLat(f.geometry.coordinates).setHTML(preview(f.properties.id) || "<div class=\"pv\"><b>" + esc(f.properties.name) + "</b></div>").addTo(map); });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; pop.remove(); });
        map.on("click", layer, e => { const f = e.features[0]; if (opts.onItemClick) opts.onItemClick(f.properties.id); });
      }
      map.addSource("measure", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "measure-line", type: "line", source: "measure", filter: ["==", ["geometry-type"], "LineString"], layout: { "line-cap": "round" }, paint: { "line-color": ["case", ["==", ["get", "primary"], 1], HOT, "#ffffff"], "line-width": ["case", ["==", ["get", "primary"], 1], 2.2, 1.2], "line-dasharray": [2, 2.5], "line-opacity": 0.9 } });
      map.addLayer({ id: "measure-pt", type: "circle", source: "measure", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": ["case", ["==", ["get", "kind"], "home"], 8, 5], "circle-color": ["case", ["==", ["get", "kind"], "home"], HOT, "#ffffff"], "circle-stroke-color": ["case", ["==", ["get", "kind"], "home"], "#ffffff", HOT], "circle-stroke-width": 2 } });
      map.addLayer({ id: "measure-label", type: "symbol", source: "measure", filter: ["==", ["geometry-type"], "Point"], layout: { "text-field": ["get", "label"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-offset": [0, 1.3], "text-anchor": "top", "text-max-width": 10 }, paint: { "text-color": "#ffffff", "text-halo-color": "rgba(10,30,42,.85)", "text-halo-width": 1.4 } });
      if (window.deck && window.deck.MapboxOverlay) { overlay = new deck.MapboxOverlay({ interleaved: true, layers: [] }); map.addControl(overlay); }
      // animate only what is on screen: the glow when a pick is pinned, the light when a leg is live. Otherwise the map stays still and the GPU idles (terrain repaints are the expensive part).
      let hotCount = 0, lastLegKey = null;
      map.on("sourcedata", e => { if (e.sourceId === "items" && e.isSourceLoaded) { try { hotCount = map.getSource("items").serialize().data.features.filter(f => f.properties.hot).length; } catch (x) { hotCount = 0; } } });
      const tick = now => {
        if (!document.hidden && now - lastDeck > 41) {
          lastDeck = now; const w = MW();
          if (w.pins && hotCount) { const s = 0.5 + 0.5 * Math.sin(now / 420); const k = 0.75 + s * 0.6; map.setPaintProperty("items-glow", "circle-radius", ["interpolate", ["linear"], ["zoom"], 10, 5 * k, 13, 11 * k, 15, 16 * k]); map.setPaintProperty("items-glow", "circle-opacity", 0.58 - s * 0.3); }
          const legKey = (w.paths ? "p" : "") + ":" + (activeLeg || "");
          if (overlay && (activeLeg || legKey !== lastLegKey)) { lastLegKey = legKey; overlay.setProps({ layers: deckLayers(now) }); }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      applyWorld(map);
      if (opts.onLoad) opts.onLoad(map);
    });
    return map;
  }
  // frame the whole journey (the Maps page): every leg, with room for the sheet
  function fitJourney(map, padding) {
    if (!map) return; const b = new maplibregl.LngLatBounds();
    for (const id in LEGS) if (id !== "flight") LEGS[id].pts.forEach(p => b.extend(p));
    map.fitBounds(b, { padding: padding || { top: 90, bottom: 90, left: 60, right: 60 }, pitch: MW().tilt ? 35 : 0, bearing: 0, duration: 2200, maxZoom: 10 });
  }
  // apply the switches to a live map
  function applyWorld(map) {
    const w = MW(); if (!map || !map.getLayer || !map.getLayer("sat")) return;
    const vis = (id, on) => map.getLayer(id) && map.setLayoutProperty(id, "visibility", on ? "visible" : "none");
    vis("sat", w.satellite); map.setPaintProperty("water-tint", "fill-opacity", w.satellite ? ["interpolate", ["linear"], ["zoom"], 4, 0.25, 9, 0.1, 12, 0] : 0.9); map.setPaintProperty("bg", "background-color", w.satellite ? "#0a1e2a" : "#1a2a34");
    map.setTerrain(w.terrain ? { source: "dem", exaggeration: 1.25 } : null); vis("hills", false);  // hillshade stays off: the imagery carries the relief and the layer cost frames
    vis("buildings", w.buildings);
    ["items-all", "items-glow", "items-hot"].forEach(id => vis(id, w.pins)); vis("items-label", w.pins && w.labels); vis("places", w.labels);
    if (!w.tilt && map.getPitch() > 0) map.easeTo({ pitch: 0, bearing: 0, duration: 600 });
  }
  // Lines from one place to several targets, labelled with distance and time. targets: [{name, lngLat, kind, label, primary}]
  function setMeasure(map, home, targets) {
    if (!map || !map.getSource || !map.getSource("measure")) return null;
    if (!home) { map.getSource("measure").setData({ type: "FeatureCollection", features: [] }); return null; }
    const f = [{ type: "Feature", properties: { kind: "home", label: home.name }, geometry: { type: "Point", coordinates: home.lngLat } }];
    for (const t of targets) {
      f.push({ type: "Feature", properties: { primary: t.primary ? 1 : 0 }, geometry: { type: "LineString", coordinates: [home.lngLat, t.lngLat] } });
      f.push({ type: "Feature", properties: { kind: t.kind, label: t.name + "\n" + t.label }, geometry: { type: "Point", coordinates: t.lngLat } });
    }
    map.getSource("measure").setData({ type: "FeatureCollection", features: f });
    const b = new maplibregl.LngLatBounds(); f.forEach(x => x.geometry.type === "Point" ? b.extend(x.geometry.coordinates) : null); return b;
  }
  function setZones(map, zones) {
    if (!map || !map.getSource || !map.getSource("zones")) return;
    map.getSource("zones").setData({ type: "FeatureCollection", features: (zones || []).map(z => ({ type: "Feature", properties: { id: z.id, name: z.name }, geometry: { type: "Point", coordinates: z.lngLat } })) });
  }
  // Show items with coordinates; hot ids get the bigger marker + label. Returns the hot features' bounds or null.
  function setMarkers(map, items, hotIds) {
    if (!map || !map.getSource || !map.getSource("items")) return null;
    const hot = new Set(hotIds || []);
    const feats = items.filter(it => it.lngLat).map(it => ({ type: "Feature", properties: { id: it.id, name: it.name, hot: hot.has(it.id) ? 1 : 0 }, geometry: { type: "Point", coordinates: it.lngLat } }));
    map.getSource("items").setData({ type: "FeatureCollection", features: feats });
    const hf = feats.filter(f => f.properties.hot); if (!hf.length) return null;
    const b = new maplibregl.LngLatBounds(); hf.forEach(f => b.extend(f.geometry.coordinates)); return b;
  }
  function flyTo(map, placeKey, extra) {
    const p = T.places[placeKey]; if (!p) return;
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    const w = MW(), o = Object.assign({ center: p.lngLat, zoom: p.zoom, duration: reduce ? 0 : (window.innerWidth <= 720 ? 800 : 1100), curve: 1.3 }, extra || {});  // 800/1100 ms: the main session's "faster motion" timings, kept
    const sheetOpen = document.body.classList.contains("has-sheet");
    const phone = window.innerWidth <= 720;
    // on a phone the sheet hides the lower two thirds, so a steep tilt would show only the horizon: keep it shallow there
    if (w.tilt && !(sheetOpen && w.mode === "fade")) { o.pitch = sheetOpen ? (phone ? 30 : 50) : (phone ? 34 : 42); o.bearing = sheetOpen ? ({ phuket: -24, phiphi: 38, aonang: 12, krabi: -30, airport: 0 }[placeKey] || 0) : 0; }
    map.flyTo(o);
  }

  function groupsByBase() {
    const g = [];
    for (const d of T.days) { const last = g[g.length - 1]; if (last && last.base === d.base) last.days.push(d); else g.push({ base: d.base, days: [d] }); }
    return g;
  }

  // one soft ring around a marker, once (after a lock)
  function pulse(map, id) {
    if (!map || !map.getSource || !map.getSource("items")) return;
    if (!map.getLayer("items-pulse")) map.addLayer({ id: "items-pulse", type: "circle", source: "items", filter: ["==", ["get", "id"], "__none__"], paint: { "circle-radius": 6, "circle-color": "#ffaa00", "circle-opacity": 0.5, "circle-stroke-width": 0 } });
    map.setFilter("items-pulse", ["==", ["get", "id"], id]);
    const t0 = performance.now(), dur = 900;
    const step = now => { const q = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - q, 2); map.setPaintProperty("items-pulse", "circle-radius", 6 + 22 * e); map.setPaintProperty("items-pulse", "circle-opacity", 0.5 * (1 - q)); if (q < 1) requestAnimationFrame(step); else map.setFilter("items-pulse", ["==", ["get", "id"], "__none__"]); };
    requestAnimationFrame(step);
  }
  window.CORE = { T, state, fmtINR, fmtK, thbToInr, decision, lockedOption, lock, budget, addNote, setWho, onChange, initMap, flyTo, setMarkers, setZones, setMeasure, groupsByBase, pulse, setLeg, applyWorld, fitJourney, LEGS };
})();
