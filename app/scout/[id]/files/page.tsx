'use client'
/**
 * /scout/[id]/files — knowledge base reader (decision 3.8): rendered
 * markdown, Copy / Download / rev history, and an "ask Scout to change this
 * doc" bar that hands off to the chat.
 */
import { use, useCallback, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { LeftRail, Markdown, useWorkspaceData } from '../../ui'

interface FullArtifact {
  slug: string
  title: string
  content_md: string
  rev: number
  updated_at: string
}

export default function ScoutFiles({ params }: { params: Promise<{ id: string }> }) {
  const { id: workspaceId } = use(params)
  const search = useSearchParams()
  const router = useRouter()
  const { artifacts } = useWorkspaceData(workspaceId)
  const [doc, setDoc] = useState<FullArtifact | null>(null)
  const [revisions, setRevisions] = useState<Array<{ rev: number; created_at: string }>>([])
  const [copied, setCopied] = useState(false)
  const [editAsk, setEditAsk] = useState('')
  const selected = search.get('doc') || artifacts[0]?.slug

  const load = useCallback(async (slug: string) => {
    const res = await fetch(`/api/scout/artifacts/${slug}?ws=${workspaceId}`)
    if (!res.ok) return
    const data = await res.json()
    setDoc(data.artifact)
    setRevisions(data.revisions || [])
  }, [workspaceId])

  useEffect(() => {
    if (selected) void load(selected)
  }, [selected, load])

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)' }}>
      <LeftRail workspaceId={workspaceId} workspaceName="" active="files" />
      <div style={{ width: 230, flexShrink: 0, borderRight: '1px solid var(--rule)', padding: '18px 14px', overflowY: 'auto' }}>
        <div className="eyebrow" style={{ marginBottom: 12 }}><span className="dot" />Brand core</div>
        {artifacts.map(a => (
          <button
            key={a.slug}
            onClick={() => router.replace(`/scout/${workspaceId}/files?doc=${a.slug}`)}
            style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 8,
              border: 'none', cursor: 'pointer', fontSize: 13,
              background: selected === a.slug ? 'var(--bg-card)' : 'transparent',
              color: selected === a.slug ? 'var(--ink)' : 'var(--ink-dim)',
              fontWeight: selected === a.slug ? 600 : 400,
            }}
          >
            📄 {a.slug}
          </button>
        ))}
        {artifacts.length === 0 && <div style={{ fontSize: 13, color: 'var(--ink-faint)' }}>No documents yet.</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '24px 36px' }}>
        {doc ? (
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600 }}>{doc.slug}.md</span>
                <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginLeft: 10 }}>
                  {doc.content_md.length.toLocaleString()} chars · rev {doc.rev}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  style={btn}
                  onClick={async () => {
                    await navigator.clipboard.writeText(doc.content_md)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 1500)
                  }}
                >
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
                <a href={`/api/scout/artifacts/${doc.slug}?ws=${workspaceId}&download=1`} style={{ ...btn, textDecoration: 'none' }}>Download .md</a>
              </div>
            </div>
            {revisions.length > 0 && (
              <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '6px 0 0' }}>
                🐾 Revised by Scout · {revisions.length} earlier version{revisions.length > 1 ? 's' : ''} kept
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--rule)', margin: '14px 0 18px' }} />
            <Markdown text={doc.content_md} />
            <form
              onSubmit={e => {
                e.preventDefault()
                if (!editAsk.trim()) return
                const prompt = `In ${doc.slug}.md: ${editAsk.trim()}`
                router.push(`/scout/${workspaceId}?ask=${encodeURIComponent(prompt)}`)
              }}
              style={{
                position: 'sticky', bottom: 16, display: 'flex', gap: 8, marginTop: 28,
                background: 'var(--bg-elev)', border: '1px solid var(--accent-border)', borderRadius: 12, padding: '10px 12px',
              }}
            >
              <span aria-hidden style={{ fontSize: 16 }}>🐾</span>
              <input
                value={editAsk}
                onChange={e => setEditAsk(e.target.value)}
                placeholder={`Ask Scout to change this doc — "make the sample messaging punchier"`}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, color: 'var(--ink)' }}
              />
              <button type="submit" style={btn}>Ask</button>
            </form>
          </div>
        ) : (
          <div style={{ color: 'var(--ink-faint)', fontSize: 14, textAlign: 'center', marginTop: 80 }}>
            Select a document.
          </div>
        )}
      </div>
    </div>
  )
}

const btn: React.CSSProperties = {
  fontSize: 12.5, padding: '5px 12px', borderRadius: 8, border: '1px solid var(--rule-strong)',
  background: 'transparent', color: 'var(--ink-dim)', cursor: 'pointer',
}
