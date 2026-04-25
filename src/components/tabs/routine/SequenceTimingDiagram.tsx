import { useProtocolStore } from '../../../store/protocolStore'

// ── シーケンスタイミング図 ───────────────────────────────────────────────────
// RF / Gss / Gpe / Gro / ADC の波形を現在のパラメータに基づいてリアルタイム描画
export function SequenceTimingDiagram() {
  const { params } = useProtocolStore()
  const isTSE = params.turboFactor > 1
  const isIR = params.TI > 0
  const isGRE = params.flipAngle < 80 && params.TR < 500 && !isTSE
  const isDWI = params.bValues.length > 1 && params.turboFactor <= 2

  const W = 320, H = 100
  const PAD = { l: 28, r: 8, t: 4, b: 14 }
  const innerW = W - PAD.l - PAD.r
  const ROW_H = 16
  const ROW_Y = [6, 22, 38, 54, 70, 86]
  const AMP = ROW_H * 0.82
  const MID = (y: number) => ROW_Y[y] + ROW_H * 0.5

  const displayTR = Math.min(params.TR, isIR ? Math.min(params.TR, 6000) : 3000)
  const tx = (t: number) => PAD.l + (Math.min(t, displayTR) / displayTR) * innerW

  const t_exc = isIR ? params.TI : 0
  const t_refocus = t_exc + params.TE / 2
  const t_echo = t_exc + params.TE
  const t_inversion = 0

  const sincPulse = (cx: number, yMid: number, amp: number, color: string, label?: string) => {
    const w = Math.max(8, innerW * 0.025)
    const pts = [-3,-2,-1,0,1,2,3].map(i => {
      const x = cx + i * w / 3
      const v = i === 0 ? 1 : Math.sin(Math.PI * i * 0.6) / (Math.PI * i * 0.6)
      return `${x},${yMid - v * amp}`
    })
    return (
      <g key={cx}>
        <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
        {label && <text x={cx} y={yMid + amp + 6} textAnchor="middle" fontSize="6" fill={color + 'cc'}>{label}</text>}
      </g>
    )
  }

  const rectPulse = (cx: number, yMid: number, amp: number, w: number, color: string, label?: string) => (
    <g key={cx + '_rect'}>
      <path d={`M${cx - w / 2},${yMid} L${cx - w / 2},${yMid - amp} L${cx + w / 2},${yMid - amp} L${cx + w / 2},${yMid}`}
        fill={color + '18'} stroke={color} strokeWidth="1" />
      {label && <text x={cx} y={yMid - amp - 2} textAnchor="middle" fontSize="6" fill={color + 'bb'}>{label}</text>}
    </g>
  )

  const trapLobe = (x1: number, x2: number, yMid: number, amp: number, color: string, polarity = 1) => {
    const ramp = Math.min(4, (x2 - x1) * 0.2)
    const a = amp * polarity
    return (
      <path key={`${x1}_${x2}_trap`}
        d={`M${x1},${yMid} L${x1 + ramp},${yMid - a} L${x2 - ramp},${yMid - a} L${x2},${yMid}`}
        fill={color + '22'} stroke={color} strokeWidth="0.8" />
    )
  }

  const echoCount = Math.min(isTSE ? params.turboFactor : 1, 6)

  return (
    <div className="mx-3 mt-2 p-1.5 rounded" style={{ background: '#050709', border: '1px solid #111d28' }}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ color: '#60a5fa', fontSize: '8px', fontWeight: 600, letterSpacing: '0.05em' }}>
          SEQUENCE TIMING DIAGRAM
        </span>
        <span style={{ color: '#374151', fontSize: '7px', fontFamily: 'monospace' }}>
          {isGRE ? 'GRE' : isDWI ? 'EPI-DWI' : isTSE ? `TSE(ETL=${params.turboFactor})` : isIR ? 'IR-SE' : 'SE'}
          {' · '}TR={params.TR}ms · TE={params.TE}ms{isIR ? ` · TI=${params.TI}ms` : ''}
        </span>
      </div>
      <svg width={W} height={H} style={{ display: 'block', overflow: 'visible' }}>
        {['RF', 'Gss', 'Gpe', 'Gro', 'ADC'].map((label, i) => (
          <text key={label} x={PAD.l - 2} y={ROW_Y[i] + ROW_H * 0.65}
            textAnchor="end" fontSize="6.5" fill="#374151" fontFamily="monospace">{label}</text>
        ))}
        {[0,1,2,3,4].map(i => (
          <line key={i} x1={PAD.l} y1={MID(i)} x2={W - PAD.r} y2={MID(i)}
            stroke="#0f1a20" strokeWidth="0.5" />
        ))}
        <line x1={tx(displayTR)} y1={ROW_Y[0]} x2={tx(displayTR)} y2={ROW_Y[4] + ROW_H}
          stroke="#1a2020" strokeWidth="0.5" strokeDasharray="2,2" />
        <text x={tx(displayTR) - 1} y={H - 2} textAnchor="end" fontSize="6" fill="#1f3030" fontFamily="monospace">
          TR={displayTR < params.TR ? `${displayTR}…` : `${params.TR}`}ms
        </text>

        {/* RF Row */}
        {isIR && rectPulse(tx(t_inversion) + 6, MID(0), AMP, 12, '#f87171', '180°')}
        {sincPulse(tx(t_exc), MID(0), AMP * (isGRE ? 0.5 : 0.85), '#e88b00', `${params.flipAngle}°`)}
        {!isGRE && Array.from({ length: echoCount }, (_, i) => {
          const t_ref_i = t_refocus + i * params.echoSpacing
          return rectPulse(tx(t_ref_i), MID(0), AMP * 0.9, 10, '#a78bfa', i === 0 ? '180°' : undefined)
        })}

        {/* Gss Row */}
        {trapLobe(tx(t_exc) - 12, tx(t_exc) + 12, MID(1), AMP * 0.8, '#34d399')}
        {trapLobe(tx(t_exc) + 14, tx(t_exc) + 24, MID(1), AMP * 0.4, '#34d399', -1)}
        {!isGRE && Array.from({ length: echoCount }, (_, i) => {
          const t_ref_i = t_refocus + i * params.echoSpacing
          return trapLobe(tx(t_ref_i) - 8, tx(t_ref_i) + 8, MID(1), AMP * 0.75, '#34d399')
        })}

        {/* Gpe Row */}
        {Array.from({ length: Math.min(echoCount, 4) }, (_, i) => {
          const t_pe = t_exc + params.TE * 0.28 + i * params.echoSpacing
          const polarity = (i % 2 === 0) ? 1 : -1
          return trapLobe(tx(t_pe) - 5, tx(t_pe) + 5, MID(2), AMP * 0.6, '#fbbf24', polarity)
        })}

        {/* Gro Row */}
        {trapLobe(tx(t_exc) + 26, tx(t_echo) - 14, MID(3), AMP * 0.5, '#60a5fa', -1)}
        {Array.from({ length: echoCount }, (_, i) => {
          const t_echo_i = t_echo + i * params.echoSpacing
          const echoW = Math.max(14, Math.min(innerW * 0.12, 22))
          return trapLobe(tx(t_echo_i) - echoW / 2, tx(t_echo_i) + echoW / 2, MID(3), AMP * 0.85, '#60a5fa')
        })}

        {/* ADC Row */}
        {Array.from({ length: echoCount }, (_, i) => {
          const t_echo_i = t_echo + i * params.echoSpacing
          const decayAmp = AMP * 0.7 * Math.exp(-i * 0.3)
          const adcW = Math.max(12, Math.min(innerW * 0.10, 20))
          return (
            <g key={i}>
              <rect x={tx(t_echo_i) - adcW / 2} y={MID(4) - decayAmp}
                width={adcW} height={decayAmp}
                fill="#38bdf8" fillOpacity="0.15" stroke="#38bdf8" strokeWidth="0.7" />
              {i === 0 && (
                <text x={tx(t_echo_i)} y={MID(4) + 6} textAnchor="middle" fontSize="5.5" fill="#1e4a5a">
                  TE={params.TE}ms
                </text>
              )}
            </g>
          )
        })}

        {/* TE marker */}
        <line x1={tx(t_echo)} y1={ROW_Y[0] + 2} x2={tx(t_echo)} y2={MID(3)}
          stroke="#38bdf8" strokeWidth="0.5" strokeDasharray="1.5,2" opacity="0.4" />

        {/* TI marker for IR */}
        {isIR && (
          <>
            <line x1={tx(t_exc)} y1={ROW_Y[0] - 2} x2={tx(t_exc)} y2={ROW_Y[0] + 20}
              stroke="#f87171" strokeWidth="0.5" strokeDasharray="1.5,2" opacity="0.5" />
            <text x={(tx(0) + tx(t_exc)) / 2} y={ROW_Y[0] - 1} textAnchor="middle" fontSize="5.5" fill="#7f1d1d">
              TI={params.TI}ms
            </text>
          </>
        )}
      </svg>
    </div>
  )
}
