# Siemens syngo MR シーケンス技術・iPAT 詳細リサーチ

> 対象: 放射線技師向け技術解説  
> 更新: 2026-04-02  
> 参照機器: Siemens MAGNETOM シリーズ（syngo MR プラットフォーム）

---

## 目次

1. [Siemens 3T固有シーケンス技術](#1-siemens-3t固有シーケンス技術)
   - [qtse (Quiet TSE)](#11-qtse-quiet-tse)
   - [nSTIR (noise-optimized STIR)](#12-nstir-noise-optimized-stir)
   - [RESOLVE DWI](#13-resolve-dwi)
   - [starVIBE](#14-starvibe)
   - [BLADE / fBLADE](#15-blade--fblade)
   - [NATIVE TrueFISP](#16-native-truefisp)
   - [SHFL (Shuffle)](#17-shfl-shuffle)
   - [mobiDiff](#18-mobidiff)
   - [CAIPIRINHA](#19-caipirinha)
   - [Heavy Dixon](#110-heavy-dixon)
2. [iPAT 技術の詳細](#2-ipat-技術の詳細)
3. [Opposed-phase / In-phase 撮影](#3-opposed-phase--in-phase-撮影)
4. [ABLE (Auto Bolus Logic Enhancement) / CARE Bolus](#4-able--care-bolus)
5. [技術比較サマリー](#5-技術比較サマリー)

---

## 1. Siemens 3T固有シーケンス技術

### 1.1 qtse (Quiet TSE)

#### 概要
qtse（Quiet TSE）は、Siemens の **Quiet Suite** に含まれる低騒音 TSE シーケンスである。「QuietX」技術を TSE に適用したもので、従来の TSE と比較して最大 **97% の騒音低減** を実現する。

#### 騒音低減の原理
MRI の騒音の主原因は**傾斜磁場コイルの急激なスイッチング**による機械的振動（ローレンツ力）である。

QuietX は以下のアプローチで騒音を低減する:

| アプローチ | 内容 |
|---|---|
| 傾斜波形の最適化 | スラーレート（slew rate）を抑制しながら、傾斜磁場の合成経路をインテリジェントに最適化 |
| 傾斜の重み付け | 複数の傾斜軸の合計（intelligent summation of gradients）により振動周波数をシフト |
| 振動抑制設計 | コイルが共振する周波数帯を避けた傾斜スイッチングパターンに変更 |

スキャン時間・画質への影響は最小限に抑えられており、TE/TR パラメータの変更なしに使用できる。

#### 臨床的使用場面
- **小児患者**: 騒音による鎮静の必要性を低減
- **認知症・精神科患者**: 閉所恐怖症や不安の軽減
- **聴覚過敏患者**: 補聴器使用者、聴覚障害者
- 全神経・整形外科検査に適用可能（脳、脊椎、四肢）

---

### 1.2 nSTIR (noise-optimized STIR)

#### 通常 STIR の原理と問題点
STIR（Short Tau Inversion Recovery）は脂肪の T1 値（約 200–300 ms）に合わせた反転時間（TI）を設定し、脂肪信号がヌル点（zero crossing）となるタイミングで画像取得する脂肪抑制法。

**通常 STIR の課題:**
- 脂肪と同等の T1 値を持つ組織（亜急性血腫・造影剤増強部位など）も同時に抑制してしまう
- SNR が SPIR/SPAIR と比較して低い
- 脂肪の完全な分離が困難な場合がある

#### nSTIR の改良点

nSTIR（noise-optimized STIR）は、以下の最適化を加えた改良版 STIR:

| 項目 | 通常 STIR | nSTIR |
|---|---|---|
| SNR | 標準 | ノイズ最適化により向上 |
| 脂肪抑制均一性 | 磁場不均一に弱い | 改善 |
| 磁場均一性への依存 | 低い（STIR の強み） | 低い（維持） |
| 適応対象 | 一般的な全身撮影 | 特に磁場不均一部位（大関節等） |

nSTIR は **磁場不均一性に強い**という STIR 本来の強みを保ちながら SNR を改善した。3T では磁場不均一が顕著なため、特に有用である。

#### 臨床適応
- 大関節（肩・股関節）の脂肪抑制
- 骨髄浮腫評価
- 金属インプラント周囲（磁場不均一が著しい部位）

---

### 1.3 RESOLVE DWI

#### 概要
RESOLVE（**RE**adout **S**egmentation **O**f **L**ong **V**ariable **E**cho trains）は Siemens の readout-segmented EPI（rs-EPI）を用いた DWI シーケンスである。

#### 通常の Single-Shot EPI との違い

| 項目 | Single-Shot EPI (SS-EPI) | RESOLVE (rs-EPI) |
|---|---|---|
| k空間収集 | 1回の励起で全 k 空間を収集 | k 空間を readout 方向に 3〜6 セグメントに分割 |
| エコートレイン長 | 長い | 大幅に短縮 |
| TE | 相対的に長い | 短縮 |
| 幾何学的歪み | 大きい（EPI 歪み） | 大幅に軽減 |
| 磁化率アーチファクト | 強い | 軽減 |
| T2* ぼけ | あり | 軽減 |
| 動き補正 | なし | 2D ナビゲーター取得あり |
| 空間分解能 | 標準 | 高分解能対応 |
| スキャン時間 | 短い | やや長い |

#### 技術詳細
各セグメントの収集間に **2D ナビゲーター（navigator）**が取得され、体動によるセグメント間の位相不整合を検出・補正する。これにより呼吸や体動によるアーチファクトを抑制する。

#### 臨床的優位性

**頭頸部・脳幹 DWI:**
- 脳幹 MRI で中脳水道周囲灰白質・三叉神経・顔面神経などの細構造が鮮明に描出
- 磁化率アーチファクトによる脳幹の歪みを大幅軽減

**前立腺 MRI:**
- 直腸壁-前立腺間の磁化率アーチファクトを除去
- 末梢域の ADC 測定精度が向上
- PI-RADS v2.1 準拠の高品質 DWI の実現

**頭頸部腫瘍・コレステアトーマ:**
- 耳内腫瘤の評価において Single-Shot EPI より幾何学的一致性が優れる

**加速技術との組み合わせ:**
SMS（Simultaneous Multi-Slice）と組み合わせることで、高分解能・低歪みの DWI を大幅な時間短縮で実現できる。

---

### 1.4 starVIBE

#### 概要
starVIBE（star-shaped VIBE）は、**放射状（Radial）k 空間サンプリング**を採用した 3D T1 強調傾斜エコー（GRE）シーケンスである。通常の Cartesian サンプリング VIBE の動き耐性改良版。

#### k 空間収集の仕組み
starVIBE は **Stack-of-Stars（スタック・オブ・スターズ）** アーキテクチャを採用:

- **kx-ky 平面**: 中心を通る放射状スポーク（radial spokes）で収集
- **kz 方向**: 通常の直交（Cartesian）サンプリング
- 結果として円筒形の k 空間カバレッジとなる

#### フリーブリーシングで使える理由

放射状サンプリングには、Cartesian サンプリングにはない **固有の動き耐性（inherent motion robustness）** がある:

1. **k 空間中心の繰り返し通過**: 全スポークが k 空間中心を必ず通過するため、低周波成分（コントラスト・大まかな形態）が繰り返し収集される → 体動の影響が averaging 効果で軽減
2. **アーチファクトの拡散**: Cartesian では体動がゴーストアーチファクトとして現れるが、放射状では画像全体にぼけとして拡散し視認しにくい
3. **時間的な oversampling**: 放射状 k 空間では 180° を超えたデータ収集で中心付近の oversampling が生じる

#### 臨床適応

| 部位 | 使用理由 |
|---|---|
| 腹部・骨盤 | 呼吸・腸管蠕動への耐性 |
| 肺・縦隔 | 呼吸停止困難患者での撮影 |
| 頭頸部 | 嚥下・体動への耐性 |
| 小児 | 息止め困難な患者 |
| 肝臓造影 | 息止め不十分でも診断可能な画質 |

---

### 1.5 BLADE / fBLADE

#### 概要
BLADE は Siemens が実装した **PROPELLER（Periodically Rotated Overlapping ParallEL Lines with Enhanced Reconstruction）** 技術のベンダー名称。TSE ベースの放射状 k 空間サンプリングにより体動補正を行う。

#### k 空間サンプリングの仕組み

```
通常 Cartesian TSE:
  ← → ← → ← →   (位相エンコード方向に順番に充填)
  
BLADE:
    ╱╱╱ → ╲╲╲ → ─── → ...  (ブレードを回転させながら充填)
         ↑ k空間中心を繰り返し通過
```

1. 各 BLADE は複数の平行なエコーライン（TSE のエコートレイン対応）で構成される **矩形の短冊**
2. 短冊を少しずつ回転させながら k 空間を充填
3. k 空間中心は全ブレードでオーバーサンプリングされる

#### 体動補正の仕組み

PROPELLER/BLADE の体動補正は 2 段階:

**Step 1: 位相補正（Phase Correction）**  
各ブレードの回転中心が正確に k 空間中心に一致するよう位相補正。

**Step 2: モーション補正（Motion Correction）**  
ブレード間で検出された以下の体動を補正:
- **面内並進（in-plane translation）**: ブレード間のシフト量を検出・修正
- **面内回転（in-plane rotation）**: ブレード間の回転ずれを検出・修正
- **相関重み付け（Correlation Weighting）**: 体動の大きいブレードを低い重みで再構成に使用

#### fBLADE（Flow-compensated BLADE）
fBLADE は BLADE に **フロー補償傾斜（flow compensation gradient）** を追加した派生版:
- 血管内血流による信号変動（フローアーチファクト）を抑制
- 肝臓・腹部の T2WI で有用
- 通常 BLADE より血管信号が安定

#### 臨床適応

| 部位 | 適応理由 |
|---|---|
| 脳・脊椎 | 体動・嚥下アーチファクト軽減 |
| 腹部（fBLADE） | 呼吸体動 + フローアーチファクト両方に対応 |
| 小児・非協力患者 | 息止め不要 |
| 頭頸部 | 嚥下体動の補正 |

---

### 1.6 NATIVE TrueFISP

#### 概要
syngo NATIVE TrueFISP は **非造影 MRA（Non-contrast MRA）** のための Siemens シーケンス。バランス型 SSFP（Steady-State Free Precession）である TrueFISP を用いて、ガドリニウム造影剤なしで血管を描出する。

#### TrueFISP を使う理由

TrueFISP（= bSSFP: balanced Steady-State Free Precession）の特徴:

| 特性 | 値 |
|---|---|
| コントラスト | T2/T1 比に依存 |
| 血液信号 | 非常に高い（血液の T2/T1 比が大きいため） |
| 静止組織 | 比較的低信号 |
| スキャン速度 | 非常に高速 |

血液の T2/T1 比が大きい（特に動脈血）ため、TrueFISP では**血液が本質的に高信号**となり、造影剤なしで血管コントラストが得られる。

#### NATIVE TrueFISP の技術

空間選択的反転パルス（spatially selective inversion pulse）を利用:

1. **非タグイメージング**: 反転パルスなし → 静止組織・血流ともに高信号
2. **タグイメージング**: スラブ外に反転パルス → 流入する動脈血が緩和中に撮影 → 高信号
3. **サブトラクション**: タグあり - タグなし → 動脈のみ選択的描出

反転パルスの位置を調整することで動脈・静脈を選択的に描出可能。

#### 実施方法（腎動脈）
- **呼吸同期**: 最も安定した画質が得られる（呼吸トリガー使用）
- **反転バンド**: スラブ下方に 2 つの反転バンドを重ねて配置
- 造影 MRA と同等以上の画質を腎動脈近位部・分岐で達成できる報告あり

#### 臨床適応

| 適応 | 理由 |
|---|---|
| 腎動脈狭窄評価 | 造影剤腎症リスクのある CKD 患者 |
| 腎機能低下患者の MRA | Gd 造影剤不使用 |
| 末梢血管 MRA | ガドリニウム禁忌患者 |
| フォローアップ MRA | 繰り返し造影が困難な症例 |

---

### 1.7 SHFL (Shuffle)

#### 概要
SHFL（Shuffle）は Siemens が 3D TSE シーケンス（主に SPACE）の高速化・コントラスト最適化のために開発した技術。Compressed Sensing や k-space sharing と組み合わせて使用される。

#### 技術背景
通常の 3D TSE（SPACE）では、長い echo train 内でコントラストが変化する（T2 減衰）ため、k 空間の収集順序（ordering）がコントラストに影響する。

SHFL は **k 空間収集順序をシャッフル（ランダム化）** することで:
- Compressed Sensing の前提条件（スパース性 + インコヒーレントサンプリング）を満たす
- 高速化と同時に、アーチファクトが均一に分散されコヒーレントな再構成アーチファクトを防ぐ
- 複数の contrast-weighted 画像を同一スキャンから再構成できる可能性

Siemens の Turbo Suite（加速技術群）の一部として位置づけられ、SPACE や VIBE と組み合わせることで最大 40 倍程度の加速因子を実現できる。

#### Compressed Sensing SPACE との関係
- CS-SPACE: ランダムサンプリング + 反復再構成で SPACE を高速化
- SHFL は CS-SPACE の k-space ordering 最適化要素を含む
- 脊椎・関節の 3D T2W 高分解能撮影に適用

---

### 1.8 mobiDiff

#### 概要
mobiDiff は Siemens が胸部領域（主に肺）向けに最適化した **呼吸同期 DWI** シーケンス。通常の EPI DWI が呼吸アーチファクトで困難な胸部領域での DWI 撮影を可能にする。

#### 通常の胸部 DWI との違い

| 項目 | 通常胸部 DWI (SS-EPI) | mobiDiff |
|---|---|---|
| 呼吸対策 | 呼吸停止 or フリーブリーシング平均 | 呼吸同期（ナビゲーター使用） |
| 心拍対策 | なし（心拍アーチファクト残存） | 心電図同期または心拍補正 |
| 画質 | 心・呼吸アーチファクト多い | 大幅に改善 |
| ADC 精度 | 呼吸による ADC 測定誤差あり | 安定した ADC 測定 |
| スキャン時間 | 短い | 呼吸周期依存で延長 |

#### 臨床的使用場面
- 肺腫瘍・転移の評価
- 縦隔・肺門リンパ節の DWI
- 胸膜病変の評価
- ADC 値による肺病変の鑑別

---

### 1.9 CAIPIRINHA

#### 正式名称と概念
**CAIPIRINHA** = Controlled Aliasing In Parallel Imaging Results In Higher Acceleration

iPAT（並列撮像）の一形態で、特に **同時多断面励起（Simultaneous Multi-Slice: SMS）** と組み合わせて使用される。

#### 通常の GRAPPA との違い

**通常 GRAPPA（2D 加速）:**
- 位相エンコード方向に k 空間を間引きサンプリング
- Acceleration Factor = 2 → 位相エンコード数が 1/2
- アンフォールディングはコイル感度差を利用
- エイリアシングは **折り返し（fold-over）** として現れる

**CAIPIRINHA（スライス方向加速）:**
- 複数スライスをマルチバンド RF パルスで同時励起
- エイリアシングが画像内で **位相シフト**されて重なる
- 重なりパターンを **blipped gradient（小さな位相エンコード傾斜）** で制御
- 結果として、コイル間の感度差が最大化される位置にエイリアスが現れる → アンフォールディングが容易

```
通常 SMS（マルチバンドのみ）:
  スライス A と B が画像中心で重なる → g-factor 大

CAIPIRINHA (Blipped-CAIPIRINHA):
  スライス A と B がオフセットして重なる → コイル感度差を最大活用 → g-factor 小
```

#### CAIPIRINHA vs GRAPPA の比較

| 項目 | GRAPPA | CAIPIRINHA |
|---|---|---|
| 加速方向 | 位相エンコード方向（面内） | スライス方向（SMS） |
| k 空間操作 | 位相エンコードのスキップ | マルチバンド + blipped gradient |
| SNR ペナルティ | √R × g-factor | GRAPPA より g-factor が小さい |
| 適用対象 | 3D 撮影全般、EPI | EPI、TSE、GRE の SMS 加速 |
| 臨床評価 | 標準的 | GRAPPA より 68% のケースで画質優位 |

#### 臨床的優位性
- fMRI・DTI でのスライス数増加（脳全体の同時撮影）
- 体幹部 T2WI の息止め時間短縮
- DWI における EPI のスライス加速
- CAIPIRINHA-VIBE は GRAPPA-VIBE より肝臓 MRI でアーチファクトが少ない

---

### 1.10 Heavy Dixon

#### 通常 Dixon 法の概要
Dixon 法（1984年 Dixon 発表）は化学シフト（fat-water 間の共鳴周波数差）を利用した脂肪分離法。複数のエコー（TE）で取得した in-phase・opposed-phase 画像から water-only・fat-only 画像を生成する。

**基本的な Dixon バリアント:**
- **2-point Dixon**: IP + OP の 2 エコー → water / fat 画像
- **3-point Dixon**: 3 エコー → 磁場不均一補正も可能
- **6-point Dixon**: 6 エコー → T2* 補正・高精度脂肪定量対応

#### Heavy Dixon とは

Heavy Dixon は Siemens が呼ぶ**多エコー Dixon（Multi-echo Dixon）**の実装で、より多くのエコーポイント（通常 4〜6 点）を使用する:

| 項目 | 標準 Dixon | Heavy Dixon |
|---|---|---|
| エコー数 | 2〜3 点 | 4〜6 点 |
| 計算複雑性 | 低〜中 | 高い |
| T2* 補正 | なし/簡易 | あり |
| 磁場不均一補正 | 3-point で対応 | より高精度 |
| 脂肪分率定量 | 概算 | 精密（MRI-PDFF に近い） |
| 出力画像 | IP/OP/W/F | IP/OP/W/F + T2*/R2* マップ |
| スキャン時間 | 短い | やや延長 |

**Heavy Dixon の主な用途:**
- **肝脂肪定量（PDFF: Proton Density Fat Fraction）**: T2* 補正により精度が向上
- 鉄過剰症（ヘモクロマトーシス）の評価: R2* マップを同時取得
- 脂肪性変化の精密評価

---

## 2. iPAT 技術の詳細

### 2.1 iPAT とは

**iPAT（integrated Parallel Acquisition Techniques）** は、Siemens が使用する並列撮像技術の**総称ブランド名**。複数の受信コイル素子の感度差を利用して k 空間のサンプリングを減らし、スキャン時間を短縮する。

iPAT に含まれる技術:
- **GRAPPA**: k 空間ベースの並列撮像（主に 2D 加速）
- **CAIPIRINHA**: スライス方向の同時励起加速（SMS）
- SENSE（一部実装）

---

### 2.2 GRAPPA の仕組み

**GRAPPA（GeneRalized Autocalibrating Partially Parallel Acquisitions）** は Griswold et al. (2002) が開発した k 空間ベースの並列撮像法。

#### データ収集

```
通常サンプリング:    ← → ← → ← → ← → ← →  (全 k 空間ライン)
AF=2 GRAPPA:       ← →     ← →     ← →    (1行おきにスキップ)
                       ↑                    ← 欠損ライン
ACS（自己較正行):  ← → ← → ← →             (中心 k 空間を追加取得)
```

#### 再構成手順

1. **ACS 取得**: k 空間中心付近の **Auto-Calibration Signal（自己較正信号）** を Nyquist レートでフル取得
2. **コンボリューションカーネル推定**: ACS データから各コイル素子の重み係数（カーネル）を計算
3. **欠損ライン補間**: カーネルを用いて周囲の取得済み k 空間データから欠損ラインを推定
4. **フーリエ変換**: 各コイル画像に変換
5. **Sum-of-squares 合成**: 各コイル画像を自乗和合成して最終画像生成

#### SENSE との比較

| 項目 | SENSE | GRAPPA |
|---|---|---|
| 動作領域 | 画像空間 | k 空間 |
| コイル感度マップ | 事前取得が必要 | ACS から自動推定 |
| 再構成アーチファクト | fold-over アーティファクトのリスク | より頑健 |
| EPI 適合性 | 限定的 | 高い |
| Siemens での主用途 | 一部 | DWI, fMRI, 体幹部全般 |

---

### 2.3 Acceleration Factor (AF) の選び方

#### SNR ペナルティの計算式

$$\text{SNR}_{iPAT} = \frac{\text{SNR}_{full}}{\sqrt{R} \cdot g}$$

- **R**: Acceleration Factor（加速因子）
- **g**: g-factor（コイル幾何学因子）= コイル配置と AF 依存のノイズ増幅
- g ≥ 1 （理想的なコイルでは g = 1 に近い）

| AF | 撮影時間 | SNR 低下（√R のみ） | 実際の SNR 低下（g 含む） |
|---|---|---|---|
| 1 (なし) | 100% | 0% | 基準 |
| 2 | 50% | ≈29% | ≈40〜50% |
| 3 | 33% | ≈42% | ≈55〜70% |
| 4 | 25% | 50% | ≈60〜75% |

#### 推奨される AF の目安

| 条件 | 推奨 AF | 理由 |
|---|---|---|
| 1.5T 脳・脊椎 | AF=2 | SNR に余裕がないため過度な加速は禁忌 |
| 3T 脳・脊椎 | AF=2〜3 | SNR 余裕あり |
| 3T 腹部 | AF=2〜3 | 息止め短縮のバランス |
| EPI (DWI/fMRI) | AF=2〜3 | エコートレイン短縮効果が大きい |
| AF=4 以上 | 通常使用しない | g-factor が急増し実質的 SNR 低下が著しい |

---

### 2.4 1.5T vs 3T での使い分け

| 項目 | 1.5T | 3T |
|---|---|---|
| 基本 SNR | 低い | 高い（約 2 倍） |
| iPAT のメリット | 大きいが SNR 余裕が少ない | 高い SNR を活かして加速可能 |
| 推奨 AF | 主に AF=2 | AF=2〜3 まで許容範囲 |
| 磁場不均一性 | 少ない | 大きい → g-factor に影響 |
| DWI での EPI 歪み | 中程度 | より大きい → より高い AF で改善効果大 |
| CAIPIRINHA | 使用可 | より効果的（高 SNR を活かせる） |

**重要な注意点**: 3T でも AF=4 以上は g-factor が急増するため（g > 5 になりうる）、SMS 方向でも MB 因子は通常 2〜3 に留める。

---

### 2.5 DWI での iPAT 使用のメリット

EPI ベースの DWI において iPAT は特に重要:

```
通常 EPI (AF=1):
  k 空間ライン: 全取得
  エコートレイン長: 長い
  → T2* 減衰大 → ぼけ
  → EPI 歪み大
  → 磁化率アーチファクト大

iPAT AF=2 適用:
  k 空間ライン: 1/2
  エコートレイン長: 1/2
  → T2* 減衰小 → 鮮鋭
  → EPI 歪み 1/2
  → 磁化率アーチファクト軽減
```

**SNR について**: EPI では後半エコー（信号低下した echo）が除かれるため、サンプル数減少によるSNR 損失を**部分的に補填**できる場合がある。

---

## 3. Opposed-phase / In-phase 撮影

### 3.1 原理（化学シフトを利用した Dixon 法）

水プロトンと脂肪プロトン（メチレン基 CH₂）は Larmor 周波数が異なる（**化学シフト: ≈3.5 ppm**）。

この周波数差により、両者の位相関係は時間とともに変化:

$$\Delta f = \gamma \cdot \Delta\sigma \cdot B_0 = 3.5 \text{ ppm} \times \gamma B_0$$

- 1.5T: Δf ≈ 220 Hz → 周期 ≈ 4.4 ms
- 3.0T: Δf ≈ 440 Hz → 周期 ≈ 2.2 ms

### 3.2 TE 設定: 1.5T vs 3T

| 状態 | 1.5T の TE | 3T の TE |
|---|---|---|
| In-phase (同位相) 最初 | 4.4 ms | 2.2 ms |
| Opposed-phase (逆位相) 最初 | 2.2 ms | 1.1 ms |
| In-phase 2回目 | 8.8 ms | 4.4 ms |
| Opposed-phase 2回目 | 6.6 ms | 3.3 ms |

**臨床でよく使われる TE の組み合わせ:**

| 装置 | TE₁ (Opposed-phase) | TE₂ (In-phase) |
|---|---|---|
| 1.5T | 2.2–2.4 ms | 4.4–4.8 ms |
| 3.0T | 1.1–1.2 ms | 2.2–2.3 ms |
| 3.0T（第2周期） | 3.3–3.5 ms | 4.4–4.6 ms |

3T では TE が短いため、**T1 強調の維持が難しく**なる場合がある。第2周期の TE（3.5/4.6 ms）を使用することで T1 コントラストをより適切に保てる。

### 3.3 画像種類と解釈

**4種類の出力画像:**

| 画像 | 内容 | 信号強度 |
|---|---|---|
| In-phase (IP) | 水 + 脂肪信号の和 | 脂肪混在部位は高信号 |
| Opposed-phase (OP) | 水 − 脂肪信号の差 | 脂肪混在部位は低信号（キャンセル） |
| Water-only | 水成分のみ | 脂肪除去後の水分布 |
| Fat-only | 脂肪成分のみ | 脂肪分布マップ |

**Water-only 画像の意義:**
- 通常の脂肪抑制（SPAIR/STIR）は磁場不均一で不均一になりうる
- Water-only 画像はポストプロセシングで作成するため磁場不均一の影響を受けにくい
- 磁場不均一部位（肩、肝臓端部）での均一な脂肪分離が可能

### 3.4 臨床的有用性

#### 肝脂肪定量
In-phase と Opposed-phase の信号比較:

$$\text{脂肪分率} \approx \frac{SI_{IP} - SI_{OP}}{2 \times SI_{IP}} \times 100 \%$$

- 脂肪肝: OP 画像で肝実質の信号が顕著に低下
- 重症脂肪肝判定: 信号低下率 > 20% が目安

#### 副腎腫瘍評価
- **副腎腺腫**: 細胞内脂肪を含む → OP で信号低下（**signal dropout**）
- **副腎転移・褐色細胞腫**: 細胞内脂肪なし → OP で信号変化なし
- 副腎腺腫の診断感度・特異度: 78–89% / 96–100%

#### 腎細胞癌評価
- **淡明細胞型 RCC（clear cell RCC）**: 細胞内脂肪豊富 → OP で信号低下
- 他の RCC サブタイプとの鑑別に有用

#### その他
- 骨髄浸潤 vs 正常骨髄の鑑別（脂肪置換パターン評価）
- 脂肪腫の確認

### 3.5 Heavy Dixon との違い

| 項目 | 標準 opp-In（2-point Dixon） | Heavy Dixon（多点Dixon） |
|---|---|---|
| エコー数 | 2（OP + IP） | 4〜6 |
| T2* 補正 | なし | あり |
| 脂肪分率精度 | 概算値 | MRI-PDFF 相当の高精度 |
| 鉄過剰の影響 | あり（T2* 短縮で誤判定リスク） | R2* マップで補正可 |
| スキャン時間 | 短い | 延長 |
| 用途 | 日常的な脂肪評価、副腎 | 研究・精密脂肪定量、鉄定量 |

---

## 4. ABLE / CARE Bolus

### 4.1 CARE Bolus の概要

**CARE Bolus**（Siemens の造影ボーラスモニタリング技術）は、造影剤が目的血管に到達したタイミングを**リアルタイムに監視**し、3D 造影 MRA 撮影のタイミングを最適化する自動技術。

ABLE（Auto Bolus Logic Enhancement）は CARE Bolus の自動判定ロジックを強化した機能。

### 4.2 CARE Bolus の仕組み

#### 技術的原理

1. **モニタリングシーケンス**: 高速傾斜エコー（GRE）を用いた 2D 繰り返し撮影（≈1秒間隔）
2. **Fourier 変換の最適化**: k 空間中心（低周波成分）のみを高速取得 → リアルタイム表示
3. **手動または自動トリガー**: 造影剤の到達をオペレーターが視認 → 手動トリガー、または自動検出（ABLE）

#### ABLE の自動検出ロジック

ABLE は以下のアルゴリズムで造影タイミングを自動判定:

1. ROI（関心領域）をモニタリングスライスに設定
2. 連続画像で ROI 内の信号強度を監視
3. 閾値以上の信号上昇を検出（造影剤到達と判定）
4. **自動的に 3D 撮影シーケンスへ切り替え**
5. 必要に応じて呼吸停止指示のタイミングも自動調整

#### 従来法（Test Bolus / フルオロスコピック法）との比較

| 手法 | 方法 | メリット | デメリット |
|---|---|---|---|
| Test Bolus | 少量の造影剤で事前測定 | 精密なタイミング計算 | 余分な造影剤使用、手技複雑 |
| CARE Bolus（手動） | リアルタイム視認 | シンプル、追加造影剤不要 | オペレーター依存 |
| CARE Bolus + ABLE | 自動検出・切り替え | 最も再現性高い | ROI 設定が重要 |

### 4.3 臨床的意義

- **造影タイミングの最適化**: 動脈相での最大造影効果
- **静脈混入の最小化**: 動脈相に限定した描出が可能
- **再撮影率の低減**: タイミング失敗による再スキャン減少
- **主要適応**: 大動脈、腎動脈、肺動脈、頸動脈の造影 MRA

---

## 5. 技術比較サマリー

### シーケンス選択ガイド

| 臨床課題 | 推奨技術 | 理由 |
|---|---|---|
| 小児・認知症患者の頭部 MRI | qtse | 騒音低減で鎮静不要 |
| 磁場不均一部位の脂肪抑制 | nSTIR / Dixon | 均一な脂肪抑制 |
| 頭頸部・前立腺の高精度 DWI | RESOLVE | 幾何学的歪み最小化 |
| 呼吸困難患者の腹部 T1W | starVIBE | フリーブリーシング対応 |
| 体動の多い患者の T2W | BLADE | 回転・並進体動の自動補正 |
| 腎機能低下患者の血管評価 | NATIVE TrueFISP | 非造影 MRA |
| 脊椎・関節の高速 3D T2W | CS-SPACE（SHFL） | 分解能を維持して高速化 |
| 胸部病変の DWI | mobiDiff | 呼吸同期で高品質 DWI |
| 息止め短縮の腹部 T2W | CAIPIRINHA | SMS でスライス加速 |
| 肝脂肪精密定量 | Heavy Dixon | T2* 補正で MRI-PDFF 対応 |
| 副腎腺腫の鑑別 | Opposed-phase / In-phase | 細胞内脂肪の検出 |
| 造影 MRA のタイミング | CARE Bolus + ABLE | 自動最適化 |

### 3T vs 1.5T での技術選択

| 技術 | 1.5T | 3T | 注意点 |
|---|---|---|---|
| iPAT/GRAPPA | AF=2 標準 | AF=2〜3 可 | 3T で磁場不均一が大きく g-factor に影響 |
| CAIPIRINHA | 使用可 | より効果的 | 高 SNR を活かして MB 加速 |
| RESOLVE | 有用 | より有用 | 3T では EPI 歪みが大きいため効果大 |
| Opposed-phase | TE=2.2/4.4ms | TE=1.1/2.2ms | 3T では TE が短く T1W 維持に注意 |
| STIR/nSTIR | TI≈150ms | TI≈210ms | T1 脂肪値が磁場強度で変わる |

---

## 参考文献・情報源

- [Siemens Healthineers - Quiet Suite](https://www.siemens-healthineers.com/magnetic-resonance-imaging/clinical-specialities/quiet-suite)
- [syngo RESOLVE - Siemens Healthineers USA](https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/syngo-resolve)
- [StarVIBE / Radial-VIBE - Kai Tobias Block](https://tobias-block.net/projects/starvibe/)
- [Free-breathing 3D Stack of Stars GRE (StarVIBE) - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8821742/)
- [syngo BLADE - Siemens Healthineers USA](https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/syngo-blade)
- [syngo NATIVE TrueFISP - Siemens Healthineers](https://www.siemens-healthineers.com/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/syngo-native)
- [CARE Bolus - Siemens Healthineers USA](https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/care-bolus)
- [CAIPIRINHA - MRI Questions](https://mriquestions.com/caipirinha.html)
- [GRAPPA/ARC - MRI Questions](https://mriquestions.com/grappaarc.html)
- [iPAT - MRI Questions](https://mriquestions.com/why-and-when-to-use.html)
- [Dixon method - MRI Questions](https://mriquestions.com/dixon-method.html)
- [In-phase/Out-of-phase - MRI Questions](https://mriquestions.com/in-phaseout-of-phase.html)
- [Parallel Imaging - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC4459721/)
- [Clinical Evaluation of CAIPIRINHA - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3865024/)
- [Sequence-based acoustic noise reduction - Wiley MRM](https://onlinelibrary.wiley.com/doi/full/10.1002/mrm.25229)
- [Generalized Autocalibrating Partially Parallel Acquisitions (GRAPPA) - PubMed](https://pubmed.ncbi.nlm.nih.gov/12111967/)
- [In-Phase and Opposed-Phase Imaging - RadioGraphics](https://pubs.rsna.org/doi/abs/10.1148/rg.2019180043)
- [Fat-suppressed MRI - Siemens MAGNETOM Flash](https://cdn0.scrvt.com/39b415fb07de4d9656c7b516d8e2d907/1800000006277358/8fcfe5f160fd/siemens-healthineers-magnetom-flash-74-ismrm-fat-suppressed-mri_1800000006277358.pdf)
