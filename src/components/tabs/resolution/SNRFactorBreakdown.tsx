import { useProtocolStore } from '../../../store/protocolStore'
import { calcSNR, calcGFactor } from '../../../store/calculators'

// ── SNR Factor Breakdown ─────────────────────────────────────────────────────
export function SNRFactorBreakdown() {
  const { params } = useProtocolStore()

  const voxelVol = (params.fov / params.matrixFreq) * (params.fov / params.matrixPhase) * params.sliceThickness
  const bwFactor = Math.round(Math.sqrt(200 / Math.max(params.bandwidth, 50)) * 100)
  const avgFactor = Math.round(Math.sqrt(params.averages) * 100)
  const gFactor = calcGFactor(params.ipatMode, params.ipatFactor)
  const ipatFactor = params.ipatMode !== 'Off'
    ? Math.round((1 / (Math.sqrt(params.ipatFactor) * gFactor)) * 100)
    : 100
  const COIL_SNR: Record<string, number> = { Head_64: 100, Head_20: 75, Spine_32: 85, Body: 55, Knee: 80, Shoulder: 72, Flex: 60 }
  const coilFactor = COIL_SNR[params.coilType] ?? 60
  const fieldFactor = params.fieldStrength === 3.0 ? 160 : 100

  const totalSNR = calcSNR(params)

  const factors: { label: string; value: number; note: string; color: string }[] = [
    { label: 'ボクセル体積', value: Math.min(200, Math.round(voxelVol * 10)), note: `${voxelVol.toFixed(2)}mm³`, color: '#60a5fa' },
    { label: '帯域幅 (1/√BW)', value: bwFactor, note: `BW=${params.bandwidth}`, color: '#34d399' },
    { label: '加算 (√NEX)', value: avgFactor, note: `NEX=${params.averages}`, color: '#4ade80' },
    { label: 'iPAT/g-factor', value: ipatFactor, note: params.ipatMode !== 'Off' ? `×${params.ipatFactor} g=${gFactor.toFixed(2)}` : 'Off', color: ipatFactor < 70 ? '#f87171' : '#fbbf24' },
    { label: 'コイル係数', value: coilFactor, note: params.coilType, color: '#a78bfa' },
    { label: '磁場強度', value: fieldFactor, note: `${params.fieldStrength}T`, color: '#fb923c' },
  ]

  const maxVal = Math.max(...factors.map(f => f.value), 1)

  return (
    <div className="mx-3 mt-2 p-2.5 rounded" style={{ background: '#111', border: '1px solid #1a1a2a' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold" style={{ color: '#60a5fa', fontSize: '10px' }}>SNR 寄与因子</div>
        <div className="font-mono font-bold" style={{ color: '#e2e8f0', fontSize: '11px' }}>SNR={totalSNR}</div>
      </div>
      <div className="space-y-1.5">
        {factors.map(f => (
          <div key={f.label}>
            <div className="flex items-center justify-between mb-0.5">
              <span style={{ color: '#6b7280', fontSize: '8px' }}>{f.label}</span>
              <span className="font-mono" style={{ color: f.color, fontSize: '8px' }}>{f.note}</span>
            </div>
            <div className="h-1.5 rounded overflow-hidden" style={{ background: '#1a1a1a' }}>
              <div className="h-full rounded transition-all duration-300"
                style={{ width: `${Math.min(100, f.value / maxVal * 100)}%`, background: f.color, opacity: 0.8 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 pt-1.5" style={{ borderTop: '1px solid #1a1a1a', color: '#374151', fontSize: '8px' }}>
        SNR ∝ ボクセル × (1/√BW) × √NEX × (1/√iPAT × g⁻¹) × コイル × B₀
      </div>
    </div>
  )
}
