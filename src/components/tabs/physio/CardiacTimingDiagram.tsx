// 心拍タイミング図: ECG波形・収縮期/拡張期・トリガー遅延ウィンドウを可視化
export function CardiacTimingDiagram({ rrInterval, triggerDelay }: { rrInterval: number; triggerDelay: number }) {
  const W = 300, H = 72
  const PAD = { l: 8, r: 8, t: 8, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const tx = (t: number) => PAD.l + (t / rrInterval) * innerW
  const baseY = PAD.t + innerH * 0.65

  // ECG waveform: simplified P-QRS-T complex
  const ecgPts = (rr: number) => {
    // Normalized 0-1 timepoints for key ECG features
    const pts: [number, number][] = [
      [0, 0],        // baseline start
      [0.08, 0.03],  // P wave start
      [0.12, 0.12],  // P wave peak
      [0.16, 0.03],  // P wave end
      [0.20, 0.01],  // PR segment
      [0.24, -0.08], // Q
      [0.26, 0.80],  // R peak
      [0.28, -0.15], // S
      [0.30, -0.01], // J point
      [0.38, 0.20],  // T wave
      [0.48, 0.18],
      [0.55, 0.02],  // T end
      [1.00, 0.00],  // next beat start
    ]
    return pts.map(([t, amp]) => {
      const x = PAD.l + (t * rr / rrInterval) * innerW
      const y = baseY - amp * innerH * 0.9
      return [x, y] as [number, number]
    })
  }

  const pts = ecgPts(rrInterval)
  const ecgPath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  // Acquisition window at trigger delay (simplified ~100ms window)
  const acqStart = triggerDelay
  const acqEnd = Math.min(triggerDelay + 120, rrInterval * 0.95)
  const acqX1 = tx(acqStart)
  const acqX2 = tx(acqEnd)

  // Systole / Diastole regions (rough approximation)
  const systoleEnd = rrInterval * 0.35

  return (
    <div className="mt-2 rounded overflow-hidden" style={{ background: '#080808', border: '1px solid #1a1a1a' }}>
      <div className="px-2 pt-1" style={{ fontSize: '9px', color: '#4b5563' }}>
        心電図 タイミング (RR={rrInterval}ms)
      </div>
      <svg width={W} height={H}>
        {/* Systole / Diastole bands */}
        <rect x={PAD.l} y={PAD.t} width={tx(systoleEnd) - PAD.l} height={innerH}
          fill="#f8717108" />
        <rect x={tx(systoleEnd)} y={PAD.t} width={innerW - (tx(systoleEnd) - PAD.l)} height={innerH}
          fill="#34d39908" />
        <text x={PAD.l + (tx(systoleEnd) - PAD.l) / 2} y={PAD.t + 6}
          textAnchor="middle" fill="#f87171" style={{ fontSize: '7px' }}>収縮期</text>
        <text x={tx(systoleEnd) + (innerW - (tx(systoleEnd) - PAD.l)) / 2} y={PAD.t + 6}
          textAnchor="middle" fill="#34d399" style={{ fontSize: '7px' }}>拡張期</text>

        {/* Baseline */}
        <line x1={PAD.l} y1={baseY} x2={PAD.l + innerW} y2={baseY}
          stroke="#252525" strokeWidth={0.5} />

        {/* ECG trace */}
        <path d={ecgPath} fill="none" stroke="#34d399" strokeWidth={1.5} />

        {/* Trigger delay acquisition window */}
        <rect x={acqX1} y={PAD.t + 2} width={Math.max(0, acqX2 - acqX1)} height={innerH - 2}
          fill="#e88b0020" stroke="#e88b00" strokeWidth={0.8} strokeDasharray="2,2" />
        <text x={(acqX1 + acqX2) / 2} y={H - 5} textAnchor="middle"
          fill="#e88b00" style={{ fontSize: '7px' }}>TD={triggerDelay}ms</text>

        {/* RR markers */}
        <text x={PAD.l} y={H - 5} fill="#374151" style={{ fontSize: '7px' }}>R</text>
        <text x={PAD.l + innerW} y={H - 5} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>R</text>
      </svg>
    </div>
  )
}
