// シーケンス×体部位別 臨床データ
// なぜそのシーケンスがプロトコルに入っているか、何を見るのか

export interface SeqClinical {
  reason: string       // 1行の目的
  clinical: string     // なぜこのプロトコルに入っているか
  findings?: string    // 主要病態の典型所見
  params?: string      // 重要パラメータのポイント
}

export function getSeqClinical(name: string, bodyPartId: string | null): SeqClinical {
  const n = name.toLowerCase()
  const bp = bodyPartId ?? ''

  // ====== スカウト・位置決め ======
  if (n.includes('aahscout') || n.includes('aahead')) return {
    reason: '3軸自動スカウト撮像',
    clinical: 'Siemensの自動ポジショニングシステム（AAHead Scout）が解剖学的ランドマークを自動検出し、最適なスライス位置・方向を決定する。頭部ではAC-PC lineへの自動アライメントに使用。',
    params: '超短時間（~20秒）・低分解能。診断には使用しない。'
  }
  if (n.includes('autoalign')) return {
    reason: '解剖学的ランドマーク検出→スライス最適化',
    clinical: 'AutoAlignはニューラルネットワークで解剖ランドマークを認識し、スライス位置・傾きを自動設定する。頭部では前頭蓋底平行、膝では骨軸に平行なスライスを自動設定→検査間再現性↑。',
    params: '頭部: 眼窩耳孔線(OML)基準｜膝: 大腿骨縦軸基準'
  }
  if (n.includes('laserlight')) return {
    reason: 'レーザーポジショニングライン確認',
    clinical: 'テーブル位置の確認。ランドマークに合わせた位置決めのスタート地点。',
  }
  if (n.includes('localizer') || n.includes('scout')) return {
    reason: '位置決め・スカウト撮像',
    clinical: bp === 'head'
      ? '頭部の3方向スカウト。その後の全シーケンスの位置決め基準となる。AC-PC lineに平行なアキシャルスライスを設定するために必須。'
      : bp === 'abdomen' || bp === 'breast'
      ? '腹部全体を把握するための広視野スカウト。胆嚢・膵臓・肝臓の位置と呼吸状態を確認。息止め能力の事前チェックも兼ねる。'
      : bp === 'chest'
      ? '胸部全体像把握。縦隔・肺・心臓の位置確認。HASTE冠状断で全体像を素早く把握。'
      : bp === 'spine'
      ? '脊椎全体の矢状断スカウト。撮像対象の椎体レベルを確認し、スライス範囲を決定する。'
      : bp === 'joint' || bp === 'pelvis'
      ? '関節・骨盤の3方向スカウト。撮像計画の基準となる解剖学的ランドマークを確認。'
      : '位置決め撮像。全シーケンスの基準となる。',
  }

  // ====== 造影剤・タイマー ======
  if (n.includes('ce注射') || n.includes('造影注射') || n.includes('ce_inject')) return {
    reason: '造影剤（Gd）静脈内注射',
    clinical: '0.1mmol/kg（Primovist: 0.025mmol/kg）を注入。注射から動脈相（25-35秒）→門脈相（60秒）→平衡相（120秒）→肝細胞相（15分）の順に撮像する。',
    params: 'Primovist: 1mL/kg（最大40mL）を2mL/秒で注入後、20mL生食でフラッシュ。'
  }
  if (n.includes('care_bolus') || n.includes('care bolus')) return {
    reason: 'ABLE（自動ボーラス検出）システムによる造影タイミング最適化',
    clinical: 'k空間中心を1秒間隔でモニタリング。大動脈ROIの信号が閾値（通常20%上昇）を超えた時点で自動的に本撮像へ切り替える。ABLEにより「動脈相の撮り遅れ・撮り過ぎ」を防ぎ、HCC wash-inの捕捉率が向上する。',
    params: '大動脈ROIを腹腔動脈直下に設定。閾値は施設ルールに従う。'
  }
  if (n.includes('15min') || n.includes('_wait') || n.includes('timer')) return {
    reason: 'プリモビスト（Gd-EOB-DTPA）肝細胞相待機（15〜20分）',
    clinical: 'EOBの50%が正常肝細胞に取り込まれ、OATp1b3トランスポーター経由で胆管排泄される。この取り込みにより正常肝は高信号化→悪性腫瘍（HCC/転移）は低信号で際立つ。待機時間を省略すると肝細胞相の造影効果が不十分になる。',
    findings: 'HCC: 低信号（肝細胞相欠如）｜転移: 低信号（non-hepatocyte）｜FNH: 等〜高信号（肝細胞機能正常）｜胆管腺腫: 高信号',
    params: '注射15〜20分後に肝細胞相撮像。この間に他のシーケンス（T2 FS・DWI）を撮像して効率化。'
  }

  // ====== 頭部 ======
  if (bp === 'head' || n.includes('t2_flair') || n.includes('t2_tse_tra') && bp === 'head') {
    if (n.includes('flair')) return {
      reason: 'CSF抑制T2強調。白質病変・皮質病変の明瞭化',
      clinical: '長TIでCSF信号をnullし、T2コントラストを残す。DWIと組み合わせて使用: DWI(+)/FLAIR(-)は発症4.5時間以内を示唆（wake-up strokeの治療適応判断に）。MSのDawson\'s fingerは矢状断FLAIRで最も描出良好。',
      findings: 'MS: 側脳室周囲垂直配列（Dawson\'s finger）、脳梁下面病変｜慢性梗塞: 高信号gliosis｜SAH: 脳溝高信号（急性期）｜低Na血症/橋中央髄鞘崩壊: 橋高信号',
      params: 'TI=2200ms@1.5T / 2500ms@3T。TR≥8000ms。ETL=12〜16。'
    }
    if (n.includes('diffusion') || n.includes('dwi')) return {
      reason: '急性脳梗塞・拡散制限病変の検出（最重要シーケンス）',
      clinical: '水分子の拡散運動を反映。細胞毒性浮腫（急性梗塞・高細胞性腫瘍・膿瘍）で拡散制限→DWI高信号+ADC低下。FLAIR正常なDWI高信号（DWI-FLAIR mismatch）は発症<4.5時間を示唆し、rtPA適応評価に直結する。',
      findings: '急性梗塞: DWI高信号+ADC<0.6×10⁻³ mm²/s｜膿瘍中心部: DWI高信号（粘稠膿）｜高細胞性腫瘍（リンパ腫・GBM中心部）: ADC低下｜CJD: 皮質+基底核リボン状DWI高信号',
      params: 'b=0,1000 s/mm²。3方向平均。ADC map自動生成(Inline ON必須)。'
    }
    if (n.includes('tof') || n.includes('head_mra')) return {
      reason: '非造影脳血管評価（TOF-MRA）',
      clinical: 'Flow-related enhancementで動脈を選択描出。動脈瘤・狭窄・血管奇形のスクリーニング。頭部では内頸動脈〜中大脳動脈〜前大脳動脈を3スラブで収集。造影剤不要で繰り返し評価が可能。',
      findings: '動脈瘤: 嚢状突出（5mm以下も3D MIPで検出）｜MCA閉塞: 描出欠如→AIS評価｜血管狭窄: 信号低下・途絶｜AVМ: 拡張した供血動脈+nidus',
      params: 'TR短め（25-35ms）でfresh inflowを強調。スラブを傾斜させてスラブ境界アーチファクト軽減。'
    }
    if (n.includes('neck_mra')) return {
      reason: '頸部動脈非造影評価',
      clinical: '内頸動脈・椎骨動脈のアテローム硬化・解離・狭窄を非造影でスクリーニング。脳梗塞の原因検索として頭部TOF-MRAとセットで施行。',
      findings: '内頸動脈狭窄: 信号低下・途絶（NASCET法で評価）｜椎骨動脈解離: 偽腔・数珠状狭窄｜鎖骨下動脈盗血: 同側椎骨動脈逆流',
      params: '3スラブ収集で頸部全長をカバー。脂肪抑制で周囲の脂肪信号を抑制。'
    }
    if (n.includes('t1_space_sag') || (n.includes('t1') && n.includes('space') && n.includes('sag'))) return {
      reason: '3D等方性T1矢状断（造影後高分解能評価）',
      clinical: '0.9mm等方性ボクセルで収集→MPRで任意断面再構成。通常2D T1ではスライス厚5mmのため小病変（垂体微小腺腫3-5mm、転移2-3mm）を見落とす。CE後T1 SPACEにより微小病変の造影増強を全方向から確認できる。',
      findings: '転移: 軟膜播種・小転移巣の検出（2D T1の2倍の検出率）｜垂体微小腺腫: 造影早期低信号｜神経鞘腫: 均一〜不均一Gd増強｜髄膜炎: 軟膜増強パターン',
      params: '造影後5〜10分での収集が推奨。矢状断→アキシャル/冠状断MPRで全方向確認。'
    }
    if (n.includes('t1_fs_fl3d') || n.includes('t1_fs_vibe')) return {
      reason: '脂肪抑制3D T1（造影後・転移検索）',
      clinical: '脂肪信号を抑制してGd造影増強部位を明瞭化。軟膜転移・硬膜転移・骨転移の評価。3D収集のため薄スライス再構成が可能で小病変を見逃しにくい。',
      findings: '硬膜転移: 硬膜の肥厚・増強｜骨転移: 頭蓋骨内の増強巣｜軟膜播種: 脳溝・脳室内の増強',
      params: '動的造影の平衡相（120秒後）か遅延相で収集。脂肪抑制はSPAIRが安定。'
    }
    if (n.includes('t2_tse_cor_hippo') || n.includes('hippo')) return {
      reason: '海馬冠状断T2（てんかん・記憶障害の評価）',
      clinical: 'AC-PC lineに垂直な冠状断で海馬を最も正確に断面する。海馬硬化（内側側頭葉てんかんの最多原因）の評価には厚さ2-3mm・高分解能の冠状断T2が必須。アルツハイマー病の早期萎縮評価にも使用。',
      findings: '海馬硬化: T2高信号+海馬萎縮（患側/健側比較）｜海馬体積減少｜DNET/神経節腫: 皮質性T2高信号巣',
      params: '厚さ2-3mm・Matrix 320×256以上。スライスはAC-PC垂直（海馬長軸に平行）。'
    }
    if (n.includes('t2star') || n.includes('fl2d') || n.includes('swi')) return {
      reason: '微小出血・鉄沈着・静脈血栓の検出',
      clinical: 'T2*減衰を利用して磁化率効果（出血・鉄・石灰化）を強調。SWIはT2*+位相画像の組み合わせでさらに感度が高い。アミロイド血管症（CAA）の微小出血評価、外傷性脳損傷(DAI)の軸索損傷診断に必須。',
      findings: '微小出血: 低信号スポット（CAA: 皮質/皮質下、高血圧性: 深部灰白質・橋）｜海綿状血管腫: popcorn状+blooming effect｜静脈洞血栓: 信号変化｜石灰化: 低信号',
      params: 'TE=25-30ms（1.5T）/ 15-20ms（3T）。FOV=230mm。薄スライス2-3mm。'
    }
    if (n.includes('t1_se_tra') || (n.includes('t1') && n.includes('tra') && bp === 'head')) return {
      reason: '頭部基本T1強調（解剖学的コントラスト・出血・造影）',
      clinical: '脂肪・亜急性出血（メトヘモグロビン）が高信号。脳の解剖学的コントラストの確認と、Gd造影前後の比較に使用。転移・脳膿瘍・脱髄巣の造影増強評価の基本。',
      findings: '亜急性血腫: T1高信号（3日〜数週間）｜Gd増強: BBB破綻部位｜脂肪腫: 高信号（脂肪抑制で低下）｜メラノーマ転移: T1高信号（メラニン）',
      params: 'TR=400-600ms、TE=10-15ms。造影前後セットで収集。'
    }
  }

  // ====== 下垂体 ======
  if (bp === 'head' && (n.includes('pituitary') || n.includes('t1_tse_cor_dyn') || n.includes('t2_tse_cor'))) {
    if (n.includes('t1_tse_cor_dyn') || n.includes('dyn')) return {
      reason: '下垂体ダイナミック造影（微小腺腫の検出）',
      clinical: '正常下垂体は速やかにGd増強される。微小腺腫（<10mm）は血管密度が低いため初期に低信号として検出→造影開始から30秒毎に複数相を収集（ダイナミック）。ACTH産生腺腫（Cushing病）は5mm以下が多く、ダイナミック収集が必須。',
      findings: '微小腺腫: 早期（30-60秒）に低信号→遅延増強（wash-in遅延）｜マクロ腺腫: 均一〜不均一増強｜Rathke嚢胞: 無増強',
      params: '薄スライス2mm（下垂体の高さは通常8-12mm）。1.5T：TRが許す範囲で最短TE。'
    }
    if (n.includes('cor')) return {
      reason: '下垂体冠状断（正面からの解剖確認）',
      clinical: '下垂体の左右対称性・高さ・トルコ鞍との関係を確認。腺腫は通常一側に偏在する。茎（下垂体柄）の傾きも評価→柄変位は小さな腺腫の間接所見。',
      findings: '下垂体腺腫: 腫大+T2高信号±出血｜シャーハン症候群: 萎縮・空下垂体｜頭蓋咽頭腫: 嚢胞+石灰化',
    }
  }

  // ====== 頸部 ======
  if (bp === 'neck') {
    if (n.includes('t2_spc') || (n.includes('space') && n.includes('t2'))) return {
      reason: '頸部3D等方性T2（SPACE）',
      clinical: '0.9mm等方性ボクセルで頸部全域を収集。リンパ節の分布・内頸静脈との関係・甲状腺・唾液腺を一括評価。DixonオプションでFat/Water分離も同時取得可能。',
      findings: '転移リンパ節: 短径>1cm+壊死+T2不均一高信号｜甲状腺癌: 低信号nodule｜神経鞘腫: 紡錘形T2高信号腫瘤',
      params: '3D収集→MPRで任意断面。TR=2000ms、TE=200-400ms（重T2）。'
    }
    if (n.includes('kugel') || n.includes('b0_200')) return {
      reason: '頸部DWI（低b値、リンパ節評価）',
      clinical: '低b値（b=0, 200）で頸部リンパ節の転移検索。低b値は血流効果（pseudodiffusion）を含み、転移リンパ節は高信号化しやすい。頸部DWIは腸管ガスの影響が少なく高品質に収集できる。',
      findings: '転移リンパ節: DWI高信号+ADC低下（<0.8×10⁻³）｜反応性リンパ節: ADC高値（>1.0×10⁻³）｜壊死: ADC偽高値',
      params: 'b=0, 200（頸部）。高b値（1000）は頸部では磁化率アーチファクトが多いため低b値が実用的。'
    }
    if (n.includes('dixon') && n.includes('t1')) return {
      reason: 'Dixon T1（脂肪・水分離 + 造影評価）',
      clinical: '頸部は脂肪組織が豊富で均一な脂肪抑制が困難（磁場不均一）。Dixon法で水画像・脂肪画像を分離し、水画像で造影増強を正確に評価。一回の収集で4画像（Water/Fat/In-phase/Opp-phase）が得られる。',
      findings: '頸部リンパ節: 水画像で周囲脂肪との鑑別が容易｜甲状腺: 脂肪抑制不良部位でも均一評価｜造影後: 増強効果が脂肪信号なしで明瞭',
      params: 'DixonはB0不均一に強く頸部・腹部・骨盤で標準使用。SPAIRより安定。'
    }
  }

  // ====== 胸部 ======
  if (bp === 'chest') {
    if (n.includes('mobidiff') || n.includes('mobidiff5')) return {
      reason: '胸部体動補正DWI（ECG+呼吸同期）',
      clinical: '肺・縦隔のDWI評価には体動補正が必須。mobiDiffはECGトリガー+呼吸トリガーを組み合わせ、心拍動・呼吸の両方を補正。通常EPI DWIでは不可能だった肺内病変のADC測定が可能。縦隔リンパ節の良悪性鑑別に実用的。',
      findings: '肺悪性腫瘍: ADC<1.0〜1.3×10⁻³ mm²/s｜転移性リンパ節: ADC低下｜肺炎（炎症）: ADC上昇（水分子自由）｜胸膜中皮腫: びまん性DWI高信号',
      params: 'b=0, 700（胸部標準）。ECGトリガーとの組み合わせ→撮像時間3〜5分。'
    }
    if (n.includes('t2_blade')) return {
      reason: '胸部BLADE T2（体動補正放射状k空間）',
      clinical: '呼吸同期なしの自由呼吸下でも放射状k空間収集により体動を自動補正。HASTEより高コントラストで縦隔・心臓周囲の病変評価に適する。閉所恐怖症や重篤で息止め困難な患者でも診断可能な画質が得られる。',
      findings: '縦隔腫瘍: T2高信号（胸腺腫・神経鞘腫）vs 低信号（繊維性）｜心膜腔液: 高信号｜胸水: 均一高信号',
    }
    if (n.includes('t1_stse') || n.includes('stse')) return {
      reason: '胸部T1強調（解剖・脂肪評価）',
      clinical: '縦隔脂肪・胸壁の評価。T1強調で脂肪が高信号になるため、脂肪腫・脂肪肉腫の鑑別や縦隔脂肪の確認に有用。',
    }
  }

  // ====== 乳腺 ======
  if (bp === 'breast') {
    if (n.includes('t2_fs_tse')) return {
      reason: '乳腺T2脂肪抑制（嚢胞・リンパ節・浮腫評価）',
      clinical: '乳腺は脂肪組織が多く、T2強調では脂肪信号が高くて病変が埋もれる。脂肪抑制T2で嚢胞（均一T2高信号）vs 充実性病変を鑑別。腋窩リンパ節評価にも重要。',
      findings: '単純嚢胞: 均一T2高信号・無増強｜粘液癌: T2高信号+増強｜腋窩リンパ節転移: T2高信号+短径>10mm',
    }
    if (n.includes('diffusion_resolve') && bp === 'breast') return {
      reason: '乳腺DWI（RESOLVE、悪性腫瘍評価）',
      clinical: 'RESOLVE法でEPI歪みを軽減し乳腺全体を均一にカバー。ADC値で良悪性の補助鑑別。PI-RADS的なBI-RADS評価の補助指標として活用される。造影DWIとの組み合わせで特異度向上。',
      findings: '乳癌: ADC<1.0〜1.2×10⁻³ mm²/s（良性病変: 1.4以上が多い）｜線維腺腫: ADC高め｜DCIS: 微細なDWI高信号',
      params: 'b=0, 800。両側同時収集（FOV=340-380mm）。SPAIR脂肪抑制で均一カバー。'
    }
    if (n.includes('dynamic') && bp === 'breast') return {
      reason: '乳腺造影ダイナミック（最重要シーケンス）',
      clinical: 'MRI乳腺検査の核心。造影前Baselineとの差分（Subtraction）で増強パターンを評価。Type I（progressive）/Type II（plateau）/Type III（washout）で良悪性を鑑別。Wash-outパターン（Type III）は悪性を強く示唆（感度76%/特異度97%）。',
      findings: '乳癌: 早期強増強+washout（Type III）・不整形・spiculated｜線維腺腫: Type I/II・楕円形・均一増強｜DCIS: 非腫瘤性増強',
      params: '90秒相（早期相）と遅延相（3-4分）を収集。Subtraction: pre - post で増強部位を強調。'
    }
    if (n.includes('vibe_sag')) return {
      reason: '乳腺矢状断（片側ごとの高分解能評価）',
      clinical: '乳腺の矢状断VIBE。局所的な病変の位置関係・乳頭との距離・皮膚浸潤を評価する。造影後に収集して増強パターンを確認。',
    }
  }

  // ====== 腹部 共通 ======
  if (bp === 'abdomen') {
    if (n.includes('t2_haste') && n.includes('bh')) return {
      reason: '息止め高速T2（HASTE）腹部形態評価',
      clinical: '1ショットTSEで1スライス<1秒→息止め中に全スライス収集→呼吸アーチファクトゼロ。腹部臓器の形態把握（肝嚢胞/転移、胆嚢結石、膵形態）のベースライン。EOBプロトコルでは嚢胞vs転移の基本鑑別に使用。',
      findings: '肝嚢胞: 均一T2高信号（境界鮮明）｜肝転移: 不均一中等度高信号｜胆嚢結石: 低信号陰影欠損｜膵嚢胞: T2高信号',
      params: 'TR=∞（シングルショット）、TE=80-100ms。ETL=100以上。息止め15〜20秒。'
    }
    if (n.includes('t2_haste') && n.includes('rt')) return {
      reason: '呼吸トリガーT2（息止め困難患者への対応）',
      clinical: '息止めができない高齢者・重症患者にはRT（Respiratory Triggering）を使用。ベローズで呼吸波形を検出し、呼気末（最安定相）のみデータ収集。BHより時間は長い（2〜3倍）が診断品質は確保できる。',
      params: 'ベローズを確実に固定。ETL=20〜40（BHより少なく）。BHと同じFOV/矩形で比較しやすくする。'
    }
    if (n.includes('opp') || n.includes('opp-in') || n.includes('in-phase')) return {
      reason: 'Opposed/In-phase dual echo（脂肪定量・副腎評価）',
      clinical: '1回の収集でTE=1.1msと2.2ms（3T）の2エコーを同時取得。脂肪と水の信号の位相関係から脂肪含有量を定量的に評価。副腎腺腫の診断（脂肪含有量20%以上で腺腫と判定）に必須。HCCの含脂肪型も検出可能。',
      findings: '副腎腺腫: OP/IP比で20%以上信号低下（感度87%/特異度97%）｜脂肪肝: 全体的信号低下｜HCC含脂肪型: 局所OP信号低下｜RCC淡明型: 脂肪成分検出',
      params: '3T: OP TE=1.1ms / IP TE=2.2ms。1.5T: OP=2.2ms / IP=4.4ms。単一breath-holdで両エコー収集。'
    }
    if (n.includes('starvibe')) return {
      reason: '自由呼吸下放射状k空間VIBE（starVIBE）',
      clinical: '放射状に配置されたスポークが全て中心（DC成分）を通過→呼吸体動がスポーク間でaveraging→息止め不要の高品質3D T1が得られる。息止めが15秒以上困難な患者のopp-in評価・多相造影に使用。',
      findings: 'opposed-phaseのRCC・副腎腺腫評価（息止め不要版）｜高齢者・呼吸困難患者への対応',
      params: '収集時間2〜4分（通常VIBEの4〜6倍）。ETLは固定。ゴールデン角のスポーク配置で均一k空間充填。'
    }
    if (n.includes('diffusion') || n.includes('dwi')) return {
      reason: '腹部DWI（悪性病変・リンパ節の拡散評価）',
      clinical: '悪性病変（肝癌・膵癌・転移）は細胞密度が高く拡散制限→DWI高信号+ADC低下。肝臓の転移性病変のスクリーニング（造影CTと相補的）。PACEまたはBH収集で呼吸アーチファクトを制御。',
      findings: '肝転移: DWI高信号+ADC<1.0×10⁻³｜HCC: ADC低下（高悪性度ほど低ADC）｜膵癌: ADC<1.2×10⁻³｜良性嚢胞: ADC高値（水）',
      params: 'b=0, 50, 800（腹部標準）。PACE収集が標準。ADC map自動生成ON。'
    }
    if (n.includes('dynamic') && n.includes('pre')) return {
      reason: '造影前Baseline（Subtraction・定量評価の基準）',
      clinical: '造影前のT1強調画像。造影後との差分（Subtraction = Post - Pre）で造影増強部位を強調表示する際の基準。T1強調の地はPreを確認してから造影相と対比する。',
      params: 'Pre、動脈相(30s)、門脈相(60s)、平衡相(120s)と同じFOV・位置・方向で収集。Subtraction精度はポジションの一致に依存。'
    }
    if (n.includes('dynamic') && n.includes('30s')) return {
      reason: '動脈相（注射後25〜35秒）—— HCCのwash-in捕捉',
      clinical: '肝動脈からの血流が最大となる時相。HCCは異常血管が豊富で動脈相に wash-in（強い増強）を示す。ABLEシステムで大動脈信号が閾値を超えてから5〜10秒後に撮像開始。',
      findings: 'HCC: 動脈相高信号（wash-in）← 最重要所見。FNH: 均一増強+中央瘢痕。血管腫: 辺縁から点状増強開始。',
      params: 'ABLEから5〜10秒後。収集時間<20秒（息止め）。'
    }
    if (n.includes('dynamic') && n.includes('60s')) return {
      reason: '門脈相（注射後60〜70秒）—— 肝実質最大増強',
      clinical: '門脈経由の血流で肝実質が最も高信号になる時相。正常肝実質のベースラインとの対比でHCCのwash-outを評価。転移は rim enhancement（辺縁増強）パターンを示す。',
      findings: '転移: 辺縁増強（「輪っか状」）｜HCC: wash-in減衰＝wash-out開始｜嚢胞: 全時相で無増強',
    }
    if (n.includes('dynamic') && (n.includes('120s') || n.includes('equilibrium'))) return {
      reason: '平衡相（注射後120秒）—— wash-out確認',
      clinical: '造影剤が細胞外腔から排泄される時相。HCCは平衡相でwash-out（低信号化）→動脈相wash-in+平衡相wash-out = LR-5（HCC確定）のLI-RADS基準。血管腫は遅延増強（isodense→high）。',
      findings: 'HCC: wash-out（平衡相低信号）= LI-RADS LR-5確定基準。血管腫: 遅延均一増強（充填パターン）。コレステリン肉芽腫: 遅延増強',
    }
    if (n.includes('t2_haste_fs') || (n.includes('t2') && n.includes('fs') && n.includes('haste'))) return {
      reason: '脂肪抑制T2 HASTE（炎症・浮腫の評価）',
      clinical: '脂肪信号を除いた純粋な水・浮腫のT2高信号を評価。胆管炎・膵炎の炎症性浮腫の明瞭化。EOBプロトコルでは15分待機中に収集し時間を有効活用。',
      findings: '胆管炎: 肝周囲浮腫・胆管壁浮腫｜膵炎: 膵周囲脂肪浮腫｜転移周囲浮腫: 増強と相関',
    }
  }

  // ====== MRCP ======
  if (n.includes('mrcp')) {
    if (n.includes('space') || n.includes('3d')) return {
      reason: '3D高分解能MRCP（SPACE）—— 胆管膵管の詳細評価',
      clinical: '薄スライス（1〜2mm）等方性収集後MPR。2Dシングルショットでは描出困難な胆管分岐部・狭窄の形態・微小結石の位置を任意断面で評価可能。ERCP・PTCD前の術前計画に必須。',
      findings: '胆管結石: 3mm以下も検出可｜胆管狭窄: 狭窄起点・長さ・形態（良性vs悪性）｜膵管癒合不全: 副膵管の走行確認｜PSC: 多発ビーズ状狭窄',
      params: '超長TE（700-1000ms）で水のみ高信号。3D SPACE+重T2で胆汁・膵液を際立たせる。呼吸同期（RT/PACE）で収集。'
    }
    return {
      reason: '2Dシングルショット厚スラブMRCP—— 胆管膵管全体像',
      clinical: '非侵襲的に胆管・膵管を描出するERCPの代替検査。TE≥700msの「重T2」で水成分（胆汁・膵液）のみを極端に高信号化し、周囲組織を低信号化する。閉塞性黄疸の原因部位・性状評価に必須。',
      findings: '胆管結石: 充満欠損（低信号陰影欠損）、感度88-92%｜総胆管拡張>8mm: 閉塞性黄疸の根拠｜膵管拡張>3mm: 慢性膵炎・膵癌｜胆管癌: 狭窄・不整',
      params: 'TE=700-1000ms。Slice thickness 40-80mm（厚スラブ）。呼吸同期（PACE/RT）。iPAT OFF（SNR確保）。'
    }
  }

  // ====== 骨盤・前立腺 ======
  if (bp === 'pelvis') {
    if (n.includes('t2_tse') && (n.includes('tra') || n.includes('cor') || n.includes('sag'))) {
      if (n.includes('prostate') || n.includes('前立腺') || n.includes('mpMRI') || n.includes('spair')) return {
        reason: '前立腺T2（PI-RADSの基幹シーケンス）',
        clinical: 'mpMRIの中心。末梢域（PZ）は正常でT2高信号→PCaでT2低信号巣として検出。移行域（TZ）はBPHで不均一のため評価が難しい（T2コントラスト+DWIで補完）。包膜外浸潤（EPE）・精嚢浸潤（SVI）の評価でTNステージングに直結。',
        findings: 'PCa末梢域: T2低信号巣（感度79%/特異度72%）｜EPE: 包膜不整・角状変形｜SVI: T2低信号浸潤｜BPH: 移行域不均一肥大',
        params: '3T推奨。スライス厚3mm以下。FOV=180-200mm。直腸内コイル不要（多チャンネル体表コイルで十分）。'
      }
      return {
        reason: '骨盤T2（基本解剖・腫瘍評価）',
        clinical: bp === 'pelvis' ? '子宮・卵巣・膀胱・直腸を高コントラストで描出。腫瘍の局在・浸潤範囲をT2コントラストで評価。SPAIR脂肪抑制で腸管との鑑別が容易になる。' : '骨盤解剖の基本評価。',
        findings: '子宮体癌: 子宮内膜高信号+筋層浸潤｜子宮頸癌: 間質浸潤範囲｜卵巣癌: 複雑嚢胞性腫瘤',
        params: 'TR=4000-6000ms、TE=100-120ms。SPAIR脂肪抑制（骨盤の不均一磁場対応）。'
      }
    }
    if (n.includes('diffusion_resolve') || (n.includes('diffusion') && bp === 'pelvis')) return {
      reason: '骨盤DWI（PCa検出・リンパ節評価）',
      clinical: 'PCaはPI-RADS v2.1でDWIが末梢域評価の主要根拠。RESOLVEで精嚢周辺のEPI歪みを軽減。高b値（b=1400）+ADC<1.0×10⁻³でPI-RADS 4-5の基準を満たす。子宮体癌・直腸癌のリンパ節転移評価にも使用。',
      findings: 'PCa: 高b値DWI高信号+ADC<1.0×10⁻³ mm²/s → PI-RADS 4〜5｜ADC値はGleason scoreと逆相関(r≈-0.73)｜転移リンパ節: ADC低下+短径>8mm',
      params: 'b=0, 50, 400, 800, 1400（前立腺標準）。RESOLVE: 3〜6セグメント分割EPI。TR>3000ms。'
    }
    if (n.includes('shfl') || n.includes('shuffle')) return {
      reason: 'SHFL（Shuffle）高速3D TSE（膀胱壁・腫瘍評価）',
      clinical: 'CompressedSensing+ランダムk空間で高分解能T1を高速収集。膀胱癌の壁浸潤深度（T1→T2の鑑別）評価に使用。薄スライス（1〜2mm）等方性で膀胱壁の層構造を描出。',
      findings: '膀胱癌: 壁肥厚+造影増強。NMIBC(T1)vs MIBC(T2): 固有筋層浸潤の有無が治療方針を決定。',
    }
    if (n.includes('dce') || (n.includes('dynamic') && bp === 'pelvis')) return {
      reason: '骨盤造影ダイナミック（DCE）—— PCa PI-RADS補助',
      clinical: 'PI-RADS v2.1でDCEはPI-RADS 3の格上げ基準として使用。早期（<10秒）の局所的wash-inが陽性。T2+DWIで判断が難しいPI-RADS 3の病変でDCE陽性→PI-RADS 4に格上げ可能。',
      findings: 'PCa: 早期focal washout-in (感度72%/特異度64%)。DCE陰性ならPI-RADS 3のまま。',
      params: '時間分解能<10秒/フレーム。Gd 0.1mmol/kg、2mL/秒注入。'
    }
  }

  // ====== 脊椎 ======
  if (bp === 'spine') {
    if (n.includes('t2_qtse_sag') || n.includes('t2_tse_sag') || (n.includes('t2') && n.includes('sag') && bp === 'spine')) return {
      reason: '脊椎矢状断T2（椎間板・脊髄の全体像把握）',
      clinical: '脊椎MRIの基本シーケンス。椎間板水分含有量→T2高信号（正常）/低信号（変性）。脊髄圧迫のスクリーニング→全椎体を矢状断で一括評価。qtse（QuietX）技術で3Tでも騒音を大幅低減。',
      findings: '椎間板ヘルニア: 後方突出+硬膜管圧迫（圧排・変形）｜脊髄症: 脊髄変形+T2高信号（軟化巣）｜椎体骨折: 変形+骨髄浮腫｜感染: 椎間板T2高信号+椎体浮腫',
      params: 'qtse: QuietX技術でslew rate最適化→97%騒音低減。TR=3000-4000ms、TE=90-110ms。ETL=15-25。'
    }
    if (n.includes('nstir') || (n.includes('stir') && bp === 'spine')) return {
      reason: 'STIR/nSTIR（骨髄浮腫・転移・炎症の最感度評価）',
      clinical: 'TI=150ms（1.5T）/220ms（3T）で脂肪T1をnull→骨髄信号が低下→浮腫・転移・炎症が高信号として際立つ。全脊椎の転移スクリーニングに最も感度が高い（感度92%）。造影不要でも転移を検出できる点が利点。',
      findings: '骨転移: 高信号（正常低信号骨髄との対比が明確）｜脊椎炎（化膿性）: 椎体+椎間板高信号｜強直性脊椎炎: 椎体角（Romanus病変）高信号｜疲労骨折: 骨折線沿いの高信号',
      params: 'nSTIR: n=normalized。T1値に依存せず均一なSTIR効果。磁場不均一の影響を受けにくい。'
    }
    if (n.includes('t1_qtse_sag') || n.includes('t1_tse_sag') || (n.includes('t1') && n.includes('sag') && bp === 'spine')) return {
      reason: '脊椎矢状断T1（骨髄・解剖学的コントラスト評価）',
      clinical: '正常骨髄は脂肪を多く含みT1高信号→転移・感染でT1低信号化（骨髄置換）として際立つ。造影後は脂肪抑制T1で増強部位を確認。脊椎の基本解剖評価（椎体の高さ・椎間板の厚さ）。',
      findings: '転移: T1低信号（正常T1高信号骨髄の中に黒く浮かぶ）｜骨髄浮腫型転移: T1等信号（STIRで検出）｜感染: 椎間板T1低信号+椎体T1低信号（壊死）｜骨壊死: T1低信号+周囲高信号リム',
      params: 'TR=400-600ms（T1コントラスト確保）。ETL=3-5（T1ブラーリング最小化）。造影後: 脂肪抑制追加。'
    }
    if (n.includes('t2_tse_tra') || (n.includes('t2') && n.includes('tra') && bp === 'spine')) return {
      reason: '脊椎横断面T2（神経根・脊髄断面評価）',
      clinical: '矢状断で確認したヘルニア・狭窄の横断面確認。神経根の圧迫部位（左右・前後）を特定。脊髄の横断面で脱髄・腫瘍の分布（偏側性）を確認。治療計画（術式・アプローチ方向）に直結。',
      findings: 'ヘルニア: 中央型/傍中央型/外側型の分類｜神経根圧迫: 根管内で扁平化した根｜脊髄腫瘍: 腫瘍の偏側性・周囲T2変化',
      params: 'スライスを症状レベルに集中。厚さ3-4mm。FOVを脊椎の幅に最適化（150-200mm）。'
    }
    if (n.includes('t1_tse_sag_fs') || (n.includes('t1') && n.includes('fs') && bp === 'spine')) return {
      reason: '造影後脂肪抑制T1（増強部位の明瞭化）',
      clinical: 'Gd造影後に脂肪抑制を加えることで、脂肪信号を低下させてGd増強部位のコントラストを最大化。硬膜外膿瘍・転移・脊髄炎の造影効果を最も感度高く描出。脂肪抑制なしでは骨髄脂肪と増強巣が混同される。',
      findings: '硬膜外膿瘍: Gd増強する硬膜外腫瘤+中心坏死｜転移: 椎体内の増強巣｜脊髄炎: 脊髄内の増強巣',
      params: 'SPAIR脂肪抑制（脊椎は磁場均一→CHESSでも可）。TR=600-800ms、TE=10-20ms。'
    }
    if (n.includes('diffusion') && bp === 'spine') return {
      reason: '脊椎DWI（良性/悪性椎体骨折の鑑別）',
      clinical: '骨粗鬆症性圧迫骨折（良性）vs 転移性骨折（悪性）の鑑別がDWIで可能。悪性: 細胞密度が高くADC低下→DWI高信号。良性: 骨髄浮腫（水）→ADC上昇→DWI低〜等信号（T2 shine-throughに注意）。',
      findings: '転移性骨折: DWI高信号+ADC<1.0×10⁻³（感度82%/特異度86%）｜良性圧迫骨折: DWI低信号・ADC正常〜高値｜脊椎炎: 椎体・椎間板高信号',
    }
  }

  // ====== 関節（膝・肩・股関節） ======
  if (bp === 'joint') {
    if (n.includes('pd_fs') || n.includes('pd_tse') || n.includes('pd-w') || (n.includes('pd') && n.includes('fs'))) return {
      reason: '脂肪抑制PD（関節の最重要シーケンス）',
      clinical: '関節MRIの中心。ProtonDensity（PD）重み付け+脂肪抑制で軟骨・半月板・靱帯を最高コントラストで描出。TR/TE設定（TR=3000ms, TE=30ms）でPDコントラストを実現。脂肪抑制がないと脂肪信号が強く病変が埋もれる。',
      findings: '半月板断裂: 高信号が関節面に達するGrade 3（感度85%/特異度95%）｜ACL損傷: 連続性断絶+周囲高信号浮腫｜軟骨損傷: 層構造欠損・低信号変化｜骨挫傷: 骨髄浮腫（STIR高信号）',
      params: 'TR=2500-4000ms、TE=25-35ms。脂肪抑制: SPAIRまたはCHESS。スライス厚3mm。Matrix=384以上（膝: FOV=150-180mm）。'
    }
    if (n.includes('t2_tse') && bp === 'joint') {
      if (n.includes('sag')) return {
        reason: '関節矢状断T2（靱帯・骨髄・後方構造評価）',
        clinical: n.includes('knee') || n.includes('膝')
          ? '膝ACL・PCL・後方関節包の矢状断評価。ACLはSag PDとSag T2の両方で評価することで診断精度が向上。骨挫傷は矢状断T2/STIRで最も明瞭。'
          : '関節の矢状断全体像。靱帯の走行・骨形態の確認。',
        findings: 'ACL断裂: 信号消失or線維の不連続｜PCL断裂: 弓状変形消失｜骨壊死: T2低信号帯+周囲浮腫',
      }
      if (n.includes('cor')) return {
        reason: '関節冠状断T2（内外側構造・軟骨評価）',
        clinical: '膝の場合: 内側・外側半月板、内外側側副靱帯（MCL/LCL）、軟骨の高さを評価。肩の場合: 回旋筋腱板（棘上筋・棘下筋）の冠状断評価。股関節の場合: 臼蓋・大腿骨頭の評価。',
        findings: 'MCL断裂: 信号上昇・走行異常｜外側半月板損傷: 高信号が関節面到達｜軟骨変性: 厚さ減少・信号変化',
      }
      return {
        reason: '関節T2（骨髄・関節液・腫瘤評価）',
        clinical: '関節液（T2高信号）・骨髄浮腫の評価。腫瘤性病変の信号特性で良悪性を推定。関節周囲の滑液包炎・腱炎の浮腫評価。',
        findings: '関節水腫: 均一T2高信号（感染では低信号成分混在）｜骨腫瘍: 信号特性で推定（低: 骨肉腫、高: 骨嚢腫）',
      }
    }
    if (n.includes('t1_tse') && bp === 'joint') return {
      reason: '関節T1（骨形態・脂肪・壊死評価）',
      clinical: '骨壊死のT1低信号帯（正常骨髄の高信号の中に際立つ）、脂肪腫（高信号）、骨転移（低信号）の評価。解剖学的コントラストの基本。',
      findings: '骨壊死（Perthes/成人骨壊死）: T1低信号帯+周囲高信号リム｜脂肪腫: 均一高信号（脂肪抑制で消失）｜転移: T1低信号',
    }
    if (n.includes('t2_blade') || n.includes('blade')) return {
      reason: 'BLADE（放射状k空間TSE）—— 体動ロバスト',
      clinical: '放射状k空間（PROPELLER法）で体動を retrospective補正。通常TSEで体動アーチファクトが問題になる肩・頸椎で特に有効。',
    }
    if (n.includes('pdfs') || n.includes('pd_fs_tra')) return {
      reason: 'PD脂肪抑制アキシャル（半月板水平面・軟骨断面）',
      clinical: '半月板を水平面で断面→前角・後角の水平断裂や変性の位置を正確に把握。軟骨の厚さ・均一性を断面で評価。',
    }
  }

  // ====== フォールバック（汎用） ======
  if (n.includes('t2_tse') || n.includes('t2_haste')) return {
    reason: 'T2強調（水・浮腫・腫瘍の高信号描出）',
    clinical: '長TR・長TEで水を高信号化。腫瘍・浮腫・嚢胞・炎症を周囲組織との高コントラストで描出する基本シーケンス。',
    findings: '腫瘍: 高信号+占拠効果｜浮腫: 周囲高信号｜嚢胞: 均一高信号・境界鮮明｜炎症: びまん性高信号',
  }
  if (n.includes('t1_tse') || n.includes('t1_se') || n.includes('t1_vibe')) return {
    reason: 'T1強調（解剖・脂肪・造影評価）',
    clinical: '短TR・短TEで脂肪・亜急性出血・Gd造影増強を高信号化。解剖学的コントラストの基本。造影後の増強評価に使用。',
    findings: '脂肪: 高信号（脂肪抑制で消失）｜亜急性血腫: 高信号｜Gd増強: BBB破綻・腫瘍血管',
  }
  if (n.includes('vibe') && n.includes('dynamic')) return {
    reason: '3D GRE多相造影ダイナミック',
    clinical: '息止め3D GREの多相収集。造影剤の流入・流出パターンで腫瘍血管性を評価。HCC/FNH/血管腫/転移の鑑別。',
  }
  if (n.includes('vibe')) return {
    reason: '3D GRE息止め T1撮像（VIBE）',
    clinical: '息止め3D Gradient Echoで高分解能T1。薄スライス+多相造影に対応。腹部・骨盤・乳腺の標準T1。',
  }
  if (n.includes('tof') || n.includes('mra')) return {
    reason: '非造影血管評価（TOF-MRA）',
    clinical: 'Flow-related enhancementで血流を高信号化。動脈瘤・血管狭窄・閉塞のスクリーニング。',
  }

  return {
    reason: 'シーケンス撮像',
    clinical: 'このシーケンスは上位プロトコルの一部として収集されます。詳細は技師プロトコルマニュアルを参照してください。',
  }
}
