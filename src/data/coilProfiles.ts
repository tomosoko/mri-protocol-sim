export interface CoilProfile {
  id: string
  label: string
  sensitivityMap: number[][]  // 64x64 normalized sensitivity map (0.0-1.0)
  channels: number
  description: string
}

export type BodyCrossSection = 'head_axial' | 'abdomen_axial' | 'knee_axial' | 'spine_sagittal'

export interface CrossSectionConfig {
  id: BodyCrossSection
  label: string
  defaultCoilId: string
  outline: { cx: number; cy: number; rx: number; ry: number }
  tissues: { cx: number; cy: number; rx: number; ry: number; intensity: number; label: string }[]
}

const MAP_SIZE = 64

/** Generate a 64x64 sensitivity map using a given function */
function makeSensitivityMap(fn: (nx: number, ny: number) => number): number[][] {
  const map: number[][] = []
  for (let row = 0; row < MAP_SIZE; row++) {
    const rowArr: number[] = []
    for (let col = 0; col < MAP_SIZE; col++) {
      const nx = (col - (MAP_SIZE - 1) / 2) / ((MAP_SIZE - 1) / 2)  // -1.0 to +1.0
      const ny = (row - (MAP_SIZE - 1) / 2) / ((MAP_SIZE - 1) / 2)
      const val = Math.max(0, Math.min(1, fn(nx, ny)))
      rowArr.push(val)
    }
    map.push(rowArr)
  }
  return map
}

// Head_20ch: 16-channel phased array arranged in a circle
// Each channel sensitivity = 1/(1 + dist^2), combined as RSS, normalized
const head20chMap = (() => {
  // Place 16 channels in a circle of radius 1.1 (outside the head)
  const NUM_CH = 16
  const RING_R = 1.1
  const channels: [number, number][] = []
  for (let i = 0; i < NUM_CH; i++) {
    const angle = (2 * Math.PI * i) / NUM_CH
    channels.push([Math.cos(angle) * RING_R, Math.sin(angle) * RING_R])
  }

  const raw = makeSensitivityMap((nx, ny) => {
    // RSS combination of channel sensitivities
    let rss = 0
    for (const [cx, cy] of channels) {
      const dist2 = (nx - cx) ** 2 + (ny - cy) ** 2
      const s = 1 / (1 + dist2 * 6)
      rss += s * s
    }
    return Math.sqrt(rss)
  })

  // Normalize so the max = 1.0
  let maxVal = 0
  for (const row of raw) for (const v of row) if (v > maxVal) maxVal = v
  return raw.map(row => row.map(v => maxVal > 0 ? v / maxVal : v))
})()

// Body_18ch: anterior + posterior arrays
// Anterior channels: row at y = -1.0 (top of normalized space)
// Posterior channels: row at y = +1.0 (bottom)
// Left-right falloff for lateral elements
const body18chMap = (() => {
  // 9 anterior channels at y=-1.1 spread across x, 9 posterior at y=+1.1
  const ANTERIOR_Y = -1.1
  const POSTERIOR_Y = 1.1
  const N_SIDE = 9
  const anChannels: [number, number][] = []
  const poChannels: [number, number][] = []
  for (let i = 0; i < N_SIDE; i++) {
    const x = -1.0 + (2.0 * i) / (N_SIDE - 1)
    anChannels.push([x, ANTERIOR_Y])
    poChannels.push([x, POSTERIOR_Y])
  }

  const raw = makeSensitivityMap((nx, ny) => {
    let rss = 0
    for (const [cx, cy] of [...anChannels, ...poChannels]) {
      const dist2 = (nx - cx) ** 2 + (ny - cy) ** 2
      const s = 1 / (1 + dist2 * 3)
      rss += s * s
    }
    return Math.sqrt(rss)
  })

  let maxVal = 0
  for (const row of raw) for (const v of row) if (v > maxVal) maxVal = v
  return raw.map(row => row.map(v => maxVal > 0 ? v / maxVal : v))
})()

