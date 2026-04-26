// OPChampion — by/for One-Person Companies
// Frontend mock; backend planned per OPChampion - SPEC.md (Next.js + Supabase)

const { useState, useEffect, useMemo, createContext, useContext } = React;

// ── i18n ──
const I18N = {
  en: {
    nav: { home: 'Home', thisWeek: 'This week', archive: 'Archive', signIn: 'Sign in', submit: 'Submit OPC →', myChamps: 'My champions', upvoted: 'Upvoted', comments: 'Comments', settings: 'Settings', signOut: 'Sign out' },
    hero: { eyebrow: 'Issue No. 14 · Curated Weekly · For solo founders', titleA: 'One-person', titleEm: 'companies,', titleB: 'one issue a week.', subA: 'is GrowthHunt\u2019s launch board for one-person companies \u2014 the indie hackers, freelancers, and solo founders shipping real things. Twelve picks each Monday. Upvote, comment, follow.', meta: (n,v)=>`\u00b7 Week of April 20, 2026 \u00b7 ${n} champions \u00b7 ${v} of your votes` },
    filter: { hot: 'Hot', new: 'New', top: 'Top', hotMeta: 'Hacker News algorithm: (upvotes \u2212 1) / (hours + 2) ^ 1.6', newMeta: 'Most recent first', topMeta: 'All-time leaderboard' },
    sec: { editors: 'Editor\u2019s picks \u00b7 this week', standard: 'Standard launches' },
    cta: { eyebrow: 'For one-person companies', titleA: 'Built it', titleEm: 'solo?', titleB: 'Show it.', body: 'Auto-published. No review queue. Edit anytime. Sign in once with Google \u2014 your email is your identity.', signInSubmit: 'Sign in to submit \u2192', submitBtn: 'Submit your OPC \u2192', mySubs: 'My submissions' },
    archive: { eyebrow: 'The archive', titleA: 'Past', titleEm: 'issues.', body: 'Every OPC ever featured. Sorted newest first.', open: 'Open issue \u2192', weekOf: (m)=>`Week of April ${m}, 2026` },
    detail: { discussion: 'Discussion', addThought: 'Add a thought\u2026', kindBrief: 'Markdown ignored \u00b7 Be kind, be brief', post: 'Post', signInToComment: 'Sign in to leave a comment. Reading is free for everyone.', signInBtn: 'Sign in to comment', quietHere: 'Quiet here.', firstComment: 'Be the first to comment.', delete: 'delete', about: 'About' },
    submit: { eyebrowEdit: 'Edit champion', eyebrowNew: 'Submit your one-person company', titleEditA: 'Update', titleNewA: 'Tell us about', titleNewEm: 'your OPC.', oneStep: 'One step first', signInToSubmitA: 'Sign in to', signInToSubmitEm: 'submit.', signInToSubmitBody: 'Submitting an OPC is for accounts only \u2014 so you can edit, reply to comments, and prove ownership later.', helper: (n)=>['Submitting as ', n, '. Auto-published \u2014 no review queue. You can edit or delete anytime from Account.'], product: 'Product name', url: 'URL', category: 'Category', brandColor: 'Brand color', founderNote: 'Founder note', founderHint: '(e.g. \u201cSolo founder, ex-Stripe\u201d)', tagline: 'Tagline', taglineHint: '(one line)', taglinePh: 'What does it do?', aboutLabel: 'About', aboutHint: '(2\u20134 sentences)', aboutPh: 'Who\u2019s it for, why does it matter, what\u2019s the wedge.', footMeta: 'Posts immediately \u00b7 You can edit later', save: 'Save changes', publish: 'Publish \u2192', google: 'Continue with Google' },
    login: { eyebrow: 'Sign in to OPChampion', titleA: 'For the', titleEm: 'solo', titleB: 'who shipped.', body: 'No password. We use Google to sign you in once. Submit, edit, comment, upvote \u2014 everything tied to your account.', google: 'Continue with Google', orPick: 'Or pick a demo identity:', fine: 'By continuing you agree to our terms. Only your name and avatar are public.' },
    account: { joined: 'joined recently', tabsCh: (n)=>`My champions \u00b7 ${n}`, tabsVoted: (n)=>`Upvoted \u00b7 ${n}`, tabsCom: (n)=>`Comments \u00b7 ${n}`, tabsSet: 'Settings', emptyShipA: 'You haven\u2019t shipped yet.', emptyShipB: 'Submit your first OPC. It posts immediately \u2014 no review, no waitlist.', emptyShipBtn: 'Submit your champion \u2192', emptyVoteA: 'No upvotes yet.', emptyVoteB: 'Browse this week\u2019s issue and back the OPCs you\u2019d want to use.', emptyComA: 'Quiet so far.', emptyComB: 'Drop a thought on a champion you like.', signInPromptEy: 'Account', signInPromptA: 'Sign in to see', signInPromptEm: 'your work.', signInPromptB: 'Every OPC you submit, every champion you\u2019ve upvoted, every thought you\u2019ve left \u2014 all in one place once you sign in.', signInBtn: 'Sign in with Google \u2192', edit: 'Edit', delete: 'Delete', displayName: 'Display name', email: 'Email', bio: 'Bio', bioHint: '(optional)', bioPh: 'What you ship, in one line.', twitter: 'X / Twitter', site: 'Personal site', saveMeta: 'Changes save immediately on real backend', save: 'Save', dangerH: 'Delete account', dangerB: 'Removes your profile, your champions, your comments, and your upvotes. Cannot be undone.', dangerBtn: 'Delete my account', on: 'on' },
    foot: { tag: 'An editorial-first GTM partner for one-person companies.', op: 'OPChampion', gh: 'GrowthHunt', contact: 'Contact', thisWeek: 'This week', archive: 'Archive', submit: 'Submit', home: 'Home', modules: 'Modules', manifesto: 'Manifesto' },
    toast: { dup: 'Already upvoted from this device.', up: 'Upvoted \u2713', upAnon: 'Upvoted anonymously \u2713', published: 'Published \u2713', updated: 'Updated.', deleted: 'Deleted.', signedOut: 'Signed out.', welcome: (n)=>`Welcome, ${n}.` },
    pillSoon: 'Coming soon', pillFeat: 'Editor\u2019s pick', justNow: 'just now', mAgo:(n)=>`${n}m ago`, hAgo:(n)=>`${n}h ago`, dAgo:(n)=>`${n}d ago`,
    soloFounder: 'Solo founder',
  },
  zh: {
    nav: { home: '\u9996\u9875', thisWeek: '\u672c\u5468', archive: '\u5f80\u671f', signIn: '\u767b\u5f55', submit: '\u63d0\u4ea4 OPC \u2192', myChamps: '\u6211\u7684\u4ea7\u54c1', upvoted: '\u6211\u70b9\u8d5e\u7684', comments: '\u6211\u7684\u8bc4\u8bba', settings: '\u8bbe\u7f6e', signOut: '\u9000\u51fa\u767b\u5f55' },
    hero: { eyebrow: '\u7b2c 14 \u671f \u00b7 \u6bcf\u5468\u7cbe\u9009 \u00b7 \u4e3a\u72ec\u7acb\u521b\u59cb\u4eba', titleA: '\u4e00\u4e2a\u4eba\u7684', titleEm: '\u516c\u53f8\uff0c', titleB: '\u4e00\u5468\u4e00\u671f\u3002', subA: '\u662f GrowthHunt \u4e3a\u72ec\u7acb\u5f00\u53d1\u8005\u3001\u72ec\u7acb\u521b\u59cb\u4eba\u6253\u9020\u7684\u53d1\u5e03\u9635\u5730 \u2014 \u90a3\u4e9b\u72ec\u81ea\u51fa\u54c1\u3001\u8ba4\u771f\u5728\u505a\u4e1c\u897f\u7684\u4e2a\u4f53\u5f00\u53d1\u8005\u3002\u6bcf\u5468\u4e00 12 \u4e2a\u7cbe\u9009\u3002\u70b9\u8d5e\u3001\u8bc4\u8bba\u3001\u5173\u6ce8\u3002', meta: (n,v)=>`\u00b7 2026 \u5e74 4 \u6708 20 \u65e5\u90a3\u5468 \u00b7 ${n} \u4e2a\u4ea7\u54c1 \u00b7 \u4f60\u5df2\u70b9\u8d5e ${v}` },
    filter: { hot: '\u70ed\u95e8', new: '\u6700\u65b0', top: '\u6392\u884c\u699c', hotMeta: 'Hacker News \u7b97\u6cd5\uff1a(\u70b9\u8d5e\u6570 \u2212 1) / (\u5c0f\u65f6\u6570 + 2) ^ 1.6', newMeta: '\u6309\u53d1\u5e03\u65f6\u95f4\u5012\u5e8f', topMeta: '\u5168\u65f6\u6392\u884c\u699c' },
    sec: { editors: '\u672c\u5468\u7f16\u8f91\u63a8\u8350', standard: '\u5176\u4ed6\u4ea7\u54c1' },
    cta: { eyebrow: '\u4e3a\u4e00\u4eba\u516c\u53f8\u800c\u5efa', titleA: '\u4e00\u4e2a\u4eba', titleEm: '\u505a\u51fa\u6765\u7684\uff1f', titleB: '\u62ff\u51fa\u6765\u3002', body: '\u63d0\u4ea4\u5373\u53d1\u5e03\u3002\u65e0\u9700\u5ba1\u6838\u3002\u968f\u65f6\u53ef\u6539\u3002\u4f7f\u7528 Google \u4e00\u6b21\u767b\u5f55 \u2014 \u4f60\u7684\u90ae\u7bb1\u5c31\u662f\u4f60\u7684\u8eab\u4efd\u3002', signInSubmit: '\u767b\u5f55\u540e\u63d0\u4ea4 \u2192', submitBtn: '\u63d0\u4ea4\u4f60\u7684 OPC \u2192', mySubs: '\u6211\u7684\u63d0\u4ea4' },
    archive: { eyebrow: '\u5f80\u671f\u5b58\u6863', titleA: '\u8fc7\u5f80', titleEm: '\u671f\u53f7\u3002', body: '\u5168\u90e8\u66fe\u88ab\u63a8\u8350\u8fc7\u7684 OPC\u3002\u6700\u65b0\u671f\u5728\u524d\u3002', open: '\u67e5\u770b\u672c\u671f \u2192', weekOf: (m)=>`2026 \u5e74 4 \u6708 ${m} \u65e5\u90a3\u5468` },
    detail: { discussion: '\u8ba8\u8bba', addThought: '\u8bf4\u70b9\u4ec0\u4e48\u2026', kindBrief: '\u4e0d\u652f\u6301 Markdown \u00b7 \u53cb\u5584\u3001\u7b80\u6d01', post: '\u53d1\u5e03', signInToComment: '\u767b\u5f55\u540e\u53ef\u53d1\u8868\u8bc4\u8bba\u3002\u9605\u8bfb\u5bf9\u6240\u6709\u4eba\u514d\u8d39\u3002', signInBtn: '\u767b\u5f55\u540e\u8bc4\u8bba', quietHere: '\u8fd8\u662f\u9759\u9759\u7684\u3002', firstComment: '\u6210\u4e3a\u7b2c\u4e00\u4e2a\u8bc4\u8bba\u7684\u4eba\u3002', delete: '\u5220\u9664', about: '\u5173\u4e8e' },
    submit: { eyebrowEdit: '\u7f16\u8f91\u4ea7\u54c1', eyebrowNew: '\u63d0\u4ea4\u4f60\u7684\u4e00\u4eba\u516c\u53f8', titleEditA: '\u66f4\u65b0', titleNewA: '\u8bf4\u8bf4', titleNewEm: '\u4f60\u7684 OPC\u3002', oneStep: '\u5148\u8d70\u4e00\u6b65', signInToSubmitA: '\u767b\u5f55\u540e\u53ef', signInToSubmitEm: '\u63d0\u4ea4\u3002', signInToSubmitBody: '\u63d0\u4ea4\u4ea7\u54c1\u9700\u8981\u8d26\u53f7 \u2014 \u8fd9\u6837\u4f60\u4ee5\u540e\u624d\u80fd\u7f16\u8f91\u3001\u56de\u590d\u8bc4\u8bba\u3001\u8bc1\u660e\u5f52\u5c5e\u3002', helper: (n)=>['\u4ee5 ', n, ' \u8eab\u4efd\u63d0\u4ea4\u3002\u63d0\u4ea4\u540e\u7acb\u5373\u53d1\u5e03 \u2014 \u65e0\u9700\u5ba1\u6838\u3002\u968f\u65f6\u53ef\u5728\u8d26\u6237\u9875\u9762\u7f16\u8f91\u6216\u5220\u9664\u3002'], product: '\u4ea7\u54c1\u540d\u79f0', url: '\u7f51\u5740', category: '\u5206\u7c7b', brandColor: '\u54c1\u724c\u8272', founderNote: '\u521b\u59cb\u4eba\u8bf4\u660e', founderHint: '\uff08\u4f8b\uff1a\u201c\u72ec\u7acb\u521b\u59cb\u4eba\uff0cStripe \u524d\u5458\u5de5\u201d\uff09', tagline: '\u4e00\u53e5\u8bdd\u63cf\u8ff0', taglineHint: '\uff08\u4e00\u884c\uff09', taglinePh: '\u4f60\u7684\u4ea7\u54c1\u662f\u505a\u4ec0\u4e48\u7684\uff1f', aboutLabel: '\u8be6\u7ec6\u4ecb\u7ecd', aboutHint: '\uff082\u20134 \u53e5\u8bdd\uff09', aboutPh: '\u9762\u5411\u8c01\u3001\u4e3a\u4ec0\u4e48\u91cd\u8981\u3001\u4f60\u7684\u5207\u5165\u70b9\u662f\u4ec0\u4e48\u3002', footMeta: '\u63d0\u4ea4\u540e\u7acb\u5373\u53d1\u5e03 \u00b7 \u968f\u65f6\u53ef\u6539', save: '\u4fdd\u5b58', publish: '\u53d1\u5e03 \u2192', google: '\u4f7f\u7528 Google \u7ee7\u7eed' },
    login: { eyebrow: '\u767b\u5f55 OPChampion', titleA: '\u4e3a', titleEm: '\u72ec\u81ea', titleB: '\u53d1\u5e03\u8005\u800c\u5efa\u3002', body: '\u4e0d\u9700\u5bc6\u7801\u3002\u4f7f\u7528 Google \u4e00\u6b21\u767b\u5f55\u3002\u63d0\u4ea4\u3001\u7f16\u8f91\u3001\u8bc4\u8bba\u3001\u70b9\u8d5e \u2014 \u5168\u90e8\u4e0e\u4f60\u7684\u8d26\u53f7\u7ed1\u5b9a\u3002', google: '\u4f7f\u7528 Google \u7ee7\u7eed', orPick: '\u6216\u9009\u4e2a\u6f14\u793a\u8eab\u4efd\uff1a', fine: '\u7ee7\u7eed\u5373\u8868\u793a\u540c\u610f\u6211\u4eec\u7684\u6761\u6b3e\u3002\u4ec5\u59d3\u540d\u548c\u5934\u50cf\u5c06\u516c\u5f00\u3002' },
    account: { joined: '\u8fd1\u671f\u52a0\u5165', tabsCh: (n)=>`\u6211\u7684\u4ea7\u54c1 \u00b7 ${n}`, tabsVoted: (n)=>`\u6211\u70b9\u8d5e\u7684 \u00b7 ${n}`, tabsCom: (n)=>`\u6211\u7684\u8bc4\u8bba \u00b7 ${n}`, tabsSet: '\u8bbe\u7f6e', emptyShipA: '\u8fd8\u6ca1\u53d1\u5e03\u8fc7\u3002', emptyShipB: '\u63d0\u4ea4\u4f60\u7684\u7b2c\u4e00\u4e2a OPC\u3002\u63d0\u4ea4\u540e\u7acb\u5373\u4e0a\u7ebf \u2014 \u65e0\u5ba1\u6838\u3001\u65e0\u7b49\u5f85\u3002', emptyShipBtn: '\u63d0\u4ea4\u4ea7\u54c1 \u2192', emptyVoteA: '\u8fd8\u6ca1\u70b9\u8d5e\u8fc7\u3002', emptyVoteB: '\u770b\u770b\u672c\u5468\u7684\u671f\u53f7\uff0c\u652f\u6301\u4f60\u559c\u6b22\u7684\u4ea7\u54c1\u3002', emptyComA: '\u5b89\u5b89\u9759\u9759\u3002', emptyComB: '\u53bb\u4f60\u559c\u6b22\u7684\u4ea7\u54c1\u4e0b\u9762\u8bf4\u70b9\u4ec0\u4e48\u3002', signInPromptEy: '\u8d26\u6237', signInPromptA: '\u767b\u5f55\u540e\u67e5\u770b', signInPromptEm: '\u4f60\u7684\u8bb0\u5f55\u3002', signInPromptB: '\u63d0\u4ea4\u8fc7\u7684 OPC\u3001\u70b9\u8d5e\u8fc7\u7684\u4ea7\u54c1\u3001\u53d1\u8868\u8fc7\u7684\u8bc4\u8bba \u2014 \u767b\u5f55\u540e\u4e00\u8d77\u7ba1\u7406\u3002', signInBtn: '\u4f7f\u7528 Google \u767b\u5f55 \u2192', edit: '\u7f16\u8f91', delete: '\u5220\u9664', displayName: '\u663e\u793a\u540d', email: '\u90ae\u7bb1', bio: '\u4e2a\u4eba\u7b80\u4ecb', bioHint: '\uff08\u53ef\u9009\uff09', bioPh: '\u7528\u4e00\u53e5\u8bdd\u8bf4\u8bf4\u4f60\u5728\u505a\u4ec0\u4e48\u3002', twitter: 'X / \u63a8\u7279', site: '\u4e2a\u4eba\u7f51\u7ad9', saveMeta: '\u540e\u7aef\u4e0a\u7ebf\u540e\u4f1a\u5b9e\u65f6\u4fdd\u5b58', save: '\u4fdd\u5b58', dangerH: '\u5220\u9664\u8d26\u6237', dangerB: '\u5c06\u5220\u9664\u4f60\u7684\u4e2a\u4eba\u4fe1\u606f\u3001\u4ea7\u54c1\u3001\u8bc4\u8bba\u548c\u70b9\u8d5e\u3002\u4e0d\u53ef\u6062\u590d\u3002', dangerBtn: '\u5220\u9664\u6211\u7684\u8d26\u6237', on: '\u5728' },
    foot: { tag: '\u4e3a\u4e00\u4eba\u516c\u53f8\u63d0\u4f9b\u7f16\u8f91\u9a71\u52a8\u7684 GTM \u4f19\u4f34\u3002', op: 'OPChampion', gh: 'GrowthHunt', contact: '\u8054\u7cfb\u6211\u4eec', thisWeek: '\u672c\u5468', archive: '\u5f80\u671f', submit: '\u63d0\u4ea4', home: '\u9996\u9875', modules: '\u6a21\u5757', manifesto: '\u5ba3\u8a00' },
    toast: { dup: '\u5df2\u4ece\u672c\u8bbe\u5907\u70b9\u8d5e\u8fc7\u4e86\u3002', up: '\u70b9\u8d5e\u6210\u529f \u2713', upAnon: '\u533f\u540d\u70b9\u8d5e\u6210\u529f \u2713', published: '\u53d1\u5e03\u6210\u529f \u2713', updated: '\u5df2\u66f4\u65b0\u3002', deleted: '\u5df2\u5220\u9664\u3002', signedOut: '\u5df2\u9000\u51fa\u3002', welcome: (n)=>`\u6b22\u8fce\uff0c${n}\u3002` },
    pillSoon: '\u5373\u5c06\u4e0a\u7ebf', pillFeat: '\u7f16\u8f91\u63a8\u8350', justNow: '\u521a\u521a', mAgo:(n)=>`${n} \u5206\u949f\u524d`, hAgo:(n)=>`${n} \u5c0f\u65f6\u524d`, dAgo:(n)=>`${n} \u5929\u524d`,
    soloFounder: '\u72ec\u7acb\u521b\u59cb\u4eba',
  },
};

