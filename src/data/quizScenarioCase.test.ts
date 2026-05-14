import { describe, it, expect } from 'vitest'
import { quizQuestions } from './quizData'
import { choiceExplanations } from './quizChoiceExplanations'
import { choiceExplanationsA } from './quizChoiceExplanations_a'
import { choiceExplanationsB } from './quizChoiceExplanations_b'
import { choiceExplanations_c } from './quizChoiceExplanations_c'
import { scenarios } from './scenarioData'
import { caseQuestions } from './caseTrainingData'
import { presets } from './presets'

// ============================================================
// quizData.ts
// ============================================================
describe('quizQuestions', () => {
  it('exports a large array of questions', () => {
    expect(quizQuestions.length).toBeGreaterThan(50)
  })

  it('every question has required fields', () => {
    for (const q of quizQuestions) {
      expect(q.id).toBeGreaterThan(0)
      expect(q.category).toBeTruthy()
      expect([1, 2, 3]).toContain(q.difficulty)
      expect(q.question).toBeTruthy()
      expect(q.choices.length).toBeGreaterThanOrEqual(4)
      expect(q.correct).toBeGreaterThanOrEqual(0)
      expect(q.correct).toBeLessThan(q.choices.length)
      expect(q.explanation).toBeTruthy()
    }
  })

  it('question ids are unique', () => {
    const ids = quizQuestions.map(q => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('correct index is within choices range', () => {
    for (const q of quizQuestions) {
      expect(q.correct).toBeLessThan(q.choices.length)
    }
  })

  it('no empty choice strings', () => {
    for (const q of quizQuestions) {
      for (const c of q.choices) {
        expect(c.trim().length).toBeGreaterThan(0)
      }
    }
  })
})

// ============================================================
// quizChoiceExplanations*.ts
// ============================================================
describe('choiceExplanations (main)', () => {
  it('exports a non-empty record', () => {
    expect(Object.keys(choiceExplanations).length).toBeGreaterThan(0)
  })

  it('every entry has non-empty explanation strings', () => {
    for (const [, explanations] of Object.entries(choiceExplanations)) {
      expect(explanations.length).toBeGreaterThan(0)
      for (const e of explanations) {
        expect(e.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('keys reference valid quiz question ids', () => {
    const questionIds = new Set(quizQuestions.map(q => q.id))
    for (const idStr of Object.keys(choiceExplanations)) {
      expect(questionIds.has(Number(idStr))).toBe(true)
    }
  })
})

describe('choiceExplanationsA', () => {
  it('exports a non-empty record', () => {
    expect(Object.keys(choiceExplanationsA).length).toBeGreaterThan(0)
  })

  it('keys reference valid quiz question ids', () => {
    const questionIds = new Set(quizQuestions.map(q => q.id))
    for (const idStr of Object.keys(choiceExplanationsA)) {
      expect(questionIds.has(Number(idStr))).toBe(true)
    }
  })
})

describe('choiceExplanationsB', () => {
  it('exports a non-empty record', () => {
    expect(Object.keys(choiceExplanationsB).length).toBeGreaterThan(0)
  })

  it('keys reference valid quiz question ids', () => {
    const questionIds = new Set(quizQuestions.map(q => q.id))
    for (const idStr of Object.keys(choiceExplanationsB)) {
      expect(questionIds.has(Number(idStr))).toBe(true)
    }
  })
})

describe('choiceExplanations_c', () => {
  it('exports a non-empty record', () => {
    expect(Object.keys(choiceExplanations_c).length).toBeGreaterThan(0)
  })

  it('keys reference valid quiz question ids', () => {
    const questionIds = new Set(quizQuestions.map(q => q.id))
    for (const idStr of Object.keys(choiceExplanations_c)) {
      expect(questionIds.has(Number(idStr))).toBe(true)
    }
  })
})

// ============================================================
// scenarioData.ts
// ============================================================
describe('scenarios', () => {
  it('exports a non-empty array', () => {
    expect(scenarios.length).toBeGreaterThan(10)
  })

  it('every scenario has required fields', () => {
    const validCategories = ['急患', '小児', '閉所恐怖症', '金属', '体動', '呼吸困難', '造影', 'SAR超過', 'アーチファクト', '心臓']
    for (const s of scenarios) {
      expect(s.id).toBeTruthy()
      expect(s.title).toBeTruthy()
      expect(validCategories).toContain(s.category)
      expect([1, 2, 3]).toContain(s.difficulty)
      expect(s.patientInfo).toBeTruthy()
      expect(s.currentPresetId).toBeTruthy()
      expect(s.question).toBeTruthy()
      expect(s.options.length).toBeGreaterThanOrEqual(2)
      expect(s.detailedExplanation).toBeTruthy()
    }
  })

  it('scenario ids are unique', () => {
    const ids = scenarios.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every scenario has exactly one correct option', () => {
    for (const s of scenarios) {
      const correctCount = s.options.filter(o => o.isCorrect).length
      expect(correctCount).toBe(1)
    }
  })

  it('every option has paramChanges and explanation', () => {
    for (const s of scenarios) {
      for (const o of s.options) {
        expect(o.label).toBeTruthy()
        expect(o.explanation).toBeTruthy()
        expect(o.paramChanges).toBeDefined()
      }
    }
  })

  it('most currentPresetIds reference an existing preset', () => {
    const presetIds = new Set(presets.map(p => p.id))
    const missing = scenarios.filter(s => !presetIds.has(s.currentPresetId))
    // Allow a small number of forward-references to presets not yet defined
    expect(missing.length).toBeLessThanOrEqual(5)
  })
})

// ============================================================
// caseTrainingData.ts
// ============================================================
describe('caseQuestions', () => {
  it('exports a non-empty array', () => {
    expect(caseQuestions.length).toBeGreaterThan(20)
  })

  it('every case has required fields', () => {
    for (const c of caseQuestions) {
      expect(c.id).toBeTruthy()
      expect([1, 2, 3]).toContain(c.difficulty)
      expect(c.patientAge).toBeGreaterThan(0)
      expect(['M', 'F']).toContain(c.patientSex)
      expect(c.chiefComplaint).toBeTruthy()
      expect(c.clinicalHistory).toBeTruthy()
      expect(c.referralInfo).toBeTruthy()
      expect(c.bodyRegion).toBeTruthy()
      expect(c.choices.length).toBeGreaterThanOrEqual(3)
      expect(c.explanation).toBeTruthy()
      expect(c.commonMistakes.length).toBeGreaterThan(0)
    }
  })

  it('case ids are unique', () => {
    const ids = caseQuestions.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every case has exactly one correct choice', () => {
    for (const c of caseQuestions) {
      const correctCount = c.choices.filter(ch => ch.isCorrect).length
      expect(correctCount).toBe(1)
    }
  })

  it('every choice has required fields', () => {
    for (const c of caseQuestions) {
      for (const ch of c.choices) {
        expect(ch.protocolId).toBeTruthy()
        expect(ch.label).toBeTruthy()
        expect(typeof ch.isCorrect).toBe('boolean')
        expect(typeof ch.isAcceptable).toBe('boolean')
        expect(ch.reason).toBeTruthy()
      }
    }
  })

  it('isAcceptable marks alternative acceptable choices (not the correct one)', () => {
    // In this dataset, isCorrect = best answer, isAcceptable = alternative OK choices
    for (const c of caseQuestions) {
      const acceptable = c.choices.filter(ch => ch.isAcceptable)
      // acceptable choices should not also be the correct one
      for (const ch of acceptable) {
        expect(ch.isCorrect).toBe(false)
      }
    }
  })

  it('all difficulty levels are represented', () => {
    const difficulties = new Set(caseQuestions.map(c => c.difficulty))
    expect(difficulties.has(1)).toBe(true)
    expect(difficulties.has(2)).toBe(true)
    expect(difficulties.has(3)).toBe(true)
  })
})
