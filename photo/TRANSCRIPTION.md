# Siemens syngo MR 実機画像 完全文字起こし（強化版）
# 機種: 3T | 造影剤: マグネスコープ(通常) + プリモビスト(EOB)

## プロトコルツリー（左パネル完全版）

### head
- brain
  - Routine Dot (標準/fast 2カラム)
  - Meta check (meta CE)
  - ear
- baby_HN_FOV180 (Routine/BLADE 2カラム)
- pedeatric_HN_FOV220
- CSF leak
- MRS
- Copy of routine Dot
- meniere/disease
- MRA_MRV
- orbit
- Pituitary
  - pituitary Dot (adult/body 2セクション)
  - pituitary
- hemangioma

### neck
- routine
- tongue 3mm
- brachial plexus
- ce MRA
- twistVIBE_TestBolus

### chest
- routine
- other

### breast
- routine_BR18_dynamic
- routine_BR18_high_res
- routine_BR18
- routine_Spine_Body_high_res
- routine_Spine_Body_dynamic
- ----old----
- routine_BR18_high_res (duplicate)
- routine_BR18_dynamic (duplicate)
- Copy_of_routine_BR18_dynamic
- test_routine_dynamic
- Inplant

### Abdomen
- E0B
  - EOB_Dot_Exhale
  - EOB_Dot_Inhale
  - EOB+MRCP_Dot_Exhale
  - FBD
  - EOB_Dot_2mm
  - EOB_Dot_3mm
  - Copy of EOB_Dot_Exhale
- MRCP
  - routine_exhalated (Strategy/Free Breath 2カラム)
  - MRCP+dynamic_2mm
  - Baby_MRCP
- Renal (routine/Free Breath 2カラム)
- Liver (Free Breath/Strategy 2カラム)

### Pelvis
- Male > Routine (plane/ce 2カラム)
- Female > routine
- bladder > routine
- rectum > routine
- Joint > routine

### Joint
- Knee > Knee_Dot (routine/soft tissue 2カラム)
- Shoulder > SHL_Shoulder_Dot_FOV180 (soft tissue/routine 2カラム)
- Hip > routine

### spine
- c-spine
  - routine (Strategy/右カラム 2版)
  - meta check
  - CSF-leak
  - brachial plexus
- t-spine
  - routine
  - meta check
  - CSF-leak
- l-spine
  - routine (Strategy/右カラム 2版)
  - meta check
  - CSF-leak
- whole-spine
  - WholeSpine(C to L)
  - WholeSpine(L to C)
  - Myelo
  - after EBP
- WholeSpine(C to L)_Set-n-Go

### その他
- MRA
- WholeBody (Myelo含む)
- Heart
- Angio_CE
- experiment
- SIEMENS TE
- Daily_Check

---

## タブ構造（Protocol Parameters）— t2_haste_tra_bh基準

### Routine タブ
**Part 1**: Slice Group=1, Slices=22, Distance Factor=10%, Position=L0.0 P60.0 H0.0, Orientation=Transversal, Phase Encoding Dir=A>>P, Phase Oversampling=0%, FOV Read=300mm, FOV Phase=75.0%, Slice Thickness=4.0mm, TR=600.0ms, TE=83.00ms, Averages=1, Concatenations=1, AutoAlign
**Part 2**: Introduction, Motion Correction=None
**Assistant**: SAR Assistant=Off/Normal/Advanced, Allowed Delay=30s

### Contrast タブ
**Common**: Dynamic Mode=Standard, Measurements=(n), Multiple Series=Each Measurement
**Dynamic**: TR=600.0ms, TE=83.00ms, MTC=off, Dark Blood=off, Flip Angle Mode=Constant, Flip Angle=120°, Fat-Water Contrast=Standard, Magn.Preparation=None, Contrasts=1, Wrap-up Magn=Restore, Reconstruction=Magnitude

