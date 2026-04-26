-- Seed: Issue No. 14 — 12 baseline champions matching the static mock at
-- public/OPChampion/opchampion.jsx (lines 182-207).
--
-- Run AFTER 20260427_opchampion_schema.sql in Supabase Studio SQL Editor.
-- Idempotent: re-running upserts the same rows by slug.
--
-- upvote_count starts at 0 — real users provide real signal. If you want
-- seeded popularity, bump them manually in Supabase Studio.

insert into public.champions
  (slug, name, by_name, founder_type, category, tagline, about, hue, status, featured, source, owner_id, created_at)
values
  -- 1. FinChat
  ('finchat',
   'FinChat',
   'Marcus Lin',
   'Solo founder, ex-Bridgewater',
   'Fintech',
   'AI co-pilot for equity research analysts.',
   'FinChat is the research assistant Marcus wished he''d had during three years on a hedge-fund desk. Upload a 10-K, ask in plain English, get answers cited to the page. Built and run by one person; in production at fourteen funds. The wedge: latency. While ChatGPT thinks for 20 seconds, FinChat returns a cited answer in under three.',
   '#e84e1b', 'live', true, 'editorial', null, now() - interval '18 hours'),

  -- 2. Mailtani
  ('mailtani',
   'Mailtani',
   'Edmilson',
   'Solo founder, indie hacker',
   'SaaS · DevTools',
   'Send marketing emails without the ESP markup.',
   'Mailtani is a self-hosted email sender for indie hackers who balk at Mailchimp''s $1k/mo. Run it on a $5 VPS, plug in any SMTP provider, get the deliverability of a $400/mo SaaS. Built by one person who got quoted $480/mo for 12k subscribers and decided that math was insulting.',
   '#3b82c4', 'live', true, 'editorial', null, now() - interval '32 hours'),

  -- 3. Image V2
  ('image-v2',
   'Image V2',
   'Natalia Korsakova',
   'Solo founder, ex-Adobe',
   'Design & Art',
   'AI image generator and editor for fast creative work.',
   'Image V2 is an AI image generator and editor for teams that need faster creative production. Generate images from prompts, refine results with reference images, and compare models in one workspace. Built for ads, posters, ecommerce visuals — speed, iteration, control. One designer-engineer; sixteen months from prototype to revenue.',
   '#f59e0b', 'live', true, 'editorial', null, now() - interval '64 hours'),

  -- 4. Constellation
  ('constellation',
   'Constellation',
   'Bobby Tan',
   'Solo founder, ex-GitHub',
   'AI & Machine Learning',
   'Upgrade your AI from text search to code understanding.',
   'Constellation gives your retrieval system a brain transplant. Most "code search" is just text search dressed up. Constellation parses ASTs, builds dependency graphs, and embeds at the symbol level — so when you ask "where do we handle expired tokens", you get the actual handler, not the README that mentions it.',
   '#7a8aff', 'live', false, 'editorial', null, now() - interval '8 hours'),

  -- 5. sitecheck.dk
  ('sitecheck',
   'sitecheck.dk',
   'Bjarke Holm',
   'Solo founder, freelance',
   'SaaS · Tools',
   'One tool for performance, SEO, accessibility, and security.',
   'sitecheck.dk is a Danish-built audit suite for small agencies. Run a single URL, get a 40-page report covering Lighthouse, Core Web Vitals, schema markup, broken links, accessibility (WCAG 2.2), and security headers. White-label the PDF, send to client. $39/mo replaces three SaaS for the 80% of audits that don''t need enterprise depth.',
   '#8b7355', 'live', false, 'editorial', null, now() - interval '96 hours'),

  -- 6. Moniduck
  ('moniduck',
   'Moniduck',
   'Jean-Baptiste Roux',
   'Solo founder, ex-Datadog',
   'SaaS · DevOps',
   'Monitoring your modern tech stack.',
   'Moniduck is a Datadog alternative that doesn''t bankrupt you. Modern stacks emit 100k metrics/min — Datadog charges per metric. Moniduck does flat-rate, edge-aggregated, sane defaults. Built by one ex-Datadog SRE who got tired of the conversation.',
   '#5b9b3a', 'live', false, 'editorial', null, now() - interval '40 hours'),

  -- 7. Voicepad
  ('voicepad',
   'Voicepad',
   'Aiko Tanaka',
   'Solo founder, ex-Notion',
   'Productivity',
   'Voice notes that turn into structured docs.',
   'Voicepad records your meeting, extracts decisions and action items, and writes the doc in your team''s template. The trick: it understands "we should probably" means "decision: yes" and "let me think about it" means "owner: me, due: undefined."',
   '#c2410c', 'live', false, 'editorial', null, now() - interval '26 hours'),

  -- 8. Cinder
  ('cinder',
   'Cinder',
   'Olivia Reyes',
   'Solo founder, designer',
   'Design & Art',
   'A swatch library for designers who care about color.',
   'Cinder is a curated palette library — 4,000+ palettes hand-tagged by mood, era, and material. Filter by "mid-century editorial" or "Wes Anderson autumn." One designer, weekend-built, full-time-loved.',
   '#a8323b', 'live', false, 'editorial', null, now() - interval '12 hours'),

  -- 9. Lumen.rev
  ('lumen-rev',
   'Lumen.rev',
   'Tobias Vance',
   'Solo founder, ex-Stripe',
   'Fintech',
   'Revenue forecasting for usage-based SaaS.',
   'Lumen.rev is built for SaaS on usage-based pricing where MRR is fiction. Plug in billing data, get cohort-level forecasts with confidence bands, expansion paths, and churn early-warning. Traditional ARR tools assume seat-based contracts — Lumen models the actual stochastic process of pay-per-API-call businesses.',
   '#16746f', 'soon', false, 'editorial', null, now() - interval '4 hours'),

  -- 10. Briefly
  ('briefly',
   'Briefly',
   'Hana Park',
   'Solo founder, ex-Slack',
   'Productivity',
   'Async standups that nobody hates.',
   'Briefly replaces 15-minute Zoom standups with a 90-second voice note posted to Slack. Auto-transcribed, auto-summarized, threaded by topic. The team metric: 14% of engineering time clawed back, measured across 240 teams.',
   '#6b4f9f', 'live', false, 'editorial', null, now() - interval '50 hours'),

  -- 11. Shipyard
  ('shipyard',
   'Shipyard',
   'Kenji Watanabe',
   'Solo founder, ex-Heroku',
   'SaaS · DevTools',
   'Preview environments for non-Vercel stacks.',
   'Shipyard gives you Vercel-style preview deployments for any stack — Rails, Django, Phoenix, Spring. Open a PR, get a live URL with a fresh database snapshot, throw it away on merge.',
   '#0f6e8a', 'soon', false, 'editorial', null, now() - interval '72 hours'),

  -- 12. Pebble
  ('pebble',
   'Pebble',
   'Iris Chen',
   'Solo founder, writer',
   'Health & Wellness',
   'A journaling app that asks better questions.',
   'Pebble is a daily journal with one twist: instead of a blank page, it asks one question — chosen by an LLM that has read your past entries and noticed what you avoid. After 90 days, it generates a year-in-review essay about you that, by user accounts, is sometimes upsetting in how accurate it is.',
   '#7c5e3a', 'live', false, 'editorial', null, now() - interval '120 hours')

on conflict (slug) do update set
  name         = excluded.name,
  by_name      = excluded.by_name,
  founder_type = excluded.founder_type,
  category     = excluded.category,
  tagline      = excluded.tagline,
  about        = excluded.about,
  hue          = excluded.hue,
  status       = excluded.status,
  featured     = excluded.featured;

-- Quick verification
select count(*) as champion_count, count(*) filter (where featured) as featured_count
from public.champions where source = 'editorial';
-- Expect: champion_count = 12, featured_count = 3
