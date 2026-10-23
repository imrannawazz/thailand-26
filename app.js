// Three-level shell. Level 1: map + day highlights. Level 2: day page (or activity / essentials page). Level 3: item card.
// State (locks, picks, notes, name) is localStorage until the backend exists. Hash routing: #day-3, #day-3/i-<id>, #act-scuba, #essentials.
(function () {
  const T = window.TRIP, C = window.CORE;
  const h = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const $ = sel => document.querySelector(sel);
  const PLACE = k => T.places[k] || { name: k, thai: "" };
  const fmt = C.fmtINR;
  const inr = thb => Math.round(thb * T.fx.inrPerThb);

  // ---- extra state: picks (items added to a day) ----
  const LSP = "trip.picks.v1";
  let picks = {}; try { picks = JSON.parse(localStorage.getItem(LSP)) || {}; } catch (e) {}
  const savePicks = () => { try { localStorage.setItem(LSP, JSON.stringify(picks)); } catch (e) {} };
  const isPicked = (day, id) => (picks[day] || []).includes(id);
  function togglePick(day, id) { const a = picks[day] || (picks[day] = []); const i = a.indexOf(id); if (i >= 0) a.splice(i, 1); else a.push(id); savePicks(); render(); }

  function budget() {
    const b = C.budget(); let extra = 0;
    for (const d in picks) for (const id of picks[d]) { const it = T.items[id]; if (!it) continue; if (it.priceINR) extra += it.priceINR; else if (it.priceTHB) extra += inr(it.priceTHB) * T.travellers; }
    const total = b.total + extra; return { total, perHead: total / T.travellers };
  }

  // ---- routing ----
  let current = 0; // overview day index
  function route() { const hsh = location.hash.replace(/^#/, ""); const [page, sub] = hsh.split("/"); return { page: page || "", item: sub && sub.startsWith("i-") ? sub.slice(2) : null }; }
  function go(hash) { if (location.hash !== "#" + hash) location.hash = hash; else render(); }
  function closeTop() { const r = route(); if (r.item) go(r.page); else go(""); }
  window.addEventListener("hashchange", render);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeTop(); if (!route().page) { if (e.key === "ArrowRight") selectDay(Math.min(7, current + 1)); if (e.key === "ArrowLeft") selectDay(Math.max(0, current - 1)); } });

  // ---- map ----
  let map, focused = null;
  function focusPlace(place) {
    if (!map || place === focused) return; focused = place;
    const w = innerWidth, skin = document.documentElement.dataset.skin;
    const pad = w > 720 ? (skin === "k" ? { left: Math.round(w * .5), right: 60, top: 100, bottom: 120 } : { left: 60, right: 60, top: 120, bottom: Math.round(innerHeight * .45) }) : { left: 20, right: 20, top: 100, bottom: Math.round(innerHeight * .62) };
    C.flyTo(map, place, { padding: pad, pitch: skin === "k" ? 48 : 0, bearing: skin === "k" ? -12 : 0 });
  }

  // ---- render helpers ----
  function itemRow(id, ctx) {
    const it = T.items[id]; if (!it) return "";
    const picked = ctx && ctx.day && isPicked(ctx.day, id);
    const price = it.priceINR ? `${fmt(it.priceINR)}<small>INR</small>` : it.priceTHB ? `฿${fmt(it.priceTHB)}<small>a head</small>` : (it.priceTHB === 0 ? `free` : `—`);
    const meta = [it.area, it.rating ? `${it.rating}/${it.scale}${it.reviews ? " · " + fmt(it.reviews) + " reviews" : ""}` : null, it.when].filter(Boolean).join(" · ");
    return `<div class="row ${picked ? "locked" : ""}" role="button" tabindex="0" data-item="${it.id}"><div><span class="name">${h(it.name)}</span>${picked ? `<span class="act">In the plan</span>` : ""}<span class="meta">${h(it.tagline)}</span>${meta ? `<span class="meta">${h(meta)}</span>` : ""}</div><div class="fig">${price}</div></div>`;
  }
  function decisionBlock(id, day) {
    const d = C.decision(id); if (!d) return "";
    const lockedId = C.state.locks[d.id];
    const rows = d.options.map(o => {
      const it = o.item ? T.items[o.item] : null;
      const st = lockedId ? (lockedId === o.id ? "locked" : "other") : "";
      const label = o.label || (it && it.name) || o.id;
      const note = o.note || (it && it.tagline) || "";
      const meta = it && it.rating ? `${it.rating}/${it.scale}${it.reviews ? " · " + fmt(it.reviews) + " reviews" : ""} · ${it.reviewSource || ""}` : "";
      const price = o.costINR ? `${fmt(o.costINR)}<small>INR · ${h(o.unit || "")}</small>` : `<small>${h(o.unit || "price pending")}</small>`;
      const sub = (o.items || []).length ? `<span class="meta">${o.items.length} stays inside the cap: ${o.items.slice(0, 3).map(i => h(T.items[i].name)).join(", ")}${o.items.length > 3 ? "…" : ""}</span>` : "";
      return `<div class="row ${st}" role="button" tabindex="0" data-lock="${d.id}" data-opt="${o.id}" ${it ? `data-item="${it.id}"` : ""} ${o.items ? `data-items="${o.items.join(",")}"` : ""}><div><span class="name">${h(label)}</span><span class="act">${st === "locked" ? "Locked" : "Lock"}</span><span class="meta">${h(note)}</span>${meta ? `<span class="meta">${h(meta)}</span>` : ""}${sub}</div><div class="fig">${price}</div></div>`;
    }).join("");
    return `<div class="sec"><h2>Decide: <b>${h(d.title)}</b></h2>${rows}<p class="small pending" style="margin:.6em 0 0">Tap a name for the full card. Lock to count it in the budget; tap again to unlock.</p></div>`;
  }
  function legBlock(id) {
    const l = T.legs.find(x => x.id === id); if (!l) return "";
    return `<div class="sec"><h2>Getting there: <b>${h(l.title)}</b>, about ${l.hours} h</h2>${l.options.map(o => `<div class="opt"><div><span class="name">${h(o.mode)}</span>${o.link ? `<a href="${o.link}" target="_blank" rel="noopener">source</a>` : ""}<span class="dur">${h(o.duration)}</span><span class="small">${h(o.note)}</span></div><div class="fig">฿${fmt(o.costGroupTHB)}<small>for five · ${fmt(inr(o.costGroupTHB))} INR</small></div></div>`).join("")}</div>`;
  }
  function localBlock(place) {
    const l = T.local[place]; if (!l) return "";
    return `<div class="sec"><h2>Getting around <b>${h(PLACE(place).name)}</b></h2>${l.map(([n, t, u]) => `<div class="opt"><div><span class="name">${h(n)}</span>${u ? `<a href="${u}" target="_blank" rel="noopener">source</a>` : ""}<span class="small" style="display:block">${h(t)}</span></div><div></div></div>`).join("")}</div>`;
  }
  function poolBlock(title, type, place, firstIds, day) {
    const first = firstIds.filter(id => T.items[id] && T.items[id].type === type);
    const rest = Object.values(T.items).filter(it => it.type === type && it.place === place && !first.includes(it.id)).map(it => it.id);
    if (!first.length && !rest.length) return "";
    return `<div class="sec"><h2>${title} <b>${h(PLACE(place).name)}</b></h2>${first.map(id => itemRow(id, { day })).join("")}${rest.length ? `<details class="more"><summary>${rest.length} more in ${h(PLACE(place).name)}</summary>${rest.map(id => itemRow(id, { day })).join("")}</details>` : ""}</div>`;
  }
  function redditBlock(key) {
    const r = T.reddit[key]; if (!r) return "";
    return `<div class="sec reddit"><h2>${h(r.label)}</h2><ul>${r.summary.map(s => `<li>${h(s)}</li>`).join("")}</ul><p class="small">${r.sources.map(s => `<a href="${s.url}" target="_blank" rel="noopener">${h(s.title)}</a>`).join(" · ")}</p>${r.queries && r.queries.length ? `<p class="small pending">Reddit itself is blocked for Claude's tools. To add the real threads, search these and paste the links back: ${r.queries.map(h).join(" · ")}</p>` : ""}</div>`;
  }
  function notesBlock(day) {
    const items = (C.state.notes[day] || []).map(n => `<p class="item"><b>${h(n.who)}</b> ${h(n.text)} <span class="small pending">${h(n.at)}</span></p>`).join("");
    return `<div class="sec notes"><h2>Day ${day} notes</h2>${items || `<p class="pending">Nothing yet. Write the first one.</p>`}<form data-day="${day}"><textarea placeholder="Write here"></textarea><button type="submit">Add</button></form><p class="small who" style="margin-top:.8em">Writing as <input id="who" value="${h(C.state.who)}" placeholder="your name"></p></div>`;
  }

  // ---- pages ----
  function overview() {
    const d = T.days[current], p = PLACE(d.base);
    $("#hl").innerHTML = `<div class="date"><span class="fig">${h(d.date)}</span><span>Day ${d.n}, ${h(d.weekday)}${d.spend ? ". " + h(d.spend) : ""}</span></div><h1 class="disp">${h(p.name)}<small>${h(p.thai)}</small></h1><ul>${d.highlights.map(x => `<li>${h(x)}</li>`).join("")}</ul><p class="one small">${h(d.highlights[0])}${d.highlights[1] ? " · " + h(d.highlights[1]) : ""}</p><button class="open" data-go="day-${d.n}">Open the day <span aria-hidden="true">→</span></button>`;
    document.querySelectorAll(".rail button").forEach((b, i) => b.classList.toggle("on", i === current));
    focusPlace(d.base);
  }
  function dayPage(n) {
    const d = T.days.find(x => x.n === n); if (!d) return "";
    const p = PLACE(d.base), key = d.base === "aonang" ? "krabi" : d.base;
    const picksAll = [...d.picks.do, ...d.picks.eat, ...d.picks.drink, ...(picks[n] || [])];
    return `<div class="wrap"><button class="back" data-go="">← Map</button>
      <p class="eyebrow">Day ${d.n} · ${h(d.weekday)} ${h(d.date)}${d.spend ? " · " + h(d.spend) : ""}</p>
      <h1 class="disp">${h(p.name)}<small>${h(p.thai)}</small></h1>
      <p class="lead">${d.plan.map(h).join(" ")}</p>
      <div class="sec"><h2>The day</h2><ul class="hlist">${d.highlights.map(x => `<li>${h(x)}</li>`).join("")}</ul></div>
      ${d.tips.length ? `<div class="sec"><h2>From the research</h2><ul class="hlist">${d.tips.map(x => `<li>${h(x)}</li>`).join("")}</ul></div>` : ""}
      ${d.decisions.map(id => decisionBlock(id, n)).join("")}
      ${d.legs.map(legBlock).join("")}
      ${poolBlock("Do in", "do", d.base, picksAll, n)}
      ${poolBlock("Eat in", "eat", d.base, picksAll, n)}
      ${poolBlock("Drink in", "drink", d.base, picksAll, n)}
      ${d.base !== "airport" ? poolBlock("Sleep in", "stay", d.base, [], n) : ""}
      ${localBlock(d.base)}
      ${redditBlock(key)}
      ${notesBlock(n)}
    </div>`;
  }
  function actPage(id) {
    const a = T.activities.find(x => x.id === id); if (!a) return "";
    return `<div class="wrap"><button class="back" data-go="">← Map</button><p class="eyebrow">Across the trip${a.status === "pending" ? " · research running" : ""}</p><h1 class="disp">${h(a.title)}</h1><p class="lead ink" style="font-weight:500">${h(a.question)}</p><p class="lead">${h(a.intro)}</p><div class="sec"><h2>The pick</h2><p class="lead">${h(a.verdict)}</p></div>${Object.entries(a.perPlace).map(([pl, ids]) => `<div class="sec"><h2>In <b>${h(PLACE(pl).name)}</b></h2>${ids.map(i => itemRow(i, {})).join("")}</div>`).join("")}</div>`;
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
    const typeName = { stay: "Stay", do: "Do", eat: "Eat", drink: "Drink" }[it.type] || it.type;
    return `<div class="inner"><button class="back" data-close="item">← Back</button>
      <p class="eyebrow">${typeName} · ${h(PLACE(it.place).name)}${it.area ? " · " + h(it.area) : ""}</p>
      <h1 class="disp">${h(it.name)}</h1>
      <p class="tagline">${h(it.tagline)}</p>
      ${it.rating ? `<div class="rating"><span class="fig">${it.rating}<small style="font-size:.45em;color:var(--dim)">/${it.scale}</small></span><span>${it.reviews ? fmt(it.reviews) + " reviews · " : ""}${h(it.reviewSource || "")}</span></div>` : ""}
      ${price ? `<div class="price">${price}</div>` : ""}
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
      <div class="cta">${decOpt ? `<button data-lockcard="${decOpt.d.id}" data-opt="${decOpt.o.id}">${lockedHere ? "Locked as our choice · unlock" : "Lock as our choice"}</button>` : (dayN ? `<button data-pick="${it.id}" data-day="${dayN}">${picked ? "Remove from day " + dayN : "Add to day " + dayN}</button>` : "")}<button class="ghost" data-close="item">Close</button></div>
      ${decOpt ? `<p class="small pending">Part of the decision "${h(decOpt.d.title)}"${decOpt.o.costINR ? ": " + fmt(decOpt.o.costINR) + " INR, " + h(decOpt.o.unit || "") : ""}.</p>` : ""}
      <p class="src">Snapshot ${h(T.snapshot)}. Sources: ${it.sources.map(h).join("; ")}. Prices move; check the link before paying.</p>
    </div>`;
  }

  // ---- master render ----
  function render() {
    const r = route(), b = budget();
    $("#budget").innerHTML = `<div class="fig">${b.total ? fmt(b.total) : "—"}</div><span>${b.total ? "locked so far, INR · " + fmt(b.perHead) + " each" : "lock something to start the budget"}</span>`;
    overview();
    const sheet = $("#sheet"), card = $("#card");
    let page = "";
    if (r.page.startsWith("day-")) page = dayPage(Number(r.page.slice(4)));
    else if (r.page.startsWith("act-")) page = actPage(r.page.slice(4));
    else if (r.page === "essentials") page = essentialsPage();
    const y = sheet.hidden ? 0 : sheet.scrollTop;
    sheet.hidden = !page; if (page) { sheet.innerHTML = page; sheet.scrollTop = y; }
    card.hidden = !r.item; if (r.item) card.innerHTML = itemCard(r.item, r);
    document.body.classList.toggle("has-sheet", !!page);
    if (r.page.startsWith("day-")) { const d = T.days.find(x => x.n === Number(r.page.slice(4))); if (d) { current = T.days.indexOf(d); focusPlace(d.base); } }
  }
  function selectDay(i) { current = i; overview(); }

  // ---- events ----
  document.addEventListener("click", e => {
    const go_ = e.target.closest("[data-go]"); if (go_) { go(go_.dataset.go); return; }
    const close = e.target.closest("[data-close]"); if (close) { closeTop(); return; }
    const pick = e.target.closest("[data-pick]"); if (pick) { togglePick(pick.dataset.day, pick.dataset.pick); return; }
    const lc = e.target.closest("[data-lockcard]"); if (lc) { C.lock(lc.dataset.lockcard, lc.dataset.opt); return; }
    const rail = e.target.closest(".rail button"); if (rail) { selectDay(Number(rail.dataset.i)); return; }
    const act = e.target.closest(".act"); const lockRow = e.target.closest("[data-lock]");
    if (act && lockRow) { C.lock(lockRow.dataset.lock, lockRow.dataset.opt); return; }
    const row = e.target.closest("[data-item]"); if (row && !e.target.closest("a")) { go(route().page + "/i-" + row.dataset.item); return; }
    const grp = e.target.closest("[data-items]"); if (grp && !e.target.closest("a")) { const first = grp.dataset.items.split(",")[0]; if (first) go(route().page + "/i-" + first); else C.lock(grp.dataset.lock, grp.dataset.opt); return; }
  });
  document.addEventListener("keydown", e => { const row = e.target.closest && e.target.closest("[data-item],[data-lock]"); if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); row.click(); } });
  document.addEventListener("submit", e => { const f = e.target.closest("form[data-day]"); if (!f) return; e.preventDefault(); const t = f.querySelector("textarea"); const v = t.value; t.value = ""; C.addNote(f.dataset.day, v); });
  document.addEventListener("change", e => { if (e.target.id === "who") C.setWho(e.target.value); });
  C.onChange(() => { const act = document.activeElement, actDay = act && act.closest && act.closest("form[data-day]")?.dataset.day, who = act && act.id === "who"; const drafts = {}; document.querySelectorAll("form[data-day] textarea").forEach(t => { if (t.value) drafts[t.closest("form").dataset.day] = t.value; }); render(); document.querySelectorAll("form[data-day] textarea").forEach(t => { const d = t.closest("form").dataset.day; if (drafts[d]) t.value = drafts[d]; }); if (who) { const w = $("#who"); if (w) { w.focus(); w.setSelectionRange(w.value.length, w.value.length); } } else if (actDay) { const t = document.querySelector(`form[data-day="${actDay}"] textarea`); if (t) t.focus(); } });

  // ---- boot ----
  $("#rail").innerHTML = T.days.map((d, i) => `<button data-i="${i}"><span class="fig">${h(d.date.split(" ")[0])}</span><small>${h(d.weekday.slice(0, 3))} · ${h(PLACE(d.base).name)}</small></button>`).join("");
  $("#menu").innerHTML = T.activities.map(a => `<button data-go="act-${a.id}">${h(a.title)}</button>`).join("") + `<button data-go="essentials">Essentials</button>`;
  render();
  const skin = document.documentElement.dataset.skin;
  map = C.initMap({ container: "map", pitch: skin === "k" ? 48 : 0, attribution: "bottom-right",
    palette: skin === "k" ? { land: "#0f3140", water: "#061822", cover: "#113644", road: "#1d4a5e", label: "#8ea4ae", route: "#ece2cb" } : { land: "#f4f1ea", water: "#e2e7e4", cover: "#ebe9df", road: "#ddd7ca", label: "#8a8a84", route: "#2f5f8c" },
    onLoad: () => { const p = focused; focused = null; focusPlace(p || T.days[current].base); } });
})();
