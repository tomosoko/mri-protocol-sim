import { useState, useMemo } from 'react'
import { FileHeart, CheckCircle, AlertCircle, XCircle, ChevronLeft } from 'lucide-react'
import { caseQuestions, type CaseQuestion, type CaseChoice } from '../data/caseTrainingData'
import { useProtocolStore } from '../store/protocolStore'

type DifficultyFilter = 0 | 1 | 2 | 3

const DIFF_LABEL = ['すべて', '★', '★★', '★★★']
const DIFF_COLOR = ['#6b7280', '#6b7280', '#f59e0b', '#ef4444']
const DIFF_BG = ['#1a1a1a', '#1f2937', '#2d1d00', '#2d0000']

function DiffStars({ difficulty }: { difficulty: 1 | 2 | 3 }) {
  return (
    <span style={{ color: DIFF_COLOR[difficulty], fontSize: '10px' }}>
      {'★'.repeat(difficulty)}{'☆'.repeat(3 - difficulty)}
    </span>
  )
}

function ChoiceIcon({ choice, selected }: { choice: CaseChoice; selected: boolean }) {
  if (!selected) return null
  if (choice.isCorrect) return <CheckCircle size={13} style={{ color: '#4ade80', flexShrink: 0 }} />
  if (choice.isAcceptable) return <AlertCircle size={13} style={{ color: '#fbbf24', flexShrink: 0 }} />
  return <XCircle size={13} style={{ color: '#f87171', flexShrink: 0 }} />
}

function choiceStyle(choice: CaseChoice, answered: boolean, selected: boolean): React.CSSProperties {
  if (!answered) {
    return {
      background: '#1e1e1e',
      border: '1px solid #2d2d2d',
      color: '#9ca3af',
    }
  }
  if (selected) {
    if (choice.isCorrect) return { background: '#052e16', border: '1px solid #166534', color: '#4ade80' }
    if (choice.isAcceptable) return { background: '#2d1f00', border: '1px solid #78350f', color: '#fbbf24' }
    return { background: '#2d1515', border: '1px solid #7f1d1d', color: '#fca5a5' }
  }
  if (choice.isCorrect) return { background: '#052e16', border: '1px solid #166534', color: '#4ade80' }
  if (choice.isAcceptable) return { background: '#1a1300', border: '1px solid #422006', color: '#92400e' }
  return { background: '#1a1a1a', border: '1px solid #252525', color: '#4b5563' }
}

