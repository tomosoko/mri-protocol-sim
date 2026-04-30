import { describe, it, expect } from 'vitest'
import type { ProtocolParams } from '../data/presets'
import {
  ernstAngle,
  calcGFactor,
  calcScanTime,
  calcSARLevel,
  sarLevel,
  calcSNR,
  calcTissueContrast,
  identifySequence,
  voxelStr,
  chemShift,
  calcT2Blur,
  calcPNSRisk,
  calcTEmin,
  calcTRmin,
} from './calculators'

// ─── Base protocol fixture ───────────────────────────────────────────────────
const base: ProtocolParams = {
  TR: 5000, TE: 100, TI: 0,
  flipAngle: 90, slices: 20, sliceThickness: 5, sliceGap: 0.5, averages: 1,
  phaseOversampling: 0, sarAssistant: 'Normal', allowedDelay: 0,
  fatSat: 'None', mt: false,
  matrixFreq: 256, matrixPhase: 256, fov: 256, phaseResolution: 100,
  bandwidth: 200, interpolation: false,
  orientation: 'Tra', phaseEncDir: 'A>>P', satBands: false,
  coil: 'Head_64', coilType: 'Head_64',
  ipatMode: 'Off', ipatFactor: 2,
  gradientMode: 'Normal', shim: 'Auto',
  ecgTrigger: false, respTrigger: 'Off', triggerDelay: 0, triggerWindow: 0,
  inlineADC: false, inlineMIP: false, inlineMPR: false, inlineSubtraction: false,
  turboFactor: 15, echoSpacing: 4.5,
  partialFourier: 'Off', bValues: [0],
  fieldStrength: 1.5,
}

// ─── ernstAngle ──────────────────────────────────────────────────────────────
describe('ernstAngle', () => {
  it('returns ~90 when TR >> T1 (full relaxation)', () => {
    expect(ernstAngle(1000, 100_000)).toBeCloseTo(90, 0)
  })

  it('returns ~0 when TR << T1 (almost no recovery)', () => {
    expect(ernstAngle(1000, 1)).toBeLessThan(5)
  })

  it('returns ~70 for GM at 3T (T1=1820ms) with TR=2000ms', () => {
    const angle = ernstAngle(1820, 2000)
    expect(angle).toBeGreaterThan(65)
    expect(angle).toBeLessThan(76)
  })
})

// ─── calcGFactor ─────────────────────────────────────────────────────────────
describe('calcGFactor', () => {
  it('returns 1.0 with iPAT Off', () => {
    expect(calcGFactor('Off', 2)).toBe(1.0)
  })

  it('returns ~1.08 for GRAPPA AF2', () => {
    expect(calcGFactor('GRAPPA', 2)).toBeCloseTo(1.08, 2)
  })

  it('returns ~1.28 for GRAPPA AF3', () => {
    expect(calcGFactor('GRAPPA', 3)).toBeCloseTo(1.28, 2)
  })

  it('CAIPIRINHA g-factor is lower than GRAPPA for same AF', () => {
    expect(calcGFactor('CAIPIRINHA', 2)).toBeLessThan(calcGFactor('GRAPPA', 2))
  })
})

// ─── calcScanTime ─────────────────────────────────────────────────────────────
describe('calcScanTime', () => {
  it('TSE: more averages increases scan time', () => {
    const t1 = calcScanTime({ ...base, averages: 1 })
    const t2 = calcScanTime({ ...base, averages: 2 })
    expect(t2).toBeGreaterThan(t1)
  })

  it('TSE: iPAT reduces scan time', () => {
    const tNo = calcScanTime({ ...base, ipatMode: 'Off' })
    const tIpat = calcScanTime({ ...base, ipatMode: 'GRAPPA', ipatFactor: 2 })
    expect(tIpat).toBeLessThan(tNo)
  })

  it('partial Fourier reduces scan time', () => {
    const tFull = calcScanTime({ ...base, partialFourier: 'Off' })
    const tPF = calcScanTime({ ...base, partialFourier: '6/8' })
    expect(tPF).toBeLessThan(tFull)
  })

  it('HASTE (turboFactor>=100): scan time = round(TR * slices / 1000)', () => {
    const p = { ...base, turboFactor: 200, TR: 1000, slices: 10 }
    expect(calcScanTime(p)).toBe(10)
  })

  it('EPI/DWI (turboFactor<=1): scan time = round(TR * slices * averages / 1000)', () => {
    const p = { ...base, turboFactor: 1, TR: 5000, slices: 20, averages: 2 }
    expect(calcScanTime(p)).toBe(200)
  })

  it('respiratory trigger adds overhead', () => {
    const tNormal = calcScanTime(base)
    const tNav = calcScanTime({ ...base, respTrigger: 'RT' })
    expect(tNav).toBeGreaterThan(tNormal)
  })
})

