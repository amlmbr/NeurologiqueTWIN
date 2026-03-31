"use client"

/**
 * BrainTwinViewer.tsx
 * ===================
 * Interactive SVG brain viewer for the NeurologiqueTWIN digital twin.
 *
 * Renders two complementary views:
 *   - Top (axial):     looking down at the brain, left=left, right=right
 *   - Side (lateral):  left hemisphere side view
 *
 * State contract (props)
 * ----------------------
 * regions: BrainRegionData[]       — all 20 regions with activation state
 * activeRegion: RegionMeta | null  — the hypothesized affected zone
 * seizureRisk: float [0,1]         — drives glow intensity and color
 * status: string                   — "stable" | "elevated" | "preictal" | "ictal" | "postictal"
 * statusColor: string              — CSS hex for the status
 * patientId: string
 * view: "top" | "side"
 *
 * Visual encoding
 * ---------------
 * - Normal lobe color: dark blue/purple (lobe-coded)
 * - Active region: color interpolated from lobe-normal → orange → red
 * - Highlight intensity (0→1) controls: fill opacity + glow filter + pulse animation
 * - Risk >= 0.60: pulsing dashed orbit ring around active zone
 * - Risk >= 0.80: full red fill + strong drop-shadow glow
 *
 * DISCLAIMER: All brain shapes are schematic approximations.
 * NOT anatomically accurate. NOT for clinical use.
 */

import React from "react"

// ── Types (mirrors backend RegionResponse + BrainRegionItem) ──────────────

export interface BrainRegionData {
  name:          string
  lobe:          string
  side:          string
  x:             number   // normalized 3D coord [-1, 1]
  y:             number
  z:             number
  is_active:     boolean
  activation:    number   // 0.0 = none, 1.0 = max
  color_normal:  string
  color_alert:   string
  color_current: string
  function:      string
}

export interface RegionMeta {
  region_name:             string | null
  lobe:                    string | null
  side:                    string | null
  highlight_intensity?:    number
  localization_confidence: string
  disclaimer:              string
  function:                string
  color_alert:             string
  color_highlight?:        string
}

interface BrainTwinViewerProps {
  regions:       BrainRegionData[]
  activeRegion?: RegionMeta | null
  seizureRisk:   number
  status:        string
  statusColor:   string
  patientId:     string
  view?:         "top" | "side"
}

// ── Lobe path definitions ─────────────────────────────────────────────────
// Top (axial) view — 280×200 viewBox

const TOP_PATHS: Record<string, { d: string; label: string; cx: number; cy: number }> = {
  frontal: {
    d: "M 140 28 C 88 22 52 44 42 76 C 35 98 48 114 80 118 C 102 121 122 117 140 117 C 158 117 178 121 200 118 C 232 114 245 98 238 76 C 228 44 192 22 140 28 Z",
    label: "Frontal", cx: 140, cy: 73,
  },
  parietal: {
    d: "M 80 118 C 58 124 46 144 52 164 C 58 182 84 190 110 187 C 126 186 136 181 140 178 C 144 181 154 186 170 187 C 196 190 222 182 228 164 C 234 144 222 124 200 118 C 178 121 158 117 140 117 C 122 117 102 121 80 118 Z",
    label: "Parietal", cx: 140, cy: 152,
  },
  temporal_left: {
    d: "M 42 76 C 24 90 14 110 12 132 C 10 152 18 170 34 178 C 46 184 58 180 66 170 C 76 158 78 142 78 126 C 78 120 76 118 80 118 C 48 114 35 98 42 76 Z",
    label: "Temporal L", cx: 44, cy: 132,
  },
  temporal_right: {
    d: "M 238 76 C 256 90 266 110 268 132 C 270 152 262 170 246 178 C 234 184 222 180 214 170 C 204 158 202 142 202 126 C 202 120 204 118 200 118 C 232 114 245 98 238 76 Z",
    label: "Temporal R", cx: 236, cy: 132,
  },
  occipital: {
    d: "M 52 164 C 58 182 84 190 110 187 C 126 186 136 181 140 178 C 144 181 154 186 170 187 C 196 190 222 182 228 164 C 212 172 194 176 170 177 C 154 178 144 177 140 177 C 136 177 126 178 110 177 C 86 176 68 172 52 164 Z",
    label: "Occipital", cx: 140, cy: 181,
  },
  central: {
    d: "M 85 115 C 98 119 118 120 140 120 C 162 120 182 119 195 115 C 183 112 163 110 140 110 C 117 110 97 112 85 115 Z",
    label: "Central", cx: 140, cy: 115,
  },
}

// Side (lateral) view — 300×240 viewBox, left hemisphere

