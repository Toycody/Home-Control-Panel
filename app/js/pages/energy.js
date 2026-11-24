// Energy page: live solar / home / grid, last 24 h, and Month / Quarter / Year averages.
// Data: Shelly dual-channel clamp via Home Assistant (live states + recorder statistics).
import { lineChart, barChart } from '../chart.js';

const SOLAR = '#B97D14', HOME = '#4F8EE8';
const E = { load: 0, day: null, months: null, view: 'month', sel: null, err: null };

// ---- live figures
export function live(ctx) {
  const k = ctx.C.energy || {};
  const sp = ctx.num('en.solarPower'), gp = ctx.num('en.gridPower');
  if (sp == null && gp == null) return null;
  const solarSign = solarFrom(ctx) === 'returned' ? -1 : 1;
  const solar = sp == null ? 0 : (solarFrom(ctx) === 'auto' ? Math.abs(sp) : Math.max(0, solarSign * sp));
  const grid = gp == null ? 0 : gp * (k.gridPowerSign || 1);   // + import, − export
  return { solar, grid, home: Math.max(0, solar + grid) };
}
function solarFrom(ctx) {
  const cfg = (ctx.C.energy || {}).solarFrom || 'auto';
  if (cfg !== 'auto') return cfg;
  return E.solarFrom || 'auto';
}

// ---- data loading (statistics)
export async function load(ctx, force) {
  if (!ctx.ha.connected) return;
  if (!force && Date.now() - E.load < 5 * 60e3) return;
  E.load = Date.now();
  const ids = ['en.solarEnergy', 'en.solarReturned', 'en.gridImport', 'en.gridExport'].map(ctx.okId);
  const now = new Date(), dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const from36 = new Date(now.getFullYear(), now.getMonth() - 35, 1);
  try {
    const [months, today, fivemin] = await Promise.all([
      ctx.stats(ids.filter(Boolean), from36, 'month', ['change'], { energy: 'kWh' }),
      ctx.stats(ids.filter(Boolean), dayStart, 'hour', ['change'], { energy: 'kWh' }),
      ctx.stats(['en.solarPower', 'en.gridPower'].map(ctx.okId).filter(Boolean), new Date(now - 24 * 3600e3), '5minute', ['mean'], { power: 'W' })
    ]);
    const sum = (id, rows) => (rows[id] || []).reduce((a, r) => a + (r.change || 0), 0);
    const [se, sr, gi, ge] = ids;
    // Which inverter channel is generation? Whichever has accumulated more energy.
    if (se || sr) E.solarFrom = (sr && sum(sr, months) > sum(se, months)) ? 'returned' : 'energy';
    const solarId = E.solarFrom === 'returned' ? sr : se;
    // monthly series
    const byMonth = new Map();
    const add = (id, field) => { for (const r of (months[id] || [])) { const k = monthKey(r.start); const m = byMonth.get(k) || { start: toDate(r.start), solar: 0, imp: 0, exp: 0 }; m[field] += r.change || 0; byMonth.set(k, m); } };
    if (solarId) add(solarId, 'solar'); if (gi) add(gi, 'imp'); if (ge) add(ge, 'exp');
    E.months = [...byMonth.values()].sort((a, b) => a.start - b.start).filter((m) => m.solar + m.imp + m.exp > 0.05);
    // today
    E.today = { solar: sum(solarId, today), imp: sum(gi, today), exp: sum(ge, today) };
    // 24 h power
    const sp = ctx.okId('en.solarPower'), gp = ctx.okId('en.gridPower');
    const sign = (ctx.C.energy || {}).gridPowerSign || 1, ss = E.solarFrom === 'returned' ? -1 : 1;
    const gridAt = new Map((fivemin[gp] || []).map((r) => [+toDate(r.start), r.mean]));
    E.day = (fivemin[sp] || []).map((r) => { const t = +toDate(r.start), s = Math.max(0, ss * (r.mean || 0)), g = (gridAt.get(t) || 0) * sign; return [t, s / 1000, Math.max(0, s + g) / 1000]; });
    E.err = null;
  } catch (e) { E.err = e.message; }
  if (ctx.S.page === 'energy') render(ctx);
}
const toDate = (v) => (typeof v === 'number' ? new Date(v) : new Date(v));
const monthKey = (v) => { const d = toDate(v); return d.getFullYear() * 12 + d.getMonth(); };

