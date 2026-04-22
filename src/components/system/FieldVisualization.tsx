import { useMemo, useCallback } from 'react'
import { useProtocolStore } from '../../store/protocolStore'

// ── B1+ フィールドマップ (Dielectric Effect 可視化) ──────────────────────────────
export function B1FieldMap({ fieldStrength, trueForm }: { fieldStrength: number; trueForm: boolean }) {
  const is3T = fieldStrength >= 2.5
  const W = 260, H = 120
  const CX = W / 2, CY = H / 2
  const RX = 100, RY = 46  // body ellipse radii

  // Generate B1+ heatmap: at 3T center-brightening (Dielectric Effect), at 1.5T roughly uniform
  const pixels = useMemo(() => {
    const pts: { x: number; y: number; v: number }[] = []
    const step = 4
    for (let y = CY - RY - 2; y <= CY + RY + 2; y += step) {
      for (let x = CX - RX - 2; x <= CX + RX + 2; x += step) {
        const nx = (x - CX) / RX
        const ny = (y - CY) / RY
        const r2 = nx * nx + ny * ny
        if (r2 > 1.0) continue

        let v: number
        if (is3T) {
          // 3T: center brightening — B1+ ∝ J0(kr) pattern (simplified as gaussian-like)
          const sigma2 = trueForm ? 0.45 : 0.22
          v = 0.45 + 0.65 * Math.exp(-r2 / sigma2)
        } else {
          // 1.5T: relatively uniform with slight edge falloff
          v = 0.75 + 0.25 * Math.exp(-r2 * 1.2)
        }
        pts.push({ x, y, v: Math.min(1, v) })
      }
    }
    return pts
  }, [is3T, trueForm])

  // Map value to color (blue→green→yellow→red heatmap)
  const valToColor = useCallback((v: number) => {
    const t = Math.max(0, Math.min(1, v))
    if (t < 0.33) {
      const r = Math.round(0 + (t / 0.33) * 0)
      const g = Math.round(0 + (t / 0.33) * 128)
      const b = Math.round(180 + (t / 0.33) * 75)
      return `rgb(${r},${g},${b})`
    } else if (t < 0.66) {
      const s = (t - 0.33) / 0.33
      const r = Math.round(s * 200)
      const g = Math.round(128 + s * 127)
      const b = Math.round(255 - s * 255)
      return `rgb(${r},${g},${b})`
    } else {
      const s = (t - 0.66) / 0.34
      const r = Math.round(200 + s * 55)
      const g = Math.round(255 - s * 200)
      const b = 0
      return `rgb(${r},${g},${b})`
    }
  }, [])

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080808', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#60a5fa', fontSize: '9px' }}>B1+ FIELD MAP ({fieldStrength}T)</span>
        {is3T && !trueForm && <span style={{ color: '#f87171', fontSize: '8px' }}>⚠ Dielectric Effect 強</span>}
        {is3T && trueForm && <span style={{ color: '#4ade80', fontSize: '8px' }}>TrueForm 補正中</span>}
      </div>
      <div className="flex gap-3 items-center">
        <svg width={W} height={H} style={{ flexShrink: 0 }}>
          {/* Heatmap pixels */}
          {pixels.map((p, i) => (
            <rect key={i} x={p.x - 2} y={p.y - 2} width={4} height={4}
              fill={valToColor(p.v)} opacity={0.85} />
          ))}
          {/* Body outline */}
          <ellipse cx={CX} cy={CY} rx={RX} ry={RY}
            fill="none" stroke="#374151" strokeWidth={1} />
          {/* Spine dot */}
          <circle cx={CX} cy={CY + RY - 8} r={5}
            fill="none" stroke="#4b5563" strokeWidth={0.8} />
          {/* Center cross */}
          <line x1={CX - 6} y1={CY} x2={CX + 6} y2={CY} stroke="#ffffff" strokeWidth={0.5} opacity={0.3} />
          <line x1={CX} y1={CY - 6} x2={CX} y2={CY + 6} stroke="#ffffff" strokeWidth={0.5} opacity={0.3} />
          {/* Colorbar */}
          <defs>
            <linearGradient id="cbGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(255,55,0)" />
              <stop offset="40%" stopColor="rgb(200,255,0)" />
              <stop offset="70%" stopColor="rgb(0,200,200)" />
              <stop offset="100%" stopColor="rgb(0,0,200)" />
            </linearGradient>
          </defs>
          <rect x={W - 12} y={10} width={8} height={H - 20} fill="url(#cbGrad)" rx={2} />
          <text x={W - 14} y={14} textAnchor="end" fill="#6b7280" style={{ fontSize: '7px' }}>High</text>
          <text x={W - 14} y={H - 11} textAnchor="end" fill="#6b7280" style={{ fontSize: '7px' }}>Low</text>
        </svg>
      </div>
      <div className="mt-1" style={{ fontSize: '7px', color: '#374151' }}>
        {is3T
          ? `3T: 波長(≈26cm)が体径に近く中心集中（Dielectric Effect）。${trueForm ? 'TrueForm で均一化補正。' : 'TrueForm ON で軽減推奨。'}`
          : '1.5T: 波長(≈52cm)が十分長く均一なB1分布。腹部撮像でも均一性良好。'}
      </div>
    </div>
  )
}

