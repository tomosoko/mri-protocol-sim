import { useMemo } from 'react'
import { useProtocolStore } from '../../store/protocolStore'
import { calcSARLevel } from '../../store/calculators'

// ── スキャナーボア断面図 ────────────────────────────────────────────────────────
// 超電導磁石 → 傾斜磁場コイル → RFボディコイル → 患者 の同心円構造を可視化
// Siemens MAGNETOM ボア内断面の教育的表示
export function ScannerBoreDiagram() {
  const { params } = useProtocolStore()
  const coil = params.coilType ?? 'Body'
  const is3T = params.fieldStrength >= 2.5

  const W = 280, H = 160
  const CX = W / 2, CY = H / 2 + 5

  // Bore radii (approximate, to scale at 70cm bore)
  const R_CRYO   = 115   // Cryostat (outermost)
  const R_GRAD   = 90    // Gradient coil
  const R_RF     = 74    // RF body coil
  const R_BORE   = 62    // Inner bore (free space)
  const R_PAT_X  = 35    // Patient ellipse (L/R)
  const R_PAT_Y  = 24    // Patient ellipse (H/F ... shown as A/P)

  // Coil element positions (distributed around patient)
  const COIL_CONFIGS: Record<string, { n: number; color: string; r: number; label: string }> = {
    Head_64:  { n: 32, color: '#34d399', r: R_PAT_X + 8,  label: 'Head 64ch' },
    Head_20:  { n: 20, color: '#60a5fa', r: R_PAT_X + 8,  label: 'Head 20ch' },
    Spine_32: { n: 16, color: '#a78bfa', r: R_PAT_X + 10, label: 'Spine 32ch' },
    Body:     { n: 12, color: '#fb923c', r: R_PAT_X + 11, label: 'Body 18ch' },
    Knee:     { n: 8,  color: '#fbbf24', r: R_PAT_X + 7,  label: 'Knee 15ch' },
    Shoulder: { n: 8,  color: '#f87171', r: R_PAT_X + 8,  label: 'Shoulder 16ch' },
    Flex:     { n: 4,  color: '#e88b00', r: R_PAT_X + 9,  label: 'Flex 4ch' },
  }
  const coilCfg = COIL_CONFIGS[coil] ?? COIL_CONFIGS.Body

  // Coil element positions on circle around patient
  const coilElements = useMemo(() => {
    return Array.from({ length: coilCfg.n }, (_, i) => {
      const angle = (i / coilCfg.n) * 2 * Math.PI - Math.PI / 2
      return {
        x: CX + coilCfg.r * Math.cos(angle),
        y: CY + coilCfg.r * Math.sin(angle),
        angle,
      }
    })
  }, [coilCfg.n, coilCfg.r])

  // B0 field lines (horizontal, pointing along Z = bore axis = perpendicular to cross-section)
  // Shown as dots in cross-section (field into the screen)
  const fieldDots = useMemo(() => {
    const dots: { x: number; y: number; inBore: boolean }[] = []
    for (let y = CY - R_BORE + 8; y <= CY + R_BORE - 8; y += 12) {
      for (let x = CX - R_BORE + 8; x <= CX + R_BORE - 8; x += 14) {
        const d = Math.sqrt((x - CX) ** 2 + (y - CY) ** 2)
        const inBore = d < R_BORE - 4
        const inPatient = ((x - CX) / R_PAT_X) ** 2 + ((y - CY) / R_PAT_Y) ** 2 < 1
        if (inBore && !inPatient) dots.push({ x, y, inBore })
      }
    }
    return dots
  }, [])

  // SAR level color
  const sarPct = calcSARLevel(params)
  const rfColor = sarPct > 85 ? '#ef4444' : sarPct > 55 ? '#fbbf24' : '#e88b00'

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#060809', border: '1px solid #1a2030' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold" style={{ color: '#60a5fa', fontSize: '9px', letterSpacing: '0.05em' }}>
          SCANNER BORE (Cross-Section)
        </span>
        <span style={{ fontSize: '8px', color: '#374151' }}>
          {is3T ? 'MAGNETOM Prisma 3T' : 'MAGNETOM Aera 1.5T'} — 70cm bore
        </span>
      </div>

      <svg width={W} height={H}>
        {/* ── Cryostat (superconducting magnet) */}
        <ellipse cx={CX} cy={CY} rx={R_CRYO} ry={R_CRYO * 0.55}
          fill="none" stroke="#1a3050" strokeWidth={8} />
        <ellipse cx={CX} cy={CY} rx={R_CRYO} ry={R_CRYO * 0.55}
          fill="none" stroke="#0a1820" strokeWidth={6} opacity={0.5} />

        {/* ── Gradient coil (aluminum, water-cooled) */}
        <ellipse cx={CX} cy={CY} rx={R_GRAD} ry={R_GRAD * 0.55}
          fill="#0a1a28" stroke="#1e4060" strokeWidth={3} />
        <text x={CX - R_GRAD + 2} y={CY - R_GRAD * 0.55 + 8}
          fill="#1e4060" style={{ fontSize: '6px' }}>Gradient Coil</text>

        {/* ── RF body coil (birdcage) */}
        <ellipse cx={CX} cy={CY} rx={R_RF} ry={R_RF * 0.55}
          fill="#08101a" stroke={rfColor} strokeWidth={1.5} opacity={0.7} />
        {/* Birdcage rungs (12 rungs) */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * 2 * Math.PI
          const x1 = CX + R_RF * Math.cos(a)
          const y1 = CY + R_RF * 0.55 * Math.sin(a)
          return <circle key={i} cx={x1} cy={y1} r={2} fill={rfColor} opacity={0.5} />
        })}
        <text x={CX + R_RF - 14} y={CY - R_RF * 0.55 + 8}
          fill={rfColor + '80'} style={{ fontSize: '6px' }}>RF Coil</text>

        {/* ── Inner bore (free space / air) */}
        <ellipse cx={CX} cy={CY} rx={R_BORE} ry={R_BORE * 0.55}
          fill="#040608" stroke="#0f1820" strokeWidth={1} />

        {/* ── B0 field dots (field going into the screen = Z direction) */}
        {fieldDots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={1.2}
            fill={is3T ? '#1a2a50' : '#102030'} opacity={0.8} />
        ))}

        {/* ── Patient cross-section (ellipse) */}
        <ellipse cx={CX} cy={CY} rx={R_PAT_X} ry={R_PAT_Y}
          fill="#1a0f0a" stroke="#2a1810" strokeWidth={1.5} />
        {/* Subcutaneous fat ring */}
        <ellipse cx={CX} cy={CY} rx={R_PAT_X - 3} ry={R_PAT_Y - 3}
          fill="none" stroke="#2a1505" strokeWidth={2} opacity={0.6} />
        {/* Spinal cord approximation */}
        <circle cx={CX} cy={CY + R_PAT_Y * 0.5} r={3}
          fill="#0f0f1a" stroke="#1a1a30" strokeWidth={0.8} />

        {/* ── Phased array coil elements */}
        {coilElements.map((el, i) => (
          <g key={i}>
            <rect
              x={el.x - 3.5} y={el.y - 2}
              width={7} height={4}
              rx={1}
              fill={coilCfg.color + '25'}
              stroke={coilCfg.color}
              strokeWidth={0.8}
              transform={`rotate(${el.angle * 180 / Math.PI + 90}, ${el.x}, ${el.y})`}
            />
          </g>
        ))}

        {/* ── Table (patient support) */}
        <rect x={CX - 30} y={CY + R_PAT_Y - 1} width={60} height={6}
          fill="#0a0a0a" stroke="#1a1a1a" strokeWidth={0.8} rx={1} />

        {/* ── Labels */}
        <text x={8} y={14} fill="#1a3050" style={{ fontSize: '7px' }}>Superconducting Magnet</text>
        <text x={CX} y={CY} textAnchor="middle" dominantBaseline="middle"
          fill="#2a1810" style={{ fontSize: '7px' }}>Patient</text>

        {/* ── Isocenter cross */}
        <line x1={CX - 6} y1={CY} x2={CX + 6} y2={CY} stroke="#e88b0030" strokeWidth={0.8} />
        <line x1={CX} y1={CY - 6} x2={CX} y2={CY + 6} stroke="#e88b0030" strokeWidth={0.8} />
        <text x={CX + 4} y={CY - 4} fill="#e88b0050" style={{ fontSize: '6px' }}>iso</text>

        {/* ── Field direction indicator */}
        <text x={W - 8} y={H - 4} textAnchor="end" fill="#1a3050" style={{ fontSize: '6px' }}>
          B₀ ⊙ Z-axis
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0 mt-1" style={{ fontSize: '7px', color: '#374151' }}>
        <span style={{ color: '#1e4060' }}>■ Gradient</span>
        <span style={{ color: rfColor }}>○ RF Coil</span>
        <span style={{ color: coilCfg.color }}>■ {coilCfg.label}</span>
        <span style={{ color: '#1a3050' }}>• B₀ field</span>
        <span style={{ color: '#2a1810' }}>◯ Patient</span>
      </div>
    </div>
  )
}

