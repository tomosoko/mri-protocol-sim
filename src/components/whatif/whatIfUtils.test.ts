import { describe, it, expect } from 'vitest'
import {
  deltaPct,
  computeDeltas,
  deltaColor,
  calcChangeScore,
  getDiagnostic,
  getMetrics,
  ROWS,
  METRICS,
  type Metrics,
  type SensBar,
} from './whatIfUtils'
import type { ProtocolParams } from '../../data/presets'

// Minimal default params for testing
const testParams: ProtocolParams = {
  TR: 4000, TE: 80, TI: 0, flipAngle: 90, slices: 24,
  sliceThickness: 3, sliceGap: 0, averages: 1,
  phaseOversampling: 0, sarAssistant: 'Normal', allowedDelay: 30,
  fatSat: 'None', mt: false,
  matrixFreq: 256, matrixPhase: 256, fov: 230, phaseResolution: 100,
  bandwidth: 200, interpolation: false,
  orientation: 'Tra', phaseEncDir: 'A>>P', satBands: false,
  coil: 'Body', coilType: 'Head_64',
  ipatMode: 'Off', ipatFactor: 1, gradientMode: 'Normal', shim: 'Auto',
  ecgTrigger: false, respTrigger: 'Off', triggerDelay: 0, triggerWindow: 5,
  inlineADC: false, inlineMIP: false, inlineMPR: false, inlineSubtraction: false,
  turboFactor: 15, echoSpacing: 4.5, partialFourier: 'Off',
  bValues: [0], fieldStrength: 3.0,
}

// ── deltaPct ─────────────────────────────────────────────────────────────────
describe('deltaPct', () => {
  it('returns 0 when base is 0', () => {
    expect(deltaPct(0, 100)).toBe(0)
  })

  it('returns 100 for doubling', () => {
    expect(deltaPct(50, 100)).toBe(100)
  })

  it('returns -50 for halving', () => {
    expect(deltaPct(100, 50)).toBe(-50)
  })

  it('returns 0 for no change', () => {
    expect(deltaPct(100, 100)).toBe(0)
  })

  it('returns negative for decrease', () => {
    expect(deltaPct(200, 100)).toBe(-50)
  })

  it('rounds to integer', () => {
    expect(deltaPct(3, 4)).toBe(33) // 33.33... → 33
  })

  it('handles small values', () => {
    expect(deltaPct(0.001, 0.002)).toBe(100)
  })
})

// ── computeDeltas ────────────────────────────────────────────────────────────
describe('computeDeltas', () => {
  it('computes percentage deltas for all metrics', () => {
    const base: Metrics = { snr: 100, sar: 50, time: 200, blur: 0.5, chem: 2 }
    const changed: Metrics = { snr: 150, sar: 75, time: 100, blur: 0.25, chem: 4 }
    const result = computeDeltas(base, changed)

    expect(result.snr).toBe(50)
    expect(result.sar).toBe(50)
    expect(result.time).toBe(-50)
    expect(result.blur).toBe(-50)
    expect(result.chem).toBe(100)
  })

  it('returns all zeros when base equals changed', () => {
    const base: Metrics = { snr: 100, sar: 50, time: 200, blur: 0.5, chem: 2 }
    const result = computeDeltas(base, base)
    expect(result).toEqual({ snr: 0, sar: 0, time: 0, blur: 0, chem: 0 })
  })
})

// ── deltaColor ───────────────────────────────────────────────────────────────
describe('deltaColor', () => {
  it('returns gray for small changes (abs < 2)', () => {
    expect(deltaColor(0, false)).toBe('#374151')
    expect(deltaColor(1, true)).toBe('#374151')
    expect(deltaColor(-1, false)).toBe('#374151')
  })

  it('returns green for good changes (lowerIsBetter=false, d>5)', () => {
    expect(deltaColor(10, false)).toBe('#34d399')
  })

  it('returns red for bad changes (lowerIsBetter=false, d<-5)', () => {
    expect(deltaColor(-10, false)).toBe('#f87171')
  })

  it('returns green for good changes (lowerIsBetter=true, d<-5)', () => {
    expect(deltaColor(-10, true)).toBe('#34d399')
  })

  it('returns red for bad changes (lowerIsBetter=true, d>5)', () => {
    expect(deltaColor(10, true)).toBe('#f87171')
  })

  it('returns neutral gray for moderate changes (2-5 range)', () => {
    expect(deltaColor(3, false)).toBe('#9ca3af')
    expect(deltaColor(-3, true)).toBe('#9ca3af')
  })
})

