import { useState } from 'react'
import { useProtocolStore } from '../../../store/protocolStore'
import type { ProtocolParams } from '../../../data/presets'

type SeqPreset = {
  name: string
  full: string
  color: string
  category: 'T1' | 'T2' | 'GRE' | 'DWI' | 'Special'
  apply: (p: ProtocolParams, is3T: boolean) => Partial<ProtocolParams>
}

const SEQ_PRESETS: SeqPreset[] = [
  {
    name: 'TSE T2',
    full: 'Turbo Spin Echo T2w',
    color: '#60a5fa',
    category: 'T2',
    apply: (_p, _) => ({
      TR: 5000, TE: 100, TI: 0, flipAngle: 90,
      turboFactor: 15, echoSpacing: 4.5,
      sliceThickness: 5, matrixFreq: 256, matrixPhase: 256,
      bandwidth: 200, partialFourier: 'Off', fatSat: 'None',
      ipatMode: 'Off', bValues: [0],
    }),
  },
  {
    name: 'FLAIR',
    full: 'Fluid Attenuated IR TSE',
    color: '#a78bfa',
    category: 'T2',
    apply: (_p, is3T) => ({
      TR: 9000, TE: 90, TI: is3T ? 2500 : 2200, flipAngle: 90,
      turboFactor: 16, echoSpacing: 4.5,
      sliceThickness: 5, matrixFreq: 256, matrixPhase: 192,
      bandwidth: 200, partialFourier: '6/8', fatSat: 'None',
      ipatMode: 'GRAPPA', ipatFactor: 2, bValues: [0],
    }),
  },
  {
    name: 'MPRAGE',
    full: 'Magnetization Prepared Rapid GRE',
    color: '#fbbf24',
    category: 'T1',
    apply: (_p, is3T) => ({
      TR: is3T ? 2300 : 1900, TE: 3, TI: is3T ? 900 : 800, flipAngle: 9,
      turboFactor: 1, echoSpacing: 7.0,
      sliceThickness: 1, matrixFreq: 256, matrixPhase: 256,
      bandwidth: 200, partialFourier: '6/8', fatSat: 'None',
      ipatMode: 'GRAPPA', ipatFactor: 2, bValues: [0],
    }),
  },
  {
    name: 'SPACE',
    full: '3D Sampling Perfection with Application optimized Contrasts',
    color: '#34d399',
    category: 'T2',
    apply: (_p, _) => ({
      TR: 3200, TE: 500, TI: 0, flipAngle: 120,
      turboFactor: 120, echoSpacing: 3.8,
      sliceThickness: 1, matrixFreq: 256, matrixPhase: 256,
      bandwidth: 650, partialFourier: '6/8', fatSat: 'None',
      ipatMode: 'GRAPPA', ipatFactor: 2, bValues: [0],
    }),
  },
  {
    name: 'HASTE',
    full: 'Half-Fourier Acquisition Single-shot TSE',
    color: '#38bdf8',
    category: 'T2',
    apply: (_p, _) => ({
      TR: 1400, TE: 84, TI: 0, flipAngle: 90,
      turboFactor: 256, echoSpacing: 3.4,
      sliceThickness: 5, matrixFreq: 256, matrixPhase: 128,
      bandwidth: 600, partialFourier: '5/8', fatSat: 'None',
      ipatMode: 'Off', bValues: [0],
    }),
  },
  {
    name: 'trueFISP',
    full: 'True Fast Imaging with Steady-state Precession',
    color: '#f472b6',
    category: 'GRE',
    apply: (_p, _) => ({
      TR: 4, TE: 2, TI: 0, flipAngle: 60,
      turboFactor: 1, echoSpacing: 4,
      sliceThickness: 4, matrixFreq: 192, matrixPhase: 192,
      bandwidth: 1000, partialFourier: 'Off', fatSat: 'None',
      ipatMode: 'Off', bValues: [0],
    }),
  },
  {
    name: 'VIBE',
    full: 'Volumetric Interpolated Breath-hold Examination',
    color: '#fb923c',
    category: 'GRE',
    apply: (_p, _) => ({
      TR: 5, TE: 2, TI: 0, flipAngle: 15,
      turboFactor: 1, echoSpacing: 4,
      sliceThickness: 3, matrixFreq: 256, matrixPhase: 192,
      bandwidth: 490, partialFourier: '6/8', fatSat: 'SPAIR',
      ipatMode: 'GRAPPA', ipatFactor: 2, bValues: [0],
    }),
  },
  {
    name: 'DWI',
    full: 'Diffusion Weighted EPI',
    color: '#f87171',
    category: 'DWI',
    apply: (_p, is3T) => ({
      TR: 4000, TE: 85, TI: 0, flipAngle: 90,
      turboFactor: 1, echoSpacing: 0.77,
      sliceThickness: 5, matrixFreq: 128, matrixPhase: 128,
      bandwidth: 2000, partialFourier: '6/8', fatSat: 'CHESS',
      ipatMode: 'GRAPPA', ipatFactor: is3T ? 3 : 2, bValues: [0, 500, 1000],
    }),
  },
  {
    name: 'SWI',
    full: 'Susceptibility Weighted Imaging',
    color: '#818cf8',
    category: 'GRE',
    apply: (_p, is3T) => ({
      TR: 28, TE: is3T ? 20 : 40, TI: 0, flipAngle: 15,
      turboFactor: 1, echoSpacing: 4,
      sliceThickness: 2, matrixFreq: 448, matrixPhase: 448,
      bandwidth: 120, partialFourier: '7/8', fatSat: 'None',
      ipatMode: 'GRAPPA', ipatFactor: 2, bValues: [0],
    }),
  },
  {
    name: 'TOF',
    full: 'Time-of-Flight MRA',
    color: '#e879f9',
    category: 'GRE',
    apply: (_p, is3T) => ({
      TR: is3T ? 22 : 25, TE: 3, TI: 0, flipAngle: 18,
      turboFactor: 1, echoSpacing: 4,
      sliceThickness: 1.5, matrixFreq: 320, matrixPhase: 256,
      bandwidth: 160, partialFourier: 'Off', fatSat: 'None',
      mt: true, ipatMode: 'Off', bValues: [0],
    }),
  },
  {
    name: 'STIR',
    full: 'Short TI Inversion Recovery',
    color: '#4ade80',
    category: 'T2',
    apply: (_p, is3T) => ({
      TR: 5000, TE: 70, TI: is3T ? 220 : 150, flipAngle: 90,
      turboFactor: 16, echoSpacing: 4.5,
      sliceThickness: 4, matrixFreq: 256, matrixPhase: 192,
      bandwidth: 200, partialFourier: 'Off', fatSat: 'STIR',
      ipatMode: 'Off', bValues: [0],
    }),
  },
  {
    name: 'T1 TSE',
    full: 'T1-weighted Turbo Spin Echo',
    color: '#fbbf24',
    category: 'T1',
    apply: (_p, _) => ({
      TR: 500, TE: 15, TI: 0, flipAngle: 90,
      turboFactor: 3, echoSpacing: 4.0,
      sliceThickness: 5, matrixFreq: 256, matrixPhase: 192,
      bandwidth: 200, partialFourier: 'Off', fatSat: 'None',
      ipatMode: 'Off', bValues: [0],
    }),
  },
]

