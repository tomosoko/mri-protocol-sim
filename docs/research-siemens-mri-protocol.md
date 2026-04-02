# Siemens MRIプロトコル リサーチ結果

最終更新: 2026-04-02

---

## 1. EOB-MRI（Gd-EOB-DTPA / プリモビスト）プロトコル

### 1.1 各相の正確なタイミング

| 相 | 造影剤注入後の時間 | 目的 |
|---|---|---|
| 動脈相 (Arterial) | 15-25秒後（Care Bolus使用推奨） | 多血性病変の検出（HCCなど） |
| 門脈相 (Portal Venous) | 40-70秒後 | 門脈血流評価、washout確認 |
| 平衡相 (Equilibrium/Transitional) | 2-5分後 | 被膜（capsule）評価、遅延相washout |
| 肝細胞相 (Hepatobiliary) | **20分後**（標準） | 肝細胞機能評価、OATP発現評価 |

重要ポイント:
- 肝実質のシグナル上昇は注入後10分で有意に上昇し、その後安定化する
- 最良の肝-病変コントラストは注入後20-45分で得られる
- 肝-脾コントラスト比は60分後に最高となる
- **臨床的には20分後の撮像が標準**（10分でも特徴化は可能だが20分がベター）

### 1.2 肝細胞相（15分後・20分後）で何が見えるか

**原理:** Gd-EOB-DTPAは肝細胞膜上のOATP1B1/B3トランスポーターを介して取り込まれ、MRP2を介して胆管に排泄される（約50%が肝胆道系排泄）

**正常肝:** 機能する肝細胞がGd-EOBを取り込み → **高信号**（明るく光る）
**HCC/転移:** OATP発現低下 → 造影剤取り込みなし → **低信号**（暗い欠損像）

見えるもの:
- **転移性肝腫瘍:** 肝細胞がないため明瞭な低信号（検出感度向上）
- **HCC:** OATp発現が段階的に低下→高分化型は等〜高信号もあり、低分化は低信号
- **FNH（限局性結節性過形成）:** 機能的肝細胞含有→等〜高信号（鑑別に有用）
- **肝細胞腺腫:** 種類により異なる（HNF1α変異型は低信号）
- **胆管系:** 造影剤の胆管排泄が可視化される

### 1.3 Care Bolusのタイミング設定方法

**原理:** Care Bolusは高速GREシーケンスでk空間中心のみを測定し、リアルタイムで血管内の造影剤到達を可視化する技術

**設定手順:**
1. Care Bolusモニタリング用スライスを大動脈（腹腔動脈レベル）に設定
2. 造影剤注入開始と同時にモニタリングシーケンス開始
3. 毎秒リアルタイム画像を取得
4. 大動脈への造影剤到達を確認→オペレーターが手動でスキャントリガー
5. k空間中心充填型（centric）3Dダイナミックシーケンスに切り替わる

**EOB特有の注意点:**
- EOBは通常造影剤の半量（0.1 mL/kg vs 0.2 mL/kg）→ボーラスが短い
- 動脈相の撮像ウィンドウが狭い→タイミングがよりシビア
- Abdomen Dot Engineを使用すると自動ボーラスタイミングが可能

### 1.4 HCC典型パターン（LI-RADS対応）

| 相 | HCC所見 | 意義 |
|---|---|---|
| 動脈相 | **濃染（APHE: Arterial Phase HyperEnhancement）** | 腫瘍血管新生を反映 |
| 門脈相 | **Washout（低信号化）** | LI-RADSメジャー所見 |
| 平衡相 | 被膜（Capsule）描出 | LI-RADSメジャー所見 |
| 肝細胞相 | **低信号** | OATP発現低下を反映 |

LI-RADSカテゴリー:
- LR-5（確定的HCC）: APHE + washout + (capsuleまたはサイズ閾値)
- 肝細胞相低信号はLI-RADSのアンシラリー所見として使用
- washout + 肝細胞相低信号の組み合わせで感度97%、特異度95%

### 1.5 EOB vs Gd-DTPA（通常造影）の使い分け

| 項目 | Gd-EOB-DTPA（プリモビスト） | Gd-DTPA（通常造影） |
|---|---|---|
| 分類 | 肝細胞特異性造影剤 | 細胞外液性造影剤 |
| 投与量 | 0.025 mmol/kg（0.1 mL/kg） | 0.1 mmol/kg（0.2 mL/kg） |
| 排泄経路 | 肝胆道系50% + 腎排泄50% | 腎排泄100% |
| 肝細胞相 | あり（20分後） | なし |
| 動脈相ウィンドウ | 狭い（ボーラス短い） | 広い |
| 平衡相 | やや弱い | 明瞭 |

**使い分け基準:**
- **EOBを選ぶ場面:** HCC精査（肝硬変サーベイランス）、肝転移検索、FNH vs 腺腫鑑別、胆管系評価
- **通常造影を選ぶ場面:** 血管評価（MRA）、平衡相が重要な評価（血管腫の確定診断）、腎機能低下時のリスク-ベネフィット考慮

---

## 2. プロトコル最適化の実践テクニック

### 2.1 Basic Decision（分岐）の使い方

Siemens DotGO ワークフロー内の機能で、検査中にプロトコルを条件分岐させる:
- Dot Cockpitで設定: 中央GUIでプロトコル構成・管理
- Dot Engineが部位別ワークフローパッケージを提供
- 検査中に患者状態や臨床疑問に応じてスキャン内容を動的に変更可能
- 例: 造影あり/なし、追加シーケンスの要否をワークフロー内で選択

### 2.2 Concatenationsの意味と設定

**定義:** スライスを複数のTRにわたって均等に分配する技術

**設定の効果:**
- **Concatenation = 1:** 全スライスを1TR内で取得（標準）
- **Concatenation = 2:** スライスを2グループに分割→2TRで取得

