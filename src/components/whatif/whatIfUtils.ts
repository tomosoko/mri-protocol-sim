import { calcSNR, calcSARLevel, calcScanTime, calcT2Blur, chemShift } from '../../store/calculators'
import type { ProtocolParams } from '../../data/presets'

// ── メトリクス型 ──────────────────────────────────────────────────────────────
export interface Metrics {
  snr: number
  sar: number
  time: number
  blur: number
  chem: number
}

export interface SensBar {
  snr: number; sar: number; time: number; blur: number; chem: number
}

// ── 行定義 ───────────────────────────────────────────────────────────────────
export interface WhatIfRow {
  label: string
  group: string
  upLabel: string
  downLabel: string
  up: Partial<ProtocolParams>
  down: Partial<ProtocolParams>
}

// 計算済み行
export interface ComputedRow extends WhatIfRow {
  upDelta: SensBar
  downDelta: SensBar
}

export const ROWS: WhatIfRow[] = [
  { label: 'TR', group: 'Timing',
    up: { TR: 5000 }, down: { TR: 500 }, upLabel: '5000ms', downLabel: '500ms' },
  { label: 'TE', group: 'Timing',
    up: { TE: 120 }, down: { TE: 10 }, upLabel: '120ms', downLabel: '10ms' },
  { label: 'Flip Angle', group: 'Timing',
    up: { flipAngle: 150 }, down: { flipAngle: 30 }, upLabel: '150°', downLabel: '30°' },
  { label: 'ETL', group: 'Sequence',
    up: { turboFactor: 25 }, down: { turboFactor: 7 }, upLabel: '×25', downLabel: '×7' },
  { label: 'Averages', group: 'Sequence',
    up: { averages: 4 }, down: { averages: 1 }, upLabel: '×4', downLabel: '×1' },
  { label: 'iPAT', group: 'Sequence',
    up: { ipatMode: 'GRAPPA', ipatFactor: 3 }, down: { ipatMode: 'Off', ipatFactor: 1 },
    upLabel: 'GRAPPA×3', downLabel: 'Off' },
  { label: 'Partial Fourier', group: 'Sequence',
    up: { partialFourier: '5/8' }, down: { partialFourier: 'Off' }, upLabel: '5/8', downLabel: 'Off' },
  { label: 'FOV', group: 'Resolution',
    up: { fov: 400 }, down: { fov: 200 }, upLabel: '400mm', downLabel: '200mm' },
  { label: 'Slice Thickness', group: 'Resolution',
    up: { sliceThickness: 5 }, down: { sliceThickness: 1.5 }, upLabel: '5mm', downLabel: '1.5mm' },
  { label: 'Bandwidth', group: 'Resolution',
    up: { bandwidth: 500 }, down: { bandwidth: 100 }, upLabel: '500 Hz/px', downLabel: '100 Hz/px' },
  { label: 'Matrix (Freq)', group: 'Resolution',
    up: { matrixFreq: 512 }, down: { matrixFreq: 256 }, upLabel: '512', downLabel: '256' },
  { label: 'Field Strength', group: 'System',
    up: { fieldStrength: 3.0 }, down: { fieldStrength: 1.5 }, upLabel: '3T', downLabel: '1.5T' },
  { label: 'Fat Sat', group: 'System',
    up: { fatSat: 'SPAIR' }, down: { fatSat: 'None' }, upLabel: 'SPAIR', downLabel: 'None' },
]

export const METRICS: { key: keyof Metrics; label: string; lowerIsBetter: boolean; unit: string }[] = [
  { key: 'snr',  label: 'SNR',     lowerIsBetter: false, unit: '' },
  { key: 'sar',  label: 'SAR',     lowerIsBetter: true,  unit: '%' },
  { key: 'time', label: 'Time',    lowerIsBetter: true,  unit: 's' },
  { key: 'blur', label: 'Blur',    lowerIsBetter: true,  unit: '' },
  { key: 'chem', label: 'Chem↔',  lowerIsBetter: true,  unit: 'px' },
]

