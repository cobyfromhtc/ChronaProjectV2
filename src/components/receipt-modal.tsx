'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Clock, Check, Download, X, Loader2, Sparkles, Receipt, Calendar, User, CreditCard, Hash } from 'lucide-react'
import { format } from 'date-fns'

interface ReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  purchaseId?: string
  purchaseData?: PurchaseData
}

interface PurchaseData {
  id: string
  packId: string
  chronosAmount: number
  bonusAmount: number
  totalChronos: number
  priceUsd: string
  priceCents: number
  receiptNumber: string | null
  paymentStatus: string
  createdAt: string
  completedAt: string | null
  receiptData?: string | null
}

// Pack name mapping
const PACK_NAMES: Record<string, string> = {
  starter: 'Starter Pack',
  standard: 'Standard Pack',
  value: 'Value Pack',
}

export function ReceiptModal({ isOpen, onClose, purchaseId, purchaseData }: ReceiptModalProps) {
  const [purchase, setPurchase] = useState<PurchaseData | null>(purchaseData || null)
  const [username, setUsername] = useState<string>('')
  const [isLoading, setIsLoading] = useState(!purchaseData && !!purchaseId)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (purchaseData) {
      setPurchase(purchaseData)
      return
    }

    if (!purchaseId || !isOpen) return

    const fetchPurchase = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/chronos/purchases?id=${purchaseId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch purchase details')
        }

        const data = await response.json()
        setPurchase(data.purchase)
        setUsername(data.user?.username || '')
      } catch (err) {
        console.error('Error fetching purchase:', err)
        setError('Failed to load receipt')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPurchase()
  }, [purchaseId, purchaseData, isOpen])

  // Parse receipt data if available
  const receiptInfo = purchase?.receiptData ? JSON.parse(purchase.receiptData) : null
  const displayName = receiptInfo?.username || username
  const displayDate = purchase?.completedAt || purchase?.createdAt

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 bg-transparent border-0 shadow-none overflow-visible">
        
        <div className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 rounded-2xl border border-white/20 shadow-2xl shadow-white/10 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-gray-600/50 to-gray-500/50 px-6 py-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-white">
                    Purchase Receipt
                  </DialogTitle>
                  <p className="text-gray-200/70 text-sm">
                    Chronos Transaction
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>

          {/* Paper UI Content */}
          <div className="p-6">
            <div className="relative">
              {/* Paper texture background */}
              <div
                className="absolute inset-0 rounded-xl opacity-50"
                style={{
                  backgroundImage: `
                    linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.03) 50%, transparent 100%),
                    linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)
                  `,
                  backgroundSize: '100% 100%, 100% 24px',
                }}
              />

              {/* Paper container */}
              <div className="relative bg-gradient-to-br from-slate-50 via-white to-slate-100 rounded-xl border border-slate-200 shadow-inner p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <X className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <p className="text-red-500">{error}</p>
                  </div>
                ) : purchase ? (
                  <div className="space-y-5">
                    {/* Receipt Header */}
                    <div className="text-center pb-4 border-b border-slate-200">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Clock className="w-6 h-6 text-amber-500" />
                        <span className="text-2xl font-bold text-slate-800">
                          {purchase.totalChronos.toLocaleString()}
                        </span>
                        <span className="text-slate-500 font-medium">Chronos</span>
                      </div>
                      {purchase.paymentStatus === 'completed' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                          <Check className="w-4 h-4" />
                          Payment Complete
                        </div>
                      )}
                    </div>

                    {/* Receipt Details */}
                    <div className="space-y-3">
                      {/* Receipt Number */}
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Hash className="w-4 h-4" />
                          <span className="text-sm">Receipt #</span>
                        </div>
                        <span className="text-slate-800 font-mono text-sm font-medium">
                          {purchase.receiptNumber || 'N/A'}
                        </span>
                      </div>

                      {/* Pack */}
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-sm">Pack</span>
                        </div>
                        <span className="text-slate-800 text-sm font-medium">
                          {PACK_NAMES[purchase.packId] || purchase.packId}
                        </span>
                      </div>

                      {/* Amount Paid */}
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500">
                          <CreditCard className="w-4 h-4" />
                          <span className="text-sm">Amount Paid</span>
                        </div>
                        <span className="text-slate-800 text-sm font-bold">
                          {purchase.priceUsd} USD
                        </span>
                      </div>

                      {/* Chronos Breakdown */}
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">Chronos</span>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-800 text-sm font-medium">
                            {purchase.chronosAmount.toLocaleString()} base
                          </div>
                          {purchase.bonusAmount > 0 && (
                            <div className="text-emerald-600 text-xs">
                              +{purchase.bonusAmount} bonus
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">Date</span>
                        </div>
                        <span className="text-slate-800 text-sm">
                          {displayDate ? format(new Date(displayDate), 'MMM d, yyyy • h:mm a') : 'N/A'}
                        </span>
                      </div>

                      {/* Username */}
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2 text-slate-500">
                          <User className="w-4 h-4" />
                          <span className="text-sm">Account</span>
                        </div>
                        <span className="text-slate-800 text-sm font-medium">
                          @{displayName || 'User'}
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="pt-4 mt-4 border-t border-slate-200 text-center">
                      <p className="text-slate-400 text-xs">
                        Thank you for your purchase!
                      </p>
                      <p className="text-slate-300 text-xs mt-1">
                        Keep this receipt for your records
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 pb-6">
            <Button
              onClick={onClose}
              className="w-full bg-white/10 hover:bg-white/15 text-gray-200 border border-white/20"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
