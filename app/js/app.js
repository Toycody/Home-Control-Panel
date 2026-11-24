// Home Control Panel — Phase 1 (Home page, Home Assistant only).
import { HAClient } from './ha.js';
import * as Energy from './pages/energy.js';
import * as Network from './pages/network.js';
import * as Servers from './pages/servers.js';

const VERSION = '0.2.0';
// Defaults from config.example.js, overridden section by section by the host's config.js.
const C = Object.assign({}, window.PANEL_DEFAULTS || {}, window.PANEL_CONFIG || {});
const $ = (sel, el) => (el || document).querySelector(sel);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------- palettes (Vesta)
const PALETTES = [
  ['Violet', '#443485', '#6554AF', '#33276A'],
  ['Burgundy', '#7A2440', '#A3475F', '#6B1E36'],
  ['Plum', '#5E3A6E', '#86639A', '#4E2E5E'],
  ['Slate', '#3E5470', '#6E86A3', '#2F4462'],
  ['Dusk teal', '#2F5F63', '#5E8C8F', '#244C50'],
  ['Sage', '#4A6555', '#7A9584', '#3A5446'],
  ['Sand', '#7A6550', '#A68F77', '#5E4C3C'],
  ['Graphite', '#4A4A50', '#7C7C84', '#3A3A40']
];

// ---------------------------------------------------------------- icons
const ICON = {
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.9V16h5v-.2c0-.8.4-1.5 1-1.9A6 6 0 0 0 12 3z',
  power: 'M12 3v8M6.3 6.8a8 8 0 1 0 11.4 0',
  film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9.5h4M4 14.5h4M16 9.5h4M16 14.5h4',
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  gear: 'M4 7h10M18 7h2M4 17h4M12 17h8',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6',
  minus: 'M5 12h14', plus: 'M12 5v14M5 12h14', close: 'M6 6l12 12M18 6L6 18',
  off: 'M12 3v8M6.3 6.3a8 8 0 1 0 11.4 0',
  cool: 'M12 2v20M4.9 7l14.2 10M4.9 17L19.1 7M9 4l3 3 3-3M9 20l3-3 3 3',
  heat: 'M12 3c3 4 5 6.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1.2 2.5 2.5 2.5-1-3 0-5.5.5-8z',
  auto: 'M4 19l5.5-14h5L20 19M7 13h10',
  dry: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  fan: 'M12 12c0-4 1.5-8 4.5-8S20 7 16 9.5M12 12c4 0 8 1.5 8 4.5S17 20 14.5 16M12 12c0 4-1.5 8-4.5 8S4 17 8 14.5M12 12c-4 0-8-1.5-8-4.5S7 4 9.5 8',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  partly: 'M8 3v1.5M3.5 8H2M4.6 4.6l1 1M12.4 4.6l-1 1M10.5 9.2A3.5 3.5 0 0 0 5 8.3M9 20h8a3.5 3.5 0 0 0 .5-7A5 5 0 0 0 8 13a3.5 3.5 0 0 0 1 7z',
  cloud: 'M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 9.5 4.3 4.3 0 0 0 7 18z',
  rain: 'M7 15h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 6.5 4.3 4.3 0 0 0 7 15zM9 18l-1 3M13 18l-1 3M17 18l-1 3',
  storm: 'M7 15h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 6.5 4.3 4.3 0 0 0 7 15zM12 15l-2 4h3l-2 4',
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  energy: 'M13 2L4 14h7l-1 8 9-12h-7z',
  servers: 'M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01',
  shopping: 'M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2M10 20.5h.01M17 20.5h.01',
  cameras: 'M3 7h3l2-2.5h8L18 7h3v12H3zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  network: 'M2 8.5a15 15 0 0 1 20 0M5 12a10.5 10.5 0 0 1 14 0M8.5 15.5a5.5 5.5 0 0 1 7 0M12 19h.01'
};
function svg(name, size, sw, color, extra) {
  const d = ICON[name] || name;
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="' + (color || 'currentColor') + '" stroke-width="' + (sw || 1.9) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '><path d="' + d + '"></path>' + (name === 'gear' ? '<circle cx="16" cy="7" r="2"></circle><circle cx="10" cy="17" r="2"></circle>' : '') + '</svg>';
}

// ---------------------------------------------------------------- settings (per tablet)
const SKEY = 'hcp.settings';
const settings = Object.assign({ theme: 0, edge: 35, homeAfter: C.returnHomeAfterSec || 120 }, (() => { try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { return {}; } })());
function saveSettings() { localStorage.setItem(SKEY, JSON.stringify(settings)); }
function applyTheme() {
  const p = PALETTES[settings.theme] || PALETTES[0];
  const r = document.documentElement.style;
  r.setProperty('--base', p[1]); r.setProperty('--hi', p[2]); r.setProperty('--glow', p[3]);
  r.setProperty('--edge', String(settings.edge / 100));
}

// ---------------------------------------------------------------- state
const ha = new HAClient(C.haUrl);
const S = {
  page: 'home',
  overlay: null,          // null | 'ac' | 'settings' | {cam: index}
  conn: 'connecting',
  haVersion: '',
  ents: {},               // entity_id -> {state, attributes}
  allIds: new Set(),
  res: {},                // config key -> {id, how: 'ok'|'name'|'only'|'missing'}
  hourly: null, daily: null, hourlyErr: false,
  pendingLight: {},       // entity_id -> {on, level, until}
  pendingAc: {},          // {target, targetUntil, mode, modeUntil}
  lastLevel: {},
  sceneFlash: {},
  lastInteract: Date.now()
};
const acLastKey = 'hcp.acLastMode';

// ---------------------------------------------------------------- layout scale
function fit() {
  const s = Math.min(window.innerWidth / 800, window.innerHeight / 1280);
  const st = $('#stage');
  st.style.transform = 'scale(' + s + ')';
  st.style.left = Math.max(0, (window.innerWidth - 800 * s) / 2) + 'px';
}