// ---- grouping for Month / Quarter / Year
function groups() {
  if (!E.months || !E.months.length) return [];
  const now = new Date();
  const map = new Map();
  for (const m of E.months) {
    const d = m.start, y = d.getFullYear(), q = Math.floor(d.getMonth() / 3);
    const key = E.view === 'month' ? y * 12 + d.getMonth() : E.view === 'quarter' ? y * 4 + q : y;
    const g = map.get(key) || { key, start: E.view === 'month' ? new Date(y, d.getMonth(), 1) : E.view === 'quarter' ? new Date(y, q * 3, 1) : new Date(y, 0, 1), solar: 0, imp: 0, exp: 0, first: m.start };
    g.solar += m.solar; g.imp += m.imp; g.exp += m.exp; map.set(key, g);
  }
  const firstData = E.months[0].start;
  const list = [...map.values()].sort((a, b) => a.start - b.start).map((g) => {
    const end = E.view === 'month' ? new Date(g.start.getFullYear(), g.start.getMonth() + 1, 1) : E.view === 'quarter' ? new Date(g.start.getFullYear(), g.start.getMonth() + 3, 1) : new Date(g.start.getFullYear() + 1, 0, 1);
    const from = g.start < firstData ? firstData : g.start;      // first period may be partial
    const to = end > now ? now : end;
    const days = Math.max(1, (to - from) / 864e5);
    const use = Math.max(0, g.solar + g.imp - g.exp);
    return Object.assign(g, { days, use, partial: end > now || g.start < firstData,
      label: E.view === 'month' ? g.start.toLocaleDateString('en-AU', { month: 'short' }) : E.view === 'quarter' ? 'Q' + (Math.floor(g.start.getMonth() / 3) + 1) + ' ’' + String(g.start.getFullYear()).slice(2) : String(g.start.getFullYear()),
      long: E.view === 'month' ? g.start.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) : E.view === 'quarter' ? 'Q' + (Math.floor(g.start.getMonth() / 3) + 1) + ' ' + g.start.getFullYear() : String(g.start.getFullYear()) });
  });
  return list.slice(-({ month: 12, quarter: 8, year: 4 }[E.view]));
}