### Resolution タブ
**Common**: FOV Read=300mm, FOV Phase=75.0%, Slice Thickness=4.0mm, Base Resolution=320, Phase Resolution=60%, Interpolation=1.00
**Acceleration**: Acceleration Mode=GRAPPA, Deep Resolve=Off, Phase Partial Fourier=4/8, Reference Scans=GRE/Sep, Acceleration Factor PE=2, Reference Lines PE=30
**Filter**: Raw Filter, Elliptical Filter, Image Filter, Normalize, Prescan, Distortion Correction=2D

### Geometry タブ
**Common**: (Routineと同じ位置情報) + Multi Slice Mode=Single Shot, Series=Interl. in B.A., Concatenations=1
**AutoAlign**: Initial Position/Orientation/Rotation設定
**Navigator**: Navigator設定
**Saturation**: Saturation Region, Special Saturation=Parallel F/H, Gap=10.00mm, Thickness=50.00mm
**Tim Planning Suite**: Set-n-Go Protocol, Inline Composing, Table Position=H 0mm

### System タブ
**Miscellaneous**: Coil Selection=Auto Coil Select, Coil Combination=Sum of Squares, Radial Sorting, MSMA=S-C-T, Sagittal=R>>L, Coronal=A>>P, Transversal=H>>F, Matrix Optimization=Off, Coil Focus=Flat
**Adjustments**: Adjustment Strategy=Standard, B0 Shim=Standard, B1 Shim=TrueForm, Adjustment Tolerance=Auto, Adjust with Body Coil, Confirm Frequency=Never, Assume Silicone
**Adjust Volume**: Position/Orientation/Rotation, A>>P=225mm, R>>L=300mm, F>>H=97mm
**pTx**: Transmitter Frequency 1H=123.210470 MHz, Image Scaling=1.000, Tx Ref Amplitude
**Tx/Rx**: B1 Shim=TrueForm, pTx Volume

### Physio タブ
**Signal**: 1st Signal/Mode=None, Concatenations=1, TR=600.0ms
**Cardiac**: (心電図同期設定)
**PACE**: Resp.Control=Breath-hold, FOV Read=300mm, FOV Phase=75.0%, Phase Resolution=60%, Fat-Water Contrast=Standard, Magn.Preparation=None, Dark Blood=off, Motion Correction=None

### Inline タブ
**Subtraction**: Subtract=off, StdDev=off, Measurements=1, Motion Correction=None, Save Original Images=on
**MIP**: MIP Sag/Cor/Tra/Time/Radial=各off, MPR Sag/Cor/Tra=各off, Save Original Images=on
**Composing**: Inline Composing設定

### Sequence タブ
**Part 1**: Sequence Name=hfl_sr, Dimension=2D, Bandwidth=558 Hz/Px, Echo Spacing=5.50ms, RF Pulse Type=Normal, Turbo Factor=144, Gradient Mode=Fast, Flow Compensation=Read
**Part 2**: Introduction, Motion Correction=None
**Assistant**: SAR Assistant, Allowed Delay

---

## 実プロトコル完全版（強化画像から解読）

### Head > brain > Routine Dot (2カラム: Routine / fast)
**Routine:**
1. AAHScout (00:14)
2. AutoAlign Scout
3. diffusion_ep2d_tra (00:59)
4. Head_MRA_ToF3d_p3 (05:02)
5. Neck_MRA_ToF3d_3slab (02:37)
6. t2_flair_tse_tra (02:40)
7. t2_tse_tra (01:44)
8. t1_se_tra (02:46)
9. t2star_fl2d_tra (01:22)
10. option (no) → Basic Decision
11. option (yes): diffusion_Resolve_tra (01:47)
12. (下部): ftse_t2_flair_tra

**fast版:** 各シーケンス名に_fast付与、t2star_R2d_tra_fast等

### Head > brain > Meta check (meta CE)
1. AAHScout (00:14)
2. AutoAlign Scout (02:10)
3. t1_se_tra (00:59)
4. -injection-
5. diffusion_ep2d_tra (02:00)
6. t2_flair_tse_tra_fast (00:56)
7. CE
8. t1_space_sag_15 (04:56)
9. MRI Planning
10. _option_
11. t1_space_sag系列 (複数)
12. MRA Assignment ×4 (03:02, 04:56, 03:18, 03:18)
13. t1_fs_fl3d_sag (02:10)
14. diffusion_ep2d_tra_fast (01:02)

