'use client'

import { useState, useEffect } from 'react'
import { useChronos, CHRONOS_PRICING, CHRONOS_PACKS } from '@/stores/chronos-store'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Wallet, Clock, Sparkles, Crown, Palette, Image as ImageIcon, 
  Plus, Check, Loader2, ChevronRight, Gift, Star, Zap
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

// Color picker options for name colors
const NAME_COLORS = [
  { name: 'Crimson', color: '#DC143C' },
  { name: 'Orange', color: '#FF6B00' },
  { name: 'Gold', color: '#FFD700' },
  { name: 'Emerald', color: '#10B981' },
  { name: 'Cyan', color: '#00BFFF' },
  { name: 'Blue', color: '#3B82F6' },
  { name: 'Purple', color: '#8B5CF6' },
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

export function WalletPage() {
  const { user } = useAuth()
  const { data, isLoading, error, refresh, purchaseSlot, purchaseNameColor, purchaseTheme } = useChronos()
  const [activeTab, setActiveTab] = useState('overview')
  const [purchasing, setPurchasing] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Use data.nameColor directly instead of local state

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
      alert(result.error || 'Failed to purchase slot')
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
      alert(result.error || 'Failed to purchase name color')
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
      alert(result.error || 'Failed to purchase theme')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
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
    <div className="h-full flex flex-col bg-gradient-to-b from-[#090517] via-[#120a24] to-[#100827]">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-purple-500/15">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Wallet className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Chronos Wallet</h1>
              <p className="text-purple-400/60 text-sm">Manage your currency and purchases</p>
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
            <TabsList className="bg-purple-500/10 border border-purple-500/20 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-purple-500/20">Overview</TabsTrigger>
              <TabsTrigger value="buy" className="data-[state=active]:bg-purple-500/20">Buy Chronos</TabsTrigger>
              <TabsTrigger value="shop" className="data-[state=active]:bg-purple-500/20">Shop</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-purple-500/20">History</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="flex-1 overflow-y-auto mt-4">
              <div className="grid gap-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                          <Crown className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-purple-400/60 text-xs">Persona Slots</p>
                          <p className="text-white font-semibold">{data?.slots.used}/{data?.slots.total}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-purple-500/5 border-purple-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-purple-400/60 text-xs">Daily Images</p>
                          <p className="text-white font-semibold">{data?.dailyImagesUsed}/{data?.dailyImagesLimit}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card className="bg-purple-500/5 border-purple-500/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-white">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <button
                      onClick={handlePurchaseSlot}
                      disabled={purchasing === 'slot' || (data?.chronos || 0) < CHRONOS_PRICING.PERSONA_SLOT}
                      className="w-full p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Plus className="w-5 h-5 text-purple-400" />
                        <div className="text-left">
                          <p className="text-white font-medium">Buy Extra Persona Slot</p>
                          <p className="text-purple-400/60 text-xs">Permanent • 25 free slots included</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-400 font-semibold">{CHRONOS_PRICING.PERSONA_SLOT}</span>
                      </div>
                    </button>

                    <button
                      onClick={() => setActiveTab('shop')}
                      className="w-full p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/15 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Palette className="w-5 h-5 text-purple-400" />
                        <div className="text-left">
                          <p className="text-white font-medium">Browse Shop</p>
                          <p className="text-purple-400/60 text-xs">Themes, colors, and more</p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-purple-400/60" />
                    </button>
                  </CardContent>
                </Card>

                {/* Current Name Color */}
                {data?.nameColor && (
                  <Card className="bg-purple-500/5 border-purple-500/20">
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
                        <span className="text-purple-400/60 text-sm">• Active globally</span>
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
                        <p className="text-amber-200/70 text-sm">Your first purchase will give you DOUBLE the value back as bonus Chronos!</p>
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
                  <p className="text-purple-400/60 text-sm mb-4">
                    Purchase Chronos to unlock premium features, extra slots, and customization options.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {CHRONOS_PACKS.map((pack) => (
                      <button
                        key={pack.id}
                        className="p-4 rounded-xl bg-gradient-to-b from-purple-500/10 to-purple-500/5 border border-purple-500/20 hover:border-amber-500/50 hover:from-amber-500/10 hover:to-amber-500/5 transition-all group relative overflow-hidden"
                      >
                        {pack.bonus > 0 && (
                          <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-bl-lg">
                            +{pack.bonus} BONUS
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <Clock className="w-6 h-6 text-amber-400 group-hover:scale-110 transition-transform" />
                          <span className="text-2xl font-bold text-amber-400">{(pack.chronos + pack.bonus).toLocaleString()}</span>
                        </div>
                        <p className="text-purple-300 text-sm text-center">Chronos</p>
                        <div className="mt-3 py-2 rounded-lg bg-purple-500/20 group-hover:bg-amber-500/20 transition-colors">
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
                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Plus className="w-6 h-6 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">Extra Persona Slots</p>
                        <p className="text-purple-400/60 text-sm">200 Chronos per slot • Permanent</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <Crown className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">Create Storylines</p>
                        <p className="text-purple-400/60 text-sm">500 Chronos • Create your own server</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                        <Palette className="w-6 h-6 text-pink-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">Name Colors</p>
                        <p className="text-purple-400/60 text-sm">300 Chronos • Stand out everywhere</p>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">Profile Themes</p>
                        <p className="text-purple-400/60 text-sm">100-300 Chronos • Customize your character profiles</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Shop Tab */}
            <TabsContent value="shop" className="flex-1 overflow-y-auto mt-4 space-y-6">
              {/* Name Colors */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-purple-400" />
                  Name Colors
                </h3>
                <p className="text-purple-400/60 text-sm mb-3">
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
                          ? 'bg-purple-500/20 border-purple-500/50' 
                          : 'bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10'
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
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Profile Themes
                </h3>
                <p className="text-purple-400/60 text-sm mb-3">
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
                            : 'bg-purple-500/5 border-purple-500/20 hover:bg-purple-500/10'
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
              <Card className="bg-purple-500/5 border-purple-500/20 h-full">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Transaction History</CardTitle>
                  <CardDescription>Your recent Chronos activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {data?.transactions.length === 0 ? (
                      <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-purple-400/30 mx-auto mb-3" />
                        <p className="text-purple-400/60">No transactions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {data?.transactions.map((tx) => (
                          <div 
                            key={tx.id}
                            className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10 flex items-center justify-between"
                          >
                            <div>
                              <p className="text-white text-sm">{tx.description}</p>
                              <p className="text-purple-400/50 text-xs">
                                {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`font-semibold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount}
                              </p>
                              <p className="text-purple-400/50 text-xs">Balance: {tx.balance}</p>
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
    </div>
  )
}
