import { describe, it, expect } from 'vitest'
import {
  snrToRgb,
  coilSensToRgb,
  isInsideEllipse,
  bilinearSample,
  buildSNRGrid,
  computeSNRStats,
  CANVAS_SIZE,
  GRID,
  COIL_CHANNELS,
} from './snrMapUtils'
import type { CrossSectionConfig, CoilProfile } from '../../data/coilProfiles'

// ── Helper: build a uniform 64x64 sensitivity map ────────────────────────────
function uniformMap(value: number): number[][] {
  return Array.from({ length: 64 }, () => Array(64).fill(value))
}

// Minimal cross-section for testing
const testSection: CrossSectionConfig = {
  id: 'head_axial',
  label: 'Head Axial',
  defaultCoilId: 'Head_64',
  outline: { cx: 0.5, cy: 0.5, rx: 0.35, ry: 0.35 },
  tissues: [],
}

// Minimal coil profile for testing
const testCoil: CoilProfile = {
  id: 'test_coil',
  label: 'Test Coil',
  sensitivityMap: uniformMap(0.8),
  channels: 16,
  description: 'Test coil',
}

// ── snrToRgb ─────────────────────────────────────────────────────────────────
describe('snrToRgb', () => {
  it('returns blue-ish for zero SNR', () => {
    const [r, g, b] = snrToRgb(0, 100)
    expect(r).toBe(30)
    expect(g).toBe(64)
    expect(b).toBe(175)
  })

  it('returns consistent values for maxSnr SNR (t=1)', () => {
    const rgb = snrToRgb(100, 100)
    expect(rgb[0]).toBeGreaterThan(200) // warm end
    expect(rgb[2]).toBeLessThan(50)
  })

  it('returns blue tone when maxSnr is 0', () => {
    const [r, g, b] = snrToRgb(50, 0)
    expect(r).toBe(30)
    expect(g).toBe(64)
    expect(b).toBe(175)
  })

  it('clamps t to [0,1] range', () => {
    const neg = snrToRgb(-10, 100)
    const zero = snrToRgb(0, 100)
    expect(neg).toEqual(zero) // negative clamped to 0

    const over = snrToRgb(200, 100)
    const max = snrToRgb(100, 100)
    expect(over).toEqual(max) // over-max clamped to 1
  })

  it('produces different colors at low/mid/high ranges', () => {
    const low = snrToRgb(10, 100)   // t≈0.1
    const mid = snrToRgb(50, 100)   // t=0.5
    const high = snrToRgb(90, 100)  // t=0.9
    // Each band should produce distinct colors
    expect(low).not.toEqual(mid)
    expect(mid).not.toEqual(high)
  })

  it('returns integer RGB values', () => {
    for (const snr of [0, 25, 50, 75, 100]) {
      const [r, g, b] = snrToRgb(snr, 100)
      expect(Number.isInteger(r)).toBe(true)
      expect(Number.isInteger(g)).toBe(true)
      expect(Number.isInteger(b)).toBe(true)
    }
  })
})

// ── coilSensToRgb ────────────────────────────────────────────────────────────
describe('coilSensToRgb', () => {
  it('returns dark blue for s=0', () => {
    const [r, g, b] = coilSensToRgb(0)
    expect(r).toBe(0)
    expect(g).toBe(0)
    expect(b).toBe(128)
  })

  it('returns cyan-ish at s=0.5', () => {
    const rgb = coilSensToRgb(0.5)
    expect(rgb[1]).toBe(200)
    expect(rgb[2]).toBe(255)
  })

  it('returns warm color at s=1.0', () => {
    const rgb = coilSensToRgb(1.0)
    expect(rgb[0]).toBe(220)
    expect(rgb[2]).toBe(0)
  })

  it('clamps values outside [0,1]', () => {
    expect(coilSensToRgb(-0.5)).toEqual(coilSensToRgb(0))
    expect(coilSensToRgb(1.5)).toEqual(coilSensToRgb(1.0))
  })

  it('returns integer RGB values', () => {
    for (const s of [0, 0.25, 0.5, 0.75, 1.0]) {
      const [r, g, b] = coilSensToRgb(s)
      expect(Number.isInteger(r)).toBe(true)
      expect(Number.isInteger(g)).toBe(true)
      expect(Number.isInteger(b)).toBe(true)
    }
  })
})

