# MRI Protocol Simulator — パラメータリファレンス

> このファイルはAIアシスタントがコードを書く際に参照するリファレンス。
> パラメータの構造・依存関係・制約・UI配置を一覧化している。

---

## 1. ProtocolParams 型定義（src/data/presets.ts）

```ts
interface ProtocolParams {
  // ── Routine タブ ──────────────────────────────
  TR: number              // ms | 100–15000 | step:100
  TE: number              // ms | 1–1000    | step:1
  TI: number              // ms | 0–5000    | step:10  (0=IR無効)
  flipAngle: number       // °  | 5–180     | step:5
  slices: number          // 枚 | 1–256     | step:1
  sliceThickness: number  // mm | 1–20      | step:0.5
  sliceGap: number        // %  | 0–100     | step:5
  averages: number        // 回 | 1–8       | step:1
  phaseOversampling: number // % | 0–100
  sarAssistant: 'Off' | 'Normal' | 'Advanced'
  allowedDelay: number    // s  | 0–120

  // ── Contrast タブ ─────────────────────────────
  fatSat: 'None' | 'CHESS' | 'SPAIR' | 'STIR' | 'Dixon'
  mt: boolean             // Magnetization Transfer

  // ── Resolution タブ ───────────────────────────
  matrixFreq: number      // 64–1024 (読み出し方向)
  matrixPhase: number     // 64–1024 (位相方向)
  fov: number             // mm | 100–500 | step:10
  phaseResolution: number // %  | 50–100  | step:5
  bandwidth: number       // Hz/px × matrixFreq/2 (実装上はkHz単位で保持)
  interpolation: boolean  // Zero-fill interpolation

  // ── Geometry タブ ─────────────────────────────
  orientation: 'Tra' | 'Cor' | 'Sag'
  phaseEncDir: 'A>>P' | 'P>>A' | 'R>>L' | 'L>>R' | 'H>>F' | 'F>>H'
  satBands: boolean

  // ── System タブ ───────────────────────────────
  coil: string            // 表示名（coilTypeと対応）
  coilType: 'Head_64' | 'Head_20' | 'Spine_32' | 'Body' | 'Knee' | 'Shoulder' | 'Flex'
  ipatMode: 'Off' | 'GRAPPA' | 'CAIPIRINHA'
  ipatFactor: number      // 2–4
  gradientMode: 'Fast' | 'Normal' | 'Whisper'
  shim: 'Auto' | 'Manual'
  fieldStrength: 1.5 | 3.0

  // ── Physio タブ ───────────────────────────────
  ecgTrigger: boolean
  respTrigger: 'Off' | 'RT' | 'PACE' | 'BH'
  triggerDelay: number    // ms
  triggerWindow: number   // ms

  // ── Inline タブ ───────────────────────────────
  inlineADC: boolean
  inlineMIP: boolean
  inlineMPR: boolean
  inlineSubtraction: boolean

  // ── Sequence タブ ─────────────────────────────
  turboFactor: number     // ETL (Echo Train Length) | 1–256
  echoSpacing: number     // ms | 2–20
  partialFourier: '4/8' | '5/8' | '6/8' | '7/8' | 'Off'
  bValues: number[]       // DWI b値リスト e.g. [0, 500, 1000]
}
```

---

## 2. パラメータ依存関係（カップリング）

```
TR ──────────┬──→ TA（撮像時間）↑↑
             ├──→ T1コントラスト（TR↑ → T1cntr↓）
             └──→ SAR（TR↓ → SAR↑）

TE ──────────┬──→ T2コントラスト（TE↑ → T2cntr↑）
             └──→ SNR（TE↑ → SNR↓）

flipAngle ───┬──→ SAR（FA↑ → SAR↑²）
             ├──→ T1コントラスト
             └──→ SNR（Ernst角で最大）

averages ────┬──→ TA（×averages）
             └──→ SNR（×√averages）

turboFactor ─┬──→ TA（÷ETL）
(ETL)        ├──→ TE_eff（= TE + floor(ETL/2) × ES）
             └──→ T2ぼけ（ETL↑ → blur↑）

ipatFactor ──┬──→ TA（÷iPAT）
             ├──→ SNR（÷√iPAT）
             └──→ g-factor（iPAT↑ → g-factor↑）

matrixFreq ──┬──→ 解像度（読み出し方向）
             └──→ readout時間 → TE_min

matrixPhase ─┬──→ 解像度（位相方向）
             └──→ TA（位相エンコード数 ∝ matrixPhase × phaseResolution/100）

fov ─────────→ 解像度（ピクセルサイズ = FOV / matrix）

bandwidth ───┬──→ TE_min（BW↑ → TE_min↓）
             ├──→ SNR（BW↑ → SNR↓）
             └──→ 化学シフト（BW↓ → CS↑）

fieldStrength┬──→ SNR（3T > 1.5T × ~√2）
             ├──→ SAR（3T → SAR × ~4）
             ├──→ T1値（3T → T1延長）
             └──→ 化学シフト量（3T: 447Hz, 1.5T: 224Hz）

slices ──────┬──→ TA（直接比例）
             └──→ TR_min（スライス数 × excitation time）

partialFourier→ TE_min（pF↓ → TE_min↓）、SNR↓
```

