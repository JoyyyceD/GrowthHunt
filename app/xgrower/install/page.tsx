import type React from 'react'
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { TopNav } from '@/lib/site/TopNav'

export const metadata: Metadata = {
  title: 'Install Xgrower — 60-second Chrome sideload',
  description:
    'Sideload Xgrower into Chrome while we wait on Chrome Web Store review. Download the .zip, flip Developer mode, Load unpacked. Takes about a minute.',
  alternates: { canonical: 'https://growthhunt.ai/xgrower/install' },
  openGraph: {
    type: 'website',
    url: 'https://growthhunt.ai/xgrower/install',
    title: 'Install Xgrower — 60-second Chrome sideload',
    description:
      'Sideload Xgrower into Chrome while we wait on Chrome Web Store review. Five steps, about a minute.',
  },
  twitter: {
    card: 'summary',
    title: 'Install Xgrower — 60-second Chrome sideload',
    description:
      'Sideload Xgrower into Chrome while we wait on Chrome Web Store review. Five steps, about a minute.',
  },
}

const STEPS: {
  num: string
  title: string
  body: React.ReactNode
  placeholder: string
  src?: string
  srcW?: number
  srcH?: number
}[] = [
  {
    num: '01',
    title: "Open Chrome's extension page",
    body: (
      <>
        Paste{' '}
        <code
          style={{
            fontFamily: 'var(--mono)',
            background: 'var(--bg-elev)',
            padding: '2px 8px',
            borderRadius: 6,
            border: '1px solid var(--rule)',
            fontSize: '0.9em',
          }}
        >
          chrome://extensions/
        </code>{' '}
        in the address bar. Chrome won&apos;t let you click a link to it, so paste is the only way.
      </>
    ),
    placeholder: 'chrome://extensions page',
    src: '/xgrower/install/step-01-chrome-extensions.png',
    srcW: 931,
    srcH: 661,
  },
  {
    num: '02',
    title: 'Turn on Developer mode',
    body: <>Top-right toggle. You&apos;ll see new buttons appear in the toolbar above the list.</>,
    placeholder: 'Developer mode toggle on',
    src: '/xgrower/install/step-02-developer-mode.png',
    srcW: 935,
    srcH: 617,
  },
  {
    num: '03',
    title: 'Unzip the file you downloaded',
    body: (
      <>
        Double-click{' '}
        <code
          style={{
            fontFamily: 'var(--mono)',
            background: 'var(--bg-elev)',
            padding: '2px 8px',
            borderRadius: 6,
            border: '1px solid var(--rule)',
            fontSize: '0.9em',
          }}
        >
          xgrower-extension.zip
        </code>
        . You&apos;ll get an{' '}
        <code
          style={{
            fontFamily: 'var(--mono)',
            background: 'var(--bg-elev)',
            padding: '2px 8px',
            borderRadius: 6,
            border: '1px solid var(--rule)',
            fontSize: '0.9em',
          }}
        >
          xgrower-extension
        </code>{' '}
        folder next to it.
      </>
    ),
    placeholder: 'unzipped folder',
  },
  {
    num: '04',
    title: 'Click "Load unpacked" → select the folder',
    body: <>Pick the unzipped folder (not the .zip). Chrome installs Xgrower into your browser.</>,
    placeholder: 'Load unpacked dialog',
    src: '/xgrower/install/step-04-load-unpacked.png',
    srcW: 930,
    srcH: 658,
  },
  {
    num: '05',
    title: 'Pin Xgrower + sign in',
    body: (
      <>
        Click the puzzle icon in the Chrome toolbar, pin Xgrower so it&apos;s always visible. Click
        the Xgrower icon and sign in with Google.
      </>
    ),
    placeholder: 'pinned extension popup',
    src: '/xgrower/install/step-05-pin-popover.png',
    srcW: 935,
    srcH: 656,
  },
]

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: '"Manifest version error" when loading?',
    a: (
      <>
        You unzipped twice. Try Step 3 again — the folder you select needs to contain{' '}
        <code
          style={{
            fontFamily: 'var(--mono)',
            background: 'var(--bg-elev)',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid var(--rule)',
            fontSize: '0.9em',
          }}
        >
          manifest.json
        </code>{' '}
        directly, not a folder containing another folder.
      </>
    ),
  },
  {
    q: 'I see an "Errors" tab in chrome://extensions?',
    a: (
      <>
        <p style={{ margin: '0 0 14px' }}>
          Click Errors → screenshot → DM{' '}
          <a
            href="https://x.com/Felixisbuilding"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--ink-dim)' }}
          >
            @Felixisbuilding
          </a>
          . Most launch-day errors are session/auth related and I&apos;ll fix them in &lt;1 hour.
        </p>
        <Image
          src="/xgrower/install/faq-errors.png"
          alt="X Grower card showing a red Errors button next to Details / Remove"
          width={937}
          height={625}
          sizes="(max-width: 768px) 100vw, 640px"
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: 10,
            border: '1px solid var(--rule)',
            display: 'block',
          }}
        />
      </>
    ),
  },
  {
    q: 'Does this work on Edge / Brave / Arc?',
    a: (
      <>
        Edge yes (Chromium fork). Brave should but I haven&apos;t tested. Arc yes. Safari no —
        different extension format.
      </>
    ),
  },
  {
    q: 'Will I lose access when the Chrome Web Store version ships?',
    a: (
      <>
        No. Auto-migration — your auth + invite code carry over. You&apos;ll get an email when the
        CWS version lands (~2 weeks post-launch).
      </>
    ),
  },
]

