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

  // ---- picks (items added to a day) ----
  const LSP = "trip.picks.v1";
  let picks = {}; try { picks = JSON.parse(localStorage.getItem(LSP)) || {}; } catch (e) {}
  const savePicks = () => { try { localStorage.setItem(LSP, JSON.stringify(picks)); } catch (e) {} };
  const isPicked = (day, id) => (picks[day] || []).includes(id);
  const DAYS_FOR = place => T.days.filter(d => d.base === place || (place === "krabi" && d.base === "aonang")).map(d => d.n);
  function dayOfPick(id) { for (const d in picks) if (picks[d].includes(id)) return Number(d); return null; }
  function assign(id, day) { for (const d in picks) picks[d] = picks[d].filter(x => x !== id); if (day) (picks[day] || (picks[day] = [])).push(id); savePicks(); render(); }
  function chips(it) {
    const days = DAYS_FOR(it.place); if (!days.length) return "";
    const on = dayOfPick(it.id);
    return `<span class="chips"><span class="lbl">Day</span>${days.map(n => `<button data-assign="${it.id}" data-day="${n}" class="${on === n ? "on" : ""}" aria-pressed="${on === n}" title="Put on day ${n}">${n}</button>`).join("")}${on ? `<button data-assign="${it.id}" data-day="" title="Remove from the plan">×</button>` : ""}</span>`;
  }
  function togglePick(day, id) { const a = picks[day] || (picks[day] = []); const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.push(id); savePicks(); render(); }
  const itemCost = it => it.priceINR ? it.priceINR : it.priceTHB ? inr(it.priceTHB) * T.travellers : 0;
  const FLIGHTS_TOTAL = (T.flights && T.flights.perHeadINR || 0) * T.travellers;
  function budget() {
    const b = C.budget(); let extra = 0;
    for (const d in picks) for (const id of picks[d]) { const it = T.items[id]; if (it) extra += itemCost(it); }
    const chosen = b.total + extra, total = chosen + FLIGHTS_TOTAL; return { chosen, flights: FLIGHTS_TOTAL, total, perHead: total / T.travellers };
  }
  function dayCost(n) {
    const d = T.days.find(x => x.n === n); let total = 0;
    for (const id of d.decisions) { const dec = C.decision(id); const o = dec && C.lockedOption(dec); if (o && o.costINR) total += o.costINR; }
    for (const id of (picks[n] || [])) { const it = T.items[id]; if (it) total += itemCost(it); }
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
  function closeTop() { const r = route(); if (r.item) go(base(r)); else go(""); }
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
  const SF = { kind: "all", pool: false, walk: false, budget: false, sort: "score" };
  function stayList(list) {
    let out = list.filter(it => it.type === "stay");
    if (SF.kind !== "all") out = out.filter(it => it.facts && it.facts.kind === SF.kind);
    if (SF.pool) out = out.filter(it => it.facts && (it.facts.pool === "private" || it.facts.pool === "shared"));
    if (SF.walk) out = out.filter(it => it.facts && it.facts.beachMode === "walk" && it.facts.beachMin !== null && it.facts.beachMin <= 15);
    if (SF.budget) out = out.filter(it => it.facts && it.facts.perHeadNight !== null && it.facts.perHeadNight <= 3000);
    const key = { score: it => -(it.score && it.score.total || 0), price: it => (it.facts && it.facts.perHeadNight) || 1e9, rating: it => -((it.score && it.score.parts.reviews) || 0), beach: it => (it.facts && it.facts.beachMode === "walk" && it.facts.beachMin !== null) ? it.facts.beachMin : 999 }[SF.sort];
    return out.sort((a, b) => key(a) - key(b) || ((b.score && b.score.total) || 0) - ((a.score && a.score.total) || 0));
  }
  function filterBar(count) {
    const chip = (k, v, label) => `<button class="${(k === "kind" ? SF.kind === v : SF[k]) ? "on" : ""}" data-f="${k}" data-v="${v}">${label}</button>`;
    return `<div class="fbar"><span class="lbl">Show</span>${chip("kind", "all", "All")}${chip("kind", "villa", "Villas")}${chip("kind", "hotel", "Hotels")}${chip("kind", "hostel", "Hostels")}<span class="lbl">Only</span>${chip("pool", true, "Pool")}${chip("walk", true, "Walk to beach")}${chip("budget", true, "Inside budget")}<span class="lbl">Sort</span>${["score", "price", "rating", "beach"].map(v => `<button class="${SF.sort === v ? "on" : ""}" data-f="sort" data-v="${v}">${{ score: "Best score", price: "Cheapest", rating: "Reviews", beach: "Nearest beach" }[v]}</button>`).join("")}<span class="lbl">${count} shown</span></div>`;
  }
  function scoreBadge(it) { return it.score && it.score.total !== null && it.score.total !== undefined ? `<span class="score" title="Score out of 100: reviews, budget, beach, pool">${it.score.total}</span>` : ""; }
  function factsLine(it) {
    if (!it.facts) return "";
    const f = it.facts, bits = [];
    bits.push({ villa: "Villa", hotel: "Hotel", hostel: "Hostel" }[f.kind] || "");
    if (f.pool === "private") bits.push("private pool"); else if (f.pool === "shared") bits.push("pool");
    if (f.beachMode === "walk" && f.beachMin !== null) bits.push(`${f.beachMin} min walk to the beach`); else if (f.beachMode === "drive") bits.push("beach by car"); else if (f.beachMode === "none" && !f.town) bits.push("no beach");
    if (f.perHeadNight) bits.push(`about ${fmt(f.perHeadNight)} INR a head a night`);
    return bits.filter(Boolean).join(" · ");
  }

  // ---- rows ----
  function itemRow(id, ctx) {
    const it = T.items[id]; if (!it) return "";
    const picked = ctx && ctx.day && isPicked(ctx.day, id);
    const price = it.priceINR ? `${fmt(it.priceINR)}<small>INR</small>` : it.priceTHB ? `฿${fmt(it.priceTHB)}<small>a head</small>` : (it.priceTHB === 0 ? `free` : `—`);
    const meta = [it.area, it.rating ? `${it.rating}/${it.scale}${it.reviews ? " · " + fmt(it.reviews) + " reviews" : ""}` : null, it.when].filter(Boolean).join(" · ");
    const facts = it.type === "stay" ? factsLine(it) : "";
    return `<div class="row ${picked ? "locked" : ""} ${it.tags.includes("avoid") ? "avoid" : ""}" role="button" tabindex="0" data-item="${it.id}"><div><span class="name">${scoreBadge(it)}${h(it.name)}</span>${picked ? `<span class="act">In the plan</span>` : ""}${it.tags.includes("selfpick") ? `<span class="act" style="color:var(--accent)">Self-pick, from your doc</span>` : it.tags.includes("docpick") ? `<span class="act">From your doc</span>` : ""}${it.tags.includes("avoid") ? `<span class="act">Avoid</span>` : ""}<span class="meta">${h(it.tagline)}</span>${facts ? `<span class="meta">${h(facts)}</span>` : ""}${meta ? `<span class="meta">${h(meta)}</span>` : ""}</div><div class="fig">${price}</div></div>`;
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
      return `<div class="row ${st}" role="button" tabindex="0" data-lock="${d.id}" data-opt="${o.id}" ${it ? `data-item="${it.id}"` : ""} ${o.items ? `data-items="${o.items.join(",")}"` : ""}><div><span class="name">${h(label)}</span><span class="act">${st === "locked" ? "Locked" : "Lock"}</span><span class="meta">${h(note)}</span>${meta ? `<span class="meta">${h(meta)}</span>` : ""}${sub}</div><div class="fig">${price}</div></div>`;
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
      const list = stayList(poolOf("stay", place));
      return `<div class="sec"><h2>${title} <b>${h(PLACE(place).name)}</b></h2>${filterBar(list.length)}<p class="small pending" style="margin:0 0 .6em">The score (0 to 100) weighs reviews 35, budget 30, beach 20 and pool 15. Unknown facts count as neutral, so incomplete listings sit in the middle. Open a card for the breakdown.</p>${list.map(it => itemRow(it.id, { day })).join("") || `<p class="pending">Nothing matches these filters.</p>`}</div>`;
    }
    const first = firstIds.filter(id => T.items[id] && T.items[id].type === type);
    const rest = poolOf(type, place).filter(it => !first.includes(it.id)).map(it => it.id);
    if (!first.length && !rest.length) return `<p class="pending">Nothing researched here yet.</p>`;
    return `<div class="sec"><h2>${title} <b>${h(PLACE(place).name)}</b></h2>${first.length ? `<p class="eyebrow" style="margin:0 0 .4em">Picked for this day</p>` : ""}${first.map(id => itemRow(id, { day })).join("")}${rest.length ? `${first.length ? `<p class="eyebrow" style="margin:1.4em 0 .4em">Everything else</p>` : ""}${rest.map(id => itemRow(id, { day })).join("")}` : ""}</div>`;
  }
  function redditBlock(key) {
    const r = T.reddit[key]; if (!r) return `<p class="pending">Nothing for this stop.</p>`;
    return `<div class="sec reddit"><h2>${h(r.label)}</h2><ul>${r.summary.map(s => `<li>${h(s)}</li>`).join("")}</ul><p class="small">${r.sources.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${h(s.title)}</a>`).join(" · ")}</p>${r.queries && r.queries.length ? `<p class="small pending">Reddit itself is blocked for Claude's tools. To add the real threads, search these and paste the links back: ${r.queries.map(h).join(" · ")}</p>` : ""}</div>`;
  }
  function notesBlock(day) {
    const items = (C.state.notes[day] || []).map(n => `<p class="item"><b>${h(n.who)}</b> ${h(n.text)} <span class="small pending">${h(n.at)}</span></p>`).join("");
    return `<div class="sec notes"><h2>Day ${day} notes</h2>${items || `<p class="pending">Nothing yet. Write the first one.</p>`}<form data-day="${day}"><textarea placeholder="Write here"></textarea><button type="submit">Add</button></form><p class="small who" style="margin-top:.8em">Writing as <input id="who" value="${h(C.state.who)}" placeholder="your name"></p></div>`;
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
      <p class="eyebrow">Day ${d.n} · ${h(d.weekday)} ${h(d.date)}${d.spend ? " · " + h(d.spend) : ""}</p>
      <h1 class="disp">${h(p.name)}<small>${h(p.thai)}</small></h1>
      ${T.guides[d.base] ? `<p class="small" style="margin:-.2em 0 .4em"><button class="linkish" data-go="place-${d.base}">About ${h(p.name)}: areas on the map and our take →</button></p>` : ""}
      <nav class="tabs" aria-label="Day sections">${tabs.map(([id, label]) => `<button class="${id === tab ? "on" : ""}" data-tab="${id}" aria-selected="${id === tab}">${label}</button>`).join("")}</nav>
      <div class="pane" id="pane">${pane}</div></div>` };
  }
  function actPage(id) {
    const a = T.activities.find(x => x.id === id); if (!a) return "";
    return `<div class="wrap"><button class="back" data-go="">← Map</button><p class="eyebrow">Across the trip</p><h1 class="disp">${h(a.title)}</h1><p class="lead ink" style="font-weight:500">${h(a.question)}</p><p class="lead">${h(a.intro)}</p><div class="sec"><h2>The pick</h2><p class="lead">${h(a.verdict)}</p></div>${a.table ? `<div class="sec tablewrap"><table class="cmp"><thead><tr>${a.table.head.map(x => `<th>${h(x)}</th>`).join("")}</tr></thead><tbody>${a.table.rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${h(c)}</td>` : `<th scope="row">${h(c)}</th>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}${Object.entries(a.perPlace).filter(([pl, ids]) => ids.length).map(([pl, ids]) => `<div class="sec"><h2>In <b>${h(PLACE(pl).name)}</b></h2>${ids.map(i => itemRow(i, {})).join("")}</div>`).join("")}</div>`;
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
    return { tab, html: `<div class="wrap"><button class="back" data-go="">← Map</button><p class="eyebrow">Place</p><h1 class="disp">${h(g.title)}<small>${h(p.thai)}</small></h1>
      <nav class="tabs" aria-label="Place sections"><button class="${tab === "guide" ? "on" : ""}" data-tab="guide">Guide</button><button class="${tab === "choose" ? "on" : ""}" data-tab="choose">Choose</button></nav>
      <div class="pane" id="pane">${body}</div></div>` };
  }
  function planPage(place, inner) {
    const p = PLACE(place), days = DAYS_FOR(place);
    const groups = [["stay", "Sleep"], ["do", "Do"], ["dive", "Scuba and snorkel"], ["eat", "Eat"], ["drink", "Drink"]];
    const picked = ITEMS.filter(it => samePlace(it, place) && dayOfPick(it.id));
    const sub = picked.reduce((a, it) => a + itemCost(it), 0);
    return `${inner ? "" : `<div class="wrap"><button class="back" data-go="">← Map</button><p class="eyebrow">Plan a place</p><h1 class="disp">${h(p.name)}<small>${h(p.thai)}</small></h1>`}
      <p class="lead">Everything researched for ${h(p.name)} in one list. Tap a day number to put an item on that day (days ${days.join(", ")}); tap another number to move it. What you choose shows up in each day's Itinerary tab and in the budget.</p>
      <div class="sec"><h2>Chosen so far</h2>${picked.length ? picked.map(it => `<div class="row locked" role="button" tabindex="0" data-item="${it.id}"><div><span class="name">${h(it.name)}</span>${chips(it)}<span class="meta">${h(it.tagline)}</span></div><div class="fig">${it.priceINR ? fmt(it.priceINR) + "<small>INR</small>" : it.priceTHB ? "฿" + fmt(it.priceTHB) + "<small>a head</small>" : "free"}</div></div>`).join("") + `<p class="small" style="margin-top:.8em">Adds <b class="ink">${fmt(sub)} INR</b> to the budget, ${fmt(sub / T.travellers)} each.</p>` : `<p class="pending">Nothing chosen yet.</p>`}</div>
      ${groups.map(([type, label]) => { const list = type === "stay" ? stayList(poolOf("stay", place)) : poolOf(type, place); return list.length || type === "stay" ? `<div class="sec"><h2>${label}</h2>${type === "stay" ? filterBar(list.length) : ""}${list.map(it => `<div class="row ${dayOfPick(it.id) ? "locked" : ""}" role="button" tabindex="0" data-item="${it.id}"><div><span class="name">${scoreBadge(it)}${h(it.name)}</span>${chips(it)}<span class="meta">${h(it.tagline)}</span>${it.type === "stay" && factsLine(it) ? `<span class="meta">${h(factsLine(it))}</span>` : ""}${it.rating ? `<span class="meta">${it.rating}/${it.scale}${it.reviews ? " · " + fmt(it.reviews) + " reviews" : ""}</span>` : ""}</div><div class="fig">${it.priceINR ? fmt(it.priceINR) + "<small>INR</small>" : it.priceTHB ? "฿" + fmt(it.priceTHB) + "<small>a head</small>" : (it.priceTHB === 0 ? "free" : "—")}</div></div>`).join("")}</div>` : ""; }).join("")}${inner ? "" : "</div>"}`;
  }
  function budgetPage() {
    const b = budget(), F = T.flights;
    const lockedRows = T.decisions.map(d => { const o = C.lockedOption(d); return o ? { d, o } : null; }).filter(Boolean);
    const pickRows = Object.entries(picks).flatMap(([day, ids]) => ids.filter(id => T.items[id]).map(id => ({ day: Number(day), it: T.items[id] }))).sort((a, b) => a.day - b.day);
    const row = (name, meta, inr, extra) => `<div class="opt"><div><span class="name">${name}</span>${meta ? `<span class="dur">${meta}</span>` : ""}${extra || ""}</div><div class="fig">${inr ? fmt(inr) + "<small>INR</small>" : "—"}</div></div>`;
    const flightRows = F ? row(`Flights, five tickets`, `${h(F.out.flight)} ${h(F.out.dep)} to ${h(F.out.arr)} on ${h(F.out.date)} · ${h(F.back.flight)} ${h(F.back.dep)} to ${h(F.back.arr)} on ${h(F.back.date)}`, b.flights, `<span class="small" style="display:block">${fmt(F.perHeadINR)} INR a head as paid on Imran's ticket. ${h(F.note)}</span>`) : "";
    const frame = T.essentials.find(e => e.k === "Budget frame");
    return `<div class="wrap"><button class="back" data-go="">← Map</button><p class="eyebrow">Budget</p><h1 class="disp">${fmt(b.total)}<small>INR for five so far · ${fmt(b.perHead)} each</small></h1>
      <p class="lead">Booked flights plus everything you have locked or added. Lock a stay or a day choice, or put an item on a day, and it lands here. Transport and food you have not added are not counted yet.</p>
      <div class="sec"><h2>Booked</h2>${flightRows}${F ? `<p class="small pending" style="margin:.6em 0 0">${h(F.cancel)} Bags: ${h(F.out.bags)}.</p>` : ""}</div>
      <div class="sec"><h2>Locked choices <b>${fmt(lockedRows.reduce((a, r) => a + (r.o.costINR || 0), 0))} INR</b></h2>${lockedRows.length ? lockedRows.map(({ d, o }) => { const it = o.item ? T.items[o.item] : null; return `<div class="opt" ${it ? `role="button" tabindex="0" data-item="${it.id}"` : ""}><div><span class="name">${h(o.label || (it && it.name) || o.id)}</span><span class="dur">${h(d.title)}${o.unit ? " · " + h(o.unit) : ""}</span></div><div class="fig">${o.costINR ? fmt(o.costINR) + "<small>INR</small>" : "—"}</div></div>`; }).join("") : `<p class="pending">Nothing locked yet. Open a day's Decide tab.</p>`}</div>
      <div class="sec"><h2>Added to days <b>${fmt(pickRows.reduce((a, r) => a + itemCost(r.it), 0))} INR</b></h2>${pickRows.length ? pickRows.map(({ day, it }) => `<div class="opt" role="button" tabindex="0" data-item="${it.id}"><div><span class="name">${h(it.name)}</span><span class="dur">Day ${day} · ${h(PLACE(it.place).name)}${it.priceTHB ? " · ฿" + fmt(it.priceTHB) + " a head" : ""}</span></div><div class="fig">${itemCost(it) ? fmt(itemCost(it)) + "<small>INR</small>" : "free"}</div></div>`).join("") : `<p class="pending">Nothing added yet. Use the day chips on any place.</p>`}</div>
      <div class="sec"><h2>Per head</h2><p class="lead"><span class="fig" style="font-size:clamp(26px,3vw,44px)">${fmt(b.perHead)}</span> INR each, of which flights ${fmt(F ? F.perHeadINR : 0)} and chosen ${fmt(b.chosen / T.travellers)}.${frame ? " Research frame, excluding flights: " + h(frame.v.replace("Excluding flights, with stays at your 3 to 5K caps: ", "")) : ""}</p></div>
      <p class="src">Prices are the researched snapshots (2026-10-24) at 1 THB = ${T.fx.inrPerThb} INR. Check the link on each card before paying.</p></div>`;
  }
  function essentialsPage() {
    return `<div class="wrap"><button class="back" data-go="">← Map</button><p class="eyebrow">Before we go</p><h1 class="disp">Essentials</h1>${T.essentials.map(e => `<div class="opt"><div><span class="name">${h(e.k)}</span><span class="small" style="display:block">${h(e.v)}</span>${e.src && e.src.startsWith("http") ? `<a href="${e.src}" target="_blank" rel="noopener">source</a>` : ""}</div><div></div></div>`).join("")}<div class="sec"><h2>Budget frame</h2><p class="lead">${h(T.budgetRule)} ${h(T.fx.note)}</p></div></div>`;
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
      <p class="eyebrow">${typeName} · ${h(PLACE(it.place).name)}${it.area ? " · " + h(it.area) : ""}${it.geo === "approx" ? " · map pin approximate" : ""}${it.tags.includes("selfpick") ? " · self-pick from your Google Doc" : it.tags.includes("docpick") ? " · from your Google Doc" : ""}</p>
      <h1 class="disp">${h(it.name)}</h1>
      <p class="tagline">${h(it.tagline)}</p>
      ${it.rating ? `<div class="rating"><span class="fig">${it.rating}<small style="font-size:.45em;color:var(--dim)">/${it.scale}</small></span><span>${it.reviews ? fmt(it.reviews) + " reviews · " : ""}${h(it.reviewSource || "")}</span></div>` : ""}
      ${price ? `<div class="price">${price}</div>` : ""}
      ${it.score && it.score.total !== null && it.score.total !== undefined ? `<h3>Score</h3><div class="rating"><span class="fig">${it.score.total}<small style="font-size:.45em;color:var(--dim)">/100</small></span><span>${["reviews", "budget", "beach", "pool"].filter(k => it.score.weights[k]).map(k => `${k} ${it.score.parts[k] === null ? "?" : it.score.parts[k]}`).join(" · ")}${it.score.unknown.length ? ` · unknown: ${it.score.unknown.join(", ")}` : ""}</span></div>${it.type === "stay" ? `<p class="small">${h(factsLine(it))}</p>` : ""}` : ""}
      ${it.position ? `<h3>Position</h3><p>${[it.position.pier !== null && it.position.pier !== undefined ? it.position.pier + " min from the pier" : "", it.position.lohdalum !== null && it.position.lohdalum !== undefined ? it.position.lohdalum + " min to the Loh Dalum bars" : "", it.position.viewpoint !== null && it.position.viewpoint !== undefined ? it.position.viewpoint + " min to the viewpoint stairs" : "", it.position.noise ? "noise: " + it.position.noise : "", it.position.ac === true ? "AC" : it.position.ac === false ? "fan only" : ""].filter(Boolean).join(" · ")}</p>` : ""}
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
      <div class="cta">${decOpt ? `<button data-lockcard="${decOpt.d.id}" data-opt="${decOpt.o.id}">${lockedHere ? "Locked as our choice · unlock" : "Lock as our choice"}</button>` : (DAYS_FOR(it.place).length ? `<span class="small" style="align-self:center">On the plan:</span>${chips(it)}` : "")}<button class="ghost" data-close="item">Close</button></div>
      ${decOpt ? `<p class="small pending">Part of the decision "${h(decOpt.d.title)}"${decOpt.o.costINR ? ": " + fmt(decOpt.o.costINR) + " INR, " + h(decOpt.o.unit || "") : ""}.</p>` : ""}
      <p class="src">Snapshot ${h(T.snapshot)}. Sources: ${it.sources.map(h).join("; ")}. Prices move; check the link before paying.</p>
    </div>`;
  }

  // ---- master render ----
  let lastKey = "";
  function render() {
    const r = route(), b = budget();
    $("#budget").innerHTML = `<button data-go="budget" style="text-align:inherit"><div class="fig">${fmt(b.total)}</div><span>INR so far · ${fmt(b.perHead)} each · flights ${fmt(b.flights)} + chosen ${fmt(b.chosen)}</span></button>`;
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
    card.hidden = !r.item; if (r.item) card.innerHTML = itemCard(r.item, r);
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
      const list = r.page.startsWith("act-") ? ITEMS : gp ? ITEMS.filter(it => samePlace(it, gp)) : ITEMS.filter(it => samePlace(it, place));
      C.setZones(map, gp && T.guides[gp] && tab !== "choose" ? T.guides[gp].zones : []);
      const bounds = C.setMarkers(map, list, hot);
      const changed = key !== lastKey;
      if (openItem) map.easeTo({ center: openItem.lngLat, zoom: Math.max(map.getZoom(), 13.5), padding: mapPadding(!!page), duration: 900 });
      else if (gp && changed) focusPlace(gp, true);
      else if (changed && bounds && (d && LIST_TABS.has(tab) || r.page.startsWith("act-"))) map.fitBounds(bounds, { padding: mapPadding(!!page), maxZoom: 14, duration: 1400 });
      else if (changed || place !== focused) focusPlace(place, !!page);
    }
    lastKey = key;
  }
  function selectDay(i) {
    current = i; overview(); const d = T.days[i]; focusPlace(d.base, false);
    if (mapReady()) C.setMarkers(map, ITEMS.filter(it => samePlace(it, d.base)), [...d.picks.do, ...d.picks.eat, ...d.picks.drink]);
  }

  // ---- events ----
  document.addEventListener("click", e => {
    const go_ = e.target.closest("[data-go]"); if (go_) { go(go_.dataset.go); return; }
    const close = e.target.closest("[data-close]"); if (close) { closeTop(); return; }
    const tabBtn = e.target.closest("[data-tab]"); if (tabBtn) { go(route().page + "/t-" + tabBtn.dataset.tab); return; }
    const as = e.target.closest("[data-assign]"); if (as) { e.stopPropagation(); assign(as.dataset.assign, as.dataset.day ? Number(as.dataset.day) : null); return; }
    const fb = e.target.closest("[data-f]"); if (fb) { const k = fb.dataset.f, v = fb.dataset.v; if (k === "kind" || k === "sort") SF[k] = v; else SF[k] = !SF[k]; render(); return; }
    const zr = e.target.closest("[data-zone]"); if (zr && !e.target.closest("[data-item]")) { const gp = route().page.slice(6); const z = (T.guides[gp] || { zones: [] }).zones.find(x => x.id === zr.dataset.zone); if (z && map) { document.querySelectorAll(".zone").forEach(x => x.classList.toggle("locked", x === zr)); C.setMarkers(map, ITEMS.filter(it => samePlace(it, gp)), z.items); map.easeTo({ center: z.lngLat, zoom: 13.6, padding: mapPadding(true), duration: 900 }); } return; }
    const pick = e.target.closest("[data-pick]"); if (pick) { togglePick(pick.dataset.day, pick.dataset.pick); return; }
    const lc = e.target.closest("[data-lockcard]"); if (lc) { C.lock(lc.dataset.lockcard, lc.dataset.opt); return; }
    const rail = e.target.closest(".rail button"); if (rail) { selectDay(Number(rail.dataset.i)); return; }
    const act = e.target.closest(".act"); const lockRow = e.target.closest("[data-lock]");
    if (act && lockRow) { C.lock(lockRow.dataset.lock, lockRow.dataset.opt); return; }
    const row = e.target.closest("[data-item]"); if (row && !e.target.closest("a")) { go(base(route()) + "/i-" + row.dataset.item); return; }
    const grp = e.target.closest("[data-items]"); if (grp && !e.target.closest("a")) { const first = grp.dataset.items.split(",")[0]; if (first) go(base(route()) + "/i-" + first); else C.lock(grp.dataset.lock, grp.dataset.opt); return; }
  });
  document.addEventListener("keydown", e => { const row = e.target.closest && e.target.closest("[data-item],[data-lock]"); if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); row.click(); } });
  document.addEventListener("submit", e => { const f = e.target.closest("form[data-day]"); if (!f) return; e.preventDefault(); const t = f.querySelector("textarea"); const v = t.value; t.value = ""; C.addNote(f.dataset.day, v); });
  document.addEventListener("change", e => { if (e.target.id === "who") C.setWho(e.target.value); });
  C.onChange(() => { const act = document.activeElement, actDay = act && act.closest && act.closest("form[data-day]")?.dataset.day, who = act && act.id === "who"; const drafts = {}; document.querySelectorAll("form[data-day] textarea").forEach(t => { if (t.value) drafts[t.closest("form").dataset.day] = t.value; }); render(); document.querySelectorAll("form[data-day] textarea").forEach(t => { const d = t.closest("form").dataset.day; if (drafts[d]) t.value = drafts[d]; }); if (who) { const w = $("#who"); if (w) { w.focus(); w.setSelectionRange(w.value.length, w.value.length); } } else if (actDay) { const t = document.querySelector(`form[data-day="${actDay}"] textarea`); if (t) t.focus(); } });

  // ---- boot ----
  $("#rail").innerHTML = T.days.map((d, i) => `<button data-i="${i}"><span class="fig">${h(d.date.split(" ")[0])}</span><small>${h(d.weekday.slice(0, 3))} · ${h(PLACE(d.base).name)}</small></button>`).join("");
  $("#menu").innerHTML = `<button data-go="place-phuket">Phuket</button><button data-go="place-phiphi">Phi Phi</button><button data-go="place-aonang">Krabi</button><button data-go="budget">Budget</button>` + T.activities.map(a => `<button data-go="act-${a.id}">${h(a.title)}</button>`).join("") + `<button data-go="essentials">Essentials</button>`;
  render();
  const skin = document.documentElement.dataset.skin || "l";
  map = C.initMap({ container: "map", pitch: skin === "k" ? 48 : 0, attribution: "bottom-right",
    palette: skin === "k" ? { land: "#0f3140", water: "#061822", cover: "#113644", road: "#1d4a5e", label: "#8ea4ae", route: "#ece2cb", marker: "#ece2cb", markerText: "#ece2cb" } : { land: "#f4f1ea", water: "#dfe5e2", cover: "#ebe9df", road: "#d8d2c4", label: "#6f6f68", route: "#2f5f8c", marker: "#2f5f8c", markerText: "#1c1c1a" },
    onItemClick: id => { const r = route(); go((r.page ? base(r) : "day-" + T.days[current].n) + "/i-" + id); },
    onZoneClick: id => { const el = document.querySelector(`[data-zone="${id}"]`); if (el) { el.click(); el.scrollIntoView({ behavior: "smooth", block: "center" }); } },
    onLoad: () => { focused = null; lastKey = "\u0000"; render(); } });
})();
