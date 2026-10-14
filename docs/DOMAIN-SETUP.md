# LV Zion Official domain status

## Actual production app

[lvz.app](https://lvz.app) serves the real member application. The former synthetic-prototype-only and signup-disabled status is superseded. Current production source and verification are in the [handoff](HANDOFF.md); domain ownership alone never activates a module or grants access.

The apex and www.lvz.app belong to the existing Vercel `lvzion-official` project under team `lvzion`. Registration, DNS, TLS and the www redirect were verified during the completed October 14 setup. The October 14 documentation audit confirmed both aliases on the READY deployment. Registration, renewal settings and DNS were not changed or re-audited by this documentation task. Do not register the domain again.

## Authentication email

Confirmed signup, sign-in, invitation and recovery are implemented at the actual app. Sending uses the approved Resend free plan with the dedicated auth.lvz.app sender and restricted credential in Keychain/provider stores. Sender DNS, SMTP/TLS and provider delivery were verified during actual setup; see [setup receipts](ACTUAL-APP-SETUP.md). The previously pending email-provider selection is complete.

Transactional sending does not establish a receiving mailbox or forwarding service for @lvz.app. No personal inbox or new receiving service is claimed or requested. Do not change DNS, account settings or billing as part of documentation maintenance.

## Phone installation

The app provides [installation instructions](https://lvz.app/install), a manifest, generic icons and an opt-in offline fallback. Only a public notice and generic assets are cached; private member/API responses are excluded. Physical iOS/Android certification and native App Store distribution are not claimed.

## Targets and release boundary

- Actual website: https://lvz.app
- Vercel project: `prj_4icc6S1jw8OVKWD9AOI1oiB5fwYe`
- Vercel team: `lvzion`
- Supabase project: `otecqlkqirncotytbfns`, Las Vegas Zion
- [Release controls](RELEASE-GATES.md): no new previews unless explicitly requested; automatic Git deployments remain disabled.
- Original LV Zion apps and databases remain independent and untouched.
