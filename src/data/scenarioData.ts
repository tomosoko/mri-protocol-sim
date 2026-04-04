import type { ProtocolParams } from './presets'

export interface ScenarioOption {
  label: string
  paramChanges: Partial<ProtocolParams>
  isCorrect: boolean
  explanation: string
}

export interface Scenario {
  id: string
  title: string
  category: '急患' | '小児' | '閉所恐怖症' | '金属' | '体動' | '呼吸困難' | '造影' | 'SAR超過'
  difficulty: 1 | 2 | 3
  patientInfo: string
  currentPresetId: string
  question: string
  options: ScenarioOption[]
  detailedExplanation: string
  relatedParams?: string[]
}

export const scenarios: Scenario[] = [
  // ─── 造影剤アレルギー・腎機能障害 ──────────────────────────────────────
  {
    id: 'contrast_allergy_01',
    title: '造影剤アレルギー既往患者の肝臓MRI',
    category: '造影',
    difficulty: 2,
    patientInfo: '58歳 女性。HCC精査目的。過去にGd造影剤投与後にじんましん（軽度）の既往あり。腎機能正常(eGFR=78)。',
    currentPresetId: 'liver_eob',
    question: 'この患者に造影MRIを行う場合、最も適切な対応はどれですか？',
    options: [
      {
        label: '前投薬（ステロイド+抗ヒスタミン）を行い造影剤を投与する',
        paramChanges: {},
        isCorrect: true,
        explanation: '軽度アレルギー既往の場合、前投薬（メチルプレドニゾロン32mg×2回 or ヒドロコルチゾン200mg + 抗ヒスタミン剤）を行えば造影剤投与は可能です。放射線科医・主治医との確認が必要。緊急蘇生セット準備も必須。',
      },
      {
        label: '造影剤を使わずにb値追加のDWIのみで評価する',
        paramChanges: { inlineADC: true },
        isCorrect: false,
        explanation: 'DWIのみでは肝臓の動脈相・門脈相・遅延相の血流パターンが評価できず、HCCの確診は困難です。非造影評価の限界を理解した上で主治医に相談が必要。',
      },
      {
        label: '造影剤を使わずに撮像を終了する',
        paramChanges: {},
        isCorrect: false,
        explanation: '前投薬で対応可能なケースを無造影で終了するのは診断能を著しく損ないます。アレルギー既往があっても前投薬と緊急対応体制を整えれば安全に実施可能な場合があります。',
      },
      {
        label: 'Gd製剤を半量にして造影する',
        paramChanges: {},
        isCorrect: false,
        explanation: '造影剤を半量にしても前投薬なしではアレルギーリスクは変わりません。また用量を下げると造影効果が不十分になります。適切な前投薬と通常量での投与が推奨されます。',
      },
    ],
    detailedExplanation: '造影剤アレルギー既往患者の管理: 軽度既往（じんましん、掻痒感）では前投薬プロトコルで対応可能。重度既往（アナフィラキシーショック）の場合は個別のリスク・ベネフィット評価が必要。eGFRが30未満の慢性腎臓病ではGSN（腎性全身性線維症）リスクのあるGd製剤は禁忌。環状構造のマクロ環型Gd（ガドテリック酸など）はリニア型より安全性が高い。',
    relatedParams: ['inlineADC'],
  },
  {
    id: 'renal_failure_01',
    title: '腎不全患者の腹部MRI',
    category: '造影',
    difficulty: 3,
    patientInfo: '72歳 男性。腎不全（eGFR=22）。膵臓腫瘤精査目的。Gd造影剤はGSNリスクで禁忌。',
    currentPresetId: 'mrcp_3d',
    question: 'Gd造影剤を使用できないこの患者で膵臓腫瘤を最大限評価するために何を追加すべきですか？',
    options: [
      {
        label: 'DWIを追加してADCマップで腫瘍評価する',
        paramChanges: { inlineADC: true },
        isCorrect: true,
        explanation: 'DWI（b=0, 400, 800）＋ADCマップは造影剤不要の腫瘍評価法です。膵腺癌はADC低値（拡散制限）を示し、嚢胞性腫瘍はADC高値を示します。MRCP+DWIの組み合わせは腎不全患者の標準的アプローチです。',
      },
      {
        label: 'Gd造影剤を少量（半量）投与する',
        paramChanges: {},
        isCorrect: false,
        explanation: 'eGFR<30の重症腎不全ではリニア型Gd製剤は禁忌です。「少量なら安全」という根拠はなく、GSN発症リスクが依然存在します。マクロ環型でも慎重な判断が必要です。',
      },
      {
        label: 'MRCPのTEをさらに延長してT2コントラストを強調する',
        paramChanges: { TE: 800 },
        isCorrect: false,
        explanation: 'MRCP の TE延長は膵管・胆管の液体コントラストを改善しますが、固形腫瘍の描出には限界があります。DWI追加の方が腫瘍評価の補完として有効です。',
      },
      {
        label: '造影CTに変更する',
        paramChanges: {},
        isCorrect: false,
        explanation: 'ヨード造影剤も腎機能が低い患者では造影剤腎症リスクがあります。また電離放射線の被爆も伴います。非造影MRIにDWIを追加する方向で最大限評価するのが適切です。',
      },
    ],
    detailedExplanation: '腎不全患者の造影MRI: eGFR<30mL/min/1.73m²ではリニア型Gd製剤（Gd-DTPA, Gd-EOB-DTPA等）は腎性全身性線維症（NSF/GSD）リスクで禁忌。マクロ環型（ガドテリック酸, ガドブトロール等）は相対的に安全だが慎重な適用が必要。非造影で最大限の情報を得るにはDWI・MRCP・T1 Dixon・T2 HASSTEの組み合わせが有効。透析患者では透析直後にマクロ環型を使用すれば許容される場合もある（施設ポリシーに従う）。',
    relatedParams: ['inlineADC', 'TE', 'bValues'],
  },

  // ─── 急患 ───────────────────────────────────────────────
  {
    id: 'emergency_01',
    title: '急患：息止め不可の腹部撮像',
    category: '急患',
    difficulty: 2,
    patientInfo: '72歳 男性。急性腹症疑い。重篤な呼吸困難があり、息止め不可能。SpO2 88%。',
    currentPresetId: 'abdomen_t2_bh',
    question: '現在のプロトコルは息止め（BH）設定です。この患者に最適な変更はどれですか？',
    options: [
      {
        label: '呼吸トリガー（RT）に変更する',
        paramChanges: { respTrigger: 'RT' },
        isCorrect: true,
        explanation: '呼吸トリガー（RT）は自由呼吸下でも呼吸周期に同期して収集できるため、息止め不可の急患に適しています。撮像時間は延長しますが安全に施行できます。',
      },
      {
        label: 'averagesを3に増やして画質を補う',
        paramChanges: { averages: 3 },
        isCorrect: false,
        explanation: 'averages増加は撮像時間を大幅に延長します。息止め不可の患者ではさらに体動アーチファクトが増加するため逆効果です。',
      },
      {
        label: 'そのまま撮像して後処理で補正する',
        paramChanges: {},
        isCorrect: false,
        explanation: '息止め不可の状態でBHプロトコルを続行すると、重篤な体動アーチファクトが生じ診断不能となる可能性が高いです。',
      },
      {
        label: 'ipatFactorを4に増やして撮像時間を短縮する',
        paramChanges: { ipatFactor: 4 },
        isCorrect: false,
        explanation: 'iPATファクター増加でSNRが著しく低下し、ゴーストアーチファクトが増加します。息止め時間は短縮できても画質劣化が問題です。',
      },
    ],
    detailedExplanation: '呼吸困難患者では息止めを強いることでSpO2がさらに低下し危険です。呼吸トリガー（RT）またはPACEナビゲーター同期に切り替えることが基本対応です。緊急度が非常に高い場合はHASTEシングルショット（turboFactor極大）も選択肢です。',
    relatedParams: ['respTrigger', 'averages', 'ipatFactor'],
  },
  {
    id: 'emergency_02',
    title: '急患：急性脳梗塞疑いの緊急DWI',
    category: '急患',
    difficulty: 1,
    patientInfo: '65歳 女性。突然の右片麻痺・失語。発症から30分。緊急DWI依頼。',
    currentPresetId: 'brain_t2',
    question: '急性脳梗塞を最も早期に検出するために最適なシーケンス設定はどれですか？',
    options: [
      {
        label: 'DWIプリセットへ変更し、b値を0と1000に設定する',
        paramChanges: { bValues: [0, 1000], inlineADC: true, ipatMode: 'GRAPPA', ipatFactor: 2 },
        isCorrect: true,
        explanation: 'DWIは急性脳梗塞の第一選択で、発症2時間以内から高信号を検出できます。b=1000+ADC mapの組み合わせが標準です。',
      },
      {
        label: 'FLAIRを追加してT2-FLAIRミスマッチを確認する',
        paramChanges: { TI: 2200, TR: 9000 },
        isCorrect: false,
        explanation: 'FLAIRは発症後4〜6時間以降に高信号化します。急性期（発症30分）ではDWIの方が感度が高く、FLAIR単独では検出困難です。',
      },
      {
        label: 'T2 TSEのままaveragesを2に増やして撮像する',
        paramChanges: { averages: 2 },
        isCorrect: false,
        explanation: 'T2 TSEは急性脳梗塞の早期検出には不向きです。発症直後はDWIが最も高感度です。',
      },
    ],
    detailedExplanation: 'DWI（拡散強調画像）は急性脳梗塞を発症後数十分で検出できる唯一のシーケンスです。b=1000のDWIとb=0からADC mapを算出することで、真性拡散制限と浮腫を鑑別できます。撮像時間は約1〜2分と短く、緊急対応に最適です。',
    relatedParams: ['bValues', 'inlineADC', 'ipatMode', 'ipatFactor'],
  },

  // ─── 小児 ───────────────────────────────────────────────
  {
    id: 'pediatric_01',
    title: '小児：鎮静下頭部撮像',
    category: '小児',
    difficulty: 2,
    patientInfo: '3歳 男児。水頭症フォローアップ。鎮静薬（ミダゾラム）使用。鎮静効果は約20分間。',
    currentPresetId: 'brain_t2',
    question: '鎮静時間内に必要な撮像を完了させるための最優先の調整はどれですか？',
    options: [
      {
        label: 'iPATを有効（GRAPPA factor 2）にして撮像時間を短縮する',
        paramChanges: { ipatMode: 'GRAPPA', ipatFactor: 2 },
        isCorrect: true,
        explanation: 'iPAT（並列撮像）は撮像時間を大幅に短縮でき、限られた鎮静時間内に複数シーケンスを施行可能にします。小児MRIでは鎮静時間の管理が最重要事項です。',
      },
      {
        label: 'averagesを3に増やして体動アーチファクトに備える',
        paramChanges: { averages: 3 },
        isCorrect: false,
        explanation: '鎮静下では体動は減少しますが、averages増加で撮像時間が大幅に延長されます。鎮静が切れる前に終了できなくなるリスクが高まります。',
      },
      {
        label: 'FLAIRをメインに変更して白質評価を優先する',
        paramChanges: { TI: 2200, TR: 9000, turboFactor: 20 },
        isCorrect: false,
        explanation: 'FLAIRは撮像時間が長く、3歳以下では白質髄鞘化が未完成のためFLAIRの解釈が困難です。水頭症評価にはT2が優先されます。',
      },
      {
        label: 'matrixを512×512に上げて高分解能撮像する',
        paramChanges: { matrixFreq: 512, matrixPhase: 512 },
        isCorrect: false,
        explanation: 'matrix増大は撮像時間を大幅に延長します。鎮静時間が限られる状況では禁忌に近い選択です。',
      },
    ],
    detailedExplanation: '小児鎮静MRIでは鎮静効果の持続時間が厳しい制約となります。iPAT（GRAPPA/CAIPIRINHA）で撮像時間を短縮しつつ、必須シーケンスを優先順位付けして施行します。小児用コイル・適切なFOV設定も重要です。',
    relatedParams: ['ipatMode', 'ipatFactor', 'averages', 'turboFactor'],
  },
  {
    id: 'pediatric_02',
    title: '小児：体動が多い頭部撮像（非鎮静）',
    category: '小児',
    difficulty: 3,
    patientInfo: '8歳 女児。頭痛・けいれん精査。非鎮静でのMRI。落ち着きがなく、頭部を動かし続けている。',
    currentPresetId: 'brain_t2',
    question: '体動アーチファクトを最小化するための最も効果的な対策はどれですか？',
    options: [
      {
        label: 'turboFactorを増やし（30以上）、撮像時間を短縮する',
        paramChanges: { turboFactor: 30 },
        isCorrect: true,
        explanation: 'turboFactor増大によりエコートレインが長くなり、1TRあたりに収集するk空間ラインが増えるため撮像時間が短縮されます。体動が多い患者では撮像時間短縮が最も効果的です。',
      },
      {
        label: 'averagesを4に増やして体動の影響を平均化する',
        paramChanges: { averages: 4 },
        isCorrect: false,
        explanation: 'averages増加は撮像時間を4倍に延長します。体動が多い患者での撮像時間延長は逆効果で、アーチファクトがさらに増加します。',
      },
      {
        label: 'satBandsを追加して体動信号を飽和させる',
        paramChanges: { satBands: true },
        isCorrect: false,
        explanation: 'satBandsは特定方向からの信号（血流アーチファクト等）を抑制しますが、頭部の自発運動による体動アーチファクトには効果がありません。',
      },
      {
        label: 'phaseEncDirをR>>Lに変更してアーチファクトの影響を変える',
        paramChanges: { phaseEncDir: 'R>>L' },
        isCorrect: false,
        explanation: 'phaseEncDir変更はアーチファクトの方向を変えるだけで、体動アーチファクト自体を減少させません。根本的な解決にはなりません。',
      },
    ],
    detailedExplanation: '非鎮静小児MRIでの体動対策の基本は撮像時間短縮です。turboFactor増大・iPAT・partialFourierの活用が有効です。また、Head First位置でのヘッドレスト固定・耳栓によるグラジェント音軽減・親の付き添いも重要な非技術的対策です。',
    relatedParams: ['turboFactor', 'averages', 'ipatMode', 'partialFourier'],
  },

  // ─── 閉所恐怖症 ─────────────────────────────────────────
  {
    id: 'claustrophobia_01',
    title: '閉所恐怖症：頭部撮像の短縮',
    category: '閉所恐怖症',
    difficulty: 2,
    patientInfo: '45歳 男性。頭痛精査。既往に閉所恐怖症あり。ボア内での不安が強く、できるだけ短時間で終わらせたい。',
    currentPresetId: 'brain_t2',
    question: 'T2撮像時間を最大限短縮しつつ診断画質を維持するための組み合わせとして最適なものはどれですか？',
    options: [
      {
        label: 'iPAT GRAPPA factor 2 + partialFourier 6/8 を有効にする',
        paramChanges: { ipatMode: 'GRAPPA', ipatFactor: 2, partialFourier: '6/8' },
        isCorrect: true,
        explanation: 'iPAT（GRAPPA）は位相エンコード数を半減し、partialFourierはk空間の約75%のみ収集することで撮像時間を大幅に短縮します。両者を組み合わせることで診断画質を維持しながら最大の時間短縮が可能です。',
      },
      {
        label: 'FOVを500mmに拡大してスライス数を減らす',
        paramChanges: { fov: 500, slices: 12 },
        isCorrect: false,
        explanation: 'FOV拡大は空間分解能を低下させ、スライス数減少でカバレッジが不十分になります。時間短縮効果も限定的で診断価値が下がります。',
      },
      {
        label: 'gradientModeをWhisperに変更して患者の不安を軽減する',
        paramChanges: { gradientMode: 'Whisper' },
        isCorrect: false,
        explanation: 'Whisperモードはグラジェント騒音を軽減しますが、撮像時間は短縮されません。閉所恐怖の主因が騒音の場合は有効ですが、時間短縮には直接貢献しません。',
      },
      {
        label: 'sliceThicknessを10mmに増やしてスライス数を半減する',
        paramChanges: { sliceThickness: 10, slices: 12 },
        isCorrect: false,
        explanation: 'スライス厚増大は部分容積効果が増加し、小病変の検出感度が低下します。時間短縮効果も軽微で、診断精度を大きく損ないます。',
      },
    ],
    detailedExplanation: '閉所恐怖症患者へのアプローチは多面的です。技術的には（1）iPAT+partialFourier で時間短縮、（2）Whisperモードで騒音軽減。非技術的には（1）事前の十分な説明、（2）鏡やビデオゴーグル、（3）必要に応じた抗不安薬投与、（4）Feet-First体位への変更が有効です。',
    relatedParams: ['ipatMode', 'ipatFactor', 'partialFourier', 'gradientMode'],
  },
  {
    id: 'claustrophobia_02',
    title: '閉所恐怖症：腹部撮像の工夫',
    category: '閉所恐怖症',
    difficulty: 3,
    patientInfo: '55歳 女性。肝腫瘤精査。閉所恐怖症のため通常の息止め（10秒）が困難。グラジェント音にも敏感。',
    currentPresetId: 'abdomen_t2_bh',
    question: '閉所恐怖症かつ息止め困難な患者に対して最適な対応はどれですか？',
    options: [
      {
        label: '呼吸トリガー（RT）に切り替え、gradientModeをWhisperにする',
        paramChanges: { respTrigger: 'RT', gradientMode: 'Whisper' },
        isCorrect: true,
        explanation: '呼吸トリガーで息止め不要にしつつ、Whisperモードでグラジェント騒音を軽減します。閉所恐怖症の複合的な不安要素（閉空間＋騒音＋息止め）に総合的に対処できます。',
      },
      {
        label: 'そのまま撮像し、不安時はインターコムで声かけする',
        paramChanges: {},
        isCorrect: false,
        explanation: '声かけは重要ですが、根本的な息止め困難の問題は解決されません。体動アーチファクトにより診断不能となるリスクが高いです。',
      },
      {
        label: 'turboFactorを最大（180）にしてシングルショット撮像にする',
        paramChanges: { turboFactor: 180, respTrigger: 'BH' },
        isCorrect: false,
        explanation: 'シングルショットHASTEは1枚ごとの息止め時間を1〜2秒に短縮できますが、息止め不可の患者には依然として困難です。また画質（コントラスト、SNR）が大幅に低下します。',
      },
      {
        label: 'bValuesを追加してDWIとT2を同時に取得する',
        paramChanges: { bValues: [0, 800], inlineADC: true },
        isCorrect: false,
        explanation: 'DWI追加は肝腫瘤評価に有用ですが、現在の問題は息止め困難への対処です。呼吸同期の問題を先に解決しなければ追加シーケンスも診断価値がありません。',
      },
    ],
    detailedExplanation: '閉所恐怖症＋息止め困難の複合ケースでは優先順位が重要です。まず呼吸同期方法を変更（BH→RT or PACE）し、次に環境改善（Whisperモード・ビデオゴーグル）を行います。撮像時間は延長しますが、診断可能な画像取得が最優先です。',
    relatedParams: ['respTrigger', 'gradientMode', 'turboFactor'],
  },

  // ─── 金属 ───────────────────────────────────────────────
  {
    id: 'metal_01',
    title: '金属：人工股関節置換術後',
    category: '金属',
    difficulty: 2,
    patientInfo: '68歳 男性。右人工股関節置換術後（チタン合金）。大腿骨頭壊死の対側評価。金属アーチファクト軽減が必要。',
    currentPresetId: 'hip_dixon',
    question: '人工股関節周囲の金属アーチファクトを軽減するための最適な設定はどれですか？',
    options: [
      {
        label: 'bandwidthを最大（490Hz/px程度）に増加させる',
        paramChanges: { bandwidth: 490 },
        isCorrect: true,
        explanation: 'バンド幅を広くすることでケミカルシフトアーチファクトや金属による磁場不均一に起因する歪みを軽減できます。金属アーチファクト軽減の基本的かつ最も効果的な対策です。',
      },
      {
        label: 'fatSatをCHESSに変更して脂肪を抑制する',
        paramChanges: { fatSat: 'CHESS' },
        isCorrect: false,
        explanation: 'CHESS脂肪抑制は磁場均一性に依存します。金属近傍では磁場不均一が強いためCHESSは不均一な脂肪抑制となり、むしろアーチファクトが増加します。金属周囲ではSTIRが推奨されます。',
      },
      {
        label: 'fieldStrengthを3.0Tに変更する',
        paramChanges: { fieldStrength: 3.0 },
        isCorrect: false,
        explanation: '3Tでは磁場感受性の影響が大きくなり、金属アーチファクトが1.5Tと比較して著しく増加します。金属インプラント患者では1.5Tが推奨されます。',
      },
      {
        label: 'ipatFactorを3に増やしてアーチファクトを分散させる',
        paramChanges: { ipatFactor: 3 },
        isCorrect: false,
        explanation: 'iPATファクター増加は金属アーチファクト軽減に効果がなく、むしろSNRを低下させます。',
      },
    ],
    detailedExplanation: '金属インプラント患者へのMRI対応の原則：(1) bandwidth最大化、(2) field strength低減（3T→1.5T）、(3) STIR使用（CHESSは磁場不均一に弱いため不可）、(4) MARS（Metal Artifact Reduction Sequences）の検討、(5) voxelサイズ最小化。Siemens装置ではSPACEやSLICE-ENCODINGによるMARS機能も有効です。',
    relatedParams: ['bandwidth', 'fatSat', 'fieldStrength', 'ipatFactor'],
  },
  {
    id: 'metal_02',
    title: '金属：ペースメーカー近傍の脊椎撮像',
    category: '金属',
    difficulty: 3,
    patientInfo: '75歳 女性。MRI条件付き対応ペースメーカー植え込み済み。頸椎症の評価が必要。ペースメーカー担当医との事前確認済み。',
    currentPresetId: 'spine_c_qtse',
    question: 'MRI条件付きペースメーカー患者の撮像で最も重要な安全設定はどれですか？',
    options: [
      {
        label: 'SARassistantをAdvancedに設定し、allowedDelayを最大にする',
        paramChanges: { sarAssistant: 'Advanced', allowedDelay: 300 },
        isCorrect: true,
        explanation: 'SARアシスタントAdvancedモードはRF出力を自動制御し、ペースメーカーへのエネルギー付与（リード加熱）を最小化します。allowedDelay延長により装置はSAR制限内に収まるよう自動調整します。これがペースメーカー患者撮像の最重要設定です。',
      },
      {
        label: 'flipAngleを最大（180°）にしてコントラストを上げる',
        paramChanges: { flipAngle: 180 },
        isCorrect: false,
        explanation: 'flipAngle増大はSAR（比吸収率）を増加させます。ペースメーカーリードの加熱リスクが高まるため禁忌に近い操作です。',
      },
      {
        label: 'gradientModeをFastにして撮像時間を短縮する',
        paramChanges: { gradientMode: 'Fast' },
        isCorrect: false,
        explanation: 'Fastモードは傾斜磁場の切り替えを速くしますが、ペースメーカーへの主な影響はRF（SAR）です。傾斜磁場による誘導電流にも注意が必要ですが、SAR管理が最優先です。',
      },
      {
        label: 'MTコントラストを追加してコントラストを向上させる',
        paramChanges: { mt: true },
        isCorrect: false,
        explanation: 'MT（磁化移動）パルスはSARを大幅に増加させます。ペースメーカー患者では禁忌レベルの設定です。',
      },
    ],
    detailedExplanation: 'MRI条件付きペースメーカー患者の撮像は可能ですが、厳格な安全管理が必要です。(1) SARAssistant Advanced設定、(2) SAR上限値の遵守（全身SAR ≤2W/kg）、(3) 1.5T以下での使用、(4) 特定シーケンス禁忌（MT、IRなど）の確認、(5) 撮像中のバイタル監視、(6) ペースメーカー担当医の立会い。事前にメーカーのMRI条件書類を必ず確認してください。',
    relatedParams: ['sarAssistant', 'allowedDelay', 'flipAngle', 'mt'],
  },

  // ─── 体動 ───────────────────────────────────────────────
  {
    id: 'motion_01',
    title: '体動：不随意運動（パーキンソン病）',
    category: '体動',
    difficulty: 2,
    patientInfo: '72歳 男性。パーキンソン病。静止時振戦（右手）が著明。頭部MRI（脳萎縮・白質病変評価）。',
    currentPresetId: 'brain_flair',
    question: '不随意運動による体動アーチファクトを軽減するための最適な対策はどれですか？',
    options: [
      {
        label: 'partialFourierを6/8に設定して撮像時間を短縮する',
        paramChanges: { partialFourier: '6/8' },
        isCorrect: true,
        explanation: 'partialFourierはk空間の一部のみを収集し、対称性を利用して補完します。撮像時間を短縮しつつ画質への影響を最小限にできます。体動の多い患者では撮像時間短縮が最も有効な対策です。',
      },
      {
        label: '頭部固定バンドを強く締めて動かないようにする',
        paramChanges: {},
        isCorrect: false,
        explanation: '不随意運動（振戦）は物理的拘束で抑制できません。過度の固定は患者に不快感を与え、かえって全身の緊張から体動が増加することがあります。',
      },
      {
        label: 'satBandsを追加して振戦部位をカバーする',
        paramChanges: { satBands: true },
        isCorrect: false,
        explanation: 'satBandsは特定領域の信号を飽和させますが、頭部への体動伝播を防ぐことはできません。頭部の動き自体のアーチファクトは軽減されません。',
      },
      {
        label: 'averagesを2にして信号平均化でアーチファクトを低減する',
        paramChanges: { averages: 2 },
        isCorrect: false,
        explanation: 'averages増加は撮像時間が2倍になり、体動アーチファクトが増加します。体動がランダムでない不随意運動では平均化効果も限定的です。',
      },
    ],
    detailedExplanation: 'パーキンソン病の振戦は2〜6Hzの周期的な運動です。対策として(1) 撮像時間短縮（partialFourier・iPAT）、(2) より短いTRのシーケンス選択、(3) 内服タイミング（オフ期を避けMRI施行）の調整が有効です。BLADE（放射状k-space）シーケンスは体動に強く、頭部振戦患者に特に有効です。',
    relatedParams: ['partialFourier', 'averages', 'ipatMode', 'turboFactor'],
  },
  {
    id: 'motion_02',
    title: '体動：認知症患者の腹部撮像',
    category: '体動',
    difficulty: 3,
    patientInfo: '82歳 女性。重度アルツハイマー型認知症。指示理解不可。膵腫瘤の精査が必要。息止め不可・体位保持困難。',
    currentPresetId: 'abdomen_t2_bh',
    question: '指示理解困難・体位保持困難な患者の腹部MRIで最適な対応はどれですか？',
    options: [
      {
        label: 'PACEナビゲーター同期（PACE）に変更し、ipatMode GRAPPAを有効にする',
        paramChanges: { respTrigger: 'PACE', ipatMode: 'GRAPPA', ipatFactor: 2 },
        isCorrect: true,
        explanation: 'PACEナビゲーターは横隔膜位置をリアルタイムで追跡し、呼吸の最適な位相でのみデータを収集します。指示不要の自由呼吸下で撮像でき、iPATと組み合わせることで効率的なデータ収集が可能です。',
      },
      {
        label: 'ECGトリガーを追加して心拍動期の呼吸を補正する',
        paramChanges: { ecgTrigger: true },
        isCorrect: false,
        explanation: 'ECGトリガーは心臓の動きに同期するものです。腹部（膵臓）の主要な動きは呼吸性であり、ECGトリガー単独では呼吸による体動は解決されません。',
      },
      {
        label: 'turboFactorを最大（180）にしてシングルショット収集する',
        paramChanges: { turboFactor: 180 },
        isCorrect: false,
        explanation: 'シングルショットはSNRが大幅に低下し、膵腫瘤の詳細評価に必要な画質が得られません。緊急スクリーニングには有効ですが、精査目的には不十分です。',
      },
      {
        label: 'そのままBHプロトコルで撮像して後処理で修正する',
        paramChanges: {},
        isCorrect: false,
        explanation: '息止め不可の患者でBHプロトコルを続行すると診断不能な体動アーチファクトが生じます。後処理での修正も困難です。',
      },
    ],
    detailedExplanation: '認知症患者の腹部MRIは技術的に最も困難な状況の一つです。PACE（ナビゲーターエコー）は横隔膜を追跡し呼吸ゲーティングを自動化します。指示が出せない患者でも高品質な画像が得られます。撮像時間はRT比で約1.5〜2倍になります。DWI（bValue=0,50,800）追加も膵腫瘤評価に有用です。',
    relatedParams: ['respTrigger', 'ipatMode', 'ipatFactor', 'turboFactor'],
  },

  // ─── 呼吸困難 ───────────────────────────────────────────
  {
    id: 'respiratory_01',
    title: '呼吸困難：腹部呼吸補正の変更',
    category: '呼吸困難',
    difficulty: 2,
    patientInfo: '60歳 男性。COPD（重症）。胆嚢腫瘤精査。不規則な浅い呼吸パターン。RTに同期困難（呼吸間隔が不規則）。',
    currentPresetId: 'abdomen_t2_rt',
    question: '不規則な呼吸パターンのため通常の呼吸トリガー（RT）が機能しません。最適な対応はどれですか？',
    options: [
      {
        label: 'PACEナビゲーターに変更して横隔膜を直接追跡する',
        paramChanges: { respTrigger: 'PACE' },
        isCorrect: true,
        explanation: 'PACEは腹壁（ベルト）ではなく横隔膜の実際の位置をナビゲーターエコーで直接追跡します。不規則な呼吸パターンでも横隔膜が安定した位置（呼気末）にある瞬間のみデータを収集するため、RTより信頼性が高いです。',
      },
      {
        label: '息止め（BH）に戻して可能な限り短い息止めで対応する',
        paramChanges: { respTrigger: 'BH' },
        isCorrect: false,
        explanation: 'COPD重症患者に息止めを求めることは、呼吸状態をさらに悪化させる危険があります。医療安全上も推奨できません。',
      },
      {
        label: 'averagesを4にして不規則呼吸を平均化する',
        paramChanges: { averages: 4 },
        isCorrect: false,
        explanation: 'averages増加は撮像時間を4倍に延長します。COPD重症患者にとって長時間のMRI撮像は身体的負担が大きく、体動も増加します。',
      },
      {
        label: 'phaseOversamplngを増加させてゴーストアーチファクトを軽減する',
        paramChanges: { phaseOversampling: 50 },
        isCorrect: false,
        explanation: 'phaseOversamplingはfold-over（折り返し）アーチファクトを軽減しますが、呼吸性体動アーチファクトには効果がありません。',
      },
    ],
    detailedExplanation: 'COPD重症患者の腹部MRIではPACEナビゲーターが最適です。呼吸ベルト（RT）は腹壁の動きに依存するため、COPD患者の異常な呼吸パターン（胸式優位・不規則）では同期が失敗することがあります。PACEは横隔膜を直接モニタリングするため信頼性が高く、データ収集効率（acceptance rate）も設定可能です。',
    relatedParams: ['respTrigger', 'averages', 'phaseOversampling'],
  },
  {
    id: 'respiratory_02',
    title: '呼吸困難：肝臓ダイナミック造影の対応',
    category: '呼吸困難',
    difficulty: 3,
    patientInfo: '58歳 女性。HCC疑い。腹水貯留により横隔膜が挙上し、息止めが5秒程度しかできない。肝臓ダイナミックMRIが必要。',
    currentPresetId: 'liver_eob',
    question: '息止め5秒しかできない患者に肝ダイナミックMRIを施行する際の最適な設定はどれですか？',
    options: [
      {
        label: 'ipatMode CAIPIRINHAを有効にし、ipatFactor 3に増やす',
        paramChanges: { ipatMode: 'CAIPIRINHA', ipatFactor: 3 },
        isCorrect: true,
        explanation: 'CAIPIRINHAは2D並列撮像で、従来のGRAPPAより高加速度でSNRを維持できます。factor 3で撮像時間を約1/3に短縮でき、5秒の息止め内での収集が可能になります。ダイナミックMRIでの短息止め対応に最も効果的です。',
      },
      {
        label: 'TR/TEを最小値にしてブラッシュ撮像時間を短縮する',
        paramChanges: { TR: 2.5, TE: 1.0 },
        isCorrect: false,
        explanation: 'TR/TE短縮は有効な時間短縮手段ですが、コントラストが大幅に変化し動脈相・門脈相の診断精度に影響します。また最小値は装置制約があり単独では5秒以内に収めることは困難です。',
      },
      {
        label: 'スライス数を10枚に減らして撮像時間を短縮する',
        paramChanges: { slices: 10 },
        isCorrect: false,
        explanation: 'スライス数減少でカバレッジが大幅に制限されます。肝全体を評価するには最低でも40〜50スライス必要であり、10スライスでは診断に不十分です。',
      },
      {
        label: '呼吸トリガー（RT）に変更してダイナミック相の収集を続ける',
        paramChanges: { respTrigger: 'RT' },
        isCorrect: false,
        explanation: 'ダイナミック造影MRIにRTを使用すると、各相の収集時間が大幅に延長し、造影剤の相（動脈相・門脈相）の正確なタイミングでの収集が困難になります。',
      },
    ],
    detailedExplanation: '腹水・横隔膜挙上患者のダイナミックMRIでは、(1) CAIPIRINHA高加速並列撮像、(2) 圧縮センシング（CS-SENSE）、(3) 非造影MRAへの変更を検討します。息止め時間が5秒以下の場合、keyhole法（中心k空間のみ息止め収集）も有効です。腹水穿刺後の撮像も選択肢として医師と相談します。',
    relatedParams: ['ipatMode', 'ipatFactor', 'respTrigger', 'slices'],
  },

  // ─── 造影 ───────────────────────────────────────────────
  {
    id: 'contrast_01',
    title: '造影：EOB造影後の脂肪抑制の注意',
    category: '造影',
    difficulty: 2,
    patientInfo: '52歳 男性。肝細胞癌（HCC）術後フォロー。EOB-DTPA（Primovist）使用。肝細胞相（20分後）のT1強調画像が必要。脂肪肝あり。',
    currentPresetId: 'liver_eob',
    question: 'EOB造影肝細胞相で脂肪肝合併例に最適な脂肪抑制法はどれですか？',
    options: [
      {
        label: 'Dixon法（Water-Fat分離）を使用する',
        paramChanges: { fatSat: 'Dixon' },
        isCorrect: true,
        explanation: 'Dixon法は磁場不均一に影響されず安定した脂肪抑制が得られます。EOB造影後は腸管ガスや腹水による磁場不均一が問題になりますが、Dixonは各ボクセルで独立して水・脂肪を分離するため最も信頼性が高いです。',
      },
      {
        label: 'CHESS脂肪抑制を使用する',
        paramChanges: { fatSat: 'CHESS' },
        isCorrect: false,
        explanation: 'CHESSは磁場均一性に依存します。腹部（特に腸管ガス・腹水合併例）では磁場不均一が生じやすく、不均一な脂肪抑制（ムラ）が発生しやすいです。肝臓の均一な脂肪抑制が必要なEOB肝細胞相には不適切です。',
      },
      {
        label: 'STIR法を使用してT1コントラストでも脂肪抑制する',
        paramChanges: { fatSat: 'STIR' },
        isCorrect: false,
        explanation: 'STIRはT2系シーケンスで使用する脂肪抑制法です。T1強調のEOB肝細胞相にSTIRを使用すると、EOB造影剤の短縮したT1を持つ肝実質信号も抑制されてしまい、造影効果が消失します。',
      },
      {
        label: '脂肪抑制なしで撮像し、プリコントラスト画像で差分する',
        paramChanges: { fatSat: 'None', inlineSubtraction: true },
        isCorrect: false,
        explanation: '差分法（subtraction）は一定の有効性がありますが、脂肪肝の場合は前後でfat signalが変化するため誤差が生じます。また横隔膜位置のズレによるmisregistrationアーチファクトが問題になります。',
      },
    ],
    detailedExplanation: '腹部MRIの脂肪抑制選択指針：T1系（Dynamic/EOB）→ Dixon法が最優先。T2系 → SPAIR（磁場均一性が良い場合）またはSTIR（金属・磁場不均一が強い場合）。関節系 → SPAIR。3T撮像 → Dixonが特に有効（化学シフト量が2倍になるため分離精度が高い）。',
    relatedParams: ['fatSat', 'inlineSubtraction'],
  },
  {
    id: 'contrast_02',
    title: '造影：乳腺ダイナミック造影の脂肪抑制',
    category: '造影',
    difficulty: 2,
    patientInfo: '45歳 女性。乳癌術後経過観察。3T乳腺ダイナミックMRI。前回検査でSPAIR脂肪抑制が不均一だったと記録あり。',
    currentPresetId: 'breast_dynamic',
    question: '乳腺MRIで均一な脂肪抑制が得られなかった場合の最適な対応はどれですか？',
    options: [
      {
        label: 'Dixon法に変更して乳腺全体の均一な脂肪抑制を図る',
        paramChanges: { fatSat: 'Dixon' },
        isCorrect: true,
        explanation: 'Dixon法は局所的な磁場不均一の影響を受けず、乳腺全体で均一な脂肪抑制が得られます。特に3T乳腺MRIでは磁場不均一が問題になりやすく、Dixonは標準的な選択肢です。',
      },
      {
        label: 'shimをManualに変更して磁場均一化を手動調整する',
        paramChanges: { shim: 'Manual' },
        isCorrect: false,
        explanation: '手動shimは技術的に熟練が必要で、時間がかかります。また完全な解決にはならないことが多く、Dixon法の方が確実です。',
      },
      {
        label: 'CHESS脂肪抑制に変更する',
        paramChanges: { fatSat: 'CHESS' },
        isCorrect: false,
        explanation: 'CHESSもSPAIRと同様に磁場均一性に依存します。SPAIRで均一性が得られなかった状況でCHESSに変更しても改善は期待できません。',
      },
      {
        label: 'STIR法に変更して脂肪を抑制する',
        paramChanges: { fatSat: 'STIR' },
        isCorrect: false,
        explanation: 'STIRはT1の短縮効果も抑制するため、造影剤で増強された病変（乳癌）の信号も低下させてしまいます。乳腺ダイナミック造影でのSTIRは造影効果を損ないます。',
      },
    ],
    detailedExplanation: '乳腺MRIの脂肪抑制均一性は診断品質の要です。3T乳腺MRIでは磁場不均一が生じやすいため、Dixon法が推奨されています。Dixonでは水・脂肪・in-phase・opposed-phaseの4コントラストが同時取得でき、診断情報も豊富になります。またプロトコルに先行してシミング（B0マップ取得）を行うことも有効です。',
    relatedParams: ['fatSat', 'shim', 'fieldStrength'],
  },

  // ─── SAR超過 ─────────────────────────────────────────────
  {
    id: 'sar_01',
    title: 'SAR超過：3T前立腺mpMRI中のSAR警告',
    category: 'SAR超過',
    difficulty: 3,
    patientInfo: '55歳 男性。前立腺癌疑い。3T mpMRI施行中。T2 TSE撮像でSAR上限（4W/kg）に近接する警告が表示された。',
    currentPresetId: 'prostate_mpMRI',
    question: 'SAR警告が表示された際の最適な対処法はどれですか？',
    options: [
      {
        label: 'SARassistantをAdvancedにしてTRを延長し、allowedDelayを増やす',
        paramChanges: { sarAssistant: 'Advanced', allowedDelay: 60, TR: 5000 },
        isCorrect: true,
        explanation: 'SARアシスタントAdvancedモードは自動的にTRを延長・flipAngleを調整してSARを制限内に収めます。allowedDelay増加により装置の自動調整に余裕を与えます。TR延長でもT2コントラストへの影響は軽微です。',
      },
      {
        label: 'flipAngleを180°から90°に下げる',
        paramChanges: { flipAngle: 90 },
        isCorrect: false,
        explanation: 'flipAngle低下はSARを減少させますが、TSEシーケンスのリフォーカスパルスflipAngle変更はコントラストに大きく影響します。また手動操作よりSARアシスタントによる自動制御の方が安全で確実です。',
      },
      {
        label: 'ECGトリガーを追加してパルス間隔を延ばす',
        paramChanges: { ecgTrigger: true },
        isCorrect: false,
        explanation: 'ECGトリガーはTRを心拍周期に固定するため実効的にTRが延長されSARは低下しますが、前立腺T2撮像への適用は不自然で、心拍数によっては逆にTRが短縮する可能性もあります。',
      },
      {
        label: '警告を無視して撮像を続ける',
        paramChanges: {},
        isCorrect: false,
        explanation: 'SAR上限超過の警告を無視することは患者安全上の重大違反です。IEC規格では全身SAR≤4W/kg、局所SAR≤10W/kgが基準で、超過した場合は即座に撮像を停止し設定を変更する義務があります。',
      },
    ],
    detailedExplanation: 'SARは主に磁場強度（B1²に比例）・flipAngle（FA²に比例）・TR（反比例）に依存します。3T装置では1.5Tの4倍のSARが発生します。対策の優先順：(1) SARAssistant Advanced有効化、(2) TR延長、(3) flipAngle低減、(4) turboFactor低減（エコートレイン中のリフォーカスパルス数減少）、(5) iPAT使用（収集パルス数減少）。MT（磁化移動）パルスやSTIRのinversion pulseは特にSARが高いため要注意。',
    relatedParams: ['sarAssistant', 'allowedDelay', 'TR', 'flipAngle', 'mt'],
  },
]
