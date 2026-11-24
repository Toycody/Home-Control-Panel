// Servers page + shared Uptime Kuma state. Reads the public status-page JSON that Kuma
// already serves for your status page, through the nginx proxy at /kuma/ (same-origin).

const K = { monitors: null, at: 0, err: null };

export async function poll(ctx) {
  const slug = ctx.C.kuma && ctx.C.kuma.slug;
  if (!slug) { K.err = 'not configured'; return; }
  try {
    const [page, beats] = await Promise.all([
      fetch('/kuma/api/status-page/' + encodeURIComponent(slug), { cache: 'no-store' }).then(okJson),
      fetch('/kuma/api/status-page/heartbeat/' + encodeURIComponent(slug), { cache: 'no-store' }).then(okJson)
    ]);
    const list = [];
    for (const g of page.publicGroupList || []) for (const m of g.monitorList || []) {
      const hb = (beats.heartbeatList || {})[m.id] || [];
      const last = hb[hb.length - 1];
      list.push({ id: m.id, name: m.name, group: g.name, beats: hb.slice(-24), status: last ? last.status : null, ping: last ? last.ping : null,
        msg: last ? last.msg : '', since: sinceChange(hb), uptime: (beats.uptimeList || {})[m.id + '_24'] });
    }
    K.monitors = list; K.at = Date.now(); K.err = null;
  } catch (e) { K.err = e.message; }
}
function okJson(r) { if (!r.ok) throw new Error('Uptime Kuma ' + r.status); return r.json(); }
function sinceChange(hb) {
  if (!hb.length) return null;
  const st = hb[hb.length - 1].status; let i = hb.length - 1;
  while (i > 0 && hb[i - 1].status === st) i--;
  return Date.parse(String(hb[i].time).replace(' ', 'T') + (/[zZ+]/.test(String(hb[i].time).slice(10)) ? '' : 'Z'));
}
// 0 = down, 1 = up, 2 = pending, 3 = maintenance
export function summary() {
  if (!K.monitors) return { ready: false, err: K.err };
  const down = K.monitors.filter((m) => m.status === 0);
  return { ready: true, err: K.err, total: K.monitors.length, up: K.monitors.filter((m) => m.status === 1).length, down, monitors: K.monitors };
}

const COL = { 0: '#E8434A', 1: '#4CC38A', 2: '#F5C46B', 3: '#6E86A3' };
const ago = (t) => { if (!t) return ''; const m = Math.round((Date.now() - t) / 60e3); return m < 60 ? m + ' min' : m < 1440 ? Math.round(m / 60) + ' h' : Math.round(m / 1440) + ' d'; };

export function render(ctx) {
  const s = summary();
  if (!s.ready) {
    ctx.$('#main').innerHTML = '<section class="glass card soon">' + ctx.svg('servers', 44, 1.6, 'var(--text-2)') + '<h2>Servers</h2><p>' +
      (s.err === 'not configured' ? 'Uptime Kuma isn’t configured yet. Add <code>kuma.slug</code> to config.js and the Kuma address to the installer.' : s.err ? 'Can’t reach Uptime Kuma: ' + ctx.esc(s.err) : 'Loading Uptime Kuma…') + '</p></section>';
    return;
  }
  const ups = s.monitors.map((m) => m.uptime).filter((v) => v != null);
  const avgUp = ups.length ? ups.reduce((a, b) => a + b, 0) / ups.length : null;
  ctx.$('#main').innerHTML =
    '<section class="now3">' +
      sumCard('Up', s.up + '<span>/' + s.total + '</span>', 'services responding', '#4CC38A') +
      sumCard('Down', String(s.down.length), s.down.length ? s.down.map((m) => m.name).join(', ') : 'all clear', s.down.length ? '#E8434A' : '#8A8A90') +
      sumCard('Uptime 24 h', avgUp == null ? '—' : (avgUp * 100).toFixed(2) + '<span>%</span>', 'average across services', null) +
    '</section>' +
    '<section class="glass card pcard" style="flex:1 1 auto;min-height:0"><div class="phead"><div><h2>Monitors</h2><div class="psub">Uptime Kuma · updated ' + new Date(K.at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }) + ' · last 24 checks</div></div></div>' +
      '<div class="mons noscroll">' + s.monitors.slice().sort((a, b) => (a.status === 0 ? -1 : 0) - (b.status === 0 ? -1 : 0)).map((m) =>
        '<div class="mon"><i class="dot" style="background:' + (COL[m.status] || '#7A7A80') + (m.status === 0 ? ';box-shadow:0 0 10px rgba(232,67,74,0.7)' : '') + '"></i>' +
          '<div class="mn"><b>' + ctx.esc(m.name) + '</b><span>' + ctx.esc(m.group) + (m.status === 0 ? ' · <em>down ' + ago(m.since) + '</em>' : m.ping != null ? ' · ' + m.ping + ' ms' : '') + '</span></div>' +
          '<div class="beats">' + m.beats.map((b) => '<i style="background:' + (COL[b.status] || '#3A3A40') + (b.status === 0 ? ';height:26px' : '') + '"></i>').join('') + '</div>' +
          '<div class="mu" style="color:' + (m.uptime == null ? '#8A8A90' : m.uptime < 0.95 ? '#FF8A8E' : m.uptime < 0.997 ? '#F5C46B' : '#F2F2F2') + '">' + (m.uptime == null ? '—' : (m.uptime * 100).toFixed(m.uptime === 1 ? 0 : 1) + '%') + '</div></div>').join('') +
      '</div></section>';
}
function sumCard(label, value, sub, color) {
  return '<div class="glass card ncard"><span class="nl">' + (color ? '<i style="background:' + color + '"></i>' : '') + label + '</span><span class="nv">' + value + '</span><span class="ns" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + sub + '</span></div>';
}
