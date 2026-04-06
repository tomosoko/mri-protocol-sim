import { useState } from 'react'
import type { ReactElement } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { identifySequence } from '../store/calculators'

// ── Types ──────────────────────────────────────────────────────────────────────

interface TooltipInfo {
  x: number
  y: number
  title: string
  value: string
}

// ── Color palette ─────────────────────────────────────────────────────────────
const C = {
  rfExcite:  '#e88b00',
  rfRefocus: '#f87171',
  rfInvert:  '#a78bfa',
  gradient:  '#38bdf8',
  echo:      '#4ade80',
  echoEff:   '#facc15',
  dashed:    '#374151',
  rowSep:    '#1a1a1a',
  label:     '#6b7280',
  labelBr:   '#9ca3af',
  bg:        '#0a0a0a',
  panelBg:   '#111111',
}

// ── Layout constants ──────────────────────────────────────────────────────────
const SVG_W    = 750
const SVG_H    = 280
const LEFT_M   = 48   // label area width
const PLOT_W   = SVG_W - LEFT_M - 12  // right margin 12
const ROW_H    = 40
const ROWS = ['RF', 'Gss', 'Gpe', 'Gfe', 'Echo'] as const
type RowName = typeof ROWS[number]

const ROW_Y: Record<RowName, number> = {
  RF:   14,
  Gss:  62,
  Gpe:  102,
  Gfe:  142,
  Echo: 192,
}
const WAVEFORM_H = 26  // waveform height within each row

// ── Time → pixel helper (built fresh each render) ─────────────────────────────
function makeToPx(TR: number) {
  return (t: number) => LEFT_M + (t / TR) * PLOT_W
}

// ── Draw helpers returning SVG path strings ───────────────────────────────────

/** Rectangular gradient lobe at time t, width w, height h (up) */
function gradRect(toPx: (t: number) => number, rowY: number, t: number, w: number, h = WAVEFORM_H * 0.55): string {
  const x = toPx(t)
  const xr = toPx(t + w)
  const y = rowY + WAVEFORM_H - h
  return `M${x},${rowY + WAVEFORM_H} L${x},${y} L${xr},${y} L${xr},${rowY + WAVEFORM_H}`
}

/** Triangle RF pulse (excitation) at time t */
function rfTriangle(toPx: (t: number) => number, rowY: number, t: number, w: number, h = WAVEFORM_H * 0.85, color: string): ReactElement {
  const x = toPx(t)
  const xr = toPx(t + w)
  const mid = (x + xr) / 2
  const top = rowY + WAVEFORM_H - h
  const base = rowY + WAVEFORM_H
  return <polygon points={`${x},${base} ${mid},${top} ${xr},${base}`} fill={color} opacity={0.85} />
}

/** Trapezoid RF pulse (refocus/inversion) at time t */
function rfTrapezoid(toPx: (t: number) => number, rowY: number, t: number, w: number, h = WAVEFORM_H * 0.85, color: string, key: string): ReactElement {
  const x = toPx(t)
  const xr = toPx(t + w)
  const flat = (xr - x) * 0.25
  const top = rowY + WAVEFORM_H - h
  const base = rowY + WAVEFORM_H
  return <polygon key={key} points={`${x},${base} ${x + flat},${top} ${xr - flat},${top} ${xr},${base}`} fill={color} opacity={0.85} />
}

// ── EPI zigzag ────────────────────────────────────────────────────────────────
function epiZigzag(toPx: (t: number) => number, rowY: number, tStart: number, tEnd: number, nLines = 8): string {
  const x0 = toPx(tStart)
  const x1 = toPx(tEnd)
  const step = (x1 - x0) / nLines
  const yTop = rowY + 4
  const yBot = rowY + WAVEFORM_H - 2
  let d = `M${x0},${yBot}`
  for (let i = 0; i < nLines; i++) {
    const y = i % 2 === 0 ? yTop : yBot
    d += ` L${x0 + step * (i + 1)},${y}`
  }
  return d
}

// ── Main component ────────────────────────────────────────────────────────────

