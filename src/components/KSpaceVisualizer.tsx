import { useEffect, useRef, useState } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { kSpacePatterns, type SequenceType, type KSpaceLine } from '../data/kSpacePatterns'

const CANVAS_SIZE = 256

// trIndexに応じた充填済みラインの色（青緑グラデーション）
function trIndexToColor(trIndex: number, maxTr: number): string {
  const t = maxTr > 0 ? Math.min(1, trIndex / maxTr) : 0
  // 深青(0) → 青緑(0.5) → シアン(1)
  const r = Math.round(0 + 20 * t)
  const g = Math.round(80 + 160 * t)
  const b = Math.round(160 + 80 * t)
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
  const maxTr = lines.length > 0 ? Math.max(...lines.map(l => l.trIndex)) : 0

  // 背景
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  // スケール: matrixPhase行 → 256px
  const lineHeight = CANVAS_SIZE / matrixPhase
  const clampedLineH = Math.max(1, lineHeight)

  // ky → y座標変換（ky=+half → 上、ky=-half → 下）
  const kyToY = (ky: number): number => {
    // ky=+half → y=0, ky=-half → y=CANVAS_SIZE
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

  // EPI zigzagの視覚的方向インジケーター
  const isEPI = sequenceType === 'EPI'

  // 充填済みラインを描画
  const filledLines = lines.slice(0, filledUpTo)
  for (const line of filledLines) {
    if (line.isSkipped) {
      // スキップライン（暗い赤）
      ctx.fillStyle = '#3f0d0d'
      const y = kyToY(line.ky)
      ctx.fillRect(0, y, CANVAS_SIZE, clampedLineH)
      continue
    }
    if (line.isACS) {
      // ACSライン（オレンジ）
      ctx.fillStyle = '#f97316'
      const y = kyToY(line.ky)
      ctx.fillRect(0, y, CANVAS_SIZE, clampedLineH)
      continue
    }

    // 通常充填ライン（trIndexグラデーション）
    ctx.fillStyle = trIndexToColor(line.trIndex, maxTr)
    const y = kyToY(line.ky)

    if (isEPI) {
      // EPIは奇数echoIndexで逆方向（右→左は半分だけ描画で視覚的に区別）
      const isReverse = line.echoIndex % 2 === 1
      if (isReverse) {
        // 右半分は少し暗く（zigzag表現）
        ctx.fillRect(0, y, CANVAS_SIZE / 2, clampedLineH)
        ctx.fillStyle = trIndexToColor(line.trIndex, maxTr).replace('rgb', 'rgba').replace(')', ',0.7)')
        ctx.fillRect(CANVAS_SIZE / 2, y, CANVAS_SIZE / 2, clampedLineH)
      } else {
        ctx.fillRect(0, y, CANVAS_SIZE, clampedLineH)
      }
    } else {
      ctx.fillRect(0, y, CANVAS_SIZE, clampedLineH)
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

const SEQ_TYPES: SequenceType[] = ['TSE', 'HASTE', 'EPI', 'GRE', 'BLADE']

export function KSpaceVisualizer() {
  const { params } = useProtocolStore()
  const [seqType, setSeqType] = useState<SequenceType>('TSE')
  const [filledUpTo, setFilledUpTo] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(3) // 1=遅〜5=速
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 現在のパターン
  const pattern = kSpacePatterns.find(p => p.sequenceType === seqType)!
  const lines: KSpaceLine[] = pattern.generate({
    matrixPhase: params.matrixPhase,
    turboFactor: params.turboFactor,
    partialFourier: params.partialFourier,
    ipatMode: params.ipatMode,
    ipatFactor: params.ipatFactor,
  })

  const totalLines = lines.length
  const activeLines = lines.filter(l => !l.isSkipped)
  const maxTr = lines.length > 0 ? Math.max(...lines.map(l => l.trIndex)) + 1 : 0
  const currentTr = filledUpTo > 0 ? lines[Math.min(filledUpTo - 1, lines.length - 1)]?.trIndex ?? 0 : 0

  // パラメータ変更でリセット
  const reset = useCallback(() => {
    setFilledUpTo(0)
    setIsPlaying(false)
  }, [])

  useEffect(() => {
    reset()
  }, [params.turboFactor, params.matrixPhase, params.partialFourier, params.ipatMode, params.ipatFactor, seqType, reset])

  // アニメーション
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!isPlaying) return

    // speed 1〜5 → interval 300〜30ms
    const intervalMs = Math.round(300 - (speed - 1) * 67.5)
    // 1stepで進むライン数（速いほど多く）
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

  // Canvas描画
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawKSpace(ctx, lines, filledUpTo, params.matrixPhase, params.partialFourier, seqType)
  }, [lines, filledUpTo, params.matrixPhase, params.partialFourier, seqType])

  const handlePlayPause = () => {
    if (filledUpTo >= totalLines) {
      setFilledUpTo(0)
      setIsPlaying(true)
    } else {
      setIsPlaying(p => !p)
    }
  }

  const handleReset = () => {
    reset()
  }

  const pattern2 = kSpacePatterns.find(p => p.sequenceType === seqType)!

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

      {/* 凡例 */}
      <div
        className="px-3 py-1.5 shrink-0 flex items-center gap-3 flex-wrap"
        style={{ borderBottom: '1px solid #1a1a1a', background: '#0e0e0e' }}
      >
        <span className="flex items-center gap-1" style={{ fontSize: '9px', color: '#6b7280' }}>
          <span style={{ display: 'inline-block', width: 10, height: 4, background: 'rgb(20,160,200)', borderRadius: 1 }} />
          充填済
        </span>
        <span className="flex items-center gap-1" style={{ fontSize: '9px', color: '#6b7280' }}>
          <span style={{ display: 'inline-block', width: 10, height: 4, background: '#f97316', borderRadius: 1 }} />
          ACS
        </span>
        <span className="flex items-center gap-1" style={{ fontSize: '9px', color: '#6b7280' }}>
          <span style={{ display: 'inline-block', width: 10, height: 4, background: '#3f0d0d', borderRadius: 1 }} />
          スキップ
        </span>
        <span className="flex items-center gap-1" style={{ fontSize: '9px', color: '#6b7280' }}>
          <span style={{ display: 'inline-block', width: 10, height: 4, background: '#141414', border: '1px solid #2a2a2a', borderRadius: 1 }} />
          PF省略
        </span>
      </div>

      {/* Controls */}
      <div className="px-3 py-2 shrink-0 space-y-2" style={{ borderBottom: '1px solid #252525' }}>
        {/* Play / Pause / Reset */}
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
            style={{
              background: '#1a1a1a',
              color: '#6b7280',
              border: '1px solid #374151',
              fontSize: '14px',
            }}
            title="リセット"
          >
            ⟳
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span style={{ fontSize: '9px', color: '#4b5563' }}>遅</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={speed}
              onChange={e => setSpeed(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: '#e88b00', height: '2px' }}
            />
            <span style={{ fontSize: '9px', color: '#4b5563' }}>速</span>
          </div>
        </div>

        {/* Info text */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5" style={{ fontSize: '10px', color: '#6b7280', fontFamily: 'monospace' }}>
          <span>
            充填: <span style={{ color: '#9ca3af' }}>{activeLines.filter((_, i) => {
              const origIdx = lines.findIndex(l => l === activeLines[i])
              return origIdx < filledUpTo
            }).length}</span>/<span style={{ color: '#9ca3af' }}>{activeLines.length}</span> ライン
          </span>
          <span>TR: <span style={{ color: '#9ca3af' }}>{filledUpTo > 0 ? currentTr + 1 : 0}</span>/<span style={{ color: '#9ca3af' }}>{maxTr}</span></span>
          <span>ETL: <span style={{ color: '#9ca3af' }}>{params.turboFactor}</span></span>
        </div>
      </div>

      {/* Description & params */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {/* Sequence description */}
        <div className="rounded p-2.5" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div className="text-xs mb-1" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {pattern2.label}
          </div>
          <div style={{ color: '#9ca3af', fontSize: '10px', lineHeight: '1.5' }}>
            {pattern2.description}
          </div>
        </div>

        {/* Current params */}
        <div className="rounded p-2.5 space-y-1" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div className="text-xs" style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            関連パラメータ
          </div>
          {[
            { label: 'Matrix Phase', value: `${params.matrixPhase}` },
            { label: 'Turbo Factor', value: `${params.turboFactor}` },
            { label: 'Partial Fourier', value: params.partialFourier },
            { label: 'iPAT', value: params.ipatMode !== 'Off' ? `${params.ipatMode} AF=${params.ipatFactor}` : 'Off' },
            { label: '総ライン数', value: `${totalLines}` },
            { label: '取得ライン', value: `${activeLines.length}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span style={{ color: '#4b5563', fontSize: '9px' }}>{label}</span>
              <span className="font-mono" style={{ color: '#6b7280', fontSize: '9px' }}>{value}</span>
            </div>
          ))}
        </div>

        {/* iPAT note */}
        {params.ipatMode !== 'Off' && (
          <div className="rounded p-2.5" style={{ background: '#1f1200', border: '1px solid #7c2d12' }}>
            <div className="text-xs" style={{ color: '#fb923c', fontSize: '10px' }}>
              iPAT {params.ipatMode} AF={params.ipatFactor}
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#9a3412', fontSize: '9px' }}>
              オレンジ: ACS（中央キャリブレーション）ライン
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#9a3412', fontSize: '9px' }}>
              暗赤: スキップライン（間引き取得）
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
