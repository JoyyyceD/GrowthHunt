import Link from 'next/link'
import type { Feature } from '@/lib/features'

export default function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <Link
      href={`/feature/${feature.id}`}
      className="group flex flex-col gap-3 p-5 rounded-xl border border-neutral-800 bg-neutral-950 hover:border-neutral-600 hover:bg-neutral-900 transition-all duration-200"
    >
      <div>
        <h3 className="text-sm font-semibold text-white mb-1">{feature.name}</h3>
        <p className="text-xs text-neutral-500 leading-relaxed">{feature.hook}</p>
      </div>
      <span className="text-xs text-neutral-600 group-hover:text-neutral-400 transition-colors mt-auto">
        Learn more
      </span>
    </Link>
  )
}
