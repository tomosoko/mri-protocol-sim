import type { ProtocolParams } from '../data/presets'

// ────────────────────────────────────────────────────────────────────────────
// コイル別 SNR 係数（Head 64ch を基準 1.0）
// ────────────────────────────────────────────────────────────────────────────
const COIL_SNR_FACTOR: Record<string, number> = {
  Head_64: 1.0,
  Head_20: 0.75,
  Spine_32: 0.85,
  Body: 0.55,
  Knee: 0.80,
  Shoulder: 0.72,
  Flex: 0.60,
}

// ────────────────────────────────────────────────────────────────────────────
// 組織 T1/T2 (ms) — literature values (Rooney 2007, Stanisz 2005)
// ────────────────────────────────────────────────────────────────────────────
export interface TissueParams {
  label: string
  color: string
  T1_15: number; T2_15: number
  T1_30: number; T2_30: number
  T2star_15: number; T2star_30: number
  rho: number   // proton density (0-1)
}

export const TISSUES: TissueParams[] = [
  { label: 'GM',     color: '#a78bfa', T1_15: 1470, T2_15: 85,   T1_30: 1820, T2_30: 99,  T2star_15: 66,  T2star_30: 33,  rho: 0.82 },
  { label: 'WM',     color: '#60a5fa', T1_15: 1080, T2_15: 75,   T1_30: 1084, T2_30: 69,  T2star_15: 53,  T2star_30: 26,  rho: 0.71 },
  { label: 'CSF',    color: '#38bdf8', T1_15: 4000, T2_15: 2000, T1_30: 4200, T2_30: 2200,T2star_15: 500, T2star_30: 500, rho: 1.00 },
  { label: 'Fat',    color: '#fbbf24', T1_15: 300,  T2_15: 85,   T1_30: 385,  T2_30: 68,  T2star_15: 60,  T2star_30: 17,  rho: 0.62 },
  { label: 'Liver',  color: '#fb923c', T1_15: 576,  T2_15: 46,   T1_30: 812,  T2_30: 42,  T2star_15: 28,  T2star_30: 14,  rho: 0.74 },
  { label: 'Spleen', color: '#4ade80', T1_15: 1057, T2_15: 79,   T1_30: 1328, T2_30: 61,  T2star_15: 54,  T2star_30: 27,  rho: 0.77 },
  { label: 'Muscle', color: '#f87171', T1_15: 1008, T2_15: 44,   T1_30: 1420, T2_30: 50,  T2star_15: 31,  T2star_30: 16,  rho: 0.78 },
]

function getTissueT1T2(t: TissueParams, fieldStrength: number): { T1: number; T2: number; T2s: number } {
  if (fieldStrength >= 2.5) {
    return { T1: t.T1_30, T2: t.T2_30, T2s: t.T2star_30 }
  }
  return { T1: t.T1_15, T2: t.T2_15, T2s: t.T2star_15 }
}

// ────────────────────────────────────────────────────────────────────────────
// 信号強度計算 (Bloch 方程式簡略版)
// ────────────────────────────────────────────────────────────────────────────
function calcSpinEchoSignal(T1: number, T2: number, TR: number, TE: number, averages: number): number {
  const s = (1 - Math.exp(-TR / T1)) * Math.exp(-TE / T2)
  return Math.max(0, s) * Math.sqrt(averages)
}

function calcIRSignal(T1: number, T2: number, TR: number, TE: number, TI: number, averages: number): number {
  const s = Math.abs(1 - 2 * Math.exp(-TI / T1) + Math.exp(-TR / T1)) * Math.exp(-TE / T2)
  return Math.max(0, s) * Math.sqrt(averages)
}

function calcGRESignal(T1: number, T2s: number, TR: number, TE: number, fa: number, averages: number): number {
  const faRad = (fa * Math.PI) / 180
  const e1 = Math.exp(-TR / T1)
  const ernst = Math.sin(faRad) * (1 - e1) / (1 - Math.cos(faRad) * e1 + 1e-10)
  return Math.max(0, ernst * Math.exp(-TE / T2s)) * Math.sqrt(averages)
}

export interface TissueSignal {
  tissue: TissueParams
  signal: number   // 0-1
  nulled: boolean  // STIR/IR で信号がnullされているか
}

