/**
 * GEO weekly diff email — renders a tiny HTML report comparing the latest
 * audit to the prior snapshot and sends it via Brevo.
 */
import { sendTransactionalEmail } from '@/lib/brevo'
import type { AuditResult } from '@/lib/audit'
import type { ScoreDiff } from './snapshots'

function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

function arrow(delta: number): string {
  if (delta > 0) return `▲ +${delta}`
  if (delta < 0) return `▼ ${delta}`
  return '—'
}

function color(delta: number): string {
  if (delta > 0) return '#16a34a'
  if (delta < 0) return '#c0392b'
  return '#777'
}

export interface AlertEmailInput {
  to: string
  url: string
  result: AuditResult
  diff: ScoreDiff | null
}

export async function sendWeeklyAlert(input: AlertEmailInput): Promise<void> {
  const { to, url, result, diff } = input
  const h = host(url)
  const dropped = (diff?.overallDelta ?? 0) < 0

  const subject = diff
    ? `${h} GEO ${arrow(diff.overallDelta)} (${result.overall_score}/100)`
    : `${h} weekly GEO audit (${result.overall_score}/100)`

  const dimRows = diff
    ? diff.dimensionDeltas.slice(0, 5).map((d) => `
        <tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;font:13px/1.4 -apple-system,system-ui,sans-serif">${d.id}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font:12px/1.4 monospace;color:#666">${d.prev}%</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font:12px/1.4 monospace;color:#666">${d.now}%</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font:13px/1.4 monospace;color:${color(d.delta)};font-weight:600">${arrow(d.delta)}</td>
        </tr>
      `).join('')
    : ''

  const topFixes = result.issues.slice(0, 5).map((i) => `
    <li style="margin-bottom:8px;font:13px/1.5 -apple-system,system-ui,sans-serif;color:#333">
      <strong style="color:#000">[${i.severity}] ${i.title}</strong><br/>
      <span style="color:#666">${i.fix_suggestion}</span>
    </li>
  `).join('')

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fafafa;font-family:-apple-system,system-ui,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #eee;border-radius:12px;overflow:hidden">
    <div style="padding:24px 28px;border-bottom:1px solid #eee">
      <div style="font:11px/1 monospace;text-transform:uppercase;letter-spacing:.08em;color:#999">GrowthHunt GEO · weekly</div>
      <h1 style="margin:8px 0 0;font:400 24px/1.2 'Instrument Serif',serif;color:#111">
        ${h} scored <span style="color:${color(diff?.overallDelta ?? 0)}">${result.overall_score}</span>/100 ${diff ? `(<span style="color:${color(diff.overallDelta)}">${arrow(diff.overallDelta)}</span> vs last week)` : ''}
      </h1>
    </div>
    ${diff && dimRows ? `
    <div style="padding:20px 28px;border-bottom:1px solid #eee">
      <div style="font:11px/1 monospace;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:8px">Biggest dimension moves</div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="padding:6px 12px;text-align:left;font:11px/1 monospace;color:#999;text-transform:uppercase;letter-spacing:.06em">Dimension</th>
            <th style="padding:6px 12px;text-align:right;font:11px/1 monospace;color:#999;text-transform:uppercase;letter-spacing:.06em">Prev</th>
            <th style="padding:6px 12px;text-align:right;font:11px/1 monospace;color:#999;text-transform:uppercase;letter-spacing:.06em">Now</th>
            <th style="padding:6px 12px;text-align:right;font:11px/1 monospace;color:#999;text-transform:uppercase;letter-spacing:.06em">Δ</th>
          </tr>
        </thead>
        <tbody>${dimRows}</tbody>
      </table>
    </div>` : ''}
    ${topFixes ? `
    <div style="padding:20px 28px;border-bottom:1px solid #eee">
      <div style="font:11px/1 monospace;text-transform:uppercase;letter-spacing:.08em;color:#999;margin-bottom:12px">Top priority fixes</div>
      <ol style="margin:0;padding-left:20px">${topFixes}</ol>
    </div>` : ''}
    <div style="padding:20px 28px;background:#fafafa">
      <a href="https://growthhunt.ai/geo?url=${encodeURIComponent(url)}" style="display:inline-block;background:#e84e1b;color:#fff;text-decoration:none;border-radius:999px;padding:10px 18px;font:600 13px/1 -apple-system,system-ui,sans-serif">
        ${dropped ? 'Re-audit & see fixes →' : 'View full audit →'}
      </a>
      <p style="margin:16px 0 0;font:12px/1.5 -apple-system,system-ui,sans-serif;color:#999">
        You&rsquo;re tracking ${h}. Manage subscriptions at <a href="https://growthhunt.ai/geo" style="color:#999">growthhunt.ai/geo</a>.
      </p>
    </div>
  </div>
</body></html>`

  await sendTransactionalEmail({ to, subject, htmlContent: html })
}