**使い分けの理由:**
1. **コントラスト調整:** スライス数がTRに制約される場合、Concatenation増加でTR短縮が可能
2. **息止め最適化:** Concatenation増加 → 各息止め時間短縮 → 患者耐性向上（ただし息止め回数は増加）
3. **クロストーク軽減:** スライス間ギャップなし/極小の場合、Concatenation増加でスライス間干渉を防止

**注意:** Concatenation倍増 = スキャン時間倍増

**Multi Slice Mode:**
- **Interleaved:** スライスを交互に取得（1,3,5...→2,4,6...）→クロストーク軽減
- **Single Shot:** EPI系で全スライスを1回のTR内で同時取得

### 2.3 Distance Factor vs Gap

| 項目 | Distance Factor | Gap |
|---|---|---|
| 単位 | **%（スライス厚に対する割合）** | **mm（絶対値）** |
| 例 | 20% × 5mmスライス = 1mmギャップ | 1mm = 固定 |
| 0%時 | スライス隣接（ギャップなし） | 0mm = 同じ |
| 100%時 | ギャップ = スライス厚と同じ | - |
| 利点 | スライス厚変更時に自動追従 | 直感的 |

**実践ガイド:**
- クロストーク防止に通常10-20%のDistance Factorを設定
- 脊椎矢状断など網羅性が重要な場合は0-10%
- DWIなどSNR重視の場合はやや大きめ（20-30%）

### 2.4 AutoAlign機能の原理と限界

**原理:**
- 3D FLASHローカライザー（15秒以下）で脳の解剖学的ランドマークを自動認識
- 3D MR脳アトラスと照合して標準的なスライス位置を自動設定
- 患者の年齢、頭位、疾患に依存せず再現性のある位置決めが可能

**対応部位:** 頭部、脊椎、膝、肩、股関節

**限界:**
- 著しい解剖学的変形（大きな腫瘍、術後変化）では認識精度が低下する可能性
- 非標準的な体位では適切に機能しない場合がある
- 微調整は手動で必要な場合がある
- 頭部以外は認識精度がやや劣る

### 2.5 Tim Planning Suite / Set-n-Go / Inline Composing

**Tim Planning Suite:**
- Tim（Total imaging matrix）技術により、1つのFOVで全身の複数領域を検査可能
- 患者の再位置決めやコイル交換が不要
- 特に全脊椎検査で威力を発揮

**Set-n-Go:**
- プロトコルのテンプレート化と自動実行
- 標準化されたプロトコルをワンクリックで展開

**Inline Composing:**
- 全脊椎などの複数ステーション撮像で、各ステーションの画像を自動合成
- 椎体ラベリングも自動（AutoAlign Spine連携）
- Recon&GOにより再構成タスクをゼロクリックで自動化

### 2.6 Copy References機能

**使い方:**
1. 次のシーケンスを開く
2. 既に撮像済みのシーケンスを右クリック
3. 「Copy Parameters」を選択
4. コピーする項目（スライス位置・傾き等）をリストから選択して適用

**臨床的意義:**
- 同一スライス位置でのT1/T2/DWI比較が容易
- 造影前後のサブトラクションに必須（完全な位置合わせ）
- フォローアップ検査での再現性確保

---

## 3. シーケンス詳細

### 3.1 BLADE（PROPELLER）

**k空間充填方法:**
- 矩形の「ブレード」を回転させながらk空間を充填
- 各ブレードはTSEエコートレインで構成
- ブレードはk空間中心で重複→中心部が繰り返しサンプリングされる

**体動補正の原理:**
1. **位相補正:** 各ブレードの回転中心をk空間中心に正確に合わせる
2. **並進・回転補正:** 中心円盤（全ブレードが共有）を2Dナビゲーターとして使用→ブレード間の面内回転・平行移動を検出・補正
3. **相関重み付け:** 体動で汚染されたブレードのデータを特定し、重み付けを下げるか除外

**使用場面:**
- 体動が大きい患者（小児、意識障害、非協力的な患者）
- T2WI（脳・脊椎・頭頸部）で特に有効
- 嚥下・呼吸アーチファクト軽減

**注意点:** 通常TSEより撮像時間がやや長い

### 3.2 SPACE（3D TSE）

**通常2D TSEとの違い:**

| 項目 | 2D TSE | SPACE（3D TSE） |
|---|---|---|
| スライス選択 | 選択的RFパルス | **非選択的RFパルス** |
| スライス厚 | 通常3-5mm | **等方的0.5-1.0mm**が可能 |
| リフォーマット | 不可（分解能異方性） | **任意方向にリフォーマット可能** |
| エコー間隔 | 比較的長い | **短い（非空間選択的RFのため）** |
| SAR | 通常 | **Variable Flip Angleで低減** |

**Variable Flip Angle:**
- リフォーカシングRFパルスの角度をエコートレイン中に変化させる
- 低フリップ角の非選択的リフォーカシングパルスにより:
  - エコートレインを大幅に延長可能
  - SAR（比吸収率）を抑制
  - ブラーリングを抑制
  - 長いエコートレイン = 高速撮像

**適応:**
- MRCP（膵胆管撮像）
- 内耳・脳神経描出
- 脊椎3D撮像（矢状断・軸位断・冠状断リフォーマット）
- 関節の等方性3D撮像

### 3.3 RESOLVE DWI

**通常EPI-DWIとの違い:**

| 項目 | SS-EPI DWI | RESOLVE DWI |
|---|---|---|
| 方式 | Single-shot EPI | **Readout-segmented Multi-shot EPI** |
| k空間 | 1回のエコートレインで全取得 | **読み出し方向に複数セグメント分割** |
| 歪み | 大きい（特に空気-骨界面） | **大幅に低減** |
| 分解能 | 中程度 | **高分解能が可能** |
| T2*ブラーリング | 大きい | **軽減** |
| 撮像時間 | 短い | やや長い |

