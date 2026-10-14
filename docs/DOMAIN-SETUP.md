# LV Zion Official: Domain and Email Setup

**Confirmed 2026-10-14.** This is a status record, not authorization to send mail, invite real members or merge production code.

## Domain registration

| Item | Verified configuration |
| --- | --- |
| Registered domain | `lvz.app` |
| Owner in Vercel | team `lvzion` (`team_8gejhZ8EQEvRv6A4rdBUXTW4`) |
| Application project | `lvzion-official` (`prj_4icc6S1jw8OVKWD9AOI1oiB5fwYe`) |
| Previous LV Zion app | Remains independent and untouched |
| Registration | Completed on 2026-10-14 |
| Registrar auto-renew | On |
| Expected domain expiry | 2027-10-14 |
| Nameservers | `ns1.vercel-dns.com`, `ns2.vercel-dns.com` |
| Canonical host | `https://lvz.app` |
| Alternate host | `https://www.lvz.app` → permanent 308 redirect to `lvz.app` |
| Vercel DNS health | Configured, no conflicts as of verification |
| Certificates | Separate auto-renewing TLS certificates issued for `lvz.app` and `www.lvz.app` |

**Important:** Vercel confirmed both host mappings and certificates. The automated independent HTTP fetch could not confirm fresh DNS propagation at the time of setup; check the site from a normal browser before announcing it. Newly attached custom domains can take time to resolve across networks.

## Production safety

- Vercel's existing protection excludes custom domains; **`lvz.app` can be publicly accessible**. The site currently contains only synthetic UX preview data and is not a church-ready member application.
- The development branch `feature/mobile-foundation-v1` and draft PR #1 remain under review. The new primary domain points at the Vercel project's production assignment, **not** the draft branch preview.
- Do not move the draft preview onto production without tests and approval.
- Do not import real congregation records, enable real invitations or publish private directory pages before Supabase Auth and server/database authorization pass direct-API tests.

## Next: Supabase Auth URL configuration

The connected Supabase integration currently has no action for writing authentication URL settings. Set these in the **new** project `otecqlkqirncotytbfns` (Las Vegas Zion Pro), not the old Free-project database.

1. Implement and test the actual protected `/login` and `/auth/callback` routes in Next.js against synthetic test accounts.
2. In the Supabase dashboard, open **Authentication → URL Configuration** for project `otecqlkqirncotytbfns`.
3. Set **Site URL** to `https://lvz.app`.
4. Add the exact callback URLs required by the selected Auth flow, including `https://lvz.app/auth/callback`. Add development/preview URLs separately and deliberately; don't use unrestricted wildcards for production access.
5. Test invite accept, account activation, password recovery, sign-out, deep linking, and redirects using synthetic accounts. Confirm all responses enforce organization membership and RLS.

**Current status: Auth site URL changes not verified or executed.** The above are implementation steps for the next milestone, not actions already performed.

## Next: Mail sending and receiving

Checked Vercel DNS zone: it currently contains routing ALIAS records and certificate CA-authority records but **no MX, SPF, DKIM or DMARC**. As a result, registering the domain did not create inboxes or authorize outbound mail.

1. Choose a transactional sender (e.g. an approved SMTP provider) for `noreply@lvz.app` and Supabase Auth.
2. Choose a receiving service or mailbox/forwarding arrangement for `support@lvz.app`.
3. Add **only provider-issued** DNS records (MX and TXT for SPF/DKIM/DMARC) in Vercel DNS; avoid guessing values.
4. Verify sender and receiver ownership, mailbox deliverability, password-reset messages, SPF/DKIM alignment and DMARC policy before inviting members.
5. Start with a small staged send limit and monitor bounces/complaints. The domain may be newly registered and have no sender reputation.

No mail provider has been purchased or connected, and **no `@lvz.app` emails are operational yet**.

## Maintainer links

- [Registered domain](https://vercel.com/lvzion/~/domains)
- [LV Zion Official project](https://vercel.com/lvzion/lvzion-official)
- [Supabase project](https://supabase.com/dashboard/project/otecqlkqirncotytbfns)
- [Supabase Auth URL configuration](https://supabase.com/dashboard/project/otecqlkqirncotytbfns/auth/url-configuration)
- [Draft PR](https://github.com/lovelaceaml-hub/lvzion-official/pull/1)
