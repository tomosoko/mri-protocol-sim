export interface ProtocolParams {
  // Routine
  TR: number
  TE: number
  TI: number
  flipAngle: number
  slices: number
  sliceThickness: number
  sliceGap: number
  averages: number
  phaseOversampling: number
  sarAssistant: 'Off' | 'Normal' | 'Advanced'
  allowedDelay: number
  // Contrast
  fatSat: 'None' | 'CHESS' | 'SPAIR' | 'STIR' | 'Dixon'
  mt: boolean
  // Resolution
  matrixFreq: number
  matrixPhase: number
  fov: number
  phaseResolution: number
  bandwidth: number
  interpolation: boolean
  // Geometry
  orientation: 'Tra' | 'Cor' | 'Sag'
  phaseEncDir: 'A>>P' | 'P>>A' | 'R>>L' | 'L>>R' | 'H>>F' | 'F>>H'
  satBands: boolean
  // System
  coil: string
  ipatMode: 'Off' | 'GRAPPA' | 'CAIPIRINHA'
  ipatFactor: number
  gradientMode: 'Fast' | 'Normal' | 'Whisper'
  shim: 'Auto' | 'Manual'
  // Physio
  ecgTrigger: boolean
  respTrigger: 'Off' | 'RT' | 'PACE' | 'BH'
  triggerDelay: number
  triggerWindow: number
  // Inline
  inlineADC: boolean
  inlineMIP: boolean
  inlineMPR: boolean
  inlineSubtraction: boolean
  // Sequence
  turboFactor: number
  echoSpacing: number
  partialFourier: '4/8' | '5/8' | '6/8' | '7/8' | 'Off'
  bValues: number[]
  fieldStrength: 1.5 | 3.0
}

export interface Preset {
  id: string
  label: string
  description: string
  category: string
  params: ProtocolParams
}

const base: ProtocolParams = {
  TR: 5000, TE: 100, TI: 0, flipAngle: 90, slices: 20, sliceThickness: 5, sliceGap: 20,
  averages: 1, phaseOversampling: 0, sarAssistant: 'Normal', allowedDelay: 30,
  fatSat: 'None', mt: false,
  matrixFreq: 256, matrixPhase: 256, fov: 300, phaseResolution: 100, bandwidth: 200, interpolation: false,
  orientation: 'Tra', phaseEncDir: 'A>>P', satBands: false,
  coil: 'Body', ipatMode: 'Off', ipatFactor: 2, gradientMode: 'Normal', shim: 'Auto',
  ecgTrigger: false, respTrigger: 'Off', triggerDelay: 0, triggerWindow: 5,
  inlineADC: false, inlineMIP: false, inlineMPR: false, inlineSubtraction: false,
  turboFactor: 15, echoSpacing: 4.5, partialFourier: 'Off', bValues: [0, 1000],
  fieldStrength: 1.5,
}

