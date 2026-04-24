import { describe, it, expect } from 'vitest'
import type { ProtocolParams } from '../data/presets'
import {
  ernstAngle,
  calcGFactor,
  calcSARLevel,
  calcSNR,
  calcScanTime,
  identifySequence,
  calcTEmin,
  calcTRmin,
  calcT2Blur,
  calcPNSRisk,
  chemShift,
  voxelStr,
  sarLevel,
  calcTissueContrast,
  TISSUES,
} from './calculators'

// ─── Base fixture (T2w TSE, 1.5T) ──────────────────────────────────────────
const base: ProtocolParams = {
  TR: 5000, TE: 100, TI: 0, flipAngle: 90,
  slices: 20, sliceThickness: 5, sliceGap: 20,
  averages: 1, phaseOversampling: 0,
  sarAssistant: 'Normal', allowedDelay: 30,
  fatSat: 'None', mt: false,
  matrixFreq: 256, matrixPhase: 256, fov: 300,
  phaseResolution: 100, bandwidth: 200, interpolation: false,
  orientation: 'Tra', phaseEncDir: 'A>>P', satBands: false,
  coil: 'Body', coilType: 'Body',
  ipatMode: 'Off', ipatFactor: 2,
  gradientMode: 'Normal', shim: 'Auto',
  ecgTrigger: false, respTrigger: 'Off',
  triggerDelay: 0, triggerWindow: 5,
  inlineADC: false, inlineMIP: false, inlineMPR: false, inlineSubtraction: false,
  turboFactor: 15, echoSpacing: 4.5,
  partialFourier: 'Off', bValues: [0, 1000],
  fieldStrength: 1.5,
}

// ─── ernstAngle ─────────────────────────────────────────────────────────────
describe('ernstAngle', () => {
  it('returns ~52° for T1=1000ms, TR=1000ms (classic result)', () => {
    // Ernst angle = acos(exp(-TR/T1)) = acos(exp(-1)) ≈ 68.4°? No:
    // acos(e^-1) = acos(0.3679) ≈ 68.4°... let me verify: the formula
    // Actually cos(θ) = exp(-TR/T1), so for TR=T1 → exp(-1) ≈ 0.368 → θ ≈ 68.4°
    const angle = ernstAngle(1000, 1000)
    expect(angle).toBeCloseTo(68.4, 0)
  })

  it('approaches 90° when TR >> T1', () => {
    const angle = ernstAngle(500, 100000)
    expect(angle).toBeGreaterThan(89)
  })

  it('approaches 0° when TR << T1', () => {
    const angle = ernstAngle(5000, 1)
    expect(angle).toBeLessThan(2)
  })
})

// ─── calcGFactor ─────────────────────────────────────────────────────────────
describe('calcGFactor', () => {
  it('returns 1.0 when iPAT is Off', () => {
    expect(calcGFactor('Off', 2)).toBe(1.0)
  })

  it('returns 1.08 for GRAPPA AF=2', () => {
    expect(calcGFactor('GRAPPA', 2)).toBeCloseTo(1.08)
  })

  it('returns 1.28 for GRAPPA AF=3', () => {
    expect(calcGFactor('GRAPPA', 3)).toBeCloseTo(1.28)
  })

  it('returns lower g-factor for CAIPIRINHA than GRAPPA (same AF)', () => {
    const grappa = calcGFactor('GRAPPA', 3)
    const caipirinha = calcGFactor('CAIPIRINHA', 3)
    expect(caipirinha).toBeLessThan(grappa)
  })
})

