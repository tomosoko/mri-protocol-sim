import { useProtocolStore } from '../../store/protocolStore'

// ── 冷凍システム（クライオスタット）モニター ─────────────────────────────────
// MAGNETOM のクライオスタット・ヘリウムレベル・クライオクーラー状態を表示
export function CryoMonitor() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  // Simulated cryostat data (realistic MAGNETOM values)
  // Helium level: typically >95% during normal operation; drops slowly (~2%/year with ZBO)
  const heLevel = is3T ? 98.2 : 97.6  // %
  const magTemp = 4.22  // K (liquid helium bath, ~4.2K)
  const coldHead1 = 37  // K (1st stage cryo cooler)
  const coldHead2 = 4.25  // K (2nd stage cryo cooler)
  const boilOffRate = 0.0  // L/h (Zero Boil-Off system active)
  const cryoCompressor = 'Running'
  const nextService = is3T ? '2027-03' : '2026-11'

  const heLevelColor = heLevel < 50 ? '#ef4444' : heLevel < 70 ? '#fbbf24' : '#34d399'
  const tempColor = magTemp > 4.5 ? '#f87171' : magTemp > 4.3 ? '#fbbf24' : '#34d399'

  // Cold head temp bar: 2nd stage target is 4.2K, warn if >5K
  const ch2Pct = Math.min(100, ((coldHead2 - 4.0) / (6.0 - 4.0)) * 100)
  const ch1Pct = Math.min(100, ((coldHead1 - 30) / (60 - 30)) * 100)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#060a0f', border: '1px solid #0f2030' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#38bdf8', fontSize: '9px', letterSpacing: '0.06em' }}>
          CRYO SYSTEM
        </span>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: '#34d399' }} />
          <span style={{ color: '#374151', fontSize: '8px' }}>ZBO Active</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1" style={{ fontSize: '8px' }}>
        {/* Helium Level */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span style={{ color: '#4b5563' }}>He Level</span>
            <span className="font-mono font-bold" style={{ color: heLevelColor }}>{heLevel}%</span>
          </div>
          <div className="h-1.5 rounded overflow-hidden" style={{ background: '#0a1a2a' }}>
            <div className="h-full rounded" style={{ width: `${heLevel}%`, background: '#38bdf8', opacity: 0.8 }} />
          </div>
        </div>

        {/* Magnet Temp */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span style={{ color: '#4b5563' }}>Magnet Temp</span>
            <span className="font-mono font-bold" style={{ color: tempColor }}>{magTemp.toFixed(2)} K</span>
          </div>
          <div className="h-1.5 rounded overflow-hidden" style={{ background: '#0a1a2a' }}>
            <div className="h-full rounded" style={{ width: `${((magTemp - 4.0) / 1.0) * 100}%`, background: tempColor, opacity: 0.8 }} />
          </div>
        </div>

        {/* Cold Head 1st Stage */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span style={{ color: '#4b5563' }}>Cold Head 1</span>
            <span className="font-mono" style={{ color: '#9ca3af' }}>{coldHead1} K</span>
          </div>
          <div className="h-1.5 rounded overflow-hidden" style={{ background: '#0a1a2a' }}>
            <div className="h-full rounded" style={{ width: `${ch1Pct}%`, background: '#60a5fa', opacity: 0.7 }} />
          </div>
        </div>

        {/* Cold Head 2nd Stage */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span style={{ color: '#4b5563' }}>Cold Head 2</span>
            <span className="font-mono" style={{ color: '#9ca3af' }}>{coldHead2.toFixed(2)} K</span>
          </div>
          <div className="h-1.5 rounded overflow-hidden" style={{ background: '#0a1a2a' }}>
            <div className="h-full rounded" style={{ width: `${ch2Pct}%`, background: '#34d399', opacity: 0.7 }} />
          </div>
        </div>
      </div>

      <div className="mt-1.5 pt-1.5 flex flex-wrap gap-x-3 gap-y-0.5" style={{ borderTop: '1px solid #0f1a24', fontSize: '7px' }}>
        <span style={{ color: '#374151' }}>Compressor: <span style={{ color: '#34d399' }}>{cryoCompressor}</span></span>
        <span style={{ color: '#374151' }}>Boil-off: <span style={{ color: '#34d399' }}>{boilOffRate} L/h</span></span>
        <span style={{ color: '#374151' }}>Next Service: <span style={{ color: '#4b5563' }}>{nextService}</span></span>
      </div>
    </div>
  )
}

// ── RF アンプ / 送受信モニター ────────────────────────────────────────────────
// 送信電力・反射電力・VSWR・アンプ温度を表示 (Tx-Rx サブタブ用)
export function RFAmplifierMonitor() {
  const { params } = useProtocolStore()

  const is3T = params.fieldStrength >= 2.5
  const isTSE = params.turboFactor > 1
  const isDWI = params.bValues.length >= 2 && params.turboFactor <= 2

  // RF amplifier output estimation
  // Nominal reference power at 1.5T: ~15kW peak / 1.2kW avg; 3T: ~8kW peak
  const txPeakPower = is3T ? 8000 : 15000  // W
  const faFactor = (params.flipAngle / 90) ** 2
  const dutyFactor = isTSE ? 0.40 : isDWI ? 0.25 : 0.15
  const forwardPower = Math.round(txPeakPower * faFactor * dutyFactor)
  const reflectedPower = Math.round(forwardPower * 0.02)  // ~2% reflection is normal
  const vswr = ((1 + Math.sqrt(reflectedPower / Math.max(forwardPower, 1))) /
                (1 - Math.sqrt(reflectedPower / Math.max(forwardPower, 1))))
  const ampTemp = 42 + Math.round(forwardPower / txPeakPower * 28)  // °C

  // Tx calibration voltage
  const txRefVolt = is3T ? 245 : 180  // V (approximate)

  const tempColor = ampTemp > 65 ? '#ef4444' : ampTemp > 55 ? '#fbbf24' : '#34d399'
  const vswrColor = vswr > 1.5 ? '#f87171' : vswr > 1.3 ? '#fbbf24' : '#34d399'
  const dutyCyclePct = Math.round(dutyFactor * 100)

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#080608', border: '1px solid #200a30' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#c084fc', fontSize: '9px', letterSpacing: '0.06em' }}>
          RF AMPLIFIER
        </span>
        <span style={{ color: '#4b5563', fontSize: '8px' }}>{is3T ? '3T / 8kW peak' : '1.5T / 15kW peak'}</span>
      </div>

      <div className="space-y-1">
        {/* Forward power */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span style={{ color: '#6b7280', fontSize: '8px' }}>Forward Power</span>
            <span className="font-mono font-bold" style={{ color: '#c084fc', fontSize: '10px' }}>{forwardPower} W</span>
          </div>
          <div className="h-1.5 rounded overflow-hidden" style={{ background: '#111' }}>
            <div className="h-full rounded" style={{ width: `${Math.min(100, forwardPower / txPeakPower * 100)}%`, background: '#c084fc', opacity: 0.75 }} />
          </div>
        </div>

        {/* Reflected power */}
        <div className="flex items-center justify-between">
          <span style={{ color: '#4b5563', fontSize: '8px' }}>Reflected Power</span>
          <span className="font-mono" style={{ color: '#6b7280', fontSize: '9px' }}>{reflectedPower} W</span>
        </div>

        {/* Key metrics grid */}
        <div className="grid grid-cols-2 gap-x-3 mt-1 pt-1" style={{ borderTop: '1px solid #1a1020', fontSize: '8px' }}>
          <div className="flex justify-between">
            <span style={{ color: '#374151' }}>VSWR</span>
            <span className="font-mono" style={{ color: vswrColor }}>{vswr.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#374151' }}>Duty Cycle</span>
            <span className="font-mono" style={{ color: '#9ca3af' }}>{dutyCyclePct}%</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#374151' }}>Amp Temp</span>
            <span className="font-mono" style={{ color: tempColor }}>{ampTemp}°C</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: '#374151' }}>Tx Ref Volt</span>
            <span className="font-mono" style={{ color: '#9ca3af' }}>{txRefVolt} V</span>
          </div>
        </div>
      </div>

      <div className="mt-1.5 pt-1" style={{ borderTop: '1px solid #1a1020', fontSize: '7px', color: '#374151' }}>
        {ampTemp > 60
          ? '⚠ RF アンプ温度高め — 連続撮像インターバルを確保してください'
          : vswr > 1.3
          ? '△ 反射電力やや高め — コイル接続を確認'
          : 'TX/RX 正常'}
      </div>
    </div>
  )
}

// ── 受信チェーン ノイズフィギュア モニター ──────────────────────────────────
// コイル → プリアンプ → ADC → デジタルフィルタ → 再構成 の SNR 解析
// Friis 雑音指数公式: NFtotal = NF1 + (NF2-1)/G1 + ...
export function ReceiverChainMonitor() {
  const { params } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5

  // Noise Figure (dB) of each receiver chain element
  // Preamp NF: best coils ~0.3dB, body surface ~0.8dB
  const coilNF: Record<string, number> = {
    Head_64:  0.3, Head_20: 0.5, Spine_32: 0.45, Body: 1.2,
    Knee: 0.6, Shoulder: 0.7, Flex: 1.0,
  }
  const preampNF = coilNF[params.coilType ?? 'Body'] ?? 0.8
  const cableNF = 0.1   // LNA is immediately at the coil (modern)
  const adcNF = 0.4     // 16-bit ADC effective NF
  const digFilterNF = 0.05  // digital filter + reconstruction pipeline

  // Friis formula (linear domain): F_total = F1 + (F2-1)/G1 + (F3-1)/(G1*G2)
  // Preamp gain ~30dB (1000x) means subsequent stages are negligible
  const f1 = Math.pow(10, preampNF / 10)
  const g1 = 1000  // 30dB gain
  const f2 = Math.pow(10, cableNF / 10)
  const f3 = Math.pow(10, adcNF / 10)
  const f4 = Math.pow(10, digFilterNF / 10)
  const fTotal = f1 + (f2 - 1) / g1 + (f3 - 1) / (g1 * Math.pow(10, (cableNF) / 10)) + (f4 - 1) / (g1 * 100)
  const nfTotalDB = 10 * Math.log10(fTotal)

  // SNR at current bandwidth and field strength
  // Noise power: kT × BW (Boltzmann noise)
  const T = 310  // K (patient temperature)
  const k = 1.38e-23
  const bwHz = params.bandwidth * 2000  // total bandwidth Hz (params.bandwidth in kHz half-BW)
  const noisePowerDBm = 10 * Math.log10(k * T * bwHz * 1000)  // dBm
  const receiverNoisePowerDBm = noisePowerDBm + nfTotalDB

  // Larmor freq (MHz) — thermal noise scales with field
  const larmorMHz = params.fieldStrength * 42.577
  // SNR estimate: higher field → higher signal, same noise floor
  const snrEstDB = Math.round(20 * Math.log10(larmorMHz / 63.87) + 20 + (is3T ? 3 : 0))

  // ADC dynamic range
  const adcBits = 16
  const adcDR = 6.02 * adcBits + 1.76  // SINAD formula

  // Noise temperature
  const noiseTemp = Math.round(T * (fTotal - 1))

  const nfColor = nfTotalDB < 1 ? '#34d399' : nfTotalDB < 2 ? '#fbbf24' : '#f87171'
  const snrColor = snrEstDB > 25 ? '#34d399' : snrEstDB > 15 ? '#fbbf24' : '#f87171'

  const CHAIN = [
    { label: 'Coil/Preamp', nf: preampNF, gain: 30, color: '#60a5fa' },
    { label: 'Cable/Switch', nf: cableNF,  gain: -0.1, color: '#4b5563' },
    { label: 'ADC (16-bit)', nf: adcNF,   gain: 0, color: '#a78bfa' },
    { label: 'Recon Filter', nf: digFilterNF, gain: 0, color: '#374151' },
  ]

  return (
    <div className="mx-3 mt-2 p-2 rounded" style={{ background: '#06060e', border: '1px solid #101028' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-semibold" style={{ color: '#a78bfa', fontSize: '9px', letterSpacing: '0.06em' }}>
          RECEIVER CHAIN
        </span>
        <span style={{ color: '#374151', fontSize: '7px', fontFamily: 'monospace' }}>
          {params.coilType} · {(larmorMHz).toFixed(1)} MHz
        </span>
      </div>

      {/* Chain diagram */}
      <div className="flex items-center gap-0.5 mb-1.5 overflow-x-auto">
        {CHAIN.map((el, i) => (
          <div key={el.label} className="flex items-center gap-0.5">
            <div className="flex flex-col items-center px-1 py-0.5 rounded"
              style={{ background: el.color + '15', border: `1px solid ${el.color}30`, minWidth: 48 }}>
              <span style={{ color: el.color, fontSize: '6px', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {el.label}
              </span>
              <span className="font-mono font-bold" style={{ color: el.color, fontSize: '8px' }}>
                {el.nf.toFixed(1)}dB
              </span>
              {el.gain !== 0 && (
                <span style={{ color: el.color + '80', fontSize: '5.5px' }}>
                  {el.gain > 0 ? '+' : ''}{el.gain}dB
                </span>
              )}
            </div>
            {i < CHAIN.length - 1 && (
              <span style={{ color: '#1a1a2a', fontSize: '8px' }}>→</span>
            )}
          </div>
        ))}
        <span style={{ color: '#1a1a2a', fontSize: '8px', marginLeft: 2 }}>→</span>
        <div className="flex flex-col items-center px-1 py-0.5 rounded"
          style={{ background: '#1a0a2a', border: `1px solid ${nfColor}40`, minWidth: 44 }}>
          <span style={{ color: nfColor + 'aa', fontSize: '6px' }}>TOTAL NF</span>
          <span className="font-mono font-bold" style={{ color: nfColor, fontSize: '9px' }}>
            {nfTotalDB.toFixed(2)}dB
          </span>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-x-3 pt-1 mt-1" style={{ borderTop: '1px solid #101028', fontSize: '7.5px' }}>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>Noise floor</span>
          <span className="font-mono" style={{ color: '#4b5563' }}>{receiverNoisePowerDBm.toFixed(0)} dBm</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>SNR est.</span>
          <span className="font-mono" style={{ color: snrColor }}>{snrEstDB} dB</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>ADC range</span>
          <span className="font-mono" style={{ color: '#4b5563' }}>{adcDR.toFixed(0)} dB</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>Noise temp</span>
          <span className="font-mono" style={{ color: '#4b5563' }}>{noiseTemp} K</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>BW</span>
          <span className="font-mono" style={{ color: '#4b5563' }}>{(bwHz / 1000).toFixed(0)} kHz</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: '#374151' }}>f₀</span>
          <span className="font-mono" style={{ color: '#e88b00' }}>{larmorMHz.toFixed(2)} MHz</span>
        </div>
      </div>
    </div>
  )
}
