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

  // Energy: Shelly dual-channel clamp. Inverter channel = solar, Meter Main = grid.
  energy: {
    solarPower: { entity: 'sensor.shelly_inverter_power', friendly: 'Shelly Inverter Power', label: 'solar power' },
    solarEnergy: { entity: 'sensor.shelly_inverter_energy', friendly: 'Shelly Inverter Energy', label: 'solar energy' },
    solarReturned: { entity: 'sensor.shelly_inverter_returned_energy', friendly: 'Shelly Inverter Returned Energy', label: 'solar returned energy' },
    gridPower: { entity: 'sensor.shelly_meter_main_power', friendly: 'Shelly Meter Main Power', label: 'grid power' },
    gridImport: { entity: 'sensor.shelly_meter_main_total_active_energy', friendly: 'Shelly Meter Main Total Active Energy', label: 'grid import' },
    gridExport: { entity: 'sensor.shelly_meter_main_total_returned_energy', friendly: 'Shelly Meter Main Total Returned Energy', label: 'grid export' },
    // 'auto' picks whichever inverter channel (Energy / Returned Energy) has counted more — that's the solar.
    solarFrom: 'auto',
    // Grid power should be positive when importing. Set to -1 if Home use reads wrong while exporting.
    gridPowerSign: 1
  },

  // Starlink integration in Home Assistant.
  starlink: {
    down: { entity: 'sensor.starlink_downlink_throughput', friendly: 'Starlink Downlink throughput', label: 'download' },
    up: { entity: 'sensor.starlink_uplink_throughput', friendly: 'Starlink Uplink throughput', label: 'upload' },
    ping: { entity: 'sensor.starlink_ping', friendly: 'Starlink Ping', label: 'ping' },
    drop: { entity: 'sensor.starlink_ping_drop_rate', friendly: 'Starlink Ping drop rate', label: 'drop rate' },
    power: { entity: 'sensor.starlink_power', friendly: 'Starlink Power', label: 'dish power' },
    energy: { entity: 'sensor.starlink_energy', friendly: 'Starlink Energy', label: 'dish energy' },
    download: { entity: 'sensor.starlink_download', friendly: 'Starlink Download', label: 'data down' },
    upload: { entity: 'sensor.starlink_upload', friendly: 'Starlink Upload', label: 'data up' },
    lastRestart: { entity: 'sensor.starlink_last_restart', friendly: 'Starlink Last restart', label: 'last restart' },
    connectivity: { entity: 'binary_sensor.starlink_connectivity', friendly: 'Starlink Connectivity', label: 'connectivity' },
    obstructed: { entity: 'binary_sensor.starlink_obstructed', friendly: 'Starlink Obstructed', label: 'obstructed' },
    thermal: { entity: 'binary_sensor.starlink_thermal_throttle', friendly: 'Starlink Thermal throttle', label: 'thermal throttle' },
    motors: { entity: 'binary_sensor.starlink_motors_stuck', friendly: 'Starlink Motors stuck', label: 'motors stuck' },
    location: { entity: 'binary_sensor.starlink_unexpected_location', friendly: 'Starlink Unexpected location', label: 'unexpected location' },
    ethernet: { entity: 'binary_sensor.starlink_ethernet_speeds', friendly: 'Starlink Ethernet speeds', label: 'ethernet speeds' },
    mast: { entity: 'binary_sensor.starlink_mast_near_vertical', friendly: 'Starlink Mast near vertical', label: 'mast' },
    heating: { entity: 'binary_sensor.starlink_heating', friendly: 'Starlink Heating', label: 'heating' },
    update: { entity: 'update.starlink_update', friendly: 'Starlink Update', label: 'firmware' },
    sleep: { entity: 'switch.starlink_sleep', friendly: 'Starlink Sleep', label: 'sleep' },
    stowed: { entity: 'switch.starlink_stowed', friendly: 'Starlink Stowed', label: 'stowed' }
  },
  plan: { down: 300, up: 30 }, // Mbps, drawn as dotted lines

  // Uptime Kuma status page (nginx proxies /kuma/ to Kuma; set by install.sh).
  kuma: { slug: 'obsidian' },

  cameraRefreshMs: 2000, // tile snapshot interval
  returnHomeAfterSec: 120 // default; can be changed in Settings on the panel
};
