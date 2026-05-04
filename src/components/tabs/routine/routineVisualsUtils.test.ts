import { describe, it, expect } from 'vitest'
import {
  calcErnstAngles,
  isGRESequence,
  generateT1RecoveryPath,
  generateT2DecayPath,
  calcDummyScans,
  getSliceOrdering,
  generateSliceOrder,
  parsePFfactor,
  calcScanTimeStages,
  formatTime,
  calcSteadyState,
  calcPhantomSignals,
  calcContrastGrid,
} from './routineVisualsUtils'
import type { ProtocolParams } from '../../../data/presets'

// Minimal default params for testing scan time stages
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

// ── Ernst Angle ─────────────────────────────────────────────────────────────
describe('calcErnstAngles', () => {
  it('returns Ernst angles for default tissues at 3T', () => {
    const result = calcErnstAngles(500, true)
    expect(result).toHaveLength(4)
    expect(result.map(r => r.label).sort()).toEqual(['Fat', 'GM', 'Liver', 'WM'])
    result.forEach(r => {
      expect(r.ea).toBeGreaterThan(0)
      expect(r.ea).toBeLessThan(90)
      expect(r.T1).toBeGreaterThan(0)
      expect(r.color).toBeTruthy()
    })
  })

  it('returns different angles for 1.5T vs 3T', () => {
    const at15 = calcErnstAngles(500, false)
    const at30 = calcErnstAngles(500, true)
    // T1 is longer at 3T → Ernst angle should be smaller
    const wm15 = at15.find(r => r.label === 'WM')!
    const wm30 = at30.find(r => r.label === 'WM')!
    // T1 is longer at 3T
    expect(wm30.T1).toBeGreaterThan(wm15.T1)
  })

  it('Ernst angle decreases with longer T1 (shorter TR)', () => {
    const shortTR = calcErnstAngles(100, true)
    const longTR = calcErnstAngles(5000, true)
    const wmShort = shortTR.find(r => r.label === 'WM')!
    const wmLong = longTR.find(r => r.label === 'WM')!
    expect(wmShort.ea).toBeLessThan(wmLong.ea)
  })

  it('allows custom tissue labels', () => {
    const result = calcErnstAngles(500, true, ['WM', 'GM'])
    expect(result).toHaveLength(2)
  })
})

describe('isGRESequence', () => {
  it('returns true for GRE-like params', () => {
    expect(isGRESequence(1, 200)).toBe(true)
    expect(isGRESequence(2, 100)).toBe(true)
  })

  it('returns false for TSE or long TR', () => {
    expect(isGRESequence(7, 200)).toBe(false)
    expect(isGRESequence(1, 500)).toBe(false)
    expect(isGRESequence(1, 3000)).toBe(false)
  })
})

// ── Signal Curve Paths ──────────────────────────────────────────────────────
describe('generateT1RecoveryPath', () => {
  const pad = { l: 30, r: 8, t: 6, b: 18 }
  const innerW = 302
  const innerH = 56

  it('generates valid SVG path starting with M', () => {
    const path = generateT1RecoveryPath(1000, 10, 10000, pad, innerW, innerH)
    expect(path).toMatch(/^M/)
    expect(path).toContain('L')
  })

  it('starts at bottom-left (signal=0 at t≈0)', () => {
    const path = generateT1RecoveryPath(1000, 10, 10000, pad, innerW, innerH)
    const firstPoint = path.match(/^M([\d.]+),([\d.]+)/)!
    const y = parseFloat(firstPoint[2])
    // At t≈0, signal≈0, so y should be near bottom (pad.t + innerH)
    expect(y).toBeCloseTo(pad.t + innerH, 0)
  })

  it('shorter T1 recovers faster', () => {
    const pathShort = generateT1RecoveryPath(500, 20, 10000, pad, innerW, innerH)
    const pathLong = generateT1RecoveryPath(2000, 20, 10000, pad, innerW, innerH)
    // Extract a mid-point y to compare (lower y = higher signal)
    const midY = (p: string) => {
      const pts = p.split(' L').map(s => parseFloat(s.split(',')[1]))
      return pts[Math.floor(pts.length / 2)]
    }
    expect(midY(pathShort)).toBeLessThan(midY(pathLong))
  })
})

describe('generateT2DecayPath', () => {
  const pad = { l: 30, r: 8, t: 6, b: 18 }
  const innerW = 302
  const innerH = 56

  it('generates valid SVG path', () => {
    const path = generateT2DecayPath(80, 10, 300, pad, innerW, innerH)
    expect(path).toMatch(/^M/)
  })

  it('starts at top-left (signal=1 at t=0)', () => {
    const path = generateT2DecayPath(80, 10, 300, pad, innerW, innerH)
    const firstPoint = path.match(/^M([\d.]+),([\d.]+)/)!
    const y = parseFloat(firstPoint[2])
    expect(y).toBeCloseTo(pad.t, 0)
  })
})