// ─── calcSARLevel / sarLevel ──────────────────────────────────────────────────
describe('calcSARLevel', () => {
  it('3T is higher SAR than 1.5T for same protocol', () => {
    const sar15 = calcSARLevel({ ...base, fieldStrength: 1.5 })
    const sar3 = calcSARLevel({ ...base, fieldStrength: 3.0 })
    expect(sar3).toBeGreaterThan(sar15)
  })

  it('fat saturation increases SAR', () => {
    const sarNone = calcSARLevel({ ...base, fatSat: 'None' })
    const sarSpair = calcSARLevel({ ...base, fatSat: 'SPAIR' })
    expect(sarSpair).toBeGreaterThan(sarNone)
  })

  it('MT pulse increases SAR', () => {
    const sarNoMT = calcSARLevel({ ...base, mt: false })
    const sarMT = calcSARLevel({ ...base, mt: true })
    expect(sarMT).toBeGreaterThan(sarNoMT)
  })

  it('Body coil has higher SAR than Head coil', () => {
    const sarHead = calcSARLevel({ ...base, coilType: 'Head_64' })
    const sarBody = calcSARLevel({ ...base, coilType: 'Body' })
    expect(sarBody).toBeGreaterThan(sarHead)
  })

  it('SAR is capped at 100', () => {
    const p = { ...base, flipAngle: 180, turboFactor: 200, TR: 500, mt: true, fatSat: 'SPAIR' as const, fieldStrength: 3.0 as const }
    expect(calcSARLevel(p)).toBeLessThanOrEqual(100)
  })
})

describe('sarLevel', () => {
  it('classifies thresholds correctly', () => {
    expect(sarLevel(20)).toBe('low')
    expect(sarLevel(55)).toBe('medium')
    expect(sarLevel(80)).toBe('high')
    expect(sarLevel(95)).toBe('over')
  })

  it('boundary: 40 is medium, 39 is low', () => {
    expect(sarLevel(39)).toBe('low')
    expect(sarLevel(40)).toBe('medium')
  })

  it('boundary: 90 is over, 89 is high', () => {
    expect(sarLevel(89)).toBe('high')
    expect(sarLevel(90)).toBe('over')
  })
})

// ─── calcSNR ─────────────────────────────────────────────────────────────────
describe('calcSNR', () => {
  it('3T has higher SNR than 1.5T', () => {
    const snr15 = calcSNR({ ...base, fieldStrength: 1.5 })
    const snr3 = calcSNR({ ...base, fieldStrength: 3.0 })
    expect(snr3).toBeGreaterThan(snr15)
  })

  it('larger FOV gives higher SNR (larger voxel)', () => {
    const snrSmall = calcSNR({ ...base, fov: 200 })
    const snrLarge = calcSNR({ ...base, fov: 400 })
    expect(snrLarge).toBeGreaterThan(snrSmall)
  })

  it('more averages increases SNR', () => {
    const snr1 = calcSNR({ ...base, averages: 1 })
    const snr4 = calcSNR({ ...base, averages: 4 })
    expect(snr4).toBeGreaterThan(snr1)
  })

  it('iPAT reduces SNR', () => {
    const snrNo = calcSNR({ ...base, ipatMode: 'Off' })
    const snrIpat = calcSNR({ ...base, ipatMode: 'GRAPPA', ipatFactor: 2 })
    expect(snrIpat).toBeLessThan(snrNo)
  })

  it('is capped at 200', () => {
    const p = { ...base, fov: 500, matrixFreq: 64, matrixPhase: 64, sliceThickness: 10, bandwidth: 50 }
    expect(calcSNR(p)).toBeLessThanOrEqual(200)
  })
})

