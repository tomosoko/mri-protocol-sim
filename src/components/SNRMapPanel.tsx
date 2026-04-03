import { useEffect, useRef, useState } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { calcSNR } from '../store/calculators'
import {
  crossSections,
  getCoilForSection,
  getCoilProfile,
  type BodyCrossSection,
  type CrossSectionConfig,
  type CoilProfile,
} from '../data/coilProfiles'

const CANVAS_SIZE = 256
const GRID = 32

function snrToRgb(snr: number, maxSnr: number): [number, number, number] {
  if (maxSnr <= 0) return [30, 64, 175]
  const t = Math.max(0, Math.min(1, snr / maxSnr))

  if (t < 0.33) {
    // blue -> green
    const s = t / 0.33
    return [
      Math.round(30 + (22 - 30) * s),
      Math.round(64 + (163 - 64) * s),
      Math.round(175 + (74 - 175) * s),
    ]
  } else if (t < 0.66) {
    // green -> yellow
    const s = (t - 0.33) / 0.33
    return [
      Math.round(22 + (202 - 22) * s),
      Math.round(163 + (138 - 163) * s),
      Math.round(74 + (4 - 74) * s),
    ]
  } else {
    // yellow -> red
    const s = (t - 0.66) / 0.34
    return [
      Math.round(202 + (220 - 202) * s),
      Math.round(138 + (38 - 138) * s),
      Math.round(4 + (38 - 4) * s),
    ]
  }
}

function isInsideEllipse(
  px: number, py: number,
  cx: number, cy: number,
  rx: number, ry: number,
): boolean {
  const dx = px - cx
  const dy = py - cy
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1
}

function drawSNRMap(
  ctx: CanvasRenderingContext2D,
  section: CrossSectionConfig,
  coil: CoilProfile,
  globalSNR: number,
  ipatMode: string,
  ipatFactor: number,
): void {
  const cellSize = CANVAS_SIZE / GRID
  const gFactorPenalty = 1.15
  const gFactor =
    ipatMode !== 'Off'
      ? Math.sqrt(ipatFactor) * gFactorPenalty
      : 1.0

  // Find max SNR for normalization
  let maxSnr = 0
  const snrGrid: number[][] = []
  for (let row = 0; row < GRID; row++) {
    const rowArr: number[] = []
    for (let col = 0; col < GRID; col++) {
      const nx = (col + 0.5) / GRID  // 0-1
      const ny = (row + 0.5) / GRID

      const o = section.outline
      const inside = isInsideEllipse(nx, ny, o.cx, o.cy, o.rx, o.ry)
      if (!inside) {
        rowArr.push(0)
        continue
      }

      const sx = Math.min(GRID - 1, Math.floor((col / GRID) * GRID))
      const sy = Math.min(GRID - 1, Math.floor((row / GRID) * GRID))
      const sensitivity = coil.sensitivityMap[sy][sx]
      const snr = (globalSNR * sensitivity) / gFactor
      if (snr > maxSnr) maxSnr = snr
      rowArr.push(snr)
    }
    snrGrid.push(rowArr)
  }

  // Draw background
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // Draw SNR heatmap
  for (let row = 0; row < GRID; row++) {
    for (let col = 0; col < GRID; col++) {
      const snr = snrGrid[row][col]
      if (snr <= 0) continue
      const [r, g, b] = snrToRgb(snr, maxSnr)
      ctx.fillStyle = `rgba(${r},${g},${b},0.85)`
      ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize)
    }
  }

  // Draw body outline (ellipse)
  const o = section.outline
  ctx.beginPath()
  ctx.ellipse(
    o.cx * CANVAS_SIZE,
    o.cy * CANVAS_SIZE,
    o.rx * CANVAS_SIZE,
    o.ry * CANVAS_SIZE,
    0, 0, Math.PI * 2,
  )
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Draw tissues
  for (const tissue of section.tissues) {
    ctx.beginPath()
    ctx.ellipse(
      tissue.cx * CANVAS_SIZE,
      tissue.cy * CANVAS_SIZE,
      tissue.rx * CANVAS_SIZE,
      tissue.ry * CANVAS_SIZE,
      0, 0, Math.PI * 2,
    )
    ctx.setLineDash([3, 3])
    ctx.strokeStyle = 'rgba(180,180,180,0.5)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Draw tissue labels (only for tissues large enough)
  ctx.font = '8px monospace'
  ctx.fillStyle = 'rgba(200,200,200,0.9)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const tissue of section.tissues) {
    // Only label if tissue is wide enough
    if (tissue.rx * CANVAS_SIZE > 18) {
      ctx.fillText(
        tissue.label,
        tissue.cx * CANVAS_SIZE,
        tissue.cy * CANVAS_SIZE,
      )
    }
  }
}

