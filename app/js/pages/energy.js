// Energy page: live solar / home / grid, last 24 h, and Month / Quarter / Year averages.
// Data: Shelly dual-channel clamp via Home Assistant (live states + recorder statistics).
import { lineChart, barChart } from '../chart.js';

const SOLAR = '#B97D14', HOME = '#4F8EE8';
const E = { load: 0, day: null, days: null, today: null, view: 'month', sel: null, err: null, solarSign: 0 };

// ---- live figures
// Solar sign: +1 if the inverter channel reads positive while generating, −1 if negative.
function solarSign(ctx) {
  const cfg = (ctx.C.energy || {}).solarFrom || 'auto';
  if (cfg === 'energy') return 1;
  if (cfg === 'returned') return -1;
  return E.solarSign || 0; // 0 = not known yet
}
export function live(ctx) {
  const k = ctx.C.energy || {};
  const sp = watts(ctx, 'en.solarPower'), gp = watts(ctx, 'en.gridPower');
  if (sp == null && gp == null) return null;
  const ss = solarSign(ctx);
  const solar = sp == null ? 0 : (ss ? Math.max(0, ss * sp) : Math.abs(sp));
  const grid = gp == null ? 0 : gp * (k.gridPowerSign || 1);   // + import, − export
  return { solar, grid, home: Math.max(0, solar + grid) };
}

// Live power in watts, whatever unit HA displays the sensor in (W / kW / MW).
function watts(ctx, key) {
  const v = ctx.num(key); if (v == null) return null;
  const u = (ctx.ent(key) || {}).attributes || {};
  return v * ({ kW: 1e3, MW: 1e6, mW: 1e-3 }[u.unit_of_measurement] || 1);
}
function kwh(ctx, key) {
  const v = ctx.num(key); if (v == null) return null;
  const u = (ctx.ent(key) || {}).attributes || {};
  return v * ({ Wh: 1e-3, MWh: 1e3, GJ: 277.778, MJ: 0.277778 }[u.unit_of_measurement] || 1);
}

