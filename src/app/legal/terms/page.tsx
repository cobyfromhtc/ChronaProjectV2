import { Metadata } from 'next'
import { FileText } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms of Service - Chrona',
  description: 'Terms of Service for Chrona - Roleplay Universe',
}

export default function TermsPage() {
  return (
    <article className="prose prose-invert prose-purple max-w-none">
      <header className="not-prose mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-purple-100 m-0">Terms of Service</h1>
        </div>
        <p className="text-purple-400/60">Last updated: January 2025</p>
      </header>
      
      <h2 className="text-purple-200">1. Acceptance of Terms</h2>
      <p className="text-purple-300/80">
        By accessing and using Chrona (&quot;the Service&quot;), you accept and agree to be bound by the terms 
        and provisions of this agreement. If you do not agree to abide by these terms, please do not 
        use this Service.
      </p>
      
      <h2 className="text-purple-200">2. Description of Service</h2>
      <p className="text-purple-300/80">
        Chrona is a roleplay platform that allows users to create character personas, engage in 
        text-based roleplay, and interact with other users through direct messaging and community 
        storylines. The Service includes features such as:
      </p>
      <ul className="text-purple-300/80">
        <li>Character/persona creation and management</li>
        <li>Direct messaging between users</li>
        <li>Community storylines with channels</li>
        <li>Virtual currency (Chronos) for platform enhancements</li>
        <li>Profile customization options</li>
      </ul>
      
      <h2 className="text-purple-200">3. User Accounts</h2>
      <p className="text-purple-300/80">
        You are responsible for maintaining the confidentiality of your account credentials, including 
        your security key. You agree to notify us immediately of any unauthorized use of your account. 
        You must be at least 13 years old to use this Service.
      </p>
      
      <h2 className="text-purple-200">4. User Content</h2>
      <p className="text-purple-300/80">
        You retain ownership of content you create on Chrona. By posting content, you grant Chrona a 
        non-exclusive, worldwide, royalty-free license to use, display, and distribute your content 
        within the Service. You are responsible for ensuring your content does not violate any laws 
        or third-party rights.
      </p>
      
      <h2 className="text-purple-200">5. Prohibited Conduct</h2>
      <p className="text-purple-300/80">
        Users may not use the Service to:
      </p>
      <ul className="text-purple-300/80">
        <li>Harass, bully, or intimidate other users</li>
        <li>Share illegal, harmful, or explicit sexual content involving minors</li>
        <li>Impersonate other users or misrepresent identity</li>
        <li>Spam or distribute unwanted content</li>
        <li>Attempt to hack, exploit, or disrupt the Service</li>
        <li>Engage in commercial activities without authorization</li>
      </ul>
      
      <h2 className="text-purple-200">6. Virtual Currency</h2>
      <p className="text-purple-300/80">
        Chronos are a virtual currency with no real-world monetary value. Chronos cannot be 
        transferred, sold, or exchanged for real currency. We reserve the right to modify the 
        Chronos system at any time.
      </p>
      
      <h2 className="text-purple-200">7. Termination</h2>
      <p className="text-purple-300/80">
        We reserve the right to suspend or terminate accounts that violate these Terms. You may 
        request account deletion at any time. Upon termination, your right to use the Service 
        ceases immediately.
      </p>
      
      <h2 className="text-purple-200">8. Disclaimers</h2>
      <p className="text-purple-300/80">
        THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE 
        UNINTERRUPTED ACCESS TO THE SERVICE. WE ARE NOT RESPONSIBLE FOR USER-GENERATED CONTENT.
      </p>
      
      <h2 className="text-purple-200">9. Changes to Terms</h2>
      <p className="text-purple-300/80">
        We may update these Terms from time to time. Continued use of the Service after changes 
        constitutes acceptance of the new Terms. We will notify users of significant changes.
      </p>
      
      <h2 className="text-purple-200">10. Contact</h2>
      <p className="text-purple-300/80">
        For questions about these Terms, please contact us through the Service or our designated 
        support channels.
      </p>
    </article>
  )
}