// ── 2D B0 フィールドマップ ───────────────────────────────────────────────────
// プリスキャン（シム）後の残差 B0 分布を 2D カラーマップで可視化
// 実際の syngo フィールドマップと同様、±Hz でカラーエンコード
export function B0FieldMap2D() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  // Residual B0 distribution model (post-shim)
  // Realistic: main remnants are Z2 quadratic + tissue susceptibility hotspots
  const sigma = is3T ? 30 : 15  // typical residual spread (Hz) after shimming

  const NX = 20, NY = 14  // grid cells
  const map = useMemo(() => {
    const seed = params.fov * 0.07 + params.slices * 0.13
    return Array.from({ length: NY }, (_, yi) => {
      return Array.from({ length: NX }, (_, xi) => {
        // Normalized coordinates (-1 to 1)
        const nx = (xi / (NX - 1) - 0.5) * 2
        const ny = (yi / (NY - 1) - 0.5) * 2
        const r2 = nx * nx + ny * ny
        // Only inside ellipse
        if (r2 > 1.0) return null
        // Residual B0 = Z2 remnant + linear drift + local susceptibility
        const z2 = (2 * ny * ny - nx * nx) * sigma * 0.5  // Z2 quadratic remnant
        const linear = (nx * Math.sin(seed) + ny * Math.cos(seed * 0.7)) * sigma * 0.3
        // Local susceptibility: hotspots at anatomically plausible positions
        const sus1 = Math.exp(-((nx + 0.3) ** 2 + (ny - 0.6) ** 2) * 8) * sigma * 0.8   // air-tissue (top)
        const sus2 = Math.exp(-((nx - 0.5) ** 2 + (ny + 0.4) ** 2) * 10) * sigma * 0.6  // bowel/sinus
        return z2 + linear + sus1 - sus2 * 0.5
      })
    })
  }, [is3T, params.fov, params.slices, sigma, NX, NY])

  // Color scale: -maxHz (blue) → 0 (green) → +maxHz (red)
  const maxHz = sigma * 1.5
  const hzToColor = (hz: number) => {
    const t = Math.max(-1, Math.min(1, hz / maxHz))
    if (t < 0) {
      // blue to green
      const s = -t
      const r = Math.round(s * 0 + (1 - s) * 0)
      const g = Math.round(s * 0 + (1 - s) * 120 + 40)
      const b = Math.round(s * 200 + (1 - s) * 60)
      return `rgb(${r},${g},${b})`
    } else {
      // green to red
      const s = t
      const r = Math.round(s * 220 + (1 - s) * 0)
      const g = Math.round(s * 60 + (1 - s) * 160)
      const b = Math.round(0)
      return `rgb(${r},${g},${b})`
    }
  }

  const W = 200, H = 100
  const cellW = W / NX, cellH = H / NY

  // Statistics
  const allValues = map.flat().filter(v => v !== null) as number[]
  const maxAbsHz = Math.round(Math.max(...allValues.map(Math.abs)))
  const stdHz = Math.round(Math.sqrt(allValues.reduce((s, v) => s + v * v, 0) / allValues.length))

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#060a10', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#34d399', fontSize: '9px', letterSpacing: '0.05em' }}>
          B0 FIELD MAP (Post-Shim)
        </span>
        <div style={{ fontSize: '8px', color: '#374151' }}>
          rms: <span className="font-mono" style={{ color: stdHz > 20 ? '#f87171' : '#34d399' }}>{stdHz}Hz</span>
          {' '}peak: <span className="font-mono" style={{ color: '#4b5563' }}>±{maxAbsHz}Hz</span>
        </div>
      </div>

      <div className="flex gap-2 items-start">
        {/* 2D color map */}
        <svg width={W} height={H} style={{ borderRadius: 3, overflow: 'hidden' }}>
          {map.map((row, yi) =>
            row.map((hz, xi) => {
              if (hz === null) return null
              const x = xi * cellW
              const y = yi * cellH
              return (
                <rect key={`${xi}_${yi}`} x={x} y={y} width={cellW + 0.5} height={cellH + 0.5}
                  fill={hzToColor(hz)} />
              )
            })
          )}
          {/* Ellipse boundary overlay */}
          <ellipse cx={W / 2} cy={H / 2} rx={W / 2 - 1} ry={H / 2 - 1}
            fill="none" stroke="#0a0a0a" strokeWidth={2} />
          {/* Center crosshair */}
          <line x1={W / 2 - 8} y1={H / 2} x2={W / 2 + 8} y2={H / 2} stroke="#ffffff20" strokeWidth={0.8} />
          <line x1={W / 2} y1={H / 2 - 8} x2={W / 2} y2={H / 2 + 8} stroke="#ffffff20" strokeWidth={0.8} />
          {/* Label */}
          <text x={4} y={10} fill="#ffffff30" style={{ fontSize: '6px' }}>Hz offset</text>
        </svg>

        {/* Color scale bar */}
        <div className="flex flex-col items-center gap-0.5" style={{ minWidth: 24 }}>
          <span style={{ fontSize: '6px', color: '#f87171' }}>+{Math.round(maxHz)}Hz</span>
          <svg width={10} height={60}>
            {Array.from({ length: 30 }, (_, i) => (
              <rect key={i} x={0} y={i * 2} width={10} height={2}
                fill={hzToColor(maxHz * (1 - i / 15))} />
            ))}
          </svg>
          <span style={{ fontSize: '6px', color: '#38bdf8' }}>-{Math.round(maxHz)}Hz</span>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-1" style={{ fontSize: '7px' }}>
          <div>
            <span style={{ color: '#374151' }}>Field: </span>
            <span style={{ color: is3T ? '#fbbf24' : '#9ca3af' }}>{params.fieldStrength}T</span>
          </div>
          <div>
            <span style={{ color: '#374151' }}>RMS: </span>
            <span className="font-mono" style={{ color: stdHz > 20 ? '#f87171' : '#34d399' }}>{stdHz}Hz</span>
          </div>
          <div>
            <span style={{ color: '#374151' }}>IQR: </span>
            <span className="font-mono" style={{ color: '#4b5563' }}>±{Math.round(stdHz * 0.67)}Hz</span>
          </div>
          <div style={{ marginTop: 4, color: '#252525', lineHeight: 1.4 }}>
            {stdHz < 15 ? '✓ Excellent' : stdHz < 25 ? '○ Adequate' : '⚠ Poor shim'}
          </div>
        </div>
      </div>
    </div>
  )
}
