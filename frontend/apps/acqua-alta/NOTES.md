# Acqua Alta frontend — NOTES (running log)

## 2026-08-11 — Stake Revisions 3 Wild Ejecta fix completed

- Read the single finding in root `Super Massive Revisions 3.pdf` and reproduced DARK MATTER book
  `3692`. The frontend was not dropping a state update: the published math authored the returned
  Wild at padded row `0`, which is the hidden reel-feed cell rather than one of the four visible
  board rows. That contradicted the player rule that a 6+ cluster returns a Wild to the board.
- Production math now selects only visible refill slots and rejects empty, duplicate, off-grid, or
  non-Wild Ejecta targets. All six pools and lookup tables were regenerated: 200,000 books, 396,486
  Wild targets, zero hidden targets, and 96.5% weighted RTP in every mode. The exact reviewer case
  now returns one Wild to `{reel: 0, row: 2}` and carries it through terminal settlement; its newly
  calibrated payout is `0.63x`.
- `scripts/sync_math_disclosures.py` consumes the full-precision generated math manifest, verifies
  the raw mode ceilings, and owns synchronization of all 128 paytable values, both six-mode max-win
  displays, and the compact 70-book preview library. The library includes every mode maximum and
  reviewer book `ante/3692`; `--check` is the release drift gate.
- New exact maxima are base `1243.88x`, ante `984.49x`, wildshot `711.81x`, bonus `1822.75x`,
  ejecta `2999.11x`, and superbonus `4715.98x`.
- Production build passed (`1975 modules`, `Wrote site to "build"`, `✔ done`, `200 /`). The packaged
  frontend replayed `ante/3692` twice through `finalWin` with the visible row-2 Wild, correct DARK
  MATTER `1.25x` cost, `0.63x` settlement, and zero browser console/network errors. Captured frames
  also show the returned Wild settled on its visible cell. `dist-upload/frontend/` was refreshed
  byte-identically from that build; the revised 13-file math folder must be uploaded with it.
- ESLint remains unavailable repo-wide because ESLint 9 cannot find an `eslint.config.*`; this is
  the existing tooling configuration failure. Python compilation, generated-source drift checks,
  Prettier, `git diff --check`, production build, package audit, and runtime replay all pass.

## 2026-08-09 — Stake Revisions 2 completed and packaged

- Read the five-page root `Super Massive Revisions 2.pdf` and traced each finding against the
  published `math upload/` artifacts before changing code. Math was not modified.
- Exact per-mode max-win values now match the LUT ceilings on all app metadata/Game Rules surfaces:
  base 800.57x, ante 829.08x, wildshot 505.32x, bonus 2108.15x, ejecta 3159.41x, superbonus 3481.56x.
- `utils-shared/amount.ts` now reserves fixed two-decimal formatting for balance/play amounts and
  renders live wins/totals with up to four useful decimals. Replay win formatting follows the same
  rule. The review example 0.10 × 0.17 now displays 0.017 instead of 0.02.
- `ModalPayTable.svelte` now discloses all cluster sizes 5-20 in four four-column blocks with vertical
  scrolling only; automated comparison confirmed all 128 values match `config.ts`.
- `Mascot.svelte` uses the 229..614 union alpha x-bounds measured across all 61 idle frames instead
  of the incomplete 240..601 estimate. The large 1.18x wide zoom is preserved, but it pivots from
  the board-side alpha edge and translates left/off-screen. The former off-screen clamp is removed,
  so narrow windows cannot push the cat back over the reels; Popout S keeps a larger clearance gap.
- `ClusterWinAmounts.svelte` assigns multiple simultaneous labels ordered, width-capped horizontal
  lanes; `ClusterWinAmount.svelte` uses responsive bitmap text inside those bounds.
- `HudBar.svelte` mounts the SDK's existing Space-hold controller while jurisdiction/menu gates are
  open. A 400ms hold sets `stateBet.isSpaceHold`; the bet state machine immediately starts another
  round after settlement while the key remains down and stops looping on release.
- Verification: max/LUT parity pass, paytable 128/128 pass, label-lane invariant pass, mascot frame
  union pass, `git diff --check` pass. The final production build transformed 1975 modules and
  printed `Wrote site to "build"`, `✔ done`, `200 /`. No screenshots/visual browser checks were run.
- `dist-upload/frontend/` now contains the final build: 222 files, 31 MB, and a recursive `diff -rq`
  against `apps/acqua-alta/build/` returned clean. The previous folder is preserved at
  `dist-upload/_pre-revisions2-frontend-20260809/`.

## Running backlog

- **Image-generation rule:** create all future project images through Higgsfield. Do not use the built-in image generator unless the user explicitly changes this instruction. This applies to the planned desktop/mobile loading-cover redraws.
- **DONE - Label every landed Wild:** a readable `WILD` label now pops in with a short bright overshoot when a Wild first appears or lands, then remains visible inside the symbol's transformed container through reel, tumble, win, and black-hole suction states. The existing Wild animation remains intact underneath it.
- **DONE - Mark the free-spins symbol:** a clear `FS` badge now appears along the bottom of the free-spins/scatter symbol using the same short pop-in, lift, and elastic overshoot as `WILD`, then remains attached and readable through the symbol's later states.
- **Clarify black-hole Wild ejection:** make every `wildEjecta` event unmistakable. Give the Wild a stronger launch cue at the black hole, a readable flight path and travel time, an emphasized destination cell, and a clear landing/settle beat on the scored board so players understand that the hole added a Wild. Keep event timing authoritative and avoid covering unrelated symbols or delaying normal play excessively.
- **DONE - Polish mascot black-hole suction frontend:** the complete mascot body and harness now travel along a curved, layout-derived path to the real black-hole position with a capture stretch, restrained suction trail, colored afterimages, and absorption impact. The hole ejects him along the reversed path, the tether reconnects during return, and a final elastic settle explicitly resets the rope at the shared anchor. **Production trigger contract remains required:** this is a rare server-authoritative Cat Rescue award, never a client timer or ordinary-win reaction. Production math should emit `catSnap` only for a dedicated award of at least `20x`, at most once per paid round or free-spin feature.
- **DONE (2026-08-07) - Remove the ordinary mascot tug:** the `tumbleBoardExplode` handlers are gone from `Mascot.svelte` and `TetherRope.svelte`, along with `tugged`/`tugTimer`/`tug()` and the CSS rules that only the tug used. The mascot now moves toward the black hole only during the server-authored Cat Rescue sequence.
- **DONE (2026-08-07) - cat idle tether alignment:** root cause was the tug itself, not a static geometry error. `.tugged .frame` transformed the ART (translate+rotate+scaleX+skew about 42%/62%) while `.tugged .tether-anchor` — a SIBLING, so untouched by that transform — applied a flat `translate(46px,-8px)`: ~14px of separation, released over a 650ms elastic curve the two rode out of phase. Multi-cascade tumbles overlap those windows continuously, so the rope floated off his harness for most of normal play. It was desyncing the lighting overlays (also siblings) too. All three points now derive from one helper, `frameVortexScreenPoint()` in `src/game/constants.ts`; verified by reimplementing the layout chain in Python across 6 viewport sizes in base and free spins — foot == vortex to floating-point exactness. Also fixed a real defect found on the way: the mascot hides on `stateUi.menuOpen` but the rope only faded on `uiHide`/`uiShow` book events, which the menu never emits, so opening the menu left the rope hanging from the vortex to nothing, drawn over the canvas menu.
- **Reposition the free-spins win announcement:** on desktop, place the win announcement banner below the black hole so it never covers the hole. **Mobile review still required:** remind the user to inspect it on a phone; likely place it above the game board and offset to one side, but do not finalize that placement without the mobile check.
- **Replace the HUD/control bar:** build the larger, more obvious control-panel treatment from the user's saved Hacksaw reference; the current controls are too small and easy to miss. Preserve all StakeEngine states, balances, accessibility, and input behavior while adapting the visual layout.
- **Make the board assembly 5% smaller:** scale the game board and its complete border/frame down together by 5% to reserve more room for the HUD. Recalculate dependent overlays, free-spin counters, win amounts, mascot placement, black-hole effects, and the cat-to-vortex tether against the new board transform.
- **DONE - Redraw both loading covers and all five bonus cards through Higgsfield; pending user visual review:** the desktop/mobile loading illustrations and all five card illustrations were regenerated from the live mascot, background, frame, Wild, FS, and logo references. Runtime WebPs retain the existing filenames and exact required sizes. Full-resolution Higgsfield PNGs are preserved under `assets-src/generated/higgsfield-20260803/`; replaced runtime files are backed up under `assets-src/backups/pre-higgsfield-20260803/`. Bonus modal copy was rewritten first in short, mechanic-first language. No screenshot-based visual verification was performed; the user will review in the running game.
- **DONE - Unify mascot and scene lighting:** the cat now has a clearly visible helmet-glass pane, rotating helmet/chest edge lights, faster localized metal glints, and a mild body-light response. Symbol lighting intensity and speed are both increased by 40%, including whole-symbol sweeps, moving-part glints, sparkles, core pulses, nova rings, and material gleams. One irregular shared scene pulse now drives the cat, symbols, and a stationary warm/cool screen illumination layer. Constrained devices keep the cheap composited cat/screen response at lower intensity while still skipping the heavier extra Pixi layers; the rejected large travelling beam has not returned.
- **Enlarge the logo on small mobile:** increase the in-game logo size specifically for narrow phone layouts while keeping it inside the available top gutter and clear of the mascot, board, win UI, and controls.
- **Re-shoot the Game Rules control images after the new HUD lands** (user-requested 2026-08-07): the CONTROLS section of `ModalGameRules.svelte` depicts every interactive button with its in-game art, because Stake requires unlabeled icon buttons to be shown. Those images are the CURRENT HUD's buttons, so replacing the small HUD with the Hacksaw-inspired bar invalidates all of them. Re-capture and replace the `ui('btn_*.webp')` assets in the same pass, or the game info will depict controls that no longer exist. **Blocked on the HUD replacement above.**
- **Mobile review of the 80% Game Rules window** (2026-08-07): the modal was changed from near-fullscreen (`100vw/100vh − 10px`) to `80vw × 80vh` at the user's request, and the hero image was removed. The inner scroll column is inset 13% each side, so on a phone the effective text column is now ~59vw. Wants a look on a real handset; if it reads cramped, the fix is a media query restoring near-full width under ~520px rather than reverting the desktop size.

### RESOLVED 2026-08-07 — production math built for all six modes

