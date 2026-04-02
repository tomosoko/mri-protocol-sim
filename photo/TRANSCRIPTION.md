# Siemens syngo MR 実機画像 文字起こし

## プロトコルツリー（左パネル）

### 部位一覧
- head: baby_MR_FOV180, Routine Dot, Meta_check, baby_HN_FOV180, robotic_HN_FOV220, GP_test, HPS, routine_3mm, routine, brachial_plexus, MRA_MRV, EarDetective
- neck: torque_3mm
- chest > routine
- breast: routine_BR18_high_res, routine_Spine_Body_high_res, Copy_of_routine_BR18_dynamic
- Abdomen: MRCP > routine_exhalated, L10B_Dot_Exhale, Renal > routine
- Pelvis: Male > Routine, Female > routine, bladder > routine, Joint > routine
- Joint: Knee > Knee_Dot (soft_tissue, routine), Shoulder > Slit_Shoulder_Dot_FOV180
- MRA
- WholeBody
- Heart
- spine: c-spine > routine, l-spine > routine, whole-spine > mist_check, CSF-leak, meta_check, brachial_plexus
- Angio_CE
- experiment
- SIEMENS TE
- Daily_Check

---

## タブ構造（Protocol Parameters）

### Routine タブ
**Part 1**:
- Slice Group: 1
- Slices: 22
- Distance Factor: 10%
- Position: L0.0 P60.0 H0.0
- Orientation: Transversal
- Phase Encoding Dir: A>>P
- Phase Oversampling: 0%
- FOV Read: 300mm
- FOV Phase: 75.0%
- Slice Thickness: 4.0mm
- TR: 600.0ms
- TE: 83.00ms
- Averages: 1
- Concatenations: 1
- AutoAlign

**Part 2**: (Sequence タブの Part2と共有?)
- Introduction
- Motion Correction: None

**Assistant**:
- SAR Assistant: Off
- Allowed Delay: 30s

### Contrast タブ
**Common サブタブ**:
- Dynamic Mode: Standard
- Measurements: (number)
- Multiple Series: Each Measurement

**Dynamic サブタブ**:
- TR: 600.0ms
- TE: 83.00ms
- MTC: checkbox (off)
- Dark Blood: checkbox (off)
- Flip Angle Mode: Constant
- Flip Angle: 120 deg
- Fat-Water Contrast: Standard
- Magn. Preparation: None
- Contrasts: 1
- Wrap-up Magn: Restore
- Reconstruction: Magnitude

### Resolution タブ
**Common サブタブ**:
- FOV Read: 300mm
- FOV Phase: 75.0%
- Slice Thickness: 4.0mm
- Base Resolution: 320
- Phase Resolution: 60%
- Interpolation: 1.00

**Acceleration サブタブ**:
- Acceleration Mode: GRAPPA
- Deep Resolve: Off
- Phase Partial Fourier: 4/8
- Reference Scans: GRE/Sep...
- Acceleration Factor PE: 2
- Reference Lines PE: 30

**Filter サブタブ**:
- Raw Filter
- Elliptical Filter
- Image Filter
- Normalize / Prescan
- Distortion Correction: 2D

### Geometry タブ
**Common サブタブ**:
- Slice Group: 1
- Slices: 22
- Distance Factor: 10%
- Position: L0.0 P60.0 H0.0
- Orientation: Transversal
- Phase Encoding Dir: A>>P
- Phase Oversampling: 0%
- FOV Read: 300mm
- FOV Phase: 75.0%
- Slice Thickness: 4.0mm
- TR: 600.0ms
- Multi Slice Mode: Single Shot
- Series: Interl. in B.A.
- Concatenations: 1

**AutoAlign サブタブ**:
- Initial Position: L0.0 P60.0 H0.0
- L: 0.0mm, P: 60.0mm, H: 0.0mm
- Initial Orientation: Transversal
- Initial Rotation: 0.00 deg

**Navigator サブタブ**:
- Navigator (設定画面のみ、パラメータ空)

**Saturation サブタブ**:
- Saturation Region: dropdown
- Special Saturation: Parallel F/H
- Gap: 10.00mm
- Thickness: 50.00mm

**Tim Planning Suite サブタブ**:
- Set-n-Go Protocol
- Inline Composing
- Table Position: H, 0mm

