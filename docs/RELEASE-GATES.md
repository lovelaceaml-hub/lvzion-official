# LV Zion Official — production release controls

**Updated:** October 14, 2026. **Current verified state:** [CURRENT-STATUS.md](CURRENT-STATUS.md). **Documentation map:** [INDEX.md](INDEX.md). Historical build results in individual workstreams are not substitutes for current release verification.

## Platform and authorization boundaries

- **Only the actual LV Zion Official app** at `https://lvz.app` is the target. Its GitHub repository is `lovelaceaml-hub/lvzion-official`; Vercel team/project `lvzion/lvzion-official`; Supabase project `otecqlkqirncotytbfns`.
- User approval covered real application setup and self-service signup (October 14, 2026). **No new Vercel previews are authorized unless explicitly requested**, and automatic Git deployments are disabled in `vercel.json`. A Git documentation push must **not** trigger or be described as an app deployment.
- All app/module changes must be integrated with the **latest** `main`, preserve parallel unmerged workstreams, and undergo the repository's configured Node 24 `npm ci --ignore-scripts`, `npm run build`, and `npm run test:browser` where relevant. Real local Auth/SMTP tests use fictional `example.invalid` addresses and a disposable environment only.
- Before any production deployment: verify the Vercel team, exact Git SHA, target, build logs, Supabase project and pending migrations; verify runtime health, sign-in/signup and each affected module afterward. Previous READY production deployments provide website rollback, but **do not** roll back databases by deleting members, audits, bookings or contacts.
- New migrations require a reviewed additive SQL source, disposable SQL/RLS checks, [HOSTED-MIGRATION-LEDGER.json](HOSTED-MIGRATION-LEDGER.json) reconciliation against hosted `list_migrations`, and independent security/scope review. Repository migration timestamp IDs differ from hosted IDs for many entries: **never blindly run `db push` or replay older migrations**.
- Private credentials belong in approved provider secret stores or personal Apple Passwords/Keychain, not Git, screenshots or chat exports. The old LV Zion Firebase apps, original Mother’s Love experience and their databases are independent; do not alter them or initiate paid service changes without specific authorization.

## Member signup and authorization

Production provides personal email/password sign-in, required first/last name fields, confirmed email, a manually triggered confirmation resend and owner-controlled registration/placement. The user-requested minimum password length is **six** characters; longer passwords are accepted. The app retains generic account-existence responses, BotID/rate controls, short-lived issued signup tickets, no-store private API behavior, and existing-record invitation workflows.

- Each new confirmed account starts **Unassigned** to age category, group and unit. Email ownership confirmation does **not** verify church membership.
- An independently authorized membership administrator must verify the person, resolve possible duplicates, select a real unit, and audit the decision. Scoped leadership, department, technical authority, account administration and module grants remain independently enforced.
- The verified original owner has one special one-time bootstrap authorization and may administer while Unassigned. Do not automatically apply that exception to other intake accounts.
- **Acceptance still needed before broad self-enrollment:** a consenting real-person full signup/SMTP-confirmation/reload/login/placement test, physical mobile browsers, and scoped unauthorized-access tests. No test accounts, emails, contacts or sample religious content were inserted by the documentation audit.

## Module-specific go/no-go gates

| Module | What is already integrated | What must stay gated |
| --- | --- | --- |
| Contacts | Owner-only verified pilot and authorized private UI | No broad member sharing/visibility, real outreach import, exports, external messages or unapproved retention policy; require owner-authenticated save/reload acceptance |
| Study Rooms | Twelve resources and owner management controls | **New booking gate remains `false`**; first reconcile original Firebase bookings and approve a single authority before cutover. Do not let both apps accept conflicting reservations |
| Continuous Church Display | Approved owner module, R1 and R2 code/schema/operations | No real slides published, no screen paired, no Mother’s Love or room feeds, media uploads or unattended-TV public launch without separate content, device and soak approval |
| Work Mission Morning Prayer | Approved owner module, private live schema and empty schedule setup | No verified real event schedule, meeting access, external source sync/GroupMe/Signal distribution or wider host/member grants without independent approval |
| Worship Duty | Current-main integration review in [PR #25](https://github.com/lovelaceaml-hub/lvzion-official/pull/25) | **Not production released**. Complete owner setup UI/API/tests and reviewed migration before merge or activation |
| Gospel Planning | Historical development in [PR #11](https://github.com/lovelaceaml-hub/lvzion-official/pull/11) | **Not production released**. Reconcile historical branch with live identity/permissions, test independently and require explicit rollout |

Supabase `app_modules.status='approved'` is **not** sufficient proof of a user-accessible app or authorization for physical/communications workflows: member grant, role, per-screen/per-series permissions and operational gates are separate requirements.

## Evidence and known verification limits

- The current audit verified read-only live database counts, 16 hosted migrations, production deployment aliases/commit, and per-module registration/grants. See [CURRENT-STATUS.md](CURRENT-STATUS.md).
- Earlier build, Chromium, disposable PGlite and local SMTP results belong to their individual commit/deployment dates. No new production browser UI automation, real person signup, physical Safari/Android/TV run, or disaster-restore drill is implied merely by this documentation update.
- Supabase Security Advisor notices for callable security-definer functions and password/leaked-credential protection remain items for explicit review; private RLS tables without browser policies are intentionally deny-by-default. Do not weaken grants simply to suppress warnings.
- Owner approval of a draft/module does not allow imported private data or broader group/department access. No religious symbols/content, church content publication or external mailing may be invented.

**Next practical acceptance:** finish and observe one consensual non-owner registration end-to-end, including Unassigned status and authorized first placement; then pilot each module strictly inside its separate release gates. For real procedures see [USER-MANUAL.md](USER-MANUAL.md).
