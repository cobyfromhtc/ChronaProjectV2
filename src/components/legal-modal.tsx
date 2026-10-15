'use client'

import { useState } from 'react'
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

  // Track the last defaultTab we applied. When the prop changes (e.g. the modal
  // is re-opened targeting a different document), reset the active tab during
  // render — the React-recommended alternative to syncing state in an effect.
  const [lastDefaultTab, setLastDefaultTab] = useState(defaultTab)
  if (defaultTab !== lastDefaultTab) {
    setLastDefaultTab(defaultTab)
    setActiveTab(defaultTab)
  }

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
              Terms &amp; Rules
            </TabsTrigger>
          </TabsList>

          <div className="h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {/* ================================================================ */}
            {/* TERMS OF SERVICE                                                 */}
            {/* ================================================================ */}
            <TabsContent value="tos" className="mt-0">
              <div className="space-y-6 text-slate-200/90">
                {/* Header */}
                <div className="bg-slate-900/20 rounded-xl p-4 border border-white/[0.08]">
                  <h2 className="text-2xl font-bold text-slate-100 mb-2">Terms of Service</h2>
                  <p className="text-sm text-slate-400">Last updated: October 2026</p>
                </div>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    1. Acceptance of Terms
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you and Chrona (&quot;we&quot;, &quot;us&quot;, or the &quot;Service&quot;) governing your access to and use of the Chrona roleplay platform, including its website, applications, APIs, and all associated features. By creating an account, or by accessing or using the Service in any way, you confirm that you have read, understood, and agree to be bound by these Terms and by the Chrona Terms &amp; Rules (Community Guidelines), which are incorporated into these Terms by reference.
                  </p>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    If you do not agree to these Terms, you must not access or use the Service. If you are using the Service on behalf of another person or entity, you represent that you are authorized to accept these Terms on their behalf.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    2. Description of the Service
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    Chrona is a collaborative roleplay universe platform. The Service enables you to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>Create and manage character personas, each with profiles, personalities, and media</li>
                    <li>Engage in real-time direct message (DM) roleplay conversations, including multi-image message attachments</li>
                    <li>Create, join, and moderate storyline communities with channels, threads, roles, wikis, and pinned messages</li>
                    <li>Create and share roleplay scenarios, and optionally opt in to having those scenarios featured in trending and showcase sections</li>
                    <li>Invite others to storylines using SI.FY:// invite codes</li>
                    <li>Buy and sell character personas on the Chrona Marketplace using Chronos, the in-platform currency</li>
                    <li>Claim daily Chronos bonuses, gift Chronos to other users, and unlock achievements</li>
                    <li>React to, pin, bookmark, forward, and edit messages, and manage conversations</li>
                  </ul>
                  <p className="text-sm leading-relaxed text-slate-300/80 mt-3">
                    We may add, modify, or remove features at any time. If a change to the Service materially reduces functionality you have paid Chronos for, we will, where reasonable, provide a remedy such as a Chronos credit.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    3. Age Requirements and Age Gating
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Minimum age.</strong> You must be at least 16 years old to create an account or use the Service. You must provide your date of birth at signup so we can enforce our age-gating system.</li>
                    <li><strong>Maturity settings.</strong> Users aged 16–17 are restricted to the &quot;safe&quot; content maturity setting and may only interact with other users in the same age bracket. Users aged 18 and over may choose between &quot;safe&quot;, &quot;mature&quot;, and &quot;unrestricted&quot; maturity settings.</li>
                    <li><strong>Adult content.</strong> Mature and explicit (NSFW) content is available only to users aged 18 or over who have enabled an appropriate maturity setting. Attempting to circumvent the age-gating system — including misrepresenting your age — is a serious violation and may result in immediate account termination.</li>
                    <li><strong>No children.</strong> The Service is not directed to children under 16, and we do not knowingly permit them to use it.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    4. Accounts and Security Keys
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-300/80 ml-2">
                    <li><strong>Registration.</strong> You must provide accurate and complete registration information, including a unique username and a valid date of birth. You may register multiple accounts provided each complies with these Terms.</li>
                    <li><strong>Credentials.</strong> You are responsible for maintaining the confidentiality of your password and your security key, and for all activity that occurs under your account. Keep your security key safe: it is the recovery mechanism for your account, and anyone holding it may be able to gain access to your account.</li>
                    <li><strong>Security key handling.</strong> For your protection, security keys are stored only as cryptographic hashes — we cannot read or recover the plain-text key for you. If you lose both your password and your security key, your account may be unrecoverable.</li>
                    <li><strong>Notification.</strong> Notify us immediately (via Blorp, the official support system, or our official channels) if you suspect unauthorized access to your account. We may suspend an account while we investigate suspected compromise.</li>
                    <li><strong>Account responsibility.</strong> You are responsible for content posted and actions taken through your account, including by anyone you allowed to use it.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    5. Personas
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-300/80 ml-2">
                    <li><strong>Slots.</strong> Each account receives 25 free persona slots. Additional slots may be purchased with Chronos in the wallet. Slot purchases are final.</li>
                    <li><strong>Your content.</strong> You retain ownership of the personas you create. By posting or sharing a persona on the Service, you grant Chrona a worldwide, non-exclusive, royalty-free license to host, store, reproduce, and display it solely as needed to operate and provide the Service (including displaying public personas and marketplace listings to other users).</li>
                    <li><strong>Original creator credit.</strong> Every persona carries a unique numeric display ID that remains linked to its original creator, even after a marketplace sale. We will preserve this attribution wherever technically possible.</li>
                    <li><strong>Removal.</strong> We may remove personas that violate these Terms, the Terms &amp; Rules, or applicable law, including personas reported for infringement or prohibited content.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    6. Storylines and SI.FY:// Invites
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-300/80 ml-2">
                    <li><strong>Storylines.</strong> Storyline communities are created and moderated by users. Storyline owners and their appointed moderators set storyline-specific rules and may remove members, subject to these Terms and the Terms &amp; Rules. We do not pre-review storyline content, but we may take action on reports.</li>
                    <li><strong>SI.FY:// invite codes.</strong> Joining a storyline may require a SI.FY:// invite code generated through the Service. Invite codes are <strong>licensed, not owned</strong>: you receive a limited, revocable, non-transferable license to use a code for its intended purpose. All rights in codes remain with us and the issuing storyline.</li>
                    <li><strong>Expiration and limits.</strong> Invite codes may carry expiry dates and usage limits. A code that has expired or been exhausted is invalid, and we are under no obligation to honor, regenerate, extend, or compensate for invalid codes. A storyline owner may revoke codes they issued at any time.</li>
                    <li><strong>No sale of codes.</strong> Selling, trading, or otherwise commercializing invite codes outside the Service&apos;s official features is prohibited.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    7. Scenarios and the allowTrending Opt-In
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-300/80 ml-2">
                    <li><strong>Scenarios.</strong> Scenarios are roleplay premises and setups that you may create, publish, share, and play through. You remain responsible for the content of scenarios you create, and scenario content must comply with these Terms and the Terms &amp; Rules, including all age and maturity restrictions.</li>
                    <li><strong>allowTrending opt-in.</strong> When creating or editing a scenario, you may enable the <strong>allowTrending</strong> option. By enabling it, you consent to your scenario being featured, surfaced, and promoted in the Service&apos;s trending, discovery, and showcase sections. This consent is entirely voluntary.</li>
                    <li><strong>Revocable anytime.</strong> You may withdraw this consent at any time by disabling allowTrending on your scenario. Disabling it stops future featuring; content already cached or displayed by other users&apos; devices may take time to disappear.</li>
                    <li><strong>No compensation.</strong> Featuring a scenario in trending or showcase sections does not create an entitlement to compensation, and we may stop featuring any scenario at any time for any reason, including to comply with these Terms or applicable law.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    8. Message Attachments and Uploads
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-300/80 ml-2">
                    <li><strong>Attachments.</strong> Messages may include image attachments (PNG, JPG, GIF, and WebP), up to a maximum of 5 attachments per message and 8 MB per file. Limits may change as the Service evolves.</li>
                    <li><strong>Your responsibility.</strong> You are solely responsible for the content of every file you upload or attach, including holding any rights needed to post it. You must not upload or attach content that is illegal, that infringes others&apos; rights, that depicts the sexual abuse of any person, or that otherwise violates these Terms or the Terms &amp; Rules.</li>
                    <li><strong>No expectation of privacy toward recipients.</strong> Recipients of a message can view, download, and share attachments you send them. Do not send attachments you would not want shared.</li>
                    <li><strong>Removal.</strong> We may remove attachments that violate these Terms or applicable law, with or without notice, and may take enforcement action against the uploader.</li>
                    <li><strong>Storage.</strong> Uploaded files are stored on our servers or with the image hosting providers we configure. We make no guarantee of permanent availability of any uploaded file and are not liable for loss of uploaded content.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    9. Marketplace and Persona Sales
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Listings.</strong> The Chrona Marketplace allows users to list personas for sale and to purchase personas from other users, using Chronos. You may only list personas you created or otherwise have the right to sell.</li>
                    <li><strong>Revenue split.</strong> When a sale completes, the seller receives the sale price minus the platform fee. The platform fee is 10% of the sale price for listings priced at or below 120 Chronos, and 15% of the sale price for listings priced above 120 Chronos. In other words, creators keep 90% (listings ≤ 120 Chronos) or 85% (listings &gt; 120 Chronos) of each sale.</li>
                    <li><strong>Buyer rights.</strong> Buyers receive a usable copy of the purchased persona with full editing rights. The persona&apos;s display ID and original creator attribution are preserved on the copy.</li>
                    <li><strong>Finality.</strong> All completed sales are final. No exchanges or returns are offered on delivered personas.</li>
                    <li><strong>Failed transactions.</strong> If a transaction fails due to a system error (for example, Chronos were deducted but the persona was not delivered), contact support via Blorp for a full Chronos refund and delivery of the persona. No real-money refunds are available.</li>
                    <li><strong>Prohibited conduct.</strong> Price manipulation, fraudulent listings, and selling stolen or copied personas are serious violations that may result in a permanent ban and forfeiture of Chronos balances.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    10. The Chronos Economy
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>In-platform currency.</strong> Chronos is a virtual currency used within the Service for marketplace purchases, persona slots, profile themes, and similar features. Chronos <strong>have no cash value</strong>, cannot be exchanged for real money, and are not redeemable for any currency or property of any kind.</li>
                    <li><strong>Earning Chronos.</strong> You can receive Chronos through daily claims (a daily bonus available once every 24 hours), marketplace sales, gifts from other users (subject to per-gift minimums and maximums), and other features we may provide.</li>
                    <li><strong>Gifting.</strong> Chronos gifts are transfers between users made at your own discretion. Gifts sent to another user cannot be reversed, including in cases of mistake or later dispute. Do not gift Chronos to anyone you do not trust.</li>
                    <li><strong>No transfer outside the Service.</strong> Selling, trading, or exchanging Chronos for real money, goods, or services outside the Service is strictly prohibited.</li>
                    <li><strong>Balances and adjustments.</strong> We maintain a complete transaction history. In cases of fraud, exploitation of bugs, chargebacks, or system errors, we reserve the right to review your transaction history and adjust your balance so that it reflects legitimate transactions only.</li>
                    <li><strong>No refunds.</strong> Chronos purchases are final and non-refundable, except where required by applicable law or where we determine, at our sole discretion, that a system error caused a loss.</li>
                    <li><strong>Termination.</strong> If your account is terminated for a violation of these Terms, any remaining Chronos balance is forfeited and will not be refunded or converted.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    11. Achievements
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    The Service awards achievements for activity and milestones. Achievements are honorary, carry no cash value, and confer no property rights. We may add, modify, retitle, or retire achievements at any time. Exploiting bugs or using automation to unlock achievements is prohibited and may result in enforcement action and removal of the illegitimately obtained achievements.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    12. Acceptable Use
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    You agree to comply with the Chrona Terms &amp; Rules (Community Guidelines), which form part of these Terms and define prohibited conduct in detail. In summary, you must not:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>Violate any applicable law or regulation, or use the Service to plan or facilitate illegal activity</li>
                    <li>Harass, threaten, defame, or harm other users, or promote hate or discrimination</li>
                    <li>Post or upload illegal content, including any content that sexualizes minors — this is met with zero tolerance</li>
                    <li>Infringe the intellectual property, privacy, or other rights of any person</li>
                    <li>Impersonate Chrona staff, moderators, the Blorp support system, or another user</li>
                    <li>Circumvent age gating, mutes, suspensions, or bans (including by creating additional accounts)</li>
                    <li>Interfere with or disrupt the Service, including via automation, scraping, or exploiting bugs (report bugs to us instead — see the Terms &amp; Rules)</li>
                    <li>Use the Service for unsolicited advertising, spam, or commercial purposes not authorized by us</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    13. Moderation and Enforcement
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Enforcement tools.</strong> We enforce these Terms and the Terms &amp; Rules using a ladder of actions, including warnings, mutes, suspensions, and permanent bans, as described more fully in the Terms &amp; Rules.</li>
                    <li><strong>Severity.</strong> We may skip the normal escalation ladder and immediately suspend or permanently ban an account for severe violations, including child safety violations, illegal content, fraud, and credible threats of harm.</li>
                    <li><strong>Appeals.</strong> If you believe an enforcement action was made in error, you may appeal by contacting Blorp, the official support system, or our official channels. Provide your username, the action taken, and the reasons you believe it should be reconsidered. We will review appeals in good faith and respond when we can.</li>
                    <li><strong>No entitlement.</strong> Enforcement decisions are at our discretion. Nothing in these Terms obligates us to apply any particular action in any particular case.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    14. Termination
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>By you.</strong> You may stop using and delete your account at any time through the Service&apos;s account settings. Deleting your account does not automatically remove messages you sent to others; see the Privacy Policy for retention details.</li>
                    <li><strong>By us.</strong> We may suspend or terminate your account, and delete associated content, at any time if you violate these Terms, if required by law, or if we reasonably believe your account creates legal risk or technical harm for the Service or its users.</li>
                    <li><strong>Effect.</strong> Upon termination for violation: your right to use the Service ceases immediately; your Chronos balance and unclaimed daily bonuses are forfeited; purchased persona slots are not refunded; and you must not create a new account without our permission.</li>
                    <li><strong>Survival.</strong> Sections that by their nature should survive termination (including ownership, disclaimers, liability limitations, and governing terms) survive.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    15. Disclaimers
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;, WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT CONTENT YOU STORE WILL NEVER BE LOST.
                  </p>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    Content on the Service — including personas, storylines, scenarios, and messages — comes from users and fictional roleplay. Views and content expressed by users do not represent our views. AI-assisted features may produce inaccurate or inappropriate output; you are responsible for reviewing anything you send.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    16. Limitation of Liability
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, DATA, GOODWILL, OR CHRONOS, ARISING OUT OF OR RELATING TO YOUR USE OF THE SERVICE — EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                  </p>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    Our total aggregate liability for all claims arising out of or relating to the Service will not exceed the greater of (a) the amount you paid us in real currency in the 12 months preceding the claim, or (b) 50 USD. Some jurisdictions do not allow certain limitations; in those jurisdictions, the limitations apply to the fullest extent permitted.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    17. Changes to These Terms
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    We may modify these Terms at any time. The &quot;Last updated&quot; date at the top of this document reflects the most recent revision. We will notify users of significant changes through the Service (for example, via in-app notices or Blorp messages) before they take effect where practicable.
                  </p>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    Your continued use of the Service after the effective date of changes constitutes acceptance of the updated Terms. If you do not agree to the updated Terms, you must stop using the Service and may delete your account.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    18. Governing Terms and Contact
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Order of precedence.</strong> If a conflict exists between these Terms and the Terms &amp; Rules (Community Guidelines), these Terms control, except where the Terms &amp; Rules impose stricter obligations on you.</li>
                    <li><strong>Entire agreement.</strong> These Terms, together with the Privacy Policy and the Terms &amp; Rules, form the entire agreement between you and Chrona regarding the Service.</li>
                    <li><strong>Severability.</strong> If any provision of these Terms is held unenforceable, the remaining provisions continue in full force.</li>
                    <li><strong>Contact.</strong> Questions about these Terms can be sent to Blorp, the official support system within the Service, or through our official channels.</li>
                  </ul>
                </section>
              </div>
            </TabsContent>

            {/* ================================================================ */}
            {/* PRIVACY POLICY                                                   */}
            {/* ================================================================ */}
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
                    At Chrona, we collect only what we need to run a roleplay platform — no advertising trackers, no data brokerage. This Privacy Policy explains what data we collect, why we collect it, where it lives, how long we keep it, and the rights you have over it. It applies to the Chrona platform and all its features.
                  </p>
                </div>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    1. Data We Collect
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    We collect the following categories of data, broken down by feature:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Account data:</strong> username, password (stored only as a bcrypt hash), date of birth (used solely for age gating and safety enforcement), security key (stored only as a cryptographic hash), and optional avatar and profile banner.</li>
                    <li><strong>Preferences:</strong> theme selection, interface variant, content maturity setting, notification preferences, and similar settings saved to your user record.</li>
                    <li><strong>Personas:</strong> everything that makes up the personas you create — name, description, personality traits and spectrums, backstory, appearance, tags, avatars, and roleplay preferences.</li>
                    <li><strong>Messages:</strong> the content of direct messages and storyline channel messages you send, along with edit history, read receipts, reactions, pins, and bookmarks. This includes <strong>message attachments</strong> (image files) and the metadata about them (file name, type, and size).</li>
                    <li><strong>Uploaded images:</strong> images you upload — avatars, banners, storyline icons, and message attachments — are stored on our servers or with the image hosting provider we configure (see Section 7).</li>
                    <li><strong>Storyline activity:</strong> storylines you create or join, your roles and memberships, channel messages, wiki edits, reviews, and boosts.</li>
                    <li><strong>Invites:</strong> SI.FY:// invite codes you create or use, including expiry and usage information attached to those codes.</li>
                    <li><strong>Social connections:</strong> friends, follows, blocks, and direct-message requests.</li>
                    <li><strong>Transactions:</strong> your Chronos balance, transaction history (claims, gifts, purchases, sales), marketplace listings and purchases, and achievement records.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    2. What We Do NOT Collect
                  </h3>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                    <p className="text-sm leading-relaxed text-emerald-300/80 mb-3">
                      We do NOT collect or use:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-sm text-emerald-300/80 ml-2">
                      <li>❌ Analytics or behavioral tracking profiles</li>
                      <li>❌ Advertising cookies or third-party ad networks</li>
                      <li>❌ Your real name, phone number, or address (never required)</li>
                      <li>❌ Location data or GPS</li>
                      <li>❌ Contact lists, device contacts, or social media imports</li>
                      <li>❌ Browsing history outside the Service</li>
                    </ul>
                    <p className="text-xs text-emerald-300/60 mt-3 italic">
                      Note: our server infrastructure may transiently log IP addresses for rate limiting and abuse prevention. These logs are not associated with your account content and are purged on a short cycle.
                    </p>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    3. How We Use Your Data
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Operating the Service:</strong> authenticating you, showing your personas and messages, delivering real-time updates, and syncing across your devices.</li>
                    <li><strong>Safety and age enforcement:</strong> using your date of birth to enforce the 16+ minimum age, the 18+ requirement for mature content, and interaction restrictions between age brackets.</li>
                    <li><strong>Moderation:</strong> reviewing reported content and enforcing the Terms &amp; Rules.</li>
                    <li><strong>Economy integrity:</strong> maintaining Chronos transaction records to detect fraud, exploitation, and errors, and to support bug-related refunds.</li>
                    <li><strong>Support:</strong> responding to appeals and support requests you send through Blorp or our official channels.</li>
                    <li><strong>Communication:</strong> service notices such as moderation actions, marketplace sale notifications, and Terms changes.</li>
                  </ul>
                  <p className="text-sm leading-relaxed text-slate-300/80 mt-3">
                    We do not use your content to build advertising profiles, and we do not sell your data.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    4. Where Your Data Is Stored
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    Your account records, personas, messages, storyline content, and transaction history are stored in our PocketBase database running on our own server infrastructure. Uploaded images are stored either on the same infrastructure or with an external image hosting provider when we have configured one — in that case only the image files (not your account data) are transmitted to that provider, and the resulting image URLs are stored with the associated message or profile.
                  </p>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    Real-time message delivery uses our chat relay service, which transmits message data between conversation participants and does not retain message contents after delivery.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    5. Sessions, Cookies, and Security Keys
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Session tokens.</strong> When you log in, we issue a JSON Web Token (JWT) session token stored as a browser cookie (or sent as an authorization header by our desktop-style clients). This token is strictly necessary for the Service to function and is invalidated when you log out. We do not use tracking or advertising cookies of any kind.</li>
                    <li><strong>Passwords.</strong> Stored only as bcrypt hashes. Nobody — including us — can read your actual password.</li>
                    <li><strong>Security keys.</strong> Stored only as scrypt hashes. We cannot recover or read your plain-text key.</li>
                    <li><strong>Transport.</strong> All data between you and the Service is encrypted in transit via HTTPS.</li>
                    <li><strong>Rate limiting.</strong> We apply rate limits to sensitive actions to slow down credential stuffing and abuse.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    6. Real-Time Features
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Typing indicators:</strong> shown to your conversation partner while you type; never stored.</li>
                    <li><strong>Read receipts:</strong> when you open a conversation, the sender can see their messages were read.</li>
                    <li><strong>Presence:</strong> your online status and active persona can be shown to users you interact with.</li>
                    <li><strong>Message sync:</strong> messages, edits, reactions, and attachments are delivered live to conversation participants.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    7. Sharing and Third Parties
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>No selling, ever.</strong> We do not sell, rent, or trade your personal data to anyone.</li>
                    <li><strong>Default: no third parties.</strong> By default, your data is not shared with third parties. Your account data stays on our infrastructure.</li>
                    <li><strong>Image hosting:</strong> when we configure an external image host for uploads, the image files you upload are transmitted to that provider for storage and delivery. Only you control which images you upload.</li>
                    <li><strong>Visibility to other users:</strong> your username, avatar, personas, public storylines and scenarios, and the messages you send are visible to their intended audiences (conversation partners, storyline members, or the public, depending on your settings).</li>
                    <li><strong>Legal requirements:</strong> we may disclose data if required by law, or to protect the rights, property, or safety of Chrona, our users, or the public — including in emergencies and in connection with child-safety reports.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    8. AI-Assisted Features
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    Chrona offers optional AI-assisted response suggestions. When you use them, the relevant conversation context is processed in order to generate the suggestion for you. AI suggestions are generated on demand, are not used to build advertising profiles, and you should review any AI-assisted content before sending it — you are responsible for what you send (see the Terms of Service).
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    9. Data Retention
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Messages:</strong> we keep your messages until they are deleted — by you, by the recipient (deleting their own messages), or when a conversation history is cleared (which permanently removes it for both participants). Clearing a history is irreversible.</li>
                    <li><strong>Attachments:</strong> attached images are retained as long as the message they belong to exists.</li>
                    <li><strong>Deleted accounts:</strong> when you delete your account, your profile and personal identifiers are anonymized within approximately 30 days. Data that must be retained for integrity (such as anonymized transaction records required to keep the Chronos ledger consistent, or records we must keep for legal reasons) may persist in anonymized form.</li>
                    <li><strong>Moderation records:</strong> enforcement actions (warnings, mutes, suspensions, bans) are retained for as long as necessary to enforce our rules and handle appeals, including to detect ban evasion.</li>
                    <li><strong>Backups:</strong> we may maintain short-lived infrastructure backups; deletion requests take effect in production immediately and propagate to backups as they cycle.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    10. Your Rights
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Access and export:</strong> you can review your profile, personas, and preferences in the app, and you can request an export of your personal data by contacting support.</li>
                    <li><strong>Correction:</strong> you can edit your profile, personas, and preferences at any time.</li>
                    <li><strong>Deletion:</strong> you can delete individual messages (as sender) and delete your account. You can request deletion of specific personal data that is not editable in-app by contacting support.</li>
                    <li><strong>Objection and restriction:</strong> if you want us to stop a specific processing activity, contact support and we will assess what we can do given our legal obligations.</li>
                    <li><strong>Response times:</strong> we aim to respond to data requests within a reasonable period and may ask for verification of account ownership.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    11. Minors
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    Chrona is not intended for anyone under 16, and we do not knowingly collect data from children under 16. Users aged 16–17 are automatically restricted to &quot;safe&quot; content and can only interact with other users in their age bracket. If we learn that a user under 16 has created an account, we will remove the account. If you believe a minor under 16 is using the Service, contact us via Blorp or our official channels. Mature and explicit content is strictly limited to verified adults aged 18+.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    12. Security Safeguards
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    We protect your data with hashed credentials (bcrypt for passwords, scrypt for security keys), signed JWT sessions, HTTPS transport, access controls on our database, and rate limiting on sensitive endpoints. No method of storage or transmission is perfectly secure, and we cannot guarantee absolute security — but we will notify affected users through the Service if a data breach is confirmed to compromise personal data.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    13. Changes to This Policy
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    We may update this Privacy Policy as the Service evolves. The &quot;Last updated&quot; date at the top reflects the current version, and we will announce significant changes in the Service before they take effect where practicable. Continued use of Chrona after changes take effect means you accept the updated policy.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    14. Contact
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    For privacy questions, data export requests, or deletion requests, contact us through Blorp, the official support system inside the Service, or through our official channels. When submitting a data request, include your username so we can verify ownership of the account.
                  </p>
                </section>
              </div>
            </TabsContent>

            {/* ================================================================ */}
            {/* TERMS & RULES (COMMUNITY GUIDELINES)                             */}
            {/* ================================================================ */}
            <TabsContent value="tar" className="mt-0">
              <div className="space-y-6 text-slate-200/90">
                {/* Header */}
                <div className="bg-slate-900/20 rounded-xl p-4 border border-white/[0.08]">
                  <h2 className="text-2xl font-bold text-slate-100 mb-2">Terms &amp; Rules</h2>
                  <p className="text-sm text-slate-400">Community Guidelines for Chrona — Last updated: October 2026</p>
                </div>

                {/* Intro */}
                <div className="bg-gradient-to-r from-slate-900/20 to-cyan-900/15 rounded-xl p-4 border border-white/[0.08]">
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    Welcome to Chrona! We are a community of storytellers, character builders, and roleplayers. These rules exist so that everyone can create freely and safely. They are part of the Terms of Service, and they apply everywhere on the platform — DMs, storylines, channels, scenarios, personas, marketplace listings, and uploads.
                  </p>
                </div>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    1. Respect Each Other
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>No harassment, bullying, dogpiling, or targeted attacks — in character or out</li>
                    <li>No hate speech or discrimination based on race, ethnicity, nationality, gender, sexuality, religion, age, or disability</li>
                    <li>No threats, incitement, or glorification of violence against real people</li>
                    <li>No publishing anyone&apos;s real personal information (&quot;doxxing&quot;), including your own — keep real identities out of roleplay</li>
                    <li>Respect boundaries: if someone says stop, stop. &quot;No&quot; is a complete sentence</li>
                    <li>Characters are not players — never treat fictional conflict as license to attack the person behind the character</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    2. Content Rules
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Zero tolerance for CSAM.</strong> Any content depicting or sexualizing the abuse of minors — fictional or otherwise — results in an immediate permanent ban, removal of all related content, and a report to the relevant authorities. There are no warnings and no appeals on this point.</li>
                    <li><strong>NSFW content:</strong> explicit content is permitted only within 18+ maturity settings between consenting adults. It must be properly tagged, warned, and kept out of safe spaces. Never send unsolicited explicit content to anyone.</li>
                    <li><strong>Age-bracket separation:</strong> users aged 16–17 are restricted to safe content and safe interactions. Adults must not attempt to interact with minors in mature contexts, and misrepresenting your age to bypass these limits is a severe violation.</li>
                    <li><strong>Graphic content:</strong> intense violence, gore, and dark themes must carry appropriate warnings and tags so people can make informed choices.</li>
                    <li><strong>No illegal content:</strong> no content promoting or depicting real-world illegal activity, terrorism, or the sale of illegal goods — and no illegal content in uploads or attachments.</li>
                    <li><strong>No personal information:</strong> do not share real names, addresses, financial details, or private media of anyone (including yourself).</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    3. Roleplay Etiquette
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>No godmodding:</strong> do not control, injure, or speak for another player&apos;s character in their storylines without their consent — their character is theirs</li>
                    <li><strong>No power-playing:</strong> avoid invincible, plot-warping characters that ruin the story for everyone else</li>
                    <li><strong>Consent first:</strong> agree on direction, tone, and limits (OOC) before major story actions — especially anything intense</li>
                    <li><strong>Stay in context:</strong> keep out-of-character chatter out of in-character scenes (and mark it clearly when it isn&apos;t)</li>
                    <li><strong>Honor the lore:</strong> respect the settings and rules of storylines you join; owners and moderators set the canon</li>
                    <li><strong>Communicate:</strong> if a scene isn&apos;t working for you, say so respectfully rather than ghosting mid-plot</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    4. Messaging and Attachments
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>Do not spam or flood DMs or channels with messages, pings, or attachments</li>
                    <li>Attachments (images) must follow all content rules — you are responsible for every file you send</li>
                    <li>Never send unsolicited explicit or distressing images — this is treated as harassment</li>
                    <li>Do not forward or share private conversations, attachments, or screenshots without the sender&apos;s consent</li>
                    <li>Use reactions and message features in good faith — reaction-spam to mock or dogpile someone is harassment</li>
                    <li>Blocking is a safety tool, not a weapon — respect it and do not circumvent blocks</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    5. Invite Etiquette (SI.FY://)
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>Do not mass-send unsolicited SI.FY:// codes — to strangers, in DMs, or across unrelated storylines</li>
                    <li>Share codes only where they are welcome (invite threads, friends who asked, communities you belong to)</li>
                    <li>Do not farm, brute-force, sell, or trade invite codes; codes are licensed for joining, not currency</li>
                    <li>Respect code limits: expired or exhausted codes are invalid, and pressing owners or staff to revive them is not allowed</li>
                    <li>Do not use invites to raid or brigade other communities</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    6. Marketplace Conduct
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>Only sell personas you created or have the rights to — stolen or copied personas are removed and the seller is actioned</li>
                    <li>Describe listings accurately: no bait names, false previews, or misleading descriptions</li>
                    <li>No price manipulation, shill buying, or Chronos laundering through the marketplace</li>
                    <li>All sales are final; if a transaction fails due to a system bug, contact support (Blorp) for a Chronos refund and delivery</li>
                    <li>Marketplace fraud (scamming, chargeback abuse, fake listings) results in a permanent ban and forfeiture of Chronos</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    7. Spam and Advertising
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>No unsolicited advertising, self-promotion, or links to external services in DMs or storylines</li>
                    <li>No chain messages, copypasta raids, or coordinated spam</li>
                    <li>No botting, scripting, or automation to inflate activity, farm Chronos, or unlock achievements</li>
                    <li>Reporting a genuine bug privately to staff is always welcome — exploiting it is a violation</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    8. Using the Report System
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>Report rule violations with the report button on the offending message, persona, storyline, or user</li>
                    <li>Include context and evidence where possible — it makes review faster and fairer</li>
                    <li>Report in good faith: false or malicious reports are themselves a violation</li>
                    <li>Do not take enforcement into your own hands — harassment in response to harassment is still harassment</li>
                    <li>If something is an immediate safety emergency, also contact the appropriate local authorities</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    9. Enforcement Ladder
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80 mb-3">
                    Moderators enforce these rules along a ladder of escalating actions:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li><strong>Warning:</strong> first-time or minor violations — a formal notice on your record</li>
                    <li><strong>Mute:</strong> repeated or escalating minor violations — temporary loss of messaging ability</li>
                    <li><strong>Suspension:</strong> moderate violations — temporary lockout of your account</li>
                    <li><strong>Ban:</strong> severe or repeated violations — permanent removal, forfeiture of Chronos, and no new accounts</li>
                  </ul>
                  <p className="text-sm leading-relaxed text-slate-300/80 mt-3">
                    Escalation is not always linear. Severity, intent, harm caused, and your history all factor in — and the most serious violations (child safety, illegal content, credible threats, fraud, ban evasion) are met with immediate suspension or a permanent ban, skipping earlier steps. Storyline owners and their moderators may also enforce storyline-specific rules within their communities, up to removal from that storyline.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    10. Appeals
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-sm text-slate-300/80 ml-2">
                    <li>If you believe an action against you was wrong or disproportionate, appeal through <strong>Blorp</strong>, the official support system, or our official channels</li>
                    <li>Include your username, the action taken, and why you believe it should be reconsidered — calmly and factually</li>
                    <li>Appeals are reviewed by staff who were not involved in the original decision where possible</li>
                    <li>One appeal per action: repeated appeals of the same decision will not be re-reviewed absent new information</li>
                    <li>Decisions on appeals are final, and creating alt accounts while suspended or banned counts as ban evasion</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400" />
                    11. Changes to These Rules
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-300/80">
                    We may update these rules at any time. The &quot;Last updated&quot; date reflects the current version, and major changes will be announced in the Service. Continued use of Chrona after changes take effect means you accept the updated rules. Ignorance of the current rules is not a defense — check back occasionally.
                  </p>
                </section>

                {/* Footer Note */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                  <p className="text-sm text-emerald-300/80 text-center">
                    <strong>Questions?</strong> Contact our moderation team through the report system, Blorp, or official channels. Play fair, tag your content, and help keep Chrona a place where stories thrive.
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