// ---------------------------------------------------------------- resolve entities
function configEntries() {
  const out = [];
  C.lights.forEach((l, i) => out.push(['light' + i, l.entity, l.friendly, l.name]));
  C.scenes.forEach((s, i) => out.push(['scene' + i, s.entity, s.friendly, s.name]));
  out.push(['climate', C.climate.entity, C.climate.friendly, C.climate.name]);
  out.push(['weather', C.weather.entity, C.weather.friendly, 'Weather']);
  C.cameras.forEach((c, i) => { out.push(['camStill' + i, c.still, null, c.name + ' (tile)']); out.push(['camLive' + i, c.live, null, c.name + ' (full screen)']); });
  for (const [prefix, group, title] of [['en.', C.energy, 'Energy'], ['sl.', C.starlink, 'Starlink']]) {
    if (!group) continue;
    for (const k in group) { const v = group[k]; if (v && typeof v === 'object' && v.entity) out.push([prefix + k, v.entity, v.friendly, title + ': ' + (v.label || k)]); }
  }
  return out;
}
function resolveAll(states) {
  S.allIds = new Set(states.map((s) => s.entity_id));
  for (const [key, id, friendly] of configEntries()) {
    if (S.allIds.has(id)) { S.res[key] = { id, how: 'ok' }; continue; }
    const dom = id.split('.')[0];
    const inDom = states.filter((s) => s.entity_id.startsWith(dom + '.'));
    const names = (Array.isArray(friendly) ? friendly : [friendly]).filter(Boolean).map((n) => n.toLowerCase());
    const byName = names.length && inDom.find((s) => names.includes(String(s.attributes.friendly_name || '').toLowerCase()));
    if (byName) { S.res[key] = { id: byName.entity_id, how: 'name' }; continue; }
    if (dom === 'weather' && inDom.length === 1) { S.res[key] = { id: inDom[0].entity_id, how: 'only' }; continue; }
    S.res[key] = { id, how: 'missing' };
  }
}
const rid = (key) => (S.res[key] ? S.res[key].id : null);
const ent = (key) => { const id = rid(key); return id ? S.ents[id] : null; };
const okId = (key) => (S.res[key] && S.res[key].how !== 'missing' ? S.res[key].id : null);
const num = (key) => { const e = ent(key); if (!e) return null; const v = parseFloat(e.state); return isNaN(v) ? null : v; };
function stats(ids, start, period, types, units) {
  if (!ids.length) return Promise.resolve({});
  return ha.send({ type: 'recorder/statistics_during_period', start_time: start.toISOString(), end_time: new Date().toISOString(), statistic_ids: ids, period, types, units: units || {} });
}
const ctx = { S, C, ha, $, esc, svg: (...a) => svg(...a), toast: (m) => toast(m), ent, rid, okId, num, stats };

// ---------------------------------------------------------------- HA connection
ha.onStatus = (st, detail) => {
  S.conn = st;
  if (st === 'connected' && detail) S.haVersion = detail;
  renderConn();
};
ha.onConnect = async () => {
  try {
    const states = await ha.send({ type: 'get_states' });
    resolveAll(states);
    const ids = [...new Set(Object.values(S.res).filter((r) => r.how !== 'missing').map((r) => r.id))];
    S.ents = {};
    for (const s of states) if (ids.includes(s.entity_id)) S.ents[s.entity_id] = { state: s.state, attributes: s.attributes };
    if (ids.length) await ha.subscribe({ type: 'subscribe_entities', entity_ids: ids }, onEntities);
    subscribeForecasts();
    onChange();
    loadPageData(true);
    if (S.overlay === 'settings') renderOverlay();
  } catch (e) { console.error('Setup after connect failed', e); }
};
function onEntities(ev) {
  if (ev.a) for (const id in ev.a) { const c = ev.a[id]; S.ents[id] = { state: c.s, attributes: c.a || {} }; }
  if (ev.c) for (const id in ev.c) {
    const d = ev.c[id], e = S.ents[id] || (S.ents[id] = { state: null, attributes: {} });
    if (d['+']) { if (d['+'].s !== undefined) e.state = d['+'].s; if (d['+'].a) Object.assign(e.attributes, d['+'].a); }
    if (d['-'] && d['-'].a) for (const k of d['-'].a) delete e.attributes[k];
  }
  if (ev.r) for (const id of ev.r) delete S.ents[id];
  onChange();
}
function subscribeForecasts() {
  const id = rid('weather');
  if (!id || S.res.weather.how === 'missing') return;
  ha.subscribe({ type: 'weather/subscribe_forecast', entity_id: id, forecast_type: 'hourly' }, (ev) => { S.hourly = ev.forecast || []; S.hourlyErr = false; renderWeather(); })
    .catch(() => { S.hourlyErr = true; renderWeather(); });
  ha.subscribe({ type: 'weather/subscribe_forecast', entity_id: id, forecast_type: 'daily' }, (ev) => { S.daily = ev.forecast || []; renderWeather(); })
    .catch(() => {});
}
function call(domain, service, data, entityId) {
  return ha.callService(domain, service, data, entityId).catch((e) => toast('Couldn’t reach Home Assistant: ' + e.message));
}
function onChange() {
  if (S.page === 'home') { updateLights(); updateScenes(); updateAc(); renderWeather(); renderGlance(); }
  else if (S.page === 'energy') Energy.update(ctx);
  else if (S.page === 'network') Network.update(ctx);
  if (S.overlay === 'ac') renderOverlay();
}

// ---------------------------------------------------------------- shell
function renderShell() {
  $('#root').innerHTML =
    '<header>' +
      '<div style="flex:1 1 auto;min-width:0"><div class="clock" id="clock"></div><div class="date" id="date"></div></div>' +
      '<div id="alert"></div><div id="conn"></div>' +
      '<button class="gear small p" data-act="settings" aria-label="Settings">' + svg('gear', 26, 1.8) + '</button>' +
    '</header>' +
    '<main id="main"></main>' +
    '<nav id="nav" aria-label="Pages"></nav>' +
    '<div id="overlay"></div><div id="toast"></div>';
  renderNav(); renderClock(); renderConn();
}
const PAGES = [['home', 'Home'], ['energy', 'Energy'], ['servers', 'Servers'], ['shopping', 'Shopping'], ['cameras', 'Cameras'], ['network', 'Network']];
function renderNav() {
  $('#nav').innerHTML = PAGES.map(([id, label]) =>
    '<button class="tab p' + (S.page === id ? ' glass on' : '') + '" data-act="page" data-v="' + id + '" aria-current="' + (S.page === id ? 'page' : 'false') + '">' + svg(id, 26, 1.8) + '<span>' + label + '</span></button>').join('');
}
function renderClock() {
  const d = new Date();
  $('#clock').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  $('#date').textContent = d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '');
}
function renderConn() {
  const el = $('#conn'); if (!el) return;
  if (S.conn === 'connected') { el.innerHTML = ''; return; }
  el.innerHTML = '<div class="conn' + (S.conn === 'disconnected' ? ' bad' : '') + '"><i></i>' + (S.conn === 'connecting' ? 'Connecting…' : 'Reconnecting…') + '</div>';
}
function setPage(p) {
  S.page = p; renderNav(); renderPage();
}
function renderPage() {
  const m = $('#main');
  m.style.animation = 'none'; void m.offsetWidth; m.style.animation = '';
  m.className = S.page === 'home' ? '' : 'page';
  if (S.page === 'home') { renderHome(); return; }
  if (S.page === 'energy') { Energy.render(ctx); Energy.load(ctx); return; }
  if (S.page === 'network') { Network.render(ctx); Network.load(ctx); return; }
  if (S.page === 'servers') { Servers.render(ctx); return; }
  const info = {
    shopping: ['Shopping', 'The shopping list shared with Vesta through Obsidian. Comes once the vault sync is set up.'],
    cameras: ['Cameras', 'Large live views of both cameras with recent events. Coming later — tap a camera on Home for full screen meanwhile.']
  }[S.page];
  m.innerHTML = '<section class="glass card soon">' + svg(S.page, 44, 1.6, 'var(--text-2)') + '<h2>' + info[0] + '</h2><p>' + info[1] + '</p></section>';
}

