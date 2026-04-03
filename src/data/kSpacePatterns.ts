export type SequenceType = 'TSE' | 'HASTE' | 'EPI' | 'GRE' | 'BLADE'

export interface KSpaceLine {
  ky: number        // 位相エンコードライン番号（-matrixPhase/2 〜 +matrixPhase/2）
  trIndex: number   // 何番目のTR/ショットか（0始まり）
  echoIndex: number // TR内の何番目のエコーか（0始まり）
  isACS: boolean    // iPATのACS（calibration）ライン
  isSkipped: boolean // iPATでスキップされたライン
}

export interface KSpacePattern {
  sequenceType: SequenceType
  label: string
  description: string
  generate: (params: {
    matrixPhase: number
    turboFactor: number
    partialFourier: string
    ipatMode: string
    ipatFactor: number
  }) => KSpaceLine[]
}

// PartialFourier比率を返す（省略する上側の割合）
function pfRatio(partialFourier: string): number {
  switch (partialFourier) {
    case '4/8': return 0.50
    case '5/8': return 0.375
    case '6/8': return 0.25
    case '7/8': return 0.125
    default:    return 0.0
  }
}

// centricソート: 中心から外側へ向かう順にkyインデックスを並べる
function centricOrder(lines: number[]): number[] {
  const sorted = [...lines].sort((a, b) => Math.abs(a) - Math.abs(b))
  return sorted
}

// TSEパターン: centric充填、PartialFourier・iPAT対応
function generateTSE(params: {
  matrixPhase: number
  turboFactor: number
  partialFourier: string
  ipatMode: string
  ipatFactor: number
}): KSpaceLine[] {
  const { matrixPhase, partialFourier, ipatMode, ipatFactor } = params
  const turboFactor = Math.max(1, params.turboFactor)
  const half = Math.floor(matrixPhase / 2)
  const skipFraction = pfRatio(partialFourier)
  const skipLines = Math.round(half * skipFraction * 2) // 上側をスキップ

  // 全kyラインを生成（-half+1 〜 +half）
  const allKy: number[] = []
  for (let i = -half + 1; i <= half; i++) {
    allKy.push(i)
  }

  // PartialFourier: 正のky（上半分）の一部を除外
  const acquiredKy = allKy.filter(ky => ky < half - skipLines + 1)

  // iPAT: ACSライン（中央24本は全取得）、その他はipatFactorごとに取得
  const ACS_LINES = 24
  const result: KSpaceLine[] = []

  // centricソート
  const orderedKy = centricOrder(acquiredKy)

  let trIndex = 0
  let echoIndex = 0

  for (let i = 0; i < orderedKy.length; i++) {
    const ky = orderedKy[i]
    const isACS = ipatMode !== 'Off' && Math.abs(ky) <= ACS_LINES / 2
    const isSkipped = ipatMode !== 'Off' && !isACS && Math.abs(ky) % ipatFactor !== 0

    result.push({ ky, trIndex, echoIndex, isACS, isSkipped })

    echoIndex++
    if (echoIndex >= turboFactor) {
      echoIndex = 0
      trIndex++
    }
  }

  return result
}

// HASTEパターン: single-shot、PartialFourier必須
function generateHASTE(params: {
  matrixPhase: number
  turboFactor: number
  partialFourier: string
  ipatMode: string
  ipatFactor: number
}): KSpaceLine[] {
  const { matrixPhase, partialFourier } = params
  const half = Math.floor(matrixPhase / 2)

  // PF比率（デフォルト5/8相当）
  const pf = partialFourier === 'Off' ? '5/8' : partialFourier
  const skipFraction = pfRatio(pf)
  const skipLines = Math.round(half * skipFraction * 2)

  const result: KSpaceLine[] = []
  let echoIndex = 0

  // linear順: -half〜+half、上側skipLinesを省略
  for (let ky = -half + 1; ky <= half; ky++) {
    if (ky > half - skipLines) {
      // PartialFourier省略ゾーン（スキップとしてマーク）
      result.push({ ky, trIndex: 0, echoIndex, isACS: false, isSkipped: true })
    } else {
      result.push({ ky, trIndex: 0, echoIndex, isACS: false, isSkipped: false })
    }
    echoIndex++
  }

  return result
}

