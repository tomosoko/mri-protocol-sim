import { useMemo } from 'react'

// ── Frequency Scout spectrum (shown after prescan step 0 completes) ──────────
export function FrequencyScoutSpectrum({ visible, fieldStrength }: { visible: boolean; fieldStrength: number }) {
  const is3T = fieldStrength >= 2.5
  const W = 120, H = 30
  // Water peak centered at 0Hz, fat peak at -csFatHz
  const csFatHz = is3T ? 447 : 224
  const nPts = 120

  const spectrum = useMemo(() => {
    return Array.from({ length: nPts }, (_, i) => {
      const hz = (i / (nPts - 1) - 0.5) * 1200  // -600 to +600 Hz
      // Water peak (main): Lorentzian, centered at ~+10Hz offset
      const water = 1.0 / (1 + ((hz - 12) / 18) ** 2)
      // Fat peak: smaller, shifted by csFatHz
      const fat = 0.18 / (1 + ((hz + csFatHz - 12) / 15) ** 2)
      // Noise floor
      const noise = 0.015 * (Math.random() * 0.5 + 0.75)
      return Math.min(1, water + fat + noise)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldStrength])

  if (!visible) return null

  const pts = spectrum.map((v, i) =>
    `${(i / (nPts - 1)) * W},${H - 2 - v * (H - 4)}`
  ).join(' ')

  return (
    <div style={{ position: 'relative' }}>
      <svg width={W} height={H} style={{ display: 'block', background: '#030608', borderRadius: 2, border: '1px solid #0a1820' }}>
        {/* Baseline */}
        <line x1={0} y1={H - 2} x2={W} y2={H - 2} stroke="#0a1820" strokeWidth={0.5} />
        {/* Spectrum */}
        <polyline points={pts} fill="none" stroke="#34d399" strokeWidth={0.8} opacity={0.8} />
        {/* Water peak marker */}
        <line x1={W / 2 + 1} y1={0} x2={W / 2 + 1} y2={H - 2} stroke="#1a4a30" strokeWidth={0.5} strokeDasharray="1.5,2" />
        {/* Fat peak marker */}
        {(() => {
          const fatX = (W / 2) - (csFatHz / 1200) * W
          return fatX > 0 && <line x1={fatX} y1={0} x2={fatX} y2={H - 2} stroke="#3a2a00" strokeWidth={0.5} strokeDasharray="1.5,2" />
        })()}
        <text x={W / 2 + 2} y={7} fontSize="5" fill="#1a4a30" fontFamily="monospace">H₂O</text>
        <text x={W - 2} y={H - 3} textAnchor="end" fontSize="5" fill="#1a2a18" fontFamily="monospace">+600Hz</text>
        <text x={2} y={H - 3} fontSize="5" fill="#1a2a18" fontFamily="monospace">-600</text>
      </svg>
    </div>
  )
}
