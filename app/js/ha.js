// Minimal Home Assistant client: login (HA's OAuth flow), token refresh, and the
// WebSocket API with auto-reconnect. No dependencies.
//
// The panel is served by nginx, which proxies /api/ and /auth/token to Home Assistant,
// so every request here is same-origin (no CORS config needed in HA).

const LS_KEY = 'hcp.auth';

export class HAClient {
  constructor(haUrl) {
    this.haUrl = String(haUrl || '').replace(/\/+$/, '');
    this.ws = null;
    this.nextId = 1;
    this.pending = new Map();   // id -> {resolve, reject}
    this.subs = new Map();      // id -> callback
    this.connected = false;
    this.backoff = 0;
    this.onConnect = null;      // called after each (re)connect + auth
    this.onStatus = null;       // (status: 'connecting'|'connected'|'disconnected', detail)
    this.pingTimer = null;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.connected && !this.ws) this.connect();
    });
  }

  clientId() { return location.origin + '/'; }

  loadTokens() { try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { return null; } }
  saveTokens(t) { localStorage.setItem(LS_KEY, JSON.stringify(t)); }
  signOut() { localStorage.removeItem(LS_KEY); this.login(); }

  login() {
    const cid = encodeURIComponent(this.clientId());
    location.href = this.haUrl + '/auth/authorize?response_type=code&client_id=' + cid + '&redirect_uri=' + cid + '&state=hcp';
    return new Promise(() => {}); // never resolves; the page is navigating away
  }

  // Call once on page load. Completes the login redirect if we're returning from HA.
  async init() {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (code) {
      history.replaceState(null, '', location.pathname);
      const t = await this.tokenRequest({ grant_type: 'authorization_code', code, client_id: this.clientId() });
      this.saveTokens(t);
    }
    if (!this.loadTokens()) await this.login();
  }

  async tokenRequest(params) {
    const r = await fetch('/auth/token', { method: 'POST', body: new URLSearchParams(params) });
    if (!r.ok) { const e = new Error('Token request failed: ' + r.status); e.status = r.status; throw e; }
    const j = await r.json();
    return {
      access: j.access_token,
      refresh: j.refresh_token || params.refresh_token,
      exp: Date.now() + Math.max(60, (j.expires_in || 1800) - 60) * 1000
    };
  }

  async accessToken(force) {
    let t = this.loadTokens();
    if (!t) return this.login();
    if (force || Date.now() > t.exp) {
      try {
        t = await this.tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh, client_id: this.clientId() });
        this.saveTokens(t);
      } catch (e) {
        // 400/403 = refresh token revoked or invalid: sign in again. Anything else (network) = retry later.
        if (e.status === 400 || e.status === 403) { localStorage.removeItem(LS_KEY); return this.login(); }
        throw e;
      }
    }
    return t.access;
  }

  status(s, detail) { if (this.onStatus) this.onStatus(s, detail); }

  async connect(forceRefresh) {
    if (this.ws) return;
    this.status('connecting');
    let token;
    try { token = await this.accessToken(forceRefresh); }
    catch (e) { this.status('disconnected', e.message); return this.scheduleReconnect(); }

    const ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/api/websocket');
    this.ws = ws;
    let authFailed = false;

    ws.onmessage = (ev) => {
      let msg; try { msg = JSON.parse(ev.data); } catch (e) { return; }
      const list = Array.isArray(msg) ? msg : [msg];
      for (const m of list) this.handle(m, ws, token, () => { authFailed = true; });
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.connected = false;
      clearInterval(this.pingTimer);
      for (const p of this.pending.values()) p.reject(new Error('Disconnected'));
      this.pending.clear();
      this.subs.clear();
      this.status('disconnected');
      if (authFailed) { this.backoff = 0; setTimeout(() => this.connect(true), 200); }
      else this.scheduleReconnect();
    };
    ws.onerror = () => { /* onclose follows */ };
  }

  handle(m, ws, token, markAuthFailed) {
    if (m.type === 'auth_required') { ws.send(JSON.stringify({ type: 'auth', access_token: token })); return; }
    if (m.type === 'auth_invalid') { markAuthFailed(); ws.close(); return; }
    if (m.type === 'auth_ok') {
      this.connected = true;
      this.backoff = 0;
      this.status('connected', m.ha_version);
      this.startPing();
      if (this.onConnect) this.onConnect();
      return;
    }
    if (m.type === 'result') {
      const p = this.pending.get(m.id);
      if (p) { this.pending.delete(m.id); m.success ? p.resolve(m.result) : p.reject(Object.assign(new Error(m.error ? m.error.message : 'Error'), { code: m.error && m.error.code })); }
      return;
    }
    if (m.type === 'event') { const cb = this.subs.get(m.id); if (cb) cb(m.event); return; }
    if (m.type === 'pong') { const p = this.pending.get(m.id); if (p) { this.pending.delete(m.id); p.resolve(); } }
  }

  startPing() {
    clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      if (!this.connected) return;
      const ws = this.ws;
      const t = setTimeout(() => { if (ws === this.ws) ws.close(); }, 10000);
      this.send({ type: 'ping' }).then(() => clearTimeout(t), () => clearTimeout(t));
    }, 30000);
  }

  scheduleReconnect() {
    const steps = [1000, 2000, 5000, 10000, 20000];
    const wait = steps[Math.min(this.backoff, steps.length - 1)];
    this.backoff++;
    setTimeout(() => this.connect(), wait);
  }

  send(msg) {
    return new Promise((resolve, reject) => {
      if (!this.ws || !this.connected) return reject(new Error('Not connected'));
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(Object.assign({ id }, msg)));
    });
  }

  // Subscribe: callback gets each event. Subscriptions are dropped on disconnect;
  // re-create them in onConnect.
  subscribe(msg, cb) {
    if (!this.ws || !this.connected) return Promise.reject(new Error('Not connected'));
    const id = this.nextId;
    this.subs.set(id, cb);
    return this.send(msg).then(() => id, (e) => { this.subs.delete(id); throw e; });
  }

  callService(domain, service, data, entityId) {
    const msg = { type: 'call_service', domain, service, service_data: data || {} };
    if (entityId) msg.target = { entity_id: entityId };
    return this.send(msg);
  }
}