// ---------------------------------------------------------------- home
function renderHome() {
  $('#main').innerHTML =
    '<section class="cams" aria-label="Cameras">' + C.cameras.map((c, i) =>
      '<button class="cam p" data-act="cam" data-v="' + i + '" aria-label="Open ' + esc(c.name) + ' full screen">' +
        '<img id="camimg' + i + '" alt="" draggable="false"><span class="shade"></span><span class="msg" id="cammsg' + i + '"></span>' +
        '<span class="live stale" id="camlive' + i + '"><i></i>LIVE</span>' +
        '<span class="name">' + esc(c.name) + '</span><span class="expand">' + svg('expand', 22, 2) + '</span>' +
      '</button>').join('') + '</section>' +
    '<section class="lights" aria-label="Lights">' +
      C.lights.map((l, i) =>
        '<div class="light glass p" id="light' + i + '">' +
          '<button class="head" data-act="toggle" data-v="' + i + '"><span class="disc">' + svg('bulb', 21, 1.8) + '</span>' +
            '<span style="display:flex;flex-direction:column;gap:1px;min-width:0;max-width:100%"><span class="tname">' + esc(l.name) + '</span><span class="tsub"></span></span></button>' +
          '<div class="track recessed" data-track="' + i + '"><span class="fill"></span>' +
            [1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => '<span class="tick" style="bottom:calc(' + k * 10 + '% - 1px)"></span>').join('') +
            '<span class="pct"></span><span class="chev up">' + svg('up', 20, 2.4) + '</span><span class="chev dn">' + svg('down', 20, 2.4) + '</span></div>' +
        '</div>').join('') +
      '<div class="scenes">' + C.scenes.map((s, i) =>
        '<button class="scene glass p" id="scene' + i + '" data-act="scene" data-v="' + i + '"><span class="disc">' + svg(s.icon || 'star', 20) + '</span>' +
          '<span style="display:flex;flex-direction:column;gap:1px;min-width:0;max-width:100%"><span class="tname">' + esc(s.name) + '</span><span class="tsub">' + esc(s.sub || '') + '</span></span></button>').join('') + '</div>' +
    '</section>' +
    '<div class="row2">' +
      '<section class="ac glass card" aria-label="Air conditioning">' +
        '<div class="dial"><svg id="acsvg" width="146" height="146" viewBox="0 0 236 236"></svg>' +
          '<div class="mid"><span class="lbl">Target</span><span class="big" id="actarget"></span><span class="lbl" id="accur"></span></div></div>' +
        '<div class="acside">' +
          '<div class="actitle"><h2>' + esc(C.climate.name || 'Air con') + '</h2><span id="acstatus"></span></div>' +
          '<div class="acrow"><button class="chip p" id="acchip" data-act="acsheet"></button>' +
            '<button class="pwr small p" id="acpwr" data-act="acpower">' + svg('power', 22, 2.2) + '</button></div>' +
          '<div class="pm"><button class="small p" data-act="acstep" data-v="-1" aria-label="Lower target">' + svg('minus', 22, 2.4) + '</button>' +
            '<button class="small p" data-act="acstep" data-v="1" aria-label="Raise target">' + svg('plus', 22, 2.4) + '</button></div>' +
        '</div>' +
      '</section>' +
      '<section class="glance glass card" id="glance" aria-label="Network and servers at a glance"></section>' +
    '</div>' +
    '<section class="weather glass card" id="weather" aria-label="Weather"></section>';
  updateLights(); updateScenes(); updateAc(); renderWeather(); renderGlance(); refreshCams(true);
}

