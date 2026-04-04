import { useState } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import { presets } from '../data/presets'
import { ChevronRight } from 'lucide-react'

// ────────────────────────────────────────────────────────────────────────────
// 臨床的適応 データベース
// ────────────────────────────────────────────────────────────────────────────

interface ProtocolRecommendation {
  presetId: string
  priority: 'essential' | 'recommended' | 'optional'
  reason: string
  clinicalNote?: string
}

interface ClinicalIndication {
  id: string
  label: string
  icon: string
  recommendations: ProtocolRecommendation[]
  urgency?: 'stat' | 'urgent' | 'routine'
  contraindications?: string[]
  clinicalPearl?: string
}

interface BodyPartData {
  id: string
  label: string
  icon: string
  indications: ClinicalIndication[]
}

const CLINICAL_DB: BodyPartData[] = [
  {
    id: 'brain', label: '頭部', icon: '🧠',
    indications: [
      {
        id: 'stroke_acute', label: '急性脳梗塞（発症6h以内）', icon: '⚡', urgency: 'stat',
        clinicalPearl: 'DWI は発症2時間以内から検出可能。t-PA適応判断に必須。',
        recommendations: [
          { presetId: 'brain_dwi', priority: 'essential', reason: '超急性期梗塞の第一選択。ADC低下で確定', clinicalNote: 'b=1000で高信号 + ADC低下' },
          { presetId: 'brain_flair', priority: 'essential', reason: '発症6h以降はFLAIRで高信号化。DWI/FLAIRミスマッチで治療適応判断' },
          { presetId: 'brain_t2', priority: 'recommended', reason: '浮腫の経時的評価。T2高信号は数時間後から出現' },
          { presetId: 'brain_tof_mra', priority: 'recommended', reason: '閉塞血管の同定。再開通確認にも有用' },
        ],
        contraindications: ['造影剤: 超急性期は不要（非造影で十分）'],
      },
      {
        id: 'ms', label: 'MS / 白質病変', icon: '🔵', urgency: 'routine',
        clinicalPearl: 'マクドナルド基準: 空間的・時間的多発性の証明。Dawson finger（脳梁垂直病変）が特徴的。',
        recommendations: [
          { presetId: 'brain_flair', priority: 'essential', reason: '白質病変の描出に最も感度が高い。脳室周囲・皮質下・テント下を確認', clinicalNote: 'T2 FLAIR で高信号病変' },
          { presetId: 'brain_t2', priority: 'essential', reason: '後頭蓋窩・脳幹の病変はFLAIRより T2 TSE が優れる' },
          { presetId: 'brain_dwi', priority: 'recommended', reason: '急性病変（T2/FLAIR低下・DWI高信号）の同定。活動性の指標' },
          { presetId: 'brain_space', priority: 'recommended', reason: '3D等方性取得。MPR再構成で全方向評価可能' },
        ],
      },
      {
        id: 'tumor', label: '脳腫瘍 / 転移', icon: '🔴', urgency: 'urgent',
        clinicalPearl: 'Gd造影はBBB破綻部位を描出。転移は造影T1で最もよく見える（ring enhancement）。',
        recommendations: [
          { presetId: 'brain_flair', priority: 'essential', reason: '腫瘍・周囲浮腫の範囲評価。術前計画に必須' },
          { presetId: 'brain_t2', priority: 'essential', reason: '解剖学的詳細。腫瘍内部構造（嚢胞・壊死）の評価' },
          { presetId: 'brain_dwi', priority: 'recommended', reason: '細胞密度高い腫瘍（リンパ腫・高悪性度）でADC低下', clinicalNote: 'ADC低値=高悪性度' },
          { presetId: 'brain_space', priority: 'optional', reason: '3D高分解能で転移の同定率向上（1mm isotropic）' },
        ],
      },
      {
        id: 'hemorrhage', label: '頭蓋内出血', icon: '🩸', urgency: 'stat',
        clinicalPearl: '出血の MRI 経時変化: 超急性期は T2*/GRE で検出可能。慢性期ヘモジデリンは T2* 低信号。',
        recommendations: [
          { presetId: 'brain_dwi', priority: 'essential', reason: '急性期出血（T1高信号 + DWI高信号）の早期検出' },
          { presetId: 'brain_t2', priority: 'essential', reason: '血腫の経時的変化追跡。周囲浮腫評価' },
          { presetId: 'brain_flair', priority: 'recommended', reason: 'SAH（クモ膜下出血）の検出に有効' },
          { presetId: 'brain_tof_mra', priority: 'recommended', reason: '動脈瘤・AVM（血管奇形）のスクリーニング' },
        ],
      },
      {
        id: 'epilepsy', label: 'てんかん / 焦点評価', icon: '⚡', urgency: 'urgent',
        clinicalPearl: '海馬硬化はてんかんの最多原因。T2/FLAIR高信号 + 萎縮 + T1低信号の三徴。',
        recommendations: [
          { presetId: 'brain_flair', priority: 'essential', reason: '海馬・皮質dysplasiaのT2/FLAIR高信号。高分解能で海馬内部構造評価' },
          { presetId: 'brain_space', priority: 'essential', reason: '3D高分解能で皮質病変・海馬萎縮を精密評価', clinicalNote: '1mm isotropic でMPR再構成' },
          { presetId: 'brain_t2', priority: 'recommended', reason: '皮質・白質病変の追加評価' },
        ],
      },
      {
        id: 'brain_mets', label: '脳転移 / 造影精査', icon: '💉', urgency: 'urgent',
        clinicalPearl: '造影 MPRAGE (3D T1) は小転移の検出率が最高。Ring enhancement + 中心壊死が特徴的。',
        recommendations: [
          { presetId: 'brain_t1_gd', priority: 'essential', reason: '造影T1 MPRAGE: 転移の同定・境界描出・血液脳関門破綻', clinicalNote: '小さい転移は3Tで感度向上' },
          { presetId: 'brain_flair', priority: 'essential', reason: '周囲浮腫の範囲評価。水頭症の確認' },
          { presetId: 'brain_dwi', priority: 'recommended', reason: 'ADC低値 = 高細胞密度 (リンパ腫との鑑別)' },
        ],
      },
      {
        id: 'micro_hemorrhage', label: '脳微小出血 / vSWI', icon: '🩸', urgency: 'routine',
        clinicalPearl: 'SWI はヘモジデリン・静脈・カルシウムを磁化率コントラストで描出。GRE より感度が高い。',
        recommendations: [
          { presetId: 'brain_swi', priority: 'essential', reason: 'SWI: 微小出血・血管奇形・海綿状血管腫の検出', clinicalNote: '3T 高磁場でより鮮明' },
          { presetId: 'brain_t2', priority: 'recommended', reason: '浮腫・構造的異常の評価' },
        ],
      },
    ],
  },

  {
    id: 'abdomen', label: '腹部', icon: '🫁',
    indications: [
      {
        id: 'liver_screening', label: '肝臓スクリーニング', icon: '🟤', urgency: 'routine',
        clinicalPearl: '肝特異性造影剤 (EOB/Primovist) は肝細胞相で転移・HCC を高感度検出。',
        recommendations: [
          { presetId: 'abdomen_t2_bh', priority: 'essential', reason: '肝実質の基本評価。T2高信号=嚢胞・血管腫' },
          { presetId: 'liver_eob', priority: 'recommended', reason: 'EOB造影ダイナミック+肝細胞相。HCC・転移の同定', clinicalNote: '肝細胞相（20分後）で転移は低信号' },
          { presetId: 'liver_opp_in', priority: 'recommended', reason: 'Opposed/In-phase: 脂肪肝定量・副腎腺腫の確定診断' },
          { presetId: 'abdomen_dwi', priority: 'recommended', reason: '悪性腫瘍・炎症: ADC低下。転移・HCC の補完評価' },
        ],
      },
      {
        id: 'biliary', label: '胆道・膵管病変', icon: '🟡', urgency: 'urgent',
        clinicalPearl: 'MRCP は胆汁・膵液を高信号で描出。ERCP の前検査として広く使用。',
        recommendations: [
          { presetId: 'mrcp', priority: 'essential', reason: '厚スラブMRCP: 胆管・膵管の全体像把握', clinicalNote: '重T2でTE≥700ms必須' },
          { presetId: 'mrcp_3d', priority: 'recommended', reason: '3D SPACE MRCP: 高分解能で狭窄・拡張部位の精密評価' },
          { presetId: 'abdomen_t2_bh', priority: 'recommended', reason: 'T2 HASTE: 実質評価・結石（T2低信号）の確認' },
        ],
      },
      {
        id: 'bowel', label: '小腸 / 大腸炎症', icon: '🟠', urgency: 'urgent',
        clinicalPearl: 'Crohn病の MRエンテログラフィ: PACE呼吸同期DWIで炎症部位の活動性評価。',
        recommendations: [
          { presetId: 'abdomen_t2_rt', priority: 'essential', reason: 'T2 HASTE RT: 腸管壁の浮腫・炎症評価' },
          { presetId: 'abdomen_dwi', priority: 'essential', reason: 'DWI: 活動性炎症・膿瘍はADC低下', clinicalNote: 'b=800でADC<1.4はcrohn活動性' },
        ],
      },
    ],
  },

  {
    id: 'pelvis', label: '骨盤', icon: '🦴',
    indications: [
      {
        id: 'prostate_pirads', label: '前立腺癌 (PI-RADS)', icon: '🔴', urgency: 'urgent',
        clinicalPearl: 'PI-RADS v2.1: T2+DWI+DCE が必須3要素。移行領域はT2主体、末梢帯はDWI主体。',
        recommendations: [
          { presetId: 'prostate_t2', priority: 'essential', reason: 'T2高分解能: 前立腺解剖・腫瘍局在の基本', clinicalNote: '3T, 薄スライス3mm, 3方向' },
          { presetId: 'prostate_dwi', priority: 'essential', reason: 'DWI+ADC: 末梢帯癌のADC低下が特徴的', clinicalNote: 'b≥1500推奨。ADC<900なら疑陽性' },
          { presetId: 'prostate_mpMRI', priority: 'recommended', reason: 'mpMRI プロトコル一式: T2+DWI+DCEの組み合わせ' },
        ],
        contraindications: ['1T以下の機器では診断精度が著しく低下'],
      },
      {
        id: 'uterus', label: '子宮 / 卵巣病変', icon: '🔵', urgency: 'urgent',
        recommendations: [
          { presetId: 'pelvis_female', priority: 'essential', reason: '子宮T2: 内膜・筋層・頸部の層別描出', clinicalNote: 'Junctional zoneの評価' },
          { presetId: 'abdomen_dwi', priority: 'recommended', reason: 'DWI: 子宮内膜癌・卵巣癌のADC低下' },
        ],
      },
      {
        id: 'rectal', label: '直腸癌局所評価', icon: '🟤', urgency: 'urgent',
        clinicalPearl: '直腸癌 MRF（直腸間膜筋膜）評価: T2 高分解能薄スライスが必須。MRF陰性=R0切除可能。',
        recommendations: [
          { presetId: 'pelvis_rectum', priority: 'essential', reason: '直腸癌専用高分解能T2: MRF距離・壁外静脈浸潤評価', clinicalNote: 'perpendicular slice to tumor' },
          { presetId: 'abdomen_dwi', priority: 'recommended', reason: 'DWI: リンパ節転移のADC低下による鑑別' },
        ],
      },
    ],
  },

  {
    id: 'msk', label: '筋骨格', icon: '🦴',
    indications: [
      {
        id: 'knee_meniscus', label: '膝 半月板・軟骨', icon: '🦵', urgency: 'routine',
        clinicalPearl: 'PD fat sat が半月板・軟骨描出の標準。矢状断は半月板前後角、冠状断は体部評価に最適。',
        recommendations: [
          { presetId: 'knee_pd', priority: 'essential', reason: 'PDw SPAIR: 半月板断裂・軟骨病変の標準', clinicalNote: '3方向（矢冠横）全て取得' },
          { presetId: 'knee_pd_3t', priority: 'recommended', reason: '3T 高分解能: 軟骨変性の早期検出に優れる' },
        ],
      },
      {
        id: 'spine_stenosis', label: '脊椎 脊柱管狭窄', icon: '🦴', urgency: 'urgent',
        clinicalPearl: 'T2矢状断で脊髄・馬尾圧迫の全体像。T2横断像で神経根圧迫の部位特定。',
        recommendations: [
          { presetId: 'spine_t2', priority: 'essential', reason: 'T2矢状断: 椎間板変性・脊柱管狭窄の標準評価' },
          { presetId: 'spine_l_qtse', priority: 'recommended', reason: 'quiet TSE: 3T腰椎。騒音軽減で患者快適性向上' },
          { presetId: 'spine_c_qtse', priority: 'recommended', reason: 'quiet TSE: 3T頸椎。変性・ヘルニアの精細評価' },
        ],
      },
      {
        id: 'shoulder_rotator', label: '肩 腱板損傷', icon: '💪', urgency: 'routine',
        clinicalPearl: 'BLADE は動きアーチファクトに強く、協力度が低い患者でも高品質画像を提供。',
        recommendations: [
          { presetId: 'shoulder_blade', priority: 'essential', reason: 'BLADE T2 SPAIR: 腱板・関節唇の描出。モーション頑健性あり' },
        ],
      },
    ],
  },

  {
    id: 'cardiac', label: '心臓', icon: '❤️',
    indications: [
      {
        id: 'cardiac_function', label: '心機能評価 (シネ)', icon: '💓', urgency: 'urgent',
        clinicalPearl: 'ECG トリガー + BH シネ で EF・壁運動を定量評価。トリガー遅延は拡張末期（RR×40%）。',
        recommendations: [
          { presetId: 'cardiac_cine', priority: 'essential', reason: 'Cine MRI: EF・壁運動・弁膜症の標準評価', clinicalNote: 'FA=60°, Fast gradient, 多フェーズ' },
        ],
        contraindications: ['ペースメーカー: 条件付きMR対応かを必ず確認'],
      },
      {
        id: 'renal_mra', label: '腎動脈 (非造影MRA)', icon: '🫘', urgency: 'routine',
        clinicalPearl: '非造影腎動脈MRA: 造影剤腎症リスク患者に最適。ECG + PACE で高品質取得。',
        recommendations: [
          { presetId: 'renal_native_mra', priority: 'essential', reason: 'TrueFISP MRA: ECGトリガー+PACE。腎動脈狭窄の非造影評価', clinicalNote: 'FA=70°, 4T TrueFISP' },
        ],
      },
      {
        id: 'myocardial_infarction', label: '心筋梗塞 (LGE評価)', icon: '💔', urgency: 'urgent',
        clinicalPearl: 'LGE は心筋の瘢痕・線維化を描出。梗塞巣は subendocardial → transmural パターン。TI を null point に合わせる。',
        recommendations: [
          { presetId: 'cardiac_lge', priority: 'essential', reason: '遅延造影IR GRE: 心筋瘢痕の金標準。TI=270-300ms (3T)', clinicalNote: '造影後10-20分が最適タイミング' },
          { presetId: 'cardiac_cine', priority: 'recommended', reason: 'Cine MRI: EF・壁運動異常 (局所収縮不全) の確認' },
          { presetId: 'cardiac_t2_stir', priority: 'optional', reason: 'T2 STIR: 急性浮腫（Area at risk）の描出' },
        ],
      },
      {
        id: 'cardiomyopathy', label: '心筋症 (組織評価)', icon: '❤️', urgency: 'urgent',
        clinicalPearl: 'HCM: 左室肥大+LGE中間層パターン。DCM: EF低下+LGE線状パターン (mid-wall)。',
        recommendations: [
          { presetId: 'cardiac_cine', priority: 'essential', reason: 'Cine: EF・壁厚・収縮パターンの定量評価' },
          { presetId: 'cardiac_lge', priority: 'essential', reason: 'LGE: 線維化・炎症のパターン識別' },
          { presetId: 'cardiac_t2_stir', priority: 'recommended', reason: 'T2 STIR: 心筋浮腫 (急性心筋炎との鑑別)' },
        ],
      },
    ],
  },

  {
    id: 'msk_extra', label: '四肢', icon: '🦵',
    indications: [
      {
        id: 'wrist_tfcc', label: '手関節 TFCC損傷', icon: '🤚', urgency: 'routine',
        clinicalPearl: 'TFCC（三角線維軟骨複合体）はFOV100mm、薄スライス≤2mmの高分解能が必須。Flex コイル使用。',
        recommendations: [
          { presetId: 'wrist_pd', priority: 'essential', reason: 'PDw SPAIR 高分解能: TFCC・手根靭帯の精細評価', clinicalNote: 'FOV100mm以下、3T推奨' },
        ],
      },
      {
        id: 'ankle_tendon', label: '足関節 腱・靭帯損傷', icon: '🦶', urgency: 'routine',
        clinicalPearl: 'アキレス腱は矢状断PDで全長評価。前距腓靭帯は横断・冠状断が必要。3方向必須。',
        recommendations: [
          { presetId: 'ankle_pd', priority: 'essential', reason: 'PDw SPAIR 3方向: アキレス腱・外側靭帯の描出' },
        ],
      },
      {
        id: 'hip_impingement', label: '股関節 FAI・関節唇', icon: '🦴', urgency: 'routine',
        clinicalPearl: 'FAI（大腿骨臼蓋インピンジメント）: 3D等方性PDで関節唇・軟骨を評価。直交MPRが有効。',
        recommendations: [
          { presetId: 'hip_labrum', priority: 'essential', reason: '3D PDw SPAIR: 関節唇・寛骨臼縁の精細評価', clinicalNote: 'MPR再構成で任意断面' },
          { presetId: 'hip_dixon', priority: 'recommended', reason: 'Dixon T1: 骨髄浮腫・壊死の評価' },
        ],
      },
    ],
  },

  // ── 血管 ───────────────────────────────────────────────────────────────────
  {
    id: 'vascular', label: '血管', icon: '🩸',
    indications: [
      {
        id: 'aortic_dissection', label: '大動脈解離', icon: '⚡', urgency: 'stat',
        clinicalPearl: 'Stanford分類: A型（上行大動脈含む）→外科的、B型（下行のみ）→内科的。DeBakey I/II/III。内膜フラップ+真腔/偽腔同定が必須。',
        recommendations: [
          { presetId: 'aorta_ce_mra', priority: 'essential', reason: 'CE-MRA: 解離範囲・分枝血管への影響評価。真腔/偽腔の同定', clinicalNote: '動脈相 + 平衡相でsubtractionも実施' },
          { presetId: 'abdomen_t2_bh', priority: 'recommended', reason: 'T2: 壁内血腫・心嚢液貯留・胸水の評価' },
        ],
      },
      {
        id: 'renal_htn', label: '腎血管性高血圧', icon: '🫀', urgency: 'urgent',
        clinicalPearl: '若年性高血圧や難治性高血圧に腎動脈狭窄を疑う。FMD（線維筋異形成）は若年女性に多い。',
        recommendations: [
          { presetId: 'renal_mra_ce', priority: 'essential', reason: '造影MRA: 腎動脈狭窄部位・程度の定量評価', clinicalNote: 'eGFR≥30 が条件。Bolus Tracking推奨' },
          { presetId: 'renal_native_mra', priority: 'recommended', reason: '非造影MRA: eGFR<30 または造影禁忌例', clinicalNote: 'ECG同期TrueFISP/QISS法' },
        ],
      },
      {
        id: 'pad', label: '末梢動脈疾患（PAD）', icon: '🦵', urgency: 'urgent',
        clinicalPearl: 'ABI（足首上腕血圧比）<0.9でPADを疑う。糖尿病・腎不全例ではMRAが適切（CTAのヨード使用回避）。',
        recommendations: [
          { presetId: 'peripheral_mra', priority: 'essential', reason: '3-Station CE-MRA: 腸骨〜膝窩〜下腿の全体評価', clinicalNote: '下腿先行法。静脈汚染防止が鍵' },
          { presetId: 'renal_native_mra', priority: 'optional', reason: '非造影bSSFP MRA: 腎不全例（eGFR<30）に対応' },
        ],
      },
    ],
  },
  // ── 腫瘍・全身 ──────────────────────────────────────────────────────────────
  {
    id: 'oncology', label: '腫瘍', icon: '🔬',
    indications: [
      {
        id: 'lymphoma_staging', label: '悪性リンパ腫（staging）', icon: '🩺', urgency: 'urgent',
        clinicalPearl: '全身DWI（WB-DWI）はPET代替スクリーニング。反転MIPで腫大リンパ節・骨髄浸潤を白点として可視化。',
        recommendations: [
          { presetId: 'whole_body_dwi', priority: 'essential', reason: 'WB-DWI: b=50/800 全身staging. 骨転移・リンパ節・腹膜播種', clinicalNote: 'Inverted MIP + ADC map を必ず作成' },
          { presetId: 'neck_lymph', priority: 'recommended', reason: '頸部リンパ節詳細: STIR+DWI+造影T1' },
        ],
      },
      {
        id: 'hcc_surveillance', label: 'HCC精査（Primovist）', icon: '🫀', urgency: 'urgent',
        clinicalPearl: 'LI-RADS分類: arterial hyperenhancement + washout + capsule → LR-5（HCC確定的）。肝細胞相での低信号もLR-5補助基準。',
        recommendations: [
          { presetId: 'liver_eob', priority: 'essential', reason: 'Primovist Dynamic + 肝細胞相: HCC/FNH/転移の鑑別', clinicalNote: '動脈相25-35s / 門脈相60s / 肝細胞相20min' },
          { presetId: 'abdomen_dwi', priority: 'recommended', reason: 'DWI: ADC低値(<1.0)でHCC支持。T2 shine-through鑑別' },
          { presetId: 'liver_hcc_ablation', priority: 'optional', reason: 'RFA後評価: 残存HCC（動脈相 nodule-in-nodule）' },
        ],
      },
      {
        id: 'pancreatic_mass', label: '膵腫瘤精査', icon: '🫁', urgency: 'urgent',
        clinicalPearl: 'MRCP+DWI+Dynamic CE の組み合わせが標準。膵実質相（35s）はNET検出に必須。',
        recommendations: [
          { presetId: 'pancreas_mri', priority: 'essential', reason: '膵臓 MRI: MRCP+T2+DWI+Dynamic CE。膵癌/NET/IPMN 鑑別', clinicalNote: '膵実質相(35s)でNET:高信号 / 膵癌:低信号' },
          { presetId: 'mrcp_3d', priority: 'recommended', reason: '3D MRCP: 膵管拡張・IPMN分枝型・胆管合流異常' },
        ],
      },
      {
        id: 'adrenal_adenoma', label: '副腎腫瘤鑑別', icon: '🧪', urgency: 'routine',
        clinicalPearl: 'Chemical Shift: SI比>20%低下 → 腺腫（脂質含有）。CT HU値<10 でも脂質リッチ腺腫と診断可能。',
        recommendations: [
          { presetId: 'adrenal_mri', priority: 'essential', reason: 'Dixon化学シフト（Opp/In-phase）: SI比>20%→腺腫。造影washout>40%→腺腫', clinicalNote: '1.5T: OP-TE 2.3ms / IP-TE 4.6ms' },
          { presetId: 'abdomen_dwi', priority: 'recommended', reason: 'DWI: 転移はADC低値。褐色細胞腫は非常に高ADC' },
        ],
      },
    ],
  },
  {
    id: 'special', label: '特殊・小児', icon: '⭐',
    indications: [
      {
        id: 'inner_ear', label: '内耳・聴神経腫瘍', icon: '👂', urgency: 'urgent',
        clinicalPearl: '3D CISS (0.4-0.5mm 等方性) が内耳道・蝸牛・半規管描出の標準。Gd造影で聴神経腫瘍の確定。',
        recommendations: [
          { presetId: 'inner_ear_ciss', priority: 'essential', reason: '3D CISS: 聴神経・内耳道の鮮明描出。0.4-0.5mm isotropic', clinicalNote: '薄スライスMPRで前庭神経・蝸牛神経を分離描出' },
          { presetId: 'brain_t2', priority: 'recommended', reason: 'T2 TSE: 全体解剖・周辺構造の把握' },
        ],
      },
      {
        id: 'fetal_mri', label: '胎児MRI', icon: '🤰', urgency: 'urgent',
        clinicalPearl: '胎児MRI: 超音波不明瞭例の補完。HASTEで高速取得必須。TE≤80ms短縮。SAR最小化。',
        recommendations: [
          { presetId: 'fetal_haste', priority: 'essential', reason: 'HASTE超高速: 胎動アーチファクト回避。脳・肺・腹部臓器', clinicalNote: '1.5T推奨(SAR↓)。造影剤禁忌' },
          { presetId: 'abdomen_t2_rt', priority: 'recommended', reason: '呼吸同期T2: 胎盤・子宮壁の詳細評価' },
        ],
        contraindications: ['Gd造影剤は胎盤通過するため禁忌', '1.5T推奨（3TはSAR増加）'],
      },
      {
        id: 'peripheral_mra', label: '下肢血管 MRA', icon: '🦿', urgency: 'urgent',
        clinicalPearl: '下肢MRA: 造影3D TOFまたは非造影bSSFP。体位変換なしでStation移動。糖尿病性ASO評価。',
        recommendations: [
          { presetId: 'lower_limb_mra', priority: 'essential', reason: '3D TOF-MRA: 下肢動脈閉塞・狭窄の全体像', clinicalNote: 'Station移動で大腿〜足底まで' },
          { presetId: 'renal_native_mra', priority: 'optional', reason: '非造影TrueFISP MRA: 腎不全例に適用可能' },
        ],
      },
      {
        id: 'pediatric_brain', label: '小児脳MRI', icon: '👶', urgency: 'urgent',
        clinicalPearl: '小児: 髄鞘化の評価に T1（早期）と T2（後期）が相補的。新生児では反転した信号パターン。',
        recommendations: [
          { presetId: 'pediatric_brain', priority: 'essential', reason: '小児専用プロトコル: 短スキャン時間・SAR最小化', clinicalNote: '3Tは3歳以上推奨。新生児は1.5T' },
          { presetId: 'brain_flair', priority: 'recommended', reason: 'FLAIR: 2歳以上で有用（それ以前は髄液=高信号で判読困難）' },
          { presetId: 'brain_dwi', priority: 'recommended', reason: 'DWI: 新生児低酸素性脳症・代謝疾患の初期変化' },
        ],
      },
    ],
  },
]