export default function XGrowerInstallPage() {
  return (
    <>
      <TopNav variant="page" />
      <main style={{ background: 'var(--bg)', color: 'var(--ink)', minHeight: '100vh' }}>
        {/* HERO */}
        <section style={{ padding: '80px 24px 60px', maxWidth: 1080, margin: '0 auto' }}>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--mono)',
              color: 'var(--ink-faint)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              padding: '4px 10px',
              border: '1px solid var(--rule)',
              borderRadius: 999,
              display: 'inline-block',
              marginBottom: 28,
            }}
          >
            install · 60 seconds
          </div>

          <h1
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(44px, 7vw, 84px)',
              lineHeight: 1.02,
              letterSpacing: '-0.02em',
              margin: '0 0 24px',
              fontWeight: 400,
            }}
          >
            Get Xgrower into <span style={{ color: 'var(--accent)' }}>your Chrome.</span>
          </h1>

          <p
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(20px, 2.8vw, 28px)',
              lineHeight: 1.35,
              color: 'var(--ink-dim)',
              maxWidth: 760,
              margin: '0 0 40px',
            }}
          >
            Sideload version while we wait for Chrome Web Store review. Future you will install in
            one click.
          </p>

          <div
            style={{
              display: 'flex',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
              marginBottom: 14,
            }}
          >
            <a
              href="/xgrower-extension.zip"
              download
              style={{
                fontSize: 17,
                fontWeight: 600,
                padding: '16px 32px',
                borderRadius: 999,
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Download Xgrower.zip ↓
            </a>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: 0, lineHeight: 1.6 }}>
            v1.0 · ~500KB · TypeScript source:{' '}
            <a
              href="https://github.com/JoyyyceD/xgrower-extension"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--ink-dim)' }}
            >
              github.com/JoyyyceD/xgrower-extension
            </a>
          </p>
        </section>

        {/* 5-STEP SIDELOAD */}
        <section
          style={{
            padding: '80px 24px',
            background: 'var(--bg-elev)',
            borderTop: '1px solid var(--rule)',
            borderBottom: '1px solid var(--rule)',
          }}
        >
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            <h2
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(36px, 5vw, 56px)',
                margin: '0 0 12px',
                fontWeight: 400,
              }}
            >
              Five steps. Roughly a minute.
            </h2>
            <p
              style={{
                fontSize: 17,
                color: 'var(--ink-dim)',
                maxWidth: 640,
                margin: '0 0 56px',
                lineHeight: 1.5,
              }}
            >
              If you&apos;ve ever installed a Chrome extension manually before, skip ahead. If not,
              follow along — it&apos;s the same five clicks every time.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 24,
              }}
            >
              {STEPS.map((s) => (
                <InstallStep
                  key={s.num}
                  num={s.num}
                  title={s.title}
                  body={s.body}
                  placeholder={s.placeholder}
                  src={s.src}
                  srcW={s.srcW}
                  srcH={s.srcH}
                />
              ))}
            </div>
          </div>
        </section>

        {/* TROUBLESHOOTING */}
        <section
          style={{
            padding: '80px 24px',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ maxWidth: 820, margin: '0 auto' }}>
            <div
              style={{
                fontSize: 11,
                fontFamily: 'var(--mono)',
                color: 'var(--accent)',
                letterSpacing: '0.12em',
                marginBottom: 16,
              }}
            >
              TROUBLESHOOTING
            </div>
            <h2
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(36px, 5vw, 56px)',
                margin: '0 0 40px',
                fontWeight: 400,
              }}
            >
              When it doesn&apos;t work.
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {FAQS.map(({ q, a }, i) => (
                <details
                  key={i}
                  style={{
                    borderBottom: '1px solid var(--rule)',
                    padding: '20px 0',
                  }}
                >
                  <summary
                    style={{
                      fontFamily: 'var(--serif)',
                      fontSize: 22,
                      cursor: 'pointer',
                      listStyle: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                    }}
                  >
                    {q}
                    <span style={{ color: 'var(--ink-faint)', fontSize: 16, fontFamily: 'var(--mono)' }}>
                      +
                    </span>
                  </summary>
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 16,
                      lineHeight: 1.6,
                      color: 'var(--ink-dim)',
                    }}
                  >
                    {a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* NEXT-STEP CTA */}
        <section
          style={{
            padding: '100px 24px',
            textAlign: 'center',
            maxWidth: 720,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--mono)',
              color: 'var(--accent)',
              letterSpacing: '0.12em',
              marginBottom: 16,
            }}
          >
            NEXT
          </div>
          <h2
            style={{
              fontFamily: 'var(--serif)',
              fontSize: 'clamp(36px, 5.5vw, 60px)',
              margin: '0 0 32px',
              fontWeight: 400,
              lineHeight: 1.1,
            }}
          >
            Got it installed?
          </h2>

          <div
            style={{
              display: 'flex',
              gap: 14,
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 32,
            }}
          >
            <Link
              href="/login?next=/xgrower"
              style={{
                fontSize: 16,
                fontWeight: 600,
                padding: '14px 28px',
                borderRadius: 999,
                background: 'var(--accent)',
                color: 'var(--accent-ink)',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Sign in to start replying →
            </Link>
            <Link
              href="/xgrower/redeem"
              style={{
                fontSize: 16,
                fontWeight: 600,
                padding: '14px 28px',
                borderRadius: 999,
                background: 'transparent',
                color: 'var(--ink)',
                border: '1px solid var(--rule-strong)',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Have a founding code?
            </Link>
          </div>

          <p
            style={{
              marginTop: 16,
              fontSize: 13,
              color: 'var(--ink-faint)',
              lineHeight: 1.6,
            }}
          >
            Stuck? DM{' '}
            <a
              href="https://x.com/Felixisbuilding"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--ink-faint)' }}
            >
              @Felixisbuilding
            </a>{' '}
            with a screenshot — I&apos;ll get back inside an hour during launch week.
          </p>
        </section>
      </main>
    </>
  )
}

function InstallStep({
  num,
  title,
  body,
  placeholder,
  src,
  srcW,
  srcH,
}: {
  num: string
  title: string
  body: React.ReactNode
  placeholder: string
  src?: string
  srcW?: number
  srcH?: number
}) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        border: '1px solid var(--rule)',
        borderRadius: 16,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: 'var(--mono)',
          color: 'var(--accent)',
          letterSpacing: '0.12em',
        }}
      >
        STEP / {num}
      </div>
      <h3
        style={{
          fontFamily: 'var(--serif)',
          fontSize: 24,
          margin: 0,
          fontWeight: 400,
          lineHeight: 1.2,
        }}
      >
        {title}
      </h3>
      <div
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--ink-dim)',
          margin: 0,
        }}
      >
        {body}
      </div>
      {src && srcW && srcH ? (
        <div
          style={{
            marginTop: 'auto',
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid var(--rule)',
            background: 'var(--bg-elev)',
          }}
        >
          <Image
            src={src}
            alt={placeholder}
            width={srcW}
            height={srcH}
            sizes="(max-width: 768px) 100vw, 33vw"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      ) : (
        <div
          style={{
            marginTop: 'auto',
            background: 'var(--bg-elev)',
            border: '1px dashed var(--rule-strong)',
            borderRadius: 10,
            aspectRatio: '16 / 9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontFamily: 'var(--mono)',
            color: 'var(--ink-faint)',
            letterSpacing: '0.04em',
            textAlign: 'center',
            padding: 12,
          }}
          aria-label={`Screenshot placeholder: ${placeholder}`}
        >
          🖼️ {placeholder}
        </div>
      )}
    </div>
  )
}
