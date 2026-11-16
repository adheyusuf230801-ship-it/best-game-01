// Keyboard and mouse, read as the keeper's intent. Movement and aiming are
// polled every tick; discrete presses (confirm, pause, mute) are queued as
// action bits and handed out once by takeActions().

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const MOVE_KEYS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function createInput(canvas) {
  const held = new Set();
  const mouse = { x: 0, y: 0, down: false, seen: false };
  let queued = 0;

  window.addEventListener('keydown', (event) => {
    if (MOVE_KEYS[event.code] || event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') queued |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') queued |= ACTION_PAUSE;
    if (event.code === 'KeyM') queued |= ACTION_MUTE;
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.seen = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.seen = true;
    mouse.down = true;
    queued |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => {
    mouse.down = false;
  });

  return {
    mouse,
    /** Hand out the queued action bits and clear the queue. */
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
    /**
     * The held controls as one control object for world.step: mx/my are the
     * movement axes (-1..1), fire is the mouse button or Space held down,
     * dash is Shift held down.
     */
    readControl() {
      let mx = 0;
      let my = 0;
      for (const code of held) {
        const dir = MOVE_KEYS[code];
        if (dir === 'left') mx -= 1;
        if (dir === 'right') mx += 1;
        if (dir === 'up') my -= 1;
        if (dir === 'down') my += 1;
      }
      const length = Math.hypot(mx, my);
      if (length > 1) {
        mx /= length;
        my /= length;
      }
      return {
        mx,
        my,
        fire: mouse.down || held.has('Space'),
        dash: held.has('ShiftLeft') || held.has('ShiftRight'),
      };
    },
  };
}
