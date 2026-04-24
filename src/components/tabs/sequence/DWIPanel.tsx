import { useMemo, useState } from 'react'
import { useProtocolStore } from '../../../store/protocolStore'

// ── ADC 組織信号減衰チャート ──────────────────────────────────────────────────
export function ADCSignalChart() {
  const { params } = useProtocolStore()

  const isDWI = params.turboFactor <= 1 && params.bValues.length > 1
  if (!isDWI) return null

  const adcTissues = [
    { label: 'CSF',         adc: 3.0,  color: '#38bdf8' },
    { label: '正常脳WM',   adc: 0.8,  color: '#60a5fa' },
    { label: '正常脳GM',   adc: 0.95, color: '#a78bfa' },
    { label: '急性梗塞',   adc: 0.3,  color: '#f87171' },
    { label: '正常肝',     adc: 1.1,  color: '#fb923c' },
    { label: '悪性肝腫瘍', adc: 0.75, color: '#f43f5e' },
    { label: '前立腺正常', adc: 1.6,  color: '#4ade80' },
    { label: '前立腺癌',   adc: 0.65, color: '#ef4444' },
  ]

  const maxB = Math.max(...params.bValues, 1200)
  const W = 290, H = 100
  const PAD = { l: 28, r: 10, t: 8, b: 22 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const nPts = 60
  const bPts = Array.from({ length: nPts + 1 }, (_, i) => (i / nPts) * maxB)

  const tx = (b: number) => PAD.l + (b / maxB) * innerW
  const ty = (s: number) => PAD.t + (1 - Math.max(0, Math.min(1, s))) * innerH

  const paths = useMemo(() => adcTissues.map(t => {
    const d = bPts.map((b, i) => {
      const s = Math.exp(-b * t.adc / 1000)
      return `${i === 0 ? 'M' : 'L'}${tx(b).toFixed(1)},${ty(s).toFixed(1)}`
    }).join(' ')
    return { ...t, d }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [maxB, params.bValues])

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080c10', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#f87171', fontSize: '9px', letterSpacing: '0.05em' }}>
          ADC 信号減衰 S(b) = S₀·exp(-b·ADC)
        </span>
        <span style={{ color: '#374151', fontSize: '8px' }}>b₀→{maxB} s/mm²</span>
      </div>
      <svg width={W} height={H}>
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <line key={v} x1={PAD.l} y1={ty(v)} x2={PAD.l + innerW} y2={ty(v)}
            stroke="#111" strokeWidth={1} />
        ))}
        {params.bValues.map(b => (
          <line key={b} x1={tx(b)} y1={PAD.t} x2={tx(b)} y2={PAD.t + innerH}
            stroke="#e88b0030" strokeWidth={1} strokeDasharray="2,2" />
        ))}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
        <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>1.0</text>
        <text x={PAD.l - 2} y={PAD.t + innerH} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>
        {paths.map(p => (
          <path key={p.label} d={p.d} fill="none" stroke={p.color} strokeWidth={1} opacity={0.8} />
        ))}
        {params.bValues.filter(b => b > 0).map(bVal => (
          paths.map(p => {
            const s = Math.exp(-bVal * p.adc / 1000)
            return (
              <circle key={`${p.label}-${bVal}`}
                cx={tx(bVal)} cy={ty(s)} r={2}
                fill={p.color} opacity={0.9}
              />
            )
          })
        ))}
        <line x1={PAD.l} y1={PAD.t + innerH} x2={PAD.l + innerW} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
        <text x={PAD.l + innerW / 2} y={H - 4} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>b値 (s/mm²)</text>
        {[0, 500, 1000].filter(v => v <= maxB).map(v => (
          <text key={v} x={tx(v)} y={H - 4} textAnchor="middle" fill="#252525" style={{ fontSize: '6px' }}>{v}</text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1" style={{ fontSize: '7px' }}>
        {adcTissues.map(t => (
          <span key={t.label} style={{ color: t.color }}>{t.label}({t.adc})</span>
        ))}
      </div>
      <div style={{ color: '#374151', fontSize: '7px', marginTop: 2 }}>
        縦軸=正規化信号 · 現在のb値={params.bValues.join('+')} s/mm² · ●=各b値での信号強度
      </div>
    </div>
  )
}

// ── SMS（Simultaneous Multi-Slice）/ Multiband パネル ──────────────────────
export function SMSAccelerationPanel() {
  const { params } = useProtocolStore()
  const [mbFactor, setMbFactor] = useState(1)

  const isDWI = params.turboFactor <= 1 && params.bValues.length > 1
  const isEPI = isDWI
  const isFMRI = isDWI

  if (!isEPI && params.turboFactor < 2) return null

  const smsGFactor = mbFactor > 1 ? (1 + 0.04 * Math.sqrt(mbFactor - 1)) : 1
  const smsSnrPenalty = mbFactor > 1 ? (1 / Math.sqrt(mbFactor) * (1 / smsGFactor)) : 1
  const taSaving = mbFactor > 1 ? Math.round((1 - 1 / mbFactor) * 100) : 0
  const totalAccel = mbFactor * (params.ipatMode !== 'Off' ? params.ipatFactor : 1)
  const newSliceCoverage = params.slices * mbFactor
  const maxSlices = Math.min(256, newSliceCoverage)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080c10', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#f472b6', fontSize: '9px', letterSpacing: '0.05em' }}>
          SMS / MULTIBAND ACCELERATION
        </span>
        <span style={{ color: '#374151', fontSize: '8px' }}>同時多スライス励起</span>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <span style={{ color: '#4b5563', fontSize: '8px' }}>MB Factor:</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 6, 8].map(mb => (
            <button
              key={mb}
              onClick={() => setMbFactor(mb)}
              style={{
                background: mbFactor === mb ? '#f472b618' : '#111',
                color: mbFactor === mb ? '#f472b6' : '#4b5563',
                border: `1px solid ${mbFactor === mb ? '#f472b660' : '#252525'}`,
                borderRadius: 3,
                fontSize: '9px',
                fontFamily: 'monospace',
                padding: '1px 5px',
                cursor: 'pointer',
              }}
            >
              {mb}
            </button>
          ))}
        </div>
      </div>

      {mbFactor > 1 && (
        <div className="space-y-1">
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5" style={{ fontSize: '8px' }}>
            <div className="flex justify-between">
              <span style={{ color: '#374151' }}>TA短縮</span>
              <span className="font-mono" style={{ color: '#34d399' }}>-{taSaving}%</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#374151' }}>SNR損失</span>
              <span className="font-mono" style={{ color: smsSnrPenalty < 0.65 ? '#f87171' : '#fbbf24' }}>
                {Math.round(smsSnrPenalty * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#374151' }}>SMS g-factor</span>
              <span className="font-mono" style={{ color: '#9ca3af' }}>{smsGFactor.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#374151' }}>総加速倍率</span>
              <span className="font-mono" style={{ color: '#f472b6' }}>×{totalAccel}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: '#374151' }}>スライスカバレッジ</span>
              <span className="font-mono" style={{ color: '#60a5fa' }}>×{mbFactor}→{maxSlices}枚</span>
            </div>
          </div>

          <div className="flex gap-0.5 mt-1" style={{ height: 14 }}>
            {Array.from({ length: Math.min(params.slices, 20) }, (_, i) => {
              const group = Math.floor(i / Math.ceil(params.slices / mbFactor))
              const colors = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#fb923c', '#38bdf8']
              return (
                <div key={i} style={{
                  flex: 1,
                  background: colors[group % colors.length] + '60',
                  border: `1px solid ${colors[group % colors.length]}`,
                  borderRadius: 1,
                }} title={`Slice ${i + 1} — Group ${group + 1}`} />
              )
            })}
          </div>
          <div style={{ color: '#374151', fontSize: '7px' }}>
            色 = 同時励起グループ ({Math.ceil(params.slices / mbFactor)}ショット)
          </div>

          {isFMRI && (
            <div className="mt-1 p-1.5 rounded" style={{ background: '#1a0d1f', border: '1px solid #7e22ce30' }}>
              <span style={{ color: '#c084fc', fontSize: '7px' }}>
                fMRI: SMS MB={mbFactor} → TR実効={Math.round(params.TR / mbFactor)}ms相当
                · tSNR影響: {Math.round(smsSnrPenalty * 100)}%
              </span>
            </div>
          )}

          {mbFactor >= 4 && (
            <div style={{ color: '#f87171', fontSize: '7px' }}>
              ⚠ MB≥4: g-factorと残留アーチファクトに注意。CAIPIRINHA+SMS推奨。
            </div>
          )}
        </div>
      )}

      {mbFactor === 1 && (
        <div style={{ color: '#374151', fontSize: '7px' }}>
          MB Factor = 1: SMS無効。複数のスライスを同時励起するには MB≥2 を選択。
          EPI/DWI/fMRI で特に効果的（TR短縮 → ダイナミック分解能向上）。
        </div>
      )}
    </div>
  )
}

