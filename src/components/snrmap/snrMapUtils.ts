import {
  type CrossSectionConfig,
  type CoilProfile,
} from '../../data/coilProfiles'

export const CANVAS_SIZE = 256
export const GRID = 64
const MAP_SIZE = 64  // coilProfiles sensitivity map size

export type ViewMode = 'snr' | 'coil'

export function snrToRgb(snr: number, maxSnr: number): [number, number, number] {
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

export function coilSensToRgb(s: number): [number, number, number] {
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

export function isInsideEllipse(
  px: number, py: number,
  cx: number, cy: number,
  rx: number, ry: number,
): boolean {
  const dx = px - cx
  const dy = py - cy
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1
}

/** Bilinear interpolation from 64x64 grid at normalized coords (gx,gy in 0..63) */
export function bilinearSample(map: number[][], gx: number, gy: number): number {
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
export function buildSNRGrid(
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

/** Draw smooth SNR heatmap using ImageData (pixel-level bilinear upscale) */
export function drawSNRMapSmooth(
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

/** Coil channel count map */
export const COIL_CHANNELS: Record<string, number> = {
  'Head 64ch': 64,
  'Head 20ch': 20,
  'Body': 18,
  'Surface': 8,
}

/** Compute SNR statistics (min/max/mean) for pixels inside the body ellipse */
export function computeSNRStats(
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
export function drawGFactorOverlay(
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
