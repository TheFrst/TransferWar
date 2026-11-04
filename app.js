import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, get, update, onValue, runTransaction }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { initializeAuth, browserLocalPersistence, browserSessionPersistence, signInAnonymously }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { CURRENT, LEGENDS } from "./players.js";

// Firebase project: Playtgthr (playtgthr-a7daa). Same project as Main Bareng; this game uses its own "tw" folder.
const firebaseConfig = {
  apiKey: "AIzaSyCorGRJiuUTjyIJe8yl9IAnCMs889jy1NQ",
  authDomain: "playtgthr-a7daa.firebaseapp.com",
  databaseURL: "https://playtgthr-a7daa-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "playtgthr-a7daa",
  storageBucket: "playtgthr-a7daa.firebasestorage.app",
  messagingSenderId: "1084444606157",
  appId: "1:1084444606157:web:fb6287b553ca1362c97384"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
// Normal play: one manager per browser. Testing alone: open .../#tes in several NEW tabs.
const TEST = location.hash === "#tes";
const auth = initializeAuth(app, { persistence: TEST ? browserSessionPersistence : browserLocalPersistence });
const me = (await signInAnonymously(auth)).user.uid;

// ---------- game settings ----------
const SHAPE = { GK: 1, DEF: 4, MID: 3, FWD: 3 };   // 4-3-3
const SQUAD = 11;
const TEAMS = 8;                                    // league size; AI clubs fill the empty spots
const MAX_MANAGERS = 8;
const LEAGUE_DAYS = 14;                             // 8 teams, home and away
// Test mode only: add ?fast to a #tes link to run the auction 5× faster.
const F = TEST && /[?&]fast/.test(location.search) ? 0.2 : 1;
const FIRST_LOT_MS = 12000 * F, LOT_MS = 9000 * F, BID_MS = 7000 * F;
const POOLS = { current: "⚽ Current stars", legends: "👑 Legends", mixed: "🌍 Both", stars: "🌟 Icons only (85+)" };
const BUDGETS = [100, 150, 200, 300];
const EMOTES = ["😂", "🔥", "💸", "🤡", "😭", "🫡", "😤", "👀"];
const AI_NAMES = ["Real Mager", "Kampung United", "Bayern Muncak", "Atlético Santai", "Inter Milan KW",
  "Borussia Dortmundy", "Manchester Siti", "Paris Saint-Gorengan"];
const FA_FIRST = ["Budi", "Agus", "Joko", "Dedi", "Rudi", "Eko", "Bambang", "Slamet", "Hendra", "Yusuf"];
const FA_LAST = ["Santoso", "Wijaya", "Saputra", "Hidayat", "Pratama", "Gunawan", "Setiawan", "Nugroho"];
const TACTIC = { attack: [1.25, 1.15], balanced: [1, 1], defend: [0.8, 0.75] };   // [own goals ×, opponent goals ×]

// Player database with stable ids: c0, c1… (current) and l0, l1… (legends).
const DB = {};
[["c", CURRENT], ["l", LEGENDS]].forEach(([pre, list]) => list.forEach((s, i) => {
  const [name, pos, r, cc] = s.split("|");
  DB[pre + i] = { name, pos, r: +r, cc };
}));

const $ = s => document.querySelector(s);
let room = null, code = null, offset = 0, unsub = null, autoTimer = null, cache = {};
let seenLot = null, shownStep = null, liveTimer = null, toastTimer = null, scoutOn = null, lastSec = null, hallSaved = "";
const done = new Set();

// ---------- helpers ----------
const roomRef = (p = "") => ref(db, `tw/${code}${p ? "/" + p : ""}`);
const serverNow = () => Date.now() + offset;
const load = (k, d) => { try { return JSON.parse(localStorage[k] ?? d); } catch { return JSON.parse(d); } };
const save = (k, v) => { try { localStorage[k] = JSON.stringify(v); } catch {} };
const pick = a => a[Math.floor(Math.random() * a.length)];
const newId = () => Math.random().toString(36).slice(2, 10);
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function once(key, fn) { const k = `${room.rid}:${key}`; if (done.has(k)) return; done.add(k); fn(() => done.delete(k)); }
const fail = e => alert("Something went wrong: " + e.message);
const P = id => DB[id] || room?.fa?.[id] || { name: "Unknown", pos: "MID", r: 55, cc: "ID" };
const flag = cc => cc === "EN" ? "🏴󠁧󠁢󠁥󠁮󠁧󠁿" : cc === "SC" ? "🏴󠁧󠁢󠁳󠁣󠁴󠁿" : String.fromCodePoint(...[...cc].map(c => 127397 + c.charCodeAt(0)));
const short = n => { const w = n.split(" "); return (w.length > 1 ? w.slice(1).join(" ") : n).slice(0, 14); };
const money = m => `€${m}m`;
function el(tag, text, cls) { const e = document.createElement(tag); if (text != null) e.textContent = text; if (cls) e.className = cls; return e; }
function toast(t) {
  const b = $("#toast"); b.textContent = t; b.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { b.hidden = true; }, 2200);
}
const buzz = p => { try { navigator.vibrate?.(p); } catch {} };
// ---------- sound (made live, no files) ----------
let AC = null;
function ac() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch { AC = null; } return AC; }
function tone(f, t0, dur, type = "sine", vol = .14, f2) {
  const a = ac(); if (!a || load("twMute", "false")) return;
  const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + .05);
}
function noise(t0, dur, vol = .2, freq = 1200) {
  const a = ac(); if (!a || load("twMute", "false")) return;
  const len = a.sampleRate * dur, b = a.createBuffer(1, len, a.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + t0;
  s.buffer = b; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = .7; g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(a.destination); s.start(t);
}
const SFX = {
  bid: () => { tone(1320, 0, .09, "square", .07); tone(1760, .07, .14, "square", .07); },
  tick: () => tone(1000, 0, .05, "square", .05),
  beat: () => { tone(60, 0, .12, "sine", .3); tone(55, .16, .12, "sine", .22); },
  sold: () => { noise(0, .12, .5, 400); tone(140, 0, .25, "triangle", .3, 70); [523, 659, 784].forEach((f, i) => tone(f, .2 + i * .08, .3, "triangle", .1)); },
  unsold: () => tone(300, 0, .5, "sawtooth", .08, 150),
  outbid: () => { tone(880, 0, .12, "sawtooth", .1); tone(660, .14, .2, "sawtooth", .1); },
  goal: () => { noise(0, 1.6, .35, 900); noise(.1, 1.2, .2, 2400); },
  whistle: () => { tone(2600, 0, .25, "sine", .1); tone(2600, .32, .5, "sine", .1); },
  pop: () => tone(880, 0, .1, "sine", .1, 1320),
  reveal: () => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, i * .07, .25, "triangle", .1)),
};
function stamp(text, cls) {
  const box = $("#lotcard"); if (!box) return;
  const s = el("div", text, "stamp " + (cls || "")); box.append(s); setTimeout(() => s.remove(), 2600);
}
// once-per-auction powers, remembered on this phone
const powKey = () => `twPow_${room.rid}`;
const powUsed = k => !!load(powKey(), "{}")[k];
function usePow(k) { const u = load(powKey(), "{}"); u[k] = 1; save(powKey(), u); }
function floatEmote(name, e) {
  const f = el("div", null, "emote-fly"); f.append(el("b", e), el("span", name));
  f.style.left = (10 + Math.random() * 70) + "%"; document.body.append(f); setTimeout(() => f.remove(), 2600);
}
let lastEmote = 0;
const tier = r => r >= 88 ? "elite" : r >= 82 ? "silver" : "bronze";
function posBadge(pos) { return el("span", pos, "pos " + pos); }
function myName() { const n = $("#name").value.trim().slice(0, 16); if (n) save("twName", n); return n; }
function myClub() { const c = $("#club").value.trim().slice(0, 20); if (c) save("twClub", c); return c; }
const mgrLabel = uid => room.players?.[uid] ? `${room.players[uid].name} (${room.players[uid].club})` : "a manager who left";

