import { Metadata } from 'next'
import { BookOpen } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Community Rules - Chrona',
  description: 'Community Rules and Guidelines for Chrona - Roleplay Universe',
}

export default function RulesPage() {
  return (
    <article className="prose prose-invert prose-purple max-w-none">
      <header className="not-prose mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-purple-100 m-0">Community Rules</h1>
        </div>
        <p className="text-purple-400/60">Last updated: January 2025</p>
      </header>
      
      <p className="text-purple-300/80 text-lg">
        Welcome to Chrona! We&apos;re committed to building a welcoming and creative community for roleplayers. 
        Please follow these guidelines to help us maintain a positive environment for everyone.
      </p>
      
      <h2 className="text-purple-200">1. Be Respectful</h2>
      <p className="text-purple-300/80">
        Treat all members of the community with respect and kindness. Remember that behind every character 
        is a real person. Do not engage in:
      </p>
      <ul className="text-purple-300/80">
        <li>Harassment, bullying, or targeted attacks</li>
        <li>Hate speech or discrimination based on race, ethnicity, religion, gender, sexuality, or disability</li>
        <li>Doxxing (sharing personal information without consent)</li>
        <li>Threats of violence or self-harm</li>
      </ul>
      
      <h2 className="text-purple-200">2. Content Guidelines</h2>
      <p className="text-purple-300/80">
        All content must be appropriate for the platform:
      </p>
      <ul className="text-purple-300/80">
        <li><strong>No sexual content involving minors</strong> - This includes any sexual or suggestive content depicting or involving characters under 18 years old. This is a zero-tolerance rule.</li>
        <li><strong>No illegal content</strong> - This includes pirated content, illegal substances, or any content that violates applicable laws</li>
        <li><strong>Content warnings</strong> - Use appropriate warnings for sensitive topics like violence, mature themes, or triggering content</li>
        <li><strong>Respect boundaries</strong> - Honor other users&apos; stated limits and preferences</li>
      </ul>
      
      <h2 className="text-purple-200">3. Roleplay Etiquette</h2>
      <p className="text-purple-300/80">
        Good roleplay is built on mutual respect and communication:
      </p>
      <ul className="text-purple-300/80">
        <li><strong>Consent is key</strong> - Always obtain OOC (out-of-character) consent before engaging in intense or sensitive roleplay scenarios</li>
        <li><strong>No godmodding</strong> - Don&apos;t control other people&apos;s characters without permission</li>
        <li><strong>Respect the setting</strong> - Follow the rules and lore of each storyline you join</li>
        <li><strong>Communicate</strong> - If you need to leave or pause a roleplay, communicate with your partner(s)</li>
        <li><strong>Match effort</strong> - Try to match the length and effort level of your roleplay partners</li>
      </ul>
      
      <h2 className="text-purple-200">4. Character Creation</h2>
      <p className="text-purple-300/80">
        When creating characters:
      </p>
      <ul className="text-purple-300/80">
        <li>Original characters are encouraged</li>
        <li>Fan characters and inspired characters are allowed with proper attribution</li>
        <li>Do not claim others&apos; artwork as your own</li>
        <li>Respect intellectual property rights</li>
      </ul>
      
      <h2 className="text-purple-200">5. Storylines and Communities</h2>
      <p className="text-purple-300/80">
        Storyline owners set the rules for their communities:
      </p>
      <ul className="text-purple-300/80">
        <li>Follow all storyline-specific rules</li>
        <li>Respect the decisions of storyline owners and moderators</li>
        <li>If you have a dispute, try to resolve it peacefully or contact staff</li>
        <li>Do not disrupt storylines with spam or off-topic content</li>
      </ul>
      
      <h2 className="text-purple-200">6. No Spam or Advertising</h2>
      <p className="text-purple-300/80">
        Do not use the platform for:
      </p>
      <ul className="text-purple-300/80">
        <li>Unsolicited advertising or promotional content</li>
        <li>Chain messages or spam</li>
        <li>Begging for Chronos or other virtual items</li>
        <li>Scams or phishing attempts</li>
      </ul>
      
      <h2 className="text-purple-200">7. Account Security</h2>
      <p className="text-purple-300/80">
        Keep your account secure:
      </p>
      <ul className="text-purple-300/80">
        <li>Never share your security key with anyone</li>
        <li>Use a strong, unique password</li>
        <li>Report any suspicious activity on your account</li>
        <li>Do not create multiple accounts to evade bans</li>
      </ul>
      
      <h2 className="text-purple-200">8. Reporting Violations</h2>
      <p className="text-purple-300/80">
        If you see someone violating these rules:
      </p>
      <ul className="text-purple-300/80">
        <li>Use the report feature on the offending content</li>
        <li>Do not engage with or respond to rule-breaking behavior</li>
        <li>Provide context and evidence when reporting</li>
        <li>Do not make false reports</li>
      </ul>
      
      <h2 className="text-purple-200">9. Consequences</h2>
      <p className="text-purple-300/80">
        Violations may result in:
      </p>
      <ul className="text-purple-300/80">
        <li>Warnings</li>
        <li>Temporary mute or suspension</li>
        <li>Permanent ban from specific storylines</li>
        <li>Permanent ban from the platform</li>
        <li>Reporting to law enforcement (for serious violations)</li>
      </ul>
      
      <h2 className="text-purple-200">10. Appeals</h2>
      <p className="text-purple-300/80">
        If you believe you were incorrectly punished, you may appeal through the appropriate channels. 
        Provide your username, the action taken, and why you believe it was incorrect.
      </p>
      
      <div className="not-prose mt-8 p-6 rounded-xl bg-purple-500/10 border border-purple-500/20">
        <h3 className="text-purple-200 font-semibold mb-2">Questions?</h3>
        <p className="text-purple-300/80 text-sm">
          If you have questions about these rules or need clarification, please reach out to our 
          moderation team through the Service. We&apos;re here to help!
        </p>
      </div>
    </article>
  )
}