---

## 3. 物理制約・計算式（src/store/calculators.ts）

### TA（撮像時間）
```
TA = TR × (matrixPhase × phaseResolution/100) × slices
     / (turboFactor × ipatFactor_effective) × averages
```
※ `calcScanTime(params)` 関数が実装

### TE_min
```
TE_min ≈ echoSpacing × ceil(turboFactor / 2)  (TSE)
TE_min ≈ bandwidth依存の最短readout時間        (GRE/SE)
```
※ `calcTEmin(params)` 関数が実装

### TR_min
```
TR_min = slices × (TE + readoutTime + spoilerTime)
```
※ `calcTRmin(params)` 関数が実装

### SNR
```
SNR ∝ voxelVolume × √(NSA) × coilFactor × fieldStrengthFactor
      × signalModel(TR, TE, FA, TI, T1, T2)
```
※ `calcSNR(params)` 関数が実装

### SAR（比吸収率）
```
SAR ∝ (FA/90)² × (1/TR) × turboFactor × fieldStrength²
```
※ `calcSARLevel(params)` 関数が実装 → 0–100% で返す

### 化学シフト
```
CS [px] = (fchemHz × matrixFreq) / (bandwidth × 2)
fchemHz = 3.35ppm × fieldStrength × 42.577MHz/T
```
※ `chemShift(params)` 関数が実装

---

## 4. シーケンス同定ロジック（identifySequence）

`src/store/calculators.ts` の `identifySequence(params)` が現在のパラメータからシーケンス種別を推定する。

| シーケンス種 | 判定条件 |
|---|---|
| **FLAIR** | TI > 1800ms AND turboFactor > 1 |
| **STIR** | TI > 50ms AND TI < 400ms |
| **TSE/RARE** | turboFactor > 1 AND TI == 0 |
| **DWI (EPI)** | bValues.length > 1 AND turboFactor <= 2 |
| **GRE/FLASH** | turboFactor <= 2 AND TR < 500 AND FA < 60 |
| **TrueFISP/bSSFP** | TR < 8 AND TE < 3 |
| **SE** | turboFactor == 1 AND TR > 500 |

---

## 5. UI構造

### タブ構成（上部タブバー）
```
Routine | Contrast | Resolution | Geometry | System | Physio | Inline | Sequence
  [1]       [2]        [3]          [4]       [5]      [6]      [7]      [8]
  Alt+1    Alt+2      Alt+3        Alt+4     Alt+5    Alt+6    Alt+7    Alt+8
```

### 左パネル（Browser ページ）
- **ProtocolTree** (260px): 部位 → グループ → バリアント の3階層ツリー。クリックで `loadPreset()` + `setActiveProtocol()`
- **SequenceQueue** (残り): 選択バリアントのシーケンスリスト。「Console で開く」ボタンで `setCurrentPage('console')`

### 右パネル（Console ページ、任意表示）
学習ガイド / Artifact / Diff / Scenario / SNR / ArtSim / Case / k空間 / Tissue / Validate / Summary / Clinical / What-if / Optimizer / Export / qMRI / PSD

### ステータス表示
- **ConsoleParamStrip**（タブ直下の帯）: TE/TR/FA/TA/Matrix/Res/BW/B0/B1rms/GDC/dB/GC温度/SAR/SCAN button
- **StatusBar**（ConsoleParamStrip上）: TIME/B0/f₀/VOX/SNR/EFF/SAR bar/CS/T2BLR/PNS/iPAT/Validation
- **SystemEventLog**（下部）: 時刻付きシステムメッセージ

---

## 6. Zustand Store（src/store/protocolStore.ts）

