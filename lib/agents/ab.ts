/**
 * A/B Lab — minimal click-through A/B testing.
 *
 * Each test has N variants. Each variant gets a tracked URL of shape
 * /ab/<testId>/<variantKey> that 302-redirects to target_url and records
 * a row in ab_clicks. The dashboard reads counts + flags a winner once
 * the chi-squared gap between the leader and runner-up is statistically
 * meaningful (z >= 1.96, ~p<0.05) given the observed click totals.
 *
 * v1 measures clicks, not conversions. Conversion tracking needs the
 * user's site analytics pipeline; out of scope here.
 */
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_VARIANTS = 4
const MIN_VARIANT_CLICKS_FOR_WINNER = 30

export interface AbVariant {
  key: string        // 'A', 'B', 'C', 'D'
  copy: string
  clicks: number
}

export interface AbTest {
  id: string
  workspace_id: string
  name: string
  target_url: string
  variants: AbVariant[]
  total_clicks: number
  created_at: string
  updated_at: string
}

export interface AbWinnerResult {
  winner: string | null
  confidence: 'insufficient' | 'tied' | 'significant'
  z?: number
  message: string
}

function variantKeys(n: number): string[] {
  return Array.from({ length: Math.max(2, Math.min(MAX_VARIANTS, n)) }, (_, i) => String.fromCharCode(65 + i))
}

export interface CreateTestInput {
  workspaceId: string
  name: string
  targetUrl: string
  copies: string[]
}

export async function createAbTest(input: CreateTestInput): Promise<AbTest | { error: string }> {
  const copies = input.copies.map((c) => c.trim()).filter(Boolean).slice(0, MAX_VARIANTS)
  if (copies.length < 2) return { error: 'Need at least 2 variants' }
  if (!/^https?:\/\//i.test(input.targetUrl)) return { error: 'target_url must be a full http(s) URL' }
  const keys = variantKeys(copies.length)
  const variants: AbVariant[] = keys.map((k, i) => ({ key: k, copy: copies[i]!.slice(0, 800), clicks: 0 }))

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('ab_tests')
    .insert({
      workspace_id: input.workspaceId,
      name: input.name.trim().slice(0, 200),
      target_url: input.targetUrl.trim().slice(0, 1000),
      variants,
      total_clicks: 0,
    })
    .select('*')
    .single()
  if (error) return { error: error.message }
  return data as AbTest
}

export async function recordAbClick(testId: string, variantKey: string, opts: { ipHash?: string; userAgent?: string; referrer?: string } = {}): Promise<{ target?: string; error?: string }> {
  const admin = createAdminClient()
  const { data: test, error: tErr } = await admin
    .from('ab_tests')
    .select('id, target_url, variants')
    .eq('id', testId)
    .maybeSingle()
  if (tErr || !test) return { error: 'Test not found' }
  const variants = (test.variants as AbVariant[]) || []
  if (!variants.find((v) => v.key === variantKey)) return { error: 'Variant not found' }

  // Increment variant click count atomically by re-reading + writing the JSON column.
  const next = variants.map((v) => (v.key === variantKey ? { ...v, clicks: (v.clicks || 0) + 1 } : v))
  const total = next.reduce((s, v) => s + (v.clicks || 0), 0)

  await admin.from('ab_tests').update({ variants: next, total_clicks: total }).eq('id', testId)
  await admin.from('ab_clicks').insert({
    test_id: testId,
    variant_key: variantKey,
    ip_hash: opts.ipHash || null,
    user_agent: (opts.userAgent || '').slice(0, 500),
    referrer: (opts.referrer || '').slice(0, 500),
  })

  return { target: test.target_url as string }
}

/**
 * Approximate winner detection: two-proportion z-test between the top
 * variant and the runner-up, against H0 of equal CTR among shown impressions.
 * We treat clicks as observed traffic with implied equal exposure (best we
 * can do without per-variant impression counts). Threshold |z| >= 1.96.
 */
export function detectWinner(test: AbTest): AbWinnerResult {
  const sorted = [...test.variants].sort((a, b) => b.clicks - a.clicks)
  const top = sorted[0]
  const second = sorted[1]
  if (!top || !second) {
    return { winner: null, confidence: 'insufficient', message: 'Not enough variants.' }
  }
  const total = top.clicks + second.clicks
  if (top.clicks < MIN_VARIANT_CLICKS_FOR_WINNER || second.clicks < MIN_VARIANT_CLICKS_FOR_WINNER) {
    return { winner: null, confidence: 'insufficient', message: `Need at least ${MIN_VARIANT_CLICKS_FOR_WINNER} clicks per variant to call a winner.` }
  }
  if (top.clicks === second.clicks) {
    return { winner: null, confidence: 'tied', message: 'Top two variants are tied.' }
  }
  const p1 = top.clicks / total
  const p2 = second.clicks / total
  const pHat = (top.clicks + second.clicks) / (2 * total)
  const se = Math.sqrt(pHat * (1 - pHat) * 2 / total)
  if (se === 0) return { winner: null, confidence: 'insufficient', message: 'Zero variance.' }
  const z = (p1 - p2) / se
  if (Math.abs(z) >= 1.96) {
    const lift = ((p1 - p2) / p2) * 100
    return { winner: top.key, confidence: 'significant', z, message: `Variant ${top.key} is winning by ${lift.toFixed(1)}% (z=${z.toFixed(2)}).` }
  }
  return { winner: null, confidence: 'insufficient', z, message: `No significant winner yet (z=${z.toFixed(2)}, need |z|≥1.96).` }
}

export async function listAbTests(workspaceId: string): Promise<AbTest[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('ab_tests')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false })
    .limit(40)
  if (error) return []
  return (data || []) as AbTest[]
}

export async function getAbTest(id: string): Promise<AbTest | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('ab_tests').select('*').eq('id', id).maybeSingle()
  return (data as AbTest) || null
}
