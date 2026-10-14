'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Shield, Scale, CheckCircle } from 'lucide-react'

interface LegalModalProps {
  isOpen: boolean
  onClose: () => void
  defaultTab?: 'tos' | 'privacy' | 'tar'
}

export function LegalModal({ isOpen, onClose, defaultTab = 'tos' }: LegalModalProps) {
  const [activeTab, setActiveTab] = useState<'tos' | 'privacy' | 'tar'>(defaultTab)

  // Sync the active tab when defaultTab changes (e.g. when opening via different links)
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab)
    }
  }, [isOpen, defaultTab])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-gradient-to-b from-[#150a25] to-[#0a0510] border-white/[0.08]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
            <Scale className="w-5 h-5 text-slate-400" />
            Legal Documents
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'tos' | 'privacy' | 'tar')} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-900/20 border border-white/[0.08] h-11 mb-4">
            <TabsTrigger value="tos" className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-slate-100 text-slate-400 h-9 rounded-md transition-all flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Terms of Service
            </TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-slate-100 text-slate-400 h-9 rounded-md transition-all flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Privacy Policy
            </TabsTrigger>
            <TabsTrigger value="tar" className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-slate-100 text-slate-400 h-9 rounded-md transition-all flex items-center gap-2">
              <Scale className="w-4 h-4" />
              Terms & Rules
            </TabsTrigger>
          </TabsList>

          <div className="h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            <TabsContent value="tos" className="mt-0">
              <div className="space-y-6 text-slate-200/90">
                {/* Header */}
                <div className="bg-slate-900/20 rounded-xl p-4 border border-white/[0.08]">
                  <h2 className="text-2xl font-bold text-slate-100 mb-2">Terms of Service</h2>
                  <p className="text-sm text-slate-400">Last updated: October 2026</p>
                </div>

                {/* Sections */}
                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    1. Acceptance of Terms
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    By accessing or using Chrona ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. These terms apply to all visitors, users, and others who access or use the Service.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    2. Description of Service
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    Chrona is a roleplay universe platform that allows users to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>Create and manage character personas</li>
                    <li>Engage in real-time roleplay conversations with other users</li>
                    <li>Join and participate in storyline communities with channels and wiki</li>
                    <li>Purchase and use virtual currency (Chronos)</li>
                    <li>Buy and sell character personas on the marketplace</li>
                    <li>React to, pin, bookmark, forward, and edit messages</li>
                    <li>Mute, archive, or block conversations and users</li>
                    <li>Use AI-powered response generation for persona interactions</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    3. Account Registration
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    To use certain features of the Service, you must register for an account. When you register:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>You must provide accurate and complete information</li>
                    <li>You are responsible for maintaining the security of your account and security key</li>
                    <li>You are responsible for all activities that occur under your account</li>
                    <li>You must be at least 16 years old to create an account</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    4. Virtual Currency (Chronos)
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    Chronos is a virtual currency used within the Service:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>Chronos have no cash value and cannot be exchanged for real money</li>
                    <li>Chronos are non-transferable between users unless through official marketplace transactions</li>
                    <li>We maintain a complete transaction history of all Chronos changes. In cases of fraud, abuse, or system errors, we reserve the right to review your transaction history and adjust your balance to reflect legitimate transactions only</li>
                    <li>Purchased Chronos are final and non-refundable except where required by law</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    5. Marketplace Transactions
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    The Chrona Marketplace allows users to buy and sell character personas:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Creator Credit:</strong> Each persona has a unique numeric ID that stays linked to the original creator, even after sale. The original creator is always credited.</li>
                    <li><strong>Buyer Rights:</strong> Buyers receive full ownership and editing rights to purchased personas, while the original creator is preserved in the persona&apos;s history.</li>
                    <li><strong>Transaction Fees:</strong> A 15% platform fee applies to sales over 120 Chronos. Sales at or below 120 Chronos have a 10% fee.</li>
                    <li><strong>Refund Policy:</strong> If a transaction fails due to a system bug (Chronos deducted but persona not received), contact support for a full Chronos refund and the persona will be granted to your account. Real money refunds are not available.</li>
                    <li>All successful sales are final - no exchanges or returns on delivered personas.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    6. Prohibited Conduct
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    You agree not to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>Violate any applicable laws or regulations</li>
                    <li>Infringe on the intellectual property rights of others</li>
                    <li>Harass, abuse, or harm other users</li>
                    <li>Create accounts to circumvent bans or restrictions</li>
                    <li>Use the Service for commercial purposes without authorization</li>
                    <li>Attempt to hack, exploit, or disrupt the Service</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    7. Termination
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    We reserve the right to terminate or suspend your account at any time for any reason, including violation of these Terms. Upon termination, your right to use the Service will immediately cease. We may delete your account and associated data at our discretion.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    8. Limitation of Liability
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    To the maximum extent permitted by law, Chrona shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use the Service. Our total liability shall not exceed the amount you paid us in the past 12 months.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    9. Changes to Terms
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    We reserve the right to modify these Terms at any time. We will notify users of significant changes. Your continued use of the Service after changes constitutes acceptance of the updated Terms.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    10. Contact
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    If you have questions about these Terms, please contact us through the Service or our official channels.
                  </p>
                </section>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="mt-0">
              <div className="space-y-6 text-slate-200/90">
                {/* Header */}
                <div className="bg-slate-900/20 rounded-xl p-4 border border-white/[0.08]">
                  <h2 className="text-2xl font-bold text-slate-100 mb-2">Privacy Policy</h2>
                  <p className="text-sm text-slate-400">Last updated: October 2026</p>
                </div>

                {/* Intro */}
                <div className="bg-gradient-to-r from-slate-900/20 to-cyan-900/15 rounded-xl p-4 border border-white/[0.08]">
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    At Chrona, we take your privacy seriously. This Privacy Policy explains what information we collect, how we use it, and your rights. We only collect what&apos;s necessary to provide our service.
                  </p>
                </div>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    1. Information We Collect
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    When you create an account, we collect:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Username:</strong> Your unique identifier on the platform</li>
                    <li><strong>Password:</strong> Stored securely as a hashed value (we cannot see your actual password)</li>
                    <li><strong>Security Key:</strong> A recovery key for account verification</li>
                    <li><strong>Avatar:</strong> Optional profile image</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    2. Content You Create
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    We store the content you create on Chrona:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Personas:</strong> Character profiles including name, description, personality, backstory, appearance, and preferences</li>
                    <li><strong>Messages:</strong> Direct messages and storyline messages you send (including images)</li>
                    <li><strong>Storylines:</strong> Communities you create, including channels and settings</li>
                    <li><strong>Social Connections:</strong> Friends list, followers, and blocked users</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    3. Transaction Data
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    We track virtual currency transactions:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Chronos Balance:</strong> Your current virtual currency balance</li>
                    <li><strong>Transaction History:</strong> Record of Chronos earned, spent, and purchased</li>
                    <li><strong>Marketplace Activity:</strong> Personas you&apos;ve bought or sold</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    4. What We Do NOT Collect
                  </h3>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-sm leading-relaxed text-emerald-300/80 mb-3">
                      We do NOT collect or store:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-emerald-300/80 ml-2">
                      <li>❌ Analytics or tracking data</li>
                      <li>❌ Third-party cookies</li>
                      <li>❌ Browsing history or pages visited</li>
                      <li>❌ Location data or GPS</li>
                      <li>❌ Contact lists or device contacts</li>
                    </ul>
                    <p className="text-xs text-emerald-300/60 mt-3 italic">
                      Note: Our server infrastructure may temporarily log IP addresses for rate limiting and security purposes. These logs are not associated with your account and are automatically purged.
                    </p>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    5. Sessions & Cookies
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    We use a session token stored in your browser to keep you logged in. This token is necessary for the service to function and is deleted when you log out. We do not use tracking cookies or analytics.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    6. Real-Time Data & Message Sync
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    Chrona uses real-time data synchronization to deliver messages, reactions, typing indicators, and read receipts:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Message Data:</strong> Messages, reactions, and edits are stored in our database and synced to participants in real time</li>
                    <li><strong>Typing Indicators:</strong> When you type, a temporary indicator is shown to the other participant. This data is not stored.</li>
                    <li><strong>Read Receipts:</strong> When you open a conversation, messages from the other participant are marked as read. This status is visible to the sender.</li>
                    <li><strong>Edit History:</strong> When you edit a message, the previous version is stored in an edit history that you can view</li>
                    <li><strong>Bookmarks & Pins:</strong> Your bookmarked and pinned messages are stored and associated with your account</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    7. Information Sharing
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    Your information is shared only as follows:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Public Profiles:</strong> Your username, avatar, and personas are visible to other users</li>
                    <li><strong>Messages:</strong> Your messages are visible to the recipients</li>
                    <li><strong>Storylines:</strong> Content in public storylines is visible to members</li>
                    <li><strong>We do NOT sell your data to third parties</strong></li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    8. Data Security
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    Passwords are hashed and cannot be read by anyone (including us). Your security key is the only way to recover your account if you lose your password. We use secure connections (HTTPS) for all data transmission.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    9. Data Retention
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    We retain your data while your account is active. You can request account deletion to remove your data. Some data (like transaction records) may be retained for legitimate business purposes even after account deletion.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    10. Your Rights
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    You have the right to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>Access your personal data through the app</li>
                    <li>Edit your profile and persona information</li>
                    <li>Delete your account and associated data</li>
                    <li>Request a copy of your data</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    11. Children&apos;s Privacy
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    Chrona is not intended for children under 16. We do not knowingly collect information from children under 16. If you believe a child under 16 has created an account, please contact us.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    12. Changes to Privacy Policy
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    We may update this Privacy Policy from time to time. We will notify users of significant changes. Continued use of Chrona after changes constitutes acceptance.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    13. Contact
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    If you have questions about this Privacy Policy or want to request data deletion, contact us through the platform or our official channels.
                  </p>
                </section>
              </div>
            </TabsContent>

            <TabsContent value="tar" className="mt-0">
              <div className="space-y-6 text-slate-200/90">
                {/* Header */}
                <div className="bg-slate-900/20 rounded-xl p-4 border border-white/[0.08]">
                  <h2 className="text-2xl font-bold text-slate-100 mb-2">Terms & Rules</h2>
                  <p className="text-sm text-slate-400">Community Guidelines for Chrona — Last updated: October 2026</p>
                </div>

                {/* Intro */}
                <div className="bg-gradient-to-r from-slate-900/20 to-cyan-900/15 rounded-xl p-4 border border-white/[0.08]">
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    Welcome to Chrona! We're a community of creative roleplayers. To ensure everyone has a positive experience, please follow these community guidelines and rules.
                  </p>
                </div>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    1. Respect & Civility
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    Treat all members with respect:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>No harassment, bullying, or targeted attacks</li>
                    <li>No hate speech or discrimination based on race, gender, sexuality, religion, or disability</li>
                    <li>Respect boundaries - if someone is uncomfortable, stop</li>
                    <li>Resolve conflicts maturely or contact moderation</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    2. Content Guidelines
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    All content must follow these rules:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Age-Appropriate:</strong> No sexual content involving minors (under 18) in any context</li>
                    <li><strong>NSFW Content:</strong> Explicit content is only permitted in designated areas between consenting adults (18+)</li>
                    <li><strong>Violence:</strong> Graphic violence must be tagged and warned appropriately</li>
                    <li><strong>Illegal Content:</strong> No content depicting illegal activities</li>
                    <li><strong>Personal Information:</strong> Do not share real personal information about yourself or others</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    3. Roleplay Etiquette
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    Follow these roleplay best practices:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Consent:</strong> Always obtain OOC (Out of Character) consent before major story actions</li>
                    <li><strong>God-Modding:</strong> Do not control other players' characters without permission</li>
                    <li><strong>Power-Playing:</strong> Do not create invincible or overpowered characters in unfair ways</li>
                    <li><strong>Communication:</strong> Communicate with your roleplay partners about expectations</li>
                    <li><strong>Character Separation:</strong> Remember that characters ≠ players</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    4. Messaging Etiquette
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    For direct messages and storyline channels:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Consent:</strong> Do not spam or flood channels with messages</li>
                    <li><strong>Reactions:</strong> Use reactions respectfully — do not use them to mock or harass</li>
                    <li><strong>Forwarding:</strong> Do not forward private messages without the sender&apos;s consent</li>
                    <li><strong>Editing:</strong> Editing messages is allowed, but edit history is visible to maintain transparency</li>
                    <li><strong>Read Receipts:</strong> When you open a conversation, the sender can see their messages were read</li>
                    <li><strong>Blocking:</strong> You can block users at any time. Blocked users cannot message you</li>
                    <li><strong>Clear History:</strong> Either participant can clear a conversation&apos;s history — this is permanent</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    5. Storyline Rules
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    For storyline communities:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>Storyline owners set their own rules within platform guidelines</li>
                    <li>Respect storyline-specific lore and settings</li>
                    <li>Do not disrupt ongoing storylines</li>
                    <li>Follow character submission requirements</li>
                    <li>Owners may remove members who violate storyline rules</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    6. Marketplace Rules
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    When using the marketplace:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>Only sell characters you created or have rights to</li>
                    <li>Do not steal or copy other users' characters</li>
                    <li>Provide accurate descriptions of characters for sale</li>
                    <li><strong>All sales are final</strong> - no refunds or exchanges on completed purchases</li>
                    <li><strong>Bug Protection:</strong> If a transaction fails due to a system bug (Chronos deducted but persona not received), contact support for a full Chronos refund and the persona will be granted to your account</li>
                    <li>Price manipulation or exploitation is prohibited</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    7. Prohibited Activities
                  </h3>
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <p className="text-sm leading-relaxed text-red-300/80 mb-3">
                      The following will result in immediate action:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-red-300/80 ml-2">
                      <li><strong>Child Safety:</strong> Any content sexualizing minors - permanent ban</li>
                      <li><strong>Harassment:</strong> Targeted harassment campaigns - temporary to permanent ban</li>
                      <li><strong>Scamming:</strong> Marketplace fraud - permanent ban and forfeiture of Chronos</li>
                      <li><strong>Impersonation:</strong> Pretending to be staff or another user - permanent ban</li>
                      <li><strong>Exploitation:</strong> Using bugs or cheats - temporary to permanent ban</li>
                      <li><strong>Ban Evasion:</strong> Creating accounts to circumvent bans - permanent ban</li>
                    </ul>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    8. Reporting & Moderation
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    Help us keep Chrona safe:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>Report violations using the report button</li>
                    <li>Provide context and evidence when reporting</li>
                    <li>Do not make false or malicious reports</li>
                    <li>Respect moderator decisions</li>
                    <li>Appeals can be submitted through official channels</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    9. Enforcement
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    Violations may result in:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Warning:</strong> First-time minor violations</li>
                    <li><strong>Temporary Mute:</strong> Repeated minor violations</li>
                    <li><strong>Temporary Ban:</strong> Moderate violations (24 hours - 30 days)</li>
                    <li><strong>Permanent Ban:</strong> Severe violations</li>
                    <li><strong>Account Termination:</strong> Extreme violations with data deletion</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    10. AI Features
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    When using AI-powered features:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>AI-generated content should be used as inspiration, not to impersonate others</li>
                    <li>Do not use AI to generate prohibited content</li>
                    <li>AI usage is subject to the same content guidelines</li>
                    <li>We may limit AI features based on fair usage</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    11. Updates & Changes
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    These rules may be updated at any time. Major changes will be announced. Continued use of Chrona constitutes acceptance of these rules. Check back regularly for updates.
                  </p>
                </section>

                {/* Footer Note */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-sm text-emerald-300/80 text-center">
                    <strong>Questions?</strong> Contact our moderation team through the report system or official channels.
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