// Deterministic random numbers, so every phone simulates exactly the same season.
function rngFor(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
  let a = h >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function poisson(l, rng) { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= rng(); } while (p > L); return k - 1; }

// Prefill
const linkCode = new URLSearchParams(location.search).get("r");
$("#joincode").value = String(linkCode || load("twCode", '""')).toUpperCase().slice(0, 4);
$("#name").value = load("twName", '""');
$("#club").value = load("twClub", '""');
onValue(ref(db, ".info/serverTimeOffset"), s => { offset = s.val() || 0; });

// ---------- rooms ----------
async function createRoom() {
  const name = myName(), club = myClub();
  if (!name || !club) return alert("Type your name and a club name first");
  for (let attempt = 0; attempt < 5; attempt++) {
    const c = Array.from({ length: 4 }, () => pick("ABCDEFGHJKMNPQRSTUVWXYZ23456789")).join("");
    try {
      await set(ref(db, `tw/${c}`), { host: me, state: "lobby", rid: newId(), pool: "current", budget: 200,
        players: { [me]: { name, club, tactic: "balanced" } } });
      return listen(c);
    } catch { /* code taken: try another */ }
  }
  alert("Couldn't create a room, try again");
}

async function joinRoom() {
  const c = $("#joincode").value.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(c)) return alert("The code is 4 letters/numbers");
  try {
    const snap = await get(ref(db, `tw/${c}`));
    if (!snap.exists()) return alert("Room not found");
    const r = snap.val();
    if (!r.players?.[me]) {
      if (r.state !== "lobby") return alert("This game already started. Ask the host to go back to the lobby.");
      if (Object.keys(r.players || {}).length >= MAX_MANAGERS) return alert("This room is full (8 managers)");
      const name = myName(), club = myClub();
      if (!name || !club) return alert("Type your name and a club name first");
      await set(ref(db, `tw/${c}/players/${me}`), { name, club, tactic: "balanced" });
    }
    listen(c);
  } catch (e) { alert("Couldn't join: " + e.message); }
}

function listen(c) {
  unsub?.();
  code = c; save("twCode", c);
  unsub = onValue(ref(db, `tw/${code}`), snap => {
    room = snap.val();
    if (!room) return leave("The room was closed");
    if (!room.players?.[me] && room.state === "lobby") return leave("You were removed from the room");
    render();
  }, e => alert("Connection error: " + e.message));
}
function leave(msg) {
  unsub?.(); unsub = null; room = null;
  document.querySelectorAll("section").forEach(s => s.hidden = s.id !== "home");
  alert(msg);
}

// ---------- render ----------
function render() {
  const isHost = me === room.host;
  document.querySelectorAll("section").forEach(s => s.hidden = s.id !== room.state);
  document.querySelectorAll(".host-only").forEach(b => b.hidden = !isHost);
  document.querySelectorAll(".guest-only").forEach(b => b.hidden = isHost);
  if (room.state === "lobby") renderLobby(isHost);
  if (room.state === "auction") renderAuction();
  if (room.state === "season") renderSeason(isHost);
  if (room.state === "end") renderEnd();
  const em = room.emote;
  if (em && em.t !== lastEmote) { if (lastEmote && serverNow() - em.t < 6000) { floatEmote(room.players?.[em.by]?.name || "?", em.e); SFX.pop(); } lastEmote = em.t; }
  document.querySelectorAll(".emotes").forEach(b => b.hidden = !["auction", "season", "end"].includes(room.state));
  tick();
}

function renderLobby(isHost) {
  $("#code").textContent = code;
  const ids = Object.keys(room.players || {});
  $("#players").replaceChildren(...ids.map(id => {
    const li = el("li");
    li.append(el("span", `${room.players[id].name}${id === room.host ? " 👑" : ""}`), el("span", room.players[id].club, "muted"));
    if (isHost && id !== room.host) { const k = el("button", "✕", "kick"); k.dataset.kick = id; li.append(k); }
    return li;
  }));
  $("#pools").replaceChildren(...Object.entries(POOLS).map(([k, label]) => {
    const b = el("button", label, "alt" + (room.pool === k ? " on" : "")); b.disabled = !isHost; b.dataset.pool = k; return b;
  }));
  $("#budgets").replaceChildren(...BUDGETS.map(v => {
    const b = el("button", money(v), "alt" + (room.budget === v ? " on" : "")); b.disabled = !isHost; b.dataset.budget = v; return b;
  }));
  $("#start").disabled = ids.length < 2;
  $("#start").textContent = ids.length < 2 ? "Need at least 2 managers" : `Start auction (${ids.length} managers + ${Math.max(0, TEAMS - ids.length)} AI clubs)`;
}

function pitch(ids) {
  const box = el("div", null, "pitch");
  for (const pos of ["FWD", "MID", "DEF", "GK"]) {
    const line = el("div", null, "line");
    const here = ids.filter(id => P(id).pos === pos).sort((a, b) => P(b).r - P(a).r);
    for (let i = 0; i < SHAPE[pos]; i++) {
      const id = here[i], spot = el("div", null, "spot" + (id ? "" : " empty"));
      spot.append(el("b", id ? P(id).r : "·"), el("span", id ? short(P(id).name) : pos));
      line.append(spot);
    }
    box.append(line);
  }
  return box;
}

// ---------- AUCTION ----------
const squadOf = (uid, squads = room.squads) => Object.keys(squads?.[uid] || {});
function needsOf(uid, squads = room.squads) {
  const need = { ...SHAPE };
  for (const pid of squadOf(uid, squads)) need[P(pid).pos]--;
  return need;
}
function maxBidOf(uid, squads = room.squads, budgets = room.budgets) {   // keep €1m for every other empty slot
  return (budgets?.[uid] ?? 0) - Math.max(0, SQUAD - squadOf(uid, squads).length - 1);
}
const poolIds = () => Object.keys(DB).filter(id => room.pool === "stars" ? DB[id].r >= 85 : room.pool === "mixed" || id[0] === (room.pool === "legends" ? "l" : "c"));
const startPrice = r => Math.max(1, Math.round((r - 72) * 1.1));