// ---------------------------------------------------------------- glance card (Starlink + Uptime Kuma)
function renderGlance() {
  const el = $('#glance'); if (!el) return;
  const down = Network.mbps(ctx, 'sl.down'), up = Network.mbps(ctx, 'sl.up');
  const ping = num('sl.ping'), drop = num('sl.drop');
  const f = (v) => (v == null ? '—' : v >= 100 ? Math.round(v) : v.toFixed(1));
  const ser = Network.glanceSeries();
  let spark = svg('network', 34, 1.5, 'var(--text-4)');
  if (ser && ser.length > 1) {
    const plan = (C.plan && C.plan.down) || 300, t0 = ser[0][0], t1 = ser[ser.length - 1][0];
    const Y = (v) => 42 - Math.min(v, plan * 1.3) / (plan * 1.3) * 38, X = (t) => (t - t0) / Math.max(1, t1 - t0) * 92;
    const line = ser.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join('');
    spark = '<svg width="92" height="44" viewBox="0 0 92 44" aria-hidden="true" style="flex:0 0 auto"><line x1="0" x2="92" y1="' + Y(plan).toFixed(1) + '" y2="' + Y(plan).toFixed(1) + '" stroke="rgba(127,169,238,0.45)" stroke-dasharray="2 3"/>' +
      '<path d="' + line + 'L92,44L0,44Z" fill="rgba(79,142,232,0.16)"/><path d="' + line + '" fill="none" stroke="#4F8EE8" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  }
  const k = Servers.summary();
  let srvV, srvS, srvCls = '', dots = svg('servers', 34, 1.5, 'var(--text-4)');
  if (k.ready) {
    srvV = k.up + '/' + k.total + '<span style="font-size:13px;color:var(--text-2)"> up</span>';
    srvS = k.down.length ? '<span class="bad">' + esc(k.down.map((m) => m.name).join(', ')) + ' down</span>' : 'All services healthy';
    dots = '<span class="dots">' + k.monitors.slice(0, 18).map((m) => '<i style="background:' + (m.status === 0 ? '#E8434A;box-shadow:0 0 8px rgba(232,67,74,0.7)' : m.status === 1 ? '#4CC38A' : '#F5C46B') + ';opacity:' + (m.status === 0 ? 1 : 0.8) + '"></i>').join('') + '</span>';
  } else { srvV = '—/—<span style="font-size:13px;color:var(--text-2)"> up</span>'; srvS = k.err === 'not configured' ? 'Uptime Kuma not configured' : k.err ? 'Uptime Kuma unreachable' : 'Loading…'; srvCls = ' pending'; }
  el.innerHTML =
    '<button class="gl p' + (down == null ? ' pending' : '') + '" data-act="page" data-v="network"><span style="flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px"><span class="k">Internet</span>' +
      '<span class="v"><span class="dn">↓</span> ' + f(down) + ' <span class="up">↑</span> ' + f(up) + '<span style="font-size:13px;color:var(--text-2)"> Mbps</span></span>' +
      '<span class="s">' + (ping != null ? 'Starlink ' + Math.round(ping) + ' ms' + (drop != null ? ' · drop ' + (drop < 1 ? drop.toFixed(2) : drop.toFixed(1)) + '%' : '') : 'Starlink') + '</span></span>' + spark + '</button>' +
    '<button class="gl p' + srvCls + '" data-act="page" data-v="servers"><span style="flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px"><span class="k">Servers</span>' +
      '<span class="v">' + srvV + '</span><span class="s" style="overflow:hidden;text-overflow:ellipsis">' + srvS + '</span></span>' + dots + '</button>';
}
function renderAlert() {
  const el = $('#alert'); if (!el) return;
  const k = Servers.summary();
  if (!k.ready || !k.down.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<button class="alert p" data-act="page" data-v="servers">' + svg('M12 7.5v5.5M12 16.5h.01', 22, 2, '#FF5C62', '') .replace('<path', '<circle cx="12" cy="12" r="9"></circle><path') +
    '<span>' + esc(k.down.length === 1 ? k.down[0].name + ' down' : k.down.length + ' services down') + '</span></button>';
}
async function pollKuma() {
  await Servers.poll(ctx);
  renderAlert();
  if (S.page === 'home') renderGlance();
  if (S.page === 'servers') Servers.render(ctx);
}
function loadPageData(force) {
  Network.load2h(ctx, force).then(() => { if (S.page === 'home') renderGlance(); });
  if (S.page === 'energy') Energy.load(ctx, force);
  if (S.page === 'network') Network.load(ctx, force);
}

// ---------------------------------------------------------------- lights
function lightView(i) {
  const cfg = C.lights[i], id = rid('light' + i), e = ent('light' + i);
  if (!e) return { missing: true, id: id || cfg.entity, label: S.conn === 'connected' ? 'Not found' : '…' };
  if (e.state === 'unavailable' || e.state === 'unknown') return { missing: true, id, label: 'Unavailable' };
  const a = e.attributes;
  const dimmable = (a.supported_color_modes || []).some((m) => m !== 'onoff') || a.brightness != null;
  let on = e.state === 'on';
  let level = on ? (a.brightness != null ? Math.max(10, Math.round(a.brightness / 255 * 10) * 10) : 100) : 0;
  if (on) S.lastLevel[id] = level;
  const p = S.pendingLight[id];
  if (p) {
    if (Date.now() > p.until || (p.on === on && (!on || Math.abs(p.level - level) <= 10))) delete S.pendingLight[id];
    else { on = p.on; level = p.level; }
  }
  return { id, on, level, dimmable };
}
function updateLights() {
  C.lights.forEach((cfg, i) => {
    const el = $('#light' + i); if (!el) return;
    const v = lightView(i);
    el.classList.toggle('missing', !!v.missing);
    el.classList.toggle('on', !!v.on);
    el.classList.toggle('noslider', !v.missing && !v.dimmable);
    const disc = $('.disc', el); disc.classList.toggle('accent', !!v.on);
    $('.tsub', el).textContent = v.missing ? v.label : (v.on ? (v.dimmable ? 'On · ' + v.level + '%' : 'On') : 'Off');
    const shown = v.on ? v.level : 0;
    const fill = $('.fill', el); fill.style.height = shown + '%'; fill.classList.toggle('full', shown >= 100);
    el.querySelectorAll('.tick').forEach((t, k) => t.classList.toggle('lit', (k + 1) * 10 <= shown));
    $('.pct', el).textContent = v.on ? v.level + '%' : '';
  });
}
let sendTimers = {};
function setLevel(i, v, immediate) {
  const id = rid('light' + i); const view = lightView(i);
  if (!id || view.missing) return;
  v = Math.max(0, Math.min(100, Math.round(v / 10) * 10));
  S.pendingLight[id] = { on: v > 0, level: v, until: Date.now() + 5000 };
  updateLights();
  const send = () => { sendTimers[id] = null; v > 0 ? call('light', 'turn_on', { brightness_pct: v }, id) : call('light', 'turn_off', {}, id); };
  clearTimeout(sendTimers[id]);
  if (immediate) send(); else sendTimers[id] = setTimeout(send, 250);
}
function toggleLight(i) {
  const id = rid('light' + i); const v = lightView(i);
  if (!id || v.missing) return;
  S.pendingLight[id] = v.on ? { on: false, level: 0, until: Date.now() + 5000 } : { on: true, level: S.lastLevel[id] || 50, until: Date.now() + 5000 };
  updateLights();
  call('light', v.on ? 'turn_off' : 'turn_on', {}, id);
}
// slider gestures: tap top/bottom half = ±10%, drag = set
let drag = null;
function trackDown(e, track) {
  drag = { i: +track.dataset.track, y0: e.clientY, moved: false, el: track, pid: e.pointerId };
}
function trackMove(e) {
  if (!drag) return;
  if (!drag.moved && Math.abs(e.clientY - drag.y0) < 6) return;
  if (!drag.moved) { drag.moved = true; try { drag.el.setPointerCapture(drag.pid); } catch (err) {} }
  const r = drag.el.getBoundingClientRect();
  setLevel(drag.i, (1 - (e.clientY - r.top) / r.height) * 100, false);
}
function trackUp(e) {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.moved) return;
  const r = d.el.getBoundingClientRect();
  const v = lightView(d.i); if (v.missing) return;
  const cur = v.on ? v.level : 0;
  setLevel(d.i, cur + (e.clientY < r.top + r.height / 2 ? 10 : -10), true);
}

// ---------------------------------------------------------------- scenes
function updateScenes() {
  C.scenes.forEach((s, i) => {
    const el = $('#scene' + i); if (!el) return;
    const missing = !S.res['scene' + i] || S.res['scene' + i].how === 'missing';
    const flash = S.sceneFlash[i] && Date.now() < S.sceneFlash[i];
    el.classList.toggle('missing', missing && S.conn === 'connected');
    el.classList.toggle('on', !!flash);
    $('.disc', el).classList.toggle('accent', !!flash);
    $('.tsub', el).textContent = missing && S.conn === 'connected' ? 'Not found' : (flash ? 'Done' : (s.sub || ''));
  });
}
function runScene(i) {
  const id = rid('scene' + i); if (!id || S.res['scene' + i].how === 'missing') return toast('“' + C.scenes[i].name + '” isn’t set up yet — see Settings → Diagnostics');
  const dom = id.split('.')[0];
  call(dom, 'turn_on', {}, id);
  S.sceneFlash[i] = Date.now() + 1600; updateScenes();
  setTimeout(updateScenes, 1700);
}

// ---------------------------------------------------------------- air con
const MODE_ORDER = ['off', 'cool', 'heat', 'heat_cool', 'auto', 'dry', 'fan_only'];
const MODE_LABEL = { off: 'Off', cool: 'Cool', heat: 'Heat', heat_cool: 'Auto', auto: 'Auto', dry: 'Dry', fan_only: 'Fan' };
const MODE_ICON = { off: 'off', cool: 'cool', heat: 'heat', heat_cool: 'auto', auto: 'auto', dry: 'dry', fan_only: 'fan' };
const ACTION_LABEL = { cooling: 'Cooling', heating: 'Heating', idle: 'Idle', off: 'Off', fan: 'Fan', drying: 'Drying', preheating: 'Preheating', defrosting: 'Defrosting' };
function acView() {
  const e = ent('climate');
  if (!e || e.state === 'unavailable') return null;
  const a = e.attributes;
  let mode = e.state, target = a.temperature;
  const p = S.pendingAc;
  if (p.mode !== undefined) { if (Date.now() > p.modeUntil || p.mode === mode) delete p.mode; else mode = p.mode; }
  if (p.target !== undefined) { if (Date.now() > p.targetUntil || p.target === target) delete p.target; else target = p.target; }
  if (e.state && e.state !== 'off' && e.state !== 'unavailable') localStorage.setItem(acLastKey, e.state);
  const modes = MODE_ORDER.filter((m) => (a.hvac_modes || ['off', 'cool', 'heat']).includes(m));
  let last = localStorage.getItem(acLastKey);
  if (!last || !modes.includes(last)) last = modes.includes('cool') ? 'cool' : (modes.find((m) => m !== 'off') || 'cool');
  return {
    mode, target: target != null ? +target : null, current: a.current_temperature, modes, last,
    min: a.min_temp != null ? +a.min_temp : 16, max: a.max_temp != null ? +a.max_temp : 30,
    step: a.target_temp_step || 0.5, action: a.hvac_action, fan: a.fan_mode, fans: a.fan_modes || []
  };
}
function updateAc() {
  const v = acView(); if (!$('#acsvg')) return;
  const on = v && v.mode !== 'off';
  const color = !v || v.mode === 'off' ? '#6B7385' : v.mode === 'heat' ? '#F28A4B' : v.mode === 'fan_only' ? '#9AA4B5' : '#5AA7F0';
  const MIN = v ? v.min : 16, MAX = v ? v.max : 30;
  const pol = (a, r) => { const rad = a * Math.PI / 180; return [118 + r * Math.cos(rad), 118 + r * Math.sin(rad)]; };
  const arc = (a0, a1, r) => { const p0 = pol(a0, r), p1 = pol(a1, r); return 'M' + p0[0].toFixed(1) + ',' + p0[1].toFixed(1) + ' A' + r + ',' + r + ' 0 ' + ((a1 - a0) > 180 ? 1 : 0) + ' 1 ' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1); };
  const ang = (t) => 135 + 270 * Math.max(0, Math.min(1, (t - MIN) / (MAX - MIN)));
  let g = '<path d="' + arc(135, 405, 100) + '" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="17" stroke-linecap="round"/>' +
          '<path d="' + arc(135, 405, 100) + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="17" stroke-linecap="round" transform="translate(0,-1)"/>';
  if (v && v.target != null) {
    g += '<path d="' + arc(135, Math.max(136, ang(v.target)), 100) + '" fill="none" stroke="' + color + '" stroke-width="17" stroke-linecap="round" opacity="' + (on ? 1 : 0.35) + '"/>';
    if (v.current != null) { const c = pol(ang(v.current), 100); g += '<circle cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" r="8" fill="#F2F2F2" stroke="#1A2130" stroke-width="3"/>'; }
    const t = pol(ang(v.target), 100); g += '<circle cx="' + t[0].toFixed(1) + '" cy="' + t[1].toFixed(1) + '" r="16" fill="#FFFFFF" stroke="' + color + '" stroke-width="3"/>';
  }
  $('#acsvg').innerHTML = g;
  $('#actarget').innerHTML = v && v.target != null ? v.target.toFixed(1) + '<span>°</span>' : '—';
  $('#accur').textContent = v && v.current != null ? 'Inside ' + (+v.current).toFixed(1) + '°' : '';
  $('#acstatus').textContent = !v ? (S.conn === 'connected' ? 'Not found' : '') : v.mode === 'off' ? 'Off' : (ACTION_LABEL[v.action] || MODE_LABEL[v.mode] || v.mode);
  const chip = $('#acchip');
  const iconMode = !v ? 'off' : v.mode === 'off' ? v.last : v.mode;
  chip.className = 'chip p ' + (on ? 'accent' : 'small') + (v ? '' : ' disabled');
  chip.innerHTML = svg(MODE_ICON[iconMode] || 'cool', 20) + '<span>' + (v ? MODE_LABEL[v.mode] || v.mode : '—') + '</span>' + svg('down', 16, 2.4);
  const pw = $('#acpwr');
  pw.className = 'pwr small p' + (on ? '' : ' off') + (v ? '' : ' disabled');
  pw.setAttribute('aria-label', on ? 'Turn air con off' : 'Turn air con on');
}
let acTimer = null;
function acStep(dir) {
  const v = acView(); if (!v || v.target == null) return;
  const t = Math.round(Math.max(v.min, Math.min(v.max, v.target + dir * v.step)) * 10) / 10;
  S.pendingAc.target = t; S.pendingAc.targetUntil = Date.now() + 6000;
  updateAc();
  clearTimeout(acTimer);
  acTimer = setTimeout(() => call('climate', 'set_temperature', { temperature: t }, rid('climate')), 700);
}
function acSetMode(m) {
  const v = acView(); if (!v) return;
  if (m !== 'off') localStorage.setItem(acLastKey, m);
  S.pendingAc.mode = m; S.pendingAc.modeUntil = Date.now() + 6000;
  updateAc();
  call('climate', 'set_hvac_mode', { hvac_mode: m }, rid('climate'));
}
function acPower() { const v = acView(); if (!v) return; acSetMode(v.mode === 'off' ? v.last : 'off'); }

