import { useProtocolStore } from '../store/protocolStore'
import {
  calcScanTime, calcSARLevel, calcSNR, voxelStr, sarLevel,
  chemShift, calcPNSRisk, calcT2Blur, identifySequence,
} from '../store/calculators'
import { validateProtocol, issueCount } from '../utils/protocolValidator'

export function StatusBar() {
  const { params } = useProtocolStore()
  const scanTime = calcScanTime(params)
  const sarPct = calcSARLevel(params)
  const sl = sarLevel(sarPct)
  const snr = calcSNR(params)
  const voxel = voxelStr(params)
  const cs = chemShift(params)
  const pns = calcPNSRisk(params)
  const t2blur = params.turboFactor > 4 ? calcT2Blur(params) : null
  const issues = validateProtocol(params)
  const counts = issueCount(issues)

  const seqId = identifySequence(params)
  const sarColor = sl === 'low' ? '#34d399' : sl === 'medium' ? '#fbbf24' : sl === 'high' ? '#fb923c' : '#ef4444'
  const snrColor = snr > 80 ? '#34d399' : snr > 40 ? '#fbbf24' : '#f87171'
  const pnsColor = pns === 'none' ? '#34d399' : pns === 'low' ? '#fbbf24' : pns === 'moderate' ? '#fb923c' : '#ef4444'

  const fmt = (s: number) => {
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const sec = s % 60
    return sec === 0 ? `${m}min` : `${m}m${sec}s`
  }

  return (
    <div className="flex items-center gap-0 shrink-0 overflow-x-auto"
      style={{ background: '#0a0a0a', borderBottom: '1px solid #1e1e1e', color: '#9ca3af', height: '26px' }}>

      {/* Sequence type badge */}
      <div className="flex items-center px-2 shrink-0" title={seqId.details}>
        <span className="font-mono font-bold px-1.5 py-0.5 rounded"
          style={{ background: seqId.color + '18', color: seqId.color, border: `1px solid ${seqId.color}40`, fontSize: '9px', letterSpacing: '0.04em' }}>
          {seqId.type}
        </span>
      </div>

      <Sep />

      {/* Scan time */}
      <Metric label="TIME" value={fmt(scanTime)} valueColor="#e2e8f0" />

      <Sep />

      {/* Field strength */}
      <Metric label="B0" value={`${params.fieldStrength}T`} valueColor="#e88b00" />

      <Sep />

      {/* Voxel */}
      <Metric label="VOX" value={voxel} />

      <Sep />

      {/* SNR */}
      <Metric label="SNR" value={String(snr)} valueColor={snrColor} />

      <Sep />

      {/* SAR bar + value */}
      <div className="flex items-center gap-1.5 px-2">
        <span style={{ color: '#4b5563', fontSize: '9px', letterSpacing: '0.08em' }}>SAR</span>
        <div className="flex items-center gap-1">
          <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e1e' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${sarPct}%`, background: sarColor }}
            />
          </div>
          <span className="font-mono text-xs" style={{ color: sarColor, fontSize: '10px' }}>{sarPct}%</span>
          {sl === 'over' && <span className="text-red-400 font-bold animate-pulse" style={{ fontSize: '9px' }}>OVER</span>}
        </div>
      </div>

      <Sep />

      {/* Chemical shift */}
      <Metric
        label="CS"
        value={`${cs}px`}
        valueColor={cs > 3 ? '#f87171' : cs > 1.5 ? '#fbbf24' : '#34d399'}
        title="化学シフト量"
      />

      <Sep />

      {/* T2 blur */}
      {t2blur !== null && (
        <>
          <Metric
            label="T2BLR"
            value={t2blur.toFixed(2)}
            valueColor={t2blur > 0.7 ? '#34d399' : t2blur > 0.4 ? '#fbbf24' : '#f87171'}
            title="T2ぼけ係数"
          />
          <Sep />
        </>
      )}

      {/* PNS */}
      {pns !== 'none' && (
        <>
          <Metric
            label="PNS"
            value={pns.toUpperCase()}
            valueColor={pnsColor}
            title="末梢神経刺激リスク"
          />
          <Sep />
        </>
      )}

      {/* Resp trigger */}
      {params.respTrigger !== 'Off' && (
        <>
          <Metric label="RESP" value={params.respTrigger} valueColor="#a78bfa" />
          <Sep />
        </>
      )}

      {/* iPAT */}
      {params.ipatMode !== 'Off' && (
        <>
          <Metric label="iPAT" value={`${params.ipatMode} ×${params.ipatFactor}`} valueColor="#34d399" />
          <Sep />
        </>
      )}

      {/* Validation badges */}
      <div className="flex items-center gap-1 px-2">
        {counts.errors > 0 && (
          <span className="px-1 py-0.5 rounded font-mono font-bold"
            style={{ background: '#1a0505', color: '#fca5a5', border: '1px solid #7f1d1d', fontSize: '9px' }}>
            ✕{counts.errors}
          </span>
        )}
        {counts.warnings > 0 && (
          <span className="px-1 py-0.5 rounded font-mono"
            style={{ background: '#1a1100', color: '#fcd34d', border: '1px solid #713f12', fontSize: '9px' }}>
            ⚠{counts.warnings}
          </span>
        )}
        {counts.errors === 0 && counts.warnings === 0 && (
          <span style={{ color: '#1f4a2f', fontSize: '9px' }}>✓ OK</span>
        )}
      </div>

    </div>
  )
}

function Metric({ label, value, valueColor, title }: {
  label: string
  value: string
  valueColor?: string
  title?: string
}) {
  return (
    <div className="flex items-center gap-1 px-2" title={title}>
      <span style={{ color: '#4b5563', fontSize: '9px', letterSpacing: '0.08em', fontFamily: 'monospace' }}>{label}</span>
      <span className="font-mono font-semibold" style={{ color: valueColor ?? '#c8ccd6', fontSize: '10px' }}>{value}</span>
    </div>
  )
}

function Sep() {
  return <div style={{ width: '1px', height: '14px', background: '#1e1e1e', flexShrink: 0 }} />
}
