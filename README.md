# MRI Protocol Simulator

放射線技師向け教育用 MRI プロトコルシミュレーター。  
Siemens **syngo MR** 風インターフェースで MRI パラメータを操作し、物理シミュレーション・クイズ・症例訓練を行う React SPA。

![Build](https://img.shields.io/badge/build-passing-brightgreen)
![React](https://img.shields.io/badge/React-19-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6)

---

## 機能一覧

### パラメータ操作（8タブ）
| タブ | 内容 |
|------|------|
| Routine | TR / TE / TI / FA / スライス数・厚み・ギャップ・平均 |
| Contrast | 脂肪抑制 / MT / VIBE等コントラスト設定 |
| Resolution | マトリクス / FOV / 帯域幅 / フェーズ分解能 |
| Geometry | 断面向き / フェーズエンコード方向 / サチュレーションバンド |
| System | コイル / iPAT / 傾斜磁場モード / シム / 磁場強度 |
| Physio | ECGトリガー / 呼吸トリガー / トリガー遅延 |
| Inline | ADC / MIP / MPR / サブトラクション |
| Sequence | ターボファクタ / エコースペーシング / 部分フーリエ / b値 |

### 物理シミュレーション・可視化
- **k空間可視化** — フィルインパターンのリアルタイム描画
- **パルスシーケンス図** — SE / GRE / EPI / SSFP 等の波形表示
- **SNRマップ** — コイルプロファイルと SNR 分布の推定
- **アーチファクトシミュレーション** — ギブス・ケミカルシフト・モーション等の模擬
- **組織コントラストパネル** — TR/TE/TI 変化による T1/T2 コントラスト推移
- **定量MRIパネル** — T1 / T2 / T2* マッピング

### 造影・注射計算機
- **ガドリニウム T1短縮計算機** — 濃度・磁場強度別 T1短縮シミュレーション

### 生理情報モニタリング
- **ECGトリガー品質モニター** — 不整脈・RR間隔のシミュレーション
- **周波数スカウトスペクトル** — 水/脂肪ピーク表示

### 教育機能
- **クイズモード** (Alt+Q) — MRI物理・パラメータに関する選択問題
- **症例訓練** — 部位・疾患別プロトコル最適化演習
- **シナリオエクササイズ** — アーチファクト対策・時間制約等の臨床シナリオ
- **What-If パネル** — パラメータ変更の影響を視覚的に比較
- **プロトコル最適化提案** — 現在のパラメータに対する改善アドバイス

### ワークフロー
- **プロトコルツリー** — 部位 › シーケンスグループ › バリアントのナビゲーション
- **シーケンスキュー** — 複数シーケンスの並べ替え・管理
- **プロトコルエクスポート** — 設定の書き出し
- **Diff表示** — ベースラインとの差分ハイライト
- **Undo / Redo** (⌘Z / ⌘⇧Z) — 最大50ステップ

---

## 技術スタック

| 項目 | バージョン |
|------|-----------|
| React | 19 |
| TypeScript | 5.9 |
| Vite | 8 |
| Tailwind CSS | 4 |
| Zustand | 5 |
| lucide-react | latest |

---

## セットアップ

```bash
npm install
npm run dev      # 開発サーバー起動 (http://localhost:5173)
npm run build    # プロダクションビルド（型チェック含む）
npm run lint     # ESLint
```

---

## キーボードショートカット

| ショートカット | 動作 |
|---------------|------|
| Alt + 1〜8 | タブ切替 (Routine〜Sequence) |
| F5 | スキャン開始 / 停止 |
| Alt + Q | クイズモード切替 |
| Alt + D | Console / Extended 切替 |
| Alt + B | Console / Browser ページ切替 |
| ⌘Z / ⌘⇧Z | Undo / Redo |

---

## ディレクトリ構成

```
src/
  App.tsx                     # メインレイアウト・ページルーティング
  store/
    protocolStore.ts          # Zustand 状態管理（パラメータ・履歴・UI状態）
    calculators.ts            # TE/TR/SAR/スキャン時間の物理計算
  components/
    tabs/                     # 8つのパラメータタブ
    ConsoleParamStrip.tsx     # TE/TR/TA ライブ表示 + スキャンシミュレーション
    KSpaceVisualizer.tsx      # k空間可視化
    QuizPanel.tsx             # クイズ機能
    ...                       # その他 20+ コンポーネント
  data/                       # 静的データ（プリセット・クイズ問題・症例・コイルプロファイル等）
  utils/                      # バリデータ・計算ユーティリティ
```

---

## 対象ユーザー

- MRI 担当の放射線技師（研修・自己学習）
- 診療放射線技師国家試験の受験者
- MRI 物理・パラメータを学ぶ医学生・研修医

---

## ライセンス

MIT
