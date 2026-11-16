// The staged scenes behind ?shot=start|play|win|over, and the autopilot that
// plays them. Every scene is the real game stepped forward from a fresh world
// under the real rules — the pilot just plays it, well or badly — so a seed
// always gives the same frame, and the frame is one a real game can reach.
// main.js also borrows the pilot for the title screen's demo keeper.

import { STEP, WIN_WAVE } from './config.js';
import { KIND_DARTER, KIND_DRIFTER } from './entities.js';
import { PHASE_LOST, PHASE_WON } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const IDLE = { mx: 0, my: 0, fire: false, dash: false };

/** One tick of a decent keeper: kite the nearest moth, shoot it, fetch nectar. */
export function pilotControl(state) {
  const keeper = state.keeper;
  let threat = null;
  let threatDist = Infinity;
  for (const moth of state.moths) {
    const d = Math.hypot(moth.x - keeper.x, moth.y - keeper.y);
    if (d < threatDist) {
      threatDist = d;
      threat = moth;
    }
  }
  let mx = 0;
  let my = 0;
  let aimX = keeper.x + Math.cos(keeper.face) * 12;
  let aimY = keeper.y + Math.sin(keeper.face) * 12;
  let fire = false;
  let dash = false;
  if (threat) {
    aimX = threat.x;
    aimY = threat.y;
    fire = threatDist < 480;
    const away = threatDist > 0.01 ? 1 / threatDist : 0;
    if (threatDist < 230) {
      mx = (keeper.x - threat.x) * away;
      my = (keeper.y - threat.y) * away;
      dash = threatDist < 100 || (threat.kind === KIND_DARTER && threat.phase === 'telegraph' && threatDist < 190);
    } else if (threatDist > 330) {
      mx = (threat.x - keeper.x) * away;
      my = (threat.y - keeper.y) * away;
    } else {
      mx = -(threat.y - keeper.y) * away;
      my = (threat.x - keeper.x) * away;
    }
  }
  if (!threat || threatDist > 300) {
    let orb = null;
    let orbDist = Infinity;
    for (const o of state.orbs) {
      const d = Math.hypot(o.x - keeper.x, o.y - keeper.y);
      if (d < orbDist) {
        orbDist = d;
        orb = o;
      }
    }
    if (orb && orbDist > 24) {
      mx = (orb.x - keeper.x) / (orbDist || 1);
      my = (orb.y - keeper.y) / (orbDist || 1);
    }
  }
  return { mx, my, aimX, aimY, fire, dash };
}

function runFor(world, seconds, control) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) world.step(STEP, control(world.state));
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Any other name is the title scene.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name === 'play') {
    // Play until the frame is alive — moths on the field and a bolt in the
    // air — rather than risk catching the calm between two waves.
    for (let i = 0; i < 45 / STEP; i += 1) {
      world.step(STEP, pilotControl(state));
      if (state.time > 6 && state.moths.length >= 4 && state.bolts.length >= 1) break;
      if (state.phase === PHASE_WON || state.phase === PHASE_LOST) break;
    }
    return { screen: SCREEN_PLAY, best: state.score };
  }
  if (name === 'win') {
    // A long tending, staged at its last moment: wave 8, one worn moth left,
    // the garden nearly all in bloom. The pilot fells it under the real rules
    // and the win arrives through the ordinary wave-clear path.
    runFor(world, 6, pilotControl);
    state.spawnQueue = [];
    state.moths = [];
    state.bolts = [];
    state.wave = WIN_WAVE;
    state.score = 2960;
    state.kills = 147;
    state.gathered = 69;
    state.blooms = 11;
    state.nectar = 3;
    state.keeper.hearts = 2;
    state.flowers.forEach((bed, i) => {
      bed.open = i < 22 ? 1 : 0;
    });
    const last = world.spawnMothAt(KIND_DRIFTER, state.keeper.x + 190, state.keeper.y - 60);
    last.hp = 1;
    runFor(world, 6, pilotControl);
    for (let i = 0; i < 200 && state.phase !== PHASE_WON; i += 1) world.step(STEP, pilotControl(state));
    return { screen: SCREEN_WIN, best: state.score };
  }
  if (name === 'over') {
    // A real tending first — a wave or two of honest work — then a keeper
    // who stops fighting back: the blight arrives, and arrives.
    runFor(world, 30, pilotControl);
    for (let i = 0; i < 60 * 150 && state.phase !== PHASE_LOST; i += 1) world.step(STEP, IDLE);
    return { screen: SCREEN_OVER, best: Math.max(state.score, 2130) };
  }
  runFor(world, 5, pilotControl);
  return { screen: SCREEN_TITLE, best: 0 };
}
