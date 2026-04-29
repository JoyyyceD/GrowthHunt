import type { ReactNode } from 'react'
import { TopNav } from '@/lib/site/TopNav'
import './opchampion.css'

export default function OpChampionLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopNav variant="page" />
      {children}
    </>
  )
}
