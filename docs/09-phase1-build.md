# Home Dashboard — Phase 1 Build (Home page, Home Assistant only)

**Status:** v0.1 · 2026-11-24 · code in `app/`, deploy in `deploy/`.

## Decisions
| # | Decision |
|---|---|
| D28 | Phase 1 = **Home page only, talking straight to Home Assistant** (lights, scenes, AC, weather, cameras). Other tabs show "coming in phase 2/3" cards. |
| D29 | **Plain JavaScript, no framework or build step** for Phase 1 (supersedes P1 for now). Revisit Svelte if Phase 2 grows. |
| D30 | **Host: Debian 13 LXC on Proxmox**, nginx serving the static app and **proxying HA's `/api/` and `/auth/token`** (same-origin: no CORS changes in HA). |
| D31 | **Sign-in via HA's own login flow** as the non-admin `wall` user. The tablet keeps the refresh token; no token stored on the LXC or in git. |
| D32 | `app/config.js` is host-local (git-ignored), created from `config.example.js` by `deploy/install.sh`. |

## Entities (from the user, 2026-11-24; IDs are best guesses until Diagnostics confirms)
| Tile | Friendly name | Expected entity ID |
|---|---|---|
| Light | Dining Lights (group) | `light.dining_lights` |
| Light | Lounge Lights (group) | `light.lounge_lights` |
| Light | Living Room Lamp | `light.living_room_lamp` |
| Light | Display | `light.display` |
| Scene column | House Off (script: all lights + AC off) | `script.house_off` |
| Scene column | Theater (scene) | `scene.theater` — replaces "Cinema" |
| Air con | Lounge AC | `climate.lounge_ac` |
| Weather | Forecast Home (Met.no default) | `weather.forecast_home` |
| Camera "Entry" | VIGI C450 (HA card was mislabelled "Front Driveway") | `camera.vigi_c450_minorstream` (tile) / `_mainstream` (full screen) |
| Camera "Driveway" | VIGI C540 | `camera.vigi_c540_minorstream` / `_mainstream` |

If an ID is wrong, the panel falls back to a same-domain entity with the matching friendly name and flags it (≈) in **Settings → Diagnostics**.

## How each piece works
- **Lights:** `light.turn_on {brightness_pct}` in 10% steps, `light.turn_off` at 0, `light.toggle`-style tap on the header. Optimistic UI, confirmed by HA push. Non-dimmable lights hide the slider.
- **House off / Theater:** `script.turn_on` / `scene.turn_on`. Scenes have no "active" state in HA, so the tile flashes "Done" instead of staying lit.
- **AC:** dial range and step from the climate entity. ± is debounced 0.7 s → `climate.set_temperature`. Power = `set_hvac_mode off`, or back to the **last used mode** (remembered on the tablet, default Cool). Modes and fan speeds come from the entity's own lists.
- **Weather:** current state + `weather/subscribe_forecast` (hourly and daily). Met.no gives rain in mm, not %, so the strip shows mm when there's no probability.
- **Cameras:** tiles refresh the sub-stream snapshot every 2 s (`entity_picture`, cheap on HA and the tablet). Full screen tries HA's HLS stream of the main stream and falls back to 1 s snapshots. WebRTC (go2rtc, already used by the user's HA card) is a later upgrade for lower latency.
- **Return to Home** after idle (1/2/5 min) and on screen wake.
- **Connection:** auto-reconnect with backoff, 30 s ping, token refresh; a "Reconnecting…" pill shows in the header when down.

## Testing
`node test/mock-ha.mjs` runs the panel against a fake HA (lights, scenes, AC, Met.no-style forecast, cameras).

## Not in Phase 1
Uptime Kuma, Omada/Starlink figures (glance card shows placeholders), Energy, Shopping, Network pages, wake/sleep control (Fully Kiosk handles screen timeout for now).

---

# Phase 2a — Energy, Network, Servers (v0.2, 2026-11-24)