**歪み低減の原理:**
- k空間を読み出し方向に複数セグメントに分割
- 各セグメントのエコー間隔が短縮→帯域幅増加→歪み低減
- TE短縮によりT2*減衰の影響も軽減
- 2Dナビゲーターでショット間位相補正

**使用場面:**
- 頭頸部DWI（副鼻腔・頭蓋底近傍の歪み低減）
- 真珠腫の検出
- 脊椎DWI
- 高分解能が必要な領域

### 3.4 starVIBE

**放射状k空間充填の利点:**
- 「Stack-of-Stars」方式: kx-ky平面をラジアルスポークで取得、kz方向は従来型サンプリング→円筒状k空間
- k空間中心を毎スポークでサンプリング→体動に対する本質的な耐性
- アンダーサンプリングによるストリーキングアーチファクトは体動アーチファクトよりはるかに目立たない

**Free-breathing対応:**
- 呼吸、嚥下、腸管蠕動に対してロバスト
- 息止め不可の患者（小児、高齢者、重症患者）に最適
- 3D脂肪抑制T1WI GREとして使用

**臨床応用:**
- 自由呼吸下の肝ダイナミックMRI
- 息止め困難な患者の造影検査
- 腹部・骨盤部のルーチン撮像

### 3.5 TrueForm B1 Shim

**原理:**
- TimTX TrueFormは2チャンネルRFボディコイルの振幅/位相を独立制御
- 3Tで顕著な誘電体シェーディング（B1不均一性）を補正
- 追加のスキャン時間やワークフロー変更なしで実現

**臨床的意義:**
- 3Tの腹部撮像で左右のシグナル不均一が解消
- 従来の円偏波励起では診断品質が不十分だった領域でも均一な画像が得られる
- Tim 4Gシステムに標準搭載

### 3.6 CAIPIRINHA vs GRAPPA

| 項目 | GRAPPA | CAIPIRINHA |
|---|---|---|
| 方式 | k空間のACSラインから重み係数を算出→欠損データ補間 | GRAPPAに加え、**k空間サンプリングパターンをオフセット** |
| 加速方向 | 主に1方向（PE方向） | **2方向同時加速（PE + パーティション）** |
| g-factor | 高加速時に増大 | **エイリアシングパターンの分散によりg-factor低減** |
| 画質 | R=2×2で限界あり | **R=2×2でもGRAPPAより有意に高画質** |
| 適用 | 2D・3D | **3D撮像で特に有利** |

**実践的な選択:**
- 2D撮像: GRAPPA（標準的）
- 3D VIBE/SPACE等: CAIPIRINHA推奨（g-factor低減で高加速でも安定した画質）

### 3.7 mobiDiff（体動補正DWI）

**原理:**
- 非剛体レジストレーション（Non-rigid Registration）によるDWI体動補正
- b値の異なる複数のDWI画像間の体動ずれを事後的に補正
- 肝臓DWIにおいて、従来DWI比で:
  - 肝辺縁の鮮鋭度向上
  - 肝内血管辺縁の描出改善
  - 肝局所病変のconspicuity向上
  - ADC値の標準偏差低下（より信頼性の高いADC計測）
- 追加スキャン時間なし（再構成時に処理）

---

## 4. 臨床プロトコル構成の理由

### 4.1 頭部: なぜDWIが最初か

**理由: 急性期脳梗塞の早期診断**

- DWIは発症数分以内に虚血組織を検出可能（最も感度・特異度の高いシーケンス）
- 超急性期（0-6時間）: 細胞性浮腫→水分子拡散制限→DWI高信号
- FLAIRは最初の2-3時間では陰性（DWI-FLAIRミスマッチ = 発症4.5時間以内の指標）
- 10分以内の高速プロトコル（BAT MRI等）が推奨される

**典型的順序:** DWI → FLAIR → T2* (GRE/SWI) → MRA → T1

### 4.2 腹部: なぜT2→DWI→Dynamic の順か

**現代のEOBプロトコルの最適ワークフロー:**

実は最新のワークフローでは順番が変化している:
1. **造影剤をできるだけ早く投与**（20分タイマー開始）
2. 動脈相→門脈相→平衡相のダイナミック撮像
3. **ダイナミック撮像後、肝細胞相までの「待ち時間」にT2とDWIを実施**
4. 20分後に肝細胞相撮像

**T2/DWIを造影後に撮れる理由:**
- 造影剤はT1短縮が主効果→T2WIへの影響は軽微
- DWIも同様にT2*ベースなので影響小
- **例外:** 尿路系（膀胱・集合系）は造影剤濃縮でT2短縮が起きるため、T2/DWIは造影前に実施

**この順番のメリット:** スキャン時間の効率化（デッドタイム活用）

### 4.3 乳腺: なぜdynamic前にpre撮像が必要か

**理由: サブトラクション画像のため**

- 乳腺MRIの病変検出はT1WI造影前後のサブトラクション（差分画像）に依存
- Pre-contrast T1WI = サブトラクションマスク
- 乳腺は脂肪に富むためT1WIで高信号 → 造影効果が脂肪信号に埋もれる
- サブトラクション: 脂肪信号をキャンセル → 造影される病変のみが残る

**必要な最低3時点:**
1. 造影前（マスク画像）
2. 造影後約2分（ピーク） → 増強パターン評価
3. 遅延相 → Washout/Plateau/Persistent評価（悪性の鑑別に必須）

### 4.4 脊椎: C-spine / L-spine / Whole-spineの使い分け

