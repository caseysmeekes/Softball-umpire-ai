import './globals.css'
import type { Metadata } from 'next'
import CleanAllocationButton from './components/CleanAllocationButton'
import CrewCapacityHint from './components/CrewCapacityHint'
import UsernameGate from './components/UsernameGate'

export const metadata: Metadata = {
  title: 'Softball Umpire Allocation',
  description: 'Professional tournament umpire scheduling and allocation engine',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ">
      <body>
        <UsernameGate>
          {children}
          <CrewCapacityHint />
          <CleanAllocationButton />
        </UsernameGate>
      </body>
    </html>
  )
}
