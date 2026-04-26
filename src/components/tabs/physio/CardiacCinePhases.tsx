import { useProtocolStore } from '../../../store/protocolStore'

// 心臓シネ位相計算器: 1 RRに収まる位相数・時間分解能・心筋運動追跡精度を計算
export function CardiacCinePhases({ rrInterval }: { rrInterval: number }) {
  const { params } = useProtocolStore()

  // Typical cine parameters
  const phaseTime = params.TR  // ms per cardiac phase
  const nPhases = Math.floor(rrInterval / phaseTime)  // phases per RR
  const temporal = phaseTime  // ms temporal resolution
  const coverage = Math.round((nPhases * phaseTime / rrInterval) * 100)

  // Wall motion assessment: need ≥20 phases for adequate temporal resolution
  const qualityColor = nPhases >= 20 ? '#34d399' : nPhases >= 15 ? '#fbbf24' : '#f87171'
  const quality = nPhases >= 20 ? 'Excellent' : nPhases >= 15 ? 'Adequate' : 'Poor'

  const W = 280, H = 40
  const PAD = { l: 8, r: 8, t: 6, b: 6 }
  const innerW = W - PAD.l - PAD.r

  // Phase boxes across RR
  const boxW = Math.max(2, (innerW * phaseTime / rrInterval) - 0.5)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0c10', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#f472b6', fontSize: '9px', letterSpacing: '0.05em' }}>
          CINE CARDIAC PHASES
        </span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px' }}>
          <span style={{ color: qualityColor }}>{quality}</span>
          <span className="font-mono font-bold" style={{ color: qualityColor }}>{nPhases} phases</span>
        </div>
      </div>

      {/* Phase timeline across RR */}
      <svg width={W} height={H}>
        {/* RR bar */}
        <rect x={PAD.l} y={PAD.t} width={innerW} height={H - PAD.t - PAD.b}
          fill="#0a0a0a" rx={2} />
        {/* Phase boxes */}
        {Array.from({ length: nPhases }, (_, i) => (
          <rect key={i}
            x={PAD.l + (i / rrInterval) * innerW * phaseTime + 0.5}
            y={PAD.t + 2}
            width={Math.max(1, boxW - 0.5)}
            height={H - PAD.t - PAD.b - 4}
            fill="#f472b630"
            stroke="#f472b670"
            strokeWidth={0.5}
            rx={1}
          />
        ))}
        {/* RR boundary */}
        <rect x={PAD.l} y={PAD.t} width={innerW} height={H - PAD.t - PAD.b}
          fill="none" stroke="#252525" strokeWidth={1} rx={2} />
        {/* Phase label */}
        <text x={PAD.l + 3} y={PAD.t + 8} fill="#f472b6" style={{ fontSize: '7px' }}>
          {temporal}ms/phase
        </text>
        <text x={PAD.l + innerW - 2} y={PAD.t + 8} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>
          RR={rrInterval}ms
        </text>
      </svg>

      <div className="flex gap-3 mt-1" style={{ fontSize: '8px' }}>
        <div><span style={{ color: '#4b5563' }}>Coverage: </span><span style={{ color: '#9ca3af' }}>{coverage}%</span></div>
        <div><span style={{ color: '#4b5563' }}>Temporal: </span><span style={{ color: '#9ca3af' }}>{temporal}ms</span></div>
        <div><span style={{ color: '#4b5563' }}>EF/WM viable: </span><span style={{ color: qualityColor }}>≥{nPhases >= 20 ? '20' : nPhases} req.</span></div>
      </div>
    </div>
  )
}
