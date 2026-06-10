import { setReportEnabled, getPublicReport } from '../lib/scout/reports'

const wsId = 'ba5bdc4a-6900-477a-8039-bac99575c67b'
const report = await setReportEnabled(wsId, true)
console.log('share enabled:', JSON.stringify(report))
const pub = await getPublicReport(report!.slug)
console.log('public resolves:', pub ? `${pub.workspace.name} · ${pub.docs.length} docs` : 'FAIL')

// privacy check: disable → public 404s
await setReportEnabled(wsId, false)
console.log('after disable:', (await getPublicReport(report!.slug)) === null ? 'private ✓' : 'LEAK!')
// re-enable for the page render test
await setReportEnabled(wsId, true)
console.log('slug:', report!.slug)
