// Small SVG time-series chart with a touch crosshair. No dependencies.
//
// lineChart(el, opts)
//   opts.series: [{ name, color, points: [[t(ms), v]...], area?: bool, unit? }]
//   opts.width, opts.height, opts.yMax?, opts.yUnit, opts.refLines: [{ v, color, label }]
//   opts.xTicks: [[t, label]...], opts.fmt(v) for tooltip values, opts.timeFmt(t)

const NS = 'http://www.w3.org/2000/svg';

// Round axis: 3–5 gridlines on 1/2/5 steps.
export function niceScale(v) {
  if (!(v > 0)) return { max: 1, step: 0.25, n: 4 };
  for (const e of [Math.floor(Math.log10(v / 5)), Math.floor(Math.log10(v / 5)) + 1]) {
    for (const m of [1, 2, 2.5, 5]) { const step = m * Math.pow(10, e); const n = Math.ceil(v / step - 1e-9); if (n <= 5) return { max: n * step, step, n: Math.max(n, 1) }; }
  }
  return { max: v, step: v / 4, n: 4 };
}

export function lineChart(el, o) {
  const W = o.width, H = o.height, L = 46, R = 10, T = 20, B = 26;
  const all = o.series.flatMap((s) => s.points);
  const t0 = o.t0 != null ? o.t0 : Math.min(...all.map((p) => p[0]));
  const t1 = o.t1 != null ? o.t1 : Math.max(...all.map((p) => p[0]));
  const dataMax = Math.max(0, ...all.map((p) => p[1]).filter((v) => v != null), ...(o.refLines || []).map((r) => r.v));
  const sc = niceScale(o.yMax || dataMax * 1.04), yMax = sc.max;
  const X = (t) => L + (t1 > t0 ? (t - t0) / (t1 - t0) : 0) * (W - L - R);
  const Y = (v) => H - B - (v / yMax) * (H - B - T);

  const path = (pts) => {
    let d = '', pen = false;
    for (const [t, v] of pts) {
      if (v == null || isNaN(v)) { pen = false; continue; }
      d += (pen ? 'L' : 'M') + X(t).toFixed(1) + ',' + Y(v).toFixed(1); pen = true;
    }
    return d;
  };
  let g = '';
  for (let i = 0; i <= sc.n; i++) {
    const v = sc.step * i, y = Y(v).toFixed(1);
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="rgba(255,255,255,' + (i ? 0.06 : 0.14) + ')" stroke-width="1"/>';
    g += '<text x="' + (L - 8) + '" y="' + (+y + 4) + '" text-anchor="end" font-size="12" fill="#8A8A90">' + fmtAxis(v) + '</text>';
  }
  if (o.yUnit) g += '<text x="' + L + '" y="9" font-size="11" fill="#7A7A80">' + o.yUnit + '</text>';
  for (const [t, label, anchor] of o.xTicks || []) g += '<text x="' + X(t).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (anchor || 'middle') + '" font-size="12" fill="#8A8A90">' + label + '</text>';
  for (const r of o.refLines || []) {
    const y = Y(r.v).toFixed(1);
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="' + r.color + '" stroke-opacity="0.55" stroke-width="1.5" stroke-dasharray="2 5" stroke-linecap="round"/>';
    if (r.label) g += '<text x="' + (W - R - 4) + '" y="' + (+y - 6) + '" text-anchor="end" font-size="12" fill="' + r.color + '" fill-opacity="0.8">' + r.label + '</text>';
  }
  for (const s of o.series) {
    const d = path(s.points);
    if (!d) continue;
    if (s.area) {
      // area under each contiguous run
      for (const run of d.split('M').filter(Boolean)) {
        const pts = run.split('L'); const first = pts[0].split(','), last = pts[pts.length - 1].split(',');
        g += '<path d="M' + run + 'L' + last[0] + ',' + Y(0).toFixed(1) + 'L' + first[0] + ',' + Y(0).toFixed(1) + 'Z" fill="' + s.color + '" fill-opacity="0.14"/>';
      }
    }
    g += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
  }
  g += '<g class="xh" style="display:none"><line y1="' + T + '" y2="' + (H - B) + '" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>' +
    o.series.map((s) => '<circle r="5" fill="' + s.color + '" stroke="#16171A" stroke-width="2"/>').join('') + '</g>';
  el.innerHTML = '<div style="position:relative"><svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" style="touch-action:none">' + g +
    '<rect x="' + L + '" y="0" width="' + (W - L - R) + '" height="' + (H - B) + '" fill="transparent"/></svg><div class="tip" style="display:none"></div></div>';

  // crosshair
  const svgEl = el.querySelector('svg'), xh = el.querySelector('.xh'), tip = el.querySelector('.tip');
  const nearest = (pts, t) => { let best = null, bd = Infinity; for (const p of pts) { const dd = Math.abs(p[0] - t); if (dd < bd && p[1] != null) { bd = dd; best = p; } } return best; };
  const show = (clientX) => {
    const r = svgEl.getBoundingClientRect(); const sx = (clientX - r.left) * (W / r.width);
    const t = t0 + Math.max(0, Math.min(1, (sx - L) / (W - L - R))) * (t1 - t0);
    const ref = nearest(o.series[0].points, t); if (!ref) return;
    const x = X(ref[0]);
    xh.style.display = ''; xh.querySelector('line').setAttribute('x1', x); xh.querySelector('line').setAttribute('x2', x);
    const rows = o.series.map((s, i) => { const p = nearest(s.points, ref[0]); const c = xh.querySelectorAll('circle')[i]; if (p) { c.setAttribute('cx', X(p[0])); c.setAttribute('cy', Y(p[1])); c.style.display = ''; } else c.style.display = 'none'; return p ? '<div><i style="background:' + s.color + '"></i>' + s.name + ' <b>' + (o.fmt ? o.fmt(p[1], s) : p[1]) + '</b></div>' : ''; });
    tip.innerHTML = '<div class="tt">' + (o.timeFmt ? o.timeFmt(ref[0]) : new Date(ref[0]).toLocaleTimeString()) + '</div>' + rows.join('');
    tip.style.display = '';
    const left = x * (r.width / W);
    tip.style.left = Math.max(0, Math.min(r.width - 190, left + (left > r.width / 2 ? -200 : 12))) + 'px';
  };
  const hide = () => { xh.style.display = 'none'; tip.style.display = 'none'; };
  svgEl.addEventListener('pointerdown', (e) => { show(e.clientX); });
  svgEl.addEventListener('pointermove', (e) => { if (e.buttons || e.pointerType === 'mouse') show(e.clientX); });
  svgEl.addEventListener('pointerleave', hide);
  svgEl.addEventListener('pointerup', () => setTimeout(hide, 2500));
}

