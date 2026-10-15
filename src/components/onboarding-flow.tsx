'use client'

// First-login onboarding flow (Task 2-a)
// Shown full-screen instead of the app shell while user.onboarded is falsy.
// Phases: UI-variant picker → 7-step tutorial → finish (POST /api/onboarding/complete).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Compass,
  Loader2,
  MessageCircle,
  PartyPopper,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Store,
  UserPlus,
  Users,
  Wand2,
  X,
} from 'lucide-react'
import { useUIVariant, UI_VARIANT_INFO, type UIVariant } from '@/stores/ui-variant-store'
import { apiFetch, parseJsonResponse } from '@/lib/api-client'

// ============================================================
// Types & constants
// ============================================================

interface OnboardingFlowProps {
  /** Called when the user is done with onboarding (completed, skipped, or dismissed after an error). */
  onFinished: () => void
}

type Phase = 'picker' | 'tour' | 'persona' | 'finish'

type SubmitState = 'idle' | 'submitting' | 'success' | 'error'

const PICKER_OPTIONS: { variant: UIVariant; blurb: string; previewAlt: string }[] = [
  {
    variant: 'chrona',
    blurb: 'The classic Chrona experience — navigation rail, glass panels, home dashboard.',
    previewAlt: 'Preview of Chrona V1: a left navigation sidebar with a top bar and a content area.',
  },
  {
    variant: 'chrona-v2',
    blurb: 'A floating glass dock and command palette keep the interface out of your way.',
    previewAlt: 'Preview of Chrona V2: a centered glass panel with a floating pill-shaped dock at the bottom.',
  },
  {
    variant: 'chrona-v3',
    blurb: 'A calm, focused layout with a single centered column. Zero clutter, pure story.',
    previewAlt: 'Preview of Chrona V3: a single narrow centered column on a quiet background.',
  },
]

interface TourStep {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: React.ReactNode
}

// ============================================================
// Mini live-preview mockups (pure CSS, decorative)
// ============================================================

function PreviewRail({ active }: { active: boolean }) {
  // Chrona V1 — classic sidebar shell
  const accent = active ? 'bg-teal-400' : 'bg-zinc-500'
  return (
    <div
      aria-hidden="true"
      className="relative h-full w-full overflow-hidden rounded-xl border border-white/5 bg-zinc-900"
    >
      {/* Sidebar */}
      <div className="absolute inset-y-0 left-0 w-[26%] border-r border-white/5 bg-zinc-800/80 p-1.5">
        <div className={`h-1.5 w-3/4 rounded-full ${accent} opacity-90`} />
        <div className="mt-2 space-y-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`h-1 rounded ${i === 1 ? accent : 'bg-zinc-600/70'} ${i === 1 ? 'opacity-70' : ''}`} />
          ))}
        </div>
      </div>
      {/* Top bar */}
      <div className="absolute left-[26%] right-0 top-0 flex h-[24%] items-center gap-1 border-b border-white/5 bg-zinc-800/40 px-1.5">
        <div className="h-1.5 w-1/3 rounded bg-zinc-600/70" />
        <div className={`h-1.5 w-3 rounded-full ${accent} opacity-60`} />
      </div>
      {/* Content */}
      <div className="absolute bottom-0 left-[26%] right-0 top-[24%] p-1.5">
        <div className="h-2 w-2/3 rounded bg-zinc-700" />
        <div className="mt-1.5 grid grid-cols-3 gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 rounded-md border border-white/5 bg-zinc-800/60" />
          ))}
        </div>
        <div className="mt-1.5 h-1 w-5/6 rounded bg-zinc-600/50" />
        <div className="mt-1 h-1 w-2/3 rounded bg-zinc-600/40" />
      </div>
    </div>
  )
}