// ---- render
export function render(ctx) {
  const m = ctx.$('#main');
  const lv = live(ctx);
  const t = E.today;
  const kw = (w) => (w / 1000).toFixed(w >= 10000 ? 1 : 2);
  const gridLabel = !lv ? 'Grid' : lv.grid < -20 ? 'Exporting' : 'Importing';
  m.innerHTML =
    '<section class="now3">' +
      nowCard('Solar', SOLAR, lv ? kw(lv.solar) : '—', t ? t.solar.toFixed(1) + ' kWh today' : '') +
      nowCard('Home use', HOME, lv ? kw(lv.home) : '—', t ? Math.max(0, t.solar + t.imp - t.exp).toFixed(1) + ' kWh today' : '') +
      nowCard(gridLabel, lv && lv.grid < -20 ? '#4CC38A' : '#8A8A90', lv ? kw(Math.abs(lv.grid)) : '—', t ? 'in ' + t.imp.toFixed(1) + ' · out ' + t.exp.toFixed(1) + ' kWh today' : '') +
    '</section>' +
    '<section class="glass card pcard"><div class="phead"><div><h2>Last 24 hours</h2><div class="psub">Power, 5-minute averages</div></div>' +
      '<div class="legend"><span><i style="background:' + SOLAR + '"></i>Solar</span><span><i style="background:' + HOME + '"></i>Home use</span></div></div>' +
      '<div id="en24" class="chartbox" style="height:230px"></div></section>' +
    '<section class="glass card pcard" style="flex:1 1 auto;min-height:0"><div class="phead"><div><h2>Daily averages</h2><div class="psub" id="avgsub">Average kWh per day</div></div>' +
      '<div class="seg recessed">' + [['month', 'Month'], ['quarter', 'Quarter'], ['year', 'Year']].map(([v, l]) => '<button class="p' + (E.view === v ? ' accent' : '') + '" data-act="enview" data-v="' + v + '">' + l + '</button>').join('') + '</div></div>' +
      '<div id="enbars" class="chartbox" style="height:310px"></div><div class="detail" id="endetail"></div></section>';
  // 24h
  const box = ctx.$('#en24');
  if (E.day && E.day.length > 1) {
    const now = Date.now(), t0 = now - 24 * 3600e3;
    const ticks = []; for (let h = 0; h <= 24; h += 6) { const tt = t0 + h * 3600e3; ticks.push([tt, h === 24 ? 'Now' : new Date(tt).toLocaleTimeString('en-AU', { hour: 'numeric', hour12: true }).replace(' ', '').toLowerCase(), h === 0 ? 'start' : h === 24 ? 'end' : 'middle']); }
    lineChart(box, { width: 704, height: 230, t0, t1: now, yUnit: 'kW', xTicks: ticks, timeFmt: (x) => new Date(x).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }),
      fmt: (v) => v.toFixed(2) + ' kW',
      series: [{ name: 'Solar', color: SOLAR, area: true, points: E.day.map((p) => [p[0], p[1]]) }, { name: 'Home use', color: HOME, points: E.day.map((p) => [p[0], p[2]]) }] });
  } else box.innerHTML = '<div class="wmsg">' + (E.err ? 'Couldn’t load history: ' + ctx.esc(E.err) : 'Loading…') + '</div>';
  renderBars(ctx);
}
function nowCard(label, color, value, sub) {
  return '<div class="glass card ncard"><span class="nl"><i style="background:' + color + '"></i>' + label + '</span><span class="nv">' + value + '<span> kW</span></span><span class="ns">' + sub + '</span></div>';
}
function renderBars(ctx) {
  const box = ctx.$('#enbars'); if (!box) return;
  const gs = groups();
  if (!gs.length) { box.innerHTML = '<div class="wmsg">' + (E.err ? 'Couldn’t load statistics' : E.months ? 'No long-term energy statistics yet' : 'Loading…') + '</div>'; ctx.$('#endetail').innerHTML = ''; return; }
  if (E.sel == null || E.sel >= gs.length) E.sel = gs.length - 1;
  barChart(box, { width: 704, height: 310, yUnit: 'kWh/day', colors: [SOLAR, HOME], selected: E.sel,
    groups: gs.map((g) => ({ label: g.label, values: [g.solar / g.days, g.use / g.days] })),
    onPick: (i) => { E.sel = i; renderBars(ctx); } });
  const g = gs[E.sel];
  const self = g.use > 0 ? Math.max(0, Math.min(100, Math.round((1 - g.imp / g.days / (g.use / g.days)) * 100))) : 0;
  ctx.$('#endetail').innerHTML = '<b>' + g.long + (g.partial ? ' <span class="muted">(so far)</span>' : '') + '</b>' +
    '<span><i style="background:' + SOLAR + '"></i>Solar ' + (g.solar / g.days).toFixed(1) + '</span>' +
    '<span><i style="background:' + HOME + '"></i>Used ' + (g.use / g.days).toFixed(1) + '</span>' +
    '<span>Import ' + (g.imp / g.days).toFixed(1) + '</span><span>Export ' + (g.exp / g.days).toFixed(1) + '</span>' +
    '<span>Self-supplied ' + self + '%</span>';
}
export function setView(ctx, v) { E.view = v; E.sel = null; render(ctx); }
export function update(ctx) {
  // refresh the live cards only
  const lv = live(ctx); const cards = ctx.$('#main').querySelectorAll('.ncard'); if (!lv || cards.length < 3) return;
  const kw = (w) => (w / 1000).toFixed(w >= 10000 ? 1 : 2);
  cards[0].querySelector('.nv').firstChild.textContent = kw(lv.solar);
  cards[1].querySelector('.nv').firstChild.textContent = kw(lv.home);
  cards[2].querySelector('.nv').firstChild.textContent = kw(Math.abs(lv.grid));
  cards[2].querySelector('.nl').lastChild.textContent = lv.grid < -20 ? 'Exporting' : 'Importing';
  cards[2].querySelector('.nl i').style.background = lv.grid < -20 ? '#4CC38A' : '#8A8A90';
}
export function debug() { return E; }