// Spine_32ch: posterior-only array
// Strong sensitivity at posterior (ny > 0.4 in 0-1 space = ny > -0.2 in -1 to 1)
// Falls off anteriorly
const spine32chMap = (() => {
  // 32 channels arranged in a grid at posterior wall
  const N_COL = 8
  const N_ROW = 4
  const POSTERIOR_Y = 1.15
  const channels: [number, number][] = []
  for (let r = 0; r < N_ROW; r++) {
    for (let c = 0; c < N_COL; c++) {
      const x = -0.7 + (1.4 * c) / (N_COL - 1)
      const y = POSTERIOR_Y - 0.1 * r
      channels.push([x, y])
    }
  }

  const raw = makeSensitivityMap((nx, ny) => {
    let rss = 0
    for (const [cx, cy] of channels) {
      const dist2 = (nx - cx) ** 2 + (ny - cy) ** 2
      const s = 1 / (1 + dist2 * 5)
      rss += s * s
    }
    return Math.sqrt(rss)
  })

  let maxVal = 0
  for (const row of raw) for (const v of row) if (v > maxVal) maxVal = v
  return raw.map(row => row.map(v => maxVal > 0 ? v / maxVal : v))
})()

// Knee_15ch: dedicated wrap-around coil, relatively uniform small FOV
const knee15chMap = (() => {
  // 15 channels uniformly distributed around a small ring
  const NUM_CH = 15
  const RING_R = 1.05
  const channels: [number, number][] = []
  for (let i = 0; i < NUM_CH; i++) {
    const angle = (2 * Math.PI * i) / NUM_CH
    channels.push([Math.cos(angle) * RING_R, Math.sin(angle) * RING_R])
  }

  const raw = makeSensitivityMap((nx, ny) => {
    let rss = 0
    for (const [cx, cy] of channels) {
      const dist2 = (nx - cx) ** 2 + (ny - cy) ** 2
      const s = 1 / (1 + dist2 * 8)
      rss += s * s
    }
    return Math.sqrt(rss)
  })

  let maxVal = 0
  for (const row of raw) for (const v of row) if (v > maxVal) maxVal = v
  return raw.map(row => row.map(v => maxVal > 0 ? v / maxVal : v))
})()

export const coilProfiles: CoilProfile[] = [
  {
    id: 'Head_20ch',
    label: 'Head 20ch',
    sensitivityMap: head20chMap,
    channels: 20,
    description: '頭部専用20chフェーズドアレイ。外周高感度・中央やや低め（実臨床特性）',
  },
  {
    id: 'Body_18ch',
    label: 'Body 18ch',
    sensitivityMap: body18chMap,
    channels: 18,
    description: '体幹部18ch。前後アレイ合成。前後方向高感度・左右端で低下',
  },
  {
    id: 'Spine_32ch',
    label: 'Spine 32ch',
    sensitivityMap: spine32chMap,
    channels: 32,
    description: '脊椎専用32ch。後方アレイのみ。前方は感度が非常に低い',
  },
  {
    id: 'Knee_15ch',
    label: 'Knee 15ch',
    sensitivityMap: knee15chMap,
    channels: 15,
    description: '膝関節専用15ch。ラップアラウンドコイルで全体均一',
  },
]

