import { useMemo } from 'react'
import { TISSUES, calcTissueContrast } from '../../store/calculators'
import type { ProtocolParams } from '../../data/presets'

// ────────────────────────────────────────────────────────────────────────────
// 病変プリセット定義
// ────────────────────────────────────────────────────────────────────────────
export interface PathologyPreset {
  id: string
  label: string
  T1_15: number
  T2_15: number
  T1_30: number
  T2_30: number
  backgroundLabel: string
  recommendation: string
}

export const PATHOLOGY_PRESETS: PathologyPreset[] = [
  {
    id: 'stroke',
    label: '急性脳梗塞',
    T1_15: 1100, T2_15: 70,
    T1_30: 1600, T2_30: 65,
    backgroundLabel: 'GM',
    recommendation: '急性脳梗塞：DWI (b=1000) が最優先。T2/FLAIRは補助的（超急性期は陰性も）。',
  },
  {
    id: 'tumor',
    label: '悪性腫瘍',
    T1_15: 1200, T2_15: 180,
    T1_30: 1800, T2_30: 170,
    backgroundLabel: 'WM',
    recommendation: '悪性腫瘍：T1+Gd造影 & T2 FLAIRが基本。DWI/PWIで悪性度評価を補助。',
  },
  {
    id: 'ms',
    label: 'MS病変',
    T1_15: 950, T2_15: 160,
    T1_30: 1500, T2_30: 140,
    backgroundLabel: 'WM',
    recommendation: 'MS病変：FLAIR (T2水抑制) が最優先。T1+Gdで活動性評価。',
  },
  {
    id: 'cartilage',
    label: '軟骨損傷',
    T1_15: 1000, T2_15: 50,
    T1_30: 1500, T2_30: 45,
    backgroundLabel: 'Muscle',
    recommendation: '軟骨損傷：PDW Fat-sat (T2マッピング) が最優先。3D GRE薄スライスが有効。',
  },
]

// ────────────────────────────────────────────────────────────────────────────
// Bloch 簡略計算（病変信号）
// ────────────────────────────────────────────────────────────────────────────
export function calcLesionSignal(T1: number, T2: number, params: ProtocolParams): number {
  const { TR, TE, TI, turboFactor, flipAngle, averages } = params
  const isIR = TI > 0
  const isGRE = turboFactor <= 2 && flipAngle < 60
  let s: number
  if (isIR) {
    s = Math.abs(1 - 2 * Math.exp(-TI / T1) + Math.exp(-TR / T1)) * Math.exp(-TE / T2)
  } else if (isGRE) {
    const faRad = (flipAngle * Math.PI) / 180
    const e1 = Math.exp(-TR / T1)
    s = Math.sin(faRad) * (1 - e1) / (1 - Math.cos(faRad) * e1 + 1e-10) * Math.exp(-TE / T2)
  } else {
    s = (1 - Math.exp(-TR / T1)) * Math.exp(-TE / T2)
  }
  return Math.max(0, s) * Math.sqrt(averages)
}