// ---------------------------------------------------------------- weather
const COND = {
  'clear-night': ['moon', 'Clear', 'var(--text-2)'], cloudy: ['cloud', 'Cloudy', '#C2C2C8'], exceptional: ['cloud', 'Unusual conditions', '#C2C2C8'],
  fog: ['cloud', 'Fog', '#C2C2C8'], hail: ['rain', 'Hail', '#8FB8F5'], lightning: ['storm', 'Storms', '#F2B35B'], 'lightning-rainy': ['storm', 'Storms and rain', '#F2B35B'],
  partlycloudy: ['partly', 'Partly cloudy', '#E3C48A'], pouring: ['rain', 'Heavy rain', '#8FB8F5'], rainy: ['rain', 'Rain', '#8FB8F5'], snowy: ['rain', 'Snow', '#E9EDF5'],
  'snowy-rainy': ['rain', 'Sleet', '#8FB8F5'], sunny: ['sun', 'Sunny', '#F2B35B'], windy: ['cloud', 'Windy', '#C2C2C8'], 'windy-variant': ['cloud', 'Windy', '#C2C2C8']
};
const cond = (c) => COND[c] || ['cloud', c || '—', '#C2C2C8'];
function hourLabel(d) { const h = d.getHours(); return (h % 12 || 12) + (h < 12 ? ' am' : ' pm'); }
function rainOf(f) {
  if (f.precipitation_probability != null) return { txt: f.precipitation_probability ? Math.round(f.precipitation_probability) + '%' : '–', hi: f.precipitation_probability >= 30, wet: f.precipitation_probability >= 40 };
  if (f.precipitation != null) return { txt: f.precipitation >= 0.1 ? (+f.precipitation).toFixed(1) + ' mm' : '–', hi: f.precipitation >= 0.5, wet: f.precipitation >= 0.5 };
  return { txt: '–', hi: false, wet: false };
}
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
function renderWeather() {
  const el = $('#weather'); if (!el) return;
  const e = ent('weather');
  if (!e) { el.innerHTML = '<div class="wmsg">' + (S.conn === 'connected' ? 'Weather entity not found — see Settings → Diagnostics' : 'Connecting to Home Assistant…') + '</div>'; return; }
  const a = e.attributes, c = cond(e.state), unit = a.temperature_unit || '°C';
  const now = new Date(), todayKey = now.toDateString();
  const hourly = (S.hourly || []).filter((f) => new Date(f.datetime).getTime() > now.getTime() - 3600e3).slice(0, 12);
  const daily = S.daily || [];
  const today = daily.find((f) => new Date(f.datetime).toDateString() === todayKey);
  const next3 = daily.filter((f) => new Date(f.datetime).setHours(0, 0, 0, 0) > new Date(now).setHours(0, 0, 0, 0)).slice(0, 3);
  const meta = [];
  if (today && today.temperature != null) meta.push('H ' + Math.round(today.temperature) + '°' + (today.templow != null ? ' · L ' + Math.round(today.templow) + '°' : ''));
  if (hourly.length) { const wi = hourly.findIndex((f) => rainOf(f).wet); meta.push(wi < 0 ? 'no rain next 12 h' : wi === 0 ? 'rain now' : 'rain from ' + hourLabel(new Date(hourly[wi].datetime))); }
  if (a.wind_speed != null) meta.push('wind ' + Math.round(a.wind_speed) + ' ' + (a.wind_speed_unit || 'km/h') + (a.wind_bearing != null ? ' ' + COMPASS[Math.round(a.wind_bearing / 45) % 8] : ''));
  const feels = a.apparent_temperature != null ? ' · feels ' + Math.round(a.apparent_temperature) + '°' : (a.humidity != null ? ' · ' + Math.round(a.humidity) + '% humidity' : '');
  el.innerHTML =
    '<div class="wtop">' + svg(c[0], 78, 1.4, c[2]) +
      '<div class="wnow"><span class="wtemp">' + (a.temperature != null ? Math.round(a.temperature) : '—') + '°</span>' +
        '<span class="wcond">' + esc(c[1]) + feels + '</span><span class="wmeta">' + esc(meta.join(' · ')) + '</span></div>' +
      '<div class="days">' + next3.map((f) => { const r = rainOf(f), fc = cond(f.condition); return '<div class="day"><b>' + new Date(f.datetime).toLocaleDateString('en-AU', { weekday: 'short' }) + '</b>' + svg(fc[0], 30, 1.6, fc[2]) +
        '<span class="t">' + Math.round(f.temperature) + '°' + (f.templow != null ? ' <span>' + Math.round(f.templow) + '°</span>' : '') + '</span><span class="rain' + (r.hi ? ' hi' : '') + '">' + r.txt + '</span></div>'; }).join('') + '</div>' +
    '</div>' +
    '<div class="divider"></div>' +
    (hourly.length
      ? '<div class="hours" role="list" aria-label="Next 12 hours">' + hourly.map((f, i) => { const r = rainOf(f), fc = cond(f.condition); return '<div class="hour' + (i === 0 ? ' now' : '') + '" role="listitem"><span class="h">' + (i === 0 ? 'Now' : hourLabel(new Date(f.datetime))) + '</span>' + svg(fc[0], 24, 1.6, fc[2]) + '<span class="t">' + Math.round(f.temperature) + '°</span><span class="rain' + (r.hi ? ' hi' : '') + '">' + r.txt + '</span></div>'; }).join('') + '</div>'
      : '<div class="wmsg" style="flex:0 0 110px">' + (S.hourlyErr ? 'This weather entity has no hourly forecast' : 'Loading forecast…') + '</div>');
}

