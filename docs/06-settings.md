# Home Dashboard — Settings & Configuration

**Status:** v0.2 · 2026-11-22. **The panel's settings sheet is built in the mockup** (gear, top right).

## Principles (agreed)
- **Nothing that changes day to day needs a rebuild.** The dashboard-service stores settings (SQLite/JSON) and pushes them live to the UI.
- **Secrets only over SSH.** HA token, Omada credential, Kuma API key, Obsidian access, etc. live in `/etc/dashboard/secrets.env` (or similar) on the host. The panel shows connection status only.
- **Shell access = SSH only** (key auth). The panel has a read-only **Diagnostics** view: connection status + recent service logs.
- **LAN settings page** (`kiosk.lan/settings`, same app) for anything fiddly: entity pickers, tile order, weather location, list/note mapping. The panel keeps quick toggles.
- Export/import settings as one JSON file (planned).

## On-panel settings (built in the mockup)

| Section | Setting | Options / default | Effect in mockup |
|---|---|---|---|
| Appearance | Accent colour | 8 swatches, Violet default | Re-themes everything ✔ |
| | Clock | **24 h** / 12 h | Header clock ✔ |
| Display & wake | Sleep after | 30 s / **1 min** / 2 min / 5 min | Stored |
| | Wake on | **Motion + touch** / Touch only | Stored |
| | Night mode | **Wake dimmed** / No motion wake / Off | Stored |
| | Night starts / ends | **22:00 / 06:00**, 30 min steps | Stored |
| Quick controls | Tiles | Pick and order at the LAN page | Info |
| | Brightness sliders | **On** / off | Light tiles lose or regain the slider ✔ |
| Alerts | Monitors that can raise the header alert | Chips per Uptime Kuma monitor (default on: HA, Omada, NPM, AdGuard, Syncthing, NAS backup) | Turning off NAS backup hides the red chip ✔ |
| Internet | Plan download | **300 Mbps**, ±10 | Dotted line + % figures ✔ |
| | Plan upload | **30 Mbps**, ±5 | Dotted line + % figures ✔ |
| | Show plan lines | **On** / off | Lines and % hide ✔ |
| | Update every | **30 s** / 60 s | Subtitle ✔ |
| | Starlink health | **On** / off | Dish uptime + latency in subtitle ✔ |
| Shopping list | Default list | Visible lists | Switches list ✔ |
| | Lists shown | Chips (at least one stays on) | Filters dropdowns ✔ |
| | Clear completed after | 7 / **14 days** / never | Hides old completed ✔ |
| Weather | Location | Set at the LAN page | Info |
| System | Diagnostics | Read-only view | ✔ |
| | Reset dashboard | Two-tap confirm | Restores defaults ✔ |
| | About | Version, build, LAN page, access, sources | ✔ |

## LAN-page-only (later)
Tile/entity picker and order, tile type per entity, weather location/provider, Obsidian note ↔ list mapping, Kuma monitor grouping, export/import, optional settings PIN, connection status per source.

## Internet capacity (decision)
- **Speed tests removed** (data cost ~8–25 GB/month on Starlink). Capacity is the **plan figure, 300/30 Mbps** (user believes the plan may have dropped to 200–300 / 20–30). Shown as soft dotted lines. Usage vs plan is monitored.
- **Starlink dish telemetry via HA** (not in bypass mode, so the dish API should be reachable): ping, drop rate (uptime), obstruction. Polled every 30–60 s, no data cost. This is the availability metric.
- Optional later: a "busiest moments of the week" marker as a free lower bound on real capacity.