### Head > brain > ear
**CE付き:** AAHScout → diffusion_ep2d_tra_fast → CI_Mar_3thr_3R_3mm系列 → t1/t2_Mar系列 → CI_space_sag_15 → FLAIR_3000c_3d_sag_2times系列
**plain:** 同様だがCEなし

### Head > baby_HN_FOV180 (2カラム: Routine / BLADE)
**Routine:** localizer_quiet → q5hd_tra(01:30) → t1_stse系列 → t2_sfl2d_tra_hemo → Head_MRA_ToF_3d_0.5mm → t1_space_sag_15 → MRA_petro_SAT(.) → t1_petro_tra → t1_fl2d_tra
**BLADE:** BLADE系列多数 + MRA_standby_tra_TOF_FA2_268 + diffusion_ep2d_tra

### Head > Pituitary > pituitary Dot (adult/body 2セクション)
**adult:** AAHScout → AutoAlign Scout → t2_spc_SPACE_3R_3mm → t1_spc系列 → dynamic/CE系列 → MRA_Planning
**body:** AAHScout → diffusion_ep2d系列 → CI_Mar系列

### Neck > neck > routine
1. LaserLight (00:11)
2. localizer_TimCT_FirstView (00:17)
3. localizer_haste_sag
4. t2_spc_DIXON_tra (02:24)
5. CI_spc_DIXON_tra
6. t1_tse_DIXON_cor (02:54)
7. t1_tse_cor
8. t1_tse_DIXON_tra
9. t2_tse_DIXON_tra
10. t2_tse_kugel5_tra_b0_200 (CE marker)
11. t1_tse_DIXON_sag
12. t1_tse_sag
13. CE: dynamic(pre)_t1_vibe_fs_tra_bh (00:21)
14. t1_tse_DIXON系列(post CE)
15. (MARE/MRV/TestBolus)

### Chest > chest > routine
1. localizer (00:15)
2. localizer_haste_cor (00:16)
3. localizer_haste_sag (00:08)
4. t2_BLADE
5. t2_haste_tra_bh (00:15)
6. t1_stse_tra_bh (00:16)
7. diffusion_mobiDiff5_tra_b0_700 (03:46)
8. t2_haste_cor_RT (00:19)
9. option (no) → Basic Decision
10. option (yes):
    - diffusion_ep2d_tra_PACE (03:06)
    - t2_fs_haste_tra_bh (00:15)
    - t2_haste_tra_PACE (01:19)
11. alt options:
    - diffusion_ep2d_tra_RT (01:33)
    - t2_haste_tra_RT (00:19)
    - t2_fs_haste_tra_RT (00:19)

### Breast > routine_BR18_high_res (FOV330)
1. localizer (00:19)
2. t2_fs_tse_tra (01:36)
3. t1_tse_tra
4. diffusion_resolve5_tra_fs (03:33)
5. injection
6. dynamic(pre)_vibe_fs_tra (01:30)
7. dynamic(90p)_vibe_fs_tra (06:04)
8. t1_fs_vibe_sag_B (02:00)
9. t1_fs_vibe_sag_L (02:00)
10. dynamic5(Omit)_vibe_fs
11. Basic Decision → option (yes):
    - diffusion_resolve5_tra_fs
    - t2_stir_tse_fs_tra
    - diffusion_tra_fs
    - MRS_...
    - DixonVibe (02:52)

### Spine > c-spine > routine (強化版解読)
**Strategy:**
1. LaserLight to orbit
2. localizer_TimCT_FastView (00:11)
3. localizer_haste_cor (00:10)
4. localizer_haste_sag (00:10)
5. t2_qtse_sag (02:14) ← **quiet TSE (3T)**
6. t1_qtse_sag (02:27) ← **quiet TSE**
7. t2_qtse_tra (02:50) ← **quiet TSE**
8. option (no) → Basic Decision
9. option (yes):
   - t2_qtse_cor (01:22)
   - t2_nSTIR_cor (01:22) ← **noise-optimized STIR**
   - t1_tse_DIXON_cor (01:41)
   - t1_tse_DIXON_sag (02:24)
   - t2_nSTIR_sag (02:06)
   - t2_tse_DIXON_sag (01:41)
   - t1_tse_DIXON_sag (02:36)

