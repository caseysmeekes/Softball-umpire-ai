import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Softball Umpire Allocation',
  description: 'Professional tournament umpire scheduling and allocation engine',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en-NZ"><body>{children}</body></html>
}
