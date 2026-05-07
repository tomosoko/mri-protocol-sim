import { describe, it, expect } from 'vitest'
import {
  calcLesionSignal,
  PATHOLOGY_PRESETS,
} from './tissueContrastUtils'
import type { ProtocolParams } from '../../data/presets'

// ── Helper: minimal ProtocolParams factory ──────────────────────────────────
function makeParams(overrides: Partial<ProtocolParams> = {}): ProtocolParams {
  return {
    TR: 5000, TE: 100, TI: 0, flipAngle: 90, slices: 20, sliceThickness: 5,
    sliceGap: 20, averages: 1, phaseOversampling: 0, sarAssistant: 'Normal',
    allowedDelay: 30, fatSat: 'None', mt: false, matrixFreq: 256,
    matrixPhase: 256, fov: 300, phaseResolution: 100, bandwidth: 200,
    interpolation: false, orientation: 'Tra', phaseEncDir: 'A>>P',
    satBands: false, coil: 'Body', coilType: 'Body', ipatMode: 'Off',
    ipatFactor: 2, gradientMode: 'Normal', shim: 'Auto', ecgTrigger: false,
    respTrigger: 'Off', triggerDelay: 0, triggerWindow: 5, inlineADC: false,
    inlineMIP: false, inlineMPR: false, inlineSubtraction: false,
    turboFactor: 15, echoSpacing: 4.5, partialFourier: 'Off',
    bValues: [0, 1000], fieldStrength: 1.5,
    ...overrides,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// PATHOLOGY_PRESETS data integrity
// ════════════════════════════════════════════════════════════════════════════
describe('PATHOLOGY_PRESETS', () => {
  it('contains exactly 4 presets', () => {
    expect(PATHOLOGY_PRESETS).toHaveLength(4)
  })

  it('all presets have unique ids', () => {
    const ids = PATHOLOGY_PRESETS.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('all presets have required fields with valid types', () => {
    for (const p of PATHOLOGY_PRESETS) {
      expect(p.id).toBeTypeOf('string')
      expect(p.label).toBeTypeOf('string')
      expect(p.T1_15).toBeTypeOf('number')
      expect(p.T2_15).toBeTypeOf('number')
      expect(p.T1_30).toBeTypeOf('number')
      expect(p.T2_30).toBeTypeOf('number')
      expect(p.backgroundLabel).toBeTypeOf('string')
      expect(p.recommendation).toBeTypeOf('string')
    }
  })

  it('T1 values are positive and T1_30 >= T1_15 (field strength effect)', () => {
    for (const p of PATHOLOGY_PRESETS) {
      expect(p.T1_15).toBeGreaterThan(0)
      expect(p.T1_30).toBeGreaterThanOrEqual(p.T1_15)
    }
  })

  it('T2 values are positive and T2_30 <= T2_15 (field strength effect)', () => {
    for (const p of PATHOLOGY_PRESETS) {
      expect(p.T2_15).toBeGreaterThan(0)
      expect(p.T2_30).toBeGreaterThan(0)
      expect(p.T2_30).toBeLessThanOrEqual(p.T2_15)
    }
  })

  it('T1 > T2 for all presets at both field strengths', () => {
    for (const p of PATHOLOGY_PRESETS) {
      expect(p.T1_15).toBeGreaterThan(p.T2_15)
      expect(p.T1_30).toBeGreaterThan(p.T2_30)
    }
  })

  it.each([
    ['stroke', '急性脳梗塞', 'GM'],
    ['tumor', '悪性腫瘍', 'WM'],
    ['ms', 'MS病変', 'WM'],
    ['cartilage', '軟骨損傷', 'Muscle'],
  ])('preset "%s" has label "%s" and background "%s"', (id, label, bg) => {
    const p = PATHOLOGY_PRESETS.find(x => x.id === id)
    expect(p).toBeDefined()
    expect(p!.label).toBe(label)
    expect(p!.backgroundLabel).toBe(bg)
  })

  it('all presets have non-empty recommendation strings', () => {
    for (const p of PATHOLOGY_PRESETS) {
      expect(p.recommendation.length).toBeGreaterThan(10)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════
// calcLesionSignal — SE path (default: no IR, not GRE)
// ════════════════════════════════════════════════════════════════════════════
describe('calcLesionSignal — SE (spin echo) path', () => {
  it('returns positive value for typical SE parameters', () => {
    const s = calcLesionSignal(1000, 80, makeParams({ TR: 5000, TE: 100, TI: 0 }))
    expect(s).toBeGreaterThan(0)
  })

  it('follows (1 - exp(-TR/T1)) * exp(-TE/T2) formula', () => {
    const T1 = 1000, T2 = 80
    const params = makeParams({ TR: 3000, TE: 50, TI: 0, averages: 1 })
    const expected = (1 - Math.exp(-3000 / T1)) * Math.exp(-50 / T2)
    expect(calcLesionSignal(T1, T2, params)).toBeCloseTo(expected, 6)
  })

  it('signal increases with longer TR (more T1 recovery)', () => {
    const T1 = 1000, T2 = 80
    const s1 = calcLesionSignal(T1, T2, makeParams({ TR: 500, TE: 50, TI: 0 }))
    const s2 = calcLesionSignal(T1, T2, makeParams({ TR: 3000, TE: 50, TI: 0 }))
    expect(s2).toBeGreaterThan(s1)
  })

  it('signal decreases with longer TE (T2 decay)', () => {
    const T1 = 1000, T2 = 80
    const s1 = calcLesionSignal(T1, T2, makeParams({ TR: 3000, TE: 20, TI: 0 }))
    const s2 = calcLesionSignal(T1, T2, makeParams({ TR: 3000, TE: 120, TI: 0 }))
    expect(s1).toBeGreaterThan(s2)
  })

  it('signal scales with sqrt(averages)', () => {
    const T1 = 1000, T2 = 80
    const s1 = calcLesionSignal(T1, T2, makeParams({ TR: 3000, TE: 50, TI: 0, averages: 1 }))
    const s4 = calcLesionSignal(T1, T2, makeParams({ TR: 3000, TE: 50, TI: 0, averages: 4 }))
    expect(s4).toBeCloseTo(s1 * 2, 6) // sqrt(4) = 2
  })

  it('signal approaches 0 for very long TE relative to T2', () => {
    const s = calcLesionSignal(1000, 10, makeParams({ TR: 5000, TE: 500, TI: 0 }))
    expect(s).toBeLessThan(0.001)
  })

  it('signal approaches 0 for very short TR relative to T1', () => {
    const s = calcLesionSignal(5000, 80, makeParams({ TR: 10, TE: 10, TI: 0 }))
    expect(s).toBeLessThan(0.01)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// calcLesionSignal — IR (Inversion Recovery) path
// ════════════════════════════════════════════════════════════════════════════
describe('calcLesionSignal — IR path', () => {
  it('IR path is active when TI > 0', () => {
    const params = makeParams({ TR: 5000, TE: 80, TI: 2500 })
    const s = calcLesionSignal(1000, 80, params)
    expect(s).toBeGreaterThan(0)
  })

  it('follows |1 - 2*exp(-TI/T1) + exp(-TR/T1)| * exp(-TE/T2)', () => {
    const T1 = 1000, T2 = 80
    const params = makeParams({ TR: 6000, TE: 60, TI: 2000, averages: 1 })
    const expected = Math.abs(1 - 2 * Math.exp(-2000 / T1) + Math.exp(-6000 / T1))
      * Math.exp(-60 / T2)
    expect(calcLesionSignal(T1, T2, params)).toBeCloseTo(expected, 6)
  })

  it('null point: signal ≈ 0 when TI ≈ T1*ln(2) and TR >> T1', () => {
    const T1 = 1000
    const TI = T1 * Math.log(2) // ~693ms
    const params = makeParams({ TR: 10000, TE: 10, TI, averages: 1 })
    const s = calcLesionSignal(T1, 200, params)
    expect(s).toBeLessThan(0.05)
  })

  it('STIR-like: short TI suppresses short-T1 tissue (Fat)', () => {
    const fatT1 = 260 // Fat T1 at 1.5T
    const TI_stir = fatT1 * Math.log(2) // ~180ms
    const s = calcLesionSignal(fatT1, 80, makeParams({ TR: 5000, TE: 30, TI: TI_stir }))
    expect(s).toBeLessThan(0.05) // Fat signal suppressed
  })

  it('FLAIR-like: long TI suppresses long-T1 tissue (CSF)', () => {
    const csfT1 = 4300 // CSF T1 at 1.5T
    const TI_flair = csfT1 * Math.log(2) // ~2980ms
    const s = calcLesionSignal(csfT1, 1800, makeParams({ TR: 10000, TE: 100, TI: TI_flair }))
    expect(s).toBeLessThan(0.1)
  })

  it('signal scales with sqrt(averages) in IR mode', () => {
    const T1 = 1000, T2 = 80
    const base = makeParams({ TR: 5000, TE: 50, TI: 1500, averages: 1 })
    const avg9 = makeParams({ TR: 5000, TE: 50, TI: 1500, averages: 9 })
    expect(calcLesionSignal(T1, T2, avg9)).toBeCloseTo(calcLesionSignal(T1, T2, base) * 3, 6)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// calcLesionSignal — GRE path
// ════════════════════════════════════════════════════════════════════════════
describe('calcLesionSignal — GRE path', () => {
  // GRE condition: turboFactor <= 2 AND flipAngle < 60
  const greBase = { TI: 0, turboFactor: 1, flipAngle: 30 } as const

  it('GRE path is active when turboFactor<=2 and flipAngle<60', () => {
    const params = makeParams({ ...greBase, TR: 500, TE: 10 })
    const s = calcLesionSignal(1000, 80, params)
    expect(s).toBeGreaterThan(0)
  })

  it('follows sin(FA)*(1-E1)/(1-cos(FA)*E1) * exp(-TE/T2)', () => {
    const T1 = 1000, T2 = 80
    const params = makeParams({ ...greBase, TR: 500, TE: 10, flipAngle: 25, averages: 1 })
    const faRad = 25 * Math.PI / 180
    const E1 = Math.exp(-500 / T1)
    const expected = Math.sin(faRad) * (1 - E1) / (1 - Math.cos(faRad) * E1 + 1e-10) * Math.exp(-10 / T2)
    expect(calcLesionSignal(T1, T2, params)).toBeCloseTo(expected, 6)
  })

  it('Ernst angle maximizes signal for given TR/T1', () => {
    const T1 = 1000, T2 = 100, TR = 500
    const ernstDeg = Math.acos(Math.exp(-TR / T1)) * 180 / Math.PI
    const sErnst = calcLesionSignal(T1, T2, makeParams({ ...greBase, TR, TE: 5, flipAngle: Math.round(ernstDeg) }))
    const sLow = calcLesionSignal(T1, T2, makeParams({ ...greBase, TR, TE: 5, flipAngle: 5 }))
    const sHigh = calcLesionSignal(T1, T2, makeParams({ ...greBase, TR, TE: 5, flipAngle: 55 }))
    expect(sErnst).toBeGreaterThan(sLow)
    expect(sErnst).toBeGreaterThan(sHigh)
  })

  it('signal decreases as TE increases (T2 decay)', () => {
    const T1 = 1000, T2 = 50
    const s1 = calcLesionSignal(T1, T2, makeParams({ ...greBase, TR: 500, TE: 5 }))
    const s2 = calcLesionSignal(T1, T2, makeParams({ ...greBase, TR: 500, TE: 40 }))
    expect(s1).toBeGreaterThan(s2)
  })

  it('signal is always non-negative', () => {
    const s = calcLesionSignal(100, 10, makeParams({ ...greBase, TR: 10, TE: 100, flipAngle: 5 }))
    expect(s).toBeGreaterThanOrEqual(0)
  })

  it('turboFactor=3 with flipAngle<60 triggers SE path, not GRE', () => {
    const T1 = 1000, T2 = 80
    const paramsGRE = makeParams({ TI: 0, turboFactor: 1, flipAngle: 30, TR: 500, TE: 10, averages: 1 })
    const paramsSE = makeParams({ TI: 0, turboFactor: 3, flipAngle: 30, TR: 500, TE: 10, averages: 1 })
    // SE formula: (1 - exp(-TR/T1)) * exp(-TE/T2) — different from GRE
    const seSig = (1 - Math.exp(-500 / T1)) * Math.exp(-10 / T2)
    expect(calcLesionSignal(T1, T2, paramsSE)).toBeCloseTo(seSig, 6)
    // GRE should be different
    expect(calcLesionSignal(T1, T2, paramsGRE)).not.toBeCloseTo(seSig, 3)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// calcLesionSignal — Edge cases
// ════════════════════════════════════════════════════════════════════════════
describe('calcLesionSignal — edge cases', () => {
  it('very short T1 yields high signal (fast recovery)', () => {
    const sShortT1 = calcLesionSignal(50, 80, makeParams({ TR: 500, TE: 20, TI: 0 }))
    const sLongT1 = calcLesionSignal(5000, 80, makeParams({ TR: 500, TE: 20, TI: 0 }))
    expect(sShortT1).toBeGreaterThan(sLongT1)
  })

  it('very long T2 yields high signal (slow decay)', () => {
    const sLongT2 = calcLesionSignal(1000, 2000, makeParams({ TR: 5000, TE: 100, TI: 0 }))
    const sShortT2 = calcLesionSignal(1000, 20, makeParams({ TR: 5000, TE: 100, TI: 0 }))
    expect(sLongT2).toBeGreaterThan(sShortT2)
  })

  it('averages=0 produces 0 signal (sqrt(0)=0)', () => {
    const s = calcLesionSignal(1000, 80, makeParams({ TR: 5000, TE: 50, TI: 0, averages: 0 }))
    expect(s).toBe(0)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// calcLesionSignal — Pathology preset integration
// ════════════════════════════════════════════════════════════════════════════
describe('calcLesionSignal with PATHOLOGY_PRESETS', () => {
  it('all presets produce valid positive signals at 1.5T', () => {
    const params = makeParams({ TR: 5000, TE: 80, TI: 0, fieldStrength: 1.5 })
    for (const p of PATHOLOGY_PRESETS) {
      const s = calcLesionSignal(p.T1_15, p.T2_15, params)
      expect(s).toBeGreaterThan(0)
      expect(Number.isFinite(s)).toBe(true)
    }
  })

  it('all presets produce valid positive signals at 3T', () => {
    const params = makeParams({ TR: 5000, TE: 80, TI: 0, fieldStrength: 3.0 })
    for (const p of PATHOLOGY_PRESETS) {
      const s = calcLesionSignal(p.T1_30, p.T2_30, params)
      expect(s).toBeGreaterThan(0)
      expect(Number.isFinite(s)).toBe(true)
    }
  })

  it('tumor has different signal than WM background on T2w', () => {
    const tumor = PATHOLOGY_PRESETS.find(p => p.id === 'tumor')!
    const params = makeParams({ TR: 5000, TE: 100, TI: 0, fieldStrength: 1.5 })
    const tumorSig = calcLesionSignal(tumor.T1_15, tumor.T2_15, params)
    // WM T1=780, T2=80 at 1.5T
    const wmSig = calcLesionSignal(780, 80, params)
    expect(tumorSig).not.toBeCloseTo(wmSig, 1) // should differ for detectability
    expect(tumorSig).toBeGreaterThan(wmSig) // tumor has longer T2 → brighter on T2w
  })
})

