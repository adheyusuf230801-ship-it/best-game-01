// Bloomkeeper — shared tuning: the field, the palette and every number the other
// modules agree on. Nothing here touches the DOM, so the world can be simulated
// headlessly with these same constants.

/** Fixed simulation step, in seconds: the world always advances in 1/60 s ticks. */
export const STEP = 1 / 60;

/** The garden's logical size. The renderer scales it to whatever canvas it gets. */
export const FIELD = { width: 1280, height: 800 };

/** localStorage key for the best score. */
export const BEST_KEY = 'bloomkeeper-best';

/** The wave that wins the game when cleared. Waves past it are endless. */
export const WIN_WAVE = 8;

/** Colours of the night garden, named for what they paint. */
export const INK = {
  skyTop: '#0b0e27',
  skyBottom: '#1b1440',
  ground: '#101a2e',
  groundEdge: '#1d2c49',
  moon: '#f4ead0',
  moonGlow: 'rgba(244, 234, 208, 0.14)',
  star: '#cfd8ff',
  firefly: '#ffe9a3',
  keeperCloak: '#2fbf9a',
  keeperCloakDark: '#1d7a63',
  keeperSkin: '#ffd9b3',
  lantern: '#ffca66',
  lanternGlow: 'rgba(255, 202, 102, 0.35)',
  bolt: '#aef3ff',
  boltCore: '#ffffff',
  nectar: '#ffc44d',
  nectarCore: '#fff3c4',
  heart: '#ff6b8a',
  heartEmpty: 'rgba(255, 107, 138, 0.22)',
  mothBody: '#3a2b52',
  mothWing: '#6b559e',
  mothWingDark: '#4c3a75',
  mothEye: '#ff5d5d',
  darterWing: '#a34d7d',
  splitterWing: '#7d5ba6',
  text: '#f2f0ff',
  textDim: '#a7a3cc',
  panel: 'rgba(10, 12, 34, 0.78)',
  panelEdge: 'rgba(167, 163, 204, 0.45)',
  meterBack: 'rgba(255, 255, 255, 0.14)',
  meterFill: '#ffc44d',
  dashReady: '#aef3ff',
  dashSpent: 'rgba(174, 243, 255, 0.25)',
};

/** The keeper (the player): a small sprite with a lantern. */
export const KEEPER = {
  radius: 15,
  speed: 268,
  accel: 2400,
  friction: 6.5,
  hearts: 3,
  invulnSeconds: 1.3,
  fireSeconds: 0.14,
  dashSeconds: 0.16,
  dashSpeed: 760,
  dashCooldown: 1.5,
};

/** Dew bolts: what the keeper throws at the blight. */
export const BOLT = {
  radius: 5,
  speed: 580,
  lifeSeconds: 0.9,
  damage: 1,
};

/** Nectar orbs: dropped by fallen moths, gathered to grow blooms. */
export const ORB = {
  radius: 8,
  lifeSeconds: 11,
  magnetRadius: 92,
  magnetSpeed: 340,
  /** Orbs needed to grow one bloom. */
  bloomCost: 6,
};

/** Score values, named for the deed. */
export const SCORE = {
  moth: 10,
  orb: 5,
  bloom: 50,
  waveClear: 25,
};

/** The blight moths. `hp` is hits to fell, `speed` is field units a second. */
export const MOTHS = {
  drifter: { hp: 2, speed: 62, radius: 16, score: 1 },
  darter: { hp: 2, speed: 74, radius: 15, score: 1 },
  splitter: { hp: 5, speed: 44, radius: 24, score: 2 },
  bulb: { hp: 1, speed: 96, radius: 10, score: 1 },
};

/** How a wave is stocked: counts by moth kind for wave `n` (1-based). */
export function waveStock(n) {
  return {
    drifter: 4 + 2 * n,
    darter: n >= 3 ? n - 1 : 0,
    splitter: n >= 5 ? Math.floor((n - 2) / 2) : 0,
    bulb: 0,
  };
}

/** Seconds between one moth arriving and the next, shrinking as waves grow. */
export function spawnGap(n) {
  return Math.max(0.45, 1.15 - 0.07 * n);
}