export function PulseSequenceDiagramPanel() {
  const { params } = useProtocolStore()
  const { TR, TE, TI, flipAngle, turboFactor, echoSpacing } = params
  const seq = identifySequence(params)

  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)

  // Detect sequence variant
  const isDWI   = params.bValues.length > 1 && turboFactor <= 2
  const isFLAIR = params.TI > 1500 && turboFactor > 5
  const isSTIR  = params.fatSat === 'STIR' && params.TI > 0 && params.TI < 500
  const isIR    = TI > 0 && TI <= 1500 && !isSTIR
  const isTSE   = turboFactor >= 3 && turboFactor < 80
  const isGRE   = turboFactor <= 2 && TR < 200 && !isDWI
  // isSE = !isDWI && !isFLAIR && !isSTIR && !isIR && !isTSE && !isGRE (default fallback)

  const toPx = makeToPx(TR)

  // TE_eff for TSE
  const teEff = isTSE ? (turboFactor * echoSpacing) / 2 : TE

  // How many echoes to show for TSE (up to 4)
  const nEchoes = isTSE ? Math.min(turboFactor, 4) : 1

  // Pulse timing fractions of TR (used as ms equivalent since we normalize to TR)
  // We assign relative widths as fractions of TR
  const rfW    = TR * 0.03    // RF pulse width
  const gradW  = TR * 0.025   // gradient lobe width

  // IR/FLAIR: inversion pulse at t=0, then TI gap, then excitation
  const hasInversion = isFLAIR || isSTIR || isIR
  const t90 = hasInversion ? TI : 0            // 90° excitation start (after TI if IR)
  const t180 = TE / 2 + t90                    // 180° refocus (SE/TSE/FLAIR)

  // Hover interaction helpers
  function hover(e: React.MouseEvent<SVGElement>, title: string, value: string) {
    const rect = (e.currentTarget.closest('svg') as SVGElement).getBoundingClientRect()
    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, title, value })
  }
  function unhover() { setTooltip(null) }

  // Build SVG elements
  const elements: ReactElement[] = []

  // ── Row separator lines ───────────────────────────────────────────────────
  ROWS.forEach(row => {
    const y = ROW_Y[row] + ROW_H
    elements.push(
      <line key={`sep_${row}`} x1={0} y1={y} x2={SVG_W} y2={y} stroke={C.rowSep} strokeWidth={1} />
    )
    // Row label
    elements.push(
      <text key={`lbl_${row}`} x={4} y={ROW_Y[row] + WAVEFORM_H / 2 + 4} fontSize={9} fill={C.label} fontFamily="monospace">{row}</text>
    )
    // Baseline
    elements.push(
      <line key={`base_${row}`} x1={LEFT_M} y1={ROW_Y[row] + WAVEFORM_H} x2={SVG_W - 12} y2={ROW_Y[row] + WAVEFORM_H} stroke={C.rowSep} strokeWidth={0.5} />
    )
  })

  // ── Inversion pulse (IR / FLAIR / STIR) ──────────────────────────────────
  if (hasInversion) {
    const invColor = C.rfInvert
    const iy = ROW_Y.RF
    elements.push(rfTrapezoid(toPx, iy, 0, rfW * 1.2, WAVEFORM_H * 0.95, invColor, 'inv'))
    // Gss lobe under inversion
    elements.push(
      <path key="gss_inv" d={gradRect(toPx, ROW_Y.Gss, 0, gradW * 1.4)} fill={C.gradient} opacity={0.7} />
    )
    // Invisible hover region for inversion
    elements.push(
      <rect key="hover_inv" x={toPx(0)} y={ROW_Y.RF} width={toPx(rfW * 1.2) - toPx(0)} height={WAVEFORM_H}
        fill="transparent"
        onMouseEnter={e => hover(e, '180° Inversion', `TI = ${TI} ms | Fat null = ${isSTIR ? 'STIR' : isFLAIR ? 'FLAIR' : 'IR'}`)}
        onMouseLeave={unhover}
        style={{ cursor: 'crosshair' }}
      />
    )
    // TI dashed line
    elements.push(
      <line key="ti_line" x1={toPx(TI)} y1={8} x2={toPx(TI)} y2={SVG_H - 30}
        stroke={C.dashed} strokeDasharray="3 3" strokeWidth={1} />
    )
    elements.push(
      <text key="ti_label" x={toPx(TI) + 3} y={20} fontSize={8} fill={C.label} fontFamily="monospace">TI={TI}ms</text>
    )
  }

  // ── 90° excitation pulse ──────────────────────────────────────────────────
  const excY = ROW_Y.RF
  elements.push(rfTriangle(toPx, excY, t90, rfW, WAVEFORM_H * (isGRE ? 0.5 : 0.85), C.rfExcite))
  elements.push(
    <path key="gss_90" d={gradRect(toPx, ROW_Y.Gss, t90, gradW)} fill={C.gradient} opacity={0.7} />
  )
  // Hover for 90° excite
  elements.push(
    <rect key="hover_90" x={toPx(t90)} y={ROW_Y.RF} width={toPx(t90 + rfW) - toPx(t90)} height={WAVEFORM_H}
      fill="transparent"
      onMouseEnter={e => hover(e, isGRE ? `${flipAngle}° Excitation (GRE)` : '90° Excitation', `FA = ${flipAngle}° | Time = ${t90} ms`)}
      onMouseLeave={unhover}
      style={{ cursor: 'crosshair' }}
    />
  )

  // ── Phase encode lobe (Gpe) ───────────────────────────────────────────────
  const gpeT = t90 + gradW * 1.5
  elements.push(
    <path key="gpe_lobe" d={gradRect(toPx, ROW_Y.Gpe, gpeT, gradW)} fill={C.gradient} opacity={0.5} />
  )
  elements.push(
    <rect key="hover_gpe" x={toPx(gpeT)} y={ROW_Y.Gpe} width={toPx(gpeT + gradW) - toPx(gpeT)} height={WAVEFORM_H}
      fill="transparent"
      onMouseEnter={e => hover(e, 'Phase Encode Gradient', 'k空間の位相ステップを決定')}
      onMouseLeave={unhover}
      style={{ cursor: 'crosshair' }}
    />
  )

  // ── GRE: bipolar frequency encode + gradient echo ────────────────────────
  if (isGRE) {
    const gfeNegT = t90 + gradW * 1.5
    const gfePosT = TE - gradW
    // Pre-dephase (negative lobe)
    const negX0 = toPx(gfeNegT)
    const negX1 = toPx(gfeNegT + gradW)
    const rowY = ROW_Y.Gfe
    elements.push(
      <polygon key="gfe_neg" points={`${negX0},${rowY + WAVEFORM_H} ${negX0},${rowY + WAVEFORM_H * 0.4} ${negX1},${rowY + WAVEFORM_H * 0.4} ${negX1},${rowY + WAVEFORM_H}`}
        fill={C.gradient} opacity={0.4} />
    )
    // Readout (positive lobe)
    elements.push(
      <path key="gfe_pos" d={gradRect(toPx, ROW_Y.Gfe, gfePosT, gradW * 2)} fill={C.gradient} opacity={0.75} />
    )
    elements.push(
      <rect key="hover_gfe" x={toPx(gfePosT)} y={ROW_Y.Gfe} width={toPx(gfePosT + gradW * 2) - toPx(gfePosT)} height={WAVEFORM_H}
        fill="transparent"
        onMouseEnter={e => hover(e, 'Freq Encode Gradient (Readout)', 'GREグラジエントエコー読み取り')}
        onMouseLeave={unhover}
        style={{ cursor: 'crosshair' }}
      />
    )
    // GRE echo (diamond at TE)
    const ex = toPx(TE)
    const ey = ROW_Y.Echo + WAVEFORM_H / 2
    elements.push(
      <polygon key="echo_gre" points={`${ex},${ey - 8} ${ex + 6},${ey} ${ex},${ey + 8} ${ex - 6},${ey}`} fill={C.echo} opacity={0.9} />
    )
    elements.push(
      <rect key="hover_echo_gre" x={ex - 8} y={ey - 10} width={16} height={20}
        fill="transparent"
        onMouseEnter={e => hover(e, 'Gradient Echo', `TE = ${TE} ms`)}
        onMouseLeave={unhover}
        style={{ cursor: 'crosshair' }}
      />
    )
  }

  // ── SE / TSE / FLAIR / IR: 180° refocus + spin echo(es) ──────────────────
  if (!isGRE && !isDWI) {
    // Freq encode pre-dephase
    const gfePreT = t90 + gradW * 3.5
    elements.push(
      <path key="gfe_pre" d={gradRect(toPx, ROW_Y.Gfe, gfePreT, gradW)} fill={C.gradient} opacity={0.4} />
    )

    for (let i = 0; i < nEchoes; i++) {
      const teI = isTSE ? TE + i * echoSpacing : TE
      const t180I = i === 0 ? t180 : t90 + (teI - TE / 2)

      // 180° refocus pulse
      elements.push(rfTrapezoid(toPx, ROW_Y.RF, t180I - rfW / 2, rfW, WAVEFORM_H * 0.9, C.rfRefocus, `rf180_${i}`))
      // Gss lobe under 180°
      elements.push(
        <path key={`gss_180_${i}`} d={gradRect(toPx, ROW_Y.Gss, t180I - rfW / 2, gradW)} fill={C.gradient} opacity={0.5} />
      )
      // Hover for 180°
      elements.push(
        <rect key={`hover_180_${i}`} x={toPx(t180I - rfW / 2)} y={ROW_Y.RF}
          width={toPx(t180I + rfW / 2) - toPx(t180I - rfW / 2)} height={WAVEFORM_H}
          fill="transparent"
          onMouseEnter={e => hover(e, '180° Refocus Pulse', `Echo ${i + 1} | Time = ${Math.round(t180I)} ms`)}
          onMouseLeave={unhover}
          style={{ cursor: 'crosshair' }}
        />
      )

      // Gfe readout lobe
      elements.push(
        <path key={`gfe_read_${i}`} d={gradRect(toPx, ROW_Y.Gfe, teI - gradW, gradW * 2)} fill={C.gradient} opacity={0.65} />
      )

      // Echo marker
      const isEffEcho = isTSE && Math.abs(teI - teEff) < echoSpacing * 0.6
      const echoColor = isEffEcho ? C.echoEff : C.echo
      const ex = toPx(teI)
      const ey = ROW_Y.Echo + WAVEFORM_H / 2
      elements.push(
        <polygon key={`echo_${i}`} points={`${ex},${ey - 8} ${ex + 7},${ey} ${ex},${ey + 8} ${ex - 7},${ey}`}
          fill={echoColor} opacity={0.9} />
      )
      if (isEffEcho) {
        // Glow ring for effective echo
        elements.push(<circle key={`echo_eff_ring_${i}`} cx={ex} cy={ey} r={11} fill="none" stroke={C.echoEff} strokeWidth={1.5} opacity={0.5} />)
      }
      elements.push(
        <rect key={`hover_echo_${i}`} x={ex - 10} y={ey - 12} width={20} height={24}
          fill="transparent"
          onMouseEnter={e => hover(e, isEffEcho ? 'Effective Echo (k空間中心)' : `Spin Echo ${i + 1}`, `TE = ${teI} ms${isEffEcho ? ` | TE_eff = ${Math.round(teEff)} ms` : ''}`)}
          onMouseLeave={unhover}
          style={{ cursor: 'crosshair' }}
        />
      )
    }
  }

  // ── EPI DWI ───────────────────────────────────────────────────────────────
  if (isDWI) {
    // 180° diffusion refocus
    const t180DWI = t90 + TE * 0.3
    elements.push(rfTrapezoid(toPx, ROW_Y.RF, t180DWI, rfW, WAVEFORM_H * 0.9, C.rfRefocus, 'rf180_dwi'))
    elements.push(
      <path key="gss_180_dwi" d={gradRect(toPx, ROW_Y.Gss, t180DWI, gradW)} fill={C.gradient} opacity={0.5} />
    )
    // Diffusion gradients (large lobes on Gfe before/after 180)
    const diffW = TE * 0.18
    elements.push(
      <path key="diff_gfe_1" d={gradRect(toPx, ROW_Y.Gfe, t90 + gradW * 2, diffW, WAVEFORM_H * 0.85)} fill={C.rfInvert} opacity={0.55} />
    )
    elements.push(
      <path key="diff_gfe_2" d={gradRect(toPx, ROW_Y.Gfe, t180DWI + rfW + gradW, diffW, WAVEFORM_H * 0.85)} fill={C.rfInvert} opacity={0.55} />
    )
    // EPI readout zigzag
    const epiStart = TE - TR * 0.12
    const epiEnd   = TE + TR * 0.08
    elements.push(
      <path key="epi_readout" d={epiZigzag(toPx, ROW_Y.Gfe, epiStart, epiEnd)} fill="none" stroke={C.gradient} strokeWidth={1.5} opacity={0.8} />
    )
    // EPI echo
    const ex = toPx(TE)
    const ey = ROW_Y.Echo + WAVEFORM_H / 2
    elements.push(
      <polygon key="echo_epi" points={`${ex},${ey - 8} ${ex + 7},${ey} ${ex},${ey + 8} ${ex - 7},${ey}`} fill={C.echo} opacity={0.9} />
    )
    elements.push(
      <rect key="hover_echo_epi" x={ex - 10} y={ey - 12} width={20} height={24}
        fill="transparent"
        onMouseEnter={e => hover(e, 'EPI Echo', `TE = ${TE} ms | b-values: ${params.bValues.join('/')} s/mm²`)}
        onMouseLeave={unhover}
        style={{ cursor: 'crosshair' }}
      />
    )
  }

  // ── TE dashed vertical line ───────────────────────────────────────────────
  const teX = toPx(TE)
  elements.push(
    <line key="te_line" x1={teX} y1={8} x2={teX} y2={SVG_H - 30}
      stroke={C.dashed} strokeDasharray="3 3" strokeWidth={1} />
  )
  elements.push(
    <text key="te_label" x={teX + 3} y={SVG_H - 32} fontSize={8} fill={C.labelBr} fontFamily="monospace">TE={TE}ms</text>
  )

  // ── TR bracket line at bottom ─────────────────────────────────────────────
  const trY = SVG_H - 18
  elements.push(
    <line key="tr_line" x1={toPx(0)} y1={trY} x2={toPx(TR)} y2={trY} stroke={C.dashed} strokeWidth={0.8} />
  )
  elements.push(
    <line key="tr_tick_l" x1={toPx(0)} y1={trY - 4} x2={toPx(0)} y2={trY + 4} stroke={C.dashed} strokeWidth={0.8} />
  )
  elements.push(
    <line key="tr_tick_r" x1={toPx(TR)} y1={trY - 4} x2={toPx(TR)} y2={trY + 4} stroke={C.dashed} strokeWidth={0.8} />
  )
  elements.push(
    <text key="tr_label" x={(toPx(0) + toPx(TR)) / 2 - 16} y={SVG_H - 5} fontSize={8} fill={C.label} fontFamily="monospace">TR={TR}ms</text>
  )

  // ── Info grid ─────────────────────────────────────────────────────────────
  const infoItems: { label: string; value: string }[] = [
    { label: 'TR',    value: `${TR} ms` },
    { label: 'TE',    value: `${TE} ms` },
    ...(TI > 0 ? [{ label: 'TI', value: `${TI} ms` }] : []),
    { label: 'FA',    value: `${flipAngle}°` },
    { label: 'ETL',   value: `${turboFactor}` },
    ...(isTSE ? [{ label: 'TE_eff', value: `${Math.round(teEff)} ms` }] : []),
    ...(isDWI ? [{ label: 'b-val', value: params.bValues.join('/') }] : []),
  ]

  return (
    <div
      className="flex flex-col overflow-y-auto h-full"
      style={{ background: C.panelBg, color: '#c8ccd6', width: '400px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ background: '#0e0e0e', borderBottom: '1px solid #252525' }}>
        <span className="text-xs font-semibold" style={{ color: C.labelBr }}>Pulse Sequence Diagram</span>
        <span className="text-xs font-mono px-2 py-0.5 rounded"
          style={{ background: '#1a1a1a', color: seq.color, border: `1px solid ${seq.color}40`, fontSize: '10px' }}>
          {seq.type}
        </span>
      </div>

      {/* SVG diagram */}
      <div className="shrink-0 px-2 pt-3 pb-1 relative" style={{ background: C.bg }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', maxHeight: '220px' }}
        >
          {/* Background */}
          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill={C.bg} />
          {/* All waveform elements */}
          {elements}
        </svg>

        {/* Tooltip overlay */}
        {tooltip && (
          <div
            style={{
              position: 'absolute',
              left: tooltip.x + 12,
              top: tooltip.y - 10,
              background: '#1a1a2e',
              border: '1px solid #374151',
              borderRadius: '4px',
              padding: '5px 8px',
              fontSize: '10px',
              pointerEvents: 'none',
              zIndex: 10,
              maxWidth: '200px',
              whiteSpace: 'pre-wrap',
            }}
          >
            <div style={{ color: C.rfExcite, fontWeight: 700, marginBottom: '2px' }}>{tooltip.title}</div>
            <div style={{ color: C.labelBr }}>{tooltip.value}</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1.5 shrink-0 flex-wrap"
        style={{ background: '#0d0d0d', borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}>
        {[
          { color: C.rfExcite,  label: 'Excitation' },
          { color: C.rfRefocus, label: 'Refocus/180°' },
          { color: C.rfInvert,  label: 'Inversion' },
          { color: C.gradient,  label: 'Gradient' },
          { color: C.echo,      label: 'Echo' },
          ...(isTSE ? [{ color: C.echoEff, label: 'TE_eff' }] : []),
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1">
            <div style={{ width: 8, height: 8, borderRadius: '2px', background: item.color }} />
            <span style={{ fontSize: '9px', color: C.label }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Info grid */}
      <div className="px-3 py-2 shrink-0">
        <div className="grid grid-cols-3 gap-1">
          {infoItems.map(item => (
            <div key={item.label} className="flex flex-col px-2 py-1.5 rounded"
              style={{ background: '#161616', border: '1px solid #252525' }}>
              <span style={{ fontSize: '8px', color: C.label }}>{item.label}</span>
              <span style={{ fontSize: '11px', color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sequence description */}
      <div className="px-3 pb-3 shrink-0">
        <div className="rounded px-3 py-2"
          style={{ background: '#161616', border: `1px solid ${seq.color}30` }}>
          <div className="flex items-center gap-2 mb-1">
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: seq.color }} />
            <span style={{ fontSize: '10px', color: seq.color, fontWeight: 700 }}>{seq.type}</span>
          </div>
          <p style={{ fontSize: '9px', color: C.label, lineHeight: '1.5' }}>{seq.details}</p>
          {isTSE && (
            <p style={{ fontSize: '9px', color: C.label, marginTop: '4px' }}>
              ETL={turboFactor}, ES={echoSpacing}ms → TE_eff={Math.round(teEff)}ms （k空間中心echo）
            </p>
          )}
          {isDWI && (
            <p style={{ fontSize: '9px', color: C.label, marginTop: '4px' }}>
              EPI読み出し: ジグザグk空間充填 → 位相方向歪み注意
            </p>
          )}
          {hasInversion && (
            <p style={{ fontSize: '9px', color: C.label, marginTop: '4px' }}>
              {isFLAIR ? 'FLAIR: 長TIでCSF信号をヌル' : isSTIR ? 'STIR: 短TIで脂肪信号をヌル' : `IR: TI=${TI}ms`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
