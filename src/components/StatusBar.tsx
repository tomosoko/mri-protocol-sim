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
  // SNR効率 = SNR / √(スキャン時間[s]) — 単位時間あたりのSNR効率
  const snrEff = scanTime > 0 ? Math.round(snr / Math.sqrt(scanTime) * 10) / 10 : 0
  const isEPI = params.bValues.length > 1 && params.turboFactor <= 2
  const epiReadoutMs = isEPI
    ? Math.round((params.matrixPhase / (params.ipatMode !== 'Off' ? params.ipatFactor : 1)) * (1000 / params.bandwidth) * 10) / 10
    : null
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
      style={{ background: '#070c14', borderBottom: '1px solid #0f1e2c', color: '#9ca3af', height: '26px' }}>

      {/* Sequence type badge */}
      <div className="flex items-center px-2 shrink-0" title={seqId.details}>
        <span className="font-mono font-bold px-1.5 py-0.5 rounded"
          style={{ background: seqId.color + '18', color: seqId.color, border: `1px solid ${seqId.color}40`, fontSize: '9px', letterSpacing: '0.04em' }}>
          {seqId.type}
        </span>
      </div>

      <Sep />

      {/* Scan time */}
      <div className="flex items-center gap-1 px-3">
        <span style={{ color: '#3a6a8a', fontSize: '9px', letterSpacing: '0.08em', fontFamily: 'monospace' }}>TIME</span>
        <span className="font-mono font-bold" style={{ color: '#f0f4f8', fontSize: '12px', letterSpacing: '0.04em' }}>{fmt(scanTime)}</span>
      </div>

      <Sep />

      {/* Field strength + Larmor freq */}
      <Metric label="B0" value={`${params.fieldStrength}T`} valueColor="#e88b00" />
      <Metric label="f₀" value={`${params.fieldStrength >= 2.5 ? '127.7' : '63.9'}MHz`} valueColor="#e88b0066"
        title={`Larmor周波数: ${params.fieldStrength >= 2.5 ? '127.74' : '63.87'} MHz`} />

      <Sep />

      {/* Voxel */}
      <Metric label="VOX" value={voxel} />

      <Sep />

      {/* SNR */}
      <Metric label="SNR" value={String(snr)} valueColor={snrColor} />

      <Sep />

      {/* SNR効率 */}
      <Metric
        label="EFF"
        value={String(snrEff)}
        valueColor={snrEff > 8 ? '#34d399' : snrEff > 4 ? '#fbbf24' : '#9ca3af'}
        title={`SNR効率 = SNR/√時間 = ${snrEff} — 値が高いほど時間対SNRが優秀`}
      />

      <Sep />

      {/* SAR bar + value */}
      <div className="flex items-center gap-1.5 px-2">
        <span style={{ color: '#3a6a8a', fontSize: '9px', letterSpacing: '0.08em' }}>SAR</span>
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

      {/* EPI readout time */}
      {epiReadoutMs !== null && (
        <>
          <Metric
            label="ROUT"
            value={`${epiReadoutMs}ms`}
            valueColor={epiReadoutMs > 60 ? '#f87171' : epiReadoutMs > 30 ? '#fbbf24' : '#34d399'}
            title={`EPI エコートレイン長 ${epiReadoutMs}ms — 幾何歪みに直結`}
          />
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
      <span style={{ color: '#3a6a8a', fontSize: '9px', letterSpacing: '0.08em', fontFamily: 'monospace' }}>{label}</span>
      <span className="font-mono font-semibold" style={{ color: valueColor ?? '#c8dce8', fontSize: '10.5px' }}>{value}</span>
    </div>
  )
}

function Sep() {
  return <div style={{ width: '1px', height: '14px', background: '#0f1e2c', flexShrink: 0 }} />
}
