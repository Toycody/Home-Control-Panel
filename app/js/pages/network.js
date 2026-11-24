// Network page: internet usage from the Starlink dish (via Home Assistant), dish health and performance.
import { lineChart } from '../chart.js';

const DL = '#4F8EE8', UL = '#C9733C', PING = '#B4B4BA';
const N = { win: '2h', h2: null, h2at: 0, h12: null, h12at: 0, ping: null, pingAt: 0, month: null, monthAt: 0, err: null };

// Throughput sensors may report bit/s, kbit/s or Mbit/s depending on HA settings.
export function mbps(ctx, key) {
  const id = ctx.okId(key); const e = id && ctx.S.ents[id]; if (!e) return null;
  const v = parseFloat(e.state); if (isNaN(v)) return null;
  return v * unitScale(e.attributes.unit_of_measurement);
}
function unitScale(u) {
  return { 'bit/s': 1e-6, 'kbit/s': 1e-3, 'Mbit/s': 1, 'Gbit/s': 1000, 'B/s': 8e-6, 'kB/s': 8e-3, 'MB/s': 8, 'KiB/s': 8.192e-3, 'MiB/s': 8.388608 }[u] ?? 1;
}

// 2-hour throughput history (raw states), shared with the Home glance card.
export async function load2h(ctx, force) {
  if (!ctx.ha.connected || (!force && Date.now() - N.h2at < 55e3)) return N.h2;
  const ids = ['sl.down', 'sl.up'].map(ctx.okId);
  if (!ids[0]) return null;
  N.h2at = Date.now();
  try {
    const res = await ctx.ha.send({ type: 'history/history_during_period', start_time: new Date(Date.now() - 2 * 3600e3).toISOString(), entity_ids: ids.filter(Boolean), minimal_response: true, no_attributes: true, significant_changes_only: false });
    const scaleOf = (key) => { const id = ctx.okId(key); const e = id && ctx.S.ents[id]; return unitScale(e && e.attributes.unit_of_measurement); };
    const series = (id, key) => bucket((res[id] || []).map((r) => [(r.lu || r.lc) * 1000, parseFloat(r.s) * scaleOf(key)]), 60e3);
    N.h2 = { down: series(ids[0], 'sl.down'), up: ids[1] ? series(ids[1], 'sl.up') : [] };
    N.err = null;
  } catch (e) { N.err = e.message; }
  return N.h2;
}
// Max per bucket, so short bursts still show.
function bucket(pts, ms) {
  const m = new Map();
  for (const [t, v] of pts) { if (isNaN(v)) continue; const k = Math.floor(t / ms) * ms; if (!m.has(k) || v > m.get(k)) m.set(k, v); }
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}
export function glanceSeries() { return N.h2 ? N.h2.down : null; }

export async function load(ctx, force) {
  if (!ctx.ha.connected) return;
  const jobs = [load2h(ctx, force)];
  const now = Date.now();
  if (force || now - N.h12at > 5 * 60e3) {
    N.h12at = now;
    const ids = ['sl.down', 'sl.up', 'sl.ping'].map(ctx.okId).filter(Boolean);
    jobs.push(ctx.stats(ids, new Date(now - 12 * 3600e3), '5minute', ['mean', 'max'], { data_rate: 'Mbit/s' }).then((r) => {
      const get = (key, f) => (r[ctx.okId(key)] || []).map((x) => [+new Date(x.start), x[f]]);
      N.h12 = { down: get('sl.down', 'max'), up: get('sl.up', 'max'), downMean: get('sl.down', 'mean') };
      N.ping = { mean: get('sl.ping', 'mean'), max: get('sl.ping', 'max') };
    }).catch((e) => { N.err = e.message; }));
  }
  if (force || now - N.monthAt > 30 * 60e3) {
    N.monthAt = now;
    const ids = ['sl.download', 'sl.upload', 'sl.energy'].map(ctx.okId).filter(Boolean);
    const d = new Date(); const mStart = new Date(d.getFullYear(), d.getMonth(), 1); const dStart = new Date(d); dStart.setHours(0, 0, 0, 0);
    jobs.push(Promise.all([
      ctx.stats(ids, mStart, 'month', ['change'], { information: 'GB', energy: 'kWh' }),
      ctx.stats(ids, dStart, 'day', ['change'], { information: 'GB', energy: 'kWh' })
    ]).then(([mo, dy]) => {
      const s = (r, key) => (r[ctx.okId(key)] || []).reduce((a, x) => a + (x.change || 0), 0);
      N.month = { down: s(mo, 'sl.download'), up: s(mo, 'sl.upload'), energyToday: s(dy, 'sl.energy'), energyMonth: s(mo, 'sl.energy') };
    }).catch(() => {}));
  }
  await Promise.all(jobs);
  if (ctx.S.page === 'network') render(ctx);
}

