import type { KSpaceLine, SequenceType } from '../../data/kSpacePatterns'

export const CANVAS_SIZE = 256
export const IFT_SIZE = 64 // 64x64 IFT計算サイズ

// -----------------------------------------------------------------------------
// 簡易IFT（2D逆DFT: 行方向・列方向を分離した近似）
// -----------------------------------------------------------------------------

export interface Complex { re: number; im: number }

// 1D逆DFT（N点）
export function idft1d(input: Complex[]): Complex[] {
  const N = input.length
  const output: Complex[] = new Array(N)
  for (let n = 0; n < N; n++) {
    let re = 0
    let im = 0
    for (let k = 0; k < N; k++) {
      const angle = (2 * Math.PI * k * n) / N
      re += input[k].re * Math.cos(angle) - input[k].im * Math.sin(angle)
      im += input[k].re * Math.sin(angle) + input[k].im * Math.cos(angle)
    }
    output[n] = { re: re / N, im: im / N }
  }
  return output
}

// 2D逆DFT（行→列の分離計算）
export function idft2d(kData: Complex[][]): number[][] {
  const N = IFT_SIZE
  // 行方向IDFT
  const rowResult: Complex[][] = kData.map(row => idft1d(row))

  // 列方向IDFT
  const output: number[][] = Array.from({ length: N }, () => new Array(N).fill(0))
  for (let kx = 0; kx < N; kx++) {
    const col: Complex[] = rowResult.map(row => row[kx])
    const transformed = idft1d(col)
    for (let ky = 0; ky < N; ky++) {
      output[ky][kx] = Math.sqrt(transformed[ky].re ** 2 + transformed[ky].im ** 2)
    }
  }
  return output
}

// k空間の理想的な信号分布（ガウス分布 × 楕円ファントム）
export function buildIdealKSpace(
  lines: KSpaceLine[],
  filledUpTo: number,
  matrixPhase: number,
): Complex[][] {
  const N = IFT_SIZE
  const half = Math.floor(N / 2)

  // 理想的なk空間データ（ガウス分布）
  const kData: Complex[][] = Array.from({ length: N }, (_, kyIdx) => {
    return Array.from({ length: N }, (_, kxIdx) => {
      const ky = kyIdx - half
      const kx = kxIdx - half
      // ガウス重み（中心ほど強度高）
      const sigma = N / 4
      const weight = Math.exp(-(ky * ky + kx * kx) / (2 * sigma * sigma))
      // 楕円ファントム由来の位相（簡略化: 実部のみ）
      return { re: weight, im: 0 }
    })
  })

  // 未取得ラインをゼロ埋め
  const filledKySet = new Set<number>()
  for (let i = 0; i < Math.min(filledUpTo, lines.length); i++) {
    const line = lines[i]
    if (!line.isSkipped) {
      filledKySet.add(line.ky)
    }
  }

  const kyScale = N / matrixPhase

  for (let kyIdx = 0; kyIdx < N; kyIdx++) {
    const ky = Math.round((kyIdx - half) / kyScale)
    if (!filledKySet.has(ky)) {
      // 未取得行はゼロ埋め
      for (let kxIdx = 0; kxIdx < N; kxIdx++) {
        kData[kyIdx][kxIdx] = { re: 0, im: 0 }
      }
    }
  }

  return kData
}

// IFTを計算してImageDataに変換（64x64）
export function computeIFTImageData(
  lines: KSpaceLine[],
  filledUpTo: number,
  matrixPhase: number,
): ImageData {
  const N = IFT_SIZE
  const kData = buildIdealKSpace(lines, filledUpTo, matrixPhase)
  const spatial = idft2d(kData)

  // 最大値でノーマライズ
  let maxVal = 0
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      maxVal = Math.max(maxVal, spatial[y][x])
    }
  }

  const imgData = new ImageData(N, N)
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const val = maxVal > 0 ? Math.round((spatial[y][x] / maxVal) * 255) : 0
      const idx = (y * N + x) * 4
      imgData.data[idx] = val
      imgData.data[idx + 1] = val
      imgData.data[idx + 2] = val
      imgData.data[idx + 3] = 255
    }
  }
  return imgData
}

// -----------------------------------------------------------------------------
// k空間描画
// -----------------------------------------------------------------------------

