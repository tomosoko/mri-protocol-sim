import { useMemo } from 'react'
import { useProtocolStore } from '../../../store/protocolStore'
import { calcTissueContrast } from '../../../store/calculators'

// ── シミュレーション画像プレビュー ──────────────────────────────────────────
// 現在のプロトコル TR/TE/TI/FA から各組織の信号強度を計算し
// 脳軸位断像のグレースケールシミュレーション画像として表示
// 組織: WM / GM / CSF / Fat / Blood / Tumor
export function SimulatedImagePreview() {
  const { params } = useProtocolStore()
  const signals = useMemo(() => calcTissueContrast(params), [
    params.TR, params.TE, params.TI, params.flipAngle,
    params.fatSat, params.fieldStrength, params.turboFactor, params.averages
  ])

  // Map tissue label → signal (0-1)
  const sigMap = useMemo(() => {
    const m: Record<string, number> = {}
    const maxSig = Math.max(...signals.map(s => s.signal), 0.01)
    signals.forEach(s => { m[s.tissue.label] = Math.min(1, s.signal / maxSig) })
    return m
  }, [signals])

  const sig = (label: string) => sigMap[label] ?? 0.3
  const gray = (label: string, opacity = 1) => {
    const v = Math.round(sig(label) * 220)
    return `rgba(${v},${v},${v},${opacity})`
  }

  // Is fat saturated?
  const fatSuppressed = params.fatSat !== 'None'
  const isDWI = params.bValues.length > 1 && params.turboFactor <= 2

  const W = 110, H = 110
  const CX = W / 2, CY = H / 2

  // Noise overlay: subtle grain
  const noiseGrain = useMemo(() => {
    return Array.from({ length: 200 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.2,
      op: Math.random() * 0.12,
    }))
  }, [])

  return (
    <div className="mx-3 mt-2 p-1.5 rounded" style={{ background: '#030506', border: '1px solid #0a1418' }}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ color: '#1a4a5a', fontSize: '8px', fontWeight: 600, letterSpacing: '0.05em' }}>
          SIMULATED IMAGE
        </span>
        <span style={{ color: '#0a2a30', fontSize: '7px', fontFamily: 'monospace' }}>
          TR={params.TR} · TE={params.TE}{params.TI > 0 ? ` · TI=${params.TI}` : ''}
        </span>
      </div>
      <div className="flex gap-2 items-start">
        {/* Brain axial SVG */}
        <svg width={W} height={H} style={{ display: 'block', flexShrink: 0 }}>
          {/* Background (outside skull) */}
          <rect width={W} height={H} fill="#020405" />

          {/* Scalp / outer tissue (thin) */}
          <ellipse cx={CX} cy={CY} rx={50} ry={46} fill={gray('Fat', fatSuppressed ? 0.15 : 1)} />

          {/* Skull */}
          <ellipse cx={CX} cy={CY} rx={47} ry={43} fill={gray('Cortical Bone', 1) || '#111'} />

          {/* Subarachnoid CSF */}
          <ellipse cx={CX} cy={CY} rx={44} ry={40} fill={gray('CSF', 1)} />

          {/* Cerebral cortex (GM) */}
          <ellipse cx={CX} cy={CY} rx={40} ry={36} fill={gray('GM', 1)} />

          {/* White matter (interior) */}
          <ellipse cx={CX} cy={CY} rx={34} ry={30} fill={gray('WM', 1)} />

          {/* Lateral ventricles (CSF) */}
          <ellipse cx={CX - 7} cy={CY} rx={4} ry={8} fill={gray('CSF', 1)} />
          <ellipse cx={CX + 7} cy={CY} rx={4} ry={8} fill={gray('CSF', 1)} />

          {/* Third ventricle */}
          <ellipse cx={CX} cy={CY + 5} rx={2} ry={4} fill={gray('CSF', 1)} />

          {/* Basal ganglia (GM-like, slightly different) */}
          <ellipse cx={CX - 12} cy={CY + 2} rx={6} ry={8} fill={gray('GM', 0.85)} />
          <ellipse cx={CX + 12} cy={CY + 2} rx={6} ry={8} fill={gray('GM', 0.85)} />

          {/* Interhemispheric fissure */}
          <line x1={CX} y1={CY - 40} x2={CX} y2={CY + 36}
            stroke="#020405" strokeWidth="1.5" />

          {/* For DWI: show diffusion restriction as bright spot (simulated ischemia) */}
          {isDWI && (
            <ellipse cx={CX + 16} cy={CY - 8} rx={6} ry={5}
              fill={`rgba(200,200,200,${sig('WM') * 0.9})`}
              stroke="rgba(255,255,200,0.2)" strokeWidth="0.5" />
          )}

          {/* MR noise grain */}
          {noiseGrain.map((g, i) => (
            <circle key={i} cx={g.x} cy={g.y} r={g.r} fill={`rgba(180,180,180,${g.op})`} />
          ))}

          {/* Window/level indicator */}
          <text x={2} y={H - 2} fontSize="5" fill="#0a2a30" fontFamily="monospace">W:255 L:128</text>
        </svg>

        {/* Signal intensity bars — per tissue */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div style={{ fontSize: '7px', color: '#0a2a30', fontWeight: 600, marginBottom: 2 }}>
            SIGNAL INTENSITY
          </div>
          {signals.slice(0, 7).map(s => {
            const maxSig = Math.max(...signals.map(x => x.signal), 0.01)
            const pct = Math.min(100, (s.signal / maxSig) * 100)
            return (
              <div key={s.tissue.label} className="flex items-center gap-1">
                <span style={{ color: '#1a2a2a', fontSize: '6.5px', width: 28, textAlign: 'right', flexShrink: 0 }}>
                  {s.tissue.label}
                </span>
                <div className="flex-1 h-1.5 rounded overflow-hidden" style={{ background: '#0a0f10' }}>
                  <div className="h-full rounded"
                    style={{ width: `${pct}%`, background: s.tissue.color, opacity: 0.7 }} />
                </div>
                <span className="font-mono" style={{ color: '#0a2a2a', fontSize: '6px', width: 24, textAlign: 'right' }}>
                  {pct.toFixed(0)}%
                </span>
              </div>
            )
          })}
          {/* Contrast metrics */}
          {signals.length >= 2 && (() => {
            const wmSig = sigMap['WM'] ?? 0
            const gmSig = sigMap['GM'] ?? 0
            const csfSig = sigMap['CSF'] ?? 0
            const cnr = Math.abs(wmSig - gmSig)
            return (
              <div className="mt-1 pt-1" style={{ borderTop: '1px solid #0a1418', fontSize: '6.5px', color: '#0a2a2a' }}>
                <div>WM/GM CNR: <span className="font-mono">{(cnr * 100).toFixed(0)}%</span></div>
                <div>CSF: <span className="font-mono">{(csfSig * 100).toFixed(0)}%</span></div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
