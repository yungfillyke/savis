# SAVIS — Project Progress Snapshot

Last updated: 2026-10-05

## Current state

SAVIS is a Kenya-focused marketplace for consumers, providers, professionals, sellers and developer-managed agents.

Current branch for this completion pass: `savis-developer-complete`.

## Developer Control Plane — completion pass

Completed in this pass:

1. **Developer access / first-run provisioning**
   - Added secure owner-controlled bootstrap route.
   - Bootstrap requires the authenticated email to match server-only `SAVIS_DEVELOPER_EMAIL`.
   - Bootstrap closes after the first developer admin exists.
   - No passwords or service-role credentials are requested in chat.

2. **Developer identity and allowlist**
   - `developer_admins` remains the authoritative allowlist.
   - Console displays the authenticated developer identity.
   - Developer actions remain server/RPC protected.

3. **SAFE control center**
   - Added health snapshot.
   - Added audit log viewer.
   - Added server-side feature flags.
   - Kept provider review, search/location and analytics navigation.

4. **Business Control Center**
   - Providers, sellers and professionals only.
   - Consumers intentionally excluded.
   - Business profile edits are audited.
   - Role-specific business foundation remains available.

5. **Provider / seller / professional management**
   - Developer can search and edit supported business profile fields.
   - Verification state is visible.
   - Assisted sessions remain password-free and time-boxed.

6. **Developer-only Agent Management**
   - Agents remain separate from consumer administration.
   - Developer can inspect and enable/disable developer-managed agent records.

7. **Assisted sessions**
   - Prepared sessions can be activated through a signed HttpOnly delegated-session cookie.
   - Sessions are target-scoped, time-boxed and audited.
   - This is intentionally not a fake Supabase auth identity.

8. **OPERATIONAL control center**
   - Jobs/bookings
   - payment-ledger recovery
   - support messaging
   - marketplace visibility
   - operational metrics
   - all developer-gated and audited

9. **Audit / health**
   - Added developer audit reader RPC.
   - Added developer health snapshot RPC.
   - Added system security state.

10. **Nuclear / emergency separation**
   - Added server-side developer security state.
   - Emergency controls require authenticated developer access plus a server-only 12-digit credential and typed confirmation.
   - Reversible maintenance/signup/payment controls are available.
   - Irreversible data destruction is deliberately not exposed from ordinary web access.

11. **Security hardening**
   - Sensitive state changes remain security-definer RPCs.
   - Developer bootstrap uses service-role only on the server.
   - No owner password sharing.
   - Consumer accounts remain outside Business Control Center.
   - Emergency controls are audited.

12. **README / setup**
   - Rebuilt README as the current beginning-to-end setup, architecture, migration, security and developer-console guide.
   - Added first-run bootstrap and environment requirements.

13. **Production verification path**
   - Main branch is the source of truth.
   - Deployment verification is required after merge before calling production READY.
   - Final page-by-page product refinement begins only after the developer control plane is verified.

## New migration

Run once in Supabase SQL Editor → New query:

`supabase/developer-security.sql`

It creates:
- developer security state
- system control state
- session epoch
- developer health snapshot
- audited emergency state changes

Existing developer migrations remain:
- developer-console.sql
- business-control.sql
- developer-agents.sql
- operational-control.sql
- assisted-session.sql

## Developer environment

Server-only:
- `SAVIS_DEVELOPER_EMAIL`
- `SAVIS_NUCLEAR_CODE` (exactly 12 digits)
- `SUPABASE_SERVICE_ROLE_KEY`

Never commit or paste these values.

## Important current limitations

- Live Safaricom credentials are intentionally postponed.
- Google/Apple still require external provider configuration.
- Full global forced re-login integration across every authenticated surface remains a final security integration step.
- Irreversible data destruction is intentionally isolated rather than exposed as a normal web button.
- Page-by-page consumer/provider refinement starts only after Developer Control Plane access and production verification are confirmed.

## Next product phase

After developer completion verification, refine page-by-page:
Consumer Home → For You → Jobs → Messages & Payments → Profile → Provider Hub → KYC/review → Seller/Shop → Professional → Agent → public browse/search → payment UX → final mobile/accessibility pass.

## Source of truth

Use current GitHub `main`, current Supabase migrations and current Vercel production. Do not rebuild from the historical uploaded HTML or edit the nested historical `savis/` directory.


## Visual refinement pass — light premium internal dashboards

Implemented on branch `savis-light-dashboard-refinement`:
- Internal consumer/provider/profile/messages surfaces now use a light, soft-neutral dashboard foundation.
- Cards use white surfaces, larger rounded corners, lighter borders and softer shadows.
- SAVIS red remains the primary action/accent color instead of dominating the whole page.
- Consumer home gains a compact four-metric overview row.
- Consumer provider/contact results are alphabetically ordered by provider name while retaining distance as metadata.
- Provider Hub content width is expanded for a more dashboard-like desktop composition.
- Existing public landing remains dark/red; the light system is scoped to authenticated/internal surfaces.
- Reference direction: spacious fintech/marketplace dashboard layouts supplied for this refinement pass.

Next visual focus:
Consumer Jobs → Messages & Payments → Profile polish → Provider Hub cards/analytics → Seller/Professional surfaces → final responsive/accessibility pass.


## Mapbox Service Discovery Map — October 2026
- Mapbox Studio custom styles published for SAVIS Dark 2D and Light 2D.
- Dark style URL: mapbox://styles/saviske/cmuuy3rbj00b601s89nmx5smw
- Light style URL: mapbox://styles/saviske/cmuuytytk00vq01sa634e0esl
- Branch: savis-mapbox-service-discovery
- Replaced Leaflet/CARTO rendering foundation in SavisMap with Mapbox GL JS 3.32.
- Added light/dark style switching, provider GeoJSON clustering, blue/gold/black verification marker system, provider popups, SAVIS user radar/heading marker, geolocate control, and initial Mapbox Directions route rendering.
- Mapbox public token remains environment-only via NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN; never commit token values.
- Next: rotate the token shared in chat, add the replacement public token to Vercel, run production/preview build verification, then refine provider badge data and navigation UI.
