# LV Zion Official domain status

## Registered and connected

`lvz.app` is registered under the existing Vercel team `lvzion`. The canonical apex is attached to project `lvzion-official`; `www.lvz.app` redirects to it with HTTP 308. Domain auto-renew is on. Vercel previously verified both host mappings, DNS and automatic TLS certificates. The original application and its database remain separate.

The domain pause in older implementation notes is superseded by the completed registration on October 14, 2026. Do not purchase or register it again.

## Current production (supersedes earlier domain pause)

**As of October 14, 2026, `https://lvz.app` serves the real LV Zion Official member application**, not the original fictional landing prototype. The platform has verified production sign-in and confirmed-email self-service signup, the owner-only authenticated module system, and the 4 / 8 / 16 organization hierarchy. The canonical live source, current Vercel deployment and hosted database status are recorded in [CURRENT-STATUS.md](CURRENT-STATUS.md). Previous domain/setup notes referring to a paused registration, unused public domain, synthetic production prototype, or disabled member activation are historical and no longer describe the current runtime.

Registration and custom domain verification alone never authorize member imports, new email charges, module-wide permissions or live bookings. Keep the original systems independent, protect credentials, and deploy deliberately after reviewed testing.

## Remaining activation work

- Complete approved hosted test-account provisioning and a reviewed server identity configuration. A prior safety-blocked provisioning attempt must not be retried through another path.
- Verify the implemented confirmation, activation and recovery routes and their intended origin before enabling them. Use exact callback URLs required by the actual implemented flow, not assumed route names.
- Verify the new Supabase project's Site URL and redirect allowlist against `https://lvz.app`; these settings have not been confirmed by this development increment.
- Configure and verify an outbound mail provider and a receiving mailbox/forwarding service. No MX/SPF/DKIM/DMARC or operational `@lvz.app` inbox is claimed here.
- Conduct controlled hosted tests using approved test recipients, then obtain pilot approval. No real invitations are sent automatically.

## Phone installation work

The development branch provides a manifest, generic app icons, `/install`, and an opt-in offline fallback. Only a public notice and generic icons are cached; private member/API responses are never stored by that worker. This is not a native App Store release and does not bypass account gating.

## Targets

- Vercel team: `team_8gejhZ8EQEvRv6A4rdBUXTW4`
- Vercel project: `prj_4icc6S1jw8OVKWD9AOI1oiB5fwYe`
- Supabase organization: Las Vegas Zion (`ypidsvtopuiqvbvvucbp`)
- Supabase project: `otecqlkqirncotytbfns`
- Review: https://github.com/lovelaceaml-hub/lvzion-official/pull/2
