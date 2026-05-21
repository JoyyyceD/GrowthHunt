-- XGrower founding codes seed for 2026-06-02 launch
-- 100 unique single-use codes, format: XGFM-XXXX-XXXX
-- Each code grants 30 days of Pro (unlimited replies) via existing redeem flow
-- Codes expire 2026-06-16 23:59 UTC (D+14 from launch) — unredeemed codes become invalid after that
--
-- DESIGN INTENT (narrative):
--   • 100 founding codes total — hard cap
--   • Distributed via X reply "I'm in" to Felix's pinned quit-bet tweet
--   • First 100 unique X accounts get one code each via DM
--   • Code → 30 days Pro (unlimited replies, vs free tier 10/day + 100/month)
--   • Quit-bet metric (300 paid users by D+7) measures REAL payments, NOT founding code claims
--
-- DEPLOYMENT:
--   1. Apply this migration to production Supabase
--   2. Export the 100 codes to a private spreadsheet (CSV) for Felix to track DM dispatch
--   3. Felix DMs first 20 manually after pinned tweet; webhook auto-DMs remaining 80
--   4. After 2026-06-16, run cleanup: `UPDATE public.xgrower_invite_codes SET expires_at = now() WHERE code LIKE 'XGFM-%' AND used_count = 0;`

insert into public.xgrower_invite_codes (code, max_uses, expires_at) values
  ('XGFM-A4K9-7R2P', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-B5L0-8S3Q', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-C6M1-9T4R', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-D7N2-0U5S', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-E8O3-1V6T', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-F9P4-2W7U', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-G0Q5-3X8V', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-H1R6-4Y9W', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-I2S7-5Z0X', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-J3T8-6A1Y', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-K4U9-7B2Z', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-L5V0-8C3A', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-M6W1-9D4B', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-N7X2-0E5C', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-O8Y3-1F6D', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-P9Z4-2G7E', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-Q0A5-3H8F', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-R1B6-4I9G', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-S2C7-5J0H', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-T3D8-6K1I', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-U4E9-7L2J', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-V5F0-8M3K', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-W6G1-9N4L', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-X7H2-0O5M', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-Y8I3-1P6N', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-Z9J4-2Q7O', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-A1K5-3R8P', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-B2L6-4S9Q', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-C3M7-5T0R', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-D4N8-6U1S', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-E5O9-7V2T', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-F6P0-8W3U', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-G7Q1-9X4V', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-H8R2-0Y5W', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-I9S3-1Z6X', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-J0T4-2A7Y', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-K1U5-3B8Z', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-L2V6-4C9A', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-M3W7-5D0B', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-N4X8-6E1C', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-O5Y9-7F2D', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-P6Z0-8G3E', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-Q7A1-9H4F', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-R8B2-0I5G', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-S9C3-1J6H', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-T0D4-2K7I', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-U1E5-3L8J', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-V2F6-4M9K', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-W3G7-5N0L', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-X4H8-6O1M', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-Y5I9-7P2N', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-Z6J0-8Q3O', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-A7K1-9R4P', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-B8L2-0S5Q', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-C9M3-1T6R', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-D0N4-2U7S', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-E1O5-3V8T', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-F2P6-4W9U', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-G3Q7-5X0V', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-H4R8-6Y1W', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-I5S9-7Z2X', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-J6T0-8A3Y', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-K7U1-9B4Z', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-L8V2-0C5A', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-M9W3-1D6B', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-N0X4-2E7C', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-O1Y5-3F8D', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-P2Z6-4G9E', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-Q3A7-5H0F', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-R4B8-6I1G', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-S5C9-7J2H', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-T6D0-8K3I', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-U7E1-9L4J', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-V8F2-0M5K', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-W9G3-1N6L', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-X0H4-2O7M', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-Y1I5-3P8N', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-Z2J6-4Q9O', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-A3K7-5R0P', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-B4L8-6S1Q', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-C5M9-7T2R', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-D6N0-8U3S', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-E7O1-9V4T', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-F8P2-0W5U', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-G9Q3-1X6V', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-H0R4-2Y7W', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-I1S5-3Z8X', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-J2T6-4A9Y', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-K3U7-5B0Z', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-L4V8-6C1A', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-M5W9-7D2B', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-N6X0-8E3C', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-O7Y1-9F4D', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-P8Z2-0G5E', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-Q9A3-1H6F', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-R0B4-2I7G', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-S1C5-3J8H', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-T2D6-4K9I', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-U3E7-5L0J', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-V4F8-6M1K', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-W5G9-7N2L', 1, '2026-06-16 23:59:00+00'),
  ('XGFM-X6H0-8O3M', 1, '2026-06-16 23:59:00+00')
on conflict (code) do nothing;

-- Verify count
do $$
declare
  founding_count int;
begin
  select count(*) into founding_count
  from public.xgrower_invite_codes
  where code like 'XGFM-%';

  raise notice 'Founding codes seeded: %', founding_count;

  if founding_count <> 100 then
    raise warning 'Expected 100 founding codes, got %', founding_count;
  end if;
end $$;
