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

  // ── 頭部追加 ─────────────────────────────────────────────────────────────
  {
    id: 'brain_t1_gd',
    label: '頭部 T1 造影 MPRAGE',
    description: '造影T1 3D MPRAGE。転移・髄膜炎・BBB破綻の描出。等方性1mm。',
    category: '頭部',
    params: { ...base, TR: 2300, TE: 3, TI: 900, flipAngle: 9, slices: 176, sliceThickness: 1, sliceGap: 0,
      averages: 1, fatSat: 'None', matrixFreq: 256, matrixPhase: 256, fov: 230, bandwidth: 200,
      orientation: 'Sag', phaseEncDir: 'A>>P', ipatMode: 'GRAPPA', ipatFactor: 2,
      turboFactor: 1, inlineMPR: true, fieldStrength: 3.0, coilType: 'Head_64' },
  },
  {
    id: 'brain_swi',
    label: '頭部 SWI (磁化率)',
    description: 'Susceptibility Weighted Imaging。微小出血・静脈・鉄沈着の描出。T2* GRE。',
    category: '頭部',
    params: { ...base, TR: 28, TE: 20, TI: 0, flipAngle: 15, slices: 80, sliceThickness: 2, sliceGap: 0,
      averages: 1, fatSat: 'None', matrixFreq: 256, matrixPhase: 256, fov: 230, bandwidth: 120,
      orientation: 'Tra', phaseEncDir: 'A>>P', ipatMode: 'GRAPPA', ipatFactor: 2,
      turboFactor: 1, inlineMIP: true, fieldStrength: 3.0, coilType: 'Head_64' },
  },
  {
    id: 'brain_asl',
    label: '頭部 ASL 灌流',
    description: 'Arterial Spin Labeling。非造影脳灌流評価。PLD=1500ms、PCASL法。',
    category: '頭部',
    params: { ...base, TR: 4500, TE: 20, TI: 1500, flipAngle: 90, slices: 24, sliceThickness: 5, sliceGap: 0,
      averages: 6, fatSat: 'None', matrixFreq: 64, matrixPhase: 64, fov: 230, bandwidth: 1500,
      orientation: 'Tra', phaseEncDir: 'A>>P', ipatMode: 'GRAPPA', ipatFactor: 3,
      turboFactor: 1, fieldStrength: 3.0, coilType: 'Head_64' },
  },

  // ── 心臓 ─────────────────────────────────────────────────────────────────
  {
    id: 'cardiac_lge',
    label: '心臓 LGE (遅延造影)',
    description: '遅延ガドリニウム造影。心筋梗塞・心筋炎・心筋症の瘢痕評価。IR GRE。',
    category: '心臓',
    params: { ...base, TR: 8, TE: 3, TI: 300, flipAngle: 25, slices: 12, sliceThickness: 8, sliceGap: 0,
      averages: 1, fatSat: 'None', matrixFreq: 192, matrixPhase: 156, fov: 380, bandwidth: 500,
      orientation: 'Sag', phaseEncDir: 'R>>L', ecgTrigger: true, triggerDelay: 500, respTrigger: 'BH',
      ipatMode: 'GRAPPA', ipatFactor: 2, turboFactor: 1, fieldStrength: 1.5, coilType: 'Body' },
  },
  {
    id: 'cardiac_t2_stir',
    label: '心臓 T2 STIR (浮腫)',
    description: '心筋浮腫の評価。急性心筋炎・Tako-Tsubo。ECG + BH STIR TSE。',
    category: '心臓',
    params: { ...base, TR: 2000, TE: 60, TI: 160, flipAngle: 150, slices: 12, sliceThickness: 8,
      averages: 2, fatSat: 'STIR', matrixFreq: 192, matrixPhase: 156, fov: 380, bandwidth: 300,
      orientation: 'Sag', phaseEncDir: 'R>>L', ecgTrigger: true, triggerDelay: 600, respTrigger: 'BH',
      ipatMode: 'GRAPPA', ipatFactor: 2, turboFactor: 12, fieldStrength: 1.5, coilType: 'Body' },
  },

  // ── 四肢・関節 ────────────────────────────────────────────────────────────
  {
    id: 'wrist_pd',
    label: '手関節 PD SPAIR',
    description: '手関節PDw SPAIR。三角線維軟骨複合体(TFCC)・腱・靭帯の精細評価。',
    category: '四肢',
    params: { ...base, TR: 3500, TE: 30, flipAngle: 90, slices: 24, sliceThickness: 2, sliceGap: 0,
      averages: 2, fatSat: 'SPAIR', matrixFreq: 256, matrixPhase: 256, fov: 100, bandwidth: 200,
      orientation: 'Cor', phaseEncDir: 'H>>F', turboFactor: 12, fieldStrength: 3.0, coilType: 'Flex' },
  },
  {
    id: 'ankle_pd',
    label: '足関節 PD SPAIR',
    description: '足関節PDw SPAIR。アキレス腱・腓骨筋腱・前距腓靭帯の評価。3方向取得。',
    category: '四肢',
    params: { ...base, TR: 3500, TE: 30, flipAngle: 90, slices: 24, sliceThickness: 3, sliceGap: 0,
      averages: 2, fatSat: 'SPAIR', matrixFreq: 256, matrixPhase: 256, fov: 160, bandwidth: 200,
      orientation: 'Sag', phaseEncDir: 'H>>F', turboFactor: 12, fieldStrength: 3.0, coilType: 'Flex' },
  },
  {
    id: 'hip_labrum',
    label: '股関節 寛骨臼唇',
    description: '股関節唇の評価。FAI（大腿骨臼蓋インピンジメント）。薄スライス3D PD。',
    category: '四肢',
    params: { ...base, TR: 1200, TE: 25, flipAngle: 90, slices: 48, sliceThickness: 1.5, sliceGap: 0,
      averages: 1, fatSat: 'SPAIR', matrixFreq: 320, matrixPhase: 256, fov: 160, bandwidth: 300,
      orientation: 'Cor', phaseEncDir: 'R>>L', ipatMode: 'GRAPPA', ipatFactor: 2,
      turboFactor: 12, inlineMPR: true, fieldStrength: 3.0, coilType: 'Body' },
  },

  // ── 乳腺 ─────────────────────────────────────────────────────────────────
  {
    id: 'breast_mri_nac',
    label: '乳腺 非造影 DWI',
    description: '乳腺非造影MRI。DWIでADC低値の癌スクリーニング。Whisper gradient使用。',
    category: '乳腺',
    params: { ...base, TR: 5000, TE: 80, flipAngle: 90, slices: 30, sliceThickness: 4, sliceGap: 0,
      averages: 4, fatSat: 'SPAIR', matrixFreq: 192, matrixPhase: 192, fov: 320, bandwidth: 1500,
      orientation: 'Tra', phaseEncDir: 'R>>L', respTrigger: 'BH',
      ipatMode: 'GRAPPA', ipatFactor: 2, inlineADC: true,
      turboFactor: 1, bValues: [0, 800], gradientMode: 'Whisper', fieldStrength: 3.0, coilType: 'Body' },
  },

  // ── 頸部 ─────────────────────────────────────────────────────────────────
  {
    id: 'neck_lymph',
    label: '頸部 リンパ節評価',
    description: '頸部リンパ節 T2+DWI。悪性リンパ腫・転移リンパ節のADC低値。STIR+DWI。',
    category: '頸部',
    params: { ...base, TR: 5000, TE: 60, TI: 160, flipAngle: 90, slices: 30, sliceThickness: 4, sliceGap: 0,
      averages: 2, fatSat: 'STIR', matrixFreq: 256, matrixPhase: 256, fov: 280, bandwidth: 300,
      orientation: 'Cor', phaseEncDir: 'H>>F', fieldStrength: 1.5, coilType: 'Spine_32' },
  },
  {
    id: 'neck_ce_t1',
    label: '頸部 造影 T1 VIBE',
    description: '頸部造影 T1 3D VIBE。甲状腺・唾液腺・頸部腫瘍の境界描出。Dixon脂肪分離。',
    category: '頸部',
    params: { ...base, TR: 6, TE: 2, flipAngle: 12, slices: 80, sliceThickness: 1.5, sliceGap: 0,
      averages: 1, fatSat: 'Dixon', matrixFreq: 256, matrixPhase: 208, fov: 280, bandwidth: 400,
      orientation: 'Tra', phaseEncDir: 'A>>P', respTrigger: 'BH',
      ipatMode: 'GRAPPA', ipatFactor: 2, turboFactor: 1, inlineMPR: true,
      fieldStrength: 3.0, coilType: 'Spine_32' },
  },
  {
    id: 'pituitary_t1',
    label: '下垂体 T1 ダイナミック',
    description: '下垂体微小腺腫検出。FOV小・高分解能・ダイナミック造影。コロナル薄スライス。',
    category: '頭部',
    params: { ...base, TR: 400, TE: 10, flipAngle: 90, slices: 20, sliceThickness: 2, sliceGap: 0,
      averages: 2, fatSat: 'None', matrixFreq: 256, matrixPhase: 256, fov: 180, bandwidth: 200,
      orientation: 'Cor', phaseEncDir: 'R>>L', turboFactor: 4, echoSpacing: 3.8,
      fieldStrength: 1.5, coilType: 'Head_64' },
  },
  {
    id: 'inner_ear_ciss',
    label: '内耳 CISS 3D',
    description: '内耳迷路・神経. CISS/SPACE超高分解能3D。聴神経腫瘍・前庭神経炎評価。',
    category: '頭部',
    params: { ...base, TR: 9, TE: 4, flipAngle: 60, slices: 120, sliceThickness: 0.7, sliceGap: 0,
      averages: 1, fatSat: 'None', matrixFreq: 384, matrixPhase: 384, fov: 170, bandwidth: 500,
      orientation: 'Tra', phaseEncDir: 'A>>P', turboFactor: 60, echoSpacing: 3.5,
      partialFourier: '6/8', ipatMode: 'GRAPPA', ipatFactor: 2, inlineMPR: true,
      fieldStrength: 3.0, coilType: 'Head_64' },
  },
  {
    id: 'lower_limb_mra',
    label: '下肢 CE-MRA（流れ込み法）',
    description: '下肢末梢動脈疾患 (PAD)。追跡型CE-MRA。3-station MIP再構成。',
    category: '血管',
    params: { ...base, TR: 4, TE: 1.5, flipAngle: 25, slices: 120, sliceThickness: 1.2, sliceGap: 0,
      averages: 1, fatSat: 'None', matrixFreq: 320, matrixPhase: 256, fov: 400, bandwidth: 600,
      orientation: 'Cor', phaseEncDir: 'H>>F', ipatMode: 'GRAPPA', ipatFactor: 2,
      turboFactor: 1, inlineMIP: true, inlineMPR: true,
      fieldStrength: 1.5, coilType: 'Body' },
  },
  {
    id: 'fetal_haste',
    label: '胎児 HASTE 体幹部',
    description: '胎動に強いHASTE。胎児形態評価。シングルショット・高速収集。呼吸停止不要。',
    category: '産科',
    params: { ...base, TR: 1800, TE: 90, flipAngle: 150, slices: 30, sliceThickness: 4, sliceGap: 0,
      averages: 1, fatSat: 'None', matrixFreq: 256, matrixPhase: 256, fov: 380, bandwidth: 750,
      orientation: 'Cor', phaseEncDir: 'R>>L', turboFactor: 120, echoSpacing: 4.0,
      partialFourier: '5/8', fieldStrength: 1.5, coilType: 'Body' },
  },
  {
    id: 'liver_t2star',
    label: '肝臓 T2* (鉄沈着定量)',
    description: 'ヘモクロマトーシス・輸血後鉄過剰。多エコーGRE T2*マッピング。R2*=1/T2*で定量。',
    category: '腹部',
    params: { ...base, TR: 200, TE: 2, flipAngle: 20, slices: 3, sliceThickness: 8, sliceGap: 20,
      averages: 1, fatSat: 'None', matrixFreq: 192, matrixPhase: 160, fov: 360, bandwidth: 1000,
      orientation: 'Tra', phaseEncDir: 'A>>P', respTrigger: 'BH',
      turboFactor: 1, fieldStrength: 1.5, coilType: 'Body' },
  },
  {
    id: 'pediatric_brain',
    label: '小児 頭部 T2 (Whisper)',
    description: '鎮静下小児頭部MRI。低騒音Whisperモード。造影なし標準。Head 20ch。',
    category: '頭部',
    params: { ...base, TR: 4000, TE: 100, flipAngle: 150, slices: 20, sliceThickness: 4, sliceGap: 10,
      averages: 2, fatSat: 'None', matrixFreq: 256, matrixPhase: 224, fov: 180, bandwidth: 180,
      orientation: 'Tra', phaseEncDir: 'A>>P', gradientMode: 'Whisper',
      turboFactor: 15, echoSpacing: 4.5, fieldStrength: 1.5, coilType: 'Head_20' },
  },
  {
    id: 'knee_3d_pd',
    label: '膝 3D PDw SPACE (軟骨)',
    description: '軟骨定量評価 3D SPACE. 等方性ボクセル・MPR任意断面。軟骨損傷グレーディング。',
    category: '関節',
    params: { ...base, TR: 1500, TE: 35, flipAngle: 90, slices: 160, sliceThickness: 0.6, sliceGap: 0,
      averages: 1, fatSat: 'None', matrixFreq: 320, matrixPhase: 320, fov: 160, bandwidth: 400,
      orientation: 'Sag', phaseEncDir: 'A>>P', turboFactor: 50, echoSpacing: 3.8,
      partialFourier: '6/8', ipatMode: 'GRAPPA', ipatFactor: 2, inlineMPR: true,
      fieldStrength: 3.0, coilType: 'Knee' },
  },
  // ── 血管 ─────────────────────────────────────────────────────────
  {
    id: 'aorta_ce_mra',
    label: '大動脈 CE-MRA',
    description: '造影3D-FLASH。大動脈瘤・解離・Leriche。薄いスライスと広FOVで全大動脈を一括カバー。',
    category: '血管',
    params: { ...base, TR: 3.2, TE: 1.1, flipAngle: 25, slices: 80, sliceThickness: 1.2, sliceGap: 0,
      averages: 1, fatSat: 'None', matrixFreq: 320, matrixPhase: 288, fov: 450, bandwidth: 600,
      orientation: 'Cor', phaseEncDir: 'H>>F', ipatMode: 'GRAPPA', ipatFactor: 2,
      partialFourier: '6/8', inlineMIP: true, inlineMPR: true, inlineSubtraction: true,
      gradientMode: 'Fast', coilType: 'Body', fieldStrength: 1.5 },
  },
  {
    id: 'renal_mra_ce',
    label: '腎動脈 CE-MRA',
    description: '腎血管性高血圧・腎動脈狭窄評価。造影タイミング自動検出（Bolus Tracking）。',
    category: '血管',
    params: { ...base, TR: 3.5, TE: 1.2, flipAngle: 25, slices: 60, sliceThickness: 1.0, sliceGap: 0,
      averages: 1, fatSat: 'None', matrixFreq: 256, matrixPhase: 220, fov: 340, bandwidth: 500,
      orientation: 'Cor', phaseEncDir: 'H>>F', ipatMode: 'GRAPPA', ipatFactor: 2,
      partialFourier: '6/8', inlineMIP: true, inlineMPR: true, inlineSubtraction: true,
      gradientMode: 'Fast', coilType: 'Body', fieldStrength: 1.5 },
  },
  {
    id: 'peripheral_mra',
    label: '末梢血管 CE-MRA (3-station)',
    description: '腸骨〜膝窩〜足底の3ステーション撮像。PAD（末梢動脈疾患）評価。',
    category: '血管',
    params: { ...base, TR: 4.2, TE: 1.5, flipAngle: 25, slices: 64, sliceThickness: 1.2, sliceGap: 0,
      averages: 1, fatSat: 'None', matrixFreq: 288, matrixPhase: 256, fov: 480, bandwidth: 450,
      orientation: 'Cor', phaseEncDir: 'H>>F', ipatMode: 'GRAPPA', ipatFactor: 2,
      partialFourier: '6/8', inlineMIP: true, inlineSubtraction: true,
      gradientMode: 'Fast', coilType: 'Body', fieldStrength: 1.5 },
  },
  // ── 全身・腫瘍 ───────────────────────────────────────────────────
  {
    id: 'whole_body_dwi',
    label: '全身 DWI (悪性リンパ腫)',
    description: '全身DWI。b=50/800。骨転移・リンパ節・PET代替スクリーニング。Short TI IR背景抑制。',
    category: '腫瘍',
    params: { ...base, TR: 8000, TE: 60, flipAngle: 90, slices: 50, sliceThickness: 5.0, sliceGap: 10,
      averages: 3, fatSat: 'STIR', matrixFreq: 128, matrixPhase: 96, fov: 430, bandwidth: 1502,
      orientation: 'Cor', phaseEncDir: 'H>>F', ipatMode: 'GRAPPA', ipatFactor: 2,
      bValues: [50, 800], inlineADC: true, inlineMIP: true,
      respTrigger: 'RT', gradientMode: 'Fast', coilType: 'Body', fieldStrength: 1.5 },
  },
  {
    id: 'liver_hcc_ablation',
    label: '肝 RFA後評価',
    description: '肝細胞癌ラジオ波焼灼術後の残存/再発評価。Dynamic+DWI+MRCP組み合わせ。',
    category: '腹部',
    params: { ...base, TR: 4.2, TE: 1.4, flipAngle: 12, slices: 64, sliceThickness: 3.0, sliceGap: 0,
      averages: 1, fatSat: 'Dixon', matrixFreq: 256, matrixPhase: 192, fov: 360, bandwidth: 620,
      orientation: 'Tra', phaseEncDir: 'A>>P', ipatMode: 'GRAPPA', ipatFactor: 2,
      partialFourier: '6/8', respTrigger: 'BH', inlineMPR: true, inlineSubtraction: true,
      gradientMode: 'Fast', coilType: 'Body', fieldStrength: 3.0 },
  },
  {
    id: 'pancreas_mri',
    label: '膵臓 MRI (腫瘤精査)',
    description: '膵管癌・IPMN・膵内分泌腫瘍評価。MRCP+DWI+Dynamic CE。薄スライス高分解能。',
    category: '腹部',
    params: { ...base, TR: 8000, TE: 90, flipAngle: 90, slices: 30, sliceThickness: 3.0, sliceGap: 0,
      averages: 2, fatSat: 'SPAIR', matrixFreq: 320, matrixPhase: 256, fov: 300, bandwidth: 300,
      orientation: 'Tra', phaseEncDir: 'A>>P', turboFactor: 18, echoSpacing: 5.5,
      ipatMode: 'GRAPPA', ipatFactor: 2, partialFourier: '6/8',
      respTrigger: 'PACE', gradientMode: 'Normal', coilType: 'Body', fieldStrength: 3.0 },
  },
  {
    id: 'adrenal_mri',
    label: '副腎 MRI (Dixon 化学シフト)',
    description: '副腎腺腫vs転移の鑑別。Opp/In-phase Dixon。脂質含有評価。腺腫ではSI比>20%低下。',
    category: '腹部',
    params: { ...base, TR: 200, TE: 2.3, flipAngle: 70, slices: 20, sliceThickness: 4.0, sliceGap: 0,
      averages: 1, fatSat: 'Dixon', matrixFreq: 256, matrixPhase: 192, fov: 380, bandwidth: 440,
      orientation: 'Tra', phaseEncDir: 'A>>P', turboFactor: 1, echoSpacing: 0,
      ipatMode: 'GRAPPA', ipatFactor: 2, respTrigger: 'BH',
      gradientMode: 'Fast', coilType: 'Body', fieldStrength: 1.5 },
  },
  // ── 胸部 ─────────────────────────────────────────────────────────
  {
    id: 'lung_mri',
    label: '肺 MRI (Free Breathing)',
    description: '肺腫瘤・転移巣評価。呼吸同期HASTE。CTと相補的。造影不要・小児・妊婦に有用。',
    category: '胸部',
    params: { ...base, TR: 1500, TE: 30, flipAngle: 90, slices: 40, sliceThickness: 6.0, sliceGap: 20,
      averages: 2, fatSat: 'None', matrixFreq: 256, matrixPhase: 192, fov: 380, bandwidth: 799,
      orientation: 'Cor', phaseEncDir: 'H>>F', turboFactor: 220,
      respTrigger: 'RT', gradientMode: 'Fast', coilType: 'Body', fieldStrength: 1.5 },
  },
  {
    id: 'mediastinum_mri',
    label: '縦隔 MRI (腫瘤精査)',
    description: '縦隔腫瘤（胸腺腫・神経原性腫瘍・リンパ腫）評価。T1/T2/DWI。',
    category: '胸部',
    params: { ...base, TR: 5000, TE: 90, flipAngle: 90, slices: 30, sliceThickness: 5.0, sliceGap: 10,
      averages: 2, fatSat: 'SPAIR', matrixFreq: 256, matrixPhase: 192, fov: 380, bandwidth: 300,
      orientation: 'Tra', phaseEncDir: 'A>>P', turboFactor: 20,
      ipatMode: 'GRAPPA', ipatFactor: 2, respTrigger: 'RT',
      gradientMode: 'Normal', coilType: 'Body', fieldStrength: 1.5 },
  },
]

export type PresetCategory = string
export const categories = [...new Set(presets.map(p => p.category))]