// EPIパターン: zigzag充填（EPI train）
function generateEPI(params: {
  matrixPhase: number
  turboFactor: number
  partialFourier: string
  ipatMode: string
  ipatFactor: number
}): KSpaceLine[] {
  const { matrixPhase, ipatMode, ipatFactor } = params
  const half = Math.floor(matrixPhase / 2)
  const ACS_LINES = 16

  const result: KSpaceLine[] = []
  // EPIは通常linear順（-half〜+half）でzigzag
  const trIndex = 0

  for (let ky = -half + 1; ky <= half; ky++) {
    // zigzag: kyインデックス（0始まり）が奇数のラインは右→左（視覚的に区別のみ）
    const kyIndex = ky + half - 1
    const echoIndex = kyIndex

    const isACS = ipatMode !== 'Off' && Math.abs(ky) <= ACS_LINES / 2
    const isSkipped = ipatMode !== 'Off' && !isACS && Math.abs(ky) % ipatFactor !== 0

    result.push({ ky, trIndex, echoIndex, isACS, isSkipped })
  }

  return result
}

// GRE (VIBE)パターン: linear順、iPAT対応
function generateGRE(params: {
  matrixPhase: number
  turboFactor: number
  partialFourier: string
  ipatMode: string
  ipatFactor: number
}): KSpaceLine[] {
  const { matrixPhase, ipatMode, ipatFactor } = params
  const half = Math.floor(matrixPhase / 2)
  const ACS_LINES = 24

  const result: KSpaceLine[] = []

  // linear: -half〜+half
  for (let ky = -half + 1; ky <= half; ky++) {
    const isACS = ipatMode !== 'Off' && Math.abs(ky) <= ACS_LINES / 2
    const isSkipped = ipatMode !== 'Off' && !isACS && Math.abs(ky) % ipatFactor !== 0

    result.push({ ky, trIndex: ky + half - 1, echoIndex: 0, isACS, isSkipped })
  }

  return result
}

// BLADEパターン: 複数回転ブレード（4ブレード簡略）
function generateBLADE(params: {
  matrixPhase: number
  turboFactor: number
  partialFourier: string
  ipatMode: string
  ipatFactor: number
}): KSpaceLine[] {
  const { matrixPhase } = params
  const half = Math.floor(matrixPhase / 2)
  const NUM_BLADES = 4
  const linesPerBlade = Math.max(4, Math.floor(matrixPhase / NUM_BLADES))

  const result: KSpaceLine[] = []

  for (let blade = 0; blade < NUM_BLADES; blade++) {
    // 各ブレードの中心ky（回転を模倣するためオフセット）
    const offset = Math.round((blade / NUM_BLADES) * half)

    for (let i = 0; i < linesPerBlade; i++) {
      const ky = -Math.floor(linesPerBlade / 2) + i + offset
      // 範囲内にクランプ
      const clampedKy = Math.max(-half + 1, Math.min(half, ky))

      result.push({
        ky: clampedKy,
        trIndex: blade,
        echoIndex: i,
        isACS: false,
        isSkipped: false,
      })
    }
  }

  return result
}

export const kSpacePatterns: KSpacePattern[] = [
  {
    sequenceType: 'TSE',
    label: 'TSE',
    description: 'Turbo Spin Echo。Centric充填でTE効率化。PartialFourier/iPAT対応。',
    generate: generateTSE,
  },
  {
    sequenceType: 'HASTE',
    label: 'HASTE',
    description: 'Half-Fourier Single-Shot TSE。全kyを1TRで収集。PartialFourier必須。',
    generate: generateHASTE,
  },
  {
    sequenceType: 'EPI',
    label: 'EPI',
    description: 'Echo Planar Imaging。Zigzag充填。DWIに使用。',
    generate: generateEPI,
  },
  {
    sequenceType: 'GRE',
    label: 'GRE',
    description: 'Gradient Echo（VIBE）。Linear充填。iPAT対応の高速3D収集。',
    generate: generateGRE,
  },
  {
    sequenceType: 'BLADE',
    label: 'BLADE',
    description: '放射状k空間充填。モーションアーチファクトに強い。肩関節等に使用。',
    generate: generateBLADE,
  },
]
