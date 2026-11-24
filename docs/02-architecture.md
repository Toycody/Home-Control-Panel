# Home Dashboard — Architecture (Proposal)

**Status:** Draft v0.3 · 2026-11-22. v0.3 drops the SNMP plan for the ER605 and adds WAN history storage. Items marked "proposal" are not decided until they are logged in 04-open-questions-and-decisions.md.

---

## 1. Shape

```
                        ┌──────────── Kiosk box (N150 mini PC, proposed) ────────────┐
[Motion sensor]──►[HA]◄─┼─ WS ── Dashboard SPA (Chromium kiosk on cage)               │
                        │            │ WS                                              │
[Omada controller]◄─────┼── dashboard-service (small backend)                          │
[Uptime Kuma]◄──────────┤     · aggregates non-HA sources, stores short history       │
[Weather API]◄──────────┤     · pushes live values + history to the SPA               │
                        │     · display-agent: display on/off, DDC brightness         │
                        └──────────────────────────────────────────────────────────────┘
```

**Decided (D6):** a dedicated dashboard, not Lovelace.

**Proposal:** two data paths.
1. **SPA → Home Assistant directly** (WebSocket) for entity states, controls, energy statistics and the motion sensor.
2. **SPA → dashboard-service** (one WebSocket) for non-HA data: Omada, Uptime Kuma, and optionally weather.

Why a backend service:
- API credentials stay out of the browser.
- One reconnect and staleness model.
- Data is already warm on wake.
- Slow APIs get their own polling schedule.
- **It owns history storage**, such as WAN throughput.

The service runs on the kiosk box and could move to a Docker host later.

## 2. Frontend
- **Svelte** (or Preact/Solid) + `home-assistant-js-websocket` + **uPlot** for canvas time-series charts. [Q15]
- Config-driven layout.

## 3. Data sources

| Module | Source | Mechanism | Notes |
|---|---|---|---|
| Controls | HA | `subscribe_entities` + `call_service` | Real-time |
| Energy | HA | Recorder statistics + live sensors | [Q9] |
| Weather | HA `weather.get_forecasts`, or a weather API via the service | Hourly + daily | [Q6] |
| Uptime Kuma | dashboard-service → Kuma API/socket, or the HA integration | — | [Q10] |
| WAN / LAN | dashboard-service → **Omada controller** | 30 s polling | See §3.1 |
| Motion | HA binary_sensor | WS subscription | §4 |

### 3.1 Omada (ER605 gateway)

**SNMP is dropped.** Several TP-Link community reports say the ER605's SNMP WAN counters **under-report traffic**: a few Mbps shown while hundreds of Mbps were flowing, likely because of hardware offload/NAT accounting. Others report incorrect or missing WAN data. That makes SNMP unreliable for this purpose. The 30 s granularity the user accepted makes the controller API sufficient anyway.

**Controller API options:**
| Option | Notes |
|---|---|
| **Omada Open API** (preferred) | Official REST API, first added in controller **v5.12**. Credentials under Settings > Platform Integration > Open API. Omada's current KB article targets controller **6.4+**. The HACS `ha-omada-open-api` integration is confirmed on 6.2.10.18. Endpoint coverage on older 5.x controllers varies (community reports of "Not Found" on 5.15). **[Verify against the user's controller version, Q20]** |
| Omada Web API (internal) | What the HA core integration and older tools use. Works across versions but is undocumented and changes between releases. Fallback only. |
| Via HA (`ha-omada-open-api`) | Gives WAN rate/latency/loss sensors. Min device polling 30 s. Would put HA in the path for network data. Fallback if a direct integration proves painful. |

**Plan:**
1. Find the controller version.
2. If it's older than 6.x, consider upgrading the controller. That is the user's call, and it's a change to production networking, so take a backup first.
3. Create a read-only Open API credential.
4. Prototype a single call that returns the gateway's WAN rx/tx rate. Confirm whether the API returns a **rate** or **cumulative bytes**; if cumulative, the service derives the rate from deltas.

### 3.2 WAN history storage (dashboard-service)
- Poll every 30 s and store `(ts, wan_id, rx_bps, tx_bps, latency_ms?, loss_pct?)` in **SQLite**.
- Retention: 48 h raw (~5,760 rows per WAN). This easily covers the 2 h and 12 h graphs and leaves room for 24 h later.
- On SPA connect, the service sends the history for the requested window, then streams new points.
- 12 h view: optional server-side downsampling to 2-minute buckets (keep max and avg).
- Gaps (controller unreachable) are stored as nulls so the graph shows a break rather than interpolating.

## 4. Wake/sleep design

**Principle:** the browser, app and service never sleep. Only the display does.

| Option | How | Pros | Cons |
|---|---|---|---|
| A. Output off (DPMS) | `wlopm` / `wlr-randr` | True power saving | Monitor wake is model-dependent (1–4 s+). Possible re-detect. |
| B. Backlight min + black UI | DDC/CI via `ddcutil` | Near-instant wake | Higher idle draw |

Build both, then stopwatch-test on the chosen monitor. The SPA subscribes to the motion sensor and calls the local display-agent. HA owns the policy through helpers. [Q5, Q17]

### Latency budget (≤ 3 s)
Motion report 0.2–1 s · HA push < 0.1 s · display on 0.1–4 s · fade 0.3 s.

## 5. Kiosk platform
- Debian minimal → cage → Chromium `--kiosk`. dashboard-service runs as a systemd service. Pi alternative: Raspberry Pi OS Lite.
- Autologin. `Restart=always`. Page reload on prolonged disconnect. Default blanking disabled.
- Portrait rotation plus touch-to-output mapping. [Verify on the panel]
- Deploy: git → build → rsync/pull. [Q14]

## 6. Rendering performance
- Pre-blurred wallpaper instead of live `backdrop-filter`.
- Animate only transform and opacity. uPlot canvas charts.
- A 1,440-point line in uPlot is trivial to render.

## 7. Security
- Non-admin HA user + token.
- **Read-only Omada Open API credential** (client mode, viewer-level site privileges).
- Uptime Kuma API key.
- Secrets live in a local config file, not git. The service listens on localhost only.