// ---- data loading
// Totals are integrated from the power sensors' time-weighted means in HA's long-term
// statistics (kWh = mean W × hours / 1000). That keeps them consistent with the 24 h graph
// and doesn't depend on which way round the clamp's energy counters are.
// Grid import/export use the meter's energy counters when available.
export async function load(ctx, force) {
  if (!ctx.ha.connected) return;
  if (!force && Date.now() - E.load < 5 * 60e3) return;
  E.load = Date.now();
  const sp = ctx.okId('en.solarPower'), gp = ctx.okId('en.gridPower');
  const gi = ctx.okId('en.gridImport'), ge = ctx.okId('en.gridExport');
  const now = new Date(), dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const yearStart = new Date(dayStart); yearStart.setDate(yearStart.getDate() - 400);
  const se = ctx.okId('en.solarEnergy'), sr = ctx.okId('en.solarReturned');
  const pw = [sp, gp].filter(Boolean), cn = [gi, ge, se, sr].filter(Boolean);
  try {
    const [days, fivemin, cDays, cHours] = await Promise.all([
      ctx.stats(pw, yearStart, 'day', ['mean'], { power: 'W' }),
      ctx.stats(pw, new Date(Math.min(now - 24 * 3600e3, +dayStart)), '5minute', ['mean'], { power: 'W' }),
      ctx.stats(cn, yearStart, 'day', ['change'], { energy: 'kWh' }),
      ctx.stats(cn, dayStart, 'hour', ['change', 'state'], { energy: 'kWh' })
    ]);
    // Solar energy: the inverter channel's own counter (what HA's Daily Solar uses), on whichever
    // channel has counted more. Falls back to integrating the power sensor.
    const yearSum = (id) => (cDays[id] || []).reduce((a, r) => a + (r.change || 0), 0);
    const solarCounter = se || sr ? ((sr && yearSum(sr) > yearSum(se)) ? sr : se) : null;
    const solarCounterKey = solarCounter === sr ? 'en.solarReturned' : 'en.solarEnergy';
    E.solarCounter = solarCounter;
    // Work out the solar sign from the last 24 h: generation dominates the inverter channel.
    const s5 = (fivemin[sp] || []).map((r) => r.mean || 0);
    const pos = s5.reduce((a, v) => a + Math.max(0, v), 0), neg = s5.reduce((a, v) => a + Math.max(0, -v), 0);
    if (pos + neg > 0) E.solarSign = neg > pos ? -1 : 1;
    const ss = solarSign(ctx) || 1, gs = (ctx.C.energy || {}).gridPowerSign || 1;
    const key = (v) => new Date(v).toDateString();
    // per-day totals
    const map = new Map();
    const row = (d) => { const k = key(d); if (!map.has(k)) { const dd = new Date(d); dd.setHours(0, 0, 0, 0); map.set(k, { date: dd, solar: 0, home: 0, imp: null, exp: null, sMean: null, gMean: null }); } return map.get(k); };
    for (const r of days[sp] || []) row(r.start).sMean = r.mean;
    for (const r of days[gp] || []) row(r.start).gMean = r.mean;
    for (const r of cDays[gi] || []) { const x = row(r.start); x.imp = (x.imp || 0) + (r.change || 0); }
    for (const r of cDays[ge] || []) { const x = row(r.start); x.exp = (x.exp || 0) + (r.change || 0); }
    for (const r of cDays[solarCounter] || []) { const x = row(r.start); x.sCount = (x.sCount || 0) + (r.change || 0); }
    map.delete(dayStart.toDateString()); // today is built from hourly data below
    for (const x of map.values()) {
      if (x.sMean == null && x.gMean == null) continue;
      const s = ss * (x.sMean || 0), g = gs * (x.gMean || 0);
      x.solar = Math.max(0, s) * 24 / 1000; x.home = Math.max(0, s + g) * 24 / 1000;
    }
    for (const x of map.values()) if (x.sCount != null) x.solar = x.sCount;
    // today: home use from 5-minute power means since midnight (only ~5 min behind);
    // solar from HA's Daily Solar meter if present, else the counter (completed hours + live reading).
    const g5 = new Map((fivemin[gp] || []).map((r) => [+new Date(r.start), r.mean]));
    const today = { date: dayStart, solar: 0, home: 0, imp: gi ? 0 : null, exp: ge ? 0 : null, partial: true };
    const todayRows = (fivemin[sp] || []).filter((r) => +new Date(r.start) >= +dayStart);
    for (const r of todayRows) { const s = ss * (r.mean || 0), g = gs * (g5.get(+new Date(r.start)) || 0); today.solar += Math.max(0, s) / 12000; today.home += Math.max(0, s + g) / 12000; }
    if (!todayRows.length) for (const r of (fivemin[gp] || []).filter((x) => +new Date(x.start) >= +dayStart)) today.home += Math.max(0, gs * (r.mean || 0)) / 12000;
    const sinceLastHour = (id, key) => { const rows = cHours[id] || []; const done = rows.reduce((a, r) => a + (r.change || 0), 0); const last = rows[rows.length - 1]; const liveV = kwh(ctx, key); return done + (last && last.state != null && liveV != null ? Math.max(0, liveV - last.state) : 0); };
    const daily = ctx.num('en.dailySolar');
    if (daily != null) today.solar = kwh(ctx, 'en.dailySolar');
    else if (solarCounter) today.solar = sinceLastHour(solarCounter, solarCounterKey);
    if (gi) today.imp = sinceLastHour(gi, 'en.gridImport');
    if (ge) today.exp = sinceLastHour(ge, 'en.gridExport');
    E.days = [...map.values()].filter((x) => x.sMean != null || x.gMean != null).concat([today]).sort((a, b) => a.date - b.date);
    E.today = today;
    // 24 h power
    const gridAt = new Map((fivemin[gp] || []).map((r) => [+new Date(r.start), r.mean]));
    E.day = (fivemin[sp] || []).map((r) => { const t = +new Date(r.start), s = ss * (r.mean || 0), g = (gridAt.get(t) || 0) * gs; return [t, Math.max(0, s) / 1000, Math.max(0, s + g) / 1000]; });
    E.err = null;
  } catch (e) { E.err = e.message; }
  if (ctx.S.page === 'energy') render(ctx);
}

