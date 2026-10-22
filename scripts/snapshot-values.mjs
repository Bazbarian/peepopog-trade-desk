// Saves one snapshot of FantasyCalc dynasty values per day into data/history.json,
// so player profiles can chart how a player's value has moved over time.
// Runs from .github/workflows/snapshot-values.yml.
import fs from "node:fs";

const NUM_TEAMS = process.env.NUM_TEAMS || "12";
const KEEP_DAYS = 365;
const FILE = "data/history.json";
const url = `https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&numTeams=${NUM_TEAMS}&ppr=1`;

const res = await fetch(url);
if (!res.ok) throw new Error(`FantasyCalc answered ${res.status}`);
const rows = await res.json();

let h = { dates: [], values: {} };
try { h = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch { /* first run */ }

const today = new Date().toISOString().slice(0, 10);
if (h.dates.at(-1) === today) { console.log(`Already have ${today}.`); process.exit(0); }

const i = h.dates.length;
h.dates.push(today);
for (const r of rows) {
  const id = r.player && r.player.sleeperId;
  if (!id) continue;                                   // draft picks have no Sleeper id
  const arr = (h.values[id] ||= []);
  while (arr.length < i) arr.push(null);
  arr.push(Math.round(r.value));
}
for (const arr of Object.values(h.values)) while (arr.length < h.dates.length) arr.push(null);

// Keep a rolling year so the file stays small
if (h.dates.length > KEEP_DAYS) {
  const cut = h.dates.length - KEEP_DAYS;
  h.dates = h.dates.slice(cut);
  for (const [id, arr] of Object.entries(h.values)) {
    h.values[id] = arr.slice(cut);
    if (h.values[id].every(v => v == null)) delete h.values[id];
  }
}

fs.mkdirSync("data", { recursive: true });
fs.writeFileSync(FILE, JSON.stringify(h));
console.log(`Saved ${today}: ${rows.length} values, ${h.dates.length} days of history.`);