// ── DWI b値 UI パネル ──────────────────────────────────────────────────────
const B_VALUE_PRESETS: { label: string; values: number[]; hint: string }[] = [
  { label: '脳梗塞',     values: [0, 1000],              hint: 'b=0+1000 | 急性期梗塞の標準' },
  { label: '頭部標準',   values: [0, 500, 1000],          hint: 'b=0+500+1000 | ADC精度向上' },
  { label: '腹部',       values: [0, 50, 800],            hint: 'b=0+50+800 | IVIM+悪性判定' },
  { label: '肝臓',       values: [0, 50, 400, 800],       hint: 'b=0+50+400+800 | EOBプロトコル' },
  { label: '前立腺',     values: [0, 50, 400, 800, 1500], hint: 'PI-RADS v2.1推奨' },
  { label: '前立腺高b',  values: [0, 50, 400, 800, 2000], hint: 'b=2000 | 高感度癌検出' },
]

export function DWIBValuesPanel() {
  const { params, setParam } = useProtocolStore()
  const isDWI = params.turboFactor <= 1 && params.bValues.length > 1

  return (
    <div className="border-t mt-2 pt-2 mx-3" style={{ borderColor: '#252525' }}>
      <div className="text-xs font-semibold mb-2" style={{ color: '#9ca3af' }}>b値設定（DWI）</div>

      <div className="flex flex-wrap gap-1 mb-2">
        {params.bValues.sort((a, b) => a - b).map((b, i) => (
          <button
            key={i}
            onClick={() => {
              if (params.bValues.length > 1) {
                setParam('bValues', params.bValues.filter((_, j) => j !== i))
              }
            }}
            className="px-2 py-0.5 rounded text-xs font-mono transition-colors"
            style={{ background: '#2a1200', color: '#e88b00', border: '1px solid #c47400' }}
            title="クリックで削除"
          >
            b={b}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {[0, 50, 100, 400, 500, 800, 1000, 1500, 2000].filter(b => !params.bValues.includes(b)).map(b => (
          <button
            key={b}
            onClick={() => setParam('bValues', [...params.bValues, b].sort((a, z) => a - z))}
            className="px-1.5 py-0.5 rounded text-xs font-mono transition-colors"
            style={{ background: '#1a1a1a', color: '#6b7280', border: '1px solid #2a2a2a' }}
          >
            +{b}
          </button>
        ))}
      </div>

      <div className="mt-2">
        <div className="text-xs mb-1.5" style={{ color: '#4b5563' }}>臨床プリセット</div>
        <div className="grid grid-cols-2 gap-1">
          {B_VALUE_PRESETS.map(preset => {
            const isActive = JSON.stringify(preset.values.sort()) === JSON.stringify([...params.bValues].sort((a,b) => a-b))
            return (
              <button
                key={preset.label}
                onClick={() => setParam('bValues', preset.values)}
                className="px-2 py-1 rounded text-left transition-colors"
                style={{
                  background: isActive ? '#2a1200' : '#151515',
                  color: isActive ? '#e88b00' : '#9ca3af',
                  border: `1px solid ${isActive ? '#c47400' : '#252525'}`,
                  fontSize: '10px',
                }}
                title={preset.hint}
              >
                <div className="font-semibold">{preset.label}</div>
                <div className="font-mono" style={{ fontSize: '8px', color: isActive ? '#c47400' : '#4b5563' }}>
                  b={preset.values.join('+')}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {isDWI && (
        <div className="mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
          <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>b値 臨床ガイド</div>
          <table className="w-full">
            <tbody style={{ color: '#9ca3af' }}>
              {[
                ['b=0',      '実質T2画像。ADC算出の基準点'],
                ['b=50',     '灌流効果 (IVIM)。低b値成分の分離'],
                ['b=400-500','腹部・肝臓の悪性病変スクリーニング'],
                ['b=800-1000','脳梗塞・前立腺の標準'],
                ['b≥1500',   '前立腺高b値 (PI-RADS v2.1推奨)'],
              ].map(([bv, desc]) => (
                <tr key={bv} style={{ borderTop: '1px solid #111' }}>
                  <td className="py-0.5 text-white w-24 font-mono" style={{ fontSize: '9px' }}>{bv}</td>
                  <td className="py-0.5" style={{ fontSize: '9px' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 pt-1.5" style={{ borderTop: '1px solid #252525', color: '#6b7280', fontSize: '9px' }}>
            ADC算出には最低2点（b=0 + b≥500）が必要。精度向上には3点以上推奨。
            {params.bValues.length >= 3 && (
              <span className="text-green-400"> ✓ {params.bValues.length}点取得 — ADC精度良好</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
