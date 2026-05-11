/** Channel bucketing — no fs deps so it can be imported by client components. */

const CHANNEL_BUCKETS: Array<{ key: string; label: { en: string; zh: string }; match: (name: string) => boolean }> = [
  { key: 'x', label: { en: 'X (Twitter)', zh: 'X / 推特' }, match: n => /\b(x|twitter|推特)\b/i.test(n) },
  { key: 'youtube', label: { en: 'YouTube', zh: 'YouTube' }, match: n => /youtube/i.test(n) },
  { key: 'linkedin', label: { en: 'LinkedIn', zh: 'LinkedIn' }, match: n => /linkedin/i.test(n) },
  { key: 'hn', label: { en: 'Hacker News', zh: 'Hacker News' }, match: n => /hacker\s*news/i.test(n) },
  { key: 'reddit', label: { en: 'Reddit', zh: 'Reddit' }, match: n => /reddit/i.test(n) },
  { key: 'instagram', label: { en: 'Instagram', zh: 'Instagram' }, match: n => /instagram/i.test(n) },
  { key: 'tiktok', label: { en: 'TikTok', zh: 'TikTok' }, match: n => /tiktok/i.test(n) },
  { key: 'github', label: { en: 'GitHub', zh: 'GitHub' }, match: n => /^github$/i.test(n) },
  { key: 'discord', label: { en: 'Discord', zh: 'Discord' }, match: n => /discord/i.test(n) },
  { key: 'producthunt', label: { en: 'Product Hunt', zh: 'Product Hunt' }, match: n => /product\s*hunt/i.test(n) },
  { key: 'xhs', label: { en: 'Xiaohongshu', zh: '小红书' }, match: n => /xiaohongshu|小红书/i.test(n) },
]

export function channelKey(name: string): string | null {
  const b = CHANNEL_BUCKETS.find(x => x.match(name))
  return b ? b.key : null
}

export function getChannelFilters(locale: 'en' | 'zh' = 'en') {
  return CHANNEL_BUCKETS.map(b => ({ key: b.key, label: b.label[locale] }))
}
