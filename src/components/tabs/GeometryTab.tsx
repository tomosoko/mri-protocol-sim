import { useState } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'

// ── PE方向 アーチファクト伝播ガイド ─────────────────────────────────────────
function PEDirectionGuide() {
  const { params } = useProtocolStore()
  const dir = params.phaseEncDir
  const ori = params.orientation

  // アーチファクトの主な発生源とその影響
  const artifacts = [
    {
      source: '眼球運動',
      relevant: ori === 'Tra',
      bad: ['A>>P', 'P>>A'],
      good: ['R>>L', 'L>>R'],
      tip: '頭部Traでは眼球運動アーチファクトをA-P方向に（脳実質への影響最小化）',
    },
    {
      source: '呼吸・腸管',
      relevant: ori === 'Tra' || ori === 'Cor',
      bad: ['R>>L', 'L>>R'],
      good: ['A>>P', 'P>>A'],
      tip: '腹部では呼吸アーチファクトをA-P方向に誘導し、臓器への重畳を防ぐ',
    },
    {
      source: '大動脈拍動',
      relevant: ori === 'Sag',
      bad: ['H>>F', 'F>>H'],
      good: ['A>>P', 'P>>A'],
      tip: '腰椎Sagでは大動脈拍動をA-P方向に（脊柱管への影響を最小化）',
    },
    {
      source: '嚥下・頸動脈',
      relevant: ori === 'Sag' || ori === 'Cor',
      bad: ['H>>F', 'F>>H'],
      good: ['A>>P', 'P>>A'],
      tip: '頸椎Sagでは嚥下アーチファクトをA-P方向に',
    },
    {
      source: 'エイリアシング',
      relevant: true,
      bad: [],
      good: [],
      tip: params.phaseOversampling > 0
        ? `位相Ovs ${params.phaseOversampling}% で折り返しを防止中`
        : '位相方向FOVが短い場合、折り返しアーチファクト（Wrap）に注意。Phase Oversamplingで対策',
    },
  ].filter(a => a.relevant)

  const currentIsBad = (a: typeof artifacts[0]) => a.bad.includes(dir)
  const currentIsGood = (a: typeof artifacts[0]) => a.good.includes(dir)

  return (
    <div className="mx-3 mt-2 p-2.5 rounded text-xs" style={{ background: '#111', border: '1px solid #1a1a2a' }}>
      <div className="font-semibold mb-1.5" style={{ color: '#60a5fa', fontSize: '10px' }}>
        PE方向 ({dir}) アーチファクト評価
      </div>
      <div className="space-y-1.5">
        {artifacts.map((a, i) => {
          const bad = currentIsBad(a)
          const good = currentIsGood(a)
          return (
            <div key={i} className="flex items-start gap-1.5">
              <span style={{
                color: bad ? '#f87171' : good ? '#34d399' : '#fbbf24',
                fontSize: '10px', flexShrink: 0, marginTop: '1px',
              }}>
                {bad ? '✕' : good ? '✓' : '△'}
              </span>
              <div>
                <span className="font-semibold" style={{ color: '#c8ccd6' }}>{a.source}: </span>
                <span style={{ color: '#6b7280' }}>{a.tip}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── スライス配置 3D 透視図 ────────────────────────────────────────────────────
// syngo MR の planning view に相当する簡易3Dスライスプランニング図
function SlicePlanView() {
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

// ── スライス収集 側面図 ───────────────────────────────────────────────────────
// 各スライスの位置・厚み・ギャップをmm単位で側面から可視化
function SliceCoverageSideView() {
  const { params } = useProtocolStore()

  const nSlices = Math.min(params.slices, 50)
  const thickness = params.sliceThickness
  const gap = Math.max(0, params.sliceGap ?? 0)
  const pitch = thickness + gap
  const totalCoverage = nSlices * pitch - gap  // total extent including slices but not trailing gap

  const W = 280, H = 44
  const PAD = { l: 36, r: 16, t: 6, b: 16 }
  const innerW = W - PAD.l - PAD.r

  // Max displayable coverage (mm)
  const displayMax = Math.max(totalCoverage, 20)
  const tx = (mm: number) => PAD.l + (mm / displayMax) * innerW

  // Center at 0, slices from -totalCoverage/2 to +totalCoverage/2
  const startMm = -totalCoverage / 2

  // Ruler tick spacing
  const tickSpacing = totalCoverage > 200 ? 50 : totalCoverage > 100 ? 20 : totalCoverage > 40 ? 10 : 5

  return (
    <div className="mx-3 mt-1 p-2 rounded" style={{ background: '#070a0c', border: '1px solid #1a2028' }}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ color: '#4b5563', fontSize: '9px', fontWeight: 600 }}>SLICE COVERAGE</span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px' }}>
          <span style={{ color: '#9ca3af' }}>{nSlices}sl × {thickness}mm</span>
          {gap > 0 && <span style={{ color: '#fbbf24' }}>+{gap}mm gap</span>}
          <span className="font-mono font-bold" style={{ color: '#e88b00' }}>{totalCoverage.toFixed(0)}mm</span>
        </div>
      </div>

      <svg width={W} height={H}>
        {/* Center line (isocenter) */}
        <line x1={W/2} y1={PAD.t} x2={W/2} y2={H - PAD.b}
          stroke="#1e2a36" strokeWidth={0.8} strokeDasharray="2,3" />

        {/* Slices */}
        {Array.from({ length: nSlices }, (_, i) => {
          const sliceMm = startMm + i * pitch
          const x1 = tx(sliceMm - startMm)
          const w = Math.max(1, tx(sliceMm - startMm + thickness) - tx(sliceMm - startMm))
          const isMid = Math.abs(sliceMm + thickness / 2) < pitch  // is this near center?
          return (
            <g key={i}>
              <rect x={x1} y={PAD.t + 2} width={w} height={H - PAD.b - PAD.t - 4}
                fill={isMid ? '#e88b0040' : '#1d4a6a40'}
                stroke={isMid ? '#e88b00' : '#1d4a6a'}
                strokeWidth={0.6} />
            </g>
          )
        })}

        {/* Ruler */}
        <line x1={PAD.l} y1={H - PAD.b} x2={PAD.l + innerW} y2={H - PAD.b} stroke="#252525" strokeWidth={0.8} />
        {Array.from({ length: Math.floor(displayMax / tickSpacing) + 1 }, (_, i) => {
          const mm = i * tickSpacing
          const x = tx(mm)
          if (x < PAD.l || x > PAD.l + innerW) return null
          return (
            <g key={i}>
              <line x1={x} y1={H - PAD.b} x2={x} y2={H - PAD.b + 3} stroke="#374151" strokeWidth={0.6} />
              <text x={x} y={H - 1} textAnchor="middle" fill="#374151" style={{ fontSize: '6px' }}>
                {mm === 0 ? '0' : `${Math.round(startMm + mm)}mm`}
              </text>
            </g>
          )
        })}

        {/* Coverage labels */}
        <text x={PAD.l - 2} y={PAD.t + (H - PAD.b - PAD.t) / 2 + 3}
          textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>SL</text>
      </svg>
    </div>
  )
}

// ── FOV ダイアグラム ──────────────────────────────────────────────────────────
function FOVDiagram() {
  const { params } = useProtocolStore()

  const W = 220  // SVGの表示幅
  const H = 160
  const PAD = 20

  const fovPhase = params.fov * (params.phaseResolution / 100)
  const ovsFov   = fovPhase * (1 + params.phaseOversampling / 100)
  const maxDim   = Math.max(params.fov, ovsFov, 10)

  const scale   = (W - PAD * 2) / maxDim
  const readW   = params.fov * scale
  const phaseH  = fovPhase * scale
  const ovsH    = ovsFov * scale

  const cx = W / 2
  const cy = H / 2

  const isPhaseAP = params.phaseEncDir === 'A>>P' || params.phaseEncDir === 'P>>A'
  const phaseLabel = isPhaseAP ? 'A-P (Phase)' : 'R-L (Phase)'
  const readLabel  = isPhaseAP ? 'R-L (Read)' : 'A-P (Read)'

  // 位相オーバーサンプリング部分を淡色で表示
  const ovsExtraH = (ovsH - phaseH) / 2

  return (
    <div className="mx-3 mt-2 mb-1 p-2 rounded" style={{ background: '#0a0a0a', border: '1px solid #252525' }}>
      <div className="text-xs mb-1.5 font-semibold" style={{ color: '#4b5563' }}>FOV ダイアグラム</div>
      <svg width={W} height={H} style={{ display: 'block' }}>
        {/* Phase oversampling region */}
        {params.phaseOversampling > 0 && (
          <rect
            x={cx - readW / 2}
            y={cy - ovsH / 2}
            width={readW}
            height={ovsH}
            fill="#1a2a1a"
            stroke="#254525"
            strokeWidth={1}
            strokeDasharray="3,2"
          />
        )}

        {/* Main FOV box */}
        <rect
          x={cx - readW / 2}
          y={cy - phaseH / 2}
          width={readW}
          height={phaseH}
          fill="#142814"
          stroke="#4ade80"
          strokeWidth={1.5}
        />

        {/* Read direction arrow + label */}
        <line x1={cx - readW / 2 - 4} y1={H - 8} x2={cx + readW / 2 + 4} y2={H - 8}
          stroke="#60a5fa" strokeWidth={1} markerEnd="url(#arrowR)" />
        <text x={cx} y={H - 1} textAnchor="middle" fill="#60a5fa"
          style={{ fontSize: '8px', fontFamily: 'monospace' }}>
          {readLabel}: {params.fov}mm
        </text>

        {/* Phase direction arrow + label */}
        <line x1={PAD - 8} y1={cy - phaseH / 2 - 3} x2={PAD - 8} y2={cy + phaseH / 2 + 3}
          stroke="#f59e0b" strokeWidth={1} />
        <text x={4} y={cy} textAnchor="middle" fill="#f59e0b" transform={`rotate(-90, 4, ${cy})`}
          style={{ fontSize: '7px', fontFamily: 'monospace' }}>
          {phaseLabel}: {Math.round(fovPhase)}mm
        </text>

        {/* Oversampling labels */}
        {params.phaseOversampling > 0 && ovsExtraH > 4 && (
          <>
            <text x={cx + readW / 2 + 4} y={cy - phaseH / 2 - ovsExtraH / 2 + 4}
              fill="#4b5563" style={{ fontSize: '7px' }}>
              +{params.phaseOversampling}%
            </text>
            <text x={cx + readW / 2 + 4} y={cy + phaseH / 2 + ovsExtraH / 2 + 4}
              fill="#4b5563" style={{ fontSize: '7px' }}>
              +{params.phaseOversampling}%
            </text>
          </>
        )}

        {/* Voxel size label */}
        <text x={cx} y={cy} textAnchor="middle" fill="#34d399"
          style={{ fontSize: '9px', fontFamily: 'monospace', fontWeight: 600 }}>
          {(params.fov / params.matrixFreq).toFixed(1)}×
          {(fovPhase / params.matrixPhase).toFixed(1)}×
          {params.sliceThickness.toFixed(1)}mm
        </text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="#4b5563"
          style={{ fontSize: '7px' }}>
          voxel size
        </text>

        {/* Arrow marker */}
        <defs>
          <marker id="arrowR" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto">
            <path d="M0,0 L0,4 L4,2 z" fill="#60a5fa" />
          </marker>
        </defs>
      </svg>

      {/* Stats */}
      <div className="flex justify-between mt-1" style={{ fontSize: '8px', color: '#4b5563' }}>
        <span>Matrix: {params.matrixFreq}×{params.matrixPhase}</span>
        <span>Slices: {params.slices} × {params.sliceThickness}mm</span>
        <span>PhasOvs: {params.phaseOversampling}%</span>
      </div>
    </div>
  )
}

type SubTab = 'Common' | 'AutoAlign' | 'Navigator' | 'Saturation' | 'Tim'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e1200' : 'transparent',
  color: active ? '#e88b00' : '#5a5a5a',
  borderBottom: active ? '2px solid #e88b00' : '2px solid transparent',
})

// ── 位相折り返し（Wrap/Aliasing）プレビュー ───────────────────────────────────
// FOV < 体径の場合、位相方向の折り返しアーチファクトを可視化
// 実際の syngo コンソールでの折り返し警告に相当
function WrapArtifactPreview() {
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

const sectionHeader = { color: '#4b5563' }

export function GeometryTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)
  const [subTab, setSubTab] = useState<SubTab>('Common')

  // local state
  const [multiSliceMode, setMultiSliceMode] = useState('Interleaved')
  const [concatenations, setConcatenations] = useState(1)
  const [autoAlignInitPos, setAutoAlignInitPos] = useState(true)
  const [autoAlignInitOri, setAutoAlignInitOri] = useState(true)
  const [autoAlignInitRot, setAutoAlignInitRot] = useState(false)
  const [autoAlign3D, setAutoAlign3D] = useState(false)
  const [navigator, setNavigator] = useState(false)
  const [navAcceptance, setNavAcceptance] = useState(50)
  const [navPosition, setNavPosition] = useState('Auto')
  const [specialSat, setSpecialSat] = useState('None')
  const [satGap, setSatGap] = useState(10)
  const [satThickness, setSatThickness] = useState(40)
  const [setNGo, setSetNGo] = useState(false)
  const [inlineComposing, setInlineComposing] = useState(false)
  const [tablePosH, setTablePosH] = useState(0)

  const phaseEncOptions: typeof params.phaseEncDir[] = ['A>>P', 'P>>A', 'R>>L', 'L>>R', 'H>>F', 'F>>H']

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b mb-3" style={{ borderColor: '#252525' }}>
        {(['Common', 'AutoAlign', 'Navigator', 'Saturation', 'Tim'] as SubTab[]).map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className="px-3 py-1.5 text-xs transition-colors"
            style={subTabStyle(subTab === t)}
          >
            {t}
          </button>
        ))}
      </div>

      {subTab === 'Common' && (
        <div className="space-y-0.5">
          {/* Slice planning 3D view */}
          <SlicePlanView />

          {/* Slice coverage side view */}
          <SliceCoverageSideView />

          <FOVDiagram />
          {/* Phase wrap / aliasing preview */}
          <WrapArtifactPreview />
          <ParamField label="Orientation" value={params.orientation} type="select"
            options={['Tra', 'Cor', 'Sag']}
            onChange={v => setParam('orientation', v as typeof params.orientation)} />
          <ParamField label="Phase Enc Dir" hintKey="phaseEncDir" value={params.phaseEncDir} type="select"
            options={phaseEncOptions}
            onChange={v => setParam('phaseEncDir', v as typeof params.phaseEncDir)} highlight={hl('phaseEncDir')} />
          <ParamField label="FOV Read" hintKey="FOV" value={params.fov} type="range" min={100} max={500} step={10} unit="mm"
            onChange={v => setParam('fov', v as number)} highlight={hl('fov')} />
          <ParamField label="FOV Phase%" value={params.phaseResolution} type="range" min={50} max={100} step={5} unit="%"
            onChange={v => setParam('phaseResolution', v as number)} />
          <ParamField label="Slice Thickness" hintKey="sliceThickness" value={params.sliceThickness} type="range" min={0.5} max={20} step={0.5} unit="mm"
            onChange={v => setParam('sliceThickness', v as number)} highlight={hl('sliceThickness')} />
          <ParamField label="Multi Slice Mode" value={multiSliceMode} type="select"
            options={['Single Shot', 'Interleaved']}
            onChange={v => setMultiSliceMode(v as string)} />
          <ParamField label="Concatenations" hintKey="Concatenations" value={concatenations} type="number"
            min={1} max={16} step={1}
            onChange={v => setConcatenations(v as number)} />

          {/* PE Direction artifact guide */}
          <PEDirectionGuide />

          {/* Phase direction guide */}
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>位相方向の選択ガイド</div>
            <table className="w-full">
              <thead>
                <tr style={{ color: '#6b7280' }}>
                  <th className="text-left pb-1">部位</th>
                  <th className="text-left pb-1">推奨</th>
                  <th className="text-left pb-1">理由</th>
                </tr>
              </thead>
              <tbody className="text-xs" style={{ color: '#9ca3af' }}>
                <tr><td className="py-0.5 text-white">頭部 Tra</td><td>A&gt;&gt;P</td><td>眼球運動アーチファクトを前後方向に</td></tr>
                <tr><td className="py-0.5 text-white">腹部 Tra</td><td>A&gt;&gt;P</td><td>呼吸アーチファクトを前後に</td></tr>
                <tr><td className="py-0.5 text-white">脊椎 Sag</td><td>H&gt;&gt;F</td><td>嚥下・心拍アーチファクトを縦方向に</td></tr>
                <tr><td className="py-0.5 text-white">乳腺</td><td>R&gt;&gt;L</td><td>心拍アーチファクトを乳腺外へ</td></tr>
                <tr><td className="py-0.5 text-white">膝関節 Sag</td><td>A&gt;&gt;P</td><td>体の短辺方向→エイリアシングリスク↓</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'AutoAlign' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>AutoAlign Settings</div>
          <ParamField label="Initial Position" value={autoAlignInitPos} type="toggle"
            onChange={v => setAutoAlignInitPos(v as boolean)} />
          <ParamField label="Initial Orientation" value={autoAlignInitOri} type="toggle"
            onChange={v => setAutoAlignInitOri(v as boolean)} />
          <ParamField label="Initial Rotation" value={autoAlignInitRot} type="toggle"
            onChange={v => setAutoAlignInitRot(v as boolean)} />
          <ParamField label="3D AutoAlign" value={autoAlign3D} type="toggle"
            onChange={v => setAutoAlign3D(v as boolean)} />
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>AutoAlignについて</div>
            <div style={{ color: '#9ca3af' }}>
              自動的に解剖学的ランドマークを検出し、スライス位置・向きを最適化します。
              頭部・膝関節・脊椎プロトコルで特に有効。再現性の向上に貢献します。
            </div>
          </div>
        </div>
      )}

      {subTab === 'Navigator' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Navigator Echo</div>
          <ParamField label="Navigator" hintKey="PACE" value={navigator} type="toggle"
            onChange={v => setNavigator(v as boolean)} />
          {navigator && (
            <>
              <ParamField label="Navigator Acceptance%" value={navAcceptance} type="range"
                min={30} max={70} step={5} unit="%"
                onChange={v => setNavAcceptance(v as number)} />
              <ParamField label="Navigator Position" value={navPosition} type="select"
                options={['Auto', 'Manual']}
                onChange={v => setNavPosition(v as string)} />
              <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
                <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>PACE収集効率の目安</div>
                <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
                  <div>収集窓 <span className="text-white">±2.5mm:</span> 効率50-60%、精度◎</div>
                  <div>収集窓 <span className="text-white">±5mm:</span> 効率70-80%、精度○</div>
                  <div>収集窓 <span className="text-white">±10mm:</span> 効率90%+、精度△</div>
                  <div className="mt-1" style={{ color: '#6b7280' }}>撮像時間 = 基準時間 ÷ 収集効率</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {subTab === 'Saturation' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Saturation Bands</div>
          <ParamField label="Sat Bands" value={params.satBands} type="toggle"
            onChange={v => setParam('satBands', v as boolean)} />
          <ParamField label="Special Saturation" value={specialSat} type="select"
            options={['None', 'Parallel F/H', 'Parallel R/L']}
            onChange={v => setSpecialSat(v as string)} />
          <ParamField label="Sat Gap" value={satGap} type="number"
            min={0} max={100} step={5} unit="mm"
            onChange={v => setSatGap(v as number)} />
          <ParamField label="Sat Thickness" value={satThickness} type="number"
            min={10} max={150} step={5} unit="mm"
            onChange={v => setSatThickness(v as number)} />

          <div className="mx-3 mt-3 p-3 rounded text-xs space-y-3" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div>
              <div className="font-semibold mb-1.5" style={{ color: '#e88b00' }}>配置の基本原則</div>
              <div className="space-y-1" style={{ color: '#9ca3af' }}>
                <div><span className="text-white">動きアーチファクト対策:</span> 動く構造（大動脈・腸管・眼球）の<span className="text-yellow-400">直前（上流側）</span>に配置</div>
                <div><span className="text-white">静脈抑制 in MRA:</span> 静脈血の流入方向の<span className="text-yellow-400">上流</span>に配置</div>
                <div><span className="text-white">厚さ:</span> 標準<span className="text-green-400">40〜60mm</span>。薄すぎると効果不十分、厚すぎるとFOVにかかる</div>
                <div><span className="text-white">Gap:</span> 目的領域との間隔<span className="text-green-400">10mm</span>が標準。近すぎると信号低下の影響あり</div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #252525', paddingTop: '8px' }}>
              <div className="font-semibold mb-1.5" style={{ color: '#e88b00' }}>部位別配置ガイド</div>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: '#6b7280' }}>
                    <th className="text-left pb-1">部位</th>
                    <th className="text-left pb-1">配置場所</th>
                    <th className="text-left pb-1">目的</th>
                  </tr>
                </thead>
                <tbody style={{ color: '#9ca3af' }}>
                  <tr><td className="py-0.5 text-white">腹部 Tra</td><td>心臓下面（大動脈上流）</td><td>拍動アーチファクト↓</td></tr>
                  <tr><td className="py-0.5 text-white">腰椎 Sag</td><td>腹部大動脈前方</td><td>拍動アーチファクト↓</td></tr>
                  <tr><td className="py-0.5 text-white">頸椎 Sag</td><td>喉頭・気管前方</td><td>嚥下アーチファクト↓</td></tr>
                  <tr><td className="py-0.5 text-white">頭部 Tra</td><td>眼球前方（眼窩病変時）</td><td>眼球運動↓</td></tr>
                  <tr><td className="py-0.5 text-white">頸部MRA</td><td>頭蓋内側（静脈上流）</td><td>静脈信号抑制</td></tr>
                  <tr><td className="py-0.5 text-white">膝関節 Sag</td><td>膝蓋前方脂肪体</td><td>脂肪信号軽減（PDFS時）</td></tr>
                </tbody>
              </table>
            </div>
            <div style={{ borderTop: '1px solid #252525', paddingTop: '8px' }}>
              <div className="font-semibold mb-1" style={{ color: '#fbbf24' }}>注意点</div>
              <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
                <div>• 3TではSAR増加に注意（Sat BandはRFパルスを追加消費）</div>
                <div>• FOV端にかかるとエイリアシングが生じる場合あり</div>
                <div>• Sat BandがFOV内に近いと磁化移動効果で目的領域の信号低下</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === 'Tim' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Tim Settings</div>
          <ParamField label="Set-n-Go Protocol" value={setNGo} type="toggle"
            onChange={v => setSetNGo(v as boolean)} />
          <ParamField label="Inline Composing" value={inlineComposing} type="toggle"
            onChange={v => setInlineComposing(v as boolean)} />
          <ParamField label="Table Position H" value={tablePosH} type="number"
            min={-500} max={500} step={10} unit="mm"
            onChange={v => setTablePosH(v as number)} />
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>Tim (Total imaging matrix)</div>
            <div style={{ color: '#9ca3af' }}>
              複数のコイルを組み合わせて大FOV撮像を実現。脊椎全長・全身DWIなどで使用。
              Set-n-Go: テーブル移動を自動化し連続撮像を効率化します。
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