function startAuction() {   // host
  const ids = Object.keys(room.players || {});
  if (ids.length < 2) return alert("You need at least 2 managers");
  const budgets = Object.fromEntries(ids.map(id => [id, room.budget]));
  const base = { state: "auction", rid: newId(), seed: newId(), managers: ids, budgets,
    squads: null, unsold: null, log: null, teams: null, fa: null, step: 0, tactics: null };
  room = { ...room, ...base };   // so nextLot sees the new state
  update(roomRef(), { ...base, lot: nextLot(1, {}, budgets, {}) }).catch(fail);
}

function nextLot(n, squads, budgets, unsold) {
  const taken = new Set([...Object.values(squads || {}).flatMap(s => Object.keys(s)), ...Object.keys(unsold || {})]);
  const afford = {};   // the most anyone who still needs that position could pay
  for (const uid of room.managers) {
    if (!room.players[uid]) continue;
    const need = needsOf(uid, squads), max = maxBidOf(uid, squads, budgets);
    for (const pos in need) if (need[pos] > 0) afford[pos] = Math.max(afford[pos] || 0, max);
  }
  const cands = poolIds().filter(id => !taken.has(id) && afford[DB[id].pos] >= startPrice(DB[id].r))
    .sort((a, b) => DB[b].r - DB[a].r);
  if (!cands.length) return null;
  const top = cands.slice(0, Math.max(1, Math.ceil(cands.length / 4)));   // stars come up more often
  const mystery = n > 2 && Math.random() < 0.12;   // 🎁 a hidden player: could be a legend, could be a flop
  const pid = pick(mystery ? cands : Math.random() < 0.55 ? top : cands);
  const lot = { n, pid, price: mystery ? 1 : startPrice(DB[pid].r), ends: serverNow() + (n === 1 ? FIRST_LOT_MS : LOT_MS), closed: false };
  if (mystery) lot.mystery = true;
  return lot;
}

function bidIncs(lot) { return lot.leader ? [1, 5, 10, 25] : [0, 5, 10, 25]; }
function whyNot(lot, inc) {   // why I can't bid right now ("" = I can)
  if (!room.managers?.includes(me)) return "You're watching this game.";
  if (lot.closed || lot.ends <= serverNow()) return " ";
  if (lot.leader === me) return "You're the highest bidder 💪";
  if (squadOf(me).length >= SQUAD) return "Your squad is complete ✅ Watch the others fight it out.";
  if (needsOf(me)[P(lot.pid).pos] <= 0) return `Your ${P(lot.pid).pos} spots are full.`;
  if (lot.price + inc > maxBidOf(me)) return `Your max bid is ${money(maxBidOf(me))} (you need €1m for each empty spot).`;
  return "";
}

async function bid(i) {
  const n = room.lot?.n;
  if (!n) return;
  try {
    const res = await runTransaction(roomRef("lot"), lot => {
      if (!lot || lot.n !== n || lot.closed || lot.leader === me) return;
      const now = serverNow();
      if (now > lot.ends - 150) return;
      const price = lot.price + bidIncs(lot)[i];
      if (price > maxBidOf(me) || needsOf(me)[P(lot.pid).pos] <= 0) return;
      return { ...lot, price, leader: me, ends: Math.max(lot.ends, now + BID_MS) };
    });
    if (!res.committed) flashWhy("Too slow, someone else bid first!");
  } catch { flashWhy("Bid didn't go through, try again"); }
}
function flashWhy(t) { $("#why").textContent = t; }
async function timeOut() {   // once per auction: +8 seconds on a lot you're not winning
  const n = room.lot?.n;
  if (!n || powUsed("time") || room.lot.leader === me || room.lot.closed) return;
  try {
    const res = await runTransaction(roomRef("lot"), lot => {
      if (!lot || lot.n !== n || lot.closed || lot.ext) return;
      return { ...lot, ends: Math.max(lot.ends, serverNow()) + 8000 * F, ext: room.players[me]?.name || "Someone" };
    });
    if (res.committed) { usePow("time"); SFX.pop(); } else flashWhy("Someone already called a time-out on this player");
  } catch { flashWhy("Time-out didn't go through"); }
}

function closeLot(n, retry) {   // host: lock the lot so no more bids get in
  runTransaction(roomRef("lot"), lot => {
    if (!lot || lot.n !== n || lot.closed) return;
    return { ...lot, closed: true };
  }).catch(retry);
}

function advanceLot() {   // host: hand the player to the winner, then bring out the next one
  const lot = room.lot;
  const squads = structuredClone(room.squads || {}), budgets = { ...room.budgets }, unsold = { ...(room.unsold || {}) };
  const u = {};
  const ok = lot.leader && room.players[lot.leader] && lot.price <= maxBidOf(lot.leader, squads, budgets)
    && needsOf(lot.leader, squads)[P(lot.pid).pos] > 0;
  if (ok) {
    (squads[lot.leader] ||= {})[lot.pid] = lot.price;
    budgets[lot.leader] -= lot.price;
    u[`squads/${lot.leader}/${lot.pid}`] = lot.price;
    u[`budgets/${lot.leader}`] = budgets[lot.leader];
    u[`log/${lot.n}`] = { pid: lot.pid, to: lot.leader, price: lot.price };
  } else {
    unsold[lot.pid] = true;
    u[`unsold/${lot.pid}`] = true;
    u[`log/${lot.n}`] = { pid: lot.pid, to: "", price: 0 };
  }
  const next = nextLot(lot.n + 1, squads, budgets, unsold);
  if (next) u.lot = next; else Object.assign(u, finishAuction(squads));
  update(roomRef(), u).catch(fail);
}