const SIDE_PATHS: Record<string, { d: string; label: string; cx: number; cy: number }> = {
  frontal: {
    d: "M 80 185 C 48 164 26 132 22 100 C 18 68 28 42 55 27 C 82 12 118 10 148 18 C 170 24 184 38 180 56 C 176 74 158 84 150 104 C 144 120 147 144 142 165 C 132 180 112 188 80 185 Z",
    label: "Frontal", cx: 96, cy: 95,
  },
  parietal: {
    d: "M 142 165 C 147 144 150 120 158 102 C 168 78 184 62 198 56 C 224 48 255 62 260 88 C 265 112 252 138 234 156 C 218 172 192 180 166 177 C 151 175 142 170 142 165 Z",
    label: "Parietal", cx: 200, cy: 113,
  },
  temporal: {
    d: "M 80 185 C 74 200 78 218 94 224 C 118 232 150 224 170 210 C 188 197 190 178 180 166 C 170 154 154 148 140 152 C 126 156 112 166 100 174 C 92 179 85 183 80 185 Z",
    label: "Temporal", cx: 132, cy: 194,
  },
  occipital: {
    d: "M 234 156 C 252 138 266 118 268 96 C 270 74 260 56 246 52 C 256 58 262 80 258 102 C 254 124 242 144 234 156 Z",
    label: "Occipital", cx: 254, cy: 108,
  },
  central: {
    d: "M 150 104 C 158 84 170 70 182 62 C 172 66 160 80 150 104 Z",
    label: "Central", cx: 164, cy: 82,
  },
}

