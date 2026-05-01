import { useState } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import {
  T1MappingVFA,
  T2MappingMSE,
  T2StarMappingGRE,
  SWIExplainer,
  MRSExplainer,
  QMRISummaryTable,
  type QSubTab,
  subTabStyle,
} from './quantitativemri/quantitativeMRIUtils'

export function QuantitativeMRIPanel() {
  const { params } = useProtocolStore()
  const [subTab, setSubTab] = useState<QSubTab>('T1map')

  return (
    <div className="h-full flex flex-col" style={{ background: '#0e0e0e' }}>
      {/* Header */}
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #252525' }}>
        <div className="text-xs font-semibold" style={{ color: '#e88b00' }}>定量MRI (qMRI) シミュレーター</div>
        <div style={{ fontSize: '8px', color: '#4b5563', marginTop: '2px' }}>
          T1/T2/T2* mapping · SWI · MRS — 現在の磁場強度: {params.fieldStrength}T
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b shrink-0" style={{ borderColor: '#252525' }}>
        {(['T1map', 'T2map', 'SWI', 'MRS'] as QSubTab[]).map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className="px-3 py-1.5 text-xs transition-colors"
            style={subTabStyle(subTab === t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {subTab === 'T1map' && (
          <div>
            <T1MappingVFA fieldStrength={params.fieldStrength} />
            <div className="mt-2 p-2 rounded text-xs" style={{ background: '#111', border: '1px solid #252525' }}>
              <div className="font-semibold mb-1" style={{ color: '#60a5fa' }}>T1 Mapping の臨床応用</div>
              <div className="space-y-0.5" style={{ color: '#9ca3af', fontSize: '8px' }}>
                <div>• <span className="text-white">MOLLI/ShMOLLI:</span> 心筋T1マッピング（心筋線維化・アミロイド・浮腫）</div>
                <div>• <span className="text-white">VIBE VFA:</span> 肝T1 native値でEOB造影前後の取り込み評価</div>
                <div>• <span className="text-white">Look-Locker:</span> 縦弛緩の時系列計測（T1-RASER）</div>
                <div>• <span className="text-white">MP2RAGE:</span> 3T頭部T1均一マップ（B1不均一補正）</div>
                <div>• <span className="text-white">3T T1値:</span> 1.5Tより延長（WM 780→1084ms，GM 1300→1820ms）</div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'T2map' && (
          <div>
            <T2MappingMSE fieldStrength={params.fieldStrength} />
            <T2StarMappingGRE fieldStrength={params.fieldStrength} />
            <div className="mt-2 p-2 rounded text-xs" style={{ background: '#111', border: '1px solid #252525' }}>
              <div className="font-semibold mb-1" style={{ color: '#a78bfa' }}>T2/T2* Mapping の臨床応用</div>
              <div className="space-y-0.5" style={{ color: '#9ca3af', fontSize: '8px' }}>
                <div>• <span className="text-white">関節軟骨 T2 map:</span> 軟骨変性の早期検出（変性→T2↑）</div>
                <div>• <span className="text-white">T2* (肝鉄沈着):</span> T2* &lt;20ms(3T) → 肝鉄沈着（ヘモクロマトーシス）</div>
                <div>• <span className="text-white">心筋 T2 map:</span> 心筋浮腫・炎症（T2↑: 急性心筋炎・MINOCA）</div>
                <div>• <span className="text-white">心筋 T2* map:</span> 心筋鉄過剰（サラセミア・輸血後）</div>
                <div>• <span className="text-white">SWI/T2*map:</span> 脳微小出血・海綿状血管腫・石灰化</div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'SWI' && (
          <div>
            <SWIExplainer fieldStrength={params.fieldStrength} />
            <div className="mt-2 p-2 rounded text-xs" style={{ background: '#111', border: '1px solid #252525' }}>
              <div className="font-semibold mb-1" style={{ color: '#c084fc' }}>SWI 臨床適応</div>
              <div className="space-y-1" style={{ fontSize: '8px' }}>
                {[
                  { label: '脳微小出血', color: '#f87171', desc: 'CMB: 高血圧性脳症・CAA。5mm未満の点状低信号。T2*/SWIのみ検出可能。' },
                  { label: '海綿状血管腫', color: '#fb923c', desc: 'ポップコーン状病変。周囲ヘモジデリン沈着リング（T2*低信号）。' },
                  { label: '深部静脈', color: '#38bdf8', desc: '脱酸素化血の磁化率差で静脈を描出。静脈奇形・DVT評価。' },
                  { label: '石灰化', color: '#9ca3af', desc: '3Tでは低信号（カルシウム）。位相像で出血と鑑別可能（逆位相）。' },
                  { label: '鉄沈着 (BG)', color: '#a78bfa', desc: 'Parkinson病: 黒質の低信号。MSA・CBD: 被殻・線条体の異常低信号。' },
                ].map(r => (
                  <div key={r.label} className="flex gap-1">
                    <span className="shrink-0 font-semibold" style={{ color: r.color, minWidth: '80px' }}>{r.label}</span>
                    <span style={{ color: '#9ca3af' }}>{r.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {subTab === 'MRS' && (
          <div>
            <MRSExplainer fieldStrength={params.fieldStrength} />
            <div className="mt-2 p-2 rounded text-xs" style={{ background: '#111', border: '1px solid #252525' }}>
              <div className="font-semibold mb-1" style={{ color: '#38bdf8' }}>MRS TE の選び方</div>
              <div className="space-y-0.5" style={{ color: '#9ca3af', fontSize: '8px' }}>
                <div><span className="text-white">短TE（20-35ms）:</span> Lip/MM 基線ノイズあり。全代謝物を検出。腫瘍評価。</div>
                <div><span className="text-white">中TE（135-144ms）:</span> Lac逆位相（ダブレット↓）。出血・高悪性腫瘍の乳酸確認。</div>
                <div><span className="text-white">長TE（270ms）:</span> 基線平坦・Lac正位相。Cho/NAA/Cr のみ評価。</div>
              </div>
            </div>
            <div className="mt-2 p-2 rounded text-xs" style={{ background: '#111', border: '1px solid #1a2a1a' }}>
              <div className="font-semibold mb-1" style={{ color: '#4ade80' }}>代謝物比の臨床解釈</div>
              <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: '8px' }}>
                <tbody>
                  {[
                    ['Cho/Cr ↑', '腫瘍・脱髄・白質脳症', '#f87171'],
                    ['NAA/Cr ↓', '神経細胞消失・軸索障害', '#6b7280'],
                    ['Lac ↑', '嫌気性代謝（腫瘍壊死・梗塞）', '#fbbf24'],
                    ['Cho/NAA ↑', '高悪性グリオーマの指標', '#fb923c'],
                    ['mI ↑ (3.56ppm)', 'アルツハイマー型認知症早期', '#38bdf8'],
                  ].map(([label, desc, color]) => (
                    <tr key={label as string} style={{ borderTop: '1px solid #1a1a1a' }}>
                      <td className="py-0.5 pr-2 font-mono font-semibold" style={{ color: color as string }}>{label}</td>
                      <td className="py-0.5" style={{ color: '#9ca3af' }}>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Always-visible summary table */}
        <QMRISummaryTable />
      </div>
    </div>
  )
}
