# Home Dashboard — Hardware Research

**Status:** Research v0.3 · 2026-11-22. **Decided: 24" 1080p (D10).** The user is evaluating a ~$250 AliExpress slim 24" touch panel against the branded options. Prices are AUD incl. GST, seen in Nov 2026 searches. Re-check before buying.

**Requirements:**
- Native touch, satin finish, 24" portrait.
- Compute: Pi or small x86. Nothing owned yet.
- Budget-conscious: ~$650 for screen + PC is considered steep.

---

## 1. What "satin" means in spec sheets

The relevant spec is the **anti-glare (AG) haze %** of the touch glass:
- **Glossy ("Glare"), ~0% haze:** mirror reflections.
- **Light AG, ~5–10% haze:** closest to satin. Crisp image with diffused reflections.
- **Standard matte AG, ~25% haze:** office look. Can appear slightly grainy behind touch glass.

Most vendors only say "anti-glare", so **see the panel in person if possible.** The Philips 242B9T is stocked by Officeworks.

## 2. Display shortlist (24", 1920×1080, ~93 PPI)

| Model | Touch / finish | Inputs | Price seen | Notes |
|---|---|---|---|---|
| **AliExpress slim 24" touch panel** (user-found, model TBD) | TBD: check against the §2.1 checklist | TBD | ~$250 | Slim, so less recess depth needed. Pareto option. |
| **Dell P2424HT** | 10-pt touch, IPS, anti-glare 3H | HDMI, DP, **USB-C (video + touch + power)**, **RJ45** | ~$417 (Nanobyte) · $483 ex-demo (PB Tech) | Single-cable option. Ethernet passthrough. |
| **HP E24t G5** | 10-pt touch, IPS, matte AG 3H, 75 Hz | HDMI 1.4, DP 1.2 | $399 (HP AU sale) · $446 (PB Tech) | Cheapest branded option |
| **Philips 242B9T** | PCAP 10-pt, IPS, IP54/65 front, 7H glass | HDMI, DP, DVI, VGA | ~$489–499 (PLE, Officeworks) | Finish varies by variant. Check the AU /75 in store. |
| ViewSonic TD2455 | In-cell PCAP, IPS, AG 3H | HDMI, DP, USB-C | ~$800–870 | Too expensive for the class |

*27" was ruled out (D10).*

### 2.1 Checklist for a no-name / AliExpress panel
Ordered by how much a failure would hurt this project:

1. **Touch technology:** must be **PCAP (projected capacitive), 10-point**, and enumerate as a **standard USB HID multitouch device**. That's driverless and works on Linux. Avoid IR frames, resistive touch, and anything needing a Windows driver. Ask the seller for `lsusb`, or for "works with Linux / Raspberry Pi" confirmation.
2. **Wake behaviour:** cheap controller boards often wake slowly from standby, run an input-search loop, or flash a logo or "HDMI" OSD on wake. This directly hits the ≤ 3 s wake target and the "never show a loading screen" requirement. Check reviews and videos. Ask whether "auto power on with signal" and "no-signal standby" are supported.
3. **DDC/CI:** needed for the backlight-dim wake strategy (02 §4, option B). Often missing on cheap boards. Without it, we rely on full standby (option A) plus whatever wake time the board manages. A partial fallback: dim in software (dark UI) without power saving.
4. **Panel:** IPS, true 1920×1080, ≥ 250 nits. Check for PWM flicker if listed.
5. **Glass finish:** many are **glossy**, which conflicts with the satin preference (D7). Look for "AG glass" / anti-glare options. An AG screen film is a fallback, but it dulls the premium feel.
6. **Mounting:** must have **VESA 75/100**. Some slim units only have a kickstand or proprietary bracket. Check that portrait orientation is allowed.
7. **Power:** often a **12 V DC brick**. That's convenient for a recess: smaller brick, and possibly a shared 12 V supply with the PC [Verify current draw].
8. **Inputs:** HDMI + USB-B (or full-function USB-C for one cable).
9. **Returns and warranty:** DOA and dead-pixel risk. Prefer sellers with AU warehouse stock, good review counts, and a clear return path. Australian Consumer Law recourse is weaker with overseas sellers.

**Verdict framework:** if items 1–3 check out, the cheap panel captures most of the value. Item 2 is the one most likely to make it feel cheap day to day. Items 4–6 are polish.

## 3. Compute shortlist

| Option | Price seen | Notes |
|---|---|---|
| **Intel N150 mini PC, 16 GB / 512 GB** (Beelink EQ14, GMKtec G3 Plus, Kamrui E2) | ~$260–300 (Amazon AU deals) · ~$430 (AU-stock Trigkey) | Recommended. Mature Chromium GPU acceleration. Runs the backend comfortably. Small fan. |
| MINIX Z150-0dB (N150, fanless) | ~$570 (PB Tech AU) | Silent, but pricey |
| Raspberry Pi 5 8 GB | ~$185 board (Altronics), ~$280–320 complete [estimate] | Lowest power draw. Can be **PoE-powered** with a PoE+ HAT. Similar total cost to an N150. |

## 4. Installation considerations (Q3, user investigating)

**Power**
- The monitor needs mains: either a 240 V internal supply, or a DC brick (common on slim/AliExpress units). The PC needs its own supply (N150 bricks are typically 12–19 V).
- Options:
  - (a) A **new GPO behind the screen**, ideally in a recessed box. **Fixed wiring in Australia must be done by a licensed electrician.**
  - (b) Surface cable cover down to an existing outlet.
  - (c) A recessed "TV wall box" kit that hides plugs and bricks behind the panel.

**Network**
- Wired Ethernet preferred. PoE switches are available.
- A Pi 5 could take power over Ethernet, removing one brick. N150 boxes generally can't without a PoE splitter [Verify per model].

**Where the PC lives**
- Behind the monitor on the VESA mount (most mini PCs ship with a plate). Check depth, ventilation and heat.
- Or in a nearby cupboard, with longer video + USB runs. Keep passive USB-C runs to ≤ 1–2 m.

**Mount**
- Slim, portrait-capable VESA. If recessed, plan cavity depth for monitor + mount + PC + airflow. A slim panel reduces this.

**Motion sensor**
- Below or beside the screen, aimed at the approach path.

## 5. Budget levers
- The screen is most of the cost. Options: the ~$250 AliExpress slim panel (§2.1 checklist), ex-demo branded units, or sales.
- N150 boxes regularly hit ~$260–300 on deal sites.
- A Pi 5 doesn't save money once accessories are added, unless you already have parts or want PoE power.

## 6. Sources
- Dell P2424HT: pbtech.com/au, nanobytesolutions.com.au
- HP E24t G5: hp.com/au-en (6N6E6AA), pbtech.com/au, nanobytesolutions.com.au
- Philips 242B9T: documents.philips.com datasheets, ple.com.au, officeworks.com.au
- ViewSonic TD2455: techbuy.com.au, nanobytesolutions.com.au
- iiyama T2755QSC-B1: iiyama.com, EU/UK retailers
- N150 mini PCs: ozbargain.com.au, pbtech.com/au, evotech.au
- Raspberry Pi 5: altronics.com.au
