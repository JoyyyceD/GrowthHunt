import { requireGoogleAuth } from '@/lib/picolaunch/auth-gate'
import AccountTabs from './AccountTabs'
import '../picolaunch.css'

export const dynamic = 'force-dynamic'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireGoogleAuth('/picolaunch/account')

  return (
    <div>
      <section className="opc-section" style={{ padding: '56px 0 24px' }}>
        <div className="shell" style={{ maxWidth: 980 }}>
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                color: 'var(--ink-faint)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 8,
              }}
            >
              Account
            </div>
            <h1
              style={{
                fontFamily: 'var(--serif)',
                fontSize: 'clamp(36px, 5vw, 56px)',
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                fontWeight: 400,
                margin: 0,
              }}
            >
              {user.name ?? user.email ?? 'You'}
            </h1>
            <div
              style={{
                fontSize: 13,
                color: 'var(--ink-faint)',
                fontFamily: 'var(--mono)',
                marginTop: 4,
              }}
            >
              {user.email}
            </div>
          </div>

          <AccountTabs />
        </div>
      </section>

      <section className="opc-section" style={{ padding: '0 0 80px' }}>
        <div className="shell" style={{ maxWidth: 980 }}>
          {children}
        </div>
      </section>
    </div>
  )
}
