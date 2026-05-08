import type { ReactNode } from 'react'
import { TopNav } from '@/lib/site/TopNav'
import './picolaunch.css'

export default function PicoLaunchLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <TopNav variant="page" />
      {children}
    </>
  )
}