**This blocker is cleared.** `math upload/` now carries all six modes; `index.json` declares `base`,
`ante`, `wildshot`, `bonus`, `ejecta`, `superbonus`. The mock aliases in `routes/+layout.svelte` are
removed and `mockBooks.json` is regenerated from the real books. The spec below is kept as the
authoritative record of the contract that was implemented — read it before touching either mode.

Final prices, both derived from simulation rather than chosen by hand:

- **`wildshot` 25x → 1.70x.** One spin with three Wilds is naturally worth **1.610x**. At 25x that is
  6.4% RTP, and forcing 96.5% would have needed a lookup-table weight factor of **53.7** — published
  odds bearing no relation to the simulated game. Three Wilds add about 1x of value; a 25x price
  point needs a different feature, not a different number.
- **`ejecta` 200x → 225x at 15 free spins** (was 14). Natural value 217.1x, realised RTP 96.500%,
  weight factor **1.0069** — the published table reproduces the honest simulation to within 0.7%.
  63.0% of features fire at least one Reactor reload beyond the opening launch.

One deliberate design call: **in `ejecta` the ordinary per-cluster wild injection is disabled**, so the
Reactor is the only source of `wildEjecta`. This is required for correctness — the frontend fires
`ejectaReactorFire` (resetting the on-screen meter) on *any* `wildEjecta` in that mode, so a second
Wild source would silently desync the displayed meter from the math.

Two latent defects in the build tooling were found and fixed on the way. `calibrate()` never
converged: base payout variance is ~14x its mean, so its 4-iteration secant on 8k books was
noise-dominated and oscillated between 1.87 and 2.55 on consecutive runs; it is now a closed-form
solve that locks `PAY_SCALE` at 1.7362 deterministically. And `sim_pool` seeded from `hash(mode)`,
which Python salts per process — **the shipped artifacts could never have been regenerated
identically**. Now `zlib.crc32`.

Still open on the math side: **`bonus` prices at 100x but 12 free spins are naturally worth ~113x**,
so its lookup table down-weights big wins ~35% (factor 0.653) to force 96.5%. It is the one mode
whose served odds diverge meaningfully from the honest simulation. Not new — the old build had the
same tension, distributed differently. Clean fixes are raising the price to ~117x or trimming the
feature; both need player-copy changes.

- **THREE-WILD SHOT (`wildshot`, temporary 25x):** one purchased feature spin must begin with exactly three server-selected Wild positions on the visible board. The three Wilds must be part of the authoritative scored board, not a client overlay added after scoring. The book should emit the board and three-Wild launch/landing sequence in an order that keeps visuals, win evaluation, payout, replay, and resume identical.
- **EJECTA REACTOR (`ejecta`, temporary 200x):** a free-spins feature starts by firing exactly three Wilds onto the first playable board. Wilds persist through the current spin's cascades only. Every winning cluster of 6-8 symbols adds one Reactor charge; every cluster of 9+ adds two. At three stored charges, reset the meter and emit exactly three server-selected Wilds onto the current board. Charge persists between free spins and can trigger repeatedly. The Gravity Multiplier continues to ratchet through the feature.
- **Book/event contract:** emit normal `reveal`, `freeSpinTrigger`, `updateFreeSpin`, `winInfo`, tumble, total-win, outro, and final-win events. Each `winInfo` result must include `clusterSize`. Each Reactor launch must emit `wildEjecta` with the exact final visible landing positions occupied by Wilds in the scored math state. Define deterministic ordering for a full meter, Wild insertion, cluster evaluation, tumble refill, and retriggers.
- **Math deliverables:** add both case-sensitive mode keys and final cost multipliers to the math config; define reel/board generation and feature state; calculate RTP contribution, hit rate, volatility, average feature payout, max exposure, and 5000x cap behavior; run adequate simulations; then regenerate production books, lookup tables, frontend config data, and publish artifacts.
- **Integration checks:** update the modal prices only after final costs are approved. Verify natural/base/ante behavior is unchanged; purchased debit equals the final multiplier; all balances and terminal totals reconcile; interrupted rounds resume with Reactor charge intact; replay URLs work for both modes; and production RGS authentication advertises the same mode keys the frontend sends.
- **Current preview limitation:** localhost aliases and synthetic preview books exist only so the frontend cards, Wild flights, and Reactor display can be exercised today. They are not approved math, RTP evidence, or production StakeEngine outputs and must be replaced rather than copied into release math.
- **Cat Rescue trigger:** production math alone decides when the mascot black-hole sequence occurs. Emit `catSnap` only for a dedicated Cat Rescue award of at least `20x`, never for an ordinary win or a random frontend reaction, and cap it at one occurrence per paid round or free-spin feature. The event amount, terminal totals, replay, and resume state must reconcile exactly.

## 2026-08-03 - Higgsfield loading and bonus-art pass

- Used Higgsfield `nano_banana_pro` with the actual game mascot, base background, previous loading cover, frame top, Wild, Free Spins, and logo assets as references. Seven jobs completed: landscape loader, portrait loader, DARK MATTER, THREE-WILD SHOT, EVENT HORIZON, EJECTA REACTOR, and SINGULARITY.
- Source PNGs: `apps/acqua-alta/assets-src/generated/higgsfield-20260803/`. Runtime conversions: loaders at 1664x936 and 720x1280; cards at 576x768; total served WebP size about 844 KB.
- Runtime paths remain `static/assets/sprites/ui/loading_supermassive.webp`, `loading_supermassive_portrait.webp`, and `static/assets/sprites/ui/buy-cards/{dark_matter,three_wild_shot,event_horizon,ejecta_reactor,singularity}.webp`.
- Simplified player copy now says: DARK MATTER doubles Free Spins chance; THREE-WILD SHOT is one spin with three Wilds fired onto the board; EVENT HORIZON gives 12 Free Spins and the multiplier never resets; EJECTA REACTOR starts with three Wilds and winning clusters fire three more; SINGULARITY gives 15 Free Spins at x12 with extra Wilds from the black hole.
- Player-facing copy intentionally omits temporary-pricing caveats. The release-blocker section above remains the source of truth: `wildshot` 25x and `ejecta` 200x are placeholders until production math and final pricing exist.

## 2026-06-10 — De-Spine pass: all Spine removed, static sprites + programmatic Pixi animation

### What was done
- **Zero functional Spine references left in the app** (`grep -rn "SpineProvider|SpineTrack|SpineSlot|esotericsoftware|type: 'spine'" src package.json` → empty; remaining case-insensitive "spine" hits are only `freeSpinEnd` identifiers and comments). Spine stays in `packages/pixi-svelte` (other apps use it) — only this app stopped consuming it.
- Deleted: `src/components/SymbolSpine.svelte`, `src/components/SymbolSpineMain.svelte`, `static/assets/spines/` (16 spine bundles), `static/assets/sprites/symbolsStatic/`, `static/assets/sprites/payFrame/` (both replaced/unused).
- New `src/game/tween.ts` — tiny rAF tween helper with cancel tokens. Key property vs `svelte/motion` `Tween`: an interrupted tween RESOLVES instead of never settling, so awaited animation chains in bookEvent handlers can never hang the game.
- New `src/game/soundMap.ts` — single semantic-name → audiosprite-key map (`MUSIC.*`, `SFX.*`). ALL app sound call sites now go through it (bookEventHandlerMap, stateGame, Sound/Anticipations/Symbol/ClusterWinAmount/GlobalMultiplier, winLevelMap, constants SCATTER_LAND_SOUND_MAP). Final audio swap = rebuild audiosprite + edit `sound.ts` unions + this one file.
- **Symbols** (`constants.ts` SYMBOL_INFO_MAP): every state of every symbol is now `{ type:'sprite', assetKey:'symbol_<NAME>' }`; all state looks are code-driven in the rewritten `SymbolSprite.svelte`:
  - `static`: breathing scale 1.00↔1.02 loop; `land`: squash-settle scaleY 0.92→1 / scaleX 1.06→1 elasticOut, then `oncomplete`; `win`: GlowFilter (pixi-filters, amber) + alpha flash + scale-pulse 1.0→1.15 (loops if `loop` prop, oncomplete after first cycle); `postWinStatic`: dim to alpha 0.6; `explosion`: glow + scale→1.45 + fade→0, then `oncomplete`; `spin`: plain.
  - `Symbol.svelte` is now a thin wrapper (symbolInfo lookup + wild-explode SFX); `ReelSymbol`/`TumbleSymbol` `animating` flags keyed off state ('win' / 'explosion') instead of `symbolInfo.type === 'spine'`. The old spine payframe behind winning symbols was dropped (win glow replaces it).
  - 11 placeholder tiles (H1-H5, L1-L4, W, S — H5 is sample-legacy kept for the symbols story; books only contain H1-H4/L1-L3/S) generated with PIL → `static/assets/sprites/symbols/symbol_*.png` (512px rounded squares, distinct flat palette colors, white initials). Generator script: ran from `/tmp/gen_acqua_placeholders.py` via math-sdk venv python.
- **Component rewrites** (composed Container/Sprite/Rectangle/BitmapText + tween, same emitter-event contracts):
  - `Anticipation.svelte`: pulsing amber column Rectangle over the anticipating reel; fades out + `oncomplete` when reel stops.
  - `Background.svelte`: black backdrop + cover-fit `bg_base`/`bg_bonus` placeholder sprites in FadeContainers (was foregroundAnimation/foregroundFeatureAnimation spines).
  - `BoardFrame.svelte`: kept frame_bg/frame_edge sprites; reelhouse glow spine → pulsing teal/gold Rectangle halo driven by boardFrameGlowShow/Hide.
  - `TransitionAnimation.svelte`: lagoon-teal full-screen surge (rect sweeps up, two white lightning flickers, recede) → `oncomplete`; used by LoadingScreen + Transition.
  - `LoadingScreen.svelte`: loader spine → pulsing `logo` placeholder sprite + same LoadingProgress/PressToContinue flow.
  - `FreeSpinAnimation.svelte`: fs panel spine → dark plaque Rectangle w/ gold border, elastic pop-in; children get same `sizes` snippet API.
  - `FreeSpinIntro/Outro.svelte`: spine number slots → BitmapText with elastic pop / ResponsiveBitmapText count-up; kept localized freespins/winsmall/totalwin sprites (sizes re-derived since spine slot scaling is gone).
  - `GlobalMultiplier.svelte`: brass plate Rectangle + `${mult}×` BitmapText, pop/reset tweens inside the async `globalMultiplierUpdate` handler (no oncomplete dance needed). KEPT solely because recorded sample books emit `updateGlobalMult`; per CONTRACT.md acqua_alta math never emits it → delete in the reskin pass when sample books are replaced.
  - `MultiplierGrid.svelte`: payframe spine per cell → rounded-rect badge tinted by the design's color-as-math ramp (exported `badgeColor()`: brass ≤4, gold 5-7, emerald 8-10, white-gold 11-15, plasma 16-20) + `${m} X` BitmapText.
  - `WinAnimation.svelte`: bigwin spine → gold plaque w/ GlowFilter, elastic slam-in + idle pulse; props changed `animationMap` → `text` (Win.svelte passes `winLevelData.text`; big-win count-up font reduced to fit). `winLevelMap.ts` `animation` field is now a boolean marker.
  - `TumbleWinAmountText.svelte`: tumble_win spine → rAF count-up + pop when `animate`.
