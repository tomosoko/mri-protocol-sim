import { useMemo } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { calcSNR, calcSARLevel, calcScanTime, calcT2Blur, chemShift } from '../store/calculators'
import type { ProtocolParams } from '../data/presets'

// ── メトリクス型 ──────────────────────────────────────────────────────────────
interface Metrics {
  snr: number
  sar: number
  time: number
  blur: number
  chem: number
}

interface SensBar {
  snr: number; sar: number; time: number; blur: number; chem: number
}

// ── 行定義 ───────────────────────────────────────────────────────────────────
interface WhatIfRow {
  label: string
  group: string
  upLabel: string
  downLabel: string
  up: Partial<ProtocolParams>
  down: Partial<ProtocolParams>
}

// 計算済み行
interface ComputedRow extends WhatIfRow {
  upDelta: SensBar
  downDelta: SensBar
}

const ROWS: WhatIfRow[] = [
  { label: 'TR', group: 'Timing',
    up: { TR: 5000 }, down: { TR: 500 }, upLabel: '5000ms', downLabel: '500ms' },
  { label: 'TE', group: 'Timing',
    up: { TE: 120 }, down: { TE: 10 }, upLabel: '120ms', downLabel: '10ms' },
  { label: 'Flip Angle', group: 'Timing',
    up: { flipAngle: 150 }, down: { flipAngle: 30 }, upLabel: '150°', downLabel: '30°' },
  { label: 'ETL', group: 'Sequence',
    up: { turboFactor: 25 }, down: { turboFactor: 7 }, upLabel: '×25', downLabel: '×7' },
  { label: 'Averages', group: 'Sequence',
    up: { averages: 4 }, down: { averages: 1 }, upLabel: '×4', downLabel: '×1' },
  { label: 'iPAT', group: 'Sequence',
    up: { ipatMode: 'GRAPPA', ipatFactor: 3 }, down: { ipatMode: 'Off', ipatFactor: 1 },
    upLabel: 'GRAPPA×3', downLabel: 'Off' },
  { label: 'Partial Fourier', group: 'Sequence',
    up: { partialFourier: '5/8' }, down: { partialFourier: 'Off' }, upLabel: '5/8', downLabel: 'Off' },
  { label: 'FOV', group: 'Resolution',
    up: { fov: 400 }, down: { fov: 200 }, upLabel: '400mm', downLabel: '200mm' },
  { label: 'Slice Thickness', group: 'Resolution',
    up: { sliceThickness: 5 }, down: { sliceThickness: 1.5 }, upLabel: '5mm', downLabel: '1.5mm' },
  { label: 'Bandwidth', group: 'Resolution',
    up: { bandwidth: 500 }, down: { bandwidth: 100 }, upLabel: '500 Hz/px', downLabel: '100 Hz/px' },
  { label: 'Matrix (Freq)', group: 'Resolution',
    up: { matrixFreq: 512 }, down: { matrixFreq: 256 }, upLabel: '512', downLabel: '256' },
  { label: 'Field Strength', group: 'System',
    up: { fieldStrength: 3.0 }, down: { fieldStrength: 1.5 }, upLabel: '3T', downLabel: '1.5T' },
  { label: 'Fat Sat', group: 'System',
    up: { fatSat: 'SPAIR' }, down: { fatSat: 'None' }, upLabel: 'SPAIR', downLabel: 'None' },
]

const METRICS: { key: keyof Metrics; label: string; lowerIsBetter: boolean; unit: string }[] = [
  { key: 'snr',  label: 'SNR',     lowerIsBetter: false, unit: '' },
  { key: 'sar',  label: 'SAR',     lowerIsBetter: true,  unit: '%' },
  { key: 'time', label: 'Time',    lowerIsBetter: true,  unit: 's' },
  { key: 'blur', label: 'Blur',    lowerIsBetter: true,  unit: '' },
  { key: 'chem', label: 'Chem↔',  lowerIsBetter: true,  unit: 'px' },
]

// ── ヘルパー ─────────────────────────────────────────────────────────────────
function getMetrics(p: ProtocolParams): Metrics {
  return {
    snr:  calcSNR(p),
    sar:  calcSARLevel(p),
    time: calcScanTime(p),
    blur: calcT2Blur(p),
    chem: chemShift(p),
  }
}

function deltaPct(base: number, next: number): number {
  if (base === 0) return 0
  return Math.round(((next - base) / base) * 100)
}

function computeDeltas(base: Metrics, changed: Metrics): SensBar {
  return {
    snr:  deltaPct(base.snr,  changed.snr),
    sar:  deltaPct(base.sar,  changed.sar),
    time: deltaPct(base.time, changed.time),
    blur: deltaPct(base.blur, changed.blur),
    chem: deltaPct(base.chem, changed.chem),
  }
}

