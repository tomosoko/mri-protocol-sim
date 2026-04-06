import { useState, useMemo, useCallback } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'
import { calcSARLevel, calcScanTime } from '../../store/calculators'

// ── 傾斜磁場パフォーマンスモニター ────────────────────────────────────────────
function GradientMonitor() {
  const { params } = useProtocolStore()

  // Gradient mode specs (approximate Siemens MAGNETOM values)
  const GRAD_SPECS: Record<string, { maxAmp: number; slewRate: number; name: string }> = {
    Normal:  { maxAmp: 26, slewRate: 100, name: 'Normal (省電力)' },
    Fast:    { maxAmp: 40, slewRate: 170, name: 'Fast (標準)' },
    Ultrafast: { maxAmp: 45, slewRate: 200, name: 'Ultra (高性能)' },
  }
  const spec = GRAD_SPECS[params.gradientMode] ?? GRAD_SPECS.Fast

  const isDWI = params.bValues.length >= 2 && params.turboFactor <= 2
  const isEPI = isDWI
  const isTSE = params.turboFactor > 4

  // Gradient duty cycle estimation (rough)
  // EPI: high duty cycle (~80%); TSE: medium (~40%); SE: low (~20%)
  const dutyCycle = isEPI ? 78 : isTSE ? 42 : 20

  // Readout gradient amplitude needed (proportional to bandwidth/FOV)
  const readGradAmp = Math.round(params.bandwidth / params.fov * 100 * 10) / 10

  // Phase gradient (proportional to matrix/FOV)
  const phaseGradAmp = Math.round(params.matrixPhase / params.fov * 1000 * 10) / 10

  // Slew rate demand: bandwidth * matrix / 1000 (arbitrary units)
  const slewDemand = Math.round(params.bandwidth * (params.matrixFreq / 256) / spec.slewRate * 100)
  const ampDemand = Math.min(100, Math.round(Math.max(readGradAmp, phaseGradAmp) / spec.maxAmp * 100))

  const dcColor = dutyCycle > 60 ? '#f87171' : dutyCycle > 40 ? '#fbbf24' : '#34d399'
  const slewColor = slewDemand > 85 ? '#f87171' : slewDemand > 60 ? '#fbbf24' : '#34d399'
  const ampColor = ampDemand > 85 ? '#f87171' : ampDemand > 60 ? '#fbbf24' : '#34d399'

  const bars: { label: string; value: number; max: number; color: string; unit: string }[] = [
    { label: 'Duty Cycle', value: dutyCycle, max: 100, color: dcColor, unit: '%' },
    { label: 'Slew Rate 使用率', value: slewDemand, max: 100, color: slewColor, unit: '%' },
    { label: 'Amplitude 使用率', value: ampDemand, max: 100, color: ampColor, unit: '%' },
  ]

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#0e1218', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#60a5fa', fontSize: '9px', letterSpacing: '0.06em' }}>
          GRADIENT PERFORMANCE
        </span>
        <span style={{ color: '#4b5563', fontSize: '8px' }}>{spec.name}</span>
      </div>
      <div className="space-y-1">
        {bars.map(b => (
          <div key={b.label}>
            <div className="flex items-center justify-between mb-0.5" style={{ fontSize: '8px' }}>
              <span style={{ color: '#6b7280' }}>{b.label}</span>
              <span className="font-mono" style={{ color: b.color }}>{b.value}{b.unit}</span>
            </div>
            <div className="h-1.5 rounded overflow-hidden" style={{ background: '#1e1e1e' }}>
              <div className="h-full rounded transition-all"
                style={{ width: `${Math.min(b.value, 100)}%`, background: b.color, opacity: 0.85 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 pt-1.5 flex flex-wrap gap-x-3 gap-y-0.5" style={{ borderTop: '1px solid #1a1a1a', fontSize: '7px', color: '#374151' }}>
        <span>MaxAmp: {spec.maxAmp}mT/m</span>
        <span>SlewRate: {spec.slewRate}T/m/s</span>
        {isEPI && <span style={{ color: '#f87171' }}>EPI: 高デューティサイクル</span>}
        {dutyCycle > 60 && <span style={{ color: '#f87171' }}>⚠ 傾斜磁場過熱リスク</span>}
      </div>
    </div>
  )
}

// ── B1+ フィールドマップ (Dielectric Effect 可視化) ──────────────────────────────
function B1FieldMap({ fieldStrength, trueForm }: { fieldStrength: number; trueForm: boolean }) {
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

// ── g-factor SNR 損失チャート ─────────────────────────────────────────────────
function GFactorChart() {
  const { params } = useProtocolStore()

  if (params.ipatMode === 'Off') return null

  const W = 290, H = 90
  const PAD = { l: 32, r: 10, t: 10, b: 22 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b
  const maxR = 4

  // g-factor model per coil type: g(R) ≈ 1 + k*(R-1)^exp
  const COIL_G: Record<string, { k: number; e: number; label: string; color: string }> = {
    Head_64:  { k: 0.05, e: 1.5, label: 'Head 64ch', color: '#34d399' },
    Head_20:  { k: 0.08, e: 1.5, label: 'Head 20ch', color: '#60a5fa' },
    Spine_32: { k: 0.10, e: 1.5, label: 'Spine 32ch', color: '#a78bfa' },
    Body:     { k: 0.15, e: 1.8, label: 'Body',      color: '#fb923c' },
    Knee:     { k: 0.18, e: 2.0, label: 'Knee',      color: '#fbbf24' },
    Shoulder: { k: 0.20, e: 2.0, label: 'Shoulder',  color: '#f87171' },
    Flex:     { k: 0.25, e: 2.0, label: 'Flex',      color: '#e88b00' },
  }

  const coilKey = params.coilType ?? 'Body'
  const gCfg = COIL_G[coilKey] ?? COIL_G.Body

  // SNR efficiency = 1 / (sqrt(R) * g(R))  normalized to R=1 → 1.0
  const gFn = (r: number) => 1 + gCfg.k * Math.pow(r - 1, gCfg.e)
  const snrEff = (r: number) => 1 / (Math.sqrt(r) * gFn(r))

  const nPts = 60
  const rVals = Array.from({ length: nPts + 1 }, (_, i) => 1 + (i / nPts) * (maxR - 1))

  const tx = (r: number) => PAD.l + ((r - 1) / (maxR - 1)) * innerW
  const ty = (snr: number) => PAD.t + (1 - snr) * innerH

  const currentR = params.ipatFactor
  const currentG = gFn(currentR)
  const currentSNREff = snrEff(currentR)
  const snrLoss = Math.round((1 - currentSNREff) * 100)

  const dotX = tx(currentR)
  const dotY = ty(currentSNREff)

  // All coil curves for comparison (dimmed)
  const allCurves = useMemo(() => {
    return Object.entries(COIL_G).map(([id, cfg]) => {
      const gf = (r: number) => 1 + cfg.k * Math.pow(r - 1, cfg.e)
      const se = (r: number) => 1 / (Math.sqrt(r) * gf(r))
      const d = rVals.map((r, i) => {
        return `${i === 0 ? 'M' : 'L'}${tx(r).toFixed(1)},${ty(se(r)).toFixed(1)}`
      }).join(' ')
      return { id, d, color: cfg.color, active: id === coilKey }
    })
  }, [coilKey])

  return (
    <div className="mt-2 rounded overflow-hidden" style={{ background: '#080808', border: '1px solid #1a1a1a' }}>
      <div className="flex items-center justify-between px-2 pt-1.5">
        <span style={{ color: '#4b5563', fontSize: '9px', fontWeight: 600 }}>g-factor SNR損失 ({gCfg.label})</span>
        <div className="flex items-center gap-2" style={{ fontSize: '9px' }}>
          <span style={{ color: '#6b7280' }}>g={currentG.toFixed(2)}</span>
          <span style={{ color: snrLoss > 40 ? '#f87171' : snrLoss > 25 ? '#fbbf24' : '#34d399', fontWeight: 600 }}>
            SNR -{snrLoss}%
          </span>
        </div>
      </div>
      <svg width={W} height={H}>
        {/* Grid */}
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <line key={v} x1={PAD.l} y1={ty(v)} x2={PAD.l + innerW} y2={ty(v)}
            stroke="#141414" strokeWidth={v === 0.5 ? 1 : 0.5} />
        ))}
        {/* Y-axis labels */}
        {[0.25, 0.5, 0.75, 1.0].map(v => (
          <text key={v} x={PAD.l - 3} y={ty(v) + 3} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>
            {Math.round(v * 100)}%
          </text>
        ))}

        {/* All coil curves (dimmed) */}
        {allCurves.map(c => (
          <path key={c.id} d={c.d} fill="none"
            stroke={c.color} strokeWidth={c.active ? 1.5 : 0.5}
            opacity={c.active ? 0.85 : 0.2} />
        ))}

        {/* Current R marker */}
        <line x1={dotX} y1={PAD.t} x2={dotX} y2={PAD.t + innerH}
          stroke="#e88b00" strokeWidth={0.8} strokeDasharray="2,2" />
        <circle cx={dotX} cy={dotY} r={3.5} fill="#e88b00" />
        <text x={dotX + 3} y={dotY - 3} fill="#e88b00" style={{ fontSize: '7px' }}>R={currentR}</text>

        {/* X-axis labels */}
        {[1, 2, 3, 4].map(r => (
          <text key={r} x={tx(r)} y={H - 5} textAnchor="middle" fill="#374151" style={{ fontSize: '7px' }}>R={r}</text>
        ))}
        <text x={PAD.l - 2} y={PAD.t + innerH / 2} textAnchor="end" fill="#374151"
          transform={`rotate(-90, ${PAD.l - 12}, ${PAD.t + innerH / 2})`}
          style={{ fontSize: '7px' }}>SNR効率</text>
      </svg>
      <div className="px-2 pb-1.5 flex flex-wrap gap-x-2" style={{ fontSize: '7px' }}>
        {allCurves.map(c => (
          <span key={c.id} style={{ color: c.active ? c.color : '#252525' }}>{c.id.replace('_', ' ')}</span>
        ))}
      </div>
    </div>
  )
}

// ── PNS（末梢神経刺激）モニター ───────────────────────────────────────────────
// IEC 60601-2-33 準拠の末梢神経刺激リスク評価
// dB/dt, スルーレート, および PNS 閾値の関係を可視化
function PNSMonitor() {
  const { params } = useProtocolStore()

  // PNS モデル (IEC 60601-2-33 基準, Reilly モデル)
  // PNS threshold: TDS (rheobase × chronaxie)
  // Simplified: dB/dt_threshold ≈ rheobase × (1 + tc/t_rise)
  // where rheobase ≈ 20 T/s, tc = 0.36ms

  const GRAD_SPECS: Record<string, { maxAmp: number; slewRate: number }> = {
    Normal:    { maxAmp: 26, slewRate: 100 },
    Fast:      { maxAmp: 40, slewRate: 170 },
    Ultrafast: { maxAmp: 45, slewRate: 200 },
    Whisper:   { maxAmp: 26, slewRate: 80 },
  }
  const spec = GRAD_SPECS[params.gradientMode] ?? GRAD_SPECS.Normal

  const isDWI = params.bValues.length >= 2 && params.turboFactor <= 2
  const isEPI = isDWI

  // Estimate slew rate in use: proportional to gradient mode + sequence type
  // EPI uses near-max slew; TSE uses ~40-60%; SE ~20%
  const isTSE = params.turboFactor > 4
  const slewUsageFraction = isEPI ? 0.90 : isTSE ? 0.55 : 0.25
  const activeSlewRate = spec.slewRate * slewUsageFraction  // T/m/s in use

  // Gradient amplitude in use
  const readGradAmp = params.bandwidth / params.fov * 100  // mT/m estimate
  const activeAmp = Math.min(spec.maxAmp, readGradAmp)

  // Rise time (gradient hardware): amplitude / slew rate (ms)
  const riseTime = (activeAmp / spec.slewRate) * 1000  // ms

  // PNS threshold calculation (Reilly model simplified)
  const rheobase = 20   // T/s (reference threshold for long pulses)
  const chronaxie = 0.36  // ms
  const pnsThreshold = rheobase * (1 + chronaxie / Math.max(riseTime, 0.01))  // T/s

  // Current dB/dt (T/s) = slew rate × activeAmp
  const dbdt = activeSlewRate * (activeAmp / 1000)  // convert mT/m to T/m

  // PNS percentage of threshold
  const pnsPct = Math.min(150, Math.round(dbdt / pnsThreshold * 100 * 10) / 10)

  const color = pnsPct >= 100 ? '#f87171' : pnsPct >= 80 ? '#fbbf24' : pnsPct >= 60 ? '#fb923c' : '#34d399'
  const level = pnsPct >= 100 ? '⚠ ABOVE LIMIT' : pnsPct >= 80 ? '⚠ Near Limit' : pnsPct >= 60 ? 'Moderate' : 'Safe'

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080c10', border: `1px solid ${pnsPct >= 80 ? '#7f1d1d30' : '#1a2030'}` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: color, fontSize: '9px', letterSpacing: '0.06em' }}>
          PNS MONITOR — {level}
        </span>
        <span style={{ color: '#374151', fontSize: '8px' }}>IEC 60601-2-33</span>
      </div>

      {/* Main PNS gauge */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-0.5">
          <span style={{ color: '#4b5563', fontSize: '8px' }}>PNS Level</span>
          <span className="font-mono font-bold" style={{ color, fontSize: '11px' }}>{pnsPct}%</span>
        </div>
        <div className="h-3 rounded overflow-hidden relative" style={{ background: '#111' }}>
          {/* Threshold zone markers */}
          <div className="absolute inset-0 flex">
            <div style={{ width: '80%', borderRight: '1px solid #fbbf2440' }} />
            <div style={{ width: '20%' }} />
          </div>
          {/* PNS bar */}
          <div className="h-full rounded transition-all duration-300"
            style={{ width: `${Math.min(pnsPct, 100)}%`, background: color, opacity: 0.8 }} />
          {/* Threshold line at 100% */}
          <div className="absolute top-0 bottom-0" style={{ left: '100%', width: '1px', background: '#f87171', opacity: 0.5 }} />
          {/* 80% warning line */}
          <div className="absolute top-0 bottom-0" style={{ left: '80%', width: '1px', background: '#fbbf24', opacity: 0.4 }} />
        </div>
        <div className="flex justify-between mt-0.5" style={{ fontSize: '6px', color: '#374151' }}>
          <span>0</span>
          <span style={{ color: '#fbbf24' }}>80%</span>
          <span style={{ color: '#f87171' }}>100% Limit</span>
        </div>
      </div>

      {/* Detailed breakdown */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5" style={{ fontSize: '8px' }}>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>Slew Rate</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{activeSlewRate.toFixed(0)} T/m/s</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>Max SR</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{spec.slewRate} T/m/s</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>dB/dt</span>
          <span className="font-mono" style={{ color }}>{dbdt.toFixed(1)} T/s</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>PNS Threshold</span>
          <span className="font-mono" style={{ color: '#4b5563' }}>{pnsThreshold.toFixed(0)} T/s</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>Rise Time</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{riseTime.toFixed(2)} ms</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>Mode</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{params.gradientMode}</span>
        </div>
      </div>

      {pnsPct >= 80 && (
        <div className="mt-1.5 pt-1.5 text-xs" style={{ borderTop: '1px solid #1a0505', color: '#f87171', fontSize: '7px' }}>
          {pnsPct >= 100
            ? '⚠ PNS 閾値超過。傾斜磁場モードを Normal/Whisper に変更するか、スルーレート設定を下げてください。'
            : '末梢神経刺激のリスクが高くなっています。患者に刺激感がないか確認してください。'}
        </div>
      )}
    </div>
  )
}

// ── コイル素子マップ ──────────────────────────────────────────────────────────
// 選択されたコイルのチャンネル数・配置を視覚化（syngo MR コイル設定UIに相当）
function CoilElementMap() {
  const { params } = useProtocolStore()
  const coil = params.coilType ?? 'Body'

  // Coil element topology definitions
  type CoilDef = {
    channels: number
    rows: number
    cols: number
    label: string
    coverage: string
    color: string
    elements: { x: number; y: number; w: number; h: number; active: boolean }[]
  }

  const COIL_DEFS: Record<string, CoilDef> = {
    Head_64: {
      channels: 64, rows: 4, cols: 8, label: 'Head 64ch', coverage: '頭部全域',
      color: '#34d399',
      elements: Array.from({ length: 32 }, (_, i) => ({ x: (i % 8), y: Math.floor(i / 8), w: 1, h: 1, active: true })),
    },
    Head_20: {
      channels: 20, rows: 4, cols: 5, label: 'Head/Neck 20ch', coverage: '頭部+頸部',
      color: '#60a5fa',
      elements: Array.from({ length: 20 }, (_, i) => ({ x: (i % 5), y: Math.floor(i / 5), w: 1, h: 1, active: true })),
    },
    Spine_32: {
      channels: 32, rows: 2, cols: 8, label: 'Spine 32ch', coverage: '頸椎→腰椎',
      color: '#a78bfa',
      elements: Array.from({ length: 16 }, (_, i) => ({ x: (i % 8), y: Math.floor(i / 8), w: 1, h: 1, active: true })),
    },
    Body: {
      channels: 18, rows: 3, cols: 6, label: 'Body 18ch', coverage: '胸腹部',
      color: '#fb923c',
      elements: Array.from({ length: 18 }, (_, i) => ({ x: (i % 6), y: Math.floor(i / 6), w: 1, h: 1, active: i < 12 })),
    },
    Knee: {
      channels: 15, rows: 5, cols: 3, label: 'Knee 15ch', coverage: '膝関節',
      color: '#fbbf24',
      elements: Array.from({ length: 15 }, (_, i) => ({ x: (i % 3), y: Math.floor(i / 3), w: 1, h: 1, active: true })),
    },
    Shoulder: {
      channels: 16, rows: 4, cols: 4, label: 'Shoulder 16ch', coverage: '肩関節',
      color: '#f87171',
      elements: Array.from({ length: 16 }, (_, i) => ({ x: (i % 4), y: Math.floor(i / 4), w: 1, h: 1, active: i < 14 })),
    },
    Flex: {
      channels: 4, rows: 2, cols: 2, label: 'Flex 4ch', coverage: '四肢・小部位',
      color: '#e88b00',
      elements: Array.from({ length: 4 }, (_, i) => ({ x: (i % 2), y: Math.floor(i / 2), w: 1, h: 1, active: true })),
    },
  }

  const def = COIL_DEFS[coil] ?? COIL_DEFS.Body
  const activeCount = def.elements.filter(e => e.active).length

  const W = 120, H = 60
  const cols = Math.max(def.cols, ...def.elements.map(e => e.x + 1))
  const rows = Math.max(def.rows, ...def.elements.map(e => e.y + 1))
  const cellW = Math.min((W - 4) / cols, 14)
  const cellH = Math.min((H - 4) / rows, 14)
  const gap = 1

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080c10', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: def.color, fontSize: '9px', letterSpacing: '0.05em' }}>
          COIL — {def.label}
        </span>
        <div className="flex items-center gap-2" style={{ fontSize: '8px' }}>
          <span style={{ color: def.color }}>{activeCount}ch active</span>
          <span style={{ color: '#374151' }}>/ {def.channels}ch total</span>
        </div>
      </div>

      <div className="flex gap-3 items-start">
        {/* Element grid visualization */}
        <svg width={W} height={H}>
          {def.elements.map((el, i) => {
            const x = 2 + el.x * (cellW + gap)
            const y = 2 + el.y * (cellH + gap)
            return (
              <g key={i}>
                <rect x={x} y={y} width={cellW} height={cellH} rx={1}
                  fill={el.active ? def.color + '30' : '#111'}
                  stroke={el.active ? def.color : '#2a2a2a'}
                  strokeWidth={el.active ? 0.8 : 0.5}
                />
                {el.active && (
                  <text x={x + cellW / 2} y={y + cellH / 2 + 2.5}
                    textAnchor="middle" fill={def.color} opacity={0.8}
                    style={{ fontSize: '5px' }}>
                    {i + 1}
                  </text>
                )}
              </g>
            )
          })}
          {/* iPAT reference lines indicator */}
          {params.ipatMode !== 'Off' && (
            <text x={W - 2} y={H - 2} textAnchor="end" fill="#fbbf24" style={{ fontSize: '6px' }}>
              iPAT×{params.ipatFactor}
            </text>
          )}
        </svg>

        {/* Coil stats */}
        <div className="flex flex-col gap-1 flex-1">
          <div>
            <div style={{ color: '#374151', fontSize: '7px' }}>Coverage</div>
            <div style={{ color: '#9ca3af', fontSize: '8px' }}>{def.coverage}</div>
          </div>
          <div>
            <div style={{ color: '#374151', fontSize: '7px' }}>Channels</div>
            <div className="font-mono" style={{ color: def.color, fontSize: '9px' }}>{def.channels} ch</div>
          </div>
          <div>
            <div style={{ color: '#374151', fontSize: '7px' }}>Array Type</div>
            <div style={{ color: '#4b5563', fontSize: '8px' }}>Phased Array</div>
          </div>
          {params.ipatMode !== 'Off' && (
            <div>
              <div style={{ color: '#fbbf24', fontSize: '7px' }}>iPAT factor</div>
              <div className="font-mono" style={{ color: '#fbbf24', fontSize: '9px' }}>×{params.ipatFactor}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── プリスキャン/シムステータスパネル ────────────────────────────────────────
// 実際の syngo MR コンソールのプリスキャン結果表示を模倣
// B0 フィールドマップ・中心周波数・シム係数をリアルタイム表示
function PrescanStatusPanel() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5
  const [prescanState, setPrescanState] = useState<'ready' | 'running' | 'done'>('done')
  const [runMs, setRunMs] = useState(0)

  // Simulated prescan results (deterministic based on field strength and body part)
  const larmor = is3T ? 127.74 : 63.87  // MHz
  const centerFreqOffset = is3T ? 23 : 12  // Hz offset from nominal
  const fieldUniformityPpm = is3T ? 1.8 : 0.9
  const fieldUniformityHz = Math.round(fieldUniformityPpm * larmor)

  // Simulated shim currents (Z1/X/Y/Z2/XY/XZ — first-order+second-order shim coils)
  const shimCoeffs = useMemo(() => {
    const seed = params.fov * 0.1 + params.slices * 0.3
    return [
      { axis: 'Z1', val: Math.round(12 + Math.sin(seed) * 18), unit: 'mA', color: '#60a5fa' },
      { axis: 'X',  val: Math.round(-8 + Math.cos(seed * 1.3) * 15), unit: 'mA', color: '#34d399' },
      { axis: 'Y',  val: Math.round(5 + Math.sin(seed * 0.7) * 20), unit: 'mA', color: '#a78bfa' },
      { axis: 'Z2', val: Math.round(Math.cos(seed * 2.1) * 10), unit: 'mA', color: '#fbbf24' },
    ]
  }, [params.fov, params.slices])

  // Fat-water beat frequency
  const csFatHz = is3T ? 447 : 224
  const inPhaseTE = Math.round(1000 / csFatHz * 1000) / 2  // first in-phase at ~2.2ms (3T) or ~4.4ms (1.5T)

  // B0 residual histogram (simulated)
  const histBins = useMemo(() => {
    const bins: number[] = []
    for (let i = 0; i < 20; i++) {
      const hz = -100 + i * 10
      const sigma = is3T ? 35 : 18
      bins.push(Math.round(Math.exp(-(hz * hz) / (2 * sigma * sigma)) * 80 + Math.random() * 5))
    }
    return bins
  }, [is3T])
  const maxBin = Math.max(...histBins)

  const runPrescan = () => {
    setPrescanState('running')
    setRunMs(0)
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      setRunMs(elapsed)
      if (elapsed >= 2500) {
        clearInterval(timer)
        setPrescanState('done')
      }
    }, 50)
  }

  const W = 180, H = 50
  const binW = W / histBins.length

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#060c12', border: '1px solid #1a2a3a' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#34d399', fontSize: '9px', letterSpacing: '0.06em' }}>
          PRESCAN STATUS
        </span>
        <div className="flex items-center gap-2">
          {prescanState === 'running' && (
            <span className="font-mono" style={{ color: '#fbbf24', fontSize: '8px' }}>
              {(runMs / 1000).toFixed(1)}s...
            </span>
          )}
          <span style={{
            fontSize: '8px',
            color: prescanState === 'done' ? '#34d399' : prescanState === 'running' ? '#fbbf24' : '#4b5563',
            fontWeight: 600,
          }}>
            {prescanState === 'done' ? '● COMPLETE' : prescanState === 'running' ? '● RUNNING' : '○ READY'}
          </span>
          <button
            onClick={runPrescan}
            disabled={prescanState === 'running'}
            style={{
              background: prescanState === 'running' ? '#1a1a1a' : '#0a1f16',
              color: prescanState === 'running' ? '#374151' : '#34d399',
              border: `1px solid ${prescanState === 'running' ? '#2a2a2a' : '#14532d'}`,
              borderRadius: 2, fontSize: '8px', padding: '1px 5px', cursor: prescanState === 'running' ? 'default' : 'pointer',
            }}
          >
            Run
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        {/* Left: key readouts */}
        <div className="flex flex-col gap-1" style={{ minWidth: 120 }}>
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: '#4b5563', fontSize: '8px' }}>Center Freq</span>
            <span className="font-mono" style={{ color: '#e88b00', fontSize: '9px' }}>
              {larmor.toFixed(2)} MHz
              <span style={{ color: '#6b7280', fontSize: '7px' }}> +{centerFreqOffset}Hz</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: '#4b5563', fontSize: '8px' }}>B0 Uniformity</span>
            <span className="font-mono" style={{ color: fieldUniformityPpm > 2 ? '#f87171' : '#34d399', fontSize: '9px' }}>
              {fieldUniformityPpm}ppm
              <span style={{ color: '#6b7280', fontSize: '7px' }}> ±{fieldUniformityHz}Hz</span>
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: '#4b5563', fontSize: '8px' }}>Fat-Water Δf</span>
            <span className="font-mono" style={{ color: '#fbbf24', fontSize: '9px' }}>{csFatHz} Hz</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span style={{ color: '#4b5563', fontSize: '8px' }}>In-phase TE</span>
            <span className="font-mono" style={{ color: '#60a5fa', fontSize: '9px' }}>{inPhaseTE.toFixed(1)} / {(inPhaseTE*2).toFixed(1)} ms</span>
          </div>
          {/* Shim currents */}
          <div className="mt-1 pt-1" style={{ borderTop: '1px solid #111' }}>
            <div style={{ color: '#374151', fontSize: '7px', marginBottom: '3px' }}>SHIM CURRENTS</div>
            <div className="grid grid-cols-2 gap-x-2">
              {shimCoeffs.map(({ axis, val, color }) => (
                <div key={axis} className="flex items-center justify-between">
                  <span style={{ color: '#374151', fontSize: '7px' }}>{axis}:</span>
                  <span className="font-mono" style={{ color, fontSize: '8px' }}>{val > 0 ? '+' : ''}{val}mA</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: B0 residual histogram */}
        <div className="flex flex-col items-center">
          <div style={{ color: '#374151', fontSize: '7px', marginBottom: 2 }}>B0残差 分布</div>
          <svg width={W} height={H}>
            <line x1={0} y1={H - 1} x2={W} y2={H - 1} stroke="#1a2030" strokeWidth={1} />
            {histBins.map((v, i) => {
              const h = (v / maxBin) * (H - 8)
              const x = i * binW
              const isCenter = Math.abs(i - 10) <= 1
              return (
                <rect key={i} x={x + 0.5} y={H - 1 - h} width={Math.max(0, binW - 0.5)} height={h}
                  fill={isCenter ? '#34d399' : '#1a3a2a'} opacity={0.9} />
              )
            })}
            {/* Center line */}
            <line x1={W / 2} y1={0} x2={W / 2} y2={H - 1} stroke="#374151" strokeWidth={0.5} strokeDasharray="2,2" />
            <text x={2} y={H - 3} fill="#374151" style={{ fontSize: '7px' }}>-100Hz</text>
            <text x={W - 2} y={H - 3} textAnchor="end" fill="#374151" style={{ fontSize: '7px' }}>+100Hz</text>
          </svg>
        </div>
      </div>
    </div>
  )
}