## Decisions
| # | Decision |
|---|---|
| D33 | **Energy entirely from Home Assistant** (Shelly dual-channel clamp: *Shelly Inverter* = solar, *Shelly Meter Main* = grid). Home use = solar + import − export. |
| D34 | **Month / Quarter / Year toggle** on Energy shows **actual totals**: kWh per day for the last 30 days / per week for the last 13 weeks / per month for the last 12 months. Tap a bar for import, export and self-supplied %. *(v0.3: replaced the earlier per-day averages, at the user's request.)* |
| D35 | **Internet usage = Starlink dish throughput via HA**, not the Omada API (supersedes P7 for WAN). 2 h graph from raw history, 12 h from 5-minute statistics. Omada only returns later if LAN stats are wanted. |
| D36 | **Uptime Kuma via its status-page JSON** (`/api/status-page/<slug>` + `/heartbeat/<slug>`), proxied by nginx at `/kuma/`. No embed/iframe, no API key. Slug: `obsidian`. |
| D37 | Shopping list **deferred** until the vault-sync LXC is set up. It's now the only piece that needs a backend. |

## Entities
Configured by expected ID with a friendly-name fallback (Settings → Diagnostics shows what was used):
- Shelly: Inverter *Power*, *Energy*, *Returned Energy*; Meter Main *Power*, *Total Active Energy*, *Total Returned Energy*. Which inverter channel is solar is detected automatically (the one that has counted more). Grid sign is configurable (`gridPowerSign`).
- Starlink: downlink/uplink throughput, ping, ping drop rate, power, energy, download/upload (data), last restart, connectivity, obstructed, thermal throttle, motors stuck, unexpected location, Ethernet speeds, mast near vertical, heating, update, sleep, stowed.

## Pages
- **Home:** glance card is live: Starlink ↓/↑ now, ping, drop rate and a 2 h sparkline against the plan; Uptime Kuma N/M up with a status dot per monitor. Header shows a red alert chip when a monitor is down (tap → Servers).
- **Energy:** live Solar / Home use / Importing-Exporting with today's kWh; last 24 h power chart with crosshair; daily-average bars.
- **Network:** Internet card (now, peak, average vs 300/30 plan; 2 h / 12 h graph with plan lines); Starlink dish card (connection + uptime, ping + 12 h average, drop rate, sky view, dish power + kWh today, data this month, worst 5-min ping, firmware; active alerts in the subtitle); 12 h ping chart.
- **Servers:** Up / Down / average 24 h uptime, then every monitor with status, last 24 checks and 24 h uptime (down monitors first).

## Camera fix
Tiles fall back to the main-stream snapshot when the sub-stream entity is missing or unavailable, and say "unavailable in Home Assistant" instead of "not found" when the entity exists.

## Config
`index.html` loads `config.example.js` as defaults, then the host's `config.js` overrides section by section, so new sections (energy, starlink, plan, kuma) work without editing an existing `config.js`.

# Phase 2b — tidy-up (v0.3, 2026-11-24)
- **Energy totals now come from the power sensors** (time-weighted means in HA long-term statistics, kWh = mean W × hours). On the real system, solar and "used" came out identical, which means the grid energy counters weren't contributing (most likely not resolving or not counting as expected). The power sensors drive the 24 h graph the user confirmed is right, so totals now match it. Grid import/export still come from the meter's energy counters when they resolve; otherwise they're simply not shown.
- Solar sign is detected from the last 24 h of the inverter's power (generation dominates). `solarFrom: 'energy' | 'returned'` in config still forces it.
- **Background speckles** (small whitish squares, intermittent): GPU rendering glitches in the tablet's WebView. Removing `will-change` from the press overlays made them much worse (flickering, text unreadable), so it was **restored** (PR #4). Keeping those layers is better on this device. Next diagnostic: Fully → Advanced Web Settings → toggle hardware acceleration.
