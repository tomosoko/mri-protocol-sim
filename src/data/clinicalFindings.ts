// MRI臨床所見ガイド - 放射線技師のための疾患別読影ポイント
// 各部位×疾患について、Key Sequence・典型所見・鑑別ポイント・Pitfall・追加撮像判断をまとめる

export interface ClinicalFinding {
  id: string
  region: string
  disease: string
  keySequence: string
  typicalFindings: string[]
  differentialPoints: string[]
  pitfalls: string[]
  additionalImaging: string[]
}

export const clinicalFindings: ClinicalFinding[] = [
  // ============================================================
  // 頭部
  // ============================================================
  {
    id: 'brain-infarction',
    region: '頭部',
    disease: '脳梗塞',
    keySequence: 'DWI + ADC map（最重要）、FLAIR、T2WI、MRA',
    typicalFindings: [
      '超急性期（0-6h）: DWI高信号 + ADC低下（細胞性浮腫による水分子拡散制限）。FLAIRは正常〜わずかな変化のみ',
      '急性期（6-72h）: DWI高信号持続 + ADC最低値。T2/FLAIR高信号が出現。ADC値は中心から辺縁へ向かってグラデーション状に上昇',
      '亜急性期（3-14日）: ADCが「偽正常化（pseudonormalization）」。DWIはT2 shine-throughで高信号が残存しうる。T2/FLAIRは明瞭な高信号',
      '慢性期（>14日）: ADC上昇（自由水増加）。DWIは低〜等信号。T2/FLAIRは高信号（gliosis/嚢胞化）',
      'DWI-FLAIR mismatch: DWI(+)/FLAIR(-)は発症4.5時間以内を示唆（感度62%/特異度78%）。wake-up strokeでの血栓溶解療法適応判断に使用',
      '血管支配領域: MCA=大脳外側面、ACA=大脳内側面・前頭葉内側、PCA=後頭葉・側頭葉下面。分水嶺梗塞は境界領域に線状〜楔状',
    ],
    differentialPoints: [
      'DWI高信号の鑑別: 膿瘍（辺縁ring状DWI高信号+中心部も高信号）、腫瘍（高細胞密度で高信号）、てんかん後（一過性、数日で消退）',
      'T2 shine-through: 慢性期にDWI高信号が残る場合はADC mapで確認。ADC上昇ならT2 shine-throughであり急性梗塞ではない',
      'lacunar infarct vs PVL: ラクナ梗塞は基底核・橋に好発。脳室周囲白質病変（PVL）は加齢変化で両側対称性',
    ],
    pitfalls: [
      'ADC pseudonormalization（7-14日目）: この時期のDWI/ADCは梗塞を過小評価しうる。T2/FLAIRとの併読が必須',
      'DWI陰性の超急性期梗塞: 発症直後（<30分）はDWIで偽陰性あり。臨床症状と矛盾する場合は再検を考慮',
      '後頭蓋窩の梗塞: EPIベースのDWIは磁化率アーチファクトで脳幹・小脳の描出不良。薄スライスDWI/readout-segmented EPIが有効',
      'T2 shine-throughを急性梗塞と誤診: 必ずADC mapと対比。ADC低下がなければ急性梗塞ではない',
    ],
    additionalImaging: [
      '発症6h以内でMRA閉塞あり → Perfusion（PWI）追加でmismatch評価（虚血性ペナンブラ判定）',
      'wake-up stroke → DWI-FLAIR mismatch判定で治療適応評価',
      '血管狭窄評価 → TOF-MRAまたはCE-MRA追加。頸部MRAも含めてアテローム評価',
      '出血性梗塞の除外 → T2*WI/SWI追加',
    ],
  },
  {
    id: 'brain-tumor',
    region: '頭部',
    disease: '脳腫瘍',
    keySequence: 'T1WI造影（Gd）+ T2WI/FLAIR + DWI + Perfusion（rCBV）+ MRS',
    typicalFindings: [
      'GBM（膠芽腫）: T1造影で不整形の厚壁ring enhancement + 中心壊死。FLAIR高信号の血管原性浮腫が広範。T2不均一高信号',
      'Ring enhancementの鑑別: GBM=厚い不整な壁（shaggy inner margin）、膿瘍=薄く均一な壁、転移=壁の厚さは様々',
      'DWI: 高悪性度腫瘍は細胞密度高くDWI高信号/ADC低下。膿瘍中心部もDWI高信号（粘稠な膿）',
      'Perfusion（rCBV）: 高悪性度グリオーマはrCBV上昇（>1.75で高悪性度を示唆、感度97%/特異度95%）。低悪性度はrCBV正常〜軽度上昇',
      'MRS: 腫瘍=Cho上昇+NAA低下。Cho/NAA>1.115でGBM vs 転移の鑑別（感度94%/特異度93%）。膿瘍=アミノ酸ピーク（acetate/succinate）出現',
      '転移性脳腫瘍: 灰白質-白質境界に多発。造影でring or 均一enhancement。周囲浮腫強い',
    ],
    differentialPoints: [
      'Ring enhancing lesion: GBM(40%) > 転移(30%) > 膿瘍(8%) > MS(6%)。Open ring sign → 脱髄を示唆（GBMでもまれに）',
      'GBM vs 転移: MRSでCho/NAA比、Perfusionで腫瘍周囲のrCBV（グリオーマは浸潤のためペリフェラルrCBV上昇、転移は正常）',
      '膿瘍 vs 壊死腫瘍: DWI中心部高信号 → 膿瘍を強く示唆。MRSでアミノ酸ピーク → 膿瘍',
    ],
    pitfalls: [
      '低悪性度グリオーマ: 造影増強なし→腫瘍否定は誤り。FLAIRで異常信号あれば低悪性度グリオーマも考慮',
      '転移の見落とし: 小病変は造影薄スライス（3D T1 MPRAGE/VIBE）でないと検出困難。ルーチンの5mm厚では2-3mmの転移を見逃す',
      'Radiation necrosis vs 再発: 造影パターンが類似。Perfusion（rCBV低下=壊死、上昇=再発）で鑑別',
      'Pseudoprogression: テモゾロミド治療後2-3ヶ月で一過性の造影増強増大。真の増悪と誤診しやすい',
    ],
    additionalImaging: [
      'Ring enhancement発見時 → DWI（膿瘍除外）+ Perfusion（悪性度評価）+ MRS（代謝プロファイル）',
      '造影増強なしの異常信号 → MRS追加でCho上昇確認（低悪性度グリオーマ評価）',
      '治療後フォロー → Perfusion必須（radiation necrosis vs 再発の鑑別）',
    ],
  },
  {
    id: 'ms',
    region: '頭部',
    disease: '多発性硬化症（MS）',
    keySequence: '3D FLAIR（最重要）+ T2WI + T1WI造影（Gd）+ 脊髄T2矢状断',
    typicalFindings: [
      "Dawson's finger: 側脳室周囲に脳室壁に垂直に伸びる卵円形の病変（深部髄質静脈に沿った炎症）。FLAIR矢状断で最も描出良好。MS患者の77-93%に認める",
      'Periventricular lesion: 側脳室周囲のFLAIR高信号。加齢変化との鑑別が重要。MSはovoid/perpendicular、加齢は不整形/caps/rimが多い',
      'Active lesion: Gd造影で増強あり = 活動性炎症（BBB破綻）。造影増強は通常2-6週間持続',
      'Chronic lesion: T1低信号（"black hole"）= 軸索損傷・脱髄が進行。T2/FLAIR高信号のみ = 慢性安定期',
      'Spinal cord lesion: 2椎体未満の短い病変が多い。横断面の半分未満（偏側性）',
      'Central vein sign: 7T or 3Tの高分解能T2*で病変内に中心静脈（点状〜線状の低信号）を確認 → MS特異度高い',
    ],
    differentialPoints: [
      'MS vs NMO: NMOは脊髄3椎体以上の長大病変+視神経炎。脳室周囲のDawson fingerはNMOでは極めてまれ',
      'MS vs 加齢性白質病変: MSは若年・ovoid・垂直配列・脳梁病変あり。加齢はsmooth periventricular halo',
      'MS vs ADEM: ADEMは大型・同時性・皮質下白質優位。MSは時間的・空間的多発性（McDonald criteria 2024更新）',
    ],
    pitfalls: [
      '皮質病変の見落とし: 従来のFLAIRでは皮質病変は見えにくい。3D FLAIRやDIR（Double Inversion Recovery）で検出率向上',
      '活動性病変の評価にGd造影は必須: 非造影のみでは新旧病変の区別がつかない。初回診断・増悪評価ではGd投与を',
      '脊髄病変の見落とし: 脳MRIのみでは脊髄MSを見逃す。特に初回診断時は脊髄矢状断T2も撮像すること',
      'Periventricular lesionがFLAIRで脳室CSFと区別困難な場合 → 3D FLAIRで改善',
    ],
    additionalImaging: [
      '初回診断 → 脳全域3D FLAIR + 脊髄T2矢状断 + Gd造影T1（活動性評価）',
      'McDonald criteriaの空間的多発性証明 → 脳室周囲・皮質近傍・テント下・脊髄の2箇所以上に病変',
      'NMO鑑別 → 視神経MRI（冠状断STIR/T2 fat sat）追加',
    ],
  },
  {
    id: 'brain-hemorrhage',
    region: '頭部',
    disease: '頭蓋内出血',
    keySequence: 'T2*WI/SWI（最高感度）+ T1WI + T2WI + FLAIR',
    typicalFindings: [
      '超急性期（<12h）: oxyhemoglobin → T1等信号/T2等〜高信号/SWI等信号。CTの方が検出に優れる時期',
      '急性期（12h-3日）: deoxyhemoglobin（細胞内）→ T1等〜低信号/T2低信号（強い磁化率効果）/SWI著明低信号',
      '早期亜急性期（3-7日）: 細胞内methemoglobin → T1高信号（常磁性双極子相互作用）/T2低信号（細胞内磁化率効果残存）',
      '後期亜急性期（7-28日）: 細胞外methemoglobin → T1高信号/T2高信号（RBC溶血で磁化率勾配消失）/SWI中心部T1 shine-through高信号',
      '慢性期（>1ヶ月）: hemosiderin/ferritin（マクロファージ内）→ T1低信号/T2著明低信号/SWI著明低信号（辺縁の黒いリム）',
    ],
    differentialPoints: [
      'T1高信号の鑑別: methemoglobin（亜急性出血）、脂肪、メラニン（転移性黒色腫）、高タンパク液、Gd造影。コンテキストとT2信号で判断',
      'SWIのbloom effect: 実際の出血範囲より誇張されて描出される。サイズ評価にはT2*よりT1/T2が正確',
      '微小出血（CMB）: SWIで3-10mmの点状低信号。高血圧性=基底核・橋、CAA=皮質下に多発',
    ],
    pitfalls: [
      '超急性期出血のMRI: oxyhemoglobin段階ではT1/T2の変化が乏しく見逃しやすい。SWI/T2*は磁化率変化を早期検出可能だがCTに劣る場合あり',
      'T2 shine-through on SWI: 後期亜急性期にSWIで中心部が高信号になる（T1 shine-through効果）。出血の消失と誤認しない',
      '石灰化 vs 慢性出血: 両方ともSWI低信号。CT（石灰化は高吸収）またはPhase map（石灰化と出血で位相シフトが逆）で鑑別',
      '造影後のT1高信号と亜急性出血の鑑別: 造影前T1画像がないと判別不能。出血疑い時は造影前T1を必ず撮像',
    ],
    additionalImaging: [
      '急性期出血発見時 → MRA/CTA（動脈瘤・AVM評価）追加',
      '微小出血多発 → SWI全脳 + 分布パターンで高血圧性 vs CAAの鑑別',
      '出血原因精査 → 造影T1（腫瘍内出血の除外）、MRA（血管奇形評価）',
    ],
  },
  {
    id: 'hydrocephalus',
    region: '頭部',
    disease: '水頭症',
    keySequence: 'T2WI/FLAIR axial（Evans index測定）+ T2矢状断（中脳水道評価）+ Cine PC MRI（CSF流動評価）',
    typicalFindings: [
      'Evans index: 前角最大幅 / 頭蓋内径最大幅。0.3以上で脳室拡大と判定。最も簡便で広く使用される指標',
      '測定法: 軸位断で両側前角最大幅と同スライスの頭蓋骨内板最大幅を測定。角度やスライス位置で変動するため再現性に注意',
      'NPH（正常圧水頭症）3徴: 認知障害+歩行障害+尿失禁。80%以上がシャント手術で改善可能（treatable dementia）',
      'NPHのMRI所見: 脳室拡大（EI>0.3）+ Sylvius裂/脳溝の不均衡な拡大 + callosal angle鋭角化 + DESH（disproportionately enlarged subarachnoid space hydrocephalus）',
    ],
    differentialPoints: [
      'NPH vs 脳萎縮: 脳萎縮は脳溝も全体的に拡大。NPHは脳室拡大に比して高位円蓋部の脳溝が狭小（DESH pattern）',
      'Callosal angle: 冠状断後交連レベルで測定。NPH<90°、萎縮>100°',
      '閉塞性 vs 交通性: 中脳水道閉塞ではT2矢状断で中脳水道のflow voidが消失。Cine PC MRIで流速低下を確認',
    ],
    pitfalls: [
      'Evans indexは粗い指標: スライス角度・レベルで値が変動。臨床症状と合わせて総合判断',
      '加齢による脳室拡大とNPHの混同: 60歳以上ではEI>0.3でも必ずしもNPHではない。DESH patternの有無が鑑別の鍵',
      '閉塞性水頭症の見落とし: 第3脳室から第4脳室の連続性をT2矢状断で必ず確認',
    ],
    additionalImaging: [
      'NPH疑い → Cine PC MRI（中脳水道CSF流速測定）追加。流速亢進はNPHを示唆',
      '閉塞性水頭症 → 造影T1（腫瘍による閉塞の評価）',
      'シャント手術適応評価 → タップテスト前後のMRIで脳室サイズ変化を確認',
    ],
  },

  // ============================================================
  // 腹部
  // ============================================================
  {
    id: 'hcc',
    region: '腹部',
    disease: '肝細胞癌（HCC）',
    keySequence: 'EOB-MRI（Gd-EOB-DTPA）ダイナミック撮像 + 肝細胞相 + DWI',
    typicalFindings: [
      '動脈相: 濃染（arterial phase hyperenhancement = APHE）。HCCの血液供給は主に肝動脈由来',
      '門脈相: washout（周囲肝実質より低信号）。LI-RADSではGd-EOB-DTPA使用時は門脈相でのみwashout評価',
      '移行相（transitional phase）: 180秒後。平衡相とは異なる概念（EOB特有）。移行相低信号はLI-RADSで悪性を示唆',
      '肝細胞相（hepatobiliary phase, HBP）: HCC=低信号（85-95%）。正常肝細胞がGd-EOB-DTPAを取り込むが、HCCは取り込み低下',
      'DWI: HCCは拡散制限で高信号。特にHBP低信号+DWI高信号は高い診断確度',
      'LI-RADS分類: LR-5（definite HCC）= APHE + washout + capsule appearance。サイズ（≥10mm vs ≥20mm）で基準が異なる',
    ],
    differentialPoints: [
      'HCC vs 肝血管腫: 血管腫は動脈相で辺縁nodular enhancement→遠心性に造影充填。HBPで高信号になることあり',
      'HCC vs FNH: FNHはHBPで等〜高信号（肝細胞含有のため取り込む）。central scarあり',
      'HCC vs dysplastic nodule: 多段階発癌過程。高異型度結節はHBP低信号だがAPHE(-)が多い。フォローが重要',
      'Hypovascular HCC: 動脈相濃染なしの早期HCC。HBP低信号のみで検出される場合がある',
    ],
    pitfalls: [
      'EOB-MRIの動脈相タイミング: EOBは投与量が少なく（通常ECMの1/4量）、動脈相のウィンドウが狭い。ボーラスタイミング（test injection/care bolus）が重要',
      'Pseudowashout: 肝細胞がEOBを取り込むため、移行相以降は正常肝が高信号化 → 相対的にHCC以外の病変も「washout様」に見える場合あり',
      '肝硬変背景でのDWI偽陽性: 肝硬変結節がDWI軽度高信号を示すことあり。ADC値と造影パターンの併読が必要',
      '動脈相ボーラス不良: late arterial phaseでなくearly arterial phaseを撮ると小HCCの濃染を見逃す',
    ],
    additionalImaging: [
      'HBP低信号+APHE(-)の結節 → 3-6ヶ月後フォローMRI（多段階発癌のモニタリング）',
      '門脈浸潤疑い → MRA/造影CT追加。門脈内腫瘍栓はDWI高信号',
      '肝外転移評価 → 胸部CT + 骨シンチ',
    ],
  },
  {
    id: 'liver-metastasis',
    region: '腹部',
    disease: '肝転移',
    keySequence: 'DWI（最高感度）+ EOB-MRI肝細胞相 + ダイナミック造影',
    typicalFindings: [
      'DWI: 高信号（拡散制限）。肝転移検出の最も感度の高いシーケンス。HBPと並んで最重要',
      'HBP: 低信号（正常肝細胞を含まないため取り込みなし）。サイズに関わらず高い検出感度',
      '動脈相: 乏血性転移（消化管腺癌など）=低信号/ring enhancement。多血性転移（腎癌・甲状腺癌・NET・メラノーマ）=均一濃染',
      'Ring enhancement: 辺縁のviable tumor cellが動脈相で濃染、中心部は壊死で低信号。持続的にring状を呈する',
      'Target sign: DWIで辺縁高信号+中心部低信号のtarget pattern',
    ],
    differentialPoints: [
      '転移 vs 膿瘍: 両方ring enhancement+DWI高信号。鑑別: 膿瘍はADC辺縁部が高値、転移は低値。膿瘍は臨床的に発熱・炎症所見',
      '転移 vs 血管腫: 血管腫は遠心性充填。T2で著明高信号（"light bulb sign"）。転移はmild T2高信号',
      '乏血性転移 vs 嚢胞: 嚢胞はDWI低信号（T2 shine-throughでも可能）、ADC高値。転移はADC低値',
    ],
    pitfalls: [
      'T2 shine-throughでの過剰診断: 嚢胞や血管腫がDWI高信号に見える。ADC mapで確認（高ADC=T2 shine-through）',
      '化学療法後の評価: 治療奏効部位がDWI信号低下するが、造影パターンが変化しサイズ変化と乖離する場合あり',
      '脂肪肝背景でのDWI: 脂肪抑制不良で背景信号が不均一になり小転移の検出が困難。SPAIRの脂肪抑制を最適化',
    ],
    additionalImaging: [
      '単発肝病変 → 切除可能性評価のため造影CT（肝区域・脈管との関係）',
      '多発転移 → PET-CTで原発検索・他臓器転移評価',
      '化学療法効果判定 → DWI+ADC定量（ADC値上昇=治療奏効の早期マーカー）',
    ],
  },
  {
    id: 'pancreatic-cancer',
    region: '腹部',
    disease: '膵癌（膵管腺癌）',
    keySequence: 'MRCP + ダイナミック造影 + DWI + T2WI',
    typicalFindings: [
      'MRCP: 主膵管の突然の途絶（cutoff sign）+ 上流膵管拡張。"double duct sign"=膵管+胆管の同時拡張（膵頭部癌）',
      'ダイナミック造影: 動脈相〜門脈相で低信号（乏血性腫瘍）。遅延相でゆっくり造影される（線維性間質による）',
      'DWI: 高信号（拡散制限）。等吸収膵癌（CTで見えにくい）の検出にDWIが有効',
      'T2WI: 等〜低信号の腫瘤 + 上流膵の萎縮 + 膵管拡張',
      '膵周囲脂肪織の濃度上昇・血管浸潤（SMA/CA/SMV/PV encasement）の評価',
    ],
    differentialPoints: [
      '膵癌 vs 腫瘤形成性膵炎: duct-penetrating sign（膵管が腫瘤を貫通）→ 膵炎を示唆（特異度96%）。膵癌はcutoff sign',
      '膵癌 vs 自己免疫性膵炎（AIP）: AIPは"sausage-like"のびまん性腫大。DWIで膵全体が高信号。IgG4上昇',
      '膵癌 vs IPMN由来浸潤癌: 主膵管型IPMNからの悪性転化。拡張膵管内の充実成分（mural nodule）に注目',
    ],
    pitfalls: [
      '等吸収膵癌の見落とし: 造影CTで見えない場合がある。DWIとMRCPの膵管変化に注目。膵管拡張のみが唯一の手がかりの場合も',
      'MRCPの空間分解能限界: 5mm以下の膵管内病変は描出困難。EUS（超音波内視鏡）が補完手段',
      '膵炎と膵癌の合併: 膵癌が膵炎を引き起こし、炎症で本来の腫瘍範囲が過大評価されることがある',
      '動脈相のボーラス失敗で乏血性病変の信号差が減少 → 検出困難に',
    ],
    additionalImaging: [
      '膵管途絶発見 → EUS-FNA（超音波内視鏡下穿刺吸引）で組織診',
      '切除可能性評価 → 造影CT薄スライス（動脈相+門脈相）で血管浸潤を精密評価',
      'ステージング → 肝転移評価のEOB-MRI + PET-CT',
    ],
  },
  {
    id: 'biliary-stones',
    region: '腹部',
    disease: '胆石・総胆管結石',
    keySequence: 'MRCP（最重要）+ T2WI axial + T1WI',
    typicalFindings: [
      'MRCP: 高信号の胆汁中に低信号の陰影欠損（filling defect）として描出。結石は信号を出さないため「抜け」として見える',
      '総胆管結石: 総胆管内にmeniscus sign（半月状の辺縁）を伴う充填欠損。上流胆管拡張を伴う',
      '胆嚢結石: T2 axialで胆嚢内の低信号結節。重力方向に沈下（dependent portion）',
      '泥状結石・スラッジ: 胆汁より低信号だが完全な無信号ではない。液面形成（fluid-fluid level）',
    ],
    differentialPoints: [
      '結石 vs 腫瘍: 結石は可動性あり（体位変換で移動）。腫瘍は固定。造影で腫瘍は増強される',
      '結石 vs エアー: 両方MRCP低信号。エアーは非依存部位（上方）に位置。ERCP後はエアー混入あり',
      'Mirizzi症候群: 胆嚢管結石が総肝管を外側から圧排 → 胆管狭窄。MRCPで結石位置と胆管の関係を確認',
    ],
    pitfalls: [
      '3mm以下の微小結石: MRCPの感度が50%以下に低下。特に乳頭部嵌頓結石は周囲組織と紛らわしい',
      '膵管合流部の結石: 薄スライスMRCP + T2 axialの併読が必要。厚スラブMRCPのみでは見落とす',
      '胆管炎併発時: 胆管壁の炎症性肥厚で内腔が見えにくくなる。DWIで胆管壁高信号 → 胆管炎を示唆',
      'MRCPのmotion artifact: 呼吸/腸管運動でゴースト → MRCP薄スライスは息止め、厚スラブは呼吸同期で',
    ],
    additionalImaging: [
      'MRCP陰性だが臨床的に強く疑う → EUS（3mm以下の結石検出に優れる）',
      '胆管狭窄の鑑別 → 造影MRI/CT + 腫瘍マーカー（CA19-9）',
      '胆嚢結石+膵管拡張 → 膵胆管合流異常の評価目的でMRCP精査',
    ],
  },
  {
    id: 'ipmn',
    region: '腹部',
    disease: 'IPMN（膵管内乳頭粘液性腫瘍）',
    keySequence: 'MRCP + T2WI + ダイナミック造影（壁在結節評価）',
    typicalFindings: [
      '分枝型（BD-IPMN）: 膵管と交通する嚢胞性病変。MRCPで嚢胞と主膵管の交通を確認することが診断の鍵',
      '主管型（MD-IPMN）: 主膵管のびまん性/区域性拡張（≥5mm）。悪性リスク38-68%と高い',
      '混合型: 分枝型+主管型の合併',
      'Worrisome features: 主膵管径5-9mm、嚢胞径≥3cm、造影壁在結節<5mm、壁肥厚+造影、膵管径急変+遠位萎縮、リンパ節腫大',
      'High-risk stigmata: 主膵管径≥10mm、造影壁在結節≥5mm、閉塞性黄疸。→ 手術適応を検討',
    ],
    differentialPoints: [
      'BD-IPMN vs MCN（粘液性嚢胞腫瘍）: MCNは膵管との交通なし+卵巣様間質+中年女性の体尾部。MRCPで交通の有無を確認',
      'BD-IPMN vs SCN（漿液性嚢胞腫瘍）: SCNはmicrocystic pattern（honeycomb状）+central scar。悪性リスク極めて低い',
      'IPMN vs 仮性嚢胞: 仮性嚢胞は膵炎の既往+壁が線維性（造影されない）。IPMNの壁は上皮成分あり',
    ],
    pitfalls: [
      '壁在結節の見落とし: 厚スラブMRCPだけでは壁在結節を見逃す。薄スライスT2 + 造影で壁在結節の有無・サイズを正確に評価',
      '粘液栓子（mucin plug）vs 壁在結節: 造影されない→粘液栓子。造影される→壁在結節（悪性リスク高）',
      'サーベイランス間隔の見落とし: 変化がないからと長期フォローを怠ると悪性転化を見逃す。ガイドラインに沿った定期MRI',
      '主膵管拡張の原因: IPMN以外にも慢性膵炎・加齢性拡張がある。MRCPで管内の充実成分の有無を確認',
    ],
    additionalImaging: [
      '壁在結節≥5mm → EUS-FNA（細胞診+CEA測定）で悪性度評価',
      'Worrisome features → 3-6ヶ月後のフォローMRI（short interval）',
      '主膵管型 → 外科コンサルト（手術適応の検討）',
    ],
  },
  {
    id: 'renal-mass',
    region: '腹部',
    disease: '腎腫瘤',
    keySequence: 'T1/T2WI + Chemical shift imaging（in-phase/opposed-phase）+ ダイナミック造影 + DWI',
    typicalFindings: [
      'Clear cell RCC: T2高信号（血管豊富+嚢胞変性）、動脈相で強い造影増強、化学シフトでSI drop>20%（細胞内脂質含有、感度58%/特異度97%）',
      'Papillary RCC: T2低信号（特徴的）、乏血性で造影増強が弱い・遅延性。出血を伴いT1高信号のことあり',
      'AML（血管筋脂肪腫）: 脂肪含有→T1高信号+脂肪抑制で低下。Chemical shiftでIndia ink artifact',
      'Minimal-fat AML: 肉眼的脂肪なし。T2低信号（46%で均一低信号）。化学シフトでSI drop軽度。RCCとの鑑別困難',
      'Bosniak分類（嚢胞性腎腫瘤）: I=単純嚢胞、II=薄い隔壁/微小石灰化、IIF=軽度肥厚壁/multiple薄い隔壁、III=壁肥厚+造影、IV=充実成分あり',
    ],
    differentialPoints: [
      'Clear cell RCC vs minimal-fat AML: T2信号（RCC高/AML低）、造影パターン（RCC強い動脈相/AML遅延性）、化学シフト（RCC>20% drop/AML様々）',
      'RCC vs oncocytoma: Oncocytomaは中心瘢痕+均一造影。画像のみでの鑑別は困難な場合あり（生検考慮）',
      '嚢胞性RCC vs 複雑性嚢胞: Bosniak IIF以上は経過観察or手術。充実部分の造影増強が鑑別の鍵',
    ],
    pitfalls: [
      'Minimal-fat AMLとpapillary RCCの鑑別: 両方T2低信号で類似。ADC値がAMLの方が低い傾向あるが overlap大',
      '小径腎腫瘤（<2cm）: 造影パターンが不明瞭。Active surveillance or 生検の判断が必要',
      '脂肪含有腎腫瘤: AMLだけでなくRCCも脂肪を含むことがある（clear cell subtype）。脂肪=良性とは限らない',
      'DWI偽陽性: 腎嚢胞がT2 shine-throughで高信号。ADC mapで鑑別',
    ],
    additionalImaging: [
      '脂肪含有確認 → Chemical shift MRI（in-phase/opposed-phase）',
      '鑑別困難 → 造影CT（3相）+ 経皮的生検',
      '嚢胞性腎腫瘤Bosniak IIF → 6ヶ月後フォローMRI',
    ],
  },

  // ============================================================
  // 脊椎
  // ============================================================
  {
    id: 'disc-herniation',
    region: '脊椎',
    disease: '椎間板ヘルニア',
    keySequence: 'T2WI矢状断（最重要）+ T2WI軸位断 + T1WI矢状断',
    typicalFindings: [
      'T2矢状断: 椎間板後方への突出。突出部の信号は変性度による（正常=高信号、変性=低信号に近い）',
      'Protrusion（膨隆）: ヘルニアの辺縁幅が基部より狭い。後縦靭帯下で広がる',
      'Extrusion（脱出）: ヘルニアの辺縁幅が基部より広い。後縦靭帯を超えることあり',
      'Sequestration（遊離）: 椎間板から完全に分離した遊離片。上下に移動しうる。T2で高信号のことが多い',
      '神経根圧排: T2軸位断で硬膜外脂肪（高信号）の消失+神経根の偏位/圧排を確認。正常側と比較',
      '後方正中突出=両側症状。傍正中突出=同側の横行神経根圧排。外側突出=椎間孔内で出口神経根圧排',
    ],
    differentialPoints: [
      'ヘルニア vs 椎間板膨隆（bulging）: 膨隆は全周性に椎間板辺縁が膨らむ。ヘルニアは局所的突出',
      '遊離片の高信号 vs 腫瘍: 遊離片は隣接椎間板と連続性あり。造影で辺縁増強（granulation tissue）。腫瘍は硬膜外にmassを形成',
      'Modic変化（椎体終板変性）: Type I=T1低/T2高（浮腫）、Type II=T1高/T2高（脂肪変性）、Type III=T1低/T2低（硬化）',
    ],
    pitfalls: [
      '軸位断の見落とし: 矢状断だけでは外側ヘルニア（椎間孔内/椎間孔外）を見逃す。必ず軸位断も確認',
      '上下方向への移動（migration）: 遊離片が1椎体分以上移動する場合あり。連続スライスで追跡',
      '脊柱管狭窄との合併: ヘルニア+変性すべり+黄色靭帯肥厚の複合病態。全体を俯瞰する矢状断が重要',
      '無症候性ヘルニア: 画像所見と臨床症状の一致を確認。MRI陽性≠原因とは限らない',
    ],
    additionalImaging: [
      '術前評価 → 3D T2（CISS/FIESTA）で神経根とヘルニアの立体関係を精密描出',
      '感染/腫瘍除外 → 造影T1追加（辺縁増強パターンで鑑別）',
      '術後再発評価 → 造影T1必須（瘢痕=増強あり、再発ヘルニア=中心部増強なし）',
    ],
  },
  {
    id: 'spinal-stenosis',
    region: '脊椎',
    disease: '脊柱管狭窄症',
    keySequence: 'T2WI矢状断 + T2WI軸位断（最重要）',
    typicalFindings: [
      'T2矢状断: 高信号CSFの狭小化〜消失。変性すべり・椎間板膨隆・黄色靭帯肥厚による多因子性狭窄',
      'T2軸位断: CSF（高信号）と馬尾神経の描出で狭窄程度を評価',
      'Lee分類: Grade 0=正常、Grade 1（軽度）=CSFあり・馬尾分離、Grade 2（中等度）=馬尾の一部集簇、Grade 3（重度）=馬尾が1本の束に圧排',
      'Schizas分類: A1-A4（軽度）=CSFあり、B（中等度）=CSF一部残存、C（重度）=CSF消失・馬尾圧排、D=完全閉塞',
      '椎間孔狭窄: T2矢状断で椎間孔内の脂肪（高信号）と神経根の関係を評価。脂肪消失=狭窄',
    ],
    differentialPoints: [
      '中心管狭窄 vs 椎間孔狭窄 vs 外側陥凹狭窄: 各々責任神経根が異なる。軸位断で狭窄部位を特定',
      '変性狭窄 vs 先天性狭窄: 先天性は若年+椎弓根間距離短縮+多椎間',
      '狭窄+不安定性: 屈曲/伸展位MRIで動的狭窄を評価（通常は直立位MRIが理想だが限定的）',
    ],
    pitfalls: [
      '仰臥位での過小評価: 臥位では荷重がかからず狭窄が軽減。実際の歩行時負荷での狭窄はより高度',
      '多椎間狭窄での責任高位同定困難: 神経根ブロックとMRI所見の一致で責任高位を特定',
      '軽度狭窄の臨床的意義: MRI上の軽度狭窄が必ず症状の原因とは限らない。臨床症状との整合性が重要',
    ],
    additionalImaging: [
      '椎間孔狭窄の詳細評価 → 3D T2矢状断（CISS/SPACE）で椎間孔内を精密描出',
      '不安定性評価 → 機能的X線（屈曲/伸展）で動的すべりを確認',
      '脊髄症合併 → 頸椎MRIで脊髄圧迫・T2脊髄高信号（myelopathy sign）の確認',
    ],
  },
  {
    id: 'spinal-tumor',
    region: '脊椎',
    disease: '脊髄腫瘍',
    keySequence: 'T1WI/T2WI矢状断 + T1WI造影（Gd）矢状断/軸位断',
    typicalFindings: [
      '髄内腫瘍（上衣腫・星細胞腫）: 脊髄のびまん性膨大。T2高信号。上衣腫は中心性・対称的、星細胞腫は偏心性。造影で増強',
      '上衣腫: 中心管由来。出血（cap sign = 腫瘍上下のhemosiderin rim）が特徴的。境界明瞭で外科的切除しやすい',
      '星細胞腫: 浸潤性で境界不明瞭。T2高信号範囲が造影増強範囲より広い',
      '髄外硬膜内腫瘍（髄膜腫・神経鞘腫）: meniscus sign=脊髄と腫瘍の間にCSFの三日月型クレフト。脊髄は対側に圧排偏位',
      '髄膜腫: T1等〜低/T2等〜軽度高信号。均一な造影増強。dural tail sign（57-67%）。中年女性に多い',
      '神経鞘腫: dumbbell shape（椎間孔を貫通してダンベル型）=80%の確率でschwannoma。T2高信号。不均一造影増強',
    ],
    differentialPoints: [
      '髄内 vs 髄外硬膜内: meniscus sign（CSFクレフト）あり→髄外。脊髄が膨大→髄内。造影T1軸位断で腫瘍と脊髄の関係を確認',
      '髄膜腫 vs 神経鞘腫: 髄膜腫=広基性dural attachment+dural tail+均一造影。神経鞘腫=神経根に連続+不均一+dumbbell',
      '上衣腫 vs 星細胞腫: cap sign（hemosiderin rim）→上衣腫を示唆。境界明瞭→上衣腫、不明瞭→星細胞腫',
    ],
    pitfalls: [
      '脊髄腫瘍の見落とし: 脊髄の軽度膨大を見逃すことがある。T2矢状断で脊髄径の左右非対称・局所膨大に注意',
      '嚢胞 vs 腫瘍: 髄内嚢胞のみの場合でも腫瘍随伴嚢胞（tumor-associated cyst）の可能性。造影で壁の増強を確認',
      '多発神経鞘腫: NF2（neurofibromatosis type 2）を疑う。頭蓋内MRI（聴神経腫瘍の検索）追加',
      'Drop metastasis: 髄芽腫などの小児腫瘍で脊髄への播種あり。脊髄全長のスクリーニングが必要',
    ],
    additionalImaging: [
      '髄内病変発見 → 造影T1が必須（腫瘍範囲確定+鑑別診断）',
      '神経鞘腫dumbbell → 軸位断で椎間孔・傍脊柱進展の範囲を確認',
      'NF2疑い → 頭蓋内MRI（両側聴神経腫瘍の検索）',
    ],
  },
  {
    id: 'vertebral-fracture',
    region: '脊椎',
    disease: '椎体圧迫骨折',
    keySequence: 'STIR矢状断（最重要）+ T1WI矢状断 + T2WI矢状断',
    typicalFindings: [
      '新鮮骨折: STIR高信号（骨髄浮腫）+ T1低信号（正常脂肪髄の置換）。骨髄浮腫は骨折治癒活動の指標',
      '陳旧性骨折: STIR正常信号（浮腫消退）+ T1は脂肪髄回復で等〜高信号。形態変化（楔状変形等）のみ残存',
      '骨折線: T1/T2矢状断で椎体内の線状低信号。終板に平行な水平帯状パターンが典型',
      'Fluid sign: T2/STIRで椎体内のfluid collection（椎体内裂隙）→ 骨壊死・不安定性を示唆',
    ],
    differentialPoints: [
      '骨粗鬆症性（良性）vs 病的（悪性）骨折の鑑別:',
      '悪性を示唆: 椎弓根・後方要素への進展（感度91%/特異度83%）、硬膜外軟部組織腫瘤、傍脊柱腫瘤、convex posterior border（後壁の膨隆）、皮質破壊',
      '良性を示唆: 終板に沿った水平帯状のT1低信号、fluid sign、後壁の鋭角的骨折（retropulsion）、椎弓根正常信号',
      '2つ以上の悪性所見の組み合わせで高い特異度・陽性的中率',
    ],
    pitfalls: [
      '急性骨粗鬆症性骨折のびまん性骨髄浮腫: 悪性骨折と類似。2-3ヶ月後のフォローで浮腫消退→良性。残存・増大→悪性を疑う',
      '多発圧迫骨折のうち新鮮/陳旧の区別: STIRで高信号の椎体のみが新鮮骨折。セメント治療（椎体形成術）の適応判断に直結',
      '陳旧性骨折の再骨折: 以前安定していた椎体にSTIR高信号が新たに出現→再骨折を示唆',
      '脂肪髄が豊富な高齢者でT1低信号の解釈: 正常脂肪髄は高信号。低信号に置換されていれば異常（骨折/腫瘍）',
    ],
    additionalImaging: [
      '悪性骨折疑い → 造影MRI（腫瘍の増強パターン評価）+ 全脊椎MRI（多発転移の検索）',
      '椎体形成術適応判断 → STIR（新鮮性確認）が必須',
      '不安定性評価 → 後方靭帯複合体（PLC）の評価にSTIR/T2',
      '良悪性鑑別困難 → CT-guided biopsy or 2-3ヶ月後フォローMRI',
    ],
  },

  // ============================================================
  // 骨盤
  // ============================================================
  {
    id: 'prostate-cancer',
    region: '骨盤',
    disease: '前立腺癌',
    keySequence: 'T2WI（移行域の主要シーケンス）+ DWI/ADC（辺縁域の主要シーケンス）+ DCE',
    typicalFindings: [
      'PI-RADS v2.1: 5段階評価。辺縁域（PZ）はDWI/ADCが主要判定シーケンス。移行域（TZ）はT2WIが主要判定シーケンス',
      '辺縁域（PZ）: T2で均一高信号が正常。癌はT2低信号+DWI高信号/ADC低下。PI-RADS 4=ADC著明低下+高信号(<1.5cm) or ≥1.5cm',
      '移行域（TZ）: T2でheterogeneous。癌はlenticular/non-circumscribed T2低信号。BPHの結節（circumscribed, encapsulated）との鑑別が鍵',
      'DWI/ADC: PI-RADS 5=ADC著明低下+DWI著明高信号(≥1.5cm) or 被膜外進展/精嚢浸潤',
      'DCE: PZでPI-RADS 3の場合、DCE陽性→PI-RADS 4に格上げ。陽性基準=focal + early enhancement + T2/DWIの疑い領域に一致',
      'TZでPI-RADS 3の場合、DWI 5→PI-RADS 4に格上げ（DCEではなくDWIで判定）',
    ],
    differentialPoints: [
      '癌 vs 前立腺炎: 前立腺炎もDWI高信号/T2低信号を示しうる。楔形/線状パターン→炎症。focal masslike→癌を疑う',
      '癌 vs BPH結節（TZ）: BPH=circumscribed+T2で被膜あり（dark rim）。癌=非限局性+被膜消失',
      'PI-RADS 3: 臨床的に有意な癌の確率は中間。PSA密度・臨床情報と合わせて生検適応を判断',
    ],
    pitfalls: [
      'TZ cancer: T2WIでBPHと癌の区別が困難。"erased charcoal sign"（不明瞭な低信号）に注目',
      '出血後のT1高信号: 前立腺生検後のT1高信号（methemoglobin）がDWIを歪める。生検後6週間以上あけてmpMRI',
      '前方線維筋性間質（AFMs）: 正常構造だがT2低信号/DWI等〜軽度高信号で癌と紛らわしい',
      '辺縁域の萎縮: 高齢者で辺縁域が薄くなりT2低信号化 → 癌との鑑別に注意',
    ],
    additionalImaging: [
      'PI-RADS ≥4 → MRI-TRUS fusion biopsy（MRI-超音波融合画像下生検）',
      '病期評価 → 被膜外進展（ECE）・精嚢浸潤（SVI）をT2 + DCEで評価',
      '転移評価 → 骨盤内リンパ節（DWI）+ 全身骨転移（骨シンチ or whole-body MRI）',
    ],
  },
  {
    id: 'uterine-leiomyoma-sarcoma',
    region: '骨盤',
    disease: '子宮筋腫 vs 肉腫',
    keySequence: 'T2WI + DWI/ADC + T1WI造影',
    typicalFindings: [
      '通常型筋腫: T2低信号（平滑筋+線維成分）が典型。境界明瞭。均一',
      '変性筋腫: T2信号が不均一化。硝子様変性=低信号、嚢胞変性=高信号、赤色変性=T1高信号。DWI低信号',
      '子宮肉腫（平滑筋肉腫・LMS）: T2中間〜高信号（不均一）。DWI高信号（ADC<1.23x10-3で肉腫を示唆、感度92%）。不整な辺縁・壊死',
      '内膜間質肉腫（ESS）: T2中間信号 + DWI高信号が子宮内膜より高い',
      '細胞性筋腫: T2中〜高信号+DWI高信号 → 肉腫と類似するpitfall。ADC値がオーバーラップ',
    ],
    differentialPoints: [
      'T2低信号領域の存在 → 肉腫の除外に有用（肉腫はT2低信号領域を持たないことが多い）',
      'DWI高信号 + T2中間信号 + 不整な辺縁 → 肉腫を強く示唆',
      'BET1T2ERチェック: Borders irregular + Early T1 high signal + T2 intermediate + Enhancement irregular + Rapid growth → 肉腫の red flags',
      '急速増大（6ヶ月でサイズ増大）は重要な臨床所見だが、画像だけでは判断困難',
    ],
    pitfalls: [
      '細胞性筋腫/atypical leiomyomaと肉腫のDWI/ADCオーバーラップ: DWI単独では鑑別不能。形態（境界の不整・壊死）+信号パターンの総合評価',
      '変性筋腫のT2不均一信号を肉腫と誤認: 変性筋腫はDWI低信号であることが多い点がポイント',
      'MRIのみでの確定診断は困難: 術前にMRIで肉腫を疑った場合は開腹手術（モルセレーター禁忌）を選択',
      'T2低信号であっても肉腫を完全には除外できない（まれにlow-signal sarcoma）',
    ],
    additionalImaging: [
      '急速増大+T2不均一+DWI高信号 → 造影MRI追加（不均一な造影+壊死パターン評価）',
      '肉腫疑い → 組織診は困難（子宮筋層腫瘤の針生検はsampling errorリスク大）→ 手術的切除',
      '閉経後の筋腫増大 → 肉腫を疑いMRI精査',
    ],
  },
  {
    id: 'ovarian-tumor',
    region: '骨盤',
    disease: '卵巣腫瘍',
    keySequence: 'T1WI + T2WI + T1WI fat-sat + ダイナミック造影 + DWI',
    typicalFindings: [
      '成熟嚢胞性奇形腫（デルモイド）: T1高信号（脂肪/皮脂成分）+ 脂肪抑制で信号低下 → 脂肪含有の証明。chemical shift artifact（脂肪-水界面）',
      'Rokitansky protuberance（dermoid plug）: 嚢胞内に突出する充実性結節。骨・歯・毛髪を含む。T1/T2で混合信号',
      'Floating fat globules: "sack of marbles" appearance。嚢胞内に浮遊する脂肪球',
      '漿液性嚢胞腺腫: 単房性薄壁嚢胞。T2高信号。造影されない（良性）',
      '漿液性嚢胞腺癌: 不整な壁肥厚+乳頭状充実成分+造影増強+腹水+腹膜播種',
      '粘液性腫瘍: 多房性嚢胞。各房でT1/T2信号が異なる（"stained glass" appearance = 粘液濃度差による）',
      '子宮内膜症性嚢胞（チョコレート嚢胞）: T1高信号+T2低信号（"shading"=血液成分の濃縮）。T1 fat-satで信号残存（脂肪ではない）',
    ],
    differentialPoints: [
      'T1高信号の鑑別: 脂肪（fat-satで消える）vs 出血（fat-satで消えない）vs 粘液性（fat-satで消えない）',
      '良性 vs 悪性: 充実成分の造影増強・壁不整・腹水・腹膜結節 → 悪性を示唆。DWI高信号の充実部分 → 悪性を疑う',
      'デルモイド vs 脂肪含有腫瘍: デルモイドは若年女性+嚢胞内脂肪+Rokitansky結節。脂肪肉腫は極めてまれ',
    ],
    pitfalls: [
      'デルモイドの悪性転化（1-2%）: 壁の不整な肥厚+造影増強 → squamous cell carcinoma等への変化を示唆',
      '子宮内膜症性嚢胞とデルモイドの鑑別: T1高信号は共通。fat-sat T1で信号が消える→脂肪（デルモイド）、残る→出血（内膜症）',
      '卵巣癌のDWI偽陰性: 低細胞密度の漿液性腫瘍はDWI高信号を示さないことがある。造影パターンと合わせて評価',
      '成熟奇形腫の小さい脂肪成分: ごく少量の脂肪は通常のT1で分かりにくい。chemical shift（Dixon法）が最も感度が高い',
    ],
    additionalImaging: [
      'T1高信号の卵巣腫瘤 → fat-sat T1（脂肪 vs 出血の鑑別）が最初の追加ステップ',
      '悪性疑い → ダイナミック造影+DWI（充実成分の性状評価）+ 腹膜・リンパ節・肝表面の検索',
      'チョコレート嚢胞の壁在結節 → 造影（endometrioid carcinomaの除外）',
    ],
  },
  {
    id: 'rectal-cancer',
    region: '骨盤',
    disease: '直腸癌',
    keySequence: 'T2WI高分解能（矢状断+冠状断+軸位断：直腸長軸に垂直）+ DWI',
    typicalFindings: [
      'T2WI: 固有筋層（低信号）の断裂・不整 → 壁外浸潤の評価。腫瘍は中間信号として粘膜下層〜筋層を超えて描出',
      'T分類: T1-T2=筋層内に留まる（筋層外面が平滑）。T3=筋層を超えて直腸間膜脂肪に浸潤（T3a<1mm, T3b=1-5mm, T3c=5-15mm, T3d>15mm）',
      'MRF（mesorectal fascia）距離: 腫瘍最外縁〜MRF（T2低信号の薄い線）の最短距離。1mm以内=CRM陽性（予後不良）',
      'EMVI（extramural vascular invasion）: 直腸間膜内の血管への腫瘍浸潤。T2で血管内に中間信号の充実成分 → 予後不良因子',
      '壁外浸潤>5mm（T3c/T3d）: 5年生存率54%（<5mmの85%と比較して有意に不良）',
    ],
    differentialPoints: [
      'T2 vs T3: desmoplastic reaction（線維性反応）がT2低信号のspiculationとして見えることがあり、T3に過大評価しやすい。Spiculation=T2低信号→線維、T2中間信号→腫瘍浸潤',
      'リンパ節転移: サイズだけでなく形態（irregular border, mixed signal）が重要。5mm以上の短径+不整な辺縁 → 転移を疑う',
      '治療後再評価（yTNM）: CRT後は線維化でT2低信号化 → 残存腫瘍の過大/過小評価。DWIが残存腫瘍の検出に有用',
    ],
    pitfalls: [
      'MRF距離の過小評価: 腫瘍から1mmの判定は困難。疑わしい場合は"threatened MRF"として報告',
      'T2過大評価: desmoplastic reactionをT3と誤認。T2 vs T3の正確な区別はMRIの限界（accuracyは65-85%）',
      '下部直腸癌の肛門管浸潤: 矢状断で肛門挙筋・外肛門括約筋への浸潤を確認（ISR適応判断に直結）',
      '側方リンパ節: 内腸骨血管周囲のリンパ節転移は通常のTME（直腸間膜全切除）では郭清されない。側方郭清の適応判断にMRIが重要',
    ],
    additionalImaging: [
      '低位直腸癌 → 冠状断T2（肛門挙筋との関係を精密評価）',
      'CRT後再評価 → DWI追加（残存腫瘍検出）+ T2で線維化評価',
      '遠隔転移評価 → 肝MRI（EOB-MRI）+ 胸部CT',
    ],
  },

  // ============================================================
  // 関節
  // ============================================================
  {
    id: 'acl-tear',
    region: '関節',
    disease: 'ACL（前十字靭帯）損傷',
    keySequence: 'T2WI/PDWI fat-sat 矢状断（最重要）+ 冠状断 + 軸位断',
    typicalFindings: [
      '完全断裂: ACLの連続性消失/非描出。T2/PD fat-satで靭帯実質の異常高信号（浮腫・出血）。異常な角度変化/波状変形',
      '正常ACL: 矢状断で大腿骨外側顆後方〜脛骨前方に走行する低信号帯（Blumensaat lineに平行）',
      '部分断裂: ACL肥厚+T2高信号だが連続性残存。または一部の線維束のみ断裂',
      '二次所見: pivot-shift bone bruise（大腿骨外側顆+脛骨後外側のbone contusion）→ ACL損傷の強い間接的証拠',
      '前方脛骨亜脱臼: 矢状断で脛骨が大腿骨に対して前方偏位（>7mmは異常）',
      'PCL buckling sign: ACL断裂に伴い後十字靭帯が弛緩・屈曲（PCL angle <105°）',
    ],
    differentialPoints: [
      '完全断裂 vs 部分断裂: 連続線維の有無。部分断裂は機能温存の場合あり→臨床的不安定性テストと統合',
      '急性 vs 慢性ACL断裂: 急性=浮腫+出血で高信号。慢性=線維性瘢痕で低信号化 → 正常様に見えるpitfall',
      'ACL mucoid degeneration: ACLがT2高信号で肥厚 → 断裂と誤認。特徴: celery stalk pattern（線維構造保持+間質高信号）',
    ],
    pitfalls: [
      '慢性ACL断裂の見落とし: 浮腫が消退し低信号の瘢痕に置換 → 正常と見間違う。二次所見（前方脛骨偏位、PCL buckling、bone bruise既往）が手がかり',
      'Magic angle effect: 55°の角度でACLがT1/PD高信号に見える場合あり。T2WI（長TE）で消失すれば正常',
      '部分断裂の過大評価: intrasubstance signalを断裂と誤認。ACLの連続性を全スライスで追跡すること',
      'ACL ganglion cyst: ACL周囲の嚢胞がACL断裂と紛らわしい。嚢胞壁が明瞭+ACL本体の連続性保持で鑑別',
    ],
    additionalImaging: [
      'ACL損傷発見 → 半月板・内側側副靭帯（MCL）の合併損傷を必ず確認（unhappy triad/O\'Donoghue triad）',
      '慢性不安定性 → 骨軟骨損傷の評価（造影なし3D GRE or PD fat-sat）',
      '術後評価 → graft impingementの確認。矢状断でgraft角度とroof clearance',
    ],
  },
  {
    id: 'meniscal-tear',
    region: '関節',
    disease: '半月板損傷',
    keySequence: 'PDWI/T2WI fat-sat 矢状断 + 冠状断',
    typicalFindings: [
      'Grade分類: Grade 0=正常（均一低信号）。Grade I=点状/球状のsubstance内高信号（関節面に達しない）。Grade II=線状高信号（関節面に達しない）。Grade III=高信号が関節面に達する→真の断裂',
      'Grade I/II: 変性変化であり真の断裂ではない。加齢で頻度増加。無症候性のことが多い',
      'Grade III（断裂）の種類: 水平断裂（horizontal）=上下関節面を分割。垂直/縦断裂（longitudinal）=半月板の長軸方向。放射状断裂（radial）=内縁から外縁方向',
      'Bucket-handle tear: 縦断裂の内側片が関節内に転位。冠状断で"double PCL sign"（転位片がPCLと平行に見える）',
      'Meniscal extrusion: 半月板が脛骨関節面から3mm以上外側にはみ出し → 根部断裂や変性の間接的所見',
    ],
    differentialPoints: [
      'Grade II vs Grade III: 高信号が関節面に達しているか否かが分水嶺。2方向以上で関節面到達を確認すればGrade III',
      '断裂 vs 正常のmeniscofemoral ligament: Wrisberg/Humphry靭帯が外側半月板後角の偽断裂に見えることがある',
      '横靭帯（transverse ligament）: 前角同士を結ぶ靭帯が前角断裂と紛らわしい。矢状断で最前方スライスで確認',
    ],
    pitfalls: [
      '関節面到達の判定ミス: 1方向のみで判定すると偽陽性/偽陰性。矢状断+冠状断の2方向で確認が鉄則',
      '修復後半月板: 術後の半月板にGrade III信号が残存しても必ずしも再断裂ではない（granulation tissue）。臨床症状と対比',
      '外側半月板後角の偽断裂: popliteus腱の通過部で半月板にgapが見える → 正常構造',
      '小児の血管性信号: 小児では半月板内に血管構造による高信号あり → 断裂と誤認しない',
    ],
    additionalImaging: [
      'Bucket-handle tear疑い → 冠状断で転位片の確認。3D撮像（CISS/SPACE）で立体的評価',
      '根部断裂 → 冠状断で根部付着部を精密評価。meniscal extrusionの有無を確認',
      'ACL/MCL合併損傷の検索 → 必ず全靭帯を系統的に評価',
    ],
  },
  {
    id: 'rotator-cuff-tear',
    region: '関節',
    disease: '回旋筋腱板損傷',
    keySequence: 'T2WI/PDWI fat-sat 冠状断（最重要）+ 矢状断 + 軸位断',
    typicalFindings: [
      '正常腱板: T1/T2で均一低信号の腱構造（棘上筋→棘下筋→小円筋→肩甲下筋）',
      '完全断裂: 腱の全層にわたるT2高信号の gap（液体充填）。腱板retraction（断端の近位側への退縮）。肩峰下滑液包への液体漏出',
      '部分断裂: 関節面側（articular-sided、最多）: 関節面に沿った線状T2高信号欠損。滑液包面側（bursal-sided）: 滑液包面の局所欠損。腱板内（intratendinous/delamination）: 浅層と深層の間の層状裂隙',
      '腱板の脂肪変性（Goutallier分類）: T1矢状断で筋腹の脂肪浸潤を評価。Grade 2以上は修復後の機能回復が不良',
      '棘上筋腱が最も損傷頻度が高い（critical zone = 血流乏しい領域）',
    ],
    differentialPoints: [
      '部分断裂 vs 腱炎: 腱炎は腱肥厚+T2信号上昇だが明確なgapなし。部分断裂は限局性の液体信号欠損',
      '完全断裂 vs 部分断裂: 腱の全層にgapが及ぶか否か。冠状断+矢状断の両方で確認',
      'Magic angle artifact: 棘上筋腱が55°方向に走行する部位でT1/PD高信号。T2 fat-sat（TE>40ms）で消失すれば正常',
    ],
    pitfalls: [
      '低信号の断裂: 慢性断裂部に瘢痕/肉芽組織が充填されT2低信号 → 断裂が見えにくい。腱の形態異常（薄化・退縮）に注目',
      '部分断裂の見落とし: 関節面側の浅い断裂は冠状断のみでは見逃す。軸位断・ABER位での評価が有効',
      '滑液包炎のみを断裂と誤認: 肩峰下滑液包に液体貯留があっても腱板が intact なら断裂ではない',
      '棘下筋腱の断裂見落とし: 棘上筋に注目しすぎて棘下筋の断裂を見落とすことがある。矢状断で後方まで確認',
    ],
    additionalImaging: [
      '術前評価 → T1矢状断（脂肪変性grading）+ 冠状断（retraction距離測定）',
      'SLAP lesion合併疑い → MR arthrography（関節内造影）が gold standard',
      '術後再断裂評価 → T2 fat-sat + 造影（granulation vs 液体の鑑別）',
    ],
  },
  {
    id: 'avascular-necrosis',
    region: '関節',
    disease: '骨壊死（AVN）',
    keySequence: 'T1WI冠状断 + T2WI/STIR冠状断',
    typicalFindings: [
      'Double line sign（T2）: AVNの最も特異的な所見。外側の低信号線（硬化帯）+ 内側の高信号線（肉芽/反応性組織帯）',
      'T1WI: 大腿骨頭の前上方に地図状（geographic）の低信号帯。正常骨髄（高信号）との境界が明瞭',
      'Band pattern: T1で低信号の帯状病変が壊死領域と正常骨髄を分ける（反応性境界帯）',
      'Mitchell分類（壊死中心部の信号）: Class A=脂肪（T1高/T2高）、Class B=血液（T1高/T2高intermediate）、Class C=液体（T1低/T2高）、Class D=線維（T1低/T2低）',
      '骨髄浮腫パターン: STIRで広範囲高信号 → 進行期。crescent sign → 軟骨下骨折（進行の指標）',
    ],
    differentialPoints: [
      'AVN vs 一過性骨髄浮腫症候群（BMES）: BMESは6-12ヶ月で自然寛解。AVNはband pattern/double line signあり。BMESは均一な浮腫のみ',
      'AVN vs 大腿骨頭転移: 転移は皮質破壊+軟部組織腫瘤。AVNはband pattern with正常骨皮質',
      'Stress fracture: 線状T2高信号が特徴。band patternとは異なる走行',
    ],
    pitfalls: [
      '早期AVNの見落とし: X線正常でもMRIで検出可能（Ficat Stage I）。T1 band patternが最も早期の所見',
      '両側性: AVN患者の50-80%が両側性。片側発見時は対側も必ず撮像',
      '骨髄浮腫=即AVNとは限らない: 浮腫のみでband pattern/double line signなし → BMESや他の病態も考慮',
      'ステロイド投与歴・アルコール: 臨床情報がAVN疑いに不可欠。リスク因子ありの股関節痛はMRI適応',
    ],
    additionalImaging: [
      '片側AVN → 対側MRI（両側評価が必須）',
      '進行度評価 → X線（Ficat分類でcollapse有無）+ CTで軟骨下骨折の精密評価',
      '治療効果判定 → フォローMRI（壊死範囲の変化+骨髄浮腫の推移）',
    ],
  },

  // ============================================================
  // 乳腺
  // ============================================================
  {
    id: 'breast-cancer',
    region: '乳腺',
    disease: '乳癌',
    keySequence: 'ダイナミック造影MRI（DCE-MRI, 最重要）+ DWI/ADC + T2WI',
    typicalFindings: [
      'BI-RADS MRI分類: 形態（mass shape: round/oval/irregular）+ 辺縁（margin: smooth/irregular/spiculated）+ 造影内部構造 + 造影動態',
      'Spiculated margin: 悪性の確率80%。IDC（浸潤性乳管癌）に最も多い',
      '造影パターン（kinetic curve）: Type I（persistent, 漸増型）=良性多い。Type II（plateau, 平坦型）=良悪性混在。Type III（washout, 減衰型）=悪性を強く示唆',
      'Rim enhancement: 辺縁のみ造影される→悪性を強く示唆（壊死中心+viable tumor辺縁）',
      'DWI: 悪性腫瘍はDWI高信号/ADC低値。ADC cutoff ≈0.92x10-3mm2/s（感度92%/特異度87%）。良性: ADC≈1.26, 悪性: ADC≈0.75（x10-3）',
      'Non-mass enhancement（NME）: 腫瘤を形成しない造影増強。線状/区域性/多発性。DCIS（非浸潤性乳管癌）はNMEパターンが多い',
    ],
    differentialPoints: [
      '乳癌 vs 線維腺腫: 線維腺腫=oval/smooth/均一造影/Type I curve。T2で高信号のことが多い',
      '乳癌 vs 乳腺症: 乳腺症はNMEだが散在性でfocusなし。背景乳腺増強（BPE）との区別が困難な場合あり',
      'DCIS vs IDC: DCISはNME/clumped/linear. IDCはmass形成が多い。DWIはIDCの方がADC低値',
    ],
    pitfalls: [
      '月経周期による偽陽性: 排卵期〜黄体期は背景乳腺増強（BPE）が増加。月経7-14日目に撮像が最適',
      'Type III curve = 必ず悪性ではない: intramammary lymph nodeもType III curveを示す。形態+部位で鑑別',
      '造影タイミング: 造影剤投与後60-90秒から連続撮像。タイミングがずれるとkinetic curveの正確な評価不能',
      'BPEが強い場合: 強いBPEは感度を維持するが特異度が低下。BI-RADS 3（probably benign）の割合が増加',
      'DWIの空間分解能: 乳腺DWIは空間分解能がDCEに劣る。小病変はDWIで検出困難。DCEが主、DWIは補助',
    ],
    additionalImaging: [
      'BI-RADS 4以上 → MRIガイド下生検 or セカンドルックUS',
      '術前評価 → DCE-MRI全体で対側乳腺・多発病変の検索',
      '化学療法効果判定 → DCE-MRI（残存腫瘍範囲）+ DWI/ADC（治療反応の早期指標）',
      '高リスク群スクリーニング → 年1回のDCE-MRI（BRCA変異キャリアなど）',
    ],
  },

  // ============================================================
  // 心臓
  // ============================================================
  {
    id: 'myocardial-infarction',
    region: '心臓',
    disease: '心筋梗塞',
    keySequence: 'LGE（遅延造影, 最重要）+ Cine MRI + T2WI/T2 mapping + 心筋Perfusion',
    typicalFindings: [
      'LGE（Late Gadolinium Enhancement）: 壊死/線維化心筋が高信号。冠動脈支配領域に一致した分布パターン → 虚血性を証明',
      'Subendocardial pattern: 心内膜側から高信号が始まる → 虚血性心疾患に特異的。非虚血性はmid-wall/epicardialパターン',
      'Transmural infarction: LGEが心内膜から心外膜まで全層に及ぶ → 心筋viability低い（回復見込み乏しい）',
      'Non-transmural infarction: LGEが50%未満 → 血行再建後の機能回復が期待できる',
      'MVO（microvascular obstruction）: LGE高信号内の中心低信号（dark core）。200μm以下の微小血管閉塞=no-reflow zone。予後不良因子',
      'T2高信号: myocardial edema（at-risk area）の範囲を反映。LGE範囲（infarct core）より広い → myocardial salvage index算出可能',
    ],
    differentialPoints: [
      '虚血性 vs 非虚血性LGE: 虚血性=subendocardial〜transmural+冠動脈支配域一致。非虚血性=mid-wall/epicardial+支配域不一致',
      '急性 vs 慢性梗塞: 急性=T2浮腫あり+MVO可能あり+壁運動低下。慢性=T2浮腫なし+壁菲薄化',
      'LGEのtransmurality評価: 0%=正常、1-25%=回復期待大、26-50%=中間、51-75%=回復限定的、76-100%=回復見込みなし',
    ],
    pitfalls: [
      'LGE撮像タイミング: 造影後10-15分で撮像。早すぎると正常心筋のwashoutが不十分で偽陽性',
      'TI設定: 正常心筋をnull（黒く）するTI値を適切に設定。TI scout（Look-Locker）で最適TIを決定',
      'MVO vs 正常心筋: LGE内の低信号=MVO。正常心筋のnull（黒）と混同しない。Phase-sensitive IR（PSIR）を使えばTI依存性が減少',
      '慢性期の薄い梗塞巣: 壁が薄くなり部分容積効果でLGEが見えにくい → 短軸高分解能撮像',
    ],
    additionalImaging: [
      '急性期 → Cine（壁運動評価）+ T2 mapping（浮腫=at-risk area）+ First-pass perfusion + LGE',
      '慢性期 → Cine + LGE（scar burden評価）。ICD適応判断にLGEのtransmurality/範囲が重要',
      '虚血評価 → stress perfusion MRI（アデノシン/レガデノソン負荷）で誘発虚血の検出',
    ],
  },
  {
    id: 'myocarditis',
    region: '心臓',
    disease: '心筋炎',
    keySequence: 'T2 mapping/T2WI（浮腫）+ LGE + T1 mapping/ECV（2018 Lake Louise Criteria）',
    typicalFindings: [
      '2018 Lake Louise Criteria（更新版）: T2-based criterion（浮腫） + T1-based criterion（壊死/線維化）の2項目中2項目陽性で診断。感度88%/特異度96%',
      'T2-based criterion: T2 mapping値上昇またはT2WIで心筋局所高信号 = 浮腫',
      'T1-based criterion: native T1値上昇、ECV上昇、またはLGE陽性。いずれか1つで陽性',
      'LGEパターン: 非虚血性パターン（epicardial/mid-wall、特に下側壁〜側壁が好発）。冠動脈支配域に一致しない',
      '典型的分布: epicardium（心外膜側）から始まり、重症例ではmid-wallに拡大。下外側壁が好発部位',
      '2009年旧Lake Louise Criteria: "2 out of 3"（T2浮腫+early enhancement+LGE）→ 2018年版で更新',
    ],
    differentialPoints: [
      '心筋炎 vs 心筋梗塞: 心筋炎=epicardial/mid-wall LGE+非冠動脈支配域。梗塞=subendocardial+冠動脈支配域',
      '心筋炎 vs たこつぼ心筋症: たこつぼは心尖部の壁運動異常+T2浮腫。LGEは通常軽微or absent',
      '心筋炎 vs HCM: HCMは非対称性中隔肥厚+RV-LV junction LGE。SAM所見。心筋炎は臨床経過（急性発症）で鑑別',
      '心筋炎 vs サルコイドーシス: サルコイドーシスはbasal septal LGE+両側肺門リンパ節腫脹。慢性経過',
    ],
    pitfalls: [
      '軽症心筋炎: LGEが微小/absent。T2 mappingの方が感度が高い場合あり',
      '遅延相のタイミング: LGE撮像は造影後10-15分。心筋炎のLGEは梗塞より淡いことがあり、TI設定の精度が重要',
      '急性期と慢性期の違い: 急性期=T2浮腫(+)+LGE(+)。慢性期/治癒後=T2浮腫(-)+LGE残存（瘢痕）or 消失',
      '心膜炎合併: 心筋炎+心膜炎（myopericarditis）の場合、心膜の造影増強+心膜液貯留もチェック',
    ],
    additionalImaging: [
      '心筋炎疑い → 急性期にCine + T2 mapping + T1 mapping + LGE（Lake Louise Criteria full protocol）',
      'フォローアップ → 3-6ヶ月後のMRIで炎症消退・瘢痕化の確認',
      '原因検索 → 心筋生検（gold standard）。CMRで生検部位のガイドも可能',
      '心機能評価 → Cine MRIでEF/EDV/ESV/mass定量',
    ],
  },
  // ============================================================
  // 血管
  // ============================================================
  {
    id: 'aortic-dissection',
    region: '血管',
    disease: '大動脈解離',
    keySequence: 'CE-MRA（3D GRE）+ 黒血T1（HASTE double-IR）+ PC-MRI（流速評価）',
    typicalFindings: [
      '内膜フラップ（intimal flap）: 大動脈腔を真腔・偽腔に分割する薄い隔壁。CE-MRAで明瞭描出',
      '真腔: T2で暗い（高流速スピン飽和）+ 収縮期に拡張。偽腔: T2で明るい（低流速 or 血栓形成）',
      'エントリー部: 内膜フラップの亀裂部。Stanford A型は上行大動脈に及ぶ（外科的緊急）',
      '分枝血管灌流評価: 腎動脈・上腸間膜動脈・腸骨動脈が真腔/偽腔のどちらから分岐するかを確認（臓器虚血の有無）',
      'Stanford分類: A型=上行大動脈含む（外科手術）。B型=下行大動脈のみ（内科的管理）',
      'CE-MRA MIPでは偽腔の造影剤充填パターン・偽腔瘤様拡張・大動脈壁肥厚を評価',
    ],
    differentialPoints: [
      '解離 vs 壁内血腫（IMH）: IMHは内膜フラップなし。大動脈壁内の三日月状T1高信号（亜急性血腫）',
      '解離 vs 動脈瘤破裂: 破裂は壁の不連続+周囲血腫。解離はフラップ構造が特徴的',
      '真腔 vs 偽腔の同定: ①外側に位置することが多い偽腔②Cobweb sign（クモの巣状繊維索）=偽腔③収縮期に拡張=真腔',
    ],
    pitfalls: [
      'Gd禁忌（eGFR<30）の患者では黒血法T1/T2のみで評価→解離フラップの描出が制限される',
      'A型解離（外科緊急）を見逃さないこと：上行大動脈が範囲に含まれるか確認',
      '撮像時間が長いと息止め中に造影剤のピークを逸しCE-MRAの造影が不完全になる',
    ],
    additionalImaging: [
      'ボーラストラッキングでGdピーク時間を個別化（特に高齢者・低心拍出量患者）',
      '解離の範囲確認後にPC-MRI（Phase Contrast）で真腔/偽腔の流速評価が可能',
      '術後フォロー: 偽腔血栓化の確認・吻合部評価',
    ],
  },
  {
    id: 'renal-artery-stenosis',
    region: '血管',
    disease: '腎動脈狭窄',
    keySequence: '非造影bSSFP MRA（eGFR<45時）または CE-MRA（3D GRE）',
    typicalFindings: [
      '腎動脈主幹部の狭窄: 粥状動脈硬化性（開口部～近位1/3、高齢者）vs 線維筋性異形成FMD（中遠位部、若い女性）',
      '狭窄度評価: 70%以上の狭窄で血行動態的有意狭窄。MIPで細い血管では過大評価に注意',
      'FMD（線維筋性異形成）: 腎動脈中遠位部の数珠状狭窄（String of Beads sign）。20-40代女性に多い',
      '二次性変化: 同側腎の萎縮（慢性虚血）・皮質薄縮。腎血管性高血圧の根拠評価',
      '非造影MRA: bSSFP（NATIVE TrueFISP）。ECGトリガー収縮期-拡張期差分で動脈のみ描出',
    ],
    differentialPoints: [
      '腎動脈狭窄 vs 腎動脈瘤: 瘤は限局した嚢状/紡錘状拡張。連続性を確認',
      '粥状動脈硬化 vs FMD: 粥状=開口部石灰化。FMD=中遠位部数珠状（若い患者）',
    ],
    pitfalls: [
      'eGFR<45でGd使用はNSFリスク。非造影MRAを優先（NATIVE bSSFP）',
      '腎動脈の小径（5-6mm）と呼吸体動でMIP画像の過大/過小評価が生じやすい',
      '非造影MRAではステント内腔は評価困難（金属による信号消失）',
    ],
    additionalImaging: [
      '腎機能評価: ASL（Arterial Spin Labeling）で腎灌流定量',
      '術後/カテーテル後フォロー: CE-MRA or CTAで再狭窄評価',
    ],
  },
  // ============================================================
  // 腫瘍（全身）
  // ============================================================
  {
    id: 'lymphoma',
    region: '腫瘍',
    disease: '悪性リンパ腫（全身staging）',
    keySequence: 'DWIBS（全身DWI: b=800-1000）+ Inverted MIP + 造影CT/PET-CT比較',
    typicalFindings: [
      'DWIBS（Diffusion-weighted whole-body imaging with Background body signal Suppression）: STIR+高b値DWI全身撮像',
      '腫瘍リンパ節: DWI高信号（細胞密度高→拡散制限）。ADC値は1.0×10⁻³mm²/s未満が多い',
      'Inverted MIP: DWI信号を反転してMIP処理→PET画像に類似した全身腫瘍分布像',
      '治療効果判定: 化学療法後のADC値上昇（細胞死→拡散回復）で奏効評価。PET-CTと高い一致率',
      '骨髄浸潤: DWI高信号で椎体・骨盤骨髄への浸潤を検出。CTでは見落としやすい',
    ],
    differentialPoints: [
      'リンパ腫 vs 転移性リンパ節: リンパ腫=軟部組織様のADC、融合傾向。転移=原発巣の信号特性を反映',
      'リンパ腫 vs 胚細胞腫瘍: 縦隔・後腹膜の若年男性。マーカー（AFP・HCG）と組み合わせ',
    ],
    pitfalls: [
      '呼吸同期（STIR+RT）がないと腹部DWIが体動でブレて診断不能',
      '腸管ガス・膀胱尿が高b値DWIで高信号を示し偽陽性になることがある（T2 shine-through）',
      'ADC計算省略→活動性リンパ節（DWI高信号）と壊死・嚢胞の鑑別困難',
    ],
    additionalImaging: [
      '治療前後でADC値を定量比較（関心領域を固定して再現性を確保）',
      '頭頸部・胸部への評価漏れを防ぐため全身スキャン範囲を必ず確認',
    ],
  },
  {
    id: 'adrenal-adenoma',
    region: '腫瘍',
    disease: '副腎腺腫（化学シフトMRI）',
    keySequence: 'GRE Opposed-Phase/In-Phase（T1 dual-echo）',
    typicalFindings: [
      '副腎腺腫の特徴: 細胞内微小脂肪（microscopic fat）を含む。CT値<10HU（脂質リッチ腺腫）',
      'Opposed-Phase（OP）でIn-Phase（IP）より信号低下: 腺腫では水・脂肪が同一ボクセル内に共存→OP信号相殺',
      'Signal Intensity Index（SII）= (IP − OP) / IP × 100（%）',
      'SII ≥ 16.5%: 副腎腺腫と診断（感度87%/特異度97%）',
      '1.5TのTE設定: IP=4.6ms / OP=2.3ms。3TのTE設定: IP=2.3ms / OP=1.15ms（間違えやすい）',
      '非腺腫（転移・褐色細胞腫）: 細胞内脂肪なし→SIIに有意な変化なし（<10%）',
    ],
    differentialPoints: [
      '腺腫 vs 褐色細胞腫: 褐色細胞腫はT2で明瞭高信号（「lightbulb bright」）。尿中カテコラミン上昇',
      '腺腫 vs 転移: 転移はSII低値+原発巣の信号特性を反映',
      '腺腫 vs 副腎皮質癌: 癌は大きい（>4cm）+OP/IPに変化なし+周囲浸潤',
    ],
    pitfalls: [
      '3TではOPとIPのTE設定が1.5Tの半分になること（TE=1.15ms/2.3ms）を忘れると正しい位相にならない',
      'Macroscopic fat（成熟奇形腫・骨髄脂肪腫）とMicroscopic fat（腺腫）を混同しない: 前者はCTで−100HU以下',
      '脂質乏しい腺腫（lipid-poor adenoma）: CT値10-30HU→SIIが低値でも腺腫の可能性あり（wash-out CT要追加）',
    ],
    additionalImaging: [
      '非確定的な場合: ダイナミック造影CT（15分後wash-out >60%: 腺腫）で確定',
      '機能的評価: 血漿アルドステロン・コルチゾール・カテコラミン測定と組み合わせ',
    ],
  },
]

// 部位別にグループ化するユーティリティ
export function getByRegion(region: string): ClinicalFinding[] {
  return clinicalFindings.filter((f) => f.region === region)
}

export function getById(id: string): ClinicalFinding | undefined {
  return clinicalFindings.find((f) => f.id === id)
}

export const regions = [
  '頭部',
  '腹部',
  '脊椎',
  '骨盤',
  '関節',
  '乳腺',
  '心臓',
  '血管',
  '腫瘍',
] as const
