import { useMemo } from 'react'

// 心電図トリガーのリアルタイム品質統計: R波検出率・RR変動・ミストリガー
// 3T vECG (Vector ECG) の高精度検出を反映
export function TriggerQualityMonitor({ heartRate, is3T }: { heartRate: number; is3T: boolean }) {
  const rrBase = Math.round(60000 / heartRate)

  // Simulate RR interval variability (HRV)
  const rrVariability = useMemo(() => {
    const n = 20
    const seed = heartRate * 7
    return Array.from({ length: n }, (_, i) => {
      const jitter = Math.sin(i * 1.73 + seed) * 18 + Math.cos(i * 3.14 + seed * 0.5) * 12
      return Math.round(rrBase + jitter)
    })
  }, [rrBase, heartRate])

  const rrMean = Math.round(rrVariability.reduce((a, b) => a + b, 0) / rrVariability.length)
  const rrSd = Math.round(Math.sqrt(rrVariability.reduce((s, v) => s + (v - rrMean) ** 2, 0) / rrVariability.length))
  const rrMin = Math.min(...rrVariability)
  const rrMax = Math.max(...rrVariability)

  // Trigger accept rate: 3T vECG has better discrimination
  const arrhythmia = rrSd > 40
  const missRate = is3T ? (arrhythmia ? 0.05 : 0.02) : (arrhythmia ? 0.12 : 0.04)
  const acceptRate = Math.round((1 - missRate) * 100)
  const missedCount = Math.round(20 * missRate)

  // R-wave amplitude (mV) — affected by 3T magnetohydrodynamic effect
  const rAmp = is3T ? (1.2 + (rrSd / 100) * 0.3).toFixed(1) : (1.8 + (rrSd / 100) * 0.2).toFixed(1)

  const W = 200, H = 40
  const rrRange = rrMax - rrMin + 10

  // Accept color
  const acceptColor = acceptRate >= 95 ? '#34d399' : acceptRate >= 85 ? '#fbbf24' : '#f87171'
  const mhdWarning = is3T && parseFloat(rAmp) < 1.5

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#060a0a', border: `1px solid ${acceptRate < 85 ? '#7c1d1d30' : '#1a2a20'}` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#34d399', fontSize: '9px', letterSpacing: '0.05em' }}>
          ECG TRIGGER QUALITY
        </span>
        <span style={{ fontSize: '7px', color: '#374151', fontFamily: 'monospace' }}>
          {is3T ? 'vECG (Vector)' : 'Standard ECG'}
        </span>
      </div>

      {/* RR interval mini-chart */}
      <svg width={W} height={H} style={{ display: 'block', marginBottom: 6 }}>
        <rect width={W} height={H} fill="#030808" rx={2} />
        {/* Mean line */}
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#1a2a20" strokeWidth={0.5} strokeDasharray="2,2" />
        {/* RR bars */}
        {rrVariability.map((rr, i) => {
          const x = (i / (rrVariability.length - 1)) * (W - 4) + 2
          const h = ((rr - rrMin) / rrRange) * (H - 8) + 4
          const accepted = i >= missedCount  // first few are "missed" for visualization
          return (
            <line key={i}
              x1={x} y1={H} x2={x} y2={H - h}
              stroke={accepted ? acceptColor : '#7f1d1d'}
              strokeWidth={accepted ? 1.5 : 1}
              opacity={accepted ? 0.7 : 0.4}
            />
          )
        })}
        {/* Labels */}
        <text x={2} y={8} fontSize="5.5" fill="#1a3a20" fontFamily="monospace">RR(ms)</text>
        <text x={W - 2} y={8} textAnchor="end" fontSize="5.5" fill="#1a3a20" fontFamily="monospace">{rrMax}</text>
        <text x={W - 2} y={H - 2} textAnchor="end" fontSize="5.5" fill="#1a3a20" fontFamily="monospace">{rrMin}</text>
      </svg>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-x-2" style={{ fontSize: '7.5px' }}>
        <div className="flex flex-col">
          <span style={{ color: '#374151' }}>Accept Rate</span>
          <span className="font-mono font-bold" style={{ color: acceptColor }}>{acceptRate}%</span>
        </div>
        <div className="flex flex-col">
          <span style={{ color: '#374151' }}>RR ± SD</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{rrMean}±{rrSd}ms</span>
        </div>
        <div className="flex flex-col">
          <span style={{ color: '#374151' }}>R Amp</span>
          <span className="font-mono" style={{ color: mhdWarning ? '#fbbf24' : '#9ca3af' }}>{rAmp} mV</span>
        </div>
        <div className="flex flex-col">
          <span style={{ color: '#374151' }}>Missed</span>
          <span className="font-mono" style={{ color: missedCount > 2 ? '#f87171' : '#4b5563' }}>{missedCount}/20</span>
        </div>
        <div className="flex flex-col">
          <span style={{ color: '#374151' }}>HR var</span>
          <span className="font-mono" style={{ color: arrhythmia ? '#fbbf24' : '#4b5563' }}>
            {arrhythmia ? '⚠ 不整' : '正常'}
          </span>
        </div>
        <div className="flex flex-col">
          <span style={{ color: '#374151' }}>HR</span>
          <span className="font-mono" style={{ color: '#34d399' }}>{heartRate} bpm</span>
        </div>
      </div>

      {mhdWarning && (
        <div className="mt-1 pt-1" style={{ borderTop: '1px solid #1a2a20', fontSize: '7px', color: '#fbbf24' }}>
          ⚠ 3T 磁気流体力学効果 (MHD): R波振幅低下。vECG + Delay=30msを推奨。
        </div>
      )}
    </div>
  )
}
