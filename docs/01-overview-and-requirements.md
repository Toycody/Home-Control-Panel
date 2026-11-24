# Home Dashboard — Overview & Requirements

**Status:** Draft v0.3 · 2026-11-22
**Related:** 02-architecture.md · 03-design-system.md · 04-open-questions-and-decisions.md · 05-hardware-research.md
**Live mockup:** Design canvas "Home Dashboard — Home Screen"

Tags used: **[Assumption]** = not yet confirmed · **[Verify]** = needs checking against current docs or hardware · **[Q#]** = see open questions doc.

---

## 1. Purpose

A wall-mounted, always-ready touch panel in a central spot in the house. It gives one-tap access to the most-used Home Assistant controls and an at-a-glance view of the network, energy, servers, weather and the shopping list. Deeper control is available on request.

## 2. Goals

- **Glanceable** from across the room, usable with a single touch.
- **Feels instant.** Motion to readable screen in about 3 s or less. Touch feedback in under 100 ms.
- **Elegant.** Dark, domed glass tiles (03).
- **Low maintenance.** Boots straight into the dashboard. Recovers on its own from crashes, network drops and source restarts.
- **Extensible.** New widgets and tabs can be added without reworking what exists.

## 3. Non-goals (for now)

- Replacing HA's own UI for configuration and admin.
- Remote access from outside the LAN.
- Phone or tablet layouts. Portrait panel only. [Assumption]
- Light theme (D13).

## 4. Hardware envelope

| Item | Decision / brief | Notes |
|---|---|---|
| Display | **24" 1920×1080 native touch, portrait, satin/light-AG finish** (D7, D10) | ~93 PPI. Purchase benched. See 05. |
| Compute | N150 mini PC proposed (P6), Pi 5 alternative | See 05 |
| Presence | Cheap motion sensor at or near the screen | Integrated via HA [Q5] |

## 5. Functional requirements

### F1 — Home Assistant controls
- Home screen shows 8 quick-control tiles (4×2). The final list is TBD. [Q8]
- **Tap** toggles. **Long-press or drill-in** opens a detail view.
- **Light tiles have a vertical brightness slider** on the right edge (D15):
  - Snaps to **10% steps** (0–100). No finer granularity on this panel.
  - **Tap the upper half** of the slider for **+10%**, the **lower half** for **−10%**. Drag to set directly.
  - 0% turns the light off. Turning a light on restores its last level (50% if none).
  - Subtitle shows "On · 80%" or "Off".
- Real-time state from HA push. The UI responds optimistically on tap, then confirms or rolls back.
- **No visible tap highlight or focus ring** on any control (D14).

### F2 — Network monitoring (Omada: ER605 gateway)
- Internet panel occupies the **right ⅔** of its row (D16).
- WAN download/upload now, peak and average, at **~30 s granularity**.
- Trend graph with **2 h / 12 h** windows. 12 h uses 2-minute maxima. History is persisted (SQLite, 48 h).
- WAN health: connected, latency, loss (if exposed [Verify]).
- LAN scope TBD. [Q12]

### F3 — Power
- Generation (solar) and consumption graphs from HA. Live "now" figures and today's totals. [Q9]

### F4 — Server uptime (Uptime Kuma)
- Per-monitor state, uptime %, response time, incidents. A down monitor raises an alert chip.

### F5 — Weather
- Current conditions, 12-hour strip, 3-day outlook. [Q6]
- Hidden while the on-screen keyboard is up.

### F6 — Wake/sleep
- Motion wakes the display with a soft fade-in. An idle timeout fades it out and turns the display off. Touch also wakes it.
- Never shows a boot, login or loading screen on wake.

### F7 — Future widgets (candidates)
Calendar, to-do, bin day, doorbell pop-up, media, presence, timers. [Q19]

### F8 — Shopping list (Obsidian Tasks integration) (D16)
- **Panel:** left ⅓ of the Internet row, same height. Shows the selected list's open items first (max 5 visible + "N more"), with tap-to-check-off.
- **List dropdown** selects the visible list (mock lists: Groceries, Hardware, Pharmacy).
- **+ button** opens the **on-screen keyboard sheet**, which replaces the weather panel and tab bar. It contains:
  - a target-list dropdown, a text entry box, and a **+** (add) button;
  - QWERTY plus a numbers/symbols layout, shift, backspace, space, a `#` key, **Add**, and a **lower-keyboard** key;
  - the OS keyboard is suppressed (`inputmode="none"`), so only the panel keyboard appears.
- **Natural-language parsing** (live preview as chips), to match the Tasks app:
  - item name;
  - quantity: `2L`, `1kg`, `x12`, `a dozen`, `6 pk`;
  - due: today, tomorrow, weekday names, "this weekend", "next week";
  - list: `#groceries` (an unknown `#tag` shows as a new list);
  - priority: `!`, `!!`, `!!!`.
  - The mockup parser is a **stand-in**. The real one should be shared with the Tasks app (P9). [Q26]
- **Obsidian write format** (preview shown in the sheet): Tasks-plugin line, e.g. `- [ ] Milk (2 L) ⏫ 📅 2026-11-28 #shopping/groceries` (P8). Vault access path to match the Tasks app. [Q24, Q25]
- After **Add**, the input clears, the keyboard stays up for the next item, and the panel switches to the target list.

## 6. Non-functional requirements

| ID | Requirement | Target |
|---|---|---|
| N1 | Wake latency | Motion to readable dashboard in ≤ 3 s. Touch to visual feedback in < 100 ms. |
| N2 | Smoothness | 60 fps transitions at 1080×1920 |
| N3 | Resilience | Auto-reconnect to all sources. Stale-data indicators. Watchdog. Unattended boot. Graph history survives restarts. Shopping writes are queued if the vault is unreachable. |
| N4 | Security | Non-admin or read-only accounts per source. LAN only. No secrets in the repo. |
| N5 | Maintainability | Single codebase. Config-driven layout. Parser shared with the Tasks app. |
| N6 | Power | Display off when nobody is around. |
| N7 | Readability and touch | Legible at 2–3 m. Touch targets ≥ 15 mm (~54 px). Keyboard keys 54 px tall. |
| N8 | Budget | Keep hardware cost down (screen + PC under ~AUD 650 preferred). |