const fmtDur = (ms) => { const m = Math.floor(ms / 60e3), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60); return d ? d + ' d ' + h + ' h' : h ? h + ' h ' + (m % 60) + ' m' : (m % 60) + ' m'; };

export function render(ctx) {
  const plan = ctx.C.plan || { down: 300, up: 30 };
  const down = mbps(ctx, 'sl.down'), up = mbps(ctx, 'sl.up');
  const data = N.win === '2h' ? (N.h2 ? { down: N.h2.down, up: N.h2.up, mean: N.h2.down } : null) : (N.h12 ? { down: N.h12.down, up: N.h12.up, mean: N.h12.downMean } : null);
  const vals = data ? data.down.map((p) => p[1]).filter((v) => v != null) : [];
  const means = data ? data.mean.map((p) => p[1]).filter((v) => v != null) : [];
  const peak = vals.length ? Math.max(...vals) : null, avg = means.length ? means.reduce((a, b) => a + b, 0) / means.length : null;
  const pct = (v, p) => (v == null ? '' : Math.round(v / p * 100) + '% of ' + p + ' plan');
  const f = (v) => (v == null ? '—' : v >= 100 ? Math.round(v) : v.toFixed(1));
  ctx.$('#main').innerHTML =
    '<section class="glass card pcard"><div class="phead"><div><h2>Internet</h2><div class="psub">Starlink dish throughput · plan ' + plan.down + '/' + plan.up + ' Mbps</div></div>' +
      '<div class="seg recessed">' + [['2h', '2 h'], ['12h', '12 h']].map(([v, l]) => '<button class="p' + (N.win === v ? ' accent' : '') + '" data-act="netwin" data-v="' + v + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="stat4">' +
        stat('Down now', f(down), 'Mbps', pct(down, plan.down), DL) + stat('Up now', f(up), 'Mbps', pct(up, plan.up), UL) +
        stat('Peak ↓ ' + (N.win === '2h' ? '2 h' : '12 h'), f(peak), 'Mbps', pct(peak, plan.down)) + stat('Average ↓', f(avg), 'Mbps', pct(avg, plan.down)) +
      '</div><div id="netchart" class="chartbox" style="height:230px"></div></section>' +
    '<section class="glass card pcard" id="slcard"></section>';
  const box = ctx.$('#netchart');
  if (data && data.down.length > 1) {
    const t1 = Date.now(), t0 = t1 - (N.win === '2h' ? 2 : 12) * 3600e3, step = N.win === '2h' ? 30 : 180;
    const ticks = []; for (let m = 0; m <= (N.win === '2h' ? 120 : 720); m += step) { const t = t0 + m * 60e3; ticks.push([t, t === t1 ? 'Now' : new Date(t).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }).replace(' ', '').toLowerCase(), m === 0 ? 'start' : t === t1 ? 'end' : 'middle']); }
    lineChart(box, { width: 704, height: 230, t0, t1, yUnit: 'Mbps', xTicks: ticks, fmt: (v) => f(v) + ' Mbps',
      timeFmt: (x) => new Date(x).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }),
      refLines: [{ v: plan.down, color: DL, label: plan.down + ' plan' }, { v: plan.up, color: UL, label: plan.up + ' plan' }],
      series: [{ name: 'Download', color: DL, area: true, points: data.down }, { name: 'Upload', color: UL, points: data.up }] });
  } else box.innerHTML = '<div class="wmsg">' + (!ctx.okId('sl.down') ? 'Starlink throughput sensor not found' : N.err ? 'Couldn’t load history: ' + ctx.esc(N.err) : 'Loading…') + '</div>';
  renderStarlink(ctx);
}
function stat(label, value, unit, sub, color) {
  return '<div class="st small"><span class="sl">' + (color ? '<i style="background:' + color + '"></i>' : '') + label + '</span><span class="sv">' + value + '<span> ' + unit + '</span></span><span class="ss">' + sub + '</span></div>';
}