/** 全組織の信号強度を計算 */
export function calcTissueContrast(p: ProtocolParams): TissueSignal[] {
  const isIR = p.TI > 0
  const isGRE = p.turboFactor <= 2 && p.flipAngle < 60

  const results: TissueSignal[] = TISSUES.map(t => {
    const { T1, T2, T2s } = getTissueT1T2(t, p.fieldStrength)
    let signal: number
    let nulled = false

    if (isIR) {
      // FLAIR / STIR: check if tissue is nulled
      const nullTI = T1 * Math.log(2)  // TI at null point
      nulled = Math.abs(p.TI - nullTI) < nullTI * 0.15
      signal = calcIRSignal(T1, T2, p.TR, p.TE, p.TI, p.averages)
    } else if (isGRE) {
      signal = calcGRESignal(T1, T2s, p.TR, p.TE, p.flipAngle, p.averages)
    } else {
      signal = calcSpinEchoSignal(T1, T2, p.TR, p.TE, p.averages)
    }

    // Fat saturation: zero out fat signal
    if (p.fatSat !== 'None' && t.label === 'Fat') {
      signal = 0
      nulled = true
    }

    return { tissue: t, signal, nulled }
  })

  // 最大値で正規化
  const maxSig = Math.max(...results.map(r => r.signal), 0.001)
  return results.map(r => ({ ...r, signal: r.signal / maxSig }))
}

// ────────────────────────────────────────────────────────────────────────────
// Ernst 角計算
// ────────────────────────────────────────────────────────────────────────────
export function ernstAngle(T1: number, TR: number): number {
  const e1 = Math.exp(-TR / T1)
  return (Math.acos(e1) * 180) / Math.PI
}

// ────────────────────────────────────────────────────────────────────────────
// g-factor 推定 (GRAPPA, iPAT factor ベース)
// ────────────────────────────────────────────────────────────────────────────
export function calcGFactor(ipatMode: string, ipatFactor: number): number {
  if (ipatMode === 'Off') return 1.0
  // GRAPPA typical g-factor: 1.1 for AF2, 1.3 for AF3, 1.6 for AF4
  // CAIPIRINHA has better g-factor (2D undersampling)
  const gTable: Record<number, number> = { 2: 1.08, 3: 1.28, 4: 1.60 }
  const baseG = gTable[ipatFactor] ?? 1.0 + (ipatFactor - 1) * 0.2
  return ipatMode === 'CAIPIRINHA' ? baseG * 0.85 : baseG
}

// ────────────────────────────────────────────────────────────────────────────
// TSE/HASTE おおよそのスキャン時間 (秒)
// ────────────────────────────────────────────────────────────────────────────
export function calcScanTime(p: ProtocolParams): number {
  const ipatDiv = p.ipatMode !== 'Off' ? p.ipatFactor : 1
  const pfFactor = p.partialFourier === 'Off' ? 1.0
    : p.partialFourier === '7/8' ? 0.875
    : p.partialFourier === '6/8' ? 0.75
    : p.partialFourier === '5/8' ? 0.625
    : 0.5

  if (p.turboFactor <= 1) {
    // EPI (DWI): TR × slices × averages / 1000
    return Math.round((p.TR * p.slices * p.averages) / 1000)
  }

  if (p.turboFactor >= 100) {
    // HASTE: single-shot per slice
    return Math.round(p.TR * p.slices / 1000)
  }

  // TSE: TR × phaseLines × averages / turboFactor / iPAT
  const phaseLines = Math.round(p.matrixPhase * (p.phaseResolution / 100) * pfFactor)
  const navOverhead = p.respTrigger === 'RT' || p.respTrigger === 'PACE' ? 1.4 : 1.0
  const time = (p.TR * phaseLines * p.averages) / p.turboFactor / ipatDiv / 1000 * navOverhead
  return Math.round(time)
}

// ────────────────────────────────────────────────────────────────────────────
// SAR 推定 (相対値 0-100%)  より詳細な近似
// ────────────────────────────────────────────────────────────────────────────
export function calcSARLevel(p: ProtocolParams): number {
  const faNorm = p.flipAngle / 90
  const trNorm = 2000 / Math.max(p.TR, 100)
  const etlNorm = Math.min(p.turboFactor, 200) / 50
  const fieldNorm = (p.fieldStrength / 1.5) ** 2

  // Fat saturation adds extra RF pulses
  const fatSatPenalty = p.fatSat === 'CHESS' ? 1.15
    : p.fatSat === 'SPAIR' ? 1.25
    : p.fatSat === 'STIR' ? 1.35
    : 1.0

  // MT pulse adds more
  const mtPenalty = p.mt ? 1.20 : 1.0

  // Body coil has higher SAR than head coil
  const coilPenalty = (!p.coilType || p.coilType === 'Body') ? 1.30 : 1.0

  const raw = faNorm ** 2 * trNorm * etlNorm * fieldNorm * fatSatPenalty * mtPenalty * coilPenalty * 32
  return Math.min(Math.round(raw), 100)
}

export type SARLevel = 'low' | 'medium' | 'high' | 'over'
export function sarLevel(pct: number): SARLevel {
  if (pct < 40) return 'low'
  if (pct < 70) return 'medium'
  if (pct < 90) return 'high'
  return 'over'
}

