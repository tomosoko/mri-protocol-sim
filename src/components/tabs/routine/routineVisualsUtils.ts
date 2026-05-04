import { TISSUES, calcScanTime } from '../../../store/calculators'
import type { ProtocolParams } from '../../../data/presets'

// ── Ernst Angle Calculation ─────────────────────────────────────────────────
export interface ErnstAngleResult {
  label: string
  color: string
  ea: number
  T1: number
}

export function calcErnstAngles(
  TR: number,
  is3T: boolean,
  tissueLabels = ['WM', 'GM', 'Fat', 'Liver']
): ErnstAngleResult[] {
  return TISSUES
    .filter(t => tissueLabels.includes(t.label))
    .map(t => {
      const T1 = is3T ? t.T1_30 : t.T1_15
      const ea = Math.round((Math.acos(Math.exp(-TR / T1)) * 180) / Math.PI)
      return { label: t.label, color: t.color, ea, T1 }
    })
}

export function isGRESequence(turboFactor: number, TR: number): boolean {
  return turboFactor <= 2 && TR < 500
}

// ── T1/T2 Signal Curve Path Generation ──────────────────────────────────────
export function generateT1RecoveryPath(
  T1: number,
  nPts: number,
  maxTR: number,
  pad: { l: number; r: number; t: number; b: number },
  innerW: number,
  innerH: number
): string {
  const points = Array.from({ length: nPts }, (_, i) => {
    const t = Math.exp(i / (nPts - 1) * Math.log(maxTR + 1)) - 1
    const s = 1 - Math.exp(-t / T1)
    const x = pad.l + (Math.log(t + 1) / Math.log(maxTR + 1)) * innerW
    const y = pad.t + innerH - s * innerH
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  })
  return points.join(' ')
}

export function generateT2DecayPath(
  T2: number,
  nPts: number,
  maxTE: number,
  pad: { l: number; r: number; t: number; b: number },
  innerW: number,
  innerH: number
): string {
  const points = Array.from({ length: nPts }, (_, i) => {
    const t = i / (nPts - 1) * maxTE
    const s = Math.exp(-t / T2)
    const x = pad.l + (t / maxTE) * innerW
    const y = pad.t + innerH - s * innerH
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
  })
  return points.join(' ')
}

// ── Slice Order ─────────────────────────────────────────────────────────────
export function calcDummyScans(TR: number, is3T: boolean): number {
  const t1WM = is3T ? 1000 : 800
  return Math.min(15, Math.max(2, Math.ceil(5 * t1WM / TR)))
}

export function getSliceOrdering(
  nSlices: number,
  turboFactor: number,
  bValues: number[]
): 'Interleaved' | 'Sequential' {
  const isEPI = bValues.length >= 2 && turboFactor <= 2
  return isEPI ? 'Interleaved' : nSlices > 8 ? 'Interleaved' : 'Sequential'
}

export function generateSliceOrder(
  nSlices: number,
  ordering: 'Interleaved' | 'Sequential',
  maxDisplay = 20
): number[] {
  const n = Math.min(nSlices, maxDisplay)
  const order: number[] = []
  if (ordering === 'Interleaved') {
    for (let i = 0; i < n; i += 2) order.push(i)
    for (let i = 1; i < n; i += 2) order.push(i)
  } else {
    for (let i = 0; i < n; i++) order.push(i)
  }
  return order
}

// ── Scan Time Breakdown ─────────────────────────────────────────────────────
export interface ScanTimeStage {
  label: string
  value: number
  savings: number
  color: string
}

export function parsePFfactor(pf: string): number {
  switch (pf) {
    case '7/8': return 0.875
    case '6/8': return 0.75
    case '5/8': return 0.625
    case '4/8': return 0.5
    default: return 1.0
  }
}

export function calcScanTimeStages(params: ProtocolParams): {
  stages: ScanTimeStage[]
  totalTime: number
} {
  const totalTime = calcScanTime(params)
  const ipatDiv = params.ipatMode !== 'Off' ? params.ipatFactor : 1
  const pfFactor = parsePFfactor(params.partialFourier)

  const basePhaseLines = Math.round(params.matrixPhase * (params.phaseResolution / 100))
  const baseTime = Math.round((params.TR * basePhaseLines * params.averages) / params.turboFactor / 1000)
  const timeWithPF = Math.round(baseTime * pfFactor)
  const timeWithIPAT = Math.round(timeWithPF / ipatDiv)
  const timeWithResp = params.respTrigger === 'RT' || params.respTrigger === 'PACE'
    ? Math.round(timeWithIPAT * 1.4) : timeWithIPAT

  return {
    stages: [
      { label: 'Base (ETL×TR×Avg)', value: baseTime, savings: 0, color: '#4b5563' },
      { label: `PF (${params.partialFourier})`, value: timeWithPF, savings: baseTime - timeWithPF, color: '#60a5fa' },
      { label: `iPAT (${params.ipatMode === 'Off' ? 'Off' : `×${params.ipatFactor}`})`, value: timeWithIPAT, savings: timeWithPF - timeWithIPAT, color: '#34d399' },
      { label: `Resp (${params.respTrigger})`, value: timeWithResp, savings: timeWithIPAT - timeWithResp, color: params.respTrigger !== 'Off' ? '#f87171' : '#374151' },
    ],
    totalTime,
  }
}

export function formatTime(s: number): string {
  if (s < 60) return `${s}s`
  const min = Math.floor(s / 60)
  const sec = s % 60
  return sec > 0 ? `${min}m${String(sec).padStart(2, '0')}s` : `${min}m`
}

