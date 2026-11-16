// Bloomkeeper's boot and one loop. The world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one) and the renderer paints what
// is there. Screens: title (with the autopilot tending behind it), play,
// paused, won and lost — confirm starts or restarts, P pauses, M mutes.
//
// ?seed=N fixes the moth pattern. ?shot=start|play|win|over (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld,
  EVENT_BLOOM, EVENT_DASH, EVENT_KEEPER_HIT, EVENT_LOSE, EVENT_MOTH_DOWN,
  EVENT_PICKUP, EVENT_SHOOT, EVENT_WAVE_CLEAR, EVENT_WIN,
  PHASE_LOST, PHASE_WON,
} from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN,
} from './render.js';
import { pilotControl, stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    audio.startMusic();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Tending. Wave 1. ${world.state.keeper.hearts} hearts.`);
  }

  function finishGame(wonGame) {
    screen = wonGame ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (wonGame) audio.win();
    else audio.lose();
    announce(wonGame
      ? `The garden blooms! Score ${world.state.score}.`
      : `The blight prevails. Score ${world.state.score}. Best ${best}.`);
  }

  function playSounds(events) {
    if (events & EVENT_SHOOT) audio.shoot();
    if (events & EVENT_MOTH_DOWN) audio.mothDown();
    if (events & EVENT_PICKUP) audio.pickup(world.state.lastCombo);
    if (events & EVENT_BLOOM) audio.bloom();
    if (events & EVENT_DASH) audio.dash();
    if (events & EVENT_KEEPER_HIT) {
      audio.keeperHit();
      announce(world.state.keeper.hearts === 1 ? 'Hit. 1 heart left.' : `Hit. ${world.state.keeper.hearts} hearts left.`);
    }
    if (events & EVENT_WAVE_CLEAR) audio.waveClear();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      audio.unlock();
      announce(audio.toggleMuted() ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Tending.');
    }
  }

  function control() {
    if (screen === SCREEN_TITLE) return pilotControl(world.state);
    const held = input.readControl();
    const aim = renderer.toField(input.mouse.x, input.mouse.y);
    return { ...held, aimX: aim.x, aimY: aim.y };
  }

  function step() {
    const events = world.step(STEP, control());
    if (screen === SCREEN_PLAY) {
      playSounds(events);
      if (events & EVENT_WIN) finishGame(true);
      else if (events & EVENT_LOSE) finishGame(false);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Bloomkeeper. Click or press Enter to begin.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
