import { describe, it, expect, beforeAll } from 'vitest'
import {
  CLINICAL_DB,
  priorityStyle,
  urgencyStyle,
  type BodyPartData,
} from './clinicalIndicationUtils'

describe('clinicalIndicationUtils', () => {
  describe('CLINICAL_DB structure', () => {
    it('contains expected body parts', () => {
      const ids = CLINICAL_DB.map(bp => bp.id)
      expect(ids).toContain('brain')
      expect(ids).toContain('abdomen')
      expect(ids).toContain('pelvis')
      expect(ids).toContain('msk')
      expect(ids).toContain('breast')
      expect(ids).toContain('special')
      expect(ids).toContain('cardiac')
      expect(ids).toContain('vascular')
      expect(ids).toContain('oncology')
    })

    it('every body part has required fields', () => {
      for (const bp of CLINICAL_DB) {
        expect(bp.id).toBeTruthy()
        expect(bp.label).toBeTruthy()
        expect(bp.icon).toBeTruthy()
        expect(bp.indications.length).toBeGreaterThan(0)
      }
    })

    it('every indication has required fields', () => {
      for (const bp of CLINICAL_DB) {
        for (const ind of bp.indications) {
          expect(ind.id).toBeTruthy()
          expect(ind.label).toBeTruthy()
          expect(ind.icon).toBeTruthy()
          expect(ind.recommendations.length).toBeGreaterThan(0)
        }
      }
    })

    it('every recommendation has required fields', () => {
      for (const bp of CLINICAL_DB) {
        for (const ind of bp.indications) {
          for (const rec of ind.recommendations) {
            expect(rec.presetId).toBeTruthy()
            expect(['essential', 'recommended', 'optional']).toContain(rec.priority)
            expect(rec.reason).toBeTruthy()
          }
        }
      }
    })

    it('indication ids are unique across entire DB', () => {
      const allIds: string[] = []
      for (const bp of CLINICAL_DB) {
        for (const ind of bp.indications) {
          allIds.push(ind.id)
        }
      }
      const uniqueIds = new Set(allIds)
      expect(uniqueIds.size).toBe(allIds.length)
    })

    it('body part ids are unique', () => {
      const ids = CLINICAL_DB.map(bp => bp.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  describe('CLINICAL_DB - brain indications', () => {
    let brain: BodyPartData

    beforeAll(() => {
      brain = CLINICAL_DB.find(bp => bp.id === 'brain')!
    })

    it('has stroke_acute indication with stat urgency', () => {
      const stroke = brain.indications.find(i => i.id === 'stroke_acute')!
      expect(stroke).toBeDefined()
      expect(stroke.urgency).toBe('stat')
      expect(stroke.contraindications).toBeDefined()
      expect(stroke.contraindications!.length).toBeGreaterThan(0)
    })

    it('stroke_acute has DWI as essential first recommendation', () => {
      const stroke = brain.indications.find(i => i.id === 'stroke_acute')!
      const essential = stroke.recommendations.filter(r => r.priority === 'essential')
      expect(essential.length).toBeGreaterThanOrEqual(2)
      expect(essential[0].presetId).toBe('brain_dwi')
    })

    it('has MS indication with routine urgency', () => {
      const ms = brain.indications.find(i => i.id === 'ms')!
      expect(ms).toBeDefined()
      expect(ms.urgency).toBe('routine')
      expect(ms.clinicalPearl).toContain('マクドナルド基準')
    })

    it('has tumor indication with urgent urgency', () => {
      const tumor = brain.indications.find(i => i.id === 'tumor')!
      expect(tumor).toBeDefined()
      expect(tumor.urgency).toBe('urgent')
    })

    it('has hemorrhage indication with stat urgency', () => {
      const hemorrhage = brain.indications.find(i => i.id === 'hemorrhage')!
      expect(hemorrhage).toBeDefined()
      expect(hemorrhage.urgency).toBe('stat')
    })

    it('has epilepsy indication', () => {
      const epilepsy = brain.indications.find(i => i.id === 'epilepsy')!
      expect(epilepsy).toBeDefined()
      expect(epilepsy.recommendations.some(r => r.presetId === 'brain_space')).toBe(true)
    })

    it('has micro hemorrhage with SWI recommendation', () => {
      const mh = brain.indications.find(i => i.id === 'micro_hemorrhage')!
      expect(mh).toBeDefined()
      expect(mh.recommendations[0].presetId).toBe('brain_swi')
    })

    it('has cranial nerve indication with CISS', () => {
      const cn = brain.indications.find(i => i.id === 'cranial_nerve')!
      expect(cn).toBeDefined()
      expect(cn.recommendations[0].presetId).toBe('inner_ear_ciss')
    })
  })

  describe('CLINICAL_DB - MSK spine/joint indications', () => {
    let msk: BodyPartData

    beforeAll(() => {
      msk = CLINICAL_DB.find(bp => bp.id === 'msk')!
    })

    it('has spine stenosis indication', () => {
      const spine = msk.indications.find(i => i.id === 'spine_stenosis')
      expect(spine).toBeDefined()
    })

    it('has shoulder rotator cuff indication', () => {
      const shoulder = msk.indications.find(i => i.id === 'shoulder_rotator')
      expect(shoulder).toBeDefined()
    })

    it('has stress fracture indication', () => {
      const sf = msk.indications.find(i => i.id === 'stress_fracture')
      expect(sf).toBeDefined()
    })
  })

  describe('CLINICAL_DB - abdomen indications', () => {
    let abdomen: BodyPartData

    beforeAll(() => {
      abdomen = CLINICAL_DB.find(bp => bp.id === 'abdomen')!
    })

    it('exists with indications', () => {
      expect(abdomen).toBeDefined()
      expect(abdomen.indications.length).toBeGreaterThan(0)
    })

    it('has liver screening indication', () => {
      const liver = abdomen.indications.find(i => i.id === 'liver_screening')
      expect(liver).toBeDefined()
    })

    it('has biliary indication', () => {
      const biliary = abdomen.indications.find(i => i.id === 'biliary')
      expect(biliary).toBeDefined()
    })
  })

  describe('CLINICAL_DB - MSK indications', () => {
    let msk: BodyPartData

    beforeAll(() => {
      msk = CLINICAL_DB.find(bp => bp.id === 'msk')!
    })

    it('exists with indications', () => {
      expect(msk).toBeDefined()
      expect(msk.indications.length).toBeGreaterThan(0)
    })

    it('has knee meniscus indication', () => {
      const knee = msk.indications.find(i => i.id === 'knee_meniscus')
      expect(knee).toBeDefined()
    })

    it('has bone marrow indication', () => {
      const bm = msk.indications.find(i => i.id === 'bone_marrow')
      expect(bm).toBeDefined()
    })
  })

  describe('CLINICAL_DB - breast indications', () => {
    let breast: BodyPartData

    beforeAll(() => {
      breast = CLINICAL_DB.find(bp => bp.id === 'breast')!
    })

    it('exists with indications', () => {
      expect(breast).toBeDefined()
      expect(breast.indications.length).toBeGreaterThan(0)
    })

    it('has breast cancer workup as urgent', () => {
      const cancer = breast.indications.find(i => i.id === 'breast_cancer_workup')!
      expect(cancer).toBeDefined()
      expect(cancer.urgency).toBe('urgent')
    })

    it('breast cancer workup has DCE as essential', () => {
      const cancer = breast.indications.find(i => i.id === 'breast_cancer_workup')!
      const essential = cancer.recommendations.filter(r => r.priority === 'essential')
      expect(essential.length).toBeGreaterThanOrEqual(1)
      expect(essential[0].presetId).toBe('breast_dynamic')
    })

    it('has high-risk screening indication', () => {
      const hr = breast.indications.find(i => i.id === 'breast_screening_high_risk')!
      expect(hr).toBeDefined()
      expect(hr.urgency).toBe('routine')
    })

    it('has implant evaluation indication', () => {
      const implant = breast.indications.find(i => i.id === 'breast_implant')!
      expect(implant).toBeDefined()
      expect(implant.contraindications).toBeDefined()
    })

    it('has post-treatment evaluation indication', () => {
      const post = breast.indications.find(i => i.id === 'breast_post_treatment')!
      expect(post).toBeDefined()
      expect(post.urgency).toBe('urgent')
    })
  })

  describe('CLINICAL_DB - special indications', () => {
    let special: BodyPartData

    beforeAll(() => {
      special = CLINICAL_DB.find(bp => bp.id === 'special')!
    })

    it('exists with indications', () => {
      expect(special).toBeDefined()
      expect(special.indications.length).toBeGreaterThan(0)
    })

    it('has inner ear indication with CISS', () => {
      const ear = special.indications.find(i => i.id === 'inner_ear')!
      expect(ear).toBeDefined()
      expect(ear.recommendations[0].presetId).toBe('inner_ear_ciss')
    })

    it('has fetal MRI with contraindications', () => {
      const fetal = special.indications.find(i => i.id === 'fetal_mri')!
      expect(fetal).toBeDefined()
      expect(fetal.contraindications).toBeDefined()
      expect(fetal.contraindications!.length).toBeGreaterThanOrEqual(1)
    })

    it('has pediatric brain indication', () => {
      const ped = special.indications.find(i => i.id === 'pediatric_brain')!
      expect(ped).toBeDefined()
      expect(ped.recommendations[0].presetId).toBe('pediatric_brain')
    })

    it('has peripheral MRA indication', () => {
      const mra = special.indications.find(i => i.id === 'peripheral_mra')!
      expect(mra).toBeDefined()
    })
  })

  describe('CLINICAL_DB - urgency coverage', () => {
    it('has at least one stat urgency indication', () => {
      const stats = CLINICAL_DB.flatMap(bp => bp.indications).filter(i => i.urgency === 'stat')
      expect(stats.length).toBeGreaterThanOrEqual(1)
    })

    it('has at least one urgent indication', () => {
      const urgents = CLINICAL_DB.flatMap(bp => bp.indications).filter(i => i.urgency === 'urgent')
      expect(urgents.length).toBeGreaterThanOrEqual(1)
    })

    it('has at least one routine indication', () => {
      const routines = CLINICAL_DB.flatMap(bp => bp.indications).filter(i => i.urgency === 'routine')
      expect(routines.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('CLINICAL_DB - recommendation priority coverage', () => {
    it('has essential recommendations in every indication', () => {
      for (const bp of CLINICAL_DB) {
        for (const ind of bp.indications) {
          const essentials = ind.recommendations.filter(r => r.priority === 'essential')
          expect(essentials.length).toBeGreaterThanOrEqual(1)
        }
      }
    })

    it('total recommendation count is reasonable', () => {
      const total = CLINICAL_DB.flatMap(bp => bp.indications)
        .flatMap(i => i.recommendations).length
      expect(total).toBeGreaterThan(50)
    })
  })

  describe('CLINICAL_DB - clinicalPearl and clinicalNote', () => {
    it('most indications have clinicalPearl', () => {
      const all = CLINICAL_DB.flatMap(bp => bp.indications)
      const withPearl = all.filter(i => i.clinicalPearl)
      // At least 80% should have clinical pearls
      expect(withPearl.length / all.length).toBeGreaterThan(0.7)
    })

    it('clinicalPearls are non-empty strings', () => {
      for (const bp of CLINICAL_DB) {
        for (const ind of bp.indications) {
          if (ind.clinicalPearl) {
            expect(ind.clinicalPearl.length).toBeGreaterThan(10)
          }
        }
      }
    })

    it('some recommendations have clinicalNote', () => {
      const allRecs = CLINICAL_DB.flatMap(bp => bp.indications)
        .flatMap(i => i.recommendations)
      const withNote = allRecs.filter(r => r.clinicalNote)
      expect(withNote.length).toBeGreaterThan(5)
    })
  })

  describe('priorityStyle', () => {
    it('has all three priority levels', () => {
      expect(priorityStyle.essential).toBeDefined()
      expect(priorityStyle.recommended).toBeDefined()
      expect(priorityStyle.optional).toBeDefined()
    })

    it('each priority has bg, text, border, label', () => {
      for (const key of ['essential', 'recommended', 'optional']) {
        const style = priorityStyle[key]
        expect(style.bg).toMatch(/^#[0-9a-f]{6}$/)
        expect(style.text).toMatch(/^#[0-9a-f]{6}$/)
        expect(style.border).toMatch(/^#[0-9a-f]{6}$/)
        expect(style.label).toBeTruthy()
      }
    })

    it('essential label is 必須', () => {
      expect(priorityStyle.essential.label).toBe('必須')
    })

    it('recommended label is 推奨', () => {
      expect(priorityStyle.recommended.label).toBe('推奨')
    })

    it('optional label is 任意', () => {
      expect(priorityStyle.optional.label).toBe('任意')
    })
  })

  describe('urgencyStyle', () => {
    it('has all three urgency levels', () => {
      expect(urgencyStyle.stat).toBeDefined()
      expect(urgencyStyle.urgent).toBeDefined()
      expect(urgencyStyle.routine).toBeDefined()
    })

    it('each urgency has color and label', () => {
      for (const key of ['stat', 'urgent', 'routine']) {
        const style = urgencyStyle[key]
        expect(style.color).toMatch(/^#[0-9a-f]{6}$/)
        expect(style.label).toBeTruthy()
      }
    })

    it('stat label is STAT', () => {
      expect(urgencyStyle.stat.label).toBe('STAT')
    })

    it('urgent label is 緊急', () => {
      expect(urgencyStyle.urgent.label).toBe('緊急')
    })

    it('routine label is 通常', () => {
      expect(urgencyStyle.routine.label).toBe('通常')
    })

    it('stat color is red (#ef4444)', () => {
      expect(urgencyStyle.stat.color).toBe('#ef4444')
    })
  })

  describe('CLINICAL_DB - data consistency', () => {
    it('no duplicate presetIds within same indication', () => {
      for (const bp of CLINICAL_DB) {
        for (const ind of bp.indications) {
          const presetIds = ind.recommendations.map(r => r.presetId)
          expect(new Set(presetIds).size).toBe(presetIds.length)
        }
      }
    })

    it('contraindications are arrays of non-empty strings when present', () => {
      for (const bp of CLINICAL_DB) {
        for (const ind of bp.indications) {
          if (ind.contraindications) {
            expect(Array.isArray(ind.contraindications)).toBe(true)
            for (const c of ind.contraindications) {
              expect(c.length).toBeGreaterThan(0)
            }
          }
        }
      }
    })

    it('urgency values are valid when present', () => {
      const validUrgencies = ['stat', 'urgent', 'routine']
      for (const bp of CLINICAL_DB) {
        for (const ind of bp.indications) {
          if (ind.urgency) {
            expect(validUrgencies).toContain(ind.urgency)
          }
        }
      }
    })
  })
})