// ────────────────────────────────────────────────────────────────────────────
// SNR 相対スコア — g-factor、コイルタイプを考慮
// ────────────────────────────────────────────────────────────────────────────
export function calcSNR(p: ProtocolParams): number {
  const voxel = (p.fov / p.matrixFreq) * (p.fov / p.matrixPhase) * p.sliceThickness
  const bwNorm = 200 / Math.max(p.bandwidth, 50)
  const avgNorm = Math.sqrt(p.averages)
  const gFactor = calcGFactor(p.ipatMode, p.ipatFactor)
  const ipatNorm = p.ipatMode !== 'Off' ? 1 / (Math.sqrt(p.ipatFactor) * gFactor) : 1
  const coilFactor = COIL_SNR_FACTOR[p.coilType] ?? 0.6
  // 3T: 理論 √2 倍、実際は約 1.6 倍（body coil 効果差を含む）
  const fieldFactor = p.fieldStrength === 3.0 ? 1.6 : 1.0
  const snr = voxel * bwNorm * avgNorm * ipatNorm * coilFactor * fieldFactor * 10
  return Math.round(Math.min(snr, 200))
}

// ────────────────────────────────────────────────────────────────────────────
// シーケンスタイプ自動検出
// ────────────────────────────────────────────────────────────────────────────
export interface SequenceIdentity {
  type: string
  color: string
  details: string
}

export function identifySequence(p: ProtocolParams): SequenceIdentity {
  const isDWI = p.bValues.length > 1 && p.turboFactor <= 2
  const isHASTE = p.turboFactor >= 80
  const isFLAIR = p.TI > 1500 && p.turboFactor > 5
  const isSTIR = p.fatSat === 'STIR' && p.TI > 0 && p.TI < 500
  const isIR = p.TI > 0 && p.TI <= 1500 && !isSTIR
  const isTSE = p.turboFactor >= 3 && p.turboFactor < 80
  const isVIBE = p.turboFactor <= 2 && p.flipAngle >= 6 && p.flipAngle <= 20 && p.TR < 10
  const isTOF = p.TR < 40 && p.TE < 10 && p.flipAngle > 15 && !isVIBE
  const isGRE = p.turboFactor <= 2 && p.TR < 200 && !isDWI && !isVIBE && !isTOF

  if (isDWI) return { type: 'EPI DWI', color: '#f87171',
    details: `b=${p.bValues.join('/')} s/mm²  ${p.ipatMode !== 'Off' ? `iPAT×${p.ipatFactor}` : ''}` }
  if (isFLAIR) return { type: 'FLAIR', color: '#a78bfa',
    details: `TI=${p.TI}ms  ETL=${p.turboFactor}  ${p.partialFourier !== 'Off' ? `PF ${p.partialFourier}` : ''}` }
  if (isSTIR) return { type: 'STIR', color: '#fb923c',
    details: `TI=${p.TI}ms  脂肪抑制IR` }
  if (isHASTE) return { type: 'HASTE SS', color: '#38bdf8',
    details: `ETL=${p.turboFactor}  PF ${p.partialFourier}` }
  if (isVIBE) return { type: 'VIBE/GRE3D', color: '#34d399',
    details: `FA=${p.flipAngle}°  TR=${p.TR}ms` }
  if (isTOF) return { type: 'TOF MRA', color: '#fde047',
    details: `TR=${p.TR}ms  FA=${p.flipAngle}°` }
  if (isGRE) return { type: 'GRE', color: '#34d399',
    details: `TR=${p.TR}ms  FA=${p.flipAngle}°` }
  if (isTSE && isFLAIR) return { type: 'IR TSE', color: '#a78bfa',
    details: `TI=${p.TI}ms  ETL=${p.turboFactor}` }
  if (isTSE && isIR) return { type: 'IR TSE', color: '#c084fc',
    details: `TI=${p.TI}ms  ETL=${p.turboFactor}` }
  if (isTSE) {
    const isT1 = p.TR < 1000 && p.TE < 30
    const isT2 = p.TR >= 2500 && p.TE >= 60
    const isPD = p.TR >= 2000 && p.TE < 50
    const label = isT1 ? 'T1w TSE' : isT2 ? 'T2w TSE' : isPD ? 'PDw TSE' : 'TSE'
    return { type: label, color: isT1 ? '#fbbf24' : isT2 ? '#60a5fa' : '#86efac',
      details: `ETL=${p.turboFactor}  ES=${p.echoSpacing}ms  ${p.partialFourier !== 'Off' ? `PF ${p.partialFourier}` : ''}` }
  }
  return { type: 'SE/Mixed', color: '#9ca3af',
    details: `TR=${p.TR}ms  TE=${p.TE}ms  FA=${p.flipAngle}°` }
}

