import { describe, it, expect } from 'vitest'
import { presets, categories, type ProtocolParams } from './presets'
import { protocolTree } from './protocols'
import { coilProfiles, crossSections, getCoilProfile, getCoilForSection, type BodyCrossSection } from './coilProfiles'
import { clinicalFindings, getByRegion, getById, regions } from './clinicalFindings'
import { hints } from './clinicalHints'
import { artifacts } from './artifactGuide'
import { kSpacePatterns } from './kSpacePatterns'
import { getSeqClinical } from './sequenceClinicalData'

// ============================================================
// presets.ts
// ============================================================
describe('presets', () => {
  it('exports a non-empty array', () => {
    expect(presets.length).toBeGreaterThan(10)
  })

  it('every preset has required fields', () => {
    for (const p of presets) {
      expect(p.id).toBeTruthy()
      expect(p.label).toBeTruthy()
      expect(p.description).toBeTruthy()
      expect(p.category).toBeTruthy()
      expect(p.params).toBeDefined()
    }
  })

  it('preset ids are unique', () => {
    const ids = presets.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every preset params has all ProtocolParams keys', () => {
    const requiredKeys: (keyof ProtocolParams)[] = [
      'TR', 'TE', 'TI', 'flipAngle', 'slices', 'sliceThickness', 'sliceGap',
      'averages', 'fatSat', 'mt', 'matrixFreq', 'matrixPhase', 'fov',
      'bandwidth', 'orientation', 'phaseEncDir', 'coil', 'coilType',
      'ipatMode', 'ipatFactor', 'gradientMode', 'shim',
      'ecgTrigger', 'respTrigger', 'turboFactor', 'echoSpacing',
      'partialFourier', 'bValues', 'fieldStrength',
    ]
    for (const p of presets) {
      for (const key of requiredKeys) {
        expect(p.params).toHaveProperty(key)
      }
    }
  })

  it('fieldStrength is either 1.5 or 3.0', () => {
    for (const p of presets) {
      expect([1.5, 3.0]).toContain(p.params.fieldStrength)
    }
  })

  it('numeric params are within sane MRI ranges', () => {
    for (const p of presets) {
      expect(p.params.TR).toBeGreaterThan(0)
      expect(p.params.TE).toBeGreaterThan(0)
      expect(p.params.flipAngle).toBeGreaterThan(0)
      expect(p.params.flipAngle).toBeLessThanOrEqual(180)
      expect(p.params.slices).toBeGreaterThan(0)
      expect(p.params.sliceThickness).toBeGreaterThan(0)
      expect(p.params.fov).toBeGreaterThan(0)
      expect(p.params.matrixFreq).toBeGreaterThan(0)
      expect(p.params.matrixPhase).toBeGreaterThan(0)
      expect(p.params.bandwidth).toBeGreaterThan(0)
    }
  })

  it('categories are derived from presets', () => {
    expect(categories.length).toBeGreaterThan(0)
    for (const cat of categories) {
      expect(presets.some(p => p.category === cat)).toBe(true)
    }
  })
})