// ---------------------------------------------------------------- cameras
let camBusy = {};
function camUrl(key) { const e = ent(key); return e && e.state !== 'unavailable' && e.attributes.entity_picture ? e.attributes.entity_picture : null; }
function refreshCams(first) {
  if (S.page !== 'home' || document.visibilityState !== 'visible' || (S.overlay && S.overlay.cam !== undefined)) return;
  C.cameras.forEach((c, i) => {
    const img = $('#camimg' + i), msg = $('#cammsg' + i), live = $('#camlive' + i);
    if (!img) return;
    // Sub-stream snapshot, falling back to the main stream if the sub-stream entity is missing or unavailable.
    const url = camUrl('camStill' + i) || camUrl('camLive' + i);
    if (!url) {
      const e = ent('camStill' + i) || ent('camLive' + i);
      msg.textContent = S.conn !== 'connected' ? '' : e ? 'Camera unavailable in Home Assistant' : 'Camera not found';
      live.classList.add('stale'); return;
    }
    if (camBusy[i]) return;
    camBusy[i] = true;
    const pre = new Image();
    pre.onload = () => { camBusy[i] = false; img.src = pre.src; msg.textContent = ''; live.classList.remove('stale'); };
    pre.onerror = () => { camBusy[i] = false; live.classList.add('stale'); if (first || !img.src) msg.textContent = 'No image'; };
    pre.src = url + (url.includes('?') ? '&' : '?') + '_=' + Date.now();
  });
}
let fullTimer = null;
async function openCam(i) {
  S.overlay = { cam: i }; renderOverlay();
  const cam = C.cameras[i];
  const box = $('#fullmedia');
  const fallback = () => {
    box.innerHTML = '<img id="fullimg" alt="">';
    const tick = () => {
      if (!S.overlay || S.overlay.cam !== i) return;
      const url = camUrl('camLive' + i) || camUrl('camStill' + i);
      if (url) { const pre = new Image(); pre.onload = () => { const im = $('#fullimg'); if (im) im.src = pre.src; fullTimer = setTimeout(tick, 1000); }; pre.onerror = () => { fullTimer = setTimeout(tick, 2000); }; pre.src = url + '&_=' + Date.now(); }
      else fullTimer = setTimeout(tick, 2000);
    };
    tick();
  };
  const v = document.createElement('video');
  const canHls = v.canPlayType('application/vnd.apple.mpegurl') || v.canPlayType('application/x-mpegURL');
  const liveId = rid('camLive' + i);
  if (!canHls || !liveId || S.res['camLive' + i].how === 'missing') return fallback();
  try {
    const r = await ha.send({ type: 'camera/stream', entity_id: liveId });
    if (!S.overlay || S.overlay.cam !== i) return;
    v.muted = true; v.autoplay = true; v.playsInline = true; v.src = r.url;
    v.onerror = fallback;
    box.innerHTML = ''; box.appendChild(v);
    v.play().catch(() => {});
  } catch (e) { fallback(); }
}

