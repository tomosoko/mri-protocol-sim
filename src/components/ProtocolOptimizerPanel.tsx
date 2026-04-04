import { useState } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { calcSNR, calcSARLevel, calcScanTime, calcT2Blur, chemShift } from '../store/calculators'
import type { ProtocolParams } from '../data/presets'
import { TrendingUp, TrendingDown, Zap, CheckCircle, AlertCircle } from 'lucide-react'

type OptGoal = 'snr' | 'sar' | 'time' | 't2blur' | 'chemshift' | 'balanced'

interface Suggestion {
  id: string
  title: string
  detail: string
  apply: Partial<ProtocolParams>
  snrDelta: number
  sarDelta: number
  timeDelta: number
  blurDelta: number
  csDelta: number
  tradeoff?: string
}

function pct(a: number, b: number): number {
  if (b === 0) return 0
  return Math.round((a - b) / b * 100)
}

function computeSuggestions(params: ProtocolParams, goal: OptGoal): Suggestion[] {
  const base = {
    snr: calcSNR(params),
    sar: calcSARLevel(params),
    time: calcScanTime(params),
    blur: calcT2Blur(params),
    cs: chemShift(params),
  }

  const mk = (id: string, title: string, detail: string, apply: Partial<ProtocolParams>, tradeoff?: string): Suggestion => {
    const p2 = { ...params, ...apply }
    return {
      id, title, detail, apply, tradeoff,
      snrDelta: pct(calcSNR(p2), base.snr),
      sarDelta: pct(calcSARLevel(p2), base.sar),
      timeDelta: pct(calcScanTime(p2), base.time),
      blurDelta: pct(calcT2Blur(p2), base.blur),
      csDelta: pct(chemShift(p2), base.cs),
    }
  }

  const all: Suggestion[] = []

  // ── SNR向上 ──────────────────────────────────────────────────────────────
  if (params.averages < 6) {
    all.push(mk('avg_up',
      `加算 ${params.averages}回 → ${params.averages + 1}回`,
      'NEXを1増やすごとにSNRが√NEX倍に向上します。スキャン時間も比例して増加します。',
      { averages: params.averages + 1 },
      'スキャン時間+100%'
    ))
  }

  if (params.ipatMode !== 'Off' && params.ipatFactor >= 2) {
    all.push(mk('ipat_reduce',
      `iPAT係数 ×${params.ipatFactor} → ×${params.ipatFactor - 1}`,
      'g-factorノイズが低下しSNRが改善します。スキャン時間は増加します。',
      { ipatFactor: params.ipatFactor - 1 },
      'スキャン時間+25~50%'
    ))
  }

  if (params.bandwidth > 250) {
    const bw = Math.max(130, Math.round(params.bandwidth * 0.65))
    all.push(mk('bw_down',
      `帯域幅 ${params.bandwidth} → ${bw} Hz/px`,
      '受信帯域幅を狭めることで熱雑音が減少しSNRが向上します。ただし化学シフトと最小TEが増加します。',
      { bandwidth: bw },
      '化学シフト増大・最小TE延長'
    ))
  }

  if (params.sliceThickness < 5) {
    all.push(mk('slice_thick',
      `スライス厚 ${params.sliceThickness}mm → ${params.sliceThickness + 1}mm`,
      'ボクセル体積が増加しSNRが比例向上します。スライス方向の空間分解能は低下します。',
      { sliceThickness: params.sliceThickness + 1 },
      'z方向分解能低下'
    ))
  }

  // ── SAR低減 ──────────────────────────────────────────────────────────────
  if (params.mt) {
    all.push(mk('mt_off',
      'MT (磁化移動) をオフ',
      'MTパルスはRF電力を約20%増加させます。造影効果が不要であればオフにできます。',
      { mt: false },
      'MT造影効果なし'
    ))
  }

  if (params.fatSat === 'SPAIR') {
    all.push(mk('spair_chess',
      '脂肪抑制 SPAIR → CHESS',
      'CHESSはSPAIRよりRF電力が低く、SAR低減に有効です。均一性はやや低下します。',
      { fatSat: 'CHESS' },
      '脂肪抑制の均一性低下'
    ))
  }

  if (params.fatSat === 'STIR') {
    all.push(mk('stir_none',
      '脂肪抑制 STIR をオフ',
      'STIRは反転回復パルスによりSARが高くなります。脂肪抑制が不要なら解除を検討します。',
      { fatSat: 'None', TI: 0 },
      '脂肪抑制なし・TI削除'
    ))
  }

  if (params.turboFactor > 20) {
    const etl = Math.max(10, Math.round(params.turboFactor * 0.6))
    all.push(mk('etl_down_sar',
      `ETL ${params.turboFactor} → ${etl}`,
      'ETLを下げるとエコートレイン中のRFパルス数が減りSARが低下します。スキャン時間は増加します。',
      { turboFactor: etl },
      'スキャン時間増加'
    ))
  }

  if (params.flipAngle > 130) {
    all.push(mk('fa_down_sar',
      `FA ${params.flipAngle}° → 120°`,
      'フリップ角はSARに二乗で効きます。わずかな低減でも大きなSAR改善になります。',
      { flipAngle: 120 },
      'SNRとコントラストへの影響あり'
    ))
  }

  // ── スキャン時間短縮 ──────────────────────────────────────────────────────
  if (params.ipatMode === 'Off') {
    all.push(mk('ipat_on',
      'iPAT GRAPPA ×2 を適用',
      'iPAT×2でスキャン時間を約50%短縮できます。g-factorノイズによるSNR低下が伴います。',
      { ipatMode: 'GRAPPA', ipatFactor: 2 },
      'SNR約30%低下・g-factorノイズ'
    ))
  }

  if (params.partialFourier === 'Off') {
    all.push(mk('pf_6_8',
      'Partial Fourier 6/8 を適用',
      'k空間の75%収集によりスキャン時間を約25%短縮します。SNRと分解能のわずかな低下があります。',
      { partialFourier: '6/8' },
      'SNRと分解能のわずかな低下'
    ))
  }

  if (params.averages > 1) {
    all.push(mk('avg_down',
      `加算回数 ${params.averages} → ${params.averages - 1}`,
      '加算を1回減らすことでスキャン時間を比例短縮します。SNRも√NEXに従い低下します。',
      { averages: params.averages - 1 },
      `SNR約${Math.round((1 - Math.sqrt((params.averages - 1) / params.averages)) * 100)}%低下`
    ))
  }

  if (params.turboFactor < 20 && params.turboFactor > 2) {
    const etl = Math.min(30, params.turboFactor + 4)
    all.push(mk('etl_up_time',
      `ETL ${params.turboFactor} → ${etl}`,
      'ETLを増やすと1TRで収集できるk空間ラインが増え、スキャン時間が短縮されます。T2ブラーが増加します。',
      { turboFactor: etl },
      'T2ブラー増加・SAR増加'
    ))
  }

  // ── T2ブラー改善 ──────────────────────────────────────────────────────────
  if (params.turboFactor > 8) {
    const etl = Math.max(4, Math.round(params.turboFactor / 2))
    all.push(mk('etl_down_blur',
      `ETL ${params.turboFactor} → ${etl} (T2ブラー改善)`,
      'ETLを半分にするとエコートレイン内のT2減衰幅が縮小しブラーが改善します。スキャン時間は増加します。',
      { turboFactor: etl },
      'スキャン時間約2倍'
    ))
  }

  if (params.echoSpacing > 4.0) {
    const es = Math.max(2.5, params.echoSpacing - 1.5)
    all.push(mk('es_down',
      `Echo Spacing ${params.echoSpacing}ms → ${es}ms`,
      'エコー間隔を短くするとエコートレイン全体の持続時間が縮小しT2ブラーが改善します。',
      { echoSpacing: es },
      '最小TE制約に注意'
    ))
  }

  if (params.partialFourier !== 'Off') {
    all.push(mk('pf_off_blur',
      'Partial Fourier → Off (T2ブラー改善)',
      'Full Fourier収集によりk空間対称性が確保され、リンギングと分解能が改善します。',
      { partialFourier: 'Off' },
      'スキャン時間増加'
    ))
  }

  // ── 化学シフト改善 ────────────────────────────────────────────────────────
  if (params.bandwidth < 350) {
    const bw = Math.min(500, Math.round(params.bandwidth * 1.6))
    all.push(mk('bw_up',
      `帯域幅 ${params.bandwidth} → ${bw} Hz/px`,
      '帯域幅を広げると脂肪-水プロトンの周波数差に対するシフト量が減少します。SNRはやや低下します。',
      { bandwidth: bw },
      'SNR低下'
    ))
  }

  if (params.fatSat === 'None' && params.fieldStrength === 3.0) {
    all.push(mk('fatsat_spair_cs',
      '脂肪抑制 SPAIR を追加',
      '3Tでは化学シフトが大きく、脂肪信号抑制により境界アーチファクトが軽減されます。',
      { fatSat: 'SPAIR' },
      'SAR増加・スキャン時間増加'
    ))
  }

  // ── relevance score でソート ──────────────────────────────────────────────
  const score = (s: Suggestion): number => {
    switch (goal) {
      case 'snr': return s.snrDelta
      case 'sar': return -s.sarDelta
      case 'time': return -s.timeDelta
      case 't2blur': return -s.blurDelta
      case 'chemshift': return -s.csDelta
      case 'balanced': {
        // balanced: improve SNR+SAR+time equally, penalize tradeoffs
        const snrW = s.snrDelta > 0 ? s.snrDelta * 0.4 : 0
        const sarW = -s.sarDelta * 0.3
        const timeW = -s.timeDelta * 0.3
        return snrW + sarW + timeW
      }
    }
  }

  // Deduplicate similar suggestions and take top 5
  const seen = new Set<string>()
  const filtered = all
    .filter(s => score(s) > 0)
    .sort((a, b) => score(b) - score(a))
    .filter(s => {
      // Prevent duplicate parameter changes
      const key = Object.keys(s.apply).sort().join(',')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 6)

  return filtered
}

interface GoalConfig {
  id: OptGoal
  label: string
  color: string
  bg: string
  border: string
  icon: string
}

const GOALS: GoalConfig[] = [
  { id: 'snr',      label: 'SNR↑',      color: '#34d399', bg: '#0d2010', border: '#166534', icon: '📡' },
  { id: 'sar',      label: 'SAR↓',      color: '#fbbf24', bg: '#1a1200', border: '#a16207', icon: '🌡' },
  { id: 'time',     label: 'Time↓',     color: '#60a5fa', bg: '#0d1520', border: '#1d4ed8', icon: '⏱' },
  { id: 't2blur',   label: 'T2Blur↓',   color: '#a78bfa', bg: '#1a0f2e', border: '#7c3aed', icon: '🔍' },
  { id: 'chemshift',label: 'ChemSh↓',   color: '#fb923c', bg: '#1a0e00', border: '#c2410c', icon: '⚗' },
  { id: 'balanced', label: 'Balance',   color: '#e2e8f0', bg: '#1a1a1a', border: '#374151', icon: '⚖' },
]

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
    // Collect all param changes (later entries override earlier for same key)
    const allChanges: Partial<ProtocolParams> = {}
    top3.forEach(s => Object.assign(allChanges, s.apply))
    Object.entries(allChanges).forEach(([key, value]) => {
      setParam(key as keyof ProtocolParams, value as ProtocolParams[keyof ProtocolParams])
    })
    setBatchApplied(true)
    setTimeout(() => setBatchApplied(false), 2500)
  }

  const goalCfg = GOALS.find(g => g.id === goal)!

  // Current metrics
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