// Normal lobe fill colors (dark, rich)
const LOBE_NORMALS: Record<string, string> = {
  frontal:        "#1e3a8a",
  parietal:       "#065f46",
  temporal_left:  "#4c1d95",
  temporal_right: "#6d28d9",
  temporal:       "#4c1d95",
  occipital:      "#164e63",
  central:        "#78350f",
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getLobeKey(pathKey: string): string {
  // Strip _left/_right suffix for lobe matching
  return pathKey.replace(/_left$|_right$/, "")
}

function activationColor(activation: number, alertColor: string): string {
  if (activation <= 0) return ""
  if (activation >= 0.80) return alertColor
  if (activation >= 0.50) return "#f97316"
  return "#eab308"
}

function riskGlowFilter(risk: number, statusColor: string): string {
  if (risk >= 0.80) return `drop-shadow(0 0 16px ${statusColor}bb)`
  if (risk >= 0.60) return `drop-shadow(0 0 10px ${statusColor}88)`
  if (risk >= 0.40) return `drop-shadow(0 0 6px ${statusColor}55)`
  return "none"
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BrainTwinViewer({
  regions,
  activeRegion,
  seizureRisk,
  status,
  statusColor,
  patientId,
  view = "top",
}: BrainTwinViewerProps) {
  const paths = view === "top" ? TOP_PATHS : SIDE_PATHS
  const vbW   = view === "top" ? 280 : 300
  const vbH   = view === "top" ? 200 : 240

  // Build lobe → max activation from regions prop
  const lobeActivation: Record<string, number> = {}
  const lobeAlertColor: Record<string, string>  = {}
  regions.forEach(r => {
    if (r.is_active && r.activation > 0) {
      const lk = r.lobe
      lobeActivation[lk] = Math.max(lobeActivation[lk] ?? 0, r.activation)
      lobeAlertColor[lk] = r.color_alert
    }
  })

  const activeLobe = activeRegion?.lobe ?? null

  function getPathFill(pathKey: string): string {
    const lk = getLobeKey(pathKey)
    const act = lobeActivation[lk] ?? 0
    if (act > 0 && lk === activeLobe) {
      return activationColor(act, lobeAlertColor[lk] ?? "#ef4444") || (LOBE_NORMALS[pathKey] ?? "#1e3a5f")
    }
    return LOBE_NORMALS[pathKey] ?? "#1e3a5f"
  }

  function getPathOpacity(pathKey: string): number {
    const lk = getLobeKey(pathKey)
    const act = lobeActivation[lk] ?? 0
    if (lk === activeLobe && act > 0) return 0.85
    return 0.50
  }

  function isHighlighted(pathKey: string): boolean {
    return getLobeKey(pathKey) === activeLobe && (lobeActivation[activeLobe ?? ""] ?? 0) > 0
  }

  // Pulsing overlay center (approximate axial center of active region)
  const pulseX = view === "top" ? 140 : 148
  const pulseY = view === "top" ? 105 : 120

  return (
    <div className="relative select-none w-full">
      {/* View label */}
      <div className="absolute top-1 right-2 text-[9px] text-muted-foreground uppercase tracking-widest z-10">
        {view === "top" ? "Axial" : "Lateral"}
      </div>

      <svg
        viewBox={`0 0 ${vbW} ${vbH}`}
        className="w-full"
        style={{ filter: riskGlowFilter(seizureRisk, statusColor) }}
        aria-label={`Brain twin viewer — ${status} — risk ${(seizureRisk * 100).toFixed(1)}%`}
      >
        <defs>
          {/* Brain surface gradient */}
          <radialGradient id={`bg-${view}`} cx="50%" cy="38%" r="62%">
            <stop offset="0%"   stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
          {/* Glow filter for active region */}
          <filter id={`glow-${view}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* Subtle texture lines */}
          <pattern id={`gyri-${view}`} width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 0 4 Q 4 0 8 4" stroke="#ffffff08" strokeWidth="0.4" fill="none"/>
          </pattern>
        </defs>

        {/* Brain base ellipse */}
        {view === "top" ? (
          <>
            <ellipse cx="140" cy="108" rx="132" ry="92" fill={`url(#bg-${view})`} stroke="#1e3a5f" strokeWidth="1.5"/>
            <ellipse cx="140" cy="108" rx="132" ry="92" fill={`url(#gyri-${view})`} opacity="0.5"/>
          </>
        ) : (
          <>
            <ellipse cx="150" cy="128" rx="128" ry="108" fill={`url(#bg-${view})`} stroke="#1e3a5f" strokeWidth="1.5"/>
            <ellipse cx="150" cy="128" rx="128" ry="108" fill={`url(#gyri-${view})`} opacity="0.5"/>
          </>
        )}

        {/* Lobe regions */}
        {Object.entries(paths).map(([key, { d, label, cx, cy }]) => {
          const hl = isHighlighted(key)
          return (
            <g key={key}>
              <path
                d={d}
                fill={getPathFill(key)}
                fillOpacity={getPathOpacity(key)}
                stroke={hl ? (lobeAlertColor[activeLobe ?? ""] ?? "#ef4444") : "#334155"}
                strokeWidth={hl ? 2.0 : 0.6}
                filter={hl ? `url(#glow-${view})` : undefined}
                style={hl ? { animation: "brainPulse 2s ease-in-out infinite" } : {}}
              />
              {/* Lobe label */}
              <text
                x={cx} y={cy}
                textAnchor="middle"
                fontSize={hl ? "7.5" : "6.5"}
                fill={hl ? "#fef2f2" : "#94a3b8"}
                fontWeight={hl ? "bold" : "normal"}
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* Interhemispheric fissure — top view only */}
        {view === "top" && (
          <line
            x1="140" y1="28" x2="140" y2="180"
            stroke="#0f172a" strokeWidth="2.5"
          />
        )}

        {/* Pulsing orbit ring — shown when risk ≥ 0.40 and region active */}
        {activeRegion?.region_name && seizureRisk >= 0.40 && (
          <>
            {/* Outer ring */}
            <circle
              cx={pulseX} cy={pulseY}
              r={seizureRisk >= 0.80 ? 28 : seizureRisk >= 0.60 ? 22 : 16}
              fill="none"
              stroke={seizureRisk >= 0.80 ? "#ef4444" : seizureRisk >= 0.60 ? "#f97316" : "#eab308"}
              strokeWidth="1.2"
              strokeDasharray="5,4"
              opacity="0.65"
              style={{ animation: "orbitSpin 5s linear infinite", transformOrigin: `${pulseX}px ${pulseY}px` }}
            />
            {/* Inner dot */}
            <circle
              cx={pulseX} cy={pulseY}
              r="3"
              fill={seizureRisk >= 0.80 ? "#ef4444" : "#f97316"}
              opacity="0.8"
              style={{ animation: "brainPulse 1.5s ease-in-out infinite" }}
            />
          </>
        )}

        {/* Bottom status overlay */}
        <text
          x={vbW / 2} y={vbH - 5}
          textAnchor="middle"
          fontSize="7"
          fill="#475569"
        >
          Risk {(seizureRisk * 100).toFixed(1)}% · {status.toUpperCase()} · {patientId}
        </text>
      </svg>

      {/* Lobe color legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
        {[
          { color: LOBE_NORMALS.frontal,        label: "Frontal" },
          { color: LOBE_NORMALS.temporal_left,   label: "Temporal" },
          { color: LOBE_NORMALS.parietal,        label: "Parietal" },
          { color: LOBE_NORMALS.occipital,       label: "Occipital" },
          { color: LOBE_NORMALS.central,         label: "Central" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[9px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes brainPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        @keyframes orbitSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
