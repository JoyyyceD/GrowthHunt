import Link from 'next/link'
import type { BreadcrumbItem } from '@/lib/editorial-seo'

export function StructuredData({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="gh-breadcrumb" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={item.path}>
          {index > 0 && <span aria-hidden="true"> / </span>}
          {index === items.length - 1 ? <span aria-current="page">{item.name}</span> : <Link href={item.path}>{item.name}</Link>}
        </span>
      ))}
    </nav>
  )
}
