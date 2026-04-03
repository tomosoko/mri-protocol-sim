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
import { Zap, BookOpen, ChevronDown, GraduationCap, GitCompare, Stethoscope } from 'lucide-react'
import { SequenceQueue } from './components/SequenceQueue'
import { getSeqClinical } from './data/sequenceClinicalData'
import { QuizPanel } from './components/QuizPanel'
import { DiffPanel } from './components/DiffPanel'
import { ScenarioExercisePanel } from './components/ScenarioExercisePanel'
import { SNRMapPanel } from './components/SNRMapPanel'
import { ArtifactSimPanel } from './components/ArtifactSimPanel'
import { CaseTrainingPanel } from './components/CaseTrainingPanel'
import { KSpaceVisualizer } from './components/KSpaceVisualizer'

const TABS = ['Routine', 'Contrast', 'Resolution', 'Geometry', 'System', 'Physio', 'Inline', 'Sequence'] as const

export default function App() {
  const { activeTab, setActiveTab, activePresetId } = useProtocolStore()
  const [rightPanel, setRightPanel] = useState<'artifact' | 'learn' | 'diff' | 'scenario' | 'snrmap' | 'artifactsim' | 'case' | 'kspace' | null>('learn')
  const [quizMode, setQuizMode] = useState(false)

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
              background: rightPanel === 'learn' ? '#2a1200' : '#252525',
              color: rightPanel === 'learn' ? '#e88b00' : '#5a5a5a',
              border: `1px solid ${rightPanel === 'learn' ? '#c47400' : '#374151'}`,
            }}
          >
            <BookOpen size={11} />
            学習ガイド
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'artifact' ? null : 'artifact')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors"
            style={{
              background: rightPanel === 'artifact' ? '#2a1200' : '#252525',
              color: rightPanel === 'artifact' ? '#e88b00' : '#5a5a5a',
              border: `1px solid ${rightPanel === 'artifact' ? '#c47400' : '#374151'}`,
            }}
          >
            <Zap size={11} />
            アーチファクト対策
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'case' ? null : 'case')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors"
            style={{
              background: rightPanel === 'case' ? '#0f1a0f' : '#252525',
              color: rightPanel === 'case' ? '#86efac' : '#5a5a5a',
              border: `1px solid ${rightPanel === 'case' ? '#15803d' : '#374151'}`,
            }}
          >
            症例訓練
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'kspace' ? null : 'kspace')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors"
            style={{
              background: rightPanel === 'kspace' ? '#1a1500' : '#252525',
              color: rightPanel === 'kspace' ? '#fde047' : '#5a5a5a',
              border: `1px solid ${rightPanel === 'kspace' ? '#a16207' : '#374151'}`,
            }}
          >
            k空間
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'artifactsim' ? null : 'artifactsim')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors"
            style={{
              background: rightPanel === 'artifactsim' ? '#1f0a0a' : '#252525',
              color: rightPanel === 'artifactsim' ? '#f87171' : '#5a5a5a',
              border: `1px solid ${rightPanel === 'artifactsim' ? '#991b1b' : '#374151'}`,
            }}
          >
            ArtSim
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'snrmap' ? null : 'snrmap')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors"
            style={{
              background: rightPanel === 'snrmap' ? '#0f1e2e' : '#252525',
              color: rightPanel === 'snrmap' ? '#38bdf8' : '#5a5a5a',
              border: `1px solid ${rightPanel === 'snrmap' ? '#0369a1' : '#374151'}`,
            }}
          >
            SNR
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'diff' ? null : 'diff')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors"
            style={{
              background: rightPanel === 'diff' ? '#0a1f0a' : '#252525',
              color: rightPanel === 'diff' ? '#4ade80' : '#5a5a5a',
              border: `1px solid ${rightPanel === 'diff' ? '#166534' : '#374151'}`,
            }}
          >
            <GitCompare size={11} />
            変更diff
          </button>
          <button
            onClick={() => setRightPanel(rightPanel === 'scenario' ? null : 'scenario')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors"
            style={{
              background: rightPanel === 'scenario' ? '#0f172a' : '#252525',
              color: rightPanel === 'scenario' ? '#60a5fa' : '#5a5a5a',
              border: `1px solid ${rightPanel === 'scenario' ? '#1d4ed8' : '#374151'}`,
            }}
          >
            <Stethoscope size={11} />
            シナリオ
          </button>
          <button
            onClick={() => setQuizMode(m => !m)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors"
            style={{
              background: quizMode ? '#2d1f5e' : '#252525',
              color: quizMode ? '#a78bfa' : '#6b7280',
              border: `1px solid ${quizMode ? '#7c3aed' : '#374151'}`,
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
                  background: activeTab === tab ? '#1e1200' : 'transparent',
                  color: activeTab === tab ? '#e88b00' : '#5a5a5a',
                  borderBottom: activeTab === tab ? '2px solid #e88b00' : '2px solid transparent',
                  fontSize: '11px',
                  padding: '6px 14px',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto" style={{ background: '#111111' }}>
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
            {rightPanel === 'diff' && <DiffPanel />}
            {rightPanel === 'scenario' && <ScenarioExercisePanel />}
            {rightPanel === 'snrmap' && <SNRMapPanel />}
            {rightPanel === 'artifactsim' && <ArtifactSimPanel onShowArtifactGuide={() => setRightPanel('artifact')} />}
            {rightPanel === 'case' && <CaseTrainingPanel />}
            {rightPanel === 'kspace' && <KSpaceVisualizer />}
          </div>
        )}
      </div>

      {/* Quiz: fullscreen overlay */}
      {quizMode && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0e0e0e' }}>
          <div className="flex items-center justify-between px-4 py-2 shrink-0" style={{ borderBottom: '1px solid #252525' }}>
            <span className="text-sm font-semibold" style={{ color: '#a78bfa' }}>MRI Quiz</span>
            <button
              onClick={() => setQuizMode(false)}
              className="text-xs px-3 py-1 rounded"
              style={{ background: '#252525', color: '#9ca3af', border: '1px solid #374151' }}
            >
              ✕ 閉じる
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <QuizPanel />
          </div>
        </div>
      )}
    </div>
  )
}

