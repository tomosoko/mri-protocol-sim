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
    label: 'Head',
    groups: [
      {
        id: 'brain',
        label: 'Brain',
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
                  { name: 'CE_Injection', isCE: true },
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
        label: 'Pituitary',
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
                  { name: 'CE_Injection', isCE: true },
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
                  { name: 'CE_Injection', isCE: true },
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
    label: 'Neck',
    groups: [
      {
        id: 'neck_routine',
        label: 'Routine',
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
                  { name: 'CE_Injection', isCE: true },
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
    label: 'Chest',
    groups: [
      {
        id: 'chest_routine',
        label: 'Routine',
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
    label: 'Breast',
    groups: [
      {
        id: 'breast_routine',
        label: 'Routine',
        variants: [
          {
            id: 'breast_routine_high_res',
            label: 'routine_BR18_high_res',
            presetId: 'breast_dynamic',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer' },
                  { name: 't2_fs_tse_tra' },
                  { name: 't1_tse_tra' },
                  { name: 'diffusion_resolve5_tra_fs' },
                  { name: 'CE_Injection', isCE: true },
                  { name: 'dynamic(pre)_vibe_fs_tra' },
                  { name: 'dynamic(90p)_vibe_fs_tra' },
                  { name: 't1_fs_vibe_sag_B' },
                  { name: 't1_fs_vibe_sag_L' },
                ],
              },
            ],
          },
          {
            id: 'breast_routine_dynamic',
            label: 'routine_BR18_dynamic',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer' },
                  { name: 't2_fs_tse_tra' },
                  { name: 't1_tse_tra' },
                  { name: 'diffusion_resolve5_tra_fs' },
                  { name: 'CE_Injection', isCE: true },
                  { name: 'dynamic(pre)_vibe_fs_tra' },
                  { name: 'dynamic(1st)_vibe_fs_tra' },
                  { name: 'dynamic(2nd)_vibe_fs_tra' },
                  { name: 'dynamic(3rd)_vibe_fs_tra' },
                  { name: 'dynamic(4th)_vibe_fs_tra' },
                  { name: 't1_fs_vibe_sag_B' },
                  { name: 't1_fs_vibe_sag_L' },
                ],
              },
            ],
          },
          {
            id: 'breast_routine_br18',
            label: 'routine_BR18',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer' },
                  { name: 't2_fs_tse_tra' },
                  { name: 't1_tse_tra' },
                  { name: 'CE_Injection', isCE: true },
                  { name: 'dynamic(pre)_vibe_fs_tra' },
                  { name: 'dynamic(90p)_vibe_fs_tra' },
                ],
              },
            ],
          },
          {
            id: 'breast_spine_body_high_res',
            label: 'routine_Spine_Body_high_res',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer' },
                  { name: 't2_fs_tse_tra' },
                  { name: 't1_tse_tra' },
                  { name: 'diffusion_resolve5_tra_fs' },
                  { name: 'CE_Injection', isCE: true },
                  { name: 'dynamic(pre)_vibe_fs_tra' },
                  { name: 'dynamic(90p)_vibe_fs_tra' },
                  { name: 't1_fs_vibe_sag_B' },
                  { name: 't1_fs_vibe_sag_L' },
                ],
              },
            ],
          },
          {
            id: 'breast_spine_body_dynamic',
            label: 'routine_Spine_Body_dynamic',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer' },
                  { name: 't2_fs_tse_tra' },
                  { name: 't1_tse_tra' },
                  { name: 'diffusion_resolve5_tra_fs' },
                  { name: 'CE_Injection', isCE: true },
                  { name: 'dynamic(pre)_vibe_fs_tra' },
                  { name: 'dynamic(1st)_vibe_fs_tra' },
                  { name: 'dynamic(2nd)_vibe_fs_tra' },
                  { name: 'dynamic(3rd)_vibe_fs_tra' },
                ],
              },
            ],
          },
          {
            id: 'breast_implant',
            label: 'Inplant',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer' },
                  { name: 't2_tse_tra' },
                  { name: 't2_fs_tse_tra' },
                  { name: 't1_tse_tra' },
                  { name: 't2_WAIR_tra', note: 'Water/fat-saturated STIR for implant' },
                  { name: 't2_STIR_tse_tra' },
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
    label: 'Abdomen',
    groups: [
      {
        id: 'abdomen_eob',
        label: 'EOB',
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
                  { name: 'CE_Injection', isCE: true },
                  { name: 'Care_Bolus', note: 'ABLE' },
                  { name: 'dynamic(30s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'dynamic(60s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'dynamic(120s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 't2_haste_FS_tra_bh' },
                  { name: 'diffusion_ep2d_tra_PACE' },
                  { name: '_15min_', isTimer: true, note: 'EOB hepatocyte phase wait' },
                  { name: 'dynamic(15min)_vibe_fs_tra_2mm' },
                  { name: 'dynamic(15min)_vibe_fs_cor_3mm' },
                  { name: 'dynamic(15min)_vibe_fs_sag_3mm' },
                ],
              },
            ],
          },
          {
            id: 'eob_dot_inhale',
            label: 'EOB_Dot_Inhale',
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
                  { name: 'dynamic(pre)_vibe_fs_tra_2mm', note: 'ABLE, inhale BH' },
                  { name: 'CE_Injection', isCE: true },
                  { name: 'Care_Bolus', note: 'ABLE' },
                  { name: 'dynamic(30s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'dynamic(60s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'dynamic(120s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: '_15min_', isTimer: true, note: 'EOB hepatocyte phase wait' },
                  { name: 'dynamic(15min)_vibe_fs_tra_2mm' },
                  { name: 'dynamic(15min)_vibe_fs_cor_3mm' },
                ],
              },
            ],
          },
          {
            id: 'eob_mrcp_dot_exhale',
            label: 'EOB+MRCP_Dot_Exhale',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer_bh' },
                  { name: 'localizer_haste_cor_bh' },
                  { name: 'Care_Bolus_position_haste_sag' },
                  { name: 'MRCP2d_rane_cor_bh_fs' },
                  { name: 't1_vibe_opp-In_tra_p4_bh', note: 'opposed/in-phase' },
                  { name: 't2_haste_tra_bh' },
                  { name: 'dynamic(pre)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'CE_Injection', isCE: true },
                  { name: 'Care_Bolus', note: 'ABLE' },
                  { name: 'dynamic(30s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'dynamic(60s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'dynamic(120s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'MRCP_HR_t2_space_cor_PACE' },
                  { name: 'diffusion_ep2d_tra_PACE_spair' },
                  { name: '_15min_', isTimer: true, note: 'EOB hepatocyte phase wait' },
                  { name: 'dynamic(15min)_vibe_fs_tra_2mm' },
                  { name: 'dynamic(15min)_vibe_fs_cor_3mm' },
                ],
              },
            ],
          },
          {
            id: 'eob_fbd',
            label: 'FBD',
            columns: [
              {
                label: 'Free Breath',
                sequences: [
                  { name: 'localizer' },
                  { name: 'localizer_haste_cor_RT' },
                  { name: 't1_starVIBE_opp_In_tra', note: 'Free breathing' },
                  { name: 't2_haste_tra_RT' },
                  { name: 't1_starVIBE_SPAIR_tra' },
                  { name: 'CE_Injection', isCE: true },
                  { name: 'Care_Bolus', note: 'ABLE' },
                  { name: 'dynamic(30s)_starVIBE_fs_tra' },
                  { name: 'dynamic(60s)_starVIBE_fs_tra' },
                  { name: 'dynamic(120s)_starVIBE_fs_tra' },
                  { name: '_15min_', isTimer: true, note: 'EOB hepatocyte phase wait' },
                  { name: 'dynamic(15min)_starVIBE_fs_tra' },
                ],
              },
            ],
          },
          {
            id: 'eob_dot_2mm',
            label: 'EOB_Dot_2mm',
            columns: [
              {
                label: '2mm',
                sequences: [
                  { name: 'localizer_bh' },
                  { name: 'localizer_haste_cor_bh' },
                  { name: 'Care_Bolus_position_haste_sag' },
                  { name: 't1_vibe_opp-In_tra_p4_bh' },
                  { name: 't2_haste_tra_bh' },
                  { name: 'dynamic(pre)_vibe_fs_tra_2mm', note: 'ABLE, 2mm slice' },
                  { name: 'CE_Injection', isCE: true },
                  { name: 'Care_Bolus', note: 'ABLE' },
                  { name: 'dynamic(30s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'dynamic(60s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'dynamic(120s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: '_15min_', isTimer: true, note: 'EOB hepatocyte phase wait' },
                  { name: 'dynamic(15min)_vibe_fs_tra_2mm' },
                ],
              },
            ],
          },
          {
            id: 'eob_dot_3mm',
            label: 'EOB_Dot_3mm',
            columns: [
              {
                label: '3mm',
                sequences: [
                  { name: 'localizer_bh' },
                  { name: 'localizer_haste_cor_bh' },
                  { name: 'Care_Bolus_position_haste_sag' },
                  { name: 't1_vibe_opp-In_tra_p4_bh' },
                  { name: 't2_haste_tra_bh' },
                  { name: 'dynamic(pre)_vibe_fs_tra_3mm', note: 'ABLE, 3mm slice' },
                  { name: 'CE_Injection', isCE: true },
                  { name: 'Care_Bolus', note: 'ABLE' },
                  { name: 'dynamic(30s)_vibe_fs_tra_3mm', note: 'ABLE' },
                  { name: 'dynamic(60s)_vibe_fs_tra_3mm', note: 'ABLE' },
                  { name: 'dynamic(120s)_vibe_fs_tra_3mm', note: 'ABLE' },
                  { name: '_15min_', isTimer: true, note: 'EOB hepatocyte phase wait' },
                  { name: 'dynamic(15min)_vibe_fs_tra_3mm' },
                  { name: 'dynamic(15min)_vibe_fs_cor_3mm' },
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
                label: 'Strategy',
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
          {
            id: 'mrcp_dynamic_2mm',
            label: 'MRCP+dynamic_2mm',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer_bh' },
                  { name: 'localizer_haste_cor_bh' },
                  { name: 'MRCP2d_rane_cor_bh_fs' },
                  { name: 't2_haste_tra_bh' },
                  { name: 't1_vibe_opp-In_tra_p4_bh' },
                  { name: 'dynamic(pre)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'CE_Injection', isCE: true },
                  { name: 'Care_Bolus', note: 'ABLE' },
                  { name: 'dynamic(30s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'dynamic(60s)_vibe_fs_tra_2mm', note: 'ABLE' },
                  { name: 'MRCP_HR_t2_space_cor_PACE' },
                  { name: 'diffusion_ep2d_tra_PACE_spair' },
                ],
              },
            ],
          },
          {
            id: 'mrcp_baby',
            label: 'Baby_MRCP',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer' },
                  { name: 'localizer_haste_cor' },
                  { name: 'MRCP2d_rane_cor_bh_fs' },
                  { name: 't2_haste_tra_bh' },
                  { name: 'MRCP_HR_t2_space_cor_PACE' },
                  { name: 'diffusion_ep2d_tra_PACE_spair' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'abdomen_renal',
        label: 'Renal',
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
        label: 'Liver',
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
                  { name: 'heavy_Dixon_tra_bh', note: 'Heavy Dixon' },
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
    label: 'Pelvis',
    groups: [
      {
        id: 'pelvis_male',
        label: 'Male (Prostate)',
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
                  { name: 'CE_Injection', isCE: true },
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
        label: 'Female (Uterus/Ovary)',
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
                  { name: 'CE_Injection', isCE: true },
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
        label: 'Rectum',
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
                  { name: 'CE_Injection', isCE: true },
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
        label: 'Bladder',
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
                  { name: 'CE_Injection', isCE: true },
                  { name: 'dynamic_vibe_fs_tra_bh' },
                  { name: 't1_tse_SHFL_fs_tra', note: 'SHFL=Shuffle' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'pelvis_joint',
        label: 'Joint',
        variants: [
          {
            id: 'pelvis_joint_routine',
            label: 'routine',
            presetId: 'hip_dixon',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer_trufi' },
                  { name: 't2_tse_DIXON_cor' },
                  { name: 't1_tse_cor' },
                  { name: 't2_tse_DIXON_tra' },
                  { name: 't2_tse_tra' },
                  { name: 'diffusion_stir_ep2d_tra' },
                  { name: 'CE_Injection', isCE: true },
                  { name: 'dynamic(pre)_t1_vibe_fs_tra_tset' },
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
  {
    id: 'spine',
    label: 'Spine',
    groups: [
      {
        id: 'spine_cervical',
        label: 'Cervical',
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
        id: 'spine_thoracic',
        label: 'Thoracic',
        variants: [
          {
            id: 't_spine_routine',
            label: 'routine',
            presetId: 'spine_c_qtse',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer_quiet' },
                  { name: 'localizer_haste_cor' },
                  { name: 'localizer_haste_sag' },
                  { name: 'T_t2_qtse_sag', note: 'quiet TSE' },
                  { name: 'T_t1_qtse_sag' },
                  { name: 'T_t2_qtse_tra' },
                  { name: 'option？', isDecision: true },
                  { name: 'T_t2_stir_qtse_sag', isOptional: true },
                  { name: 'T_t2_stir_qtse_cor', isOptional: true },
                  { name: 'T_t1_tse_DIXON_sag', isOptional: true },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'spine_lumbar',
        label: 'Lumbar',
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
        label: 'Whole Spine',
        variants: [
          {
            id: 'whole_spine',
            label: 'WholeSpine(C to L)',
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
            id: 'whole_spine_l_to_c',
            label: 'WholeSpine(L to C)',
            columns: [
              {
                label: 'Strategy',
                sequences: [
                  { name: 'localizer_bh' },
                  { name: 'localizer_haste_cor' },
                  { name: 'L_t1_tse_DIXON_sag' },
                  { name: 'L_t2_stir_qtse_sag' },
                  { name: 'T_t1_tse_DIXON_sag' },
                  { name: 'T_t2_stir_qtse_sag' },
                  { name: 'C_t1_tse_DIXON_sag' },
                  { name: 'C_t2_stir_qtse_sag' },
                  { name: 'L_t2_qtse_tra' },
                  { name: 'T_t2_qtse_tra' },
                  { name: 'C_t2_qtse_tra' },
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
    label: 'Joint',
    groups: [
      {
        id: 'joint_knee',
        label: 'Knee',
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
                  { name: 'diffusion_stir_ep2d_tra', note: 'Tumor assessment DWI' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'joint_shoulder',
        label: 'Shoulder',
        variants: [
          {
            id: 'shl_shoulder_dot',
            label: 'SHL_Shoulder_Dot_FOV180',
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
        label: 'Hip',
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
                  { name: 'CE_Injection', isCE: true },
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

  // ── 四肢 ─────────────────────────────────────────────────────────────────
  {
    id: 'extremity',
    label: '四肢',
    groups: [
      {
        id: 'wrist',
        label: '手関節',
        variants: [
          {
            id: 'wrist_pd_routine',
            label: 'TFCC/靭帯',
            presetId: 'wrist_pd',
            columns: [
              {
                label: 'Routine',
                sequences: [
                  { name: 'Localizer', duration: '0:20' },
                  { name: 'pd_tse_spair_cor', duration: '4:30', reason: 'TFCC主体・冠状断' },
                  { name: 'pd_tse_spair_sag', duration: '4:30', reason: '腱・靭帯矢状断' },
                  { name: 'pd_tse_spair_tra', duration: '3:30', reason: '横断面追加評価' },
                  { name: 't1_tse_cor', duration: '3:00', reason: '骨髄病変・骨折' },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'ankle',
        label: '足関節',
        variants: [
          {
            id: 'ankle_pd_routine',
            label: '腱・靭帯',
            presetId: 'ankle_pd',
            columns: [
              {
                label: 'Routine',
                sequences: [
                  { name: 'Localizer', duration: '0:20' },
                  { name: 'pd_tse_spair_sag', duration: '4:30', reason: 'アキレス腱全長・矢状断' },
                  { name: 'pd_tse_spair_cor', duration: '4:30', reason: '外側靭帯・冠状断' },
                  { name: 'pd_tse_spair_tra', duration: '3:30', reason: '腓骨筋腱・横断' },
                  { name: 't1_tse_cor', duration: '3:00', reason: '骨髄評価' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  // ── 頸部 ─────────────────────────────────────────────────────────────────
  {
    id: 'neck_extra',
    label: '頸部 拡張',
    groups: [
      {
        id: 'neck_tumor',
        label: '頸部腫瘤',
        variants: [
          {
            id: 'neck_lymph_routine',
            label: 'リンパ節',
            presetId: 'neck_lymph',
            columns: [
              {
                label: 'STIR+DWI',
                sequences: [
                  { name: 'Localizer', duration: '0:20' },
                  { name: 't2_stir_cor', duration: '5:00', reason: 'リンパ節全体像・STIR' },
                  { name: 't2_tse_tra', duration: '4:00', reason: '詳細解剖・横断' },
                  { name: 'dwi_bssfp_tra', duration: '6:00', reason: 'ADC低値: 悪性判定' },
                  { name: 'CE_Injection', isCE: true, reason: '造影追加時' },
                  { name: 't1_vibe_ce_tra', duration: '3:00', isOptional: true, isCE: true, reason: '造影T1 VIBE' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]