// ────────────────────────────────────────────────────────────────────────────
// ボクセルサイズ文字列
// ────────────────────────────────────────────────────────────────────────────
export function voxelStr(p: ProtocolParams): string {
  const rp = (p.fov / p.matrixFreq).toFixed(1)
  const pp = (p.fov / p.matrixPhase * (100 / p.phaseResolution)).toFixed(1)
  const sp = p.sliceThickness.toFixed(1)
  return `${rp}×${pp}×${sp} mm`
}

// ────────────────────────────────────────────────────────────────────────────
// 化学シフト量 (pixels)
// ────────────────────────────────────────────────────────────────────────────
export function chemShift(p: ProtocolParams): number {
  const freqDiff = p.fieldStrength === 3.0 ? 440 : 220
  return Math.round((freqDiff / Math.max(p.bandwidth, 1)) * 10) / 10
}

// ────────────────────────────────────────────────────────────────────────────
// T2 ぼけ推定 (PSF blur factor — ETL/echo spacing 依存)
// ────────────────────────────────────────────────────────────────────────────
export function calcT2Blur(p: ProtocolParams, tissueT2ms = 80): number {
  if (p.turboFactor <= 1) return 1.0
  // Effective echo time spread across ETL
  const lastEchoTE = p.TE + p.echoSpacing * (p.turboFactor - 1)
  const decay = Math.exp(-lastEchoTE / tissueT2ms) / Math.exp(-p.TE / tissueT2ms)
  return Math.max(0.1, Math.round(decay * 100) / 100)
}

// ────────────────────────────────────────────────────────────────────────────
// PNS（末梢神経刺激）リスク推定
// ────────────────────────────────────────────────────────────────────────────
export type PNSLevel = 'none' | 'low' | 'moderate' | 'high'
export function calcPNSRisk(p: ProtocolParams): PNSLevel {
  if (p.gradientMode === 'Whisper') return 'none'
  // EPI + Fast gradient が最もリスク高
  if (p.turboFactor <= 1 && p.gradientMode === 'Fast') return 'high'
  if (p.turboFactor <= 1) return 'moderate'
  if (p.gradientMode === 'Fast' && p.echoSpacing < 3.0) return 'moderate'
  return 'low'
}

// ────────────────────────────────────────────────────────────────────────────
// TE_min 物理計算 (シーケンスタイプ依存)
// Real scanner では TE を TE_min 未満に設定するとエラー/自動補正される
// ────────────────────────────────────────────────────────────────────────────
export function calcTEmin(p: ProtocolParams): number {
  const isTSE = p.turboFactor > 1
  const isDWI = p.bValues.length > 1 && p.turboFactor <= 2

  if (isTSE) {
    // TSE: effective TE = echo at k-space center
    // TE_min ≈ floor(ETL/2) × EchoSpacing + RF pulse duration (≈2ms)
    return Math.ceil(Math.floor(p.turboFactor / 2) * p.echoSpacing + 2)
  }

  if (isDWI) {
    // EPI DWI: TE_min = EPI readout time / 2 + diffusion prep time
    const ipatFactor = p.ipatMode !== 'Off' ? p.ipatFactor : 1
    const epiLines = Math.ceil(p.matrixPhase / ipatFactor)
    const readoutMs = epiLines * (1000 / Math.max(p.bandwidth, 1))
    const diffPrepMs = p.bValues.some(b => b > 0) ? 28 : 0
    return Math.ceil(readoutMs / 2 + diffPrepMs + 5)
  }

  // SE / GRE: TE_min = readout duration / 2 (centered acquisition)
  const readoutMs = (p.matrixFreq / Math.max(p.bandwidth, 1)) * 1000
  return Math.ceil(readoutMs / 2 + 1)
}

// ────────────────────────────────────────────────────────────────────────────
// TR_min 物理計算
// TSE では全エコートレインを収容できる最小 TR
// ────────────────────────────────────────────────────────────────────────────
export function calcTRmin(p: ProtocolParams): number {
  const isTSE = p.turboFactor > 1
  if (isTSE) {
    // TR_min = TE + (ETL - center_echo) × ES + crusher/spoiler (~5ms)
    const lastEchoTime = p.TE + (p.turboFactor - Math.floor(p.turboFactor / 2) - 1) * p.echoSpacing
    return Math.ceil(lastEchoTime + 10)
  }
  // GRE / SE: TR_min = TE + readout + spoiler (~5ms)
  const readoutMs = (p.matrixFreq / Math.max(p.bandwidth, 1)) * 1000
  return Math.ceil(p.TE + readoutMs / 2 + 5)
}
