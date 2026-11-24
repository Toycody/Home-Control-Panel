# Home Dashboard — Open Questions & Decision Log

**Status:** Living document · last updated 2026-11-22 (v0.7). Tablet-specific decisions since then are in `07-tablet-target.md` and `08-tablet-pages.md`.

---

## Decisions made

| # | Decision | Source | Date |
|---|---|---|---|
| D1 | Portrait 9:16 touch display, central location | Brief | 2026-11-22 |
| D2 | Compute is a Raspberry Pi or a small x86 box | Brief | 2026-11-22 |
| D3 | Home Assistant is the main control backbone | Brief | 2026-11-22 |
| D4 | Motion sensor drives soft wake, with timer-based soft sleep | Brief | 2026-11-22 |
| D5 | Visual style: glassy, soft, elegant tiles (Todoist-style) | Brief | 2026-11-22 |
| D6 | Dedicated dashboard app (not Lovelace). Data from HA **and other sources directly.** | User | 2026-11-22 |
| D7 | Native touch display (no overlay), satin / light anti-glare finish | User | 2026-11-22 |
| D8 | Network: full TP-Link Omada stack. **Gateway is an ER605.** Flat LAN, no VLANs. **ISP is Starlink, not in bypass mode.** | User | 2026-11-22 |
| D9 | Screen and computer still to be purchased. Monitor discussion benched; cheap AliExpress panels judged too risky (wake/OSD behaviour). | User | 2026-11-22 |
| D10 | **24" 1080p.** 27" ruled out (1440p needed, extra cost and GPU load). | User | 2026-11-22 |
| D11 | **WAN throughput at ~30 s granularity is acceptable.** Trend graph with **2 h and 12 h** windows. | User | 2026-11-22 |
| D12 | **SNMP dropped** for WAN stats (ER605 under-reports). Use the Omada controller API. | Research | 2026-11-22 |
| D13 | **Dark theme only.** Domed-glass surfaces everywhere (03 §3). Accent re-themes the whole UI including the background. | User | 2026-11-22 |
| D14 | **No visible tap highlight or focus box** on any control (kiosk). | User | 2026-11-22 |
| D15 | **Light tiles get a vertical brightness slider**, 10% steps, tap upper/lower half for ±10%, drag to set. Can be turned off in Settings. | User | 2026-11-22 |
| D16 | **Shopping list panel** (left ⅓, Internet right ⅔). List dropdown, + opens the on-screen keyboard, natural-language entry like the Tasks app, Obsidian Task notes integration. | User | 2026-11-22 |
| D17 | **Single pressed colour ("light purple")** for every pressable. Press timing 45 ms in / 95 ms out. | User | 2026-11-22 |
| D18 | **Completion transition matches the Tasks app** (03 §5). | User | 2026-11-22 |
| D19 | **Bottom tab bar removed.** | User | 2026-11-22 |
| D20 | **Settings button, top right** (full list in 06). | User | 2026-11-22 |
| D21 | **Shopping list matches the Tasks app layout** (Completed · N at the bottom, collapsed by default, newest first, scrollable). | User | 2026-11-22 |
| D22 | **Servers card / alert chip open an Uptime Kuma overview panel.** | User | 2026-11-22 |
| D23 | **Internet panel shows utilisation vs capacity.** Graph = actual traffic. Soft dotted lines = plan capacity. "% of plan" on each figure. | User | 2026-11-22 |
| D24 | **No speed tests** (data cost). Capacity = **plan figure, 300/30 Mbps** (adjustable in Settings), monitored against usage. *(Supersedes the earlier 3-per-night speed-test plan.)* | User | 2026-11-22 |
| D25 | **Starlink dish telemetry via the HA Starlink integration** for availability (uptime / drop rate, latency, obstruction). Dish not in bypass, so the local API should be reachable without a static route [Verify]. | User | 2026-11-22 |
| D26 | **Secrets only via SSH** (config file on the kiosk). **No on-panel terminal**: SSH only, plus a read-only Diagnostics view. | User | 2026-11-22 |
| D27 | **LAN settings page** (`kiosk.lan/settings`) for fiddly configuration. The panel keeps quick settings (06). | User | 2026-11-22 |

## Proposals awaiting sign-off