### System タブ
**Miscellaneous サブタブ**:
- Coil Selection: Auto Coil Select
- Coil Combination: Sum of Squares
- Radial Sorting: checkbox
- MSMA: S-C-T
- Sagittal: R>>L
- Coronal: A>>P
- Transversal: H>>F
- Matrix Optimization: Off
- Coil Focus: Flat

**Adjustments サブタブ**:
- Adjustment Strategy: Standard
- B0 Shim: Standard
- B1 Shim: TrueForm
- Adjustment Tolerance: Auto
- Adjust with Body Coil: checkbox
- Confirm Frequency: Never
- Assume Silicone: checkbox

**Adjust Volume サブタブ**:
- Position: L0.0 P60.0 H0.0
- Orientation: Transversal
- Rotation: 0.00 deg
- A>>P: 225mm
- R>>L: 300mm
- F>>H: 97mm
- Reset ボタン

**pTx サブタブ**:
- Transmitter
- Frequency 1H: 123.210470 MHz
- Image Scaling: 1.000
- Tx Ref [Nucleus]: Amplitude [V]
- ? Ref. Amplitude 1H: 0.000
- Receiver (別セクション)

**Tx/Rx サブタブ**:
- B1 Shim: TrueForm
- pTx Volume

### Physio タブ
**Signal サブタブ**: None選択時
- 1st Signal/Mode: None
- Concatenations: 1
- TR: 600.0ms

**Cardiac サブタブ**: (存在確認)

**PACE サブタブ**:
- FOV Read: 300mm
- FOV Phase: 75.0%
- Phase Resolution: 60%
- Fat-Water Contrast: Standard
- Magn. Preparation: None
- Dark Blood: checkbox
- Motion Correction: None

### Inline タブ
(画像からの直接確認なし - 機能は確認済み)

### Sequence タブ
**Part 1**: (メインシーケンスパラメータ)
**Part 2**:
- Introduction
- Motion Correction: None
**Assistant**:
- SAR Assistant: Off / Normal / Advanced
- Allowed Delay: 30s

---

## 実プロトコルリスト（部位別）

### Chest > routine
下部シーケンスキュー:
- diffusion_ep2d_tra_PACE (03:06) [option: yes]
- t2_fs_haste_tra_bh (00:15)
- t2_haste_tra_PACE (01:19)
- diffusion_ep2d_tra_RT (01:33) [option: yes]
- t2_haste_tra_RT (00:19)
- t2_fs_haste_tra_RT (00:19)

### Neck > torque_3mm
- Laser/Light_to_orbit
- localizer_TimCT_FirstView
- localizer_haste_sag
- t2_spc_DIXON_cor
- t1_tse_cor
- t2_tse_DIXON_tra
- t2_tse_tra
- t1_tse_DIXON_tra
- t2_tse_kugel5_tra_b0_200 (CE)
- t1_tse_DIXON_sag
- t1_tse_sag
- (Basic Decision)
- dynamic(pre)_t1_vibe_fs_tra_bh (CE)

### Head > baby_MR_FOV180 (2セクション)
**Routine セクション**:
- localizer (00:14)
- t2_spc_dark-fl_sag (01:23)
- t2_BLAde_dark-fl_tra_p2S_3i5 (02:46)
- (他多数のBLADE/fl系列)
- MRA_intracra_3d_TOL_2HR (04:24)
- 合計約10-15シーケンス

**BLADE セクション**: 
- (BLADE系列多数)

### Spine > c-spine > routine
- Laser (00:11)
- localizer (00:10)
- localizer_haste_sag (00:10)
- t2_stse_sag (02:46)
- t1_stse_sag (02:14)
- t1_tse_tra (02:27)
- t2_stse_tra (02:50)
- (Basic Decision → option: no)
- t2_stir_dtse_sag (02:38)
- L_t1_stse_tra (01:22)
- t1_tse_DIXON_cor (01:41)
- t2_STIR_cor (02:06)
- t2_stse_cor (01:36)
- t1_tse_DIXON_sag (01:41)
- t1_tse_DIXON_cor (01:59)
- t1_tse_cor (01:45)

### Spine > l-spine > routine
- localizer_quiet
- localizer_haste_cor
- localizer_haste_sag
- t2_stse_cor
- t1_stse_sag
- t2_stse_sag
- t2_stse_tra
- (option: no)
- (option: yes → 追加シーケンス)
- t2_stir_dtse_sag
- L_t1_stse_tra
- t2_tse_tra
- t1_tse_DIXON_cor
- t1_tse_DIXON_sag

