import type { ProtocolParams } from '../data/presets'

/** TSE/HASTE おおよそのスキャン時間(秒) */
export function calcScanTime(p: ProtocolParams): number {
  if (p.turboFactor <= 1) {
    // EPI系: TR * slices / 1000
    return Math.round((p.TR * p.slices) / 1000)
  }
  // TSE: TR * matrixPhase * phaseResolution/100 / turboFactor / averages / iPAT / 1000
  const phaseLines = Math.round(p.matrixPhase * (p.phaseResolution / 100))
  const ipatDiv = p.ipatMode !== 'Off' ? p.ipatFactor : 1
  const time = (p.TR * phaseLines * p.averages) / p.turboFactor / ipatDiv / 1000
  return Math.round(time)
}

/** SAR推定 (相対値 0-100%) */
export function calcSARLevel(p: ProtocolParams): number {
  // SAR ∝ FA² × 1/TR × ETL × fieldStrength²
  const faNorm = p.flipAngle / 90
  const trNorm = 2000 / Math.max(p.TR, 100)
  const etlNorm = Math.min(p.turboFactor, 200) / 50
  const fieldNorm = (p.fieldStrength / 1.5) ** 2
  const raw = faNorm ** 2 * trNorm * etlNorm * fieldNorm * 40
  return Math.min(Math.round(raw), 100)
}

export type SARLevel = 'low' | 'medium' | 'high' | 'over'
export function sarLevel(pct: number): SARLevel {
  if (pct < 40) return 'low'
  if (pct < 70) return 'medium'
  if (pct < 90) return 'high'
  return 'over'
}

/** SNR相対スコア (比較用・基準100) */
export function calcSNR(p: ProtocolParams): number {
  const voxel = (p.fov / p.matrixFreq) * (p.fov / p.matrixPhase) * p.sliceThickness
  const bwNorm = 200 / Math.max(p.bandwidth, 50)
  const avgNorm = Math.sqrt(p.averages)
  const ipatNorm = p.ipatMode !== 'Off' ? 1 / Math.sqrt(p.ipatFactor) : 1
  const snr = voxel * bwNorm * avgNorm * ipatNorm * 10
  return Math.round(Math.min(snr, 200))
}

/** ボクセルサイズ文字列 */
export function voxelStr(p: ProtocolParams): string {
  const rp = (p.fov / p.matrixFreq).toFixed(1)
  const pp = (p.fov / p.matrixPhase * (100 / p.phaseResolution)).toFixed(1)
  const sp = p.sliceThickness.toFixed(1)
  return `${rp}×${pp}×${sp} mm`
}

/** 化学シフト量 (pixels) */
export function chemShift(p: ProtocolParams): number {
  const freqDiff = p.fieldStrength === 3.0 ? 440 : 220
  return Math.round((freqDiff / Math.max(p.bandwidth, 1)) * 10) / 10
}