// ─── calcSARLevel ────────────────────────────────────────────────────────────
describe('calcSARLevel', () => {
  it('is higher at 3T than 1.5T (same params)', () => {
    const sar15 = calcSARLevel({ ...base, fieldStrength: 1.5 })
    const sar3 = calcSARLevel({ ...base, fieldStrength: 3.0 })
    expect(sar3).toBeGreaterThan(sar15)
  })

  it('is higher with SPAIR fat-sat than None', () => {
    const sarNone = calcSARLevel({ ...base, fatSat: 'None' })
    const sarSpair = calcSARLevel({ ...base, fatSat: 'SPAIR' })
    expect(sarSpair).toBeGreaterThan(sarNone)
  })

  it('is higher with MT on than off', () => {
    const sarOff = calcSARLevel({ ...base, mt: false })
    const sarOn = calcSARLevel({ ...base, mt: true })
    expect(sarOn).toBeGreaterThan(sarOff)
  })

  it('never exceeds 100', () => {
    const extreme = { ...base, flipAngle: 180, TR: 100, turboFactor: 200, fieldStrength: 3.0 as const, fatSat: 'STIR' as const, mt: true }
    expect(calcSARLevel(extreme)).toBeLessThanOrEqual(100)
  })

  it('increases with higher flip angle', () => {
    const sar90 = calcSARLevel({ ...base, flipAngle: 90 })
    const sar150 = calcSARLevel({ ...base, flipAngle: 150 })
    expect(sar150).toBeGreaterThan(sar90)
  })
})

// ─── sarLevel ────────────────────────────────────────────────────────────────
describe('sarLevel', () => {
  it('classifies 0% as low', () => expect(sarLevel(0)).toBe('low'))
  it('classifies 39% as low', () => expect(sarLevel(39)).toBe('low'))
  it('classifies 40% as medium', () => expect(sarLevel(40)).toBe('medium'))
  it('classifies 70% as high', () => expect(sarLevel(70)).toBe('high'))
  it('classifies 90% as over', () => expect(sarLevel(90)).toBe('over'))
})

// ─── calcSNR ─────────────────────────────────────────────────────────────────
describe('calcSNR', () => {
  it('is higher with more averages', () => {
    const snr1 = calcSNR({ ...base, averages: 1 })
    const snr4 = calcSNR({ ...base, averages: 4 })
    expect(snr4).toBeGreaterThan(snr1)
  })

  it('is higher with larger voxel (bigger FOV, same matrix)', () => {
    const snrSmall = calcSNR({ ...base, fov: 200 })
    const snrLarge = calcSNR({ ...base, fov: 400 })
    expect(snrLarge).toBeGreaterThan(snrSmall)
  })

  it('is lower with iPAT enabled', () => {
    const snrNoIPAT = calcSNR({ ...base, ipatMode: 'Off' })
    const snrIPAT = calcSNR({ ...base, ipatMode: 'GRAPPA', ipatFactor: 2 })
    expect(snrIPAT).toBeLessThan(snrNoIPAT)
  })

  it('is higher at 3T than 1.5T', () => {
    const snr15 = calcSNR({ ...base, fieldStrength: 1.5, coilType: 'Head_64' })
    const snr3 = calcSNR({ ...base, fieldStrength: 3.0, coilType: 'Head_64' })
    expect(snr3).toBeGreaterThan(snr15)
  })

  it('never exceeds 200', () => {
    const extreme = { ...base, averages: 16, fov: 500, sliceThickness: 10, bandwidth: 50 }
    expect(calcSNR(extreme)).toBeLessThanOrEqual(200)
  })
})

// ─── calcScanTime ─────────────────────────────────────────────────────────────
describe('calcScanTime', () => {
  it('basic TSE scan time roughly doubles when averages doubles', () => {
    const t1 = calcScanTime({ ...base, averages: 1 })
    const t2 = calcScanTime({ ...base, averages: 2 })
    // Math.round can cause ±1 second discrepancy, so allow delta of 2
    expect(Math.abs(t2 - t1 * 2)).toBeLessThanOrEqual(2)
  })

  it('iPAT reduces scan time', () => {
    const tNoIPAT = calcScanTime({ ...base, ipatMode: 'Off' })
    const tIPAT = calcScanTime({ ...base, ipatMode: 'GRAPPA', ipatFactor: 2 })
    expect(tIPAT).toBeLessThan(tNoIPAT)
  })

  it('PACE trigger adds overhead (longer scan time)', () => {
    const tOff = calcScanTime({ ...base, respTrigger: 'Off' })
    const tPACE = calcScanTime({ ...base, respTrigger: 'PACE' })
    expect(tPACE).toBeGreaterThan(tOff)
  })

  it('EPI (turboFactor=1) uses TR × slices × averages formula', () => {
    const p = { ...base, turboFactor: 1, TR: 5000, slices: 10, averages: 1 }
    expect(calcScanTime(p)).toBe(50) // 5000 * 10 * 1 / 1000
  })

  it('HASTE (turboFactor≥100) uses TR × slices formula', () => {
    const p = { ...base, turboFactor: 128, TR: 1000, slices: 20 }
    expect(calcScanTime(p)).toBe(20) // 1000 * 20 / 1000
  })
})

