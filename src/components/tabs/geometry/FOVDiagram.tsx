import { useProtocolStore } from '../../../store/protocolStore'

// ── FOV ダイアグラム ──────────────────────────────────────────────────────────
export function FOVDiagram() {
  const { params } = useProtocolStore()

  const W = 220  // SVGの表示幅
  const H = 160
  const PAD = 20

  const fovPhase = params.fov * (params.phaseResolution / 100)
  const ovsFov   = fovPhase * (1 + params.phaseOversampling / 100)
  const maxDim   = Math.max(params.fov, ovsFov, 10)

  const scale   = (W - PAD * 2) / maxDim
  const readW   = params.fov * scale
  const phaseH  = fovPhase * scale
  const ovsH    = ovsFov * scale

  const cx = W / 2
  const cy = H / 2

  const isPhaseAP = params.phaseEncDir === 'A>>P' || params.phaseEncDir === 'P>>A'
  const phaseLabel = isPhaseAP ? 'A-P (Phase)' : 'R-L (Phase)'
  const readLabel  = isPhaseAP ? 'R-L (Read)' : 'A-P (Read)'

  // 位相オーバーサンプリング部分を淡色で表示
  const ovsExtraH = (ovsH - phaseH) / 2

  return (
    <div className="mx-3 mt-2 mb-1 p-2 rounded" style={{ background: '#0a0a0a', border: '1px solid #252525' }}>
      <div className="text-xs mb-1.5 font-semibold" style={{ color: '#4b5563' }}>FOV ダイアグラム</div>
      <svg width={W} height={H} style={{ display: 'block' }}>
        {/* Phase oversampling region */}
        {params.phaseOversampling > 0 && (
          <rect
            x={cx - readW / 2}
            y={cy - ovsH / 2}
            width={readW}
            height={ovsH}
            fill="#1a2a1a"
            stroke="#254525"
            strokeWidth={1}
            strokeDasharray="3,2"
          />
        )}

        {/* Main FOV box */}
        <rect
          x={cx - readW / 2}
          y={cy - phaseH / 2}
          width={readW}
          height={phaseH}
          fill="#142814"
          stroke="#4ade80"
          strokeWidth={1.5}
        />

        {/* Read direction arrow + label */}
        <line x1={cx - readW / 2 - 4} y1={H - 8} x2={cx + readW / 2 + 4} y2={H - 8}
          stroke="#60a5fa" strokeWidth={1} markerEnd="url(#arrowR)" />
        <text x={cx} y={H - 1} textAnchor="middle" fill="#60a5fa"
          style={{ fontSize: '8px', fontFamily: 'monospace' }}>
          {readLabel}: {params.fov}mm
        </text>

        {/* Phase direction arrow + label */}
        <line x1={PAD - 8} y1={cy - phaseH / 2 - 3} x2={PAD - 8} y2={cy + phaseH / 2 + 3}
          stroke="#f59e0b" strokeWidth={1} />
        <text x={4} y={cy} textAnchor="middle" fill="#f59e0b" transform={`rotate(-90, 4, ${cy})`}
          style={{ fontSize: '7px', fontFamily: 'monospace' }}>
          {phaseLabel}: {Math.round(fovPhase)}mm
        </text>

        {/* Oversampling labels */}
        {params.phaseOversampling > 0 && ovsExtraH > 4 && (
          <>
            <text x={cx + readW / 2 + 4} y={cy - phaseH / 2 - ovsExtraH / 2 + 4}
              fill="#4b5563" style={{ fontSize: '7px' }}>
              +{params.phaseOversampling}%
            </text>
            <text x={cx + readW / 2 + 4} y={cy + phaseH / 2 + ovsExtraH / 2 + 4}
              fill="#4b5563" style={{ fontSize: '7px' }}>
              +{params.phaseOversampling}%
            </text>
          </>
        )}

        {/* Voxel size label */}
        <text x={cx} y={cy} textAnchor="middle" fill="#34d399"
          style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 600 }}>
          {(params.fov / params.matrixFreq).toFixed(1)}×
          {(fovPhase / params.matrixPhase).toFixed(1)}×
          {params.sliceThickness.toFixed(1)}mm
        </text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="#4b5563"
          style={{ fontSize: '7px' }}>
          voxel size
        </text>

        {/* Arrow marker */}
        <defs>
          <marker id="arrowR" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto">
            <path d="M0,0 L0,4 L4,2 z" fill="#60a5fa" />
          </marker>
        </defs>
      </svg>

      {/* Stats */}
      <div className="flex justify-between mt-1" style={{ fontSize: '8px', color: '#4b5563' }}>
        <span>Matrix: {params.matrixFreq}×{params.matrixPhase}</span>
        <span>Slices: {params.slices} × {params.sliceThickness}mm</span>
        <span>PhasOvs: {params.phaseOversampling}%</span>
      </div>
    </div>
  )
}