**右カラム:** Laser → localizer → t2_tse_s... → t2_STIR_cor → t2_SPAIR_cor → t2_STIR_sag → t1_tse_tra_W...

### Spine > l-spine > routine (強化版解読)
**Strategy:**
1. localizer_quiet (00:36) ← **quiet localizer**
2. localizer_haste_cor (00:14)
3. localizer_haste_sag (00:10)
4. L_t2_qtse_cor (01:56)
5. L_t2_qtse_sag (02:10)
6. L_t1_qtse_sag (02:20)
7. L_t2_tse_tra (03:04)
8. option (no) → Basic Decision
9. option (yes):
   - L_t2_stir_qtse_sag (02:38)
   - L_t2_stir_qtse_cor (02:33)
   - L_t1_stir_qtse_tra (?)
   - L_t1_tse_tra (01:06)
   - L_t2_tse_DIXON_cor (01:41)
   - L_t1_tse_DIXON_sag (01:59)
   - L_t2_tse_DIXON_sag (01:45)

### Spine > whole-spine > Strategy (強化版解読)
1. LaserLight to orbit
2. localizer_TimCT_FastView (00:19)
3. localizer_haste_cor (00:16)
4. C_t1_tse_DIXON_sag (01:12)
5. C_t2_stir_qtse_sag (01:40)
6. T_t1_tse_DIXON_sag (01:26)
7. T_t2_stir_qtse_sag (02:20)
8. L_t1_tse_DIXON_sag (01:39)
9. L_t2_stir_qtse_sag (02:20)
10. C_t2_qtse_tra (00:55)
11. T_t2_qtse_tra (00:55)
12. L_t2_qtse_tra (00:55)
13. CE (no) → Basic Decision
14. CE (yes):
    - C_t1_qtse_tra (00:46)
    - T_t1_qtse_tra (00:46)

### Spine > whole-spine > Myelo
1. LaserLight to orbit (00:17)
2. localizer_TimCT_FirstView (01:41)
3. t2_stir_stse_sag (02:33)
4. Myelo_t2_space_cor_spair_TE90 (01:41)
5. t2_stir_stse_sag (02:33)
6. Myelo_t2_space_cor_spair_TE90 (00:40)
7. t2_fs_stse_tra (00:54)
8. t2_fs_stse_tra (01:05)

### Abdomen > E0B > EOB_Dot_Exhale (強化版完全解読)
**2mm column:**
1. localizer_bh (00:16)
2. localizer_haste_cor_bh (00:16)
3. Care_Bolus_position_haste_sag ← **ボーラス追跡位置決め**
4. t1_vibe_opp-In_tra_p4_bh (00:15) ← **opposed/in-phase dual echo**
5. t2_haste_tra_bh (00:14)
6. dynamic(pre)_vibe_fs_tra_2mm (00:15) **ABLE**
7. injection
8. Care_Bolus (01:16) **ABLE** ← **自動ボーラス追跡**
9. dynamic(30s)_vibe_fs_tra_2mm (00:15) **ABLE**
10. dynamic(60s)_vibe_fs_tra_2mm (00:15) **ABLE**
11. dynamic(120s)_vibe_fs_tra_2mm (00:15) **ABLE**
12. t2_haste_FS_tra_bh
13. diffusion_ep2d_tra_PACE
14. **_15min_** ← **EOB肝細胞相待機タイマー**
15. dynamic(15min)_vibe_fs_tra_2mm (00:15)
16. dynamic(15min)_vibe_fs_cor_3mm (00:15)
17. dynamic(15min)_vibe_fs_sag_3mm (00:14)

