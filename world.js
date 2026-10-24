// Map world switches and the two day-page behaviours (tilt in, or fade back). Loads before app.js; the map reads window.MAPWORLD.
(function () {
  const KEY = "trip.mapworld.v1";
  const defaults = { satellite: true, terrain: true, buildings: true, tilt: true, paths: true, pins: true, labels: true, mode: "tilt" };
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}
  const W = window.MAPWORLD = Object.assign({}, defaults, saved);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(W)); } catch (e) {} };
  const mapOf = () => window.__tripMap;

  function menu() {
    const host = document.getElementById("menu"); if (!host || host.querySelector(".mw-dd")) return;
    const sw = (k, label, hint) => `<label><span>${label}<small>${hint}</small></span><input type="checkbox" data-mw="${k}" ${W[k] ? "checked" : ""}><span class="sw"></span></label>`;
    const dd = document.createElement("div"); dd.className = "dd mw-dd";
    dd.innerHTML = `<button class="nav-link dd-btn" aria-expanded="false" aria-haspopup="true">Map</button><div class="dd-panel mw-menu" role="menu">
      <h4>When a day opens</h4><!-- Imran 2026-10-24: tilt is the default; fade stays as a per-device option -->
      <div class="seg"><button data-mode="tilt" class="${W.mode === "tilt" ? "on" : ""}">Map tilts in</button><button data-mode="fade" class="${W.mode === "fade" ? "on" : ""}">Map fades back</button></div>
      <h4>The map</h4>
      ${sw("satellite", "Satellite", "imagery over the terrain")}${sw("terrain", "3D terrain", "real hills and cliffs")}${sw("buildings", "Buildings", "when zoomed in close")}${sw("tilt", "Tilted camera", "flies in at an angle")}
      <h4>Drawn on top</h4>
      ${sw("paths", "Journey paths", "flight and ferry legs, with a light on today's")}${sw("pins", "Pins", "everything researched, picks glowing")}${sw("labels", "Labels", "town and pin names")}
    </div>`;
    const budgetBtn = host.querySelector('[data-go="budget"]'); host.insertBefore(dd, budgetBtn || null);
    dd.addEventListener("change", e => { const k = e.target.dataset.mw; if (!k) return; W[k] = e.target.checked; save(); if (window.CORE && CORE.applyWorld) CORE.applyWorld(mapOf()); });
    dd.addEventListener("click", e => { const b = e.target.closest("[data-mode]"); if (!b) return; e.stopPropagation(); W.mode = b.dataset.mode; save(); dd.querySelectorAll("[data-mode]").forEach(x => x.classList.toggle("on", x === b)); applyMode(true); });
    dd.querySelector(".mw-menu").addEventListener("click", e => { if (e.target.closest("label")) e.stopPropagation(); });
  }
  function applyMode(refly) {
    document.body.classList.toggle("map-fade", W.mode === "fade");
    const m = mapOf(); if (!m || !refly) return;
    const open = document.body.classList.contains("has-sheet");
    if (W.mode === "fade" || !W.tilt) m.easeTo({ pitch: open ? 0 : (W.tilt ? 42 : 0), bearing: 0, duration: 700 });
    else m.easeTo({ pitch: open ? 50 : 42, duration: 700 });
  }
  // which leg the light runs along: the day being viewed
  function syncLeg() { const m = location.hash.match(/#day-(\d+)/); if (window.CORE && CORE.setLeg) CORE.setLeg(m ? Number(m[1]) : null); }
  // stagger the sheet's children on each new page, but not on in-place re-renders of the same page
  let lastKey = null;
  function stagger() {
    const sheet = document.getElementById("sheet"); if (!sheet || sheet.hidden) { lastKey = null; return; }
    const key = location.hash.replace(/\/i-[^/]+/, "").replace(/\/t-[^/]+/, "");
    const wrap = sheet.querySelector(".wrap"); if (!wrap) return;
    if (key === lastKey) { sheet.classList.add("still"); return; }
    lastKey = key; sheet.classList.remove("still"); [...wrap.children].forEach((el, i) => el.style.setProperty("--i", Math.min(i, 8)));
  }
  // while the map moves, the panels drop their blur (compositing a blur over a redrawing canvas cost about 10 fps)
  function watchMotion() { const m = mapOf(); if (!m) return setTimeout(watchMotion, 300); let tm = null; m.on("movestart", () => { clearTimeout(tm); document.body.classList.add("map-moving"); }); m.on("moveend", () => { tm = setTimeout(() => document.body.classList.remove("map-moving"), 120); }); }
  addEventListener("load", () => {
    watchMotion(); menu(); applyMode(false); syncLeg();
    new MutationObserver(() => { stagger(); }).observe(document.getElementById("sheet"), { childList: true });
    new MutationObserver(() => { applyMode(false); }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
    addEventListener("hashchange", () => { syncLeg(); });
  });
})();
