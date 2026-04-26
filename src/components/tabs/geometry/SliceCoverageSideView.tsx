import { useProtocolStore } from '../../../store/protocolStore'

// ── スライス収集 側面図 ───────────────────────────────────────────────────────
// 各スライスの位置・厚み・ギャップをmm単位で側面から可視化
export function SliceCoverageSideView() {
  const { params } = useProtocolStore()

  const nSlices = Math.min(params.slices, 50)
  const thickness = params.sliceThickness
  const gap = Math.max(0, params.sliceGap ?? 0)
  const pitch = thickness + gap
  const totalCoverage = nSlices * pitch - gap  // total extent including slices but not trailing gap

  const W = 280, H = 44
  const PAD = { l: 36, r: 16, t: 6, b: 16 }
  const innerW = W - PAD.l - PAD.r

  // Max displayable coverage (mm)
  const displayMax = Math.max(totalCoverage, 20)
  const tx = (mm: number) => PAD.l + (mm / displayMax) * innerW

  // Center at 0, slices from -totalCoverage/2 to +totalCoverage/2
  const startMm = -totalCoverage / 2

  // Ruler tick spacing
  const tickSpacing = totalCoverage > 200 ? 50 : totalCoverage > 100 ? 20 : totalCoverage > 40 ? 10 : 5

  return (
    <div className="mx-3 mt-1 p-2 rounded" style={{ background: '#070a0c', border: '1px solid #1a2028' }}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ color: '#4b5563', fontSize: '9px', fontWeight: 600 }}>SLICE COVERAGE</span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px' }}>
          <span style={{ color: '#9ca3af' }}>{nSlices}sl × {thickness}mm</span>
          {gap > 0 && <span style={{ color: '#fbbf24' }}>+{gap}mm gap</span>}
          <span className="font-mono font-bold" style={{ color: '#e88b00' }}>{totalCoverage.toFixed(0)}mm</span>
        </div>
      </div>

      <svg width={W} height={H}>
        {/* Center line (isocenter) */}
        <line x1={W/2} y1={PAD.t} x2={W/2} y2={H - PAD.b}
          stroke="#1e2a36" strokeWidth={0.8} strokeDasharray="2,3" />

        {/* Slices */}
        {Array.from({ length: nSlices }, (_, i) => {
          const sliceMm = startMm + i * pitch
          const x1 = tx(sliceMm - startMm)
          const w = Math.max(1, tx(sliceMm - startMm + thickness) - tx(sliceMm - startMm))
          const isMid = Math.abs(sliceMm + thickness / 2) < pitch  // is this near center?
          return (
            <g key={i}>
              <rect x={x1} y={PAD.t + 2} width={w} height={H - PAD.b - PAD.t - 4}
                fill={isMid ? '#e88b0040' : '#1d4a6a40'}
                stroke={isMid ? '#e88b00' : '#1d4a6a'}
                strokeWidth={0.6} />
            </g>
          )
        })}

        {/* Ruler */}
        <line x1={PAD.l} y1={H - PAD.b} x2={PAD.l + innerW} y2={H - PAD.b} stroke="#252525" strokeWidth={0.8} />
        {Array.from({ length: Math.floor(displayMax / tickSpacing) + 1 }, (_, i) => {
          const mm = i * tickSpacing
          const x = tx(mm)
          if (x < PAD.l || x > PAD.l + innerW) return null
          return (
            <g key={i}>
              <line x1={x} y1={H - PAD.b} x2={x} y2={H - PAD.b + 3} stroke="#374151" strokeWidth={0.6} />
              <text x={x} y={H - 1} textAnchor="middle" fill="#374151" style={{ fontSize: '6px' }}>
                {mm === 0 ? '0' : `${Math.round(startMm + mm)}mm`}
              </text>
            </g>
          )
        })}

        {/* Coverage labels */}
        <text x={PAD.l - 2} y={PAD.t + (H - PAD.b - PAD.t) / 2 + 3}
          textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>SL</text>
      </svg>
    </div>
  )
}