// ── 傾斜磁場パフォーマンスモニター ────────────────────────────────────────────
export function GradientMonitor() {
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

// ── 傾斜磁場コイル温度・冷却モニター ─────────────────────────────────────────
export function GradientTempMonitor() {
  const { params } = useProtocolStore()

  const isDWI = params.bValues.length >= 2 && params.turboFactor <= 2
  const isTSE = params.turboFactor > 4
  const dutyCycle = isDWI ? 78 : isTSE ? 42 : 20

  // Gradient coil temperature model:
  // Base: 25°C; rises with duty cycle; max safe ~60°C; shutdown >70°C
  const baseTemp = 25
  const tempRise = (dutyCycle / 100) * 35
  const coilTemp = Math.round(baseTemp + tempRise)

  // Cooling fan speed: proportional to temp above baseline
  const fanSpeedPct = Math.round(Math.max(20, Math.min(100, 20 + (coilTemp - baseTemp) / 35 * 80)))
  const fanRPM = Math.round(fanSpeedPct / 100 * 3200)

  // Coolant flow (water cooling): L/min
  const coolantFlow = Math.round(15 + (dutyCycle / 100) * 10)

  const tempColor = coilTemp > 60 ? '#ef4444' : coilTemp > 50 ? '#fbbf24' : coilTemp > 40 ? '#fb923c' : '#34d399'
  const fanColor = fanSpeedPct > 80 ? '#fbbf24' : '#4b5563'
  const headroom = Math.max(0, Math.round((70 - coilTemp) / 45 * 100))

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080a0c', border: `1px solid ${coilTemp > 50 ? '#7c1a0030' : '#1a2020'}` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#fb923c', fontSize: '9px', letterSpacing: '0.06em' }}>
          GRADIENT THERMAL
        </span>
        <span style={{ color: '#374151', fontSize: '8px' }}>Duty {dutyCycle}%</span>
      </div>

      {/* Coil temperature gauge */}
      <div className="mb-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <span style={{ color: '#4b5563', fontSize: '8px' }}>Coil Temp</span>
          <span className="font-mono font-bold" style={{ color: tempColor, fontSize: '11px' }}>{coilTemp}°C</span>
        </div>
        <div className="h-2 rounded overflow-hidden relative" style={{ background: '#111' }}>
          {/* Zone markers */}
          <div className="absolute inset-0 flex">
            <div style={{ width: `${(40-baseTemp)/(70-baseTemp)*100}%`, borderRight: '1px solid #34d39920' }} />
            <div style={{ width: `${(55-40)/(70-baseTemp)*100}%`, borderRight: '1px solid #fbbf2440' }} />
            <div style={{ width: `${(60-55)/(70-baseTemp)*100}%`, borderRight: '1px solid #f8717140' }} />
          </div>
          <div className="h-full rounded transition-all"
            style={{ width: `${Math.min(100, (coilTemp - baseTemp) / (70 - baseTemp) * 100)}%`, background: tempColor, opacity: 0.8 }} />
        </div>
        <div className="flex justify-between mt-0.5" style={{ fontSize: '6px', color: '#374151' }}>
          <span>25°C</span><span style={{ color: '#fb923c' }}>40</span><span style={{ color: '#fbbf24' }}>55</span><span style={{ color: '#f87171' }}>70°C</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-x-2" style={{ fontSize: '8px' }}>
        <div className="flex flex-col">
          <span style={{ color: '#374151' }}>Headroom</span>
          <span className="font-mono" style={{ color: headroom < 30 ? '#f87171' : '#34d399' }}>{headroom}%</span>
        </div>
        <div className="flex flex-col">
          <span style={{ color: '#374151' }}>Fan</span>
          <span className="font-mono" style={{ color: fanColor }}>{fanRPM} rpm</span>
        </div>
        <div className="flex flex-col">
          <span style={{ color: '#374151' }}>Coolant</span>
          <span className="font-mono" style={{ color: '#4b5563' }}>{coolantFlow} L/m</span>
        </div>
      </div>
    </div>
  )
}
