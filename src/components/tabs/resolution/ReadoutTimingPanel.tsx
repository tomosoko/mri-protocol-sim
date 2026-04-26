import { useProtocolStore } from '../../../store/protocolStore'

// ── Readout Duration / ADC Sampling Parameters ─────────────────────────────
// MRI の読み出しタイミングパラメータ：実際の syngo コンソールで確認できる値
export function ReadoutTimingPanel() {
  const { params } = useProtocolStore()

  // Readout duration (ADC duration): matrix_freq / (2 × bandwidth_per_pixel × matrix_freq)
  // = 1 / (2 × BW_per_pixel)   where BW_per_pixel = total_BW / matrix_freq
  // total_BW (Hz) = bandwidth (Hz/px) × matrixFreq
  // Readout time = matrixFreq / total_BW = 1 / (bandwidth) seconds
  const pixelBW = params.bandwidth  // Hz/pixel
  const totalBW = pixelBW * params.matrixFreq  // total receiver bandwidth (Hz)
  // Actually: readout = matrixFreq / (2 * halfBW_total) = matrixFreq / totalBW
  const adcDuration = (params.matrixFreq / totalBW * 1000).toFixed(2)  // ms
  const noiseBW = totalBW  // noise BW ≈ acquisition BW
  const dwellTime = (1 / totalBW * 1e6).toFixed(1)  // μs per sample

  // Chemical shift in mm: cs_Hz / (total_BW / FOV_mm)
  const is3T = params.fieldStrength >= 2.5
  const csHz = is3T ? 447 : 224
  const csPixels = csHz / pixelBW
  const csMm = csPixels * (params.fov / params.matrixFreq)

  const bwOk = pixelBW >= (is3T ? 200 : 130)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080c08', border: '1px solid #1a2a1a' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#4ade80', fontSize: '9px', letterSpacing: '0.05em' }}>
          READOUT / ADC PARAMETERS
        </span>
        <span style={{ color: '#374151', fontSize: '8px' }}>{params.matrixFreq} samples</span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1" style={{ fontSize: '8px' }}>
        <div className="flex justify-between">
          <span style={{ color: '#4b5563' }}>Pixel BW</span>
          <span className="font-mono font-bold" style={{ color: bwOk ? '#4ade80' : '#fbbf24' }}>{pixelBW} Hz/px</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#4b5563' }}>Total BW</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{(totalBW / 1000).toFixed(1)} kHz</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#4b5563' }}>ADC Duration</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{adcDuration} ms</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#4b5563' }}>Dwell Time</span>
          <span className="font-mono" style={{ color: '#9ca3af' }}>{dwellTime} μs</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#4b5563' }}>CS (pixels)</span>
          <span className="font-mono" style={{ color: csPixels > 2 ? '#f87171' : '#34d399' }}>{csPixels.toFixed(1)} px</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#4b5563' }}>CS (mm)</span>
          <span className="font-mono" style={{ color: csMm > 2 ? '#f87171' : '#34d399' }}>{csMm.toFixed(1)} mm</span>
        </div>
      </div>

      <div className="mt-1.5 pt-1" style={{ borderTop: '1px solid #0f1f0f', fontSize: '7px', color: '#374151' }}>
        {is3T && pixelBW < 200
          ? '⚠ 3Tではピクセル帯域幅≥200Hz/pxを推奨 (化学シフト対策)'
          : `Noise BW = ${(noiseBW/1000).toFixed(1)}kHz — ADC ${adcDuration}ms/line`}
      </div>
    </div>
  )
}
