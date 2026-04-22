import { useEffect, useRef } from 'react'

// ── K-space fill order ───────────────────────────────────────────────────────
export function kFillOrder(n: number, centric: boolean): number[] {
  if (!centric) return Array.from({ length: n }, (_, i) => i)
  const order: number[] = []
  const c = Math.floor(n / 2)
  order.push(c)
  for (let d = 1; order.length < n; d++) {
    if (c + d < n) order.push(c + d)
    if (c - d >= 0) order.push(c - d)
  }
  return order
}

// K-space fill canvas (animated during scan)
export function KSpaceFillCanvas({ progress, centric }: { progress: number; centric: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = 80, H = 22, N = 32
    ctx.fillStyle = '#03080c'
    ctx.fillRect(0, 0, W, H)
    // Vertical k-space grid lines
    ctx.strokeStyle = '#081518'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(i * W / 4, 0); ctx.lineTo(i * W / 4, H); ctx.stroke()
    }
    const order = kFillOrder(N, centric)
    const filledCount = Math.floor(progress / 100 * N)
    const rowH = H / N
    for (let i = 0; i < filledCount && i < N; i++) {
      const row = order[i]
      const y = (row / N) * H
      const dist = Math.abs(row - N / 2) / (N / 2)
      const bright = 0.2 + (1 - dist) * 0.8
      ctx.fillStyle = `rgba(52,211,153,${bright})`
      ctx.fillRect(0, y, W, Math.max(1, rowH - 0.3))
    }
    // Active acquisition line (bright cursor)
    if (filledCount < N) {
      const row = order[filledCount] ?? 0
      const y = (row / N) * H
      ctx.save()
      ctx.shadowBlur = 6; ctx.shadowColor = '#34d399'
      ctx.fillStyle = '#a7f3d0'
      ctx.fillRect(0, y, W, Math.max(1.5, rowH))
      ctx.restore()
    }
  }, [progress, centric])

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <canvas ref={canvasRef} width={80} height={22}
        style={{ display: 'block', borderRadius: 2, border: '1px solid #0a1e18' }} />
      <span style={{ position: 'absolute', bottom: 1, right: 2, fontSize: '5px', color: '#0a2018', lineHeight: 1 }}>kx→</span>
      <span style={{ position: 'absolute', top: 1, left: 2, fontSize: '5px', color: '#0a2018', lineHeight: 1 }}>ky</span>
    </div>
  )
}