function finishAuction(squads) {   // host: fill empty spots, create the AI clubs, freeze the teams
  const taken = new Set(Object.values(squads).flatMap(s => Object.keys(s)));
  const free = poolIds().filter(id => !taken.has(id)).sort((a, b) => DB[b].r - DB[a].r);
  const fa = {}; let faN = 0;
  const take = pos => {
    const i = free.findIndex(id => DB[id].pos === pos);
    if (i >= 0) return free.splice(i, 1)[0];
    const id = `fa${faN++}`;
    fa[id] = { name: `${pick(FA_FIRST)} ${pick(FA_LAST)}`, pos, r: 58 + Math.floor(Math.random() * 8), cc: "ID" };
    return id;
  };
  const teams = {};
  const humans = room.managers.filter(uid => room.players[uid]);
  for (const uid of humans) {
    const ids = squadOf(uid, squads), need = needsOf(uid, squads);
    for (const pos in need) for (let k = 0; k < need[pos]; k++) ids.push(take(pos));   // free transfers
    teams[uid] = { name: room.players[uid].club, mgr: room.players[uid].name, human: true, squad: ids };
  }
  // AI clubs are built to be about as good as the humans: a spread from a bit stronger to a bit weaker.
  const rOf = id => (DB[id] || fa[id]).r;
  const humanOvr = humans.map(uid => teams[uid].squad.reduce((a, id) => a + rOf(id), 0) / SQUAD);
  const target = humanOvr.reduce((a, b) => a + b, 0) / Math.max(1, humanOvr.length) - 0.5;
  const aiNames = shuffle(AI_NAMES).slice(0, Math.max(0, TEAMS - humans.length));
  const aiSquads = aiNames.map(() => []);
  // The legends pool is small, so in Legends mode AI clubs may also sign current stars.
  if (room.pool === "legends") free.push(...Object.keys(DB).filter(id => id[0] === "c"));
  if (room.pool === "stars") free.push(...Object.keys(DB).filter(id => DB[id].r < 85).sort((a, b) => DB[b].r - DB[a].r));
  const takeNear = (pos, t) => {
    const opts = free.filter(id => DB[id].pos === pos).sort((a, b) => Math.abs(DB[a].r - t) - Math.abs(DB[b].r - t)).slice(0, 3);
    if (!opts.length) return take(pos);
    const id = pick(opts); free.splice(free.indexOf(id), 1); return id;
  };
  for (const pos of ["GK", "DEF", "MID", "FWD"])
    for (let k = 0; k < SHAPE[pos]; k++)
      aiSquads.forEach((s, i) => s.push(takeNear(pos, target + 3 - (6 * i) / Math.max(1, aiSquads.length - 1))));
  aiNames.forEach((name, i) => { teams["ai" + i] = { name, mgr: "AI", human: false, squad: aiSquads[i] }; });
  return { state: "season", lot: null, teams, fa, step: 0, tactics: null };
}

function renderAuction() {
  const lot = room.lot;
  if (!lot) return;
  const p = P(lot.pid);
  const prev = seenLot;
  seenLot = { n: lot.n, leader: lot.leader, closed: lot.closed };
  if (prev && prev.n === lot.n) {
    if (prev.leader === me && lot.leader && lot.leader !== me && !lot.closed) { toast("😱 You've been outbid!"); buzz(200); }
    if (!prev.closed && lot.closed && lot.leader === me) { toast(`🎉 You signed ${p.name}!`); buzz([80, 40, 80]); }
  }
  const hide = lot.mystery && !lot.closed && !(scoutOn === lot.n);
  if (prev && prev.n === lot.n) {
    if (prev.leader !== lot.leader && lot.leader && !lot.closed) { SFX.bid(); const pr = $("#lprice"); pr.classList.remove("bump"); void pr.offsetWidth; pr.classList.add("bump"); }
    if (prev.leader === me && lot.leader && lot.leader !== me && !lot.closed) SFX.outbid();
    if (!prev.closed && lot.closed) {
      if (lot.leader) { SFX.sold(); stamp("SOLD!", tier(p.r)); if (p.r >= 88) { document.body.classList.remove("shake"); void document.body.offsetWidth; document.body.classList.add("shake"); } }
      else { SFX.unsold(); stamp("UNSOLD", "un"); }
      if (lot.mystery) { setTimeout(SFX.reveal, 300); stamp(`🎁 It was ${p.name} (${p.r})!`, "rev"); }
    }
  }
  if (prev?.n !== lot.n) document.querySelectorAll("#lotcard .stamp").forEach(x => x.remove());
  if (prev?.n !== lot.n && lot.mystery) toast("🎁 MYSTERY PLAYER! Only the position is known…");
  if (prev?.n === lot.n && !prev.ext && lot.ext) toast(`⏰ ${lot.ext} called a TIME-OUT! +8 seconds`);
  $("#lotcard").className = "card lot " + (hide ? "mystery" : tier(p.r));
  $("#lotno").textContent = `Player #${lot.n}`;
  $("#poolinfo").textContent = POOLS[room.pool];
  $("#lrating").textContent = hide ? "?" : p.r;
  $("#lname").textContent = hide ? "🎁 Mystery player" : p.name;
  $("#lpos").textContent = p.pos; $("#lpos").className = "pos " + p.pos;
  $("#lflag").textContent = hide ? "❓" : flag(p.cc);
  $("#ptime").disabled = powUsed("time") || !room.managers?.includes(me) || lot.closed || lot.leader === me || !!lot.ext;
  $("#pscout").disabled = powUsed("scout") || !lot.mystery || lot.closed || scoutOn === lot.n;
  $("#ptime").textContent = powUsed("time") ? "⏰ Time-out used" : "⏰ Time-out (+8s)";
  $("#pscout").textContent = powUsed("scout") ? "🕵️ Scout used" : lot.mystery ? "🕵️ Scout the mystery" : "🕵️ Scout (mystery only)";
  $("#lprice").textContent = money(lot.price);
  $("#lleader").textContent = lot.leader ? `Highest bid: ${mgrLabel(lot.leader)}` : "No bids yet. First bid gets him at the start price";

  const isMgr = room.managers?.includes(me);
  $("#mybudget").textContent = isMgr ? `Budget: ${money(room.budgets?.[me] ?? 0)}` : "You're watching";
  $("#mymax").textContent = isMgr ? `Max bid ${money(maxBidOf(me))}` : "";
  const need = needsOf(me);
  $("#myneeds").replaceChildren(...(isMgr ? Object.keys(SHAPE).map(pos => {
    const s = el("span", null, "small"); s.append(posBadge(pos), ` ${SHAPE[pos] - need[pos]}/${SHAPE[pos]}`); return s;
  }) : []));
  $("#mypitch").replaceChildren(pitch(squadOf(me)));
  $("#mgrs").replaceChildren(...(room.managers || []).map(uid => {
    const li = el("li");
    li.append(el("span", `${room.players[uid]?.name || "?"}: ${room.players[uid]?.club || ""}`),
      el("span", `${money(room.budgets?.[uid] ?? 0)} · ${squadOf(uid).length}/${SQUAD}`, "muted small"));
    return li;
  }));
  const log = Object.values(room.log || {}).filter(Boolean).reverse().slice(0, 6);
  $("#deals").replaceChildren(...(log.length ? log.map(d => {
    const li = el("li");
    li.append(el("span", `${P(d.pid).name}`), el("span", d.to ? `${room.players[d.to]?.club || "?"} · ${money(d.price)}` : "unsold", "muted small"));
    return li;
  }) : [el("li", "No deals yet", "muted")]));
  $("#why").textContent = "";
}

