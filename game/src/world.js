// The garden's simulation: waves of blight moths, the keeper's movement and
// dew bolts, nectar, blooms and scoring. Pure logic over plain objects — no
// DOM, no Math.random — so a seed and a sequence of controls fully decide a
// run, and the same code can be stepped headlessly for tests and screenshots.

import {
  BOLT, FIELD, INK, KEEPER, MOTHS, ORB, SCORE, WIN_WAVE, spawnGap, waveStock,
} from './config.js';
import {
  KIND_BULB, KIND_DARTER, KIND_SPLITTER,
  makeBolt, makeFloatText, makeFlowerBeds, makeKeeper, makeMoth, makeOrb, makeParticle,
} from './entities.js';

export const EVENT_SHOOT = 1;
export const EVENT_MOTH_DOWN = 2;
export const EVENT_PICKUP = 4;
export const EVENT_BLOOM = 8;
export const EVENT_KEEPER_HIT = 16;
export const EVENT_DASH = 32;
export const EVENT_WAVE_CLEAR = 64;
export const EVENT_WIN = 128;
export const EVENT_LOSE = 256;

export const PHASE_FIGHTING = 'fighting';
export const PHASE_REST = 'rest';
export const PHASE_WON = 'won';
export const PHASE_LOST = 'lost';

const EDGE_INSET = 26;
/** Seconds of calm between a wave falling and the next arriving. */
const REST_SECONDS = 2.4;

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

