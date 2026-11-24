# Home Control Panel

A custom wall-mounted touch dashboard for the house: one-tap Home Assistant controls (lights, scenes, air con), cameras, weather, energy, Uptime Kuma server status, Starlink/Omada network health and a shopping list shared with the Vesta tasks app (Obsidian TaskNotes).

**Current target:** the existing Lenovo Tab (TB311FU) in portrait, running Fully Kiosk Browser. A 24" portrait panel is the longer-term target (hardware benched).

## Repository layout

| Path | What it is |
|---|---|
| `docs/` | Requirements, architecture, design system, decisions log, hardware research, settings, tablet target and tablet page scope. Start with `01` and `08`. |
| `design/` | Design-canvas mockups (`*.dc.html`) and the canvas layout (`canvas.json`). `TabletVesta.dc.html` is the current tablet design. These are design references: they need the Claude design-canvas runtime to render and are not the production app. |

## Status

- ✅ Requirements, architecture proposal and design system documented.
- ✅ Tablet design (Vesta style) agreed: 6-tab nav; Home = cameras, 4 lights + House off / Cinema, compact AC with one-tap power, network/server glance, full-width weather.
- ⏳ **Next: integration discovery, then a Home-page-only build** (see below).

## Plan to first trial on the tablet

1. **Integration discovery (no code):** HA URL and version, a non-admin user + long-lived token, and the entity IDs for the 4 lights, the AC `climate.*` entity, the 2 cameras, a `weather.*` entity and the Starlink sensors. House off / Cinema created as HA scripts.
2. **Phase 1 build — Home page, HA only.** Static SPA talking to HA over WebSocket. Lights, scenes, AC, weather, cameras, Starlink figures. Served from the homelab host; Fully Kiosk points at it.
3. **Phase 2 — dashboard-service** (homelab Docker host): Uptime Kuma, Omada Open API with 48 h WAN history, settings, and the shopping list (Obsidian).
4. **Phase 3 —** Energy, Servers, Network, Shopping, Cameras pages fully live; wake/sleep via Fully + HA.

## Secrets

Never commit tokens or passwords. Secrets live on the host in a config file edited over SSH (decision D26). `.gitignore` excludes the usual secret files.