### Abdomen > MRCP > routine_exhalated (強化版完全解読)
**Strategy (BH):**
1. localizer_bh (00:15)
2. localizer_haste_cor_bh (00:16)
3. MRCP2d_rane_cor_bh_fs (00:05) ← **2D MRCP厚スラブ**
4. t2_haste_tra_bh (00:14)
5. t1_vibe_dixon_tra_p4_bh (00:15)
6. t2_fs_haste_tra_bh (00:14)
7. MRCP_HR_t2_space_cor_PACE (02:54) ← **高分解能3D MRCP**
8. diffusion_ep2d_tra_PACE_spair (02:33)
9. MRCP2d_rane_cor_bh_fs (00:15)
10. t2_haste_cor_bh (00:23)
11. t2_haste_tra_bh (00:30)
12. option(no) → Basic Decision
13. option(yes): diffusion_ep2d_tra_PACE_wt (02:40), t2_space_tra_384 (02:07)

**Free Breath (RT):**
1. localizer (00:15)
2. localizer_haste_cor_RT (00:16)
3. MRCP2d_rane_cor_fs (00:05)
4. t2_haste_tra_RT (00:19)
5. t1_starVIBE_opp_In_tra (03:06)
6. t1_starVIBE_SPAIR_tra (01:36)
7. t2_fs_haste_tra_RT (00:48)
8. MRCP_HR_t2_space_cor_RT (02:04)
9. diffusion_ep2d_tra_RT (01:12)
10. MRCP2d_rane_cor_bh_fs (00:08)
11. t2_haste_cor_RT (00:19)
12. t2_haste_tra_RT (00:14)
13. option(yes): diffusion_ep2d_tra_PACE (02:13), MRCP_HR_t2_space_cor_PACE (02:54)

### Abdomen > Renal > routine (強化版解読)
**routine (BH):**
1. localizer (00:15)
2. localizer_haste_cor_bh (00:16)
3. t2_haste_tra_bh (00:19)
4. t1_vibe_opp-In_tra_p4_bh (00:14)
5. diffusion_ep2d_tra_PACE (02:13)
6. t2_tse_cor_bh (00:48)
7. t1_vibe_cor_bh_opp_In (00:12)
8. option → Basic Decision
9. option(yes): localizer_haste_cor_resp_trigger (00:18), NATIVE_trufi_renal_tra_RESP (00:23), trufi_3D_renal_tra_bh (00:20), t2_tse_tra_bh (00:19)

**Free Breath:**
1. (00:18)
2. localizer_haste_cor_RT (00:12)
3. t2_haste_tra_RT (00:16)
4. t1_starVIBE_opp_In_tra (01:29)
5. diffusion_ep2d_tra_PACE (02:18)
6. t2_haste_cor_RT (00:21)
7. t1_starVIBE_opp_In_cor (01:37)
8. NATIVE_trufi_renal_tra_RESP (00:23)
9. CE → Basic Decision

### Abdomen > Liver > routine (IMG_9504)
**Free Breath:**
1. localizer (00:15)
2. localizer_haste_cor_RT (00:16)
3. t2_haste_tra_RT (00:19)
4. t1_starVIBE_opp_tra (00:18)
5. t1_starVIBE_opp_tra_256 (02:44)
6. diffusion_ep2d_tra_PACE (01:56)
7. t2_haste_cor_RT (01:12)
8. t2_haste_sag_RT (00:19)
9. Basic Decision → diffusion_ep2d_tra_PACE

**Strategy (BH):**
1. localizer_bh (00:16)
2. localizer_haste_cor_bh (00:16)
3. t2_haste_tra_bh (00:19)
4. t1_vibe_opp_tra_p4_bh (00:14)
5. heavy_Dixon_tra_bh (00:18) ← **ヘビーDixon**
6. diffusion_ep2d_tra_PACE (02:13)
7. t2_haste_cor_bh (00:19)
8. t2_haste_sag_bh (00:19)
9. option(yes): t2_haste_cor_PACE, t2_fs_BLADE_tra_PACE_fast, t2_fs_tse_cor_PACE, trufi_cor_bh, trufi_3d_...

