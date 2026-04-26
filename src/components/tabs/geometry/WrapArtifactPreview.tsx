import { useProtocolStore } from '../../../store/protocolStore'

// ── 位相折り返し（Wrap/Aliasing）プレビュー ───────────────────────────────────
// FOV < 体径の場合、位相方向の折り返しアーチファクトを可視化
// 実際の syngo コンソールでの折り返し警告に相当
export function WrapArtifactPreview() {
  const { params, setParam } = useProtocolStore()

  const fovPhase = params.fov * (params.phaseResolution / 100)
  const effectiveFovPhase = fovPhase * (1 + params.phaseOversampling / 100)

  // Anatomy size estimates based on orientation
  const ANATOMY_SIZE: Record<string, { ap: number; rl: number; hf: number; label: string }> = {
    Tra: { ap: 200, rl: 320, hf: 160, label: 'Transversal' },
    Cor: { ap: 200, rl: 320, hf: 400, label: 'Coronal' },
    Sag: { ap: 200, rl: 320, hf: 400, label: 'Sagittal' },
  }
  const anatomy = ANATOMY_SIZE[params.orientation]

  // Phase direction size
  const isAP = params.phaseEncDir === 'A>>P' || params.phaseEncDir === 'P>>A'
  const isRL = params.phaseEncDir === 'R>>L' || params.phaseEncDir === 'L>>R'
  const anatomyPhaseSize = isAP ? anatomy.ap : isRL ? anatomy.rl : anatomy.hf
  const anatomyReadSize = params.fov  // treat FOV as covering read direction

  const wrapAmount = Math.max(0, anatomyPhaseSize - effectiveFovPhase)
  const wrapRatio = wrapAmount / anatomyPhaseSize
  const hasWrap = wrapAmount > 5  // >5mm wrap

  const W = 220, H = 100
  const scale = (W - 20) / Math.max(anatomyPhaseSize, effectiveFovPhase, 250)
  const CX = W / 2
  const CY = H / 2 - 10

  // Anatomy rectangle
  const aW = anatomyReadSize * scale * 0.7  // read direction (horizontal)
  const aPh = anatomyPhaseSize * scale       // phase direction (vertical)
  const fovPh = effectiveFovPhase * scale

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0a0808', border: `1px solid ${hasWrap ? '#7f1d1d' : '#1a2030'}` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: hasWrap ? '#f87171' : '#374151', fontSize: '9px', letterSpacing: '0.05em' }}>
          {hasWrap ? '⚠ WRAP ARTIFACT' : '✓ NO WRAP'} — Phase Dir
        </span>
        <div className="flex items-center gap-1.5">
          <span style={{ color: '#4b5563', fontSize: '8px' }}>
            FOV_ph={effectiveFovPhase.toFixed(0)}mm / body≈{anatomyPhaseSize}mm
          </span>
          {hasWrap && params.phaseOversampling < 50 && (
            <button
              onClick={() => setParam('phaseOversampling', Math.min(100, Math.ceil(wrapRatio * 100 / 10) * 10))}
              style={{ color: '#34d399', background: '#0a1f16', border: '1px solid #14532d', borderRadius: 2, fontSize: '7px', padding: '1px 4px', cursor: 'pointer' }}>
              Ovs +{Math.ceil(wrapRatio * 100 / 10) * 10}%
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <svg width={W} height={H}>
          {/* Anatomy outline */}
          <rect
            x={CX - aW / 2} y={CY - aPh / 2}
            width={aW} height={aPh}
            fill="#1a0a0a" stroke="#3a2020" strokeWidth={1}
          />
          {/* FOV rectangle (phase direction) */}
          <rect
            x={CX - aW / 2 - 4} y={CY - fovPh / 2}
            width={aW + 8} height={fovPh}
            fill="none" stroke={hasWrap ? '#f87171' : '#34d399'} strokeWidth={1} strokeDasharray={hasWrap ? '3,2' : 'none'}
          />

          {/* Wrap zones (anatomy outside FOV) */}
          {hasWrap && (() => {
            const overhangPx = (anatomyPhaseSize - effectiveFovPhase) / 2 * scale
            return (
              <>
                {/* Top wrap zone */}
                <rect
                  x={CX - aW / 2} y={CY - aPh / 2}
                  width={aW} height={overhangPx}
                  fill="#f87171" opacity={0.2}
                />
                {/* Bottom wrap zone */}
                <rect
                  x={CX - aW / 2} y={CY + fovPh / 2}
                  width={aW} height={overhangPx}
                  fill="#f87171" opacity={0.2}
                />
                {/* Arrows showing wrap direction */}
                <path d={`M${CX - aW/2 - 2},${CY - aPh/2 + overhangPx/2} L${CX - aW/2 + 8},${CY + fovPh/2 - overhangPx/2}`}
                  stroke="#f87171" strokeWidth={0.8} strokeDasharray="2,2" fill="none" opacity={0.6} />
              </>
            )
          })()}

          {/* Labels */}
          <text x={CX} y={H - 4} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>
            {params.phaseEncDir} ({anatomyPhaseSize}mm)
          </text>
          <text x={CX + aW / 2 + 5} y={CY - fovPh / 2 + 8} fill={hasWrap ? '#f87171' : '#34d399'} style={{ fontSize: '7px' }}>
            FOV
          </text>
        </svg>

        {/* Stats */}
        <div className="flex flex-col gap-1" style={{ minWidth: 80 }}>
          <div>
            <div style={{ color: '#374151', fontSize: '7px' }}>Phase FOV</div>
            <div className="font-mono" style={{ color: hasWrap ? '#f87171' : '#34d399', fontSize: '9px' }}>
              {effectiveFovPhase.toFixed(0)} mm
            </div>
          </div>
          <div>
            <div style={{ color: '#374151', fontSize: '7px' }}>Body≈</div>
            <div className="font-mono" style={{ color: '#9ca3af', fontSize: '9px' }}>{anatomyPhaseSize} mm</div>
          </div>
          {hasWrap && (
            <div>
              <div style={{ color: '#f87171', fontSize: '7px' }}>Wrap</div>
              <div className="font-mono" style={{ color: '#f87171', fontSize: '9px' }}>
                ~{wrapAmount.toFixed(0)}mm
              </div>
            </div>
          )}
          <div>
            <div style={{ color: '#374151', fontSize: '7px' }}>Phase Ovs</div>
            <div className="font-mono" style={{ color: '#e88b00', fontSize: '9px' }}>
              {params.phaseOversampling}%
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