### Spine > whole-spine > mist_check
- Laser/Light_to_orbit (00:19)
- localizer_TimCT_FirstView (00:16)
- localizer_haste_cor
- C_t1_tse_DIXON_sag
- C_t2_shr_stse_sag
- T_t1_tse_DIXON_sag
- T_t2_shr_stse_sag
- L_t1_tse_DIXON_sag
- L_t2_shr_stse_sag
- C_space
- T_t2_stse_tra
- L_t2_stse_tra (CE)
- (Basic Decision)
- C_t1_stse_tra
- T_t1_stse_tra

### Abdomen > MRCP > routine_exhalated
- localizer_bh (00:16)
- localizer_haste_cor_bh_fs
- MRCP24_haste_rane_cor... (00:05)
- t2_haste_rane_cor... (00:15)
- t1_starVIBE_opp... (00:15)
- t2_fs_dixon_tra_p4_bh (00:14)
- MRCP_HR_t2_space_cor_PACE (02:54)
- diffusion_ep2d_... (02:33)
- MRCP24_state_cor_bh_fs (00:15)
- t2_haste_state_cor_RT (00:23)
- (Basic Decision → option)
- diffusion (00:30)
- t2_haste_tra_bh
- diffusion_ep2d_tra_PACE_wip (02:40)
- MRCP_HR_t2_space... (02:07)

### Abdomen > Renal > routine
上段:
- localizer_bt (00:18)
- localizer_haste_cor_RT (00:12)
- t2_haste_tra_bh (00:16)
- t1_starVIBE_opp_tra_bh (01:29)
- diffusion_ep2d_tra_PACE (02:18)
- t2_haste_cor_bh_port (00:18)
- localizer_haste_cor_port (01:21)
- NATIVE_trufi_renal_tra_RESP (00:23)
- (CE → Basic Decision)

下段:
- localizer_bh (00:15)
- localizer_haste_cor_bh (00:16)
- t2_haste_tra_bh (00:19)
- t1_vibe_opp_tra_p4_bh (00:14)
- diffusion_ep2d_tra_PACE (00:13)
- t2_tse_cor_bh_osp_lipoF (00:48)
- t1_vibe_cor_bh_osp_lipof (00:12)
- (option → Basic Decision)
- localizer_haste_cor_bh
- NATIVE_trufi_renal_tra_bh
- trufi_3D_renal... (00:18)
- t2_tse_tra_bh (00:23, 00:20, 00:19)

### Pelvis > Male > Routine
上段:
- localizer/localizer (00:14)
- localizer_haste_sag (00:17)
- t2_tse_tra (02:03)
- t2_tse_sag (02:28)
- t1_tse_SPAIR_tra (02:30)
- diffusion_ep2d_tra (02:00)
- diffusion_ep2d_tra_b0_1500 (02:07)
- t2_tse_500_cor (01:53)
- t2_tse_sag (01:58)
- CE injection (05:24)
- dynamic_rush_vibe_fs_tra
- t1_tse_sag_fs (02:17)
- t1_tse_cor_fs (02:49)
- (Basic Decision)

下段:
- localizer_haste_sag (00:14)
- t2_tse_tra (00:17)
- t2_tse_SPAIR_tra (02:03)
- diffusion_ep2d_tra (02:30)
- t2_tse_sag (02:00)
- injection
- option (diffusion_ep2d_tra_b0_1500)

### Pelvis > Female > routine
- t2_tse_tra (02:28)
- t2_tse_sag (02:09)
- t1_tse_tra (01:36)
- t2_tse_fs_tra_sag (01:28)
- diffusion_ep2d_tra (02:12)
- injection (02:30)
- dynamic(dyn)_vibe_fs (01:51)
- t1_tse_fs_tse (01:44)
- t1_fs_tse_cor (01:58)
- t1_starVIBE_fs_cor (02:28)
- _option_
- t2_tse_del (02:30)
- t2_tse_sag (02:12)
- t2_fast_blade_tra (01:47)
- t2_fast_blade_tra (02:26)
- t2stir_ep2d_tra (02:17)

