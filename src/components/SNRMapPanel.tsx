import { useEffect, useMemo, useRef, useState } from 'react'
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
const GRID = 64
const MAP_SIZE = 64  // coilProfiles sensitivity map size

type ViewMode = 'snr' | 'coil'

function snrToRgb(snr: number, maxSnr: number): [number, number, number] {
  if (maxSnr <= 0) return [30, 64, 175]
  const t = Math.max(0, Math.min(1, snr / maxSnr))

  if (t < 0.33) {
    const s = t / 0.33
    return [
      Math.round(30 + (22 - 30) * s),
      Math.round(64 + (163 - 64) * s),
      Math.round(175 + (74 - 175) * s),
    ]
  } else if (t < 0.66) {
    const s = (t - 0.33) / 0.33
    return [
      Math.round(22 + (202 - 22) * s),
      Math.round(163 + (138 - 163) * s),
      Math.round(74 + (4 - 74) * s),
    ]
  } else {
    const s = (t - 0.66) / 0.34
    return [
      Math.round(202 + (220 - 202) * s),
      Math.round(138 + (38 - 138) * s),
      Math.round(4 + (38 - 4) * s),
    ]
  }
}

function coilSensToRgb(s: number): [number, number, number] {
  // Cool to warm: dark blue → cyan → yellow → red
  const t = Math.max(0, Math.min(1, s))
  if (t < 0.5) {
    const u = t / 0.5
    return [
      Math.round(0 + 0 * u),
      Math.round(0 + 200 * u),
      Math.round(128 + (255 - 128) * u),
    ]
  } else {
    const u = (t - 0.5) / 0.5
    return [
      Math.round(0 + 220 * u),
      Math.round(200 + (200 - 200) * u),
      Math.round(255 + (0 - 255) * u),
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

/** Bilinear interpolation from 64x64 grid at normalized coords (gx,gy in 0..63) */
function bilinearSample(map: number[][], gx: number, gy: number): number {
  const x0 = Math.floor(gx)
  const y0 = Math.floor(gy)
  const x1 = Math.min(x0 + 1, MAP_SIZE - 1)
  const y1 = Math.min(y0 + 1, MAP_SIZE - 1)
  const fx = gx - x0
  const fy = gy - y0
  const x0c = Math.max(0, Math.min(MAP_SIZE - 1, x0))
  const y0c = Math.max(0, Math.min(MAP_SIZE - 1, y0))
  const v00 = map[y0c][x0c]
  const v10 = map[y0c][x1]
  const v01 = map[y1][x0c]
  const v11 = map[y1][x1]
  return v00 * (1 - fx) * (1 - fy) +
    v10 * fx * (1 - fy) +
    v01 * (1 - fx) * fy +
    v11 * fx * fy
}

/** Build 64x64 SNR grid, returns [snrGrid, maxSnr] */
function buildSNRGrid(
  section: CrossSectionConfig,
  coil: CoilProfile,
  globalSNR: number,
  ipatMode: string,
  ipatFactor: number,
  fieldStrength: number,
): [number[][], number] {
  const gFactorPenalty = 1.15
  const gFactor = ipatMode !== 'Off' ? Math.sqrt(ipatFactor) * gFactorPenalty : 1.0
  const o = section.outline
  let maxSnr = 0

  const snrGrid: number[][] = []
  for (let row = 0; row < GRID; row++) {
    const rowArr: number[] = []
    for (let col = 0; col < GRID; col++) {
      const nx = (col + 0.5) / GRID  // 0-1 canvas-space
      const ny = (row + 0.5) / GRID

      const inside = isInsideEllipse(nx, ny, o.cx, o.cy, o.rx, o.ry)
      if (!inside) {
        rowArr.push(0)
        continue
      }

      // Sample sensitivity from 64x64 coil map via bilinear interpolation
      const gx = (col / (GRID - 1)) * (MAP_SIZE - 1)
      const gy = (row / (GRID - 1)) * (MAP_SIZE - 1)
      let sensitivity = bilinearSample(coil.sensitivityMap, gx, gy)

      // 3T dielectric effect: abdominal center enhancement
      if (fieldStrength === 3.0 && section.id === 'abdomen_axial') {
        const distFromCenter = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2)
        sensitivity *= 1 + 0.4 * Math.exp(-(distFromCenter ** 2) / 0.05)
        sensitivity = Math.min(sensitivity, 1.5)
      }

      const snr = (globalSNR * sensitivity) / gFactor
      if (snr > maxSnr) maxSnr = snr
      rowArr.push(snr)
    }
    snrGrid.push(rowArr)
  }
  return [snrGrid, maxSnr]
}

/** Draw smooth SNR heatmap using ImageData (pixel-level bilinear upscale) */
function drawSNRMapSmooth(
  ctx: CanvasRenderingContext2D,
  section: CrossSectionConfig,
  coil: CoilProfile,
  globalSNR: number,
  ipatMode: string,
  ipatFactor: number,
  fieldStrength: number,
  showContours: boolean,
  viewMode: ViewMode,
): void {
  const o = section.outline
  const imageData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE)
  const data = imageData.data

  // Build SNR grid
  const [snrGrid, maxSnr] = buildSNRGrid(section, coil, globalSNR, ipatMode, ipatFactor, fieldStrength)

  // Fill background
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // Pixel-level rendering via ImageData
  for (let py = 0; py < CANVAS_SIZE; py++) {
    for (let px = 0; px < CANVAS_SIZE; px++) {
      const nx = (px + 0.5) / CANVAS_SIZE
      const ny = (py + 0.5) / CANVAS_SIZE

      const inside = isInsideEllipse(nx, ny, o.cx, o.cy, o.rx, o.ry)
      if (!inside) continue

      // Map pixel to grid space with bilinear interpolation
      const gx = (px / (CANVAS_SIZE - 1)) * (GRID - 1)
      const gy = (py / (CANVAS_SIZE - 1)) * (GRID - 1)
      const gx0 = Math.floor(gx)
      const gy0 = Math.floor(gy)
      const gx1 = Math.min(gx0 + 1, GRID - 1)
      const gy1 = Math.min(gy0 + 1, GRID - 1)
      const fx = gx - gx0
      const fy = gy - gy0

      const v00 = snrGrid[gy0][gx0]
      const v10 = snrGrid[gy0][gx1]
      const v01 = snrGrid[gy1][gx0]
      const v11 = snrGrid[gy1][gx1]
      const snrVal = v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy

      if (snrVal <= 0) continue

      const idx = (py * CANVAS_SIZE + px) * 4

      if (viewMode === 'coil') {
        // Show raw coil sensitivity
        const coilGx = (px / (CANVAS_SIZE - 1)) * (MAP_SIZE - 1)
        const coilGy = (py / (CANVAS_SIZE - 1)) * (MAP_SIZE - 1)
        const sens = bilinearSample(coil.sensitivityMap, coilGx, coilGy)
        const [r, g, b] = coilSensToRgb(sens)
        data[idx] = r
        data[idx + 1] = g
        data[idx + 2] = b
        data[idx + 3] = 220
      } else {
        const [r, g, b] = snrToRgb(snrVal, maxSnr)
        data[idx] = r
        data[idx + 1] = g
        data[idx + 2] = b
        data[idx + 3] = 217
      }
    }
  }

  ctx.putImageData(imageData, 0, 0)

  // Draw body outline
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
    ctx.strokeStyle = 'rgba(180,180,180,0.45)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Tissue labels
  ctx.font = '8px monospace'
  ctx.fillStyle = 'rgba(200,200,200,0.9)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const tissue of section.tissues) {
    if (tissue.rx * CANVAS_SIZE > 18) {
      ctx.fillText(tissue.label, tissue.cx * CANVAS_SIZE, tissue.cy * CANVAS_SIZE)
    }
  }

  // Contour lines (only in SNR mode)
  if (showContours && viewMode === 'snr' && maxSnr > 0) {
    drawContours(ctx, snrGrid, maxSnr)
  }
}