// ── Slice Order ─────────────────────────────────────────────────────────────
describe('calcDummyScans', () => {
  it('returns at least 2', () => {
    expect(calcDummyScans(10000, true)).toBe(2)
  })

  it('returns at most 15', () => {
    expect(calcDummyScans(1, true)).toBe(15)
  })

  it('returns more for shorter TR', () => {
    expect(calcDummyScans(100, true)).toBeGreaterThan(calcDummyScans(5000, true))
  })

  it('returns more for 3T (longer T1)', () => {
    expect(calcDummyScans(500, true)).toBeGreaterThanOrEqual(calcDummyScans(500, false))
  })
})

describe('getSliceOrdering', () => {
  it('returns Interleaved for many slices', () => {
    expect(getSliceOrdering(20, 7, [0])).toBe('Interleaved')
  })

  it('returns Sequential for few slices non-EPI', () => {
    expect(getSliceOrdering(5, 7, [0])).toBe('Sequential')
  })

  it('returns Interleaved for EPI (multiple bValues)', () => {
    expect(getSliceOrdering(5, 1, [0, 1000])).toBe('Interleaved')
  })
})

describe('generateSliceOrder', () => {
  it('sequential order is 0,1,2,...', () => {
    expect(generateSliceOrder(5, 'Sequential')).toEqual([0, 1, 2, 3, 4])
  })

  it('interleaved order has evens first then odds', () => {
    const order = generateSliceOrder(6, 'Interleaved')
    expect(order).toEqual([0, 2, 4, 1, 3, 5])
  })

  it('respects maxDisplay limit', () => {
    const order = generateSliceOrder(100, 'Sequential', 10)
    expect(order).toHaveLength(10)
  })
})

// ── Scan Time Breakdown ─────────────────────────────────────────────────────
describe('parsePFfactor', () => {
  it('returns correct factors', () => {
    expect(parsePFfactor('Off')).toBe(1.0)
    expect(parsePFfactor('7/8')).toBe(0.875)
    expect(parsePFfactor('6/8')).toBe(0.75)
    expect(parsePFfactor('5/8')).toBe(0.625)
    expect(parsePFfactor('4/8')).toBe(0.5)
  })
})

describe('formatTime', () => {
  it('formats seconds only', () => {
    expect(formatTime(45)).toBe('45s')
  })

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('2m05s')
  })

  it('formats exact minutes', () => {
    expect(formatTime(120)).toBe('2m')
  })

  it('formats zero', () => {
    expect(formatTime(0)).toBe('0s')
  })
})

describe('calcScanTimeStages', () => {
  it('returns 4 stages', () => {
    const { stages } = calcScanTimeStages(testParams)
    expect(stages).toHaveLength(4)
  })

  it('base stage has zero savings', () => {
    const { stages } = calcScanTimeStages(testParams)
    expect(stages[0].savings).toBe(0)
  })

  it('PF reduces time when enabled', () => {
    const params = { ...testParams, partialFourier: '6/8' as const }
    const { stages } = calcScanTimeStages(params)
    expect(stages[1].savings).toBeGreaterThan(0)
    expect(stages[1].value).toBeLessThan(stages[0].value)
  })

  it('iPAT reduces time when enabled', () => {
    const params = { ...testParams, ipatMode: 'GRAPPA' as const, ipatFactor: 2 }
    const { stages } = calcScanTimeStages(params)
    expect(stages[2].savings).toBeGreaterThan(0)
  })

  it('resp trigger increases time', () => {
    const params = { ...testParams, respTrigger: 'PACE' as const }
    const { stages } = calcScanTimeStages(params)
    expect(stages[3].value).toBeGreaterThan(stages[2].value)
    expect(stages[3].savings).toBeLessThan(0)
  })
})

