import { useProtocolStore } from '../store/protocolStore'
import { calcScanTime, calcSARLevel, calcSNR, voxelStr, chemShift, identifySequence, sarLevel } from '../store/calculators'
import { validateProtocol } from '../utils/protocolValidator'
import { presets } from '../data/presets'

function SummaryRow({ label, value, unit, highlight }: { label: string; value: string | number; unit?: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between py-0.5" style={{ borderBottom: '1px solid #111' }}>
      <span style={{ color: '#6b7280', fontSize: '10px' }}>{label}</span>
      <span className="font-mono" style={{ color: highlight ? '#fbbf24' : '#e2e8f0', fontSize: '10px' }}>
        {value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <div className="text-xs font-semibold uppercase tracking-wider mb-1 px-1" style={{ color: '#4b5563', fontSize: '9px' }}>
        {title}
      </div>
      <div className="px-1">{children}</div>
    </div>
  )
}

export function ProtocolSummaryPanel() {
  const { params, activePresetId } = useProtocolStore()
  const preset = presets.find(p => p.id === activePresetId)
  const scanTime = calcScanTime(params)
  const sarPct = calcSARLevel(params)
  const sl = sarLevel(sarPct)
  const snr = calcSNR(params)
  const voxel = voxelStr(params)
  const cs = chemShift(params)
  const seqId = identifySequence(params)
  const issues = validateProtocol(params)
  const errors = issues.filter(i => i.severity === 'error').length
  const warnings = issues.filter(i => i.severity === 'warning').length

  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  const exportText = () => {
    const lines = [
      `MRI Protocol Report`,
      `===================`,
      `Preset:  ${preset?.label ?? 'Custom'}`,
      `Seq:     ${seqId.type} — ${seqId.details}`,
      ``,
      `[Timing]`,
      `TR:      ${params.TR} ms`,
      `TE:      ${params.TE} ms`,
      `TI:      ${params.TI} ms`,
      `FA:      ${params.flipAngle}°`,
      ``,
      `[Resolution]`,
      `Voxel:   ${voxel}`,
      `Matrix:  ${params.matrixFreq}×${params.matrixPhase}`,
      `FOV:     ${params.fov} mm`,
      `Slices:  ${params.slices}×${params.sliceThickness}mm (gap ${params.sliceGap}mm)`,
      ``,
      `[Sequence]`,
      `ETL:     ${params.turboFactor}`,
      `ES:      ${params.echoSpacing} ms`,
      `PF:      ${params.partialFourier}`,
      `BW:      ${params.bandwidth} Hz/px`,
      ``,
      `[System]`,
      `B0:      ${params.fieldStrength}T`,
      `Coil:    ${params.coilType}`,
      `iPAT:    ${params.ipatMode} (AF=${params.ipatFactor})`,
      `FatSat:  ${params.fatSat}`,
      `Resp:    ${params.respTrigger}`,
      params.ecgTrigger ? `ECG:     Enabled (delay=${params.triggerDelay}ms)` : `ECG:     Off`,
      ``,
      `[Performance]`,
      `Scan Time: ${fmt(scanTime)}`,
      `SAR:       ${sarPct}% (${sl})`,
      `SNR:       ${snr} (relative)`,
      `Chem Shift:${cs} px`,
      ``,
      `[Inline]`,
      `ADC:     ${params.inlineADC ? 'ON' : 'OFF'}`,
      `MIP:     ${params.inlineMIP ? 'ON' : 'OFF'}`,
      `MPR:     ${params.inlineMPR ? 'ON' : 'OFF'}`,
      `Subtr:   ${params.inlineSubtraction ? 'ON' : 'OFF'}`,
    ]
    if (params.bValues.length > 1) {
      lines.push(`b-values: ${params.bValues.join(', ')} s/mm²`)
    }
    if (issues.length > 0) {
      lines.push(``, `[Validation]`)
      issues.forEach(i => {
        lines.push(`${i.severity.toUpperCase()}: ${i.title}`)
      })
    }
    return lines.join('\n')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText()).catch(() => {})
  }

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs" style={{ background: '#0a0a0a', color: '#c8ccd6' }}>
      {/* Header */}
      <div className="px-3 py-2 shrink-0 flex items-center justify-between" style={{ background: '#111', borderBottom: '1px solid #252525' }}>
        <div>
          <div className="font-semibold" style={{ color: '#e88b00' }}>Protocol Summary</div>
          <div style={{ color: '#4b5563' }}>全パラメータの一覧・エクスポート</div>
        </div>
        <button
          onClick={handleCopy}
          className="px-2 py-1 rounded text-xs transition-colors"
          style={{ background: '#1a1200', color: '#e88b00', border: '1px solid #713f12' }}
        >
          コピー
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">

        {/* Preset / Sequence */}
        <div className="p-2 rounded mb-3" style={{ background: '#111', border: '1px solid #252525' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="font-semibold" style={{ color: '#e88b00' }}>
              {preset?.label ?? 'Custom Protocol'}
            </div>
            <span className="font-mono font-bold px-1.5 py-0.5 rounded text-xs"
              style={{ background: seqId.color + '18', color: seqId.color, border: `1px solid ${seqId.color}40` }}>
              {seqId.type}
            </span>
          </div>
          {preset?.description && (
            <div style={{ color: '#6b7280', fontSize: '10px' }}>{preset.description}</div>
          )}
          <div className="mt-1" style={{ color: '#4b5563', fontSize: '9px' }}>{seqId.details}</div>
        </div>

        {/* Timing */}
        <Section title="Timing Parameters">
          <SummaryRow label="TR" value={params.TR} unit="ms" />
          <SummaryRow label="TE" value={params.TE} unit="ms" />
          {params.TI > 0 && <SummaryRow label="TI" value={params.TI} unit="ms" />}
          <SummaryRow label="Flip Angle" value={`${params.flipAngle}°`} />
          <SummaryRow label="Averages" value={params.averages} />
        </Section>

        {/* Resolution */}
        <Section title="Spatial Resolution">
          <SummaryRow label="Voxel Size" value={voxel} highlight />
          <SummaryRow label="Matrix" value={`${params.matrixFreq}×${params.matrixPhase}`} />
          <SummaryRow label="FOV" value={params.fov} unit="mm" />
          <SummaryRow label="Slices" value={params.slices} />
          <SummaryRow label="Slice Thickness" value={params.sliceThickness} unit="mm" />
          <SummaryRow label="Slice Gap" value={params.sliceGap} unit="%" />
          <SummaryRow label="Phase Resolution" value={`${params.phaseResolution}%`} />
        </Section>

        {/* Sequence */}
        <Section title="Sequence Parameters">
          <SummaryRow label="ETL (Turbo Factor)" value={params.turboFactor} />
          <SummaryRow label="Echo Spacing" value={params.echoSpacing} unit="ms" />
          <SummaryRow label="Partial Fourier" value={params.partialFourier} />
          <SummaryRow label="Bandwidth" value={params.bandwidth} unit="Hz/px" />
          <SummaryRow label="Chem Shift" value={`${cs} px`} highlight={cs > 2} />
          {params.bValues.length > 1 && (
            <SummaryRow label="b-values" value={params.bValues.join(' / ')} unit="s/mm²" />
          )}
        </Section>

        {/* System */}
        <Section title="System / Hardware">
          <SummaryRow label="Field Strength" value={`${params.fieldStrength}T`} highlight />
          <SummaryRow label="Coil" value={params.coilType} />
          <SummaryRow label="iPAT Mode" value={params.ipatMode} />
          {params.ipatMode !== 'Off' && <SummaryRow label="Accel. Factor" value={`×${params.ipatFactor}`} />}
          <SummaryRow label="Gradient Mode" value={params.gradientMode} />
          <SummaryRow label="Fat Saturation" value={params.fatSat} />
          <SummaryRow label="MT" value={params.mt ? 'ON' : 'OFF'} />
          <SummaryRow label="Orientation" value={params.orientation} />
          <SummaryRow label="Phase Enc Dir" value={params.phaseEncDir} />
        </Section>

        {/* Physio */}
        <Section title="Physiological Gating">
          <SummaryRow label="Resp. Control" value={params.respTrigger} />
          <SummaryRow label="ECG Trigger" value={params.ecgTrigger ? 'ON' : 'OFF'} />
          {params.ecgTrigger && <SummaryRow label="Trigger Delay" value={params.triggerDelay} unit="ms" />}
        </Section>

        {/* Performance */}
        <Section title="Estimated Performance">
          <SummaryRow label="Scan Time" value={fmt(scanTime)} highlight />
          <SummaryRow label="SAR" value={`${sarPct}% (${sl})`} highlight={sarPct > 70} />
          <SummaryRow label="Relative SNR" value={snr} highlight={snr < 30} />
        </Section>

        {/* Validation summary */}
        <div className="p-2 rounded mt-1" style={{
          background: errors > 0 ? '#1a0505' : warnings > 0 ? '#1a1100' : '#0d1f0d',
          border: `1px solid ${errors > 0 ? '#7f1d1d' : warnings > 0 ? '#713f12' : '#14532d'}`,
        }}>
          <div className="font-semibold mb-1" style={{
            color: errors > 0 ? '#fca5a5' : warnings > 0 ? '#fcd34d' : '#4ade80', fontSize: '10px',
          }}>
            {errors > 0 ? `⚠ エラー ${errors}件` : warnings > 0 ? `⚠ 警告 ${warnings}件` : '✓ 検証 OK'}
          </div>
          {issues.slice(0, 4).map(i => (
            <div key={i.id} style={{ color: '#6b7280', fontSize: '9px' }}>
              {i.severity === 'error' ? '✕' : i.severity === 'warning' ? '▲' : '·'} {i.title}
            </div>
          ))}
          {issues.length > 4 && (
            <div style={{ color: '#4b5563', fontSize: '9px' }}>他 {issues.length - 4} 件</div>
          )}
        </div>

      </div>
    </div>
  )
}
