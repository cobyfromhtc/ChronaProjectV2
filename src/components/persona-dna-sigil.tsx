'use client'

import { useMemo } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PersonaDnaSigilProps {
  archetype: string | null
  secondaryArchetype?: string | null
  personalitySpectrums?: {
    introvertExtrovert: number
    intuitiveObservant: number
    thinkingFeeling: number
    judgingProspecting: number
    assertiveTurbulent: number
  } | null
  mbtiType?: string | null
  size?: number
  className?: string
  showLabel?: boolean
}

// ─── Archetype → Color Map (centralized) ─────────────────────────────────────

import { getArchetypeHexColor, ARCHETYPE_DEFAULT_HEX } from '@/lib/archetype-config'

function getArchetypeColor(archetype: string | null | undefined): string {
  return getArchetypeHexColor(archetype)
}

// ─── Deterministic Hash ──────────────────────────────────────────────────────

/**
 * Simple deterministic string hash (djb2 variant).
 * Returns a positive 32-bit integer.
 */
function hashString(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0
  }
  return hash >>> 0
}

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Returns a function that produces values in [0, 1).
 */
function createRng(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Color Utilities ─────────────────────────────────────────────────────────

/** Parse a hex color to { r, g, b } */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '')
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  }
}

/** Convert { r, g, b } to hex */
function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`
}

/** Lighten a hex color by a factor (0–1) */
function lightenColor(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(
    r + (255 - r) * factor,
    g + (255 - g) * factor,
    b + (255 - b) * factor
  )
}

/** Darken a hex color by a factor (0–1) */
function darkenColor(hex: string, factor: number): string {
  const { r, g, b } = hexToRgb(hex)
  return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor))
}

/** Add alpha to a hex color → rgba string */
function hexWithAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

// ─── Geometry Helpers ────────────────────────────────────────────────────────

const CX = 100
const CY = 100

/** Compute a point on a circle at the given angle (radians) and radius from center. */
function polarPoint(angle: number, radius: number): [number, number] {
  return [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)]
}

/** Build the points string for an SVG polygon. */
function polygonPoints(sides: number, radius: number, rotation: number): string {
  const points: string[] = []
  for (let i = 0; i < sides; i++) {
    const angle = rotation + (2 * Math.PI * i) / sides - Math.PI / 2
    const [x, y] = polarPoint(angle, radius)
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return points.join(' ')
}

// ─── Sigil Generation ────────────────────────────────────────────────────────

interface SigilData {
  // Main polygon
  sides: number
  mainRadius: number
  rotation: number
  symmetryMode: number // 0 = full, 1 = half, 2 = quarter
  // Inner structure
  innerSides: number
  innerRadius: number
  innerRotation: number
  // Star burst lines
  starLines: number
  starReach: number
  // Inner ring dots
  innerRingDots: number
  innerRingRadius: number
  // Circuit lines
  circuitCount: number
  circuitAngle: number
  // Spectrum-modulated elements
  spectrumBarHeights: number[]
  // Secondary ring
  secondaryRingRadius: number
}

function generateSigilData(
  archetype: string | null,
  secondaryArchetype: string | null | undefined,
  personalitySpectrums: PersonaDnaSigilProps['personalitySpectrums'],
  mbtiType: string | null | undefined
): SigilData {
  // Build the seed string
  const parts: string[] = []
  if (archetype) parts.push(archetype)
  if (secondaryArchetype) parts.push(secondaryArchetype)
  if (personalitySpectrums) {
    parts.push(String(personalitySpectrums.introvertExtrovert))
    parts.push(String(personalitySpectrums.intuitiveObservant))
    parts.push(String(personalitySpectrums.thinkingFeeling))
    parts.push(String(personalitySpectrums.judgingProspecting))
    parts.push(String(personalitySpectrums.assertiveTurbulent))
  }
  if (mbtiType) parts.push(mbtiType)

  const seedString = parts.join('|') || 'default-sigil'
  const seed = hashString(seedString)
  const rng = createRng(seed)

  // Main polygon: 5–12 sides
  const sides = 5 + Math.floor(rng() * 8)
  const mainRadius = 48 + rng() * 16 // 48–64
  const rotation = rng() * Math.PI * 2
  const symmetryMode = Math.floor(rng() * 3)

  // Inner polygon
  const innerSides = 3 + Math.floor(rng() * 5) // 3–7
  const innerRadius = 18 + rng() * 12 // 18–30
  const innerRotation = rng() * Math.PI * 2

  // Star lines radiating from center to vertices
  const starLines = sides
  const starReach = mainRadius + 8 + rng() * 12

  // Inner ring of dots
  const innerRingDots = 8 + Math.floor(rng() * 12) // 8–19
  const innerRingRadius = 34 + rng() * 8 // 34–42

  // Circuit-like decorative lines
  const circuitCount = 2 + Math.floor(rng() * 4) // 2–5
  const circuitAngle = rng() * Math.PI * 2

  // Spectrum bar heights (5 values, one per spectrum)
  const spectrumBarHeights = personalitySpectrums
    ? [
        personalitySpectrums.introvertExtrovert / 100,
        personalitySpectrums.intuitiveObservant / 100,
        personalitySpectrums.thinkingFeeling / 100,
        personalitySpectrums.judgingProspecting / 100,
        personalitySpectrums.assertiveTurbulent / 100,
      ]
    : Array.from({ length: 5 }, () => rng())

  // Secondary ring
  const secondaryRingRadius = mainRadius + 14 + rng() * 6

  return {
    sides,
    mainRadius,
    rotation,
    symmetryMode,
    innerSides,
    innerRadius,
    innerRotation,
    starLines,
    starReach,
    innerRingDots,
    innerRingRadius,
    circuitCount,
    circuitAngle,
    spectrumBarHeights,
    secondaryRingRadius,
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PersonaDnaSigil({
  archetype,
  secondaryArchetype,
  personalitySpectrums,
  mbtiType,
  size = 120,
  className = '',
  showLabel = false,
}: PersonaDnaSigilProps) {
  const primaryColor = getArchetypeColor(archetype)
  const secondaryColor = getArchetypeColor(secondaryArchetype)

  const sigil = useMemo(
    () => generateSigilData(archetype, secondaryArchetype, personalitySpectrums, mbtiType ?? null),
    [archetype, secondaryArchetype, personalitySpectrums, mbtiType]
  )

  const primaryLight = lightenColor(primaryColor, 0.3)
  const primaryAlpha20 = hexWithAlpha(primaryColor, 0.2)
  const primaryAlpha40 = hexWithAlpha(primaryColor, 0.4)
  const primaryAlpha60 = hexWithAlpha(primaryColor, 0.6)
  const primaryAlpha10 = hexWithAlpha(primaryColor, 0.1)
  const primaryAlpha08 = hexWithAlpha(primaryColor, 0.08)
  const secondaryAlpha30 = hexWithAlpha(secondaryColor, 0.3)

  return (
    <div
      className={`inline-flex flex-col items-center ${className}`}
      style={{ width: size }}
    >
      <div
        className="relative group"
        style={{ width: size, height: size }}
      >
        {/* Slow-rotation on hover via CSS */}
        <style>{`
          @keyframes sigil-rotate {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          .sigil-hover-spin {
            transition: transform 0.4s ease;
          }
          .sigil-hover-spin:hover {
            animation: sigil-rotate 12s linear infinite;
          }
        `}</style>

        <div className="sigil-hover-spin w-full h-full">
          <svg
            viewBox="0 0 200 200"
            width={size}
            height={size}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Radial glow for primary color */}
              <radialGradient id={`glow-${archetype ?? 'default'}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={primaryColor} stopOpacity="0.15" />
                <stop offset="60%" stopColor={primaryColor} stopOpacity="0.05" />
                <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
              </radialGradient>

              {/* Subtle background gradient */}
              <radialGradient id={`bg-${archetype ?? 'default'}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#1a1a2e" />
                <stop offset="100%" stopColor="#0a0a14" />
              </radialGradient>

              {/* Glow filter */}
              <filter id={`blur-${archetype ?? 'default'}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
              </filter>
            </defs>

            {/* ── Background circle ── */}
            <circle
              cx={CX}
              cy={CY}
              r="96"
              fill={`url(#bg-${archetype ?? 'default'})`}
              stroke={primaryAlpha20}
              strokeWidth="1.5"
            />

            {/* Inner subtle glow */}
            <circle
              cx={CX}
              cy={CY}
              r="90"
              fill={`url(#glow-${archetype ?? 'default'})`}
            />

            {/* ── Outer ring (secondary archetype) ── */}
            {secondaryArchetype && (
              <>
                <circle
                  cx={CX}
                  cy={CY}
                  r={sigil.secondaryRingRadius}
                  fill="none"
                  stroke={secondaryAlpha30}
                  strokeWidth="1"
                  strokeDasharray="4 6"
                />
                {/* Small accent marks at cardinal points */}
                {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, i) => {
                  const [x1, y1] = polarPoint(angle, sigil.secondaryRingRadius - 3)
                  const [x2, y2] = polarPoint(angle, sigil.secondaryRingRadius + 3)
                  return (
                    <line
                      key={`sec-mark-${i}`}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={secondaryAlpha30}
                      strokeWidth="1.5"
                    />
                  )
                })}
              </>
            )}

            {/* ── Ambient ring lines ── */}
            <circle
              cx={CX}
              cy={CY}
              r="82"
              fill="none"
              stroke={primaryAlpha10}
              strokeWidth="0.5"
            />
            <circle
              cx={CX}
              cy={CY}
              r={sigil.innerRingRadius}
              fill="none"
              stroke={primaryAlpha10}
              strokeWidth="0.5"
              strokeDasharray="2 4"
            />

            {/* ── Star lines (center → outer vertices) ── */}
            {Array.from({ length: sigil.starLines }, (_, i) => {
              const angle = sigil.rotation + (2 * Math.PI * i) / sigil.sides - Math.PI / 2
              const [ox, oy] = polarPoint(angle, sigil.starReach)
              return (
                <line
                  key={`star-${i}`}
                  x1={CX} y1={CY} x2={ox} y2={oy}
                  stroke={primaryAlpha40}
                  strokeWidth="0.7"
                />
              )
            })}

            {/* ── Main polygon ── */}
            <polygon
              points={polygonPoints(sigil.sides, sigil.mainRadius, sigil.rotation - Math.PI / 2)}
              fill={primaryAlpha08}
              stroke={primaryColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* Glowing duplicate for bloom effect */}
            <polygon
              points={polygonPoints(sigil.sides, sigil.mainRadius, sigil.rotation - Math.PI / 2)}
              fill="none"
              stroke={primaryLight}
              strokeWidth="0.5"
              strokeLinejoin="round"
              filter={`url(#blur-${archetype ?? 'default'})`}
              opacity="0.6"
            />

            {/* ── Inner polygon ── */}
            <polygon
              points={polygonPoints(sigil.innerSides, sigil.innerRadius, sigil.innerRotation - Math.PI / 2)}
              fill={primaryAlpha08}
              stroke={primaryAlpha60}
              strokeWidth="1"
              strokeLinejoin="round"
            />

            {/* ── Connecting lines between inner and outer polygons ── */}
            {Array.from({ length: Math.min(sigil.sides, sigil.innerSides) }, (_, i) => {
              const outerAngle = sigil.rotation + (2 * Math.PI * i) / sigil.sides - Math.PI / 2
              const innerAngle = sigil.innerRotation + (2 * Math.PI * i) / sigil.innerSides - Math.PI / 2
              const [ox, oy] = polarPoint(outerAngle, sigil.mainRadius)
              const [ix, iy] = polarPoint(innerAngle, sigil.innerRadius)
              return (
                <line
                  key={`connect-${i}`}
                  x1={ix} y1={iy} x2={ox} y2={oy}
                  stroke={primaryAlpha40}
                  strokeWidth="0.5"
                  strokeDasharray="3 2"
                />
              )
            })}

            {/* ── Inner ring dots ── */}
            {Array.from({ length: sigil.innerRingDots }, (_, i) => {
              const angle = (2 * Math.PI * i) / sigil.innerRingDots
              const [x, y] = polarPoint(angle, sigil.innerRingRadius)
              // Vary dot size based on spectrum values
              const spectrumIdx = i % 5
              const dotSize = 1 + sigil.spectrumBarHeights[spectrumIdx] * 2
              return (
                <circle
                  key={`dot-${i}`}
                  cx={x} cy={y} r={dotSize}
                  fill={primaryAlpha60}
                />
              )
            })}

            {/* ── Spectrum arc segments ── */}
            {personalitySpectrums && (
              <>
                {sigil.spectrumBarHeights.map((val, i) => {
                  const arcRadius = 70 + i * 3
                  const startAngle = sigil.rotation + (2 * Math.PI * i) / 5 - Math.PI / 2
                  const sweepAngle = val * Math.PI * 0.4 // each spectrum sweeps up to ~72°
                  const [x1, y1] = polarPoint(startAngle, arcRadius)
                  const [x2, y2] = polarPoint(startAngle + sweepAngle, arcRadius)
                  const largeArc = sweepAngle > Math.PI ? 1 : 0
                  return (
                    <path
                      key={`arc-${i}`}
                      d={`M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${arcRadius} ${arcRadius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`}
                      fill="none"
                      stroke={primaryAlpha40}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  )
                })}
              </>
            )}

            {/* ── Circuit decorative lines ── */}
            {Array.from({ length: sigil.circuitCount }, (_, i) => {
              const baseAngle = sigil.circuitAngle + (2 * Math.PI * i) / sigil.circuitCount
              const r1 = 20 + i * 8
              const r2 = r1 + 10 + sigil.spectrumBarHeights[i % 5] * 15
              const [x1, y1] = polarPoint(baseAngle, r1)
              const [x2, y2] = polarPoint(baseAngle, r2)
              // Small terminal dot
              const [tx, ty] = polarPoint(baseAngle + 0.15, r2 - 3)
              return (
                <g key={`circuit-${i}`}>
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke={primaryAlpha40}
                    strokeWidth="0.7"
                  />
                  <circle cx={x2} cy={y2} r="1.5" fill={primaryAlpha40} />
                  <line
                    x1={x2} y1={y2} x2={tx} y2={ty}
                    stroke={primaryAlpha20}
                    strokeWidth="0.5"
                  />
                </g>
              )
            })}

            {/* ── Symmetry accent ── */}
            {sigil.symmetryMode === 0 && (
              /* Full symmetry — central dot */
              <>
                <circle cx={CX} cy={CY} r="4" fill={primaryColor} opacity="0.8" />
                <circle cx={CX} cy={CY} r="6" fill="none" stroke={primaryAlpha40} strokeWidth="0.5" />
              </>
            )}
            {sigil.symmetryMode === 1 && (
              /* Half symmetry — vertical line through center */
              <>
                <line x1={CX} y1={CY - 30} x2={CX} y2={CY + 30} stroke={primaryAlpha40} strokeWidth="0.7" />
                <circle cx={CX} cy={CY} r="3" fill={primaryColor} opacity="0.6" />
              </>
            )}
            {sigil.symmetryMode === 2 && (
              /* Quarter symmetry — cross */
              <>
                <line x1={CX} y1={CY - 25} x2={CX} y2={CY + 25} stroke={primaryAlpha40} strokeWidth="0.7" />
                <line x1={CX - 25} y1={CY} x2={CX + 25} y2={CY} stroke={primaryAlpha40} strokeWidth="0.7" />
                <circle cx={CX} cy={CY} r="2.5" fill={primaryColor} opacity="0.6" />
              </>
            )}

            {/* ── Outer border ring ── */}
            <circle
              cx={CX}
              cy={CY}
              r="94"
              fill="none"
              stroke={primaryAlpha20}
              strokeWidth="0.5"
            />

            {/* Subtle corner marks at diagonals */}
            {[Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].map((angle, i) => {
              const [x, y] = polarPoint(angle, 90)
              const len = 5
              const a1 = angle - 0.05
              const a2 = angle + 0.05
              const [lx1, ly1] = [x - len * Math.cos(a1), y - len * Math.sin(a1)]
              const [lx2, ly2] = [x + len * Math.cos(a2), y + len * Math.sin(a2)]
              return (
                <line
                  key={`corner-${i}`}
                  x1={lx1.toFixed(2)} y1={ly1.toFixed(2)}
                  x2={lx2.toFixed(2)} y2={ly2.toFixed(2)}
                  stroke={primaryAlpha20}
                  strokeWidth="0.5"
                />
              )
            })}
          </svg>
        </div>
      </div>

      {showLabel && (
        <span
          className="mt-1 text-[9px] font-medium tracking-widest uppercase"
          style={{ color: hexWithAlpha(primaryColor, 0.6) }}
        >
          DNA Sigil
        </span>
      )}
    </div>
  )
}

export default PersonaDnaSigil
