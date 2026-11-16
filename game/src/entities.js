// Factories for everything that moves in the garden. An entity is a plain
// object of numbers and strings; world.js moves them, render.js paints them.
// Kinds are strings so a saved state stays readable.

import { BOLT, FIELD, KEEPER, MOTHS, ORB } from './config.js';

export const KIND_DRIFTER = 'drifter';
export const KIND_DARTER = 'darter';
export const KIND_SPLITTER = 'splitter';
export const KIND_BULB = 'bulb';

export function makeKeeper() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2,
    vx: 0,
    vy: 0,
    radius: KEEPER.radius,
    hearts: KEEPER.hearts,
    face: -Math.PI / 2, // the way the lantern points, radians
    fireCd: 0,
    dashT: 0,
    dashCd: 0,
    dashDx: 0,
    dashDy: 0,
    invulnT: 0,
    walkPhase: 0,
  };
}

export function makeMoth(kind, x, y, rng) {
  const spec = MOTHS[kind];
  return {
    kind,
    x,
    y,
    vx: 0,
    vy: 0,
    radius: spec.radius,
    hp: spec.hp,
    maxHp: spec.hp,
    speed: spec.speed * rng.range(0.88, 1.12),
    wobbleSeed: rng.range(0, Math.PI * 2),
    // Darters cycle: drift, telegraph, lunge. Others stay in 'drift'.
    phase: 'drift',
    phaseT: rng.range(0.8, 1.8),
    lungeDx: 0,
    lungeDy: 0,
    flashT: 0, // white flash right after a hit lands
    age: 0,
  };
}

export function makeBolt(x, y, angle) {
  return {
    x,
    y,
    vx: Math.cos(angle) * BOLT.speed,
    vy: Math.sin(angle) * BOLT.speed,
    radius: BOLT.radius,
    life: BOLT.lifeSeconds,
  };
}

export function makeOrb(x, y, rng) {
  const angle = rng.angle();
  const speed = rng.range(30, 95);
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: ORB.radius,
    life: ORB.lifeSeconds,
    bobSeed: rng.range(0, Math.PI * 2),
  };
}

export function makeParticle(x, y, rng, colour, speed = 130, life = 0.55, size = 3) {
  const angle = rng.angle();
  const v = speed * rng.range(0.25, 1);
  return {
    x,
    y,
    vx: Math.cos(angle) * v,
    vy: Math.sin(angle) * v - 24,
    life: life * rng.range(0.6, 1.15),
    maxLife: life,
    size: size * rng.range(0.6, 1.4),
    colour,
  };
}

export function makeFloatText(x, y, text, colour) {
  return { x, y, text, colour, life: 0.9, maxLife: 0.9 };
}

/** The ring of flower beds around the garden; each opens as blooms grow. */
export function makeFlowerBeds(rng) {
  const beds = [];
  const spots = 26;
  for (let i = 0; i < spots; i += 1) {
    const t = i / spots;
    const angle = t * Math.PI * 2;
    const rx = FIELD.width / 2 - 46;
    const ry = FIELD.height / 2 - 40;
    beds.push({
      x: FIELD.width / 2 + Math.cos(angle) * rx + rng.range(-14, 14),
      y: FIELD.height / 2 + Math.sin(angle) * ry + rng.range(-10, 10),
      hue: rng.pick(['#ff8fb2', '#ffc44d', '#aef3ff', '#c39bff', '#8fffc9']),
      scale: rng.range(0.75, 1.3),
      swaySeed: rng.range(0, Math.PI * 2),
      open: 0, // 0 shut, 1 fully open; world raises it as blooms grow
    });
  }
  return beds;
}