// ── Steady State Convergence ────────────────────────────────────────────────
export interface SteadyStateResult {
  mzHistory: number[]
  mzSS: number
  ssSignal: number
  trToSS: number
  reachedSS: boolean
  t1WM: number
}

export function calcSteadyState(
  flipAngleDeg: number,
  TR: number,
  is3T: boolean,
  N = 12
): SteadyStateResult {
  const fa = flipAngleDeg * Math.PI / 180
  const t1WM = is3T ? 1000 : 800

  const mzHistory: number[] = [1.0]
  for (let i = 0; i < N; i++) {
    const mzPrev = mzHistory[mzHistory.length - 1]
    const mzAfterRF = mzPrev * Math.cos(fa)
    const mzAfterTR = mzAfterRF * Math.exp(-TR / t1WM) + (1 - Math.exp(-TR / t1WM))
    mzHistory.push(mzAfterTR)
  }

  const mzSS = (1 - Math.exp(-TR / t1WM)) / (1 - Math.cos(fa) * Math.exp(-TR / t1WM))
  const trToSS = mzHistory.findIndex(mz => Math.abs(mz - mzSS) < 0.05 * Math.abs(1 - mzSS))
  const reachedSS = trToSS >= 0 && trToSS <= N

  const ssSignal = Math.abs(Math.sin(fa)) * mzSS

  return { mzHistory, mzSS, ssSignal, trToSS, reachedSS, t1WM }
}

// ── Brain Phantom Signal Computation ────────────────────────────────────────
export interface PhantomSignals {
  CSF: number
  GM: number
  WM: number
  Fat: number
  Muscle: number
}

export function calcPhantomSignals(params: {
  TR: number
  TE: number
  TI: number
  flipAngle: number
  fatSat: string
  fieldStrength: number
  turboFactor: number
}): PhantomSignals {
  const is3T = params.fieldStrength >= 2.5
  const isIR = params.TI > 0
  const isGRE = params.turboFactor <= 2 && params.flipAngle < 60 && params.TR < 200

  const getT1T2 = (t: typeof TISSUES[0]) => is3T
    ? { T1: t.T1_30, T2: t.T2_30, T2s: t.T2star_30 }
    : { T1: t.T1_15, T2: t.T2_15, T2s: t.T2star_15 }

  const seSignal = (T1: number, T2: number) =>
    Math.max(0, (1 - Math.exp(-params.TR / T1)) * Math.exp(-params.TE / T2))

  const irSignal = (T1: number, T2: number) =>
    Math.max(0, Math.abs(1 - 2 * Math.exp(-params.TI / T1) + Math.exp(-params.TR / T1)) * Math.exp(-params.TE / T2))

  const faRad = (params.flipAngle * Math.PI) / 180
  const greSignal = (T1: number, T2s: number) => {
    const e1 = Math.exp(-params.TR / T1)
    const ernst = Math.sin(faRad) * (1 - e1) / (1 - Math.cos(faRad) * e1 + 1e-10)
    return Math.max(0, ernst * Math.exp(-params.TE / T2s))
  }

  const compute = (label: string): number => {
    const t = TISSUES.find(x => x.label === label)
    if (!t) return 0
    const { T1, T2, T2s } = getT1T2(t)
    let s = isIR ? irSignal(T1, T2) : isGRE ? greSignal(T1, T2s) : seSignal(T1, T2)
    if (params.fatSat !== 'None' && label === 'Fat') s = 0
    return s
  }

  const raw: PhantomSignals = {
    CSF: compute('CSF'),
    GM: compute('GM'),
    WM: compute('WM'),
    Fat: compute('Fat'),
    Muscle: compute('Muscle'),
  }
  const maxS = Math.max(...Object.values(raw), 0.001)
  return {
    CSF: raw.CSF / maxS,
    GM: raw.GM / maxS,
    WM: raw.WM / maxS,
    Fat: raw.Fat / maxS,
    Muscle: raw.Muscle / maxS,
  }
}

// ── Contrast Heatmap Grid ───────────────────────────────────────────────────
export function calcContrastGrid(
  is3T: boolean,
  cols = 16,
  rows = 12,
  trRange: [number, number] = [200, 6000],
  teRange: [number, number] = [5, 200]
): { grid: number[][]; trVals: number[]; teVals: number[]; maxContrast: number } {
  const GM = TISSUES.find(t => t.label === 'GM')!
  const WM = TISSUES.find(t => t.label === 'WM')!
  const gmT1 = is3T ? GM.T1_30 : GM.T1_15
  const wmT1 = is3T ? WM.T1_30 : WM.T1_15
  const gmT2 = is3T ? GM.T2_30 : GM.T2_15
  const wmT2 = is3T ? WM.T2_30 : WM.T2_15

  const trVals = Array.from({ length: cols }, (_, i) =>
    Math.round(trRange[0] + (trRange[1] - trRange[0]) * (i / (cols - 1)))
  )
  const teVals = Array.from({ length: rows }, (_, i) =>
    Math.round(teRange[0] + (teRange[1] - teRange[0]) * (i / (rows - 1)))
  )

  const grid = teVals.map(te =>
    trVals.map(tr => {
      const sgm = (1 - Math.exp(-tr / gmT1)) * Math.exp(-te / gmT2)
      const swm = (1 - Math.exp(-tr / wmT1)) * Math.exp(-te / wmT2)
      return Math.abs(sgm - swm)
    })
  )

  const maxContrast = Math.max(...grid.flat())
  return { grid, trVals, teVals, maxContrast }
}
