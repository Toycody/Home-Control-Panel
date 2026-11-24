# Home Control Panel

A custom wall-mounted touch dashboard for the house: one-tap Home Assistant controls (lights, scenes, air con), cameras, weather, energy, Uptime Kuma server status, Starlink/Omada network health and a shopping list shared with the Vesta tasks app (Obsidian TaskNotes).

**Current target:** the existing Lenovo Tab (TB311FU) in portrait, running Fully Kiosk Browser. A 24" portrait panel is the longer-term target (hardware benched).

## Repository layout

| Path | What it is |
|---|---|
| `docs/` | Requirements, architecture, design system, decisions log, hardware research, settings, tablet target and tablet page scope. Start with `01` and `08`. |
| `design/` | Design-canvas mockups (`*.dc.html`) and the canvas layout (`canvas.json`). `TabletVesta.dc.html` is the current tablet design. These are design references: they need the Claude design-canvas runtime to render and are not the production app. |
| `app/` | **The panel (Phase 1).** Plain HTML/CSS/JS, no build step. `config.example.js` → `config.js` on the host. |
| `deploy/` | Debian 13 LXC install script and nginx site. See `deploy/README.md`. |
| `test/` | `mock-ha.mjs`: run the panel locally against a fake Home Assistant. |

## Status

- ✅ Requirements, architecture proposal and design system documented.
- ✅ Tablet design (Vesta style) agreed: 6-tab nav; Home = cameras, 4 lights + House off / Theater, compact AC with one-tap power, network/server glance, full-width weather.
- ✅ **Phase 1 built:** Home page live against Home Assistant (`docs/09-phase1-build.md`). Ready for a trial on the tablet.
- ✅ **Phase 2a built:** Energy, Network (Starlink via HA), Servers (Uptime Kuma status page) and a live glance card.
- ⏳ Next: shopping list once the vault-sync LXC is ready.

## Plan to first trial on the tablet

1. **Integration discovery (no code):** HA URL and version, a non-admin user + long-lived token, and the entity IDs for the 4 lights, the AC `climate.*` entity, the 2 cameras, a `weather.*` entity and the Starlink sensors. House off / Cinema created as HA scripts.
2. **Phase 1 build — Home page, HA only.** Static SPA talking to HA over WebSocket. Lights, scenes, AC, weather, cameras, Starlink figures. Served from the homelab host; Fully Kiosk points at it.
3. **Phase 2 — dashboard-service** (homelab Docker host): Uptime Kuma, Omada Open API with 48 h WAN history, settings, and the shopping list (Obsidian).
4. **Phase 3 —** Energy, Servers, Network, Shopping, Cameras pages fully live; wake/sleep via Fully + HA.

## Secrets

Never commit tokens or passwords. Secrets live on the host in a config file edited over SSH (decision D26). `.gitignore` excludes the usual secret files.
