import { useMemo } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import type { ProtocolParams } from '../data/presets'
import {
  type Metrics, type ComputedRow,
  ROWS, METRICS, RANK_COLORS, RANK_LABELS, RANK_BG,
  getMetrics, computeDeltas, deltaColor, calcChangeScore, getDiagnostic,
  type OptimizationCandidate,
} from './whatif/whatIfUtils'

// ── Radar Chart ────────────────────────────────────────────────────────────────
function RadarChart({ base }: { base: Metrics }) {
  const W = 200, H = 180
  const cx = W / 2, cy = H / 2, R = 68

  // Normalize each metric to 0-1 score (1 = best)
  const scores = {
    snr:  Math.min(1, base.snr / 100),
    sar:  Math.max(0, 1 - base.sar / 100),
    time: Math.max(0, 1 - Math.min(base.time, 600) / 600),
    blur: Math.min(1, base.blur),
    chem: Math.max(0, 1 - base.chem / 6),
  }

  // Overall score (weighted average)
  const overallScore = (
    scores.snr  * 0.35 +
    scores.sar  * 0.20 +
    scores.time * 0.25 +
    scores.blur * 0.10 +
    scores.chem * 0.10
  )
  const fillColor = overallScore > 0.65
    ? '#4ade8030'
    : overallScore > 0.40
    ? '#fbbf2430'
    : '#f8717130'
  const strokeColor = overallScore > 0.65
    ? '#4ade80'
    : overallScore > 0.40
    ? '#fbbf24'
    : '#f87171'

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
      <div className="w-full flex items-center justify-between mb-1">
        <div className="text-xs font-semibold" style={{ color: '#4b5563' }}>プロトコル プロファイル</div>
        <div className="text-xs font-bold px-1.5 py-0.5 rounded" style={{
          background: overallScore > 0.65 ? '#4ade8020' : overallScore > 0.40 ? '#fbbf2420' : '#f8717120',
          color: strokeColor,
          fontSize: '9px',
        }}>
          総合 {Math.round(overallScore * 100)}%
        </div>
      </div>
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

        {/* Score polygon — color based on overall score */}
        <polygon points={polygon} fill={fillColor} stroke={strokeColor} strokeWidth={1.5} />

        {/* Axis labels at endpoint with score value */}
        {AXES.map(a => {
          const labelR = R + 16
          const pt = toXY(a.angle, labelR)
          const score = scores[a.key]
          const color = score > 0.7 ? '#34d399' : score > 0.4 ? '#fbbf24' : '#f87171'
          // value label just inside/at the endpoint
          const valPt = toXY(a.angle, R + 1)
          return (
            <g key={a.key}>
              <text x={pt.x} y={pt.y} textAnchor="middle" dominantBaseline="middle"
                fill={color} style={{ fontSize: '8px', fontWeight: 600 }}>
                {a.label}
              </text>
              {/* Value label at axis endpoint */}
              <text
                x={valPt.x + (Math.cos((a.angle * Math.PI) / 180) * 5)}
                y={valPt.y + (Math.sin((a.angle * Math.PI) / 180) * 5)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color}
                style={{ fontSize: '7px', fontWeight: 700 }}
              >
                {Math.round(score * 100)}
              </text>
            </g>
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

// ── 最適化提案コンポーネント ──────────────────────────────────────────────────
function OptimizationSection({ rows }: { rows: ComputedRow[] }) {
  const candidates = useMemo<OptimizationCandidate[]>(() => {
    const all: OptimizationCandidate[] = []
    for (const row of rows) {
      const upScore   = calcChangeScore(row.upDelta)
      const downScore = calcChangeScore(row.downDelta)
      all.push({
        label: row.label,
        dir: 'up',
        dirLabel: `↑ ${row.upLabel}`,
        score: upScore,
        snrDelta: row.upDelta.snr,
        timeDelta: row.upDelta.time,
        sarDelta: row.upDelta.sar,
      })
      all.push({
        label: row.label,
        dir: 'down',
        dirLabel: `↓ ${row.downLabel}`,
        score: downScore,
        snrDelta: row.downDelta.snr,
        timeDelta: row.downDelta.time,
        sarDelta: row.downDelta.sar,
      })
    }
    // Sort descending by score, take top 3 positives
    return all
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [rows])

  if (candidates.length === 0) {
    return (
      <div className="mx-3 mt-3 p-2.5 rounded" style={{ background: '#111', border: '1px solid #252525' }}>
        <div className="text-xs font-semibold mb-1" style={{ color: '#e88b00', fontSize: '10px' }}>最適化提案</div>
        <div style={{ color: '#4b5563', fontSize: '9px' }}>現在のパラメータは既に最適化されています。</div>
      </div>
    )
  }

  return (
    <div className="mx-3 mt-3 rounded overflow-hidden" style={{ border: '1px solid #252525' }}>
      <div className="px-2.5 py-1.5" style={{ background: '#111', borderBottom: '1px solid #252525' }}>
        <div className="text-xs font-semibold" style={{ color: '#e88b00', fontSize: '10px' }}>
          最適化提案 — スコア上位3件
        </div>
        <div style={{ color: '#4b5563', fontSize: '8px', marginTop: '1px' }}>
          score = SNR×0.4 − 時間×0.3 − SAR×0.2 − Blur×0.1
        </div>
      </div>
      {candidates.map((c, i) => (
        <div key={`${c.label}-${c.dir}`}
          className="px-2.5 py-1.5"
          style={{
            background: RANK_BG[i],
            borderBottom: i < candidates.length - 1 ? '1px solid #1a1a1a' : 'none',
          }}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-bold" style={{ color: RANK_COLORS[i], fontSize: '9px', minWidth: '20px' }}>
              {RANK_LABELS[i]}
            </span>
            <span className="font-semibold" style={{ color: '#c8ccd6', fontSize: '10px' }}>
              {c.label}
            </span>
            <span style={{ color: '#6b7280', fontSize: '9px' }}>{c.dirLabel}</span>
            <span className="ml-auto font-mono font-bold" style={{ color: RANK_COLORS[i], fontSize: '9px' }}>
              +{c.score.toFixed(1)}pt
            </span>
          </div>
          <div className="flex gap-2" style={{ fontSize: '8px' }}>
            <span style={{ color: c.snrDelta > 0 ? '#34d399' : '#f87171' }}>
              SNR {c.snrDelta > 0 ? '+' : ''}{c.snrDelta}%
            </span>
            <span style={{ color: c.timeDelta > 0 ? '#f87171' : '#34d399' }}>
              時間 {c.timeDelta > 0 ? '+' : ''}{c.timeDelta}%
            </span>
            <span style={{ color: c.sarDelta > 0 ? '#f87171' : '#34d399' }}>
              SAR {c.sarDelta > 0 ? '+' : ''}{c.sarDelta}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 現在の課題診断ボックス ────────────────────────────────────────────────────
function DiagnosticBox({ base }: { base: Metrics }) {
  const diag = useMemo(() => getDiagnostic(base), [base])

  const severity = diag.score < 0.3 ? 'critical' : diag.score < 0.55 ? 'warning' : 'ok'
  const borderColor = severity === 'critical' ? '#f87171' : severity === 'warning' ? '#fbbf24' : '#4ade80'
  const bgColor     = severity === 'critical' ? '#f8717110' : severity === 'warning' ? '#fbbf2410' : '#4ade8010'
  const icon        = severity === 'critical' ? '⚠' : severity === 'warning' ? '⚡' : '✓'

  return (
    <div className="mx-3 mt-2 px-2.5 py-2 rounded" style={{ background: bgColor, border: `1px solid ${borderColor}` }}>
      <div className="flex items-start gap-1.5">
        <span style={{ fontSize: '11px' }}>{icon}</span>
        <div>
          <span className="font-bold" style={{ color: borderColor, fontSize: '9px' }}>
            {diag.dimension}が{severity === 'ok' ? '良好' : '低い'}
          </span>
          <span style={{ color: '#9ca3af', fontSize: '9px' }}>
            {severity !== 'ok' ? ` → ${diag.advice}` : ' — プロトコルは良好な状態です'}
          </span>
        </div>
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

      {/* 現在の課題診断 */}
      <DiagnosticBox base={base} />

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

      {/* 最適化提案 */}
      <OptimizationSection rows={rows} />

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