function renderStarlink(ctx) {
  const el = ctx.$('#slcard'); if (!el) return;
  const st = (key) => { const id = ctx.okId(key); return id && ctx.S.ents[id] ? ctx.S.ents[id] : null; };
  const on = (key) => { const e = st(key); return e ? e.state === 'on' : null; };
  const ping = ctx.num('sl.ping'), drop = ctx.num('sl.drop'), power = ctx.num('sl.power');
  const lr = st('sl.lastRestart'); const up = lr && !isNaN(Date.parse(lr.state)) ? Date.now() - Date.parse(lr.state) : null;
  const conn = on('sl.connectivity'), obs = on('sl.obstructed');
  const upd = st('sl.update');
  const alerts = [];
  const flag = (key, text) => { if (on(key)) alerts.push(text); };
  flag('sl.thermal', 'Thermal throttling'); flag('sl.motors', 'Motors stuck'); flag('sl.location', 'Unexpected location');
  flag('sl.ethernet', 'Slow Ethernet link'); flag('sl.mast', 'Mast not vertical'); flag('sl.heating', 'Heating (snow melt)');
  if (on('sl.sleep')) alerts.push('Sleep mode on'); if (on('sl.stowed')) alerts.push('Stowed');
  const pm = N.ping && N.ping.mean.length ? N.ping.mean.map((p) => p[1]).filter((v) => v != null) : [];
  const pAvg = pm.length ? pm.reduce((a, b) => a + b, 0) / pm.length : null;
  const pWorst = N.ping && N.ping.max.length ? Math.max(...N.ping.max.map((p) => p[1]).filter((v) => v != null)) : null;
  const m = N.month;
  el.innerHTML = '<div class="phead"><div><h2>Starlink dish</h2><div class="psub">' + (alerts.length ? '<span style="color:#F5C46B">' + ctx.esc(alerts.join(' · ')) + '</span>' : 'No alerts') + '</div></div></div>' +
    '<div class="stat4">' +
      stat('Connection', conn == null ? '—' : conn ? 'Online' : 'Offline', '', up != null ? 'up ' + fmtDur(up) : '', conn === false ? '#E8434A' : conn ? '#4CC38A' : null) +
      stat('Ping', ping == null ? '—' : Math.round(ping), 'ms', pAvg != null ? '12 h avg ' + Math.round(pAvg) + ' ms' : '') +
      stat('Drop rate', drop == null ? '—' : drop < 1 ? drop.toFixed(2) : drop.toFixed(1), '%', 'packets lost now') +
      stat('Sky view', obs == null ? '—' : obs ? 'Obstructed' : 'Clear', '', obs ? 'something is blocking' : 'no obstructions', obs ? '#F5C46B' : obs === false ? '#4CC38A' : null) +
      stat('Dish power', power == null ? '—' : Math.round(power), 'W', m && m.energyToday ? m.energyToday.toFixed(2) + ' kWh today' : '') +
      stat('Data this month', m ? (m.down + m.up).toFixed(m.down + m.up >= 100 ? 0 : 1) : '—', 'GB', m ? '↓ ' + m.down.toFixed(0) + ' · ↑ ' + m.up.toFixed(0) + ' GB' : '') +
      stat('Worst ping 12 h', pWorst == null ? '—' : Math.round(pWorst), 'ms', '5-minute peak') +
      stat('Firmware', !upd ? '—' : upd.state === 'on' ? 'Update' : 'Current', '', upd && upd.attributes.installed_version ? String(upd.attributes.installed_version).slice(0, 18) : '') +
    '</div>' +
    '<div class="phead" style="margin-top:2px"><div class="psub">Ping, last 12 hours (5-minute average)</div></div><div id="pingchart" class="chartbox" style="height:120px"></div>';
  const box = ctx.$('#pingchart');
  if (N.ping && N.ping.mean.length > 1) {
    const t1 = Date.now(), t0 = t1 - 12 * 3600e3;
    lineChart(box, { width: 704, height: 120, t0, t1, yUnit: 'ms', xTicks: [[t0, '12 h ago', 'start'], [t1, 'Now', 'end']], fmt: (v) => Math.round(v) + ' ms',
      timeFmt: (x) => new Date(x).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }), series: [{ name: 'Ping', color: PING, points: N.ping.mean }] });
  } else box.innerHTML = '<div class="wmsg">' + (ctx.okId('sl.ping') ? 'Loading…' : 'Ping sensor not found') + '</div>';
}
export function setWin(ctx, w) { N.win = w; render(ctx); load(ctx); }
export function update(ctx) {
  // live tiles only; charts refresh on their own timer
  const el = ctx.$('#main .stat4'); if (!el) return;
  const plan = ctx.C.plan || { down: 300, up: 30 };
  const f = (v) => (v == null ? '—' : v >= 100 ? Math.round(v) : v.toFixed(1));
  const tiles = el.querySelectorAll('.st');
  const down = mbps(ctx, 'sl.down'), up = mbps(ctx, 'sl.up');
  if (tiles[0]) { tiles[0].querySelector('.sv').firstChild.textContent = f(down); tiles[0].querySelector('.ss').textContent = down == null ? '' : Math.round(down / plan.down * 100) + '% of ' + plan.down + ' plan'; }
  if (tiles[1]) { tiles[1].querySelector('.sv').firstChild.textContent = f(up); tiles[1].querySelector('.ss').textContent = up == null ? '' : Math.round(up / plan.up * 100) + '% of ' + plan.up + ' plan'; }
  renderStarlink(ctx);
}