- `assets.ts`: fully rewritten — no spine entries; added `logo`, `bg_base`, `bg_bonus`, `symbol_*` (11) sprites; kept pressToContinueText/progressBar/reelsFrame/freeSpins/winSmall/coins/fonts/audio. Removed: all 16 spine entries + payFrame + symbolsStatic.
- `typesBookEvent.ts`: added `BookEventTideLevel` per CONTRACT.md (level, markName union, gameType, updatedCells) to the BookEvent union; `bookEventHandlerMap.ts` got a minimal `tideLevel` handler (bell-toll placeholder SFX) — water plane/depth gauge are the tide pass's job.
- `package.json`: added direct dep `pixi-filters@6.1.0` (was only transitive via pixi-svelte); `pnpm install --engine-strict=false` OK. Game name label in `Game.svelte` → "ACQUA ALTA".

### Proof (all on this machine, 2026-06-10)
- `pnpm run build --filter=acqua-alta`: **exit 0** — "✓ 1955 modules transformed", "✓ built in 25.94s", adapter-static "✔ done, 200 /", "Tasks: 2 successful". Artifacts: `.svelte-kit/output/prerendered/pages/index.html` (1.16 MB inline) + `output/client/` incl. `assets/sprites/symbols|ui`. GOTCHA: the vite process lingers after writing all outputs because the `sass-embedded` `--embedded` dart daemon never shuts down (same hang visible in an unrelated project's builds on this machine); `kill <dart sass.snapshot pid>` lets the build finish/exit cleanly — wait for artifacts, don't wait for the process.
- Storybook (port 6002): 33 stories. End-to-end via headless Chrome + CDP (`google-chrome --headless=new --use-angle=swiftshader`, script pattern kept at /tmp/acqua-e2e/run-story.mjs): **PASS mode-base-book--random, PASS mode-bonus-book--random** (full recorded books incl. tumbles, updateGrid, freeSpinTrigger/intro/outro, big-win plaque), plus PASS free-spin-trigger / tumble-board / set-win event stories. Zero console errors. Screenshots verified placeholder tiles + composed FS intro plaque.
- Headless-Chrome gotcha: default `--disable-gpu` headless gives "CanvasRenderer is not yet implemented" (no WebGL) — launch with `--use-angle=swiftshader --enable-unsafe-swiftshader`.

### Known gaps (next agent)
- Everything in the previous entry's gap list still stands (config/bet modes, tideLevel visuals, basegame grid render rules).
- tideLevel handler is a placeholder (bell SFX only): WaterPlane mesh/teal overlay, DepthGauge, submersion badge pops, drain-on-reveal still to build.
- GlobalMultiplier + updateGlobalMult plumbing should be removed once sample books are replaced by acqua_alta books.
- `freeSpins`/`winSmall`/`pressToContinueText` localized plates + bitmap fonts + coin particles + audio are still sample art; symbol/bg/logo placeholders await `assets-src/images/final/` (drop-in by filename, or edit paths in assets.ts).
- Lint: `pnpm run lint` is broken repo-wide on eslint 9 (no eslint.config.js — upstream issue, not introduced here). No svelte-check binary in workspace.

---

## 2026-06-10 — Fork of apps/cluster created and proven to run

### What was done
- `rsync -a` copy of `apps/cluster` -> `apps/acqua-alta` excluding `node_modules`, `.svelte-kit`, `dist`, `.turbo` (~57M, mostly static assets).
- `package.json`: name `cluster` -> `acqua-alta`; storybook port 6001 -> **6002**; vite dev port 3001 -> **3002** (every sample app uses 6001/3001, so 6002/3002 are unused).
- `package.json` was the ONLY file in the app that self-referenced the name "cluster"; no config/.storybook/svelte/vite/tsconfig changes needed. Workspace glob `apps/*` auto-registers the app.
- `pnpm install --engine-strict=false` at repo root: OK in 9.2s (pre-existing peer-dep warnings about storybook 9 vs @chromatic-com/storybook, and vite 7 in state-shared — same as upstream, not caused by the fork).
- Boot proof:
  - `pnpm run storybook --filter=acqua-alta`: HTTP 200 on `http://localhost:6002/index.json` (33 story entries) and `/iframe.html` (incl. `?id=mode-base-bookevent--reveal`).
  - `pnpm run dev --filter=acqua-alta`: Vite ready in ~2.2s, HTTP 200 on `http://localhost:3002/`, real SvelteKit HTML served.
  - Both servers killed afterwards; ports 6002/3002 confirmed free.

### Decisions
- Ports 6002 (storybook) / 3002 (dev) reserved for this app.
- Kept everything else byte-identical to apps/cluster — reskin/mechanic work happens in follow-up passes.
- Asset URLs in `src/game/assets.ts` use `new URL('../../assets/...', import.meta.url)`; in dev that resolves to `/assets/...` which Vite serves from `static/assets` (SvelteKit publicDir). Replacement art must keep the same relative layout.

### Known gaps (next agent)
- Still 100% the sample cluster game: `config.ts` has `gameID: '0_0_cluster'`, `gameName: 'sample_lines'`, sample bet modes — must become `acqua_alta` modes per `docs-research/CONTRACT.md` (base/ante/bonus/superbonus).
- NEW `tideLevel` book event from CONTRACT.md is NOT typed or handled yet (`typesBookEvent.ts`, `bookEventHandlerMap.ts`).
- CONTRACT: `updateGlobalMult` never emitted (GlobalMultiplier.svelte and its spine likely removable); `updateGrid` must render in basegame too; tide drains visually on next reveal in basegame; grid persists in freegame.
- All art/audio is still the sample's; real assets later at `assets-src/images/final/` + `assets-src/audio/final/`. Static placeholder PNGs fine meanwhile.
- Node 24 vs engines `>=22.16.0`: works; use `--engine-strict=false` if pnpm complains.

---

## Inventory (state at fork time)

### Spine usage under src (grep -ril spine — 28 files, 267 case-insensitive line matches)
Components (17):
- src/components/Anticipation.svelte
- src/components/Background.svelte
- src/components/Board.svelte
- src/components/BoardFrame.svelte
- src/components/FreeSpinAnimation.svelte
- src/components/FreeSpinIntro.svelte
- src/components/FreeSpinOutro.svelte
- src/components/GlobalMultiplier.svelte
- src/components/LoadingScreen.svelte
- src/components/MultiplierGrid.svelte
- src/components/ReelSymbol.svelte
- src/components/Symbol.svelte
- src/components/SymbolSpine.svelte
- src/components/SymbolSpineMain.svelte
- src/components/TransitionAnimation.svelte
- src/components/TumbleSymbol.svelte
- src/components/TumbleWinAmountText.svelte
- src/components/WinAnimation.svelte
Game (4):
- src/game/assets.ts (spine asset manifest entries)
- src/game/bookEventHandlerMap.ts
- src/game/constants.ts
- src/game/typesBookEvent.ts
Stories (6):
- src/stories/ModeBaseBookEvent.stories.svelte
- src/stories/ModeBonusBookEvent.stories.svelte
- src/stories/data/base_books.ts
- src/stories/data/base_events.ts
- src/stories/data/bonus_books.ts
- src/stories/data/bonus_events.ts

### static/assets groups
- `audio/` — howler audiosprite: sounds.{ac3,m4a,mp3,ogg} + sounds.json sprite map
- `fonts/` — bitmap fonts: goldBlur, goldFont, purpleFont, silverFont
- `spines/` (16) — anticipation, bigwin, bonusButton, clusterWin, foregroundAnimation, foregroundFeatureAnimation, fsIntro, globalMultiplier, loader, reelhouse, symbols, symbols2, symbols3, transition, tumbleWin, winMeterExplosion
- `sprites/` (9) — coin, freeSpins, payFrame, pressToContinueText, progressBar, reelsFrame, symbolsStatic, uiSlotsAssetsBespoke, winSmall

### src/game/*.ts (17 files)
- actor.ts — wires XState primary/intermediate machines into the game actor (playBet, resumable-bet conversion)
- assets.ts — declarative asset manifest (spines/sprites/fonts/audio) consumed by pixi-svelte createApp; preload flags
- bookEventHandlerMap.ts — THE animation driver: maps each book event type (reveal, winInfo, tumbleBoard, updateGrid, freeSpin*, setWin…) to async handlers emitting emitter events
- config.ts — game config: providerName/gameName/gameID, RTP, 7x7 board, betModes, symbol paytable, paddingReels (838 lines; main reskin target)
- constants.ts — SYMBOL_SIZE(80), REEL_PADDING, INITIAL_BOARD, symbol info/state maps, board dimensions
- context.ts — Svelte context plumbing: bundles eventEmitter, xstate, layout, app, game state + i18n into set/get context helpers
- eventEmitter.ts — creates typed event emitter (union of hotkey/UI/modal/game emitter events)
- sound.ts — MusicName/SoundEffectName unions + createSound() registration against the audiosprite
- stateApp.ts — pixi-svelte createApp({assets}) -> stateApp
- stateGame.svelte.ts — reactive game state: enhanced board, cascading reels, gameType, win-level derivation, tumble win amounts
- stateLayout.ts — createLayout: background ratios + canvas sizes per device class
- stateXstate.ts — createXstate() holder
- typesBookEvent.ts — TS types for every book event + Bet/BookEventContext (add `tideLevel` here)
- typesEmitterEvent.ts — union of per-component EmitterEvent types (Board, TumbleBoard, MultiplierGrid, FreeSpin*, Win, Sound…)
- types.ts — SymbolName/RawSymbol/BetMode/GameType derived from config + SYMBOL_STATES
- utils.ts — playBookEvent/playBet via utils-book, empty padded board factory, misc helpers
- winLevelMap.ts — win level (1..n) -> alias/type/text/duration/sound/animation presentation map

---

## 2026-06-10 — Tide pass complete: all 8 deliverables in, contract deviations 4+5 applied

### What was done (this session resumed an interrupted ~35-min attempt; most components existed, the WIRING didn't)
State found on disk: WaterPlane.svelte / DepthGauge.svelte / MultiplierGrid badge rewrite / tideLevel+updateGrid+reveal-drain handlers / Sound pitch ladders / boardShake / acqua_books.ts all already written — but NOT wired: emitter union missed the new components' events, Game.svelte never mounted WaterPlane/DepthGauge, assets.ts lacked `overlay_caustic`/`badge_brass` (Sprites referenced nonexistent keys), no story consumed acqua_books, config/betModeMeta/winLevelMap/createBonusSnapshot untouched. Finished:

1. **typesEmitterEvent.ts**: added `EmitterEventWaterPlane` + `EmitterEventDepthGauge` to the union (this was the mid-edit breakage — handler map broadcasts would not type-check).
2. **Game.svelte**: mounted `<WaterPlane />` + `<DepthGauge />` in a new MainContainer AFTER the TumbleBoard container (flood overlays board + tumble; ClusterWinAmounts get a slight tint when submerged — acceptable, water is 35% alpha). MOVED MultiplierGrid's container from BEFORE Board to AFTER it — badges were previously behind the opaque symbol tiles, i.e. invisible. New z-order: BoardFrame → Board → MultiplierGrid → TumbleBoard/ClusterWinAmounts → WaterPlane+DepthGauge → UI.
3. **assets.ts + placeholders**: added `overlay_caustic` (512px seamless PIL caustic web, additive-blended in WaterPlane) and `badge_brass` (256px neutral warm-white octagonal plate — near-white so the code tint ramp lands on the design colors). Both at `static/assets/sprites/ui/`, generated with system python3 PIL (seed 1834).
4. **CONTRACT deviation 4 — `createBonusSnapshot` fully removed**: type deleted from typesBookEvent.ts (it was ALSO duplicated in the union — mid-edit artifact), handler deleted from bookEventHandlerMap.ts. Resume restore now lives in utils.ts: `convertTorResumableBet` stashes reserved pre-resume events in a module-level `bookEventsToRestore`; `playBet` replays them via `restoreBonusSnapshot()` before `playBookEvents` — identical ordering to the old synthetic-event approach, zero synthetic book events. Reserve list gained `tideLevel` + `updateGrid`; restore SETS water/gauge instantly (waterPlaneSet/depthGaugeSet) and re-renders badges from the last grid snapshot.
5. **Deviation 5** (tideLevel AFTER tumbleBoard) needed no code change — handlers are book-order-driven; the hand-picked books and the story comments follow `winInfo → updateTumbleWin → tumbleBoard → tideLevel → updateGrid`.
6. **config.ts**: gameName/gameID `acqua_alta`, rtp 0.965, betModes base 1.0 / ante 1.25 / bonus 100 (buyBonus) / superbonus 400 (buyBonus), all max_win 5000. NEW exported `betModeMeta` (lowercase keys + mode values per CONTRACT case-sensitivity) applied via `stateMeta.betModeMeta = betModeMeta` in context.ts `setContext()` — runs in app AND every story. Platform UI gives the rest for free: ante is type 'activate' so ButtonBuyBonus turns into a DISABLE toggle while active (buy menu unreachable); both 'buy' modes route through ModalBuyBonusConfirm (built-in confirmation step). Copy is social-casino-safe (play amount / coins / tide / Flood Moons; no bet/money/cash in new strings).
7. **winLevelMap**: display texts only — big→GRANDE, superwin→MAESTOSO, mega+epic→ACQUA GRANDA, max→MAX WIN. Alias keys (`big/superwin/mega/epic/max`) untouched. (Design has 3 plaques for 5 texted tiers; mega+epic share ACQUA GRANDA.)
8. **Stories**: new `ModeAcquaBook.stories.svelte` (MODE_ACQUA/book) playing the three hand-picked REAL math books in `data/acqua_books.ts`: `ante-tide-basegame` (pre-submerged level-1 start + 2 winning cascades to Campanella), `bonus-storm-warning` (dry freegame entry, reveal→updateGrid re-sync persistence, freegame tideLevel), `superbonus-acqua-granda` (pre-flooded level-3 freegame entry, x4/x3/x2).
- utils.ts gained the missing `BookEvent` type import (would have been a tsc error).

### Proof (this machine, 2026-06-10)
- `pnpm run build --filter=acqua-alta`: EXIT:0, "✓ built", adapter-static "✔ done, 200 /", Tasks 2 successful (×2 runs; sass-embedded daemon lingering gotcha still applies — check log, not process exit).
- Storybook 6002: **36 stories** (33 + 3 new). Headless-Chrome CDP e2e (same /tmp/acqua-e2e/run-story.mjs harness): **PASS mode-acqua-book--ante-tide-basegame, PASS mode-acqua-book--bonus-storm-warning, PASS mode-acqua-book--superbonus-acqua-granda, PASS mode-base-book--random, PASS mode-bonus-book--random** — zero console errors.
- Screenshots verified: bottom-row brass 2X badges + teal water + gauge needle at Laguna (6s), two submerged rows + needle at Sirena/110 (12s), GRANDE plaque with count-up (20s). PNGs in /tmp/acqua-e2e/.
- Spot tsc (`--skipLibCheck`, bundler resolution) on all edited game/*.ts: clean (only pre-existing upstream rgs-fetcher errors). Full `tsc -p`/svelte-check still unusable repo-wide (pre-existing).

### Decisions
- MultiplierGrid above symbols / below water (badges must read; sample's behind-symbol payframe layout hid them with opaque placeholder tiles).
- Resume restore without synthetic events = module-level stash in utils.ts consumed by the next playBet — the only call path after `convertTorResumableBet` is `onPlayGame → playBet`, so there is no race.
- bonus/superbonus buy buttons read "PLAY 100X"/"PLAY 400X" (social-safe; platform's price line under the card already shows the exact amount).

### Known gaps (next agent)
- All art/audio still placeholder (symbols/bg/logo/badge/caustic PNGs, sample audiosprite; tide bell = pitched `sfx_multiplier_update`). Final art drop-in: assets-src/images/final/ + audio/final/ → same filenames or assets.ts/soundMap.ts one-liners. DepthGauge is code-drawn (Rectangles/Text) — replace with final brass art when it lands.
- GlobalMultiplier + `updateGlobalMult` plumbing still present ONLY for the recorded sample books (CONTRACT: never emitted by acqua_alta math) — delete when base_books/bonus_books are replaced with real acqua books.
- config.ts symbols paytable + paddingReels still the sample's (display-only here; real values live in the math). Sound.svelte/`winLevelSoundsStop` still check legacy 'SUPERSPIN' key — harmless dead branch under the new mode names.
- Wincap `wincap` book event (deviation 1) has no dedicated handler/celebration yet (no wincap book in stories data either).
- Win plaques GRANDE/MAESTOSO/ACQUA GRANDA reuse the same gold WinAnimation plate (text-only differentiation); design's rise-out-of-water plaque + splash geyser not built.
- Lint still broken repo-wide (eslint 9, no eslint.config.js — upstream).

---

## 2026-06-10 — Independent verification pass (verifier agent; no code changes)

### Checks run + results
1. **Build — PASS**: `pnpm run build --filter=acqua-alta` exit 0 (Tasks: 2 successful, adapter-static "✔ done, 200 /"). Log: /tmp/acqua-verify-build.log.
2. **Lint — FAIL (pre-existing upstream)**: `pnpm run lint` exit 2, "ESLint couldn't find an eslint.config.(js|mjs|cjs)" — identical failure reproduced in `apps/cluster`, so not introduced by this app. No svelte-check binary anywhere in the workspace; no typecheck script in package.json.
3. **Storybook — PASS**: port 6002 boots; `GET /index.json` 200 with **36 stories** incl. the 3 tideLevel contract stories (`mode-acqua-book--ante-tide-basegame|bonus-storm-warning|superbonus-acqua-granda`); `iframe.html?id=mode-acqua-book--ante-tide-basegame` 200.
4. **Headless e2e — PASS**: reused /tmp/acqua-e2e/run-story.mjs harness (headless Chrome 148 + CDP, swiftshader flags). `mode-acqua-book--ante-tide-basegame` and `mode-base-book--random` both played to "Action is resolved" with **zero console errors/exceptions**. Screenshot (water + multiplier badges + depth gauge + placeholder tiles visible) saved to `apps/acqua-alta/screenshot-storybook.png`.
5. **Spine grep — PASS (0)**: no imports/`esotericsoftware`/`type:'spine'` in src or package.json; remaining case-insensitive hits are only `freeSpin*`/`readyToSpinEffect` identifiers and "stand-in for the spine X" comments.
6. **RGS URL grep — PASS (0)**: no hardcoded RGS URLs; only hit is the local `stake-engine-loader.gif` asset filename in routes/+layout.svelte (inherited from cluster, not a URL).
7. **bet/money/cash in NEW user-facing strings — PASS**: string-literal grep over config/context/winLevelMap/components/routes finds none; only code identifiers (`Bet` type, xstate `bet:` event key). NOTE: the platform UI (shared `components-ui-*` packages) still renders "BET $1.00" / "BALANCE" labels — visible in the screenshot — but those are workspace-shared, not strings added in this app; flagging for a product decision since the screenshot shows them to players.

### Gaps unchanged
All "Known gaps" from the tide-pass entry above still stand (placeholder art/audio, wincap handler, GlobalMultiplier removal pending real books, lint upstream).

---

## 2026-06-10 — Real-assets pass: ALL placeholder art + sample audio replaced

### Images (assets-src/images/final → static/assets/sprites, ingest script /tmp/acqua-assets/process_images.py, PIL LANCZOS + FASTOCTREE PNG-quantize)
- **Symbols**: 10 final 512px RGBA plates → `symbols/symbol_{H1..H4,L1..L4,W,S}.png` (straight drop-in, same keys). `symbol_H5.png` stays a placeholder — no final art exists (sample-legacy, only the symbols story shows it).
- **Backgrounds**: bg_base/bg_bonus now real landscape art + NEW `bg_base_portrait`/`bg_bonus_portrait` assets; `Background.svelte` picks portrait when `stateLayoutDerived.isStacked()` and uses `portraitBackgroundLayout`. `BACKGROUND_RATIO`/`PORTRAIT_BACKGROUND_RATIO` + stateLayout backgroundRatio updated to 1664/928 / 928/1664. Background also gained ambience: 2 additive `overlay_lantern` pulses (base) + 2-layer scrolling `overlay_rain` (bonus). Both preload:true (rendered from frame one — non-preload caused a transient "key not found" console error, caught in e2e).
- **Board chrome**: `BoardFrame.svelte` → single `board_frame` sprite (replaces sample frame_bg/frame_edge; reels_frame.json kept for Frame_Tumble/TumbleWin/FSCounter NOT — counter replaced, tumble frames still sample). Added ink-blue 0.72-alpha backing rect behind the board (final symbols are cutouts; keeps them readable over the palazzo bg).
- **DepthGauge**: brass `depth_gauge_body` sprite (squashed to the plate slot) + `depth_gauge_needle` sprite (amber-tinted when record-pinned); code-drawn marks/labels kept on top.
- **MultiplierGrid**: `badge_brass.png` is now the real master (same key, tint ramp unchanged); NEW badge pops play `SFX.badgePop` (sfx_badge_pop), deepen ticks keep the pitched `soundBadgeTick`.
- **Win plaques**: `WinAnimation.svelte` now maps text→plate: GRANDE→plaque_grande, MAESTOSO→plaque_maestoso, ACQUA GRANDA→plaque_acqua_granda, MAX WIN→plaque_maxwin (4 distinct sprites, copy still in-engine; count-up moved to y=1.6*SYMBOL_SIZE below the plate).
- **FS chrome**: `FreeSpinAnimation` takes `panelKey` prop (fs_intro_panel default; per-key aspect map). Intro→fs_intro_panel, Outro→fs_outro_panel + `fs_record_stamp` corner stamp on big wins, retrigger→fs_retrigger_plate (NEW `retrigger?: boolean` on `freeSpinIntroUpdate`, set by the freeSpinRetrigger handler). `FreeSpinCounter`→fs_counter_plate (700x217, panel widened to 2.8*SYMBOL_SIZE, font 0.22).
- **Tide overlays**: overlay_caustic now the real tile (512, additive as before); NEW in WaterPlane: `overlay_spray` crest strip riding the surface, `overlay_ripple` expanding rings on each rise, `particle_droplet` spray sprites (replaced Circle), 6 phase-derived rising `particle_bubble`s (no extra state — pure functions of the rAF clock).
- **Win shatter**: `SymbolSprite` explosion now bursts 6 `shard_{gold,amber,emerald,rose,sapphire}` sprites (colour-matched per symbol via SHARD_KEY_MAP) alongside the glow/fade.
- **Celebration particles**: NEW `particles/particles.{json,png}` atlas (gold flecks + murano shards, fleck black→alpha) replaces the sample coin sheet; `WinCoins` key coins→particles; `sprites/coin/` DELETED.
- **Buy/bet-mode art**: betModeMeta assets now point at `/assets/sprites/ui/{btn_ante,buy_icon_storm,buy_icon_granda}.png` (icon + dialogImage; ante toggle / STORM WARNING / ACQUA GRANDA). btn_spin/btn_autoplay/btn_menu NOT shipped — the app renders no buttons of its own (all in shared components-ui-*, untouched per instructions). lobby_tile_2x1 skipped (not used in-app).
- **Logo**: design excludes a generated wordmark (typographic build only) → `ui/logo.png` regenerated by the ingest script (PIL serif, gold gradient + navy outline + amber halo, 1000x500). Used by LoadingScreen and now also the UI logo snippet in Game.svelte (replaced "ADD YOUR LOGO").
- Deleted: `sprites/coin/`, `sprites/uiSlotsAssetsBespoke/` (zero references workspace-wide).

### Audio (assets-src/audio/final → ONE howler audiosprite, builder /tmp/acqua-assets/build_audiosprite.py)
- Picked option (a): rebuilt the audiosprite — utils-sound/pixi-svelte load exactly one `LoadedAudio` JSON, so individual files would have meant touching the shared package. 21 cues decoded from the OGG masters to 44.1k WAV, concatenated with 600ms guard gaps on 100ms boundaries, exact ms offsets/durations from WAV frame counts. `sounds.ogg` (vorbis q4, 2.5MB) listed FIRST in src (gapless loops), `sounds.mp3` (160k, 3.6MB) fallback; sounds.json sprite marks bgm_base_loop/bgm_bonus_loop/sfx_win_tally_loop `loop:true`. sounds.ac3/m4a + the whole sample sprite DELETED.
- `sound.ts` unions = the 21 real cue names. `soundMap.ts` mapping: base→bgm_base_loop, freeSpin→bgm_bonus_loop, btnSpin→spin_click, btnGeneral/winLevelEnd→ui_click, reelStop→symbol_land, anticipation→anticipation_rumble (loop player), scatterLand1-5/scatterWin→scatter_chime, wildLand→gondola_creak, wildExplode/clusterCombine→glass_shatter, clusterPop→cluster_pop, tideBellToll→bell_toll (pitch ladder verified clean), tideSurge→tide_surge (NEW, fired in tideLevel handler with the rise), tideDrain→water_drain, badgePop→badge_pop, badgeTick→badge_tick (pitch ladder), winSmall→badge_pop, bigWinCoinLoop→win_tally_loop, youWonPanel→bell_toll, freeSpinSting→bonus_thunderclap, freeSpinIntroJingle/retriggerPeal→retrigger_peal, buyConfirm→buy_confirm (NEW: played by utils.ts playBet when activeBetModeKey is bonus/superbonus).
- `winLevelMap` big/superwin/mega/epic → `sfx: bigWinSting`, max → `sfx: maxWinSting`, all `bgm: undefined` (stings are one-shots; base/bonus music keeps running — the old looping bgm_winlevel_* slots don't exist in the final cue set). MUSIC.win* entries removed.

### Proof (this machine, 2026-06-10)
- Build green ×2: vite "✓ built", adapter-static "✔ done, 200 /", fresh `build/index.html`. (`timeout` kills turbo before the lingering sass-embedded daemon exits → exit 124/ELIFECYCLE in the wrapper; artifacts complete — same gotcha as documented above.)
- Storybook 6002 (36 stories) + headless Chrome CDP e2e: **PASS with zero console errors** — mode-acqua-book--ante-tide-basegame, --bonus-storm-warning, --superbonus-acqua-granda, mode-base-book--random, mode-bonus-book--random.
- Screenshots read & verified (/tmp/acqua-e2e/*.png + crops): real mask/bead symbols + carved board frame + canal night bg (base), ornate gold FS intro panel, storm bg + rain + 3 submerged rows with brass badges + caustics + brass gauge (superbonus), GRANDE plaque with count-up + gold fleck fountain.
- static/assets total: **19MB** (was 25MB; audio 17MB→6.0MB, all shipped PNGs ≤515KB).

### Known gaps (next agent)
- Sample art still in: localized freespins/winsmall/totalwin/pressToContinue text plates, progressBar, bitmap fonts, Frame_Tumble/Frame_TumbleWin (tumble win pill) — no final replacements exist in assets-src.
- symbol_H5 placeholder retained (story-only). GlobalMultiplier + updateGlobalMult still present for the recorded sample books. Wincap book event still has no dedicated celebration. Lint still broken repo-wide (upstream eslint 9).
- Ante mode icon reuses btn_ante_toggle art (no dedicated ante icon was generated).

---

## 2026-06-11 — Real-math pass: config synced to math model, real story books, wincap celebration, sample sweep

### What was done (this session resumed an interrupted ~45-min attempt; most files existed — AUDIT first, then finish/fix)
State found on disk (all verified, kept): config.ts paytable/symbols/scatterTriggers/betModes already synced; `paddingReels.ts` (56KB) generated from the real reelstrips; `acqua_books.ts` (158KB, 6 books) replacing base/bonus sample data; `wincap` BookEvent type + handler; GlobalMultiplier.svelte + `updateGlobalMult` + all 4 sample stories/data files DELETED (stories dir is now ModeAcquaBook + ComponentsGame + ComponentsSymbol). Finished/fixed this session: W `special_properties` synced `['wild','multiplier']`→`['wild']` (matches config_fe; nothing consumes it), and the **shared-wild freeze bug** below.
1. **config.ts ↔ math verified by script, not eyeball**: paytable parsed out of config.ts and deep-compared vs `library/configs/config_fe_acqua_alta.json` → exact match, all 10 symbols (H1-H4/L1-L4 33-entry cluster paytables, W/S null). `paddingReels.ts` columns deep-compared vs `reels/BR0.csv` (basegame, 7x251) + `FR0.csv` (freegame, 7x252) → verbatim transpose, like apps/lines does. scatterTriggers basegame {4:10,5:12,6:15,7:18,8:20} / freegame retrigger {3:5,...,8:18} per CONTRACT. Bet modes 1.0/1.25/100/400 confirmed.
2. **acqua_books.ts**: 6 REAL debug books, `{id, payoutMultiplier, events}` VERBATIM vs library/books jsonl (deep-compare; criteria/baseGameWins/freeGameWins metadata keys dropped — FE Bet type doesn't carry them). base id28 8x 3-cascade tide→Campanella; ante id3 19.2x pre-submerged entry; retrigger books_base id2205 natural 4-S trigger + freegame 3-S retrigger; bonus id334; superbonus id463 60.8x; **wincap books_base id1413 payout 500000 (criteria 'wincap' confirmed in jsonl)**. 6 stories in ModeAcquaBook.stories.svelte incl. `wincap-max-win` playing the cap book end-to-end.
3. **wincap handler** (deviation 1): tideSurge SFX → uiHide → `transition` flood sweep → MAX WIN plaque via winLevelMap[10] (plaque_maxwin + maxWinSting + WinCoins shard/fleck fireworks) → book truncates into setTotalWin/freeSpinEnd/finalWin. Played through headless: handler chain `winInfo(146)→updateTumbleWin(147)→wincap(148)→setTotalWin(149)→freeSpinEnd(150)→finalWin(151)` all resolved.
4. **REAL BUG FOUND + FIXED — shared-wild positions freeze the game**: wincap book event 34 has TWO clusters (H1 + L2) sharing the refill-injected gondola wilds' cells; the math emits the shared position once PER cluster. `Board.svelte boardWithAnimateSymbols` and `TumbleBoard.svelte tumbleBoardExplode` create one promise per position and stash `reelSymbol.oncomplete = resolve` — the duplicate overwrites the first resolver, `Promise.all` never settles, the game hangs forever (reproduced twice; zero console errors, pure deadlock). Diagnosed by wrapping every bookEventHandlerMap handler + eventEmitter.broadcastAsync in-page via vite module URLs (`/tmp/acqua-e2e/diagnose-wincap.mjs`) — pending emit was `boardWithAnimateSymbols` at winInfo idx 34. Fix: `_.uniqBy(positions, p => reel-row)` in BOTH handlers. Any wild shared by 2 clusters would have frozen production — only the wincap book exercises it in our story set (1 winInfo + 1 tumbleBoard with dupes; other 5 books have none).

### Proof (this machine, 2026-06-11)
- Build green ×3 (after each edit): vite "✓ built" + adapter-static "✔ done, 200 /" (`--force`, fresh artifacts; sass daemon lingering gotcha still applies).
- Storybook 6002, 11 stories. Headless CDP suite (`/tmp/acqua-e2e/{run,load}-story.mjs`): **ALL 11 PASS, zero console errors** — 5 component/board stories + base-cascade-tide, ante-tide-basegame, natural-trigger-retrigger, bonus-storm-warning, superbonus-acqua-granda, wincap-max-win (152-event cap book, resolves in ~161s with space-skip).
- e2e gotcha learned: leftover CDP tabs throttle rAF in background targets and stall long stories — close every tab (FAIL paths too) before re-running.
- Visual proof of the wincap beat: no-skip probe (`/tmp/acqua-e2e/wincap-plaque.mjs`) caught the MAX WIN plaque + shard/fleck fireworks + count-up over the flooded storm scene at ~210-227s, then the TOTAL WIN outro → `screenshot-wincap-maxwin.png` (app root). That probe deliberately stops pressing keys, so it parks at the outro's press-to-continue gate — not a bug (the keypress suite resolves).

### Known gaps (next agent)
- Sample art still in: localized freespins/winsmall/totalwin/pressToContinue plates, progressBar, bitmap fonts, Frame_Tumble/Frame_TumbleWin; symbol_H5 placeholder retained (symbols story only). DepthGauge marks/labels code-drawn.
- Win plaque "rise-out-of-water + splash geyser" design beat not built (slam-in plate reused for wincap).
- Lint still broken repo-wide (upstream eslint 9, no eslint.config.js).

---

## 2026-06-11 — Replay approval pass: Start-Replay gate / Play Again / error state / no-network verification

### What was done (all APP-level; zero shared-package edits)
Checklist source: docs-research/topics/10-gap-fe-config.md ("Replay Support" group — stock web-sdk AUTO-PLAYS the replay book on mount, which fails approval). New flow: `?replay=true` → app fetches `/bet/replay/...` (NO authenticate) → gate panel with mode + play amount + cost multiplier + currency + REAL total cost → PLAY starts playback → PLAY AGAIN at the end replays the same book → error panel when the fetch fails.
1. **`src/game/stateReplay.svelte.ts`** (NEW): replay phase machine (`loading|gate|playing|finished|error`) + `initReplay()` (mirrors shared Authenticate.handleReplay seeding of stateBet — betAmount/wagered/activeBetModeKey/currency — but validates the response and does NOT set betToResume) + `startReplayPlayback()` (sets `stateBet.betToResume = structuredClone(book)`, broadcasts `resumeBet`). Cost multiplier comes from the RGS response (`costMultiplier` float), betModeMeta is only the fallback; currency read from the `currency` URL param (no stateUrlDerived getter exists), defaults USD / SC when `social=true`; base amount defaults 1 when `amount` absent (checklist). The book is intentionally kept OUTSIDE `$state` and deep-cloned per run — a reactive proxy over book events leaks handler mutations into the next run and trips svelte dev ownership checks.
2. **`src/components/ReplayAuthenticate.svelte`** (NEW): replaces shared `Authenticate` when replaying (branch in `routes/+layout.svelte` on `stateUrlDerived.replay()`); always renders children after init so the error panel can show over the game shell. So in replay NO `/wallet/authenticate` fires at all (shared Authenticate would also hang the loader forever if `requestReplay` throws — bypassed).
3. **`src/components/ReplayGate.svelte`** (NEW, HTML overlay after `<Modals>` in Game.svelte, gated on `stateUi.config.mode==='replay'`): gate panel (kicker ROUND REPLAY, mode title, headline `"BONUS 1 USD — 100 USD TOTAL"` per checklist format, GAME MODE / PLAY AMOUNT / COST MULTIPLIER / CURRENCY / REAL COST rows, PLAY) → playing ribbon (cost stays visible during playback) → REPLAY COMPLETE panel (WIN amount + PLAY AGAIN) → REPLAY UNAVAILABLE panel (TRY AGAIN re-runs initReplay). Completion detected via xstate: phase `playing` + `isResumingBet()` seen + back to `isIdle()` → `finished`. Backdrop swallows pointer events (extra no-path-to-normal-play defence). Social-safe copy (no bet/money/cash/wager — e2e asserts this).
4. **`src/components/ResumeBet.svelte`**: skips its auto `resumeBet` broadcast when `stateUi.config.mode==='replay'` — THE auto-play gate. Normal resume (active round from authenticate) unchanged.
5. **REAL BUG FIXED — `MultiplierGrid.svelte`** adopted the book event's `gridMultipliers` array straight into component `$state` (`grid = emitterEvent.grid`); on the SECOND playback (Play Again — first code path that ever plays two books in one session) badge pops crashed with `TypeError: Cannot read properties of null (reading 'parent')` in svelte dev ownership checks, deadlocking the machine. Fix: deep-copy (`grid.map(reel => [...reel])`). Also keeps badge mutations from leaking into the book.
6. **Stories** `ModeReplay.stories.svelte` (MODE_ACQUA/replay ×3: replay-base-1usd / replay-bonus-100x / replay-error) + `ReplayStorySetup.svelte` (setup must run in component-init context — `{@const}` template expressions throw `state_unsafe_mutation`). Story-only stubs, no shared code touched: patch `stateUrlDerived.{replay,amount,mode,game,version,event,rgsUrl}` getters (storybook's sveltekit mock pins page.url to example.com, so the REAL shared replay guards — utils-book `recordBookEvent`, `handleRequestEndRound` — then take the production replay path) + `window.fetch` stub for `/bet/replay/` serving the real acqua_books (response shape `{payoutMultiplier: float x, costMultiplier: float, state}`; books carry int cents → /100).

### Proof (this machine, 2026-06-11; harness /tmp/acqua-e2e/replay-e2e.mjs — CDP + Network.enable request log)
- **PASS mode-acqua-replay--replay-base-1-usd**: gate `"BASE 1 USD — 1 USD TOTAL"` (mode BASE, base 1 USD, 1×, USD); 2s grace with NO auto-play; PLAY → book runs (ribbon) → `WIN 8 USD` + PLAY AGAIN; PLAY AGAIN → full second run. Zero console errors.
- **PASS mode-acqua-replay--replay-bonus-100-x**: gate `"BONUS 1 USD — 100 USD TOTAL"` (100× from mocked RGS response, REAL COST 100 USD); full bonus book played TWICE via PLAY/PLAY AGAIN. Zero console errors.
- **PASS mode-acqua-replay--replay-error**: 404 `{error:'NOT_FOUND'}` → REPLAY UNAVAILABLE + TRY AGAIN, no PLAY button (the lone tolerated console line is shared rgsFetcher's own `console.error('error', response)` on the 404 — production behaviour).
- **Network log all 3 stories: ZERO authenticate / balance / play / end-round / bet-event requests** (~500 requests each, all storybook assets + typekit fonts). Requirement 4 verified.
- No path into normal play: UIReplay (stateUi.config.mode='replay') has no spin/buy/auto buttons; `bet` is only broadcast by ButtonBetProvider (not mounted in replay); EnableSpaceHold only toggles turbo; gate backdrop blocks the canvas.
- Screenshots verified: /tmp/acqua-e2e/replay-gate-bonus.png (STORM WARNING panel, all 5 rows + PLAY), replay-gate-error.png.
- Regression: PASS mode-acqua-book--base-cascade-tide / ante-tide-basegame / bonus-storm-warning (run-story.mjs, zero console errors). Build green ×2 incl. final `--force` rebuild (vite "✓ built", adapter-static "✔ done, 200 /"; sass daemon lingering gotcha still applies).
- Storybook now 14 stories (11 + 3 replay).

### Known gaps (next agent)
- Shared UIReplay's LabelBet shows the BASE amount with a "BET" label during playback (shared package, betCostMultiplier only applies to 'activate' modes) — the app's gate + ribbon carry the real-cost display the checklist asks for; replacing the label text needs a shared-package decision.
- Real-RGS replay smoke test (actual `?replay=true&rgs_url=rgs.stake-engine.com&game=...` URL) only possible after math+frontend are published — mine event IDs per mode (normal/big/wincap/loss/bonus-trigger) from lookUpTableSegmented_<mode>.csv / force_record_<mode>.json for the approval thread (see topics/10-gap-fe-config.md).
- Everything in the 2026-06-11 real-math pass gap list still stands (sample plates/fonts/tumble frames, plaque rise-out-of-water beat, eslint 9 upstream).

---

## 2026-06-11 — FINAL VERIFICATION pass (verifier agent; zero code changes)

### Results (all on this machine, 2026-06-11)
1. **Build — PASS**: `pnpm run build --filter=acqua-alta --force` exit 0 (vite "✓ built", adapter-static "✔ done, 200 /"). Artifacts: `.svelte-kit/output/prerendered/pages/index.html` (1.19 MB) + `output/client/{_app,assets}`. Sizes: `build/` total **23 MB**, of which `build/assets` (= static/assets) **19 MB** (audio 6.0 MB / sprites 11 MB / fonts 2.0 MB). sass-embedded daemon lingering gotcha still applies — kill `sass.snapshot --embedded` pids or just wait for "✔ done" in the log.
2. **Storybook e2e — PASS 14/14, zero console errors**: 5 component stories load (components-game ×3, components-symbol ×2 — first-load needs ~45s for vite cold transform, a 15s wait false-fails); 6 book stories played end-to-end via headless Chrome CDP (`/tmp/acqua-e2e/run-story.mjs`): base-cascade-tide, ante-tide-basegame, natural-trigger-retrigger, bonus-storm-warning, superbonus-acqua-granda, wincap-max-win (~160s with space-skip); 3 replay stories via `/tmp/acqua-e2e/replay-e2e.mjs`: base-1-usd (gate "BASE 1 USD — 1 USD TOTAL", no auto-play, PLAY→WIN 8 USD→PLAY AGAIN→second full run), bonus-100-x (gate "BONUS 1 USD — 100 USD TOTAL"), replay-error (REPLAY UNAVAILABLE, no PLAY). Network log: zero authenticate/balance/play/end-round/bet-event calls in replay.
3. **Screenshots — PASS** (committed to `apps/acqua-alta/screenshots/`, all read back + visually verified: real venetian art — masks/plague-doctor/glass-bead symbols, carved board frame, canal/storm backgrounds; no flat placeholder tiles, no black boxes/missing textures):
   - `base-mid-cascade.png` — base book at 18s: teal water over bottom rows, 2X brass badge row, caustics, real symbols.
   - `bonus-deep-flood.png` — superbonus at 30s (intro space-skipped): storm bg + rain, deep flood, 2X+3X badge rows, submerged symbols, win pop.
   - `wincap-celebration.png` — wincap book ~234s (skip-until-120s probe): MAX WIN plaque + count-up over flooded storm scene.
   - `replay-gate.png` — STORM WARNING replay gate: ROUND REPLAY / BONUS 1 USD — 100 USD TOTAL / 5 info rows / PLAY.
4. **Greps — PASS**: zero functional spine refs (residue = 5 "stand-in for the spine X" comments + freeSpin identifiers); zero hardcoded RGS URLs; audio manifest bijective (21 sounds.json sprite keys = 21 soundMap values = sound.ts unions, zero missing/unused). Sample-cluster art: all distinctive cluster art deleted (spines/symbols/coin/payFrame/symbolsStatic/uiSlotsAssetsBespoke); remaining sample-ERA support assets are all referenced & in use (freeSpins/winSmall/pressToContinueText/progressBar/reelsFrame plates + 4 bitmap fonts; no final replacements exist in assets-src) + symbol_H5.png placeholder (symbols story only — books never emit H5).

### How to run
- Storybook: `cd web-sdk && pnpm run storybook --filter=acqua-alta` → http://localhost:6002 (14 stories; MODE_ACQUA/book = real math books, MODE_ACQUA/replay = replay gate).
- Dev: `pnpm run dev --filter=acqua-alta` → http://localhost:3002.
- Build: `pnpm run build --filter=acqua-alta` → `apps/acqua-alta/build/` (static, adapter-static).
- Headless e2e: start storybook + `google-chrome --headless=new --remote-debugging-port=9222 --use-angle=swiftshader --enable-unsafe-swiftshader`, then `/tmp/acqua-e2e/{run-story,load-story,replay-e2e}.mjs <story-id>`. Close leftover CDP tabs before long stories (rAF throttling).

### Known gaps (unchanged, none blocking)
- Sample-era support art in use: localized freespins/winsmall/pressToContinue plates, progressBar, bitmap fonts, reels_frame Frame_Tumble/Frame_TumbleWin; symbol_H5 placeholder (story-only); DepthGauge marks/labels code-drawn.
- Win plaque "rise-out-of-water + splash geyser" design beat not built (slam-in plate used, incl. wincap).
- Shared UIReplay LabelBet shows base amount with "BET" label during replay playback (shared package decision).
- Lint broken repo-wide (upstream eslint 9, no eslint.config.js). Real-RGS replay smoke test only possible post-publish.

---

## 2026-06-11 — Standalone local play: full game vs a LOCAL mock RGS (no internet)

### How to start / stop
- Start everything: `'/home/x/Desktop/New Folder/mock-rgs/start.sh'` — kills stale mock instances, starts the mock RGS (port **8765**, log `/tmp/mock_rgs.log`) and the vite dev server (port **3002**, log `/tmp/acqua_dev.log`, only if not already up), prints the play URL.
- **PLAY URL**: `http://localhost:3002/?sessionID=test&rgs_url=localhost:8765&lang=en&currency=USD&device=desktop&social=false` (any sessionID works; each new sessionID gets a fresh 10,000.00 balance).
- Stop: `pkill -f 'mock-rgs/server\.py'` (mock) and kill the `pnpm run dev --filter=acqua-alta` process tree for the dev server. WARNING: that pkill pattern matches any shell whose command line contains the server path — run it from a command line that doesn't.

### Mock RGS (`/home/x/Desktop/New Folder/mock-rgs/server.py`, python3 stdlib only)
- Implements `/wallet/authenticate`, `/wallet/balance`, `/wallet/play`, `/wallet/end-round`, `/bet/event` with the envelopes from `packages/rgs-fetcher/src/schema.ts` (status/balance/round/config; micro-units, 1_000_000 = 1.00). CORS `*` + OPTIONS preflight. In-memory per-session balance starting 10,000.00.
- Outcomes come from the math-sdk debug books (`math-sdk/games/acqua_alta/library/books/books_{base,ante,bonus,superbonus}.jsonl`, byte-offset indexed, events streamed from disk). Sampling is REALISTIC, not the raw debug mix: base/ante → P(freegame) 1/190 / 1/95, P(basegame) 0.335, rest zero-pay, never 'wincap'; bonus/superbonus → uniform over their whole book (incl. the cap line). Costs: base 1.0 / ante 1.25 / bonus 100 / superbonus 400 × amount, debited at `/wallet/play`; payout credited at `/wallet/end-round`. Zero-pay rounds (frontend never calls end-round for them) are auto-settled on the next play.
- Round responses carry extra debug fields `bookID` + `criteria` (frontend ignores them; e2e asserts on them).
- **Force endpoint** (one-shot, consumed by the next `/wallet/play`): `curl -X POST http://localhost:8765/mock/force -H 'content-type: application/json' -d '{"criteria":"freegame"}'` — also accepts `{"criteria":"wincap"}`, `{"id":<bookID>,"mode":"base"}` etc. Debug dump: `GET http://localhost:8765/mock/state`.

### https accommodation (app-level only)
- `rgs-fetcher` hard-codes `https://${rgs_url}${path}` (rgsFetcher.ts lines 16/29). NEW `src/hooks.client.ts` (this app only) wraps `window.fetch` and rewrites `https://localhost…` / `https://127.0.0.1…` to `http://` — a no-op for any real RGS host. No shared-package edits.

### Proof (this machine, 2026-06-11; harness `/tmp/acqua-e2e/standalone-e2e.mjs`, headless Chrome CDP on port 9223)
- **PASS, zero console errors/exceptions**, full run against the real dev server + mock: authenticate (balance 10,000.00, 40 betLevels, permissive jurisdiction) → base SPIN via spacebar (1.00 debit, board animation) → **forced freegame** via `/mock/force` (book 3457, 365.5x, 105 events played to end-round, payout credited exactly) → **bonus BUY 100x through the real UI** (canvas BUY BONUS button at ~(300,636)@1280x720 → HTML STORM WARNING card "PLAY 100X" → `[data-test="confirm-button"]` → mode=bonus play, 100.00 debit, full book to end-round, payout credited exactly).
- Screenshot (verified by eye): `screenshots/standalone-localhost.png` — real game mid-spin, BALANCE $9,999.00 after debit, STOP button up. Also `/tmp/acqua-e2e/standalone-bonus-buy.png` (mid-cascade bonus board) + `standalone-idle.png`.
- Both servers left RUNNING (8765 + 3002).

---

## 2026-07-08 — STAKE REVIEW ROUND 1 FIXES (all 12 items from the reviewer PDF) — commit dc6d597

Reviewer list: `~/Downloads/poseidon stake-engine revisions round 1.pdf`. All fixed + e2e-verified
(CDP harness vs mock RGS; screenshots in the session scratchpad). Files + root causes:

1. **Currency showed GC for EUR** — `packages/utils-shared/amount.ts` mapped every non-SC code to
   "GC". Now: social (XGC/XSC/GC/SC codes, `?social=true|1`, or `jurisdiction.socialCasino`) →
   "10.00 GC/SC"; real currencies → official CurrencyMeta (USD `$` / CAD `CA$` / MXN `MX$` / EUR €
   / JPY ¥ 0dp / …); **non-ASCII symbols fall back to `10.00 CODE`** because the poseidon_gold
   BMFont atlas only has Latin-1 letters + `$` (a `€` would be a missing glyph in every Pixi win
   display). Replay boot now also sets `stateBet.currency` from the `currency` URL param
   (`stateUrl.svelte.ts` gained `currency()`; `Authenticate.svelte` handleReplay uses it; the app's
   own `stateReplay.svelte.ts` already did). Verified: USD `$10,000.00`, XGC `10,000.00 GC`,
   JPY `10,000 JPY`, EUR replay gate + floats + outro all EUR, zero GC leaks.
2. **Bet clamped to raw balance (invalid level)** — `stateBet.svelte.ts correctBetAmount` returned
   `balance/costMultiplier`. Now snaps DOWN to the biggest `stateConfig.betAmountOptions` level that
   fits (smallest level if none). Verified: balance 7.30 → hammering + stops at 7.00.
3. **Insufficient balance UX** — bet button no longer `disabled` (grey tint stays); pressing it with
   `!isBetCostAvailable()` opens new `betMessage` modal (`stateModal.svelte.ts`,
   `ModalBetMessage.svelte`, wired in `Modals.svelte`, guard in `ButtonBetProvider.bet()`).
4. **Wins behind board frame** — `ClusterWinAmounts` was in the TumbleBoard MainContainer, painted
   BEFORE WaterPlane/DepthGauge/MultiplierGrid → right-edge floats were covered by the gauge column.
   Moved to its own LAST MainContainer in `Game.svelte`. Verified by Pixi DFS paint-order probe:
   float idx 209 > gauge idx 171 (and reviewer's exact "0.10 EUR mid-board" case renders on top).
5. **Menu behind mascot** — the hamburger menu is CANVAS; the mascot is a DOM `<img>` (z 6) above
   the canvas, so no z-index can sandwich them. `Mascot.svelte` now fades out (0.18s) while
   `stateUi.menuOpen`. Verified desktop + portrait drawer.
6. **Space in bonus-buy/info** — `ButtonBet.svelte`'s OnHotkey and `EnableSpaceHold.svelte` are
   disabled while `stateModal.modal !== null`. Verified: space in buy menu fires 0 plays.
7. **Wave before confirm** — `BonusCards.confirmCard` now opens `buyBonusConfirm` directly (no
   wave); `ModalBuyBonusConfirm.confirm()` broadcasts `bonusWave` + `bet` together, so the wave
   washes over the loading bonus AFTER confirmation. `WaveTransition` no longer emits
   `buyBonusConfirm` at its end (Game.svelte subscription removed).
8-10. **Info content** (`ModalGameRules.svelte`): "Example: Winning vs Losing" (two 3×3 grids from
   real symbol art — 5 connected corals vs the same 5 on diagonals), "Free Spins Rules" card with
   the REAL math numbers (from math-sdk `game_config.py freespin_triggers`): base 4/5/6/7/8+ →
   10/12/15/18/20; retrigger IN free spins 3/4/5/6/7/8+ → +5/+8/+10/+12/+15/+18, repeatable; tide
   persists; NO respins (tumbles instead); Rising Tide buy = 4-scatter/10 spins; Wrath = 5-scatter/
   12 spins + bottom 3 rows pre-flooded ×4/×3/×2. Controls section lists EVERY button with its
   in-game art (12 icons incl. the drawer's paytable/info/settings/sound/close). Paytable's
   Whirlpool row also carries the scatter numbers now.
11. **Popout S** — `.pt-frame` padding is now `min(104px,12vh) min(62px,12vw) min(66px,8vh)` (the
   fixed 104px top padding swallowed the whole panel at 86vh of a 270px window); hero img hidden
   under 540px height. `BonusContentWrapLandscape` scales from the MEASURED `.bonuses` rect (the
   old `height/540` benchmark under-shrank real card heights → overflow) + bet-toggle reserve
   `min(250px, 34vw)`. `BonusContentWrapPortrait` cards capped `min(82vw, 320px, 48vh)` +
   `min-width:0`. Verified at 480×270 (all 3 cards + stepper fit; rules/paytable readable) and
   360×480.
12. **Mobile info text** — root html font is 50% under 500px width (the HUD-scaling trick), so the
   modal em text was ~7.6px and the disclaimer ~5.8px. `.pt-frame` now sets
   `font-size: clamp(14px, 3.9vw, 16px)`; `.pt-foot`/`.pt-disclaimer` get `max(…, 12px)` floors.
   Verified 390×844: li 14.4px / foot 12.9px / disclaimer 12.2px.

Also fixed while verifying:
- **Shared `Popup.svelte` rendered its children TWICE** (upstream sample bug): a stray in-flow copy
  below the fold made the PAGE scrollable whenever any modal was open (scrollIntoView probes jumped
  the whole document 651px) and doubled every modal's DOM. Stray render removed.
- **Dual-direction scroll** on the info/paytable scroller (2px horizontal overflow → visible
  horizontal scrollbar = a "scrolls in both directions" ding): `overflow-x: hidden` on `.pt-scroll`.
- **Boot console error `Not found: /index.html`** (SvelteKit router 404 for the literal
  /index.html URL) silenced via `handleError` in `hooks.client.ts` — clean console at review.
  Remaining known console noise: lingui "Uncompiled message" warnings + one Pixi
  "[Cache] already has key: totalwin.png" warning — both pre-existing in the 2★-reviewed build,
  left untouched on purpose (mid-round diff kept minimal).

Mock RGS (`mock-rgs/server.py`) gained TEST-ONLY endpoints: `POST /mock/balance {sessionID,amount}`
(exercise insufficient-balance without draining 10k) and
`GET /bet/replay/{game}/{version}/{mode}/{event}` (serves a book as the real replay API shape —
the real `?replay=true` boot path now runs fully against the mock; verified with
`event=177&mode=bonus&currency=EUR`).

Deliverables: web-sdk commit `dc6d597`; fresh build copied to `~/Desktop/upload/` +
`poseidon-frontend-upload/` (webgl preference + self-hosted fonts verified in the bundle).
NOT yet uploaded to Stake — that's the user's move.

## 2026-07-08 (later) — user-reported follow-ups + proactive catches — commit c4b28b9

User spotted on the REAL Stake popout: (a) wordmark covering the board's right columns, (b) the
FREE SPINS plate covering top-left symbols on desktop, (c) asked for the two pre-existing console
warnings to die. All fixed + one proactive catch:

- **Logo**: `Game.svelte` now computes `logoScale` from the free gutter right of the board frame
  (same screen-edge math as the mascot; floor 0.3, portrait unaffected). Verified 575×345 (the
  user's popout), 480×270, and 1280×720 (unchanged full size).
- **FS counter**: plate now sits ABOVE the board hugging its top-right corner on ALL layouts
  (panel 3×SYMBOL_SIZE). The old desktop position ("left of the board") collided with the mascot
  gutter and its `Math.max` clamp shoved it onto row-1/2 symbols. `TumbleWinAmountWrap` desktop
  shifts to `width*0.35` during freegame (mirrors portrait's 0.37 trick) — ~20px clearance.
- **Lingui warnings**: `state-shared/stateI18n.svelte.ts` no longer calls `@lingui/core` at
  runtime — catalogs are flat identity maps, so `translate` is a plain lookup (same exported API;
  zh still works). Kills every "Uncompiled message detected" console.warn.
- **Pixi cache warning**: `winSmall/MM_Localisation_winsmall.json` frame `totalwin.png` renamed
  `winsmall_totalwin.png` (it collided with freeSpins.json's frame; only the freeSpins copy is
  referenced — FreeSpinOutro — and still resolves to it).
- **PROACTIVE: space during the intro splash fired a real hidden spin** (verified: 1 play behind
  the splash). `EnableHotkey` now mounts only after `introDone` — keyboard fully dead until the
  splash is dismissed, and one space = exactly one play after (mock log single-debit-verified;
  beware: CDP Network.requestWillBeSent also counts CORS preflights — a naive request counter
  reads 2 per play).
- **PROACTIVE: desktop menu drawer overlapped the BALANCE label** — label hidden while
  `stateUi.menuOpen` (LayoutDesktop).

Final bundle re-verified at 575×345 from the UPLOAD folder: compact logo, EMPTY console.
Upload folders refreshed (`~/Desktop/upload/` + `poseidon-frontend-upload/`). Still on the user:
upload + approval-thread reply.

Known cosmetics left alone (deliberate): gauge side-labels get tiny/tight at popout sizes (inside
the frame, never over symbols); buy-menu drawer brushes the board frame's left edge at 480×270;
wave_transition.webp is still 5.6MB (user-deferred iPhone decode lag); audio wishlist pending.

## 2026-08-07 — stale upload found + asset weight pass

**The upload folder was a month stale.** `dist-upload/frontend/` still held the 2026-07-28 build:
none of the 2026-08-03 work (`d190bf4`, `e5d3ab5` — 157 files) had ever reached it. Root cause is
that `dist-upload/` is a MANUAL copy of `apps/acqua-alta/build/` and nothing automates it; the
2026-08-03 session built at 13:38 but edited `Game.svelte`/`Mascot.svelte` at 13:40 and committed at
16:04, so even `build/` was two minutes stale. Rebuilt from HEAD and refreshed the upload folder.

Two traps worth remembering. The build ALWAYS exits 124/SIGTERM even on success (lingering
Vite/Sass) — judge it only by `~1973 modules transformed` / `Wrote site to "build"` / `✔ done` /
`200 /`. And build logs contain NUL bytes, so plain `grep` silently reports zero matches on them
and reads exactly like "no errors"; use `grep -a`. That produced one wrong all-clear this session.

**Asset weight: 86MB -> 37MB upload; manifest art 32.2MB -> 5.6MB.**

- 99 PNGs converted to WebP (`cwebp -q 92 -alpha_q 100 -m 6`): 39.6MB -> 6.3MB. 143 refs rewritten
  across `assets.ts`, `config.ts`, `IntroSplash`, `ModalGameRules`, `ModalPayTable`.
- Removed 4 mascot poses (`beam`/`slam`/`smash`/`tideraise`) — byte-identical MD5 copies of
  `idle.webp` and never requested; `Mascot.svelte:42` only ever loads idle. 11.8MB.
- Removed 3 atlas PNG siblings (their `.json` `meta.image` already points at the `.webp`) and 4
  dead static-root loaders with no source refs (`stake-engine-loader.gif`, `loader.gif`, both
  `spin_slaughter_loader.*`). `spin-slaughter-logo.mp4` KEPT — it is the studio intro clip.

Three near-misses, all caught before shipping:

- `idle.webp` (61 frames) and `wave_transition.webp` (60 frames) are ANIMATED WebP. PIL's default
  save writes only frame 1 — it looked like a 98% win on the mascot while destroying the animation.
  Both left untouched. Always check `n_frames` before re-encoding a WebP.
- Bulk rename by basename is unsafe: `logo.png` is a suffix of `studio_logo.png`, which silently
  broke that ref (studio_logo stayed PNG — WebP came out larger). Audit suffix collisions.
- `ModalBuyBonusConfirm.svelte:30` builds its plaque path dynamically (`${A}sprites/ui/${...}.png`),
  which no basename rename can reach — would have been a broken image on every bonus confirm.

Verified: 114 asset refs in the built bundle, 0 missing. `dist-upload/frontend` byte-identical to
`build/`. Not visually checked (per the no-screenshot working agreement).

**Shipped image quality — user reviewed and accepted.** Alpha-weighted PSNR vs the git originals:
min 27.1, median 35.3, mean 38.8 dB; 83/99 under 40 dB, 48/99 under 35 dB. Weakest are the SYMBOLS
(`parts/W_core` 27.1, `H1_core` 29.0, `S_core` 29.2, `symbol_W` 29.9, `symbol_H1` 30.6) — the art
on screen most, and what the lightmaps amplify. User inspected the running game and chose to ship
as-is. If softness is ever reported, look at symbols, not backgrounds.

If it ever needs redoing, go TIERED not flat: symbols are only 4.9MB as PNG / 3.4MB as lossless
WebP, so encoding all 37 symbol files lossless costs almost nothing and removes the loss entirely;
large UI art is fine at q95 (33.4MB -> 6.2MB, median 36.4dB). Flat lossless everywhere is NOT worth
it (28.8MB). Originals recoverable via `git show <pre-pass-commit>:<path>`.

**Left alone deliberately.** Audio is now the heaviest item — 13MB on disk, ~6.4MB actually
downloaded (one format per browser). BOTH `sounds.ogg` and `sounds.mp3` must stay: OGG is first in
`sounds.json` because the `bgm_*` loops are gapless there, mp3 is the vorbis fallback. The fix is
re-encoding down from 143kbps, not dropping a format — user flagged this as the next target. Also
untouched: the two animated WebPs (4.9MB combined) and `fonts/poseidon_gold/poseidon_gold.png`
(547KB bitmap-font page named inside its own `.xml`, so converting it means editing the XML too).

**Math is still the 2026-07-28 four-mode build and is NOT ready to upload** — see HANDOFF
"Production release blockers". Only the frontend shipped this session.