type SubTab = 'Misc' | 'Adjustments' | 'Adj.Volume' | 'pTx' | 'Tx-Rx'

const subTabStyle = (active: boolean) => ({
  background: active ? '#1e1200' : 'transparent',
  color: active ? '#e88b00' : '#5a5a5a',
  borderBottom: active ? '2px solid #e88b00' : '2px solid transparent',
})

const sectionHeader = { color: '#4b5563' }

export function SystemTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)
  const [subTab, setSubTab] = useState<SubTab>('Misc')

  // local state
  const [coilCombination, setCoilCombination] = useState('Sum of Squares')
  const [msma, setMsma] = useState('S-C-T')
  const [matrixOpt, setMatrixOpt] = useState('Off')
  const [coilFocus, setCoilFocus] = useState('Flat')
  const [adjStrategy, setAdjStrategy] = useState('Standard')
  const [b0Shim, setB0Shim] = useState('Standard')
  const [b1Shim, setB1Shim] = useState('TrueForm')
  const [adjTolerance, setAdjTolerance] = useState('Auto')
  const [confirmFreq, setConfirmFreq] = useState('Never')
  const [adjPosAP, setAdjPosAP] = useState(0)
  const [adjPosRL, setAdjPosRL] = useState(0)
  const [adjPosFH, setAdjPosFH] = useState(0)
  const [adjOrientation, setAdjOrientation] = useState('Iso-Center')
  const [txRefAmp, setTxRefAmp] = useState(200)
  const [imageScaling, setImageScaling] = useState(1.0)
  const [trueForm, setTrueForm] = useState(true)
  const [b1ShimMode, setB1ShimMode] = useState('TrueForm')
  const [rfShim, setRfShim] = useState(false)

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex border-b mb-3" style={{ borderColor: '#252525' }}>
        {(['Misc', 'Adjustments', 'Adj.Volume', 'pTx', 'Tx-Rx'] as SubTab[]).map(t => (
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

      {subTab === 'Misc' && (
        <div className="space-y-0.5">
          {/* Field strength */}
          <div className="px-3 py-2">
            <div className="text-xs mb-2" style={{ color: '#6b7280' }}>Field Strength</div>
            <div className="flex gap-2">
              {([1.5, 3.0] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setParam('fieldStrength', f)}
                  className="px-4 py-1.5 rounded text-sm font-bold transition-all"
                  style={{
                    background: params.fieldStrength === f ? '#8a4400' : '#1a1a1a',
                    color: params.fieldStrength === f ? '#fff' : '#6b7280',
                    border: `1px solid ${params.fieldStrength === f ? '#c47400' : '#374151'}`,
                  }}
                >
                  {f}T
                </button>
              ))}
            </div>
            {params.fieldStrength === 3.0 && (
              <div className="mt-2 p-2 rounded text-xs" style={{ background: '#141414', border: '1px solid #7c3aed', color: '#a78bfa' }}>
                ⚠ 3T注意: SAR≈4倍・化学シフト2倍・Dielectric Effect・SNR↑（理論値√2倍）
              </div>
            )}
          </div>

          <div className="border-t my-1" style={{ borderColor: '#252525' }} />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Coil</div>
          <ParamField label="Coil Selection" value={params.coilType ?? 'Body'} type="select"
            options={['Head_64', 'Head_20', 'Spine_32', 'Body', 'Knee', 'Shoulder', 'Flex']}
            onChange={v => setParam('coilType', v as typeof params.coilType)} />
          <ParamField label="Coil Combination" value={coilCombination} type="select"
            options={['Sum of Squares', 'Adaptive']}
            onChange={v => setCoilCombination(v as string)} />
          <ParamField label="MSMA" value={msma} type="select"
            options={['S-C-T', 'T-C-S']}
            onChange={v => setMsma(v as string)} />
          <ParamField label="Matrix Optimization" value={matrixOpt} type="select"
            options={['Off', 'On', 'Adaptive']}
            onChange={v => setMatrixOpt(v as string)} />
          <ParamField label="Coil Focus" value={coilFocus} type="select"
            options={['Flat', 'Center']}
            onChange={v => setCoilFocus(v as string)} />

          {/* Coil element visualization */}
          <CoilElementMap />

          <div className="border-t my-1" style={{ borderColor: '#252525' }} />

          <ParamField label="Gradient Mode" hintKey="gradientMode" value={params.gradientMode} type="select"
            options={['Fast', 'Normal', 'Whisper']}
            onChange={v => setParam('gradientMode', v as typeof params.gradientMode)} />
          <ParamField label="Shim Mode" value={params.shim} type="select"
            options={['Auto', 'Manual']}
            onChange={v => setParam('shim', v as typeof params.shim)} />

          {/* Gradient mode guide */}
          <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>Gradient Mode</div>
            <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
              <div><span className="text-white">Fast: </span>最速・最大騒音・PNS（末梢神経刺激）↑ → 心臓シネ/EPI</div>
              <div><span className="text-white">Normal: </span>標準バランス → 通常検査</div>
              <div><span className="text-white">Whisper: </span>低騒音(約-10dB)・低PNS → 小児/聴覚過敏・鎮静</div>
            </div>
          </div>

          {/* Gradient Performance Monitor */}
          <GradientMonitor />

          {/* PNS Monitor */}
          <PNSMonitor />

          {/* SAR Breakdown */}
          <SARBreakdown />

          {/* SAR Accumulation Monitor */}
          <SARAccumulationMonitor />

          {/* Coil Reference Table */}
          <CoilReferenceTable />
        </div>
      )}

      {subTab === 'Adjustments' && (
        <div className="space-y-0.5">
          {/* Prescan / shimming status */}
          <PrescanStatusPanel />

          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Adjustment Strategy</div>
          <ParamField label="Adjustment Strategy" value={adjStrategy} type="select"
            options={['Standard', 'FastAdjust', 'Advanced']}
            onChange={v => setAdjStrategy(v as string)} />
          <ParamField label="B0 Shim" value={b0Shim} type="select"
            options={['Standard', 'Advanced', 'TuneUp']}
            onChange={v => setB0Shim(v as string)} />
          <ParamField label="B1 Shim" value={b1Shim} type="select"
            options={['TrueForm', 'CP Mode', 'Dual Drive']}
            onChange={v => setB1Shim(v as string)} />
          <ParamField label="Adjustment Tolerance" value={adjTolerance} type="select"
            options={['Auto', 'Custom']}
            onChange={v => setAdjTolerance(v as string)} />
          <ParamField label="Confirm Frequency" value={confirmFreq} type="select"
            options={['Never', 'Always', 'When Changed']}
            onChange={v => setConfirmFreq(v as string)} />

          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>iPAT（並列撮像）設定</div>
            <ParamField label="iPAT Mode" hintKey="iPAT" value={params.ipatMode} type="select"
              options={['Off', 'GRAPPA', 'CAIPIRINHA']}
              onChange={v => setParam('ipatMode', v as typeof params.ipatMode)} highlight={hl('ipatMode')} />
            {params.ipatMode !== 'Off' && (
              <>
                <ParamField label="Acceleration Factor" value={params.ipatFactor} type="select"
                  options={['2', '3', '4']}
                  onChange={v => setParam('ipatFactor', parseInt(v as string))} />
                <div className="mt-2 space-y-1 text-xs" style={{ color: '#9ca3af' }}>
                  <div>撮像時間: <span className="text-white">約 1/{params.ipatFactor} に短縮</span></div>
                  <div>SNR低下: <span className="text-yellow-400">約 {(100 / Math.sqrt(params.ipatFactor)).toFixed(0)}% に低下</span></div>
                  {params.ipatFactor >= 3 && (
                    <div className="text-orange-400">⚠ AF≥3はg-factor（残留アーチファクト）に注意</div>
                  )}
                </div>
                <GFactorChart />
              </>
            )}
          </div>
        </div>
      )}

      {subTab === 'Adj.Volume' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Adjustment Volume Position</div>
          <ParamField label="Position A>>P" value={adjPosAP} type="number"
            min={-300} max={300} step={5} unit="mm"
            onChange={v => setAdjPosAP(v as number)} />
          <ParamField label="Position R>>L" value={adjPosRL} type="number"
            min={-300} max={300} step={5} unit="mm"
            onChange={v => setAdjPosRL(v as number)} />
          <ParamField label="Position F>>H" value={adjPosFH} type="number"
            min={-300} max={300} step={5} unit="mm"
            onChange={v => setAdjPosFH(v as number)} />
          <ParamField label="Orientation" value={adjOrientation} type="select"
            options={['Iso-Center', 'Custom']}
            onChange={v => setAdjOrientation(v as string)} />
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div style={{ color: '#9ca3af' }}>
              Adjustment Volumeは磁場均一性の調整（シム）を行う領域を定義します。
              撮像部位に合わせてサイズ・位置を最適化することでシム精度が向上します。
            </div>
          </div>
        </div>
      )}

      {subTab === 'pTx' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Parallel Transmit</div>
          <ParamField label="Tx Ref Amplitude" value={txRefAmp} type="number"
            min={50} max={500} step={10} unit="V"
            onChange={v => setTxRefAmp(v as number)} />
          <ParamField label="Image Scaling" value={imageScaling} type="number"
            min={0.1} max={5.0} step={0.01}
            onChange={v => setImageScaling(v as number)} />
          <ParamField label="TrueForm" value={trueForm} type="toggle"
            onChange={v => setTrueForm(v as boolean)} />
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>pTx (parallel Transmit)</div>
            <div style={{ color: '#9ca3af' }}>
              複数の送信チャンネルを使用してB1フィールドを均一化します。3Tでの腹部・骨盤撮像でのDielectric Effect対策に有効。
              TrueFormは標準的なCP送信モードでB1均一性を最適化します。
            </div>
          </div>
          <B1FieldMap fieldStrength={params.fieldStrength} trueForm={trueForm} />
        </div>
      )}

      {subTab === 'Tx-Rx' && (
        <div className="space-y-0.5">
          <div className="text-xs font-semibold uppercase tracking-wider mb-2 mt-3 px-3" style={sectionHeader}>Transmit / Receive</div>
          <ParamField label="B1 Shim Mode" value={b1ShimMode} type="select"
            options={['TrueForm', 'CP Mode']}
            onChange={v => setB1ShimMode(v as string)} />
          <ParamField label="RF Shim" value={rfShim} type="toggle"
            onChange={v => setRfShim(v as boolean)} />
          <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
            <div className="font-semibold mb-1" style={{ color: '#e88b00' }}>B1 Shim Mode</div>
            <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
              <div><span className="text-white">TrueForm: </span>位相・振幅最適化で均一なB1分布を実現（推奨）</div>
              <div><span className="text-white">CP Mode: </span>従来のCircular Polarized送信モード</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SAR内訳チャート ──────────────────────────────────────────────────────────
function SARBreakdown() {
  const { params } = useProtocolStore()
  const totalSAR = calcSARLevel(params)

  // 各因子の寄与比率（正規化）
  const faNorm     = (params.flipAngle / 90) ** 2
  const trNorm     = 2000 / Math.max(params.TR, 100)
  const etlNorm    = Math.min(params.turboFactor, 200) / 50
  const fieldNorm  = (params.fieldStrength / 1.5) ** 2
  const fatPenalty = params.fatSat === 'CHESS' ? 0.15 : params.fatSat === 'SPAIR' ? 0.25 : params.fatSat === 'STIR' ? 0.35 : 0
  const mtPenalty  = params.mt ? 0.20 : 0
  const coilPen    = (!params.coilType || params.coilType === 'Body') ? 0.30 : 0

  const baseContrib = faNorm * trNorm * etlNorm * fieldNorm

  const factors = [
    { label: 'FA²',    value: faNorm,    color: '#f87171', note: `${params.flipAngle}°` },
    { label: '1/TR',   value: trNorm,    color: '#fb923c', note: `${params.TR}ms` },
    { label: 'ETL',    value: etlNorm,   color: '#fbbf24', note: `×${params.turboFactor}` },
    { label: 'B0²',    value: fieldNorm, color: '#a78bfa', note: `${params.fieldStrength}T` },
    { label: 'FatSat', value: fatPenalty * baseContrib, color: '#60a5fa', note: params.fatSat },
    { label: 'MT',     value: mtPenalty  * baseContrib, color: '#38bdf8', note: params.mt ? 'On' : 'Off' },
    { label: 'Coil',   value: coilPen   * baseContrib, color: '#4ade80', note: params.coilType || 'Body' },
  ].filter(f => f.value > 0.01)

  const total = factors.reduce((s, f) => s + f.value, 0)

  const sarColor = totalSAR >= 90 ? '#ef4444' : totalSAR >= 70 ? '#f59e0b' : totalSAR >= 40 ? '#e88b00' : '#34d399'
  const sarLabel = totalSAR >= 90 ? 'OVER' : totalSAR >= 70 ? 'High' : totalSAR >= 40 ? 'Med' : 'Low'

  return (
    <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#111111', border: '1px solid #252525' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold" style={{ color: '#e88b00' }}>SAR 内訳</div>
        <div className="flex items-center gap-2">
          <span style={{ color: sarColor, fontWeight: 700 }}>{sarLabel}</span>
          <span className="font-mono font-bold" style={{ color: sarColor }}>{totalSAR}%</span>
        </div>
      </div>

      {/* 全体バー */}
      <div className="h-2.5 rounded overflow-hidden mb-3" style={{ background: '#1a1a1a' }}>
        <div
          className="h-full rounded transition-all"
          style={{
            width: `${totalSAR}%`,
            background: `linear-gradient(90deg, #34d399, ${sarColor})`,
          }}
        />
      </div>

      {/* 因子別内訳バー */}
      <div className="space-y-1.5">
        {factors.map(f => {
          const pct = total > 0 ? Math.round((f.value / total) * 100) : 0
          return (
            <div key={f.label}>
              <div className="flex justify-between items-center mb-0.5">
                <span style={{ color: f.color }}>{f.label}</span>
                <span style={{ color: '#6b7280', fontSize: '9px' }}>{f.note}</span>
                <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '9px' }}>{pct}%</span>
              </div>
              <div className="h-1 rounded overflow-hidden" style={{ background: '#1a1a1a' }}>
                <div
                  className="h-full rounded"
                  style={{ width: `${pct}%`, background: f.color + '80' }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* IEC limits */}
      <div className="mt-2 pt-2 text-xs" style={{ borderTop: '1px solid #252525', color: '#4b5563' }}>
        IEC limit: 頭部 3.2 W/kg / 体部 2.0 W/kg (全体平均)
      </div>
    </div>
  )
}

// ── SAR 累積モニター ─────────────────────────────────────────────────────────
// リアルなスキャナーは 6分間のSAR積算を監視する (IEC 60601-2-33)
// 現在の SAR % × スキャン時間から「連続スキャン時にいつ制限超えるか」を計算
function SARAccumulationMonitor() {
  const { params } = useProtocolStore()
  const sarPct = calcSARLevel(params)
  const scanTimeSec = calcScanTime(params)

  if (sarPct < 20) return null  // low SAR = not interesting to display

  // IEC: 6-minute averaging window. 100% = limit reached at 6 min
  // At sarPct%, continuous acquisition would reach limit in: 6min × (100/sarPct) min... no
  // Actually: if SAR rate = sarPct% (of limit), then to accumulate 100% takes:
  // t = 6min × (100 / sarPct)... but this is already rate-based
  //
  // More intuitive: "How many consecutive scans until limit?"
  // Assume IEC 6-min window: total allowed SAR over 6min = 100 units
  // Each scan contributes: sarPct × scanTimeSec / 360 (normalized to 6-min window)
  const scansUntilLimit = scanTimeSec > 0
    ? Math.floor(360 / scanTimeSec * (100 / sarPct))
    : 99

  const timeUntilLimit = scansUntilLimit * scanTimeSec  // seconds

  const sarColor = sarPct >= 90 ? '#ef4444' : sarPct >= 70 ? '#f59e0b' : sarPct >= 40 ? '#e88b00' : '#34d399'

  const fmt = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60 > 0 ? String(s % 60).padStart(2, '0') + 's' : ''}`

  // Simulate 6-minute SAR accumulation timeline
  const N = 24  // 24 bars × 15sec = 6min
  const ratePerSlot = sarPct * (scanTimeSec / 15) / 100  // fraction of limit per 15sec slot

  return (
    <div className="mx-3 mt-2 p-2.5 rounded" style={{ background: '#100a05', border: `1px solid ${sarColor}30` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: sarColor, fontSize: '9px', letterSpacing: '0.06em' }}>
          SAR ACCUMULATION (IEC 6-min window)
        </span>
        <span className="font-mono font-bold" style={{ color: sarColor, fontSize: '9px' }}>{sarPct}% / rep</span>
      </div>

      {/* 6-minute accumulation bar chart */}
      <div className="flex gap-0.5 mb-1.5 items-end" style={{ height: 24 }}>
        {Array.from({ length: N }, (_, i) => {
          const cumulative = Math.min(ratePerSlot * (i + 1) * 100, 100)
          const barH = Math.max(2, (cumulative / 100) * 24)
          const isOver = cumulative >= 100
          const barColor = isOver ? '#ef4444' : cumulative >= 70 ? '#f59e0b' : '#34d399'
          return (
            <div key={i} style={{
              width: `${100 / N - 0.5}%`,
              height: barH,
              background: barColor,
              opacity: isOver ? 1 : 0.5 + (i / N) * 0.4,
              borderRadius: 1,
              alignSelf: 'flex-end',
            }} />
          )
        })}
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap" style={{ fontSize: '8px' }}>
        <div>
          <span style={{ color: '#4b5563' }}>連続収集上限: </span>
          <span className="font-mono font-semibold" style={{ color: scansUntilLimit <= 2 ? '#f87171' : '#c8ccd6' }}>
            {scansUntilLimit >= 99 ? '∞' : scansUntilLimit}回
          </span>
        </div>
        <div>
          <span style={{ color: '#4b5563' }}>制限まで: </span>
          <span className="font-mono font-semibold" style={{ color: timeUntilLimit < 60 ? '#f87171' : '#c8ccd6' }}>
            {scansUntilLimit >= 99 ? '> 6min' : fmt(timeUntilLimit)}
          </span>
        </div>
        <div>
          <span style={{ color: '#4b5563' }}>TA: </span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{fmt(scanTimeSec)}</span>
        </div>
      </div>

      <div className="mt-1.5 pt-1" style={{ borderTop: `1px solid ${sarColor}20`, fontSize: '7px', color: '#374151' }}>
        {sarPct >= 90
          ? '⚠ SAR超過。TR延長 / ETL削減 / FA低下 / 磁場強度低下のいずれかが必要'
          : sarPct >= 70
          ? '△ SAR高め。長時間連続撮像には注意'
          : 'IEC 6分窓平均. SAR rate = ' + sarPct + '% / rep × ' + fmt(scanTimeSec) + ' / rep'}
      </div>
    </div>
  )
}

// ── コイル参照テーブル ─────────────────────────────────────────────────────────
const COIL_DATA = [
  { id: 'Head_64',  label: 'Head 64ch',  snr: 100, channels: 64, fovMax: 230, use: '脳・頭頸部', note: 'fMRI/DWI標準' },
  { id: 'Head_20',  label: 'Head 20ch',  snr: 75,  channels: 20, fovMax: 250, use: '脳・頸椎',   note: '旧世代コイル' },
  { id: 'Spine_32', label: 'Spine 32ch', snr: 85,  channels: 32, fovMax: 350, use: '脊椎全長',   note: 'Spine+Body組合せ' },
  { id: 'Body',     label: 'Body',       snr: 55,  channels: 18, fovMax: 500, use: '腹部・骨盤', note: 'SAR注意・大FOV向け' },
  { id: 'Knee',     label: 'Knee',       snr: 80,  channels: 15, fovMax: 200, use: '膝関節',     note: 'FOV≤200mm推奨' },
  { id: 'Shoulder', label: 'Shoulder',   snr: 72,  channels: 12, fovMax: 220, use: '肩関節・肘', note: 'FOV≤200mm推奨' },
  { id: 'Flex',     label: 'Flex',       snr: 60,  channels: 4,  fovMax: 200, use: '四肢・小部位', note: '可搬型・汎用' },
]

function CoilReferenceTable() {
  const { params, setParam } = useProtocolStore()

  return (
    <div className="mx-3 mt-2 p-2.5 rounded text-xs" style={{ background: '#111', border: '1px solid #252525' }}>
      <div className="font-semibold mb-2" style={{ color: '#e88b00' }}>コイル 参照テーブル</div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse', minWidth: '280px' }}>
          <thead>
            <tr style={{ color: '#4b5563', fontSize: '8px' }}>
              <th className="text-left py-0.5 pr-1">コイル</th>
              <th className="text-center py-0.5 pr-1">SNR</th>
              <th className="text-center py-0.5 pr-1">ch</th>
              <th className="text-left py-0.5">適応</th>
            </tr>
          </thead>
          <tbody>
            {COIL_DATA.map(c => {
              const isActive = params.coilType === c.id
              return (
                <tr
                  key={c.id}
                  className="cursor-pointer"
                  style={{ borderTop: '1px solid #1a1a1a', background: isActive ? '#2a1200' : 'transparent' }}
                  onClick={() => setParam('coilType', c.id as typeof params.coilType)}
                >
                  <td className="py-0.5 pr-1" style={{ color: isActive ? '#e88b00' : '#9ca3af', fontSize: '9px', fontWeight: isActive ? 600 : 400 }}>
                    {c.label}
                  </td>
                  <td className="text-center py-0.5 pr-1 font-mono" style={{
                    color: c.snr >= 90 ? '#34d399' : c.snr >= 70 ? '#fbbf24' : '#f87171',
                    fontSize: '9px',
                  }}>
                    {c.snr}%
                  </td>
                  <td className="text-center py-0.5 pr-1 font-mono" style={{ color: '#6b7280', fontSize: '9px' }}>
                    {c.channels}
                  </td>
                  <td className="py-0.5" style={{ color: '#4b5563', fontSize: '8px' }}>{c.use}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-1.5" style={{ color: '#374151', fontSize: '8px' }}>
        行をクリックでコイルを変更。SNR は Head64ch を基準100として相対評価。
      </div>
    </div>
  )
}