// ─── identifySequence ────────────────────────────────────────────────────────
describe('identifySequence', () => {
  it('identifies T2w TSE correctly', () => {
    const p = { ...base, TR: 5000, TE: 100, turboFactor: 15, TI: 0 }
    expect(identifySequence(p).type).toBe('T2w TSE')
  })

  it('identifies FLAIR (TI > 1500, TSE)', () => {
    const p = { ...base, TI: 2000, turboFactor: 16, TR: 9000, TE: 100 }
    expect(identifySequence(p).type).toBe('FLAIR')
  })

  it('identifies STIR (fatSat=STIR, low TI)', () => {
    const p = { ...base, fatSat: 'STIR' as const, TI: 150, TR: 3000, TE: 60, turboFactor: 15 }
    expect(identifySequence(p).type).toBe('STIR')
  })

  it('identifies HASTE (turboFactor >= 80)', () => {
    const p = { ...base, turboFactor: 128, TR: 1000, TE: 90 }
    expect(identifySequence(p).type).toBe('HASTE SS')
  })

  it('identifies EPI DWI (bValues.length > 1, turboFactor <= 2)', () => {
    const p = { ...base, bValues: [0, 500, 1000], turboFactor: 1 }
    expect(identifySequence(p).type).toBe('EPI DWI')
  })

  it('identifies VIBE (small FA, short TR, turboFactor<=2)', () => {
    const p = { ...base, flipAngle: 12, TR: 5, turboFactor: 1, bValues: [0] }
    expect(identifySequence(p).type).toBe('VIBE/GRE3D')
  })

  it('identifies T1w TSE (short TR, short TE)', () => {
    const p = { ...base, TR: 600, TE: 12, turboFactor: 5, TI: 0 }
    expect(identifySequence(p).type).toBe('T1w TSE')
  })
})

// ─── calcTEmin ───────────────────────────────────────────────────────────────
describe('calcTEmin', () => {
  it('TSE TE_min increases with longer echo spacing', () => {
    const teMinShort = calcTEmin({ ...base, turboFactor: 10, echoSpacing: 3 })
    const teMinLong = calcTEmin({ ...base, turboFactor: 10, echoSpacing: 8 })
    expect(teMinLong).toBeGreaterThan(teMinShort)
  })

  it('TSE TE_min increases with more turbo factor', () => {
    const teMin5 = calcTEmin({ ...base, turboFactor: 5, echoSpacing: 4.5 })
    const teMin20 = calcTEmin({ ...base, turboFactor: 20, echoSpacing: 4.5 })
    expect(teMin20).toBeGreaterThan(teMin5)
  })

  it('SE TE_min is positive', () => {
    const teMin = calcTEmin({ ...base, turboFactor: 1, bValues: [0] })
    expect(teMin).toBeGreaterThan(0)
  })
})

// ─── calcTRmin ───────────────────────────────────────────────────────────────
describe('calcTRmin', () => {
  it('TSE TR_min is greater than TE', () => {
    const trMin = calcTRmin({ ...base, TE: 100, turboFactor: 15, echoSpacing: 4.5 })
    expect(trMin).toBeGreaterThan(100)
  })

  it('SE TR_min is greater than TE', () => {
    const trMin = calcTRmin({ ...base, TE: 20, turboFactor: 1 })
    expect(trMin).toBeGreaterThan(20)
  })
})

// ─── calcT2Blur ──────────────────────────────────────────────────────────────
describe('calcT2Blur', () => {
  it('returns 1.0 for EPI (turboFactor <= 1)', () => {
    expect(calcT2Blur({ ...base, turboFactor: 1 })).toBe(1.0)
  })

  it('is lower (more blur) with longer echo train', () => {
    const blur5 = calcT2Blur({ ...base, turboFactor: 5, TE: 50, echoSpacing: 4.5 })
    const blur30 = calcT2Blur({ ...base, turboFactor: 30, TE: 50, echoSpacing: 4.5 })
    expect(blur30).toBeLessThan(blur5)
  })

  it('never goes below 0.1', () => {
    const extreme = { ...base, turboFactor: 200, echoSpacing: 10, TE: 200 }
    expect(calcT2Blur(extreme)).toBeGreaterThanOrEqual(0.1)
  })
})