/** Simple Marching-Squares-style contour drawing at 25%, 50%, 75% of maxSNR */
function drawContours(
  ctx: CanvasRenderingContext2D,
  snrGrid: number[][],
  maxSnr: number,
): void {
  const levels = [0.25, 0.5, 0.75]
  const cellW = CANVAS_SIZE / GRID
  const cellH = CANVAS_SIZE / GRID

  ctx.save()
  ctx.lineWidth = 0.8

  for (const level of levels) {
    const threshold = level * maxSnr
    ctx.beginPath()

    for (let row = 0; row < GRID - 1; row++) {
      for (let col = 0; col < GRID - 1; col++) {
        const v00 = snrGrid[row][col]
        const v10 = snrGrid[row][col + 1]
        const v01 = snrGrid[row + 1][col]
        const v11 = snrGrid[row + 1][col + 1]

        // Check transitions for each of the 4 edges
        // Top edge: between (row, col) and (row, col+1)
        if ((v00 > threshold) !== (v10 > threshold)) {
          const t = (threshold - v00) / (v10 - v00)
          const x1 = (col + t) * cellW
          const y1 = row * cellH
          // Bottom edge: between (row+1, col) and (row+1, col+1)
          if ((v01 > threshold) !== (v11 > threshold)) {
            const t2 = (threshold - v01) / (v11 - v01)
            const x2 = (col + t2) * cellW
            const y2 = (row + 1) * cellH
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
          }
          // Right edge: between (row, col+1) and (row+1, col+1)
          if ((v10 > threshold) !== (v11 > threshold)) {
            const t2 = (threshold - v10) / (v11 - v10)
            const x2 = (col + 1) * cellW
            const y2 = (row + t2) * cellH
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
          }
        }
        // Left edge: between (row, col) and (row+1, col)
        if ((v00 > threshold) !== (v01 > threshold)) {
          const t = (threshold - v00) / (v01 - v00)
          const x1 = col * cellW
          const y1 = (row + t) * cellH
          // Bottom edge
          if ((v01 > threshold) !== (v11 > threshold)) {
            const t2 = (threshold - v01) / (v11 - v01)
            const x2 = (col + t2) * cellW
            const y2 = (row + 1) * cellH
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
          }
          // Right edge
          if ((v10 > threshold) !== (v11 > threshold)) {
            const t2 = (threshold - v10) / (v11 - v10)
            const x2 = (col + 1) * cellW
            const y2 = (row + t2) * cellH
            ctx.moveTo(x1, y1)
            ctx.lineTo(x2, y2)
          }
        }
      }
    }

    // Color-code levels
    const alpha = 0.55
    if (level === 0.25) ctx.strokeStyle = `rgba(100,180,255,${alpha})`
    else if (level === 0.50) ctx.strokeStyle = `rgba(255,255,255,${alpha})`
    else ctx.strokeStyle = `rgba(255,160,60,${alpha})`

    ctx.stroke()
  }
  ctx.restore()
}

