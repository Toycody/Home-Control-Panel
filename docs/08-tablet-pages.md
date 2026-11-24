# Home Dashboard — Tablet Page Scope (Lenovo Tab, portrait)

**Status:** v0.6 · 2026-11-24. **Mockups built** (canvas): "Lenovo Tab · portrait · domed glass" and "Lenovo Tab · portrait · **Vesta style (test)**". Both are the same component; a `look` setting switches the style. **Vesta is the working direction**; the domed board is kept for reference and has not received the v0.4+ layout changes.
**Decisions:**
- Prove the dashboard out on the existing Lenovo Tab (TB311FU) before buying hardware.
- **Portrait** orientation (trial).
- Fully Kiosk Browser installed (free licence for now).
- Battery protection cycles 40–60%.

Viewport assumed ~800×1280 CSS px [Verify DPR on device]. Touch targets ≥ 64–72 px (≈ 11–12 mm) for primary controls; ≥ 52–56 px for secondary (mode chip, power, ± buttons, segments).

---

## Navigation
- **Bottom nav bar, 6 tabs** with icon + label: **Home · Energy · Servers · Shopping · Cameras · Network** (user's priority order). The active tab uses the accent surface.
- Header on every page: time, date, alert chip (tap → Servers), settings gear.
- **Return to Home** after idle (setting: 1 / **2** / 5 min) and on wake.

## Home ("at a glance") — v0.6
1. **Cameras ×2** (side by side, 212 px tall). TP-Link cameras using the **sub-stream** on tiles. Tap → full-screen overlay (HD stream).
2. **Lights row: 5 equal columns (~138 px wide, 272 px tall)** — less busy than 6 (user decision v0.6).
   - **4 light tiles** on the left (Living, Kitchen, Bedroom, Porch — names are placeholders). Header stacks icon above name/state; the rest is a **vertical brightness slider** (10% notches, % readout, tap top/bottom half for ±10%, drag; track ≈164 px). Tap the header to toggle.
   - **Scene column** on the right: **House off** above **Cinema**, same width and 16 px spacing as the lights. House off turns off all lights; Cinema = Living at 15%, the rest off, and shows as active (accent) when that state matches. In production both call HA scripts/scenes, so they can also cover AC, TV, blinds etc.
3. **Row of two half-width cards (206 px):**
   - **Air con** (left): 146 px dial (270° arc 16–30 °C, target handle + inside-temp dot), a **mode chip** (e.g. "Cool", accent when running), a **one-tap power button** beside it, and −/+ 0.5° buttons.
     - **Power**: turns off when running; when off, turns back on in the **last used mode** (usually Cool). Matches real use: on in the morning (automation or manual), off when leaving, finished, or warm enough outside; Cool is used year-round.
     - Tapping the chip opens an **Air con sheet** with Off/Cool/Heat/Auto/Fan and fan speed. **Choosing a mode closes the sheet**; changing fan speed keeps it open (fan is rarely used).
   - **Network & servers at a glance** (right): two tappable rows.
     - **Internet**: ↓/↑ Mbps now, "Starlink 31 ms · 99.6% up", 2-hour download sparkline with the dotted 300 Mbps plan line → opens Network.
     - **Servers**: "11/12 up", names of anything down in red, 12-dot status grid → opens Servers.
4. **Weather**: **full width**, fills the remaining height (~290 px).
   - Top, prominent: large icon, **60 px current temp**, condition + feels-like, high/low, rain timing, wind; **3-day forecast** tiles on the right.
   - Bottom: **12-hour hourly strip** (12 compact columns: time, icon, temp, rain %; "Now" highlighted; rain ≥30% in blue).

## Energy
Now cards (Solar / Home use / Exporting), last-24-hours chart (solar `#B97D14` vs use `#4F8EE8`, crosshair), last-7-days bars (tap a day).

## Servers
Summary boxes + 12 Uptime Kuma monitors (72 px rows, last 24 checks, uptime, response), scrolling.

## Shopping
List selector + **+**, 68 px rows, **Completed · N** at the bottom. Keyboard as a bottom sheet (64 px keys, number row, parse chips).

## Cameras
Both feeds large (full width, 16:9, stacked) with recent events under each (e.g. "Motion 08:52 · Person 07:40"). Tap → full screen.

## Network
- **Internet**: now/peak/average with % of the 300/30 plan, 2 h / 12 h usage graph with dotted plan lines and a crosshair.
- **Starlink health** (dish via HA): uptime 24 h / 7 d, latency, obstruction.
- **Home network** (Omada): clients, APs, switches, PoE draw.

## Style: Vesta alignment
- **True black** background with soft accent glows. The top-right glow is **wide and soft** (multi-stop falloff, peak 46%); the lower-left glow is faint (13%).
- **Solid matte surfaces**: cards `#16171A`, raised controls `#23242A`, nav and sheets `#1D1E22`, with a soft accent gradient at the top of each tile (as on the NAS alert).
- **Hairline bevel** (1 px top highlight ~7.5%, 0.6 px rim, faint bottom line) plus one soft drop shadow.
- **Edge depth** setting (0 = flat Vesta → 100 = full dome), **default 35%** (user decision 2026-11-24).
- **Smaller radii**: cards 16 px, controls 12–14 px.
- **Themes** (muted, shared with Vesta): **Violet (default)** `#443485` base / `#6554AF` hi / `#33276A` glow (darkened ~13% on 2026-11-24). Others: Burgundy, Plum, Slate, Dusk teal, Sage, Sand, Graphite.
- Neutral greys for text (`#F2F2F2` / `#A3A3A8` / `#7A7A80`).
- **Cheaper to render** than the domed style, which suits the Helio G85.
- Watch-item: wide, soft gradients on near-black can **band** on the tablet's 8-bit panel. If visible on device, add a tiny noise/dither overlay.

## Settings (tablet profile)
Accent/theme, Lite rendering, Edge depth, Return-to-Home delay, device info. The rest is on the LAN settings page.

## Integration notes
- **TP-Link cameras into HA**: Tapo cameras typically expose RTSP (`stream1` = HD, `stream2` = sub-stream) and ONVIF. Common routes: HA **ONVIF** integration, HACS "Tapo: Cameras Control", or go2rtc with the RTSP URLs. [Confirm model + current setup]
- Fully Kiosk **Plus** is needed for HA screen control and camera-motion wake.
- Weather: hourly (12 h) and daily (3 d) from an HA weather entity's `weather.get_forecasts` (hourly + daily) or directly from the provider via the dashboard service.
- Scenes: House off / Cinema should map to HA `script.*` or `scene.*` entities so their contents are edited in HA, not the dashboard.
- AC power "on" restores the last mode: read it from the climate entity's attributes, or keep it in an HA `input_select` updated by an automation, so it survives dashboard restarts.

## Open
- TQ2 Camera model and how they're in HA now.
- TQ3 AC integration: which modes and fan speeds it exposes.
- TQ4 Door/garage chips on Home?
- Which 4 lights go on Home, and what House off / Cinema should include beyond lights.
- Verify on device: DPR/viewport, frame rate, two live sub-streams, gradient banding.