function ActiveSequenceBar() {
  const { activeSequenceName, activePresetId } = useProtocolStore()
  if (!activeSequenceName) return null
  return (
    <div className="flex items-center gap-2 px-3 py-1 shrink-0 text-xs"
      style={{ background: '#1a0e00', borderBottom: '1px solid #3a1a00' }}>
      <span style={{ color: '#e88b00' }}>▶</span>
      <span className="font-mono font-semibold" style={{ color: '#e88b00' }}>{activeSequenceName}</span>
      {activePresetId && (
        <>
          <span style={{ color: '#2a1200' }}>|</span>
          <span style={{ color: '#4b5563' }}>preset: </span>
          <span style={{ color: '#e88b00' }}>{activePresetId}</span>
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
  const [paramRefOpen, setParamRefOpen] = useState(false)
  const [simOpen, setSimOpen] = useState(true)

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
          <span className="ml-auto font-mono text-xs truncate max-w-[140px]" style={{ color: '#e88b00' }}>
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
            style={{ background: '#1a0e00' }}
          >
            <ChevronDown
              size={10}
              style={{ color: '#e88b00', transform: seqOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
            />
            <span className="text-xs font-semibold" style={{ color: '#e88b00' }}>シーケンス解説</span>
          </button>

          {seqOpen && (
            <div className="px-3 pb-3 space-y-2.5" style={{ paddingTop: '10px' }}>
              {/* Purpose */}
              <div className="p-2 rounded" style={{ background: '#0e0e0e', border: '1px solid #3a1a00' }}>
                <div className="text-xs font-semibold mb-1" style={{ color: '#e88b00' }}>目的</div>
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
          <span className="text-xs font-semibold" style={{ color: '#e88b00' }}>{tip.title}</span>
        </button>
        {tipsOpen && (
          <ul className="px-3 pb-3 space-y-2">
            {tip.items.map((item, i) => (
              <li key={i} className="flex gap-2 text-xs" style={{ color: '#9ca3af' }}>
                <span style={{ color: '#e88b00', flexShrink: 0 }}>›</span>
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

      {/* ===== パラメータ連動シミュレーター ===== */}
      {(() => {
        const { TR, TE, TI, flipAngle, sliceThickness, matrixFreq, matrixPhase, phaseResolution, fov, bandwidth,
          averages, turboFactor, ipatFactor, ipatMode, slices, fieldStrength, bValues, fatSat } = params

        // コントラスト予測
        const contrast = (() => {
          if (TI > 1500) return { label: 'FLAIR系', color: '#a78bfa', note: 'CSF抑制T2' }
          if (TI > 0 && TI < 300) return { label: 'STIR系', color: '#f43f5e', note: '脂肪抑制T2' }
          if (bValues && bValues.some(b => b >= 500)) return { label: 'DWI', color: '#06b6d4', note: `b=${Math.max(...bValues)}` }
          if (TR < 800 && TE < 30) return { label: 'T1強調', color: '#f59e0b', note: `TR=${TR} TE=${TE}` }
          if (TR > 2000 && TE > 70) return { label: 'T2強調', color: '#e88b00', note: `TR=${TR} TE=${TE}` }
          if (TR > 2000 && TE < 40) return { label: 'PD強調', color: '#10b981', note: `TR=${TR} TE=${TE}` }
          return { label: '混合/GRE', color: '#9ca3af', note: `TR=${TR} TE=${TE}` }
        })()

        // 相対SNR推定（参考値）
        const voxelVol = (fov / matrixFreq) * (fov * phaseResolution / 100 / matrixPhase) * sliceThickness
        const accelFactor = ipatMode !== 'Off' ? ipatFactor : 1
        const snrRel = voxelVol * Math.sqrt(turboFactor * averages / accelFactor) / Math.sqrt(bandwidth || 1)
        const snrNorm = Math.min(100, Math.round(snrRel * 8))

        // 推定撮像時間
        const phaseLines = Math.round(matrixPhase * (phaseResolution / 100))
        const linesPerTR = Math.max(1, turboFactor / accelFactor)
        const trSec = TR / 1000
        const estTimeSec = Math.round(trSec * (phaseLines / linesPerTR) * averages * Math.ceil(slices / Math.max(1, linesPerTR)))
        const estTimeMin = (estTimeSec / 60).toFixed(1)

        // SAR推定（相対値）
        const sarRel = Math.round(Math.min(100, (flipAngle * flipAngle) / (TR || 1) * (fieldStrength === 3.0 ? 4 : 1) * 0.02))
        const sarColor = sarRel > 70 ? '#f87171' : sarRel > 40 ? '#fbbf24' : '#4ade80'

        return (
          <div style={{ borderBottom: '1px solid #252525' }}>
            <button
              className="w-full flex items-center gap-1.5 px-3 py-2 text-left"
              onClick={() => setSimOpen(o => !o)}
            >
              <ChevronDown size={10} style={{ color: '#6b7280', transform: simOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
              <span className="text-xs font-semibold" style={{ color: '#34d399' }}>パラメータ連動シミュレーター</span>
            </button>
            {simOpen && (
              <div className="px-3 pb-3 space-y-2">
                {/* コントラスト予測 */}
                <div className="p-2 rounded" style={{ background: '#0e0e0e', border: `1px solid ${contrast.color}44` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: '#6b7280' }}>コントラスト予測</span>
                    <span className="text-xs font-bold font-mono" style={{ color: contrast.color }}>{contrast.label}</span>
                  </div>
                  <div className="text-xs" style={{ color: '#4b5563' }}>{contrast.note}{fatSat !== 'None' ? ` + ${fatSat}脂肪抑制` : ''}</div>
                </div>

                {/* SNR / SAR / Time */}
                <div className="grid grid-cols-3 gap-1">
                  {/* SNR */}
                  <div className="p-1.5 rounded text-center" style={{ background: '#0e0e0e', border: '1px solid #252525' }}>
                    <div className="text-xs mb-0.5" style={{ color: '#6b7280' }}>相対SNR</div>
                    <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background: '#252525' }}>
                      <div className="h-full rounded-full" style={{ width: `${snrNorm}%`, background: snrNorm > 60 ? '#4ade80' : snrNorm > 30 ? '#fbbf24' : '#f87171' }} />
                    </div>
                    <div className="text-xs font-mono font-bold" style={{ color: '#e5e7eb' }}>{snrNorm}%</div>
                  </div>
                  {/* SAR */}
                  <div className="p-1.5 rounded text-center" style={{ background: '#0e0e0e', border: '1px solid #252525' }}>
                    <div className="text-xs mb-0.5" style={{ color: '#6b7280' }}>SAR目安</div>
                    <div className="h-1 rounded-full overflow-hidden mb-1" style={{ background: '#252525' }}>
                      <div className="h-full rounded-full" style={{ width: `${sarRel}%`, background: sarColor }} />
                    </div>
                    <div className="text-xs font-mono font-bold" style={{ color: sarColor }}>{sarRel}%</div>
                  </div>
                  {/* Time */}
                  <div className="p-1.5 rounded text-center" style={{ background: '#0e0e0e', border: '1px solid #252525' }}>
                    <div className="text-xs mb-0.5" style={{ color: '#6b7280' }}>推定時間</div>
                    <div className="text-xs font-mono font-bold mt-2" style={{ color: '#e88b00' }}>{estTimeMin}m</div>
                  </div>
                </div>

                {/* ボクセルサイズ */}
                <div className="px-2 py-1.5 rounded text-xs" style={{ background: '#0e0e0e' }}>
                  <span style={{ color: '#4b5563' }}>ボクセル: </span>
                  <span className="font-mono" style={{ color: '#d1d5db' }}>
                    {(fov / matrixFreq).toFixed(1)}×{(fov * (phaseResolution / 100) / matrixPhase).toFixed(1)}×{sliceThickness}mm
                  </span>
                  <span className="ml-2" style={{ color: '#4b5563' }}>=</span>
                  <span className="ml-1 font-mono font-semibold" style={{ color: '#fbbf24' }}>{voxelVol.toFixed(2)}mm³</span>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* ===== 部位別パラメータ早見表 ===== */}
      <div style={{ borderBottom: '1px solid #252525' }}>
        <button
          className="w-full flex items-center gap-1.5 px-3 py-2 text-left"
          onClick={() => setParamRefOpen(o => !o)}
        >
          <ChevronDown size={10} style={{ color: '#6b7280', transform: paramRefOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
          <span className="text-xs font-semibold" style={{ color: '#fbbf24' }}>部位別パラメータ早見表</span>
        </button>
        {paramRefOpen && (
          <div className="px-3 pb-3 space-y-3 text-xs">
            {([
              {
                part: '頭部 / Brain', color: '#e88b00',
                rows: [
                  ['DWI(脳梗塞)', 'b=1000 / TR≥5000 / BW=1500+ / GRAPPA AF=2 / 5mm'],
                  ['FLAIR', 'TR=9000 / TE=100 / TI=2500@3T / ETL=20 / 5mm'],
                  ['T2 TSE', 'TR=5000 / TE=100 / ETL=25 / Matrix=320 / 5mm'],
                  ['T2* GRE', 'TR=800 / TE=20 / FA=15° / 2-3mm (微小出血)'],
                  ['TOF-MRA', 'TR=25-35 / TE=3.4 / FA=20° / 0.6mm 3D'],
                ],
              },
              {
                part: '腹部 / Abdomen', color: '#f59e0b',
                rows: [
                  ['EOB-VIBE BH', 'TR=4 / TE=2.1/1.1(OP/IP) / FA=10° / BW=400 / 2-3mm'],
                  ['HASTE BH', 'TR=∞ / TE=83 / FA=120° / ETL=144 / BW=558 / 5mm'],
                  ['DWI PACE', 'b=0,50,800 / TR=5000 / BW=1400+ / GRAPPA AF=2'],
                  ['3D MRCP', 'TE=700-1000 / TR=4000 / 厚スラブ40-80mm / PACE'],
                  ['starVIBE', 'FA=10-15° / Radial / Free Breath / OP+In同時'],
                ],
              },
              {
                part: '骨盤 / Pelvis (前立腺)', color: '#8b5cf6',
                rows: [
                  ['T2 TSE tra', 'TR=4000-6000 / TE=100 / 3mm / FOV=180 / Matrix=320'],
                  ['RESOLVE DWI', 'b=0,400,800,1400 / seg=3-6 / TR=3000 / BW=1600+'],
                  ['DCE VIBE', '<10s/相 / Gd 0.1mmol/kg / 2mL/s / FA=12°'],
                  ['T2 sag/cor', 'TE=100 / 3mm / EPE評価には斜断が推奨'],
                ],
              },
              {
                part: '脊椎 / Spine', color: '#10b981',
                rows: [
                  ['qtse sag (C)', 'TR=3500 / TE=100 / ETL=20 / 3mm / FOV=240'],
                  ['qtse sag (L)', 'TR=3500 / TE=100 / ETL=15 / 3mm / FOV=280'],
                  ['STIR/nSTIR', 'TI=220@3T / TR=5000 / 転移感度≈92%'],
                  ['Dixon T1', '1回でW/F/IP/OP 4画像 / 骨髄脂肪定量'],
                ],
              },
              {
                part: '関節 / Joint (膝)', color: '#06b6d4',
                rows: [
                  ['PD FS sag', 'TR=3000-4000 / TE=30 / FA=90° / FOV=150-180 / 3mm'],
                  ['PD FS cor', 'FOV=150-180 / SPAIR / Matrix=384 / 半月板評価'],
                  ['PD FS tra', 'FA=90° / TE=30 / 軟骨断面・半月板水平面'],
                  ['T2* MEDIC', 'TE=20-25 / 3D / 1-2mm / 関節軟骨・関節唇'],
                ],
              },
              {
                part: '肩 / Shoulder', color: '#f43f5e',
                rows: [
                  ['BLADE cor', 'FOV=180 / 3mm / 斜冠状断（棘上筋長軸平行）'],
                  ['BLADE sag', 'FOV=180 / 3mm / 肩峰形態・出口評価'],
                  ['PD FS', 'TR=3500 / TE=30 / ETL=12 / SPAIR'],
                ],
              },
            ] as { part: string; color: string; rows: [string, string][] }[]).map(({ part, color, rows }) => (
              <div key={part}>
                <div className="font-semibold mb-1" style={{ color }}>{part}</div>
                <div className="space-y-0.5">
                  {rows.map(([seq, val]) => (
                    <div key={seq} className="flex gap-2 p-1 rounded" style={{ background: '#0e0e0e' }}>
                      <span className="shrink-0 font-semibold" style={{ color: '#9ca3af', width: '88px' }}>{seq}</span>
                      <span className="font-mono" style={{ color: '#6b7280' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Quick reference ===== */}
      <div className="p-3 space-y-3">
        <div className="text-xs font-semibold" style={{ color: '#e88b00' }}>クイックリファレンス</div>

        {/* コントラスト重み付け */}
        <div>
          <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>コントラスト重み付け</div>
          <div className="space-y-0.5 text-xs">
            {([
              ['T1強調', '短TR(400-600) 短TE(10-20)', '#f59e0b'],
              ['T2強調', '長TR(≥2000) 長TE(80-120)', '#3b82f6'],
              ['PD強調', '長TR(≥2000) 短TE(20-30)', '#10b981'],
              ['FLAIR', 'TI=2500ms@3T / CSF抑制T2', '#8b5cf6'],
              ['STIR', 'TI=220ms@3T / 脂肪抑制T2', '#f43f5e'],
              ['DWI', 'b=1000(脳) / 800(腹部) / 1500(骨盤)', '#06b6d4'],
            ] as [string, string, string][]).map(([k, v, c]) => (
              <div key={k} className="flex items-baseline gap-2 p-1 rounded" style={{ background: '#0e0e0e' }}>
                <span className="shrink-0 font-semibold" style={{ color: c, width: '52px' }}>{k}</span>
                <span className="font-mono" style={{ color: '#9ca3af' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 脂肪抑制使い分け */}
        <div>
          <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>脂肪抑制 使い分け</div>
          <div className="space-y-0.5 text-xs">
            {([
              ['CHESS', '頭部・脊椎（均一磁場）', '#9ca3af'],
              ['SPAIR', '腹部・乳腺（不均一磁場に強い）', '#34d399'],
              ['STIR', '関節・金属近傍　※造影後NG', '#f87171'],
              ['Dixon', '3Tダイナミック第一選択・定量評価', '#a78bfa'],
            ] as [string, string, string][]).map(([k, v, c]) => (
              <div key={k} className="flex items-baseline gap-2 p-1 rounded" style={{ background: '#0e0e0e' }}>
                <span className="shrink-0 font-semibold font-mono" style={{ color: c, width: '48px' }}>{k}</span>
                <span style={{ color: '#9ca3af' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 主要パラメータ値 */}
        <div>
          <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>主要パラメータ値</div>
          <div className="grid grid-cols-2 gap-0.5 text-xs">
            {([
              ['MRCP TE', '≥700 ms'],
              ['FLAIR TI@3T', '2500 ms'],
              ['STIR TI@3T', '220 ms'],
              ['冠動脈TD', 'RR×75%'],
              ['EOB待機', '15-20 min'],
              ['動脈相', '25-35 s'],
              ['門脈相', '60-70 s'],
              ['平衡相', '120 s'],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center px-1.5 py-0.5 rounded" style={{ background: '#0e0e0e' }}>
                <span style={{ color: '#6b7280' }}>{k}</span>
                <span className="font-mono font-semibold" style={{ color: '#e5e7eb' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 呼吸補正 */}
        <div>
          <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>呼吸補正</div>
          <div className="space-y-0.5 text-xs">
            {([
              ['BH', '息止め。最短・最高画質。協力可能な患者に', '#fbbf24'],
              ['RT', '自由呼吸。2-4倍時間延長。高齢者・非協力患者', '#9ca3af'],
              ['PACE', '自由呼吸。効率50-60%。高精度DWI・MRCP', '#60a5fa'],
            ] as [string, string, string][]).map(([k, v, c]) => (
              <div key={k} className="flex items-start gap-2 p-1 rounded" style={{ background: '#0e0e0e' }}>
                <span className="shrink-0 font-semibold font-mono" style={{ color: c, width: '36px' }}>{k}</span>
                <span style={{ color: '#9ca3af' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SAR */}
        <div>
          <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>SAR 規制値</div>
          <div className="grid grid-cols-2 gap-0.5 text-xs">
            {([
              ['全身', '4 W/kg'],
              ['頭部', '3.2 W/kg'],
              ['3T vs 1.5T', '約4倍↑'],
              ['FA 180→120°', 'SAR 約30%↓'],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center px-1.5 py-0.5 rounded" style={{ background: '#0e0e0e' }}>
                <span style={{ color: '#6b7280' }}>{k}</span>
                <span className="font-mono font-semibold" style={{ color: '#fca5a5' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ADC閾値 */}
        <div>
          <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>ADC閾値（×10⁻³ mm²/s）</div>
          <div className="space-y-0.5 text-xs">
            {([
              ['急性脳梗塞', '<0.6', '#f87171'],
              ['前立腺癌(PCa)', '<1.0', '#f87171'],
              ['乳癌', '<1.2', '#f87171'],
              ['肝転移', '<1.0', '#f87171'],
              ['良性病変', '>1.4', '#4ade80'],
            ] as [string, string, string][]).map(([k, v, c]) => (
              <div key={k} className="flex justify-between items-center px-1.5 py-0.5 rounded" style={{ background: '#0e0e0e' }}>
                <span style={{ color: '#6b7280' }}>{k}</span>
                <span className="font-mono font-semibold" style={{ color: c }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* iPAT */}
        <div>
          <div className="text-xs mb-1 font-semibold" style={{ color: '#4b5563' }}>iPAT（並列撮像）</div>
          <div className="space-y-0.5 text-xs">
            {([
              ['AF=2', '時間×1/2 / SNR×70% / 推奨'],
              ['AF=3', '1.5T腹部では非推奨（g-factor↑）'],
              ['DWI用途', 'EPIエコートレイン短縮→歪み改善'],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex items-start gap-2 p-1 rounded" style={{ background: '#0e0e0e' }}>
                <span className="shrink-0 font-semibold font-mono" style={{ color: '#e88b00', width: '36px' }}>{k}</span>
                <span style={{ color: '#9ca3af' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