// ── Steady State Convergence ────────────────────────────────────────────────
describe('calcSteadyState', () => {
  it('returns N+1 history points', () => {
    const result = calcSteadyState(15, 50, true, 12)
    expect(result.mzHistory).toHaveLength(13)
  })

  it('starts at Mz=1.0', () => {
    const result = calcSteadyState(15, 50, true)
    expect(result.mzHistory[0]).toBe(1.0)
  })

  it('converges to mzSS', () => {
    const result = calcSteadyState(15, 50, true, 50)
    const last = result.mzHistory[result.mzHistory.length - 1]
    expect(last).toBeCloseTo(result.mzSS, 1)
  })

  it('mzSS is between 0 and 1', () => {
    const result = calcSteadyState(30, 100, true)
    expect(result.mzSS).toBeGreaterThan(0)
    expect(result.mzSS).toBeLessThanOrEqual(1)
  })

  it('ssSignal is positive', () => {
    const result = calcSteadyState(15, 50, true)
    expect(result.ssSignal).toBeGreaterThan(0)
  })

  it('higher flip angle → lower mzSS', () => {
    const low = calcSteadyState(10, 50, true)
    const high = calcSteadyState(60, 50, true)
    expect(high.mzSS).toBeLessThan(low.mzSS)
  })

  it('uses correct T1 for field strength', () => {
    const at15 = calcSteadyState(30, 100, false)
    const at30 = calcSteadyState(30, 100, true)
    expect(at15.t1WM).toBe(800)
    expect(at30.t1WM).toBe(1000)
  })
})

// ── Brain Phantom Signals ───────────────────────────────────────────────────
describe('calcPhantomSignals', () => {
  const baseParams = {
    TR: 4000, TE: 80, TI: 0, flipAngle: 90,
    fatSat: 'None', fieldStrength: 3.0, turboFactor: 15,
  }

  it('returns normalized signals (max=1)', () => {
    const sig = calcPhantomSignals(baseParams)
    const values = Object.values(sig)
    expect(Math.max(...values)).toBeCloseTo(1.0, 2)
    values.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    })
  })

  it('T2W shows CSF brightest (long TR, long TE)', () => {
    const sig = calcPhantomSignals({ ...baseParams, TR: 6000, TE: 120 })
    expect(sig.CSF).toBeCloseTo(1.0, 1)
    expect(sig.CSF).toBeGreaterThan(sig.GM)
    expect(sig.CSF).toBeGreaterThan(sig.WM)
  })

  it('T1W shows WM brighter than GM (short TR, short TE)', () => {
    const sig = calcPhantomSignals({ ...baseParams, TR: 500, TE: 10 })
    expect(sig.WM).toBeGreaterThan(sig.GM)
  })

  it('fat sat suppresses fat signal', () => {
    const noSat = calcPhantomSignals(baseParams)
    const withSat = calcPhantomSignals({ ...baseParams, fatSat: 'Fat' })
    expect(withSat.Fat).toBe(0)
    expect(noSat.Fat).toBeGreaterThan(0)
  })

  it('IR with appropriate TI suppresses tissue', () => {
    const se = calcPhantomSignals(baseParams)
    const ir = calcPhantomSignals({ ...baseParams, TI: 2400 })
    // FLAIR suppresses CSF
    expect(ir.CSF).toBeLessThan(se.CSF)
  })

  it('GRE mode uses T2* decay', () => {
    const greParams = { ...baseParams, turboFactor: 1, flipAngle: 30, TR: 50, TE: 20 }
    const sig = calcPhantomSignals(greParams)
    expect(sig.WM).toBeGreaterThan(0)
  })
})

// ── Contrast Heatmap Grid ───────────────────────────────────────────────────
describe('calcContrastGrid', () => {
  it('returns correct grid dimensions', () => {
    const { grid, trVals, teVals } = calcContrastGrid(true, 8, 6)
    expect(grid).toHaveLength(6)
    expect(grid[0]).toHaveLength(8)
    expect(trVals).toHaveLength(8)
    expect(teVals).toHaveLength(6)
  })

  it('all contrast values are non-negative', () => {
    const { grid } = calcContrastGrid(true)
    grid.forEach(row => row.forEach(val => expect(val).toBeGreaterThanOrEqual(0)))
  })

  it('maxContrast equals maximum grid value', () => {
    const { grid, maxContrast } = calcContrastGrid(true)
    const actualMax = Math.max(...grid.flat())
    expect(maxContrast).toBeCloseTo(actualMax, 10)
  })

  it('contrast varies across grid', () => {
    const { grid } = calcContrastGrid(true)
    const flat = grid.flat()
    const unique = new Set(flat.map(v => v.toFixed(6)))
    expect(unique.size).toBeGreaterThan(1)
  })

  it('trVals and teVals span the specified range', () => {
    const { trVals, teVals } = calcContrastGrid(true, 16, 12, [200, 6000], [5, 200])
    expect(trVals[0]).toBe(200)
    expect(trVals[trVals.length - 1]).toBe(6000)
    expect(teVals[0]).toBe(5)
    expect(teVals[teVals.length - 1]).toBe(200)
  })

  it('3T and 1.5T produce different grids', () => {
    const g15 = calcContrastGrid(false)
    const g30 = calcContrastGrid(true)
    expect(g15.maxContrast).not.toBeCloseTo(g30.maxContrast, 5)
  })
})
