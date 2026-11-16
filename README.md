# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/adheyusuf230801-ship-it/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/adheyusuf230801-ship-it/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Bloomkeeper** — a moonlit garden defense game. You are the keeper sprite of a
night garden, and the blight is coming for your blooms: moths drift in from the
dark in eight growing waves — drifters, lunging darters, and splitters that
burst into bulbs. Throw dew bolts with the mouse, dash through danger with
Shift, and gather the nectar the fallen drop: every six orbs grow a new bloom
in the ring of flower beds around the garden. Clear wave 8 and the whole
garden blooms; lose your three hearts and the blight prevails.

Move with WASD or the arrow keys, aim with the mouse, hold click or Space to
throw bolts. P pauses, M mutes. The game is plain static files under `game/`
(no build step, no network), drawn and sounded entirely by its own code —
canvas art and synthesised WebAudio, no assets. `main.ts` hands it in: it
copies `game/` and `screenshots/` to the output directory and writes the
dossier the judges read.

## Run it

```sh
node serve.ts
# then open http://localhost:8080 in a desktop browser

# or hand it in (writes out/dossier.json):
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=pe031vr5&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