function fmtAxis(v) { return v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : (Math.round(v * 100) / 100).toString(); }

// Grouped bar chart: groups [{label, values:[v...], note?}], colors per series.
export function barChart(el, o) {
  const W = o.width, H = o.height, L = 40, R = 6, T = 26, B = 30;
  const sc = niceScale(Math.max(0.1, ...o.groups.flatMap((g) => g.values.filter((v) => v != null))) * 1.04), max = sc.max;
  const n = o.groups.length, gw = (W - L - R) / Math.max(1, n), bw = Math.min(26, (gw - 10) / o.colors.length);
  const Y = (v) => H - B - (v / max) * (H - B - T);
  let g = '';
  for (let i = 0; i <= sc.n; i++) { const v = sc.step * i, y = Y(v).toFixed(1); g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '" stroke="rgba(255,255,255,' + (i ? 0.06 : 0.14) + ')"/><text x="' + (L - 8) + '" y="' + (+y + 4) + '" text-anchor="end" font-size="12" fill="#8A8A90">' + fmtAxis(v) + '</text>'; }
  if (o.yUnit) g += '<text x="' + L + '" y="9" font-size="11" fill="#7A7A80">' + o.yUnit + '</text>';
  o.groups.forEach((grp, gi) => {
    const cx = L + gi * gw + gw / 2, sel = o.selected === gi;
    if (sel) g += '<rect x="' + (L + gi * gw + 2) + '" y="' + (T - 16) + '" width="' + (gw - 4) + '" height="' + (H - T - B + 16 + 24) + '" rx="10" fill="rgba(255,255,255,0.06)"/>';
    grp.values.forEach((v, si) => {
      if (v == null) return;
      const x = cx - (bw * o.colors.length + 2 * (o.colors.length - 1)) / 2 + si * (bw + 2), y = Y(v), h = Math.max(0, H - B - y);
      g += '<path d="M' + x.toFixed(1) + ',' + (H - B) + 'V' + (y + Math.min(4, h)).toFixed(1) + 'q0,-4 4,-4h' + (bw - 8).toFixed(1) + 'q4,0 4,4V' + (H - B) + 'Z" fill="' + o.colors[si] + '"' + (sel || o.selected == null ? '' : ' fill-opacity="0.7"') + '/>';
    });
    g += '<text x="' + cx.toFixed(1) + '" y="' + (H - 9) + '" text-anchor="middle" font-size="12" fill="' + (sel ? '#F2F2F2' : '#8A8A90') + '"' + (sel ? ' font-weight="600"' : '') + '>' + grp.label + '</text>';
    g += '<rect data-bar="' + gi + '" x="' + (L + gi * gw) + '" y="0" width="' + gw + '" height="' + H + '" fill="transparent"/>';
  });
  el.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + g + '</svg>';
  if (o.onPick) el.querySelectorAll('[data-bar]').forEach((r) => r.addEventListener('click', () => o.onPick(+r.dataset.bar)));
}