// Runs 5× a second: countdown, bid buttons and (on the host) closing lots.
function tick() {
  if (!room) return;
  if (room.state === "auction" && room.lot) {
    const lot = room.lot, left = lot.ends - serverNow();
    const total = lot.n === 1 ? FIRST_LOT_MS : LOT_MS;
    $("#timer div").style.width = `${Math.max(0, Math.min(100, 100 * left / total))}%`;
    $("#timer").classList.toggle("warn", left < 4000);
    const st = $("#status");
    st.className = "";
    if (lot.closed) {
      st.textContent = lot.leader ? `🔨 SOLD to ${room.players[lot.leader]?.club || "?"} for ${money(lot.price)}!` : "Unsold, nobody wanted him";
      st.className = lot.leader ? "sold" : "unsold";
    } else if (left <= 0) st.textContent = "Closing…";
    else st.textContent = left < 2000 ? "GOING TWICE…" : left < 4000 ? "GOING ONCE…" : `${Math.ceil(left / 1000)}s`;
    if (!lot.closed && left < 4000 && left > 0) st.className = "going";
    const incs = bidIncs(lot);
    const sec = Math.ceil(left / 1000);
    if (!lot.closed && left > 0 && left < 4000 && sec !== lastSec) { lastSec = sec; sec <= 1 ? SFX.beat() : SFX.tick(); }
    $("#lotcard").classList.toggle("heart", !lot.closed && left > 0 && left < 3000);
    ["#b0", "#b1", "#b2", "#b3"].forEach((s, i) => {
      const b = $(s);
      b.textContent = (i === 3 ? "💣 " : "") + (lot.leader || i === 3 ? `+${incs[i]} → ` : "") + money(lot.price + incs[i]);
      b.disabled = !!whyNot(lot, incs[i]);
    });
    const reason = whyNot(lot, incs[0]);
    if (reason && reason !== " " && !$("#why").textContent.startsWith("Too slow")) $("#why").textContent = reason;
    if (!reason && $("#why").textContent && !$("#why").textContent.startsWith("Too slow")) $("#why").textContent = "";

    if (me === room.host) {
      if (!lot.closed && left < -300 * F) once(`close${lot.n}`, retry => closeLot(lot.n, retry));
      if (lot.closed && !room.log?.[lot.n] && left < -2800 * F) once(`adv${lot.n}`, () => advanceLot());
    }
  }
}
setInterval(tick, 200);

// ---------- SEASON ----------
function teamList() {
  const t = room.teams || {};
  const humans = Object.keys(t).filter(id => t[id].human).sort();
  const ai = Object.keys(t).filter(id => !t[id].human).sort();
  return [...humans, ...ai].map(id => ({ id, ...t[id] }));
}
function strength(team) {
  const lines = {};
  for (const pos in SHAPE) {
    const rs = team.squad.map(P).filter(p => p.pos === pos).map(p => p.r);
    lines[pos] = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 55;
  }
  return {
    att: 0.55 * lines.FWD + 0.3 * lines.MID + 0.15 * lines.DEF,
    def: 0.5 * lines.DEF + 0.3 * lines.GK + 0.2 * lines.MID,
    ovr: Math.round(team.squad.map(P).reduce((a, p) => a + p.r, 0) / team.squad.length)
  };
}
function fixtures(ids) {   // round robin (circle method), then the reverse fixtures
  const n = ids.length, arr = [...ids], rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const m = [];
    for (let i = 0; i < n / 2; i++) { const a = arr[i], b = arr[n - 1 - i]; m.push(r % 2 ? [b, a] : [a, b]); }
    rounds.push(m);
    arr.splice(1, 0, arr.pop());
  }
  return [...rounds, ...rounds.map(m => m.map(([a, b]) => [b, a]))];
}
function scorer(team, rng) {
  const w = { FWD: 6, MID: 3, DEF: 1, GK: 0 };
  const opts = team.squad.map(id => [id, w[P(id).pos] * Math.max(1, P(id).r - 50)]);
  let x = rng() * opts.reduce((a, [, v]) => a + v, 0);
  for (const [id, v] of opts) { x -= v; if (x <= 0) return id; }
  return opts[0][0];
}
function simMatch(h, a, key, th, ta, neutral) {
  const rng = rngFor(room.seed + key);
  const sh = strength(h), sa = strength(a);
  const lh = 1.35 * Math.exp((sh.att - sa.def) / 9) * (neutral ? 1 : 1.1) * TACTIC[th][0] * TACTIC[ta][1];
  const la = 1.35 * Math.exp((sa.att - sh.def) / 9) * TACTIC[ta][0] * TACTIC[th][1];
  const hg = Math.min(7, poisson(lh, rng)), ag = Math.min(7, poisson(la, rng));
  const ev = [];
  for (let i = 0; i < hg; i++) ev.push({ m: 1 + Math.floor(rng() * 90), side: "h", pid: scorer(h, rng) });
  for (let i = 0; i < ag; i++) ev.push({ m: 1 + Math.floor(rng() * 90), side: "a", pid: scorer(a, rng) });
  ev.sort((x, y) => x.m - y.m);
  let pens = null;
  if (neutral && hg === ag) {
    let ph = 0, pa = 0;
    for (let i = 0; i < 5; i++) { ph += rng() < 0.75; pa += rng() < 0.75; }
    while (ph === pa) { ph += rng() < 0.75; pa += rng() < 0.75; }
    pens = [ph, pa];
  }
  return { h: h.id, a: a.id, hg, ag, ev, pens };
}
const winnerOf = m => m.hg > m.ag ? m.h : m.hg < m.ag ? m.a : (m.pens[0] > m.pens[1] ? m.h : m.a);
const sortTable = rows => rows.sort((x, y) => y.Pts - x.Pts || (y.GF - y.GA) - (x.GF - x.GA) || y.GF - x.GF || x.id.localeCompare(y.id));

function season() {
  const key = `${room.seed}|${room.step}|${JSON.stringify(room.tactics || {})}`;
  if (cache.key === key) return cache.val;
  const teams = teamList(), byId = Object.fromEntries(teams.map(t => [t.id, t]));
  const fx = fixtures(teams.map(t => t.id));
  const table = Object.fromEntries(teams.map(t => [t.id, { id: t.id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 }]));
  const goals = {}, steps = [], hist = {};
  const tac = (k, id) => room.tactics?.[k]?.[id] || "balanced";
  const count = m => m.ev.forEach(e => { goals[e.pid] = goals[e.pid] || { n: 0, team: e.side === "h" ? m.h : m.a }; goals[e.pid].n++; });
  for (let k = 1; k <= Math.min(room.step, LEAGUE_DAYS); k++) {
    const ms = fx[k - 1].map(([h, a]) => simMatch(byId[h], byId[a], `L${k}${h}${a}`, tac(k, h), tac(k, a), false));
    for (const m of ms) {
      const H = table[m.h], A = table[m.a];
      H.P++; A.P++; H.GF += m.hg; H.GA += m.ag; A.GF += m.ag; A.GA += m.hg;
      if (m.hg > m.ag) { H.W++; A.L++; H.Pts += 3; } else if (m.hg < m.ag) { A.W++; H.L++; A.Pts += 3; } else { H.D++; A.D++; H.Pts++; A.Pts++; }
      count(m);
    }
    steps.push(ms);
    sortTable(Object.values(table).map(r => ({ ...r }))).forEach((r, i) => (hist[r.id] ||= []).push(i + 1));
  }
  const rows = sortTable(Object.values(table));
  let semis = null, final = null;
  if (room.step > LEAGUE_DAYS) {
    const t4 = rows.slice(0, 4).map(r => r.id);
    semis = [[t4[0], t4[3]], [t4[1], t4[2]]].map(([h, a]) => simMatch(byId[h], byId[a], `S${h}${a}`, tac(15, h), tac(15, a), true));
    semis.forEach(count); steps.push(semis);
  }
  if (room.step > LEAGUE_DAYS + 1) {
    const [h, a] = semis.map(winnerOf);
    final = simMatch(byId[h], byId[a], `F${h}${a}`, tac(16, h), tac(16, a), true);
    count(final); steps.push([final]);
  }
  const val = { teams, byId, fx, rows, goals, steps, semis, final, hist };
  cache = { key, val };
  return val;
}

