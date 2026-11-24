// Mock Home Assistant for local testing of the panel (no dependencies).
// Serves ../app, fakes HA's login redirect, /auth/token, /api/camera_proxy and the
// WebSocket API. Run: node test/mock-ha.mjs  → open http://localhost:8765/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const PORT = +(process.env.PORT || 8765);
const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const now = Date.now();
const iso = (h) => new Date(now + h * 3600e3).toISOString();

const states = {
  'light.dining_lights': { s: 'on', a: { friendly_name: 'Dining Lights', brightness: 204, supported_color_modes: ['brightness'] } },
  'light.lounge_lights': { s: 'off', a: { friendly_name: 'Lounge Lights', supported_color_modes: ['brightness'] } },
  'light.living_room_lamp': { s: 'on', a: { friendly_name: 'Living Room Lamp', brightness: 102, supported_color_modes: ['color_temp'] } },
  'light.display_cabinet': { s: 'off', a: { friendly_name: 'Display', supported_color_modes: ['brightness'] } },
  'scene.theater': { s: '2026-11-24T08:00:00+00:00', a: { friendly_name: 'Theater' } },
  'script.house_off': { s: 'off', a: { friendly_name: 'House Off' } },
  'climate.lounge_ac': { s: 'cool', a: { friendly_name: 'Lounge AC', hvac_modes: ['off', 'cool', 'heat', 'dry', 'fan_only', 'heat_cool'], fan_modes: ['auto', 'low', 'medium', 'high'], fan_mode: 'auto', min_temp: 16, max_temp: 30, target_temp_step: 0.5, current_temperature: 24.5, temperature: 22, hvac_action: 'cooling' } },
  'weather.forecast_home': { s: 'partlycloudy', a: { friendly_name: 'Forecast Home', temperature: 24.2, temperature_unit: '°C', humidity: 58, wind_speed: 18.4, wind_speed_unit: 'km/h', wind_bearing: 315 } },
  'camera.vigi_c450_minorstream': { s: 'idle', a: { friendly_name: 'Entry sub', entity_picture: '/api/camera_proxy/camera.vigi_c450_minorstream?token=abc' } },
  'camera.vigi_c450_mainstream': { s: 'idle', a: { friendly_name: 'Entry main', entity_picture: '/api/camera_proxy/camera.vigi_c450_mainstream?token=abc' } },
  'camera.vigi_c540_minorstream': { s: 'idle', a: { friendly_name: 'Drive sub', entity_picture: '/api/camera_proxy/camera.vigi_c540_minorstream?token=abc' } },
  'camera.vigi_c540_mainstream': { s: 'idle', a: { friendly_name: 'Drive main', entity_picture: '/api/camera_proxy/camera.vigi_c540_mainstream?token=abc' } },
  'sensor.other': { s: '1', a: { friendly_name: 'Something else' } }
};
const conds = ['sunny', 'sunny', 'partlycloudy', 'partlycloudy', 'cloudy', 'cloudy', 'rainy', 'pouring', 'rainy', 'cloudy', 'cloudy', 'cloudy', 'clear-night', 'clear-night'];
const hourly = conds.map((c, i) => ({ datetime: iso(i), condition: c, temperature: 24 + Math.round(4 * Math.sin(i / 3)) - (i > 6 ? i - 6 : 0), precipitation: [0, 0, 0, 0, 0.2, 0.3, 2.1, 4.5, 1.2, 0.4, 0, 0, 0, 0][i] }));
const daily = [0, 1, 2, 3].map((d) => ({ datetime: iso(d * 24), condition: ['partlycloudy', 'rainy', 'partlycloudy', 'sunny'][d], temperature: [28, 21, 23, 26][d], templow: [14, 13, 12, 14][d], precipitation: [3.2, 6, 0.4, 0][d] }));

// ---- tiny WebSocket server framing
function wsSend(sock, obj) {
  const data = Buffer.from(JSON.stringify(obj));
  let head;
  if (data.length < 126) head = Buffer.from([0x81, data.length]);
  else if (data.length < 65536) { head = Buffer.alloc(4); head[0] = 0x81; head[1] = 126; head.writeUInt16BE(data.length, 2); }
  else { head = Buffer.alloc(10); head[0] = 0x81; head[1] = 127; head.writeBigUInt64BE(BigInt(data.length), 2); }
  sock.write(Buffer.concat([head, data]));
}
function wsFrames(buf) {
  const out = []; let off = 0;
  while (off + 2 <= buf.length) {
    const op = buf[off] & 0x0f; let len = buf[off + 1] & 0x7f; let p = off + 2;
    if (len === 126) { len = buf.readUInt16BE(p); p += 2; } else if (len === 127) { len = Number(buf.readBigUInt64BE(p)); p += 8; }
    const mask = buf.slice(p, p + 4); p += 4;
    if (p + len > buf.length) break;
    const payload = Buffer.alloc(len); for (let i = 0; i < len; i++) payload[i] = buf[p + i] ^ mask[i % 4];
    out.push({ op, text: payload.toString() }); off = p + len;
  }
  return { out, rest: buf.slice(off) };
}

