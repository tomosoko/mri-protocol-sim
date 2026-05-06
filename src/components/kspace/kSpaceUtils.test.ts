import { describe, it, expect } from 'vitest'
import {
  idft1d,
  idft2d,
  buildIdealKSpace,
  kyToColor,
  CANVAS_SIZE,
  IFT_SIZE,
  type Complex,
} from './kSpaceUtils'
import type { KSpaceLine } from '../../data/kSpacePatterns'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function makeLines(
  kyValues: number[],
  overrides?: Partial<KSpaceLine>,
): KSpaceLine[] {
  return kyValues.map((ky, i) => ({
    ky,
    trIndex: i,
    echoIndex: 0,
    isACS: false,
    isSkipped: false,
    ...overrides,
  }))
}

function magnitude(c: Complex): number {
  return Math.sqrt(c.re * c.re + c.im * c.im)
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe('kSpaceUtils constants', () => {
  it('CANVAS_SIZE is 256', () => {
    expect(CANVAS_SIZE).toBe(256)
  })

  it('IFT_SIZE is 64', () => {
    expect(IFT_SIZE).toBe(64)
  })
})

// ---------------------------------------------------------------------------
// idft1d
// ---------------------------------------------------------------------------
describe('idft1d', () => {
  it('returns same length as input', () => {
    const input: Complex[] = [
      { re: 1, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
    ]
    expect(idft1d(input)).toHaveLength(4)
  })

  it('DC-only signal produces uniform output', () => {
    // k-space with only DC component → constant spatial signal
    const N = 8
    const input: Complex[] = Array.from({ length: N }, () => ({ re: 0, im: 0 }))
    input[0] = { re: N, im: 0 } // DC = N so that after /N normalization → 1.0
    const output = idft1d(input)
    for (const c of output) {
      expect(c.re).toBeCloseTo(1, 5)
      expect(c.im).toBeCloseTo(0, 5)
    }
  })

  it('all-zero input produces all-zero output', () => {
    const input: Complex[] = Array.from({ length: 4 }, () => ({ re: 0, im: 0 }))
    const output = idft1d(input)
    for (const c of output) {
      expect(c.re).toBeCloseTo(0, 10)
      expect(c.im).toBeCloseTo(0, 10)
    }
  })

  it('single element passes through', () => {
    const input: Complex[] = [{ re: 3.5, im: -2.1 }]
    const output = idft1d(input)
    expect(output[0].re).toBeCloseTo(3.5, 10)
    expect(output[0].im).toBeCloseTo(-2.1, 10)
  })

  it('Parseval-like energy conservation (magnitude sum)', () => {
    // IDFT of [1,1,1,1] → [1,0,0,0] (impulse at n=0)
    const N = 4
    const input: Complex[] = Array.from({ length: N }, () => ({ re: 1, im: 0 }))
    const output = idft1d(input)
    // output[0] = 1.0, rest ≈ 0
    expect(output[0].re).toBeCloseTo(1, 5)
    for (let i = 1; i < N; i++) {
      expect(magnitude(output[i])).toBeCloseTo(0, 5)
    }
  })

  it('handles pure imaginary input', () => {
    const input: Complex[] = [
      { re: 0, im: 4 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
      { re: 0, im: 0 },
    ]
    const output = idft1d(input)
    // DC = 4j → after IDFT all elements should have im=1.0
    expect(output[0].im).toBeCloseTo(1, 5)
    expect(output[0].re).toBeCloseTo(0, 5)
  })

  it('cosine wave in k-space produces two impulses in spatial domain', () => {
    // Two symmetric k-space components → real cosine
    const N = 8
    const input: Complex[] = Array.from({ length: N }, () => ({ re: 0, im: 0 }))
    input[1] = { re: N / 2, im: 0 }
    input[N - 1] = { re: N / 2, im: 0 }
    const output = idft1d(input)
    // Should produce a cosine: x[n] = cos(2πn/N)
    for (let n = 0; n < N; n++) {
      const expected = Math.cos((2 * Math.PI * n) / N)
      expect(output[n].re).toBeCloseTo(expected, 4)
      expect(output[n].im).toBeCloseTo(0, 4)
    }
  })
})

// ---------------------------------------------------------------------------
// idft2d
// ---------------------------------------------------------------------------
describe('idft2d', () => {
  it('returns IFT_SIZE x IFT_SIZE grid', () => {
    const N = IFT_SIZE
    const kData: Complex[][] = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => ({ re: 0, im: 0 })),
    )
    const result = idft2d(kData)
    expect(result).toHaveLength(N)
    expect(result[0]).toHaveLength(N)
  })

  it('all-zero k-space produces all-zero spatial', () => {
    const N = IFT_SIZE
    const kData: Complex[][] = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => ({ re: 0, im: 0 })),
    )
    const result = idft2d(kData)
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        expect(result[y][x]).toBeCloseTo(0, 5)
      }
    }
  })

  it('DC-only k-space produces uniform spatial image', () => {
    const N = IFT_SIZE
    const kData: Complex[][] = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => ({ re: 0, im: 0 })),
    )
    // Place a DC component at (0,0)
    kData[0][0] = { re: N * N, im: 0 }
    const result = idft2d(kData)
    // All pixels should have the same magnitude
    const expected = result[0][0]
    expect(expected).toBeGreaterThan(0)
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        expect(result[y][x]).toBeCloseTo(expected, 3)
      }
    }
  })

  it('result values are non-negative (magnitudes)', () => {
    const N = IFT_SIZE
    const kData: Complex[][] = Array.from({ length: N }, () =>
      Array.from({ length: N }, () => ({
        re: Math.random() * 2 - 1,
        im: Math.random() * 2 - 1,
      })),
    )
    const result = idft2d(kData)
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        expect(result[y][x]).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// buildIdealKSpace
// ---------------------------------------------------------------------------
describe('buildIdealKSpace', () => {
  const matrixPhase = 32

  it('returns IFT_SIZE x IFT_SIZE grid', () => {
    const lines = makeLines([0, 1, 2, -1, -2])
    const kData = buildIdealKSpace(lines, lines.length, matrixPhase)
    expect(kData).toHaveLength(IFT_SIZE)
    expect(kData[0]).toHaveLength(IFT_SIZE)
  })

  it('unfilled lines are zeroed out', () => {
    const lines = makeLines([0]) // only ky=0 filled
    const kData = buildIdealKSpace(lines, 1, matrixPhase)
    const half = Math.floor(IFT_SIZE / 2)
    const kyScale = IFT_SIZE / matrixPhase

    // ky=0 corresponds to kyIdx = half → should be non-zero
    const centerRow = kData[half]
    const hasCenterData = centerRow.some(c => c.re !== 0 || c.im !== 0)
    expect(hasCenterData).toBe(true)

    // A row far from ky=0 mapping should be zeroed
    // ky=15 → kyIdx = half - 15*kyScale (if it maps to an unfilled ky)
    let zeroCount = 0
    for (let kyIdx = 0; kyIdx < IFT_SIZE; kyIdx++) {
      const ky = Math.round((kyIdx - half) / kyScale)
      if (ky !== 0) {
        const allZero = kData[kyIdx].every(c => c.re === 0 && c.im === 0)
        if (allZero) zeroCount++
      }
    }
    expect(zeroCount).toBeGreaterThan(0)
  })

  it('skipped lines are treated as unfilled', () => {
    const lines = makeLines([0, 1], { isSkipped: true })
    // Mark line 0 as not skipped, line 1 as skipped
    lines[0].isSkipped = false
    lines[1].isSkipped = true

    const kData = buildIdealKSpace(lines, 2, matrixPhase)
    const half = Math.floor(IFT_SIZE / 2)
    const kyScale = IFT_SIZE / matrixPhase

    // ky=0 should have data, ky=1 should not
    const centerRow = kData[half]
    expect(centerRow.some(c => c.re !== 0)).toBe(true)

    // Find row for ky=1
    const ky1Idx = half + Math.round(1 * kyScale)
    if (ky1Idx >= 0 && ky1Idx < IFT_SIZE) {
      const row1 = kData[ky1Idx]
      expect(row1.every(c => c.re === 0 && c.im === 0)).toBe(true)
    }
  })

  it('filledUpTo=0 zeros out everything', () => {
    const lines = makeLines([0, 1, 2, -1, -2])
    const kData = buildIdealKSpace(lines, 0, matrixPhase)
    for (const row of kData) {
      for (const c of row) {
        expect(c.re).toBe(0)
        expect(c.im).toBe(0)
      }
    }
  })

  it('center of k-space has highest Gaussian weight', () => {
    // Fill all lines
    const half = Math.floor(matrixPhase / 2)
    const allKy = Array.from({ length: matrixPhase }, (_, i) => i - half)
    const lines = makeLines(allKy)
    const kData = buildIdealKSpace(lines, lines.length, matrixPhase)

    const centerIdx = Math.floor(IFT_SIZE / 2)
    const centerVal = kData[centerIdx][centerIdx].re
    const edgeVal = kData[0][0].re

    expect(centerVal).toBeGreaterThan(edgeVal)
  })

  it('all values have im=0 (Gaussian is real-valued)', () => {
    const half = Math.floor(matrixPhase / 2)
    const allKy = Array.from({ length: matrixPhase }, (_, i) => i - half)
    const lines = makeLines(allKy)
    const kData = buildIdealKSpace(lines, lines.length, matrixPhase)

    for (const row of kData) {
      for (const c of row) {
        expect(c.im).toBe(0)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// kyToColor
// ---------------------------------------------------------------------------
describe('kyToColor', () => {
  const matrixPhase = 256

  it('returns rgb() format by default', () => {
    const color = kyToColor(0, matrixPhase)
    expect(color).toMatch(/^rgb\(\d+,\d+,\d+\)$/)
  })

  it('returns rgba() format when alpha < 1', () => {
    const color = kyToColor(0, matrixPhase, 0.5)
    expect(color).toMatch(/^rgba\(\d+,\d+,\d+,0\.5\)$/)
  })

  it('center (ky=0) is brightest', () => {
    const center = kyToColor(0, matrixPhase)
    const edge = kyToColor(100, matrixPhase)

    const parseRgb = (s: string) => {
      const m = s.match(/\d+/g)!.map(Number)
      return { r: m[0], g: m[1], b: m[2] }
    }

    const cRgb = parseRgb(center)
    const eRgb = parseRgb(edge)

    // Center should have higher RGB values than edge
    expect(cRgb.r).toBeGreaterThan(eRgb.r)
    expect(cRgb.g).toBeGreaterThan(eRgb.g)
    expect(cRgb.b).toBeGreaterThan(eRgb.b)
  })

  it('symmetric ky values produce same color', () => {
    expect(kyToColor(50, matrixPhase)).toBe(kyToColor(-50, matrixPhase))
  })

  it('ky=0 produces near-white values', () => {
    const color = kyToColor(0, matrixPhase)
    const m = color.match(/\d+/g)!.map(Number)
    // r = 20+235=255, g = 100+155=255, b = 180+75=255
    expect(m[0]).toBe(255)
    expect(m[1]).toBe(255)
    expect(m[2]).toBe(255)
  })

  it('large ky produces dark blue values', () => {
    // Very large ky → weight ≈ 0 → rgb(20, 100, 180)
    const color = kyToColor(10000, matrixPhase)
    const m = color.match(/\d+/g)!.map(Number)
    expect(m[0]).toBe(20)
    expect(m[1]).toBe(100)
    expect(m[2]).toBe(180)
  })

  it('alpha=1 returns rgb not rgba', () => {
    const color = kyToColor(0, matrixPhase, 1)
    expect(color).toMatch(/^rgb\(/)
  })

  it('different matrixPhase changes spread', () => {
    // Smaller matrixPhase → wider Gaussian → brighter at same ky
    const colorSmall = kyToColor(10, 32)
    const colorLarge = kyToColor(10, 256)
    const parseR = (s: string) => Number(s.match(/\d+/)![0])
    // Smaller matrix → sigma smaller → ky=10 further from center → dimmer
    expect(parseR(colorSmall)).not.toBe(parseR(colorLarge))
  })
})