// ── ヘルパー ─────────────────────────────────────────────────────────────────
export function getMetrics(p: ProtocolParams): Metrics {
  return {
    snr:  calcSNR(p),
    sar:  calcSARLevel(p),
    time: calcScanTime(p),
    blur: calcT2Blur(p),
    chem: chemShift(p),
  }
}

export function deltaPct(base: number, next: number): number {
  if (base === 0) return 0
  return Math.round(((next - base) / base) * 100)
}

export function computeDeltas(base: Metrics, changed: Metrics): SensBar {
  return {
    snr:  deltaPct(base.snr,  changed.snr),
    sar:  deltaPct(base.sar,  changed.sar),
    time: deltaPct(base.time, changed.time),
    blur: deltaPct(base.blur, changed.blur),
    chem: deltaPct(base.chem, changed.chem),
  }
}

export function deltaColor(d: number, lowerIsBetter: boolean): string {
  if (Math.abs(d) < 2) return '#374151'
  const good = lowerIsBetter ? d < -5 : d > 5
  const bad  = lowerIsBetter ? d > 5  : d < -5
  if (good) return '#34d399'
  if (bad)  return '#f87171'
  return '#9ca3af'
}

// ── スコア計算 ────────────────────────────────────────────────────────────────
// score = (SNR_improvement * 0.4) - (time_penalty * 0.3) - (SAR_penalty * 0.2) - (blur_penalty * 0.1)
export function calcChangeScore(delta: SensBar): number {
  const snrImprovement = delta.snr          // positive = good
  const timePenalty    = Math.max(0, delta.time)   // positive = worse (time increased)
  const sarPenalty     = Math.max(0, delta.sar)    // positive = worse (SAR increased)
  const blurPenalty    = Math.max(0, delta.blur)   // positive = worse (blur increased)
  return (snrImprovement * 0.4) - (timePenalty * 0.3) - (sarPenalty * 0.2) - (blurPenalty * 0.1)
}

// ── 現在の課題診断 ────────────────────────────────────────────────────────────
export interface DiagnosticResult {
  dimension: string
  score: number
  advice: string
}

export function getDiagnostic(base: Metrics): DiagnosticResult {
  const scores = {
    snr:  Math.min(1, base.snr / 100),
    sar:  Math.max(0, 1 - base.sar / 100),
    time: Math.max(0, 1 - Math.min(base.time, 600) / 600),
    blur: Math.min(1, base.blur),
    chem: Math.max(0, 1 - base.chem / 6),
  }

  const dimensions: { key: keyof typeof scores; label: string; advice: string }[] = [
    { key: 'snr',  label: 'SNR',        advice: 'Averages増加またはスライス厚増加を検討' },
    { key: 'sar',  label: 'SAR',        advice: 'ETL短縮またはFlip Angle低減を検討' },
    { key: 'time', label: 'スキャン時間', advice: 'iPAT/Partial Fourierでの短縮を検討' },
    { key: 'blur', label: 'ブラー',      advice: 'ETL短縮またはTE短縮を検討' },
    { key: 'chem', label: 'ケミカルシフト', advice: 'Bandwidth増加またはFat Sat適用を検討' },
  ]

  let worst = dimensions[0]
  let worstScore = scores[dimensions[0].key]
  for (const d of dimensions) {
    if (scores[d.key] < worstScore) {
      worstScore = scores[d.key]
      worst = d
    }
  }

  return { dimension: worst.label, score: worstScore, advice: worst.advice }
}

// ── 最適化提案用定数 ──────────────────────────────────────────────────────────
export interface OptimizationCandidate {
  label: string
  dir: 'up' | 'down'
  dirLabel: string
  score: number
  snrDelta: number
  timeDelta: number
  sarDelta: number
}

export const RANK_COLORS = ['#fbbf24', '#9ca3af', '#cd7c2f']
export const RANK_LABELS = ['1位', '2位', '3位']
export const RANK_BG = ['#fbbf2410', '#9ca3af10', '#cd7c2f10']