| プロトコル | FOV | 対象範囲 | 主な適応 |
|---|---|---|---|
| C-spine | 約260mm | 橋〜T3 | 頸部痛、上肢しびれ、脊髄症、外傷 |
| L-spine | 約350mm | T11〜尾骨 | 腰痛、坐骨神経痛、椎間板ヘルニア |
| Whole-spine | 全脊椎 | C1〜仙骨 | 転移検索、脊髄腫瘍、脱髄疾患、脊柱側弯 |

**Whole-spine特有の技術:**
- Tim Planning Suite + Inline Composingで複数ステーション自動合成
- AutoAlign Spineで椎体自動認識・ラベリング
- Sagittal T1/T2/STIRが基本（転移はSTIRで感度高い）

### 4.5 造影検査: Injection / Care Bolus / CEマーカー

| 用語 | 意味 | 用途 |
|---|---|---|
| Injection | 造影剤注入プロトコルステップ | プロトコル内で注入タイミングを指定 |
| Care Bolus | ボーラストラッキング技術 | リアルタイムで造影剤到達を監視→最適タイミングでスキャン開始 |
| CE マーカー | Contrast-Enhancedの略 | プロトコルツリー内で造影シーケンスを識別する目印 |

---

## 5. Siemens固有の高度機能

### 5.1 Deep Resolve（AI再構成）

4つのコンポーネント:
- **Deep Resolve Boost:** rawデータからのDL再構成→大幅な撮像加速
- **Deep Resolve Gain:** ノイズマップからの適応的デノイジング→局所的にSNR向上
- **Deep Resolve Sharp:** DNNによるシャープネス向上→微細構造の描出
- **Deep Resolve Swift Brain:** マルチショットEPIで脳全検査を2分で完了

**性能:**
- 脳MRIで最大70%の時間短縮 + 分解能2倍
- PAT + SMSとの組み合わせで最大73%の速度向上
- 2020年初導入

### 5.2 Compressed Sensing

**3要件:**
1. **スパース性:** 画像が特定の変換領域で疎（スパース）に表現できる
2. **疑似ランダムアンダーサンプリング:** k空間中心を密に、外側を疎にサンプリング
3. **非線形再構成:** 反復再構成アルゴリズム

**加速因子:** 最大40倍（通常のパラレルイメージングは4倍未満）

**臨床応用:**
- CS GRASP-VIBE: 自由呼吸下で連続取得→時相自由に再構成
- CS SPACE for MRCP: 1回息止めまたは1-2分自由呼吸で高分解能3D（最大20倍加速）
- 心臓シネ: 4分→16秒に短縮

### 5.3 SMS（Simultaneous Multi-Slice）

**原理:**
- マルチバンドRFパルスで複数スライスを同時励起・読み出し
- Blipped CAIPIRINHA法でg-factorによるSNR低下を軽減
- 通常のパラレルイメージングとは異なり、**TR時間自体を短縮可能**

**加速因子:** 最大8倍（DTI/BOLD）

**応用:**
- DWI（脳・乳腺・腹部・骨盤）
- SMS RESOLVE: 歪みのないDWIをさらに60%高速化
- DTI/BOLD: 術前マッピングを臨床ルーチンに

### 5.4 GRAPPA/CAIPIRINHA Reference Lines設定

**ACS（Auto-Calibration Signal）ライン:**
- k空間中心に追加取得するフルサンプリングデータ
- GRAPPAの補間重み係数算出に使用
- 典型的に24-48ライン（加速因子に依存）

**設定のトレードオフ:**
- ACSライン増加 → 再構成品質向上（アーチファクト低減）、ただし加速効率低下
- ACSライン減少 → 高加速が可能、ただしノイズ・アーチファクト増加
- 不適切な補間ウィンドウは過適合/過少適合による重大なアーチファクトの原因

### 5.5 Phase Partial Fourier 4/8の意味

**Partial Fourier:**
- k空間のエルミート対称性（位相共役対称性）を利用
- 半分のデータから残りを数学的に復元

**表記法:**

| 設定 | 取得割合 | 意味 |
|---|---|---|
| 8/8 | 100% | フルサンプリング（Partial Fourierなし） |
| 7/8 | 87.5% | 12.5%のデータを省略 |
| 6/8 | 75% | 25%省略 |
| 5/8 | 62.5% | 37.5%省略 |
| **4/8** | **50%** | **最大省略（k空間の半分のみ取得）** |

**4/8の実践的意味:**
- TE短縮に最大の効果→DWIなどで有用
- SNR低下が大きい
- 位相誤差に敏感→アーチファクト発生リスク
- 通常は6/8〜7/8が実用的バランス

### 5.6 Elliptical Filter / Raw Filter の効果

**Elliptical Filter:**
- k空間の角をカット（円形/楕円形にクロップ）
- k空間の角は信号寄与が少なくノイズが多い
- 効果: SNR向上、ギブスリンギング軽減
- 代償: わずかな空間分解能低下

**Raw Filter（ローパスフィルター）:**
- k空間にハミング窓等を適用
- 高周波ノイズを抑制
- 効果: SNR向上、スムーズな画像
- 代償: ブラーリング（分解能低下）

**実践ガイド:**
- Elliptical Filter: 3D撮像でONが標準（撮像時間短縮にも寄与）
- Raw Filter: SNR不足の場合に検討、ただし微細構造の描出が必要な場合はOFF

### 5.7 Distortion Correction 2D/3D

**歪みの原因:** 傾斜磁場の非線形性（理想的な線形傾斜からのずれ）

| 補正方式 | 範囲 | 精度 | 適用 |
|---|---|---|---|
| **2D補正** | スライス面内のみ | 面内は良好、スライス方向は未補正 | 通常の2Dシーケンス |
| **3D補正** | 全3方向 | アイソセンターから25cm以内で<1mm | 3Dボリューム撮像、放射線治療計画 |

