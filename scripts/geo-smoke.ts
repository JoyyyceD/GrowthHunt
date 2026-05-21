/**
 * Manual GEO audit smoke test / dogfood runner.
 *
 *   bun run scripts/geo-smoke.ts https://growthhunt.ai
 *   bun run scripts/geo-smoke.ts <url> [url...]
 *
 * Hits the network and (if ANTHROPIC_API_KEY is set) Claude Haiku.
 */
import { runAudit } from '../lib/audit'

async function main() {
  const urls = process.argv.slice(2)
  if (urls.length === 0) {
    console.log('Usage: bun run scripts/geo-smoke.ts <url> [url...]')
    console.log('Suggested dogfood set: GrowthHunt, EverMemory, Token Galaxy')
    process.exit(0)
  }

  for (const url of urls) {
    console.log(`\n── Auditing ${url} ──`)
    try {
      const r = await runAudit(url)
      console.log(`Score: ${r.overall_score}/100 (${r.grade})   status=${r.status}`)
      for (const d of r.dimensions) {
        console.log(`  ${d.label.padEnd(26)} ${String(d.percent).padStart(3)}%   weight ${d.weight}`)
      }
      console.log(`  Engines:`, r.engine_compatibility)
      console.log(`  Issues (${r.issues.length}):`)
      for (const issue of r.issues.slice(0, 6)) {
        console.log(`    [${issue.severity}] ${issue.title}`)
      }
    } catch (err) {
      console.error(`  Failed: ${(err as Error).message}`)
    }
  }
}

main()