export function SequencePresetBar() {
  const { params, setParam } = useProtocolStore()
  const is3T = params.fieldStrength >= 2.5
  const [hoveredName, setHoveredName] = useState<string | null>(null)

  const detectActive = (p: SeqPreset): boolean => {
    const applied = p.apply(params, is3T)
    const keys = Object.keys(applied) as (keyof typeof applied)[]
    const trOk = Math.abs(params.TR - (applied.TR ?? params.TR)) < (applied.TR ?? 1) * 0.15
    const teOk = Math.abs(params.TE - (applied.TE ?? params.TE)) < 15
    const etlOk = Math.abs(params.turboFactor - (applied.turboFactor ?? params.turboFactor)) <= 2
    return trOk && teOk && etlOk && keys.length > 4
  }

  const hovered = hoveredName ? SEQ_PRESETS.find(p => p.name === hoveredName) : null

  return (
    <div style={{ background: '#060809', borderBottom: '1px solid #1a2030' }}>
      <div className="flex overflow-x-auto" style={{ scrollbarWidth: 'none', gap: 0 }}>
        {SEQ_PRESETS.map(p => {
          const active = detectActive(p)
          return (
            <button
              key={p.name}
              onMouseEnter={() => setHoveredName(p.name)}
              onMouseLeave={() => setHoveredName(null)}
              onClick={() => {
                const updates = p.apply(params, is3T)
                ;(Object.entries(updates) as [keyof typeof params, unknown][]).forEach(([k, v]) => {
                  setParam(k, v as never)
                })
              }}
              style={{
                background: active ? p.color + '18' : 'transparent',
                color: active ? p.color : '#5a5a5a',
                borderRight: '1px solid #111',
                borderBottom: active ? `2px solid ${p.color}` : '2px solid transparent',
                padding: '4px 8px',
                fontSize: '9px',
                fontFamily: 'monospace',
                fontWeight: active ? 700 : 400,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                flexShrink: 0,
                transition: 'all 0.12s',
              }}
            >
              {p.name}
            </button>
          )
        })}
      </div>
      {hovered && (
        <div className="px-3 py-0.5 flex items-center gap-2" style={{ borderTop: '1px solid #111' }}>
          <span className="font-mono font-bold" style={{ color: hovered.color, fontSize: '8px' }}>{hovered.name}</span>
          <span style={{ color: '#374151', fontSize: '8px' }}>—</span>
          <span style={{ color: '#4b5563', fontSize: '8px' }}>{hovered.full}</span>
        </div>
      )}
    </div>
  )
}