// ---- grouping: Month = last 30 days by day, Quarter = last 13 weeks by week, Year = last 12 months by month
function groups() {
  if (!E.days || !E.days.length) return [];
  const now = new Date(), today0 = new Date(now); today0.setHours(0, 0, 0, 0);
  const buckets = [];
  if (E.view === 'month') {
    for (let i = 29; i >= 0; i--) { const d = new Date(today0); d.setDate(d.getDate() - i); const e = new Date(d); e.setDate(e.getDate() + 1); buckets.push({ start: d, end: e }); }
  } else if (E.view === 'quarter') {
    const mon = new Date(today0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7)); // this week's Monday
    for (let i = 12; i >= 0; i--) { const d = new Date(mon); d.setDate(d.getDate() - 7 * i); const e = new Date(d); e.setDate(e.getDate() + 7); buckets.push({ start: d, end: e }); }
  } else {
    for (let i = 11; i >= 0; i--) { const d = new Date(today0.getFullYear(), today0.getMonth() - i, 1); buckets.push({ start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 1) }); }
  }
  return buckets.map((b, i) => {
    const ds = E.days.filter((x) => x.date >= b.start && x.date < b.end);
    const sum = (f) => ds.reduce((a, x) => a + (x[f] || 0), 0);
    const hasImp = ds.some((x) => x.imp != null), hasExp = ds.some((x) => x.exp != null);
    const partial = b.end > now;
    const label = E.view === 'month'
      ? ((b.start.getDate() - 1) % 5 === 0 || i === buckets.length - 1 ? String(b.start.getDate()) : '')
      : E.view === 'quarter' ? (i % 2 === 0 || i === buckets.length - 1 ? b.start.getDate() + '/' + (b.start.getMonth() + 1) : '')
      : b.start.toLocaleDateString('en-AU', { month: 'short' });
    const long = E.view === 'month' ? b.start.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
      : E.view === 'quarter' ? 'Week of ' + b.start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
      : b.start.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
    return { label, long, partial, empty: !ds.length, solar: sum('solar'), use: sum('home'), imp: hasImp ? sum('imp') : null, exp: hasExp ? sum('exp') : null };
  });
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
      nowCard('Home use', HOME, lv ? kw(lv.home) : '—', t ? t.home.toFixed(1) + ' kWh today' : '') +
      nowCard(gridLabel, lv && lv.grid < -20 ? '#4CC38A' : '#8A8A90', lv ? kw(Math.abs(lv.grid)) : '—', t && t.imp != null ? 'in ' + t.imp.toFixed(1) + ' · out ' + (t.exp || 0).toFixed(1) + ' kWh today' : '') +
    '</section>' +
    '<section class="glass card pcard"><div class="phead"><div><h2>Last 24 hours</h2><div class="psub">Power, 5-minute averages</div></div>' +
      '<div class="legend"><span><i style="background:' + SOLAR + '"></i>Solar</span><span><i style="background:' + HOME + '"></i>Home use</span></div></div>' +
      '<div id="en24" class="chartbox" style="height:230px"></div></section>' +
    '<section class="glass card pcard" style="flex:1 1 auto;min-height:0"><div class="phead"><div><h2>Generation and use</h2><div class="psub">' + ({ month: 'kWh per day, last 30 days', quarter: 'kWh per week, last 13 weeks', year: 'kWh per month, last 12 months' }[E.view]) + '</div></div>' +
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
  if (!gs.length || gs.every((g) => g.empty)) { box.innerHTML = '<div class="wmsg">' + (E.err ? 'Couldn’t load statistics: ' + ctx.esc(E.err) : E.days ? 'No long-term statistics for the power sensors yet' : 'Loading…') + '</div>'; ctx.$('#endetail').innerHTML = ''; return; }
  if (E.sel == null || E.sel >= gs.length) E.sel = gs.length - 1;
  barChart(box, { width: 704, height: 310, yUnit: 'kWh', colors: [SOLAR, HOME], selected: E.sel,
    groups: gs.map((g) => ({ label: g.label, values: g.empty ? [null, null] : [g.solar, g.use] })),
    onPick: (i) => { E.sel = i; renderBars(ctx); } });
  const g = gs[E.sel];
  const f = (v) => v.toFixed(v >= 100 ? 0 : 1);
  const self = g.imp != null && g.use > 0 ? Math.max(0, Math.min(100, Math.round((1 - g.imp / g.use) * 100))) : null;
  ctx.$('#endetail').innerHTML = '<b>' + g.long + (g.partial ? ' <span class="muted">(so far)</span>' : '') + '</b>' +
    (g.empty ? '<span>No data</span>' :
      '<span><i style="background:' + SOLAR + '"></i>Solar ' + f(g.solar) + ' kWh</span>' +
      '<span><i style="background:' + HOME + '"></i>Used ' + f(g.use) + ' kWh</span>' +
      (g.imp != null ? '<span>Import ' + f(g.imp) + '</span>' : '') + (g.exp != null ? '<span>Export ' + f(g.exp) + '</span>' : '') +
      (self != null ? '<span>Self-supplied ' + self + '%</span>' : ''));
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