const clients = new Set();
function compressed(id) { return { s: states[id].s, a: states[id].a, c: '', lc: 0 }; }
function push(id, plus) { for (const c of clients) if (c.entSub && c.entIds.includes(id)) wsSend(c.sock, { id: c.entSub, type: 'event', event: { c: { [id]: { '+': plus } } } }); }
function setState(id, s, attrs) { const st = states[id]; if (s !== undefined) st.s = s; if (attrs) Object.assign(st.a, attrs); push(id, Object.assign(s !== undefined ? { s } : {}, attrs ? { a: attrs } : {})); }

function handle(c, m) {
  const ok = (result) => wsSend(c.sock, { id: m.id, type: 'result', success: true, result: result === undefined ? null : result });
  switch (m.type) {
    case 'auth': return wsSend(c.sock, { type: 'auth_ok', ha_version: '2026.11.2 (mock)' });
    case 'ping': return wsSend(c.sock, { id: m.id, type: 'pong' });
    case 'get_states': return ok(Object.entries(states).map(([entity_id, v]) => ({ entity_id, state: v.s, attributes: v.a })));
    case 'subscribe_entities': {
      c.entSub = m.id; c.entIds = m.entity_ids || Object.keys(states); ok();
      const a = {}; for (const id of c.entIds) if (states[id]) a[id] = compressed(id);
      return wsSend(c.sock, { id: m.id, type: 'event', event: { a } });
    }
    case 'weather/subscribe_forecast': ok(); return setTimeout(() => wsSend(c.sock, { id: m.id, type: 'event', event: { type: m.forecast_type, forecast: m.forecast_type === 'hourly' ? hourly : daily } }), 150);
    case 'camera/stream': return wsSend(c.sock, { id: m.id, type: 'result', success: false, error: { code: 'unknown', message: 'no stream in mock' } });
    case 'call_service': {
      ok({ context: {} });
      const id = m.target && m.target.entity_id; const d = m.service_data || {};
      console.log('call_service', m.domain + '.' + m.service, id || '', JSON.stringify(d));
      setTimeout(() => {
        if (m.domain === 'light') {
          if (m.service === 'turn_off') setState(id, 'off', { brightness: null });
          else if (m.service === 'turn_on') setState(id, 'on', { brightness: d.brightness_pct != null ? Math.round(d.brightness_pct * 2.55) : (states[id].a.brightness || 128) });
          else if (m.service === 'toggle') states[id].s === 'on' ? setState(id, 'off', { brightness: null }) : setState(id, 'on', { brightness: 128 });
        }
        if (m.domain === 'climate') {
          if (m.service === 'set_hvac_mode') setState(id, d.hvac_mode, { hvac_action: d.hvac_mode === 'off' ? 'off' : 'cooling' });
          if (m.service === 'set_temperature') setState(id, undefined, { temperature: d.temperature });
          if (m.service === 'set_fan_mode') setState(id, undefined, { fan_mode: d.fan_mode });
        }
        if (m.domain === 'script' && id === 'script.house_off') { for (const l of Object.keys(states).filter((k) => k.startsWith('light.'))) setState(l, 'off', { brightness: null }); setState('climate.lounge_ac', 'off', { hvac_action: 'off' }); }
      }, 300);
      return;
    }
    default: return ok();
  }
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (u.pathname === '/auth/authorize') { res.writeHead(302, { Location: u.searchParams.get('redirect_uri') + '?code=mockcode&state=hcp' }); return res.end(); }
  if (u.pathname === '/auth/token' && req.method === 'POST') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ access_token: 'acc', refresh_token: 'ref', expires_in: 1800, token_type: 'Bearer' })); }
  if (u.pathname.startsWith('/api/camera_proxy/')) {
    const hue = u.pathname.includes('c450') ? '#2A3C55' : '#3B4A66', t = new Date().toLocaleTimeString();
    res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
    return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + hue + '"/><stop offset="1" stop-color="#1C2019"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><text x="620" y="40" fill="#fff" font-family="monospace" font-size="20" text-anchor="end">' + t + '</text></svg>');
  }
  let p = u.pathname === '/' ? '/index.html' : u.pathname;
  if (p === '/config.js') {
    const cfgFile = fs.existsSync(path.join(APP, 'config.js')) ? 'config.js' : 'config.example.js';
    const cfg = fs.readFileSync(path.join(APP, cfgFile), 'utf8').replace(/haUrl: '[^']*'/, "haUrl: 'http://localhost:" + PORT + "'");
    res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(cfg);
  }
  const f = path.join(APP, path.normalize(p));
  if (!f.startsWith(APP) || !fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
server.on('upgrade', (req, sock) => {
  const accept = crypto.createHash('sha1').update(req.headers['sec-websocket-key'] + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  const c = { sock, entSub: null, entIds: [] }; clients.add(c);
  let buf = Buffer.alloc(0);
  sock.on('data', (d) => { buf = Buffer.concat([buf, d]); const r = wsFrames(buf); buf = r.rest; for (const f of r.out) { if (f.op === 8) return sock.end(); if (f.op === 1) handle(c, JSON.parse(f.text)); } });
  sock.on('close', () => clients.delete(c)); sock.on('error', () => clients.delete(c));
  wsSend(sock, { type: 'auth_required', ha_version: '2026.11.2' });
});
server.listen(PORT, () => console.log('Mock HA + panel on http://localhost:' + PORT + '/'));
