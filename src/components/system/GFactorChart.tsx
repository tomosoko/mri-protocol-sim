import { useMemo } from 'react'
import { useProtocolStore } from '../../store/protocolStore'

// ── g-factor SNR 損失チャート ─────────────────────────────────────────────────
export function GFactorChart() {
  const { params } = useProtocolStore()

  const W = 290, H = 90
  const PAD = { l: 32, r: 10, t: 10, b: 22 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const maxR = 4

  // g-factor model per coil type: g(R) ≈ 1 + k*(R-1)^exp
  const COIL_G: Record<string, { k: number; e: number; label: string; color: string }> = {
    Head_64:  { k: 0.05, e: 1.5, label: 'Head 64ch', color: '#34d399' },
    Head_20:  { k: 0.08, e: 1.5, label: 'Head 20ch', color: '#60a5fa' },
    Spine_32: { k: 0.10, e: 1.5, label: 'Spine 32ch', color: '#a78bfa' },
    Body:     { k: 0.15, e: 1.8, label: 'Body',      color: '#fb923c' },
    Knee:     { k: 0.18, e: 2.0, label: 'Knee',      color: '#fbbf24' },
    Shoulder: { k: 0.20, e: 2.0, label: 'Shoulder',  color: '#f87171' },
    Flex:     { k: 0.25, e: 2.0, label: 'Flex',      color: '#e88b00' },
  }

  const coilKey = params.coilType ?? 'Body'
  const gCfg = COIL_G[coilKey] ?? COIL_G.Body

  // SNR efficiency = 1 / (sqrt(R) * g(R))  normalized to R=1 → 1.0
  const gFn = (r: number) => 1 + gCfg.k * Math.pow(r - 1, gCfg.e)
  const snrEff = (r: number) => 1 / (Math.sqrt(r) * gFn(r))

  const nPts = 60
  const rVals = Array.from({ length: nPts + 1 }, (_, i) => 1 + (i / nPts) * (maxR - 1))

  const tx = (r: number) => PAD.l + ((r - 1) / (maxR - 1)) * innerW
  const ty = (snr: number) => PAD.t + (1 - snr) * innerH

  const currentR = params.ipatFactor
  const currentG = gFn(currentR)
  const currentSNREff = snrEff(currentR)
  const snrLoss = Math.round((1 - currentSNREff) * 100)

  const dotX = tx(currentR)
  const dotY = ty(currentSNREff)

  // All coil curves for comparison (dimmed)
  const allCurves = useMemo(() => {
    return Object.entries(COIL_G).map(([id, cfg]) => {
      const gf = (r: number) => 1 + cfg.k * Math.pow(r - 1, cfg.e)
      const se = (r: number) => 1 / (Math.sqrt(r) * gf(r))
      const d = rVals.map((r, i) => {
        return `${i === 0 ? 'M' : 'L'}${tx(r).toFixed(1)},${ty(se(r)).toFixed(1)}`
      }).join(' ')
      return { id, d, color: cfg.color, active: id === coilKey }
    })
  }, [coilKey])

  if (params.ipatMode === 'Off') return null

  return (
    <div className="mt-2 rounded overflow-hidden" style={{ background: '#080808', border: '1px solid #1a1a1a' }}>
      <div className="flex items-center justify-between px-2 pt-1.5">
        <span style={{ color: '#4b5563', fontSize: '9px', fontWeight: 600 }}>g-factor SNR損失 ({gCfg.label})</span>
        <div className="flex items-center gap-2" style={{ fontSize: '9px' }}>
          <span style={{ color: '#6b7280' }}>g={currentG.toFixed(2)}</span>
          <span style={{ color: snrLoss > 40 ? '#f87171' : snrLoss > 25 ? '#fbbf24' : '#34d399', fontWeight: 600 }}>
            SNR -{snrLoss}%
          </span>
        </div>
      </div>
      <svg width={W} height={H}>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <line key={v} x1={PAD.l} y1={ty(v)} x2={PAD.l + innerW} y2={ty(v)}
            stroke="#141414" strokeWidth={v === 0.5 ? 1 : 0.5} />
        ))}
        {/* Y-axis labels */}
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <text key={v} x={PAD.l - 3} y={ty(v) + 3} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>
            {Math.round(v * 100)}%
          </text>
        ))}

        {/* All coil curves (dimmed) */}
        {allCurves.map(c => (
          <path key={c.id} d={c.d} fill="none"
            stroke={c.color} strokeWidth={c.active ? 1.5 : 0.5}
            opacity={c.active ? 0.85 : 0.2} />
        ))}

        {/* Current R marker */}
        <line x1={dotX} y1={PAD.t} x2={dotX} y2={PAD.t + innerH}
          stroke="#e88b00" strokeWidth={0.8} strokeDasharray="2,2" />
        <circle cx={dotX} cy={dotY} r={3.5} fill="#e88b00" />
        <text x={dotX + 3} y={dotY - 3} fill="#e88b00" style={{ fontSize: '7px' }}>R={currentR}</text>

        {/* X-axis labels */}
        {[1, 2, 3, 4].map(r => (
          <text key={r} x={tx(r)} y={H - 5} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>R={r}</text>
        ))}
        <text x={PAD.l - 2} y={PAD.t + innerH / 2} textAnchor="end" fill="#374151"
          transform={`rotate(-90, ${PAD.l - 12}, ${PAD.t + innerH / 2})`}
          style={{ fontSize: '7px' }}>SNR効率</text>
      </svg>
      <div className="px-2 pb-1.5 flex flex-wrap gap-x-2" style={{ fontSize: '7px' }}>
        {allCurves.map(c => (
          <span key={c.id} style={{ color: c.active ? c.color : '#252525' }}>{c.id.replace('_', ' ')}</span>
        ))}
      </div>
    </div>
  )
}