/** Coil channel count map */
const COIL_CHANNELS: Record<string, number> = {
  'Head 64ch': 64,
  'Head 20ch': 20,
  'Body': 18,
  'Surface': 8,
}

/** Compute SNR statistics (min/max/mean) for pixels inside the body ellipse */
function computeSNRStats(
  snrGrid: number[][],
): { min: number; max: number; mean: number } | null {
  let sum = 0
  let count = 0
  let minVal = Infinity
  let maxVal = -Infinity
  for (let row = 0; row < snrGrid.length; row++) {
    for (let col = 0; col < snrGrid[row].length; col++) {
      const v = snrGrid[row][col]
      if (v <= 0) continue
      if (v < minVal) minVal = v
      if (v > maxVal) maxVal = v
      sum += v
      count++
    }
  }
  if (count === 0) return null
  return { min: minVal, max: maxVal, mean: sum / count }
}

/** Draw g-factor overlay on canvas: semi-transparent red where g is high */
function drawGFactorOverlay(
  ctx: CanvasRenderingContext2D,
  section: CrossSectionConfig,
  ipatFactor: number,
): void {
  const o = section.outline
  const maxRadius = Math.sqrt(o.rx * o.rx + o.ry * o.ry) // rough max radius in normalised coords
  const overlayData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE)
  const data = overlayData.data

  for (let py = 0; py < CANVAS_SIZE; py++) {
    for (let px = 0; px < CANVAS_SIZE; px++) {
      const nx = (px + 0.5) / CANVAS_SIZE
      const ny = (py + 0.5) / CANVAS_SIZE
      if (!isInsideEllipse(nx, ny, o.cx, o.cy, o.rx, o.ry)) continue

      const dx = nx - o.cx
      const dy = ny - o.cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const rNorm = dist / maxRadius
      const g = 1 + (ipatFactor - 1) * 0.55 * Math.exp(-(rNorm * rNorm) / 0.32)
      // Normalise g so that g=1 → 0 alpha, g=ipatFactor → max alpha
      const t = Math.min(1, (g - 1) / Math.max(0.001, ipatFactor - 1))
      const alpha = Math.round(t * 140)  // max 140/255 for semi-transparency

      const idx = (py * CANVAS_SIZE + px) * 4
      data[idx] = 220
      data[idx + 1] = 40
      data[idx + 2] = 40
      data[idx + 3] = alpha
    }
  }

  ctx.putImageData(overlayData, 0, 0)
}