// ── isInsideEllipse ──────────────────────────────────────────────────────────
describe('isInsideEllipse', () => {
  it('returns true for center point', () => {
    expect(isInsideEllipse(0.5, 0.5, 0.5, 0.5, 0.3, 0.3)).toBe(true)
  })

  it('returns false for point outside', () => {
    expect(isInsideEllipse(0, 0, 0.5, 0.5, 0.3, 0.3)).toBe(false)
  })

  it('returns true for point just inside boundary', () => {
    // Slightly inside: (0.79 - 0.5)/0.3 = 0.9667, squared < 1
    expect(isInsideEllipse(0.79, 0.5, 0.5, 0.5, 0.3, 0.3)).toBe(true)
  })

  it('returns false for point just outside boundary', () => {
    expect(isInsideEllipse(0.81, 0.5, 0.5, 0.5, 0.3, 0.3)).toBe(false)
  })

  it('works with non-circular ellipses', () => {
    // Wide ellipse: rx=0.4, ry=0.1
    expect(isInsideEllipse(0.85, 0.5, 0.5, 0.5, 0.4, 0.1)).toBe(true)
    expect(isInsideEllipse(0.5, 0.55, 0.5, 0.5, 0.4, 0.1)).toBe(true)
    expect(isInsideEllipse(0.5, 0.65, 0.5, 0.5, 0.4, 0.1)).toBe(false)
  })

  it('returns true for degenerate case (point radius)', () => {
    expect(isInsideEllipse(0.5, 0.5, 0.5, 0.5, 0.001, 0.001)).toBe(true)
  })
})

// ── bilinearSample ───────────────────────────────────────────────────────────
describe('bilinearSample', () => {
  it('returns exact value at grid points', () => {
    const map = uniformMap(0)
    map[10][20] = 1.0
    expect(bilinearSample(map, 20, 10)).toBe(1.0)
  })

  it('interpolates between two values horizontally', () => {
    const map = uniformMap(0)
    map[0][0] = 0
    map[0][1] = 1
    expect(bilinearSample(map, 0.5, 0)).toBeCloseTo(0.5, 5)
  })

  it('interpolates between two values vertically', () => {
    const map = uniformMap(0)
    map[0][0] = 0
    map[1][0] = 1
    expect(bilinearSample(map, 0, 0.5)).toBeCloseTo(0.5, 5)
  })

  it('interpolates bilinearly (center of 4 values)', () => {
    const map = uniformMap(0)
    map[0][0] = 0
    map[0][1] = 2
    map[1][0] = 2
    map[1][1] = 4
    // Center = average of 4 corners = (0+2+2+4)/4 = 2
    expect(bilinearSample(map, 0.5, 0.5)).toBeCloseTo(2.0, 5)
  })

  it('returns uniform value for uniform map', () => {
    const map = uniformMap(0.75)
    expect(bilinearSample(map, 31.5, 31.5)).toBeCloseTo(0.75, 5)
  })

  it('handles boundary coords correctly', () => {
    const map = uniformMap(0.5)
    // Top-left corner
    expect(bilinearSample(map, 0, 0)).toBeCloseTo(0.5, 5)
    // Bottom-right corner
    expect(bilinearSample(map, 63, 63)).toBeCloseTo(0.5, 5)
  })
})

