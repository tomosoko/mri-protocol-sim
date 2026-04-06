import { useState, useMemo } from 'react'
import { scenarios, type Scenario } from '../data/scenarioData'
import { useProtocolStore } from '../store/protocolStore'
import { Stethoscope, CheckCircle, XCircle, ChevronRight, RotateCcw } from 'lucide-react'
import { addAllScenariesToAnki } from '../utils/ankiConnect'

type CategoryFilter = Scenario['category'] | 'すべて'
type DifficultyFilter = 0 | 1 | 2 | 3

const CATEGORY_COLORS: Record<Scenario['category'], string> = {
  '急患':       '#ef4444',
  '小児':       '#3b82f6',
  '閉所恐怖症': '#8b5cf6',
  '金属':       '#f59e0b',
  '体動':       '#06b6d4',
  '呼吸困難':   '#10b981',
  '造影':       '#ec4899',
  'SAR超過':    '#f97316',
  'アーチファクト': '#e88b00',
  '心臓':       '#f87171',
}

const DIFF_LABEL = ['', '★', '★★', '★★★']
const DIFF_COLOR = ['', '#6b7280', '#f59e0b', '#ef4444']

const ALL_CATEGORIES: CategoryFilter[] = [
  'すべて', '急患', '小児', '閉所恐怖症', '金属', '体動', '呼吸困難', '造影', 'SAR超過', 'アーチファクト', '心臓',
]

// ===== Anki送信ボタン =====
type AnkiStatus = 'idle' | 'sending' | 'ok' | 'dup' | 'err'

function ScenarioAnkiButton() {
  const [status, setStatus] = useState<AnkiStatus>('idle')
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null)

  async function handleSend() {
    setStatus('sending')
    setResult(null)
    try {
      const res = await addAllScenariesToAnki(scenarios)
      setResult(res)
      setStatus(res.added > 0 ? 'ok' : 'dup')
      setTimeout(() => setStatus('idle'), 4000)
    } catch {
      setStatus('err')
      setTimeout(() => setStatus('idle'), 4000)
    }
  }

  const label = status === 'sending' ? '送信中...'
    : status === 'ok' ? `追加完了 +${result?.added}シナリオ`
    : status === 'dup' ? `重複のみ (${result?.skipped}件スキップ)`
    : status === 'err' ? 'Anki未起動?'
    : `全${scenarios.length}シナリオをAnkiへ`

  const color = status === 'ok' ? '#4ade80' : status === 'dup' ? '#fbbf24' : status === 'err' ? '#f87171' : '#a78bfa'
  const bg = status === 'ok' ? '#052e16' : status === 'dup' ? '#2d1f00' : status === 'err' ? '#2d1515' : '#1e1535'
  const border = status === 'ok' ? '#166534' : status === 'dup' ? '#78350f' : status === 'err' ? '#7f1d1d' : '#5b21b6'

  return (
    <button
      onClick={handleSend}
      disabled={status === 'sending'}
      className="w-full py-1.5 rounded text-xs font-semibold transition-all"
      style={{ background: bg, color, border: `1px solid ${border}`, opacity: status === 'sending' ? 0.7 : 1 }}
    >
      {label}
    </button>
  )
}

