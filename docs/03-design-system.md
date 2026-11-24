# Home Dashboard — Design System

**Status:** v0.5 · 2026-11-22. Aesthetic: Todoist-style, glassy, soft and elegant, with a **domed edge** that gives tiles a subtle 3D feel. **Dark theme only**, with an **accent colour that re-themes everything** (Tasks-app style).
**Live mockup:** Design canvas "Home Dashboard — Home Screen" (artboards: Home screen, Button study).

> **Note (2026-11-24):** the tablet build follows the **Vesta style** recorded in `08-tablet-pages.md` (true black, matte surfaces, hairline bevel, Edge depth 35%, muted Violet default). Where this doc and 08 disagree for the tablet, 08 wins.

---

## 1. Principles

1. **Calm by default.** Neutral dark glass. Colour is reserved for state (on/active = accent tint) and alerts (red).
2. **Glanceable first, detail on request.** Home = status + top controls. Deeper views open in panels.
3. **Big, forgiving targets** (≥ 15 mm, ~54 px at 93 PPI).
4. **Soft, short motion.** Press feedback 45–95 ms. Transitions up to ~420 ms, ease-out, no bounce.
5. **Nothing feels like a webpage.** No scrollbars, text selection, hover-dependent UI, tap highlight or focus rings.
6. **Tactile, not skeuomorphic.** The domed edge suggests depth through light and shadow only.
7. **Shared motion language with the Tasks app.** Completion and un-completion behave identically in both apps.

## 2. Portrait layout (1080×1920, 24")

Top to bottom, 40 px side margins, 24 px gaps:
1. **Header:** clock, date, current weather, alert/status chips. **Settings gear top-right.**
2. **Quick controls:** 4×2 tile grid. Light tiles carry a vertical brightness slider (10% steps).
3. **Status row:** Energy / Network / **Servers**. The Servers card and the alert chip open the **Uptime Kuma overview panel**.
4. **Shopping (⅓) + Internet (⅔)**, same height (432 px).
5. **Weather:** fills the rest. Replaced by the **keyboard sheet** while typing.
6. The bottom tab bar was removed (D19).

**Overlays** (scrim + domed panel, `sheetIn` 260 ms): Settings (top-right, 640 px), Servers (full width), Terminal (bottom, 760 px).

## 3. Surfaces: domed glass (decided)

Levers: **Depth** (1), **Edge width** (1.75×), **Corner** (28 px).

| Layer | Off / neutral surface | On / active surface |
|---|---|---|
| Face | Top-left radial sheen (white 10%) + vertical gradient white 11% → 5% → 2.5% | Sheen (white 12%) + accent gradient 34% → 22% → 14% over dark base |
| Top-edge highlight | `inset 0 1.5e 0` white 22% + soft `inset 0 3e 4e` white ~5% | Same, white 30% |
| Bottom-edge roll-off | `inset 0 -3e 6e` black 32% | black 34% |
| Rim | `inset 0 0 0 1px` white 9% | `inset 0 0 0 1px` accent 45% |
| Drop shadows | contact `0 2 3` black 35% + ambient `0 14 32` black 30% | Same + accent glow `0 0 28` accent 22% |

- Icon discs are domed. Recessed controls use an inverted bevel. The alert chip is a red-tinted dome with a red glow, always with an icon and text.

## 4. Press feedback (decided, applies to every pressable)

1. **Sink**, instant: `translateY(1px) scale(0.985)` (keys `scale(0.975)`). Transition **90 ms** (keys 45 ms).
2. **Tint fade:** an opacity-only overlay (`z-index:-1` in an `isolation:isolate` parent). **In 45 ms, out 95 ms.**
   - **One pressed colour everywhere: "light purple"**, the accent mixed 40% toward white (follows the accent). A toggle never flashes: it settles on grey (off) or the accent (on) after release.
   - Keyboard keys use the plain accent tint (24% → 14%, rim 35%).
3. The **brightness slider** fill moves in 75 ms per notch.
- A window-level pointer-up / cancel / blur listener always clears the pressed state, so a long hold can't leave a control stuck tinted. Cards are buttons or non-draggable links.

## 5. Completion transition (shopping list; ported from the Tasks app prototype)

**Complete:** ring fills + glows (200 ms), tick draws (300 ms after 100 ms), strike sweeps left → right (350 ms) and the text greys, haptic 12 ms → **2.5 s undo grace** → row collapses down (~400 ms) into **Completed** (newest first, 60% opacity).
**Un-complete:** ring empties, strike retracts → after 420 ms fast collapse up (260 ms) → **arrives** in the open list (rise-in, 420 ms). New items also arrive this way.

## 6. Colour tokens

| Token | Value |
|---|---|
| Background | **Derived from the accent:** base `#0E131D` tinted 5% toward the accent, plus three soft fields: accent darkened (top-left), accent mixed with blue (right), accent mixed with warm (bottom). |
| Text primary / secondary / muted | `#E9EDF5` / `#A9B2C3` / `#8E98AA` |
| Accent palette (Settings) | Violet `#8B7CF6` (default), Indigo `#6366F1`, Blue `#3B82F6`, Teal `#14B8A6`, Green `#22C55E`, Rose `#EC4899`, Ember `#F97316`, Graphite `#71717A` |
| Accent soft / pale | accent mixed 55% / 75% toward white (links, icons, active subtitles) |
| Pressed tint | accent mixed 40% toward white |
| Status: good / critical | `#4CC38A` / alert red `#E83E44` family (chip fill 38% → 18%, rim 62%, glow 24%, icon `#FF5C62`), always with icon + label |
| Chart: download / upload | `#4F8EE8` / `#C9733C`. These are data colours, so they don't follow the accent. Dashed lines in the same colours mark **available capacity** (plan speed). |
| Weather icons | sun `#F2B35B`, rain `#8FB8F5`, cloud `#C7CEDB`, moon = accent soft |

## 7. Typography
- Inter (300/400/500/600), tabular numerals. JetBrains Mono for the Obsidian preview and the terminal.

## 8. Interaction patterns
- **Tap:** primary action, optimistic state change. **Long-press (~450 ms):** detail sheet (tiles).
- **Brightness slider:** tap the upper half for +10%, the lower half for −10%, drag to set.
- **Keyboard:** number row on top. `#+=` symbols, and space returns to letters. Backspace repeats when held (450 ms, then every 70 ms).
- **Settings → Reset:** two-tap confirm (arms for 3 s, turns red).
- **Wake tap:** swallowed while the screen is dark.

## 9. Performance rules
- Static shadows and gradients per state. Animate `transform` and `opacity` (plus short one-off `box-shadow`, `height` and `background-size`).
- Press tints are opacity-only overlays. No live `backdrop-filter`. Charts ≤ ~1,500 points.
