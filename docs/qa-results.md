# QA + Audit Results — 2 Sep 2026

Full-app audit and runtime QA pass: 38-agent static audit (69 findings, 29
confirmed P0–P2 after adversarial verification) + hands-on emulator QA of
every screen against a local backend on a scratch database. 23 frontend
files and 6 backend files changed; 151 frontend tests and 7 new backend
tests pass. Nothing was committed — review with `git diff`.

## How the app was tested

- Android emulator (Medium_Phone AVD, soft keyboard enabled for the session),
  debug APK of 2 Sep, Metro with `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000`.
- Backend run locally (`uvicorn`) against a throwaway sqlite DB — production
  data untouched.
- Every screen exercised as a user: signup, onboarding, multi-item bills,
  partial payment, overpayment settling dues, payment recording + ceiling,
  search, products CRUD, printer (graceful no-Bluetooth path + runtime
  permission), scanner (camera pipeline live), offline error + retry
  recovery, sign-out, wrong-password, back behavior, app relaunch.

## Fixed and verified on device this session

| Sev | Issue | Fix |
|-----|-------|-----|
| P1 | Focused field hidden behind keyboard on scroll forms (typing was blind on signup Confirm-password, Amount-paid, etc.) | New `useKeyboardInputScroll` hook scrolls the focused input above the keyboard; wired into auth layout, New Bill, Business Profile |
| P1 | Customer detail showed wrong outstanding after an overpayment (client re-derived dues from bills, server says ₹0) | Screen + PDF statement now trust server `total_unpaid` (derived value kept as fallback) |
| P1 | Double-tap / post-success window could record a bill twice | In-flight ref guard in `useCreateBill`, `isSubmitting` on the button, form reset moved before catalogue saves |
| P2 | Barcode scan resolving after a slow lookup wiped edits made meanwhile (whole-array write from stale snapshot) | Per-path Formik writes reading current line through a ref |
| P2 | All timestamps shown 5h30 early (naive UTC parsed as local) | `ensureUtc` in `utils/date.js` (+ tests) |
| P2 | White status-bar icons unreadable on light auth screens | `StatusBar style="dark"` scoped to the auth layout |
| P2 | Session expiry silently dumped user at login | "Your session expired" notice on the login screen (only when a live session was rejected) |
| P2 | Failed refresh silently swallowed on My Customers once data existed | Inline "showing earlier data" banner |
| P2 | Product save errors rendered behind the editor sheet | Error now shown inside the sheet |
| P2 | Stale "no printer" error persisted inside the next bill's success card | Cleared on each new submission |
| P2 | `roundMoney` mis-rounded half-paisa amounts ≥ ₹4 | Precision-trimmed rounding (+ tests) |
| P2 | Previous customer's dues stayed in the payment ceiling while typing a new phone | Ceiling reset on phone edit |
| P3 | Muted text 2.6:1 and success green 3.1:1 contrast | `textMuted` → #64748B, `success` → #15803D |
| P3 | Scanner Cancel invisible on light permission screen | Light-background variant |
| P3 | Tiny touch targets (View screenshot link, image Remove, Pay pill) | Pressable + hitSlop / larger slop |
| P3 | No qty/rate upper bounds; no 50-item cap client-side | Yup bounds matching the server |
| P4 | Drawer showed the same name twice when business name = username | Duplicate line suppressed |

Backend (deploy = push to backend main; migrations auto-run):

- SECRET_KEY: refuses to start without one outside sqlite dev (Render already
  generates it in render.yaml).
- Signup password: server-side minimum 6 chars.
- Customer detail: `selectinload` for bills+items (was N+1) and payment
  screenshot blobs deferred (were loaded into memory, up to 5MB each, on
  every profile view).
- Screenshot uploads: chunked read with the 5MB cap enforced during the read.
- Deleted `app/routers/items.py` — orphaned, unauthenticated, imported a
  model that no longer exists.
- New `tests/test_settlement.py` (7 tests): multi-item bills, settlement
  maths, overpayment settling dues, payment ceiling, password floor.

## Verified working (no change needed)

Signup/login validation and errors; onboarding save + skip; multi-item bill
maths incl. live balance; existing-customer autofill with live dues;
overpayment ceiling message and settle-dues flow; payment recording +
refresh; bill detail modal item table; search (empty/debounce/results);
products CRUD + CSV import affordance; printer screen degradation and
Bluetooth runtime permission; scanner camera + ML Kit pipeline; offline
error with working retry; sign-out; server-side ownership checks on the
routes exercised.

## Known remaining (not fixed, in priority order)

1. **P2** Customers/products lists silently truncate at the server's page
   size (200) — no pagination in the frontend services.
2. **P2** Payment screenshots are captured but no UI ever displays them
   (`GET /api/payments/{id}/screenshot` unused).
3. **P2** `useCustomerDetail` refetches on every mounted screen via
   `lastBilledAt` and double-fetches after a payment.
4. **P2** Back at the root screen exits instantly — a half-filled bill is
   lost with no confirmation or draft.
5. **P3** Every keystroke re-renders all item rows in the bill form (fine at
   2–3 items).
6. **P3** Camera/gallery images upload at full resolution (needs
   expo-image-manipulator to downscale).
7. **P3** No login rate limiting; CORS `allow_origins=["*"]`; `/health`
   echoes raw DB exception text.
8. **P3** Search results dues can go stale (BillingContext override is dead
   code); drawer items don't reset a section's nested stack.
9. **P4** No deep-link scheme; CSV parser doesn't support quoted newlines;
   splash logo decoded at 1024px for a 96px box.
10. **Unresolved decision**: `app.json` splash `image` points at
    `./assets/logo.png` (black-framed) while the JS splash uses
    `logo-mark.png` — next `expo prebuild` will regenerate the native splash
    with the framed logo. One line to align, pending owner's choice.
