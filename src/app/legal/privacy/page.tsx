import { Metadata } from 'next'
import { Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy - Chrona',
  description: 'Privacy Policy for Chrona - Roleplay Universe',
}

export default function PrivacyPage() {
  return (
    <article className="prose prose-invert prose-purple max-w-none">
      <header className="not-prose mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-purple-100 m-0">Privacy Policy</h1>
        </div>
        <p className="text-purple-400/60">Last updated: January 2025</p>
      </header>
      
      <h2 className="text-purple-200">1. Information We Collect</h2>
      <p className="text-purple-300/80">
        We collect information you provide directly to us:
      </p>
      <ul className="text-purple-300/80">
        <li><strong>Account Information:</strong> Username, password (hashed), security key (hashed), and optional email</li>
        <li><strong>Profile Information:</strong> Avatar images, character personas, and profile descriptions</li>
        <li><strong>Content:</strong> Messages, storyline posts, and other user-generated content</li>
        <li><strong>Usage Data:</strong> Login times, feature usage, and interaction patterns</li>
      </ul>
      
      <h2 className="text-purple-200">2. How We Use Information</h2>
      <p className="text-purple-300/80">
        We use your information to:
      </p>
      <ul className="text-purple-300/80">
        <li>Provide, maintain, and improve the Service</li>
        <li>Process transactions and send related information</li>
        <li>Send technical notices and support messages</li>
        <li>Detect and prevent fraud and abuse</li>
        <li>Communicate with you about products, services, and events</li>
      </ul>
      
      <h2 className="text-purple-200">3. Information Sharing</h2>
      <p className="text-purple-300/80">
        We do not sell your personal information. We may share information:
      </p>
      <ul className="text-purple-300/80">
        <li><strong>With other users:</strong> Your username, avatar, and public profile content</li>
        <li><strong>With service providers:</strong> Cloud hosting, analytics, and email services</li>
        <li><strong>For legal purposes:</strong> When required by law or to protect rights</li>
        <li><strong>In business transfers:</strong> In connection with merger, acquisition, or sale</li>
      </ul>
      
      <h2 className="text-purple-200">4. Data Security</h2>
      <p className="text-purple-300/80">
        We implement industry-standard security measures including:
      </p>
      <ul className="text-purple-300/80">
        <li>End-to-end encryption for sensitive data</li>
        <li>Hashed passwords and security keys</li>
        <li>Secure server infrastructure</li>
        <li>Regular security audits</li>
      </ul>
      <p className="text-purple-300/80">
        However, no method of transmission over the Internet is 100% secure. We cannot guarantee 
        absolute security of your data.
      </p>
      
      <h2 className="text-purple-200">5. Data Retention</h2>
      <p className="text-purple-300/80">
        We retain your information for as long as your account is active or as needed to provide 
        services. You may request deletion of your account and associated data at any time.
      </p>
      
      <h2 className="text-purple-200">6. Your Rights</h2>
      <p className="text-purple-300/80">
        You have the right to:
      </p>
      <ul className="text-purple-300/80">
        <li>Access and download your personal data</li>
        <li>Correct inaccurate information</li>
        <li>Delete your account and data</li>
        <li>Opt out of promotional communications</li>
        <li>Object to certain processing of your data</li>
      </ul>
      
      <h2 className="text-purple-200">7. Cookies and Tracking</h2>
      <p className="text-purple-300/80">
        We use cookies and similar technologies for:
      </p>
      <ul className="text-purple-300/80">
        <li>Authentication and account management</li>
        <li>Remembering your preferences</li>
        <li>Analytics and performance monitoring</li>
      </ul>
      
      <h2 className="text-purple-200">8. Children&apos;s Privacy</h2>
      <p className="text-purple-300/80">
        Our Service is not directed to children under 13. We do not knowingly collect personal 
        information from children under 13. If you believe we have collected information from a 
        child under 13, please contact us immediately.
      </p>
      
      <h2 className="text-purple-200">9. International Users</h2>
      <p className="text-purple-300/80">
        If you are accessing the Service from outside the United States, please be aware that 
        your information may be transferred to, stored, and processed in the United States or 
        other countries where our servers are located.
      </p>
      
      <h2 className="text-purple-200">10. Changes to Privacy Policy</h2>
      <p className="text-purple-300/80">
        We may update this Privacy Policy from time to time. We will notify you of any material 
        changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
      </p>
      
      <h2 className="text-purple-200">11. Contact Us</h2>
      <p className="text-purple-300/80">
        For questions about this Privacy Policy or to exercise your rights, please contact us 
        through the Service or our designated support channels.
      </p>
    </article>
  )
}
