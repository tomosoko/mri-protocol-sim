import { useMemo } from 'react'

// PACE ナビゲーター波形: 横隔膜位置と収集ウィンドウを可視化
export function RespWaveformDiagram({ acceptancePct }: { acceptancePct: number }) {
  const W = 300, H = 80
  const PAD = { l: 8, r: 8, t: 10, b: 20 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  // Simulate 4 respiratory cycles
  const N = 200
  const pts = useMemo(() => Array.from({ length: N }, (_, i) => {
    const t = i / N
    // Irregular breathing: combination of 2 sine waves + slight variation
    const breath = Math.sin(t * Math.PI * 8) * 0.45 +
                   Math.sin(t * Math.PI * 8.3 + 0.5) * 0.08 +
                   Math.sin(t * Math.PI * 2.1) * 0.06
    return { t, y: breath }
  }), [])

  const yMin = Math.min(...pts.map(p => p.y))
  const yMax = Math.max(...pts.map(p => p.y))
  const yRange = yMax - yMin

  // End-expiration is near yMin (diaphragm highest position = patient end-exhale)
  const endExpiration = yMin + yRange * 0.15
  const windowHalfPct = acceptancePct / 100
  const windowTop = endExpiration + yRange * windowHalfPct * 0.4
  const windowBot = endExpiration - yRange * windowHalfPct * 0.15

  const toSVGY = (v: number) => PAD.t + innerH - ((v - yMin) / yRange) * innerH
  const toSVGX = (t: number) => PAD.l + t * innerW

  const path = pts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${toSVGX(p.t).toFixed(1)},${toSVGY(p.y).toFixed(1)}`
  ).join(' ')

  const winY1 = toSVGY(windowTop)
  const winY2 = toSVGY(windowBot)
  const centerY = toSVGY(endExpiration)

  // Points inside acceptance window
  const acceptedPts = pts.filter(p => p.y >= windowBot && p.y <= windowTop)
  const efficiency = Math.round((acceptedPts.length / pts.length) * 100)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080808', border: '1px solid #1a1a1a' }}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: '9px', color: '#4b5563' }}>PACE ナビゲーター波形 (横隔膜位置)</span>
        <span className="font-mono" style={{ fontSize: '9px', color: efficiency > 65 ? '#34d399' : efficiency > 45 ? '#fbbf24' : '#f87171' }}>
          効率 ~{efficiency}%
        </span>
      </div>
      <svg width={W} height={H}>
        {/* Acceptance window */}
        <rect x={PAD.l} y={winY1} width={innerW} height={Math.max(0, winY2 - winY1)}
          fill="#34d39915" stroke="#34d39940" strokeWidth={0.5} />
        {/* Center line (end-expiration target) */}
        <line x1={PAD.l} y1={centerY} x2={PAD.l + innerW} y2={centerY}
          stroke="#34d399" strokeWidth={0.8} strokeDasharray="4,3" opacity={0.6} />

        {/* Accepted segments (colored) */}
        {pts.map((p, i) => {
          if (i === 0) return null
          const inWindow = p.y >= windowBot && p.y <= windowTop
          const prevIn = pts[i-1].y >= windowBot && pts[i-1].y <= windowTop
          if (!inWindow && !prevIn) return null
          return (
            <line
              key={i}
              x1={toSVGX(pts[i-1].t)} y1={toSVGY(pts[i-1].y)}
              x2={toSVGX(p.t)} y2={toSVGY(p.y)}
              stroke="#34d399" strokeWidth={1.8} opacity={0.9}
            />
          )
        })}

        {/* Respiratory waveform (dimmed) */}
        <path d={path} fill="none" stroke="#3b82f6" strokeWidth={1.2} opacity={0.5} />

        {/* Labels */}
        <text x={PAD.l + 2} y={winY1 - 2} fill="#34d399" style={{ fontSize: '7px' }}>ウィンドウ上限</text>
        <text x={PAD.l + 2} y={winY2 + 8} fill="#34d399" style={{ fontSize: '7px' }}>下限</text>
        <text x={PAD.l} y={H - 5} fill="#374151" style={{ fontSize: '7px' }}>呼吸周期 (時間→)</text>
        <text x={W - PAD.r} y={centerY - 3} textAnchor="end" fill="#34d39980" style={{ fontSize: '7px' }}>呼気末</text>
      </svg>
      <div style={{ fontSize: '8px', color: '#4b5563', marginTop: '2px' }}>
        緑=収集ウィンドウ内（採用）/ 青=呼吸波形 / 収集効率={efficiency}%
      </div>
    </div>
  )
}