// ---------------------------------------------------------------- overlays
function closeOverlay() { S.overlay = null; clearTimeout(fullTimer); renderOverlay(); refreshCams(); }
function renderOverlay() {
  const o = $('#overlay');
  if (!S.overlay) { o.innerHTML = ''; return; }
  if (S.overlay.cam !== undefined) {
    const c = C.cameras[S.overlay.cam];
    if (!$('#fullmedia')) o.innerHTML = '<div class="full"><div id="fullmedia"></div><div class="bar"><b>' + esc(c.name) + '</b><button class="close small p" data-act="close" aria-label="Close">' + svg('close', 22, 2.2) + '</button></div></div>';
    return;
  }
  if (S.overlay === 'ac') {
    const v = acView();
    if (!v) { closeOverlay(); return; }
    const scroll = o.querySelector('.sheet');
    o.innerHTML = '<div class="scrim" data-act="close"></div><section class="sheet bottom" role="dialog" aria-label="Air con options"' + (scroll ? ' style="animation:none"' : '') + '>' +
      '<div class="shead"><div><h2>' + esc(C.climate.name || 'Air con') + '</h2><div class="sub">' + esc((v.mode === 'off' ? 'Off' : (ACTION_LABEL[v.action] || MODE_LABEL[v.mode])) + (v.current != null ? ' · inside ' + (+v.current).toFixed(1) + '°' : '') + (v.target != null ? ' · target ' + v.target.toFixed(1) + '°' : '')) + '</div></div>' +
        '<button class="close small p" data-act="close" aria-label="Close">' + svg('close', 22, 2.2) + '</button></div>' +
      '<div class="modes" style="grid-template-columns:repeat(' + v.modes.length + ',minmax(0,1fr))">' + v.modes.map((m) =>
        '<button class="mode p ' + (v.mode === m ? 'accent' : 'small') + '" data-act="acmode" data-v="' + m + '" aria-pressed="' + (v.mode === m) + '">' + svg(MODE_ICON[m], 24) + '<span>' + MODE_LABEL[m] + '</span></button>').join('') + '</div>' +
      (v.fans.length ? '<div class="srow"><span>Fan speed</span><div class="seg recessed">' + v.fans.map((f) =>
        '<button class="p' + (v.fan === f ? ' accent' : '') + '" data-act="acfan" data-v="' + esc(f) + '">' + esc(f.charAt(0).toUpperCase() + f.slice(1)) + '</button>').join('') + '</div></div>' : '') +
      '</section>';
    return;
  }
  if (S.overlay === 'settings') {
    const diag = configEntries().map(([key, id, , label]) => {
      const r = S.res[key];
      const st = r && r.how !== 'missing' && S.ents[r.id] ? S.ents[r.id].state : null;
      const mark = !r ? ['…', ''] : r.how === 'missing' ? ['✗', 'bad'] : r.how === 'ok' ? ['✓', 'ok'] : ['≈', 'warn'];
      const note = !r ? '' : r.how === 'missing' ? 'not found: ' + id : r.how === 'ok' ? (st || '') : 'using ' + r.id + ' (by name) — update config.js';
      return '<div><span class="' + mark[1] + '">' + mark[0] + '</span><span><b style="color:var(--text);font-weight:500">' + esc(label) + '</b><br><code>' + esc(r ? r.id : id) + '</code></span><span>' + esc(note) + '</span></div>';
    }).join('');
    o.innerHTML = '<div class="scrim" data-act="close"></div><section class="sheet top" role="dialog" aria-label="Settings">' +
      '<div class="shead"><div><h2>Settings</h2><div class="sub">This tablet · v' + VERSION + (S.haVersion ? ' · Home Assistant ' + esc(S.haVersion) : '') + '</div></div>' +
        '<button class="close small p" data-act="close" aria-label="Close">' + svg('close', 22, 2.2) + '</button></div>' +
      '<div style="display:flex;flex-direction:column;gap:12px"><span style="font-size:17px;font-weight:500">Accent colour · ' + PALETTES[settings.theme][0] + '</span>' +
        '<div class="swatches">' + PALETTES.map((p, i) => '<button class="sw' + (settings.theme === i ? ' sel' : '') + '" data-act="theme" data-v="' + i + '" aria-label="' + p[0] + '" style="background:linear-gradient(180deg,' + p[2] + ',' + p[1] + ')"></button>').join('') + '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:12px"><div class="srow"><span>Edge depth</span><span class="muted" id="edgelbl">' + settings.edge + '%</span></div>' +
        '<input class="range" id="edge" type="range" min="0" max="100" step="5" value="' + settings.edge + '" aria-label="Edge depth">' +
        '<div class="srow"><span class="muted">Flat</span><span class="muted">Domed</span></div></div>' +
      '<div class="srow"><span>Return to Home after</span><div class="seg recessed">' + [[60, '1 min'], [120, '2 min'], [300, '5 min']].map(([s, l]) =>
        '<button class="p' + (settings.homeAfter === s ? ' accent' : '') + '" data-act="homeafter" data-v="' + s + '">' + l + '</button>').join('') + '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:10px"><span style="font-size:17px;font-weight:500">Diagnostics · Home Assistant ' + (S.conn === 'connected' ? '<span style="color:#4CC38A">connected</span>' : '<span style="color:#FF8A8E">' + S.conn + '</span>') + '</span>' +
        '<div class="diag">' + diag + '</div></div>' +
      '<div class="btnrow"><button class="pill small p" data-act="reload">Reload panel</button><button class="pill small p" data-act="signout">Sign out of Home Assistant</button></div>' +
      '</section>';
    const r = $('#edge');
    r.addEventListener('input', () => { settings.edge = +r.value; $('#edgelbl').textContent = r.value + '%'; applyTheme(); saveSettings(); });
  }
}