function stepTitle(k) {
  if (k === 0) return "Pre-season";
  if (k <= LEAGUE_DAYS) return `Matchday ${k} of ${LEAGUE_DAYS}`;
  return k === LEAGUE_DAYS + 1 ? "🏆 Cup semi-finals" : "🏆 Cup final";
}
function matchBox(m, S) {
  const box = el("div", null, "match");
  const row = el("div", null, "score");
  const g = m.pens ? `${m.hg}–${m.ag} (${m.pens[0]}–${m.pens[1]} p)` : `${m.hg}–${m.ag}`;
  const hn = el("span", S.byId[m.h].name, "t"), an = el("span", S.byId[m.a].name, "t");
  if (m.h === me) hn.style.color = "var(--gold)";
  if (m.a === me) an.style.color = "var(--gold)";
  row.append(hn, el("span", g, "g"), an);
  box.append(row);
  if (m.ev.length) box.append(el("div", m.ev.map(e => `${e.m}' ${short(P(e.pid).name)} (${S.byId[e.side === "h" ? m.h : m.a].name})`).join(" · "), "goals"));
  return box;
}
function myNextMatch(S) {
  const k = room.step + 1, t = room.teams?.[me];
  if (!t) return null;
  if (k <= LEAGUE_DAYS) {
    const f = S.fx[k - 1].find(([h, a]) => h === me || a === me);
    if (!f) return null;
    const opp = S.byId[f[0] === me ? f[1] : f[0]];
    return `Next: ${f[0] === me ? "🏠 home" : "✈️ away"} vs ${opp.name} (${strength(opp).ovr})`;
  }
  if (k === LEAGUE_DAYS + 1) {
    const t4 = S.rows.slice(0, 4).map(r => r.id), i = t4.indexOf(me);
    return i < 0 ? "You didn't make the cup (top 4 only)" : `🏆 Cup semi-final vs ${S.byId[t4[3 - i]].name} (${strength(S.byId[t4[3 - i]]).ovr})`;
  }
  if (k === LEAGUE_DAYS + 2 && S.semis) {
    const w = S.semis.map(winnerOf), i = w.indexOf(me);
    return i < 0 ? "You're out of the cup" : `🏆 CUP FINAL vs ${S.byId[w[1 - i]].name} (${strength(S.byId[w[1 - i]]).ovr})`;
  }
  return null;
}

// Commentary: the same on every phone, built from the match seed.
function commentary(m, S) {
  const rng = rngFor(room.seed + "c" + m.h + m.a + m.hg + m.ag), H = S.byId[m.h], A = S.byId[m.a];
  const by = (t, pos) => { const o = t.squad.filter(id => P(id).pos === pos); return short(P(o.length ? o[Math.floor(rng() * o.length)] : t.squad[0]).name); };
  const lines = [{ m: 0, t: `🟢 Kick-off! ${H.name} vs ${A.name}.` }];
  const GOAL = ["smashes it into the top corner!", "taps it in from close range!", "curls a beauty past the keeper!", "heads it home!", "scores with a stunning volley!", "slots it under the keeper!", "finishes a brilliant team move!"];
  const MISS = [(a, d, g) => `😱 ${a} hits the post!`, (a, d, g) => `🧤 What a save by ${g} to deny ${a}!`, (a, d, g) => `🟨 Yellow card for ${d}, a cynical foul.`, (a, d, g) => `💨 ${a} skips past two defenders… shot blocked by ${d}!`, (a, d, g) => `📐 Corner. Header from ${d}… just wide!`, (a, d, g) => `🙈 ${a} blazes it over the bar.`];
  const n = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < n; i++) { const att = rng() < .5 ? H : A, def = att === H ? A : H; lines.push({ m: 3 + Math.floor(rng() * 86), t: pick2(MISS, rng)(by(att, rng() < .6 ? "FWD" : "MID"), by(def, "DEF"), by(def, "GK")) }); }
  for (const e of m.ev) lines.push({ m: e.m, goal: e.side, t: `⚽ GOAL! ${short(P(e.pid).name)} ${pick2(GOAL, rng)} (${S.byId[e.side === "h" ? m.h : m.a].name})` });
  lines.push({ m: 45, t: "⏸️ Half-time." });
  return lines.sort((a, b) => a.m - b.m || (a.goal ? 1 : 0) - (b.goal ? 1 : 0));
}
const pick2 = (a, rng) => a[Math.floor(rng() * a.length)];
function raceChart(S) {
  const box = $("#race"); if (!box) return;
  const ids = Object.keys(S.hist || {}), n = S.teams.length, days = (S.hist[ids[0]] || []).length;
  box.hidden = days < 2; if (days < 2) return;
  const W = 320, Hh = 150, x = i => 20 + (W - 30) * i / Math.max(1, LEAGUE_DAYS - 1), y = r => 10 + (Hh - 20) * (r - 1) / (n - 1);
  const humans = S.teams.filter(t => t.human).map(t => t.id), cols = ["#facc15", "#4ade80", "#60a5fa", "#f472b6", "#fb923c", "#a78bfa", "#2dd4bf", "#f87171"];
  let svg = `<svg viewBox="0 0 ${W} ${Hh}" class="racesvg">`;
  for (let r = 1; r <= n; r++) svg += `<text x="4" y="${y(r) + 3}" class="rk">${r}</text>`;
  S.teams.forEach(t => { if (!humans.includes(t.id)) svg += `<polyline fill="none" stroke="#444" stroke-width="1" points="${S.hist[t.id].map((r, i) => `${x(i)},${y(r)}`).join(" ")}"/>`; });
  humans.forEach((id, k) => { const c = cols[k % cols.length], pts = S.hist[id]; svg += `<polyline fill="none" stroke="${c}" stroke-width="${id === me ? 3.5 : 2}" points="${pts.map((r, i) => `${x(i)},${y(r)}`).join(" ")}"/><circle cx="${x(pts.length - 1)}" cy="${y(pts[pts.length - 1])}" r="4" fill="${c}"/>`; });
  svg += `</svg>`;
  box.innerHTML = `<h3>📈 Title race</h3>${svg}<div class="legend">${humans.map((id, k) => `<span style="color:${cols[k % cols.length]}">● ${S.byId[id].name.replace(/[<>&]/g, "")}</span>`).join(" ")}</div>`;
}
function boardMood(S) {
  const box = $("#board"); if (!box) return;
  const i = S.rows.findIndex(r => r.id === me); if (i < 0 || room.step < 3 || room.step > LEAGUE_DAYS) { box.hidden = true; return; }
  const byOvr = [...S.teams].sort((a, b) => strength(b).ovr - strength(a).ovr).findIndex(t => t.id === me);
  const diff = i - byOvr;   // places worse than your squad deserves
  const [e, t] = i === 0 ? ["🤩", "The board loves you. Top of the league!"] : diff <= -2 ? ["😁", "Way above expectations. The fans are singing your name."]
    : diff <= 0 ? ["🙂", "The board is happy."] : diff <= 2 ? ["😬", "The board is getting nervous…"] : ["🔥", "SACK RACE! The board wants results NOW."];
  box.hidden = false; box.replaceChildren(el("span", e, "e"), el("span", "Board confidence: " + t));
}
function playLive(m, S) {   // a quick minute-by-minute replay of one match
  clearInterval(liveTimer);
  $("#live").hidden = false;
  $("#tablecard").classList.add("dim");
  $("#scorers").classList.add("dim");
  $("#lastresults").hidden = true;   // no spoilers until full time
  const start = Date.now(), D = 9000 * F, mine = m.h === me ? "h" : m.a === me ? "a" : null;
  let shown = 0, said = 0;
  const lines = commentary(m, S);
  $("#livefeed").replaceChildren();
  const draw = () => {
    const min = Math.min(90, Math.floor((Date.now() - start) / D * 90));
    const evs = m.ev.filter(e => e.m <= min);
    const hg = evs.filter(e => e.side === "h").length, ag = evs.length - hg;
    while (said < lines.length && lines[said].m <= min) { const L = lines[said++]; const li = el("li", `${L.m}' ${L.t}`, L.goal ? "gl" : ""); $("#livefeed").prepend(li); }
    if (evs.length > shown) {
      const e = evs[evs.length - 1]; shown = evs.length; SFX.goal();
      $("#live").classList.remove("goal"); void $("#live").offsetWidth; $("#live").classList.add("goal");
      if (mine) buzz(e.side === mine ? [60, 30, 60] : 150);
    }
    $("#livemin").textContent = min >= 90 ? "FULL TIME" : `🔴 LIVE ${min}'`;
    $("#livescore").replaceChildren(el("span", S.byId[m.h].name, "t"), el("span", `${hg}–${ag}`, "g"), el("span", S.byId[m.a].name, "t"));
    $("#livegoals").textContent = evs.map(e => `⚽ ${e.m}' ${short(P(e.pid).name)}`).join("  ");
    if (min >= 90) {
      clearInterval(liveTimer); SFX.whistle();
      $("#livefeed").prepend(el("li", "🏁 Full time!"));
      $("#tablecard").classList.remove("dim");
      $("#scorers").classList.remove("dim");
      $("#lastresults").hidden = false;
      let verdict = "";
      if (m.pens) verdict = `Penalties: ${m.pens[0]}–${m.pens[1]}. `;
      if (mine) {
        const w = m.pens || m.hg !== m.ag ? winnerOf(m) : null;
        verdict += !w && !m.pens ? "🤝 DRAW" : (w === me ? "✅ WIN!" : "❌ LOSS");
      }
      $("#liveverdict").textContent = verdict;
    } else $("#liveverdict").textContent = "";
  };
  draw();
  liveTimer = setInterval(draw, 80);
}

