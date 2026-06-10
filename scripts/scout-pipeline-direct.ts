import { runOnboardingPipeline } from '../lib/scout/onboarding'
const t0 = Date.now()
const r = await runOnboardingPipeline({
  workspaceId: 'ba5bdc4a-6900-477a-8039-bac99575c67b',
  url: 'cal.com',
  emit: e => {
    const t = ((Date.now()-t0)/1000).toFixed(1)
    if (e.type === 'status') console.log(`[${t}s] ${e.stage}: ${e.narration.slice(0,80)}`)
    else if (e.type === 'artifact_done') console.log(`[${t}s] ✓ ${e.slug} rev ${e.rev}`)
    else if (e.type === 'error') console.log(`[${t}s] ✗ ${e.message}`)
    else if (e.type === 'done') console.log(`[${t}s] DONE: ${e.reply.slice(0,120)}`)
  },
})
console.log('result:', JSON.stringify({ status: r.status, docs: r.docsWritten.length, posts: r.postsQueued }))