// ─── calcTissueContrast ───────────────────────────────────────────────────────
describe('calcTissueContrast', () => {
  it('returns all 7 tissues', () => {
    expect(calcTissueContrast(base)).toHaveLength(7)
  })

  it('max signal is normalized to 1.0', () => {
    const results = calcTissueContrast(base)
    const max = Math.max(...results.map(r => r.signal))
    expect(max).toBeCloseTo(1.0, 5)
  })

  it('fat signal is zero when fatSat is active', () => {
    const results = calcTissueContrast({ ...base, fatSat: 'CHESS' })
    const fat = results.find(r => r.tissue.label === 'Fat')!
    expect(fat.signal).toBe(0)
    expect(fat.nulled).toBe(true)
  })

  it('fat is not nulled without fatSat', () => {
    const results = calcTissueContrast({ ...base, fatSat: 'None' })
    const fat = results.find(r => r.tissue.label === 'Fat')!
    expect(fat.nulled).toBe(false)
  })

  it('all signals are non-negative', () => {
    const results = calcTissueContrast(base)
    results.forEach(r => expect(r.signal).toBeGreaterThanOrEqual(0))
  })
})

// ─── identifySequence ─────────────────────────────────────────────────────────
describe('identifySequence', () => {
  it('identifies T2w TSE (long TR, long TE, ETL>1)', () => {
    const p = { ...base, TR: 5000, TE: 100, turboFactor: 15, flipAngle: 90 }
    expect(identifySequence(p).type).toBe('T2w TSE')
  })

  it('identifies T1w TSE (short TR, short TE)', () => {
    const p = { ...base, TR: 600, TE: 12, turboFactor: 5, flipAngle: 90 }
    expect(identifySequence(p).type).toBe('T1w TSE')
  })

  it('identifies HASTE (turboFactor >= 100)', () => {
    expect(identifySequence({ ...base, turboFactor: 200 }).type).toBe('HASTE SS')
  })

  it('identifies DWI EPI (multiple b-values, turboFactor <= 2)', () => {
    const p = { ...base, turboFactor: 1, bValues: [0, 1000] }
    expect(identifySequence(p).type).toBe('EPI DWI')
  })

  it('identifies GRE (low flip angle, no TSE)', () => {
    const p = { ...base, turboFactor: 1, flipAngle: 15, TR: 30, TE: 5 }
    expect(identifySequence(p).type).toBe('GRE')
  })

  it('identifies FLAIR (TI > 0, TSE, long TR)', () => {
    const p = { ...base, TI: 2200, turboFactor: 15, TR: 9000, TE: 100 }
    expect(identifySequence(p).type).toBe('FLAIR')
  })

  it('returned object has type, color, and details fields', () => {
    const seq = identifySequence(base)
    expect(seq).toHaveProperty('type')
    expect(seq).toHaveProperty('color')
    expect(seq).toHaveProperty('details')
  })
})

// ─── voxelStr ────────────────────────────────────────────────────────────────
describe('voxelStr', () => {
  it('formats isotropic 1mm voxel correctly', () => {
    const p = { ...base, fov: 256, matrixFreq: 256, matrixPhase: 256, phaseResolution: 100, sliceThickness: 1.0 }
    expect(voxelStr(p)).toBe('1.0×1.0×1.0 mm')
  })

  it('reflects 50% phase resolution (doubles phase pixel size)', () => {
    const p = { ...base, fov: 256, matrixFreq: 256, matrixPhase: 256, phaseResolution: 50, sliceThickness: 5.0 }
    // phase pixel = 256/256 * (100/50) = 2.0mm, freq pixel = 256/256 = 1.0mm
    expect(voxelStr(p)).toBe('1.0×2.0×5.0 mm')
  })
})

