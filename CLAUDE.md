# Blagajna

A "fake till" for kids: they scan real groceries with a USB barcode scanner, get a receipt with a running total, "pay" with play cash and get change. Runs on an iPad (landscape, installed from the home screen) and is deployed to GitHub Pages at `blagajna.staric.net` (repo `astaric/blagajna`). Same stack and conventions as the sibling `../game` and `../naravoslovje` projects, except there is **no Phaser**: it is plain TypeScript + DOM + `src/style.css`.

## Commands
- `npm run dev` — Vite dev server on 5175 (`npm run preview` serves the build on the LAN; port 4175 in `.claude/launch.json`)
- `npm run build` — `tsc --noEmit && vite build` into `dist/`
- `npm test` — Vitest (jsdom), files `src/**/*.test.ts` next to the code

## Workflow
- When a task is done and `npm run build` and `npm test` pass, commit without waiting to be asked.
- Pushing to `main` deploys (GitHub Actions → Pages). Don't push or create PRs unless asked.

## Language
- All code, comments, identifiers, file names, storage keys and commit messages are **English**.
- Every player-visible string is a key in `src/i18n/sl.ts` (Slovene is allowed only there) and is read with `t()` at render time, never at module load. No inline UI text in `src/ui/`.

## Architecture
- `src/core/` — logic that does not touch the DOM beyond `scanner.ts`/`sfx.ts`: `money.ts` (integer cents, `formatEur`, `parsePrice`, number-pad `appendAmountKey`), `cart.ts` (immutable cart functions), `catalog.ts` (`Product`, validation, backup JSON, load/save), `scanner.ts`, `sfx.ts`, `storage.ts`.
- `src/ui/` — screens built with DOM helpers; `src/main.ts` wires state and scanner.
- Keep logic in Phaser/DOM-free modules and unit-test it; UI files stay thin.

## Rules that are easy to break
- **Money is integer cents.** Never use floats for prices; format only at display time.
- **Storage goes through `src/core/storage.ts`** (localStorage can be missing or throw). Keys: `catalog`, `cart`. Add any new key to the "reset" action in parent mode.
- **Scanner input** is a global capture-phase `keydown` listener (`attachScanner`): a scan is ≥4 printable keys, each ≤300 ms apart, ended by Enter or Tab. It is ignored while a text field has focus (product form) and on the pay screen. Enter/Tab are `preventDefault`-ed so a focused button isn't "clicked" by the scanner. If hardware-keyboard events stop arriving on iPad, the fallback is an invisible `<input inputmode="none">` that is kept focused.
- **Kids must not be able to edit data by accident:** adding/deleting products, parent mode and reset require **press-and-hold** (800 ms, ring fill) — reuse the `holdButton` helper, don't hand-roll one. Exception: the camera button on the "unknown product" screen is a plain tap (iOS only opens the camera from a real tap, not from a hold's completion); it only opens the product form with the photo, which still needs a name and price to save.
- **Receipt lines snapshot the product** (name/price/emoji/photo) so catalog edits mid-sale don't change a running receipt.
- **URLs stay relative** (`base: './'`, `./manifest.webmanifest`, `./icons/...`); never root-absolute, the app may be served from a subpath.
- **No service worker** (an offline cache served stale builds in `../game`). Don't add one.
- Touch targets ≥ 56 px, `touch-action: manipulation`, respect safe-area insets; the page never scrolls except the receipt list and parent list.

## Deploy
`.github/workflows/deploy.yml` (identical to `../game`) builds `dist/` and publishes to Pages on push to `main`. One-time repo setup: Settings → Pages → Source "GitHub Actions", custom domain `blagajna.staric.net`, DNS CNAME `blagajna` → `astaric.github.io`, enforce HTTPS. The build commit (`__BUILD_COMMIT__`) is shown faintly on the sale screen to confirm which version the iPad runs.