**2D特有の歪み:**
- バレル歪み（面内）
- ポテトチップ効果（スライス選択方向の歪み）
- ボウタイ効果

**3D補正:**
- 球面調和係数に基づく補正マップを使用
- FOVが大きい場合（>25cm）は残存歪みに注意
- 放射線治療計画では3D補正が必須

---

## 6. 造影剤: マグネスコープ（ガドテリドール / Gd-HP-DO3A）

### 6.1 基本特性

| 項目 | マグネスコープ（ProHance） |
|---|---|
| 一般名 | ガドテリドール（gadoteridol） |
| キレート構造 | Gd-HP-DO3A（マクロ環/非イオン性） |
| 濃度 | 0.5 mol/L |
| 浸透圧 | 630 mOsm/kg（低浸透圧） |
| 分類 | 細胞外液性ガドリニウム造影剤 |
| NSFリスク | 最低リスク群（ESUR分類） |
| 排泄 | 腎排泄100%（投与後24時間以内に84.8-106.8%尿中排泄） |

**注意:** マグネスコープの一般名は「ガドテル酸メグルミン」（Gd-DOTA、イオン性マクロ環）の場合もある。Guerbet社製マグネスコープはGd-DOTA、Bracco社製ProHanceはGd-HP-DO3A。施設によってどちらを「マグネスコープ」と呼ぶかが異なるため確認が必要。

### 6.2 投与量

- 通常: **0.2 mL/kg** を静脈内注射
- 腎臓対象: **0.1 mL/kg**（必要に応じ0.2 mL/kgまで増量可）
- 転移性脳腫瘍疑い: 初回0.2 mL/kg → 腫瘍未検出の場合30分以内に0.2 mL/kg追加投与可

### 6.3 マグネスコープ使用時のダイナミックMRIタイミング

細胞外液性造影剤（マグネスコープ含む）の肝臓ダイナミックMRI:

| 相 | 造影剤注入後の時間 | 特徴 |
|---|---|---|
| 動脈相 | **20-35秒** | 大動脈・肝動脈が強く造影。多血性病変の検出 |
| 門脈相 | **70-90秒** | 肝実質が最も強く造影される。門脈血流評価 |
| 平衡相 | **3分以降** | 血管内外の造影剤濃度が均衡。腎排泄まで10分以上持続 |

- コントラストは投与直後から約45分後まで持続
- Care Bolusで動脈相タイミングを最適化（大動脈への造影剤到達をリアルタイム監視）

### 6.4 マグネスコープ vs プリモビスト 使い分け

| 項目 | マグネスコープ（細胞外液性） | プリモビスト（Gd-EOB-DTPA） |
|---|---|---|
| 分類 | 細胞外液性 | 肝細胞特異性 |
| 投与量 | 0.2 mL/kg | 0.1 mL/kg（半量） |
| 排泄経路 | 腎100% | 肝胆道系50% + 腎50% |
| 肝細胞相 | **なし** | **あり（20分後）** |
| 動脈相ウィンドウ | **広い**（ボーラス大） | 狭い（ボーラス短い） |
| 平衡相 | **明瞭** | やや弱い |
| 血管腫診断 | **優位**（平衡相で全体造影） | 不向き |

**使い分け基準:**
- **マグネスコープを選ぶ場面:** 血管評価（MRA）、血管腫の確定診断（平衡相が重要）、高度肝硬変（EOBの肝取込が不十分）、動脈相濃染の正確な評価が最優先の場合
- **プリモビストを選ぶ場面:** HCC精査、肝転移検索、FNH vs 腺腫鑑別、胆管系評価、肝細胞機能評価

### 6.5 ABLEマーカー

**推定:** ABLE = Auto Bolus Logic Enhancement（公式文書での確定的な定義は公開資料からは見つからず）

- Siemens DotGOワークフロー内で「AutoBolus Detection」として実装されている機能と関連する可能性が高い
- Care Bolusのリアルタイム監視を自動化し、造影剤到達を自動検出→スキャンを自動トリガーする仕組み
- Abdomen Dot Engineに統合されており、オペレーターの手動判断を省略
- プロトコルツリー内で「ABLE」マーカーが付いたシーケンスは自動ボーラス検出対応を示す

---

## 7. 追加シーケンス詳細

### 7.1 HASTE vs TSE vs BLADE 使い分け

| 項目 | TSE（Turbo Spin Echo） | HASTE | BLADE |
|---|---|---|---|
| 方式 | マルチショットTSE | **Single-shot TSE + Half Fourier** | **放射状k空間TSE** |
| 励起回数 | 複数（マルチTR） | **1回**で全データ取得 | 複数（各ブレードで） |
| 撮像時間/スライス | 数秒 | **約1秒** | TSEより長い |
| 体動耐性 | 低い | **高い**（超高速） | **高い**（データ冗長性） |
| コントラスト | 最良（フルサンプリング） | やや劣る（Half Fourier） | 良好（中心オーバーサンプリング） |
| SNR | 最高 | 低め | TSE同等以上 |
| ブラーリング | 少ない | あり（長ETL） | 少ない |

**使い分けガイド:**
- **TSE:** 協力的な患者、最高画質が必要な場合（脊椎・関節・脳ルーチン）
- **HASTE:** 息止め撮像（腹部T2WI）、非協力的患者のスクリーニング、MRCPの厚スラブ、胎児撮像
- **BLADE:** 体動が問題だが画質も必要な場合（小児頭部、意識障害、頭頸部の嚥下アーチファクト）

### 7.2 t2_spc_DIXON（SPACE + Dixon）

**組み合わせの原理:**
- SPACE（3D TSE）で等方的高分解能T2WI 3Dデータを取得
- Dixon法でin-phase/opposed-phase/水画像/脂肪画像の4コントラストを1回の撮像で生成
- 結果: 3D等方的T2WI + 均一な脂肪抑制 + 脂肪画像を同時取得

