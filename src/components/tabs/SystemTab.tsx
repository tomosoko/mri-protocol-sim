import { useProtocolStore } from '../../store/protocolStore'
import { ParamField } from '../ParamField'

export function SystemTab() {
  const { params, setParam, highlightedParams } = useProtocolStore()
  const hl = (k: string) => highlightedParams.includes(k)

  return (
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
                background: params.fieldStrength === f ? '#1d4ed8' : '#1f2937',
                color: params.fieldStrength === f ? '#fff' : '#6b7280',
                border: `1px solid ${params.fieldStrength === f ? '#2563eb' : '#374151'}`,
              }}
            >
              {f}T
            </button>
          ))}
        </div>
        {params.fieldStrength === 3.0 && (
          <div className="mt-2 p-2 rounded text-xs" style={{ background: '#1a1a2e', border: '1px solid #7c3aed', color: '#a78bfa' }}>
            ⚠ 3T注意: SAR≈4倍・化学シフト2倍・Dielectric Effect・SNR↑（理論値√2倍）
          </div>
        )}
      </div>

      <div className="border-t my-1" style={{ borderColor: '#1f2937' }} />

      <ParamField label="Coil" value={params.coil} type="select"
        options={['Head', 'Neck', 'Spine', 'Body', 'Breast', 'Cardiac', 'Knee', 'Shoulder', 'Tim Whole-Body']}
        onChange={v => setParam('coil', v as string)} />
      <ParamField label="iPAT Mode" hintKey="iPAT" value={params.ipatMode} type="select"
        options={['Off', 'GRAPPA', 'CAIPIRINHA']}
        onChange={v => setParam('ipatMode', v as typeof params.ipatMode)} highlight={hl('ipatMode')} />
      {params.ipatMode !== 'Off' && (
        <ParamField label="Acceleration Factor" value={params.ipatFactor} type="select"
          options={['2', '3', '4']}
          onChange={v => setParam('ipatFactor', parseInt(v as string))} />
      )}
      <ParamField label="Gradient Mode" hintKey="GradientMode" value={params.gradientMode} type="select"
        options={['Fast', 'Normal', 'Whisper']}
        onChange={v => setParam('gradientMode', v as typeof params.gradientMode)} />
      <ParamField label="Shim Mode" value={params.shim} type="select"
        options={['Auto', 'Manual']}
        onChange={v => setParam('shim', v as typeof params.shim)} />

      {/* iPAT guide */}
      {params.ipatMode !== 'Off' && (
        <div className="mx-3 mt-3 p-3 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
          <div className="font-semibold mb-2" style={{ color: '#60a5fa' }}>
            {params.ipatMode} AF={params.ipatFactor} の影響
          </div>
          <div className="space-y-1" style={{ color: '#9ca3af' }}>
            <div>撮像時間: <span className="text-white">約 1/{params.ipatFactor} に短縮</span></div>
            <div>SNR低下: <span className="text-yellow-400">約 {(100 / Math.sqrt(params.ipatFactor)).toFixed(0)}% に低下</span></div>
            <div>DWIでの利点: <span className="text-green-400">EPIエコートレイン短縮 → 磁化率アーチファクト・歪み改善</span></div>
            {params.ipatFactor >= 3 && (
              <div className="text-orange-400">⚠ AF≥3はg-factor（残留アーチファクト）に注意。コイル素子数が十分必要。</div>
            )}
          </div>
        </div>
      )}

      {/* Gradient mode guide */}
      <div className="mx-3 mt-2 p-3 rounded text-xs" style={{ background: '#0f172a', border: '1px solid #1f2937' }}>
        <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>Gradient Mode</div>
        <div className="space-y-0.5" style={{ color: '#9ca3af' }}>
          <div><span className="text-white">Fast: </span>最速・最大騒音・PNS（末梢神経刺激）↑ → 心臓シネ/EPI</div>
          <div><span className="text-white">Normal: </span>標準バランス → 通常検査</div>
          <div><span className="text-white">Whisper: </span>低騒音(約-10dB)・低PNS → 小児/聴覚過敏・鎮静</div>
        </div>
      </div>
    </div>
  )
}