// ── calcChangeScore ──────────────────────────────────────────────────────────
describe('calcChangeScore', () => {
  it('returns positive for SNR improvement with no penalties', () => {
    const delta: SensBar = { snr: 50, sar: 0, time: 0, blur: 0, chem: 0 }
    expect(calcChangeScore(delta)).toBe(50 * 0.4)
  })

  it('returns negative for pure time penalty', () => {
    const delta: SensBar = { snr: 0, sar: 0, time: 100, blur: 0, chem: 0 }
    expect(calcChangeScore(delta)).toBe(-100 * 0.3)
  })

  it('ignores negative time/sar/blur (improvements)', () => {
    const delta: SensBar = { snr: 0, sar: -50, time: -50, blur: -50, chem: 0 }
    expect(calcChangeScore(delta)).toBe(0)
  })

  it('balances SNR gain vs penalties correctly', () => {
    const delta: SensBar = { snr: 100, sar: 50, time: 50, blur: 50, chem: 0 }
    const score = (100 * 0.4) - (50 * 0.3) - (50 * 0.2) - (50 * 0.1)
    expect(calcChangeScore(delta)).toBe(score)
  })

  it('returns 0 for no changes', () => {
    const delta: SensBar = { snr: 0, sar: 0, time: 0, blur: 0, chem: 0 }
    expect(calcChangeScore(delta)).toBe(0)
  })

  it('handles negative SNR (degradation)', () => {
    const delta: SensBar = { snr: -50, sar: 0, time: 0, blur: 0, chem: 0 }
    expect(calcChangeScore(delta)).toBe(-50 * 0.4)
  })
})

// ── getDiagnostic ────────────────────────────────────────────────────────────
describe('getDiagnostic', () => {
  it('identifies low SNR as worst dimension', () => {
    const base: Metrics = { snr: 5, sar: 10, time: 30, blur: 0.9, chem: 0.5 }
    const result = getDiagnostic(base)
    expect(result.dimension).toBe('SNR')
    expect(result.advice).toContain('Averages')
  })

  it('identifies high SAR as worst dimension', () => {
    const base: Metrics = { snr: 200, sar: 95, time: 30, blur: 0.9, chem: 0.5 }
    const result = getDiagnostic(base)
    expect(result.dimension).toBe('SAR')
    expect(result.advice).toContain('Flip Angle')
  })

  it('identifies long scan time as worst dimension', () => {
    const base: Metrics = { snr: 200, sar: 10, time: 600, blur: 0.9, chem: 0.5 }
    const result = getDiagnostic(base)
    expect(result.dimension).toBe('スキャン時間')
    expect(result.advice).toContain('iPAT')
  })

  it('identifies high chemical shift as worst dimension', () => {
    const base: Metrics = { snr: 200, sar: 10, time: 30, blur: 0.9, chem: 6 }
    const result = getDiagnostic(base)
    expect(result.dimension).toBe('ケミカルシフト')
    expect(result.advice).toContain('Bandwidth')
  })

  it('score is between 0 and 1', () => {
    const base: Metrics = { snr: 50, sar: 50, time: 300, blur: 0.5, chem: 3 }
    const result = getDiagnostic(base)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
  })
})

// ── getMetrics ───────────────────────────────────────────────────────────────
describe('getMetrics', () => {
  it('returns all metric fields as numbers', () => {
    const m = getMetrics(testParams)
    expect(typeof m.snr).toBe('number')
    expect(typeof m.sar).toBe('number')
    expect(typeof m.time).toBe('number')
    expect(typeof m.blur).toBe('number')
    expect(typeof m.chem).toBe('number')
  })

  it('SNR is positive for valid params', () => {
    const m = getMetrics(testParams)
    expect(m.snr).toBeGreaterThan(0)
  })

  it('scan time is positive', () => {
    const m = getMetrics(testParams)
    expect(m.time).toBeGreaterThan(0)
  })

  it('metrics change when params change', () => {
    const base = getMetrics(testParams)
    const modified = getMetrics({ ...testParams, averages: 4 })
    expect(modified.snr).not.toBe(base.snr)
  })
})

// ── ROWS constant ────────────────────────────────────────────────────────────
describe('ROWS', () => {
  it('has 13 entries', () => {
    expect(ROWS).toHaveLength(13)
  })

  it('all rows have required fields', () => {
    for (const row of ROWS) {
      expect(row.label).toBeTruthy()
      expect(row.group).toBeTruthy()
      expect(row.upLabel).toBeTruthy()
      expect(row.downLabel).toBeTruthy()
      expect(row.up).toBeDefined()
      expect(row.down).toBeDefined()
    }
  })

  it('covers all groups', () => {
    const groups = [...new Set(ROWS.map(r => r.group))]
    expect(groups.sort()).toEqual(['Resolution', 'Sequence', 'System', 'Timing'])
  })
})

// ── METRICS constant ─────────────────────────────────────────────────────────
describe('METRICS', () => {
  it('has 5 metric definitions', () => {
    expect(METRICS).toHaveLength(5)
  })

  it('SNR is lowerIsBetter=false, others are true', () => {
    const snr = METRICS.find(m => m.key === 'snr')!
    expect(snr.lowerIsBetter).toBe(false)

    for (const m of METRICS) {
      if (m.key !== 'snr') {
        expect(m.lowerIsBetter).toBe(true)
      }
    }
  })
})
