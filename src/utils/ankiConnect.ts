import type { QuizQuestion } from '../data/quizData'

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
