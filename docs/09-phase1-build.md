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
