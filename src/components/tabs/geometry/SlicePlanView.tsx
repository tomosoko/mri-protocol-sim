import { useProtocolStore } from '../../../store/protocolStore'

// ── スライス配置 3D 透視図 ────────────────────────────────────────────────────
// syngo MR の planning view に相当する簡易3Dスライスプランニング図
export function SlicePlanView() {
  const { params } = useProtocolStore()

  const W = 200, H = 160
  const CX = W / 2, CY = H / 2

  const ori = params.orientation
  const slices = Math.min(params.slices, 40)
  const thickness = params.sliceThickness
  const gap = Math.max(0, params.sliceGap ?? 0)
  const totalCoverage = slices * (thickness + gap)

  // 3D perspective: isometric-like projection
  // Body volume box (head or torso)
  const BOX = { w: 60, h: 80, d: 60 }  // R-L, H-F, A-P extents (mm normalized)
  const iso = (x: number, y: number, z: number): [number, number] => {
    // Isometric projection: x=R-L, y=H-F (down), z=A-P
    const sx = x - z * 0.5
    const sy = -y + z * 0.3
    return [CX + sx, CY + sy]
  }

  // Body box vertices
  const boxVerts = {
    flb: iso(-BOX.w/2, -BOX.h/2, -BOX.d/2),  // front-left-bottom
    frb: iso( BOX.w/2, -BOX.h/2, -BOX.d/2),
    flt: iso(-BOX.w/2,  BOX.h/2, -BOX.d/2),
    frt: iso( BOX.w/2,  BOX.h/2, -BOX.d/2),
    blb: iso(-BOX.w/2, -BOX.h/2,  BOX.d/2),
    brb: iso( BOX.w/2, -BOX.h/2,  BOX.d/2),
    blt: iso(-BOX.w/2,  BOX.h/2,  BOX.d/2),
    brt: iso( BOX.w/2,  BOX.h/2,  BOX.d/2),
  }
  const bv = boxVerts

  // Draw box edges (back faces first)
  const boxEdges = [
    // Back face
    [bv.blb, bv.brb], [bv.brb, bv.brt], [bv.brt, bv.blt], [bv.blt, bv.blb],
    // Connecting edges
    [bv.flb, bv.blb], [bv.frb, bv.brb], [bv.flt, bv.blt], [bv.frt, bv.brt],
    // Front face
    [bv.flb, bv.frb], [bv.frb, bv.frt], [bv.frt, bv.flt], [bv.flt, bv.flb],
  ]

  // Slice planes based on orientation
  const maxSliceSpan = Math.min(totalCoverage, BOX.h)  // max display coverage
  const scale3D = maxSliceSpan / BOX.h * 0.7

  const slicePlanes = Array.from({ length: Math.min(slices, 16) }, (_, i) => {
    // Position along coverage axis (normalized -0.5 to 0.5 of box)
    const t = slices > 1 ? (i / (slices - 1) - 0.5) * scale3D : 0

    let pts: [number, number][]
    if (ori === 'Tra') {
      // Horizontal planes (transverse)
      const y = t * BOX.h
      pts = [
        iso(-BOX.w/2, y, -BOX.d/2),
        iso( BOX.w/2, y, -BOX.d/2),
        iso( BOX.w/2, y,  BOX.d/2),
        iso(-BOX.w/2, y,  BOX.d/2),
      ]
    } else if (ori === 'Cor') {
      // Coronal planes (front-back)
      const z = t * BOX.d
      pts = [
        iso(-BOX.w/2, -BOX.h/2, z),
        iso( BOX.w/2, -BOX.h/2, z),
        iso( BOX.w/2,  BOX.h/2, z),
        iso(-BOX.w/2,  BOX.h/2, z),
      ]
    } else {
      // Sagittal planes (left-right)
      const x = t * BOX.w
      pts = [
        iso(x, -BOX.h/2, -BOX.d/2),
        iso(x,  BOX.h/2, -BOX.d/2),
        iso(x,  BOX.h/2,  BOX.d/2),
        iso(x, -BOX.h/2,  BOX.d/2),
      ]
    }
    return pts
  })

  const isCenterSlice = (i: number) => i === Math.floor(slices / 2) || (slices <= 16 && i === Math.floor(Math.min(slices, 16) / 2))

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#050810', border: '1px solid #1a2035' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#60a5fa', fontSize: '9px', letterSpacing: '0.06em' }}>
          SLICE PLAN — {ori.toUpperCase()}
        </span>
        <span style={{ color: '#4b5563', fontSize: '8px' }}>
          {slices}sl × {thickness}mm {gap > 0 ? `+ ${gap}mm gap` : ''}
          = {totalCoverage.toFixed(0)}mm
        </span>
      </div>
      <div className="flex gap-2">
        <svg width={W} height={H} style={{ flexShrink: 0 }}>
          {/* Body box */}
          {boxEdges.map(([a, b], i) => {
            const isBack = i < 4
            return (
              <line key={i}
                x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                stroke="#252525" strokeWidth={isBack ? 0.5 : 1} strokeDasharray={isBack ? '2,3' : 'none'}
              />
            )
          })}

          {/* Slice planes */}
          {slicePlanes.map((pts, i) => {
            const isCenter = isCenterSlice(i)
            const poly = pts.map(p => `${p[0]},${p[1]}`).join(' ')
            return (
              <polygon key={i}
                points={poly}
                fill={isCenter ? '#60a5fa' : '#1a4060'}
                fillOpacity={isCenter ? 0.25 : 0.12}
                stroke={isCenter ? '#60a5fa' : '#2a4a6a'}
                strokeWidth={isCenter ? 1 : 0.5}
              />
            )
          })}

          {/* PE direction arrow */}
          {(() => {
            const dir = params.phaseEncDir
            const isAP = dir === 'A>>P' || dir === 'P>>A'
            const [a, b] = isAP
              ? [iso(0, 0, -BOX.d * 0.6), iso(0, 0, BOX.d * 0.6)]
              : [iso(-BOX.w * 0.6, 0, 0), iso(BOX.w * 0.6, 0, 0)]
            return (
              <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                stroke="#e88b0080" strokeWidth={1} strokeDasharray="2,2" />
            )
          })()}

          {/* Labels */}
          <text x={8} y={H - 4} fill="#252525" style={{ fontSize: '7px', fontFamily: 'monospace' }}>
            {ori} · {params.phaseEncDir}
          </text>
        </svg>

        {/* Coverage stats */}
        <div className="flex flex-col gap-1.5" style={{ paddingTop: 8, minWidth: 80 }}>
          <div style={{ fontSize: '8px', color: '#4b5563' }}>Coverage</div>
          {[
            { label: 'Slices', value: `${slices}`, color: '#60a5fa' },
            { label: 'Thickness', value: `${thickness}mm`, color: '#34d399' },
            { label: 'Gap', value: gap > 0 ? `${gap}mm` : 'none', color: gap > 0 ? '#fbbf24' : '#374151' },
            { label: 'Total', value: `${totalCoverage.toFixed(0)}mm`, color: '#e88b00' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between gap-2">
              <span style={{ color: '#374151', fontSize: '8px' }}>{label}:</span>
              <span className="font-mono font-semibold" style={{ color, fontSize: '8px' }}>{value}</span>
            </div>
          ))}
          {gap > thickness * 0.3 && (
            <div style={{ color: '#fbbf24', fontSize: '7px', marginTop: 2 }}>
              ⚠ Gap大 (≥30%)
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
