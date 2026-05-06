import { describe, it, expect } from 'vitest'
import {
  CANVAS_SIZE,
  IMG_SIZE,
  getSliderConfig,
  getInfluenceItems,
  type InfluenceParams,
} from './artifactSimUtils'
import type { ArtifactType } from '../../data/artifactModels'

// ---------------------------------------------------------------------------
// Default test params
// ---------------------------------------------------------------------------

const baseParams: InfluenceParams = {
  fov: 230,
  matrixFreq: 256,
  matrixPhase: 256,
  bandwidth: 200,
  phaseOversampling: 0,
  phaseEncDir: 'A>>P',
  respTrigger: 'Off',
  fieldStrength: 1.5,
  fatSat: 'None',
  turboFactor: 15,
  ipatFactor: 1,
}

function params(overrides: Partial<InfluenceParams> = {}): InfluenceParams {
  return { ...baseParams, ...overrides }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('CANVAS_SIZE is 240', () => {
    expect(CANVAS_SIZE).toBe(240)
  })

  it('IMG_SIZE is 128', () => {
    expect(IMG_SIZE).toBe(128)
  })
})

// ── getSliderConfig ─────────────────────────────────────────────────────────

describe('getSliderConfig', () => {
  const knownArtifacts: ArtifactType[] = [
    'aliasing', 'motion_ghost', 'chemical_shift', 'susceptibility',
    'gibbs', 'zipper', 'gfactor_noise',
  ]

  it.each(knownArtifacts)('returns non-null config for %s', (id) => {
    const config = getSliderConfig(id)
    expect(config).not.toBeNull()
    expect(config!.label).toBeTruthy()
    expect(config!.min).toBeLessThan(config!.max)
    expect(config!.step).toBeGreaterThan(0)
    expect(config!.defaultValue).toBeGreaterThanOrEqual(config!.min)
    expect(config!.defaultValue).toBeLessThanOrEqual(config!.max)
    expect(config!.paramKey).toBeTruthy()
    expect(config!.description).toBeTruthy()
  })

  it('returns null for standing_wave (no slider)', () => {
    expect(getSliderConfig('standing_wave')).toBeNull()
  })

  // Specific value checks for representative artifact types
  it('aliasing slider has fov paramKey with range 150–400', () => {
    const c = getSliderConfig('aliasing')!
    expect(c.paramKey).toBe('fov')
    expect(c.min).toBe(150)
    expect(c.max).toBe(400)
    expect(c.step).toBe(10)
    expect(c.defaultValue).toBe(250)
    expect(c.unit).toBe('mm')
  })

  it('motion_ghost slider has ghostIntensity paramKey', () => {
    const c = getSliderConfig('motion_ghost')!
    expect(c.paramKey).toBe('ghostIntensity')
    expect(c.unit).toBe('%')
    expect(c.min).toBe(0)
    expect(c.max).toBe(100)
  })

  it('chemical_shift slider has bandwidth paramKey', () => {
    const c = getSliderConfig('chemical_shift')!
    expect(c.paramKey).toBe('bandwidth')
    expect(c.unit).toBe('Hz/px')
  })

  it('susceptibility slider has bandwidth paramKey', () => {
    const c = getSliderConfig('susceptibility')!
    expect(c.paramKey).toBe('bandwidth')
  })

  it('gibbs slider has matrixPhase paramKey with range 64–320', () => {
    const c = getSliderConfig('gibbs')!
    expect(c.paramKey).toBe('matrixPhase')
    expect(c.min).toBe(64)
    expect(c.max).toBe(320)
    expect(c.step).toBe(16)
  })

  it('zipper slider has turboFactor paramKey', () => {
    const c = getSliderConfig('zipper')!
    expect(c.paramKey).toBe('turboFactor')
    expect(c.min).toBe(1)
    expect(c.max).toBe(32)
  })

  it('gfactor_noise slider has ipatFactor paramKey with range 1–4', () => {
    const c = getSliderConfig('gfactor_noise')!
    expect(c.paramKey).toBe('ipatFactor')
    expect(c.min).toBe(1)
    expect(c.max).toBe(4)
  })
})

// ── getInfluenceItems ─────────────────────────────────────────────────────────