// ============================================================
// protocols.ts
// ============================================================
describe('protocolTree', () => {
  it('exports a non-empty array of body parts', () => {
    expect(protocolTree.length).toBeGreaterThan(0)
  })

  it('every body part has required fields', () => {
    for (const bp of protocolTree) {
      expect(bp.id).toBeTruthy()
      expect(bp.label).toBeTruthy()
      expect(bp.groups.length).toBeGreaterThan(0)
    }
  })

  it('body part ids are unique', () => {
    const ids = protocolTree.map(bp => bp.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every group has at least one variant', () => {
    for (const bp of protocolTree) {
      for (const g of bp.groups) {
        expect(g.id).toBeTruthy()
        expect(g.label).toBeTruthy()
        expect(g.variants.length).toBeGreaterThan(0)
      }
    }
  })

  it('every variant has at least one column with sequences', () => {
    for (const bp of protocolTree) {
      for (const g of bp.groups) {
        for (const v of g.variants) {
          expect(v.id).toBeTruthy()
          expect(v.columns.length).toBeGreaterThan(0)
          for (const col of v.columns) {
            expect(col.label).toBeTruthy()
            expect(col.sequences.length).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  it('every sequence step has a name', () => {
    for (const bp of protocolTree) {
      for (const g of bp.groups) {
        for (const v of g.variants) {
          for (const col of v.columns) {
            for (const seq of col.sequences) {
              expect(seq.name).toBeTruthy()
            }
          }
        }
      }
    }
  })
})

// ============================================================
// coilProfiles.ts
// ============================================================
describe('coilProfiles', () => {
  it('exports a non-empty array', () => {
    expect(coilProfiles.length).toBeGreaterThan(0)
  })

  it('every profile has required fields', () => {
    for (const cp of coilProfiles) {
      expect(cp.id).toBeTruthy()
      expect(cp.label).toBeTruthy()
      expect(cp.channels).toBeGreaterThan(0)
      expect(cp.description).toBeTruthy()
    }
  })

  it('sensitivity maps are 64x64 with values in [0,1]', () => {
    for (const cp of coilProfiles) {
      expect(cp.sensitivityMap.length).toBe(64)
      for (const row of cp.sensitivityMap) {
        expect(row.length).toBe(64)
        for (const val of row) {
          expect(val).toBeGreaterThanOrEqual(0)
          expect(val).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('coil profile ids are unique', () => {
    const ids = coilProfiles.map(cp => cp.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('crossSections', () => {
  it('exports a non-empty array', () => {
    expect(crossSections.length).toBeGreaterThan(0)
  })

  it('every cross section has required fields', () => {
    for (const cs of crossSections) {
      expect(cs.id).toBeTruthy()
      expect(cs.label).toBeTruthy()
      expect(cs.defaultCoilId).toBeTruthy()
      expect(cs.outline).toBeDefined()
      expect(cs.tissues.length).toBeGreaterThan(0)
    }
  })

  it('defaultCoilId references an existing coil profile', () => {
    const coilIds = new Set(coilProfiles.map(cp => cp.id))
    for (const cs of crossSections) {
      expect(coilIds.has(cs.defaultCoilId)).toBe(true)
    }
  })
})

describe('getCoilProfile', () => {
  it('returns a matching coil profile by name substring', () => {
    const profile = getCoilProfile('Head')
    expect(profile).toBeDefined()
    expect(profile.id).toBeTruthy()
  })

  it('returns the first coil profile for unknown name', () => {
    const profile = getCoilProfile('nonexistent_coil_xyz')
    expect(profile).toBeDefined()
  })
})

describe('getCoilForSection', () => {
  it('returns coil for each valid body cross section', () => {
    const sections: BodyCrossSection[] = ['head_axial', 'abdomen_axial', 'knee_axial', 'spine_sagittal']
    for (const s of sections) {
      const coil = getCoilForSection(s)
      expect(coil).toBeDefined()
      expect(coil.id).toBeTruthy()
    }
  })
})

// ============================================================
// clinicalFindings.ts
// ============================================================
describe('clinicalFindings', () => {
  it('exports a non-empty array', () => {
    expect(clinicalFindings.length).toBeGreaterThan(10)
  })

  it('every finding has required fields', () => {
    for (const f of clinicalFindings) {
      expect(f.id).toBeTruthy()
      expect(f.region).toBeTruthy()
      expect(f.disease).toBeTruthy()
      expect(f.keySequence).toBeTruthy()
      expect(f.typicalFindings.length).toBeGreaterThan(0)
      expect(f.differentialPoints.length).toBeGreaterThan(0)
      expect(f.pitfalls.length).toBeGreaterThan(0)
      expect(f.additionalImaging.length).toBeGreaterThan(0)
    }
  })

  it('finding ids are unique', () => {
    const ids = clinicalFindings.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('regions array matches unique regions from findings', () => {
    const uniqueRegions = [...new Set(clinicalFindings.map(f => f.region))]
    expect(regions.length).toBe(uniqueRegions.length)
    for (const r of uniqueRegions) {
      expect(regions).toContain(r)
    }
  })
})

describe('getByRegion', () => {
  it('returns findings for a known region', () => {
    const headFindings = getByRegion('頭部')
    expect(headFindings.length).toBeGreaterThan(0)
    for (const f of headFindings) {
      expect(f.region).toBe('頭部')
    }
  })

  it('returns empty array for unknown region', () => {
    expect(getByRegion('nonexistent_region')).toEqual([])
  })
})

describe('getById', () => {
  it('returns a finding for a known id', () => {
    const finding = getById('brain-infarction')
    expect(finding).toBeDefined()
    expect(finding!.disease).toBeTruthy()
  })

  it('returns undefined for unknown id', () => {
    expect(getById('nonexistent_id_xyz')).toBeUndefined()
  })
})

// ============================================================
// clinicalHints.ts
// ============================================================
describe('clinicalHints', () => {
  it('exports a non-empty record', () => {
    const keys = Object.keys(hints)
    expect(keys.length).toBeGreaterThan(10)
  })

  it('every hint has required string fields', () => {
    for (const [key, hint] of Object.entries(hints)) {
      expect(hint.title).toBeTruthy()
      expect(hint.description).toBeTruthy()
      expect(hint.increase).toBeTruthy()
      expect(hint.decrease).toBeTruthy()
      expect(hint.tradeoff).toBeTruthy()
      expect(hint.clinical).toBeTruthy()
      expect(key).toBeTruthy()
    }
  })

  it('contains essential MRI parameters', () => {
    const essentialKeys = ['TR', 'TE', 'TI', 'FlipAngle', 'FOV', 'Matrix', 'Bandwidth', 'iPAT', 'FatSat']
    for (const k of essentialKeys) {
      expect(hints).toHaveProperty(k)
    }
  })
})

// ============================================================
// artifactGuide.ts
// ============================================================
describe('artifacts', () => {
  it('exports a non-empty array', () => {
    expect(artifacts.length).toBeGreaterThan(3)
  })

  it('every artifact has required fields', () => {
    for (const a of artifacts) {
      expect(a.id).toBeTruthy()
      expect(a.name).toBeTruthy()
      expect(a.cause).toBeTruthy()
      expect(a.params.length).toBeGreaterThan(0)
      expect(a.solutions.length).toBeGreaterThan(0)
      expect(a.example).toBeTruthy()
    }
  })

  it('every solution has param, action, and detail', () => {
    for (const a of artifacts) {
      for (const s of a.solutions) {
        expect(s.param).toBeTruthy()
        expect(s.action).toBeTruthy()
        expect(s.detail).toBeTruthy()
      }
    }
  })

  it('artifact ids are unique', () => {
    const ids = artifacts.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

// ============================================================
// kSpacePatterns.ts
// ============================================================
describe('kSpacePatterns', () => {
  it('exports patterns for all 5 sequence types', () => {
    const types = kSpacePatterns.map(p => p.sequenceType)
    expect(types).toContain('TSE')
    expect(types).toContain('HASTE')
    expect(types).toContain('EPI')
    expect(types).toContain('GRE')
    expect(types).toContain('BLADE')
  })

  it('every pattern has required fields', () => {
    for (const p of kSpacePatterns) {
      expect(p.sequenceType).toBeTruthy()
      expect(p.label).toBeTruthy()
      expect(p.description).toBeTruthy()
      expect(typeof p.generate).toBe('function')
    }
  })

  it('generate() produces non-empty KSpaceLine arrays', () => {
    const defaultParams = {
      matrixPhase: 256,
      turboFactor: 15,
      partialFourier: 'Off',
      ipatMode: 'Off',
      ipatFactor: 2,
    }
    for (const p of kSpacePatterns) {
      const lines = p.generate(defaultParams)
      expect(lines.length).toBeGreaterThan(0)
      for (const line of lines.slice(0, 5)) {
        expect(typeof line.ky).toBe('number')
        expect(typeof line.trIndex).toBe('number')
        expect(typeof line.echoIndex).toBe('number')
        expect(typeof line.isACS).toBe('boolean')
        expect(typeof line.isSkipped).toBe('boolean')
      }
    }
  })

  it('generate() respects partial Fourier (fewer non-skipped lines for TSE)', () => {
    const tse = kSpacePatterns.find(p => p.sequenceType === 'TSE')!
    const fullLines = tse.generate({ matrixPhase: 256, turboFactor: 15, partialFourier: 'Off', ipatMode: 'Off', ipatFactor: 2 })
    const pfLines = tse.generate({ matrixPhase: 256, turboFactor: 15, partialFourier: '6/8', ipatMode: 'Off', ipatFactor: 2 })
    expect(pfLines.length).toBeLessThan(fullLines.length)
  })

  it('generate() with GRAPPA marks skipped lines for GRE', () => {
    const gre = kSpacePatterns.find(p => p.sequenceType === 'GRE')!
    const lines = gre.generate({ matrixPhase: 256, turboFactor: 15, partialFourier: 'Off', ipatMode: 'GRAPPA', ipatFactor: 2 })
    const skipped = lines.filter(l => l.isSkipped)
    expect(skipped.length).toBeGreaterThan(0)
    const acs = lines.filter(l => l.isACS)
    expect(acs.length).toBeGreaterThan(0)
  })
})

// ============================================================
// sequenceClinicalData.ts
// ============================================================
describe('getSeqClinical', () => {
  it('returns data for known sequence names', () => {
    const testCases = [
      { name: 'T2 TSE', bodyPartId: 'head' },
      { name: 'DWI', bodyPartId: 'head' },
      { name: 'FLAIR', bodyPartId: null },
      { name: 'localizer', bodyPartId: null },
    ]
    for (const tc of testCases) {
      const result = getSeqClinical(tc.name, tc.bodyPartId)
      expect(result).toBeDefined()
      expect(result.reason).toBeTruthy()
      expect(result.clinical).toBeTruthy()
    }
  })

  it('returns a fallback for unknown sequences', () => {
    const result = getSeqClinical('totally_unknown_sequence_xyz', null)
    expect(result).toBeDefined()
    expect(result.reason).toBeTruthy()
  })
})
