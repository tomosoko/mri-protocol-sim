import type { QuizQuestion } from '../data/quizData'
import type { CaseQuestion } from '../data/caseTrainingData'
import type { Scenario } from '../data/scenarioData'

const ANKI_CONNECT_URL = 'http://localhost:8765'
const DECK_NAME = 'MRI Protocol Simulator'

async function invoke(action: string, params: unknown = {}) {
  const res = await fetch(ANKI_CONNECT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, version: 6, params }),
  })
  const data = await res.json() as { result: unknown; error: string | null }
  if (data.error) throw new Error(data.error)
  return data.result
}

async function ensureDeck() {
  const decks = await invoke('deckNames') as string[]
  if (!decks.includes(DECK_NAME)) {
    await invoke('createDeck', { deck: DECK_NAME })
  }
}

export function quizToAnkiNote(q: QuizQuestion) {
  const stars = '★'.repeat(q.difficulty) + '☆'.repeat(3 - q.difficulty)
  const choiceLines = q.choices
    .map((c, i) => `${String.fromCharCode(65 + i)}) ${c}`)
    .join('<br>')
  const front = `【${q.category}】${stars}<br>${q.question}<br>${choiceLines}`
  const correctLabel = `${String.fromCharCode(65 + q.correct)}) ${q.choices[q.correct]}`
  const back = `正解: ${correctLabel}<br><br>解説:<br>${q.explanation}`
  const tags = ['MRI', q.category.replace('/', '-'), `難易度${q.difficulty}`]
  return { front, back, tags }
}

export async function addQuizToAnki(q: QuizQuestion): Promise<void> {
  await ensureDeck()
  const { front, back, tags } = quizToAnkiNote(q)
  await invoke('addNote', {
    note: {
      deckName: DECK_NAME,
      modelName: 'Basic',
      fields: { Front: front, Back: back },
      options: { allowDuplicate: false, duplicateScope: 'deck' },
      tags,
    },
  })
}

export function caseToAnkiNote(c: CaseQuestion) {
  const stars = '★'.repeat(c.difficulty) + '☆'.repeat(3 - c.difficulty)
  const front = [
    `【症例訓練】${stars} — ${c.bodyRegion}`,
    `${c.patientAge}歳 ${c.patientSex === 'M' ? '男性' : '女性'}`,
    `主訴: ${c.chiefComplaint}`,
    `病歴: ${c.clinicalHistory}`,
    `依頼: ${c.referralInfo}`,
    '',
    '→ 最適なプロトコルは？',
  ].join('<br>')

  const correctChoices = c.choices.filter(ch => ch.isCorrect)
  const acceptableChoices = c.choices.filter(ch => ch.isAcceptable)
  const backLines: string[] = []
  if (correctChoices.length > 0) {
    backLines.push('<b style="color:#4ade80">正解:</b>')
    correctChoices.forEach(ch => backLines.push(`✓ ${ch.label}<br><small>${ch.reason}</small>`))
  }
  if (acceptableChoices.length > 0) {
    backLines.push('<b style="color:#fbbf24">許容:</b>')
    acceptableChoices.forEach(ch => backLines.push(`△ ${ch.label}<br><small>${ch.reason}</small>`))
  }
  backLines.push('', `<b>解説:</b><br>${c.explanation}`)
  if (c.commonMistakes.length > 0) {
    backLines.push('', '<b style="color:#f87171">よくある間違い:</b>')
    c.commonMistakes.forEach(m => backLines.push(`• ${m}`))
  }

  const tags = ['MRI', '症例訓練', c.bodyRegion, `難易度${c.difficulty}`]
  return { front, back: backLines.join('<br>'), tags }
}

export async function addAllCasesToAnki(cases: CaseQuestion[]): Promise<{ added: number; skipped: number }> {
  await ensureDeck()
  const notes = cases.map(c => {
    const { front, back, tags } = caseToAnkiNote(c)
    return {
      deckName: DECK_NAME,
      modelName: 'Basic',
      fields: { Front: front, Back: back },
      options: { allowDuplicate: false, duplicateScope: 'deck' },
      tags,
    }
  })
  const results = await invoke('addNotes', { notes }) as (number | null)[]
  const added = results.filter(r => r !== null).length
  const skipped = results.filter(r => r === null).length
  return { added, skipped }
}

export function scenarioToAnkiNote(s: Scenario) {
  const stars = '★'.repeat(s.difficulty) + '☆'.repeat(3 - s.difficulty)
  const front = [
    `【シナリオ】${s.category} ${stars}`,
    `${s.patientInfo}`,
    '',
    s.question,
  ].join('<br>')

  const correctOpts = s.options.filter(o => o.isCorrect)
  const backLines: string[] = []
  correctOpts.forEach(o => backLines.push(`<b style="color:#4ade80">✓ ${o.label}</b>`, o.explanation))
  s.options.filter(o => !o.isCorrect).forEach(o => backLines.push(`<span style="color:#6b7280">✗ ${o.label}</span>`, `<small>${o.explanation}</small>`))
  backLines.push('', `<b>詳細解説:</b><br>${s.detailedExplanation}`)
  if (s.relatedParams && s.relatedParams.length > 0)
    backLines.push('', `<small>関連パラメータ: ${s.relatedParams.join(' / ')}</small>`)

  const tags = ['MRI', 'シナリオ', s.category, `難易度${s.difficulty}`]
  return { front, back: backLines.join('<br>'), tags }
}

export async function addAllScenariesToAnki(scenarios: Scenario[]): Promise<{ added: number; skipped: number }> {
  await ensureDeck()
  const notes = scenarios.map(s => {
    const { front, back, tags } = scenarioToAnkiNote(s)
    return {
      deckName: DECK_NAME,
      modelName: 'Basic',
      fields: { Front: front, Back: back },
      options: { allowDuplicate: false, duplicateScope: 'deck' },
      tags,
    }
  })
  const results = await invoke('addNotes', { notes }) as (number | null)[]
  const added = results.filter(r => r !== null).length
  const skipped = results.filter(r => r === null).length
  return { added, skipped }
}

export async function addAllQuizToAnki(questions: QuizQuestion[]): Promise<{ added: number; skipped: number }> {
  await ensureDeck()
  const notes = questions.map(q => {
    const { front, back, tags } = quizToAnkiNote(q)
    return {
      deckName: DECK_NAME,
      modelName: 'Basic',
      fields: { Front: front, Back: back },
      options: { allowDuplicate: false, duplicateScope: 'deck' },
      tags,
    }
  })
  const results = await invoke('addNotes', { notes }) as (number | null)[]
  const added = results.filter(r => r !== null).length
  const skipped = results.filter(r => r === null).length
  return { added, skipped }
}
