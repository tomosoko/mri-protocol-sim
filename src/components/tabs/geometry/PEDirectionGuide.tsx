import { useProtocolStore } from '../../../store/protocolStore'

// ── PE方向 アーチファクト伝播ガイド ─────────────────────────────────────────
export function PEDirectionGuide() {
  const { params } = useProtocolStore()
  const dir = params.phaseEncDir
  const ori = params.orientation

  // アーチファクトの主な発生源とその影響
  const artifacts = [
    {
      source: '眼球運動',
      relevant: ori === 'Tra',
      bad: ['A>>P', 'P>>A'],
      good: ['R>>L', 'L>>R'],
      tip: '頭部Traでは眼球運動アーチファクトをA-P方向に（脳実質への影響最小化）',
    },
    {
      source: '呼吸・腸管',
      relevant: ori === 'Tra' || ori === 'Cor',
      bad: ['R>>L', 'L>>R'],
      good: ['A>>P', 'P>>A'],
      tip: '腹部では呼吸アーチファクトをA-P方向に誘導し、臓器への重畳を防ぐ',
    },
    {
      source: '大動脈拍動',
      relevant: ori === 'Sag',
      bad: ['H>>F', 'F>>H'],
      good: ['A>>P', 'P>>A'],
      tip: '腰椎Sagでは大動脈拍動をA-P方向に（脊柱管への影響を最小化）',
    },
    {
      source: '嚥下・頸動脈',
      relevant: ori === 'Sag' || ori === 'Cor',
      bad: ['H>>F', 'F>>H'],
      good: ['A>>P', 'P>>A'],
      tip: '頸椎Sagでは嚥下アーチファクトをA-P方向に',
    },
    {
      source: 'エイリアシング',
      relevant: true,
      bad: [],
      good: [],
      tip: params.phaseOversampling > 0
        ? `位相Ovs ${params.phaseOversampling}% で折り返しを防止中`
        : '位相方向FOVが短い場合、折り返しアーチファクト（Wrap）に注意。Phase Oversamplingで対策',
    },
  ].filter(a => a.relevant)

  const currentIsBad = (a: typeof artifacts[0]) => a.bad.includes(dir)
  const currentIsGood = (a: typeof artifacts[0]) => a.good.includes(dir)

  return (
    <div className="mx-3 mt-2 p-2.5 rounded text-xs" style={{ background: '#111', border: '1px solid #1a1a2a' }}>
      <div className="font-semibold mb-1.5" style={{ color: '#60a5fa', fontSize: '10px' }}>
        PE方向 ({dir}) アーチファクト評価
      </div>
      <div className="space-y-1.5">
        {artifacts.map((a, i) => {
          const bad = currentIsBad(a)
          const good = currentIsGood(a)
          return (
            <div key={i} className="flex items-start gap-1.5">
              <span style={{
                color: bad ? '#f87171' : good ? '#34d399' : '#fbbf24',
                fontSize: '10px', flexShrink: 0, marginTop: '1px',
              }}>
                {bad ? '✕' : good ? '✓' : '△'}
              </span>
              <div>
                <span className="font-semibold" style={{ color: '#c8ccd6' }}>{a.source}: </span>
                <span style={{ color: '#6b7280' }}>{a.tip}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