**利点:**
- 従来のCHESS法より均一で確実な脂肪抑制（磁場不均一の影響を受けにくい）
- STIR法より高いSNR
- 広いFOV（脊椎など）での脂肪抑制に特に有効
- 水画像/脂肪画像から脂肪含有量の定量評価が可能
- 任意方向へのリフォーマットが可能（3D等方性）

**臨床応用:**
- 脊椎（変性疾患の脂肪抑制T2WI）
- 筋骨格系（関節・腫瘍の脂肪抑制）
- 骨髄浮腫の検出（水画像）
- 脂肪浸潤の評価（脂肪画像）

### 7.3 TrueFISP / trufi（balanced SSFP）

**原理:**
- 全画像化傾斜磁場を完全にバランスさせた定常自由歳差運動（SSFP）シーケンス
- 各TR内で全傾斜磁場のモーメントがゼロ→位相が0にリフォーカス
- コントラストはT2/T1比に依存（純粋なT1やT2強調ではない）

**特徴:**
- **高SNR:** 定常状態シーケンスの中で最高のSNR効率
- **高速:** 非常に短いTR（3-5ms）で高速撮像が可能
- **液体が高信号:** 血液、CSF、胆汁、関節液、浮腫が明るく描出
- **バンディングアーチファクト:** B0不均一性に敏感→干渉縞（モアレパターン）が発生しうる

**Siemensでの名称:** trufi / TrueFISP
**他社名称:** FIESTA（GE）、balanced FFE（Philips）

**臨床適応:**
- 心臓シネMRI（心機能評価の標準シーケンス）
- 非造影MRA
- 腹部ローカライザー
- MRCP補助（胆管描出）
- 胎児撮像
- 内耳・脳神経描出（CISS = 3D trufi）

### 7.4 kugel5

**推定:** 「kugel」はドイツ語で「球体」を意味する。Siemens MRIのプロトコルツリーでの命名規則から:

- **kugel = Siemens球形QAファントム** を使用した品質管理用プロトコル
- 「5」はb値、スライス数、またはプロトコルバージョンを示す可能性がある
- Siemensは球形ファントム（D165型など）をQAに使用しており、DWI QAプロトコルとして「kugel」名のプロトコルが存在する
- **臨床シーケンスではなく、ファントムQA用プロトコル** の可能性が最も高い
- DWI系のQA（ADC精度検証、歪み評価など）に使用される

---

## 8. プロトコル構成の設計思想（詳細）

### 8.1 頭部 Routine Dot: AAHScout → DWI → MRA → FLAIR → T2 → T1 → T2*

| 順番 | シーケンス | 理由 |
|---|---|---|
| 1 | AAHScout | 自動位置決め。ローカライザー兼用（15秒以下）。後続全シーケンスのスライス位置を自動設定 |
| 2 | DWI | **最優先:** 急性期脳梗塞の早期検出。発症数分で陽性。t-PA適応判断に直結 |
| 3 | MRA | 血管閉塞・狭窄の評価。DWI陽性なら責任血管の同定。造影不要のTOF-MRA |
| 4 | FLAIR | 白質病変、陳旧性梗塞、くも膜下出血の検出。DWI-FLAIRミスマッチで発症時間推定 |
| 5 | T2 | 浮腫、腫瘍、嚢胞など一般的病変の検出 |
| 6 | T1 | 解剖学的評価、出血（亜急性期）、脂肪含有病変 |
| 7 | T2* | 微小出血、石灰化、ヘモジデリン沈着。SWI/GREで超急性期出血の検出 |

**設計思想:** 緊急度の高い所見（脳梗塞→血管閉塞→白質病変）の順に並べ、最悪ケースで途中中断しても最重要情報が得られるようにする。

### 8.2 腹部EOB: pre → injection → Care Bolus → 30s → 60s → 120s → (待機15min) → hepatobiliary

| ステップ | 内容 | 理由 |
|---|---|---|
| pre | 造影前T1WI（VIBE Dixon等） | サブトラクションマスク。造影前の信号をベースラインとして記録 |
| injection | EOB-DTPA注入開始 | 0.1 mL/kgを2mL/sで急速静注 + 生食フラッシュ |
| Care Bolus | 大動脈モニタリング | 腹腔動脈レベルで造影剤到達をリアルタイム監視 |
| ~30s | 動脈相 | APHE（多血性HCC検出）。Care Bolus検出後に自動/手動トリガー |
| ~60s | 門脈相 | Washout評価。肝実質造影ピーク |
| ~120s | 平衡相/移行相 | 被膜評価。遅延washout |
| 待機15min | T2WI/DWI等を撮像 | デッドタイム活用。EOBは造影後のT2/DWIに影響小 |
| ~20min | 肝細胞相 | OATP取り込み評価。HCC/転移は低信号欠損 |

### 8.3 MRCP: localizer → 厚スラブMRCP → T2 HASTE → starVIBE → SPACE → DWI

| 順番 | シーケンス | 理由 |
|---|---|---|
| 1 | Localizer | 位置決め |
| 2 | MRCP 24mm厚スラブ | **Heavy T2WI single-shot:** 胆管・膵管の全体像把握。放射状配置で総胆管・主膵管に沿わせる。1枚1秒で高速 |
| 3 | T2 HASTE（axial/coronal） | 息止め対応の高速T2WI。肝臓・膵臓の形態評価。胆管周囲の解剖学的背景情報 |
| 4 | starVIBE | 自由呼吸下T1WI。息止め困難な患者でも安定した脂肪抑制画像。胆石・腫瘤のT1情報 |
| 5 | SPACE（3D高分解能） | 等方的高分解能T2WI。MIPリフォーマットで胆管樹の詳細構造。呼吸同期で5-8分 |
| 6 | DWI | 腫瘍性病変の検出補助（胆管癌、膵癌など） |

