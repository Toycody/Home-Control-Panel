// Home Control Panel — site configuration.
// install.sh copies this to config.js on first install; edit config.js on the host over SSH
// (config.js is git-ignored so updates never overwrite it). No secrets live here: the panel
// signs in through Home Assistant's own login page and keeps its token on the tablet.
//
// `entity` is the expected entity ID. If it isn't found, the panel looks for an entity
// in the same domain whose friendly name matches `friendly`, and shows what it picked
// under Settings → Diagnostics. Fix the ID here once you've confirmed it.

window.PANEL_CONFIG = {
  // Your Home Assistant address, as the tablet's browser can reach it.
  // Only used to send the tablet to HA's login page the first time.
  haUrl: 'http://homeassistant.local:8123',

  lights: [
    { entity: 'light.dining_lights', friendly: 'Dining Lights', name: 'Dining' },
    { entity: 'light.lounge_lights', friendly: 'Lounge Lights', name: 'Lounge' },
    { entity: 'light.living_room_lamp', friendly: 'Living Room Lamp', name: 'Living lamp' },
    { entity: 'light.display', friendly: 'Display', name: 'Display' }
  ],

  // Shown stacked in the right-hand column of the lights row.
  scenes: [
    { entity: 'script.house_off', friendly: 'House Off', name: 'House off', sub: 'Lights + AC', icon: 'power' },
    { entity: 'scene.theater', friendly: 'Theater', name: 'Theater', sub: 'Movie lighting', icon: 'film' }
  ],

  climate: { entity: 'climate.lounge_ac', friendly: 'Lounge AC', name: 'Air con' },

  // Met.no's default entity is weather.forecast_home ("Forecast Home").
  weather: { entity: 'weather.forecast_home', friendly: 'Forecast Home' },

  // `still` = sub-stream (tiles, refreshed as snapshots). `live` = main stream (full screen).
  cameras: [
    { name: 'Entry', live: 'camera.vigi_c450_mainstream', still: 'camera.vigi_c450_minorstream' },
    { name: 'Driveway', live: 'camera.vigi_c540_mainstream', still: 'camera.vigi_c540_minorstream' }
  ],

  cameraRefreshMs: 2000, // tile snapshot interval
  returnHomeAfterSec: 120 // default; can be changed in Settings on the panel
};
