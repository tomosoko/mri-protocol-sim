import { useState, useMemo } from 'react'
import { quizQuestions, type QuizQuestion } from '../data/quizData'
import { choiceExplanations } from '../data/quizChoiceExplanations'
import { CheckCircle, XCircle, RefreshCw, ChevronRight } from 'lucide-react'
import { addAllQuizToAnki } from '../utils/ankiConnect'

type Category = QuizQuestion['category'] | 'すべて'
type Difficulty = 1 | 2 | 3 | 0

const CATEGORY_COLOR: Record<QuizQuestion['category'], string> = {
  'パラメータ': '#3b82f6',
  'アーチファクト': '#f59e0b',
  '脂肪抑制': '#10b981',
  'SAR/安全': '#ef4444',
  'シーケンス': '#8b5cf6',
  '臨床判断': '#06b6d4',
  '救急・緊急': '#f43f5e',
  '禁忌・安全確認': '#fb923c',
  'MRI物理': '#a3e635',
}

const DIFF_LABEL = ['', '★', '★★', '★★★']
const DIFF_COLOR = ['', '#6b7280', '#f59e0b', '#ef4444']

type AnkiStatus = 'idle' | 'sending' | 'ok' | 'dup' | 'err'

function AnkiButton({ questions }: { questions: QuizQuestion[] }) {
  const [status, setStatus] = useState<AnkiStatus>('idle')
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null)

  async function handleAddAll() {
    setStatus('sending')
    setResult(null)
    try {
      const res = await addAllQuizToAnki(questions)
      setResult(res)
      setStatus(res.added > 0 ? 'ok' : 'dup')
      setTimeout(() => setStatus('idle'), 4000)
    } catch {
      setStatus('err')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  const label = status === 'sending' ? '送信中...'
    : status === 'ok' ? `追加完了 +${result?.added}件`
    : status === 'dup' ? `重複のみ (${result?.skipped}件スキップ)`
    : status === 'err' ? 'Anki未起動?'
    : `全${questions.length}問をAnkiへ`

  const color = status === 'ok' ? '#4ade80'
    : status === 'dup' ? '#fbbf24'
    : status === 'err' ? '#f87171'
    : '#a78bfa'

  const bg = status === 'ok' ? '#052e16'
    : status === 'dup' ? '#2d1f00'
    : status === 'err' ? '#2d1515'
    : '#1e1535'

  const border = status === 'ok' ? '#166534'
    : status === 'dup' ? '#78350f'
    : status === 'err' ? '#7f1d1d'
    : '#5b21b6'

  return (
    <button
      onClick={handleAddAll}
      disabled={status === 'sending'}
      className="w-full py-1.5 rounded text-xs font-semibold transition-all"
      style={{ background: bg, color, border: `1px solid ${border}`, opacity: status === 'sending' ? 0.7 : 1 }}
    >
      {label}
    </button>
  )
}

export function QuizPanel() {
  const [category, setCategory] = useState<Category>('すべて')
  const [difficulty, setDifficulty] = useState<Difficulty>(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [shuffled, setShuffled] = useState<QuizQuestion[]>(() => shuffle(quizQuestions))
  const [finished, setFinished] = useState(false)

  const filtered = useMemo(() => {
    return shuffled.filter(q =>
      (category === 'すべて' || q.category === category) &&
      (difficulty === 0 || q.difficulty === difficulty)
    )
  }, [shuffled, category, difficulty])

  const current = filtered[currentIndex]

  function handleSelect(idx: number) {
    if (selected !== null) return
    setSelected(idx)
    setShowExplanation(true)
    if (idx === current.correct) setScore(s => s + 1)
    setAnswered(a => a + 1)
  }

  function handleNext() {
    if (currentIndex + 1 >= filtered.length) {
      setFinished(true)
    } else {
      setCurrentIndex(i => i + 1)
      setSelected(null)
      setShowExplanation(false)
    }
  }

  function handleReset() {
    setShuffled(shuffle(quizQuestions))
    setCurrentIndex(0)
    setSelected(null)
    setShowExplanation(false)
    setScore(0)
    setAnswered(0)
    setFinished(false)
  }

  function handleFilterChange(newCat: Category, newDiff: Difficulty) {
    setCategory(newCat)
    setDifficulty(newDiff)
    setCurrentIndex(0)
    setSelected(null)
    setShowExplanation(false)
    setScore(0)
    setAnswered(0)
    setFinished(false)
  }

  const categories: Category[] = ['すべて', 'パラメータ', 'アーチファクト', '脂肪抑制', 'SAR/安全', 'シーケンス', '臨床判断']

  if (finished || filtered.length === 0) {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-4 h-full">
        {filtered.length === 0 ? (
          <div className="text-xs" style={{ color: '#6b7280' }}>該当する問題がありません</div>
        ) : (
          <>
            <div className="text-center">
              <div className="text-2xl font-bold mb-1" style={{ color: '#e88b00' }}>
                {score} / {answered}
              </div>
              <div className="text-xs" style={{ color: '#9ca3af' }}>
                正答率 {Math.round((score / answered) * 100)}%
              </div>
              <div className="mt-2 text-xs" style={{ color: score / answered >= 0.8 ? '#4ade80' : score / answered >= 0.6 ? '#fbbf24' : '#f87171' }}>
                {score / answered >= 0.8 ? 'プロ級！' : score / answered >= 0.6 ? 'もう少し！' : '要復習'}
              </div>
            </div>
          </>
        )}
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs"
          style={{ background: '#2a1200', color: '#e88b00', border: '1px solid #7c4700' }}
        >
          <RefreshCw size={11} />
          もう一度
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Filter bar */}
      <div className="shrink-0 px-3 py-2 space-y-1.5" style={{ borderBottom: '1px solid #252525' }}>
        {/* Anki export button */}
        <AnkiButton questions={quizQuestions} />
        {/* Category */}
        <div className="flex flex-wrap gap-1">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => handleFilterChange(c, difficulty)}
              className="px-1.5 py-0.5 rounded text-xs transition-colors"
              style={{
                background: category === c ? (c === 'すべて' ? '#374151' : CATEGORY_COLOR[c as QuizQuestion['category']] + '33') : '#1a1a1a',
                color: category === c ? (c === 'すべて' ? '#e5e7eb' : CATEGORY_COLOR[c as QuizQuestion['category']]) : '#6b7280',
                border: `1px solid ${category === c ? (c === 'すべて' ? '#4b5563' : CATEGORY_COLOR[c as QuizQuestion['category']] + '66') : '#252525'}`,
              }}
            >
              {c}
            </button>
          ))}
        </div>
        {/* Difficulty */}
        <div className="flex gap-1 items-center">
          <span className="text-xs shrink-0" style={{ color: '#4b5563' }}>難易度:</span>
          {([0, 1, 2, 3] as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => handleFilterChange(category, d)}
              className="px-1.5 py-0.5 rounded text-xs transition-colors"
              style={{
                background: difficulty === d ? '#252525' : '#1a1a1a',
                color: d === 0 ? '#9ca3af' : DIFF_COLOR[d],
                border: `1px solid ${difficulty === d ? '#374151' : '#252525'}`,
              }}
            >
              {d === 0 ? 'すべて' : DIFF_LABEL[d]}
            </button>
          ))}
        </div>
        {/* Progress */}
        <div className="flex items-center justify-between">
          <div className="text-xs" style={{ color: '#4b5563' }}>
            {currentIndex + 1} / {filtered.length}問
          </div>
          <div className="text-xs" style={{ color: '#4b5563' }}>
            正解: <span style={{ color: '#4ade80' }}>{score}</span> / {answered}
          </div>
        </div>
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: '#252525' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ background: '#e88b00', width: `${((currentIndex + (selected !== null ? 1 : 0)) / filtered.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Category badge */}
        <div className="flex items-center gap-2">
          <span
            className="px-2 py-0.5 rounded text-xs font-semibold"
            style={{
              background: CATEGORY_COLOR[current.category] + '22',
              color: CATEGORY_COLOR[current.category],
              border: `1px solid ${CATEGORY_COLOR[current.category]}44`,
            }}
          >
            {current.category}
          </span>
          <span className="text-xs" style={{ color: DIFF_COLOR[current.difficulty] }}>
            {DIFF_LABEL[current.difficulty]}
          </span>
        </div>

        {/* Question */}
        <div className="text-sm leading-relaxed" style={{ color: '#e5e7eb' }}>
          {current.question}
        </div>

        {/* Choices */}
        <div className="space-y-1.5">
          {current.choices.map((choice, i) => {
            const isSelected = selected === i
            const isCorrect = i === current.correct
            let bg = '#1a1a1a'
            let borderColor = '#374151'
            let textColor = '#9ca3af'

            if (selected !== null) {
              if (isCorrect) {
                bg = '#052e16'
                borderColor = '#166534'
                textColor = '#4ade80'
              } else if (isSelected && !isCorrect) {
                bg = '#2d1515'
                borderColor = '#7f1d1d'
                textColor = '#fca5a5'
              } else {
                textColor = '#4b5563'
              }
            } else {
              bg = '#1a1a1a'
              borderColor = '#374151'
              textColor = '#9ca3af'
            }

            const choiceExp = choiceExplanations[current.id]?.[i]

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={selected !== null}
                className="w-full text-left px-3 py-2 rounded text-xs transition-all"
                style={{ background: bg, border: `1px solid ${borderColor}`, color: textColor }}
              >
                <div className="flex items-start gap-2">
                  <span className="shrink-0 font-mono">{String.fromCharCode(65 + i)}.</span>
                  <span className="flex-1">
                    <span>{choice}</span>
                    {selected !== null && choiceExp && (
                      <span className="block mt-1" style={{ fontSize: '10px', color: '#9ca3af' }}>
                        {choiceExp}
                      </span>
                    )}
                  </span>
                  {selected !== null && isCorrect && <CheckCircle size={12} className="shrink-0 ml-auto mt-0.5" style={{ color: '#4ade80' }} />}
                  {selected !== null && isSelected && !isCorrect && <XCircle size={12} className="shrink-0 ml-auto mt-0.5" style={{ color: '#f87171' }} />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className="p-3 rounded text-xs leading-relaxed" style={{ background: '#0d1117', border: '1px solid #3a1a00' }}>
            <div className="font-semibold mb-1.5" style={{ color: '#e88b00' }}>総合解説</div>
            <div style={{ color: '#9ca3af' }}>{current.explanation}</div>
          </div>
        )}

        {/* Next button */}
        {selected !== null && (
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded text-xs font-semibold"
            style={{ background: '#2a1200', color: '#e88b00', border: '1px solid #7c4700' }}
          >
            {currentIndex + 1 >= filtered.length ? '結果を見る' : '次の問題'}
            <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
