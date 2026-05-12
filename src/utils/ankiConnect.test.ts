import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { QuizQuestion } from '../data/quizData'
import type { CaseQuestion } from '../data/caseTrainingData'
import type { Scenario } from '../data/scenarioData'
import {
  quizToAnkiNote,
  caseToAnkiNote,
  scenarioToAnkiNote,
  addQuizToAnki,
  addAllQuizToAnki,
  addAllCasesToAnki,
  addAllScenariesToAnki,
} from './ankiConnect'

// ─── Fixtures ───────────────────────────────────────────────

const quizQ: QuizQuestion = {
  id: 1,
  category: 'パラメータ',
  difficulty: 2,
  question: 'TR延長で変化するのは？',
  choices: ['SNR', 'コントラスト', '空間分解能', 'スキャン時間'],
  correct: 1,
  explanation: 'TR延長によりT1回復が十分となりコントラストが変化する',
}

const caseQ: CaseQuestion = {
  id: 'case_test',
  difficulty: 3,
  patientAge: 45,
  patientSex: 'F',
  chiefComplaint: '頭痛',
  clinicalHistory: '2週間前から持続する頭痛',
  referralInfo: '頭部MRI精査',
  bodyRegion: '頭部',
  choices: [
    { protocolId: 'p1', label: 'T2-FLAIR', isCorrect: true, isAcceptable: false, reason: '病変検出に最適' },
    { protocolId: 'p2', label: 'T1WI', isCorrect: false, isAcceptable: true, reason: '解剖確認には有用' },
    { protocolId: 'p3', label: 'DWI', isCorrect: false, isAcceptable: false, reason: '今回は不要' },
  ],
  explanation: 'FLAIRが最も適切である',
  commonMistakes: ['DWIのみで撮影', '造影なしで終了'],
}

const scenarioQ: Scenario = {
  id: 'sc_test',
  title: 'テストシナリオ',
  category: '急患',
  difficulty: 1,
  patientInfo: '80歳男性、意識障害',
  currentPresetId: 'brain_routine',
  question: '最も優先すべきシーケンスは？',
  options: [
    { label: 'DWI', paramChanges: {}, isCorrect: true, explanation: '急性期脳梗塞の検出に必須' },
    { label: 'T2WI', paramChanges: {}, isCorrect: false, explanation: '急性期では感度が低い' },
  ],
  detailedExplanation: 'DWIは急性期脳梗塞診断のゴールドスタンダードである',
  relatedParams: ['bValue', 'TE'],
}

// ─── Mock fetch globally ────────────────────────────────────

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

function mockFetchResponse(result: unknown) {
  fetchMock.mockResolvedValueOnce({
    json: () => Promise.resolve({ result, error: null }),
  })
}

function mockFetchError(error: string) {
  fetchMock.mockResolvedValueOnce({
    json: () => Promise.resolve({ result: null, error }),
  })
}

// Helper: mock ensureDeck (deckNames + optional createDeck)
function mockEnsureDeck(deckExists = true) {
  // deckNames call
  mockFetchResponse(deckExists ? ['MRI Protocol Simulator', 'Default'] : ['Default'])
  // If deck doesn't exist, createDeck call
  if (!deckExists) mockFetchResponse(null)
}

// ─────────────────────────────────────────────────────────────
// quizToAnkiNote — pure function
// ─────────────────────────────────────────────────────────────

