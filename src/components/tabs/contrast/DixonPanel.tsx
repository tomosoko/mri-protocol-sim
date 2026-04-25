import { useProtocolStore } from '../../../store/protocolStore'

// ── Dixon In/Out-of-Phase TE 計算器 ───────────────────────────────────────────
// 水と脂肪の化学シフト差によるビート周波数を元に in-phase / out-of-phase TE を計算
// 臨床: 肝臓（脂肪肝）・副腎・骨髄の脂肪定量に必須
export function DixonTECalculator() {
  const { params, setParam } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  // Fat-water chemical shift: 3.5ppm × Larmor freq
  const csHz = is3T ? 447 : 224  // Hz at 3T or 1.5T
  const beatPeriodMs = 1000 / csHz  // ms per full beat cycle

  // In-phase TEs: csHz × n (water and fat fully aligned)
  // Out-of-phase TEs: csHz × (n - 0.5) (water and fat opposed)
  const nMax = 6
  const inPhase = Array.from({ length: nMax }, (_, i) => Math.round(beatPeriodMs * (i + 1) * 100) / 100)
  const outPhase = Array.from({ length: nMax }, (_, i) => Math.round(beatPeriodMs * (i + 0.5) * 100) / 100)

  // Practical range (TE > 1ms, < params.TR/2)
  const maxTE = Math.min(60, params.TR / 2)
  const usableIn  = inPhase.filter(te => te >= 1 && te <= maxTE)
  const usableOut = outPhase.filter(te => te >= 1 && te <= maxTE)

  // Current TE classification
  const currentTE = params.TE
  const nearestIn  = inPhase.find(te => Math.abs(te - currentTE) < beatPeriodMs * 0.15)
  const nearestOut = outPhase.find(te => Math.abs(te - currentTE) < beatPeriodMs * 0.15)
  const teClass = nearestIn ? 'in-phase' : nearestOut ? 'out-of-phase' : 'neither'

  const W = 290, H = 36
  const PAD = { l: 8, r: 8 }
  const innerW = W - PAD.l - PAD.r
  const maxTeDisplay = Math.min(20, maxTE)
  const tx = (te: number) => PAD.l + (te / maxTeDisplay) * innerW

  // Fat/water signal at current TE
  const fatWaterPhase = ((currentTE / beatPeriodMs) % 1) * 360  // degrees
  const fatSignal = Math.cos(fatWaterPhase * Math.PI / 180)  // +1=in-phase, -1=out-of-phase

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080810', border: '1px solid #1a1a30' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#38bdf8', fontSize: '9px', letterSpacing: '0.05em' }}>
          DIXON / FAT-WATER TE
        </span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px' }}>
          <span style={{ color: '#4b5563' }}>{is3T ? '3T' : '1.5T'}: Δf={csHz}Hz</span>
          <span className="font-mono" style={{
            color: teClass === 'in-phase' ? '#34d399' : teClass === 'out-of-phase' ? '#f87171' : '#6b7280',
            fontWeight: 700,
          }}>
            TE={currentTE}ms: {teClass === 'in-phase' ? '● IN-PHASE' : teClass === 'out-of-phase' ? '◐ OUT-OF-PHASE' : '○ Mixed'}
          </span>
        </div>
      </div>

      {/* TE timeline */}
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        {/* Baseline */}
        <line x1={PAD.l} y1={18} x2={PAD.l + innerW} y2={18} stroke="#1a1a2a" strokeWidth={1} />

        {/* In-phase markers (green diamonds) */}
        {usableIn.map((te, i) => {
          const x = tx(te)
          if (x > PAD.l + innerW) return null
          return (
            <g key={i}>
              <polygon points={`${x},10 ${x+4},18 ${x},26 ${x-4},18`} fill="#34d39940" stroke="#34d399" strokeWidth={0.8} />
              <text x={x} y={8} textAnchor="middle" fill="#34d39980" style={{ fontSize: '6px' }}>{te}</text>
            </g>
          )
        })}

        {/* Out-of-phase markers (red circles) */}
        {usableOut.map((te, i) => {
          const x = tx(te)
          if (x > PAD.l + innerW) return null
          return (
            <g key={i}>
              <circle cx={x} cy={18} r={4} fill="#f8717130" stroke="#f87171" strokeWidth={0.8} />
              <text x={x} y={H - 1} textAnchor="middle" fill="#f8717180" style={{ fontSize: '6px' }}>{te}</text>
            </g>
          )
        })}

        {/* Current TE cursor */}
        {currentTE <= maxTeDisplay && (
          <line x1={tx(currentTE)} y1={4} x2={tx(currentTE)} y2={H - 4}
            stroke="#e88b00" strokeWidth={1.5} opacity={0.9} />
        )}

        {/* Axis labels */}
        <text x={PAD.l} y={H} fill="#252525" style={{ fontSize: '6px' }}>0</text>
        <text x={PAD.l + innerW} y={H} textAnchor="end" fill="#252525" style={{ fontSize: '6px' }}>{maxTeDisplay}ms</text>
      </svg>

      {/* Quick-set buttons */}
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        <span style={{ fontSize: '7px', color: '#374151' }}>Set TE:</span>
        {usableIn.slice(0, 3).map(te => (
          <button key={te} onClick={() => setParam('TE', te)}
            style={{ background: '#0a1f10', color: '#34d399', border: '1px solid #14532d', borderRadius: 2, fontSize: '7px', padding: '1px 4px', cursor: 'pointer' }}>
            {te}ms IP
          </button>
        ))}
        {usableOut.slice(0, 3).map(te => (
          <button key={te} onClick={() => setParam('TE', te)}
            style={{ background: '#1a0a0a', color: '#f87171', border: '1px solid #7f1d1d', borderRadius: 2, fontSize: '7px', padding: '1px 4px', cursor: 'pointer' }}>
            {te}ms OP
          </button>
        ))}
      </div>

      {/* Fat signal indicator */}
      <div className="flex items-center gap-2 mt-1" style={{ fontSize: '7px', color: '#4b5563' }}>
        <span>Fat signal:</span>
        <div className="h-1.5 rounded overflow-hidden" style={{ width: 80, background: '#111' }}>
          <div style={{
            width: `${Math.abs(fatSignal) * 100}%`,
            height: '100%',
            background: fatSignal > 0 ? '#f87171' : '#38bdf8',
            float: fatSignal >= 0 ? 'left' : 'right',
          }} />
        </div>
        <span style={{ color: fatSignal > 0.5 ? '#f87171' : fatSignal < -0.5 ? '#38bdf8' : '#fbbf24' }}>
          {fatSignal.toFixed(2)} ({fatSignal > 0.3 ? '脂肪↑' : fatSignal < -0.3 ? '脂肪↓（水のみ）' : '中間'})
        </span>
      </div>
    </div>
  )
}
