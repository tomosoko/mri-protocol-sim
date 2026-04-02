import { useState } from 'react'
import { useProtocolStore } from './store/protocolStore'
import { StatusBar } from './components/StatusBar'
import { ProtocolTree } from './components/ProtocolTree'
import { ArtifactGuide } from './components/ArtifactGuide'
import { RoutineTab } from './components/tabs/RoutineTab'
import { ContrastTab } from './components/tabs/ContrastTab'
import { ResolutionTab } from './components/tabs/ResolutionTab'
import { GeometryTab } from './components/tabs/GeometryTab'
import { SystemTab } from './components/tabs/SystemTab'
import { PhysioTab } from './components/tabs/PhysioTab'
import { InlineTab } from './components/tabs/InlineTab'
import { SequenceTab } from './components/tabs/SequenceTab'
import { presets } from './data/presets'
import { Zap, BookOpen, ChevronDown, GraduationCap } from 'lucide-react'
import { SequenceQueue } from './components/SequenceQueue'
import { getSeqClinical } from './data/sequenceClinicalData'
import { QuizPanel } from './components/QuizPanel'

const TABS = ['Routine', 'Contrast', 'Resolution', 'Geometry', 'System', 'Physio', 'Inline', 'Sequence'] as const

export default function App() {
  const { activeTab, setActiveTab, activePresetId } = useProtocolStore()
  const [rightPanel, setRightPanel] = useState<'artifact' | 'learn' | 'quiz' | null>('learn')

  const activePreset = presets.find(p => p.id === activePresetId)

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#141414', color: '#c8ccd6' }}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0"
        style={{ background: '#0e0e0e', borderBottom: '1px solid #242424' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          <span className="text-xs font-semibold" style={{ color: '#6b7280' }}>syngo MR — Protocol Simulator</span>
          {activePreset && (
            <>
              <span style={{ color: '#374151' }}>›</span>
              <span className="text-xs" style={{ color: '#9ca3af' }}>USER » {activePreset.category} » {activePreset.label}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRightPanel(rightPanel === 'learn' ? null : 'learn')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors"
            style={{
              background: rightPanel === 'learn' ? '#1e3a5f' : '#252525',
              color: rightPanel === 'learn' ? '#93c5fd' : '#6b7280',
              border: `1px solid ${rightPanel === 'learn' ? '#2563eb' : '#374151'}`,
            }}
          >
            <BookOpen size={11} />
            学習ガイド
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'artifact' ? null : 'artifact')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors"
            style={{
              background: rightPanel === 'artifact' ? '#1e3a5f' : '#252525',
              color: rightPanel === 'artifact' ? '#93c5fd' : '#6b7280',
              border: `1px solid ${rightPanel === 'artifact' ? '#2563eb' : '#374151'}`,
            }}
          >
            <Zap size={11} />
            アーチファクト対策
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'quiz' ? null : 'quiz')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors"
            style={{
              background: rightPanel === 'quiz' ? '#2d1f5e' : '#252525',
              color: rightPanel === 'quiz' ? '#a78bfa' : '#6b7280',
              border: `1px solid ${rightPanel === 'quiz' ? '#7c3aed' : '#374151'}`,
            }}
          >
            <GraduationCap size={11} />
            クイズ
          </button>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Protocol Tree */}
        <div className="shrink-0 overflow-hidden flex flex-col" style={{ width: '160px', borderRight: '1px solid #252525' }}>
          <ProtocolTree />
        </div>

        {/* Sequence Queue — vertical panel next to tree */}
        <div className="shrink-0 overflow-hidden flex flex-col" style={{ width: '200px', borderRight: '1px solid #252525' }}>
          <SequenceQueue />
        </div>

        {/* Center: Protocol Parameters */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Active sequence indicator */}
          <ActiveSequenceBar />

          {/* Tab bar */}
          <div className="flex shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid #252525', background: '#0e0e0e' }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2 text-xs whitespace-nowrap transition-colors shrink-0"
                style={{
                  background: activeTab === tab ? '#1a2d44' : 'transparent',
                  color: activeTab === tab ? '#93c5fd' : '#6b7280',
                  borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-2" style={{ background: '#141414' }}>
            {activeTab === 'Routine' && <RoutineTab />}
            {activeTab === 'Contrast' && <ContrastTab />}
            {activeTab === 'Resolution' && <ResolutionTab />}
            {activeTab === 'Geometry' && <GeometryTab />}
            {activeTab === 'System' && <SystemTab />}
            {activeTab === 'Physio' && <PhysioTab />}
            {activeTab === 'Inline' && <InlineTab />}
            {activeTab === 'Sequence' && <SequenceTab />}
          </div>
        </div>

        {/* Right: Panel */}
        {rightPanel && (
          <div className="shrink-0 overflow-hidden" style={{ width: '300px', borderLeft: '1px solid #252525' }}>
            {rightPanel === 'artifact' && <ArtifactGuide />}
            {rightPanel === 'learn' && <LearnPanel />}
            {rightPanel === 'quiz' && <QuizPanel />}
          </div>
        )}
      </div>
    </div>
  )
}

function ActiveSequenceBar() {
  const { activeSequenceName, activePresetId } = useProtocolStore()
  if (!activeSequenceName) return null
  return (
    <div className="flex items-center gap-2 px-3 py-1 shrink-0 text-xs"
      style={{ background: '#0d1b2e', borderBottom: '1px solid #1e3a5f' }}>
      <span style={{ color: '#3b82f6' }}>▶</span>
      <span className="font-mono font-semibold" style={{ color: '#93c5fd' }}>{activeSequenceName}</span>
      {activePresetId && (
        <>
          <span style={{ color: '#1e3a5f' }}>|</span>
          <span style={{ color: '#4b5563' }}>preset: </span>
          <span style={{ color: '#60a5fa' }}>{activePresetId}</span>
        </>
      )}
    </div>
  )
}

function LearnPanel() {
  const { params, activeTab, activeSequenceName, activeBodyPartId } = useProtocolStore()
  const [seqOpen, setSeqOpen] = useState(true)
  const [tipsOpen, setTipsOpen] = useState(false)
  const [trGuideOpen, setTrGuideOpen] = useState(false)

  const seqClinical = activeSequenceName ? getSeqClinical(activeSequenceName, activeBodyPartId) : null

  const tips: Record<string, { title: string; items: string[] }> = {
    Routine: {
      title: 'Routineタブ — 基本パラメータ',
      items: [
        'T1強調: 短TR（400-600ms）短TE（10-20ms）。脂肪・Gd造影・亜急性血腫が高信号',
        'T2強調: 長TR（≥2000ms）長TE（80-120ms）。水・浮腫・腫瘍が高信号',
        'STIR TI: 150ms@1.5T / 220ms@3T。FLAIR TI: 2200ms@1.5T / 2500ms@3T',
        'FA 150°→120°でSAR約30%削減。ETL・TR延長も有効なSAR対策',
        '3T: SAR≈4倍。HASTE+3T+体格大が最高リスク。SAR Assistant=Normal必須',
        'Concatenations↑→スライス間クロストーク↓だが撮像時間が延長する',
      ],
    },
    Contrast: {
      title: 'Contrastタブ — 脂肪抑制と造影',
      items: [
        'CHESS: 均一磁場（頭部・脊椎）向け。スペクトル選択励起で脂肪のみ抑制',
        'SPAIR: 腹部・乳腺の標準。Spectral Adiabatic IR→磁場不均一でも安定',
        'STIR: 造影後絶対NG。GdでT1短縮→STIRでnull→信号消失の落とし穴',
        'Dixon: 3T造影ダイナミック第一選択。water/fat/opp/in-phase 4画像同時取得',
        'Opp-Phase: 副腎腺腫判別に必須（IP比で20%以上低下→腺腫 感度87%/特異度97%）',
        'プリモビスト(EOB): 15分後に肝細胞相。悪性腫瘍は低信号で検出',
      ],
    },
    Resolution: {
      title: 'Resolutionタブ — SNR・iPAT',
      items: [
        'SNR式: ボクセル体積 × √(Averages×ETL×TR) ÷ √BW',
        'SNR改善効率: Thickness↑ > FOV↑ > Matrix↓ > Averages↑（時間対効果順）',
        '3T: BW2倍必要（220Hz→440Hz差）。同BWだと化学シフトが1.5Tの2倍',
        'iPAT(GRAPPA) AF=2: 時間1/2・SNR≈70%（1/√2）・g-factor考慮で実際は低下大きい',
        'CAIPIRINHA: SMS励起+Gz傾斜ブリップ。GRAPPAより68%で画質優位（腹部3D）',
        'DWI+GRAPPA AF=2: エコートレイン半分→EPIの幾何学的歪みが大幅改善（一石二鳥）',
      ],
    },
    Geometry: {
      title: 'Geometryタブ — アーチファクト制御',
      items: [
        '腹部Tra: 必ずA>>P。R>>Lにすると呼吸ゴーストが脊椎・臓器に重なる',
        '脊椎Sag: H>>F。A>>Pだと嚥下アーチファクトが椎体前方に重なる',
        '乳腺: R>>Lが推奨（心拍ゴーストを乳腺外へ）',
        'Phase Oversampling 100%: FOVを2倍にして切り捨て→エイリアシング完全排除',
        'Sat Band位置: 動く構造（大動脈・腸管・眼球）の上流/直前に設置',
        'Set-n-Go: テーブル自動移動で脊椎全長・全身撮像を効率化（Tim Planning Suite）',
      ],
    },
    System: {
      title: 'Systemタブ — iPAT・コイル・3T設定',
      items: [
        'iPAT = integrated Parallel Acquisition Techniques。GRAPPA/CAIPIRINHAの総称',
        'GRAPPA: k空間アンダーサンプリング→ACS（Reference Lines）からカーネル推定して補間',
        'AF=2: SNR≈70%・時間1/2｜AF=3: SNR≈58%・時間1/3（g-factor追加ペナルティあり）',
        '1.5T AF≤2推奨。3T AF≤3まで許容（g-factorがSNR低下の主因）',
        'TrueForm B1 Shim: 2ch位相制御でB1均一化。3T腹部のDielectric Effect対策',
        'Whisper モード: 騒音約-10dB（qtseと組み合わせると最大-97%）。小児・閉所恐怖症患者に',
      ],
    },
    Physio: {
      title: 'Physioタブ — 生体信号同期',
      items: [
        'BH（息止め）: 最短時間・最高品質。患者協力が必要。1回15秒以内が目安',
        'RT（ベローズ）: 腹部の動きを間接検出。精度はPACEより低い。時間2-4倍',
        'PACE: 横隔膜エコーで直接追跡。効率50-60%（5mmウィンドウ時）。精度◎',
        '冠動脈Trigger Delay = RR×70-80%（拡張中期=最小運動期）',
        '3T ECG: T波がBCGと重複しR波誤認しやすい→vECG（ベクターECG）を必ず使用',
        '心臓シネ: prospective trigger（整数RR）かretrospecitve（全位相取得）を用途で選択',
      ],
    },
    Inline: {
      title: 'Inlineタブ — 自動後処理',
      items: [
        'DWI: ADC Map ON必須。T2シャインスルー（T2の長い構造が拡散を模倣）の鑑別',
        'ADC値目安: 急性梗塞 0.3-0.4 / 悪性腫瘍 0.6-1.2 / 正常脳 0.8 (×10⁻³mm²/s)',
        'MIP前提: 背景を暗くする脂肪抑制が必須。明るい背景は最大値投影でMIPに紛れる',
        'Subtraction: 乳腺・骨盤造影で造影前後を自動差分→増強部位を強調表示',
        'MPR: VIBE/MPRAGE等3D収集後にTra/Cor/Sag自動再構成。読影ワークフロー改善',
        'MIP Radial: 血管を360°方向から自動投影→CE-MRAの俯瞰評価に',
      ],
    },
    Sequence: {
      title: 'Sequenceタブ — シーケンス技術',
      items: [
        'HASTE: Single-shot TSE（ETL>100）。HAとはHalf-Fourier Acquired Single-shot TurboSpin Echo',
        'RESOLVE DWI: readout-segment EPI。k空間を3-6分割→EPI歪み大幅軽減。前立腺必須',
        'qtse (Quiet TSE): QuietX技術で傾斜slew rate最適化→最大97%騒音低減。3T脊椎標準',
        'starVIBE: Stack-of-Stars放射状k空間→全スポークがk空間中心を通過→体動averaging',
        'BLADE: PROPELLER法。ブレードを回転→面内並進・回転を retrospective補正',
        'mobiDiff: 胸部用ECG+呼吸同期DWI。肺・縦隔ADC値を体動なく測定可能',
      ],
    },
  }

  const tip = tips[activeTab] || tips['Routine']

  const hasWarning =
    params.sarAssistant === 'Off' ||
    (params.fieldStrength === 3.0 && params.sarAssistant !== 'Normal' && params.sarAssistant !== 'Advanced') ||
    (params.respTrigger === 'Off' && params.slices > 15) ||
    params.fatSat === 'STIR' ||
    (params.bandwidth < 100 && params.fieldStrength === 3.0) ||
    (params.ipatFactor >= 3 && params.fieldStrength === 1.5)

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#141414' }}>
      {/* Header */}
      <div className="px-3 py-2 text-xs font-semibold flex items-center gap-1.5 shrink-0"
        style={{ color: '#4b5563', borderBottom: '1px solid #252525' }}>
        <BookOpen size={11} />
        学習ガイド
        {activeSequenceName && (
          <span className="ml-auto font-mono text-xs truncate max-w-[140px]" style={{ color: '#3b82f6' }}>
            {activeSequenceName}
          </span>
        )}
      </div>

      {/* ===== Sequence Clinical Data ===== */}
      {seqClinical ? (
        <div style={{ borderBottom: '1px solid #252525' }}>
          {/* Section header — collapsible */}
          <button
            className="w-full flex items-center gap-1.5 px-3 py-2 text-left"
            onClick={() => setSeqOpen(o => !o)}
            style={{ background: '#0d1b2e' }}
          >
            <ChevronDown
              size={10}
              style={{ color: '#3b82f6', transform: seqOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
            />
            <span className="text-xs font-semibold" style={{ color: '#93c5fd' }}>シーケンス解説</span>
          </button>

          {seqOpen && (
            <div className="px-3 pb-3 space-y-2.5" style={{ paddingTop: '10px' }}>
              {/* Purpose */}
              <div className="p-2 rounded" style={{ background: '#0e0e0e', border: '1px solid #1e3a5f' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: '#60a5fa' }}>目的</div>
                <div className="text-xs leading-relaxed" style={{ color: '#d1d5db' }}>{seqClinical.reason}</div>
              </div>

              {/* Clinical significance */}
              <div className="p-2 rounded" style={{ background: '#0e0e0e', border: '1px solid #252525' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: '#a78bfa' }}>臨床的意義</div>
                <div className="text-xs leading-relaxed" style={{ color: '#c4b5fd' }}>{seqClinical.clinical}</div>
              </div>

              {/* Findings */}
              {seqClinical.findings && (
                <div className="p-2 rounded" style={{ background: '#0e0e0e', border: '1px solid #252525' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#34d399' }}>典型所見</div>
                  <div className="text-xs leading-relaxed" style={{ color: '#6ee7b7' }}>{seqClinical.findings}</div>
                </div>
              )}

              {/* Key params */}
              {seqClinical.params && (
                <div className="p-2 rounded" style={{ background: '#0e0e0e', border: '1px solid #252525' }}>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#fbbf24' }}>パラメータポイント</div>
                  <div className="text-xs leading-relaxed" style={{ color: '#fde68a' }}>{seqClinical.params}</div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="px-3 py-3" style={{ borderBottom: '1px solid #252525' }}>
          <div className="text-xs" style={{ color: '#374151' }}>
            シーケンスをクリックすると臨床解説が表示されます
          </div>
        </div>
      )}

      {/* ===== TR延長時の対応ガイド — collapsible ===== */}
      <div style={{ borderBottom: '1px solid #252525' }}>
        <button
          className="w-full flex items-center gap-1.5 px-3 py-2 text-left"
          onClick={() => setTrGuideOpen(o => !o)}
        >
          <ChevronDown
            size={10}
            style={{ color: '#6b7280', transform: trGuideOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
          />
          <span className="text-xs font-semibold" style={{ color: '#6b7280' }}>TR延長時の対応ガイド</span>
        </button>
        {trGuideOpen && (
          <div className="px-3 pb-3 space-y-2 text-xs">
            {[
              { title: 'なぜTRが延長するか', text: 'スライス枚数増加・厚いSlice Gap・Concatenations増加・呼吸同期追加のいずれか。システムが必要なRFパルス時間を確保できずTRを自動延長する。' },
              { title: 'TRを上げずにスライスを増やす方法', text: '① Turbo Factor(ETL)を上げる → 1TR内に取得エコー数↑ → 同じTRでより多くのスライスを取得可能\n② iPAT(GRAPPA AF=2) → 取得ライン数半減 → TRの余裕↑\n③ Partial Fourier 6/8 → k空間の上半分省略 → echo trainを短縮' },
              { title: '逆にTRが短すぎる場合', text: 'TSEのT1混入が起きる（脂肪高信号・白質と灰白質のコントラスト低下）。T2強調では TR≥2500ms推奨。FLAIR/STIRはTRが2-6秒必要。' },
              { title: 'SARが超過してTR延長する場合', text: 'システムが「Low SAR mode」または「TR延長」を提案してくる。\n・Low SAR mode → FAを自動で下げる（例: 180°→120°）。SARは下がるがコントラストが変わる（T2強調が弱まるなど）\n・TR延長 → RFパルスの間隔を広げて組織の冷却時間を確保。画質への影響は少ない\n手動で対処するなら: ① FA 180°→150°（SAR約30%↓）② BW↑③ TSE→GRE系へ変更 ④ 3T→1.5Tに切替。SAR Assistantの"Advanced"も有効。' },
            ].map(({ title, text }) => (
              <div key={title}>
                <div className="font-semibold mb-0.5" style={{ color: '#9ca3af' }}>{title}</div>
                <div style={{ color: '#6b7280', whiteSpace: 'pre-line' }}>{text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Tab tips — collapsible ===== */}
      <div style={{ borderBottom: '1px solid #252525' }}>
        <button
          className="w-full flex items-center gap-1.5 px-3 py-2 text-left"
          onClick={() => setTipsOpen(o => !o)}
        >
          <ChevronDown
            size={10}
            style={{ color: '#6b7280', transform: tipsOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
          />
          <span className="text-xs font-semibold" style={{ color: '#93c5fd' }}>{tip.title}</span>
        </button>
        {tipsOpen && (
          <ul className="px-3 pb-3 space-y-2">
            {tip.items.map((item, i) => (
              <li key={i} className="flex gap-2 text-xs" style={{ color: '#9ca3af' }}>
                <span style={{ color: '#3b82f6', flexShrink: 0 }}>›</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ===== Settings check ===== */}
      <div className="p-3" style={{ borderBottom: '1px solid #252525' }}>
        <div className="text-xs font-semibold mb-2" style={{ color: '#fbbf24' }}>現在の設定チェック</div>
        <div className="space-y-1.5 text-xs">
          {params.sarAssistant === 'Off' && (
            <div className="p-2 rounded" style={{ background: '#2d1515', border: '1px solid #7f1d1d', color: '#fca5a5' }}>
              ⚠ SAR Assistant OFF — 超過時にスキャンが停止します
            </div>
          )}
          {params.fieldStrength === 3.0 && params.sarAssistant !== 'Normal' && params.sarAssistant !== 'Advanced' && (
            <div className="p-2 rounded" style={{ background: '#2d1515', border: '1px solid #7f1d1d', color: '#fca5a5' }}>
              ⚠ 3TはSAR Assistantの使用を推奨
            </div>
          )}
          {params.respTrigger === 'Off' && params.slices > 15 && (
            <div className="p-2 rounded" style={{ background: '#111111', border: '1px solid #7c3aed', color: '#c4b5fd' }}>
              💡 腹部多スライスなら呼吸同期（BH/RT/PACE）を検討
            </div>
          )}
          {params.fatSat === 'STIR' && (
            <div className="p-2 rounded" style={{ background: '#111111', border: '1px solid #d97706', color: '#fcd34d' }}>
              ⚠ STIR — 造影後は使用不可（Gd信号もnullされます）
            </div>
          )}
          {params.bandwidth < 100 && params.fieldStrength === 3.0 && (
            <div className="p-2 rounded" style={{ background: '#111111', border: '1px solid #d97706', color: '#fcd34d' }}>
              ⚠ 3TでBW低い → 化学シフトアーチファクトが顕著になります
            </div>
          )}
          {params.ipatFactor >= 3 && params.fieldStrength === 1.5 && (
            <div className="p-2 rounded" style={{ background: '#111111', border: '1px solid #d97706', color: '#fcd34d' }}>
              ⚠ AF=3 @1.5T — g-factorアーチファクトに注意
            </div>
          )}
          {!hasWarning && (
            <div className="p-2 rounded text-xs" style={{ background: '#052e16', border: '1px solid #166534', color: '#86efac' }}>
              ✓ 現在の設定に問題は検出されていません
            </div>
          )}
        </div>
      </div>

      {/* ===== Quick reference ===== */}
      <div className="p-3">
        <div className="text-xs font-semibold mb-2" style={{ color: '#60a5fa' }}>クイックリファレンス</div>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {[
            ['T1強調', '短TR短TE'],
            ['T2強調', '長TR長TE'],
            ['PD強調', '長TR短TE'],
            ['FLAIR', 'T2+TI2200'],
            ['STIR', 'T2+TI150'],
            ['DWI急性梗塞', 'b=1000'],
            ['MRCP', 'TE≥700ms'],
            ['冠動脈TD', 'RR×75%'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between p-1 rounded" style={{ background: '#0e0e0e' }}>
              <span style={{ color: '#6b7280' }}>{k}</span>
              <span style={{ color: '#e5e7eb' }} className="font-mono">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