// ─── calcPNSRisk ─────────────────────────────────────────────────────────────
describe('calcPNSRisk', () => {
  it('returns none for Whisper gradient mode', () => {
    expect(calcPNSRisk({ ...base, gradientMode: 'Whisper' })).toBe('none')
  })

  it('returns high for EPI + Fast gradient', () => {
    const p = { ...base, turboFactor: 1, gradientMode: 'Fast' as const }
    expect(calcPNSRisk(p)).toBe('high')
  })

  it('returns moderate for EPI + Normal gradient', () => {
    const p = { ...base, turboFactor: 1, gradientMode: 'Normal' as const }
    expect(calcPNSRisk(p)).toBe('moderate')
  })

  it('returns low for standard TSE', () => {
    const p = { ...base, turboFactor: 15, gradientMode: 'Normal' as const }
    expect(calcPNSRisk(p)).toBe('low')
  })
})

// ─── chemShift ───────────────────────────────────────────────────────────────
describe('chemShift', () => {
  it('is higher at 3T than 1.5T (same bandwidth)', () => {
    const cs15 = chemShift({ ...base, fieldStrength: 1.5, bandwidth: 200 })
    const cs3 = chemShift({ ...base, fieldStrength: 3.0, bandwidth: 200 })
    expect(cs3).toBeGreaterThan(cs15)
  })

  it('decreases with wider bandwidth', () => {
    const csNarrow = chemShift({ ...base, bandwidth: 100 })
    const csWide = chemShift({ ...base, bandwidth: 400 })
    expect(csWide).toBeLessThan(csNarrow)
  })
})

// ─── voxelStr ────────────────────────────────────────────────────────────────
describe('voxelStr', () => {
  it('returns a string with × separators', () => {
    const result = voxelStr({ ...base, fov: 256, matrixFreq: 256, matrixPhase: 256, sliceThickness: 5, phaseResolution: 100 })
    expect(result).toMatch(/\d+\.\d×\d+\.\d×\d+\.\d mm/)
  })

  it('reflects isotropic voxel when matrix is square and phaseRes=100', () => {
    const result = voxelStr({ ...base, fov: 300, matrixFreq: 300, matrixPhase: 300, sliceThickness: 1, phaseResolution: 100 })
    const parts = result.replace(' mm', '').split('×')
    expect(parseFloat(parts[0])).toBeCloseTo(parseFloat(parts[1]), 1)
  })
})

// ─── calcTissueContrast ───────────────────────────────────────────────────────
describe('calcTissueContrast', () => {
  it('returns one entry per tissue', () => {
    const results = calcTissueContrast(base)
    expect(results.length).toBe(TISSUES.length)
  })

  it('max signal is normalized to 1.0', () => {
    const results = calcTissueContrast(base)
    const maxSig = Math.max(...results.map(r => r.signal))
    expect(maxSig).toBeCloseTo(1.0, 5)
  })

  it('fat signal is zero when fatSat is CHESS', () => {
    const results = calcTissueContrast({ ...base, fatSat: 'CHESS' })
    const fat = results.find(r => r.tissue.label === 'Fat')!
    expect(fat.signal).toBe(0)
    expect(fat.nulled).toBe(true)
  })

  it('CSF has high signal in T2w (long TR, long TE)', () => {
    const p = { ...base, TR: 9000, TE: 120, TI: 0, turboFactor: 15 }
    const results = calcTissueContrast(p)
    const csf = results.find(r => r.tissue.label === 'CSF')!
    const wm = results.find(r => r.tissue.label === 'WM')!
    expect(csf.signal).toBeGreaterThan(wm.signal)
  })

  it('CSF is nulled in FLAIR (TI ≈ T1_CSF × ln2)', () => {
    // T1_CSF at 1.5T = 4000ms → null TI ≈ 2773ms
    const p = { ...base, TR: 9000, TE: 100, TI: 2773, turboFactor: 16, fieldStrength: 1.5 as const }
    const results = calcTissueContrast(p)
    const csf = results.find(r => r.tissue.label === 'CSF')!
    expect(csf.nulled).toBe(true)
  })
})
