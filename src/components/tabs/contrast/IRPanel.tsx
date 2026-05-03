import { useMemo } from 'react'
import { useProtocolStore } from '../../../store/protocolStore'
import { TISSUES } from '../../../store/calculators'

// ── IR Mz 回復カーブ ──────────────────────────────────────────────────────────
function IRCurveChart({ fieldStrength, TI }: { fieldStrength: number; TI: number }) {
  const W = 310, H = 110
  const PAD = { l: 28, r: 10, t: 10, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const maxT = 5000  // ms

  const tx = (t: number) => PAD.l + (t / maxT) * innerW
  // Y: Mz range -1 to +1 — map 1 → top, -1 → bottom
  const ty = (mz: number) => PAD.t + ((1 - mz) / 2) * innerH

  // Tissues to show in IR chart
  const SHOW = ['CSF', 'Fat', 'WM', 'GM', 'Liver']
  const tissues = TISSUES.filter(t => SHOW.includes(t.label))

  const curves = useMemo(() => {
    const N = 120
    return tissues.map(tissue => {
      const T1 = fieldStrength >= 2.5 ? tissue.T1_30 : tissue.T1_15
      const nullTI = Math.round(T1 * Math.log(2))
      const pts = Array.from({ length: N + 1 }, (_, i) => {
        const t = (i / N) * maxT
        const mz = 1 - 2 * Math.exp(-t / T1)
        return { t, mz }
      })
      return { tissue, T1, nullTI, pts }
    })
  }, [fieldStrength])

  const zeroY = ty(0)
  const tiX = tx(Math.min(TI, maxT))

  return (
    <div className="mt-2 rounded overflow-hidden" style={{ background: '#080808', border: '1px solid #1a1a1a' }}>
      <div className="px-2 pt-1.5 text-xs font-semibold" style={{ color: '#4b5563' }}>Mz 回復曲線 (反転回復)</div>
      <svg width={W} height={H}>
        {/* Y=0 line */}
        <line x1={PAD.l} y1={zeroY} x2={PAD.l + innerW} y2={zeroY} stroke="#252525" strokeWidth={1} />
        {/* Y-axis labels */}
        <text x={PAD.l - 3} y={ty(1) + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>+1</text>
        <text x={PAD.l - 3} y={zeroY + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>
        <text x={PAD.l - 3} y={ty(-1) + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>-1</text>

        {/* Tissue curves */}
        {curves.map(({ tissue, pts, nullTI }) => {
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${tx(p.t).toFixed(1)},${ty(p.mz).toFixed(1)}`).join(' ')
          return (
            <g key={tissue.label}>
              <path d={d} fill="none" stroke={tissue.color} strokeWidth={1} opacity={0.7} />
              {/* Null point dot */}
              {nullTI < maxT && (
                <circle cx={tx(nullTI)} cy={zeroY} r={2} fill={tissue.color} />
              )}
            </g>
          )
        })}

        {/* Current TI marker */}
        {TI > 0 && TI <= maxT && (
          <>
            <line x1={tiX} y1={PAD.t} x2={tiX} y2={H - PAD.b} stroke="#e88b00" strokeWidth={1} strokeDasharray="3,2" />
            <text x={tiX + 2} y={PAD.t + 8} fill="#e88b00" style={{ fontSize: '7px' }}>TI={TI}</text>
          </>
        )}

        {/* X-axis labels */}
        {[0, 1000, 2000, 3000, 4000, 5000].map(t => (
          <text key={t} x={tx(t)} y={H - 4} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>{t}</text>
        ))}
        <text x={PAD.l + innerW / 2} y={H - 0} textAnchor="middle" fill="#252525" style={{ fontSize: '7px' }}>Time (ms)</text>
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-2 px-2 pb-1.5" style={{ fontSize: '7px' }}>
        {curves.map(({ tissue, nullTI }) => (
          <span key={tissue.label} style={{ color: tissue.color }}>
            {tissue.label} null={nullTI}ms
          </span>
        ))}
      </div>
    </div>
  )
}

// ── IR 磁化回復カーブ (Inversion Recovery Mz evolution) ──────────────────────
// TI に対する各組織の縦磁化 Mz(TI) = M0 × |1 - 2·exp(-TI/T1)| を可視化
// 現在のTIでの各組織の信号強度をリアルタイム表示
export function IRSignalEvolution() {
  const { params, setParam } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  const W = 290, H = 100
  const PAD = { l: 28, r: 10, t: 8, b: 20 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const maxTI = Math.min(Math.max(params.TR, 8000), 12000)
  const nPts = 100

  const tx = (t: number) => PAD.l + (t / maxTI) * innerW
  const ty = (s: number) => PAD.t + (1 - Math.max(0, Math.min(1, (s + 1) / 2))) * innerH  // s in [-1, 1]

  const irSignal = (TI: number, T1: number, showMagnitude: boolean) => {
    const s = 1 - 2 * Math.exp(-TI / T1)
    return showMagnitude ? Math.abs(s) : s
  }

  // Use magnitude (STIR/FLAIR) or phase-sensitive
  const isMagnitude = true

  const tissues = TISSUES.filter(t => ['GM', 'WM', 'CSF', 'Fat'].includes(t.label))

  const paths = useMemo(() => tissues.map(t => {
    const T1 = is3T ? t.T1_30 : t.T1_15
    const d = Array.from({ length: nPts + 1 }, (_, i) => {
      const ti = (i / nPts) * maxTI
      const s = irSignal(ti, T1, isMagnitude)
      return `${i === 0 ? 'M' : 'L'}${tx(ti).toFixed(1)},${ty(s).toFixed(1)}`
    }).join(' ')
    const nullTI = Math.round(T1 * Math.log(2))
    const sigAtCurrentTI = irSignal(params.TI, T1, isMagnitude)
    return { ...t, T1, d, nullTI, sigAtCurrentTI }
  }), [is3T, maxTI, params.TI, isMagnitude])

  // Only show when TI > 0 (IR sequence)
  if (params.TI <= 0) return null

  const currentTIx = tx(params.TI)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080808', border: '1px solid #1a1a2a' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#a78bfa', fontSize: '9px' }}>IR 磁化回復 Mz(TI) — {params.fieldStrength}T</span>
        <span style={{ color: '#374151', fontSize: '8px' }}>TI={params.TI}ms</span>
      </div>
      <svg width={W} height={H} style={{ cursor: 'ew-resize' }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left - PAD.l
          const newTI = Math.max(0, Math.min(maxTI, Math.round(x / innerW * maxTI / 10) * 10))
          if (e.buttons === 1) setParam('TI', newTI)
        }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left - PAD.l
          const newTI = Math.max(0, Math.min(maxTI, Math.round(x / innerW * maxTI / 10) * 10))
          setParam('TI', newTI)
        }}>

        {/* Zero line */}
        <line x1={PAD.l} y1={ty(0)} x2={PAD.l + innerW} y2={ty(0)}
          stroke="#252525" strokeWidth={1} />

        {/* Grid */}
        {[500, 1000, 2000, 4000, 6000].filter(v => v < maxTI).map(v => (
          <line key={v} x1={tx(v)} y1={PAD.t} x2={tx(v)} y2={PAD.t + innerH}
            stroke="#1a1a1a" strokeWidth={1} />
        ))}

        {/* Axes */}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
        <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>1.0</text>
        <text x={PAD.l - 2} y={ty(0) + 3} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>

        {/* Tissue curves */}
        {paths.map(p => (
          <g key={p.label}>
            <path d={p.d} fill="none" stroke={p.color} strokeWidth={1.2} opacity={0.75} />
            {/* Null point marker */}
            <circle cx={tx(p.nullTI)} cy={ty(0)} r={2}
              fill={p.color} opacity={0.6} />
          </g>
        ))}

        {/* Current TI indicator */}
        <line x1={currentTIx} y1={PAD.t} x2={currentTIx} y2={PAD.t + innerH}
          stroke="#e88b00" strokeWidth={1} strokeDasharray="2,2" opacity={0.8} />
        <text x={currentTIx + 2} y={PAD.t + 9} fill="#e88b00" style={{ fontSize: '7px' }}>
          TI={params.TI}
        </text>

        {/* Signal dots at current TI */}
        {paths.map(p => (
          <circle key={p.label}
            cx={currentTIx}
            cy={ty(p.sigAtCurrentTI)}
            r={3}
            fill={p.color}
            stroke="#000"
            strokeWidth={0.5}
          />
        ))}

        {/* X axis */}
        <line x1={PAD.l} y1={PAD.t + innerH} x2={PAD.l + innerW} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
        <text x={PAD.l + innerW / 2} y={H - 4} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>TI (ms)</text>
        {[0, 1000, 2000, 4000].filter(v => v <= maxTI).map(v => (
          <text key={v} x={tx(v)} y={H - 4} textAnchor="middle" fill="#252525" style={{ fontSize: '6px' }}>{v}</text>
        ))}
      </svg>

      {/* Legend + current signals */}
      <div className="flex gap-2 flex-wrap mt-1" style={{ fontSize: '7px' }}>
        {paths.map(p => (
          <div key={p.label} className="flex items-center gap-1">
            <span style={{ color: p.color }}>●</span>
            <span style={{ color: p.color }}>{p.label}</span>
            <span style={{ color: '#374151' }}>null:{p.nullTI}ms</span>
          </div>
        ))}
      </div>
      <div style={{ color: '#374151', fontSize: '7px', marginTop: 2 }}>
        ドラッグ/クリックで TI を変更 · ● = 現在TIの信号
      </div>
    </div>
  )
}

// TI 自動計算器コンポーネント
export function TICalculator() {
  const { params, setParam } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  // 組織別 null point TI 計算: TI_null = T1 × ln2
  const tissueNullTI = TISSUES.map(t => {
    const T1 = is3T ? t.T1_30 : t.T1_15
    return {
      label: t.label,
      color: t.color,
      TI: Math.round(T1 * Math.log(2)),
    }
  })

  const presets = [
    { label: 'FLAIR 1.5T', TI: 2200, hint: '水(CSF)をnull。白質病変・MS' },
    { label: 'FLAIR 3T', TI: 2500, hint: '3T用FLAIR。TI延長が必要' },
    { label: 'STIR 1.5T', TI: 150, hint: '脂肪をnull。関節・金属周囲' },
    { label: 'STIR 3T', TI: 180, hint: '3T用STIR。SPAIR推奨' },
    { label: 'DIR 1.5T', TI: 3400, hint: 'Double IR: WM+CSF同時抑制。GM病変' },
    { label: 'PSIR 1.5T', TI: 400, hint: 'Phase Sensitive IR: 心筋T1マッピング' },
  ]

  return (
    <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111', border: '1px solid #1a1a2a' }}>
      <div className="font-semibold mb-2" style={{ color: '#a78bfa' }}>TI 自動計算機 (IR/FLAIR/STIR)</div>

      {/* 組織別 null point */}
      <div className="mb-2">
        <div className="text-xs mb-1" style={{ color: '#4b5563' }}>組織 Null Point TI ({params.fieldStrength}T)</div>
        <div className="flex flex-wrap gap-1">
          {tissueNullTI.map(({ label, color, TI }) => (
            <button
              key={label}
              onClick={() => setParam('TI', TI)}
              className="px-1.5 py-0.5 rounded transition-colors"
              style={{
                background: Math.abs(params.TI - TI) < 20 ? color + '28' : '#151515',
                color: Math.abs(params.TI - TI) < 20 ? color : '#6b7280',
                border: `1px solid ${Math.abs(params.TI - TI) < 20 ? color + '60' : '#252525'}`,
                fontSize: '9px',
              }}
              title={`TI=${TI}ms で ${label} の信号がnullになります`}
            >
              {label} ≈{TI}ms
            </button>
          ))}
        </div>
      </div>

      {/* 臨床プリセット */}
      <div>
        <div className="text-xs mb-1" style={{ color: '#4b5563' }}>臨床 TI プリセット</div>
        <div className="space-y-1">
          {presets.map(({ label, TI, hint }) => (
            <button
              key={label}
              onClick={() => setParam('TI', TI)}
              className="flex items-center justify-between w-full px-2 py-1 rounded transition-colors"
              style={{
                background: params.TI === TI ? '#2a1200' : '#151515',
                color: params.TI === TI ? '#e88b00' : '#9ca3af',
                border: `1px solid ${params.TI === TI ? '#c47400' : '#252525'}`,
              }}
            >
              <span className="font-semibold" style={{ fontSize: '10px' }}>{label}</span>
              <span className="font-mono" style={{ fontSize: '9px' }}>TI={TI}ms</span>
              <span style={{ fontSize: '8px', color: params.TI === TI ? '#c47400' : '#4b5563' }}>{hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* IR Signal Evolution curve */}
      <IRCurveChart fieldStrength={params.fieldStrength} TI={params.TI} />

      {params.TI > 0 && (
        <div className="mt-2 pt-1.5 flex justify-between items-center" style={{ borderTop: '1px solid #252525' }}>
          <span style={{ color: '#6b7280' }}>現在のTI: </span>
          <span className="font-mono font-semibold" style={{ color: '#a78bfa' }}>{params.TI}ms</span>
          <button
            onClick={() => setParam('TI', 0)}
            className="px-1.5 py-0.5 rounded"
            style={{ background: '#1a0505', color: '#f87171', border: '1px solid #7f1d1d', fontSize: '9px' }}
          >
            TI=0 にリセット
          </button>
        </div>
      )}
    </div>
  )
}