| # | Proposal | Doc |
|---|---|---|
| P1 | Svelte SPA + `home-assistant-js-websocket` + uPlot | 02 §2 |
| P2 | SPA talks to HA directly. A dashboard-service on the kiosk handles non-HA sources, history and settings. | 02 §1 |
| P3 | App and service never sleep. Only the display sleeps. | 02 §4 |
| P4 | Pre-blurred wallpaper instead of live blur | 02 §6 |
| P5 | Debian + cage + Chromium kiosk | 02 §5 |
| P6 | Hardware: 24" Dell P2424HT / HP E24t G5 / Philips 242B9T + N150 mini PC. **Benched.** | 05 |
| P7 | Omada **Open API** (read-only credential) polled every 30 s. SQLite history with 48 h retention. | 02 §3.1–3.2 |
| P8 | Shopping items as **Obsidian Tasks-format lines**. | 01 F8 |
| P9 | The real parser is **shared with the Tasks app**. | 01 F8 |
| P10 | Auto-clear completed: (a) display-side hide now, (b) optional nightly archive job later. | 01 F8 |
| P11 | Completion writes to Obsidian **after the 2.5 s grace period**. | 03 §5 |
| P15 | Optional: record weekly busiest-moment throughput as a free "at least this much" capacity marker. | 06 |

## Open questions

🔴 = blocks a decision now · 🟡 = needed before building that module · ⚪ = later

### Hardware & install
- ✅ **Q1** 24" 1080p (D10).
- ✅ **Q2** Native touch, satin finish (D7).
- 🔴 **Q3** Install: mounting, power, Ethernet, PC location. **Benched.**
- 🔴 **Q4** N150 mini PC vs Pi 5, budget. **Benched.**
- 🔴 **Q5** Motion sensor protocol? PIR or mmWave?
- 🟡 **Q6** Location for weather, and preferred provider? (Set on the LAN page.)

### Home Assistant
- 🟡 **Q7** HA install type and version? Address?
- 🟡 **Q8** Top 8–12 home-screen controls.
- 🟡 **Q9** Solar, inverter, battery and meter integrations?
- 🟡 **Q10** Uptime Kuma version and monitor count?

### Network
- ✅ **Q11** Omada stack, ER605, Starlink (D8).
- 🟡 **Q12** LAN monitoring: what do you want to see?
- 🔴 **Q20** **Omada controller type and exact version.**
- ✅ **Q21** Gateway is an ER605.
- ✅ **Q22** No speed tests (D24).
- 🟡 **Q32** Confirm the actual Starlink plan speeds (currently set to 300/30, may be 200–300 / 20–30).
- 🟡 **Q33** Is the Starlink HA integration already set up and reaching the dish?

### Shopping list / Obsidian
- 🟡 **Q24** How does the Tasks app reach the vault? The dashboard uses the same path.
- 🟡 **Q25** Which note(s) hold shopping lists? Where do list names come from?
- 🟡 **Q26** Can the Tasks app parser be a shared module or API?
- ✅ **Q27** Completed items: `- [x]` + `✅ date`, hidden after 7/14 days (P10).
- ⚪ **Q28** Should "#newname" create a new list?
- ⚪ **Q30** Vault cleanup: archive or delete? Which component owns it?
- ⚪ **Q31** Clear-completed period shared with the Tasks app?

### Software
- ✅ **Q13** Dedicated app (D6).
- 🟡 **Q14** git? Existing Docker host, or the kiosk box for the backend? *(Repo created: github.com/Toycody/Home-Control-Panel, 2026-11-24.)*
- ⚪ **Q15** Languages and stacks?

### UX
- ✅ **Q16** Dark only (D13).
- ✅ **Q17** Idle timeout / night behaviour are now settings (defaults 1 min, wake dimmed 22:00–06:00).
- ⚪ **Q18** Other users? Optional PIN for Settings?
- ⚪ **Q19** Extra widgets?
- ⚪ **Q23** 24 h WAN window?
- ⚪ **Q29** Keyboard and panels auto-close on idle or sleep? (Proposed: yes.)

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Monitor wake-from-standby is slow (> 3 s) | Breaks the wake target | Stopwatch-test early. DDC backlight-dim fallback. |
| "Anti-glare" looks grainy rather than satin | Premium feel | See in person. Prefer low-haze panels. |
| Portrait touch mapping quirks under Wayland | Mis-registered touches | Verify on day one |
| Older controller lacks needed Open API endpoints | No WAN rate data | Upgrade the controller (backup first), or fall back |
| Mini PC fan noise | Annoyance | Fanless model or BIOS fan tuning |
| In-wall mains work | Compliance and safety | Licensed electrician for fixed wiring in Australia |
| Parser drift between the dashboard and the Tasks app | Same text parsed differently | One shared parser (P9) |
| Vault write conflicts | Lost or duplicated items | Same write path as the Tasks app. Line-level edits. Re-read before write. |
| Auto-clear deleting lines mid-sync | Conflicts | Display-side hide only (P10a). Single nightly archive job (P10b). |
| Plan figure drifts from what Starlink actually delivers | Misleading % figures | Adjustable in Settings. Optional busiest-moment marker (P15). Dish telemetry for availability. |
