import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/600.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Flowcanvas',
  description: 'Design systems from markdown, with an agent.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable}`}>
      <body
        style={{
          margin: 0,
          background: 'var(--color-bg)',
          color: 'var(--color-text-primary)',
          fontFamily: 'var(--font-geist-sans)',
        }}
      >
        {children}
      </body>
    </html>
  )
}
