'use client'

import { useState, useEffect, useCallback } from 'react'
import { useChronos, CHRONOS_PRICING } from '@/stores/chronos-store'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Wallet, Clock, Sparkles, Crown, Palette, Image as ImageIcon,
  Plus, Check, Loader2, ChevronRight, Gift, Star, Zap, Send, User, MessageSquare,
  ExternalLink, Receipt
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ReceiptModal } from '@/components/receipt-modal'
import { useToast } from '@/hooks/use-toast'

// Chronos packs with Stripe integration
const CHRONOS_PACKS = [
  { id: 'starter', chronos: 200, bonus: 0, total: 200, price: '$1.99', priceCents: 199, name: 'Starter Pack', popular: false },
  { id: 'standard', chronos: 500, bonus: 50, total: 550, price: '$4.99', priceCents: 499, name: 'Standard Pack', popular: true },
  { id: 'value', chronos: 850, bonus: 150, total: 1000, price: '$9.99', priceCents: 999, name: 'Value Pack', popular: true },
] as const

// Color picker options for name colors
const NAME_COLORS = [
  { name: 'Crimson', color: '#DC143C' },
  { name: 'Orange', color: '#FF6B00' },
  { name: 'Gold', color: '#FFD700' },
  { name: 'Emerald', color: '#10B981' },
  { name: 'Cyan', color: '#00BFFF' },
  { name: 'Blue', color: '#3B82F6' },
  { name: 'White', color: '#FFFFFF' },
  { name: 'Pink', color: '#EC4899' },
  { name: 'Rose', color: '#F43F5E' },
  { name: 'Teal', color: '#14B8A6' },
  { name: 'Indigo', color: '#6366F1' },
  { name: 'Amber', color: '#F59E0B' },
]