**設計思想:** 厚スラブMRCPで全体把握→HASTE/starVIBEで形態評価→SPACEで詳細構造→DWIで腫瘍評価、と大局から詳細へ進む。

### 8.4 脊椎: localizer → T2 sag → T1 sag → T1 tra → T2 tra → (STIR/DIXON)

| 順番 | シーケンス | 理由 |
|---|---|---|
| 1 | Localizer | 位置決め（AutoAlign Spine対応） |
| 2 | T2 sag | **最重要:** 椎間板変性・ヘルニア・脊柱管狭窄・脊髄圧迫の全体評価。水成分が高信号で病変の検出に最適 |
| 3 | T1 sag | 骨髄評価（正常=高信号、転移/浮腫=低信号）。解剖学的ランドマーク |
| 4 | T1 tra | 椎間板レベルでの軸位断。脂肪vs浮腫の鑑別 |
| 5 | T2 tra | 脊髄/馬尾神経根の軸位評価。椎間板突出方向の確認 |
| 6 | STIR/DIXON | **オプション:** 骨髄浮腫の高感度検出。炎症・感染・転移のスクリーニング |

**T2矢状断を最初にする理由:** 脊髄圧迫など緊急所見を最速で検出。途中中断しても最重要情報が確保される。
**STIR vs Dixon:** STIRは完全な脂肪抑制だがSNR低め。Dixonは高SNRで均一な脂肪抑制+水/脂肪画像同時取得。広FOVではDixonが有利。

### 8.5 乳腺: T2 FS → DWI → pre-contrast → dynamic → post subtraction

| 順番 | シーケンス | 理由 |
|---|---|---|
| 1 | T2 FS | 嚢胞（高信号）vs固形腫瘤の鑑別。浮腫・リンパ節評価 |
| 2 | DWI | **造影前に実施必須:** 造影後はDWIのADC値に影響する可能性。拡散制限=悪性疑い |
| 3 | Pre-contrast T1WI | **サブトラクションマスク。** 位置合わせの基準。脂肪信号のベースライン |
| 4 | Dynamic（造影後複数時相） | 造影パターン評価: Type I（持続増強=良性）、Type II（プラトー=不確定）、Type III（Washout=悪性疑い） |
| 5 | Post subtraction | 各時相からpre画像を減算。脂肪信号を除去し造影効果のみを描出 |

**設計思想:** 造影剤投与前にT2とDWIを完了→pre画像取得→造影→複数時相撮像→サブトラクション処理。造影前シーケンスを先にすることで、造影剤がDWI/T2に影響するリスクを回避。

---

## 9. Siemens UI要素（追加詳細）

### 9.1 AAHScout（Automatic Alignment Head Scout）

**原理:**
- 高速3D FLASHローカライザーを1回取得（約15秒）
- 3D画像から脳の解剖学的ランドマーク（AC-PC line、正中面など）を自動認識
- 3D脳アトラスと照合し、標準的なスライス位置・角度を自動計算
- 後続の全シーケンスに自動適用

**3つのモード:**
- **Basis:** ローカライザーとしてのみ使用
- **Brain:** 脳の自動位置決め（標準モード）
- **Brain Atlas:** 脳アトラスベースの高精度位置決め

**利点:**
- 従来のローカライザー撮像を省略可能（約20秒短縮）
- 患者の頭位、年齢、疾患に依存しない再現性
- フォローアップ検査での比較精度向上
- AAHScoutはAAScout（旧バージョン）より認識精度が向上

### 9.2 Basic Decision / Option（分岐ロジック）

**Dot Cockpitでの構成:**
- プロトコルツリーは5階層: Tree → Region → Exam → Program → Protocol
- **Strategy:** 検査の全体フロー（コアシーケンス + 分岐点）
- **Decision:** 分岐点。技師がyes/noまたは複数選択肢から選ぶ
- **Interaction:** 技師への指示表示（例: 「造影剤注入してください」）

**Basic Decisionの具体例:**
- 「造影あり？」→ Yes: 造影シーケンス追加 / No: スキップ
- 「DWI追加？」→ Yes: DWI実行 / No: 次へ進む
- 「追加sagittal T1?」→ Yes/No

**Option (yes/no):**
- プロトコルツリー内で「(option)」と表示されるシーケンスは条件付き
- 技師が検査時に有効/無効を切り替え可能
- 臨床情報に基づいて柔軟にプロトコル構成を調整

### 9.3 CE / Injection マーカー

- **CE:** Contrast-Enhanced（造影）を示すプロトコル内マーカー
- **Injection:** プロトコルツリー内で造影剤注入タイミングを示すステップ
- 技師へのリマインダーとして機能（「ここで造影剤を注入」）
- Care Bolusシーケンスの直前に配置されることが多い
- プロトコル実行中にInjectionステップで一時停止→技師が造影剤注入→再開

### 9.4 Series: Interl. in B.A.

**推定:** "Interleaved in Breath-hold Acquisition" または "Interleaved in Block Acquisition"

- 複数のスライスグループ（シリーズ）を1回の息止め内で交互（インターリーブ）取得する設定
- 例: 異なるコントラスト（T1とT2）や異なるスライス方向を1回の息止め中に交互実行
- 効率化: 個別に息止めするよりトータル検査時間を短縮
- Concatenation設定と関連し、スライス間クロストーク回避にも寄与

---

## 参考ソース