### Pelvis > Male > Routine (強化版解読, plane/CE 2カラム)
**plane:**
1. localizer (00:14)
2. localizer_haste_sag (00:17)
3. t2_tse_tra (02:03)
4. t2_tse_SPAIR_tra (02:30)
5. t1_tse_tra (02:00)
6. diffusion_ep2d_tra_b0_1500 (02:01) ← **高b値DWI**
7. t2_tse_sag (01:40)
8. t2_tse_SPAIR_cor (02:15)

**CE:**
1-8: planeと同様
9. dynamic(pre)_vibe_fs_tra (00:34)
10. injection
11. dynamic_vibe_fs_tra (02:17)
12. t1_tse_sag_fs (02:49)
13. t1_tse_cor_fs (02:49)
14. option(yes): diffusion_ep2d_tra_bh_1000 (02:38)

### Pelvis > Female > routine (IMG_9506/9507)
1. localizer (00:16)
2. localizer_haste_sag (00:17)
3. t2_tse_cor (02:26)
4. t2_tse_tra (02:28)
5. t1_tse_tra (02:09)
6. t2_tse_fs_tra (01:36)
7. diffusion_ep2d_tra (01:28)
8. t2_tse_sag (02:12)
9. dynamic(dyn)_vibe_fs (00:30)
10. injection
11. t1_tse_fs_tra (01:51)
12. t1_tse_fs_tse (01:44)
13. t1_fs_tse_cor (02:08)
14. t1_fs_tse_sag (02:08)
15. t1_starVIBE_fs_cor (02:30)
16. _option_: t2_tse_del, t2_fast_blade_tra, t2stir_ep2d_tra

### Pelvis > bladder > routine (IMG_9510)
1. localizer/localizer (02:14?)
2. localizer_haste_tra (00:17)
3. t2_tse_cor (01:42)
4. t2_tse_tra (02:12)
5. t2_tse_sag (01:42)
6. t1_tse_SPAIR_tra (02:01)
7. diffusion_ep2d_tra_b0_1500 (02:01)
8. t2_tse_sag (01:40)
9. CE injection (02:17)
10. Basic Decision → dynamic_vibe_fs_tra_bh (00:24)
11. t1_tse_SHFL_fs_tra (02:17)
12. t1_tse_SHFL_fs系列

### Pelvis > rectum > routine (IMG_9508/9509)
**pre-CE:**
1. localizer (00:14)
2. localizer_haste_sag (00:17)
3. localizer_haste_fs_tra (00:16)
4. localizer_haste_fs_cor (00:17)
5. t2_tse_fist_tse_DIXON_cor (02:29)
6. t2_tse_fist_tse_DIXON_sag (02:29)
7. t2_tse_spc_DIXON_tra (02:30)
8. t2_tse_ep2d_tra (01:35)
9. diffusion_... (02:12)
10. option → Basic Decision

**CE:**
11. diffusion_resolve5_tra_b0_800 (04:17)
12. t1_tse_fist_DIXON_tra (02:24)
13. t1_tse_fist_DIXON_cor (01:47)
14. t1_tse_lamor_cor_proonHF (01:47?)
15. dynamic(dyn)_vibe_fs → injection
16. t1_tse_DIXON_cor
17. t1_fs_tse_sag
18. t1_fs_BLADE_tra_320

### Joint > Hip > routine (IMG_9511)
1. localizer/localizer (00:13)
2. localizer_trufi_tra (00:09)
3. t2_tse_DIXON_cor (02:22)
4. t1_tse_cor (01:33)
5. t2_tse_DIXON_tra (02:44)
6. t2_tse_tra (01:57)
7. diffusion_stir_ep2d_tra (01:50)
8. CE → Basic Decision
9. dynamic(pre)_t1_vibe_fs_tra_tset (00:21)
10. dynamic系列_t1_vibe_fs (03:14)
11. t1_tse_DIXON_cor (02:03)
12. t1_tse_DIXON_tra (03:02)

