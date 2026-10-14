# Reproduce the display browser checks

Use an authorized fictional development preview, not a live church screen. The scripts do not sign in as a member, upload media, alter a real playlist or pair a physical device. The tested management mutations are in memory only. No GitHub Actions workflow or additional browser dependency has been added.

From the repository with its existing dependencies installed:

```sh
npx playwright install chromium
export DISPLAY_PREVIEW_URL='https://YOUR-VERIFIED-PREVIEW.vercel.app/billboard-preview/manage'
export DISPLAY_EVIDENCE_DIR='test-results/continuous-display'
node scripts/verify-continuous-display.mjs
node scripts/verify-continuous-display-failures.mjs
```

For a protected preview, use the project's existing sanctioned Vercel access flow. A temporary share URL may be supplied through `DISPLAY_PREVIEW_URL` for that explicit preview. Never commit it, paste it into source code, disable Deployment Protection, or store a member/device token in these scripts. Reports omit URL query strings and exception details. The persistent restart profile is uniquely created in the OS temporary directory and removed on completion or failure.

The first script writes four individual 1920×1080 TV screenshots, four separate phone-management screenshots, and a JSON report. These are evidence of implemented sample UI, not approved church content. It checks 19 named behaviors, including the management-only now/next display. The second script checks eight media, outage and browser-process-restart behaviors. It uses an in-memory test page for malformed video; no test route or global is installed on the actual application.

Playwright's virtual clock accelerates rotation and expiration. Browser expiry assertions allow the documented 250 ms evaluation cadence; pure policy tests additionally test exact exclusive expiry. An accelerated test is not a multi-day physical-TV soak, and a Chromium viewport is not an actual iPad/Safari test. Those remain explicit release gates in VERIFICATION.md.