// ---------------------------------------------------------------- toast
let toastTimer = null;
function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.innerHTML = '<div class="toast">' + esc(msg) + '</div>';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.innerHTML = ''; }, 3500);
}

// ---------------------------------------------------------------- input
function bindInput() {
  const root = $('#root');
  const pressed = new Set();
  const release = () => { for (const el of pressed) el.classList.remove('down'); pressed.clear(); };
  root.addEventListener('pointerdown', (e) => {
    S.lastInteract = Date.now();
    const track = e.target.closest('.track');
    if (track) { if (!track.closest('.light').classList.contains('missing')) trackDown(e, track); return; }
    const el = e.target.closest('.head') ? e.target.closest('.light') : e.target.closest('.p');
    if (el) { el.classList.add('down'); pressed.add(el); }
  });
  root.addEventListener('pointermove', trackMove);
  root.addEventListener('pointerup', trackUp);
  root.addEventListener('pointercancel', () => { drag = null; });
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', release, true);
  window.addEventListener('blur', release);
  root.addEventListener('contextmenu', (e) => e.preventDefault());

  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]'); if (!el) return;
    const v = el.dataset.v;
    switch (el.dataset.act) {
      case 'page': if (v !== S.page) setPage(v); break;
      case 'settings': S.overlay = 'settings'; renderOverlay(); break;
      case 'close': closeOverlay(); break;
      case 'toggle': toggleLight(+v); break;
      case 'scene': runScene(+v); break;
      case 'cam': openCam(+v); break;
      case 'acsheet': if (acView()) { S.overlay = 'ac'; renderOverlay(); } break;
      case 'acpower': acPower(); break;
      case 'acstep': acStep(+v); break;
      case 'acmode': acSetMode(v); closeOverlay(); break;
      case 'acfan': call('climate', 'set_fan_mode', { fan_mode: v }, rid('climate')); break;
      case 'theme': settings.theme = +v; saveSettings(); applyTheme(); renderOverlay(); break;
      case 'homeafter': settings.homeAfter = +v; saveSettings(); renderOverlay(); break;
      case 'enview': Energy.setView(ctx, v); break;
      case 'netwin': Network.setWin(ctx, v); break;
      case 'reload': location.reload(); break;
      case 'signout': ha.signOut(); break;
    }
  });
}

// ---------------------------------------------------------------- timers
function startTimers() {
  setInterval(renderClock, 5000);
  setInterval(() => refreshCams(), C.cameraRefreshMs || 2000);
  setInterval(() => {
    if ((S.page !== 'home' || S.overlay) && Date.now() - S.lastInteract > settings.homeAfter * 1000) {
      if (S.overlay) closeOverlay();
      if (S.page !== 'home') setPage('home');
    }
    if (S.page === 'home') { updateLights(); updateAc(); }   // expire stale optimistic state
  }, 5000);
  setInterval(() => { if (S.page === 'home') renderWeather(); }, 5 * 60 * 1000); // roll the hourly strip forward
  setInterval(pollKuma, 60 * 1000); pollKuma();
  setInterval(() => loadPageData(false), 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { S.lastInteract = 0; refreshCams(true); } });
}

// ---------------------------------------------------------------- boot
async function boot() {
  applyTheme(); fit(); window.addEventListener('resize', fit);
  renderShell(); renderPage(); bindInput(); startTimers();
  try { await ha.init(); } catch (e) { toast('Sign-in failed: ' + e.message); }
  ha.connect();
}
boot();
