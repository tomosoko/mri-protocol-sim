# mri-protocol-sim — Claude Code ガイド

## 概要
MRIプロトコルシミュレーター。放射線技師向け教育用React SPA。
Siemens syngo MR風UIでMRIパラメータを操作し、物理シミュレーション・クイズ・症例訓練を行う。

## コマンド
```bash
npm run dev      # 開発サーバー起動（Vite）
npm run build    # tsc + vite build（型チェック含む）
npm run lint     # ESLint
```

## 技術スタック
React 19 + TypeScript 5.9 + Vite 8 + Tailwind CSS 4 + Zustand 5

## ディレクトリ構成
```
src/
  App.tsx                    # メインレイアウト・ページルーティング（~350行）
  store/protocolStore.ts     # Zustand状態管理（パラメータ・履歴・UI状態）
  store/calculators.ts       # TE/TR/SAR/スキャン時間の物理計算
  components/                # UIコンポーネント
    tabs/                    # 8つのパラメータタブ（Routine, Contrast, Resolution等）
    ConsoleParamStrip.tsx    # コンソールパラメータ表示 + スキャンシミュレーション
    SystemEventLog.tsx       # システムログ表示
    KSpaceVisualizer.tsx     # k空間可視化
    QuizPanel.tsx            # クイズ機能
    ...
  data/                      # 静的データ（プリセット・クイズ問題・症例）
  utils/                     # バリデータ・計算ユーティリティ
```

## 設計原則
- コンポーネントは300行を超えたら分割を検討する
- 物理計算はstore/calculators.tsに集約（UIに計算ロジックを書かない）
- データ（クイズ問題・プリセット等）はdata/に分離
- Zustand storeは単一（protocolStore）。新しいstoreは作らない
- スタイルはTailwind + インラインstyle（syngo MR風の暗色テーマ統一）

## 注意点
- SystemTab.tsxは282行（system/サブモジュールに分割済み）。変更時はsrc/components/system/配下を確認する
- data/配下のファイルは巨大（quizData.ts: 3,878行）だが内容データなので分割不要
- テストは未導入。ビルド成功（`npm run build`）で最低限の型チェックを確認