const LangContext = createContext({ lang: 'en', t: I18N.en, setLang: () => {} });
const useT = () => useContext(LangContext);

// ── Storage helpers (mock backend) ──
const STORE = {
  customs: () => { try { return JSON.parse(localStorage.getItem('opc-customs') || '[]'); } catch { return []; } },
  setCustoms: (v) => localStorage.setItem('opc-customs', JSON.stringify(v)),
  votes: () => { try { return JSON.parse(localStorage.getItem('opc-votes') || '{}'); } catch { return {}; } },
  setVotes: (v) => localStorage.setItem('opc-votes', JSON.stringify(v)),
  comments: () => { try { return JSON.parse(localStorage.getItem('opc-comments') || '{}'); } catch { return {}; } },
  setComments: (v) => localStorage.setItem('opc-comments', JSON.stringify(v)),
  user: () => { try { return JSON.parse(localStorage.getItem('opc-user') || 'null'); } catch { return null; } },
  setUser: (v) => v ? localStorage.setItem('opc-user', JSON.stringify(v)) : localStorage.removeItem('opc-user'),
};

// ── HN-style hot score (display only — server recomputes) ──
function hotScore(upvotes, ageHours) {
  return ((upvotes - 1) / Math.pow(ageHours + 2, 1.6)).toFixed(2);
}