export function createWorld(rng) {
  const state = {
    time: 0,
    phase: PHASE_FIGHTING,
    wave: 0,
    restT: 0,
    score: 0,
    nectar: 0, // orbs held toward the next bloom
    blooms: 0,
    combo: 0,
    comboT: 0,
    lastCombo: 0,
    kills: 0,
    gathered: 0,
    keeper: makeKeeper(),
    moths: [],
    bolts: [],
    orbs: [],
    particles: [],
    texts: [],
    flowers: [],
    spawnQueue: [],
    spawnT: 0,
    bannerText: '',
    bannerT: 0,
    shake: 0,
  };

  function burst(x, y, colour, count, speed = 140, life = 0.55, size = 3) {
    for (let i = 0; i < count; i += 1) {
      state.particles.push(makeParticle(x, y, rng, colour, speed, life, size));
    }
  }

  function setBanner(text, seconds = 1.7) {
    state.bannerText = text;
    state.bannerT = seconds;
  }

  function spawnMothAt(kind, x, y) {
    const moth = makeMoth(kind, x, y, rng);
    state.moths.push(moth);
    return moth;
  }

  function spawnFromEdge(kind) {
    const keeper = state.keeper;
    let x = 0;
    let y = 0;
    // A few tries for an edge point that does not land on top of the keeper.
    for (let tries = 0; tries < 8; tries += 1) {
      const side = rng.int(0, 3);
      if (side === 0) { x = rng.range(EDGE_INSET, FIELD.width - EDGE_INSET); y = EDGE_INSET; }
      if (side === 1) { x = rng.range(EDGE_INSET, FIELD.width - EDGE_INSET); y = FIELD.height - EDGE_INSET; }
      if (side === 2) { x = EDGE_INSET; y = rng.range(EDGE_INSET, FIELD.height - EDGE_INSET); }
      if (side === 3) { x = FIELD.width - EDGE_INSET; y = rng.range(EDGE_INSET, FIELD.height - EDGE_INSET); }
      if (Math.hypot(x - keeper.x, y - keeper.y) > 280) break;
    }
    return spawnMothAt(kind, x, y);
  }

  function beginWave(n) {
    state.wave = n;
    state.phase = PHASE_FIGHTING;
    const stock = waveStock(n);
    const queue = [];
    for (const kind of Object.keys(stock)) {
      for (let i = 0; i < stock[kind]; i += 1) queue.push(kind);
    }
    // Shuffle so kinds arrive mixed, not in blocks.
    for (let i = queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng.next() * (i + 1));
      const tmp = queue[i];
      queue[i] = queue[j];
      queue[j] = tmp;
    }
    state.spawnQueue = queue;
    state.spawnT = 0.5;
    setBanner(n === 1 ? 'Wave 1 — the blight stirs' : `Wave ${n}`);
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.nectar = 0;
    state.blooms = 0;
    state.combo = 0;
    state.comboT = 0;
    state.lastCombo = 0;
    state.kills = 0;
    state.gathered = 0;
    state.keeper = makeKeeper();
    state.moths = [];
    state.bolts = [];
    state.orbs = [];
    state.particles = [];
    state.texts = [];
    state.flowers = makeFlowerBeds(rng);
    state.shake = 0;
    state.restT = 0;
    beginWave(1);
  }

  function fellMoth(moth, events) {
    const spec = MOTHS[moth.kind];
    state.score += SCORE.moth * spec.score;
    state.kills += 1;
    burst(moth.x, moth.y, moth.kind === KIND_DARTER ? INK.darterWing : INK.mothWing, 12, 150, 0.5, 3.4);
    burst(moth.x, moth.y, INK.lantern, 5, 90, 0.4, 2.4);
    state.texts.push(makeFloatText(moth.x, moth.y - 14, `+${SCORE.moth * spec.score}`, INK.text));
    if (moth.kind === KIND_SPLITTER) {
      for (let i = 0; i < 2; i += 1) {
        const child = spawnMothAt(KIND_BULB, moth.x + rng.range(-16, 16), moth.y + rng.range(-16, 16));
        child.vx = rng.range(-70, 70);
        child.vy = rng.range(-70, 70);
      }
    }
    const drops = moth.kind === KIND_SPLITTER ? 3 : rng.chance(0.3) ? 2 : 1;
    for (let i = 0; i < drops; i += 1) state.orbs.push(makeOrb(moth.x, moth.y, rng));
    return events | EVENT_MOTH_DOWN;
  }

  function keeperHit(moth, events) {
    const keeper = state.keeper;
    keeper.hearts -= 1;
    keeper.invulnT = KEEPER.invulnSeconds;
    state.shake = 0.4;
    state.combo = 0;
    burst(keeper.x, keeper.y, INK.heart, 14, 170, 0.5, 3.2);
    burst(moth.x, moth.y, INK.mothWing, 8, 130, 0.45, 3);
    events |= EVENT_KEEPER_HIT;
    if (keeper.hearts <= 0) {
      state.phase = PHASE_LOST;
      burst(keeper.x, keeper.y, INK.lantern, 30, 220, 0.9, 3.6);
      events |= EVENT_LOSE;
    }
    return events;
  }

  function stepKeeper(dt, ctrl, events) {
    const keeper = state.keeper;
    keeper.fireCd = Math.max(0, keeper.fireCd - dt);
    keeper.dashCd = Math.max(0, keeper.dashCd - dt);
    keeper.invulnT = Math.max(0, keeper.invulnT - dt);

    const hasAim = typeof ctrl.aimX === 'number' && typeof ctrl.aimY === 'number';
    if (hasAim) keeper.face = Math.atan2(ctrl.aimY - keeper.y, ctrl.aimX - keeper.x);
    else if (ctrl.mx !== 0 || ctrl.my !== 0) keeper.face = Math.atan2(ctrl.my, ctrl.mx);

    if (ctrl.dash && keeper.dashCd <= 0 && keeper.dashT <= 0) {
      const dx = ctrl.mx !== 0 || ctrl.my !== 0 ? ctrl.mx : Math.cos(keeper.face);
      const dy = ctrl.mx !== 0 || ctrl.my !== 0 ? ctrl.my : Math.sin(keeper.face);
      const len = Math.hypot(dx, dy) || 1;
      keeper.dashDx = dx / len;
      keeper.dashDy = dy / len;
      keeper.dashT = KEEPER.dashSeconds;
      keeper.dashCd = KEEPER.dashCooldown;
      events |= EVENT_DASH;
    }

    if (keeper.dashT > 0) {
      keeper.dashT -= dt;
      keeper.x += keeper.dashDx * KEEPER.dashSpeed * dt;
      keeper.y += keeper.dashDy * KEEPER.dashSpeed * dt;
      state.particles.push(makeParticle(keeper.x, keeper.y, rng, INK.dashReady, 30, 0.3, 3));
    } else {
      const rate = KEEPER.accel * dt;
      keeper.vx += clamp(ctrl.mx * KEEPER.speed - keeper.vx, -rate, rate);
      keeper.vy += clamp(ctrl.my * KEEPER.speed - keeper.vy, -rate, rate);
      keeper.x += keeper.vx * dt;
      keeper.y += keeper.vy * dt;
    }
    keeper.walkPhase += Math.hypot(keeper.vx, keeper.vy) * dt * 0.05;
    keeper.x = clamp(keeper.x, keeper.radius, FIELD.width - keeper.radius);
    keeper.y = clamp(keeper.y, keeper.radius, FIELD.height - keeper.radius);

    if (ctrl.fire && keeper.fireCd <= 0 && state.phase === PHASE_FIGHTING) {
      keeper.fireCd = KEEPER.fireSeconds;
      const angle = keeper.face;
      state.bolts.push(makeBolt(
        keeper.x + Math.cos(angle) * (keeper.radius + 6),
        keeper.y + Math.sin(angle) * (keeper.radius + 6),
        angle,
      ));
      events |= EVENT_SHOOT;
    }
    return events;
  }

  function stepMoth(dt, moth) {
    const keeper = state.keeper;
    moth.age += dt;
    moth.flashT = Math.max(0, moth.flashT - dt);
    const dx = keeper.x - moth.x;
    const dy = keeper.y - moth.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;

    if (moth.kind === KIND_DARTER) {
      moth.phaseT -= dt;
      if (moth.phase === 'drift') {
        moth.vx = ux * moth.speed;
        moth.vy = uy * moth.speed;
        if (moth.phaseT <= 0 && dist < 430) {
          moth.phase = 'telegraph';
          moth.phaseT = 0.45;
        } else if (moth.phaseT <= 0) moth.phaseT = 0.5;
      } else if (moth.phase === 'telegraph') {
        moth.vx *= 0.8;
        moth.vy *= 0.8;
        if (moth.phaseT <= 0) {
          moth.phase = 'lunge';
          moth.phaseT = 0.42;
          moth.lungeDx = ux;
          moth.lungeDy = uy;
        }
      } else {
        moth.vx = moth.lungeDx * moth.speed * 4.3;
        moth.vy = moth.lungeDy * moth.speed * 4.3;
        if (moth.phaseT <= 0) {
          moth.phase = 'drift';
          moth.phaseT = rng.range(1.3, 2.1);
        }
      }
    } else {
      const wobble = Math.sin(moth.age * 2.6 + moth.wobbleSeed) * 0.45;
      const px = -uy * wobble;
      const py = ux * wobble;
      moth.vx += ((ux + px) * moth.speed - moth.vx) * Math.min(1, dt * 3);
      moth.vy += ((uy + py) * moth.speed - moth.vy) * Math.min(1, dt * 3);
    }
    moth.x += moth.vx * dt;
    moth.y += moth.vy * dt;
    moth.x = clamp(moth.x, moth.radius, FIELD.width - moth.radius);
    moth.y = clamp(moth.y, moth.radius, FIELD.height - moth.radius);
  }

  function step(dt, ctrl) {
    let events = 0;
    state.time += dt;
    state.bannerT = Math.max(0, state.bannerT - dt);
    state.shake = Math.max(0, state.shake - dt * 1.6);
    if (state.comboT > 0) {
      state.comboT -= dt;
      if (state.comboT <= 0) state.combo = 0;
    }

    // Flowers open toward the bloom count, two beds a bloom.
    for (let i = 0; i < state.flowers.length; i += 1) {
      const bed = state.flowers[i];
      const target = i < state.blooms * 2 ? 1 : 0;
      bed.open += clamp(target - bed.open, -dt * 0.7, dt * 0.7);
    }

    if (state.phase === PHASE_REST) {
      state.restT -= dt;
      if (state.restT <= 0) {
        if (state.wave >= WIN_WAVE) {
          state.phase = PHASE_WON;
          setBanner('The garden blooms!', 2.6);
          events |= EVENT_WIN;
        } else {
          beginWave(state.wave + 1);
        }
      }
    }

    if (state.phase === PHASE_FIGHTING && state.spawnQueue.length > 0) {
      state.spawnT -= dt;
      if (state.spawnT <= 0) {
        spawnFromEdge(state.spawnQueue.shift());
        state.spawnT = spawnGap(state.wave);
      }
    }

    events = stepKeeper(dt, ctrl, events);

    for (const moth of state.moths) stepMoth(dt, moth);
    // A gentle separation so moths read as a swarm, not a stack.
    for (let i = 0; i < state.moths.length; i += 1) {
      for (let j = i + 1; j < state.moths.length; j += 1) {
        const a = state.moths[i];
        const b = state.moths[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const min = a.radius + b.radius - 2;
        if (dist > 0.01 && dist < min) {
          const push = (min - dist) / 2;
          const ux = dx / dist;
          const uy = dy / dist;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }

    // Bolts fly and land.
    const bolts = [];
    for (const bolt of state.bolts) {
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      bolt.life -= dt;
      if (bolt.life <= 0 || bolt.x < -20 || bolt.x > FIELD.width + 20 || bolt.y < -20 || bolt.y > FIELD.height + 20) continue;
      let spent = false;
      for (const moth of state.moths) {
        if (moth.hp <= 0) continue;
        if (Math.hypot(moth.x - bolt.x, moth.y - bolt.y) < moth.radius + bolt.radius) {
          moth.hp -= BOLT.damage;
          moth.flashT = 0.09;
          moth.x += bolt.vx * 0.012;
          moth.y += bolt.vy * 0.012;
          burst(bolt.x, bolt.y, INK.bolt, 3, 80, 0.3, 2.2);
          spent = true;
          break;
        }
      }
      if (!spent) bolts.push(bolt);
    }
    state.bolts = bolts;

    // Felled moths leave the field (and their gifts behind).
    const survivors = [];
    for (const moth of state.moths) {
      if (moth.hp <= 0) events = fellMoth(moth, events);
      else survivors.push(moth);
    }
    state.moths = survivors;

    // Moths that reach the keeper cost a heart — and are spent themselves.
    if (state.phase === PHASE_FIGHTING || state.phase === PHASE_REST) {
      const keeper = state.keeper;
      const after = [];
      for (const moth of state.moths) {
        const touching = Math.hypot(moth.x - keeper.x, moth.y - keeper.y) < moth.radius + keeper.radius - 2;
        if (touching && keeper.invulnT <= 0 && keeper.dashT <= 0) {
          events = keeperHit(moth, events);
          if (state.phase === PHASE_LOST) {
            // The rest of the swarm stays on the final frame.
            after.push(...state.moths.slice(state.moths.indexOf(moth) + 1));
            break;
          }
        } else after.push(moth);
      }
      state.moths = after;
    }

    // Nectar drifts, is drawn to the keeper, and is gathered.
    const orbs = [];
    for (const orb of state.orbs) {
      const keeper = state.keeper;
      const dx = keeper.x - orb.x;
      const dy = keeper.y - orb.y;
      const dist = Math.hypot(dx, dy);
      orb.life -= dt;
      if (dist < ORB.magnetRadius && dist > 1) {
        orb.vx += (dx / dist) * ORB.magnetSpeed * dt * 3;
        orb.vy += (dy / dist) * ORB.magnetSpeed * dt * 3;
      }
      orb.vx *= Math.exp(-2.2 * dt);
      orb.vy *= Math.exp(-2.2 * dt);
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      if (dist < keeper.radius + orb.radius + 6) {
        state.score += SCORE.orb;
        state.gathered += 1;
        state.nectar += 1;
        state.combo += 1;
        state.comboT = 2.5;
        state.lastCombo = state.combo;
        events |= EVENT_PICKUP;
        burst(orb.x, orb.y, INK.nectar, 4, 70, 0.35, 2.2);
        if (state.nectar >= ORB.bloomCost) {
          state.nectar -= ORB.bloomCost;
          state.blooms += 1;
          state.score += SCORE.bloom;
          state.texts.push(makeFloatText(keeper.x, keeper.y - 30, `Bloom! +${SCORE.bloom}`, INK.nectar));
          burst(keeper.x, keeper.y, INK.firefly, 16, 150, 0.8, 2.8);
          events |= EVENT_BLOOM;
        }
        continue;
      }
      if (orb.life > 0) orbs.push(orb);
    }
    state.orbs = orbs;

    // A wave is cleared when its queue is spent and its moths are gone.
    if (state.phase === PHASE_FIGHTING && state.spawnQueue.length === 0 && state.moths.length === 0) {
      state.score += SCORE.waveClear * state.wave;
      state.phase = PHASE_REST;
      state.restT = REST_SECONDS;
      setBanner(`Wave ${state.wave} cleared!`, 1.8);
      events |= EVENT_WAVE_CLEAR;
    }

    // Particles and floating texts rise and fade.
    state.particles = state.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      return p.life > 0;
    });
    state.texts = state.texts.filter((t) => {
      t.life -= dt;
      t.y -= 34 * dt;
      return t.life > 0;
    });

    return events;
  }

  reset();
  return { state, reset, step, spawnMothAt };
}