// ─── chemShift ───────────────────────────────────────────────────────────────
describe('chemShift', () => {
  it('3T has approximately twice the chemical shift of 1.5T', () => {
    const cs15 = chemShift({ ...base, fieldStrength: 1.5, bandwidth: 200 })
    const cs3 = chemShift({ ...base, fieldStrength: 3.0, bandwidth: 200 })
    expect(cs3).toBeCloseTo(cs15 * 2, 0)
  })

  it('wider bandwidth reduces chemical shift', () => {
    const csNarrow = chemShift({ ...base, bandwidth: 100 })
    const csWide = chemShift({ ...base, bandwidth: 400 })
    expect(csWide).toBeLessThan(csNarrow)
  })
})

// ─── calcT2Blur ───────────────────────────────────────────────────────────────
describe('calcT2Blur', () => {
  it('returns 1.0 for single-echo sequences (turboFactor <= 1)', () => {
    expect(calcT2Blur({ ...base, turboFactor: 1 })).toBe(1.0)
  })

  it('longer ETL causes more T2 blurring (lower decay factor)', () => {
    const blurShort = calcT2Blur({ ...base, turboFactor: 5 })
    const blurLong = calcT2Blur({ ...base, turboFactor: 30 })
    expect(blurLong).toBeLessThan(blurShort)
  })

  it('is clamped at minimum 0.1', () => {
    const blur = calcT2Blur({ ...base, turboFactor: 200, TE: 200, echoSpacing: 10 }, 20)
    expect(blur).toBeGreaterThanOrEqual(0.1)
  })
})

// ─── calcPNSRisk ──────────────────────────────────────────────────────────────
describe('calcPNSRisk', () => {
  it('Whisper gradient mode = none', () => {
    expect(calcPNSRisk({ ...base, gradientMode: 'Whisper' })).toBe('none')
  })

  it('EPI (turboFactor<=1) + Fast gradient = high', () => {
    expect(calcPNSRisk({ ...base, turboFactor: 1, gradientMode: 'Fast' })).toBe('high')
  })

  it('EPI without Fast gradient = moderate', () => {
    expect(calcPNSRisk({ ...base, turboFactor: 1, gradientMode: 'Normal' })).toBe('moderate')
  })

  it('TSE with normal gradient = low', () => {
    expect(calcPNSRisk({ ...base, turboFactor: 15, gradientMode: 'Normal' })).toBe('low')
  })
})

// ─── calcTEmin ───────────────────────────────────────────────────────────────
describe('calcTEmin', () => {
  it('TSE: TEmin increases with longer ETL', () => {
    const te5 = calcTEmin({ ...base, turboFactor: 5 })
    const te30 = calcTEmin({ ...base, turboFactor: 30 })
    expect(te30).toBeGreaterThan(te5)
  })

  it('DWI: TEmin is larger than SE due to diffusion prep', () => {
    const teDWI = calcTEmin({ ...base, turboFactor: 1, bValues: [0, 1000] })
    const teSE = calcTEmin({ ...base, turboFactor: 1, bValues: [0] })
    expect(teDWI).toBeGreaterThan(teSE)
  })

  it('returns a positive integer', () => {
    const te = calcTEmin(base)
    expect(te).toBeGreaterThan(0)
    expect(Number.isInteger(te)).toBe(true)
  })
})

// ─── calcTRmin ───────────────────────────────────────────────────────────────
describe('calcTRmin', () => {
  it('TSE: TRmin increases with longer ETL', () => {
    const tr5 = calcTRmin({ ...base, turboFactor: 5, TE: 30 })
    const tr30 = calcTRmin({ ...base, turboFactor: 30, TE: 30 })
    expect(tr30).toBeGreaterThan(tr5)
  })

  it('TSE: TRmin is always greater than TE', () => {
    expect(calcTRmin(base)).toBeGreaterThan(base.TE)
  })

  it('returns a positive integer', () => {
    const tr = calcTRmin(base)
    expect(tr).toBeGreaterThan(0)
    expect(Number.isInteger(tr)).toBe(true)
  })
})