// ── buildSNRGrid ─────────────────────────────────────────────────────────────
describe('buildSNRGrid', () => {
  it('returns a 64x64 grid', () => {
    const [grid] = buildSNRGrid(testSection, testCoil, 100, 'Off', 1, 3.0)
    expect(grid).toHaveLength(GRID)
    expect(grid[0]).toHaveLength(GRID)
  })

  it('returns 0 outside the body ellipse', () => {
    const [grid] = buildSNRGrid(testSection, testCoil, 100, 'Off', 1, 3.0)
    // Corner (0,0) is outside the centered ellipse
    expect(grid[0][0]).toBe(0)
  })

  it('returns positive SNR inside the body', () => {
    const [grid] = buildSNRGrid(testSection, testCoil, 100, 'Off', 1, 3.0)
    // Center (32,32) should be inside
    expect(grid[32][32]).toBeGreaterThan(0)
  })

  it('maxSnr is positive for positive globalSNR', () => {
    const [, maxSnr] = buildSNRGrid(testSection, testCoil, 100, 'Off', 1, 3.0)
    expect(maxSnr).toBeGreaterThan(0)
  })

  it('SNR scales with globalSNR', () => {
    const [, max1] = buildSNRGrid(testSection, testCoil, 50, 'Off', 1, 3.0)
    const [, max2] = buildSNRGrid(testSection, testCoil, 100, 'Off', 1, 3.0)
    expect(max2).toBeGreaterThan(max1)
  })

  it('iPAT reduces SNR via g-factor', () => {
    const [, maxOff] = buildSNRGrid(testSection, testCoil, 100, 'Off', 1, 3.0)
    const [, maxGrappa] = buildSNRGrid(testSection, testCoil, 100, 'GRAPPA', 2, 3.0)
    expect(maxGrappa).toBeLessThan(maxOff)
  })

  it('3T dielectric effect enhances abdomen center SNR', () => {
    const abdomen: CrossSectionConfig = {
      ...testSection,
      id: 'abdomen_axial',
      outline: { cx: 0.5, cy: 0.5, rx: 0.4, ry: 0.3 },
    }
    const [grid15] = buildSNRGrid(abdomen, testCoil, 100, 'Off', 1, 1.5)
    const [grid30] = buildSNRGrid(abdomen, testCoil, 100, 'Off', 1, 3.0)
    // 3T dielectric brightens center
    expect(grid30[32][32]).toBeGreaterThan(grid15[32][32])
  })
})

// ── computeSNRStats ──────────────────────────────────────────────────────────
describe('computeSNRStats', () => {
  it('returns null for all-zero grid', () => {
    const grid = Array.from({ length: 4 }, () => [0, 0, 0, 0])
    expect(computeSNRStats(grid)).toBeNull()
  })

  it('computes correct min/max/mean', () => {
    const grid = [
      [0, 0, 0],
      [0, 10, 20],
      [0, 30, 40],
    ]
    const stats = computeSNRStats(grid)!
    expect(stats.min).toBe(10)
    expect(stats.max).toBe(40)
    expect(stats.mean).toBe((10 + 20 + 30 + 40) / 4)
  })

  it('ignores zero values (outside body)', () => {
    const grid = [[0, 0, 50, 0, 0]]
    const stats = computeSNRStats(grid)!
    expect(stats.min).toBe(50)
    expect(stats.max).toBe(50)
    expect(stats.mean).toBe(50)
  })

  it('works with buildSNRGrid output', () => {
    const [grid] = buildSNRGrid(testSection, testCoil, 100, 'Off', 1, 3.0)
    const stats = computeSNRStats(grid)
    expect(stats).not.toBeNull()
    expect(stats!.min).toBeGreaterThan(0)
    expect(stats!.max).toBeGreaterThanOrEqual(stats!.min)
    expect(stats!.mean).toBeGreaterThanOrEqual(stats!.min)
    expect(stats!.mean).toBeLessThanOrEqual(stats!.max)
  })
})

// ── COIL_CHANNELS constant ───────────────────────────────────────────────────
describe('COIL_CHANNELS', () => {
  it('has expected coil entries', () => {
    expect(COIL_CHANNELS['Head 64ch']).toBe(64)
    expect(COIL_CHANNELS['Head 20ch']).toBe(20)
    expect(COIL_CHANNELS['Body']).toBe(18)
    expect(COIL_CHANNELS['Surface']).toBe(8)
  })
})

// ── Constants ────────────────────────────────────────────────────────────────
describe('constants', () => {
  it('CANVAS_SIZE is 256', () => {
    expect(CANVAS_SIZE).toBe(256)
  })

  it('GRID is 64', () => {
    expect(GRID).toBe(64)
  })
})
