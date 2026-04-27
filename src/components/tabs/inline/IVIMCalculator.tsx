import { useMemo } from 'react'

// IVIM モデル計算機 (Intravoxel Incoherent Motion)
export function IVIMCalculator({ bValues }: { bValues: number[] }) {
  const sortedB = [...bValues].sort((a, z) => a - z)
  const maxB = Math.max(...sortedB)
  const hasLowB = sortedB.some(b => b > 0 && b < 200)

  // Simulate tissue ADC values for different tissues at the given b-values
  const tissues = [
    { label: '正常肝', D: 1.1, Dstar: 12, f: 0.18, color: '#fb923c' },
    { label: 'HCC', D: 0.95, Dstar: 8, f: 0.12, color: '#f87171' },
    { label: '肝嚢胞', D: 2.8, Dstar: 20, f: 0.05, color: '#38bdf8' },
    { label: '前立腺PZ', D: 1.6, Dstar: 15, f: 0.20, color: '#a78bfa' },
    { label: '前立腺Ca', D: 0.75, Dstar: 6, f: 0.10, color: '#f43f5e' },
  ]

  // IVIM signal model: S(b)/S0 = f*exp(-b*(D+D*)) + (1-f)*exp(-b*D)
  const ivimSignal = (b: number, D: number, Dstar: number, f: number) =>
    f * Math.exp(-b * (D + Dstar) / 1000) + (1 - f) * Math.exp(-b * D / 1000)

  const W = 270, H = 80
  const PAD = { l: 28, r: 8, t: 6, b: 18 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const bMax = Math.max(maxB, 1000)
  const nPts = 60
  const bPts = Array.from({ length: nPts }, (_, i) => (i / (nPts - 1)) * bMax)

  const tx = (b: number) => PAD.l + (b / bMax) * innerW
  const ty = (s: number) => PAD.t + (1 - Math.max(0, Math.min(1, s))) * innerH

  const paths = useMemo(() => tissues.map(t => {
    const d = bPts.map((b, i) => {
      const s = ivimSignal(b, t.D, t.Dstar, t.f)
      return `${i === 0 ? 'M' : 'L'}${tx(b).toFixed(1)},${ty(s).toFixed(1)}`
    }).join(' ')
    return { ...t, d }
  }), [bValues])

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0e14', border: '1px solid #1a2a3a' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#60a5fa', fontSize: '9px' }}>IVIM モデル (b値別信号予測)</span>
        {!hasLowB && <span style={{ color: '#f87171', fontSize: '8px' }}>⚠ 低b値(＜200)が必要</span>}
      </div>

      <svg width={W} height={H}>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <line key={v} x1={PAD.l} y1={ty(v)} x2={PAD.l + innerW} y2={ty(v)}
            stroke="#1a1a1a" strokeWidth={1} />
        ))}
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} stroke="#252525" strokeWidth={1} />
        <text x={PAD.l - 2} y={PAD.t + 4} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>1.0</text>
        <text x={PAD.l - 2} y={PAD.t + innerH} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>0</text>
        <text x={PAD.l + innerW / 2} y={H - 2} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>b値 (s/mm²)</text>

        {/* b-value markers */}
        {sortedB.map(b => (
          <line key={b} x1={tx(b)} y1={PAD.t} x2={tx(b)} y2={PAD.t + innerH}
            stroke="#e88b00" strokeWidth={1} strokeDasharray="2,2" opacity={0.5} />
        ))}

        {/* Tissue curves */}
        {paths.map(t => (
          <path key={t.label} d={t.d} fill="none" stroke={t.color} strokeWidth={1.2} opacity={0.8} />
        ))}

        {/* b-axis labels */}
        {[0, 500, 1000].filter(b => b <= bMax).map(b => (
          <text key={b} x={tx(b)} y={H - 4} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>{b}</text>
        ))}
      </svg>

      {/* Legend + IVIM params */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1" style={{ fontSize: '7px' }}>
        {tissues.map(t => (
          <div key={t.label} className="flex items-center gap-1">
            <span style={{ color: t.color }}>—</span>
            <span style={{ color: '#6b7280' }}>{t.label}</span>
            <span className="font-mono" style={{ color: '#374151' }}>D={t.D}</span>
          </div>
        ))}
      </div>
      <div className="mt-1.5 pt-1" style={{ borderTop: '1px solid #111', fontSize: '7px', color: '#374151' }}>
        IVIM: S(b) = f·e^(-b(D+D*)) + (1-f)·e^(-bD) — D=真拡散, D*=擬似拡散, f=灌流分率
      </div>
    </div>
  )
}
