# Moonfall

A playable portrait JRPG battle inspired by the active-time combat of Final Fantasy IV. Three original heroes face a Moonstone Warden and two spectral wisps in the Hollow Sanctuary.

**Play:** https://themodernlife.github.io/ff4/

## Play

- Tap any glowing hero portrait, choose Attack, Magic, Items or Defend, then a target.
- Every hero and enemy has an independent ATB gauge. The queue forecasts readiness; ready heroes can act in any order.
- All timers pause throughout command navigation. Tap outside to dismiss, or use Back / Escape. Cancelled commands cost nothing.
- Nyx's Thunder exploits the Warden's weakness. Lyra's Holy deals extra damage to wisps. Use Cure, shared items and Phoenix Feathers to keep the party alive.
- Defend and Protect halve incoming damage until that hero's next action. MP and item supplies are finite.
- The pause button, battle guide and journal all pause combat. Hidden browser tabs do not advance combat. Sound effects are opt-in.
- Victory and defeat both offer a fresh encounter. This is a single-encounter prototype, with no accounts or saved progress.

## Development

Node.js 22+:

```sh
npm ci
npm run dev
```

```sh
npm test                         # deterministic combat and menu-state tests
npx playwright install chromium webkit
npm run test:e2e                  # iPhone WebKit, iPhone SE WebKit, mobile Chromium
npm run build                    # strict TypeScript check and static Vite build
npm run check                    # all checks
```

Browser tests cover image loading, viewport fit, the upcoming queue, touch command/target selection, Wait mode, stable overlay geometry, scrolling, MP/item use, enemy attacks, defeat, victory and replay. Chromium additionally exercises native touch swipes through CDP; WebKit tests use touch taps. Automated emulation supplements visual browser inspection; this is not physical iPhone hardware certification.

## Implementation

- React + TypeScript, Vite, and a pure deterministic combat reducer in `src/combat.ts`.
- Fixed-position battlefield and party dock; all command levels reuse the same overlay box. Scrolling uses native overflow and touch momentum.
- `100dvh`, safe-area insets, compact-height styles, and a desktop portrait frame.
- Original pixel-art portraits, enemies and environment. Optimized WebP assets, fonts and icons are served locally; no runtime CDN requests.
- CSS idle, attack, hit, magic and damage-number animations, with reduced-motion support.
- No ROMs or extracted game assets. The reference repository, [everything8215/ff4](https://github.com/everything8215/ff4), is a disassembly whose README requires the user to supply a ROM for data extraction. No code or assets from it were copied.

The provided workspace was empty at inspection, so there were no earlier prototype files to diagnose or preserve. This implementation starts from that empty workspace.

## Artwork

See [ARTWORK.md](ARTWORK.md) and [ART-PROMPTS.md](ART-PROMPTS.md) for provenance and exact generation prompts. Original PNGs are retained in `artwork/`, separate from the production bundle. Run `node scripts/prepare-art.mjs` to regenerate delivery WebPs. Fonts use the SIL Open Font License; Lucide icons use ISC. No Square Enix artwork, music, characters or logos are included.

## Deployment

GitHub Pages deploys through `.github/workflows/pages.yml`. Each push to `main` installs locked dependencies, runs combat and browser tests, type-checks/builds, then uploads the static `dist/` artifact. Vite uses a relative base so images, fonts and scripts work under `/ff4/`.
