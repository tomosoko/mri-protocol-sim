export interface SequenceStep {
  name: string
  duration?: string
  note?: string        // 技術的注記 (ABLE, quiet TSE等)
  reason?: string      // 臨床的根拠（なぜ撮るのか）
  presetId?: string    // 対応するプリセットID（クリック時にパラメータをロード）
  isOptional?: boolean
  isCE?: boolean
  isTimer?: boolean
  isDecision?: boolean
}

export interface ProtocolColumn {
  label: string
  sequences: SequenceStep[]
}

export interface ProtocolVariant {
  id: string
  label: string
  presetId?: string
  columns: ProtocolColumn[]
}

export interface ProtocolGroup {
  id: string
  label: string
  variants: ProtocolVariant[]
}

export interface BodyPart {
  id: string
  label: string
  groups: ProtocolGroup[]
}

export const protocolTree: BodyPart[] = [
  {
    id: 'head',
    label: '頭部',
    groups: [
      {
        id: 'brain',
        label: '脳',
        variants: [
          {
            id: 'brain_routine_dot',
            label: 'Routine_Dot',
            presetId: 'brain_t2',
            columns: [
              {
                label: 'Routine',
                sequences: [
                  { name: 'AAHScout' },
                  { name: 'AutoAlign Scout' },
                  { name: 'diffusion_ep2d_tra' },
                  { name: 'Head_MRA_ToF3d_p3' },
                  { name: 'Neck_MRA_ToF3d_3slab' },
                  { name: 't2_flair_tse_tra' },
                  { name: 't2_tse_tra' },
                  { name: 't1_se_tra' },
                  { name: 't2star_fl2d_tra' },
                ],
              },
              {
                label: 'fast',
                sequences: [
                  { name: 'AAHScout' },
                  { name: 'AutoAlign Scout' },
                  { name: 'diffusion_ep2d_tra_fast' },
                  { name: 'Head_MRA_ToF3d_p3_fast' },
                  { name: 'Neck_MRA_ToF3d_3slab_fast' },
                  { name: 't2_flair_tse_tra_fast' },
                  { name: 't2_tse_tra_fast' },
                  { name: 't1_se_tra_fast' },
                  { name: 't2star_fl2d_tra_fast' },
                ],
              },
            ],
          },
          {
            id: 'brain_meta_check',
            label: 'Meta_check',
            presetId: 'brain_t2',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'AAHScout' },
                  { name: 't1_se_tra' },
                  { name: 'CE注射', isCE: true },
                  { name: 'diffusion_ep2d_tra' },
                  { name: 't2_flair_tse_tra_fast' },
                  { name: 't1_space_sag_15' },
                  { name: 't1_fs_fl3d_sag' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'pituitary',
        label: '下垂体',
        variants: [
          {
            id: 'pituitary_dot',
            label: 'pituitary_Dot',
            columns: [
              {
                label: 'adult',
                sequences: [
                  { name: 'AAHScout' },
                  { name: 'AutoAlign Scout' },
                  { name: 't2_tse_cor' },
                  { name: 't1_tse_cor' },
                  { name: 't2_tse_sag' },
                  { name: 't1_tse_sag' },
                  { name: 'CE注射', isCE: true },
                  { name: 't1_tse_cor_dyn' },
                ],
              },
              {
                label: 'body',
                sequences: [
                  { name: 'localizer' },
                  { name: 't2_tse_cor' },
                  { name: 't1_tse_cor' },
                  { name: 't2_tse_sag' },
                  { name: 't1_tse_sag' },
                  { name: 'CE注射', isCE: true },
                  { name: 't1_tse_cor_dyn' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'neck',
    label: '頸部',
    groups: [
      {
        id: 'neck_routine',
        label: 'ルーティン',
        variants: [
          {
            id: 'neck_routine',
            label: 'routine',
            presetId: 'neck_dixon',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'LaserLight' },
                  { name: 'localizer_TimCT_FirstView' },
                  { name: 'localizer_haste_sag' },
                  { name: 't2_spc_DIXON_tra' },
                  { name: 'CI_spc_DIXON_tra' },
                  { name: 't1_tse_DIXON_cor' },
                  { name: 't1_tse_cor' },
                  { name: 't1_tse_DIXON_tra' },
                  { name: 't2_tse_DIXON_tra' },
                  { name: 't2_tse_kugel5_tra_b0_200' },
                  { name: 't1_tse_DIXON_sag' },
                  { name: 't1_tse_sag' },
                  { name: 'CE注射', isCE: true },
                  { name: 'dynamic(pre)_t1_vibe_fs_tra_bh' },
                  { name: 't1_tse_DIXON_tra_post' },
                  { name: 't1_tse_DIXON_cor_post' },
                  { name: 't1_tse_DIXON_sag_post' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'chest',
    label: '胸部',
    groups: [
      {
        id: 'chest_routine',
        label: 'ルーティン',
        variants: [
          {
            id: 'chest_routine',
            label: 'routine',
            presetId: 'chest_mobiDiff',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer' },
                  { name: 'localizer_haste_cor' },
                  { name: 'localizer_haste_sag' },
                  { name: 't2_BLADE' },
                  { name: 't2_haste_tra_bh' },
                  { name: 't1_stse_tra_bh' },
                  { name: 'diffusion_mobiDiff5_tra_b0_700' },
                  { name: 't2_haste_cor_RT' },
                  { name: 'option？', isDecision: true },
                  { name: 'diffusion_ep2d_tra_PACE', isOptional: true },
                  { name: 't2_fs_haste_tra_bh', isOptional: true },
                  { name: 't2_haste_tra_PACE', isOptional: true },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'breast',
    label: '乳腺',
    groups: [
      {
        id: 'breast_routine',
        label: 'ルーティン',
        variants: [
          {
            id: 'breast_routine_high_res',
            label: 'routine_high_res',
            presetId: 'breast_dynamic',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer' },
                  { name: 't2_fs_tse_tra' },
                  { name: 't1_tse_tra' },
                  { name: 'diffusion_resolve5_tra_fs' },
                  { name: '造影注射', isCE: true },
                  { name: 'dynamic(pre)_vibe_fs_tra' },
                  { name: 'dynamic(90p)_vibe_fs_tra' },
                  { name: 't1_fs_vibe_sag_B' },
                  { name: 't1_fs_vibe_sag_L' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'abdomen',
    label: '腹部',
    groups: [
      {
        id: 'abdomen_eob',
        label: 'EOB（肝臓）',
        variants: [
          {
            id: 'eob_dot_exhale',
            label: 'EOB_Dot_Exhale',
            presetId: 'liver_eob',
            columns: [
              {
                label: '2mm',
                sequences: [
                  { name: 'localizer_bh' },
                  { name: 'localizer_haste_cor_bh' },
                  { name: 'Care_Bolus_position_haste_sag' },
                  { name: 't1_vibe_opp-In_tra_p4_bh', note: 'opposed/in-phase' },
                  { name: 't2_haste_tra_bh' },
                  { name: 'dynamic(pre)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: '造影注射', isCE: true },
                  { name: 'Care_Bolus', note: 'ABLE' },
                  { name: 'dynamic(30s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'dynamic(60s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'dynamic(120s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 't2_haste_FS_tra_bh' },
                  { name: 'diffusion_ep2d_tra_PACE' },
                  { name: '_15min_', isTimer: true, note: 'EOB肝細胞相待機' },
                  { name: 'dynamic(15min)_vibe_fs_tra_2mm' },
                  { name: 'dynamic(15min)_vibe_fs_cor_3mm' },
                  { name: 'dynamic(15min)_vibe_fs_sag_3mm' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'abdomen_mrcp',
        label: 'MRCP',
        variants: [
          {
            id: 'mrcp_routine_exhalated',
            label: 'routine_exhalated',
            presetId: 'mrcp_3d',
            columns: [
              {
                label: 'BH',
                sequences: [
                  { name: 'localizer_bh' },
                  { name: 'MRCP2d_rane_cor_bh_fs' },
                  { name: 't2_haste_tra_bh' },
                  { name: 't1_vibe_dixon_tra_p4_bh' },
                  { name: 't2_fs_haste_tra_bh' },
                  { name: 'MRCP_HR_t2_space_cor_PACE' },
                  { name: 'diffusion_ep2d_tra_PACE_spair' },
                  { name: 't2_haste_cor_bh' },
                  { name: 't2_haste_tra_bh' },
                ],
              },
              {
                label: 'Free Breath',
                sequences: [
                  { name: 'localizer' },
                  { name: 'localizer_haste_cor_RT' },
                  { name: 'MRCP2d_rane_cor_fs' },
                  { name: 't2_haste_tra_RT' },
                  { name: 't1_starVIBE_opp_In_tra' },
                  { name: 't1_starVIBE_SPAIR_tra' },
                  { name: 'MRCP_HR_t2_space_cor_RT' },
                  { name: 'diffusion_ep2d_tra_RT' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'abdomen_renal',
        label: '腎臓',
        variants: [
          {
            id: 'renal_routine',
            label: 'routine',
            presetId: 'renal_native_mra',
            columns: [
              {
                label: 'BH',
                sequences: [
                  { name: 'localizer' },
                  { name: 't2_haste_tra_bh' },
                  { name: 't1_vibe_opp-In_tra_p4_bh' },
                  { name: 'diffusion_ep2d_tra_PACE' },
                  { name: 't2_tse_cor_bh' },
                  { name: 't1_vibe_cor_bh_opp_In' },
                ],
              },
              {
                label: 'Free Breath',
                sequences: [
                  { name: 't1_starVIBE_opp_In_tra' },
                  { name: 'diffusion_ep2d_tra_PACE' },
                  { name: 't2_haste_cor_RT' },
                  { name: 't1_starVIBE_opp_In_cor' },
                  { name: 'NATIVE_trufi_renal_tra_RESP' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'abdomen_liver',
        label: '肝臓',
        variants: [
          {
            id: 'liver_routine',
            label: 'routine',
            presetId: 'liver_opp_in',
            columns: [
              {
                label: 'Free Breath',
                sequences: [
                  { name: 'localizer' },
                  { name: 't2_haste_tra_RT' },
                  { name: 't1_starVIBE_opp_tra' },
                  { name: 't1_starVIBE_opp_tra_256' },
                  { name: 'diffusion_ep2d_tra_PACE' },
                  { name: 't2_haste_cor_RT' },
                ],
              },
              {
                label: 'BH',
                sequences: [
                  { name: 'localizer_bh' },
                  { name: 't2_haste_tra_bh' },
                  { name: 't1_vibe_opp_tra_p4_bh' },
                  { name: 'heavy_Dixon_tra_bh', note: 'ヘビーDixon' },
                  { name: 'diffusion_ep2d_tra_PACE' },
                  { name: 't2_haste_cor_bh' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'pelvis',
    label: '骨盤',
    groups: [
      {
        id: 'pelvis_male',
        label: '男性（前立腺）',
        variants: [
          {
            id: 'pelvis_male_routine',
            label: 'Routine',
            presetId: 'prostate_mpMRI',
            columns: [
              {
                label: 'plane',
                sequences: [
                  { name: 'localizer' },
                  { name: 'localizer_haste_sag' },
                  { name: 't2_tse_tra' },
                  { name: 't2_tse_SPAIR_tra' },
                  { name: 't1_tse_tra' },
                  { name: 'diffusion_ep2d_tra_b0_1500' },
                  { name: 't2_tse_sag' },
                  { name: 't2_tse_SPAIR_cor' },
                ],
              },
              {
                label: 'CE',
                sequences: [
                  { name: 'localizer' },
                  { name: 'localizer_haste_sag' },
                  { name: 't2_tse_tra' },
                  { name: 't2_tse_SPAIR_tra' },
                  { name: 't1_tse_tra' },
                  { name: 'diffusion_ep2d_tra_b0_1500' },
                  { name: 't2_tse_sag' },
                  { name: 't2_tse_SPAIR_cor' },
                  { name: 'dynamic(pre)_vibe_fs_tra' },
                  { name: '造影注射', isCE: true },
                  { name: 'dynamic_vibe_fs_tra' },
                  { name: 't1_tse_sag_fs' },
                  { name: 't1_tse_cor_fs' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'pelvis_female',
        label: '女性（子宮・卵巣）',
        variants: [
          {
            id: 'pelvis_female_routine',
            label: 'routine',
            presetId: 'pelvis_female',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer' },
                  { name: 'localizer_haste_sag' },
                  { name: 't2_tse_cor' },
                  { name: 't2_tse_tra' },
                  { name: 't1_tse_tra' },
                  { name: 't2_tse_fs_tra' },
                  { name: 'diffusion_ep2d_tra' },
                  { name: 't2_tse_sag' },
                  { name: '造影注射', isCE: true },
                  { name: 't1_tse_fs_tra' },
                  { name: 't1_tse_fs_tse' },
                  { name: 't1_fs_tse_cor' },
                  { name: 't1_fs_tse_sag' },
                  { name: 't1_starVIBE_fs_cor' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'pelvis_rectum',
        label: '直腸',
        variants: [
          {
            id: 'pelvis_rectum_routine',
            label: 'routine',
            presetId: 'pelvis_rectum',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer' },
                  { name: 'diffusion_resolve5_tra_b0_800' },
                  { name: 't1_tse_fist_DIXON_tra' },
                  { name: 'dynamic(dyn)_vibe_fs' },
                  { name: '造影注射', isCE: true },
                  { name: 't1_tse_DIXON_cor' },
                  { name: 't1_fs_tse_sag' },
                  { name: 't1_fs_BLADE_tra_320' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'pelvis_bladder',
        label: '膀胱',
        variants: [
          {
            id: 'pelvis_bladder_routine',
            label: 'routine',
            presetId: 'pelvis_bladder',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer' },
                  { name: 't2_tse_cor' },
                  { name: 't2_tse_tra' },
                  { name: 't2_tse_sag' },
                  { name: 't1_tse_SPAIR_tra' },
                  { name: 'diffusion_ep2d_tra_b0_1500' },
                  { name: '造影注射', isCE: true },
                  { name: 'dynamic_vibe_fs_tra_bh' },
                  { name: 't1_tse_SHFL_fs_tra', note: 'SHFL=Shuffle' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'spine',
    label: '脊椎',
    groups: [
      {
        id: 'spine_cervical',
        label: '頸椎',
        variants: [
          {
            id: 'c_spine_routine',
            label: 'routine',
            presetId: 'spine_c_qtse',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer_quiet' },
                  { name: 'localizer_haste_cor' },
                  { name: 'localizer_haste_sag' },
                  { name: 't2_qtse_sag', note: 'quiet TSE' },
                  { name: 't1_qtse_sag' },
                  { name: 't2_qtse_tra' },
                  { name: 'option？', isDecision: true },
                  { name: 't2_qtse_cor', isOptional: true },
                  { name: 't2_nSTIR_cor', isOptional: true, note: 'noise-optimized STIR' },
                  { name: 't1_tse_DIXON_cor', isOptional: true },
                  { name: 't2_nSTIR_sag', isOptional: true },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'spine_lumbar',
        label: '腰椎',
        variants: [
          {
            id: 'l_spine_routine',
            label: 'routine',
            presetId: 'spine_l_qtse',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer_quiet' },
                  { name: 'localizer_haste_cor' },
                  { name: 'localizer_haste_sag' },
                  { name: 'L_t2_qtse_cor' },
                  { name: 'L_t2_qtse_sag' },
                  { name: 'L_t1_qtse_sag' },
                  { name: 'L_t2_tse_tra' },
                  { name: 'option？', isDecision: true },
                  { name: 'L_t2_stir_qtse_sag', isOptional: true },
                  { name: 'L_t2_stir_qtse_cor', isOptional: true },
                  { name: 'L_t1_tse_tra', isOptional: true },
                  { name: 'L_t2_tse_DIXON_cor', isOptional: true },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'spine_whole',
        label: '全脊椎',
        variants: [
          {
            id: 'whole_spine',
            label: 'WholeSpine',
            presetId: 'spine_whole',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'C_t1_tse_DIXON_sag' },
                  { name: 'C_t2_stir_qtse_sag' },
                  { name: 'T_t1_tse_DIXON_sag' },
                  { name: 'T_t2_stir_qtse_sag' },
                  { name: 'L_t1_tse_DIXON_sag' },
                  { name: 'L_t2_stir_qtse_sag' },
                  { name: 'C_t2_qtse_tra' },
                  { name: 'T_t2_qtse_tra' },
                  { name: 'L_t2_qtse_tra' },
                ],
              },
            ],
          },
          {
            id: 'myelo',
            label: 'Myelo',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 't2_stir_stse_sag' },
                  { name: 'Myelo_t2_space_cor_spair_TE90' },
                  { name: 't2_fs_stse_tra' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'joint',
    label: '関節',
    groups: [
      {
        id: 'joint_knee',
        label: '膝関節',
        variants: [
          {
            id: 'knee_dot',
            label: 'Knee_Dot',
            presetId: 'knee_pd_3t',
            columns: [
              {
                label: 'routine',
                sequences: [
                  { name: 'AAHScout' },
                  { name: 'AutoAlign Scout' },
                  { name: 'pd_tse_cor' },
                  { name: 'pd_fs_tse_cor' },
                  { name: 't2_tse_cor' },
                  { name: 'pd_tse_sag' },
                  { name: 'pd_fs_tse_sag' },
                  { name: 'pd_fs_tse_tra' },
                ],
              },
              {
                label: 'soft_tissue',
                sequences: [
                  { name: 'localizer_trufi_cor' },
                  { name: 't2_tse_DIXON_cor' },
                  { name: 't1_tse_cor' },
                  { name: 't2_tse_DIXON_sag' },
                  { name: 't1_tse_sag' },
                  { name: 't2_tse_DIXON_tra' },
                  { name: 't2_tse_tra' },
                  { name: 'diffusion_stir_ep2d_tra', note: '腫瘍評価用DWI' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'joint_shoulder',
        label: '肩関節',
        variants: [
          {
            id: 'shl_shoulder_dot',
            label: 'SHL_Shoulder_Dot',
            presetId: 'shoulder_blade',
            columns: [
              {
                label: 'soft_tissue',
                sequences: [
                  { name: 'localizer' },
                  { name: 'localizer_trufi_cor' },
                  { name: 'localizer_haste_sag' },
                  { name: 't1_tse_cor' },
                  { name: 't2_BLADE_cor_320' },
                  { name: 't2_fs_BLADE_sag_320' },
                  { name: 't2_BLADE_tra_320' },
                  { name: 't2_fs_BLADE_tra_320' },
                  { name: 't1_blade_sag' },
                ],
              },
              {
                label: 'routine',
                sequences: [
                  { name: 'localizer' },
                  { name: 'localizer_trufi_cor' },
                  { name: 't1_tse_cor' },
                  { name: 'pd_BLADE_tra_320' },
                  { name: 'pd_fs_BLADE_cor_320' },
                  { name: 'pd_fs_BLADE_sag_320' },
                  { name: 'pd_fs_BLADE_tra_320' },
                  { name: 't2star_medic_tra' },
                  { name: 'pd_tse_cor' },
                  { name: 'pd_fs_tse_cor' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'joint_hip',
        label: '股関節',
        variants: [
          {
            id: 'hip_routine',
            label: 'routine',
            presetId: 'hip_dixon',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer' },
                  { name: 'localizer_trufi_tra' },
                  { name: 't2_tse_DIXON_cor' },
                  { name: 't1_tse_cor' },
                  { name: 't2_tse_DIXON_tra' },
                  { name: 't2_tse_tra' },
                  { name: 'diffusion_stir_ep2d_tra' },
                  { name: 'CE注射', isCE: true },
                  { name: 'dynamic_vibe_fs_tra' },
                  { name: 'dynamic_vibe_fs_cor' },
                  { name: 't1_tse_DIXON_cor' },
                  { name: 't1_tse_DIXON_tra' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]
