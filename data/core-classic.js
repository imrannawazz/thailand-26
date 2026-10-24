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

  // ---- Map ----
  function style(p) {
    return {
      version: 8,
      glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
      sources: { omt: { type: "vector", url: "https://tiles.openfreemap.org/planet" } },
      layers: [
        { id: "bg", type: "background", paint: { "background-color": p.land } },
        { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": p.water } },
        { id: "park", type: "fill", source: "omt", "source-layer": "landcover", filter: ["in", ["get", "class"], ["literal", ["wood", "grass", "farmland"]]], paint: { "fill-color": p.cover, "fill-opacity": 0.6 } },
        { id: "roads", type: "line", source: "omt", "source-layer": "transportation", filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]], paint: { "line-color": p.road, "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.4, 13, 1.6] } },
        { id: "places", type: "symbol", source: "omt", "source-layer": "place", filter: ["in", ["get", "class"], ["literal", ["city", "town", "island"]]], minzoom: 10.5,
          layout: { "text-field": ["coalesce", ["get", "name:latin"], ["get", "name"]], "text-font": ["Noto Sans Regular"], "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 13, 13], "text-letter-spacing": 0.08, "text-transform": "uppercase" },
          paint: { "text-color": p.label, "text-opacity": 0.5 } }
      ]
    };
  }
  function initMap(opts) {
    const map = new maplibregl.Map({ container: opts.container, style: style(opts.palette), center: [98.6, 7.95], zoom: 8.6, pitch: opts.pitch || 0, bearing: 0, attributionControl: false, interactive: true, dragRotate: false, pitchWithRotate: false });
    map.addControl(new maplibregl.AttributionControl({ compact: true }), opts.attribution || "bottom-right");
    map.on("load", () => { const a = document.querySelector("#" + opts.container + " .maplibregl-ctrl-attrib"); if (a) a.classList.remove("maplibregl-compact-show"); });
    map.on("load", () => {
      map.addSource("routes", { type: "geojson", data: { type: "FeatureCollection", features: T.routes.map(r => ({ type: "Feature", properties: { id: r.id, kind: r.kind }, geometry: { type: "LineString", coordinates: r.coords } })) } });
      map.addLayer({ id: "route-road", type: "line", source: "routes", filter: ["==", ["get", "kind"], "road"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": opts.palette.route, "line-width": 2.8, "line-opacity": 0.95 } });
      map.addLayer({ id: "route-sea", type: "line", source: "routes", filter: ["==", ["get", "kind"], "sea"], layout: { "line-cap": "round" }, paint: { "line-color": opts.palette.route, "line-width": 1.8, "line-dasharray": [1.5, 2.5], "line-opacity": 0.9 } });
      map.addSource("stops", { type: "geojson", data: { type: "FeatureCollection", features: ["phuket", "aonang", "phiphi", "krabi"].map(k => ({ type: "Feature", properties: { name: T.places[k].name }, geometry: { type: "Point", coordinates: T.places[k].lngLat } })) } });
      map.addLayer({ id: "stops", type: "circle", source: "stops", paint: { "circle-radius": 4, "circle-color": opts.palette.route, "circle-opacity": 0.95 } });
      map.addSource("items", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "items-all", type: "circle", source: "items", paint: { "circle-radius": 3.5, "circle-color": opts.palette.marker || opts.palette.route, "circle-opacity": 0.4, "circle-stroke-width": 0 } });
      map.addLayer({ id: "items-hot", type: "circle", source: "items", filter: ["==", ["get", "hot"], 1], paint: { "circle-radius": 6, "circle-color": opts.palette.marker || opts.palette.route, "circle-opacity": 0.95, "circle-stroke-color": opts.palette.land, "circle-stroke-width": 1.5 } });
      map.addLayer({ id: "items-label", type: "symbol", source: "items", filter: ["==", ["get", "hot"], 1], layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 11, "text-offset": [0, 1.1], "text-anchor": "top", "text-optional": true, "text-max-width": 10 }, paint: { "text-color": opts.palette.markerText || opts.palette.label, "text-halo-color": opts.palette.land, "text-halo-width": 1.2 } });
      map.addSource("zones", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "zones-fill", type: "circle", source: "zones", paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 14, 13, 44], "circle-color": opts.palette.marker || opts.palette.route, "circle-opacity": 0.09, "circle-stroke-color": opts.palette.marker || opts.palette.route, "circle-stroke-opacity": 0.35, "circle-stroke-width": 1 } }, "items-all");
      map.addLayer({ id: "zones-label", type: "symbol", source: "zones", layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-letter-spacing": 0.12, "text-transform": "uppercase", "text-offset": [0, -1.6], "text-anchor": "bottom", "text-max-width": 9 }, paint: { "text-color": opts.palette.markerText || opts.palette.label, "text-halo-color": opts.palette.land, "text-halo-width": 1.4 } });
      map.on("click", e => { const hit = map.queryRenderedFeatures(e.point, { layers: ["items-all", "items-hot", "zones-fill", "measure-pt"].filter(l => map.getLayer(l)) }); if (!hit.length && opts.onEmptyClick) opts.onEmptyClick(); });
      map.on("click", "zones-fill", e => { const f = e.features[0]; if (opts.onZoneClick) opts.onZoneClick(f.properties.id); });
      map.on("mouseenter", "zones-fill", () => { map.getCanvas().style.cursor = "pointer"; }); map.on("mouseleave", "zones-fill", () => { map.getCanvas().style.cursor = ""; });
      const pop = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 });
      for (const layer of ["items-all", "items-hot"]) {
        map.on("mouseenter", layer, e => { map.getCanvas().style.cursor = "pointer"; const f = e.features[0]; pop.setLngLat(f.geometry.coordinates).setHTML("<span style=\"font:500 12px/1.3 system-ui\">" + f.properties.name + "</span>").addTo(map); });
        map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; pop.remove(); });
        map.on("click", layer, e => { const f = e.features[0]; if (opts.onItemClick) opts.onItemClick(f.properties.id); });
      }
      map.addSource("measure", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "measure-line", type: "line", source: "measure", filter: ["==", ["geometry-type"], "LineString"], layout: { "line-cap": "round" }, paint: { "line-color": ["case", ["==", ["get", "primary"], 1], opts.palette.route, opts.palette.label], "line-width": ["case", ["==", ["get", "primary"], 1], 2.6, 1.4], "line-dasharray": [2, 1.6], "line-opacity": 0.9 } });
      map.addLayer({ id: "measure-pt", type: "circle", source: "measure", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": ["case", ["==", ["get", "kind"], "home"], 8, 5], "circle-color": ["case", ["==", ["get", "kind"], "home"], "#c2410c", ["==", ["get", "kind"], "beach"], "#0e7490", opts.palette.route], "circle-stroke-color": opts.palette.land, "circle-stroke-width": 2 } });
      map.addLayer({ id: "measure-label", type: "symbol", source: "measure", filter: ["==", ["geometry-type"], "Point"], layout: { "text-field": ["get", "label"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-offset": [0, 1.3], "text-anchor": "top", "text-max-width": 14 }, paint: { "text-color": opts.palette.markerText || "#1c1c1a", "text-halo-color": opts.palette.land, "text-halo-width": 1.6 } });
      if (opts.onLoad) opts.onLoad(map);
    });
    return map;
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
    map.flyTo(Object.assign({ center: p.lngLat, zoom: p.zoom, duration: reduce ? 0 : (window.innerWidth <= 720 ? 800 : 1100), curve: 1.3 }, extra || {}));
  }

  function groupsByBase() {
    const g = [];
    for (const d of T.days) { const last = g[g.length - 1]; if (last && last.base === d.base) last.days.push(d); else g.push({ base: d.base, days: [d] }); }
    return g;
  }

  // one soft ring around a marker, once (after a lock)
  function pulse(map, id) {
    if (!map || !map.getSource || !map.getSource("items")) return;
    if (!map.getLayer("items-pulse")) map.addLayer({ id: "items-pulse", type: "circle", source: "items", filter: ["==", ["get", "id"], "__none__"], paint: { "circle-radius": 6, "circle-color": "#2f5f8c", "circle-opacity": 0.5, "circle-stroke-width": 0 } });
    map.setFilter("items-pulse", ["==", ["get", "id"], id]);
    const t0 = performance.now(), dur = 900;
    const step = now => { const q = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - q, 2); map.setPaintProperty("items-pulse", "circle-radius", 6 + 22 * e); map.setPaintProperty("items-pulse", "circle-opacity", 0.5 * (1 - q)); if (q < 1) requestAnimationFrame(step); else map.setFilter("items-pulse", ["==", ["get", "id"], "__none__"]); };
    requestAnimationFrame(step);
  }
  window.CORE = { T, state, fmtINR, fmtK, thbToInr, decision, lockedOption, lock, budget, addNote, setWho, onChange, initMap, flyTo, setMarkers, setZones, setMeasure, groupsByBase, pulse };
})();