describe('quizToAnkiNote', () => {
  it('generates front with category, stars, question and choices', () => {
    const { front } = quizToAnkiNote(quizQ)
    expect(front).toContain('【パラメータ】')
    expect(front).toContain('★★☆')
    expect(front).toContain('TR延長で変化するのは？')
    expect(front).toContain('A) SNR')
    expect(front).toContain('B) コントラスト')
    expect(front).toContain('C) 空間分解能')
    expect(front).toContain('D) スキャン時間')
  })

  it('generates back with correct answer and explanation', () => {
    const { back } = quizToAnkiNote(quizQ)
    expect(back).toContain('正解: B) コントラスト')
    expect(back).toContain('解説:')
    expect(back).toContain(quizQ.explanation)
  })

  it('generates tags with MRI, category, and difficulty', () => {
    const { tags } = quizToAnkiNote(quizQ)
    expect(tags).toContain('MRI')
    expect(tags).toContain('パラメータ')
    expect(tags).toContain('難易度2')
  })

  it('handles difficulty 1 stars', () => {
    const q1 = { ...quizQ, difficulty: 1 as const }
    const { front } = quizToAnkiNote(q1)
    expect(front).toContain('★☆☆')
  })

  it('handles difficulty 3 stars', () => {
    const q3 = { ...quizQ, difficulty: 3 as const }
    const { front } = quizToAnkiNote(q3)
    expect(front).toContain('★★★')
  })

  it('handles category with slash', () => {
    const q = { ...quizQ, category: 'SAR/安全' as QuizQuestion['category'] }
    const { tags } = quizToAnkiNote(q)
    expect(tags).toContain('SAR-安全')
  })

  it('correctly maps choice index 0', () => {
    const q = { ...quizQ, correct: 0 }
    const { back } = quizToAnkiNote(q)
    expect(back).toContain('正解: A) SNR')
  })

  it('joins choices with <br>', () => {
    const { front } = quizToAnkiNote(quizQ)
    expect(front).toContain('A) SNR<br>B) コントラスト')
  })
})

// ─────────────────────────────────────────────────────────────
// caseToAnkiNote — pure function
// ─────────────────────────────────────────────────────────────

describe('caseToAnkiNote', () => {
  it('generates front with header, patient info and chief complaint', () => {
    const { front } = caseToAnkiNote(caseQ)
    expect(front).toContain('【症例訓練】')
    expect(front).toContain('★★★')
    expect(front).toContain('頭部')
    expect(front).toContain('45歳 女性')
    expect(front).toContain('主訴: 頭痛')
    expect(front).toContain('病歴: 2週間前から持続する頭痛')
    expect(front).toContain('依頼: 頭部MRI精査')
    expect(front).toContain('→ 最適なプロトコルは？')
  })

  it('renders male patient as 男性', () => {
    const maleCase = { ...caseQ, patientSex: 'M' as const }
    const { front } = caseToAnkiNote(maleCase)
    expect(front).toContain('男性')
  })

  it('includes correct choices in back', () => {
    const { back } = caseToAnkiNote(caseQ)
    expect(back).toContain('正解:')
    expect(back).toContain('✓ T2-FLAIR')
    expect(back).toContain('病変検出に最適')
  })

  it('includes acceptable choices in back', () => {
    const { back } = caseToAnkiNote(caseQ)
    expect(back).toContain('許容:')
    expect(back).toContain('△ T1WI')
    expect(back).toContain('解剖確認には有用')
  })

  it('includes explanation', () => {
    const { back } = caseToAnkiNote(caseQ)
    expect(back).toContain('解説:')
    expect(back).toContain('FLAIRが最も適切である')
  })

  it('includes common mistakes when present', () => {
    const { back } = caseToAnkiNote(caseQ)
    expect(back).toContain('よくある間違い:')
    expect(back).toContain('• DWIのみで撮影')
    expect(back).toContain('• 造影なしで終了')
  })

  it('omits common mistakes section when empty', () => {
    const noMistakes = { ...caseQ, commonMistakes: [] }
    const { back } = caseToAnkiNote(noMistakes)
    expect(back).not.toContain('よくある間違い')
  })

  it('omits correct section when no correct choices', () => {
    const noCorrect = {
      ...caseQ,
      choices: caseQ.choices.map(c => ({ ...c, isCorrect: false })),
    }
    const { back } = caseToAnkiNote(noCorrect)
    expect(back).not.toContain('✓')
  })

  it('omits acceptable section when no acceptable choices', () => {
    const noAcceptable = {
      ...caseQ,
      choices: caseQ.choices.map(c => ({ ...c, isAcceptable: false })),
    }
    const { back } = caseToAnkiNote(noAcceptable)
    expect(back).not.toContain('△')
  })

  it('generates correct tags', () => {
    const { tags } = caseToAnkiNote(caseQ)
    expect(tags).toEqual(['MRI', '症例訓練', '頭部', '難易度3'])
  })
})