function PreviewDock({ active }: { active: boolean }) {
  // Chrona V2 — floating dock glassmorphism
  const accent = active ? 'bg-violet-400' : 'bg-zinc-500'
  return (
    <div
      aria-hidden="true"
      className="relative h-full w-full overflow-hidden rounded-xl border border-white/5 bg-zinc-900"
    >
      {/* Center glass panel */}
      <div className="absolute inset-x-[16%] top-[10%] h-[54%] rounded-lg border border-white/10 bg-white/[0.04] p-1.5">
        <div className={`h-1.5 w-1/2 rounded-full ${accent} opacity-80`} />
        <div className="mt-2 space-y-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-1 rounded bg-zinc-600/60" />
          ))}
        </div>
      </div>
      {/* Floating pill dock */}
      <div className="absolute bottom-[12%] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-zinc-800/90 px-2.5 py-1.5 shadow-lg shadow-black/40">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full ${i === 2 ? accent : 'bg-zinc-600'}`}
          />
        ))}
      </div>
    </div>
  )
}

function PreviewZen({ active }: { active: boolean }) {
  // Chrona V3 — zen centered column
  const accent = active ? 'bg-rose-400' : 'bg-zinc-500'
  return (
    <div
      aria-hidden="true"
      className="relative h-full w-full overflow-hidden rounded-xl border border-white/5 bg-zinc-900"
    >
      <div className="absolute inset-x-[28%] top-[8%] bottom-[8%] flex flex-col items-center rounded-xl border border-white/5 bg-zinc-800/40 px-2 py-2.5">
        <div className={`h-2 w-2 rounded-full ${accent}`} />
        <div className="mt-2 h-1.5 w-3/4 rounded bg-zinc-600/60" />
        <div className="mt-1.5 h-1.5 w-1/2 rounded bg-zinc-600/40" />
        <div className="mt-2.5 w-full rounded-lg border border-white/5 bg-zinc-800/70 p-1.5">
          <div className="h-1 w-full rounded bg-zinc-600/50" />
          <div className="mt-1 h-1 w-2/3 rounded bg-zinc-600/40" />
        </div>
        <div className="mt-auto h-1.5 w-1/3 rounded-full bg-zinc-700" />
      </div>
    </div>
  )
}

const PREVIEW_COMPONENTS: Record<UIVariant, React.ComponentType<{ active: boolean }>> = {
  chrona: PreviewRail,
  'chrona-v2': PreviewDock,
  'chrona-v3': PreviewZen,
}

// ============================================================
// Tutorial content
// ============================================================

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    icon: PartyPopper,
    title: 'Welcome to Chrona',
    body: (
      <>
        <p>
          Chrona is a roleplay universe where <strong className="font-semibold text-zinc-100">real people</strong> create
          characters, meet each other, and build stories together. Everything you do here happens through{' '}
          <strong className="font-semibold text-zinc-100">personas</strong> — the characters you bring to life.
        </p>
        <p>This quick tour covers the essentials in about a minute. Let&apos;s go.</p>
      </>
    ),
  },
  {
    id: 'personas',
    icon: UserPlus,
    title: 'Creating your first persona',
    body: (
      <>
        <p>
          The persona builder walks you through <strong className="font-semibold text-zinc-100">seven tabs</strong> — looks,
          personality, attributes, backstory, connections, RP preferences, and mature-content settings — so your
          character is as detailed as you want them to be.
        </p>
        <p>
          You get <strong className="font-semibold text-zinc-100">25 free persona slots</strong>, and you can switch
          between your characters at any time.
        </p>
      </>
    ),
  },
  {
    id: 'around',
    icon: Compass,
    title: 'Finding your way around',
    body: (
      <>
        <p>Chrona is organized into a handful of key spaces:</p>
        <ul className="grid w-full gap-2 sm:grid-cols-2" aria-label="Key spaces in Chrona">
          {[
            { icon: Compass, name: 'Discover', text: 'Browse personas and scenario cards from the community.' },
            { icon: Users, name: 'Friends', text: 'Add friends, manage requests, and see who’s online.' },
            { icon: BookOpen, name: 'Storylines', text: 'Your collaborative story servers — join, create, and manage them.' },
            { icon: Coins, name: 'Chronos wallet', text: 'Your balance, daily claims, gifts, and transactions.' },
            { icon: Store, name: 'Marketplace', text: 'List and buy personas with your Chronos.' },
          ].map(({ icon: Icon, name, text }) => (
            <li
              key={name}
              className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-2.5 text-left"
            >
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/25 to-fuchsia-500/25">
                <Icon className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-[13px] font-semibold text-zinc-100">{name}</span>
                <span className="block text-xs leading-relaxed text-zinc-400">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'messaging',
    icon: MessageCircle,
    title: 'Messaging',
    body: (
      <>
        <p>
          Direct messages happen <strong className="font-semibold text-zinc-100">between personas</strong>, not raw
          accounts — you choose which character you speak as. Attach images to your messages, react with emoji, pin
          important moments, and see read receipts.
        </p>
        <p>You can also reply to specific messages and forward the good bits to other conversations.</p>
      </>
    ),
  },
  {
    id: 'storylines',
    icon: BookOpen,
    title: 'Storylines',
    body: (
      <>
        <p>
          Storylines are Chrona&apos;s <strong className="font-semibold text-zinc-100">collaborative servers</strong> —
          dedicated spaces with text channels where a group roleplays an ongoing story together.
        </p>
        <p>
          Invite friends with <span className="rounded-md border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 font-mono text-[12px] text-violet-300">SI.FY://</span>{' '}
          invite codes — generate one per storyline and share it anywhere.
        </p>
      </>
    ),
  },
  {
    id: 'scenarios',
    icon: ScrollText,
    title: 'Scenarios',
    body: (
      <>
        <p>
          Scenarios are short roleplay prompts attached to your persona — a meet-cute, a heist, a slow-burn drama.
          Craft scenario cards for your characters and let people start chats from them.
        </p>
        <p>
          Opting your scenarios into trending is <strong className="font-semibold text-zinc-100">entirely optional</strong> —
          they stay private unless you say otherwise.
        </p>
      </>
    ),
  },
  {
    id: 'safety',
    icon: ShieldCheck,
    title: 'Safety & settings',
    body: (
      <>
        <p>
          You&apos;re in control: set your content maturity, block anyone you don&apos;t want to talk to, and report
          anything that breaks the rules.
        </p>
        <p>
          Your <strong className="font-semibold text-zinc-100">security key</strong> is the master key to your account —
          store it somewhere safe, because you&apos;ll need it every time you log in.
        </p>
      </>
    ),
  },
]

// ============================================================
// Main component
// ============================================================

export function OnboardingFlow({ onFinished }: OnboardingFlowProps) {
  const { variant, setVariant } = useUIVariant()
  const prefersReducedMotion = useReducedMotion()

  const [phase, setPhase] = useState<Phase>('picker')
  const [tourStep, setTourStep] = useState(0) // index into TOUR_STEPS
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [blorpWelcomeSent, setBlorpWelcomeSent] = useState(false)
  const hasSubmittedRef = useRef(false)

  const stepHeadingRef = useRef<HTMLHeadingElement>(null)
  const radioGroupRef = useRef<HTMLDivElement>(null)

  const isLastTourStep = tourStep === TOUR_STEPS.length - 1

  // ---- Completion (POST /api/onboarding/complete) ----

  const submitCompletion = useCallback(() => {
    setSubmitState('submitting')
    // Read the variant straight from the store so the choice is always current
    const chosenVariant = useUIVariant.getState().variant
    apiFetch('/api/onboarding/complete', {
      method: 'POST',
      body: JSON.stringify({ variant: chosenVariant }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = (await parseJsonResponse(response)) as { blorpWelcomeSent?: boolean }
        setBlorpWelcomeSent(!!data.blorpWelcomeSent)
        setSubmitState('success')
      })
      .catch(() => {
        setSubmitState('error')
      })
  }, [])

  const goToFinish = useCallback(() => {
    setDirection(1)
    setPhase('finish')
    if (!hasSubmittedRef.current) {
      hasSubmittedRef.current = true
      submitCompletion()
    }
  }, [submitCompletion])

  // Interactive Create-Persona step — shown after the tour, before the finish
  // card. The user can bring their first character to life right inside the
  // onboarding modal (with a live preview) or skip it for later.
  const goToPersonaPhase = useCallback(() => {
    setDirection(1)
    setPhase('persona')
  }, [])

  // ---- Navigation ----

  const goToPicker = useCallback(() => {
    setDirection(-1)
    setPhase('picker')
  }, [])

  const nextTourStep = useCallback(() => {
    if (isLastTourStep) {
      goToPersonaPhase()
    } else {
      setDirection(1)
      setTourStep((s) => Math.min(s + 1, TOUR_STEPS.length - 1))
    }
  }, [isLastTourStep, goToPersonaPhase])

  const prevTourStep = useCallback(() => {
    setDirection(-1)
    setTourStep((s) => Math.max(s - 1, 0))
  }, [])

  const selectVariant = useCallback(
    (next: UIVariant) => {
      // Applies immediately: persists to localStorage, updates the <html>
      // variant class, and is what the app shell will use when it renders.
      setVariant(next)
    },
    [setVariant]
  )

  const skipToFinishWithDefault = useCallback(() => {
    // "Skip — use default (Chrona V1)" from the picker
    setVariant('chrona')
    goToFinish()
  }, [setVariant, goToFinish])

  // Move focus to the step heading so screen readers announce step changes
  useEffect(() => {
    if (phase !== 'picker') {
      stepHeadingRef.current?.focus()
    }
  }, [phase, tourStep])
  // ---- Picker radio-group keyboard navigation ----

  const handlePickerKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const currentIndex = PICKER_OPTIONS.findIndex((o) => o.variant === variant)
      let nextIndex: number | null = null
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (currentIndex + 1) % PICKER_OPTIONS.length
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (currentIndex - 1 + PICKER_OPTIONS.length) % PICKER_OPTIONS.length
          break
        case 'Home':
          nextIndex = 0
          break
        case 'End':
          nextIndex = PICKER_OPTIONS.length - 1
          break
        default:
          return
      }
      event.preventDefault()
      const nextVariant = PICKER_OPTIONS[nextIndex].variant
      selectVariant(nextVariant)
      // Focus the newly selected option
      const option = radioGroupRef.current?.querySelector<HTMLButtonElement>(`[data-variant="${nextVariant}"]`)
      option?.focus()
    },
    [variant, selectVariant]
  )

  const slideMotion = useMemo(
    () => ({
      initial: { opacity: 0, x: prefersReducedMotion ? 0 : direction * 48 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: prefersReducedMotion ? 0 : direction * -48 },
    }),
    [prefersReducedMotion, direction]
  )

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-zinc-950 text-zinc-100"
      role="presentation"
    >
      {/* Ambient gradient glow */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[28rem] w-[28rem] rounded-full bg-fuchsia-600/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-6 sm:px-6 sm:py-10">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
              <Sparkles className="h-4.5 w-4.5 text-white" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              Chrona <span className="sr-only">onboarding</span>
            </span>
          </div>
          {phase === 'tour' && (
            <button
              type="button"
              onClick={goToFinish}
              className="min-h-11 rounded-lg px-3 text-sm font-medium text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              Skip tutorial
            </button>
          )}
          {phase === 'finish' && <span className="sr-only">Finalizing onboarding</span>}
        </header>

        {/* Body */}
        <main className="flex flex-1 flex-col items-center justify-center py-8 sm:py-10">
          <AnimatePresence mode="wait" initial={false}>
            {phase === 'picker' && (
              <motion.section
                key="picker"
                {...slideMotion}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="w-full"
                aria-labelledby="onboarding-picker-title"
              >
                <div className="mb-6 text-center sm:mb-8">
                  <h1
                    id="onboarding-picker-title"
                    className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-300 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl"
                  >
                    Choose how Chrona looks
                  </h1>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
                    Every variant is a different take on the same universe — pick the one that feels like home. You can
                    switch anytime in Settings → Appearance.
                  </p>
                </div>

                <div
                  ref={radioGroupRef}
                  role="radiogroup"
                  aria-label="Interface variant"
                  onKeyDown={handlePickerKeyDown}
                  className="grid gap-3 sm:grid-cols-3 sm:gap-4"
                >
                  {PICKER_OPTIONS.map((option) => {
                    const info = UI_VARIANT_INFO[option.variant]
                    const Preview = PREVIEW_COMPONENTS[option.variant]
                    const selected = variant === option.variant
                    return (
                      <button
                        key={option.variant}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        data-variant={option.variant}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => selectVariant(option.variant)}
                        className={`group relative flex min-h-11 flex-col gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:p-4 ${
                          selected
                            ? 'border-violet-400/60 bg-violet-500/10 shadow-lg shadow-violet-500/10'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                        }`}
                      >
                        {selected && (
                          <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md shadow-violet-500/40">
                            <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
                          </span>
                        )}
                        <div className="aspect-[16/10] w-full">
                          <Preview active={selected} />
                        </div>
                        <span>
                          <span className="block text-sm font-semibold text-zinc-100">{info.name}</span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-zinc-400">{option.blurb}</span>
                        </span>
                        <span className="sr-only">{option.previewAlt}</span>
                      </button>
                    )
                  })}
                </div>

                <p className="mt-4 text-center text-xs text-zinc-500">
                  Your choice is applied live and saved to your account when you finish.
                </p>
              </motion.section>
            )}

            {phase === 'tour' && (
              <motion.section
                key={`tour-${tourStep}`}
                {...slideMotion}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="w-full"
                aria-labelledby="onboarding-step-title"
              >
                <TourStepCard
                  step={TOUR_STEPS[tourStep]}
                  headingRef={stepHeadingRef}
                  stepIndex={tourStep}
                  onPrimaryAction={TOUR_STEPS[tourStep].id === 'personas' ? goToPersonaPhase : undefined}
                />
              </motion.section>
            )}

            {phase === 'persona' && (
              <motion.section
                key="persona"
                {...slideMotion}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="w-full"
                aria-labelledby="onboarding-persona-title"
              >
                <PersonaBuilderCard
                  headingRef={stepHeadingRef}
                  onCreated={goToFinish}
                  onSkip={goToFinish}
                />
              </motion.section>
            )}

            {phase === 'finish' && (
              <motion.section
                key="finish"
                {...slideMotion}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="w-full"
                aria-labelledby="onboarding-finish-title"
              >
                <FinishCard
                  submitState={submitState}
                  blorpWelcomeSent={blorpWelcomeSent}
                  onRetry={submitCompletion}
                  onEnter={onFinished}
                />
              </motion.section>
            )}
          </AnimatePresence>
        </main>

        {/* Footer navigation */}
        <footer className="flex flex-col gap-4">
          {phase === 'tour' && (
            <>
              <div
                className="flex items-center justify-center gap-2"
                role="group"
                aria-label={`Tutorial progress: step ${tourStep + 1} of ${TOUR_STEPS.length}`}
              >
                {TOUR_STEPS.map((step, index) => (
                  <span
                    key={step.id}
                    aria-hidden="true"
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === tourStep
                        ? 'w-6 bg-gradient-to-r from-violet-400 to-fuchsia-400'
                        : index < tourStep
                          ? 'w-1.5 bg-violet-500/50'
                          : 'w-1.5 bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between gap-3">
                <ButtonGhost onClick={tourStep === 0 ? goToPicker : prevTourStep}>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Back
                </ButtonGhost>
                <span className="text-xs tabular-nums text-zinc-500" aria-hidden="true">
                  {tourStep + 1} / {TOUR_STEPS.length}
                </span>
                <ButtonPrimary onClick={nextTourStep}>
                  {isLastTourStep ? (
                    <>
                      Create your character
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </>
                  )}
                </ButtonPrimary>
              </div>
            </>
          )}

          {phase === 'persona' && (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={goToFinish}
                className="min-h-11 rounded-lg px-3 text-sm font-medium text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                Skip for now — I&apos;ll create one later
              </button>
              <span className="hidden text-xs text-zinc-500 sm:block" aria-hidden="true">
                Your character is saved automatically when you create it
              </span>
            </div>
          )}

          {phase === 'picker' && (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={skipToFinishWithDefault}
                className="min-h-11 rounded-lg px-3 text-sm font-medium text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              >
                Skip — use default (Chrona V1)
              </button>
              <ButtonPrimary onClick={() => { setDirection(1); setPhase('tour') }} className="sm:min-w-40">
                Start the tour
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </ButtonPrimary>
            </div>
          )}
        </footer>
      </div>
    </div>
  )
}

// ============================================================
// Sub-components
// ============================================================

function TourStepCard({
  step,
  headingRef,
  stepIndex,
}: {
  step: TourStep
  headingRef: React.RefObject<HTMLHeadingElement | null>
  stepIndex: number
}) {
  const Icon = step.icon
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
        <Icon className="h-7 w-7 text-violet-300" aria-hidden="true" />
      </div>
      <h2
        id="onboarding-step-title"
        ref={headingRef}
        tabIndex={-1}
        className="mt-4 text-center text-xl font-bold tracking-tight text-zinc-50 outline-none sm:text-2xl"
      >
        {step.title}
      </h2>
      <p className="sr-only">{`Tutorial step ${stepIndex + 1} of 7`}</p>
      <div className="mx-auto mt-4 max-w-lg space-y-3 text-center text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
        {step.body}
      </div>
    </div>
  )
}

function FinishCard({
  submitState,
  blorpWelcomeSent,
  onRetry,
  onEnter,
}: {
  submitState: SubmitState
  blorpWelcomeSent: boolean
  onRetry: () => void
  onEnter: () => void
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-10">
      {submitState === 'submitting' && (
        <>
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-violet-400" aria-hidden="true" />
          <h2 id="onboarding-finish-title" className="mt-4 text-xl font-bold tracking-tight text-zinc-50 sm:text-2xl">
            Setting up your Chrona…
          </h2>
          <p className="mt-2 text-sm text-zinc-400">Saving your preferences and letting Blorp know you&apos;ve arrived.</p>
        </>
      )}

      {submitState === 'success' && (
        <>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/40"
          >
            <Check className="h-7 w-7 text-white" aria-hidden="true" />
          </motion.div>
          <h2 id="onboarding-finish-title" className="mt-4 text-2xl font-bold tracking-tight text-zinc-50 sm:text-3xl">
            You&apos;re all set!
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
            {blorpWelcomeSent ? (
              <>
                <Bot className="mr-1.5 inline h-4 w-4 align-[-2px] text-violet-300" aria-hidden="true" />
                <strong className="font-semibold text-zinc-200">Blorp</strong>, Chrona&apos;s official bot, just slid
                into your DMs with a welcome message — say hi when you&apos;re ready.
              </>
            ) : (
              <>
                <Bot className="mr-1.5 inline h-4 w-4 align-[-2px] text-violet-300" aria-hidden="true" />
                <strong className="font-semibold text-zinc-200">Blorp</strong>, Chrona&apos;s official bot, will welcome
                you in your DMs as soon as you create your first persona.
              </>
            )}
          </p>
          <ButtonPrimary onClick={onEnter} className="mt-6 w-full sm:w-auto sm:min-w-48">
            Enter Chrona
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </ButtonPrimary>
        </>
      )}

      {submitState === 'error' && (
        <>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
            <RotateCcw className="h-7 w-7 text-amber-300" aria-hidden="true" />
          </span>
          <h2 id="onboarding-finish-title" className="mt-4 text-xl font-bold tracking-tight text-zinc-50 sm:text-2xl">
            We couldn&apos;t save your progress
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
            Something went wrong marking onboarding as complete. You can try again — or head in anyway, and we&apos;ll
            pick this up next time you log in.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
            <ButtonGhost onClick={onEnter}>Continue anyway</ButtonGhost>
            <ButtonPrimary onClick={onRetry}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </ButtonPrimary>
          </div>
        </>
      )}
    </div>
  )
}

function ButtonPrimary({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all duration-200 hover:from-violet-400 hover:to-fuchsia-400 hover:shadow-violet-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  )
}

function ButtonGhost({
  children,
  onClick,
  className = '',
}: {
  children: React.ReactNode
  onClick: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 text-sm font-medium text-zinc-300 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.07] hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  )
}