// ── Per-champion SVG logos. Each is a tiny editorial mark, not a generic letter chip. ──
const LOGOS = {
  finchat: ({ hue }) => (
    <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#0e1f33"/>
      <path d="M12 32 L18 24 L24 28 L30 18 L36 22" stroke={hue} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="36" cy="22" r="2.5" fill={hue}/>
      <text x="24" y="44" textAnchor="middle" fontFamily="serif" fontStyle="italic" fontSize="7" fill="rgba(255,255,255,0.5)">$</text>
    </svg>
  ),
  mailtani: ({ hue }) => (
    <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill={hue}/>
      <rect x="10" y="14" width="28" height="20" rx="2" fill="#fff" opacity="0.95"/>
      <path d="M10 16 L24 26 L38 16" stroke={hue} strokeWidth="2" fill="none"/>
      <circle cx="38" cy="14" r="4" fill="#fde68a"/>
      <circle cx="38" cy="14" r="1.5" fill={hue}/>
    </svg>
  ),
  'image-v2': ({ hue }) => (
    <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="iv2g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffe4d4"/>
          <stop offset="1" stopColor={hue}/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="10" fill="url(#iv2g)"/>
      <path d="M24 12 a12 12 0 0 1 0 24 a12 12 0 0 1 0 -24 z" fill="none" stroke="#fff" strokeWidth="2.2"/>
      <path d="M24 16 a8 8 0 0 1 0 16 M24 16 a-8 8 0 0 0 0 16" fill="none" stroke="#fff" strokeWidth="1.6" opacity="0.7"/>
      <circle cx="24" cy="24" r="2.5" fill="#fff"/>
    </svg>
  ),
  constellation: ({ hue }) => (
    <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#0d0d12"/>
      <line x1="14" y1="14" x2="24" y2="22" stroke="#3a3a4a" strokeWidth="0.8"/>
      <line x1="24" y1="22" x2="34" y2="14" stroke="#3a3a4a" strokeWidth="0.8"/>
      <line x1="24" y1="22" x2="20" y2="34" stroke="#3a3a4a" strokeWidth="0.8"/>
      <line x1="24" y1="22" x2="36" y2="32" stroke="#3a3a4a" strokeWidth="0.8"/>
      <circle cx="14" cy="14" r="1.6" fill="#fff"/>
      <circle cx="34" cy="14" r="1.6" fill="#fff"/>
      <circle cx="24" cy="22" r="2.5" fill="#fff"/>
      <circle cx="20" cy="34" r="1.6" fill="#fff"/>
      <circle cx="36" cy="32" r="1.6" fill="#fff"/>
    </svg>
  ),
  sitecheck: ({ hue }) => (
    <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#fafaf7"/>
      <circle cx="22" cy="22" r="9" fill="none" stroke={hue} strokeWidth="2.5"/>
      <line x1="29" y1="29" x2="38" y2="38" stroke={hue} strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M18 22 l3 3 l6 -6" stroke={hue} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  moniduck: ({ hue }) => (
    <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#e6f0e1"/>
      <ellipse cx="20" cy="28" rx="11" ry="9" fill={hue}/>
      <ellipse cx="32" cy="20" rx="7" ry="6" fill={hue}/>
      <path d="M37 17 L43 14" stroke={hue} strokeWidth="3" strokeLinecap="round"/>
      <circle cx="32" cy="19" r="1.4" fill="#fff"/>
      <circle cx="32" cy="19" r="0.6" fill="#000"/>
    </svg>
  ),
  voicepad: ({ hue }) => (
    <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill={hue}/>
      <rect x="22" y="10" width="4" height="20" rx="2" fill="#fff"/>
      <path d="M14 24 a10 10 0 0 0 20 0" fill="none" stroke="#fff" strokeWidth="2"/>
      <line x1="24" y1="34" x2="24" y2="40" stroke="#fff" strokeWidth="2"/>
      <line x1="18" y1="40" x2="30" y2="40" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  cinder: ({ hue }) => (
    <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#1a1216"/>
      <rect x="8" y="10" width="9" height="28" fill={hue}/>
      <rect x="18" y="10" width="9" height="28" fill="#e8a76b"/>
      <rect x="28" y="10" width="9" height="28" fill="#3a6b5e"/>
    </svg>
  ),
  'lumen-rev': ({ hue }) => (
    <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#f3f8f7"/>
      <path d="M10 36 L18 28 L24 32 L34 18 L40 22" fill="none" stroke={hue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 36 L18 28 L24 32 L34 18 L40 22 L40 38 L10 38 Z" fill={hue} opacity="0.18"/>
      <circle cx="34" cy="18" r="2.5" fill={hue}/>
    </svg>
  ),
  briefly: ({ hue }) => (
    <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#f4f1fa"/>
      <path d="M14 14 L34 14 L34 28 L26 28 L20 34 L20 28 L14 28 Z" fill={hue}/>
      <circle cx="20" cy="21" r="1.5" fill="#fff"/>
      <circle cx="24" cy="21" r="1.5" fill="#fff"/>
      <circle cx="28" cy="21" r="1.5" fill="#fff"/>
    </svg>
  ),
  shipyard: ({ hue }) => (
    <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#e8f1f5"/>
      <path d="M24 10 L24 30" stroke={hue} strokeWidth="2"/>
      <path d="M14 30 L34 30 L30 38 L18 38 Z" fill={hue}/>
      <path d="M24 14 L32 22 L24 22 Z" fill={hue}/>
      <line x1="24" y1="30" x2="24" y2="40" stroke={hue} strokeWidth="2"/>
    </svg>
  ),
  pebble: ({ hue }) => (
    <svg viewBox="0 0 48 48" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#f5efe3"/>
      <ellipse cx="24" cy="26" rx="14" ry="10" fill={hue}/>
      <ellipse cx="20" cy="22" rx="3" ry="2" fill="#fff" opacity="0.45"/>
    </svg>
  ),
};

// ── DATA ──
const NOW = Date.now();
const HOUR = 60 * 60 * 1000;
const CHAMPIONS = [
  { id: 'finchat', name: 'FinChat', by: 'Marcus Lin', founderType: 'Solo founder, ex-Bridgewater', category: 'Fintech', tagline: 'AI co-pilot for equity research analysts.', upvotes: 247, comments: 38, featured: true, status: 'Live', hue: '#e84e1b', submittedAt: NOW - 18 * HOUR,
    about: "FinChat is the research assistant Marcus wished he'd had during three years on a hedge-fund desk. Upload a 10-K, ask in plain English, get answers cited to the page. Built and run by one person; in production at fourteen funds. The wedge: latency. While ChatGPT thinks for 20 seconds, FinChat returns a cited answer in under three." },
  { id: 'mailtani', name: 'Mailtani', by: 'Edmilson', founderType: 'Solo founder, indie hacker', category: 'SaaS · DevTools', tagline: 'Send marketing emails without the ESP markup.', upvotes: 189, comments: 24, featured: true, status: 'Live', hue: '#3b82c4', submittedAt: NOW - 32 * HOUR,
    about: "Mailtani is a self-hosted email sender for indie hackers who balk at Mailchimp's $1k/mo. Run it on a $5 VPS, plug in any SMTP provider, get the deliverability of a $400/mo SaaS. Built by one person who got quoted $480/mo for 12k subscribers and decided that math was insulting." },
  { id: 'image-v2', name: 'Image V2', by: 'Natalia Korsakova', founderType: 'Solo founder, ex-Adobe', category: 'Design & Art', tagline: 'AI image generator and editor for fast creative work.', upvotes: 312, comments: 47, featured: true, status: 'Live', hue: '#f59e0b', submittedAt: NOW - 64 * HOUR,
    about: 'Image V2 is an AI image generator and editor for teams that need faster creative production. Generate images from prompts, refine results with reference images, and compare models in one workspace. Built for ads, posters, ecommerce visuals — speed, iteration, control. One designer-engineer; sixteen months from prototype to revenue.' },
  { id: 'constellation', name: 'Constellation', by: 'Bobby Tan', founderType: 'Solo founder, ex-GitHub', category: 'AI & Machine Learning', tagline: 'Upgrade your AI from text search to code understanding.', upvotes: 156, comments: 19, featured: false, status: 'Live', hue: '#7a8aff', submittedAt: NOW - 8 * HOUR,
    about: 'Constellation gives your retrieval system a brain transplant. Most "code search" is just text search dressed up. Constellation parses ASTs, builds dependency graphs, and embeds at the symbol level — so when you ask "where do we handle expired tokens", you get the actual handler, not the README that mentions it.' },
  { id: 'sitecheck', name: 'sitecheck.dk', by: 'Bjarke Holm', founderType: 'Solo founder, freelance', category: 'SaaS · Tools', tagline: 'One tool for performance, SEO, accessibility, and security.', upvotes: 203, comments: 31, featured: false, status: 'Live', hue: '#8b7355', submittedAt: NOW - 96 * HOUR,
    about: 'sitecheck.dk is a Danish-built audit suite for small agencies. Run a single URL, get a 40-page report covering Lighthouse, Core Web Vitals, schema markup, broken links, accessibility (WCAG 2.2), and security headers. White-label the PDF, send to client. $39/mo replaces three SaaS for the 80% of audits that don\'t need enterprise depth.' },
  { id: 'moniduck', name: 'Moniduck', by: 'Jean-Baptiste Roux', founderType: 'Solo founder, ex-Datadog', category: 'SaaS · DevOps', tagline: 'Monitoring your modern tech stack.', upvotes: 178, comments: 22, featured: false, status: 'Live', hue: '#5b9b3a', submittedAt: NOW - 40 * HOUR,
    about: "Moniduck is a Datadog alternative that doesn't bankrupt you. Modern stacks emit 100k metrics/min — Datadog charges per metric. Moniduck does flat-rate, edge-aggregated, sane defaults. Built by one ex-Datadog SRE who got tired of the conversation." },
  { id: 'voicepad', name: 'Voicepad', by: 'Aiko Tanaka', founderType: 'Solo founder, ex-Notion', category: 'Productivity', tagline: 'Voice notes that turn into structured docs.', upvotes: 134, comments: 17, featured: false, status: 'Live', hue: '#c2410c', submittedAt: NOW - 26 * HOUR,
    about: "Voicepad records your meeting, extracts decisions and action items, and writes the doc in your team's template. The trick: it understands \"we should probably\" means \"decision: yes\" and \"let me think about it\" means \"owner: me, due: undefined.\"" },
  { id: 'cinder', name: 'Cinder', by: 'Olivia Reyes', founderType: 'Solo founder, designer', category: 'Design & Art', tagline: 'A swatch library for designers who care about color.', upvotes: 98, comments: 11, featured: false, status: 'Live', hue: '#a8323b', submittedAt: NOW - 12 * HOUR,
    about: 'Cinder is a curated palette library — 4,000+ palettes hand-tagged by mood, era, and material. Filter by "mid-century editorial" or "Wes Anderson autumn." One designer, weekend-built, full-time-loved.' },
  { id: 'lumen-rev', name: 'Lumen.rev', by: 'Tobias Vance', founderType: 'Solo founder, ex-Stripe', category: 'Fintech', tagline: 'Revenue forecasting for usage-based SaaS.', upvotes: 87, comments: 9, featured: false, status: 'Soon', hue: '#16746f', submittedAt: NOW - 4 * HOUR,
    about: "Lumen.rev is built for SaaS on usage-based pricing where MRR is fiction. Plug in billing data, get cohort-level forecasts with confidence bands, expansion paths, and churn early-warning. Traditional ARR tools assume seat-based contracts — Lumen models the actual stochastic process of pay-per-API-call businesses." },
  { id: 'briefly', name: 'Briefly', by: 'Hana Park', founderType: 'Solo founder, ex-Slack', category: 'Productivity', tagline: 'Async standups that nobody hates.', upvotes: 76, comments: 8, featured: false, status: 'Live', hue: '#6b4f9f', submittedAt: NOW - 50 * HOUR,
    about: 'Briefly replaces 15-minute Zoom standups with a 90-second voice note posted to Slack. Auto-transcribed, auto-summarized, threaded by topic. The team metric: 14% of engineering time clawed back, measured across 240 teams.' },
  { id: 'shipyard', name: 'Shipyard', by: 'Kenji Watanabe', founderType: 'Solo founder, ex-Heroku', category: 'SaaS · DevTools', tagline: 'Preview environments for non-Vercel stacks.', upvotes: 64, comments: 6, featured: false, status: 'Soon', hue: '#0f6e8a', submittedAt: NOW - 72 * HOUR,
    about: 'Shipyard gives you Vercel-style preview deployments for any stack — Rails, Django, Phoenix, Spring. Open a PR, get a live URL with a fresh database snapshot, throw it away on merge.' },
  { id: 'pebble', name: 'Pebble', by: 'Iris Chen', founderType: 'Solo founder, writer', category: 'Health & Wellness', tagline: 'A journaling app that asks better questions.', upvotes: 52, comments: 5, featured: false, status: 'Live', hue: '#7c5e3a', submittedAt: NOW - 120 * HOUR,
    about: 'Pebble is a daily journal with one twist: instead of a blank page, it asks one question — chosen by an LLM that has read your past entries and noticed what you avoid. After 90 days, it generates a year-in-review essay about you that, by user accounts, is sometimes upsetting in how accurate it is.' },
];

// ── Mock Google sign-in ──
const FAKE_USERS = [
  { id: 'u1', email: 'sasha@founder.dev', name: 'Sasha Williams', avatar: '#e84e1b', initials: 'SW' },
  { id: 'u2', email: 'jin@solo.work',     name: 'Jin Park',         avatar: '#3b82c4', initials: 'JP' },
  { id: 'u3', email: 'mara@indiehq.io',   name: 'Mara Devereaux',   avatar: '#5b9b3a', initials: 'MD' },
];

// ── Logo wrapper ──
function ChampionLogo({ champion, size = 48 }) {
  const Comp = LOGOS[champion.id];
  if (Comp) return <div className="logo-mark" style={{ width: size, height: size }}><Comp hue={champion.hue} /></div>;
  // fallback for user-submitted champions
  const initials = champion.name.split(/[\s.]+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="logo-mark logo-fallback" style={{ background: champion.hue, width: size, height: size, fontSize: size * 0.42 }}>
      {initials}
    </div>
  );
}

// ── Mock screenshots in detail modal (kept from V1) ──
function MockScreen1({ champion }) {
  const c = champion.hue;
  return (
    <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}>
      <rect width="600" height="400" fill="#fafaf7"/>
      <rect x="0" y="0" width="600" height="36" fill="#f3f1ec"/>
      <circle cx="18" cy="18" r="5" fill="#e84e1b" opacity="0.6"/><circle cx="36" cy="18" r="5" fill="#f59e0b" opacity="0.6"/><circle cx="54" cy="18" r="5" fill="#5b9b3a" opacity="0.6"/>
      <rect x="80" y="10" width="200" height="16" rx="3" fill="#fff" stroke="#e5e0d6"/>
      <text x="40" y="100" fontFamily="Times New Roman, serif" fontStyle="italic" fontSize="42" fill="#14110d">{champion.name}</text>
      <text x="40" y="130" fontFamily="monospace" fontSize="11" fill="#14110d" opacity="0.55" letterSpacing="3">— {champion.category.toUpperCase()}</text>
      <rect x="40" y="160" width="180" height="44" rx="22" fill={c}/>
      <text x="130" y="187" fontFamily="Inter" fontSize="14" fill="#fff" fontWeight="600" textAnchor="middle">Try it free</text>
      <rect x="320" y="80" width="240" height="280" rx="8" fill="#fff" stroke="#e5e0d6"/>
      <circle cx="380" cy="140" r="22" fill={c}/>
      <rect x="340" y="200" width="200" height="10" rx="2" fill="#14110d" opacity="0.85"/>
      <rect x="340" y="220" width="160" height="6" rx="2" fill="#14110d" opacity="0.4"/><rect x="340" y="234" width="180" height="6" rx="2" fill="#14110d" opacity="0.4"/><rect x="340" y="248" width="140" height="6" rx="2" fill="#14110d" opacity="0.4"/>
      <rect x="40" y="240" width="240" height="8" rx="2" fill="#14110d" opacity="0.3"/><rect x="40" y="258" width="200" height="8" rx="2" fill="#14110d" opacity="0.18"/><rect x="40" y="276" width="220" height="8" rx="2" fill="#14110d" opacity="0.18"/>
    </svg>
  );
}
function MockScreen2({ champion }) {
  const c = champion.hue;
  return (
    <svg viewBox="0 0 600 400" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%', display: 'block' }}>
      <rect width="600" height="400" fill="#fff"/>
      <rect x="0" y="0" width="160" height="400" fill="#fafaf7"/>
      <rect x="20" y="24" width="120" height="14" rx="3" fill="#14110d"/>
      <rect x="20" y="68" width="120" height="28" rx="6" fill={c} opacity="0.12"/>
      <rect x="32" y="78" width="80" height="8" rx="2" fill={c}/>
      <rect x="32" y="115" width="80" height="6" rx="2" fill="#14110d" opacity="0.4"/><rect x="32" y="145" width="70" height="6" rx="2" fill="#14110d" opacity="0.4"/><rect x="32" y="175" width="90" height="6" rx="2" fill="#14110d" opacity="0.4"/>
      <text x="190" y="60" fontFamily="monospace" fontSize="10" fill="#14110d" opacity="0.5" letterSpacing="2">DASHBOARD</text>
      <text x="190" y="100" fontFamily="Times New Roman, serif" fontSize="32" fill="#14110d">Today's metrics</text>
      <rect x="190" y="130" width="120" height="80" rx="6" fill="#fafaf7" stroke="#e5e0d6"/>
      <text x="200" y="160" fontFamily="Inter" fontSize="9" fill="#14110d" opacity="0.5" letterSpacing="1">UPVOTES</text>
      <text x="200" y="195" fontFamily="Times New Roman, serif" fontSize="28" fill={c}>{champion.upvotes}</text>
      <rect x="320" y="130" width="120" height="80" rx="6" fill="#fafaf7" stroke="#e5e0d6"/>
      <text x="330" y="160" fontFamily="Inter" fontSize="9" fill="#14110d" opacity="0.5" letterSpacing="1">COMMENTS</text>
      <text x="330" y="195" fontFamily="Times New Roman, serif" fontSize="28" fill="#14110d">{champion.comments}</text>
      <rect x="450" y="130" width="120" height="80" rx="6" fill={c} opacity="0.92"/>
      <text x="460" y="160" fontFamily="Inter" fontSize="9" fill="#fff" opacity="0.7" letterSpacing="1">RANK</text>
      <text x="460" y="195" fontFamily="Times New Roman, serif" fontSize="28" fill="#fff">#1</text>
      <rect x="190" y="230" width="380" height="140" rx="6" fill="#fafaf7" stroke="#e5e0d6"/>
      <polyline points="210,330 250,310 290,320 330,290 370,300 410,260 450,270 490,240 530,250" fill="none" stroke={c} strokeWidth="2.5"/>
    </svg>
  );
}

// ── Top nav ──
function LangToggle() {
  const { lang, setLang } = useT();
  return (
    <div className="lang-toggle" role="group" aria-label="Language">
      <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
      <span className="lang-sep">·</span>
      <button className={lang === 'zh' ? 'on' : ''} onClick={() => setLang('zh')}>中文</button>
    </div>
  );
}

function TopNav({ user, onLogin, onSignOut, onMe, onSubmit, route, setRoute }) {
  const [menu, setMenu] = useState(false);
  const { t } = useT();
  return (
    <nav className="top">
      <div className="shell row">
        <a onClick={() => setRoute('home')} className="brand" style={{ cursor: 'pointer' }}>
          <span className="mark"></span>GrowthHunt
        </a>
        <ul>
          <li><a href="GrowthHunt - V1 Editorial.html">{t.nav.home}</a></li>
          <li><a onClick={() => setRoute('home')} className={route === 'home' ? 'active' : ''} style={{ cursor: 'pointer' }}>{t.nav.thisWeek}</a></li>
          <li><a onClick={() => setRoute('archive')} className={route === 'archive' ? 'active' : ''} style={{ cursor: 'pointer' }}>{t.nav.archive}</a></li>
        </ul>
        <div className="nav-right">
          <LangToggle/>
          {user ? (
            <>
              <button className="cta" onClick={onSubmit}>{t.nav.submit}</button>
              <div className="user-pop">
                <button className="user-chip" onClick={() => setMenu(m => !m)}>
                  <span className="avatar" style={{ background: user.avatar }}>{user.initials}</span>
                  <span className="user-name">{user.name.split(' ')[0]}</span>
                  <svg width="10" height="10" viewBox="0 0 12 12"><path d="M3 5l3 3 3-3" stroke="currentColor" fill="none" strokeWidth="1.5"/></svg>
                </button>
                {menu && (
                  <div className="user-menu" onClick={() => setMenu(false)}>
                    <div className="menu-head">
                      <div className="user-name-full">{user.name}</div>
                      <div className="user-email mono">{user.email}</div>
                    </div>
                    <hr className="rule"/>
                    <a onClick={() => onMe('champions')}>{t.nav.myChamps}</a>
                    <a onClick={() => onMe('voted')}>{t.nav.upvoted}</a>
                    <a onClick={() => onMe('commented')}>{t.nav.comments}</a>
                    <a onClick={() => onMe('settings')}>{t.nav.settings}</a>
                    <hr className="rule"/>
                    <a onClick={onSignOut} className="signout">{t.nav.signOut}</a>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <button className="ghost-btn" onClick={onLogin}>{t.nav.signIn}</button>
              <button className="cta" onClick={onSubmit}>{t.nav.submit}</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── Champion row ──
function ChampionRow({ champion, voted, onVote, onOpen, rank }) {
  const { t, lang } = useT();
  const byWord = lang === 'zh' ? '作者' : 'by';
  return (
    <div className="champion-row" onClick={() => onOpen(champion)}>
      {rank && <div className="row-rank mono">{String(rank).padStart(2, '0')}</div>}
      <ChampionLogo champion={champion} />
      <div className="row-meta">
        <div className="row-head">
          <h3>{champion.name}</h3>
          {champion.status === 'Soon' && <span className="row-pill soon">{t.pillSoon}</span>}
          {champion.featured && <span className="row-pill featured">{t.pillFeat}</span>}
        </div>
        <div className="row-by">{byWord} {champion.by} · {champion.founderType ? <i style={{ color: 'var(--ink-faint)' }}>{champion.founderType}</i> : champion.category}</div>
        <div className="row-tagline">{champion.tagline}</div>
      </div>
      <div className="row-actions" onClick={(e) => e.stopPropagation()}>
        <button className={`vote-btn ${voted ? 'voted' : ''}`} onClick={() => onVote(champion.id)} disabled={voted} title={voted ? 'Already upvoted' : 'Upvote'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 14l5-5 5 5"/></svg>
          <span>{champion.upvotes + (voted ? 1 : 0)}</span>
        </button>
        <button className="comment-btn" onClick={() => onOpen(champion)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
          <span>{champion.comments}</span>
        </button>
        <button className="visit-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── Login modal — mock Google ──
function LoginModal({ onClose, onLogin }) {
  const { t } = useT();
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="champion-modal small" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
        <div className="login-card">
          <div className="eyebrow"><span className="dot"></span>{t.login.eyebrow}</div>
          <h2 className="serif modal-h2">{t.login.titleA} <em>{t.login.titleEm}</em> {t.login.titleB}</h2>
          <p className="submit-helper">{t.login.body}</p>
          <button className="google-btn" onClick={() => onLogin(FAKE_USERS[0])}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M5.3 14.7l6.6 4.8C13.7 15.1 18.5 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 5.1 29.3 3 24 3 16 3 9.1 7.7 5.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3c-2 1.5-4.5 2.5-7.3 2.5-5.2 0-9.7-3.3-11.3-8l-6.5 5C9 41.2 16 45 24 45z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.4 35.8 45 30.4 45 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
            {t.login.google}
          </button>
          <div className="login-alt">
            <span className="mono small dim">{t.login.orPick}</span>
            <div className="demo-users">
              {FAKE_USERS.map(u => (
                <button key={u.id} onClick={() => onLogin(u)}>
                  <span className="avatar small" style={{ background: u.avatar }}>{u.initials}</span>
                  {u.name}
                </button>
              ))}
            </div>
          </div>
          <p className="login-fine mono">{t.login.fine}</p>
        </div>
      </div>
    </div>
  );
}

// ── Submit modal ──
function SubmitModal({ onClose, onSubmit, editing, user, onLogin }) {
  const { t } = useT();
  if (!user) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="champion-modal small" onClick={(e) => e.stopPropagation()}>
          <button className="close" onClick={onClose}>×</button>
          <div className="login-card">
            <div className="eyebrow"><span className="dot"></span>{t.submit.oneStep}</div>
            <h2 className="serif modal-h2">{t.submit.signInToSubmitA} <em>{t.submit.signInToSubmitEm}</em></h2>
            <p className="submit-helper">{t.submit.signInToSubmitBody}</p>
            <button className="google-btn" onClick={onLogin}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M5.3 14.7l6.6 4.8C13.7 15.1 18.5 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 5.1 29.3 3 24 3 16 3 9.1 7.7 5.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3c-2 1.5-4.5 2.5-7.3 2.5-5.2 0-9.7-3.3-11.3-8l-6.5 5C9 41.2 16 45 24 45z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.4 35.8 45 30.4 45 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
              {t.submit.google}
            </button>
          </div>
        </div>
      </div>
    );
  }
  const [form, setForm] = useState(editing || { name: '', url: '', category: 'SaaS · Tools', tagline: '', about: '', hue: '#e84e1b', founderType: t.soloFounder });
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const submit = (e) => { e.preventDefault(); if (form.name && form.tagline) onSubmit(form); };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="champion-modal submit-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
        <div className="eyebrow"><span className="dot"></span>{editing ? t.submit.eyebrowEdit : t.submit.eyebrowNew}</div>
        <h2 className="serif modal-h2">{editing ? <>{t.submit.titleEditA} <em>{editing.name}.</em></> : <>{t.submit.titleNewA} <em>{t.submit.titleNewEm}</em></>}</h2>
        <p className="submit-helper">{t.submit.helper(user.name)[0]}<b>{t.submit.helper(user.name)[1]}</b>{t.submit.helper(user.name)[2]}</p>
        <form className="submit-form" onSubmit={submit}>
          <div className="form-row two">
            <label><span className="label-key">{t.submit.product}</span><input required value={form.name} onChange={e => update('name', e.target.value)} placeholder={t.submit.taglinePh}/></label>
            <label><span className="label-key">{t.submit.url}</span><input type="url" value={form.url} onChange={e => update('url', e.target.value)} placeholder="https://..."/></label>
          </div>
          <div className="form-row two">
            <label><span className="label-key">{t.submit.category}</span>
              <select value={form.category} onChange={e => update('category', e.target.value)}>
                <option>SaaS · Tools</option><option>SaaS · DevTools</option><option>SaaS · DevOps</option><option>AI & Machine Learning</option><option>Design & Art</option><option>Fintech</option><option>Productivity</option><option>Health & Wellness</option><option>Other</option>
              </select>
            </label>
            <label><span className="label-key">{t.submit.brandColor}</span><input type="color" value={form.hue} onChange={e => update('hue', e.target.value)}/></label>
          </div>
          <div className="form-row"><label><span className="label-key">{t.submit.founderNote} <em>{t.submit.founderHint}</em></span><input value={form.founderType} onChange={e => update('founderType', e.target.value)}/></label></div>
          <div className="form-row"><label><span className="label-key">{t.submit.tagline} <em>{t.submit.taglineHint}</em></span><input required maxLength="100" value={form.tagline} onChange={e => update('tagline', e.target.value)} placeholder={t.submit.taglinePh}/></label></div>
          <div className="form-row"><label><span className="label-key">{t.submit.aboutLabel} <em>{t.submit.aboutHint}</em></span><textarea rows="4" value={form.about} onChange={e => update('about', e.target.value)} placeholder={t.submit.aboutPh}></textarea></label></div>
          <div className="submit-footer">
            <span className="mono small dim">{t.submit.footMeta}</span>
            <button type="submit" className="primary-btn">{editing ? t.submit.save : t.submit.publish}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Comments (HN-flat) ──
function CommentSection({ champion, comments, user, onPost, onLogin, onDelete }) {
  const { t } = useT();
  const [body, setBody] = useState('');
  const list = comments[champion.id] || [];
  const submit = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    onPost(champion.id, body.trim());
    setBody('');
  };
  return (
    <div className="comments-block">
      <h4>{t.detail.discussion} <span className="dim">· {list.length}</span></h4>
      {user ? (
        <form className="comment-form" onSubmit={submit}>
          <span className="avatar small" style={{ background: user.avatar, flexShrink: 0 }}>{user.initials}</span>
          <div className="comment-input-wrap">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t.detail.addThought} rows="2"/>
            <div className="comment-actions">
              <span className="mono small dim">{t.detail.kindBrief}</span>
              <button type="submit" disabled={!body.trim()}>{t.detail.post}</button>
            </div>
          </div>
        </form>
      ) : (
        <div className="comment-locked">
          <p>{t.detail.signInToComment}</p>
          <button className="ghost-btn" onClick={onLogin}>{t.detail.signInBtn}</button>
        </div>
      )}
      {list.length === 0 ? (
        <div className="empty-state small">
          <p className="serif" style={{ fontSize: 24, fontStyle: 'italic', margin: 0 }}>{t.detail.quietHere}</p>
          <p className="mono small dim" style={{ marginTop: 6 }}>{t.detail.firstComment}</p>
        </div>
      ) : (
        <ul className="comment-list">
          {list.map(c => (
            <li key={c.id} className="comment-item">
              <span className="avatar small" style={{ background: c.author.avatar, flexShrink: 0 }}>{c.author.initials}</span>
              <div className="comment-body-wrap">
                <div className="comment-meta">
                  <b>{c.author.name}</b>
                  <span className="mono dim">{relTime(c.createdAt)}</span>
                  {user && c.author.id === user.id && (
                    <a className="comment-del" onClick={() => onDelete(champion.id, c.id)}>{t.detail.delete}</a>
                  )}
                </div>
                <p className="comment-body">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function relTime(ts, t) {
  const dict = t || I18N.en;
  const sec = (Date.now() - ts) / 1000;
  if (sec < 60) return dict.justNow;
  if (sec < 3600) return dict.mAgo(Math.floor(sec / 60));
  if (sec < 86400) return dict.hAgo(Math.floor(sec / 3600));
  return dict.dAgo(Math.floor(sec / 86400));
}

// ── Detail modal ──
function DetailModal({ champion, onClose, voted, onVote, comments, user, onPost, onLogin, onDelete }) {
  const { t, lang } = useT();
  const byWord = lang === 'zh' ? '作者' : 'by';
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="champion-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
        <div className="champion-row detail">
          <ChampionLogo champion={champion} size={64}/>
          <div className="row-meta">
            <h3>{champion.name}</h3>
            <div className="row-by">{byWord} {champion.by} · <i style={{ color: 'var(--ink-faint)' }}>{champion.founderType || champion.category}</i></div>
            <div className="row-tagline">{champion.tagline}</div>
          </div>
          <div className="row-actions">
            <button className={`vote-btn ${voted ? 'voted' : ''}`} onClick={() => onVote(champion.id)} disabled={voted}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 14l5-5 5 5"/></svg>
              <span>{champion.upvotes + (voted ? 1 : 0)}</span>
            </button>
            <button className="visit-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></button>
          </div>
        </div>
        <div className="screenshot-grid">
          <div className="screenshot-frame"><MockScreen1 champion={champion}/></div>
          <div className="screenshot-frame"><MockScreen2 champion={champion}/></div>
        </div>
        <div className="about-block">
          <h4>{t.detail.about}</h4>
          <p>{champion.about}</p>
        </div>
        <CommentSection champion={champion} comments={comments} user={user} onPost={onPost} onLogin={onLogin} onDelete={onDelete}/>
      </div>
    </div>
  );
}

// ── Account / Me page ──
function AccountPage({ user, tab, setTab, customs, voted, comments, onEdit, onDelete, onOpen, onLogin, onSubmit }) {
  const { t } = useT();
  if (!user) {
    return (
      <section className="opc-section">
        <div className="shell">
          <div className="empty-state">
            <div className="eyebrow"><span className="dot"></span>{t.account.signInPromptEy}</div>
            <h2 className="serif">{t.account.signInPromptA} <em>{t.account.signInPromptEm}</em></h2>
            <p>{t.account.signInPromptB}</p>
            <button className="primary-btn" onClick={onLogin}>{t.account.signInBtn}</button>
          </div>
        </div>
      </section>
    );
  }
  const mine = customs.filter(c => c.ownerId === user.id);
  const myVotes = Object.keys(voted);
  const myVotedChamps = [...CHAMPIONS, ...customs].filter(c => myVotes.includes(c.id));
  const myComments = [];
  Object.entries(comments).forEach(([cid, list]) => list.forEach(cm => { if (cm.author.id === user.id) myComments.push({ ...cm, championId: cid }); }));
  const champById = {};
  [...CHAMPIONS, ...customs].forEach(c => champById[c.id] = c);

  return (
    <section className="opc-section account-page">
      <div className="shell">
        <header className="account-head">
          <div className="account-avatar" style={{ background: user.avatar }}>{user.initials}</div>
          <div>
            <h1 className="serif" style={{ margin: 0, fontSize: 56, lineHeight: 1, letterSpacing: '-0.025em' }}>{user.name}</h1>
            <div className="mono small dim" style={{ marginTop: 8 }}>{user.email} · {t.account.joined}</div>
          </div>
        </header>
        <div className="account-tabs">
          {[
            ['champions', t.account.tabsCh(mine.length)],
            ['voted', t.account.tabsVoted(myVotedChamps.length)],
            ['commented', t.account.tabsCom(myComments.length)],
            ['settings', t.account.tabsSet],
          ].map(([k, label]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        {tab === 'champions' && (
          mine.length === 0 ? (
            <div className="empty-state inset">
              <p className="serif" style={{ fontStyle: 'italic', fontSize: 36, margin: 0 }}>{t.account.emptyShipA}</p>
              <p style={{ color: 'var(--ink-dim)', maxWidth: 440 }}>{t.account.emptyShipB}</p>
              <button className="primary-btn" onClick={onSubmit}>{t.account.emptyShipBtn}</button>
            </div>
          ) : (
            <div className="champion-list">{mine.map(c => (
              <div key={c.id} className="champion-row" onClick={() => onOpen(c)}>
                <ChampionLogo champion={c}/>
                <div className="row-meta">
                  <h3>{c.name}</h3>
                  <div className="row-by">{c.category} · {relTime(c.submittedAt || Date.now(), t)}</div>
                  <div className="row-tagline">{c.tagline}</div>
                </div>
                <div className="row-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="comment-btn" onClick={() => onEdit(c)}>{t.account.edit}</button>
                  <button className="comment-btn" onClick={() => { if (confirm('Delete?')) onDelete(c.id); }} style={{ color: '#a8323b' }}>{t.account.delete}</button>
                </div>
              </div>
            ))}</div>
          )
        )}

        {tab === 'voted' && (
          myVotedChamps.length === 0 ? (
            <div className="empty-state inset">
              <p className="serif" style={{ fontStyle: 'italic', fontSize: 36, margin: 0 }}>{t.account.emptyVoteA}</p>
              <p style={{ color: 'var(--ink-dim)' }}>{t.account.emptyVoteB}</p>
            </div>
          ) : (
            <div className="champion-list">{myVotedChamps.map(c => (
              <ChampionRow key={c.id} champion={c} voted={true} onVote={()=>{}} onOpen={onOpen}/>
            ))}</div>
          )
        )}

        {tab === 'commented' && (
          myComments.length === 0 ? (
            <div className="empty-state inset">
              <p className="serif" style={{ fontStyle: 'italic', fontSize: 36, margin: 0 }}>{t.account.emptyComA}</p>
              <p style={{ color: 'var(--ink-dim)' }}>{t.account.emptyComB}</p>
            </div>
          ) : (
            <ul className="my-comments-list">{myComments.map(cm => (
              <li key={cm.id} onClick={() => champById[cm.championId] && onOpen(champById[cm.championId])}>
                <div className="mc-on">{t.account.on} <b>{champById[cm.championId]?.name || '—'}</b> · <span className="mono dim">{relTime(cm.createdAt, t)}</span></div>
                <p>{cm.body}</p>
              </li>
            ))}</ul>
          )
        )}

        {tab === 'settings' && (
          <div className="settings-block">
            <div className="form-row two">
              <label><span className="label-key">{t.account.displayName}</span><input defaultValue={user.name}/></label>
              <label><span className="label-key">{t.account.email}</span><input value={user.email} disabled/></label>
            </div>
            <div className="form-row"><label><span className="label-key">{t.account.bio} <em>{t.account.bioHint}</em></span><textarea rows="3" placeholder={t.account.bioPh}></textarea></label></div>
            <div className="form-row two">
              <label><span className="label-key">{t.account.twitter}</span><input placeholder="@handle"/></label>
              <label><span className="label-key">{t.account.site}</span><input placeholder="https://..."/></label>
            </div>
            <div className="submit-footer">
              <span className="mono small dim">{t.account.saveMeta}</span>
              <button className="primary-btn">{t.account.save}</button>
            </div>
            <hr className="rule" style={{ margin: '32px 0 24px' }}/>
            <div className="danger-zone">
              <h4>{t.account.dangerH}</h4>
              <p>{t.account.dangerB}</p>
              <button className="danger-btn">{t.account.dangerBtn}</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Toast ──
function Toast({ msg }) { return msg ? <div className="toast">{msg}</div> : null; }

// ── Main App ──
function App() {
  const [user, setUser] = useState(() => STORE.user());
  const [voted, setVoted] = useState(() => STORE.votes());
  const [customs, setCustoms] = useState(() => STORE.customs());
  const [comments, setComments] = useState(() => STORE.comments());
  const [route, setRoute] = useState('home'); // home | archive | account
  const [meTab, setMeTab] = useState('champions');
  const [filter, setFilter] = useState('hot');
  const [active, setActive] = useState(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState('');
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('opc-lang') || (navigator.language && navigator.language.startsWith('zh') ? 'zh' : 'en'); } catch (_) { return 'en'; }
  });
  useEffect(() => { try { localStorage.setItem('opc-lang', lang); } catch (_) {} document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'; }, [lang]);
  const t = I18N[lang];

  useEffect(() => { STORE.setUser(user); }, [user]);
  useEffect(() => { STORE.setVotes(voted); }, [voted]);
  useEffect(() => { STORE.setCustoms(customs); }, [customs]);
  useEffect(() => { STORE.setComments(comments); }, [comments]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400); return () => clearTimeout(t);
  }, [toast]);

  const onVote = (id) => {
    if (voted[id]) { setToast(t.toast.dup); return; }
    setVoted(v => ({ ...v, [id]: { ts: Date.now(), userId: user?.id || null } }));
    setToast(user ? t.toast.up : t.toast.upAnon);
  };
  const onSubmitChampion = (form) => {
    if (editing) {
      setCustoms(cs => cs.map(c => c.id === editing.id ? { ...c, ...form } : c));
      setToast(t.toast.updated);
    } else {
      const id = 'usr-' + Date.now().toString(36);
      setCustoms(cs => [...cs, { ...form, id, upvotes: 1, comments: 0, status: 'Live', featured: false, submittedAt: Date.now(), ownerId: user.id, by: user.name }]);
      setToast(t.toast.published);
    }
    setSubmitOpen(false); setEditing(null);
  };
  const onDeleteChampion = (id) => { setCustoms(cs => cs.filter(c => c.id !== id)); setToast(t.toast.deleted); };
  const onPostComment = (championId, body) => {
    if (!user) return;
    setComments(c => ({ ...c, [championId]: [...(c[championId] || []), { id: 'cm-' + Date.now().toString(36), body, author: user, createdAt: Date.now() }] }));
  };
  const onDeleteComment = (championId, commentId) => {
    setComments(c => ({ ...c, [championId]: (c[championId] || []).filter(cm => cm.id !== commentId) }));
  };

  // sort
  const allChampions = useMemo(() => {
    const list = [...CHAMPIONS, ...customs];
    if (filter === 'hot') {
      return [...list].sort((a, b) => {
        const ageA = (Date.now() - (a.submittedAt || 0)) / HOUR;
        const ageB = (Date.now() - (b.submittedAt || 0)) / HOUR;
        return parseFloat(hotScore(b.upvotes, ageB)) - parseFloat(hotScore(a.upvotes, ageA));
      });
    }
    if (filter === 'new') return [...list].sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
    if (filter === 'top') return [...list].sort((a, b) => b.upvotes - a.upvotes);
    return list;
  }, [filter, customs]);

  const featured = allChampions.filter(c => c.featured);
  const standard = allChampions.filter(c => !c.featured);

  // ── pages ──
  const showHome = route === 'home';
  const showArchive = route === 'archive';
  const showAccount = route === 'account';

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
    <div data-screen-label="OPChampion" lang={lang === 'zh' ? 'zh-CN' : 'en'}>
      <TopNav
        user={user} route={route} setRoute={setRoute}
        onLogin={() => setLoginOpen(true)}
        onSignOut={() => { setUser(null); setRoute('home'); setToast(t.toast.signedOut); }}
        onMe={(tab) => { setMeTab(tab); setRoute('account'); }}
        onSubmit={() => { setEditing(null); setSubmitOpen(true); }}
      />

      {showHome && <>
        <header className="opc-header">
          <div className="shell">
            <div className="eyebrow"><span className="dot"></span>{t.hero.eyebrow}</div>
            <h1 className="serif">
              {t.hero.titleA} <em>{t.hero.titleEm}</em><br/>
              {t.hero.titleB}
            </h1>
            <p className="opc-sub">
              <b>OPChampion</b> {t.hero.subA}
              <br/>
              <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: 11.5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {t.hero.meta(allChampions.length, Object.keys(voted).length)}
              </span>
            </p>
          </div>
        </header>
        <hr className="rule"/>
        <section className="opc-section">
          <div className="shell">
            <div className="filter-bar">
              <div className="filter-tabs">
                <button className={filter === 'hot' ? 'on' : ''} onClick={() => setFilter('hot')}>{t.filter.hot} <span className="count mono">HN</span></button>
                <button className={filter === 'new' ? 'on' : ''} onClick={() => setFilter('new')}>{t.filter.new}</button>
                <button className={filter === 'top' ? 'on' : ''} onClick={() => setFilter('top')}>{t.filter.top}</button>
              </div>
              <div className="filter-meta">
                <span className="mono small dim">
                  {filter === 'hot' && t.filter.hotMeta}
                  {filter === 'new' && t.filter.newMeta}
                  {filter === 'top' && t.filter.topMeta}
                </span>
              </div>
            </div>
          </div>
        </section>

        {featured.length > 0 && (
          <section className="opc-section">
            <div className="shell">
              <div className="section-label"><span className="crown">♛</span> {t.sec.editors}</div>
              <div className="champion-list">
                {featured.map((c, i) => (
                  <ChampionRow key={c.id} rank={i+1} champion={c} voted={!!voted[c.id]} onVote={onVote} onOpen={setActive}/>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="opc-section">
          <div className="shell">
            <div className="section-label dim">{t.sec.standard}</div>
            <div className="champion-list">
              {standard.map((c, i) => (
                <ChampionRow key={c.id} rank={featured.length + i + 1} champion={c} voted={!!voted[c.id]} onVote={onVote} onOpen={setActive}/>
              ))}
            </div>
          </div>
        </section>

        <section className="opc-section opc-cta-section">
          <div className="shell">
            <div className="big-cta">
              <div className="eyebrow"><span className="dot"></span>{t.cta.eyebrow}</div>
              <h2 className="serif">{t.cta.titleA} <em>{t.cta.titleEm}</em><br/>{t.cta.titleB}</h2>
              <p>{t.cta.body}</p>
              <button onClick={() => { if (user) { setEditing(null); setSubmitOpen(true); } else { setLoginOpen(true); } }} className="big-cta-btn">{user ? t.cta.submitBtn : t.cta.signInSubmit}</button>
              {user && <button onClick={() => { setMeTab('champions'); setRoute('account'); }} className="big-cta-btn ghost">{t.cta.mySubs}</button>}
            </div>
          </div>
        </section>
      </>}

      {showArchive && (
        <section className="opc-section" style={{ paddingTop: 80 }}>
          <div className="shell">
            <div className="eyebrow"><span className="dot"></span>{t.archive.eyebrow}</div>
            <h1 className="serif" style={{ fontSize: 80, letterSpacing: '-0.03em', lineHeight: 1, margin: '14px 0 24px' }}>{t.archive.titleA} <em>{t.archive.titleEm}</em></h1>
            <p className="opc-sub" style={{ marginBottom: 40 }}>{t.archive.body}</p>
            <div className="archive-grid">
              {[14, 13, 12, 11, 10, 9, 8, 7].map(n => (
                <div key={n} className="archive-card">
                  <div className="archive-num mono">No. {String(n).padStart(2, '0')}</div>
                  <div className="archive-week mono small dim">{t.archive.weekOf(20 - (14-n)*7)}</div>
                  <div className="archive-list">
                    {CHAMPIONS.slice((n%4)*3, (n%4)*3 + 3).map(c => (
                      <div key={c.id} className="archive-mini">
                        <ChampionLogo champion={c} size={28}/>
                        <span>{c.name}</span>
                      </div>
                    ))}
                  </div>
                  <a className="archive-link mono">{t.archive.open}</a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {showAccount && (
        <AccountPage
          user={user} tab={meTab} setTab={setMeTab}
          customs={customs} voted={voted} comments={comments}
          onEdit={(c) => { setEditing(c); setSubmitOpen(true); }}
          onDelete={onDeleteChampion}
          onOpen={setActive}
          onLogin={() => setLoginOpen(true)}
          onSubmit={() => { setEditing(null); setSubmitOpen(true); }}
        />
      )}

      <footer className="opc-footer">
        <div className="shell footer-grid">
          <div>
            <div className="brand serif"><span className="mark"></span>GrowthHunt</div>
            <p className="footer-sub">{t.foot.tag}</p>
          </div>
          <div>
            <h5>{t.foot.op}</h5>
            <ul>
              <li><a onClick={() => setRoute('home')} style={{ cursor:'pointer' }}>{t.foot.thisWeek}</a></li>
              <li><a onClick={() => setRoute('archive')} style={{ cursor:'pointer' }}>{t.foot.archive}</a></li>
              <li><a onClick={() => { if (user) { setEditing(null); setSubmitOpen(true); } else { setLoginOpen(true); } }} style={{ cursor:'pointer' }}>{t.foot.submit}</a></li>
            </ul>
          </div>
          <div>
            <h5>{t.foot.gh}</h5>
            <ul>
              <li><a href="GrowthHunt - V1 Editorial.html">{t.foot.home}</a></li>
              <li><a>{t.foot.modules}</a></li>
              <li><a>{t.foot.manifesto}</a></li>
            </ul>
          </div>
          <div>
            <h5>{t.foot.contact}</h5>
            <ul>
              <li><a>hi@growthhunt.ai</a></li>
              <li><a>X / Twitter</a></li>
            </ul>
          </div>
        </div>
        <div className="shell">
          <div className="copyright">
            <span>© 2026 GrowthHunt</span>
            <span>growthhunt.ai/OPChampion</span>
          </div>
        </div>
      </footer>

      {active && (
        <DetailModal
          champion={active} voted={!!voted[active.id]} onVote={onVote}
          comments={comments} user={user}
          onPost={onPostComment} onDelete={onDeleteComment}
          onLogin={() => setLoginOpen(true)}
          onClose={() => setActive(null)}
        />
      )}
      {submitOpen && (
        <SubmitModal
          editing={editing} user={user}
          onClose={() => { setSubmitOpen(false); setEditing(null); }}
          onSubmit={onSubmitChampion}
          onLogin={() => { setSubmitOpen(false); setLoginOpen(true); }}
        />
      )}
      {loginOpen && (
        <LoginModal
          onClose={() => setLoginOpen(false)}
          onLogin={(u) => { setUser(u); setLoginOpen(false); setToast(t.toast.welcome(u.name.split(' ')[0])); }}
        />
      )}
      <Toast msg={toast}/>
    </div>
    </LangContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