export function SNRMapPanel() {
  const { params } = useProtocolStore()
  const [activeSectionId, setActiveSectionId] = useState<BodyCrossSection>('head_axial')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const section = crossSections.find(s => s.id === activeSectionId)!
  // Use params.coil if it matches a known coil, otherwise fall back to section default
  const coilFromParams = getCoilProfile(params.coil)
  // For display: prefer section-matching coil if params.coil is generic 'Body'
  const displayCoil =
    params.coil === 'Body' ? getCoilForSection(activeSectionId) : coilFromParams

  const globalSNR = calcSNR(params)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawSNRMap(ctx, section, displayCoil, globalSNR, params.ipatMode, params.ipatFactor)
  }, [params, section, displayCoil, globalSNR])

  const ipatReduction =
    params.ipatMode !== 'Off'
      ? Math.round((1 - 1 / (Math.sqrt(params.ipatFactor) * 1.15)) * 100)
      : 0

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#141414' }}>
      {/* Header */}
      <div
        className="px-3 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shrink-0"
        style={{ color: '#4b5563', borderBottom: '1px solid #252525' }}
      >
        <span style={{ color: '#e88b00', fontSize: '10px' }}>■</span>
        SNR マップ
      </div>

      {/* Section tabs */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid #252525', background: '#0e0e0e' }}>
        {crossSections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSectionId(s.id)}
            className="flex-1 py-1.5 text-xs transition-colors"
            style={{
              background: activeSectionId === s.id ? '#1e1200' : 'transparent',
              color: activeSectionId === s.id ? '#e88b00' : '#5a5a5a',
              borderBottom: activeSectionId === s.id ? '2px solid #e88b00' : '2px solid transparent',
              fontSize: '10px',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div
        className="flex items-center justify-center shrink-0 py-2"
        style={{ background: '#0a0a0a', borderBottom: '1px solid #252525' }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          style={{ display: 'block', border: '1px solid #252525' }}
        />
      </div>

      {/* Color scale legend */}
      <div className="px-3 py-1.5 shrink-0 flex items-center gap-2" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <span className="text-xs" style={{ color: '#4b5563', fontSize: '9px' }}>SNR低</span>
        <div
          className="flex-1 h-2 rounded"
          style={{
            background: 'linear-gradient(to right, #1e40af, #16a34a, #ca8a04, #dc2626)',
          }}
        />
        <span className="text-xs" style={{ color: '#4b5563', fontSize: '9px' }}>高</span>
      </div>

      {/* Info panel */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Coil info */}
        <div className="rounded p-2.5" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div className="text-xs mb-1.5" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            コイル
          </div>
          <div className="text-xs font-mono" style={{ color: '#e88b00' }}>
            {displayCoil.label}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#6b7280', fontSize: '9px' }}>
            {displayCoil.channels}ch — {displayCoil.description}
          </div>
        </div>

        {/* SNR score */}
        <div className="rounded p-2.5" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div className="text-xs mb-1" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            SNRスコア
          </div>
          <div className="flex items-baseline gap-1.5">
            <span
              className="text-xl font-bold font-mono"
              style={{
                color: globalSNR >= 100 ? '#4ade80' : globalSNR >= 50 ? '#e88b00' : '#f87171',
              }}
            >
              {globalSNR}
            </span>
            <span className="text-xs" style={{ color: '#4b5563' }}>/200</span>
          </div>

          {/* SNR bar */}
          <div className="mt-1.5 h-1.5 rounded overflow-hidden" style={{ background: '#252525' }}>
            <div
              className="h-full rounded transition-all duration-300"
              style={{
                width: `${Math.min(100, (globalSNR / 200) * 100)}%`,
                background: globalSNR >= 100 ? '#16a34a' : globalSNR >= 50 ? '#e88b00' : '#dc2626',
              }}
            />
          </div>
        </div>

        {/* iPAT note */}
        {params.ipatMode !== 'Off' && (
          <div
            className="rounded p-2.5"
            style={{ background: '#1f1200', border: '1px solid #7c2d12' }}
          >
            <div className="text-xs" style={{ color: '#fb923c', fontSize: '10px' }}>
              iPAT {params.ipatMode} AF={params.ipatFactor}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#9a3412', fontSize: '9px' }}>
              SNR約{ipatReduction}%低下（g-factor含む）
            </div>
          </div>
        )}

        {/* Average SNR over body region */}
        <div className="rounded p-2.5" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div className="text-xs mb-1" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            平均SNR（断面内推定）
          </div>
          <div className="text-xs font-mono" style={{ color: '#9ca3af' }}>
            {Math.round(globalSNR * 0.72)} <span style={{ color: '#4b5563', fontSize: '9px' }}>（コイル感度平均×補正）</span>
          </div>
        </div>

        {/* Params summary */}
        <div className="rounded p-2.5 space-y-1" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div className="text-xs" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            現在のパラメータ
          </div>
          {[
            { label: 'FOV', value: `${params.fov} mm` },
            { label: 'Matrix', value: `${params.matrixFreq}×${params.matrixPhase}` },
            { label: 'Thickness', value: `${params.sliceThickness} mm` },
            { label: 'BW', value: `${params.bandwidth} Hz/px` },
            { label: 'Averages', value: `${params.averages}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span style={{ color: '#4b5563', fontSize: '9px' }}>{label}</span>
              <span className="font-mono" style={{ color: '#6b7280', fontSize: '9px' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