function renderSeason(isHost) {
  const S = season();
  const k = room.step;
  $("#mdtitle").textContent = stepTitle(k);
  const last = S.steps[S.steps.length - 1];
  if (shownStep === null || k < shownStep) { shownStep = k; $("#live").hidden = true; }
  else if (k !== shownStep) {
    shownStep = k;
    const mm = last && (last.find(m => m.h === me || m.a === me) || last[0]);
    if (mm) playLive(mm, S);
  }
  $("#lastresults").replaceChildren(...(last ? [el("h3", "Results"), ...last.map(m => matchBox(m, S))]
    : [el("p", "The auction is over! Pick your tactic for the first match, then the host kicks off.", "muted")]));

  const next = myNextMatch(S);
  const playing = next && !next.startsWith("You");
  $("#nextcard").hidden = !next;
  $("#nextmatch").textContent = next || "";
  $("#tactics").hidden = !playing;
  const mine = room.players?.[me]?.tactic || "balanced";
  document.querySelectorAll("[data-tactic]").forEach(b => b.classList.toggle("on", b.dataset.tactic === mine));
  $("#tacticnote").textContent = !playing ? "" : { attack: "More goals for you, but you leave gaps at the back.",
    balanced: "No risks.", defend: "Fewer goals against you, but fewer for you too." }[mine];

  $("#advance").textContent = k < LEAGUE_DAYS ? `▶ Play matchday ${k + 1}` : k === LEAGUE_DAYS ? "▶ Play cup semi-finals"
    : k === LEAGUE_DAYS + 1 ? "▶ Play the cup final" : "🏆 See the awards";

  $("#table").replaceChildren(tableHead(), ...S.rows.map((r, i) => tableRow(r, i, S)));
  raceChart(S); boardMood(S);
  const top = Object.entries(S.goals).sort((a, b) => b[1].n - a[1].n).slice(0, 8);
  $("#scorers").replaceChildren(...(top.length ? top.map(([pid, g]) => {
    const li = el("li"); li.append(el("span", `${P(pid).name} (${S.byId[g.team].name})`), el("b", `${g.n} ⚽`)); return li;
  }) : [el("li", "No goals yet", "muted")]));
  $("#seasonpitch").replaceChildren(...(room.teams?.[me] ? [pitch(room.teams[me].squad)] : [el("p", "You're watching this season.", "muted")]));
  if (!isHost) $("#hostwait").textContent = k >= LEAGUE_DAYS + 2 ? "Waiting for the host to open the awards…" : "The host plays each matchday.";
}
function tableHead() {
  const tr = el("tr");
  ["#", "Club", "P", "W", "D", "L", "GD", "Pts"].forEach(h => tr.append(el("th", h)));
  return tr;
}
function tableRow(r, i, S) {
  const tr = el("tr", null, r.id === me ? "me" : "");
  const t = S.byId[r.id];
  [i + 1, `${t.human ? "" : "🤖 "}${t.name} (${strength(t).ovr})`, r.P, r.W, r.D, r.L, r.GF - r.GA, r.Pts].forEach(v => tr.append(el("td", v)));
  return tr;
}

function advanceSeason() {   // host
  const next = room.step + 1;
  if (next > LEAGUE_DAYS + 2) return update(roomRef(), { state: "end" }).catch(fail);
  const t = {};
  for (const uid of Object.keys(room.teams || {})) if (room.teams[uid].human) t[uid] = room.players?.[uid]?.tactic || "balanced";
  once(`step${next}`, () => update(roomRef(), { step: next, [`tactics/${next}`]: t }).catch(fail));
}