// ─────────────────────────────────────────────────────────────
// scenarioToAnkiNote — pure function
// ─────────────────────────────────────────────────────────────

describe('scenarioToAnkiNote', () => {
  it('generates front with category, stars, patient info and question', () => {
    const { front } = scenarioToAnkiNote(scenarioQ)
    expect(front).toContain('【シナリオ】急患')
    expect(front).toContain('★☆☆')
    expect(front).toContain('80歳男性、意識障害')
    expect(front).toContain('最も優先すべきシーケンスは？')
  })

  it('includes correct options in back', () => {
    const { back } = scenarioToAnkiNote(scenarioQ)
    expect(back).toContain('✓ DWI')
    expect(back).toContain('急性期脳梗塞の検出に必須')
  })

  it('includes incorrect options in back', () => {
    const { back } = scenarioToAnkiNote(scenarioQ)
    expect(back).toContain('✗ T2WI')
    expect(back).toContain('急性期では感度が低い')
  })

  it('includes detailed explanation', () => {
    const { back } = scenarioToAnkiNote(scenarioQ)
    expect(back).toContain('詳細解説:')
    expect(back).toContain('DWIは急性期脳梗塞診断のゴールドスタンダードである')
  })

  it('includes related params when present', () => {
    const { back } = scenarioToAnkiNote(scenarioQ)
    expect(back).toContain('関連パラメータ: bValue / TE')
  })

  it('omits related params when absent', () => {
    const noParams = { ...scenarioQ, relatedParams: undefined }
    const { back } = scenarioToAnkiNote(noParams)
    expect(back).not.toContain('関連パラメータ')
  })

  it('omits related params when empty array', () => {
    const emptyParams = { ...scenarioQ, relatedParams: [] }
    const { back } = scenarioToAnkiNote(emptyParams)
    expect(back).not.toContain('関連パラメータ')
  })

  it('generates correct tags', () => {
    const { tags } = scenarioToAnkiNote(scenarioQ)
    expect(tags).toEqual(['MRI', 'シナリオ', '急患', '難易度1'])
  })
})

// ─────────────────────────────────────────────────────────────
// addQuizToAnki — async, fetch mocked
// ─────────────────────────────────────────────────────────────

describe('addQuizToAnki', () => {
  it('calls ensureDeck then addNote', async () => {
    mockEnsureDeck(true)
    mockFetchResponse(12345) // addNote result
    await addQuizToAnki(quizQ)

    expect(fetchMock).toHaveBeenCalledTimes(2)

    // First call: deckNames
    const call0 = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(call0.action).toBe('deckNames')

    // Second call: addNote
    const call1 = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(call1.action).toBe('addNote')
    expect(call1.params.note.deckName).toBe('MRI Protocol Simulator')
    expect(call1.params.note.modelName).toBe('Basic')
    expect(call1.params.note.fields.Front).toContain('パラメータ')
    expect(call1.params.note.tags).toContain('MRI')
  })

  it('creates deck if it does not exist', async () => {
    mockEnsureDeck(false)
    mockFetchResponse(12345) // addNote

    await addQuizToAnki(quizQ)

    expect(fetchMock).toHaveBeenCalledTimes(3) // deckNames + createDeck + addNote
    const call1 = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(call1.action).toBe('createDeck')
    expect(call1.params.deck).toBe('MRI Protocol Simulator')
  })

  it('throws on AnkiConnect error', async () => {
    mockEnsureDeck(true)
    mockFetchError('duplicate note')

    await expect(addQuizToAnki(quizQ)).rejects.toThrow('duplicate note')
  })
})