// ────────────────────────────────────────────────────────────────────────────
// 病変検出性パネル
// ────────────────────────────────────────────────────────────────────────────
export function PathologyDetectability({
  selectedPathology,
  onSelect,
  activePreset,
  detectabilityScore,
}: {
  selectedPathology: string | null
  onSelect: (id: string | null) => void
  activePreset: PathologyPreset | null
  detectabilityScore: number | null
}) {
  const scoreBadge = (score: number) => {
    if (score >= 70) return { bg: '#14432a', color: '#34d399', border: '#166534', label: '検出容易' }
    if (score >= 40) return { bg: '#2d2000', color: '#fbbf24', border: '#78350f', label: '要注意' }
    return { bg: '#2d0a0a', color: '#f87171', border: '#7f1d1d', label: '検出困難' }
  }

  return (
    <div className="p-2 rounded" style={{ background: '#111', border: '1px solid #1e1530' }}>
      <div className="font-semibold mb-1.5" style={{ color: '#e88b00', fontSize: '10px', letterSpacing: '0.05em' }}>
        PATHOLOGY DETECTABILITY
      </div>

      <div className="grid grid-cols-2 gap-1 mb-2">
        {PATHOLOGY_PRESETS.map(preset => {
          const isActive = selectedPathology === preset.id
          return (
            <button
              key={preset.id}
              onClick={() => onSelect(isActive ? null : preset.id)}
              className="rounded py-1 px-1.5 text-left transition-colors"
              style={{
                fontSize: '9px',
                background: isActive ? '#2a1800' : '#1a1a1a',
                border: `1px solid ${isActive ? '#e88b00' : '#2a2a2a'}`,
                color: isActive ? '#e88b00' : '#9ca3af',
                cursor: 'pointer',
              }}
            >
              {preset.label}
            </button>
          )
        })}
      </div>

      {activePreset && detectabilityScore !== null && (() => {
        const badge = scoreBadge(detectabilityScore)
        return (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span style={{ color: '#6b7280', fontSize: '9px' }}>
                vs {activePreset.backgroundLabel} CNR スコア
              </span>
              <span
                className="font-semibold px-1.5 py-0.5 rounded font-mono"
                style={{
                  background: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                  fontSize: '9px',
                }}
              >
                {detectabilityScore}% — {badge.label}
              </span>
            </div>
            <div className="w-full h-2 rounded overflow-hidden" style={{ background: '#1a1a1a' }}>
              <div
                className="h-full rounded transition-all duration-300"
                style={{ width: `${detectabilityScore}%`, background: badge.color, opacity: 0.85 }}
              />
            </div>
            <div className="flex justify-between" style={{ color: '#374151', fontSize: '8px' }}>
              <span>0</span>
              <span style={{ color: '#4b5563' }}>40 / 70</span>
              <span>100</span>
            </div>
          </div>
        )
      })()}

      {!activePreset && (
        <div style={{ color: '#4b5563', fontSize: '9px' }}>
          プリセットを選択して病変検出性を評価
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// コントラスト比 + CNR の計算・表示（CNRバーチャート付き）
// ────────────────────────────────────────────────────────────────────────────
export function ContrastRatios({ signals, snr }: { signals: ReturnType<typeof calcTissueContrast>; snr: number }) {
  const find = (label: string) => signals.find(s => s.tissue.label === label)
  const gm = find('GM')?.signal ?? 0
  const wm = find('WM')?.signal ?? 0
  const csf = find('CSF')?.signal ?? 0
  const fat = find('Fat')?.signal ?? 0
  const liver = find('Liver')?.signal ?? 0
  const muscle = find('Muscle')?.signal ?? 0

  const cnr = (a: number, b: number) => Math.round(Math.abs(a - b) * snr * 10) / 10

  const pairs: { a: string; b: string; sigA: number; sigB: number; category: string }[] = [
    { a: 'GM',    b: 'WM',     sigA: gm,    sigB: wm,     category: '脳' },
    { a: 'CSF',   b: 'GM',     sigA: csf,   sigB: gm,     category: '脳' },
    { a: 'Fat',   b: 'GM',     sigA: fat,   sigB: gm,     category: '脂肪' },
    { a: 'Liver', b: 'Muscle', sigA: liver, sigB: muscle, category: '腹部' },
  ]

  const cnrValues = pairs.map(p => cnr(p.sigA, p.sigB))
  const maxCNR = Math.max(...cnrValues, 1)

  const W = 240, H = 64, barH = 10, gap = 6, padL = 52, padR = 8

  return (
    <div className="p-2 rounded" style={{ background: '#111', border: '1px solid #1a1520' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#a78bfa' }}>コントラスト比 / CNR</span>
        <span style={{ color: '#4b5563', fontSize: '8px' }}>CNR = ΔS × SNR</span>
      </div>

      <svg width={W} height={H} style={{ display: 'block', margin: '0 auto 6px' }}>
        {pairs.map(({ a, b, sigA, sigB }, i) => {
          const aT = TISSUES.find(t => t.label === a)
          const bT = TISSUES.find(t => t.label === b)
          const cnrVal = cnr(sigA, sigB)
          const barW = Math.max(2, ((cnrVal / maxCNR) * (W - padL - padR)))
          const y = i * (barH + gap) + 4
          const color = cnrVal > 15 ? '#34d399' : cnrVal > 5 ? '#fbbf24' : '#f87171'
          return (
            <g key={`${a}${b}`}>
              <text x={padL - 4} y={y + barH - 2} textAnchor="end" fontSize={8} fill={aT?.color ?? '#9ca3af'}>
                {a}
              </text>
              <text x={padL - 4 - 18} y={y + barH - 2} textAnchor="end" fontSize={7} fill={bT?.color ?? '#6b7280'}>
                /{b}
              </text>
              <rect x={padL} y={y} width={W - padL - padR} height={barH} rx={2} fill="#1e1e1e" />
              <rect x={padL} y={y} width={barW} height={barH} rx={2} fill={color} opacity={0.85} />
              <text x={padL + barW + 3} y={y + barH - 2} fontSize={8} fill={color}>{cnrVal}</text>
            </g>
          )
        })}
        {[5, 15].map(ref => {
          const x = padL + (ref / maxCNR) * (W - padL - padR)
          if (x > W - padR) return null
          return (
            <g key={ref}>
              <line x1={x} y1={0} x2={x} y2={H - 2} stroke="#333" strokeWidth={1} strokeDasharray="2,2" />
              <text x={x} y={H - 1} textAnchor="middle" fontSize={7} fill="#374151">{ref}</text>
            </g>
          )
        })}
      </svg>

      <div className="grid gap-px" style={{ gridTemplateColumns: '1fr auto auto' }}>
        <span style={{ color: '#4b5563', fontSize: '8px' }}>組織ペア</span>
        <span className="text-center" style={{ color: '#4b5563', fontSize: '8px' }}>比率</span>
        <span className="text-center" style={{ color: '#4b5563', fontSize: '8px' }}>分類</span>
        {pairs.map(({ a, b, sigA, sigB, category }) => {
          const aT = TISSUES.find(t => t.label === a)
          const bT = TISSUES.find(t => t.label === b)
          const ratio = sigB > 0.01 ? sigA / sigB : 0
          return [
            <div key={`${a}${b}_label`} className="flex items-center gap-0.5 py-0.5">
              <span style={{ color: aT?.color, fontSize: '9px' }}>{a}</span>
              <span style={{ color: '#374151', fontSize: '8px' }}>/</span>
              <span style={{ color: bT?.color, fontSize: '9px' }}>{b}</span>
            </div>,
            <span key={`${a}${b}_ratio`} className="font-mono text-center py-0.5" style={{
              color: ratio > 1.2 ? '#34d399' : ratio > 0.8 ? '#fbbf24' : '#f87171',
              fontSize: '9px',
            }}>
              {ratio.toFixed(2)}
            </span>,
            <span key={`${a}${b}_cat`} className="text-center py-0.5" style={{ color: '#374151', fontSize: '8px' }}>
              {category}
            </span>,
          ]
        })}
      </div>
      <div className="mt-1.5 pt-1.5" style={{ borderTop: '1px solid #1a1a1a' }}>
        <div className="flex justify-between" style={{ color: '#4b5563', fontSize: '8px' }}>
          <span>CNR基準: &gt;15◎ &gt;5○ &lt;5△</span>
          <span>SNR: {snr}</span>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// シーケンス最適化のヒント
// ────────────────────────────────────────────────────────────────────────────
export function SequenceOptimizationTips({
  contrastLabel, isGRE, isIR, isFLAIR, isDWI,
  TR, TE, FA, fieldStrength, turboFactor, pathologyRecommendation
}: {
  contrastLabel: string; isGRE: boolean; isIR: boolean; isFLAIR: boolean; isDWI: boolean
  TR: number; TE: number; FA: number; fieldStrength: number; turboFactor: number
  pathologyRecommendation: string | null
}) {
  const is3T = fieldStrength >= 2.5

  const tips = useMemo(() => {
    const result: { icon: string; color: string; text: string }[] = []

    if (isDWI) {
      result.push({ icon: '◆', color: '#60a5fa', text: 'b=0とb=1000の2点でADC計算可能。b値追加で精度向上。' })
      if (is3T) result.push({ icon: '⚠', color: '#fbbf24', text: '3T DWI: 幾何歪み増大。iPAT R=2またはリバースPEで補正を。' })
    } else if (isFLAIR) {
      result.push({ icon: '◆', color: '#60a5fa', text: `FLAIR最適TI(1.5T:3400ms 3T:2500ms頃)で水を完全抑制。` })
      result.push({ icon: '◆', color: '#60a5fa', text: 'FLAIR+MPRAGE組合せでMS病巣評価に有効。' })
      if (TE < 90) result.push({ icon: '△', color: '#fbbf24', text: `TE ${TE}ms → T2強調不十分。90ms以上を推奨。` })
    } else if (isIR) {
      result.push({ icon: '◆', color: '#4ade80', text: `STIR: TI ${Math.round((is3T ? 220 : 160))}ms付近で脂肪抑制最大。フィールド非依存性が強み。` })
    } else if (isGRE) {
      const ernstWM = Math.round((Math.acos(Math.exp(-TR / (is3T ? 1084 : 1080))) * 180) / Math.PI)
      if (Math.abs(FA - ernstWM) > 15) {
        result.push({ icon: '△', color: '#fbbf24', text: `現在FA ${FA}°、WM Ernst角 ${ernstWM}°。SNR最大化にはErnst角付近を推奨。` })
      } else {
        result.push({ icon: '✓', color: '#34d399', text: `FA ${FA}° ≈ Ernst角 ${ernstWM}°。WM SNR最適化済み。` })
      }
      if (is3T && TE > 20) result.push({ icon: '⚠', color: '#f87171', text: '3T GRE: TE長すぎるとT2*ぼけ増大。TE<15ms推奨。' })
    } else if (TR < 1500 && TE < 30) {
      if (TR > 800) result.push({ icon: '△', color: '#fbbf24', text: `T1強調: TR ${TR}ms → T1コントラスト弱め。600ms以下推奨。` })
      if (turboFactor > 4) result.push({ icon: '◆', color: '#60a5fa', text: `TSE T1: TF ${turboFactor}は脂肪ハイシグナルに注意。TF低減推奨。` })
    } else if (TR >= 2500 && TE >= 60) {
      if (TE > 120) result.push({ icon: '△', color: '#fbbf24', text: `TE ${TE}ms → 長すぎてSNR低下。90-100ms推奨。` })
      if (turboFactor < 8) result.push({ icon: '◆', color: '#60a5fa', text: `T2強調: TF ${turboFactor}低め。16以上でスキャン時間短縮可。` })
    }

    if (is3T && !isDWI) {
      result.push({ icon: '◆', color: '#818cf8', text: '3T: B1不均一性対策にAdFlip/TrueFormを使用推奨。' })
    }

    if (turboFactor > 20 && !isDWI) {
      result.push({ icon: '⚠', color: '#f87171', text: `TF ${turboFactor} → T2ぼけ増大リスク。エコースペーシング確認を。` })
    }

    return result.slice(0, 4)
  }, [isDWI, isFLAIR, isIR, isGRE, TR, TE, FA, fieldStrength, turboFactor, is3T, contrastLabel])

  if (tips.length === 0 && !pathologyRecommendation) return null

  return (
    <div className="p-2 rounded" style={{ background: '#0e1218', border: '1px solid #1a2030' }}>
      <div className="font-semibold mb-1.5" style={{ color: '#60a5fa', fontSize: '9px', letterSpacing: '0.06em' }}>
        OPTIMIZATION TIPS — {contrastLabel}
      </div>
      {tips.length > 0 && (
        <div className="space-y-1">
          {tips.map((tip, i) => (
            <div key={i} className="flex gap-1.5" style={{ fontSize: '9px' }}>
              <span style={{ color: tip.color, flexShrink: 0, width: '10px' }}>{tip.icon}</span>
              <span style={{ color: '#9ca3af', lineHeight: 1.4 }}>{tip.text}</span>
            </div>
          ))}
        </div>
      )}
      {pathologyRecommendation && (
        <div
          className="mt-2 pt-1.5 flex gap-1.5"
          style={{ borderTop: tips.length > 0 ? '1px solid #1e2a3a' : undefined, fontSize: '9px' }}
        >
          <span style={{ color: '#e88b00', flexShrink: 0 }}>→</span>
          <span style={{ color: '#d1a854', lineHeight: 1.5 }}>{pathologyRecommendation}</span>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// 組織T1/T2参照テーブル
// ────────────────────────────────────────────────────────────────────────────
export function TissueReference({ fieldStrength }: { fieldStrength: number }) {
  const is3T = fieldStrength >= 2.5
  return (
    <div className="p-2 rounded" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
      <div className="font-semibold mb-1.5" style={{ color: '#6b7280' }}>
        組織 T1/T2 参照 ({fieldStrength}T)
      </div>
      <table className="w-full" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: '#4b5563' }}>
            <th className="text-left py-0.5">組織</th>
            <th className="text-right py-0.5">T1 (ms)</th>
            <th className="text-right py-0.5">T2 (ms)</th>
            <th className="text-right py-0.5">T2* (ms)</th>
          </tr>
        </thead>
        <tbody>
          {TISSUES.map(t => (
            <tr key={t.label} style={{ borderTop: '1px solid #111' }}>
              <td className="py-0.5 font-mono" style={{ color: t.color }}>{t.label}</td>
              <td className="text-right py-0.5 font-mono" style={{ color: '#9ca3af' }}>
                {is3T ? t.T1_30 : t.T1_15}
              </td>
              <td className="text-right py-0.5 font-mono" style={{ color: '#9ca3af' }}>
                {is3T ? t.T2_30 : t.T2_15}
              </td>
              <td className="text-right py-0.5 font-mono" style={{ color: '#6b7280' }}>
                {is3T ? t.T2star_30 : t.T2star_15}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