// ---------- END ----------
function renderEnd() {
  const S = season();
  const champ = S.byId[S.rows[0].id], spoon = S.byId[S.rows[S.rows.length - 1].id];
  const cup = S.final ? S.byId[winnerOf(S.final)] : null;
  const boot = Object.entries(S.goals).sort((a, b) => b[1].n - a[1].n)[0];
  const buys = [];
  for (const uid in room.squads || {}) for (const [pid, price] of Object.entries(room.squads[uid])) if (price > 0) buys.push({ uid, pid, price });
  const value = [...buys].sort((a, b) => (P(b.pid).r - 70) / b.price - (P(a.pid).r - 70) / a.price || P(b.pid).r - P(a.pid).r)[0];
  const pricey = [...buys].sort((a, b) => b.price - a.price)[0];
  const who = t => t.human ? `${t.name} (${t.mgr})` : `${t.name} 🤖`;
  const awards = [
    ["🏆", "League champions", who(champ)],
    ["🥇", "Cup winners", cup ? who(cup) : "-"],
    ["👟", "Golden Boot", boot ? `${P(boot[0]).name}, ${boot[1].n} goals (${S.byId[boot[1].team].name})` : "-"],
    ["💎", "Bargain of the season", value ? `${P(value.pid).name} for ${money(value.price)} (${room.teams[value.uid]?.name})` : "-"],
    ["💸", "Most expensive signing", pricey ? `${P(pricey.pid).name} for ${money(pricey.price)} (${room.teams[pricey.uid]?.name})` : "-"],
    ["🥄", "Wooden spoon", who(spoon)],
  ];
  const myRow = S.rows.findIndex(r => r.id === me);
  if (myRow >= 0) {
    const mine = Object.entries(S.goals).filter(([, g]) => g.team === me).sort((a, b) => b[1].n - a[1].n)[0];
    const r = S.rows[myRow], pos = myRow + 1;
    awards.unshift(["⭐", "Your season", `${pos}${["st", "nd", "rd"][pos - 1] || "th"} place · ${r.Pts} pts · ${r.W}W ${r.D}D ${r.L}L`
      + (mine ? ` · top scorer ${short(P(mine[0]).name)} (${mine[1].n})` : "")]);
  }
  $("#awards").replaceChildren(...awards.map(([e, t, v]) => {
    const c = el("div", null, "card award"), txt = el("div");
    txt.append(el("div", t, "muted small"), el("b", v));
    c.append(el("span", e, "e"), txt);
    return c;
  }));
  $("#ftable").replaceChildren(tableHead(), ...S.rows.map((r, i) => tableRow(r, i, S)));
  if (hallSaved !== room.rid) {
    hallSaved = room.rid;
    const h = load("twHall", "[]"); if (!h.some(x => x.rid === room.rid)) { h.unshift({ rid: room.rid, d: new Date().toLocaleDateString(), champ: who(champ), cup: cup ? who(cup) : "-" }); save("twHall", h.slice(0, 20)); }
    SFX.reveal();
  }
  $("#sharewin").onclick = () => {
    const text = `⚽💰 Transfer War season results\n` + awards.map(([e, t, v]) => `${e} ${t}: ${v}`).join("\n");
    if (navigator.share) navigator.share({ text: text + "\n\nPlay: " + location.origin + location.pathname }).catch(() => {});
    else { navigator.clipboard?.writeText(text).catch(() => {}); toast("Copied! Paste it in your group chat."); }
  };
}
function drawHall() {
  const h = load("twHall", "[]"), box = $("#hall"); if (!box) return;
  box.hidden = !h.length;
  $("#halllist").replaceChildren(...h.slice(0, 6).map(x => el("li", `${x.d}: 🏆 ${x.champ} · 🥇 ${x.cup}`)));
}
drawHall();

function toLobby() {   // host
  update(roomRef(), { state: "lobby", rid: newId(), lot: null, squads: null, budgets: null, unsold: null, log: null,
    teams: null, fa: null, step: null, tactics: null, managers: null }).catch(fail);
}

// ---------- buttons ----------
$("#create").addEventListener("click", createRoom);
$("#join").addEventListener("click", joinRoom);
$("#start").addEventListener("click", startAuction);
$("#share").addEventListener("click", () => {
  const url = `${location.origin}${location.pathname}?r=${code}`;
  if (navigator.share) navigator.share({ text: `Join my Transfer War! Code: ${code}`, url }).catch(() => {});
  else window.prompt("Copy this link:", url);
});
["#b0", "#b1", "#b2", "#b3"].forEach((s, i) => $(s).addEventListener("click", () => { ac(); bid(i); }));
$("#ptime").addEventListener("click", timeOut);
$("#pscout").addEventListener("click", () => {
  if (!room?.lot?.mystery || powUsed("scout")) return;
  usePow("scout"); scoutOn = room.lot.n; const p = P(room.lot.pid);
  toast(`🕵️ Your scout says: ${p.name}, rated ${p.r}. Only you know.`); render();
});
document.querySelectorAll(".emotes").forEach(box => {
  box.replaceChildren(...EMOTES.map(e => { const b = el("button", e, "alt emo"); b.dataset.emo = e; return b; }));
  box.addEventListener("click", ev => {
    const e = ev.target.closest("button")?.dataset.emo; if (!e || !room) return;
    if (Date.now() - (box._t || 0) < 1500) return; box._t = Date.now();
    set(roomRef("emote"), { by: me, e, t: serverNow() }).catch(() => {});
  });
});
$("#mute").addEventListener("click", () => { const m = !load("twMute", "false"); save("twMute", m); $("#mute").textContent = m ? "🔇 Sound off" : "🔊 Sound on"; if (!m) SFX.pop(); });
$("#mute").textContent = load("twMute", "false") ? "🔇 Sound off" : "🔊 Sound on";
$("#skiplot").addEventListener("click", () => {
  if (room?.lot && !room.lot.closed) update(roomRef("lot"), { ends: serverNow() - 1000 }).catch(fail);
});
$("#advance").addEventListener("click", advanceSeason);
$("#autoplay").addEventListener("change", e => {
  clearInterval(autoTimer);
  if (e.target.checked) autoTimer = setInterval(() => {
    if (room?.state === "season" && room.step < LEAGUE_DAYS + 2) advanceSeason();
  }, 6000 * F);
});
$("#again").addEventListener("click", toLobby);
document.addEventListener("click", e => {
  const d = e.target.dataset || {};
  if (!room) return;
  if (d.tactic && room.teams?.[me]) set(roomRef(`players/${me}/tactic`), d.tactic).catch(fail);
  if (me !== room.host) return;
  if (d.pool) update(roomRef(), { pool: d.pool }).catch(fail);
  if (d.budget) update(roomRef(), { budget: +d.budget }).catch(fail);
  if (d.kick && confirm(`Remove ${room.players[d.kick]?.name}?`)) update(roomRef(), { [`players/${d.kick}`]: null }).catch(fail);
});
