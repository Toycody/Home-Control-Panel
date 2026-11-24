# Home Dashboard — Lenovo Tab (TB311FU) as a Display Target

**Status:** Draft v0.1 · 2026-11-24. The user already has this tablet wall-mounted. **Decided since:** portrait orientation, Fully Kiosk installed (free licence), battery protection cycles 40–60% (see 08).

## Device (verified specs)
- Lenovo Tab TB311FU: 10.1" IPS, **1920×1200 (224 ppi)**, 60 Hz, ~400 nits
- MediaTek **Helio G85** (2× A75 @ 2.0 GHz + 6× A55 @ 1.8 GHz), **Mali-G52 MC2** GPU
- 4 GB RAM, 128 GB storage. Android 16 (Lenovo ZUI 17.5)
- Front camera 5 MP (usable for motion wake)

## How it fits the architecture
- The tablet becomes a **thin client**: a kiosk browser shows the dashboard SPA. Nothing else runs on it.
- **dashboard-service moves off the display** to an always-on host (homelab Docker host or the HA box). It serves the SPA and the API and keeps history and settings. This also lets several displays (tablet now, 24" later) share one backend and settings. [Q14]
- **Kiosk app: Fully Kiosk Browser** (recommended).
  - Full-screen kiosk lock and auto-start on boot.
  - Camera-based motion detection to wake the screen.
  - Screen on/off and brightness control.
  - HA integration (requires **Fully Plus licence** for Remote Admin).
  - Uses Android System WebView (Chromium). Keep WebView/Chrome updated.
- **Wake/sleep becomes easy.** Android screen-on via Fully is near-instant, so the "monitor standby wake time" risk from the 24" plan doesn't apply. Choose the wake source: tablet camera, the planned room motion sensor via HA, or both.

## Performance expectations (assessment, to be verified on device)
- **Fine:** taps, opacity tint fades, transform-based press/sink, toggles, completion animation, keyboard.
- **At risk:** full-screen overlays with multiple large layered `box-shadow`s (Settings, Servers), scrolling lists inside glass cards, redrawing the 12 h graph, large static radial-gradient background repaints.
- **Mitigation: a "Lite rendering" setting**, auto-on for this device profile:
  - Fewer shadow layers: drop the ambient shadow and accent glow, keep the top-edge highlight and bottom roll-off.
  - No `box-shadow` transitions (press uses transform + tint only).
  - Background as a pre-rendered image, not CSS gradients.
  - Graph decimated to ≤ 600 points. Canvas if needed.
  - Overlays without scrim fade.
- **Measure with:** Chrome remote debugging (FPS meter, paint flashing) from a PC over USB/Wi-Fi.

## Sizing: needs its own layout profile, not a scaled copy
- At a probable device pixel ratio of 1.5 [Verify on device], the CSS viewport is **~1280×800 landscape / 800×1280 portrait**, about **150 CSS px per inch**.
- Scaling the 1080×1920 design into 800 px wide (×0.74) would shrink keyboard keys to ~34 px (≈ 6 mm) and the slider to ~30 px. **Too small.**
- Targets on the tablet: **minimum ~72 CSS px (12 mm)**, preferred **~88 px (15 mm)** for tiles, keys and slider tracks. Body text ≥ 18–20 CSS px.
- Same components, same design system, same settings. Only layout and sizes change per **device profile** (chosen by viewport size or a `?profile=tablet` URL).
- The portrait tablet layout that was built is described in `08-tablet-pages.md`.

## Practical notes
- **Battery on 24/7 power:** keeping the tablet at 100% for months stresses the battery (swelling risk). The user has battery protection cycling 40–60%.
- Screen brightness at night: Fully + HA can dim it. IPS has no burn-in concern.
- Wi-Fi only (Wi-Fi 5). Fine for this use.

## Open questions
- ✅ **T1** Portrait (trial).
- ✅ **T2** Fully Kiosk Browser installed; free (watermarked) licence for now. Plus needed for HA screen control.
- **T3** Is the tablet the main display now (24" plan on hold), or an additional panel elsewhere?
- **T4** Where should dashboard-service run: existing Docker host, or the HA machine?
