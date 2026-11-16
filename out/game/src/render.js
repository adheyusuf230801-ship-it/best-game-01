// Everything Bloomkeeper looks like: the night garden, the keeper, the blight
// and every screen, drawn on a 2D canvas. The renderer only reads the world
// state; the field's logical 1280x800 is scaled to fit the window, and
// toField() maps pointer positions back into field coordinates for aiming.

import { FIELD, INK, KEEPER, ORB } from './config.js';
import { PHASE_LOST, PHASE_REST, PHASE_WON } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const FONT_BODY = '600 15px system-ui, -apple-system, "Segoe UI", sans-serif';
const FONT_SMALL = '600 12.5px system-ui, -apple-system, "Segoe UI", sans-serif';
const FONT_TITLE = '700 84px Georgia, "Times New Roman", serif';
const FONT_HEADING = '700 44px Georgia, "Times New Roman", serif';
const FONT_BANNER = '700 34px Georgia, "Times New Roman", serif';

/** A tiny fixed-seed scatter so the fireflies are the same on every load. */
function scatter(count, seed) {
  let state = seed >>> 0;
  const out = [];
  for (let i = 0; i < count; i += 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const x = (state >>> 8) / 16777216;
    state = (state * 1664525 + 1013904223) >>> 0;
    const y = (state >>> 8) / 16777216;
    out.push({ x: x * FIELD.width, y: y * FIELD.height, phase: (i * 1.7) % (Math.PI * 2) });
  }
  return out;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const fireflies = scatter(36, 20261115);
  const view = { scale: 1, ox: 0, oy: 0, width: 0, height: 0 };
  let skyGradient = null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    view.scale = Math.min(w / FIELD.width, h / FIELD.height);
    view.ox = (w - FIELD.width * view.scale) / 2;
    view.oy = (h - FIELD.height * view.scale) / 2;
    view.width = w;
    view.height = h;
    skyGradient = null;
  }
  window.addEventListener('resize', resize);
  resize();

  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view.ox) / view.scale,
      y: (clientY - rect.top - view.oy) / view.scale,
    };
  }

  function heart(x, y, size, fill) {
    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.9);
    ctx.bezierCurveTo(x - size * 1.25, y - size * 0.15, x - size * 0.55, y - size * 1.05, x, y - size * 0.3);
    ctx.bezierCurveTo(x + size * 0.55, y - size * 1.05, x + size * 1.25, y - size * 0.15, x, y + size * 0.9);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function drawGarden(state) {
    if (!skyGradient) {
      skyGradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
      skyGradient.addColorStop(0, INK.skyTop);
      skyGradient.addColorStop(1, INK.skyBottom);
    }
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Moonlight pooling in the middle of the garden.
    const glow = ctx.createRadialGradient(640, 380, 60, 640, 380, 620);
    glow.addColorStop(0, 'rgba(120, 130, 220, 0.13)');
    glow.addColorStop(1, 'rgba(120, 130, 220, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // The garden plot itself.
    ctx.beginPath();
    ctx.roundRect(18, 18, FIELD.width - 36, FIELD.height - 36, 26);
    ctx.fillStyle = INK.ground;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK.groundEdge;
    ctx.stroke();

    // Drifting fireflies.
    for (const f of fireflies) {
      const x = f.x + Math.sin(state.time * 0.4 + f.phase) * 16;
      const y = f.y + Math.cos(state.time * 0.31 + f.phase * 1.3) * 12;
      const tw = 0.35 + 0.3 * Math.sin(state.time * 2 + f.phase * 3);
      ctx.beginPath();
      ctx.arc(x, y, 2.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 233, 163, ${tw.toFixed(3)})`;
      ctx.fill();
    }

    // The moon, top right but clear of the score readout.
    ctx.beginPath();
    ctx.arc(1006, 88, 56, 0, Math.PI * 2);
    ctx.fillStyle = INK.moonGlow;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1006, 88, 27, 0, Math.PI * 2);
    ctx.fillStyle = INK.moon;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(995, 81, 5.4, 0, Math.PI * 2);
    ctx.arc(1015, 97, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(160, 150, 120, 0.35)';
    ctx.fill();
  }

  function drawFlower(bed, time) {
    const sway = Math.sin(time * 1.3 + bed.swaySeed) * 0.08;
    ctx.save();
    ctx.translate(bed.x, bed.y);
    // Stem.
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.quadraticCurveTo(sway * 22, 2, sway * 30, -6);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#2e7d5b';
    ctx.stroke();
    if (bed.open <= 0.03) {
      // A shut bud.
      ctx.beginPath();
      ctx.ellipse(sway * 30, -9, 4.4, 6.4, sway, 0, Math.PI * 2);
      ctx.fillStyle = '#3f9e6e';
      ctx.fill();
    } else {
      const s = bed.scale * (0.55 + 0.45 * bed.open);
      ctx.translate(sway * 30, -10);
      ctx.rotate(sway);
      ctx.scale(s, s);
      ctx.fillStyle = bed.hue;
      for (let p = 0; p < 5; p += 1) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 6.4, Math.sin(a) * 6.4, 5.4, 3.6, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
      ctx.fillStyle = INK.nectarCore;
      ctx.fill();
    }
    ctx.restore();
  }

  function drawOrb(orb, time) {
    const bob = Math.sin(time * 3 + orb.bobSeed) * 2.4;
    const blink = orb.life < 2.5 ? (Math.sin(time * 14) > 0 ? 1 : 0.25) : 1;
    ctx.save();
    ctx.globalAlpha = blink;
    const glow = ctx.createRadialGradient(orb.x, orb.y + bob, 1, orb.x, orb.y + bob, 17);
    glow.addColorStop(0, 'rgba(255, 196, 77, 0.5)');
    glow.addColorStop(1, 'rgba(255, 196, 77, 0)');
    ctx.beginPath();
    ctx.arc(orb.x, orb.y + bob, 17, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(orb.x, orb.y + bob, orb.radius - 1.5, 0, Math.PI * 2);
    ctx.fillStyle = INK.nectar;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(orb.x - 2, orb.y + bob - 2, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = INK.nectarCore;
    ctx.fill();
    ctx.restore();
  }

  function drawMoth(moth, time) {
    const flap = Math.sin(time * 16 + moth.wobbleSeed * 4) * 0.5;
    const telegraphing = moth.kind === 'darter' && moth.phase === 'telegraph';
    ctx.save();
    ctx.translate(moth.x, moth.y);
    const heading = Math.atan2(moth.vy, moth.vx);
    if (Math.abs(moth.vx) + Math.abs(moth.vy) > 1) ctx.rotate(heading + Math.PI / 2);
    if (telegraphing) ctx.translate(Math.sin(time * 60) * 1.6, 0);
    const wing = moth.flashT > 0 ? '#ffffff'
      : moth.kind === 'darter' ? INK.darterWing
      : moth.kind === 'splitter' ? INK.splitterWing
      : INK.mothWing;
    ctx.fillStyle = wing;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.rotate(flap * 0.55);
      ctx.beginPath();
      ctx.ellipse(moth.radius * 0.78, -moth.radius * 0.1, moth.radius * 0.85, moth.radius * 0.5, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, moth.radius * 0.52, moth.radius * 0.78, 0, 0, Math.PI * 2);
    ctx.fillStyle = moth.flashT > 0 ? '#ffffff' : INK.mothBody;
    ctx.fill();
    if (moth.kind === 'splitter') {
      ctx.beginPath();
      ctx.arc(-5, -6, 3, 0, Math.PI * 2);
      ctx.arc(6, 2, 2.4, 0, Math.PI * 2);
      ctx.arc(-2, 8, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 233, 163, 0.5)';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(-4.4, -moth.radius * 0.42, 2.3, 0, Math.PI * 2);
    ctx.arc(4.4, -moth.radius * 0.42, 2.3, 0, Math.PI * 2);
    ctx.fillStyle = telegraphing ? '#ffd166' : INK.mothEye;
    ctx.fill();
    ctx.restore();
    if (moth.maxHp >= 5 && moth.hp < moth.maxHp) {
      ctx.beginPath();
      ctx.roundRect(moth.x - 16, moth.y - moth.radius - 12, 32, 4.5, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(moth.x - 16, moth.y - moth.radius - 12, 32 * (moth.hp / moth.maxHp), 4.5, 2);
      ctx.fillStyle = INK.heart;
      ctx.fill();
    }
  }

  function drawKeeper(keeper, time) {
    const bob = Math.sin(keeper.walkPhase * 6) * 1.6;
    ctx.save();
    ctx.translate(keeper.x, keeper.y + bob);
    // Soft shadow.
    ctx.beginPath();
    ctx.ellipse(0, 13 - bob, 14, 4.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fill();
    if (keeper.invulnT > 0 && Math.sin(time * 26) > 0) ctx.globalAlpha = 0.45;
    // Cloak: a rounded teardrop, darker hem.
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.bezierCurveTo(11, -12, 13.5, 4, 9, 13);
    ctx.quadraticCurveTo(0, 17.5, -9, 13);
    ctx.bezierCurveTo(-13.5, 4, -11, -12, 0, -15);
    ctx.closePath();
    ctx.fillStyle = INK.keeperCloak;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-9, 13);
    ctx.quadraticCurveTo(0, 17.5, 9, 13);
    ctx.lineTo(9, 9);
    ctx.quadraticCurveTo(0, 13, -9, 9);
    ctx.closePath();
    ctx.fillStyle = INK.keeperCloakDark;
    ctx.fill();
    // Face under the hood.
    ctx.beginPath();
    ctx.arc(0, -6.5, 6.4, 0, Math.PI * 2);
    ctx.fillStyle = INK.keeperSkin;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-2.2, -6.8, 1.05, 0, Math.PI * 2);
    ctx.arc(2.2, -6.8, 1.05, 0, Math.PI * 2);
    ctx.fillStyle = '#402b1e';
    ctx.fill();
    ctx.restore();

    // The lantern, held toward the aim.
    const lx = keeper.x + Math.cos(keeper.face) * 19;
    const ly = keeper.y + bob + Math.sin(keeper.face) * 19;
    const glow = ctx.createRadialGradient(lx, ly, 1, lx, ly, 30);
    glow.addColorStop(0, INK.lanternGlow);
    glow.addColorStop(1, 'rgba(255, 202, 102, 0)');
    ctx.beginPath();
    ctx.arc(lx, ly, 30, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lx, ly, 5.4, 0, Math.PI * 2);
    ctx.fillStyle = INK.lantern;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(lx, ly, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff6da';
    ctx.fill();
  }

  function drawHud(state, best) {
    const keeper = state.keeper;
    ctx.save();
    // Hearts, top left.
    for (let i = 0; i < KEEPER.hearts; i += 1) {
      heart(44 + i * 34, 44, 11, i < keeper.hearts ? INK.heart : INK.heartEmpty);
    }
    // Wave, top centre.
    ctx.font = FONT_BODY;
    ctx.textAlign = 'center';
    ctx.fillStyle = INK.text;
    const waveLabel = state.phase === PHASE_REST ? `Wave ${state.wave} cleared` : `Wave ${state.wave}`;
    ctx.fillText(waveLabel, FIELD.width / 2, 46);
    // Score and best, top right.
    ctx.textAlign = 'right';
    ctx.font = '700 24px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillStyle = INK.text;
    ctx.fillText(String(state.score), FIELD.width - 40, 50);
    ctx.font = FONT_SMALL;
    ctx.fillStyle = INK.textDim;
    ctx.fillText(`Best ${Math.max(best, state.score)}`, FIELD.width - 40, 72);
    if (state.combo >= 3) {
      ctx.font = FONT_BODY;
      ctx.fillStyle = INK.nectar;
      ctx.fillText(`Combo x${state.combo}`, FIELD.width - 40, 96);
    }
    // Bloom meter, bottom left: pips for the nectar held, blooms grown beside.
    ctx.textAlign = 'left';
    ctx.font = FONT_SMALL;
    ctx.fillStyle = INK.textDim;
    ctx.fillText('NECTAR TO BLOOM', 40, FIELD.height - 52);
    for (let i = 0; i < ORB.bloomCost; i += 1) {
      ctx.beginPath();
      ctx.roundRect(40 + i * 22, FIELD.height - 44, 16, 10, 5);
      ctx.fillStyle = i < state.nectar ? INK.meterFill : INK.meterBack;
      ctx.fill();
    }
    ctx.font = FONT_BODY;
    ctx.fillStyle = INK.text;
    ctx.fillText(`Blooms grown: ${state.blooms}`, 40, FIELD.height - 16);
    // Dash state, bottom right.
    ctx.textAlign = 'right';
    ctx.font = FONT_SMALL;
    ctx.fillStyle = INK.textDim;
    ctx.fillText('DASH (SHIFT)', FIELD.width - 40, FIELD.height - 52);
    ctx.beginPath();
    ctx.roundRect(FIELD.width - 120, FIELD.height - 44, 80, 10, 5);
    ctx.fillStyle = INK.meterBack;
    ctx.fill();
    const ready = 1 - Math.max(0, keeper.dashCd) / KEEPER.dashCooldown;
    ctx.beginPath();
    ctx.roundRect(FIELD.width - 120, FIELD.height - 44, 80 * ready, 10, 5);
    ctx.fillStyle = ready >= 1 ? INK.dashReady : INK.dashSpent;
    ctx.fill();
    ctx.restore();

    // The wave banner.
    if (state.bannerT > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.bannerT / 0.5);
      ctx.font = FONT_BANNER;
      ctx.textAlign = 'center';
      ctx.fillStyle = INK.text;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 12;
      ctx.fillText(state.bannerText, FIELD.width / 2, 128);
      ctx.restore();
    }
  }

  function panel(lines, title, titleColour = INK.text) {
    ctx.fillStyle = INK.panel;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.font = FONT_HEADING;
    ctx.fillStyle = titleColour;
    ctx.fillText(title, FIELD.width / 2, 268);
    ctx.font = FONT_BODY;
    lines.forEach((line, i) => {
      ctx.fillStyle = line.dim ? INK.textDim : INK.text;
      ctx.font = line.big ? '700 22px system-ui, -apple-system, "Segoe UI", sans-serif' : FONT_BODY;
      ctx.fillText(line.text, FIELD.width / 2, 330 + i * 34);
    });
  }

  function drawScreen(state, screen, best) {
    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(7, 8, 26, 0.45)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      ctx.textAlign = 'center';
      ctx.font = FONT_TITLE;
      ctx.fillStyle = INK.text;
      ctx.shadowColor = INK.lanternGlow;
      ctx.shadowBlur = 34;
      ctx.fillText('BLOOMKEEPER', FIELD.width / 2, 252);
      ctx.shadowBlur = 0;
      ctx.font = 'italic 600 20px Georgia, "Times New Roman", serif';
      ctx.fillStyle = INK.nectar;
      ctx.fillText('Tend the moonlit garden. Keep the blight from the blooms.', FIELD.width / 2, 300);
      ctx.font = FONT_BODY;
      ctx.fillStyle = INK.text;
      const lines = [
        'Move with WASD or the arrow keys — aim with the mouse',
        'Hold click or Space to throw dew bolts at the moths',
        'Shift to dash through danger — gather nectar to grow blooms',
        `Clear wave 8 to make the whole garden bloom`,
        'P pauses · M mutes',
      ];
      lines.forEach((line, i) => ctx.fillText(line, FIELD.width / 2, 372 + i * 30));
      ctx.font = '700 22px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.fillStyle = INK.firefly;
      const pulse = 0.75 + 0.25 * Math.sin(state.time * 3.2);
      ctx.globalAlpha = pulse;
      ctx.fillText('Click or press Enter to begin', FIELD.width / 2, 580);
      ctx.globalAlpha = 1;
      if (best > 0) {
        ctx.font = FONT_BODY;
        ctx.fillStyle = INK.textDim;
        ctx.fillText(`Best score: ${best}`, FIELD.width / 2, 624);
      }
    } else if (screen === SCREEN_PAUSED) {
      panel([{ text: 'The garden holds its breath.' }, { text: 'Press P to go on tending', dim: true }], 'Paused');
    } else if (screen === SCREEN_OVER) {
      panel([
        { text: `Score ${state.score}`, big: true },
        { text: `You reached wave ${state.wave} and felled ${state.kills} moths` },
        { text: `Blooms grown: ${state.blooms} · Nectar gathered: ${state.gathered}` },
        { text: `Best: ${Math.max(best, state.score)}`, dim: true },
        { text: 'Click or press Enter to tend again' },
      ], 'The Blight Prevails', INK.heart);
    } else if (screen === SCREEN_WIN) {
      panel([
        { text: `Score ${state.score}`, big: true },
        { text: `All 8 waves cleared — ${state.kills} moths felled, ${state.blooms} blooms grown` },
        { text: `Nectar gathered: ${state.gathered} · Hearts left: ${state.keeper.hearts}` },
        { text: `Best: ${Math.max(best, state.score)}`, dim: true },
        { text: 'Click or press Enter to tend a new garden' },
      ], 'The Garden Blooms!', INK.nectar);
    }
  }

  function draw(state, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, view.width, view.height);
    const shakeX = state.shake > 0 ? Math.sin(state.time * 91) * state.shake * 11 : 0;
    const shakeY = state.shake > 0 ? Math.cos(state.time * 83) * state.shake * 9 : 0;
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox + shakeX * view.scale, view.oy + shakeY * view.scale);

    drawGarden(state);
    for (const bed of state.flowers) drawFlower(bed, state.time);
    for (const orb of state.orbs) drawOrb(orb, state.time);
    for (const moth of state.moths) drawMoth(moth, state.time);
    for (const bolt of state.bolts) {
      const glow = ctx.createRadialGradient(bolt.x, bolt.y, 0.5, bolt.x, bolt.y, 12);
      glow.addColorStop(0, 'rgba(174, 243, 255, 0.55)');
      glow.addColorStop(1, 'rgba(174, 243, 255, 0)');
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, bolt.radius - 1, 0, Math.PI * 2);
      ctx.fillStyle = INK.boltCore;
      ctx.fill();
    }
    if (state.phase !== PHASE_LOST) drawKeeper(state.keeper, state.time);
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.colour;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = FONT_SMALL;
    ctx.textAlign = 'center';
    for (const t of state.texts) {
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      ctx.fillStyle = t.colour;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;

    if (screen !== SCREEN_TITLE) drawHud(state, best);
    drawScreen(state, screen, best);

    // A soft vignette to close the scene.
    const vig = ctx.createRadialGradient(640, 400, 420, 640, 400, 860);
    vig.addColorStop(0, 'rgba(3, 4, 12, 0)');
    vig.addColorStop(1, 'rgba(3, 4, 12, 0.42)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  return { draw, toField };
}
