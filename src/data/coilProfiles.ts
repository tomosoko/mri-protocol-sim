export interface CoilProfile {
  id: string
  label: string
  sensitivityMap: number[][]  // 32x32 normalized sensitivity map (0.0-1.0)
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

/** Generate a 32x32 sensitivity map using a radial falloff function */
function makeSensitivityMap(fn: (nx: number, ny: number) => number): number[][] {
  const map: number[][] = []
  for (let row = 0; row < 32; row++) {
    const rowArr: number[] = []
    for (let col = 0; col < 32; col++) {
      const nx = (col - 15.5) / 15.5  // -1.0 to +1.0
      const ny = (row - 15.5) / 15.5
      const val = Math.max(0, Math.min(1, fn(nx, ny)))
      rowArr.push(val)
    }
    map.push(rowArr)
  }
  return map
}

// Head_20ch: high sensitivity at center, falls off toward periphery
const head20chMap = makeSensitivityMap((nx, ny) => {
  const r = Math.sqrt(nx * nx + ny * ny)
  return 1.0 - 0.5 * r - 0.3 * r * r
})

// Body_18ch: high sensitivity anterior and posterior, lower at center
const body18chMap = makeSensitivityMap((nx, ny) => {
  const absFront = Math.abs(ny + 0.5)  // front surface
  const absBack = Math.abs(ny - 0.5)   // back surface
  const peripheralBoost = Math.min(absFront, absBack) < 0.3 ? 0.3 : 0.0
  const centerDip = 1.0 - 0.3 * Math.exp(-ny * ny * 2)
  return 0.6 + peripheralBoost + 0.1 * centerDip - 0.2 * Math.abs(nx)
})

// Spine_32ch: high sensitivity posterior (top in sagittal map), falls off anteriorly
const spine32chMap = makeSensitivityMap((nx, ny) => {
  // ny=-1 is top (posterior in sagittal view)
  const posteriorFactor = (1 - ny) / 2  // 1.0 at top, 0.0 at bottom
  return 0.4 + 0.6 * posteriorFactor - 0.15 * Math.abs(nx)
})

// Knee_15ch: relatively uniform (small FOV dedicated coil)
const knee15chMap = makeSensitivityMap((nx, ny) => {
  const r = Math.sqrt(nx * nx + ny * ny)
  return 0.85 + 0.15 * (1 - r)
})

export const coilProfiles: CoilProfile[] = [
  {
    id: 'Head_20ch',
    label: 'Head 20ch',
    sensitivityMap: head20chMap,
    channels: 20,
    description: '頭部専用20チャンネルコイル。中心部で高感度、周辺に向けて感度低下。',
  },
  {
    id: 'Body_18ch',
    label: 'Body 18ch',
    sensitivityMap: body18chMap,
    channels: 18,
    description: '体幹部18チャンネルコイル。前後方向から高感度、中心部はやや低め。',
  },
  {
    id: 'Spine_32ch',
    label: 'Spine 32ch',
    sensitivityMap: spine32chMap,
    channels: 32,
    description: '脊椎専用32チャンネルコイル。後方から前方に向けて感度低下。',
  },
  {
    id: 'Knee_15ch',
    label: 'Knee 15ch',
    sensitivityMap: knee15chMap,
    channels: 15,
    description: '膝関節専用15チャンネルコイル。小FOV向けで全体的に均一な感度分布。',
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