// ky位置・信号強度に応じた充填済みラインの色
export function kyToColor(ky: number, matrixPhase: number, alpha = 1): string {
  const half = Math.floor(matrixPhase / 2)
  // ガウス重み: 中心ほど明るく
  const sigma2 = (half * half) / 8
  const weight = Math.exp(-(ky * ky) / sigma2) // 0~1
  // 暗青(0) → 白(1) のグラデーション
  const r = Math.round(20 + 235 * weight)
  const g = Math.round(100 + 155 * weight)
  const b = Math.round(180 + 75 * weight)
  if (alpha < 1) {
    return `rgba(${r},${g},${b},${alpha})`
  }
  return `rgb(${r},${g},${b})`
}

export function drawKSpace(
  ctx: CanvasRenderingContext2D,
  lines: KSpaceLine[],
  filledUpTo: number,
  matrixPhase: number,
  partialFourier: string,
  sequenceType: SequenceType,
): void {
  const half = Math.floor(matrixPhase / 2)

  // 背景
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // スケール: matrixPhase行 → 256px
  const lineHeight = CANVAS_SIZE / matrixPhase
  const clampedLineH = Math.max(1, lineHeight)

  // ky → y座標変換（ky=+half → 上、ky=-half → 下）
  const kyToY = (ky: number): number => {
    return ((half - ky) / matrixPhase) * CANVAS_SIZE
  }

  // 未充填ライン（暗灰色で全ライン描画）
  ctx.fillStyle = '#1a1a1a'
  for (let ky = -half + 1; ky <= half; ky++) {
    const y = kyToY(ky)
    ctx.fillRect(0, y, CANVAS_SIZE, clampedLineH)
  }

  // PartialFourier省略領域（グレーハッチング）
  if (partialFourier !== 'Off') {
    const pfMap: Record<string, number> = { '4/8': 0.5, '5/8': 0.375, '6/8': 0.25, '7/8': 0.125 }
    const skipFrac = pfMap[partialFourier] ?? 0
    const skipLines = Math.round(half * skipFrac * 2)
    const pfStartKy = half - skipLines + 1

    const yStart = kyToY(half)
    const yEnd = kyToY(pfStartKy - 1)
    const hatchH = Math.abs(yEnd - yStart)

    ctx.save()
    ctx.fillStyle = '#141414'
    ctx.fillRect(0, yStart, CANVAS_SIZE, hatchH)

    // 対角線ハッチング
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 5])
    const step = 8
    for (let x = -hatchH; x < CANVAS_SIZE + hatchH; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, yStart)
      ctx.lineTo(x + hatchH, yStart + hatchH)
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.restore()
  }

  const isBLADE = sequenceType === 'BLADE'
  const isEPI = sequenceType === 'EPI'
  const isTSE = sequenceType === 'TSE'

  if (isBLADE) {
    // BLADEは回転する矩形ブレードをCanvas transformで描画
    const bladesDrawn = new Map<number, KSpaceLine[]>()
    const filledLines = lines.slice(0, filledUpTo)
    for (const line of filledLines) {
      const angle = line.bladeAngleDeg ?? 0
      if (!bladesDrawn.has(angle)) bladesDrawn.set(angle, [])
      bladesDrawn.get(angle)!.push(line)
    }

    const cx = CANVAS_SIZE / 2
    const cy = CANVAS_SIZE / 2

    for (const [angleDeg, bladeLines] of bladesDrawn.entries()) {
      const angleRad = (angleDeg * Math.PI) / 180
      const bladeKys = bladeLines.map(l => l.ky)
      const minKy = Math.min(...bladeKys)
      const maxKy = Math.max(...bladeKys)
      const bladeWidthPx = CANVAS_SIZE * 0.8
      const centerY = kyToY((minKy + maxKy) / 2)
      const bladeOffsetY = centerY - cy

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(angleRad)
      ctx.translate(-cx, -cy + bladeOffsetY)

      // ブレード内の各ラインを描画
      for (const line of bladeLines) {
        const lineY = kyToY(line.ky) - bladeOffsetY
        ctx.fillStyle = kyToColor(line.ky, matrixPhase)
        ctx.fillRect(cx - bladeWidthPx / 2, lineY, bladeWidthPx, clampedLineH)
      }
      ctx.restore()
    }
  } else {
    // 充填済みラインを描画
    const filledLines = lines.slice(0, filledUpTo)
    // k空間中心±20%の閾値
    const centerThreshold = Math.floor(matrixPhase * 0.10) // ±10% → 合計20%

    for (const line of filledLines) {
      if (line.isSkipped) {
        ctx.fillStyle = '#3f0d0d'
        const y = kyToY(line.ky)
        ctx.fillRect(0, y, CANVAS_SIZE, clampedLineH)
        continue
      }
      if (line.isACS) {
        ctx.fillStyle = '#f97316'
        const y = kyToY(line.ky)
        ctx.fillRect(0, y, CANVAS_SIZE, clampedLineH)
        continue
      }

      // TSEのスピンエコー主エコー（echoIndex=0）は少し明るく
      const isTSEMainEcho = isTSE && line.echoIndex === 0
      // k空間中心±20%のラインかどうか
      const isCenterLine = Math.abs(line.ky) <= centerThreshold
      const y = kyToY(line.ky)

      if (isEPI) {
        // EPIはechoIndexで方向が変わる（zigzag矢印は別途オーバーレイ）
        ctx.fillStyle = kyToColor(line.ky, matrixPhase)
        ctx.fillRect(0, y, CANVAS_SIZE, clampedLineH)
        // 中心ラインをハイライト
        if (isCenterLine) {
          ctx.fillStyle = 'rgba(200,240,255,0.20)'
          ctx.fillRect(0, y, CANVAS_SIZE, clampedLineH)
        }
      } else {
        ctx.fillStyle = isTSEMainEcho
          ? kyToColor(line.ky, matrixPhase, 1) // 主エコーも同色（後で明るいオーバーレイ）
          : kyToColor(line.ky, matrixPhase)
        ctx.fillRect(0, y, CANVAS_SIZE, clampedLineH)

        // TSE主エコー（echoIndex=0）に明るいオーバーレイ
        if (isTSEMainEcho) {
          ctx.fillStyle = 'rgba(255,255,255,0.18)'
          ctx.fillRect(0, y, CANVAS_SIZE, clampedLineH)
        }
        // k空間中心±20%に淡いシアンオーバーレイ（コントラスト支配領域を可視化）
        if (isCenterLine) {
          ctx.fillStyle = 'rgba(200,240,255,0.18)'
          ctx.fillRect(0, y, CANVAS_SIZE, clampedLineH)
        }
      }
    }

    // EPI: 現在充填中ラインに矢印オーバーレイ
    if (isEPI && filledUpTo > 0 && filledUpTo < lines.length) {
      const currentLine = lines[filledUpTo - 1]
      if (currentLine && !currentLine.isSkipped) {
        const y = kyToY(currentLine.ky)
        const isReverse = currentLine.echoIndex % 2 === 1
        const arrowY = y + clampedLineH / 2

        ctx.save()
        ctx.strokeStyle = 'rgba(255,220,50,0.9)'
        ctx.fillStyle = 'rgba(255,220,50,0.9)'
        ctx.lineWidth = 1.5

        if (isReverse) {
          // 右→左矢印
          ctx.beginPath()
          ctx.moveTo(CANVAS_SIZE - 12, arrowY)
          ctx.lineTo(10, arrowY)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(10, arrowY)
          ctx.lineTo(18, arrowY - 4)
          ctx.lineTo(18, arrowY + 4)
          ctx.closePath()
          ctx.fill()
        } else {
          // 左→右矢印
          ctx.beginPath()
          ctx.moveTo(12, arrowY)
          ctx.lineTo(CANVAS_SIZE - 10, arrowY)
          ctx.stroke()
          ctx.beginPath()
          ctx.moveTo(CANVAS_SIZE - 10, arrowY)
          ctx.lineTo(CANVAS_SIZE - 18, arrowY - 4)
          ctx.lineTo(CANVAS_SIZE - 18, arrowY + 4)
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      }
    }
  }

  // k空間中心（ky=0付近）白点線
  ctx.save()
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  const centerY = kyToY(0)
  ctx.beginPath()
  ctx.moveTo(0, centerY)
  ctx.lineTo(CANVAS_SIZE, centerY)
  ctx.stroke()
  // kx中心（垂直）
  ctx.beginPath()
  ctx.moveTo(CANVAS_SIZE / 2, 0)
  ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  // 軸ラベル
  ctx.font = '8px monospace'
  ctx.fillStyle = 'rgba(100,100,100,0.8)'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('kx →', 2, 2)
  ctx.save()
  ctx.translate(2, CANVAS_SIZE - 2)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'right'
  ctx.fillText('ky ↑', 0, 0)
  ctx.restore()
}