### 主要 state
| key | 型 | 説明 |
|---|---|---|
| `params` | ProtocolParams | 現在のパラメータ |
| `activePresetId` | string | 選択中プリセットID |
| `activeTab` | string | 選択中タブ名 |
| `viewMode` | `'console'\|'extended'` | Console/Extended切替（Alt+D） |
| `currentPage` | `'console'\|'browser'` | Console/Browser切替（Alt+B） |
| `baseline` | ProtocolParams | Undo基点（プリセットロード時に更新） |
| `history` | ProtocolParams[] | Undo履歴（最大50件） |
| `comparePresetId` | string\|null | Diff比較用プリセット |
| `activeBodyPartId` | string | ProtocolTree選択部位 |
| `activeGroupId` | string | ProtocolTree選択グループ |
| `activeVariantId` | string | ProtocolTree選択バリアント |

### 主要 action
| action | 説明 |
|---|---|
| `setParam(key, value)` | パラメータ更新 + history push |
| `loadPreset(id)` | プリセットロード + history reset |
| `setViewMode(mode)` | Console/Extended切替 |
| `setCurrentPage(page)` | Console/Browser切替 |
| `undo() / redo()` | パラメータ履歴操作 |

---

## 7. VizSection ラッパー

`src/components/VizSection.tsx` — consoleモード時に可視化コンポーネントを非表示にするラッパー。

```tsx
// consoleモードで非表示
<VizSection>
  <SomeChart />
</VizSection>

// 常時表示（LocalizerViewなど必須UI）
<VizSection always={true}>
  <LocalizerView />
</VizSection>
```

**VizSectionで隠されるもの（consoleモード時）**: チャート・グラフ・ダイアグラム・モニター類（55以上のコンポーネント）

**常時表示されるもの**: パラメータフィールド（ParamField）、インジケーター、LocalizerView

---

## 8. ParamField コンポーネント（src/components/ParamField.tsx）

```tsx
<ParamField
  label="TR"              // 表示ラベル
  hintKey="TR"            // clinicalHints.ts のキー（?ボタン）
  value={params.TR}       // 現在値
  type="number"           // 'number' | 'select' | 'toggle' | 'range'
  min={100} max={15000} step={100}
  unit="ms"
  onChange={v => setParam('TR', v as number)}
  highlight={hl('TR')}    // オレンジハイライト（変更検出）
  warn={params.TR < calcTRmin(params)}  // ⚠ 警告状態
  warnMsg="TR < TR_min"   // warnのツールチップ
  coupling={['TA', 'SAR']} // このパラメータが影響を与える値（バッジ表示）
/>
```

ヒントデータは `src/data/clinicalHints.ts` の `hints[key]` を参照。

---

## 9. プリセット一覧（src/data/presets.ts）

| ID | ラベル | 主な特徴 |
|---|---|---|
| `brain_t2` | 頭部 T2 TSE | TSE TR5000/TE100 |
| `brain_flair` | 頭部 FLAIR | TI2500 TR9000 |
| `brain_dwi` | 頭部 DWI | EPI b=0/1000 |
| `brain_tof_mra` | 頭部 TOF MRA | GRE FA=20 |
| `brain_space` | 頭部 SPACE T2 | 3D TSE ETL=200 |
| `spine_c_qtse` | 頸椎 qTSE | TR3500/TE100 |
| `abdomen_t2_bh` | 腹部 T2 息止め | HASTE TR∞ |
| `abdomen_t2_rt` | 腹部 T2 自由呼吸 | PACE |
| `abdomen_dwi` | 腹部 DWI | mobiDiff b=50/400/800 |
| `liver_eob` | 肝 EOB VIBE | GRE dynamic |
| `liver_opp_in` | 肝 In/Out Phase | Dixon |
| `pelvis_female` | 骨盤 女性 | SPAIR T2 |
| `knee_pd` | 膝 PD TSE | FS TR3500 |
| `cardiac_cine` | 心臓 cine | ECG trigger |
| `mrcp` | MRCP 2D | heavy T2 TE700 |
| `mrcp_3d` | MRCP 3D SPACE | ETL=200 |
| `renal_native_mra` | 腎 Native MRA | TrueFISP |

---

## 10. キーボードショートカット

| キー | 動作 |
|---|---|
| `Alt+1〜8` | タブ切替 (Routine〜Sequence) |
| `F5` | SCAN 開始/停止 |
| `Alt+B` | Console ↔ Browser ページ切替 |
| `Alt+D` | Console ↔ Extended モード切替 |
| `Alt+T` | Tissue Contrast パネル |
| `Alt+V` | Validate パネル |
| `Alt+O` | Optimizer パネル |
| `Alt+E` | Export パネル |
| `Alt+K` | k空間ビジュアライザー |
| `Alt+Q` | クイズモード |
| `Esc` | 右パネルを閉じる |
| `⌘Z / ⌘⇧Z` | Undo / Redo |