### Joint > Knee > Knee_Dot (強化版, routine/soft tissue 2カラム)
**routine:**
1. AA...scout_15ch (00:13)
2. AutoAlign Scout
3. pd_tse_cor (02:20)
4. pd_fs_tse_cor (01:56)
5. t2_tse_cor (02:20)
6. pd_tse_sag (02:05)
7. pd_fs_tse_sag (01:49)
8. (02:07)
9. pd_fs_tse_tra (02:18)
10. Option → localizer_haste_tra (00:12), localizer_trufi_tra (00:16), t1_tse_cor (01:31), t1_tse_sag (01:57)

**soft tissue:**
1. AA...scout (00:13)
2. AutoAlign Scout
3. localizer_trufi/cor (00:16)
4. t2_tse_DIXON_cor (01:24)
5. t1_tse_cor (01:55)
6. t2_tse_DIXON_sag (01:39)
7. t1_tse_sag (02:27)
8. t2_tse_DIXON_tra (01:57)
9. t2_tse_tra (01:53)
10. diffusion_stir_ep2d_tra (02:01) ← **腫瘍評価用DWI**
11. Option → t2_tse_cor, t2_tse_DIXON_cor

### Joint > Shoulder > SHL_Shoulder_Dot_FOV180 (IMG_9513/9514/9515/9516)
**soft tissue:**
1. localizer_haste_cor (00:11)
2. localizer_haste_sag (00:11)
3. localizer_haste_tra (00:16)
4. localizer_trufi_sag (01:54)
5. t1_tse_cor (02:32)
6. t2_BLADE_cor_320 (02:26)
7. t2_fs_BLADE_sag_320 (02:26)
8. t2_BLADE_tra_320 (02:34)
9. t2_fs_BLADE_tra_320 (02:30)
10. t1_blade_sag (02:26)
11. t1_musde_tra (02:15)
12. option → Basic Decision

**routine:**
1. t2_BLADE_cor_320 (00:11)
2. localizer系列 (00:11, 00:16)
3. localizer_trufi_sag (01:54)
4. t1_tse_cor (02:32)
5. pd_BLADE_tra_320 (02:26)
6. pd_fs_BLADE系列
7. t2star_medic_tra (01:54)
8. pd_tse_cor
9. pd_fs_tse_cor (02:32)

**CE section:**
10. dynamic(pre)_t1_vibe_fs_tra_tset (00:21)
11. CE → Basic Decision
12. dynamic_t1_vibe_fs_tra (03:14)
13. t1_tse_DIXON_cor (02:03)
14. t1_tse_DIXON_tra (03:02)

### Pelvis > Joint > routine (IMG_9516/9517)
上段(pre-CE): localizer_trufi → t2_tse_DIXON_cor → t1_tse_cor → t2_tse_DIXON_tra → t2_tse_tra → diffusion_stir_ep2d_tra → CE → dynamic(pre)_t1_vibe_fs_tra_tset → DIXON系列
下段(option): t2_tse_tra ×2 → t2_stir_tse_tra → t2_tse_cor → t2_BLADE系列 → pd_BLADE系列

---

## 重要な3T特有シーケンス
- **qtse**: quiet TSE（低騒音TSE、3T脊椎で標準使用）
- **nSTIR**: noise-optimized STIR（低騒音STIR）
- **localizer_quiet**: 低騒音ロケーション
- **TrueForm**: B1 Shim方式（2ch送信でB1均一化）
- **ABLE**: Auto Bolus Logic Enhancement（自動造影タイミング）
- **Care_Bolus**: 自動ボーラス追跡撮影
- **RESOLVE**: readout-segmented EPI DWI（歪み低減）
- **starVIBE**: 放射状k空間VIBE（free-breathing対応）
- **BLADE/fblade**: 体動補正TSE（放射状k空間充填）
- **NATIVE_trufi**: 非造影MRA（TrueFISP）
- **mobiDiff**: motion-robust diffusion
- **kugel5**: 頸部用DWI variant (b=0,200)
- **SHFL**: ShuffLe（3D TSE高速化技術）

## 造影剤情報
- **マグネスコープ**（ガドテリドール/Gd-HP-DO3A）: 通常造影用。細胞外液性。
- **プリモビスト**（Gd-EOB-DTPA）: 肝特異性造影剤。EOBプロトコル用。15分後に肝細胞相。
