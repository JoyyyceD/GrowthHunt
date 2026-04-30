/**
 * Auto-classify a startup blurb into one of the xhunter_accounts categories.
 * Ported from app/xhunter/Lab.tsx KEYWORD_MAP — kept in lib/ so both the
 * server (session create) and client (Lab) can use it.
 */

export type XhunterCategory =
  | 'ai-coding' | 'ai-agent' | 'infra' | 'consumer'
  | 'image' | 'video' | 'audio' | 'productivity'
  | 'vertical' | 'indie' | 'hardware'

const KEYWORD_MAP: Record<XhunterCategory, string[]> = {
  'ai-coding':    ['ide','code','coding','codegen','codebase','dev tool','devtool','editor','autocomplete','pair programmer','programming','compiler','linter','debugger','syntax','repo','git','vibe coding','agent coding'],
  'ai-agent':     ['agent','agentic','autonomous','workflow','task automation','rpa','copilot','assistant','task agent','browser agent','operator','swarm','crew'],
  'infra':        ['gpu','inference','training','mlops','ml ops','pipeline','embedding','embeddings','vector','rag','retrieval','compute','fine-tune','finetune','fine tune','model serving','tensor','foundation model','llm api','sdk','quantization','distillation','inference engine'],
  'consumer':     ['consumer','b2c','social','mobile','creator','dating','entertainment','gaming','game','companion','therapy','meditation','dating app','character','roleplay','rpg'],
  'image':        ['image','photo','design','logo','avatar','art','midjourney','stable diffusion','sd','dalle','flux','imagegen','illustration','sticker','wallpaper','interior design','fashion design','ai art'],
  'video':        ['video','motion','animation','film','shorts','clip','reel','tiktok','youtube','vfx','runway','sora','veo','lipsync','avatar video','ai video'],
  'audio':        ['audio','voice','speech','music','tts','asr','podcast','voiceover','dubbing','clone voice','voice clone','lyric','song','singing','elevenlabs','suno','udio'],
  'productivity': ['notes','docs','meeting','calendar','email','slack','crm','task','todo','knowledge base','wiki','obsidian','notion','spreadsheet','excel','sheet','google docs'],
  'vertical':     ['legal','medical','health','finance','sales','hr','real estate','recruit','recruiting','accounting','tax','insurance','pharma','clinical','radiology','therapy','b2b saas','enterprise saas','vertical saas'],
  'indie':        ['solo','indie','bootstrap','side project','one-person','single founder','solopreneur','micro saas'],
  'hardware':     ['hardware','wearable','ring','band','watch','glasses','smart glasses','pin','pendant','necklace','device','chip','sensor','iot','smart home','robot','robotics','drone','headphone','earbud','camera','vr','ar','headset'],
}

/**
 * Returns the best-matching category for a startup blurb, or null if no
 * keyword matched. Score = number of keyword regex matches; ties broken by
 * KEYWORD_MAP iteration order.
 */
export function classifyBlurb(blurb: string): XhunterCategory | null {
  const norm = (blurb || '').toLowerCase()
  if (!norm.trim()) return null
  const scores: Partial<Record<XhunterCategory, number>> = {}
  for (const [cat, words] of Object.entries(KEYWORD_MAP) as [XhunterCategory, string[]][]) {
    let score = 0
    for (const w of words) {
      const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i')
      if (re.test(norm)) score++
    }
    if (score) scores[cat] = score
  }
  const ranked = (Object.entries(scores) as [XhunterCategory, number][]).sort(
    (a, b) => b[1] - a[1]
  )
  return ranked.length ? ranked[0][0] : null
}
