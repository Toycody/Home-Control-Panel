# Deploying to a Debian 13 LXC on Proxmox

The panel is static files served by nginx. nginx also proxies Home Assistant's
`/api/` and `/auth/token`, so the tablet only ever talks to the LXC and HA needs
no CORS or config changes. No secrets are stored on the LXC: the tablet signs in
once through HA's own login page (as the `wall` user) and keeps its token.

## 1. Create the LXC (Proxmox host shell)

Download the Debian 13 template if you don't have it:

```bash
pveam update
pveam available --section system | grep debian-13
pveam download local debian-13-standard_13.1-2_amd64.tar.zst   # use the exact name the previous command printed
```

Create the container. Use the template file name you just downloaded, and adjust the ID (`210`), storage (`local-lvm`) and bridge (`vmbr0`) to match your host:

```bash
pct create 210 local:vztmpl/debian-13-standard_13.1-2_amd64.tar.zst \
  --hostname home-panel --unprivileged 1 --cores 1 --memory 256 --swap 256 \
  --rootfs local-lvm:4 --net0 name=eth0,bridge=vmbr0,ip=dhcp --onboot 1 --features nesting=1
pct start 210
```

Then give it a **DHCP reservation in Omada** so the tablet's URL never changes.

## 2. Install the panel (inside the LXC)

```bash
pct enter 210
apt-get update && apt-get install -y curl
curl -fsSLO https://raw.githubusercontent.com/Toycody/Home-Control-Panel/main/deploy/install.sh
bash install.sh http://<HA-IP>:8123
```

If the repository is **private**, the `curl` and `git clone` need credentials. Either make the
repo public (it holds no secrets), or clone it yourself first with a read-only deploy key and
then run `bash /opt/home-control-panel/deploy/install.sh http://<HA-IP>:8123`.

Check the proxy reaches HA (401 means HA answered, which is what we want):

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost/api/
```

## 3. Point the tablet at it

In Fully Kiosk: **Settings → Web Content Settings → Start URL** = `http://<LXC-IP>/`.

The first load sends you to Home Assistant's login page. Sign in as **wall** and tick
**Keep me logged in**. You land back on the panel and it stays signed in.

## 4. Check the entities

Open **Settings (top right) → Diagnostics** on the panel:
- ✓ = found as configured
- ≈ = found by name under a different ID (works, but put the real ID in `config.js`)
- ✗ = not found

Edit `/opt/home-control-panel/app/config.js` over SSH, then tap **Reload panel**.

## Updating

```bash
bash /opt/home-control-panel/deploy/install.sh
```

Pulls the latest code and keeps your `config.js`. Reload the panel on the tablet.

## Local testing without Home Assistant

`node test/mock-ha.mjs` serves the panel against a fake HA on http://localhost:8765/.
