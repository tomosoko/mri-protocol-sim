import { useProtocolStore } from '../../../store/protocolStore'

// ── インライン再構成パイプライン ───────────────────────────────────────────────
// syngo Inline の再構成ワークフローを可視化
// 生データ → FFT → 画像補正 → インライン処理 → DICOM転送 の各ステップ
export function ReconPipeline() {
  const { params } = useProtocolStore()
  const isDWI = params.bValues.length > 1 && params.turboFactor <= 2

  type Step = { id: string; label: string; desc: string; active: boolean; color: string; time: string }
  const steps: Step[] = [
    { id: 'acq', label: 'Acquisition', desc: 'k空間データ収集', active: true, color: '#60a5fa', time: '—' },
    { id: 'raw', label: 'Raw Filter', desc: 'ハンニング窓・Fermi', active: true, color: '#34d399', time: '<1ms' },
    { id: 'fft', label: 'iFFT', desc: '2D/3D 逆フーリエ変換', active: true, color: '#34d399', time: '~5ms' },
    { id: 'zf',  label: 'Zerofilling', desc: '補間・ゼロ充填', active: params.interpolation, color: '#fbbf24', time: '2ms' },
    { id: 'grappa', label: 'GRAPPA', desc: 'iPAT ACS補間', active: params.ipatMode !== 'Off', color: '#a78bfa', time: '10-50ms' },
    { id: 'pf',  label: 'Partial Fourier', desc: 'Homodyne / POCS', active: params.partialFourier !== 'Off', color: '#fb923c', time: '5ms' },
    { id: 'adc', label: 'ADC Map', desc: 'DWI定量マップ', active: isDWI && params.inlineADC, color: '#f87171', time: '100ms' },
    { id: 'mip', label: 'MIP/MPR', desc: '投影・多断面再構成', active: params.inlineMIP || params.inlineMPR, color: '#e879f9', time: '200ms' },
    { id: 'sub', label: 'Subtraction', desc: '造影前後差分', active: params.inlineSubtraction, color: '#38bdf8', time: '50ms' },
    { id: 'dcm', label: 'DICOM Send', desc: 'PACS転送', active: true, color: '#6b7280', time: '—' },
  ].filter(s => s.active || ['acq', 'raw', 'fft', 'dcm'].includes(s.id))

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#060809', border: '1px solid #1a2030' }}>
      <div className="font-semibold mb-1.5" style={{ color: '#e88b00', fontSize: '9px', letterSpacing: '0.05em' }}>
        RECONSTRUCTION PIPELINE
      </div>
      <div className="flex flex-wrap items-center gap-0.5">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center">
            <div
              className="flex flex-col items-center px-1.5 py-1 rounded"
              style={{
                background: step.active ? step.color + '15' : '#111',
                border: `1px solid ${step.active ? step.color + '50' : '#1a1a1a'}`,
                minWidth: 52,
              }}
              title={step.desc + ' | ' + step.time}
            >
              <span style={{ color: step.active ? step.color : '#2a2a2a', fontSize: '8px', fontWeight: step.active ? 600 : 400 }}>
                {step.label}
              </span>
              <span style={{ color: step.active ? step.color + '80' : '#1a1a1a', fontSize: '6px' }}>
                {step.time}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span style={{ color: '#252525', fontSize: '8px', margin: '0 1px' }}>→</span>
            )}
          </div>
        ))}
      </div>
      <div style={{ color: '#374151', fontSize: '7px', marginTop: 4 }}>
        有効なステップのみハイライト表示 · 推定処理時間はプロトコル依存
      </div>
    </div>
  )
}