// ─────────────────────────────────────────────────────────────
// addAllQuizToAnki — batch
// ─────────────────────────────────────────────────────────────

describe('addAllQuizToAnki', () => {
  it('returns added/skipped counts', async () => {
    mockEnsureDeck(true)
    mockFetchResponse([12345, null, 12347]) // addNotes: 2 added, 1 skipped

    const q2 = { ...quizQ, id: 2, correct: 0 }
    const q3 = { ...quizQ, id: 3, correct: 2 }
    const result = await addAllQuizToAnki([quizQ, q2, q3])

    expect(result).toEqual({ added: 2, skipped: 1 })
  })

  it('sends all notes in a single addNotes call', async () => {
    mockEnsureDeck(true)
    mockFetchResponse([1, 2])

    const q2 = { ...quizQ, id: 2 }
    await addAllQuizToAnki([quizQ, q2])

    const addNotesCall = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(addNotesCall.action).toBe('addNotes')
    expect(addNotesCall.params.notes).toHaveLength(2)
  })

  it('returns 0/0 for empty array', async () => {
    mockEnsureDeck(true)
    mockFetchResponse([])

    const result = await addAllQuizToAnki([])
    expect(result).toEqual({ added: 0, skipped: 0 })
  })
})

// ─────────────────────────────────────────────────────────────
// addAllCasesToAnki — batch
// ─────────────────────────────────────────────────────────────

describe('addAllCasesToAnki', () => {
  it('returns added/skipped counts', async () => {
    mockEnsureDeck(true)
    mockFetchResponse([100, null])

    const c2 = { ...caseQ, id: 'case_test2' }
    const result = await addAllCasesToAnki([caseQ, c2])

    expect(result).toEqual({ added: 1, skipped: 1 })
  })

  it('sends notes with case-specific fields', async () => {
    mockEnsureDeck(true)
    mockFetchResponse([100])

    await addAllCasesToAnki([caseQ])

    const addNotesCall = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(addNotesCall.params.notes[0].fields.Front).toContain('症例訓練')
    expect(addNotesCall.params.notes[0].tags).toContain('症例訓練')
  })
})

// ─────────────────────────────────────────────────────────────
// addAllScenariesToAnki — batch
// ─────────────────────────────────────────────────────────────

describe('addAllScenariesToAnki', () => {
  it('returns added/skipped counts', async () => {
    mockEnsureDeck(true)
    mockFetchResponse([200, 201])

    const s2 = { ...scenarioQ, id: 'sc_test2' }
    const result = await addAllScenariesToAnki([scenarioQ, s2])

    expect(result).toEqual({ added: 2, skipped: 0 })
  })

  it('sends notes with scenario-specific fields', async () => {
    mockEnsureDeck(true)
    mockFetchResponse([200])

    await addAllScenariesToAnki([scenarioQ])

    const addNotesCall = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(addNotesCall.params.notes[0].fields.Front).toContain('シナリオ')
    expect(addNotesCall.params.notes[0].tags).toContain('シナリオ')
  })

  it('all notes use version 6 protocol', async () => {
    mockEnsureDeck(true)
    mockFetchResponse([200])

    await addAllScenariesToAnki([scenarioQ])

    for (const call of fetchMock.mock.calls) {
      const body = JSON.parse(call[1].body)
      expect(body.version).toBe(6)
    }
  })

  it('all requests target localhost:8765', async () => {
    mockEnsureDeck(true)
    mockFetchResponse([200])

    await addAllScenariesToAnki([scenarioQ])

    for (const call of fetchMock.mock.calls) {
      expect(call[0]).toBe('http://localhost:8765')
    }
  })
})