// ===== 一覧ビュー =====
function CaseList({
  onSelect,
  score,
  totalAnswered,
}: {
  onSelect: (q: CaseQuestion) => void
  score: number
  totalAnswered: number
}) {
  const [diffFilter, setDiffFilter] = useState<DifficultyFilter>(0)

  const filtered = useMemo(() => {
    return caseQuestions.filter(q => diffFilter === 0 || q.difficulty === diffFilter)
  }, [diffFilter])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ヘッダー */}
      <div
        className="shrink-0 px-3 py-2 space-y-2"
        style={{ borderBottom: '1px solid #252525' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <FileHeart size={13} style={{ color: '#e88b00' }} />
            <span className="text-xs font-semibold" style={{ color: '#e88b00' }}>症例訓練</span>
          </div>
          {totalAnswered > 0 && (
            <span className="text-xs font-mono" style={{ color: '#e88b00' }}>
              {score}/{totalAnswered}
            </span>
          )}
        </div>
        {/* 難易度フィルター */}
        <div className="flex gap-1">
          {([0, 1, 2, 3] as DifficultyFilter[]).map(d => (
            <button
              key={d}
              onClick={() => setDiffFilter(d)}
              className="flex-1 py-0.5 rounded text-xs transition-colors"
              style={{
                background: diffFilter === d ? DIFF_BG[d] : '#1a1a1a',
                color: diffFilter === d ? (d === 0 ? '#e5e7eb' : DIFF_COLOR[d]) : '#4b5563',
                border: `1px solid ${diffFilter === d ? (d === 0 ? '#374151' : DIFF_COLOR[d] + '55') : '#252525'}`,
              }}
            >
              {DIFF_LABEL[d]}
            </button>
          ))}
        </div>
        <div className="text-xs" style={{ color: '#4b5563' }}>
          {filtered.length}症例
        </div>
      </div>

      {/* 症例カード一覧 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.map(q => (
          <button
            key={q.id}
            onClick={() => onSelect(q)}
            className="w-full text-left rounded p-2.5 transition-colors"
            style={{ background: '#1a1a1a', border: '1px solid #252525' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#3a2500'
              ;(e.currentTarget as HTMLButtonElement).style.background = '#1f1a14'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#252525'
              ;(e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a'
            }}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: '#1f1a14',
                      color: '#e88b00',
                      border: '1px solid #3a2500',
                      fontSize: '10px',
                    }}
                  >
                    {q.bodyRegion}
                  </span>
                  <DiffStars difficulty={q.difficulty} />
                </div>
                <div className="text-xs font-medium leading-tight" style={{ color: '#e5e7eb' }}>
                  {q.patientAge}歳{q.patientSex === 'M' ? '男性' : '女性'}
                </div>
                <div className="text-xs leading-tight" style={{ color: '#6b7280' }}>
                  {q.chiefComplaint}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ===== メインコンポーネント =====
export function CaseTrainingPanel() {
  const [selectedQuestion, setSelectedQuestion] = useState<CaseQuestion | null>(null)
  const [score, setScore] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)

  function handleSelect(q: CaseQuestion) {
    setSelectedQuestion(q)
  }

  function handleBack() {
    setSelectedQuestion(null)
  }

  // スコア更新は詳細ビューで回答が完了した時点で呼ばれる
  // シンプルに「詳細ビューへ遷移するたびにtotalAnswered+1」ではなく
  // 詳細ビューのhandleSelectがトリガーするためラッパーで処理
  function handleSelectWithScore(q: CaseQuestion) {
    handleSelect(q)
  }

  // 詳細ビューから一覧に戻る時、スコア更新を受け取る
  function handleAnswered(isCorrect: boolean) {
    setTotalAnswered(t => t + 1)
    if (isCorrect) setScore(s => s + 1)
  }

  if (selectedQuestion) {
    return (
      <CaseDetailWrapper
        question={selectedQuestion}
        onBack={handleBack}
        score={score}
        totalAnswered={totalAnswered}
        onAnswered={handleAnswered}
      />
    )
  }

  return (
    <CaseList
      onSelect={handleSelectWithScore}
      score={score}
      totalAnswered={totalAnswered}
    />
  )
}

// 詳細ビューにスコアコールバックを追加したラッパー
function CaseDetailWrapper({
  question,
  onBack,
  score,
  totalAnswered,
  onAnswered,
}: {
  question: CaseQuestion
  onBack: () => void
  score: number
  totalAnswered: number
  onAnswered: (isCorrect: boolean) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reported, setReported] = useState(false)
  const loadPreset = useProtocolStore(s => s.loadPreset)

  const answered = selectedId !== null
  const selectedChoice = answered ? question.choices.find(c => c.protocolId === selectedId) ?? null : null

  function handleSelect(protocolId: string) {
    if (answered) return
    setSelectedId(protocolId)
    const choice = question.choices.find(c => c.protocolId === protocolId)
    if (!reported) {
      setReported(true)
      onAnswered(choice?.isCorrect ?? false)
    }
    const correct = question.choices.find(c => c.isCorrect)
    if (correct) loadPreset(correct.protocolId)
  }

  const isCorrectAnswer = selectedChoice?.isCorrect ?? false
  const isAcceptableAnswer = !isCorrectAnswer && (selectedChoice?.isAcceptable ?? false)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ヘッダー */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid #252525' }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-xs rounded px-2 py-1 transition-colors"
          style={{ background: '#1e1e1e', color: '#9ca3af', border: '1px solid #2d2d2d' }}
        >
          <ChevronLeft size={11} />
          一覧
        </button>
        <DiffStars difficulty={question.difficulty} />
        <span className="text-xs ml-auto" style={{ color: '#4b5563' }}>
          {question.bodyRegion}
        </span>
      </div>

      {/* スクロールエリア */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* スコア */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: '#4b5563' }}>セッション正解</span>
          <span className="text-xs font-mono" style={{ color: '#e88b00' }}>
            {score} / {totalAnswered}
          </span>
        </div>

        {/* 患者情報カード */}
        <div
          className="rounded p-3 space-y-2"
          style={{ background: '#0d1117', border: '1px solid #1a2332' }}
        >
          <div className="flex items-center gap-2 mb-1">
            <FileHeart size={13} style={{ color: '#e88b00' }} />
            <span className="text-xs font-semibold" style={{ color: '#e88b00' }}>患者情報</span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <div style={{ color: '#6b7280' }}>年齢・性別</div>
            <div style={{ color: '#e5e7eb' }}>
              {question.patientAge}歳・{question.patientSex === 'M' ? '男性' : '女性'}
            </div>
            <div style={{ color: '#6b7280' }}>主訴</div>
            <div style={{ color: '#e5e7eb' }}>{question.chiefComplaint}</div>
          </div>
          <div className="space-y-1 text-xs">
            <div style={{ color: '#6b7280' }}>臨床経過</div>
            <div className="leading-relaxed" style={{ color: '#d1d5db' }}>{question.clinicalHistory}</div>
            <div style={{ color: '#6b7280' }}>紹介情報</div>
            <div className="leading-relaxed" style={{ color: '#d1d5db' }}>{question.referralInfo}</div>
          </div>
        </div>

        {/* 問い */}
        <div className="text-xs font-semibold" style={{ color: '#e5e7eb' }}>
          最適なMRIプロトコルを選択してください
        </div>

        {/* 選択肢 */}
        <div className="space-y-2">
          {question.choices.map((choice) => {
            const isSelected = selectedId === choice.protocolId
            return (
              <div key={choice.protocolId} className="space-y-1">
                <button
                  onClick={() => handleSelect(choice.protocolId)}
                  disabled={answered}
                  className="w-full text-left rounded px-3 py-2 text-xs transition-all"
                  style={choiceStyle(choice, answered, isSelected)}
                >
                  <div className="flex items-center gap-2">
                    {answered && (
                      <ChoiceIcon choice={choice} selected={answered} />
                    )}
                    <span className="flex-1">{choice.label}</span>
                    {answered && choice.isCorrect && (
                      <span className="text-xs" style={{ color: '#4ade80' }}>正解</span>
                    )}
                    {answered && !choice.isCorrect && choice.isAcceptable && isSelected && (
                      <span className="text-xs" style={{ color: '#fbbf24' }}>許容</span>
                    )}
                    {answered && !choice.isCorrect && !choice.isAcceptable && isSelected && (
                      <span className="text-xs" style={{ color: '#ef4444' }}>不正解</span>
                    )}
                  </div>
                </button>
                {answered && (
                  <div
                    className="text-xs leading-relaxed px-2 py-1"
                    style={{
                      color: choice.isCorrect ? '#4ade80' : choice.isAcceptable ? '#fbbf24' : '#4b5563',
                    }}
                  >
                    {choice.reason}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 回答結果バナー */}
        {answered && (
          <div
            className="rounded px-3 py-2 text-xs font-semibold text-center"
            style={{
              background: isCorrectAnswer ? '#052e16' : isAcceptableAnswer ? '#2d1f00' : '#2d1515',
              border: `1px solid ${isCorrectAnswer ? '#166534' : isAcceptableAnswer ? '#78350f' : '#7f1d1d'}`,
              color: isCorrectAnswer ? '#4ade80' : isAcceptableAnswer ? '#fbbf24' : '#f87171',
            }}
          >
            {isCorrectAnswer ? '正解！' : isAcceptableAnswer ? '許容できる選択肢' : '不正解'}
          </div>
        )}

        {/* 解説 */}
        {answered && (
          <div
            className="rounded p-3 space-y-2"
            style={{ background: '#0d1117', border: '1px solid #3a1a00' }}
          >
            <div className="text-xs font-semibold" style={{ color: '#e88b00' }}>解説</div>
            <div className="text-xs leading-relaxed" style={{ color: '#9ca3af' }}>
              {question.explanation}
            </div>
          </div>
        )}

        {/* よくある間違い */}
        {answered && question.commonMistakes.length > 0 && (
          <div
            className="rounded p-3 space-y-2"
            style={{ background: '#130d0d', border: '1px solid #3b1c1c' }}
          >
            <div className="text-xs font-semibold" style={{ color: '#f87171' }}>よくある間違い</div>
            <ul className="space-y-1">
              {question.commonMistakes.map((m, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs" style={{ color: '#9ca3af' }}>
                  <span style={{ color: '#ef4444', flexShrink: 0 }}>•</span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* プロトコルロード通知 */}
        {answered && (
          <div className="text-xs text-center pb-2" style={{ color: '#4b5563' }}>
            正解プロトコルをメインパネルにロードしました
          </div>
        )}
      </div>
    </div>
  )
}