describe('getInfluenceItems', () => {
  // -- aliasing ---------------------------------------------------------------
  describe('aliasing', () => {
    it('FOV >= 300 is good', () => {
      const items = getInfluenceItems('aliasing', params({ fov: 350 }))
      expect(items[0].level).toBe('good')
      expect(items[0].value).toBe('350 mm')
    })

    it('FOV 220–299 is warn', () => {
      const items = getInfluenceItems('aliasing', params({ fov: 250 }))
      expect(items[0].level).toBe('warn')
    })

    it('FOV < 220 is bad', () => {
      const items = getInfluenceItems('aliasing', params({ fov: 180 }))
      expect(items[0].level).toBe('bad')
    })

    it('PhaseOversampling >= 20 is good', () => {
      const items = getInfluenceItems('aliasing', params({ phaseOversampling: 30 }))
      expect(items[1].level).toBe('good')
    })

    it('PhaseOversampling > 0 but < 20 is warn', () => {
      const items = getInfluenceItems('aliasing', params({ phaseOversampling: 10 }))
      expect(items[1].level).toBe('warn')
    })

    it('PhaseOversampling 0 is bad', () => {
      const items = getInfluenceItems('aliasing', params({ phaseOversampling: 0 }))
      expect(items[1].level).toBe('bad')
    })

    it('phase direction is always warn', () => {
      const items = getInfluenceItems('aliasing', params())
      expect(items[2].level).toBe('warn')
      expect(items[2].value).toBe('A>>P')
    })

    it('returns 3 items', () => {
      expect(getInfluenceItems('aliasing', params())).toHaveLength(3)
    })
  })

  // -- motion_ghost -----------------------------------------------------------
  describe('motion_ghost', () => {
    it('BH trigger is good', () => {
      const items = getInfluenceItems('motion_ghost', params({ respTrigger: 'BH' }))
      expect(items[0].level).toBe('good')
    })

    it('PACE trigger is good', () => {
      const items = getInfluenceItems('motion_ghost', params({ respTrigger: 'PACE' }))
      expect(items[0].level).toBe('good')
    })

    it('RT trigger is warn', () => {
      const items = getInfluenceItems('motion_ghost', params({ respTrigger: 'RT' }))
      expect(items[0].level).toBe('warn')
    })

    it('Off trigger is bad', () => {
      const items = getInfluenceItems('motion_ghost', params({ respTrigger: 'Off' }))
      expect(items[0].level).toBe('bad')
    })

    it('returns 2 items', () => {
      expect(getInfluenceItems('motion_ghost', params())).toHaveLength(2)
    })
  })

  // -- chemical_shift ---------------------------------------------------------
  describe('chemical_shift', () => {
    it('high bandwidth >= 300 is good', () => {
      const items = getInfluenceItems('chemical_shift', params({ bandwidth: 350 }))
      expect(items[0].level).toBe('good')
    })

    it('bandwidth 200–299 is warn', () => {
      const items = getInfluenceItems('chemical_shift', params({ bandwidth: 250 }))
      expect(items[0].level).toBe('warn')
    })

    it('bandwidth < 200 is bad', () => {
      const items = getInfluenceItems('chemical_shift', params({ bandwidth: 100 }))
      expect(items[0].level).toBe('bad')
    })

    it('1.5T is good, 3T is warn for field strength', () => {
      const items15 = getInfluenceItems('chemical_shift', params({ fieldStrength: 1.5 }))
      expect(items15[1].level).toBe('good')
      const items3 = getInfluenceItems('chemical_shift', params({ fieldStrength: 3.0 }))
      expect(items3[1].level).toBe('warn')
    })

    it('computes shift correctly at 1.5T BW=200', () => {
      // shift = round(220 / 200 * 10) / 10 = round(11) / 10 = 1.1
      const items = getInfluenceItems('chemical_shift', params({ fieldStrength: 1.5, bandwidth: 200 }))
      expect(items[2].value).toBe('1.1 px')
      expect(items[2].level).toBe('good') // < 1.5
    })

    it('computes shift correctly at 3T BW=130', () => {
      // shift = round(440 / 130 * 10) / 10 = round(33.846) / 10 = 3.4
      const items = getInfluenceItems('chemical_shift', params({ fieldStrength: 3.0, bandwidth: 130 }))
      expect(items[2].value).toBe('3.4 px')
      expect(items[2].level).toBe('bad') // >= 3
    })

    it('shift 1.5-2.9 is warn', () => {
      // 3T, BW=300: shift = round(440/300*10)/10 = round(14.67)/10 = 1.5
      const items = getInfluenceItems('chemical_shift', params({ fieldStrength: 3.0, bandwidth: 300 }))
      expect(items[2].value).toBe('1.5 px')
      expect(items[2].level).toBe('warn')
    })

    it('fatSat applied shows good', () => {
      const items = getInfluenceItems('chemical_shift', params({ fatSat: 'FatSat' }))
      expect(items[3].level).toBe('good')
      expect(items[3].value).toBe('FatSat')
    })

    it('fatSat None shows warn', () => {
      const items = getInfluenceItems('chemical_shift', params({ fatSat: 'None' }))
      expect(items[3].level).toBe('warn')
      expect(items[3].value).toBe('なし')
    })

    it('returns 4 items', () => {
      expect(getInfluenceItems('chemical_shift', params())).toHaveLength(4)
    })
  })

  // -- susceptibility ---------------------------------------------------------
  describe('susceptibility', () => {
    it('1.5T is good, 3T is bad for field strength', () => {
      expect(getInfluenceItems('susceptibility', params({ fieldStrength: 1.5 }))[0].level).toBe('good')
      expect(getInfluenceItems('susceptibility', params({ fieldStrength: 3.0 }))[0].level).toBe('bad')
    })

    it('bandwidth >= 300 is good', () => {
      expect(getInfluenceItems('susceptibility', params({ bandwidth: 300 }))[1].level).toBe('good')
    })

    it('bandwidth 200–299 is warn', () => {
      expect(getInfluenceItems('susceptibility', params({ bandwidth: 250 }))[1].level).toBe('warn')
    })

    it('bandwidth < 200 is bad', () => {
      expect(getInfluenceItems('susceptibility', params({ bandwidth: 100 }))[1].level).toBe('bad')
    })

    it('turboFactor >= 8 is good, 3-7 warn, <3 bad', () => {
      expect(getInfluenceItems('susceptibility', params({ turboFactor: 10 }))[2].level).toBe('good')
      expect(getInfluenceItems('susceptibility', params({ turboFactor: 5 }))[2].level).toBe('warn')
      expect(getInfluenceItems('susceptibility', params({ turboFactor: 2 }))[2].level).toBe('bad')
    })

    it('always has static "信号消失+歪み" bad item', () => {
      const items = getInfluenceItems('susceptibility', params())
      expect(items[3].label).toBe('副鼻腔周囲')
      expect(items[3].level).toBe('bad')
    })

    it('returns 4 items', () => {
      expect(getInfluenceItems('susceptibility', params())).toHaveLength(4)
    })
  })

  // -- gibbs ------------------------------------------------------------------
  describe('gibbs', () => {
    it('matrix freq >= 256 is good', () => {
      expect(getInfluenceItems('gibbs', params({ matrixFreq: 256 }))[0].level).toBe('good')
    })

    it('matrix freq 192–255 is warn', () => {
      expect(getInfluenceItems('gibbs', params({ matrixFreq: 192 }))[0].level).toBe('warn')
    })

    it('matrix freq < 192 is bad', () => {
      expect(getInfluenceItems('gibbs', params({ matrixFreq: 128 }))[0].level).toBe('bad')
    })

    it('matrix phase >= 256 is good', () => {
      expect(getInfluenceItems('gibbs', params({ matrixPhase: 320 }))[1].level).toBe('good')
    })

    it('matrix phase < 192 is bad', () => {
      expect(getInfluenceItems('gibbs', params({ matrixPhase: 128 }))[1].level).toBe('bad')
    })

    it('minimum matrix uses min of freq and phase', () => {
      const items = getInfluenceItems('gibbs', params({ matrixFreq: 320, matrixPhase: 128 }))
      expect(items[2].value).toBe('128')
      expect(items[2].level).toBe('bad')
    })

    it('minimum matrix good when both >= 256', () => {
      const items = getInfluenceItems('gibbs', params({ matrixFreq: 256, matrixPhase: 256 }))
      expect(items[2].level).toBe('good')
    })

    it('returns 3 items', () => {
      expect(getInfluenceItems('gibbs', params())).toHaveLength(3)
    })
  })

  // -- zipper -----------------------------------------------------------------
  describe('zipper', () => {
    it('fieldStrength >= 2.5 is bad', () => {
      expect(getInfluenceItems('zipper', params({ fieldStrength: 3.0 }))[0].level).toBe('bad')
    })

    it('fieldStrength < 2.5 is warn', () => {
      expect(getInfluenceItems('zipper', params({ fieldStrength: 1.5 }))[0].level).toBe('warn')
    })

    it('turboFactor >= 16 is bad', () => {
      expect(getInfluenceItems('zipper', params({ turboFactor: 16 }))[1].level).toBe('bad')
    })

    it('turboFactor 8–15 is warn', () => {
      expect(getInfluenceItems('zipper', params({ turboFactor: 10 }))[1].level).toBe('warn')
    })

    it('turboFactor < 8 is good', () => {
      expect(getInfluenceItems('zipper', params({ turboFactor: 4 }))[1].level).toBe('good')
    })

    it('always has EMI shield warn item', () => {
      const items = getInfluenceItems('zipper', params())
      expect(items[2].label).toBe('EMIシールド')
      expect(items[2].level).toBe('warn')
    })

    it('returns 3 items', () => {
      expect(getInfluenceItems('zipper', params())).toHaveLength(3)
    })
  })

  // -- standing_wave ----------------------------------------------------------
  describe('standing_wave', () => {
    it('fieldStrength >= 2.5 is bad', () => {
      expect(getInfluenceItems('standing_wave', params({ fieldStrength: 3.0 }))[0].level).toBe('bad')
    })

    it('fieldStrength < 2.5 is good', () => {
      expect(getInfluenceItems('standing_wave', params({ fieldStrength: 1.5 }))[0].level).toBe('good')
    })

    it('3T measures show warn, 1.5T measures show good', () => {
      const items3 = getInfluenceItems('standing_wave', params({ fieldStrength: 3.0 }))
      expect(items3[1].level).toBe('warn')
      const items15 = getInfluenceItems('standing_wave', params({ fieldStrength: 1.5 }))
      expect(items15[1].level).toBe('good')
    })

    it('gel pad item is always warn', () => {
      const items = getInfluenceItems('standing_wave', params())
      expect(items[2].label).toBe('ゲルパッド')
      expect(items[2].level).toBe('warn')
    })

    it('returns 3 items', () => {
      expect(getInfluenceItems('standing_wave', params())).toHaveLength(3)
    })
  })

  // -- gfactor_noise ----------------------------------------------------------
  describe('gfactor_noise', () => {
    it('ipatFactor 1 is good', () => {
      const items = getInfluenceItems('gfactor_noise', params({ ipatFactor: 1 }))
      expect(items[0].level).toBe('good')
      expect(items[0].value).toBe('AF=1')
    })

    it('ipatFactor 2 is warn', () => {
      expect(getInfluenceItems('gfactor_noise', params({ ipatFactor: 2 }))[0].level).toBe('warn')
    })

    it('ipatFactor 3+ is bad', () => {
      expect(getInfluenceItems('gfactor_noise', params({ ipatFactor: 3 }))[0].level).toBe('bad')
      expect(getInfluenceItems('gfactor_noise', params({ ipatFactor: 4 }))[0].level).toBe('bad')
    })

    it('coil channel recommendation for high IPAT', () => {
      const items = getInfluenceItems('gfactor_noise', params({ ipatFactor: 3 }))
      expect(items[1].value).toBe('多ch推奨')
      expect(items[1].level).toBe('warn')
    })

    it('coil channel adequate for low IPAT', () => {
      const items = getInfluenceItems('gfactor_noise', params({ ipatFactor: 2 }))
      expect(items[1].value).toBe('適切')
      expect(items[1].level).toBe('good')
    })

    it('SNR impact formula includes ipat factor', () => {
      const items = getInfluenceItems('gfactor_noise', params({ ipatFactor: 2 }))
      expect(items[2].value).toBe('×1/√2 ×g')
      expect(items[2].level).toBe('warn')
    })

    it('SNR impact is bad for ipatFactor > 2', () => {
      expect(getInfluenceItems('gfactor_noise', params({ ipatFactor: 3 }))[2].level).toBe('bad')
    })

    it('returns 3 items', () => {
      expect(getInfluenceItems('gfactor_noise', params())).toHaveLength(3)
    })
  })
})