export function ScenarioExercisePanel() {
  const { loadPreset, setHighlightedParams } = useProtocolStore()

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('すべて')
  const [diffFilter, setDiffFilter] = useState<DifficultyFilter>(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)

  const filtered = useMemo(() => {
    return scenarios.filter(s =>
      (categoryFilter === 'すべて' || s.category === categoryFilter) &&
      (diffFilter === 0 || s.difficulty === diffFilter)
    )
  }, [categoryFilter, diffFilter])

  const current = selectedId ? scenarios.find(s => s.id === selectedId) ?? null : null

  function handleSelectScenario(scenario: Scenario) {
    setSelectedId(scenario.id)
    setSelectedOption(null)
    loadPreset(scenario.currentPresetId)
  }

  function handleSelectOption(idx: number) {
    if (selectedOption !== null || !current) return
    setSelectedOption(idx)
    const isCorrect = current.options[idx].isCorrect
    if (isCorrect) setScore(s => s + 1)
    setTotalAnswered(t => t + 1)
  }

  function handleHighlightParams() {
    if (!current?.relatedParams) return
    setHighlightedParams(current.relatedParams)
  }

  function handleNext() {
    if (!current) return
    const idx = filtered.findIndex(s => s.id === current.id)
    const next = filtered[idx + 1]
    if (next) {
      handleSelectScenario(next)
    } else {
      setSelectedId(null)
      setSelectedOption(null)
    }
  }

  function handleReset() {
    setSelectedId(null)
    setSelectedOption(null)
    setScore(0)
    setTotalAnswered(0)
  }

  function handleFilterChange(cat: CategoryFilter, diff: DifficultyFilter) {
    setCategoryFilter(cat)
    setDiffFilter(diff)
    setSelectedId(null)
    setSelectedOption(null)
  }

  const correctOptionIndex = current?.options.findIndex(o => o.isCorrect) ?? -1

  // ─── シナリオ詳細表示 ───────────────────────────────────────
  if (current) {
    return (
      <div className="flex flex-col h-full overflow-hidden" style={{ background: '#141414' }}>
        {/* Header */}
        <div
          className="shrink-0 px-3 py-2 flex items-center justify-between"
          style={{ borderBottom: '1px solid #252525' }}
        >
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setSelectedId(null); setSelectedOption(null) }}
              className="text-xs px-2 py-0.5 rounded"
              style={{ color: '#6b7280', border: '1px solid #252525', background: '#1a1a1a' }}
            >
              ← 一覧
            </button>
            <span
              className="px-1.5 py-0.5 rounded text-xs font-semibold"
              style={{
                background: CATEGORY_COLORS[current.category] + '22',
                color: CATEGORY_COLORS[current.category],
                border: `1px solid ${CATEGORY_COLORS[current.category]}44`,
              }}
            >
              {current.category}
            </span>
            <span className="text-xs" style={{ color: DIFF_COLOR[current.difficulty] }}>
              {DIFF_LABEL[current.difficulty]}
            </span>
          </div>
          {/* Score */}
          <div className="text-xs" style={{ color: '#4b5563' }}>
            <span style={{ color: '#4ade80' }}>{score}</span>
            {' / '}
            {totalAnswered}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Title */}
          <div className="font-semibold text-sm leading-snug" style={{ color: '#e5e7eb' }}>
            {current.title}
          </div>

          {/* Patient info */}
          <div
            className="p-2.5 rounded text-xs leading-relaxed"
            style={{ background: '#1a1a1a', border: '1px solid #252525', color: '#9ca3af' }}
          >
            <div className="flex items-center gap-1 mb-1">
              <Stethoscope size={11} style={{ color: '#e88b00' }} />
              <span className="font-semibold text-xs" style={{ color: '#e88b00' }}>患者情報</span>
            </div>
            {current.patientInfo}
          </div>

          {/* Question */}
          <div className="text-xs leading-relaxed" style={{ color: '#e5e7eb' }}>
            {current.question}
          </div>

          {/* Options */}
          <div className="space-y-1.5">
            {current.options.map((opt, i) => {
              const isSelected = selectedOption === i
              const isCorrect = opt.isCorrect
              let bg = '#1a1a1a'
              let borderColor = '#374151'
              let textColor = '#9ca3af'

              if (selectedOption !== null) {
                if (isCorrect) {
                  bg = '#052e16'
                  borderColor = '#166534'
                  textColor = '#4ade80'
                } else if (isSelected) {
                  bg = '#2d1515'
                  borderColor = '#7f1d1d'
                  textColor = '#fca5a5'
                } else {
                  textColor = '#4b5563'
                }
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelectOption(i)}
                  disabled={selectedOption !== null}
                  className="w-full text-left px-3 py-2 rounded text-xs transition-all"
                  style={{ background: bg, border: `1px solid ${borderColor}`, color: textColor }}
                >
                  <div className="flex items-start gap-2">
                    <span className="shrink-0 font-mono">{String.fromCharCode(65 + i)}.</span>
                    <span className="flex-1">{opt.label}</span>
                    {selectedOption !== null && isCorrect && (
                      <CheckCircle size={12} className="shrink-0 mt-0.5" style={{ color: '#4ade80' }} />
                    )}
                    {selectedOption !== null && isSelected && !isCorrect && (
                      <XCircle size={12} className="shrink-0 mt-0.5" style={{ color: '#f87171' }} />
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Post-answer area */}
          {selectedOption !== null && (
            <>
              {/* Selected option explanation */}
              <div
                className="p-2.5 rounded text-xs leading-relaxed"
                style={{
                  background: current.options[selectedOption].isCorrect ? '#052e16' : '#2d1515',
                  border: `1px solid ${current.options[selectedOption].isCorrect ? '#166534' : '#7f1d1d'}`,
                }}
              >
                <div
                  className="font-semibold mb-1 flex items-center gap-1"
                  style={{ color: current.options[selectedOption].isCorrect ? '#4ade80' : '#f87171' }}
                >
                  {current.options[selectedOption].isCorrect
                    ? <><CheckCircle size={11} /> 正解！</>
                    : <><XCircle size={11} /> 不正解 — 正解は {String.fromCharCode(65 + correctOptionIndex)}</>
                  }
                </div>
                <div style={{ color: '#9ca3af' }}>
                  {current.options[selectedOption].explanation}
                </div>
              </div>

              {/* Detailed explanation */}
              <div
                className="p-2.5 rounded text-xs leading-relaxed"
                style={{ background: '#0e0e0e', border: '1px solid #3a1a00' }}
              >
                <div className="font-semibold mb-1.5" style={{ color: '#e88b00' }}>詳細解説</div>
                <div style={{ color: '#9ca3af' }}>{current.detailedExplanation}</div>
              </div>

              {/* Highlight params button */}
              {current.relatedParams && current.relatedParams.length > 0 && (
                <button
                  onClick={handleHighlightParams}
                  className="w-full py-1.5 rounded text-xs"
                  style={{ background: '#1a1200', color: '#e88b00', border: '1px solid #3a2800' }}
                >
                  関連パラメータをハイライト（{current.relatedParams.join(' / ')}）
                </button>
              )}

              {/* Next button */}
              <button
                onClick={handleNext}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded text-xs font-semibold"
                style={{ background: '#2a1200', color: '#e88b00', border: '1px solid #5c3a00' }}
              >
                {filtered.findIndex(s => s.id === current.id) + 1 >= filtered.length
                  ? '一覧に戻る'
                  : '次のシナリオ'}
                <ChevronRight size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ─── シナリオ一覧表示 ──────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#141414' }}>
      {/* Filter bar */}
      <div className="shrink-0 px-3 py-2 space-y-1.5" style={{ borderBottom: '1px solid #252525' }}>
        {/* Category tabs */}
        <div className="flex flex-wrap gap-1">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleFilterChange(cat, diffFilter)}
              className="px-1.5 py-0.5 rounded text-xs transition-colors"
              style={{
                background: categoryFilter === cat
                  ? (cat === 'すべて' ? '#374151' : CATEGORY_COLORS[cat as Scenario['category']] + '33')
                  : '#1a1a1a',
                color: categoryFilter === cat
                  ? (cat === 'すべて' ? '#e5e7eb' : CATEGORY_COLORS[cat as Scenario['category']])
                  : '#6b7280',
                border: `1px solid ${categoryFilter === cat
                  ? (cat === 'すべて' ? '#4b5563' : CATEGORY_COLORS[cat as Scenario['category']] + '66')
                  : '#252525'}`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Difficulty filter */}
        <div className="flex gap-1 items-center">
          <span className="text-xs shrink-0" style={{ color: '#4b5563' }}>難易度:</span>
          {([0, 1, 2, 3] as DifficultyFilter[]).map(d => (
            <button
              key={d}
              onClick={() => handleFilterChange(categoryFilter, d)}
              className="px-1.5 py-0.5 rounded text-xs transition-colors"
              style={{
                background: diffFilter === d ? '#252525' : '#1a1a1a',
                color: d === 0 ? '#9ca3af' : DIFF_COLOR[d],
                border: `1px solid ${diffFilter === d ? '#374151' : '#252525'}`,
              }}
            >
              {d === 0 ? 'すべて' : DIFF_LABEL[d]}
            </button>
          ))}
        </div>

        {/* Score + reset */}
        <div className="flex items-center justify-between">
          <div className="text-xs" style={{ color: '#4b5563' }}>
            {filtered.length}件のシナリオ
          </div>
          <div className="flex items-center gap-2">
            {totalAnswered > 0 && (
              <div className="text-xs" style={{ color: '#4b5563' }}>
                正解: <span style={{ color: '#4ade80' }}>{score}</span> / {totalAnswered}
              </div>
            )}
            {totalAnswered > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                style={{ color: '#6b7280', border: '1px solid #252525', background: '#1a1a1a' }}
              >
                <RotateCcw size={10} />
                リセット
              </button>
            )}
          </div>
        </div>
        <ScenarioAnkiButton />
      </div>

      {/* Scenario list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs" style={{ color: '#4b5563' }}>
            該当するシナリオがありません
          </div>
        ) : (
          filtered.map(scenario => (
            <button
              key={scenario.id}
              onClick={() => handleSelectScenario(scenario)}
              className="w-full text-left p-3 rounded transition-all"
              style={{
                background: '#1a1a1a',
                border: '1px solid #252525',
              }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = CATEGORY_COLORS[scenario.category] + '55'
                ;(e.currentTarget as HTMLButtonElement).style.background = '#1f1f1f'
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#252525'
                ;(e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a'
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="px-1.5 py-0.5 rounded text-xs font-semibold shrink-0"
                    style={{
                      background: CATEGORY_COLORS[scenario.category] + '22',
                      color: CATEGORY_COLORS[scenario.category],
                      border: `1px solid ${CATEGORY_COLORS[scenario.category]}44`,
                    }}
                  >
                    {scenario.category}
                  </span>
                  <span className="text-xs shrink-0" style={{ color: DIFF_COLOR[scenario.difficulty] }}>
                    {DIFF_LABEL[scenario.difficulty]}
                  </span>
                </div>
                <ChevronRight size={12} className="shrink-0 mt-0.5" style={{ color: '#374151' }} />
              </div>

              <div className="text-xs font-semibold mb-1" style={{ color: '#e5e7eb' }}>
                {scenario.title}
              </div>
              <div className="text-xs leading-relaxed line-clamp-2" style={{ color: '#6b7280' }}>
                {scenario.patientInfo}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