export const presets: Preset[] = [
  {
    id: 'brain_t2',
    label: '頭部 T2 TSE',
    description: '標準的な頭部T2強調。脳実質・浮腫・腫瘍の基本評価。',
    category: '頭部',
    params: { ...base, TR: 5000, TE: 100, flipAngle: 90, slices: 24, sliceThickness: 5, sliceGap: 10,
      fatSat: 'None', matrixFreq: 256, matrixPhase: 256, fov: 230, bandwidth: 200,
      orientation: 'Tra', phaseEncDir: 'A>>P', turboFactor: 15, echoSpacing: 4.5, fieldStrength: 1.5 },
  },
  {
    id: 'brain_flair',
    label: '頭部 FLAIR',
    description: 'T2+水抑制。白質病変・MS・脳梗塞亜急性期に必須。',
    category: '頭部',
    params: { ...base, TR: 9000, TE: 120, TI: 2200, flipAngle: 150, slices: 24, sliceThickness: 5,
      fatSat: 'None', fov: 230, bandwidth: 200, orientation: 'Tra', phaseEncDir: 'A>>P',
      turboFactor: 20, echoSpacing: 4.8, partialFourier: '6/8', fieldStrength: 1.5 },
  },
  {
    id: 'brain_dwi',
    label: '頭部 DWI',
    description: '急性脳梗塞の第一選択。発症2時間以内から検出可能。',
    category: '頭部',
    params: { ...base, TR: 5500, TE: 90, flipAngle: 90, slices: 24, sliceThickness: 5,
      matrixFreq: 128, matrixPhase: 128, fov: 230, bandwidth: 1500,
      orientation: 'Tra', phaseEncDir: 'A>>P', ipatMode: 'GRAPPA', ipatFactor: 2,
      inlineADC: true, turboFactor: 1, bValues: [0, 1000], fieldStrength: 1.5 },
  },
  {
    id: 'abdomen_t2_bh',
    label: '腹部 T2 HASTE BH',
    description: '息止め（Breath Hold）腹部T2。肝・膵・腎の標準評価。',
    category: '腹部',
    params: { ...base, TR: 1200, TE: 90, flipAngle: 150, slices: 24, sliceThickness: 6, sliceGap: 10,
      averages: 1, fatSat: 'None', matrixFreq: 256, matrixPhase: 192, fov: 380, bandwidth: 400,
      orientation: 'Tra', phaseEncDir: 'A>>P', respTrigger: 'BH',
      sarAssistant: 'Normal', turboFactor: 180, echoSpacing: 4.2, partialFourier: '5/8', fieldStrength: 1.5 },
  },
  {
    id: 'abdomen_t2_rt',
    label: '腹部 T2 HASTE RT',
    description: '呼吸トリガー版（息止め不可患者向け）。撮像時間延長。',
    category: '腹部',
    params: { ...base, TR: 2500, TE: 90, flipAngle: 150, slices: 24, sliceThickness: 6,
      fatSat: 'None', matrixFreq: 256, matrixPhase: 192, fov: 380, bandwidth: 400,
      orientation: 'Tra', phaseEncDir: 'A>>P', respTrigger: 'RT',
      sarAssistant: 'Normal', turboFactor: 180, echoSpacing: 4.2, partialFourier: '5/8', fieldStrength: 1.5 },
  },
  {
    id: 'abdomen_dwi',
    label: '腹部 DWI PACE',
    description: '腹部拡散強調。PACE（ナビゲーター）で自由呼吸下に高精度収集。',
    category: '腹部',
    params: { ...base, TR: 4000, TE: 70, flipAngle: 90, slices: 20, sliceThickness: 5,
      fatSat: 'SPAIR', matrixFreq: 192, matrixPhase: 192, fov: 380, bandwidth: 1500,
      orientation: 'Tra', phaseEncDir: 'A>>P', respTrigger: 'PACE',
      ipatMode: 'GRAPPA', ipatFactor: 2, inlineADC: true,
      turboFactor: 1, bValues: [0, 50, 800], fieldStrength: 1.5 },
  },
  {
    id: 'mrcp',
    label: 'MRCP（厚スラブ）',
    description: '胆管・膵管を重T2で描出。胆石・IPMN・胆管狭窄の評価。',
    category: '腹部',
    params: { ...base, TR: 4000, TE: 700, TI: 0, flipAngle: 150, slices: 1, sliceThickness: 50,
      fatSat: 'None', matrixFreq: 256, matrixPhase: 256, fov: 380, bandwidth: 400,
      orientation: 'Cor', phaseEncDir: 'H>>F', respTrigger: 'BH',
      turboFactor: 180, echoSpacing: 4.5, partialFourier: '5/8', fieldStrength: 1.5 },
  },
  {
    id: 'liver_dynamic',
    label: '肝臓 ダイナミックMRI',
    description: 'Gd造影 動脈相/門脈相/平衡相。HCC・転移の血流評価。',
    category: '腹部',
    params: { ...base, TR: 3.5, TE: 1.7, flipAngle: 12, slices: 60, sliceThickness: 3, sliceGap: 0,
      fatSat: 'Dixon', matrixFreq: 256, matrixPhase: 180, fov: 380, bandwidth: 490,
      orientation: 'Tra', phaseEncDir: 'A>>P', respTrigger: 'BH',
      ipatMode: 'CAIPIRINHA', ipatFactor: 2, inlineMPR: true, interpolation: true,
      turboFactor: 1, fieldStrength: 1.5 },
  },
  {
    id: 'spine_t2',
    label: '脊椎 T2 矢状断',
    description: '腰椎T2矢状断。椎間板変性・脊柱管狭窄・髄内病変の基本評価。',
    category: '脊椎',
    params: { ...base, TR: 3500, TE: 120, flipAngle: 150, slices: 1, sliceThickness: 3, sliceGap: 10,
      fatSat: 'None', matrixFreq: 320, matrixPhase: 320, fov: 280, bandwidth: 200,
      orientation: 'Sag', phaseEncDir: 'H>>F', turboFactor: 25, echoSpacing: 4.2, fieldStrength: 1.5 },
  },
  {
    id: 'knee_pd',
    label: '膝関節 PD 脂肪抑制',
    description: '半月板・靱帯・軟骨の描出。PD+脂肪抑制が標準。',
    category: '関節',
    params: { ...base, TR: 3000, TE: 35, flipAngle: 150, slices: 24, sliceThickness: 3, sliceGap: 0,
      fatSat: 'SPAIR', matrixFreq: 384, matrixPhase: 307, fov: 160, bandwidth: 200,
      orientation: 'Sag', phaseEncDir: 'A>>P', turboFactor: 12, echoSpacing: 4.5, fieldStrength: 1.5 },
  },
  {
    id: 'cardiac_cine',
    label: '心臓 シネMRI',
    description: '心機能評価（EF/壁運動）。ECGトリガー+多位相収集。',
    category: '心臓',
    params: { ...base, TR: 50, TE: 1.6, flipAngle: 60, slices: 10, sliceThickness: 8,
      fatSat: 'None', matrixFreq: 192, matrixPhase: 154, fov: 360, bandwidth: 500,
      orientation: 'Sag', phaseEncDir: 'H>>F', ecgTrigger: true, respTrigger: 'BH',
      triggerDelay: 0, gradientMode: 'Fast', turboFactor: 1, fieldStrength: 1.5 },
  },
  {
    id: 'prostate_t2',
    label: '前立腺 T2 高分解能',
    description: '前立腺癌局在診断（PI-RADS）。高分解能T2が必須。',
    category: '骨盤',
    params: { ...base, TR: 4000, TE: 120, flipAngle: 150, slices: 24, sliceThickness: 3, sliceGap: 0,
      fatSat: 'None', matrixFreq: 320, matrixPhase: 256, fov: 200, bandwidth: 200,
      orientation: 'Tra', phaseEncDir: 'A>>P', turboFactor: 20, fieldStrength: 3.0,
      sarAssistant: 'Normal' },
  },
]

export type PresetCategory = string
export const categories = [...new Set(presets.map(p => p.category))]
