import './globals.css'
import type { Metadata } from 'next'
import CleanAllocationButton from './components/CleanAllocationButton'
import CrewCapacityHint from './components/CrewCapacityHint'

export const metadata: Metadata = {
  title: 'Softball Umpire Allocation',
  description: 'Professional tournament umpire scheduling and allocation engine',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en-NZ"><body>{children}<CrewCapacityHint /><CleanAllocationButton /></body></html>
}
