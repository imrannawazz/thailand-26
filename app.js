// Three-level shell on direction L. Level 1: map + day highlights. Level 2: day page as tabs (or activity / essentials page). Level 3: item card.
// State (locks, picks, notes, name) is localStorage until the backend exists.
// Hash routing: #day-3 · #day-3/t-eat · #day-3/t-eat/i-<id> · #act-scuba · #act-scuba/i-<id> · #essentials
(function () {
  const T = window.TRIP, C = window.CORE;
  const h = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const $ = sel => document.querySelector(sel);
  const PLACE = k => T.places[k] || { name: k, thai: "" };
  const fmt = C.fmtINR;
  const inr = thb => Math.round(thb * T.fx.inrPerThb);
  const ITEMS = Object.values(T.items);
  const poolOf = (type, place) => ITEMS.filter(it => it.type === type && it.place === place);
  const samePlace = (it, place) => it.place === place || (place === "aonang" && it.place === "krabi");

  // ---- who: one of five names; everything else lives in STORE (shared when configured) ----
  const S = window.STORE;
  const NAMES = ["Meera", "Imran", "Sisir", "Sparsh", "Anoushka"];
  const NAME_FIX = { Mira: "Meera", Anushka: "Anoushka" };
  if (NAME_FIX[C.state.who]) C.setWho(NAME_FIX[C.state.who]);
  const who = () => NAMES.includes(C.state.who) ? C.state.who : null;
  const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  function toggleReject(id) { const w = who(); if (!w) return gate(); S.setReject(id, w, !S.rejectsFor(id).includes(w)); }
  function addComment(id, text) { const w = who(); if (!w) return gate(); if (!text.trim()) return; S.addComment(id, w, text.trim()); }
  function removeComment(id) { S.delComment(id); }
  function gate() { $("#gate").hidden = false; }
  function pickName(n) { C.setWho(n); $("#gate").hidden = true; document.querySelectorAll("#gate .names button").forEach(b => b.classList.toggle("on", b.dataset.name === n)); }
  const rejectedBy = id => S.rejectsFor(id);
  const commentCount = id => S.commentsFor(id).length;
  const lockWho = dId => (S.locks()[dId] || {}).who || null;
  const pickWho = id => (S.pickOf(id) || {}).who || null;
  const tagsFor = id => `${rejectedBy(id).length ? `<span class="act rej" title="Not for: ${h(rejectedBy(id).join(", "))}">✕ ${h(rejectedBy(id).join(", "))}</span>` : ""}${commentCount(id) ? `<span class="act" title="Comments">${commentCount(id)} comment${commentCount(id) === 1 ? "" : "s"}</span>` : ""}`;

  // ---- picks (items added to a day) ----
  const picks = new Proxy({}, { get: (_, day) => S.picksByDay()[day] || [], ownKeys: () => Object.keys(S.picksByDay()), getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }) });
  const isPicked = (day, id) => (S.pickOf(id) || {}).day === Number(day);
  const DAYS_FOR = place => T.days.filter(d => d.base === place || (place === "krabi" && d.base === "aonang")).map(d => d.n);
  // An item can go on a day only if the day is in its place and (when the day names its areas) the item's area is one of them:
  // Old Town things sit on day 1 (and Sunday, Lard Yai); beach things sit on days 5 to 7.
  const daysForItem = it => T.days.filter(d => (d.base === it.place || (it.place === "krabi" && d.base === "aonang")) && (!d.zones || !it.zone || d.zones.includes(it.zone))).map(d => d.n);
  const dayOfPick = id => (S.pickOf(id) || {}).day || null;
  function assign(id, day) { const w = who(); if (!w) return gate(); S.setPick(id, day ? Number(day) : null, w); }
  function chips(it) {
    const days = daysForItem(it); if (!days.length) return "";
    const on = dayOfPick(it.id);
    return `<span class="chips"><span class="lbl">Day</span>${days.map(n => `<button data-assign="${it.id}" data-day="${n}" class="${on === n ? "on" : ""}" aria-pressed="${on === n}" title="Put on day ${n}">${n}</button>`).join("")}${on ? `<button data-assign="${it.id}" data-day="" title="Remove from the plan">×</button>` : ""}</span>`;
  }
  function togglePick(day, id) { const w = who(); if (!w) return gate(); S.setPick(id, isPicked(day, id) ? null : Number(day), w); }
  const lockWith = (dId, oId) => { const w = who(); if (!w) return gate(); C.lock(dId, oId, w); };
  const itemCost = it => it.priceINR ? it.priceINR : it.priceTHB ? inr(it.priceTHB) * T.travellers : 0;
  const FLIGHTS_TOTAL = (T.flights && T.flights.perHeadINR || 0) * T.travellers;
  // miscellaneous budget lines live in STORE
  const misc = new Proxy([], { get: (_, k) => { const arr = S.state.misc; const v = arr[k]; return typeof v === "function" ? v.bind(arr) : v; } });
  const miscGroup = m => m.per === "head" ? m.inr * T.travellers : m.inr;
  function addMisc(name, inr, per) { const w = who(); if (!w) return gate(); if (!name.trim() || !(inr > 0)) return; S.addMisc(name.trim(), inr, per, w); }
  function removeMisc(id) { S.delMisc(id); }
  function budget() {
    const b = C.budget(); let extra = 0;
    for (const id in S.state.picks) { const it = T.items[id]; if (it) extra += itemCost(it); }
    const miscTotal = S.state.misc.reduce((a, m) => a + miscGroup(m), 0);
    const chosen = b.total + extra, total = chosen + FLIGHTS_TOTAL + miscTotal;
    return { chosen, flights: FLIGHTS_TOTAL, misc: miscTotal, total, perHead: total / T.travellers };
  }
  function dayCost(n) {
    const d = T.days.find(x => x.n === n); let total = 0;
    for (const id of d.decisions) { const dec = C.decision(id); const o = dec && C.lockedOption(dec); if (o && o.costINR) total += o.costINR; }
    for (const id of (S.picksByDay()[n] || [])) { const it = T.items[id]; if (it) total += itemCost(it); }
    return total;
  }

  // ---- routing ----
  let current = 0;
  function route() {
    const parts = location.hash.replace(/^#/, "").split("/").filter(Boolean);
    const page = parts[0] || "", tab = (parts.find(p => p.startsWith("t-")) || "").slice(2) || null, item = (parts.find(p => p.startsWith("i-")) || "").slice(2) || null;
    return { page, tab, item };
  }
  function go(hash) { if (location.hash !== "#" + hash) location.hash = hash; else render(); }
  function base(r) { return r.page + (r.tab ? "/t-" + r.tab : ""); }
  function closeTop() { const r = route(); measureFocus = null; if (r.item) go(base(r)); else go(""); }
  window.addEventListener("hashchange", render);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeTop(); if (!route().page) { if (e.key === "ArrowRight") selectDay(Math.min(7, current + 1)); if (e.key === "ArrowLeft") selectDay(Math.max(0, current - 1)); } });

  // ---- map ----
  let map, focused = null;
  function mapPadding(sheetOpen) {
    const w = innerWidth, hgt = innerHeight;
    if (w > 720) return sheetOpen ? { left: Math.min(760, Math.round(w * .58)) + 40, right: 50, top: 110, bottom: 60 } : { left: 60, right: 60, top: 120, bottom: Math.round(hgt * .42) };
    return sheetOpen ? { left: 24, right: 24, top: 90, bottom: Math.round(hgt * .66) + 16 } : { left: 20, right: 20, top: 100, bottom: Math.round(hgt * .6) };
  }
  function focusPlace(place, sheetOpen) {
    if (!map) return; focused = place;
    C.flyTo(map, place, { padding: mapPadding(sheetOpen), pitch: 0, bearing: 0, zoom: PLACE(place).zoom - 0.4 });
  }
  const mapReady = () => map && map.getSource && map.getSource("items");

  // ---- stay filters and sort ----
  const SF = { kind: "all", pool: false, walk: false, budget: false, sort: "score", zone: "all", q: "", ours: false, doc: false, allZones: false, open: innerWidth > 720 };
  const chosenByUs = id => !!S.pickOf(id) || Object.values(S.locks()).some(l => { for (const d of T.decisions) for (const o of d.options) if (o.id === l.optionId && (o.item === id || (o.items || []).includes(id))) return true; return false; });
  const fromDoc = it => it.tags.includes("docpick") || it.tags.includes("selfpick");
  const dist = (a, b) => Math.hypot((a[0] - b[0]) * Math.cos(8 * Math.PI / 180), a[1] - b[1]);
  function searchTarget(place) {
    // "closest to": a zone or an item whose name matches the search text gives a point to sort by
    const q = SF.q.trim().toLowerCase(); if (!q) return null;
    const g = T.guides[place === "krabi" ? "aonang" : place]; const z = g && g.zones.find(z => z.name.toLowerCase().includes(q) || z.id === q);
    if (z) return { name: z.name, lngLat: z.lngLat };
    const it = ITEMS.find(i => samePlace(i, place) && i.lngLat && i.name.toLowerCase().includes(q)); return it ? { name: it.name, lngLat: it.lngLat } : null;
  }
  const matchesQ = it => { const q = SF.q.trim().toLowerCase(); if (!q) return true; return [it.name, it.area, it.tagline, it.zoneName].filter(Boolean).some(x => x.toLowerCase().includes(q)); };
  function stayList(list) {
    let out = list.filter(it => it.type === "stay");
    if (SF.kind !== "all") out = out.filter(it => it.facts && it.facts.kind === SF.kind);
    if (SF.pool) out = out.filter(it => it.facts && (it.facts.pool === "private" || it.facts.pool === "shared"));
    if (SF.walk) out = out.filter(it => it.facts && it.facts.beachMode === "walk" && it.facts.beachMin !== null && it.facts.beachMin <= 15);
    if (SF.budget) out = out.filter(it => it.facts && it.facts.insideCap);
    if (SF.zone !== "all") out = out.filter(it => it.zone === SF.zone);
    if (SF.ours) out = out.filter(it => chosenByUs(it.id));
    if (SF.doc) out = out.filter(fromDoc);
    const target = SF.sort === "near" ? searchTarget(out[0] ? out[0].place : "phuket") : null;
    if (!target) out = out.filter(matchesQ);
    const near = it => target && it.lngLat ? dist(it.lngLat, target.lngLat) : 1e9;
    const key = {
      near, score: it => -(it.score && it.score.total || 0), price: it => (it.facts && it.facts.perHeadNight) || 1e9, rating: it => -((it.score && it.score.parts.reviews) || 0), beach: it => (it.facts && it.facts.beachMode === "walk" && it.facts.beachMin !== null) ? it.facts.beachMin : 999 }[SF.sort];
    return out.sort((a, b) => key(a) - key(b) || ((b.score && b.score.total) || 0) - ((a.score && a.score.total) || 0));
  }
  function filterBar(count, place) {
    const chip = (k, v, label) => `<button class="${(k === "kind" || k === "zone" ? SF[k] === v : SF[k]) ? "on" : ""}" data-f="${k}" data-v="${v}">${label}</button>`;
    const g = T.guides[place === "krabi" ? "aonang" : place];
    const pool = poolOf("stay", place); const zoneChips = g ? g.zones.filter(z => pool.some(it => it.zone === z.id)).map(z => chip("zone", z.id, `${z.name.split(" and ")[0].split(",")[0]} · ${pool.filter(it => it.zone === z.id).length}`)).join("") : "";
    const target = searchTarget(place);
    const active = [SF.zone !== "all", SF.kind !== "all", SF.pool, SF.walk, SF.budget, SF.ours, SF.doc, SF.sort !== "score"].filter(Boolean).length;
    return `<div class="fsearchrow"><input class="fsearch" id="fsearch" type="search" value="${h(SF.q)}" placeholder="Search a name or area: Rassada, Old Town, pool villa" autocomplete="off"><button class="ftoggle ${SF.open ? "on" : ""}" data-ftoggle aria-expanded="${!!SF.open}">Filters${active ? ` · ${active}` : ""}</button></div>${SF.q ? `<p class="small pending" style="margin:.3em 0 0">${target ? `Matched ${h(target.name)}; sort by "Nearest to" below.` : "Text match on names and areas."}</p>` : ""}<div class="fbar ${SF.open ? "" : "collapsed"}">
      <span class="lbl">Area</span>${chip("zone", "all", "All")}${zoneChips}
      <span class="lbl">Show</span>${chip("kind", "all", "All")}${chip("kind", "villa", "Villas")}${chip("kind", "hotel", "Hotels")}${chip("kind", "hostel", "Hostels")}
      <span class="lbl">Only</span>${chip("pool", true, "Pool")}${chip("walk", true, "Walk to beach")}${chip("budget", true, "Inside budget")}${chip("ours", true, "Chosen by us")}${chip("doc", true, "From the doc")}
      <span class="lbl">Sort</span>${["score", "price", "rating", "beach"].map(v => `<button class="${SF.sort === v ? "on" : ""}" data-f="sort" data-v="${v}">${{ score: "Best score", price: "Cheapest", rating: "Reviews", beach: "Nearest beach" }[v]}</button>`).join("")}${target ? `<button class="${SF.sort === "near" ? "on" : ""}" data-f="sort" data-v="near">Nearest to ${h(target.name)}</button>` : ""}
      <span class="lbl">${count} shown</span></div>`;
  }
  function scoreBadge(it) { return it.score && it.score.total !== null && it.score.total !== undefined ? `<span class="score" title="Score out of 100: reviews, budget, beach, pool">${it.score.total}</span>` : ""; }
  function factsLine(it) {
    if (!it.facts) return "";
    const f = it.facts, bits = [];
    bits.push({ villa: "Villa", hotel: "Hotel", hostel: "Hostel" }[f.kind] || "");
    if (f.pool === "private") bits.push("private pool"); else if (f.pool === "shared") bits.push("pool");
    if (f.beachMode === "walk" && f.beachMin !== null) bits.push(`${f.beachMin} min walk to the beach`); else if (f.beachMode === "drive") bits.push("beach by car"); else if (f.beachMode === "none" && !f.town) bits.push("no beach");
    if (f.perHeadNight) bits.push(`about ${fmt(f.perHeadNight)} INR a head a night${f.capRoom ? (f.insideCap ? ", inside the " + fmt(f.capRoom) + " a room cap" : ", over the " + fmt(f.capRoom) + " a room cap") : ""}`);
    return bits.filter(Boolean).join(" · ");
  }

  // ---- distances: nearest beach + key spots per place ----
  const BEACHES = {
    phuket: [["Kata Noi beach", [98.2955, 7.8105]], ["Kata beach", [98.2995, 7.8195]], ["Karon beach", [98.2930, 7.8440]], ["Patong beach", [98.2950, 7.8960]], ["Kalim beach", [98.2880, 7.9120]], ["Kamala beach", [98.2800, 7.9520]], ["Surin beach", [98.2765, 7.9750]], ["Bang Tao beach", [98.2930, 7.9950]], ["Nai Harn beach", [98.3040, 7.7765]], ["Ya Nui beach", [98.3020, 7.7650]], ["Ao Yon beach", [98.4100, 7.8040]], ["Freedom beach", [98.2780, 7.8790]]],
    aonang: [["Ao Nang beach", [98.8210, 8.0300]], ["Nopparat Thara beach", [98.8000, 8.0450]], ["Railay West", [98.8370, 8.0110]], ["Phra Nang beach", [98.8395, 8.0060]]],
    phiphi: [["Tonsai beach", [98.7765, 7.7375]], ["Loh Dalum beach", [98.7765, 7.7450]], ["Long Beach", [98.7850, 7.7290]]],
  };
  const ANCHORS = {
    phuket: [["Old Town", [98.3870, 7.8850]], ["Rassada pier", [98.4046, 7.8676]], ["Airport", [98.3169, 8.1132]], ["Bangla Road", [98.2985, 7.8930]]],
    aonang: [["Ao Nang strip", [98.8235, 8.0330]], ["Nopparat Thara pier", [98.8050, 8.0400]], ["Krabi Town", [98.9063, 8.0863]]],
    phiphi: [["Tonsai pier", [98.7770, 7.7385]], ["Loh Dalum bars", [98.7765, 7.7445]], ["Viewpoint stairs", [98.7820, 7.7420]]],
  };
  const km = (a, b) => { const R = 6371, r = x => x * Math.PI / 180, dLat = r(b[1] - a[1]), dLon = r(b[0] - a[0]); const q = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[1])) * Math.cos(r(b[1])) * Math.sin(dLon / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(q)); };
  const timeLabel = d => { const road = d * 1.35; return road <= 2 ? `${road < 1 ? Math.round(road * 1000 / 10) * 10 + " m" : road.toFixed(1) + " km"} · ${Math.max(1, Math.round(road / 4.8 * 60))} min walk` : `${road.toFixed(road < 10 ? 1 : 0)} km · ${Math.round(road / 30 * 60 + 4)} min by car`; };
  let measureFocus = null;
  function measureFor(it) {
    if (!it || !it.lngLat) return null;
    const pl = it.place === "krabi" ? "aonang" : it.place; const beaches = BEACHES[pl] || [], anchors = ANCHORS[pl] || [];
    const nb = beaches.map(([n, ll]) => ({ name: n, lngLat: ll, d: km(it.lngLat, ll) })).sort((a, b) => a.d - b.d)[0];
    const target = SF.q ? searchTarget(pl) : null;
    const list = [];
    if (nb) list.push({ name: nb.name, lngLat: nb.lngLat, kind: "beach", d: nb.d, note: "nearest beach" });
    if (target && !list.some(x => x.name === target.name)) list.push({ name: target.name, lngLat: target.lngLat, kind: "anchor", d: km(it.lngLat, target.lngLat), note: "your search" });
    for (const [n, ll] of anchors) if (!list.some(x => x.name === n)) list.push({ name: n, lngLat: ll, kind: "anchor", d: km(it.lngLat, ll) });
    list.forEach(x => { x.label = timeLabel(x.d); x.primary = measureFocus ? x.name === measureFocus : x.kind === "beach"; });
    return { home: { name: it.name, lngLat: it.lngLat }, targets: list, approx: it.geo !== "exact" };
  }

  // ---- rows ----
  function itemRow(id, ctx) {
    const it = T.items[id]; if (!it) return "";
    const picked = ctx && ctx.day && isPicked(ctx.day, id);
    const price = it.priceINR ? `${fmt(it.priceINR)}<small>INR</small>` : it.priceTHB ? `฿${fmt(it.priceTHB)}<small>a head</small>` : (it.priceTHB === 0 ? `free` : `—`);
    const meta = [it.area, it.rating ? `${it.rating}/${it.scale}${it.reviews ? " · " + fmt(it.reviews) + " reviews" : ""}` : null, it.when].filter(Boolean).join(" · ");
    const facts = it.type === "stay" ? factsLine(it) : "";
    const thumb = it.images && it.images.length ? `<img class="thumb" src="${it.images[0]}" alt="" loading="lazy">` : "";
    return `<div class="row ${picked ? "locked" : ""} ${it.tags.includes("avoid") ? "avoid" : ""} ${thumb ? "has-thumb" : ""}" role="button" tabindex="0" data-item="${it.id}">${thumb}<div><span class="name">${scoreBadge(it)}${h(it.name)}</span>${picked ? `<span class="act">In the plan${pickWho(it.id) ? ", " + h(pickWho(it.id)) : ""}</span>` : ""}${tagsFor(it.id)}${it.tags.includes("selfpick") ? `<span class="act" style="color:var(--accent)">Self-pick, from your doc</span>` : it.tags.includes("docpick") ? `<span class="act">From your doc</span>` : ""}${it.tags.includes("avoid") ? `<span class="act">Avoid</span>` : ""}<span class="meta">${h(it.tagline)}</span>${facts ? `<span class="meta">${h(facts)}</span>` : ""}${meta ? `<span class="meta">${h(meta)}</span>` : ""}</div><div class="fig">${price}</div></div>`;
  }
  function decisionBlock(id) {
    const d = C.decision(id); if (!d) return "";
    const lockedId = C.state.locks[d.id];
    const rows = d.options.map(o => {
      const it = o.item ? T.items[o.item] : null;
      const st = lockedId ? (lockedId === o.id ? "locked" : "other") : "";
      const label = o.label || (it && it.name) || o.id, note = o.note || (it && it.tagline) || "";
      const meta = it && it.rating ? `${it.rating}/${it.scale}${it.reviews ? " · " + fmt(it.reviews) + " reviews" : ""} · ${it.reviewSource || ""}` : "";
      const price = o.costINR ? `${fmt(o.costINR)}<small>INR · ${h(o.unit || "")}</small>` : `<small>${h(o.unit || "price pending")}</small>`;
      const sub = (o.items || []).length ? `<span class="meta">${o.items.length} stays inside the cap: ${o.items.slice(0, 3).map(i => h(T.items[i].name)).join(", ")}${o.items.length > 3 ? "…" : ""}</span>` : "";
      return `<div class="row ${st}" role="button" tabindex="0" data-lock="${d.id}" data-opt="${o.id}" ${it ? `data-item="${it.id}"` : ""} ${o.items ? `data-items="${o.items.join(",")}"` : ""}><div><span class="name">${h(label)}</span><span class="act">${st === "locked" ? "Locked" + (lockWho(d.id) ? " by " + h(lockWho(d.id)) : "") : "Lock"}</span>${it ? tagsFor(it.id) : ""}<span class="meta">${h(note)}</span>${meta ? `<span class="meta">${h(meta)}</span>` : ""}${sub}</div><div class="fig">${price}</div></div>`;
    }).join("");
    return `<div class="sec"><h2>Decide: <b>${h(d.title)}</b></h2>${rows}<p class="small pending" style="margin:.6em 0 0">Tap a name for the full card. Lock to count it in the budget; tap again to unlock.</p></div>`;
  }
  function legBlock(id) {
    const l = T.legs.find(x => x.id === id); if (!l) return "";
    return `<div class="sec"><h2>${h(l.title)}, <b>about ${l.hours} h</b></h2>${l.options.map(o => `<div class="opt"><div><span class="name">${h(o.mode)}</span>${o.link ? `<a href="${o.link}" target="_blank" rel="noopener">source</a>` : ""}<span class="dur">${h(o.duration)}</span><span class="small">${h(o.note)}</span></div><div class="fig">฿${fmt(o.costGroupTHB)}<small>for five · ${fmt(inr(o.costGroupTHB))} INR</small></div></div>`).join("")}</div>`;
  }
  function localBlock(place) {
    const l = T.local[place]; if (!l) return "";
    return `<div class="sec"><h2>Getting around <b>${h(PLACE(place).name)}</b></h2>${l.map(([n, t, u]) => `<div class="opt"><div><span class="name">${h(n)}</span>${u ? `<a href="${u}" target="_blank" rel="noopener">source</a>` : ""}<span class="small" style="display:block">${h(t)}</span></div><div></div></div>`).join("")}</div>`;
  }
  function poolBlock(title, type, place, firstIds, day) {
    if (type === "stay") {
      const d = day ? T.days.find(x => x.n === Number(day)) : null;
      const scoped = d && d.zones && !SF.allZones && SF.zone === "all" && !SF.q ? poolOf("stay", place).filter(it => d.zones.includes(it.zone)) : poolOf("stay", place);
      const pickDec = d ? d.decisions.map(id => C.decision(id)).find(dec => dec && dec.options.some(o => o.items || o.item)) : null;
      const lockedOpt = pickDec ? C.lockedOption(pickDec) : null;
      const pickOpt = pickDec ? (lockedOpt || pickDec.options[0]) : null;
      const pickIds = pickOpt ? (pickOpt.items || (pickOpt.item ? [pickOpt.item] : [])).filter(id => T.items[id]) : [];
      const showPick = pickIds.length && !SF.q && SF.zone === "all" && !SF.ours && !SF.doc;
      const list = stayList(scoped).filter(it => !showPick || !pickIds.includes(it.id));
      const hiddenStays = poolOf("stay", place).length - scoped.length;
      return `<div class="sec"><h2>${title} <b>${h(PLACE(place).name)}</b></h2>${filterBar(list.length, place)}<p class="small pending" style="margin:0 0 .6em">The score (0 to 100) weighs reviews 35, budget 30, beach 20 and pool 15. Budget cap: about 3K a room on the first two nights (Phuket Town, Phi Phi), 3K to 5K a room from Ao Nang on; full marks up to the cap, zero at twice the cap. Unknown facts count as neutral. Open a card for the breakdown.</p>${showPick ? `<p class="eyebrow" style="margin:.4em 0 .3em">${lockedOpt ? "Locked by the group" : "The research pick"}: ${h(pickOpt.label || T.items[pickIds[0]].name)}</p>${pickIds.map(id => itemRow(id, { day })).join("")}<p class="eyebrow" style="margin:1.4em 0 .3em">Everything else</p>` : ""}${list.map(it => itemRow(it.id, { day })).join("") || `<p class="pending">Nothing matches these filters.</p>`}${hiddenStays > 0 ? `<p class="small" style="margin:1em 0 0">Showing the areas for this day. <button class="linkish" data-f="allZones" data-v="1">Show all ${poolOf("stay", place).length} in ${h(PLACE(place).name)}</button></p>` : (d && d.zones && SF.allZones ? `<p class="small" style="margin:1em 0 0"><button class="linkish" data-f="allZones" data-v="0">Back to this day's areas</button></p>` : "")}</div>`;
    }
    const first = [...new Set(firstIds)].filter(id => T.items[id] && T.items[id].type === type);
    const d = day ? T.days.find(x => x.n === Number(day)) : null; const zones = d && d.zones && !SF.allZones ? d.zones : null;
    const g = T.guides[place === "krabi" ? "aonang" : place]; const zoneNames = zones && g ? g.zones.filter(z => zones.includes(z.id)).map(z => z.name.split(" and ")[0].split(",")[0]).join(", ") : "";
    const all = poolOf(type, place).filter(it => !first.includes(it.id));
    const rest = (zones ? all.filter(it => zones.includes(it.zone)) : all).map(it => it.id);
    const hidden = zones ? all.length - rest.length : 0;
    if (!first.length && !rest.length && !hidden) return `<p class="pending">Nothing researched here yet.</p>`;
    return `<div class="sec"><h2>${title} <b>${h(zoneNames || PLACE(place).name)}</b></h2>${first.length ? `<p class="eyebrow" style="margin:0 0 .4em">Picked for this day</p>` : ""}${first.map(id => itemRow(id, { day })).join("")}${rest.length ? `${first.length ? `<p class="eyebrow" style="margin:1.4em 0 .4em">Everything else ${zones ? "around " + h(zoneNames) : ""}</p>` : ""}${rest.map(id => itemRow(id, { day })).join("")}` : ""}${hidden ? `<p class="small" style="margin:1em 0 0"><button class="linkish" data-f="allZones" data-v="1">Show ${hidden} more across all of ${h(PLACE(place).name)}</button></p>` : (zones === null && d && d.zones ? `<p class="small" style="margin:1em 0 0"><button class="linkish" data-f="allZones" data-v="0">Back to ${h(PLACE(place).name)} near this day</button></p>` : "")}</div>`;
  }
  function redditBlock(key) {
    const r = T.reddit[key]; if (!r) return `<p class="pending">Nothing for this stop.</p>`;
    return `<div class="sec reddit"><h2>${h(r.label)}</h2><ul>${r.summary.map(s => `<li>${h(s)}</li>`).join("")}</ul><p class="small">${r.sources.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${h(s.title)}</a>`).join(" · ")}</p>${r.queries && r.queries.length ? `<p class="small pending">Reddit itself is blocked for Claude's tools. To add the real threads, search these and paste the links back: ${r.queries.map(h).join(" · ")}</p>` : ""}</div>`;
  }
  function notesBlock(day) {
    const items = (C.state.notes[day] || []).map(n => `<p class="item"><b>${h(n.who)}</b> ${h(n.text)} <span class="small pending">${h(n.at)}</span>${n.who === who() ? ` <button class="linkish small" data-ndel="${n.id}">remove</button>` : ""}</p>`).join("");
    return `<div class="sec notes"><h2>Day ${day} notes</h2>${items || `<p class="pending">Nothing yet. Write the first one.</p>`}<form data-day="${day}"><textarea placeholder="Write here"></textarea><button type="submit">Add</button></form><p class="small who" style="margin-top:.8em">Writing as <b class="ink">${h(who() || "nobody yet")}</b> · <button class="linkish" data-gate>switch name</button></p></div>`;
  }
  function itineraryTab(d) {
    const n = d.n;
    const locked = d.decisions.map(id => { const dec = C.decision(id); const o = dec && C.lockedOption(dec); return o ? { dec, o } : null; }).filter(Boolean);
    const open = d.decisions.map(id => C.decision(id)).filter(dec => dec && !C.lockedOption(dec));
    const added = (picks[n] || []).filter(id => T.items[id]);
    const cost = dayCost(n);
    const F = T.flights, fl = F && (n === 1 ? F.out : n === 8 ? F.back : null);
    return `${fl ? `<div class="sec"><h2>${n === 1 ? "Flight in" : "Flight home"}</h2><div class="opt"><div><span class="name">${h(fl.flight)}</span><span class="dur">${h(fl.from)} ${h(fl.dep)} → ${h(fl.to)} ${h(fl.arr)} · ${h(fl.duration)} · ${h(fl.date)}</span><span class="small">${h(fl.bags)} · PNR ${h(fl.pnr)}</span></div><div class="fig">${fmt(F.perHeadINR)}<small>INR a head, round trip</small></div></div></div>` : ""}<div class="sec"><h2>The day</h2><ul class="hlist">${d.highlights.map(x => `<li>${h(x)}</li>`).join("")}</ul><p class="small pending" style="margin:.8em 0 0">The doc said: ${d.plan.map(h).join(" ")}</p></div>
      ${d.tips.length ? `<div class="sec"><h2>From the research</h2><ul class="hlist">${d.tips.map(x => `<li>${h(x)}</li>`).join("")}</ul></div>` : ""}
      <div class="sec"><h2>Locked for this day</h2>${locked.length ? locked.map(({ dec, o }) => { const it = o.item ? T.items[o.item] : null; return `<div class="row locked" role="button" tabindex="0" ${it ? `data-item="${it.id}"` : `data-tab="decide"`}><div><span class="name">${h(o.label || (it && it.name) || o.id)}</span><span class="meta">${h(dec.title)}</span></div><div class="fig">${o.costINR ? fmt(o.costINR) + "<small>INR</small>" : "—"}</div></div>`; }).join("") : `<p class="pending">Nothing locked yet.</p>`}${open.length ? `<p class="small" style="margin:.8em 0 0">Still open: ${open.map(dec => `<button class="linkish" data-tab="decide">${h(dec.title)}</button>`).join(", ")}.</p>` : ""}</div>
      <div class="sec"><h2>Added to this day</h2>${added.length ? added.map(id => itemRow(id, { day: n })).join("") : `<p class="pending">Nothing added yet. Open any place and tap "Add to day ${n}".</p>`}</div>
      <div class="sec"><h2>Day cost so far</h2><p><span class="fig" style="font-size:clamp(26px,3vw,44px)">${cost ? fmt(cost) : "—"}</span> <span class="small">INR for five${cost ? ", " + fmt(cost / T.travellers) + " each" : ""}. Locked choices plus added items; transport and food you have not added are not in it.</span></p></div>`;
  }

  // ---- pages ----
  function overview() {
    const d = T.days[current], p = PLACE(d.base);
    $("#hl").innerHTML = `<div class="date"><span class="fig">${h(d.date)}</span><span>Day ${d.n}, ${h(d.weekday)}${d.spend ? ". " + h(d.spend) : ""}</span></div><h1 class="disp">${h(p.name)}<small>${h(p.thai)}</small></h1><ul>${d.highlights.map(x => `<li>${h(x)}</li>`).join("")}</ul><p class="one small">${h(d.highlights[0])}${d.highlights[1] ? " · " + h(d.highlights[1]) : ""}</p><button class="open" data-go="day-${d.n}">Open the day <span aria-hidden="true">→</span></button>`;
    document.querySelectorAll(".rail button").forEach((b, i) => b.classList.toggle("on", i === current));
  }
  function dayTabs(d) {
    const key = d.base === "aonang" ? "krabi" : d.base;
    const tabs = [["itinerary", "Itinerary"]];
    if (d.decisions.length) tabs.push(["decide", "Decide"]);
    if (d.legs.length) tabs.push(["travel", "Getting there"]);
    if (poolOf("stay", d.base).length) tabs.push(["stay", "Sleep"]);
    if (poolOf("do", d.base).length) tabs.push(["do", "Do"]);
    if (poolOf("eat", d.base).length) tabs.push(["eat", "Eat"]);
    if (poolOf("drink", d.base).length) tabs.push(["drink", "Drink"]);
    if (poolOf("dive", d.base).length) tabs.push(["dive", "Dive"]);
    if (T.local[d.base]) tabs.push(["around", "Around"]);
    if (T.reddit[key]) tabs.push(["reddit", "Reddit"]);
    tabs.push(["notes", "Notes"]);
    return tabs;
  }
  const LIST_TABS = new Set(["stay", "do", "eat", "drink", "dive"]);
  function dayPage(n, tab) {
    const d = T.days.find(x => x.n === n); if (!d) return null;
    const p = PLACE(d.base), key = d.base === "aonang" ? "krabi" : d.base, tabs = dayTabs(d);
    tab = tabs.some(t => t[0] === tab) ? tab : "itinerary";
    const picksAll = [...d.picks.do, ...d.picks.eat, ...d.picks.drink, ...(picks[n] || [])];
    let pane = "";
    if (tab === "itinerary") pane = itineraryTab(d);
    else if (tab === "decide") pane = d.decisions.map(decisionBlock).join("");
    else if (tab === "travel") pane = d.legs.map(legBlock).join("");
    else if (tab === "stay") pane = poolBlock("Sleep in", "stay", d.base, [], n);
    else if (tab === "do") pane = poolBlock("Do in", "do", d.base, picksAll, n);
    else if (tab === "eat") pane = poolBlock("Eat in", "eat", d.base, picksAll, n);
    else if (tab === "drink") pane = poolBlock("Drink in", "drink", d.base, picksAll, n);
    else if (tab === "dive") pane = poolBlock("Scuba and snorkel in", "dive", d.base, picksAll, n);
    else if (tab === "around") pane = localBlock(d.base);
    else if (tab === "reddit") pane = redditBlock(key);
    else if (tab === "notes") pane = notesBlock(n);
    return { tab, html: `<div class="wrap"><button class="back" data-go="">← Map</button>
      <h1 class="disp">${h(p.name)}<small>${h(p.thai)}</small></h1>
      <p class="subline">Day ${d.n} · ${h(d.weekday)} ${h(d.date)}${d.spend ? " · " + h(d.spend) : ""}</p>
      ${T.guides[d.base] ? `<p class="small" style="margin:-.2em 0 .4em"><button class="linkish" data-go="place-${d.base}">About ${h(p.name)}: areas on the map and our take →</button></p>` : ""}
      <nav class="tabs" aria-label="Day sections">${tabs.map(([id, label]) => `<button class="${id === tab ? "on" : ""}" data-tab="${id}" aria-selected="${id === tab}">${label}</button>`).join("")}</nav>
      <div class="pane" id="pane">${pane}</div></div>` };
  }
  function actPage(id) {
    const a = T.activities.find(x => x.id === id); if (!a) return "";
    return `<div class="wrap"><button class="back" data-go="">← Map</button><h1 class="disp">${h(a.title)}</h1><p class="lead ink" style="font-weight:500">${h(a.question)}</p><p class="lead">${h(a.intro)}</p><div class="sec"><h2>The pick</h2><p class="lead">${h(a.verdict)}</p></div>${a.table ? `<div class="sec tablewrap"><table class="cmp"><thead><tr>${a.table.head.map(x => `<th>${h(x)}</th>`).join("")}</tr></thead><tbody>${a.table.rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${h(c)}</td>` : `<th scope="row">${h(c)}</th>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}${Object.entries(a.perPlace).filter(([pl, ids]) => ids.length).map(([pl, ids]) => `<div class="sec"><h2>In <b>${h(PLACE(pl).name)}</b></h2>${ids.map(i => itemRow(i, {})).join("")}</div>`).join("")}</div>`;
  }
  function guideTab(place, g) {
    const zones = g.zones.map(z => `<div class="row zone" role="button" tabindex="0" data-zone="${z.id}"><div><span class="name">${h(z.name)}</span><span class="meta">${h(z.for)}</span><span class="meta ink" style="font-weight:500">${h(z.take)}</span>${z.items.length ? `<span class="meta">${z.items.slice(0, 4).map(i => `<button class="linkish small" data-item="${i}">${h(T.items[i].name)}</button>`).join(" · ")}${z.items.length > 4 ? ` · ${z.items.length - 4} more in Choose` : ""}</span>` : ""}</div><div class="fig" style="font-size:1em;color:var(--dim)">${z.items.length || ""}</div></div>`).join("");
    const plan = g.plan ? `<div class="sec tablewrap"><h2>The plan, hour by hour</h2><table class="cmp plan"><thead><tr><th>Time</th><th>What</th><th>Where</th><th>Cost</th><th>Note</th></tr></thead><tbody>${g.plan.map(r => `<tr>${r.map((c, i) => i === 0 ? `<th scope="row">${h(c)}</th>` : `<td>${h(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : "";
    return `<p class="lead">${h(g.tagline)}</p>${g.status === "refining" ? `<p class="small pending">Research still refining this guide: east-Tonsai stays, snorkel timing and the recommended split land here when it finishes.</p>` : ""}
      <div class="sec"><h2>The areas <b>on the map</b></h2><p class="small pending" style="margin:0 0 .6em">Tap an area to zoom the map to it.</p>${zones}</div>
      <div class="sec"><h2>Our take</h2><ul class="hlist">${g.recos.map(x => `<li>${h(x)}</li>`).join("")}</ul></div>${plan}`;
  }
  function placePage(place, tab) {
    const g = T.guides[place]; if (!g) return null;
    tab = tab === "choose" ? "choose" : "guide";
    const p = PLACE(place);
    const body = tab === "guide" ? guideTab(place, g) : planPage(place, true);
    return { tab, html: `<div class="wrap"><button class="back" data-go="">← Map</button><h1 class="disp">${h(g.title)}<small>${h(p.thai)}</small></h1>
      <nav class="tabs" aria-label="Place sections"><button class="${tab === "guide" ? "on" : ""}" data-tab="guide">Guide</button><button class="${tab === "choose" ? "on" : ""}" data-tab="choose">Choose</button></nav>
      <div class="pane" id="pane">${body}</div></div>` };
  }
  function planPage(place, inner) {
    const p = PLACE(place), days = DAYS_FOR(place);
    const groups = [["stay", "Sleep"], ["do", "Do"], ["dive", "Scuba and snorkel"], ["eat", "Eat"], ["drink", "Drink"]];
    const picked = ITEMS.filter(it => samePlace(it, place) && dayOfPick(it.id));
    const sub = picked.reduce((a, it) => a + itemCost(it), 0);
    return `${inner ? "" : `<div class="wrap"><button class="back" data-go="">← Map</button><h1 class="disp">${h(p.name)}<small>${h(p.thai)}</small></h1>`}
      <p class="lead">Everything researched for ${h(p.name)} in one list. Tap a day number to put an item on that day; tap another number to move it. Each item only offers the days it fits: Old Town on day 1 and Sunday, the beaches on days 5 to 7. What you choose shows up in each day's Itinerary tab and in the budget.</p>
      <div class="sec"><h2>Chosen so far</h2>${picked.length ? picked.map(it => `<div class="row locked" role="button" tabindex="0" data-item="${it.id}"><div><span class="name">${h(it.name)}</span>${chips(it)}<span class="meta">${h(it.tagline)}</span></div><div class="fig">${it.priceINR ? fmt(it.priceINR) + "<small>INR</small>" : it.priceTHB ? "฿" + fmt(it.priceTHB) + "<small>a head</small>" : "free"}</div></div>`).join("") + `<p class="small" style="margin-top:.8em">Adds <b class="ink">${fmt(sub)} INR</b> to the budget, ${fmt(sub / T.travellers)} each.</p>` : `<p class="pending">Nothing chosen yet.</p>`}</div>
      ${groups.map(([type, label]) => { const list = type === "stay" ? stayList(poolOf("stay", place)) : poolOf(type, place); return list.length || type === "stay" ? `<div class="sec"><h2>${label}</h2>${type === "stay" ? filterBar(list.length, place) : ""}${list.map(it => `<div class="row ${dayOfPick(it.id) ? "locked" : ""}" role="button" tabindex="0" data-item="${it.id}"><div><span class="name">${scoreBadge(it)}${h(it.name)}</span>${chips(it)}<span class="meta">${h(it.tagline)}</span>${it.type === "stay" && factsLine(it) ? `<span class="meta">${h(factsLine(it))}</span>` : ""}${it.rating ? `<span class="meta">${it.rating}/${it.scale}${it.reviews ? " · " + fmt(it.reviews) + " reviews" : ""}</span>` : ""}</div><div class="fig">${it.priceINR ? fmt(it.priceINR) + "<small>INR</small>" : it.priceTHB ? "฿" + fmt(it.priceTHB) + "<small>a head</small>" : (it.priceTHB === 0 ? "free" : "—")}</div></div>`).join("")}</div>` : ""; }).join("")}${inner ? "" : "</div>"}`;
  }
  function budgetPage() {
    const b = budget(), F = T.flights;
    const lockedRows = T.decisions.map(d => { const o = C.lockedOption(d); return o ? { d, o } : null; }).filter(Boolean);
    const pickRows = Object.entries(S.picksByDay()).flatMap(([day, ids]) => ids.filter(id => T.items[id]).map(id => ({ day: Number(day), it: T.items[id] }))).sort((a, b) => a.day - b.day);
    const row = (name, meta, inr, extra) => `<div class="opt"><div><span class="name">${name}</span>${meta ? `<span class="dur">${meta}</span>` : ""}${extra || ""}</div><div class="fig">${inr ? fmt(inr) + "<small>INR</small>" : "—"}</div></div>`;
    const flightRows = F ? row(`Flights, five tickets`, `${h(F.out.flight)} ${h(F.out.dep)} to ${h(F.out.arr)} on ${h(F.out.date)} · ${h(F.back.flight)} ${h(F.back.dep)} to ${h(F.back.arr)} on ${h(F.back.date)}`, b.flights, `<span class="small" style="display:block">${fmt(F.perHeadINR)} INR a head as paid on Imran's ticket. ${h(F.note)}</span>`) : "";
    const frame = T.essentials.find(e => e.k === "Budget frame");
    const ph = n => fmt(n / T.travellers);
    const miscRows = misc.map((m, i) => `<div class="opt"><div><span class="name">${h(m.name)}</span><span class="dur">${m.per === "head" ? fmt(m.inr) + " INR a head" : fmt(m.inr) + " INR for the group"} · ${h(m.who)}, ${h(m.at)}</span></div><div class="fig">${ph(miscGroup(m))}<small>a head</small><button class="linkish small" data-misc-del="${m.id}" style="display:block;margin-top:.3em">remove</button></div></div>`).join("");
    return `<div class="wrap"><button class="back" data-go="">← Map</button><h1 class="disp">${fmt(b.perHead)}<small>INR a head so far · ${fmt(b.total)} for five</small></h1>
      <p class="lead">Everything below is per person unless it says otherwise. Flights are booked. Locking a stay or a day choice, or putting an item on a day, adds its share here. Anything else goes in Miscellaneous.</p>
      <div class="sec"><h2>Where it goes, per head</h2><div class="opt"><div><span class="name">Flights</span></div><div class="fig">${ph(b.flights)}<small>booked</small></div></div><div class="opt"><div><span class="name">Locked and chosen</span><span class="dur">stays, day choices, items on days</span></div><div class="fig">${ph(b.chosen)}<small>a head</small></div></div><div class="opt"><div><span class="name">Miscellaneous</span><span class="dur">${misc.length} line${misc.length === 1 ? "" : "s"}</span></div><div class="fig">${ph(b.misc)}<small>a head</small></div></div></div>
      <div class="sec notes"><h2>Miscellaneous</h2>${miscRows || `<p class="pending">Nothing yet. Visa cash float, SIMs, insurance, tips, a night out: type a name and a number.</p>`}
        <form id="miscform" class="miscform"><input id="misc-name" placeholder="What (e.g. eSIM, travel insurance)" required><input id="misc-inr" type="number" min="1" step="1" inputmode="numeric" placeholder="INR" required><select id="misc-per"><option value="head">a head</option><option value="group">for the group</option></select><button type="submit">Add</button></form>
        <p class="small who" style="margin-top:.8em">Adding as <b class="ink">${h(who() || "nobody yet")}</b> · <button class="linkish" data-gate>switch name</button></p></div>
      <div class="sec"><h2>Booked</h2>${flightRows}${F ? `<p class="small pending" style="margin:.6em 0 0">${h(F.cancel)} Bags: ${h(F.out.bags)}.</p>` : ""}</div>
      <div class="sec"><h2>Locked choices <b>${fmt(lockedRows.reduce((a, r) => a + (r.o.costINR || 0), 0))} INR</b></h2>${lockedRows.length ? lockedRows.map(({ d, o }) => { const it = o.item ? T.items[o.item] : null; return `<div class="opt" ${it ? `role="button" tabindex="0" data-item="${it.id}"` : ""}><div><span class="name">${h(o.label || (it && it.name) || o.id)}</span><span class="dur">${h(d.title)}${o.unit ? " · " + h(o.unit) : ""}</span></div><div class="fig">${o.costINR ? fmt(o.costINR) + "<small>INR</small>" : "—"}</div></div>`; }).join("") : `<p class="pending">Nothing locked yet. Open a day's Decide tab.</p>`}</div>
      <div class="sec"><h2>Added to days <b>${fmt(pickRows.reduce((a, r) => a + itemCost(r.it), 0))} INR</b></h2>${pickRows.length ? pickRows.map(({ day, it }) => `<div class="opt" role="button" tabindex="0" data-item="${it.id}"><div><span class="name">${h(it.name)}</span><span class="dur">Day ${day} · ${h(PLACE(it.place).name)}${it.priceTHB ? " · ฿" + fmt(it.priceTHB) + " a head" : ""}</span></div><div class="fig">${itemCost(it) ? fmt(itemCost(it)) + "<small>INR</small>" : "free"}</div></div>`).join("") : `<p class="pending">Nothing added yet. Use the day chips on any place.</p>`}</div>
      <div class="sec"><h2>Against the research frame</h2><p class="lead">Excluding flights you are at <span class="ink" style="font-weight:500">${fmt((b.total - b.flights) / T.travellers)} INR a head</span>.${frame ? " The research frame, excluding flights: " + h(frame.v.replace("Excluding flights, with stays at your 3 to 5K caps: ", "")) : ""}</p></div>
      <p class="src">Prices are the researched snapshots (2026-10-24) at 1 THB = ${T.fx.inrPerThb} INR. Check the link on each card before paying.</p></div>`;
  }
  function essentialsPage() {
    return `<div class="wrap"><button class="back" data-go="">← Map</button><h1 class="disp">Essentials</h1>${T.essentials.map(e => `<div class="opt"><div><span class="name">${h(e.k)}</span><span class="small" style="display:block">${h(e.v)}</span>${e.src && e.src.startsWith("http") ? `<a href="${e.src}" target="_blank" rel="noopener">source</a>` : ""}</div><div></div></div>`).join("")}<div class="sec"><h2>Budget frame</h2><p class="lead">${h(T.budgetRule)} ${h(T.fx.note)}</p></div></div>`;
  }
  function itemCard(id, ctx) {
    const it = T.items[id]; if (!it) return "";
    const dayN = ctx.page.startsWith("day-") ? Number(ctx.page.slice(4)) : null;
    const price = it.priceINR ? `<span class="fig">${fmt(it.priceINR)}</span><p>INR${it.priceNote ? ". " + h(it.priceNote) : ""}</p>` : it.priceTHB ? `<span class="fig">฿${fmt(it.priceTHB)}</span><p>a head, about ${fmt(inr(it.priceTHB))} INR${it.priceNote ? ". " + h(it.priceNote) : ""}</p>` : it.priceTHB === 0 ? `<span class="fig">Free</span><p>${h(it.priceNote || "")}</p>` : (it.priceNote ? `<span class="fig">—</span><p>${h(it.priceNote)}</p>` : "");
    const linkNames = { maps: "Maps", booking: "Booking", agoda: "Agoda", airbnb: "Airbnb", official: "Official", reviews: "Reviews", tripadvisor: "TripAdvisor" };
    const links = Object.entries(it.links || {}).filter(([k, v]) => v).map(([k, v]) => `<a href="${v}" target="_blank" rel="noopener">${linkNames[k] || k} ↗</a>`).join("");
    const picked = dayN && isPicked(dayN, it.id);
    let decOpt = null; for (const d of T.decisions) for (const o of d.options) if (o.item === it.id) decOpt = { d, o };
    const lockedHere = decOpt && C.state.locks[decOpt.d.id] === decOpt.o.id;
    const typeName = { stay: "Stay", do: "Do", eat: "Eat", drink: "Drink", dive: "Scuba and snorkel" }[it.type] || it.type;
    return `<div class="inner"><button class="back" data-close="item">← Back</button>
      <h1 class="disp">${h(it.name)}</h1>
      <p class="subline">${typeName} · ${h(PLACE(it.place).name)}${it.area ? " · " + h(it.area) : ""}${it.geo === "approx" ? " · map pin approximate" : ""}${it.tags.includes("selfpick") ? " · self-pick from your Google Doc" : it.tags.includes("docpick") ? " · from your Google Doc" : ""}</p>
      ${it.images && it.images.length ? `<div class="gallery">${it.images.map(u => `<a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="" loading="lazy"></a>`).join("")}</div><p class="small pending" style="margin:.3em 0 0">Photos from the listing page${it.imageSource ? ` (${h(new URL(it.imageSource).hostname)})` : ""}; tap one to open it.</p>` : ""}
      <p class="tagline">${h(it.tagline)}</p>
      ${it.rating ? `<div class="rating"><span class="fig">${it.rating}<small style="font-size:.45em;color:var(--dim)">/${it.scale}</small></span><span>${it.reviews ? fmt(it.reviews) + " reviews · " : ""}${h(it.reviewSource || "")}</span></div>` : ""}
      ${price ? `<div class="price">${price}</div>` : ""}
      ${it.score && it.score.total !== null && it.score.total !== undefined ? `<h3>Score</h3><div class="rating"><span class="fig">${it.score.total}<small style="font-size:.45em;color:var(--dim)">/100</small></span><span>${["reviews", "budget", "beach", "pool"].filter(k => it.score.weights[k]).map(k => `${k} ${it.score.parts[k] === null ? "?" : it.score.parts[k]}`).join(" · ")}${it.score.unknown.length ? ` · unknown: ${it.score.unknown.join(", ")}` : ""}</span></div>${it.type === "stay" ? `<p class="small">${h(factsLine(it))}</p>` : ""}` : ""}
      ${it.position ? `<h3>Position</h3><p>${[it.position.pier !== null && it.position.pier !== undefined ? it.position.pier + " min from the pier" : "", it.position.lohdalum !== null && it.position.lohdalum !== undefined ? it.position.lohdalum + " min to the Loh Dalum bars" : "", it.position.viewpoint !== null && it.position.viewpoint !== undefined ? it.position.viewpoint + " min to the viewpoint stairs" : "", it.position.noise ? "noise: " + it.position.noise : "", it.position.ac === true ? "AC" : it.position.ac === false ? "fan only" : ""].filter(Boolean).join(" · ")}</p>` : ""}
      ${(() => { const m = measureFor(it); return m ? `<h3>On the map</h3><div class="measure">${m.targets.map(t => `<button data-measure="${h(t.name)}" class="${t.primary ? "on" : ""}"><span class="mname">${h(t.name)}${t.note ? ` <span class="small pending">${h(t.note)}</span>` : ""}</span><span class="mdist">${h(t.label)}</span></button>`).join("")}</div><p class="small pending" style="margin:.3em 0 0">Straight-line distance times 1.35 for roads; walking 4.8 km/h, car about 30 km/h.${m.approx ? " This pin is approximate (area level), so treat these as rough." : ""}</p>` : ""; })()}
      ${it.verdict ? `<h3>Verdict</h3><p class="ink" style="font-weight:500">${h(it.verdict)}</p>` : ""}
      ${it.rooms ? `<h3>Rooms for five</h3><p>${h(it.rooms)}</p>` : ""}
      ${it.distances ? `<h3>Distances</h3><p>${Object.entries(it.distances).filter(([k, v]) => v).map(([k, v]) => `${h(k)}: ${h(v)}`).join(" · ")}</p>` : ""}
      ${it.when ? `<h3>When</h3><p>${h(it.when)}</p>` : ""}
      ${it.book ? `<h3>How to book</h3><p>${h(it.book)}</p>` : ""}
      ${it.highlights.length ? `<h3>Highlights</h3><ul>${it.highlights.map(x => `<li>${h(x)}</li>`).join("")}</ul>` : ""}
      ${it.praise.length ? `<h3>Guests praise</h3><ul>${it.praise.map(x => `<li class="quote">${h(x)}</li>`).join("")}</ul>` : ""}
      ${it.complaints.length ? `<h3>Watch out</h3><ul>${it.complaints.map(x => `<li>${h(x)}</li>`).join("")}</ul>` : ""}
      ${it.tags.length ? `<h3>Tags</h3><p>${it.tags.map(t => `<span class="pill">${h(t)}</span>`).join("")}</p>` : ""}
      <h3>Links</h3><div class="links">${links}</div>
      <h3>The five of us</h3>
      <p class="small">${rejectedBy(it.id).length ? `Not for: <b class="ink">${h(rejectedBy(it.id).join(", "))}</b>.` : "Nobody has ruled this out."}${pickWho(it.id) ? ` Added to a day by ${h(pickWho(it.id))}.` : ""}</p>
      <div class="cta" style="margin-top:.4em"><button class="ghost" data-reject="${it.id}">${who() && rejectedBy(it.id).includes(who()) ? "Undo: not for me" : "Not for me"}</button></div>
      <div class="notes" style="margin-top:1em">${S.commentsFor(it.id).map(c => `<p class="item"><b>${h(c.who)}</b> ${h(c.body)} <span class="small pending">${h(c.at)}</span>${c.who === who() ? ` <button class="linkish small" data-cdel="${c.id}">remove</button>` : ""}</p>`).join("") || `<p class="pending">No comments yet.</p>`}<form data-comment="${it.id}"><textarea placeholder="${who() ? "Comment as " + h(who()) : "Pick your name to comment"}"></textarea><button type="submit">Add</button></form></div>
      <div class="cta">${decOpt ? `<button data-lockcard="${decOpt.d.id}" data-opt="${decOpt.o.id}">${lockedHere ? "Locked as our choice · unlock" : "Lock as our choice"}</button>` : (daysForItem(it).length ? `<span class="small" style="align-self:center">On the plan:</span>${chips(it)}` : "")}<button class="ghost" data-close="item">Close</button></div>
      ${decOpt ? `<p class="small pending">Part of the decision "${h(decOpt.d.title)}"${decOpt.o.costINR ? ": " + fmt(decOpt.o.costINR) + " INR, " + h(decOpt.o.unit || "") : ""}.</p>` : ""}
      <p class="src">Snapshot ${h(T.snapshot)}. Sources: ${it.sources.map(h).join("; ")}. Prices move; check the link before paying.</p>
    </div>`;
  }

  // ---- master render ----
  let lastKey = "";
  function render() {
    const r = route(), b = budget();
    $("#budget").innerHTML = `<button class="budget-pill" data-go="budget" title="${fmt(b.total)} INR for five"><span class="fig">${fmt(b.perHead)}</span><span class="unit">INR a head</span></button>`;
    document.querySelectorAll("#menu [data-go]").forEach(el => el.classList.toggle("on", location.hash.replace(/^#/, "").split("/")[0] === el.dataset.go));
    document.querySelectorAll("#menu .dd-btn").forEach(el => { const cur = location.hash.replace(/^#/, "").split("/")[0]; el.classList.toggle("on", [...el.parentElement.querySelectorAll("[data-go]")].some(x => x.dataset.go === cur)); });
    const live = S.mode === "shared" && /live/.test(S.status), off = S.mode === "shared" && !live;
    const wb = $("#whobar"); if (wb) wb.innerHTML = `<button class="who-pill" data-gate title="${h(S.mode === "shared" ? "Shared with the five: " + S.status : "Saved in this browser only")}"><span class="dot ${live ? "live" : off ? "off" : ""}" aria-hidden="true"></span>${h(who() || "Pick your name")}</button>` + (S.pendingSeed ? `<span class="seed small">Shared plan is empty. <button class="linkish small" data-seed>Push this browser's data</button> · <button class="linkish small" data-noseed>Start empty</button></span>` : "");
    const sheet = $("#sheet"), card = $("#card");
    let page = "", tab = null, dayN = null;
    if (r.page.startsWith("day-")) { dayN = Number(r.page.slice(4)); const res = dayPage(dayN, r.tab); if (res) { page = res.html; tab = res.tab; } else dayN = null; }
    else if (r.page.startsWith("act-")) page = actPage(r.page.slice(4));
    else if (r.page === "essentials") page = essentialsPage();
    else if (r.page === "budget") page = budgetPage();
    else if (r.page.startsWith("plan-")) page = planPage(r.page.slice(5));
    else if (r.page.startsWith("place-")) { const res = placePage(r.page.slice(6), r.tab); if (res) { page = res.html; tab = res.tab; } }
    const key = r.page + "/" + tab;
    const y = sheet.hidden || key !== lastKey ? 0 : sheet.scrollTop;
    sheet.hidden = !page; if (page) { sheet.innerHTML = page; sheet.scrollTop = y; }
    if (r.item !== render.lastItem) { measureFocus = null; render.lastItem = r.item; }
    card.hidden = !r.item; if (r.item) card.innerHTML = itemCard(r.item, r);
    document.body.classList.toggle("has-card", !!r.item);
    document.body.classList.toggle("has-sheet", !!page);
    const d = dayN ? T.days.find(x => x.n === dayN) : null;
    if (d) current = T.days.indexOf(d);
    overview();

    // map: markers for what is listed, camera on the place / the list / the open item
    const day = d || T.days[current], place = day.base;
    let hot = [];
    if (d && LIST_TABS.has(tab)) hot = [...sheet.querySelectorAll("[data-item]")].map(e => e.dataset.item);
    else if (d) hot = [...new Set([...day.picks.do, ...day.picks.eat, ...day.picks.drink, ...(picks[dayN] || []), ...day.decisions.map(id => { const dec = C.decision(id); const o = dec && C.lockedOption(dec); return o && o.item; }).filter(Boolean)])];
    else if (r.page.startsWith("place-")) hot = tab === "choose" ? [...sheet.querySelectorAll(".row.locked[data-item]")].map(e => e.dataset.item) : [];
    else if (r.page.startsWith("act-") || r.page.startsWith("plan-")) hot = [...sheet.querySelectorAll(".row.locked[data-item]")].map(e => e.dataset.item);
    else hot = [...day.picks.do, ...day.picks.eat, ...day.picks.drink];
    const openItem = r.item && T.items[r.item] && T.items[r.item].lngLat ? T.items[r.item] : null;
    if (openItem) hot = [openItem.id];
    if (mapReady()) {
      const gp = r.page.startsWith("place-") ? r.page.slice(6) : r.page.startsWith("plan-") ? r.page.slice(5) : null;
      const list = r.page.startsWith("act-") ? ITEMS : gp ? ITEMS.filter(it => samePlace(it, gp)) : ITEMS.filter(it => samePlace(it, place) && (!day.zones || SF.allZones || !it.zone || day.zones.includes(it.zone)));
      C.setZones(map, gp && T.guides[gp] && tab !== "choose" ? T.guides[gp].zones : []);
      const bounds = C.setMarkers(map, list, hot);
      const changed = key !== lastKey;
      const m = openItem ? measureFor(openItem) : null;
      const mb = C.setMeasure(map, m && m.home, m ? m.targets : []);
      const cardPad = () => { const w = innerWidth; return w > 720 ? { left: 40, right: Math.min(620, w) + 40, top: 90, bottom: 40 } : { left: 24, right: 24, top: 110, bottom: Math.round(innerHeight * .55) }; };
      if (openItem && mb) { const focus = m.targets.find(t => t.primary); const fb = new maplibregl.LngLatBounds(); fb.extend(openItem.lngLat); if (focus) fb.extend(focus.lngLat); m.targets.slice(0, 3).forEach(t => fb.extend(t.lngLat)); map.fitBounds(fb, { padding: cardPad(), maxZoom: 15, duration: 1100 }); }
      else if (gp && changed) focusPlace(gp, true);
      else if (changed && bounds && (d && LIST_TABS.has(tab) || r.page.startsWith("act-"))) map.fitBounds(bounds, { padding: mapPadding(!!page), maxZoom: 14, duration: 1400 });
      else if (changed || place !== focused) focusPlace(place, !!page);
    }
    lastKey = key;
  }
  function selectDay(i) {
    current = i; overview(); const d = T.days[i]; focusPlace(d.base, false);
    if (mapReady()) C.setMarkers(map, ITEMS.filter(it => samePlace(it, d.base) && (!d.zones || !it.zone || d.zones.includes(it.zone))), [...d.picks.do, ...d.picks.eat, ...d.picks.drink]);
  }

  // ---- events ----
  document.addEventListener("click", e => {
    const go_ = e.target.closest("[data-go]"); if (go_) { go(go_.dataset.go); return; }
    const close = e.target.closest("[data-close]"); if (close) { closeTop(); return; }
    const tabBtn = e.target.closest("[data-tab]"); if (tabBtn) { go(route().page + "/t-" + tabBtn.dataset.tab); return; }
    const as = e.target.closest("[data-assign]"); if (as) { e.stopPropagation(); assign(as.dataset.assign, as.dataset.day ? Number(as.dataset.day) : null); return; }
    if (e.target.closest("[data-ftoggle]")) { SF.open = !SF.open; render(); return; }
    const ms = e.target.closest("[data-measure]"); if (ms) { measureFocus = measureFocus === ms.dataset.measure ? null : ms.dataset.measure; const it = T.items[route().item]; const m = measureFor(it); C.setMeasure(map, m.home, m.targets); document.querySelectorAll("[data-measure]").forEach(b => b.classList.toggle("on", b.dataset.measure === (measureFocus || m.targets.find(t => t.primary).name))); const t = m.targets.find(x => x.primary); if (t) { const b = new maplibregl.LngLatBounds(); b.extend(m.home.lngLat); b.extend(t.lngLat); map.fitBounds(b, { padding: innerWidth > 720 ? { left: 60, right: Math.min(620, innerWidth) + 60, top: 110, bottom: 60 } : { left: 30, right: 30, top: 120, bottom: Math.round(innerHeight * .58) }, maxZoom: 15.5, duration: 900 }); } return; }
    const fb = e.target.closest("[data-f]"); if (fb) { const k = fb.dataset.f, v = fb.dataset.v; if (k === "kind" || k === "sort" || k === "zone") SF[k] = v; else if (k === "allZones") SF.allZones = v === "1"; else SF[k] = !SF[k]; if (k === "sort" && v !== "near" && SF.sort === "near") SF.sort = v; render(); return; }
    if (e.target.id === "card" || e.target.classList.contains("sheet-backdrop")) { closeTop(); return; }
    const zr = e.target.closest("[data-zone]"); if (zr && !e.target.closest("[data-item]")) { const gp = route().page.slice(6); const z = (T.guides[gp] || { zones: [] }).zones.find(x => x.id === zr.dataset.zone); if (z && map) { document.querySelectorAll(".zone").forEach(x => x.classList.toggle("locked", x === zr)); C.setMarkers(map, ITEMS.filter(it => samePlace(it, gp)), z.items); map.easeTo({ center: z.lngLat, zoom: 13.6, padding: mapPadding(true), duration: 900 }); } return; }
    const pick = e.target.closest("[data-pick]"); if (pick) { togglePick(pick.dataset.day, pick.dataset.pick); return; }
    const lc = e.target.closest("[data-lockcard]"); if (lc) { lockWith(lc.dataset.lockcard, lc.dataset.opt); return; }
    const rail = e.target.closest(".rail button"); if (rail) { selectDay(Number(rail.dataset.i)); return; }
    const act = e.target.closest(".act"); const lockRow = e.target.closest("[data-lock]");
    if (act && lockRow && !e.target.closest(".rej")) { lockWith(lockRow.dataset.lock, lockRow.dataset.opt); return; }
    const row = e.target.closest("[data-item]"); if (row && !e.target.closest("a")) { go(base(route()) + "/i-" + row.dataset.item); return; }
    const grp = e.target.closest("[data-items]"); if (grp && !e.target.closest("a")) { const first = grp.dataset.items.split(",")[0]; if (first) go(base(route()) + "/i-" + first); else lockWith(grp.dataset.lock, grp.dataset.opt); return; }
  });
  const closeDD = () => document.querySelectorAll(".dd.is-open").forEach(d => { d.classList.remove("is-open"); d.querySelector(".dd-btn").setAttribute("aria-expanded", "false"); });
  document.addEventListener("click", e => {
    const b = e.target.closest(".dd-btn");
    if (b) { const d = b.parentElement, was = d.classList.contains("is-open"); closeDD(); if (!was) { d.classList.add("is-open"); b.setAttribute("aria-expanded", "true"); } e.stopPropagation(); return; }
    if (!e.target.closest(".dd-panel")) closeDD(); else if (e.target.closest("[data-go]")) closeDD();
  }, true);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDD(); });
  document.addEventListener("keydown", e => { const row = e.target.closest && e.target.closest("[data-item],[data-lock]"); if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); row.click(); } });
  document.addEventListener("submit", e => {
    const mf = e.target.closest("#miscform"); if (mf) { e.preventDefault(); addMisc($("#misc-name").value, Number($("#misc-inr").value), $("#misc-per").value); return; }
    const f = e.target.closest("form[data-day]"); if (!f) return; e.preventDefault(); const t = f.querySelector("textarea"); const v = t.value; t.value = ""; C.addNote(f.dataset.day, v); });
  document.addEventListener("click", e => {
    const del = e.target.closest("[data-misc-del]"); if (del) { removeMisc(del.dataset.miscDel); return; }
    const rj = e.target.closest("[data-reject]"); if (rj) { toggleReject(rj.dataset.reject); return; }
    const cd = e.target.closest("[data-cdel]"); if (cd) { removeComment(cd.dataset.cdel); return; }
    const nm = e.target.closest("[data-name]"); if (nm) { pickName(nm.dataset.name); return; }
    const nd = e.target.closest("[data-ndel]"); if (nd) { S.delNote(nd.dataset.ndel); return; }
    if (e.target.closest("[data-seed]")) { S.seedFromThisBrowser(); return; }
    if (e.target.closest("[data-noseed]")) { S.discardLocal(); return; }
    if (e.target.closest("[data-gate]")) { gate(); return; }
  });
  document.addEventListener("submit", e => { const f = e.target.closest("form[data-comment]"); if (!f) return; e.preventDefault(); const t = f.querySelector("textarea"); const v = t.value; t.value = ""; addComment(f.dataset.comment, v); });
  document.addEventListener("input", e => { if (e.target.id === "fsearch") { const el = e.target, pos = el.selectionStart; SF.q = el.value; if (!SF.q && SF.sort === "near") SF.sort = "score"; render(); const n = $("#fsearch"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (err) {} } } });
  C.onChange(() => { const act = document.activeElement, actDay = act && act.closest && act.closest("form[data-day]")?.dataset.day; const drafts = {}; document.querySelectorAll("form[data-day] textarea").forEach(t => { if (t.value) drafts[t.closest("form").dataset.day] = t.value; }); render(); document.querySelectorAll("form[data-day] textarea").forEach(t => { const d = t.closest("form").dataset.day; if (drafts[d]) t.value = drafts[d]; }); if (actDay) { const t = document.querySelector(`form[data-day="${actDay}"] textarea`); if (t) t.focus(); } });

  // hovering a row lifts its marker on the map (desktop)
  let hoverId = null;
  document.addEventListener("mouseover", e => { const row = e.target.closest && e.target.closest(".row[data-item]"); const id = row ? row.dataset.item : null; if (id === hoverId) return; hoverId = id; document.querySelectorAll(".row.hl-hover").forEach(r => r.classList.remove("hl-hover")); if (row) row.classList.add("hl-hover"); if (mapReady() && map.getLayer("items-hot")) { map.setPaintProperty("items-hot", "circle-radius", ["case", ["==", ["get", "id"], id || ""], 10, 6]); map.setPaintProperty("items-all", "circle-radius", ["case", ["==", ["get", "id"], id || ""], 9, 3.5]); map.setPaintProperty("items-all", "circle-opacity", ["case", ["==", ["get", "id"], id || ""], 1, 0.4]); } });

  // ---- boot ----
  const gateEl = document.createElement("section"); gateEl.id = "gate"; gateEl.className = "gate"; gateEl.hidden = !!who();
  gateEl.innerHTML = `<div class="gatebox"><p class="eyebrow">Who is this?</p><h1 class="disp" style="font-size:clamp(28px,4vw,48px);margin:.2em 0 .5em">Pick your name</h1><p class="small">Locks, picks, comments and budget lines get tagged with it. You can switch any time.</p><div class="names">${NAMES.map(n => `<button data-name="${n}" class="${who() === n ? "on" : ""}">${n}</button>`).join("")}</div></div>`;
  document.body.appendChild(gateEl);

  $("#rail").innerHTML = T.days.map((d, i) => `<button data-i="${i}"><span class="fig">${h(d.date.split(" ")[0])}</span><small>${h(d.weekday.slice(0, 3))} · ${h(PLACE(d.base).name)}</small></button>`).join("");
  $("#menu").innerHTML = `<button class="nav-link" data-go="">Days</button>
    <div class="dd"><button class="nav-link dd-btn" aria-expanded="false" aria-haspopup="true">Places</button><div class="dd-panel" role="menu"><button role="menuitem" data-go="place-phuket">Phuket</button><button role="menuitem" data-go="place-phiphi">Phi Phi</button><button role="menuitem" data-go="place-aonang">Krabi and Ao Nang</button></div></div>
    <div class="dd"><button class="nav-link dd-btn" aria-expanded="false" aria-haspopup="true">Guides</button><div class="dd-panel" role="menu">${T.activities.map(a => `<button role="menuitem" data-go="act-${a.id}">${h(a.title)}</button>`).join("")}<button role="menuitem" data-go="essentials">Essentials</button></div></div>
    <button class="nav-link" data-go="budget">Budget</button>`;
  render();
  const skin = document.documentElement.dataset.skin || "l";
  map = C.initMap({ container: "map", pitch: skin === "k" ? 48 : 0, attribution: "bottom-right",
    palette: skin === "k" ? { land: "#0f3140", water: "#061822", cover: "#113644", road: "#1d4a5e", label: "#8ea4ae", route: "#ece2cb", marker: "#ece2cb", markerText: "#ece2cb" } : { land: "#f3efe6", water: "#bcd8e2", cover: "#dfe6cf", road: "#e2d9c6", label: "#5f5f58", route: "#2f5f8c", marker: "#2f5f8c", markerText: "#1c1c1a" },
    onItemClick: id => { const r = route(); go((r.page ? base(r) : "day-" + T.days[current].n) + "/i-" + id); },
    onEmptyClick: () => { if (route().item) closeTop(); },
    onZoneClick: id => { const el = document.querySelector(`[data-zone="${id}"]`); if (el) { el.click(); el.scrollIntoView({ behavior: "smooth", block: "center" }); } },
    onLoad: () => { focused = null; lastKey = "\u0000"; render(); } });
})();
