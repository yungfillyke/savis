# SAVIS — Project Progress Snapshot

Last updated: 2026-10-03

## Product
SAVIS is a Kenya-focused marketplace connecting consumers with trusted local helpers, providers, professionals, sellers and agents.

## Current production
- Vercel production: https://savis-alpha.vercel.app/
- GitHub repo: https://github.com/yungfillyke/savis
- Main branch contains the merged Home, Settings, Account Menu, location foundation and map foundation.

## Roles
- Consumer
- Provider
- Professional
- Seller
- Agent

## Completed
### Consumer Home UX
- Account/welcome information at the top
- Search
- Location section
- Sponsored ad placeholder
- Categories
- Nearby provider cards
- Recommendations
- Bottom navigation
- Account menu with Profile, Settings, Bookings, Messages and role-related links
- Agent promotion removed from Home

### Account / Settings
- Profile page
- Settings page
- Dark mode preference prototype
- English/Swahili preference
- Notifications preference
- Location preference
- Account menu
- Messages placeholder
- Bookings flow exists

### Location foundation
- Browser geolocation opt-in
- Location saved in localStorage
- User coordinates can be written to Supabase profile
- Great-circle distance calculation
- Booking requests can carry consumer latitude/longitude/accuracy
- Existing booking flow has fallback behavior if the location migration is not yet applied

### Maps
- OpenStreetMap embedded map on Consumer Home
- Current location can center the map
- Open-map link available
- This is still a foundation: it is not yet the final interactive multi-marker map.

## Important current limitation
The Supabase SQL migration has been prepared in `supabase/schema.sql`, but it has NOT been confirmed as executed in the Supabase project.

The migration adds:
- profiles.latitude
- profiles.longitude
- profiles.location_name
- profiles.service_category
- profiles.hourly_rate
- profiles.rating
- profiles.review_count
- profiles.availability
- profiles.verified
- profiles.bio
- jobs.latitude
- jobs.longitude
- jobs.location_accuracy
- indexes for discovery
- `search_nearby_providers(...)` RPC using a Haversine-style distance calculation

## Latest development branch
Branch: `savis-real-provider-discovery`

This branch:
- Restored the full Consumer Home after the previous location PR accidentally removed most of the page content.
- Added a real-provider discovery path from Supabase profiles.
- Added the nearby-provider RPC integration with fallback to profile querying.
- Kept sample providers as an Alpha fallback until real provider profiles exist.
- Updated provider detail pages so real Supabase provider IDs can open a provider profile and booking flow.
- Preserved the existing booking/location behavior.

Latest commits:
- Consumer Home restoration + discovery foundation: `7bde13abb5d3b3cbc775faffd39c156e9d9d0e0a`
- Supabase provider metadata + nearby RPC: `4c6873f009c164a548b5a575f1f59a2688915c3b`
- Provider detail connection: `b73f3c0051cb509cd1c55ee33b162de209729e9e`

## Next steps — do these in order
1. Open Supabase → SQL Editor.
2. Run the current `supabase/schema.sql` migration from the branch.
3. Create/publish at least one real Provider profile with:
   - role = provider
   - service_category
   - latitude
   - longitude
   - location_name
   - hourly_rate
   - availability
   - verified
   - bio
4. Test Consumer Home:
   - login
   - enable location
   - confirm live provider discovery
   - change category
   - search
   - open provider profile
   - send booking request
   - verify booking contains consumer coordinates
5. After that, build the proper interactive map layer with multiple provider markers.
6. Then improve provider onboarding/verification so providers can enter and maintain their own service/location data.
7. Later: M-Pesa, real wallet/escrow, messaging backend, notifications and agent commissions.

## What is NOT finished yet
- Supabase migration execution has not been verified.
- Real provider data is not populated yet.
- Multi-provider interactive map markers are not finished.
- Real routing/navigation is not finished.
- Provider verification backend is not finished.
- M-Pesa integration is not finished.
- Messaging backend is not finished.
- Wallet/escrow is still prototype/local.
- Ads and recommendations are still prototype/static.
- Search is still partly client-side.
- No full local TypeScript/test run has been performed; Vercel deployment readiness is the current deployment verification.

## Continuation instruction
When continuing this project, do NOT rebuild SAVIS from the old uploaded `index.html`. Use the current GitHub main/active branch and the live Alpha as the source of truth. The old HTML is only a historical design/feature reference.
