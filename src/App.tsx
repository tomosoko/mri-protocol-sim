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
import { Layers, Zap, BookOpen } from 'lucide-react'

const TABS = ['Routine', 'Contrast', 'Resolution', 'Geometry', 'System', 'Physio', 'Inline', 'Sequence'] as const

export default function App() {
  const { activeTab, setActiveTab, activePresetId } = useProtocolStore()
  const [rightPanel, setRightPanel] = useState<'artifact' | 'learn' | null>('learn')

  const activePreset = presets.find(p => p.id === activePresetId)

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#1a1f2e', color: '#c8ccd6' }}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-1.5 shrink-0"
        style={{ background: '#111827', borderBottom: '1px solid #1f2937' }}>
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
              background: rightPanel === 'learn' ? '#1e3a5f' : '#1f2937',
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
              background: rightPanel === 'artifact' ? '#1e3a5f' : '#1f2937',
              color: rightPanel === 'artifact' ? '#93c5fd' : '#6b7280',
              border: `1px solid ${rightPanel === 'artifact' ? '#2563eb' : '#374151'}`,
            }}
          >
            <Zap size={11} />
            アーチファクト対策
          </button>
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Protocol Tree */}
        <div className="shrink-0 overflow-hidden flex flex-col" style={{ width: '200px', borderRight: '1px solid #1f2937' }}>
          <ProtocolTree />
        </div>

        {/* Center: Protocol Parameters */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Preset description */}
          {activePreset && (
            <div className="px-4 py-1.5 text-xs flex items-center gap-2 shrink-0"
              style={{ background: '#1e2435', borderBottom: '1px solid #1f2937' }}>
              <Layers size={11} style={{ color: '#3b82f6' }} />
              <span style={{ color: '#60a5fa' }} className="font-semibold">{activePreset.label}</span>
              <span style={{ color: '#6b7280' }}>—</span>
              <span style={{ color: '#9ca3af' }}>{activePreset.description}</span>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex shrink-0 overflow-x-auto" style={{ borderBottom: '1px solid #1f2937', background: '#111827' }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2 text-xs whitespace-nowrap transition-colors shrink-0"
                style={{
                  background: activeTab === tab ? '#1e2d4a' : 'transparent',
                  color: activeTab === tab ? '#93c5fd' : '#6b7280',
                  borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-2" style={{ background: '#1a1f2e' }}>
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
          <div className="shrink-0 overflow-hidden" style={{ width: '300px', borderLeft: '1px solid #1f2937' }}>
            {rightPanel === 'artifact' && <ArtifactGuide />}
            {rightPanel === 'learn' && <LearnPanel />}
          </div>
        )}
      </div>
    </div>
  )
}