function deltaColor(d: number, lowerIsBetter: boolean): string {
  if (Math.abs(d) < 2) return '#374151'
  const good = lowerIsBetter ? d < -5 : d > 5
  const bad  = lowerIsBetter ? d > 5  : d < -5
  if (good) return '#34d399'
  if (bad)  return '#f87171'
  return '#9ca3af'
}

// ── Radar Chart ────────────────────────────────────────────────────────────────
function RadarChart({ base }: { base: Metrics }) {
  const W = 180, H = 160
  const cx = W / 2, cy = H / 2, R = 62

  // Normalize each metric to 0-1 score (1 = best)
  const scores = {
    snr:  Math.min(1, base.snr / 100),
    sar:  Math.max(0, 1 - base.sar / 100),
    time: Math.max(0, 1 - Math.min(base.time, 600) / 600),
    blur: Math.min(1, base.blur),
    chem: Math.max(0, 1 - base.chem / 6),
  }

  const AXES = [
    { key: 'snr' as const,  label: 'SNR',     angle: -90 },
    { key: 'sar' as const,  label: 'SAR低',   angle: -18 },
    { key: 'time' as const, label: 'Time短',  angle: 54  },
    { key: 'blur' as const, label: 'Blur低',  angle: 126 },
    { key: 'chem' as const, label: 'CS低',    angle: 198 },
  ]

  const toXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy + r * Math.sin((angle * Math.PI) / 180),
  })

  // Build polygon points
  const polygon = AXES.map(a => {
    const r = scores[a.key] * R
    const pt = toXY(a.angle, r)
    return `${pt.x},${pt.y}`
  }).join(' ')

  // Outer grid lines
  const gridLines = [0.25, 0.5, 0.75, 1.0].map(scale => {
    const pts = AXES.map(a => {
      const pt = toXY(a.angle, R * scale)
      return `${pt.x},${pt.y}`
    }).join(' ')
    return { pts, scale }
  })

  return (
    <div className="mx-3 mt-2 p-2 rounded flex flex-col items-center" style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}>
      <div className="text-xs mb-1 font-semibold self-start" style={{ color: '#4b5563' }}>プロトコル プロファイル</div>
      <svg width={W} height={H}>
        {/* Spokes */}
        {AXES.map(a => {
          const outer = toXY(a.angle, R)
          return (
            <line key={a.key} x1={cx} y1={cy} x2={outer.x} y2={outer.y}
              stroke="#252525" strokeWidth={1} />
          )
        })}

        {/* Grid polygons */}
        {gridLines.map(({ pts, scale }) => (
          <polygon key={scale} points={pts} fill="none" stroke="#1e1e1e" strokeWidth={scale === 1 ? 1 : 0.5} />
        ))}

        {/* Score polygon */}
        <polygon points={polygon} fill="#e88b0025" stroke="#e88b00" strokeWidth={1.5} />

        {/* Axis labels */}
        {AXES.map(a => {
          const labelR = R + 14
          const pt = toXY(a.angle, labelR)
          const score = scores[a.key]
          const color = score > 0.7 ? '#34d399' : score > 0.4 ? '#fbbf24' : '#f87171'
          return (
            <text key={a.key} x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="middle"
              fill={color} style={{ fontSize: '8px', fontWeight: 600 }}>
              {a.label}
            </text>
          )
        })}

        {/* Score dots */}
        {AXES.map(a => {
          const r = scores[a.key] * R
          const pt = toXY(a.angle, r)
          const score = scores[a.key]
          const color = score > 0.7 ? '#34d399' : score > 0.4 ? '#fbbf24' : '#f87171'
          return (
            <circle key={a.key} cx={pt.x} cy={pt.y} r={3} fill={color} />
          )
        })}
      </svg>
      <div className="flex gap-2 mt-1" style={{ fontSize: '7px', color: '#374151' }}>
        <span>外側 = 最良</span>
        <span style={{ color: '#34d399' }}>■ &gt;70%</span>
        <span style={{ color: '#fbbf24' }}>■ 40-70%</span>
        <span style={{ color: '#f87171' }}>■ &lt;40%</span>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export function WhatIfPanel() {
  const { params } = useProtocolStore()

  const base = useMemo(() => getMetrics(params), [params])

  const rows = useMemo<ComputedRow[]>(() => ROWS.map(row => {
    const upMetrics   = getMetrics({ ...params, ...row.up }   as ProtocolParams)
    const downMetrics = getMetrics({ ...params, ...row.down } as ProtocolParams)
    return {
      ...row,
      upDelta:   computeDeltas(base, upMetrics),
      downDelta: computeDeltas(base, downMetrics),
    }
  }), [params, base])

  const groups = [...new Set(ROWS.map(r => r.group))]

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#0e0e0e' }}>
      {/* Header */}
      <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #252525' }}>
        <div className="text-xs font-semibold" style={{ color: '#e88b00' }}>What-if Analyzer</div>
        <div className="text-xs mt-0.5" style={{ color: '#4b5563' }}>
          パラメータ変更の影響を5指標で比較
        </div>
      </div>

      {/* Radar Chart */}
      <RadarChart base={base} />

      {/* Baseline */}
      <div className="mx-3 mt-2 mb-1 p-2 rounded" style={{ background: '#111', border: '1px solid #252525' }}>
        <div className="text-xs mb-1.5 font-semibold" style={{ color: '#6b7280' }}>現在のベースライン</div>
        <div className="flex gap-3 flex-wrap">
          {METRICS.map(m => (
            <div key={m.key} className="flex flex-col items-center">
              <span style={{ color: '#4b5563', fontSize: '9px' }}>{m.label}</span>
              <span className="font-mono font-bold" style={{ color: '#c8ccd6', fontSize: '11px' }}>
                {base[m.key]}{m.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 px-3 mb-1" style={{ color: '#374151', fontSize: '9px' }}>
        <span><span style={{ color: '#34d399' }}>緑</span>=改善</span>
        <span><span style={{ color: '#f87171' }}>赤</span>=悪化</span>
        <span>↑=高値, ↓=低値に変更</span>
      </div>

      {/* Groups */}
      {groups.map(group => (
        <div key={group}>
          <div className="px-3 py-0.5 text-xs font-semibold uppercase tracking-wider"
            style={{
              background: '#111', color: '#4b5563',
              borderTop: '1px solid #252525', borderBottom: '1px solid #1a1a1a',
              fontSize: '9px',
            }}>
            {group}
          </div>
          {rows.filter(r => r.group === group).map(row => (
            <RowView key={row.label} row={row} />
          ))}
        </div>
      ))}

      {/* Footer note */}
      <div className="mx-3 mt-3 mb-4 p-2.5 rounded text-xs" style={{ background: '#111', border: '1px solid #1a2a1a' }}>
        <div className="font-semibold mb-1" style={{ color: '#34d399', fontSize: '10px' }}>MRI 最適化の三角トレードオフ</div>
        <div style={{ color: '#6b7280', fontSize: '9px', lineHeight: '1.5' }}>
          SNR ↑ → 時間↑ or 分解能↓<br />
          SAR ↓ → ETL↓ or FA↓<br />
          Time ↓ → SNR↓ or iPAT↑（g-factor noise↑）
        </div>
      </div>
    </div>
  )
}

// ── 行コンポーネント ─────────────────────────────────────────────────────────
function RowView({ row }: { row: ComputedRow }) {
  return (
    <div style={{ borderBottom: '1px solid #1a1a1a' }}>
      {/* 行ヘッダー */}
      <div className="flex items-center justify-between px-3 py-0.5" style={{ background: '#0f0f0f' }}>
        <span style={{ color: '#c8ccd6', fontSize: '10px', fontWeight: 500 }}>{row.label}</span>
        <div style={{ color: '#374151', fontSize: '8px' }}>
          ↑{row.upLabel} / ↓{row.downLabel}
        </div>
      </div>

      {/* Delta テーブル */}
      <div className="px-3 pb-1">
        <table className="w-full">
          <thead>
            <tr style={{ color: '#2d3748', fontSize: '8px' }}>
              <td className="py-0.5 w-5" />
              {METRICS.map(m => (
                <td key={m.key} className="text-center py-0.5">{m.label}</td>
              ))}
            </tr>
          </thead>
          <tbody>
            {(['up', 'down'] as const).map(dir => {
              const delta = dir === 'up' ? row.upDelta : row.downDelta
              return (
                <tr key={dir}>
                  <td style={{ color: '#6b7280', fontSize: '9px', fontWeight: 700 }}>
                    {dir === 'up' ? '↑' : '↓'}
                  </td>
                  {METRICS.map(m => {
                    const d = delta[m.key]
                    const neutral = Math.abs(d) < 2
                    return (
                      <td key={m.key} className="text-center py-0.5"
                        style={{
                          color: neutral ? '#252525' : deltaColor(d, m.lowerIsBetter),
                          fontSize: '9px',
                          fontFamily: 'monospace',
                          fontWeight: neutral ? 400 : 600,
                        }}>
                        {neutral ? '—' : (d > 0 ? `+${d}` : `${d}`)}%
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