### EOB-MRI・造影
- [Primovist, Eovist: What to expect? - Journal of Hepatology](https://www.journal-of-hepatology.eu/article/s0168-8278(12)00248-6/fulltext)
- [MR liver imaging with Gd-EOB-DTPA - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3431472/)
- [Gadoxetate Disodium-Enhanced MRI Part 1 - AJR](https://ajronline.org/doi/abs/10.2214/AJR.10.4392)
- [LI-RADS - Radiology Assistant](https://radiologyassistant.nl/abdomen/liver/li-rads)
- [Primovist Liver MRI Protocol - MAGNETOM World](https://www.magnetomworld.siemens-healthineers.com/clinical-corner/protocols/body-pelvis/world-primovist-liver-mri-protocol)

### プロトコル最適化
- [CARE Bolus - Siemens Healthineers](https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/care-bolus)
- [AutoAlign - Siemens Healthineers](https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/autoalign)
- [Tim Planning Suite - Siemens Healthineers](https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/tim-planning-suite)
- [Concatenations MRI - MRI Master](https://mrimaster.com/concatenations/)
- [Distance Factor / Slice Gap - MRI Master](https://mrimaster.com/mri-distance-factor-slice-gap/)
- [DotGO Workflow - Siemens Healthineers](https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/technologies-and-innovations/dotgo-workflow)

### シーケンス技術
- [PROPELLER/BLADE - MRI Questions](https://mriquestions.com/propellerblade.html)
- [syngo BLADE - Siemens Healthineers](https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/syngo-blade)
- [SPACE - Siemens Healthineers](https://www.siemens-healthineers.com/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/syngo-space)
- [RESOLVE - Siemens Healthineers](https://www.siemens-healthineers.com/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/syngo-resolve)
- [starVIBE - Tobias Block](https://tobias-block.net/projects/starvibe/)
- [Readout-segmented DWI - MRI Questions](https://mriquestions.com/readout-segmented-dwi.html)
- [CAIPIRINHA vs GRAPPA - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3865024/)
- [Partial Fourier - MRI Questions](https://mriquestions.com/partial-fourier.html)

### 高度機能
- [Deep Resolve - Siemens Healthineers](https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/technologies-and-innovations/deep-resolve)
- [Compressed Sensing - Siemens Healthineers](https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/clinical-specialities/compressed-sensing)
- [SMS - Siemens Healthineers](https://www.siemens-healthineers.com/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/simultaneous-multi-slice)
- [TrueForm B1 Shim - TimTX](https://cdn0.scrvt.com/39b415fb07de4d9656c7b516d8e2d907/1800000001241109/3704539c186f/timtx_trueform_brochure_v1-01241109_1800000001241109.pdf)

### 造影剤
- [ProHance (gadoteridol) - Bracco IF](https://www.bracco.com/sites/default/files/2024-04/prohance_if_202404.pdf)
- [マグネスコープ IF - Guerbet](https://professionals.guerbet.jp/wp-content/uploads/2023/08/マグネスコープ_IF_202308.pdf)
- [MRI用造影剤 製剤別適応一覧表 - 日本医学放射線学会](https://www.radiology.jp/content/files/20250416_01mricm.pdf)
- [ガドテリドール - Wikipedia](https://ja.wikipedia.org/wiki/ガドテリドール)
- [ガドリニウム造影剤の基礎 - INNERVISION](https://www.innervision.co.jp/ressources/pdf/innervision2017/iv201706_070.pdf)
- [Bayer in Radiology - 造影MRIの基礎](https://radiology.bayer.jp/training/livermri/useful_information/hepatoma/basics1)

### 臨床プロトコル
- [Acute Stroke MRI Protocol](https://www.stroke-manual.com/acute-stroke-mr-protocol/)
- [Body MRI Protocols - RadioGraphics](https://pubs.rsna.org/doi/full/10.1148/rg.220025)
- [Breast MRI Guidelines - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC2441490/)
- [Cervical Spine Protocol - Radiopaedia](https://radiopaedia.org/articles/cervical-spine-protocol-mri)
- [DHMC Body MRI Protocol Book](https://geiselmed.dartmouth.edu/radiology/wp-content/uploads/sites/47/2025/03/Siemens-BODY-MRI-Protocol-Book-3-19-2025.pdf)
- [MRCP Technical Considerations - Radiology Key](https://radiologykey.com/magnetic-resonance-cholangiopancreatography-technical-considerations/)
- [MRCP - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3292642/)
- [Spine MRI Dixon - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC7160219/)

### 追加シーケンス
- [TrueFISP - MRI Master](https://mrimaster.com/characterise-image-trufi/)
- [Balanced SSFP Principles - European Radiology](https://link.springer.com/article/10.1007/s00330-003-1957-x)
- [HASTE/SS-FSE - MRI Questions](https://mriquestions.com/hastess-fse.html)
- [Dixon Method - MRI Questions](https://mriquestions.com/dixon-method.html)
- [CAIPIRINHA - Siemens Healthineers](https://www.siemens-healthineers.com/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/caipirinha)
- [CAIPIRINHA SPACE Protocols - MAGNETOM World](https://www.magnetomworld.siemens-healthineers.com/clinical-corner/protocols/musculoskeletal-mri/caipirinha-space-protocols)

### Siemens UI / ワークフロー
- [Dot Configuration with the Dot Cockpit - MAGNETOM Flash](https://cdn0.scrvt.com/39b415fb07de4d9656c7b516d8e2d907/1800000002165415/7b4dd79e1090/MAGNETOM_Flash_ISMRM_issue_62_Dot_Configuration_with_the_Dot_Cockpit_1800000002165415.pdf)
- [AutoAlign Head - Siemens Healthineers](https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/autoalign-head-ls)
- [AutoAlign Spine - Siemens Healthineers](https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/autoalign-spine)
- [AutoAlign Knee - Siemens Healthineers](https://www.siemens-healthineers.com/en-us/magnetic-resonance-imaging/options-and-upgrades/clinical-applications/autoalign-knee)
- [Dot Cockpit Configuration for Stroke - PEPconnect](https://pep.siemens-info.com/en-us/dotengine-cockpit)