// priority カラー
const priorityStyle: Record<string, { bg: string; text: string; border: string; label: string }> = {
  essential: { bg: '#1a0505', text: '#fca5a5', border: '#7f1d1d', label: '必須' },
  recommended: { bg: '#1a1200', text: '#fcd34d', border: '#713f12', label: '推奨' },
  optional: { bg: '#0a0f1a', text: '#93c5fd', border: '#1e3a5f', label: '任意' },
}

const urgencyStyle: Record<string, { color: string; label: string }> = {
  stat: { color: '#ef4444', label: 'STAT' },
  urgent: { color: '#f59e0b', label: '緊急' },
  routine: { color: '#34d399', label: '通常' },
}

// ────────────────────────────────────────────────────────────────────────────
// コンポーネント
// ────────────────────────────────────────────────────────────────────────────

export function ClinicalIndicationPanel() {
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null)
  const [selectedIndication, setSelectedIndication] = useState<ClinicalIndication | null>(null)
  const { loadPreset } = useProtocolStore()

  const bodyPart = CLINICAL_DB.find(b => b.id === selectedBodyPart)

  return (
    <div className="flex flex-col h-full overflow-hidden text-xs" style={{ background: '#0a0a0a', color: '#c8ccd6' }}>
      {/* Header */}
      <div className="px-3 py-2 shrink-0" style={{ background: '#111', borderBottom: '1px solid #252525' }}>
        <div className="font-semibold" style={{ color: '#60a5fa' }}>Clinical Indication Selector</div>
        <div style={{ color: '#4b5563' }}>臨床課題からプロトコルを逆引き</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Body part selection */}
        {!selectedBodyPart && (
          <div className="p-3">
            <div className="text-xs mb-3" style={{ color: '#6b7280' }}>検査部位を選択</div>
            <div className="grid grid-cols-2 gap-2">
              {CLINICAL_DB.map(bp => (
                <button
                  key={bp.id}
                  onClick={() => { setSelectedBodyPart(bp.id); setSelectedIndication(null) }}
                  className="flex flex-col items-center justify-center p-3 rounded transition-colors"
                  style={{ background: '#151515', border: '1px solid #252525', gap: '4px' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#151515')}
                >
                  <span style={{ fontSize: '24px' }}>{bp.icon}</span>
                  <span style={{ color: '#e2e8f0', fontSize: '11px', fontWeight: 600 }}>{bp.label}</span>
                  <span style={{ color: '#4b5563', fontSize: '9px' }}>{bp.indications.length}種</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Indication selection */}
        {selectedBodyPart && !selectedIndication && bodyPart && (
          <div className="p-3">
            <button
              onClick={() => setSelectedBodyPart(null)}
              className="flex items-center gap-1 mb-3 text-xs"
              style={{ color: '#6b7280' }}
            >
              ← {bodyPart.icon} {bodyPart.label}
            </button>
            <div className="text-xs mb-2" style={{ color: '#6b7280' }}>臨床的適応を選択</div>
            <div className="space-y-1.5">
              {bodyPart.indications.map(ind => {
                const urg = ind.urgency ? urgencyStyle[ind.urgency] : null
                return (
                  <button
                    key={ind.id}
                    onClick={() => setSelectedIndication(ind)}
                    className="flex items-center justify-between w-full px-3 py-2 rounded transition-colors"
                    style={{ background: '#151515', border: '1px solid #252525', textAlign: 'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1e1e1e')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#151515')}
                  >
                    <div className="flex items-center gap-2">
                      <span>{ind.icon}</span>
                      <span style={{ color: '#e2e8f0', fontSize: '11px' }}>{ind.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {urg && (
                        <span className="px-1.5 py-0.5 rounded" style={{ background: urg.color + '20', color: urg.color, fontSize: '8px', border: `1px solid ${urg.color}40` }}>
                          {urg.label}
                        </span>
                      )}
                      <ChevronRight size={10} style={{ color: '#4b5563' }} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Protocol recommendations */}
        {selectedIndication && (
          <div className="p-3">
            <button
              onClick={() => setSelectedIndication(null)}
              className="flex items-center gap-1 mb-3 text-xs"
              style={{ color: '#6b7280' }}
            >
              ← {selectedIndication.icon} {selectedIndication.label}
            </button>

            {/* Urgency + Clinical pearl */}
            {selectedIndication.urgency && (
              <div className="mb-2 px-2 py-1 rounded" style={{
                background: urgencyStyle[selectedIndication.urgency].color + '15',
                border: `1px solid ${urgencyStyle[selectedIndication.urgency].color}40`,
              }}>
                <span style={{ color: urgencyStyle[selectedIndication.urgency].color, fontWeight: 600 }}>
                  {urgencyStyle[selectedIndication.urgency].label}
                </span>
              </div>
            )}

            {selectedIndication.clinicalPearl && (
              <div className="mb-3 p-2 rounded" style={{ background: '#0f172a', border: '1px solid #1e3a5f' }}>
                <div className="font-semibold mb-0.5" style={{ color: '#60a5fa', fontSize: '9px' }}>💡 Clinical Pearl</div>
                <div style={{ color: '#93c5fd', fontSize: '10px', lineHeight: '1.5' }}>
                  {selectedIndication.clinicalPearl}
                </div>
              </div>
            )}

            {/* Contraindications */}
            {selectedIndication.contraindications && (
              <div className="mb-3 p-2 rounded" style={{ background: '#1a0505', border: '1px solid #7f1d1d' }}>
                <div className="font-semibold mb-0.5" style={{ color: '#fca5a5', fontSize: '9px' }}>⚠ 禁忌・注意</div>
                {selectedIndication.contraindications.map((c, i) => (
                  <div key={i} style={{ color: '#fca5a5', fontSize: '10px' }}>• {c}</div>
                ))}
              </div>
            )}

            {/* Recommendations */}
            <div className="font-semibold mb-2" style={{ color: '#9ca3af' }}>推奨プロトコル順</div>
            <div className="space-y-2">
              {selectedIndication.recommendations.map((rec, i) => {
                const preset = presets.find(p => p.id === rec.presetId)
                const ps = priorityStyle[rec.priority]
                if (!preset) return null
                return (
                  <div key={rec.presetId} className="rounded overflow-hidden" style={{ border: `1px solid ${ps.border}` }}>
                    <div className="flex items-center justify-between px-2 py-1.5" style={{ background: ps.bg }}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs" style={{ color: '#4b5563' }}>{i + 1}</span>
                        <div>
                          <div className="font-semibold" style={{ color: '#e2e8f0', fontSize: '11px' }}>{preset.label}</div>
                          <div style={{ color: '#6b7280', fontSize: '9px' }}>{preset.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-1.5 py-0.5 rounded" style={{ background: ps.border + '40', color: ps.text, fontSize: '8px' }}>
                          {ps.label}
                        </span>
                        <button
                          onClick={() => loadPreset(rec.presetId)}
                          className="px-2 py-0.5 rounded transition-colors text-xs font-semibold"
                          style={{ background: '#1a2a1a', color: '#4ade80', border: '1px solid #166534' }}
                        >
                          Load
                        </button>
                      </div>
                    </div>
                    <div className="px-2 py-1.5" style={{ background: '#0a0a0a', borderTop: `1px solid ${ps.border}60` }}>
                      <div style={{ color: '#9ca3af', fontSize: '10px', lineHeight: '1.5' }}>{rec.reason}</div>
                      {rec.clinicalNote && (
                        <div className="mt-0.5 font-mono" style={{ color: '#60a5fa', fontSize: '9px' }}>
                          → {rec.clinicalNote}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