### Pelvis > bladder > routine
- localizer/localizer (02:14)
- localizer_haste_tra (00:17)
- t2_tse_cor (01:42)
- t2_tse_tra (02:12)
- t2_tse_sag (01:42)
- t1_tse_SPAIR_tra (02:01)
- diffusion_ep2d_tra_b0_1500 (02:01)
- t2_tse_sag (01:40)
- CE injection (02:17)
- (Basic Decision)
- dynamic_vibe_fs_tra_bh (option: yes → 00:24)
- t1_tse_SHFL_fs_tra (02:17)
- t1_tse_SHFL_fs... (02:01, 02:24)

### Pelvis > Joint > routine (IMG_9517)
上段 (pre-CE):
- dynamic(pre)_t1_vibe_fs_tra_tset (00:21)
- CE
- dynamic_t1_vibe_fs_tra (03:14) ×3
- t1_tse_DIXON_cor (02:03) ×1
- t1_tse_DIXON_tra (03:02) ×2
- option (no)

下段 (option: yes):
- localizer_haste_tra (00:13)
- t2_tse_tra (01:47) ×2
- t2_stir_tse_tra (03:44)
- t2_tse_cor (02:00) ×2
- t2_tse_stir_cor (02:00)
- t1_tse_DIXON_cor (01:59)
- t2_BLADE_tra (02:42)
- t2_fs_BLADE_tra (03:54)
- pd_BLADE_tra_320 (04:12)
- pd_BLADE_fs_tra_320 (05:15)

### Joint > Knee > Knee_Dot
**soft_tissue セクション**:
- AANotes_scout_15ch
- localizer_trufi_tra
- localizer_tse_DIXON_cor
- t2_tse_cor
- t1_tse_sag
- t2_tse_DIXON_sag
- t2_tse_tra
- t2_tse_DIXON_tra
- diffusion_stir_ep2d_tra (option)
- (Basic Decision)
- t2_tse_cor (option: yes)
- t2_tse_DIXON_cor (option: no)

**routine セクション**:
- AANotes_scout_15ch (00:13)
- Arthritis_scout (00:08)
- pd_tse_tse_cor
- pd_fs_tse_cor
- t2_tse_cor
- pd_tse_sag
- pd_fs_tse_360
- pd_tse_360
- (Basic Decision → option)
- localizer_haste_trufi_tra
- t1_tse_cor
- t4_tse_cor

### Joint > Shoulder > Slit_Shoulder_Dot_FOV180
上段:
- t1_muscle_sag (01:54)
- t2_5_BLADE_sag_320 (01:54)
- pd_BLADE_tra_320 (03:21)
- t2star_medic_tra (01:11)
- pd_fs_flexion_tse_cor (03:20)
- pd_tse_cor (02:18)
- t2_fs_tse_cor (02:18)
- t2_tse_cor (02:18)
- t2_fs_tse_tra (01:53)
- pd_t1_tse_Rotation_tra (02:53)
- t2_tse_tra (01:57)
- t2_Ax_tse_360 (01:07)
- t2_tse_360 (01:47)
- diffusion_ep2d_tra (02:02, 02:55)

下段 (post-CE):
- dynamic(pre)_t1_vibe_fs_tra_bh (00:21)
- CE
- (Basic Decision)
- dynamic_t1_vibe_fs_tra (03:14) ×3
- t1_tse_DIXON_cor (02:03) ×1
- t1_tse_DIXON_tra (03:02) ×2
- t1_musde_tra
- t1_musde_sag
- t2_BLADE_tra_320
- BLADE_tra_320
- t2star_medic_tra_256

### Breast > routine_BR18_high_res
- localizer (00:19)
- t2_fs_tse_tra (01:40)
- diffusion_resolve5_tra_fs (03:28)
- injection
- dynamic(pre)_vibe_fs_tra (01:30)
- dynamic(90p)_vibe_fs_tra (02:00)
- t1_fs_vibe_sag_B (02:06)
- t1_fs_vibe_sag_L
- dynamic5(Omit)_vibe_fs (01:30)
- _option_
- t2_stir_tse_fs (02:01)
- t2_stir_tse_fs_tra (03:06)
- diffusion_resolve5_tra_fs (03:28)
- DixonVibe... (02:52)

---

## ステータスバー
- 15 sec | Auto | Ω 2 | ⊘ 0.9×0.9×4.0 mm² | ↑ 1.00

※ 左から: スキャン時間 | トリガーモード | コイル素子数 | ボクセルサイズ | テーブル位置?
