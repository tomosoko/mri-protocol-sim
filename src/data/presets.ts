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
  coilType: 'Head_64' | 'Head_20' | 'Spine_32' | 'Body' | 'Knee' | 'Shoulder' | 'Flex'
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
  coil: 'Body', coilType: 'Body', ipatMode: 'Off', ipatFactor: 2, gradientMode: 'Normal', shim: 'Auto',
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
      orientation: 'Tra', phaseEncDir: 'A>>P', turboFactor: 15, echoSpacing: 4.5, fieldStrength: 1.5,
      coilType: 'Head_64' },
  },
  {
    id: 'brain_flair',
    label: '頭部 FLAIR',
    description: 'T2+水抑制。白質病変・MS・脳梗塞亜急性期に必須。',
    category: '頭部',
    params: { ...base, TR: 9000, TE: 120, TI: 2200, flipAngle: 150, slices: 24, sliceThickness: 5,
      fatSat: 'None', fov: 230, bandwidth: 200, orientation: 'Tra', phaseEncDir: 'A>>P',
      turboFactor: 20, echoSpacing: 4.8, partialFourier: '6/8', fieldStrength: 1.5, coilType: 'Head_64' },
  },
  {
    id: 'brain_dwi',
    label: '頭部 DWI',
    description: '急性脳梗塞の第一選択。発症2時間以内から検出可能。',
    category: '頭部',
    params: { ...base, TR: 5500, TE: 90, flipAngle: 90, slices: 24, sliceThickness: 5,
      matrixFreq: 128, matrixPhase: 128, fov: 230, bandwidth: 1500,
      orientation: 'Tra', phaseEncDir: 'A>>P', ipatMode: 'GRAPPA', ipatFactor: 2,
      inlineADC: true, turboFactor: 1, bValues: [0, 1000], fieldStrength: 1.5, coilType: 'Head_64' },
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
      orientation: 'Sag', phaseEncDir: 'H>>F', turboFactor: 25, echoSpacing: 4.2, fieldStrength: 1.5, coilType: 'Spine_32' },
  },
  {
    id: 'knee_pd',
    label: '膝関節 PD 脂肪抑制',
    description: '半月板・靱帯・軟骨の描出。PD+脂肪抑制が標準。',
    category: '関節',
    params: { ...base, TR: 3000, TE: 35, flipAngle: 150, slices: 24, sliceThickness: 3, sliceGap: 0,
      fatSat: 'SPAIR', matrixFreq: 384, matrixPhase: 307, fov: 160, bandwidth: 200,
      orientation: 'Sag', phaseEncDir: 'A>>P', turboFactor: 12, echoSpacing: 4.5, fieldStrength: 1.5, coilType: 'Knee' },
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
  // --- 追加プリセット ---
  {
    id: 'brain_space',
    label: '頭部 3D SPACE T2',
    description: '3T高分解能等方性T2。脳神経・内耳・海馬の詳細評価。',
    category: '頭部',
    params: { ...base, TR: 3200, TE: 402, TI: 0, turboFactor: 282, fov: 230, matrixFreq: 256,
      sliceThickness: 1, fieldStrength: 3.0, coilType: 'Head_64' },
  },
  {
    id: 'brain_tof_mra',
    label: '頭部 TOF MRA',
    description: '3D Time-of-Flight MRA。Willis動脈輪・脳動脈瘤の評価。',
    category: '頭部',
    params: { ...base, TR: 25, TE: 4, flipAngle: 20, matrixFreq: 320, fov: 200, bandwidth: 120,
      orientation: 'Tra', fieldStrength: 3.0, coilType: 'Head_64' },
  },
  {
    id: 'neck_dixon',
    label: '頸部 DIXON T2+T1',
    description: '頸部DIXON法。脂肪・水分離で多コントラスト同時取得。',
    category: '頸部',
    params: { ...base, TR: 3500, TE: 100, fatSat: 'Dixon', fov: 250, matrixFreq: 320,
      fieldStrength: 3.0 },
  },
  {
    id: 'chest_mobiDiff',
    label: '胸部 mobiDiff DWI',
    description: '胸部モーション補正DWI。呼吸同期でアーチファクト低減。',
    category: '胸部',
    params: { ...base, TR: 4000, TE: 70, fatSat: 'SPAIR', matrixFreq: 128, fov: 380,
      respTrigger: 'RT', bValues: [0, 700], inlineADC: true, fieldStrength: 3.0 },
  },
  {
    id: 'liver_eob',
    label: '肝臓 EOB ダイナミック',
    description: 'Primovist(EOB-DTPA)肝特異性造影。肝細胞相で転移・HCC評価。',
    category: '腹部',
    params: { ...base, TR: 3.5, TE: 1.2, flipAngle: 12, fatSat: 'Dixon', fov: 380, matrixFreq: 256,
      respTrigger: 'BH', ipatMode: 'CAIPIRINHA', ipatFactor: 2, inlineMPR: true,
      inlineSubtraction: true, fieldStrength: 3.0 },
  },
  {
    id: 'liver_opp_in',
    label: '肝臓 opposed-phase/in-phase',
    description: 'デュアルエコーDixon。脂肪肝定量・副腎腺腫評価。opp=2.46ms, in=4.92ms。',
    category: '腹部',
    params: { ...base, TR: 4.5, TE: 2.46, flipAngle: 10, fatSat: 'None', fov: 380, matrixFreq: 256,
      fieldStrength: 3.0 },
  },
  {
    id: 'mrcp_3d',
    label: 'MRCP 3D SPACE',
    description: '3D高分解能MRCP。胆管・膵管の詳細描出。PACE呼吸同期。',
    category: '腹部',
    params: { ...base, TR: 4500, TE: 720, TI: 0, flipAngle: 120, slices: 80, sliceThickness: 1.2,
      fatSat: 'SPAIR', matrixFreq: 320, fov: 300, phaseEncDir: 'H>>F', respTrigger: 'PACE',
      turboFactor: 180, fieldStrength: 3.0 },
  },
  {
    id: 'renal_native_mra',
    label: '腎動脈 NATIVE TrueFISP MRA',
    description: '非造影腎動脈MRA。心電図トリガー+PACE。造影剤不要。',
    category: '腹部',
    params: { ...base, TR: 4.0, TE: 2.0, flipAngle: 70, fatSat: 'None', matrixFreq: 256, fov: 380,
      respTrigger: 'PACE', ecgTrigger: true, fieldStrength: 3.0 },
  },
  {
    id: 'pelvis_female',
    label: '女性骨盤 T2',
    description: '子宮・卵巣の標準T2評価。子宮筋腫・内膜症・卵巣腫瘍の鑑別。',
    category: '骨盤',
    params: { ...base, TR: 5000, TE: 120, flipAngle: 150, slices: 30, sliceThickness: 4,
      matrixFreq: 384, fov: 250, phaseEncDir: 'A>>P', turboFactor: 20, fieldStrength: 3.0 },
  },
  {
    id: 'pelvis_rectum',
    label: '直腸癌 高分解能T2',
    description: '直腸癌局所進行度評価（MRF・壁外静脈浸潤）。薄スライス高分解能。',
    category: '骨盤',
    params: { ...base, TR: 4500, TE: 120, slices: 30, sliceThickness: 3, matrixFreq: 384, fov: 200,
      fatSat: 'None', turboFactor: 20, sarAssistant: 'Normal', fieldStrength: 3.0 },
  },
  {
    id: 'pelvis_bladder',
    label: '膀胱 T2',
    description: '膀胱癌の壁浸潤評価。多方向T2で筋層浸潤を判定。',
    category: '骨盤',
    params: { ...base, TR: 4500, TE: 120, sliceThickness: 4, matrixFreq: 320, fov: 300,
      turboFactor: 18, fieldStrength: 3.0 },
  },
  {
    id: 'spine_c_qtse',
    label: '頸椎 qTSE矢状断',
    description: '3T頸椎quiet TSE。騒音低減モードで患者負担軽減。',
    category: '脊椎',
    params: { ...base, TR: 3500, TE: 100, flipAngle: 150, slices: 1, sliceThickness: 3,
      matrixFreq: 320, fov: 240, gradientMode: 'Whisper', turboFactor: 25, fieldStrength: 3.0, coilType: 'Spine_32' },
  },
  {
    id: 'spine_l_qtse',
    label: '腰椎 qTSE矢状断',
    description: '3T腰椎quiet TSE。椎間板・脊柱管狭窄の標準評価。',
    category: '脊椎',
    params: { ...base, TR: 3500, TE: 100, slices: 1, sliceThickness: 3, matrixFreq: 320, fov: 280,
      gradientMode: 'Whisper', turboFactor: 25, fieldStrength: 3.0, coilType: 'Spine_32' },
  },
  {
    id: 'spine_whole',
    label: '全脊椎 STIR矢状断',
    description: '全脊椎STIR。転移性脊椎腫瘍・強直性脊椎炎のスクリーニング。',
    category: '脊椎',
    params: { ...base, TR: 4000, TE: 80, TI: 150, sliceThickness: 3, matrixFreq: 320, fov: 400,
      orientation: 'Sag', turboFactor: 20, fieldStrength: 3.0 },
  },
  {
    id: 'knee_pd_3t',
    label: '膝関節 PD 3T',
    description: '3T膝関節PD脂肪抑制。半月板・軟骨・靱帯の高精細評価。',
    category: '関節',
    params: { ...base, TR: 3000, TE: 35, fatSat: 'SPAIR', matrixFreq: 384, fov: 160,
      sliceThickness: 3, orientation: 'Sag', turboFactor: 12, fieldStrength: 3.0, coilType: 'Knee' },
  },
  {
    id: 'shoulder_blade',
    label: '肩関節 BLADE',
    description: 'BLADE（放射状k-space）。動きに強く腱板・関節唇を詳細評価。',
    category: '関節',
    params: { ...base, TR: 4000, TE: 90, fatSat: 'SPAIR', matrixFreq: 320, fov: 180,
      sliceThickness: 3, turboFactor: 15, fieldStrength: 3.0, coilType: 'Shoulder' },
  },
  {
    id: 'hip_dixon',
    label: '股関節 DIXON T2',
    description: '股関節DIXON T2。大腿骨頭壊死・変形性股関節症・腫瘍評価。',
    category: '関節',
    params: { ...base, TR: 4500, TE: 100, fatSat: 'Dixon', matrixFreq: 256, fov: 360,
      sliceThickness: 4, turboFactor: 18, fieldStrength: 3.0 },
  },
  {
    id: 'breast_dynamic',
    label: '乳腺 ダイナミックVIBE',
    description: '乳腺造影ダイナミック。CAIPIRINHA高速収集+inline subtraction。',
    category: '乳腺',
    params: { ...base, TR: 5.0, TE: 2.5, flipAngle: 12, fatSat: 'Dixon', matrixFreq: 320, fov: 330,
      respTrigger: 'BH', ipatMode: 'CAIPIRINHA', ipatFactor: 2, inlineSubtraction: true,
      fieldStrength: 3.0 },
  },
  {
    id: 'prostate_mpMRI',
    label: '前立腺 mpMRI (PI-RADS)',
    description: '前立腺癌局在診断。PI-RADS v2.1準拠の高分解能T2。',
    category: '骨盤',
    params: { ...base, TR: 4000, TE: 120, sliceThickness: 3, matrixFreq: 320, fov: 180,
      fatSat: 'None', turboFactor: 20, sarAssistant: 'Normal', fieldStrength: 3.0 },
  },
  {
    id: 'prostate_dwi',
    label: '前立腺 高b値DWI',
    description: '前立腺癌高b値DWI。b=2000での癌検出感度向上。inline ADC map生成。',
    category: '骨盤',
    params: { ...base, TR: 4000, TE: 80, fatSat: 'SPAIR', matrixFreq: 128, fov: 200,
      ipatMode: 'GRAPPA', ipatFactor: 2, bValues: [0, 50, 1000, 2000], inlineADC: true,
      fieldStrength: 3.0 },
  },
]

export type PresetCategory = string
export const categories = [...new Set(presets.map(p => p.category))]