function LearnPanel() {
  const { params, activeTab } = useProtocolStore()

  const tips: Record<string, { title: string; items: string[] }> = {
    Routine: {
      title: 'Routineタブ — 学習ポイント',
      items: [
        'TR・TEが最も基本。T1強調は「短TR短TE」、T2強調は「長TR長TE」を体に覚えよう',
        'TIはSTIR（脂肪抑制）とFLAIR（水抑制）で異なる。3Tでは値が延長する',
        'Flip Angleを下げるとSAR↓。リフォーカスFAを150→120°で約30%削減',
        'SAR Assistantは「Normal」が推奨。Offにすると超過でスキャン停止することも',
      ],
    },
    Contrast: {
      title: 'Contrastタブ — 脂肪抑制の選択',
      items: [
        'STIR：造影後は絶対NG（Gdの高信号もnullされる）',
        'SPAIR：腹部・乳腺の標準。磁場不均一に強い',
        'Dixon：3Tダイナミックの第一選択。定量脂肪評価も可能',
        'CHESS：頭部・脊椎など均一磁場の部位向け',
      ],
    },
    Resolution: {
      title: 'Resolutionタブ — SNRのトレードオフ',
      items: [
        'SNR改善の順位: Slice Thickness↑ > FOV↑ > Matrix↓ > Averages↑',
        'Averages2倍にするとSNRは√2≈1.4倍だが時間も2倍。効率が悪い',
        'BW増加で化学シフト↓・SNR↓。3TはBWを1.5Tの2倍にして化学シフトを同等に',
        '位相分解能75%で撮像時間25%短縮（位相方向分解能は75%になる）',
      ],
    },
    Geometry: {
      title: 'Geometryタブ — アーチファクト方向制御',
      items: [
        '腹部は必ずA>>P。R>>Lにすると呼吸ゴーストが脊椎・臓器と重なる',
        'Phase Oversamplingはエイリアシング防止の最重要設定',
        'Sat Bandは「動く構造の上流」に設置。腰椎前方に腹部大動脈対策',
        'FOVより体が大きい場合は必ずPhase Oversamplingを20%以上に',
      ],
    },
    System: {
      title: 'Systemタブ — 並列撮像',
      items: [
        'GRAPPA AF=2は「時間半減・SNR70%」の標準的トレードオフ',
        'DWIでGRAPPA AF=2はEPIエコートレイン短縮→磁化率アーチファクト改善の一石二鳥',
        'AF=3以上は1.5Tの腹部では非推奨（g-factor増大）',
        'Whisperモードは騒音約10dB低減。小児・聴覚過敏患者に',
      ],
    },
    Physio: {
      title: 'Physioタブ — 同期の使い分け',
      items: [
        'BH→RT→PACE の順で患者負担↓・撮像時間↑',
        'PACEはベローズ（RT）より横隔膜を直接追跡→精度が高い',
        '冠動脈のTrigger Delay = RR間隔の70-80%が拡張中期（最小運動期）',
        '3TでのECGはvECG使用でR波検出精度が大幅に向上',
      ],
    },
    Inline: {
      title: 'Inlineタブ — 自動後処理',
      items: [
        'DWIは必ずADC Map ON。T2シャインスルーとの鑑別が診断の基本',
        'MIPは事前の脂肪抑制が重要。背景が明るいとMIPで血管が埋もれる',
        'Subtractionは乳腺と骨盤CEで有用。造影増強部位が一目瞭然',
        'これらは撮像終了と同時に自動生成。ONにするだけで読影効率が上がる',
      ],
    },
    Sequence: {
      title: 'Sequenceタブ — ETL・b値',
      items: [
        'ETLを上げると速くなるがブラーリング増加。関節は小ETL（10-15）必須',
        'HASTE/MRCPはETL100以上の極限TSE。高SARなので3Tは注意',
        'b=0は実質T2画像。b値を上げるほどT2成分が消えDWI純度が上がる',
        'ADC算出は最低2点（b=0とb≥500）。精度には3点以上推奨',
      ],
    },
  }

  const tip = tips[activeTab] || tips['Routine']

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#1a1f2e' }}>
      <div className="px-3 py-2 text-xs font-semibold flex items-center gap-1.5"
        style={{ color: '#4b5563', borderBottom: '1px solid #1f2937' }}>
        <BookOpen size={11} />
        学習ガイド
      </div>

      {/* Current tab tips */}
      <div className="p-3">
        <div className="text-xs font-semibold mb-2" style={{ color: '#93c5fd' }}>{tip.title}</div>
        <ul className="space-y-2">
          {tip.items.map((item, i) => (
            <li key={i} className="flex gap-2 text-xs" style={{ color: '#9ca3af' }}>
              <span style={{ color: '#3b82f6', flexShrink: 0 }}>›</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t mx-3" style={{ borderColor: '#1f2937' }} />

      {/* Current params summary */}
      <div className="p-3">
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
            <div className="p-2 rounded" style={{ background: '#1a1a2e', border: '1px solid #7c3aed', color: '#c4b5fd' }}>
              💡 腹部多スライスなら呼吸同期（BH/RT/PACE）を検討
            </div>
          )}
          {params.fatSat === 'STIR' && (
            <div className="p-2 rounded" style={{ background: '#1a1a2e', border: '1px solid #d97706', color: '#fcd34d' }}>
              ⚠ STIR — 造影後は使用不可（Gd信号もnullされます）
            </div>
          )}
          {params.bandwidth < 100 && params.fieldStrength === 3.0 && (
            <div className="p-2 rounded" style={{ background: '#1a1a2e', border: '1px solid #d97706', color: '#fcd34d' }}>
              ⚠ 3TでBW低い → 化学シフトアーチファクトが顕著になります
            </div>
          )}
          {params.ipatFactor >= 3 && params.fieldStrength === 1.5 && (
            <div className="p-2 rounded" style={{ background: '#1a1a2e', border: '1px solid #d97706', color: '#fcd34d' }}>
              ⚠ AF=3 @1.5T — g-factorアーチファクトに注意
            </div>
          )}
          {!(params.sarAssistant === 'Off' || (params.fieldStrength === 3.0 && params.sarAssistant !== 'Normal') ||
            (params.respTrigger === 'Off' && params.slices > 15) || params.fatSat === 'STIR' ||
            (params.bandwidth < 100 && params.fieldStrength === 3.0) || (params.ipatFactor >= 3 && params.fieldStrength === 1.5)) && (
            <div className="p-2 rounded text-xs" style={{ background: '#052e16', border: '1px solid #166534', color: '#86efac' }}>
              ✓ 現在の設定に問題は検出されていません
            </div>
          )}
        </div>
      </div>

      {/* Quick reference */}
      <div className="border-t mx-3" style={{ borderColor: '#1f2937' }} />
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
            <div key={k} className="flex justify-between p-1 rounded" style={{ background: '#111827' }}>
              <span style={{ color: '#6b7280' }}>{k}</span>
              <span style={{ color: '#e5e7eb' }} className="font-mono">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
