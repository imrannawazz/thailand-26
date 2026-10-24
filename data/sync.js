// Shared state layer. In-memory cache + localStorage always; Supabase when window.TRIP_CONFIG has a URL and key.
// Public API (window.STORE): state, ready (Promise), mode ("shared"|"local"), status (string),
//   setLock(decisionId, optionId|null, who) · setPick(itemId, day|null, who) · addNote(day, who, body) · delNote(id)
//   addComment(itemId, who, body) · delComment(id) · setReject(itemId, who, on) · addMisc(name, inr, per, who) · delMisc(id)
//   onChange(fn)  — fires after any local or remote change
(function () {
  const LS = "trip.shared.v1";
  const KEYS_OLD = { locks: "trip.locks.v1", lockBy: "trip.lockby.v1", picks: "trip.picks.v1", pickBy: "trip.pickby.v1", notes: "trip.notes.v1", comments: "trip.comments.v1", rejects: "trip.rejects.v1", misc: "trip.misc.v1" };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "x" + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  // ---- state: a normalised shape every page reads ----
  // locks: {decisionId: {optionId, who}}  picks: {itemId: {day, who}}  notes: [{id, day, who, body, at}]
  // comments: [{id, itemId, who, body, at}]  rejects: [{itemId, who}]  misc: [{id, name, inr, per, who, at}]
  const empty = () => ({ locks: {}, picks: {}, notes: [], comments: [], rejects: [], misc: [], links: [], tiers: [], prices: [], unavail: [] });
  let state = read(LS, null);
  if (state && !state.links) state.links = [];
  if (state && !state.tiers) state.tiers = [];
  if (state && !state.prices) state.prices = [];
  if (state && !state.unavail) state.unavail = [];
  if (!state) {
    // migrate the earlier per-key localStorage shape once
    state = empty();
    const locks = read(KEYS_OLD.locks, {}), lockBy = read(KEYS_OLD.lockBy, {});
    for (const d in locks) state.locks[d] = { optionId: locks[d], who: lockBy[d] || null };
    const picks = read(KEYS_OLD.picks, {}), pickBy = read(KEYS_OLD.pickBy, {});
    for (const day in picks) for (const id of picks[day]) state.picks[id] = { day: Number(day), who: pickBy[id] || null };
    const notes = read(KEYS_OLD.notes, {});
    for (const day in notes) for (const n of notes[day]) state.notes.push({ id: uuid(), day: Number(day), who: n.who, body: n.text, at: n.at });
    const comments = read(KEYS_OLD.comments, {});
    for (const itemId in comments) for (const c of comments[itemId]) state.comments.push({ id: uuid(), itemId, who: c.who, body: c.text, at: c.at });
    const rejects = read(KEYS_OLD.rejects, {});
    for (const itemId in rejects) for (const who of rejects[itemId]) state.rejects.push({ itemId, who });
    for (const m of read(KEYS_OLD.misc, [])) state.misc.push({ id: uuid(), ...m });
    write(LS, state);
  }
  const listeners = []; const emit = () => { write(LS, state); listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); };

  // ---- remote ----
  const cfg = window.TRIP_CONFIG || {};
  const canShare = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && window.supabase.createClient);
  const sb = canShare ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { realtime: { params: { eventsPerSecond: 5 } } }) : null;
  const S = { state, mode: sb ? "shared" : "local", status: sb ? "connecting" : "this browser only", onChange: fn => listeners.push(fn) };
  const fail = (what, err) => { console.error(what, err); S.status = "offline, saved here; retrying"; emit(); };

  async function pull() {
    if (!sb) return;
    const [l, p, n, c, r, m, k, tr, pr, ua] = await Promise.all(["locks", "picks", "notes", "comments", "rejects", "misc", "links", "tiers", "prices", "unavail"].map(t => sb.from(t).select("*").order(t === "locks" || t === "picks" || t === "tiers" ? "updated_at" : "created_at", { ascending: true })));
    const err = [l, p, n, c, r, m].find(x => x.error); if (err) throw err.error;
    const next = empty();
    // an empty option_id is an unlock: it keeps who unlocked and when
    next.unlocks = {};
    for (const row of l.data) { if (row.option_id) next.locks[row.decision_id] = { optionId: row.option_id, who: row.who, at: row.updated_at }; else next.unlocks[row.decision_id] = { who: row.who, at: row.updated_at }; }
    for (const row of p.data) next.picks[row.item_id] = { day: row.day, who: row.who };
    next.notes = n.data.map(row => ({ id: row.id, day: row.day, who: row.who, body: row.body, at: row.at }));
    next.comments = c.data.map(row => ({ id: row.id, itemId: row.item_id, who: row.who, body: row.body, at: row.at }));
    next.rejects = r.data.map(row => ({ itemId: row.item_id, who: row.who }));
    next.misc = m.data.map(row => ({ id: row.id, name: row.name, inr: row.inr, per: row.per, who: row.who, at: row.at }));
    next.links = k.error ? [] : k.data.map(row => ({ id: row.id, url: row.url, place: row.place, kind: row.kind, note: row.note, who: row.who, at: row.at, status: row.status }));
    next.tiers = tr.error ? [] : tr.data.map(row => ({ itemId: row.item_id, who: row.who, tier: row.tier }));
    next.unavail = ua.error ? [] : ua.data.map(row => ({ itemId: row.item_id, who: row.who, note: row.note, at: row.at }));
    next.prices = pr.error ? [] : pr.data.map(row => ({ id: row.id, itemId: row.item_id, who: row.who, inr: row.inr, per: row.per, note: row.note, at: row.at }));
    return next;
  }
  async function pushAll(local) {
    // one-time seed from this browser when the shared tables are empty
    const L = Object.entries(local.locks).map(([decision_id, v]) => ({ decision_id, option_id: v.optionId, who: v.who, updated_at: v.at || new Date().toISOString() }));
    const P = Object.entries(local.picks).map(([item_id, v]) => ({ item_id, day: v.day, who: v.who }));
    const N = local.notes.map(x => ({ id: x.id, day: x.day, who: x.who, body: x.body, at: x.at }));
    const Cm = local.comments.map(x => ({ id: x.id, item_id: x.itemId, who: x.who, body: x.body, at: x.at }));
    const R = local.rejects.map(x => ({ item_id: x.itemId, who: x.who }));
    const M = local.misc.map(x => ({ id: x.id, name: x.name, inr: x.inr, per: x.per, who: x.who, at: x.at }));
    const K = (local.links || []).map(x => ({ id: x.id, url: x.url, place: x.place, kind: x.kind, note: x.note, who: x.who, at: x.at, status: x.status || "new" }));
    const Tr = (local.tiers || []).map(x => ({ item_id: x.itemId, who: x.who, tier: x.tier }));
    const Ua = (local.unavail || []).map(x => ({ item_id: x.itemId, who: x.who, note: x.note, at: x.at }));
    const Pr = (local.prices || []).map(x => ({ id: x.id, item_id: x.itemId, who: x.who, inr: x.inr, per: x.per, note: x.note, at: x.at }));
    for (const [t, rows] of [["prices", Pr], ["unavail", Ua], ["locks", L], ["picks", P], ["notes", N], ["comments", Cm], ["rejects", R], ["misc", M], ["links", K], ["tiers", Tr]]) if (rows.length) { const { error } = await sb.from(t).upsert(rows); if (error) throw error; }
  }
  const isEmpty = s => !Object.keys(s.locks).length && !Object.keys(s.picks).length && !s.notes.length && !s.comments.length && !s.rejects.length && !s.misc.length && !(s.links || []).length && !(s.tiers || []).length && !(s.prices || []).length && !(s.unavail || []).length;
  let refreshTimer = null;
  const refresh = () => { clearTimeout(refreshTimer); refreshTimer = setTimeout(async () => { try { const next = await pull(); if (next) { state = next; S.state = state; S.status = "shared, live"; emit(); } } catch (e) { fail("refresh", e); } }, 250); };

  S.ready = (async () => {
    if (!sb) { emit(); return; }
    try {
      const remote = await pull();
      if (isEmpty(remote) && !isEmpty(state)) { S.status = "shared tables are empty"; S.pendingSeed = true; emit(); }
      else { state = remote; S.state = state; S.status = "shared, live"; emit(); }
      sb.channel("trip").on("postgres_changes", { event: "*", schema: "public" }, refresh).subscribe(st => { if (st === "SUBSCRIBED") { S.status = "shared, live"; emit(); } });
    } catch (e) { fail("connect", e); }
  })();
  S.seedFromThisBrowser = async () => { try { await pushAll(state); S.pendingSeed = false; refresh(); } catch (e) { fail("seed", e); } };
  S.discardLocal = async () => { S.pendingSeed = false; refresh(); };

  // ---- writes: cache first, then remote ----
  const remote = async (fn) => { if (!sb) return; try { const { error } = await fn(); if (error) throw error; } catch (e) { fail("write", e); } };
  S.setLock = (decisionId, optionId, who) => {
    const at = new Date().toISOString();
    if (optionId) state.locks[decisionId] = { optionId, who, at }; else { delete state.locks[decisionId]; (state.unlocks || (state.unlocks = {}))[decisionId] = { who, at }; } emit();
    remote(() => sb.from("locks").upsert({ decision_id: decisionId, option_id: optionId || "", who, updated_at: at }));
  };
  S.setPick = (itemId, day, who) => {
    if (day) state.picks[itemId] = { day, who }; else delete state.picks[itemId]; emit();
    remote(() => day ? sb.from("picks").upsert({ item_id: itemId, day, who, updated_at: new Date().toISOString() }) : sb.from("picks").delete().eq("item_id", itemId));
  };
  S.addNote = (day, who, body) => { const row = { id: uuid(), day: Number(day), who, body, at: today() }; state.notes.push(row); emit(); remote(() => sb.from("notes").insert(row)); };
  S.delNote = id => { state.notes = state.notes.filter(n => n.id !== id); emit(); remote(() => sb.from("notes").delete().eq("id", id)); };
  S.addComment = (itemId, who, body) => { const row = { id: uuid(), itemId, who, body, at: today() }; state.comments.push(row); emit(); remote(() => sb.from("comments").insert({ id: row.id, item_id: itemId, who, body, at: row.at })); };
  S.delComment = id => { state.comments = state.comments.filter(c => c.id !== id); emit(); remote(() => sb.from("comments").delete().eq("id", id)); };
  S.setReject = (itemId, who, on) => {
    state.rejects = state.rejects.filter(r => !(r.itemId === itemId && r.who === who)); if (on) state.rejects.push({ itemId, who }); emit();
    remote(() => on ? sb.from("rejects").upsert({ item_id: itemId, who }) : sb.from("rejects").delete().match({ item_id: itemId, who }));
  };
  S.addMisc = (name, inr, per, who) => { const row = { id: uuid(), name, inr: Math.round(inr), per, who, at: today() }; state.misc.push(row); emit(); remote(() => sb.from("misc").insert(row)); };
  S.addLink = (url, place, kind, note, who) => { const row = { id: uuid(), url, place, kind, note: note || null, who, at: today(), status: "new" }; state.links.push(row); emit(); remote(() => sb.from("links").insert(row)); };
  S.delLink = id => { state.links = state.links.filter(x => x.id !== id); emit(); remote(() => sb.from("links").delete().eq("id", id)); };
  S.linksFor = (place, kind) => (state.links || []).filter(x => (!place || x.place === place) && (!kind || x.kind === kind));
  // per-person A / B / Z tier on an item; tier null clears it
  S.setTier = (itemId, who, tier) => {
    state.tiers = (state.tiers || []).filter(t => !(t.itemId === itemId && t.who === who)); if (tier) state.tiers.push({ itemId, who, tier }); emit();
    remote(() => tier ? sb.from("tiers").upsert({ item_id: itemId, who, tier, updated_at: new Date().toISOString() }) : sb.from("tiers").delete().match({ item_id: itemId, who }));
  };
  S.tiersFor = itemId => (state.tiers || []).filter(t => t.itemId === itemId);
  S.tierOf = (itemId, who) => ((state.tiers || []).find(t => t.itemId === itemId && t.who === who) || {}).tier || null;
  // prices the group types in where research found none; the latest per item wins
  S.addPrice = (itemId, who, inr, per, note) => { const row = { id: uuid(), itemId, who, inr: Math.round(inr), per, note: note || null, at: today() }; state.prices.push(row); emit(); remote(() => sb.from("prices").insert({ id: row.id, item_id: itemId, who, inr: row.inr, per, note: row.note, at: row.at })); };
  S.delPrice = id => { state.prices = state.prices.filter(x => x.id !== id); emit(); remote(() => sb.from("prices").delete().eq("id", id)); };
  S.priceFor = itemId => { const l = (state.prices || []).filter(x => x.itemId === itemId); return l.length ? l[l.length - 1] : null; };
  // the group marks a stay unavailable for our dates (shared); on = mark, off = clear
  S.setUnavail = (itemId, who, on, note) => {
    state.unavail = (state.unavail || []).filter(x => x.itemId !== itemId); if (on) state.unavail.push({ itemId, who, note: note || null, at: today() }); emit();
    remote(() => on ? sb.from("unavail").upsert({ item_id: itemId, who, note: note || null, at: today() }) : sb.from("unavail").delete().eq("item_id", itemId));
  };
  S.unavailOf = itemId => (state.unavail || []).find(x => x.itemId === itemId) || null;
  S.delMisc = id => { state.misc = state.misc.filter(m => m.id !== id); emit(); remote(() => sb.from("misc").delete().eq("id", id)); };

  // convenience views
  S.locks = () => state.locks; S.unlocks = () => state.unlocks || {}; S.picksByDay = () => { const out = {}; for (const id in state.picks) (out[state.picks[id].day] || (out[state.picks[id].day] = [])).push(id); return out; };
  S.pickOf = id => state.picks[id] || null; S.notesFor = day => state.notes.filter(n => n.day === Number(day));
  S.commentsFor = id => state.comments.filter(c => c.itemId === id); S.rejectsFor = id => state.rejects.filter(r => r.itemId === id).map(r => r.who);
  window.STORE = S;
})();