export const crossSections: CrossSectionConfig[] = [
  {
    id: 'head_axial',
    label: '頭部',
    defaultCoilId: 'Head_20ch',
    outline: { cx: 0.5, cy: 0.5, rx: 0.38, ry: 0.45 },
    tissues: [
      { cx: 0.5, cy: 0.5, rx: 0.30, ry: 0.37, intensity: 0.7, label: '脳実質' },
      { cx: 0.5, cy: 0.46, rx: 0.10, ry: 0.08, intensity: 0.9, label: '脳室' },
      { cx: 0.38, cy: 0.52, rx: 0.07, ry: 0.07, intensity: 0.6, label: '基底核L' },
      { cx: 0.62, cy: 0.52, rx: 0.07, ry: 0.07, intensity: 0.6, label: '基底核R' },
    ],
  },
  {
    id: 'abdomen_axial',
    label: '腹部',
    defaultCoilId: 'Body_18ch',
    outline: { cx: 0.5, cy: 0.5, rx: 0.44, ry: 0.38 },
    tissues: [
      { cx: 0.36, cy: 0.44, rx: 0.14, ry: 0.12, intensity: 0.6, label: '肝' },
      { cx: 0.58, cy: 0.50, rx: 0.07, ry: 0.07, intensity: 0.5, label: '脾' },
      { cx: 0.50, cy: 0.48, rx: 0.05, ry: 0.06, intensity: 0.4, label: '膵' },
      { cx: 0.36, cy: 0.60, rx: 0.06, ry: 0.06, intensity: 0.5, label: '腎L' },
      { cx: 0.64, cy: 0.60, rx: 0.06, ry: 0.06, intensity: 0.5, label: '腎R' },
      { cx: 0.50, cy: 0.53, rx: 0.04, ry: 0.05, intensity: 0.8, label: '大動脈' },
    ],
  },
  {
    id: 'knee_axial',
    label: '膝',
    defaultCoilId: 'Knee_15ch',
    outline: { cx: 0.5, cy: 0.5, rx: 0.36, ry: 0.36 },
    tissues: [
      { cx: 0.5, cy: 0.5, rx: 0.20, ry: 0.20, intensity: 0.5, label: '骨髄' },
      { cx: 0.5, cy: 0.5, rx: 0.26, ry: 0.26, intensity: 0.3, label: '皮質骨' },
      { cx: 0.5, cy: 0.36, rx: 0.08, ry: 0.05, intensity: 0.7, label: '膝蓋腱' },
      { cx: 0.5, cy: 0.63, rx: 0.06, ry: 0.04, intensity: 0.6, label: '後十字靱帯' },
    ],
  },
  {
    id: 'spine_sagittal',
    label: '脊椎',
    defaultCoilId: 'Spine_32ch',
    outline: { cx: 0.5, cy: 0.5, rx: 0.22, ry: 0.45 },
    tissues: [
      { cx: 0.5, cy: 0.30, rx: 0.10, ry: 0.06, intensity: 0.8, label: 'L1椎体' },
      { cx: 0.5, cy: 0.42, rx: 0.10, ry: 0.06, intensity: 0.8, label: 'L2椎体' },
      { cx: 0.5, cy: 0.54, rx: 0.10, ry: 0.06, intensity: 0.8, label: 'L3椎体' },
      { cx: 0.5, cy: 0.66, rx: 0.10, ry: 0.06, intensity: 0.8, label: 'L4椎体' },
      { cx: 0.5, cy: 0.36, rx: 0.06, ry: 0.02, intensity: 0.6, label: '椎間板' },
      { cx: 0.5, cy: 0.48, rx: 0.06, ry: 0.02, intensity: 0.6, label: '椎間板' },
      { cx: 0.5, cy: 0.60, rx: 0.06, ry: 0.02, intensity: 0.6, label: '椎間板' },
    ],
  },
]

/** Map from params.coil string to CoilProfile.id */
const coilAliasMap: Record<string, string> = {
  Body: 'Body_18ch',
  Head_20ch: 'Head_20ch',
  Body_18ch: 'Body_18ch',
  Spine_32ch: 'Spine_32ch',
  Knee_15ch: 'Knee_15ch',
}

export function getCoilProfile(coilName: string): CoilProfile {
  const id = coilAliasMap[coilName] ?? 'Body_18ch'
  return coilProfiles.find(c => c.id === id) ?? coilProfiles[1]
}

export function getCoilForSection(sectionId: BodyCrossSection): CoilProfile {
  const section = crossSections.find(s => s.id === sectionId)
  const id = section?.defaultCoilId ?? 'Body_18ch'
  return coilProfiles.find(c => c.id === id) ?? coilProfiles[1]
}
