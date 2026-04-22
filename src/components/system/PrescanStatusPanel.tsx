import { useState, useMemo } from 'react'
import { useProtocolStore } from '../../store/protocolStore'

// ── プリスキャン/シムステータスパネル ────────────────────────────────────────
// 実際の syngo MR コンソールのプリスキャン結果表示を模倣
// B0 フィールドマップ・中心周波数・シム係数をリアルタイム表示
export function PrescanStatusPanel() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5
  const [prescanState, setPrescanState] = useState<'ready' | 'running' | 'done'>('done')
  const [runMs, setRunMs] = useState(0)

  // Simulated prescan results (deterministic based on field strength and body part)
  const larmor = is3T ? 127.74 : 63.87  // MHz
  const centerFreqOffset = is3T ? 23 : 12  // Hz offset from nominal
  const fieldUniformityPpm = is3T ? 1.8 : 0.9
  const fieldUniformityHz = Math.round(fieldUniformityPpm * larmor)

  // Simulated shim currents (Z1/X/Y/Z2/XY/XZ — first-order+second-order shim coils)
  const shimCoeffs = useMemo(() => {
    const seed = params.fov * 0.1 + params.slices * 0.3
    return [
      { axis: 'Z1', val: Math.round(12 + Math.sin(seed) * 18), unit: 'mA', color: '#60a5fa' },
      { axis: 'X',  val: Math.round(-8 + Math.cos(seed * 1.3) * 15), unit: 'mA', color: '#34d399' },
      { axis: 'Y',  val: Math.round(5 + Math.sin(seed * 0.7) * 20), unit: 'mA', color: '#a78bfa' },
      { axis: 'Z2', val: Math.round(Math.cos(seed * 2.1) * 10), unit: 'mA', color: '#fbbf24' },
    ]
  }, [params.fov, params.slices])

  // Fat-water beat frequency
  const csFatHz = is3T ? 447 : 224
  const inPhaseTE = Math.round(1000 / csFatHz * 1000) / 2  // first in-phase at ~2.2ms (3T) or ~4.4ms (1.5T)

  // B0 residual histogram (simulated)
  const histBins = useMemo(() => {
    const bins: number[] = []
    for (let i = 0; i < 20; i++) {
      const hz = -100 + i * 10
      const sigma = is3T ? 35 : 18
      bins.push(Math.round(Math.exp(-(hz * hz) / (2 * sigma * sigma)) * 80 + Math.random() * 5))
    }
    return bins
  }, [is3T])
  const maxBin = Math.max(...histBins)

  const runPrescan = () => {
    setPrescanState('running')
    setRunMs(0)
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      setRunMs(elapsed)
      if (elapsed >= 2500) {
        clearInterval(timer)
        setPrescanState('done')
      }
    }, 50)
  }

  const W = 180, H = 50
  const binW = W / histBins.length

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#060c12', border: '1px solid #1a2a3a' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#34d399', fontSize: '9px', letterSpacing: '0.06em' }}>
          PRESCAN STATUS
        </span>
        <div className="flex items-center gap-2">
          {prescanState === 'running' && (
            <span className="font-mono" style={{ color: '#fbbf24', fontSize: '8px' }}>
              {(runMs / 1000).toFixed(1)}s...
            </span>
          )}
          <span style={{
            fontSize: '8px',
            color: prescanState === 'done' ? '#34d399' : prescanState === 'running' ? '#fbbf24' : '#4b5563',
            fontWeight: 600,
          }}>
            {prescanState === 'done' ? '● COMPLETE' : prescanState === 'running' ? '● RUNNING' : '○ READY'}
          </span>
          <button
            onClick={runPrescan}
            disabled={prescanState === 'running'}
            style={{
              background: prescanState === 'running' ? '#1a1a1a' : '#0a1f16',
              color: prescanState === 'running' ? '#374151' : '#34d399',
              border: `1px solid ${prescanState === 'running' ? '#2a2a2a' : '#14532d'}`,
              borderRadius: 2, fontSize: '8px', padding: '1px 5px', cursor: prescanState === 'running' ? 'default' : 'pointer',
            }}
          >
            Run
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Left: key readouts */}
        <div className="flex flex-col gap-1" style={{ minWidth: 120 }}>
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: '#4b5563', fontSize: '8px' }}>Center Freq</span>
            <span className="font-mono" style={{ color: '#e88b00', fontSize: '9px' }}>
              {larmor.toFixed(2)} MHz
              <span style={{ color: '#6b7280', fontSize: '7px' }}> +{centerFreqOffset}Hz</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: '#4b5563', fontSize: '8px' }}>B0 Uniformity</span>
            <span className="font-mono" style={{ color: fieldUniformityPpm > 2 ? '#f87171' : '#34d399', fontSize: '9px' }}>
              {fieldUniformityPpm}ppm
              <span style={{ color: '#6b7280', fontSize: '7px' }}> ±{fieldUniformityHz}Hz</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: '#4b5563', fontSize: '8px' }}>Fat-Water Δf</span>
            <span className="font-mono" style={{ color: '#fbbf24', fontSize: '9px' }}>{csFatHz} Hz</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: '#4b5563', fontSize: '8px' }}>In-phase TE</span>
            <span className="font-mono" style={{ color: '#60a5fa', fontSize: '9px' }}>{inPhaseTE.toFixed(1)} / {(inPhaseTE*2).toFixed(1)} ms</span>
          </div>
          {/* Shim currents */}
          <div className="mt-1 pt-1" style={{ borderTop: '1px solid #111' }}>
            <div style={{ color: '#374151', fontSize: '7px', marginBottom: '3px' }}>SHIM CURRENTS</div>
            <div className="grid grid-cols-2 gap-x-2">
              {shimCoeffs.map(({ axis, val, color }) => (
                <div key={axis} className="flex items-center justify-between">
                  <span style={{ color: '#374151', fontSize: '7px' }}>{axis}:</span>
                  <span className="font-mono" style={{ color, fontSize: '8px' }}>{val > 0 ? '+' : ''}{val}mA</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: B0 residual histogram */}
        <div className="flex flex-col items-center">
          <div style={{ color: '#374151', fontSize: '7px', marginBottom: 2 }}>B0残差 分布</div>
          <svg width={W} height={H}>
            <line x1={0} y1={H - 1} x2={W} y2={H - 1} stroke="#1a2030" strokeWidth={1} />
            {histBins.map((v, i) => {
              const h = (v / maxBin) * (H - 8)
              const x = i * binW
              const isCenter = Math.abs(i - 10) <= 1
              return (
                <rect key={i} x={x + 0.5} y={H - 1 - h} width={Math.max(0, binW - 0.5)} height={h}
                  fill={isCenter ? '#34d399' : '#1a3a2a'} opacity={0.9} />
              )
            })}
            {/* Center line */}
            <line x1={W / 2} y1={0} x2={W / 2} y2={H - 1} stroke="#374151" strokeWidth={0.5} strokeDasharray="2,2" />
            <text x={2} y={H - 3} fill="#374151" style={{ fontSize: '7px' }}>-100Hz</text>
            <text x={W - 2} y={H - 3} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>+100Hz</text>
          </svg>
        </div>
      </div>
    </div>
  )
}
