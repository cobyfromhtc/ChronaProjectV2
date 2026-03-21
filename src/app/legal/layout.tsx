import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, FileText, Shield, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Legal - Chrona',
  description: 'Terms of Service, Privacy Policy, and Community Rules',
}

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#090517] via-[#120a24] to-[#100827]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-purple-500/15 bg-[#12091f]/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="text-purple-100 font-semibold group-hover:text-purple-200 transition-colors">
                Chrona
              </span>
            </Link>
            
            <Link href="/">
              <Button variant="ghost" className="text-purple-300 hover:text-purple-100">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to App
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      {/* Navigation Tabs */}
      <div className="border-b border-purple-500/15 bg-[#12091f]/40">
        <div className="container mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto py-2">
            <Link 
              href="/legal/terms" 
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-purple-300 hover:text-purple-100 hover:bg-purple-500/10 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Terms of Service
            </Link>
            <Link 
              href="/legal/privacy" 
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-purple-300 hover:text-purple-100 hover:bg-purple-500/10 transition-colors"
            >
              <Shield className="w-4 h-4" />
              Privacy Policy
            </Link>
            <Link 
              href="/legal/rules" 
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-purple-300 hover:text-purple-100 hover:bg-purple-500/10 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Community Rules
            </Link>
          </nav>
        </div>
      </div>
      
      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {children}
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-purple-500/15 bg-[#12091f]/40 mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-purple-400/60">
            <p>© {new Date().getFullYear()} Chrona. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="/legal/terms" className="hover:text-purple-300 transition-colors">Terms</Link>
              <Link href="/legal/privacy" className="hover:text-purple-300 transition-colors">Privacy</Link>
              <Link href="/legal/rules" className="hover:text-purple-300 transition-colors">Rules</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
