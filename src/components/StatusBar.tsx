import { useProtocolStore } from '../store/protocolStore'
import { calcScanTime, calcSARLevel, calcSNR, voxelStr, sarLevel } from '../store/calculators'

export function StatusBar() {
  const { params } = useProtocolStore()
  const scanTime = calcScanTime(params)
  const sarPct = calcSARLevel(params)
  const sl = sarLevel(sarPct)
  const snr = calcSNR(params)
  const voxel = voxelStr(params)

  const sarColor = sl === 'low' ? 'text-green-400' : sl === 'medium' ? 'text-yellow-400' : sl === 'high' ? 'text-orange-400' : 'text-red-500'

  const fmt = (s: number) => {
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    const sec = s % 60
    return sec === 0 ? `${m}min` : `${m}m${sec}s`
  }

  return (
    <div className="flex items-center gap-6 px-4 py-1.5 text-xs font-mono border-b"
      style={{ background: '#0e0e0e', borderColor: '#252525', color: '#9ca3af' }}>
      {/* Scan time */}
      <div className="flex items-center gap-1.5">
        <span style={{ color: '#6b7280' }}>TIME</span>
        <span className="text-white font-semibold">{fmt(scanTime)}</span>
      </div>
      {/* Field strength */}
      <div className="flex items-center gap-1.5">
        <span style={{ color: '#6b7280' }}>B0</span>
        <span style={{ color: '#60a5fa' }} className="font-semibold">{params.fieldStrength}T</span>
      </div>
      {/* Voxel */}
      <div className="flex items-center gap-1.5">
        <span style={{ color: '#6b7280' }}>VOX</span>
        <span className="text-white">{voxel}</span>
      </div>
      {/* SNR */}
      <div className="flex items-center gap-1.5">
        <span style={{ color: '#6b7280' }}>SNR</span>
        <span style={{ color: snr > 80 ? '#34d399' : snr > 40 ? '#fbbf24' : '#f87171' }}>{snr}</span>
      </div>
      {/* SAR */}
      <div className="flex items-center gap-2">
        <span style={{ color: '#6b7280' }}>SAR</span>
        <div className="flex items-center gap-1.5">
          <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: '#374151' }}>
            <div
              className={`h-full rounded-full transition-all ${sl === 'low' ? 'bg-green-400' : sl === 'medium' ? 'bg-yellow-400' : sl === 'high' ? 'bg-orange-400' : 'bg-red-500'}`}
              style={{ width: `${sarPct}%` }}
            />
          </div>
          <span className={`${sarColor} font-semibold`}>{sarPct}%</span>
          {sl === 'over' && <span className="text-red-400 font-bold animate-pulse">⚠ OVER</span>}
        </div>
      </div>
      {/* Breathing */}
      <div className="flex items-center gap-1.5">
        <span style={{ color: '#6b7280' }}>RESP</span>
        <span style={{ color: '#a78bfa' }}>{params.respTrigger}</span>
      </div>
      {/* iPAT */}
      {params.ipatMode !== 'Off' && (
        <div className="flex items-center gap-1.5">
          <span style={{ color: '#6b7280' }}>iPAT</span>
          <span style={{ color: '#34d399' }}>{params.ipatMode} AF{params.ipatFactor}</span>
        </div>
      )}
    </div>
  )
}