export function SNRMapPanel() {
  const { params } = useProtocolStore()
  const [activeSectionId, setActiveSectionId] = useState<BodyCrossSection>('head_axial')
  const [showContours, setShowContours] = useState(true)
  const [showGFactor, setShowGFactor] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('snr')
  const [hoverSNR, setHoverSNR] = useState<number | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  // snrStats is computed via useMemo below (no longer state)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gOverlayRef = useRef<HTMLCanvasElement>(null)

  const section = crossSections.find(s => s.id === activeSectionId)!
  const coilFromParams = getCoilProfile(params.coil)
  const displayCoil =
    params.coil === 'Body' ? getCoilForSection(activeSectionId) : coilFromParams

  const globalSNR = calcSNR(params)

  // Cache the snrGrid for hover SNR lookup
  const snrGridRef = useRef<number[][] | null>(null)
  const maxSnrRef = useRef<number>(0)

  const snrGridData = useMemo(() => buildSNRGrid(
    section, displayCoil, globalSNR,
    params.ipatMode, params.ipatFactor, params.fieldStrength,
  ), [section, displayCoil, globalSNR, params.ipatMode, params.ipatFactor, params.fieldStrength])

  const snrStats = useMemo(() => computeSNRStats(snrGridData[0]), [snrGridData])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const [grid, maxSnr] = snrGridData
    snrGridRef.current = grid
    maxSnrRef.current = maxSnr

    drawSNRMapSmooth(
      ctx, section, displayCoil, globalSNR,
      params.ipatMode, params.ipatFactor, params.fieldStrength,
      showContours, viewMode,
    )

  }, [snrGridData, section, displayCoil, globalSNR, params.ipatMode, params.ipatFactor, params.fieldStrength, showContours, viewMode])

  // Draw g-factor overlay on separate canvas
  useEffect(() => {
    const overlayCanvas = gOverlayRef.current
    if (!overlayCanvas) return
    const ctx = overlayCanvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    if (showGFactor && params.ipatMode !== 'Off' && viewMode === 'snr') {
      drawGFactorOverlay(ctx, section, params.ipatFactor)
    }
  }, [showGFactor, section, params.ipatFactor, params.ipatMode, viewMode])

  // Mouse hover handler
  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas || !snrGridRef.current) return
    const rect = canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const nx = px / CANVAS_SIZE
    const ny = py / CANVAS_SIZE

    const o = section.outline
    if (!isInsideEllipse(nx, ny, o.cx, o.cy, o.rx, o.ry)) {
      setHoverSNR(null)
      setHoverPos(null)
      return
    }

    const gx = Math.max(0, Math.min(GRID - 1, Math.floor(nx * GRID)))
    const gy = Math.max(0, Math.min(GRID - 1, Math.floor(ny * GRID)))
    const snrVal = snrGridRef.current[gy][gx]
    setHoverSNR(Math.round(snrVal))
    setHoverPos({ x: px, y: py })
  }

  function handleMouseLeave() {
    setHoverSNR(null)
    setHoverPos(null)
  }

  const ipatReduction =
    params.ipatMode !== 'Off'
      ? Math.round((1 - 1 / (Math.sqrt(params.ipatFactor) * 1.15)) * 100)
      : 0

  const effectiveChannels = COIL_CHANNELS[displayCoil.label] ?? displayCoil.channels

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

      {/* View mode + contour controls */}
      <div
        className="flex items-center justify-between px-2 py-1 shrink-0"
        style={{ borderBottom: '1px solid #1a1a1a', background: '#0e0e0e' }}
      >
        {/* View mode tabs */}
        <div className="flex gap-1">
          {([['snr', 'SNR'], ['coil', 'コイル感度']] as [ViewMode, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              style={{
                fontSize: '9px',
                padding: '2px 7px',
                borderRadius: '3px',
                background: viewMode === id ? '#2a1800' : 'transparent',
                color: viewMode === id ? '#e88b00' : '#4b5563',
                border: `1px solid ${viewMode === id ? '#e88b00' : '#333'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Contour toggle (only in SNR mode) */}
        {viewMode === 'snr' && (
          <div className="flex gap-1">
            <button
              onClick={() => setShowContours(v => !v)}
              style={{
                fontSize: '9px',
                padding: '2px 7px',
                borderRadius: '3px',
                background: showContours ? '#001a2a' : 'transparent',
                color: showContours ? '#60b8ff' : '#4b5563',
                border: `1px solid ${showContours ? '#60b8ff' : '#333'}`,
              }}
            >
              等高線
            </button>
            <button
              onClick={() => setShowGFactor(v => !v)}
              title={params.ipatMode === 'Off' ? 'iPATがOffの場合は無効' : ''}
              style={{
                fontSize: '9px',
                padding: '2px 7px',
                borderRadius: '3px',
                background: showGFactor && params.ipatMode !== 'Off' ? '#1f0808' : 'transparent',
                color: showGFactor && params.ipatMode !== 'Off' ? '#f87171' : '#4b5563',
                border: `1px solid ${showGFactor && params.ipatMode !== 'Off' ? '#f87171' : '#333'}`,
                opacity: params.ipatMode === 'Off' ? 0.4 : 1,
              }}
            >
              g-factor
            </button>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        className="flex items-center justify-center shrink-0 py-2"
        style={{ background: '#0a0a0a', borderBottom: '1px solid #252525', position: 'relative' }}
      >
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ display: 'block', border: '1px solid #252525', cursor: 'crosshair' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          />
          {/* g-factor overlay canvas, drawn on top */}
          <canvas
            ref={gOverlayRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              display: 'block',
            }}
          />
          {/* Crosshair + tooltip */}
          {hoverPos && hoverSNR !== null && (
            <>
              {/* Crosshair lines */}
              <div
                style={{
                  position: 'absolute',
                  left: hoverPos.x,
                  top: 0,
                  width: '1px',
                  height: CANVAS_SIZE,
                  background: 'rgba(255,255,255,0.25)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: hoverPos.y,
                  width: CANVAS_SIZE,
                  height: '1px',
                  background: 'rgba(255,255,255,0.25)',
                  pointerEvents: 'none',
                }}
              />
              {/* Tooltip */}
              <div
                style={{
                  position: 'absolute',
                  left: hoverPos.x + 8,
                  top: hoverPos.y - 22,
                  background: 'rgba(0,0,0,0.85)',
                  border: '1px solid #e88b00',
                  borderRadius: '3px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  color: '#e88b00',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
              >
                SNR: {hoverSNR}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Color scale legend */}
      <div className="px-3 py-1.5 shrink-0 flex items-center gap-2" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <span className="text-xs" style={{ color: '#4b5563', fontSize: '9px' }}>
          {viewMode === 'snr' ? 'SNR低' : '感度低'}
        </span>
        <div
          className="flex-1 h-2 rounded"
          style={{
            background: viewMode === 'snr'
              ? 'linear-gradient(to right, #1e40af, #16a34a, #ca8a04, #dc2626)'
              : 'linear-gradient(to right, #008080, #00c8ff, #dc2626)',
          }}
        />
        <span className="text-xs" style={{ color: '#4b5563', fontSize: '9px' }}>高</span>

        {/* Contour legend */}
        {showContours && viewMode === 'snr' && (
          <div className="flex items-center gap-1.5 ml-2">
            {[
              { color: 'rgba(100,180,255,0.9)', label: '25%' },
              { color: 'rgba(255,255,255,0.9)', label: '50%' },
              { color: 'rgba(255,160,60,0.9)', label: '75%' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-0.5">
                <div style={{ width: 12, height: 1.5, background: color }} />
                <span style={{ fontSize: '8px', color: '#5a5a5a' }}>{label}</span>
              </div>
            ))}
          </div>
        )}
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
          {/* Channel count indicator */}
          <div
            className="mt-1.5 rounded px-2 py-1"
            style={{ background: '#111', border: '1px solid #2a2a2a' }}
          >
            <span style={{ color: '#9ca3af', fontSize: '9px' }}>実効チャンネル数: </span>
            <span style={{ color: '#e88b00', fontSize: '9px', fontFamily: 'monospace' }}>{effectiveChannels}ch</span>
            <span style={{ color: '#9ca3af', fontSize: '9px' }}> → SNR理論値 </span>
            <span style={{ color: '#4ade80', fontSize: '9px', fontFamily: 'monospace' }}>√{effectiveChannels}≈{Math.round(Math.sqrt(effectiveChannels) * 10) / 10}倍</span>
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

        {/* 3T Dielectric effect note */}
        {params.fieldStrength === 3.0 && activeSectionId === 'abdomen_axial' && (
          <div
            className="rounded p-2.5"
            style={{ background: '#001620', border: '1px solid #0e4c6a' }}
          >
            <div className="text-xs" style={{ color: '#60b8ff', fontSize: '10px' }}>
              3T Dielectric Effect
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#2a6a8a', fontSize: '9px' }}>
              腹部中央のSNR強調表示中（誘電体効果）
            </div>
          </div>
        )}

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

        {/* SNR統計 */}
        {snrStats !== null && (
          <div className="rounded p-2.5" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
            <div className="text-xs mb-1.5" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SNR統計
            </div>
            <div className="font-mono mb-1.5" style={{ color: '#9ca3af', fontSize: '9px' }}>
              {'最小: '}
              <span style={{ color: '#f87171' }}>{Math.round(snrStats.min)}%</span>
              {' | 平均: '}
              <span style={{ color: '#e88b00' }}>{Math.round(snrStats.mean)}%</span>
              {' | 最大: '}
              <span style={{ color: '#4ade80' }}>{Math.round(snrStats.max)}%</span>
            </div>
            {(() => {
              const uniformity = Math.round((snrStats.min / snrStats.max) * 100)
              const uColor = uniformity >= 70 ? '#4ade80' : uniformity >= 50 ? '#e88b00' : '#f87171'
              return (
                <div className="flex items-center gap-1.5">
                  <span style={{ color: '#4b5563', fontSize: '9px' }}>均一性:</span>
                  <span style={{ color: uColor, fontSize: '9px', fontFamily: 'monospace', fontWeight: 600 }}>
                    {uniformity}%
                  </span>
                  <div className="flex-1 h-1 rounded overflow-hidden" style={{ background: '#252525' }}>
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{ width: `${uniformity}%`, background: uColor }}
                    />
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Params summary */}
        <div className="rounded p-2.5 space-y-1" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div className="text-xs" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            現在のパラメータ
          </div>
          {[
            { label: 'Field', value: `${params.fieldStrength}T` },
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