// Theme presets
const THEME_PRESETS = [
  { id: 'theme-sunset', name: 'Sunset', price: 100, background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)', borderColor: '#ff6b6b', textColor: '#ffffff', accentColor: '#feca57' },
  { id: 'theme-ocean', name: 'Ocean', price: 150, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderColor: '#667eea', textColor: '#ffffff', accentColor: '#764ba2' },
  { id: 'theme-forest', name: 'Forest', price: 150, background: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)', borderColor: '#71b280', textColor: '#ffffff', accentColor: '#134e5e' },
  { id: 'theme-night', name: 'Night Sky', price: 200, background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', borderColor: '#302b63', textColor: '#a5b4fc', accentColor: '#818cf8' },
  { id: 'theme-aurora', name: 'Aurora', price: 250, background: 'linear-gradient(135deg, #00c9ff 0%, #92fe9d 100%)', borderColor: '#00c9ff', textColor: '#0f172a', accentColor: '#92fe9d' },
  { id: 'theme-fire', name: 'Fire', price: 200, background: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)', borderColor: '#f12711', textColor: '#ffffff', accentColor: '#f5af19' },
  { id: 'theme-cosmic', name: 'Cosmic', price: 300, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', borderColor: '#e94560', textColor: '#eaeaea', accentColor: '#e94560' },
  { id: 'theme-lavender', name: 'Lavender', price: 175, background: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', borderColor: '#a18cd1', textColor: '#1f2937', accentColor: '#fbc2eb' },
]

// Purchase history type
interface ChronosPurchaseRecord {
  id: string
  packId: string
  chronosAmount: number
  bonusAmount: number
  totalChronos: number
  priceUsd: string
  receiptNumber: string | null
  paymentStatus: string
  createdAt: string
  completedAt: string | null
}

export function WalletPage() {
  const { user } = useAuth()
  const { data, isLoading, error, refresh, purchaseSlot, purchaseNameColor, purchaseTheme, giftChronos } = useChronos()
  const [activeTab, setActiveTab] = useState('overview')
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Stripe checkout state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false)

  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<ChronosPurchaseRecord | null>(null)

  // Purchase history
  const [purchaseHistory, setPurchaseHistory] = useState<ChronosPurchaseRecord[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Gift state
  const [giftRecipient, setGiftRecipient] = useState('')
  const [giftAmount, setGiftAmount] = useState('')
  const [giftMessage, setGiftMessage] = useState('')
  const [isGifting, setIsGifting] = useState(false)
  const [giftError, setGiftError] = useState<string | null>(null)
  const { toast } = useToast()

  // Check for successful purchase on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const chronosPurchase = urlParams.get('chronos_purchase')
    const purchaseId = urlParams.get('purchase_id')

    if (chronosPurchase === 'success' && purchaseId) {
      // Show receipt modal for successful purchase
      fetchPurchaseAndShowReceipt(purchaseId)
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
      // Refresh balance
      refresh()
    }
  }, [])

  const fetchPurchaseAndShowReceipt = async (purchaseId: string) => {
    try {
      const response = await fetch(`/api/chronos/purchases?id=${purchaseId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedPurchase(data.purchase)
        setShowReceiptModal(true)
      }
    } catch (error) {
      console.error('Error fetching purchase:', error)
    }
  }

  const fetchPurchaseHistory = useCallback(async () => {
    if (activeTab !== 'history') return

    setIsLoadingHistory(true)
    try {
      const response = await fetch('/api/chronos/purchases')
      if (response.ok) {
        const data = await response.json()
        setPurchaseHistory(data.purchases || [])
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [activeTab])

  useEffect(() => {
    fetchPurchaseHistory()
  }, [fetchPurchaseHistory])

  // Handle Stripe checkout
  const handleBuyChronos = async (packId: string) => {
    setIsProcessingPayment(true)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/chronos/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start checkout')
      }

      // Redirect to Stripe checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
      }
    } catch (error) {
      console.error('Checkout error:', error)
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to start checkout', variant: 'destructive' })
      setIsProcessingPayment(false)
    }
  }

  const handlePurchaseSlot = async () => {
    setPurchasing('slot')
    setSuccessMessage(null)
    const result = await purchaseSlot()
    setPurchasing(null)

    if (result.success) {
      if (result.isFirstPurchase) {
        setSuccessMessage(`🎉 First purchase bonus! You received ${result.bonusReceived} Chronos back!`)
      } else {
        setSuccessMessage('✅ Extra persona slot purchased!')
      }
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to purchase slot', variant: 'destructive' })
    }
  }

  const handlePurchaseNameColor = async (color: string) => {
    setPurchasing(`color-${color}`)
    setSuccessMessage(null)
    const result = await purchaseNameColor(color)
    setPurchasing(null)

    if (result.success) {
      if (result.isFirstPurchase) {
        setSuccessMessage(`🎉 First purchase bonus! You received ${result.bonusReceived} Chronos back!`)
      } else {
        setSuccessMessage('✅ Name color updated!')
      }
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to purchase name color', variant: 'destructive' })
    }
  }

  const handlePurchaseTheme = async (themeId: string) => {
    setPurchasing(`theme-${themeId}`)
    setSuccessMessage(null)
    const result = await purchaseTheme(themeId)
    setPurchasing(null)

    if (result.success) {
      if (result.isFirstPurchase) {
        setSuccessMessage(`🎉 First purchase bonus! You received ${result.bonusReceived} Chronos back!`)
      } else {
        setSuccessMessage('✅ Theme purchased!')
      }
    } else {
      toast({ title: 'Error', description: result.error || 'Failed to purchase theme', variant: 'destructive' })
    }
  }

  const handleGift = async () => {
    setGiftError(null)
    setIsGifting(true)

    const amount = parseInt(giftAmount, 10)
    if (isNaN(amount) || amount < 10) {
      setGiftError('Minimum gift amount is 10 Chronos')
      setIsGifting(false)
      return
    }

    if (amount > CHRONOS_PRICING.MAX_GIFT_AMOUNT) {
      setGiftError(`Maximum gift amount is ${CHRONOS_PRICING.MAX_GIFT_AMOUNT} Chronos at a time`)
      setIsGifting(false)
      return
    }

    if (!giftRecipient.trim()) {
      setGiftError('Please enter a recipient username')
      setIsGifting(false)
      return
    }

    const result = await giftChronos(giftRecipient.trim(), amount, giftMessage.trim() || undefined)

    setIsGifting(false)

    if (result.success) {
      setSuccessMessage(`🎁 Successfully gifted ${result.amount} Chronos to @${result.recipientUsername}!`)
      setGiftRecipient('')
      setGiftAmount('')
      setGiftMessage('')
      setActiveTab('overview')
    } else {
      setGiftError(result.error || 'Failed to send gift')
    }
  }

  const openReceipt = (purchase: ChronosPurchaseRecord) => {
    setSelectedPurchase(purchase)
    setShowReceiptModal(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-400">{error}</p>
        <Button onClick={refresh} variant="outline">Retry</Button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col persona-bg">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Chronos Wallet</h1>
              <p className="text-white/50 text-sm">Manage your currency and purchases</p>
            </div>
          </div>

          {/* Balance Card */}
          <div className="mt-6 p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-300/70 text-sm font-medium">Your Balance</p>
                <div className="flex items-center gap-3 mt-1">
                  <Clock className="w-8 h-8 text-amber-400" />
                  <span className="text-4xl font-bold text-amber-400">{data?.chronos.toLocaleString() || 0}</span>
                  <span className="text-amber-300/70 text-lg">Chronos</span>
                </div>
              </div>
              {!data?.hasFirstPurchaseBonus && (
                <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-amber-400" />
                    <span className="text-amber-300 font-medium text-sm">2x Bonus on First Purchase!</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-400" />
              <span className="text-emerald-300">{successMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto p-6 h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="bg-white/5 border border-white/10 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white/10">Overview</TabsTrigger>
              <TabsTrigger value="buy" className="data-[state=active]:bg-white/10">Buy Chronos</TabsTrigger>
              <TabsTrigger value="gift" className="data-[state=active]:bg-white/10">Gift</TabsTrigger>
              <TabsTrigger value="shop" className="data-[state=active]:bg-white/10">Shop</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-white/10">History</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto mt-4">
              <div className="grid gap-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-white/5 border-white/15">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                          <Crown className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-gray-400/60 text-xs">Persona Slots</p>
                          <p className="text-white font-semibold">{data?.slots.used}/{data?.slots.total}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/5 border-white/15">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-gray-400/60 text-xs">Daily Images</p>
                          <p className="text-white font-semibold">{data?.dailyImagesUsed}/{data?.dailyImagesLimit}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card className="bg-white/5 border-white/15">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <button
                      onClick={handlePurchaseSlot}
                      disabled={purchasing === 'slot' || (data?.chronos || 0) < CHRONOS_PRICING.PERSONA_SLOT}
                      className="w-full p-4 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Plus className="w-5 h-5 text-gray-400" />
                        <div className="text-left">
                          <p className="text-white font-medium">Buy Extra Persona Slot</p>
                          <p className="text-gray-400/60 text-xs">Permanent • 25 free slots included</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-400 font-semibold">{CHRONOS_PRICING.PERSONA_SLOT}</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('shop')}
                      className="w-full p-4 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Palette className="w-5 h-5 text-gray-400" />
                        <div className="text-left">
                          <p className="text-white font-medium">Browse Shop</p>
                          <p className="text-gray-400/60 text-xs">Themes, colors, and more</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400/60" />
                    </button>
                  </CardContent>
                </Card>

                {/* Current Name Color */}
                {data?.nameColor && (
                  <Card className="bg-white/5 border-white/15">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-white">Your Name Color</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg border-2"
                          style={{ backgroundColor: data.nameColor, borderColor: data.nameColor }}
                        />
                        <span className="text-white font-medium" style={{ color: data.nameColor }}>
                          {user?.username}
                        </span>
                        <span className="text-gray-400/60 text-sm">• Active globally</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Buy Chronos Tab */}
            <TabsContent value="buy" className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-6">
                {/* First Purchase Bonus Banner */}
                {!data?.hasFirstPurchaseBonus && (
                  <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-amber-300 font-semibold">🎉 First Purchase Bonus!</p>
                        <p className="text-amber-200/70 text-sm">Your first Chronos pack purchase gives bonus Chronos!</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chronos Packs */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-400" />
                    Chronos Packs
                  </h3>
                  <p className="text-gray-400/60 text-sm mb-4">
                    Purchase Chronos securely via Stripe. Instant delivery after payment.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {CHRONOS_PACKS.map((pack) => (
                      <button
                        key={pack.id}
                        onClick={() => handleBuyChronos(pack.id)}
                        disabled={isProcessingPayment}
                        className="p-4 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/15 hover:border-amber-500/50 hover:from-amber-500/10 hover:to-amber-500/5 transition-all group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {pack.bonus > 0 && (
                          <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-bl-lg">
                            +{pack.bonus} BONUS
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Clock className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
                          <span className="text-2xl font-bold text-amber-400">{pack.total.toLocaleString()}</span>
                        </div>
                        <p className="text-gray-300 text-sm text-center">Chronos</p>
                        <div className="mt-3 py-2 rounded-lg bg-white/10 group-hover:bg-amber-500/20 transition-colors">
                          <span className="text-white font-semibold">{pack.price}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* What can you do section */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">What Can You Do With Chronos?</h3>
                  <div className="grid gap-3">
                    <div className="p-4 rounded-xl bg-white/5 border border-white/15 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Plus className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">Extra Persona Slots</p>
                        <p className="text-gray-400/60 text-sm">200 Chronos per slot • Permanent</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/15 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <Crown className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">Create Storylines</p>
                        <p className="text-gray-400/60 text-sm">500 Chronos • Create your own server</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/15 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                        <Palette className="w-6 h-6 text-pink-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">Name Colors</p>
                        <p className="text-gray-400/60 text-sm">300 Chronos • Stand out everywhere</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/15 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">Profile Themes</p>
                        <p className="text-gray-400/60 text-sm">100-300 Chronos • Customize your character profiles</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Gift Tab */}
            <TabsContent value="gift" className="flex-1 overflow-y-auto mt-4">
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/25">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Gift Chronos</h3>
                    <p className="text-gray-400/60 text-sm">Send Chronos to friends with an optional message</p>
                  </div>
                </div>

                {/* Gift Form */}
                <Card className="bg-white/5 border-white/15">
                  <CardContent className="p-6 space-y-5">
                    {/* Current Balance */}
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-amber-300/80 text-sm">Your Balance</span>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-400 font-semibold">{data?.chronos.toLocaleString() || 0}</span>
                      </div>
                    </div>

                    {/* Error Message */}
                    {giftError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {giftError}
                      </div>
                    )}

                    {/* Recipient */}
                    <div className="space-y-2">
                      <label className="text-sm text-gray-300/80 font-medium flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Recipient Username
                      </label>
                      <input
                        type="text"
                        value={giftRecipient}
                        onChange={(e) => setGiftRecipient(e.target.value)}
                        placeholder="Enter username..."
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-gray-500/40 focus:outline-none focus:border-white/50 transition-colors"
                      />
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                      <label className="text-sm text-gray-300/80 font-medium flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Amount
                      </label>
                      <input
                        type="number"
                        value={giftAmount}
                        onChange={(e) => setGiftAmount(e.target.value)}
                        placeholder={`Min 10, Max ${CHRONOS_PRICING.MAX_GIFT_AMOUNT} Chronos`}
                        min={10}
                        max={CHRONOS_PRICING.MAX_GIFT_AMOUNT}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-gray-500/40 focus:outline-none focus:border-white/50 transition-colors"
                      />
                      {/* Quick amounts */}
                      <div className="flex gap-2 flex-wrap">
                        {[50, 100, 250, 500, 1000].map((amount) => (
                          <button
                            key={amount}
                            onClick={() => setGiftAmount(amount.toString())}
                            disabled={(data?.chronos || 0) < amount}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-gray-300 text-sm hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {amount}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Message (Optional) */}
                    <div className="space-y-2">
                      <label className="text-sm text-gray-300/80 font-medium flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Message <span className="text-gray-400/50 font-normal">(Optional)</span>
                      </label>
                      <textarea
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value.slice(0, 200))}
                        placeholder="Add a personal message..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-gray-500/40 focus:outline-none focus:border-white/50 transition-colors resize-none"
                      />
                      <p className="text-xs text-gray-400/50 text-right">{giftMessage.length}/200</p>
                    </div>

                    {/* Send Button */}
                    <Button
                      onClick={handleGift}
                      disabled={isGifting || !giftRecipient.trim() || !giftAmount || parseInt(giftAmount) < 10 || parseInt(giftAmount) > CHRONOS_PRICING.MAX_GIFT_AMOUNT || (data?.chronos || 0) < parseInt(giftAmount || '0')}
                      className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold py-6 rounded-xl shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGifting ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Sending Gift...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Send className="w-5 h-5" />
                          <span>Send Gift</span>
                          {giftAmount && parseInt(giftAmount) >= 10 && (
                            <span className="ml-1">({parseInt(giftAmount).toLocaleString()} Chronos)</span>
                          )}
                        </div>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Info Card */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/15">
                  <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    How Gifting Works
                  </h4>
                  <ul className="text-sm text-gray-300/70 space-y-1.5">
                    <li>• Chronos are transferred directly to the recipient</li>
                    <li>• Minimum gift amount is 10 Chronos</li>
                    <li>• Maximum gift amount is {CHRONOS_PRICING.MAX_GIFT_AMOUNT} Chronos at a time</li>
                    <li>• The recipient will receive a notification</li>
                    <li>• Gifts cannot be reversed once sent</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Shop Tab */}
            <TabsContent value="shop" className="flex-1 overflow-y-auto mt-4 space-y-6">
              {/* Name Colors */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-gray-400" />
                  Name Colors
                </h3>
                <p className="text-gray-400/60 text-sm mb-3">
                  Your name will appear in this color everywhere • {CHRONOS_PRICING.NAME_COLOR} Chronos each
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {NAME_COLORS.map(({ name, color }) => (
                    <button
                      key={color}
                      onClick={() => handlePurchaseNameColor(color)}
                      disabled={purchasing === `color-${color}` || (data?.chronos || 0) < CHRONOS_PRICING.NAME_COLOR}
                      className={`p-3 rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        data?.nameColor === color
                          ? 'bg-white/10 border-white/30'
                          : 'bg-white/5 border-white/15 hover:bg-white/5'
                      }`}
                    >
                      <div
                        className="w-full aspect-square rounded-lg mb-2 flex items-center justify-center"
                        style={{ backgroundColor: color }}
                      >
                        {data?.nameColor === color && <Check className="w-5 h-5 text-white" />}
                      </div>
                      <p className="text-xs text-white truncate">{name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Themes */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-gray-400" />
                  Profile Themes
                </h3>
                <p className="text-gray-400/60 text-sm mb-3">
                  Apply beautiful themes to your character profiles
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {THEME_PRESETS.map((theme) => {
                    const isOwned = data?.ownedThemes.includes(theme.id)
                    return (
                      <button
                        key={theme.id}
                        onClick={() => !isOwned && handlePurchaseTheme(theme.id)}
                        disabled={purchasing === `theme-${theme.id}` || (!isOwned && (data?.chronos || 0) < theme.price)}
                        className={`p-3 rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          isOwned
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-white/5 border-white/15 hover:bg-white/5'
                        }`}
                      >
                        <div
                          className="w-full aspect-video rounded-lg mb-2 flex items-center justify-center relative overflow-hidden"
                          style={{ background: theme.background }}
                        >
                          {isOwned && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <Check className="w-6 h-6 text-white" />
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-white font-medium">{theme.name}</p>
                        <div className="flex items-center justify-between mt-1">
                          {isOwned ? (
                            <span className="text-xs text-emerald-400">Owned</span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span className="text-xs text-amber-400">{theme.price}</span>
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="flex-1 overflow-hidden mt-4">
              <Card className="bg-white/5 border-white/15 h-full">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Purchase History</CardTitle>
                  <CardDescription>Your Chronos purchases and transaction history</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {/* Chronos Pack Purchases */}
                    {purchaseHistory.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                          <Receipt className="w-4 h-4" />
                          Chronos Pack Purchases
                        </h4>
                        <div className="space-y-2">
                          {purchaseHistory.map((purchase) => (
                            <button
                              key={purchase.id}
                              onClick={() => openReceipt(purchase)}
                              className="w-full p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/5 transition-colors flex items-center justify-between text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                  purchase.paymentStatus === 'completed'
                                    ? 'bg-emerald-500/20'
                                    : purchase.paymentStatus === 'pending'
                                    ? 'bg-amber-500/20'
                                    : 'bg-red-500/20'
                                }`}>
                                  {purchase.paymentStatus === 'completed' ? (
                                    <Check className="w-5 h-5 text-emerald-400" />
                                  ) : purchase.paymentStatus === 'pending' ? (
                                    <Loader2 className="w-5 h-5 text-amber-400" />
                                  ) : (
                                    <Clock className="w-5 h-5 text-red-400" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-white text-sm font-medium">
                                    {purchase.totalChronos.toLocaleString()} Chronos
                                  </p>
                                  <p className="text-gray-400/50 text-xs">
                                    {format(new Date(purchase.createdAt), 'MMM d, yyyy • h:mm a')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-white font-semibold">{purchase.priceUsd}</p>
                                  <p className="text-gray-400/50 text-xs capitalize">{purchase.paymentStatus}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400/50" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Transaction History Divider */}
                    {purchaseHistory.length > 0 && data?.transactions.length && (
                      <div className="border-t border-white/10 pt-4 mt-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-3">Other Transactions</h4>
                      </div>
                    )}

                    {/* Transaction History */}
                    {data?.transactions.length === 0 && purchaseHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-gray-400/30 mx-auto mb-3" />
                        <p className="text-gray-400/60">No transactions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data?.transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between"
                          >
                            <div>
                              <p className="text-white text-sm">{tx.description}</p>
                              <p className="text-gray-400/50 text-xs">
                                {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                              </p>
                              <p className="text-gray-400/50 text-xs">Balance: {tx.balance}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        purchaseId={selectedPurchase?.id}
        purchaseData={selectedPurchase ? {
          ...selectedPurchase,
          receiptData: null
        } : undefined}
      />
    </div>
  )
}
