import { useEffect, useRef, useState } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { kSpacePatterns, type SequenceType, type KSpaceLine } from '../data/kSpacePatterns'

const CANVAS_SIZE = 256
const IFT_SIZE = 64 // 64x64 IFT計算サイズ

// -----------------------------------------------------------------------------
// 簡易IFT（2D逆DFT: 行方向・列方向を分離した近似）
// -----------------------------------------------------------------------------

interface Complex { re: number; im: number }

// 1D逆DFT（N点）
function idft1d(input: Complex[]): Complex[] {
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
function idft2d(kData: Complex[][]): number[][] {
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
function buildIdealKSpace(
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
function computeIFTImageData(
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
function kyToColor(ky: number, matrixPhase: number, alpha = 1): string {
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

function drawKSpace(
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

// -----------------------------------------------------------------------------
// コンポーネント
// -----------------------------------------------------------------------------

const SEQ_TYPES: SequenceType[] = ['TSE', 'HASTE', 'EPI', 'GRE', 'BLADE']

interface InnerProps {
  lines: KSpaceLine[]
  matrixPhase: number
  partialFourier: string
  seqType: SequenceType
  turboFactor: number
  echoSpacing: number
  ipatMode: string
  ipatFactor: number
}

// アニメーション管理コンポーネント。keyが変わると再マウントされてstateがリセットされる
function KSpaceVisualizerInner({
  lines,
  matrixPhase,
  partialFourier,
  seqType,
  turboFactor,
  echoSpacing,
  ipatMode,
  ipatFactor,
}: InnerProps) {
  const [filledUpTo, setFilledUpTo] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(3)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const iftCanvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // IFT計算は重いのでthrottleする
  const lastIftFrameRef = useRef<number>(0)

  const totalLines = lines.length
  const activeLines = lines.filter(l => !l.isSkipped)
  const maxTr = lines.length > 0 ? Math.max(...lines.map(l => l.trIndex)) + 1 : 0
  const currentTr = filledUpTo > 0 ? lines[Math.min(filledUpTo - 1, lines.length - 1)]?.trIndex ?? 0 : 0

  // アニメーション
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (!isPlaying) return

    const intervalMs = Math.round(300 - (speed - 1) * 67.5)
    const step = Math.max(1, Math.ceil(speed * 2))

    intervalRef.current = setInterval(() => {
      setFilledUpTo(prev => {
        if (prev >= totalLines) {
          setIsPlaying(false)
          return prev
        }
        return Math.min(prev + step, totalLines)
      })
    }, intervalMs)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, speed, totalLines])

  // k空間Canvas描画
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawKSpace(ctx, lines, filledUpTo, matrixPhase, partialFourier, seqType)
  }, [lines, filledUpTo, matrixPhase, partialFourier, seqType])

  // IFTプレビュー描画（throttle: 最低200ms間隔）
  useEffect(() => {
    const now = Date.now()
    if (now - lastIftFrameRef.current < 200 && filledUpTo !== 0 && filledUpTo !== totalLines) return
    lastIftFrameRef.current = now

    const canvas = iftCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imgData = computeIFTImageData(lines, filledUpTo, matrixPhase)
    ctx.putImageData(imgData, 0, 0)
  }, [lines, filledUpTo, matrixPhase, totalLines])

  const handlePlayPause = () => {
    if (filledUpTo >= totalLines) {
      setFilledUpTo(0)
      setIsPlaying(true)
    } else {
      setIsPlaying(p => !p)
    }
  }

  const handleReset = () => {
    setFilledUpTo(0)
    setIsPlaying(false)
  }

  const pattern = kSpacePatterns.find(p => p.sequenceType === seqType)!
  const filledActiveCount = activeLines.filter((_, i) => {
    const origIdx = lines.findIndex(l => l === activeLines[i])
    return origIdx < filledUpTo
  }).length

  // IFTのぼかし度（0=完全、1=未取得）
  const fillRatio = totalLines > 0 ? filledUpTo / totalLines : 0
  const blurPx = Math.round((1 - fillRatio) * 4)

  // ── T2ブラーリング予測 ──────────────────────────────────────────
  // TE_eff = ETL × echoSpacing / 2
  const T2_BRAIN_MS = 100 // 脳白質の代表T2値
  const teEff = turboFactor * echoSpacing / 2
  const blurScore = 1 - Math.exp(-teEff / T2_BRAIN_MS) // 0=シャープ, 1=重度ブラー
  const blurPct = Math.round(blurScore * 100)
  // グリーン→イエロー→レッド のグラデーション色
  const blurBarColor =
    blurPct < 33 ? '#22c55e' : blurPct < 66 ? '#f59e0b' : '#ef4444'
  const blurLabel =
    blurPct < 25 ? 'シャープ' : blurPct < 50 ? '軽度ブラー' : blurPct < 75 ? '中度ブラー' : '重度ブラー'

  // ── k空間充填率 ───────────────────────────────────────────────────
  const pfRatioMap: Record<string, number> = {
    'Off': 1.0, '7/8': 0.875, '6/8': 0.75, '5/8': 0.625, '4/8': 0.5,
  }
  const pfRatio = pfRatioMap[partialFourier] ?? 1.0
  const acquisitionFillRatio = (1 / ipatFactor) * pfRatio
  const acquisitionFillPct = Math.round(acquisitionFillRatio * 100)

  return (
    <>
      {/* k空間 + IFTプレビュー 縦並び */}
      <div
        className="flex flex-col items-center shrink-0 py-2 px-2 gap-2"
        style={{ background: '#0a0a0a', borderBottom: '1px solid #252525' }}
      >
        {/* k空間Canvas */}
        <div className="flex flex-col items-center gap-1 w-full">
          <span style={{ fontSize: '8px', color: '#4b5563', fontFamily: 'monospace' }}>k空間</span>
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ display: 'block', border: '1px solid #252525', width: '100%', height: 'auto', maxWidth: CANVAS_SIZE }}
          />
        </div>

        {/* IFTプレビュー */}
        <div className="flex flex-col items-center gap-1 w-full">
          <span style={{ fontSize: '8px', color: '#4b5563', fontFamily: 'monospace' }}>IFT画像</span>
          <canvas
            ref={iftCanvasRef}
            width={IFT_SIZE}
            height={IFT_SIZE}
            style={{
              display: 'block',
              width: CANVAS_SIZE,
              height: CANVAS_SIZE,
              border: '1px solid #252525',
              imageRendering: 'pixelated',
              filter: blurPx > 0 ? `blur(${blurPx}px)` : 'none',
            }}
          />
          <div style={{ width: CANVAS_SIZE, fontSize: '8px', color: '#374151', textAlign: 'center', lineHeight: 1.3 }}>
            {fillRatio < 0.15
              ? 'k空間中心のみ: ぼやけ'
              : fillRatio < 0.7
              ? '取得中: 解像度上昇'
              : '完全取得: 鮮明'}
          </div>
        </div>

        {/* T2ブラーリング予測 */}
        <div className="w-full" style={{ maxWidth: CANVAS_SIZE }}>
          <div className="flex justify-between items-center mb-0.5">
            <span style={{ fontSize: '8px', color: '#4b5563', fontFamily: 'monospace' }}>T2ブラーリング予測</span>
            <span style={{ fontSize: '8px', color: blurBarColor, fontFamily: 'monospace', fontWeight: 600 }}>
              {blurPct}% {blurLabel}
            </span>
          </div>
          {/* バー */}
          <div style={{ width: '100%', height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden', border: '1px solid #252525' }}>
            <div style={{
              width: `${blurPct}%`, height: '100%',
              background: `linear-gradient(90deg, #22c55e, ${blurBarColor})`,
              borderRadius: 3, transition: 'width 0.3s',
            }} />
          </div>
          {/* スケール注釈 */}
          <div className="flex justify-between mt-0.5">
            <span style={{ fontSize: '7px', color: '#374151' }}>0% シャープ</span>
            <span style={{ fontSize: '7px', color: '#374151' }}>100% 重度</span>
          </div>
          {/* 計算式ノート */}
          <div style={{ fontSize: '7px', color: '#374151', fontFamily: 'monospace', marginTop: 2 }}>
            TE_eff = ETL×ESP/2 = {teEff.toFixed(1)}ms (T2脳={T2_BRAIN_MS}ms)
          </div>
        </div>

        {/* k空間充填率 */}
        <div className="w-full" style={{ maxWidth: CANVAS_SIZE }}>
          <div className="flex justify-between items-center mb-0.5">
            <span style={{ fontSize: '8px', color: '#4b5563', fontFamily: 'monospace' }}>k空間充填率</span>
            <span style={{ fontSize: '8px', color: '#9ca3af', fontFamily: 'monospace', fontWeight: 600 }}>
              {acquisitionFillPct}%
            </span>
          </div>
          <div style={{ width: '100%', height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden', border: '1px solid #252525' }}>
            <div style={{
              width: `${acquisitionFillPct}%`, height: '100%',
              background: 'linear-gradient(90deg, #1d4ed8, #60a5fa)',
              borderRadius: 3,
            }} />
          </div>
          <div style={{ fontSize: '7px', color: '#374151', fontFamily: 'monospace', marginTop: 2 }}>
            1/iPAT({ipatFactor}) × PF({partialFourier === 'Off' ? '1.0' : partialFourier}) = {acquisitionFillRatio.toFixed(3)}
          </div>
        </div>
      </div>

      {/* 凡例 */}
      <div
        className="px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid #1a1a1a', background: '#0e0e0e' }}
      >
        {/* 1行目: 基本凡例 */}
        <div className="flex items-center gap-3 flex-wrap mb-1.5">
          {[
            { label: '充填(外周)', gradient: 'linear-gradient(90deg, rgb(20,100,180), rgb(120,180,220))', title: '外周ライン: 空間解像度を決定' },
            { label: '充填(中心)', gradient: 'linear-gradient(90deg, rgb(200,240,255), rgb(255,255,255))', title: 'k空間中心±20%: コントラスト・SNRを支配' },
            { label: 'ACS', color: '#f97316', title: 'Auto-Calibration Signal: iPAT展開に必要なキャリブレーションライン' },
            { label: 'スキップ', color: '#3f0d0d', title: 'iPATで間引かれた未取得ライン' },
            { label: 'PF省略', color: '#141414', border: '1px solid #2a2a2a', title: 'Partial Fourier: 非対称取得により省略された領域' },
          ].map(({ color, label, border, gradient, title }) => (
            <span key={label} className="flex items-center gap-1" style={{ fontSize: '9px', color: '#6b7280' }} title={title}>
              <span style={{
                display: 'inline-block', width: 24, height: 4,
                background: gradient ?? color,
                border, borderRadius: 1,
              }} />
              {label}
            </span>
          ))}
          {seqType === 'TSE' && (
            <span className="flex items-center gap-1" style={{ fontSize: '9px', color: '#6b7280' }} title="echoIndex=0の主エコーライン（コントラスト形成に最も寄与）">
              <span style={{ display: 'inline-block', width: 10, height: 4, background: 'rgba(255,255,255,0.5)', borderRadius: 1 }} />
              主エコー
            </span>
          )}
        </div>
        {/* 2行目: 色域の意味の補足説明 */}
        <div style={{ fontSize: '7.5px', color: '#374151', lineHeight: 1.5 }}>
          <span style={{ color: '#e5e7eb', fontWeight: 600 }}>中心±20%:</span> コントラスト・SNR支配 &nbsp;|&nbsp;
          <span style={{ color: '#f97316', fontWeight: 600 }}>ACS:</span> iPAT展開キャリブ &nbsp;|&nbsp;
          <span style={{ color: '#6b7280', fontWeight: 600 }}>外周:</span> 空間解像度・エッジ
        </div>
      </div>

      {/* Controls */}
      <div className="px-3 py-2 shrink-0 space-y-2" style={{ borderBottom: '1px solid #252525' }}>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayPause}
            className="flex items-center justify-center w-8 h-8 rounded transition-colors"
            style={{
              background: isPlaying ? '#2a1200' : '#1a2a1a',
              color: isPlaying ? '#e88b00' : '#4ade80',
              border: `1px solid ${isPlaying ? '#c47400' : '#166534'}`,
              fontSize: '14px',
            }}
            title={isPlaying ? '停止' : '再生'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center w-8 h-8 rounded transition-colors"
            style={{ background: '#1a1a1a', color: '#6b7280', border: '1px solid #374151', fontSize: '14px' }}
            title="リセット"
          >
            ⟳
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span style={{ fontSize: '9px', color: '#4b5563' }}>遅</span>
            <input
              type="range" min={1} max={5} step={1} value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: '#e88b00', height: '2px' }}
            />
            <span style={{ fontSize: '9px', color: '#4b5563' }}>速</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-0.5" style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'monospace' }}>
          <span>充填: <span style={{ color: '#9ca3af' }}>{filledActiveCount}</span>/<span style={{ color: '#9ca3af' }}>{activeLines.length}</span> ライン</span>
          <span>TR: <span style={{ color: '#9ca3af' }}>{filledUpTo > 0 ? currentTr + 1 : 0}</span>/<span style={{ color: '#9ca3af' }}>{maxTr}</span></span>
          <span>ETL: <span style={{ color: '#9ca3af' }}>{turboFactor}</span></span>
        </div>
      </div>

      {/* Description & params */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <div className="rounded p-2.5" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div className="text-xs mb-1" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {pattern.label}
          </div>
          <div style={{ color: '#9ca3af', fontSize: '10px', lineHeight: '1.5' }}>
            {pattern.description}
          </div>
        </div>

        <div className="rounded p-2.5 space-y-1" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div className="text-xs" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            関連パラメータ
          </div>
          {[
            { label: 'Matrix Phase', value: `${matrixPhase}` },
            { label: 'Turbo Factor', value: `${turboFactor}` },
            { label: 'Partial Fourier', value: partialFourier },
            { label: 'iPAT', value: ipatMode !== 'Off' ? `${ipatMode} AF=${ipatFactor}` : 'Off' },
            { label: '総ライン数', value: `${totalLines}` },
            { label: '取得ライン', value: `${activeLines.length}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span style={{ color: '#4b5563', fontSize: '9px' }}>{label}</span>
              <span className="font-mono" style={{ color: '#6b7280', fontSize: '9px' }}>{value}</span>
            </div>
          ))}
        </div>

        {ipatMode !== 'Off' && (
          <div className="rounded p-2.5" style={{ background: '#1f1200', border: '1px solid #7c2d12' }}>
            <div className="text-xs" style={{ color: '#fb923c', fontSize: '10px' }}>
              iPAT {ipatMode} AF={ipatFactor}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#9a3412', fontSize: '9px' }}>
              オレンジ: ACS（中央キャリブレーション）ライン
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#9a3412', fontSize: '9px' }}>
              暗赤: スキップライン（間引き取得）
            </div>
          </div>
        )}

        {seqType === 'TSE' && (
          <div className="rounded p-2.5" style={{ background: '#0f1a0f', border: '1px solid #1a3a1a' }}>
            <div className="text-xs" style={{ color: '#4ade80', fontSize: '10px' }}>
              TSE エコートレイン
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#2d6a2d', fontSize: '9px' }}>
              白オーバーレイ: echoIndex=0（スピンエコー主エコー）
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#2d6a2d', fontSize: '9px' }}>
              同一TR内の複数エコーがグループを形成
            </div>
          </div>
        )}

        {seqType === 'EPI' && (
          <div className="rounded p-2.5" style={{ background: '#0f0f1a', border: '1px solid #1a1a3a' }}>
            <div className="text-xs" style={{ color: '#818cf8', fontSize: '10px' }}>
              EPI Zigzag
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#2d2d6a', fontSize: '9px' }}>
              黄色矢印: 現在取得中ラインの読み出し方向
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#2d2d6a', fontSize: '9px' }}>
              偶数echo: 左→右 / 奇数echo: 右→左
            </div>
          </div>
        )}

        {seqType === 'BLADE' && (
          <div className="rounded p-2.5" style={{ background: '#1a0f0f', border: '1px solid #3a1a1a' }}>
            <div className="text-xs" style={{ color: '#f87171', fontSize: '10px' }}>
              BLADE 回転ブレード
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#6a2d2d', fontSize: '9px' }}>
              各TRで30°ずつ回転する矩形ブレード
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#6a2d2d', fontSize: '9px' }}>
              中心部は毎回取得→モーション補正に活用
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export function KSpaceVisualizer() {
  const { params } = useProtocolStore()
  const [seqType, setSeqType] = useState<SequenceType>('TSE')

  const pattern = kSpacePatterns.find(p => p.sequenceType === seqType)!
  const lines: KSpaceLine[] = pattern.generate({
    matrixPhase: params.matrixPhase,
    turboFactor: params.turboFactor,
    partialFourier: params.partialFourier,
    ipatMode: params.ipatMode,
    ipatFactor: params.ipatFactor,
  })

  // パラメータが変わるとkeyが変わりInnerが再マウント（state自動リセット）
  const innerKey = `${seqType}_${params.matrixPhase}_${params.turboFactor}_${params.partialFourier}_${params.ipatMode}_${params.ipatFactor}_${params.echoSpacing}`

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#141414' }}>
      {/* Header */}
      <div
        className="px-3 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shrink-0"
        style={{ color: '#4b5563', borderBottom: '1px solid #252525' }}
      >
        <span style={{ color: '#e88b00', fontSize: '10px' }}>■</span>
        k空間ビジュアライザ
      </div>

      {/* Sequence type tabs */}
      <div className="flex shrink-0" style={{ borderBottom: '1px solid #252525', background: '#0e0e0e' }}>
        {SEQ_TYPES.map(s => (
          <button
            key={s}
            onClick={() => setSeqType(s)}
            className="flex-1 py-1.5 text-xs transition-colors"
            style={{
              background: seqType === s ? '#1e1200' : 'transparent',
              color: seqType === s ? '#e88b00' : '#5a5a5a',
              borderBottom: seqType === s ? '2px solid #e88b00' : '2px solid transparent',
              fontSize: '10px',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <KSpaceVisualizerInner
        key={innerKey}
        lines={lines}
        matrixPhase={params.matrixPhase}
        partialFourier={params.partialFourier}
        seqType={seqType}
        turboFactor={params.turboFactor}
        echoSpacing={params.echoSpacing}
        ipatMode={params.ipatMode}
        ipatFactor={params.ipatFactor}
      />
    </div>
  )
}
