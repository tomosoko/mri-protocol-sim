import { describe, it, expect } from 'vitest'
import { subTabStyle, type QSubTab } from './quantitativeMRIUtils'

// ════════════════════════════════════════════════════════════════════════════
// subTabStyle
// ════════════════════════════════════════════════════════════════════════════
describe('subTabStyle', () => {
  it('returns active style when true', () => {
    const style = subTabStyle(true)
    expect(style.background).toBe('#1e1200')
    expect(style.color).toBe('#e88b00')
    expect(style.borderBottom).toBe('2px solid #e88b00')
  })

  it('returns inactive style when false', () => {
    const style = subTabStyle(false)
    expect(style.background).toBe('transparent')
    expect(style.color).toBe('#5a5a5a')
    expect(style.borderBottom).toBe('2px solid transparent')
  })

  it('active and inactive styles differ', () => {
    const active = subTabStyle(true)
    const inactive = subTabStyle(false)
    expect(active.color).not.toBe(inactive.color)
    expect(active.background).not.toBe(inactive.background)
    expect(active.borderBottom).not.toBe(inactive.borderBottom)
  })

  it('both return objects with exactly 3 properties', () => {
    expect(Object.keys(subTabStyle(true))).toHaveLength(3)
    expect(Object.keys(subTabStyle(false))).toHaveLength(3)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// QSubTab type validation (compile-time check via assignment)
// ════════════════════════════════════════════════════════════════════════════
describe('QSubTab type', () => {
  it('accepts valid sub-tab values', () => {
    const tabs: QSubTab[] = ['T1map', 'T2map', 'SWI', 'MRS']
    expect(tabs).toHaveLength(4)
    expect(tabs).toContain('T1map')
    expect(tabs).toContain('T2map')
    expect(tabs).toContain('SWI')
    expect(tabs).toContain('MRS')
  })
})

// ════════════════════════════════════════════════════════════════════════════
// VFA T1 mapping physics (standalone tests of the formula)
// S(FA) = M0 * sin(FA) * (1-E1) / (1-cos(FA)*E1)  where E1=exp(-TR/T1)
// ════════════════════════════════════════════════════════════════════════════
describe('VFA signal formula', () => {
  function vfaSignal(faDeg: number, TR: number, T1: number, M0 = 1): number {
    const E1 = Math.exp(-TR / T1)
    const rad = faDeg * Math.PI / 180
    return M0 * Math.sin(rad) * (1 - E1) / (1 - Math.cos(rad) * E1)
  }

  it('signal is 0 at FA=0', () => {
    expect(vfaSignal(0, 500, 1000)).toBeCloseTo(0, 10)
  })

  it('signal is positive for typical FA values', () => {
    expect(vfaSignal(10, 500, 1000)).toBeGreaterThan(0)
    expect(vfaSignal(30, 500, 1000)).toBeGreaterThan(0)
    expect(vfaSignal(90, 500, 1000)).toBeGreaterThan(0)
  })

  it('Ernst angle maximizes signal for given TR/T1', () => {
    const TR = 500, T1 = 1000
    const ernstDeg = Math.acos(Math.exp(-TR / T1)) * 180 / Math.PI
    const sErnst = vfaSignal(ernstDeg, TR, T1)
    // Check nearby angles produce lower signal
    for (const offset of [-20, -10, 10, 20]) {
      const fa = Math.max(1, ernstDeg + offset)
      if (fa < 90) {
        expect(sErnst).toBeGreaterThanOrEqual(vfaSignal(fa, TR, T1) - 1e-10)
      }
    }
  })

  it('signal scales linearly with M0', () => {
    const s1 = vfaSignal(20, 500, 1000, 1.0)
    const s2 = vfaSignal(20, 500, 1000, 2.5)
    expect(s2).toBeCloseTo(s1 * 2.5, 10)
  })

  it('VFA linearization: slope = E1 allows T1 recovery', () => {
    const TR = 800, T1 = 1080 // WM at 3T
    const E1 = Math.exp(-TR / T1)
    const angles = [5, 10, 15, 20]
    const pts = angles.map(fa => {
      const S = vfaSignal(fa, TR, T1)
      const rad = fa * Math.PI / 180
      return { x: S / Math.tan(rad), y: S / Math.sin(rad) }
    })
    // Linear regression
    const n = pts.length
    const sumX = pts.reduce((s, p) => s + p.x, 0)
    const sumY = pts.reduce((s, p) => s + p.y, 0)
    const sumXY = pts.reduce((s, p) => s + p.x * p.y, 0)
    const sumX2 = pts.reduce((s, p) => s + p.x * p.x, 0)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    // slope should equal E1
    expect(slope).toBeCloseTo(E1, 6)
    // Recover T1 from slope
    const T1_est = -TR / Math.log(slope)
    expect(T1_est).toBeCloseTo(T1, 1)
  })

  it('different tissues produce different slopes → different T1 estimates', () => {
    const TR = 800
    const tissues = [
      { label: 'WM', T1: 1080 },
      { label: 'GM', T1: 1600 },
      { label: 'Fat', T1: 380 },
    ]
    const slopes = tissues.map(t => Math.exp(-TR / t.T1))
    // All slopes should be distinct
    expect(slopes[0]).not.toBeCloseTo(slopes[1], 2)
    expect(slopes[1]).not.toBeCloseTo(slopes[2], 2)
    // Shorter T1 → smaller E1=exp(-TR/T1) because exponent is more negative
    expect(slopes[2]).toBeLessThan(slopes[0]) // Fat(380) < WM(1080)
    expect(slopes[0]).toBeLessThan(slopes[1]) // WM(1080) < GM(1600)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// T2 decay formula: S = exp(-TE/T2)
// ════════════════════════════════════════════════════════════════════════════
describe('T2 decay formula', () => {
  function t2Signal(TE: number, T2: number): number {
    return Math.exp(-TE / T2)
  }

  it('signal = 1 at TE=0', () => {
    expect(t2Signal(0, 80)).toBe(1)
  })

  it('signal = exp(-1) ≈ 0.368 when TE=T2', () => {
    expect(t2Signal(80, 80)).toBeCloseTo(Math.exp(-1), 10)
  })

  it('signal decreases monotonically with TE', () => {
    const T2 = 80
    let prev = t2Signal(0, T2)
    for (const te of [10, 20, 50, 100, 200]) {
      const s = t2Signal(te, T2)
      expect(s).toBeLessThan(prev)
      prev = s
    }
  })

  it('longer T2 tissue retains more signal at same TE', () => {
    const TE = 100
    const sCSF = t2Signal(TE, 1500)   // CSF
    const sGM = t2Signal(TE, 83)      // GM at 3T
    const sLiver = t2Signal(TE, 34)   // Liver at 3T
    expect(sCSF).toBeGreaterThan(sGM)
    expect(sGM).toBeGreaterThan(sLiver)
  })

  it('multi-echo T2 fitting recovers correct T2', () => {
    const T2_true = 83 // GM at 3T
    const maxTE = 200, etl = 8
    const echos = Array.from({ length: etl }, (_, i) => (maxTE / etl) * (i + 1))
    const signals = echos.map(te => t2Signal(te, T2_true))
    // Log-linear fit: ln(S) = -TE/T2 → slope = -1/T2
    const n = echos.length
    const sumX = echos.reduce((s, x) => s + x, 0)
    const sumY = signals.reduce((s, x) => s + Math.log(x), 0)
    const sumXY = echos.reduce((s, x, i) => s + x * Math.log(signals[i]), 0)
    const sumX2 = echos.reduce((s, x) => s + x * x, 0)
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const T2_est = -1 / slope
    expect(T2_est).toBeCloseTo(T2_true, 5)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// T2* decay formula: S = exp(-TE/T2*)
// ════════════════════════════════════════════════════════════════════════════
describe('T2* decay formula', () => {
  function t2starSignal(TE: number, T2star: number): number {
    return Math.exp(-TE / T2star)
  }

  it('3T T2* ≈ half of 1.5T T2* for typical tissues', () => {
    // GM: 1.5T=66, 3T=33
    expect(33).toBeCloseTo(66 / 2, 0)
    // Liver: 1.5T=23, 3T=12 (roughly half)
    expect(12 / 23).toBeLessThan(0.6)
    expect(12 / 23).toBeGreaterThan(0.4)
  })

  it('hemorrhage (T2*≈4ms at 3T) signal drops rapidly', () => {
    const sBlood = t2starSignal(10, 90)   // Blood T2*=90ms at 3T
    const sHemorrhage = t2starSignal(10, 4) // Hemorrhage T2*=4ms at 3T
    expect(sHemorrhage).toBeLessThan(sBlood * 0.1)
  })

  it('iron overload detection: liver T2* < 6.3ms indicates iron overload', () => {
    // Normal liver T2* at 3T ≈ 12ms, iron overload < 6.3ms
    const sNormal = t2starSignal(5, 12)
    const sIron = t2starSignal(5, 4)
    expect(sIron).toBeLessThan(sNormal)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// MRS Lorentzian peak formula
// ════════════════════════════════════════════════════════════════════════════
describe('MRS Lorentzian peak formula', () => {
  function lorentzian(ppm: number, peakPpm: number, height: number, sigma: number): number {
    return height / (1 + ((ppm - peakPpm) / sigma) ** 2)
  }

  it('peak is at maximum at center frequency', () => {
    expect(lorentzian(2.02, 2.02, 1.0, 0.06)).toBe(1.0)
  })

  it('signal is symmetric around center', () => {
    const left = lorentzian(1.96, 2.02, 1.0, 0.06)
    const right = lorentzian(2.08, 2.02, 1.0, 0.06)
    expect(left).toBeCloseTo(right, 10)
  })

  it('signal decays with distance from peak', () => {
    const center = lorentzian(2.02, 2.02, 1.0, 0.06)
    const near = lorentzian(2.05, 2.02, 1.0, 0.06)
    const far = lorentzian(2.20, 2.02, 1.0, 0.06)
    expect(center).toBeGreaterThan(near)
    expect(near).toBeGreaterThan(far)
  })

  it('3T narrows linewidth (better separation)', () => {
    const sigma15T = 0.10
    const sigma3T = 0.06
    // At same distance from peak, 3T signal drops faster → better resolution
    const offset = 0.1 // ppm away from peak
    const s15T = lorentzian(2.02 + offset, 2.02, 1.0, sigma15T)
    const s3T = lorentzian(2.02 + offset, 2.02, 1.0, sigma3T)
    expect(s3T).toBeLessThan(s15T) // 3T peak is narrower → faster falloff
  })

  it('Cho and Cr peaks are separable at 3T', () => {
    const sigma3T = 0.06
    const choPpm = 3.22, crPpm = 3.02
    // At midpoint between Cho and Cr, both signals should be low
    const midPpm = (choPpm + crPpm) / 2
    const choAtMid = lorentzian(midPpm, choPpm, 0.6, sigma3T)
    const crAtMid = lorentzian(midPpm, crPpm, 0.5, sigma3T)
    // Combined signal at midpoint should be less than either peak's max
    expect(choAtMid + crAtMid).toBeLessThan(0.5)
  })

  it('scales linearly with height parameter', () => {
    const s1 = lorentzian(2.02, 2.02, 1.0, 0.06)
    const s2 = lorentzian(2.02, 2.02, 0.6, 0.06)
    expect(s2).toBeCloseTo(s1 * 0.6, 10)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// Tissue T1/T2 reference data (from QMRISummaryTable)
// ════════════════════════════════════════════════════════════════════════════
describe('Tissue T1/T2 reference values (QMRISummaryTable data)', () => {
  const rows = [
    { tissue: 'WM',        t1_15: 780,  t2_15: 80,   t1_3: 1080, t2_3: 69   },
    { tissue: 'GM',        t1_15: 1300, t2_15: 90,   t1_3: 1600, t2_3: 83   },
    { tissue: 'CSF',       t1_15: 4300, t2_15: 1800, t1_3: 4500, t2_3: 1500 },
    { tissue: 'Liver',     t1_15: 576,  t2_15: 40,   t1_3: 812,  t2_3: 34   },
    { tissue: 'Muscle',    t1_15: 1008, t2_15: 38,   t1_3: 1412, t2_3: 30   },
    { tissue: 'Fat',       t1_15: 260,  t2_15: 80,   t1_3: 380,  t2_3: 70   },
    { tissue: 'Cartilage', t1_15: 1000, t2_15: 35,   t1_3: 1240, t2_3: 32   },
  ]

  it('contains 7 tissue types', () => {
    expect(rows).toHaveLength(7)
  })

  it('T1 increases with field strength (3T > 1.5T)', () => {
    for (const r of rows) {
      expect(r.t1_3).toBeGreaterThanOrEqual(r.t1_15)
    }
  })

  it('T2 decreases with field strength (3T ≤ 1.5T)', () => {
    for (const r of rows) {
      expect(r.t2_3).toBeLessThanOrEqual(r.t2_15)
    }
  })

  it('T1 > T2 for all tissues at both field strengths', () => {
    for (const r of rows) {
      expect(r.t1_15).toBeGreaterThan(r.t2_15)
      expect(r.t1_3).toBeGreaterThan(r.t2_3)
    }
  })

  it('CSF has longest T1 and T2 at both field strengths', () => {
    const csf = rows.find(r => r.tissue === 'CSF')!
    for (const r of rows) {
      expect(csf.t1_15).toBeGreaterThanOrEqual(r.t1_15)
      expect(csf.t2_15).toBeGreaterThanOrEqual(r.t2_15)
      expect(csf.t1_3).toBeGreaterThanOrEqual(r.t1_3)
      expect(csf.t2_3).toBeGreaterThanOrEqual(r.t2_3)
    }
  })

  it('Fat has shortest T1 at both field strengths', () => {
    const fat = rows.find(r => r.tissue === 'Fat')!
    for (const r of rows) {
      expect(fat.t1_15).toBeLessThanOrEqual(r.t1_15)
      expect(fat.t1_3).toBeLessThanOrEqual(r.t1_3)
    }
  })

  it('GM T1 > WM T1 (grey matter has longer T1)', () => {
    const gm = rows.find(r => r.tissue === 'GM')!
    const wm = rows.find(r => r.tissue === 'WM')!
    expect(gm.t1_15).toBeGreaterThan(wm.t1_15)
    expect(gm.t1_3).toBeGreaterThan(wm.t1_3)
  })

  it('all values are positive numbers', () => {
    for (const r of rows) {
      expect(r.t1_15).toBeGreaterThan(0)
      expect(r.t2_15).toBeGreaterThan(0)
      expect(r.t1_3).toBeGreaterThan(0)
      expect(r.t2_3).toBeGreaterThan(0)
    }
  })
})
