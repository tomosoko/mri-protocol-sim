import { useState } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { calcSNR, calcSARLevel, calcScanTime, calcT2Blur, chemShift } from '../store/calculators'
import type { ProtocolParams } from '../data/presets'
import { TrendingUp, TrendingDown, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import { type OptGoal, type Suggestion, GOALS, computeSuggestions } from './optimizer/protocolOptimizerUtils'

function DeltaBadge({ value, lowerIsBetter, label }: { value: number; lowerIsBetter: boolean; label: string }) {
  if (value === 0) return null
  const improved = lowerIsBetter ? value < 0 : value > 0
  const color = improved ? '#4ade80' : '#f87171'
  const sign = value > 0 ? '+' : ''
  return (
    <span className="flex items-center gap-0.5 px-1 py-0.5 rounded" style={{ background: improved ? '#0d2010' : '#1a0505', color, fontSize: '8px', border: `1px solid ${improved ? '#166534' : '#7f1d1d'}` }}>
      {improved ? <TrendingUp size={6} /> : <TrendingDown size={6} />}
      {label}{sign}{value}%
    </span>
  )
}

export function ProtocolOptimizerPanel() {
  const { params, setParam } = useProtocolStore()
  const [goal, setGoal] = useState<OptGoal>('balanced')
  const [applied, setApplied] = useState<Set<string>>(new Set())
  const [batchApplied, setBatchApplied] = useState(false)

  const suggestions = computeSuggestions(params, goal)

  const handleApply = (s: Suggestion) => {
    Object.entries(s.apply).forEach(([key, value]) => {
      setParam(key as keyof ProtocolParams, value as ProtocolParams[keyof ProtocolParams])
    })
    setApplied(prev => new Set(prev).add(s.id))
    setTimeout(() => setApplied(prev => {
      const next = new Set(prev); next.delete(s.id); return next
    }), 2000)
  }

  const handleApplyTop3 = () => {
    const top3 = suggestions.slice(0, 3)
    const allChanges: Partial<ProtocolParams> = {}
    top3.forEach(s => Object.assign(allChanges, s.apply))
    Object.entries(allChanges).forEach(([key, value]) => {
      setParam(key as keyof ProtocolParams, value as ProtocolParams[keyof ProtocolParams])
    })
    setBatchApplied(true)
    setTimeout(() => setBatchApplied(false), 2500)
  }

  const goalCfg = GOALS.find(g => g.id === goal)!

  const snr = calcSNR(params)
  const sar = calcSARLevel(params)
  const scanTime = calcScanTime(params)
  const blur = calcT2Blur(params)
  const cs = chemShift(params)

  const fmtTime = (s: number) => {
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60); const sec = s % 60
    return sec === 0 ? `${m}min` : `${m}m${sec}s`
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#0a0a0a', color: '#c8ccd6' }}>
      {/* Header */}
      <div className="px-3 py-2 shrink-0" style={{ background: '#111', borderBottom: '1px solid #252525' }}>
        <div className="flex items-center gap-1.5 mb-1">
          <Zap size={11} style={{ color: '#fbbf24' }} />
          <span className="font-semibold" style={{ color: '#fbbf24', fontSize: '11px' }}>Protocol Optimizer</span>
        </div>
        <div style={{ color: '#4b5563', fontSize: '9px' }}>目標を選択してパラメータ改善案を取得</div>
      </div>

      {/* Current metrics summary */}
      <div className="px-2 py-1.5 shrink-0 grid grid-cols-5 gap-1" style={{ borderBottom: '1px solid #1a1a1a' }}>
        {[
          { label: 'SNR', value: String(snr), color: snr > 80 ? '#34d399' : snr > 40 ? '#fbbf24' : '#f87171' },
          { label: 'SAR', value: `${sar}%`, color: sar < 40 ? '#34d399' : sar < 70 ? '#fbbf24' : '#f87171' },
          { label: 'Time', value: fmtTime(scanTime), color: '#e2e8f0' },
          { label: 'Blur', value: blur.toFixed(2), color: blur > 0.7 ? '#34d399' : blur > 0.4 ? '#fbbf24' : '#f87171' },
          { label: 'CS', value: `${cs}px`, color: cs < 1.5 ? '#34d399' : cs < 3 ? '#fbbf24' : '#f87171' },
        ].map(m => (
          <div key={m.label} className="flex flex-col items-center py-1 rounded" style={{ background: '#1a1a1a' }}>
            <span style={{ color: '#4b5563', fontSize: '7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{m.label}</span>
            <span className="font-mono font-bold" style={{ color: m.color, fontSize: '9px' }}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* Goal selector */}
      <div className="p-2 shrink-0" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <div style={{ color: '#4b5563', fontSize: '8px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>最適化目標</div>
        <div className="grid grid-cols-3 gap-1">
          {GOALS.map(g => (
            <button
              key={g.id}
              onClick={() => setGoal(g.id)}
              className="py-1 rounded text-center transition-colors"
              style={{
                background: goal === g.id ? g.bg : 'transparent',
                color: goal === g.id ? g.color : '#4b5563',
                border: `1px solid ${goal === g.id ? g.border : '#252525'}`,
                fontSize: '9px',
                fontWeight: goal === g.id ? 600 : 400,
              }}
            >
              {g.icon} {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions header + batch apply */}
      {suggestions.length >= 2 && (
        <div className="px-2 py-1 shrink-0 flex items-center justify-between" style={{ borderBottom: '1px solid #1a1a1a' }}>
          <span style={{ color: '#4b5563', fontSize: '8px' }}>{suggestions.length}件の改善案</span>
          <button
            onClick={handleApplyTop3}
            className="flex items-center gap-1 px-2 py-0.5 rounded transition-colors"
            style={{
              background: batchApplied ? '#0d2010' : goalCfg.bg,
              color: batchApplied ? '#4ade80' : goalCfg.color,
              border: `1px solid ${batchApplied ? '#166534' : goalCfg.border}`,
              fontSize: '8px',
              fontWeight: 600,
            }}
          >
            {batchApplied ? <CheckCircle size={8} /> : <Zap size={8} />}
            {batchApplied ? '✓ 適用完了' : '上位3件を一括適用'}
          </button>
        </div>
      )}

      {/* Suggestions list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <CheckCircle size={20} style={{ color: '#34d399' }} />
            <div style={{ color: '#34d399', fontSize: '10px' }}>この目標に対して改善案がありません</div>
            <div style={{ color: '#374151', fontSize: '9px' }}>プロトコルは既にこの目標に対して最適化されています</div>
          </div>
        ) : (
          suggestions.map((s, i) => (
            <div key={s.id} className="rounded overflow-hidden" style={{ border: `1px solid ${i === 0 ? goalCfg.border : '#252525'}`, background: i === 0 ? goalCfg.bg : '#141414' }}>
              {/* Rank badge + title */}
              <div className="px-2 py-1.5 flex items-center gap-2">
                <span className="shrink-0 w-4 h-4 rounded-full flex items-center justify-center font-bold" style={{ background: i === 0 ? goalCfg.border : '#252525', color: i === 0 ? goalCfg.color : '#4b5563', fontSize: '8px' }}>
                  {i + 1}
                </span>
                <span className="flex-1 font-semibold" style={{ color: '#e2e8f0', fontSize: '10px' }}>{s.title}</span>
                <button
                  onClick={() => handleApply(s)}
                  className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded transition-colors"
                  style={{
                    background: applied.has(s.id) ? '#0d2010' : '#1e1e1e',
                    color: applied.has(s.id) ? '#4ade80' : goalCfg.color,
                    border: `1px solid ${applied.has(s.id) ? '#166534' : goalCfg.border}`,
                    fontSize: '8px',
                  }}
                >
                  {applied.has(s.id) ? <CheckCircle size={8} /> : <Zap size={8} />}
                  {applied.has(s.id) ? '適用済' : '適用'}
                </button>
              </div>

              {/* Detail */}
              <div className="px-2 pb-1.5">
                <p style={{ color: '#6b7280', fontSize: '9px', lineHeight: '1.4', marginBottom: '4px' }}>{s.detail}</p>

                {/* Delta badges */}
                <div className="flex flex-wrap gap-1 mb-1">
                  {s.snrDelta !== 0 && <DeltaBadge value={s.snrDelta} lowerIsBetter={false} label="SNR" />}
                  {s.sarDelta !== 0 && <DeltaBadge value={s.sarDelta} lowerIsBetter={true} label="SAR" />}
                  {s.timeDelta !== 0 && <DeltaBadge value={s.timeDelta} lowerIsBetter={true} label="Time" />}
                  {s.blurDelta !== 0 && <DeltaBadge value={s.blurDelta} lowerIsBetter={false} label="Blur" />}
                  {s.csDelta !== 0 && <DeltaBadge value={s.csDelta} lowerIsBetter={true} label="CS" />}
                </div>

                {/* Tradeoff warning */}
                {s.tradeoff && (
                  <div className="flex items-center gap-1" style={{ color: '#6b7280', fontSize: '8px' }}>
                    <AlertCircle size={8} style={{ color: '#fbbf24', flexShrink: 0 }} />
                    トレードオフ: {s.tradeoff}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer note */}
      <div className="px-3 py-2 shrink-0" style={{ borderTop: '1px solid #1a1a1a', background: '#0a0a0a' }}>
        <div style={{ color: '#374151', fontSize: '8px', lineHeight: '1.4' }}>
          ΔSNRはBloch方程式近似値。臨床適用前に専門家の確認を推奨します。
        </div>
      </div>
    </div>
  )
}
