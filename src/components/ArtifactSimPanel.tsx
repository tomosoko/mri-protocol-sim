import { useEffect, useRef, useState } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import {
  artifactModels,
  generateBasePhantom,
  type ArtifactType,
} from '../data/artifactModels'
import {
  CANVAS_SIZE,
  drawPhantomToCanvas,
  drawDiffToCanvas,
  getSliderConfig,
  getInfluenceItems,
  type InfluenceParams,
} from './artifactsim/artifactSimUtils'

interface ArtifactSimPanelProps {
  onShowArtifactGuide?: () => void
}

function SeverityBar({ value }: { value: number }) {
  const color =
    value < 33
      ? '#4ade80'
      : value < 66
        ? '#e88b00'
        : '#f87171'

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          重症度
        </span>
        <span
          className="font-mono text-xs font-bold"
          style={{ color, fontSize: '11px' }}
        >
          {value}
        </span>
      </div>
      <div className="h-2 rounded overflow-hidden" style={{ background: '#252525' }}>
        <div
          className="h-full rounded transition-all duration-300"
          style={{
            width: `${value}%`,
            background: `linear-gradient(to right, #4ade80 0%, #e88b00 50%, #f87171 100%)`,
            backgroundSize: '300px 8px',
            backgroundPosition: `${-value * 2}px 0`,
          }}
        />
      </div>
    </div>
  )
}

function InfluenceList({ artifactId, params }: { artifactId: ArtifactType; params: InfluenceParams }) {
  const items = getInfluenceItems(artifactId, params)
  return (
    <div className="space-y-1">
      {items.map(item => (
        <div key={item.label} className="flex justify-between items-center">
          <span style={{ color: '#6b7280', fontSize: '9px' }}>{item.label}</span>
          <span
            style={{
              color: item.level === 'bad' ? '#f87171' : item.level === 'warn' ? '#e88b00' : '#4ade80',
              fontSize: '9px',
              fontFamily: 'monospace',
            }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function ArtifactSimPanel({ onShowArtifactGuide }: ArtifactSimPanelProps) {
  const { params } = useProtocolStore()
  const [activeArtifact, setActiveArtifact] = useState<ArtifactType>('aliasing')
  const [phantomType, setPhantomType] = useState<'head' | 'abdomen' | 'spine' | 'cardiac'>('head')
  const [activeView, setActiveView] = useState<'normal' | 'artifact' | 'diff'>('artifact')

  // デモスライダー用ローカルstate（storeを更新しない）
  const [demoSliderValue, setDemoSliderValue] = useState<number | null>(null)

  const normalCanvasRef = useRef<HTMLCanvasElement>(null)
  const artifactCanvasRef = useRef<HTMLCanvasElement>(null)
  const diffCanvasRef = useRef<HTMLCanvasElement>(null)

  const model = artifactModels.find(m => m.id === activeArtifact)!
  const sliderConfig = getSliderConfig(activeArtifact)

  // アーチファクト切替時にスライダーをリセット
  useEffect(() => {
    if (sliderConfig) {
      setDemoSliderValue(sliderConfig.defaultValue)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeArtifact])

  // デモスライダー値でパラメータを上書き
  const artifactParams = (() => {
    const base: InfluenceParams = {
      fov: params.fov,
      matrixFreq: params.matrixFreq,
      matrixPhase: params.matrixPhase,
      bandwidth: params.bandwidth,
      phaseEncDir: params.phaseEncDir,
      fieldStrength: params.fieldStrength,
      fatSat: params.fatSat,
      turboFactor: params.turboFactor,
      ipatFactor: params.ipatFactor,
      phaseOversampling: params.phaseOversampling,
      respTrigger: params.respTrigger,
    }
    if (sliderConfig && demoSliderValue !== null) {
      if (sliderConfig.paramKey === 'fov') base.fov = demoSliderValue
      else if (sliderConfig.paramKey === 'bandwidth') base.bandwidth = demoSliderValue
      else if (sliderConfig.paramKey === 'matrixPhase') base.matrixPhase = demoSliderValue
      else if (sliderConfig.paramKey === 'turboFactor') base.turboFactor = demoSliderValue
      else if (sliderConfig.paramKey === 'ipatFactor') base.ipatFactor = demoSliderValue
    }
    return base
  })()

  // ghostIntensity はモーションゴースト専用: respTrigger を Off 固定にしつつ severity を上書き
  const effectiveParams = (() => {
    if (activeArtifact === 'motion_ghost' && sliderConfig && demoSliderValue !== null) {
      const intensity = demoSliderValue / 100
      if (intensity < 0.2) return { ...artifactParams, respTrigger: 'BH' }
      if (intensity < 0.5) return { ...artifactParams, respTrigger: 'RT' }
      return { ...artifactParams, respTrigger: 'Off' }
    }
    return artifactParams
  })()

  const severity = model.severity(effectiveParams)

  useEffect(() => {
    const basePhantom = generateBasePhantom(phantomType)
    const artifactPhantom = model.generate(effectiveParams, basePhantom)

    if (normalCanvasRef.current) {
      drawPhantomToCanvas(normalCanvasRef.current, basePhantom)
    }
    if (artifactCanvasRef.current) {
      drawPhantomToCanvas(artifactCanvasRef.current, artifactPhantom)
    }
    if (diffCanvasRef.current) {
      drawDiffToCanvas(diffCanvasRef.current, basePhantom, artifactPhantom, 3)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, activeArtifact, phantomType, demoSliderValue])

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#141414' }}>
      {/* Header */}
      <div
        className="px-3 py-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 shrink-0"
        style={{ color: '#4b5563', borderBottom: '1px solid #252525' }}
      >
        <span style={{ color: '#e88b00', fontSize: '10px' }}>■</span>
        アーチファクト シミュレーション
      </div>

      {/* Artifact tabs */}
      <div
        className="shrink-0 flex flex-wrap gap-px p-1"
        style={{ background: '#0e0e0e', borderBottom: '1px solid #252525' }}
      >
        {artifactModels.map(m => (
          <button
            key={m.id}
            onClick={() => setActiveArtifact(m.id)}
            className="flex-1 py-1 text-xs transition-colors rounded"
            style={{
              minWidth: 0,
              background: activeArtifact === m.id ? '#1e1200' : 'transparent',
              color: activeArtifact === m.id ? '#e88b00' : '#5a5a5a',
              border: activeArtifact === m.id ? '1px solid #7c4700' : '1px solid transparent',
              fontSize: '9px',
              whiteSpace: 'nowrap',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Phantom type selector */}
      <div
        className="shrink-0 flex"
        style={{ borderBottom: '1px solid #252525' }}
      >
        {(['head', 'abdomen', 'spine', 'cardiac'] as const).map(t => (
          <button
            key={t}
            onClick={() => setPhantomType(t)}
            className="flex-1 py-1 text-xs transition-colors"
            style={{
              background: phantomType === t ? '#181818' : 'transparent',
              color: phantomType === t ? '#9ca3af' : '#4b5563',
              borderBottom: phantomType === t ? '2px solid #4b5563' : '2px solid transparent',
              fontSize: '10px',
            }}
          >
            {t === 'head' ? '頭部' : t === 'abdomen' ? '腹部' : t === 'spine' ? '脊椎' : '心臓'}
          </button>
        ))}
      </div>

      {/* Canvas タブ切替式 */}
      <div
        className="shrink-0 flex flex-col"
        style={{ background: '#0a0a0a', borderBottom: '1px solid #252525' }}
      >
        {/* タブボタン */}
        <div className="flex shrink-0">
          {(['normal', 'artifact', 'diff'] as const).map(view => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              style={{
                flex: 1,
                padding: '4px',
                fontSize: '10px',
                background: activeView === view ? '#1e1200' : 'transparent',
                color: activeView === view ? '#e88b00' : '#5a5a5a',
                borderBottom: activeView === view ? '2px solid #e88b00' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              {view === 'normal' ? '正常' : view === 'artifact' ? 'アーチファクト' : '差分 ×3'}
            </button>
          ))}
        </div>

        {/* キャンバス表示エリア（非表示のものも描画維持のため visibility で制御） */}
        <div style={{ position: 'relative', width: CANVAS_SIZE, height: CANVAS_SIZE, margin: '8px auto' }}>
          <canvas
            ref={normalCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{
              display: 'block',
              border: '1px solid #252525',
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: activeView === 'normal' ? 1 : 0,
              pointerEvents: activeView === 'normal' ? 'auto' : 'none',
            }}
          />
          <canvas
            ref={artifactCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{
              display: 'block',
              border: '1px solid #3d2200',
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: activeView === 'artifact' ? 1 : 0,
              pointerEvents: activeView === 'artifact' ? 'auto' : 'none',
            }}
          />
          <canvas
            ref={diffCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{
              display: 'block',
              border: '1px solid #1a2a3a',
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: activeView === 'diff' ? 1 : 0,
              pointerEvents: activeView === 'diff' ? 'auto' : 'none',
            }}
          />
        </div>
      </div>

      {/* Info area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Severity */}
        <div className="rounded p-2.5" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <SeverityBar value={severity} />
        </div>

        {/* Demo slider */}
        {sliderConfig && demoSliderValue !== null && (
          <div className="rounded p-2.5" style={{ background: '#151a1a', border: '1px solid #1a3030' }}>
            <div className="flex justify-between items-center mb-1.5">
              <span style={{ color: '#2dd4bf', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                デモ調整
              </span>
              <span style={{ color: '#4ade80', fontSize: '10px', fontFamily: 'monospace' }}>
                {sliderConfig.label}: {demoSliderValue}{sliderConfig.unit}
              </span>
            </div>
            <input
              type="range"
              min={sliderConfig.min}
              max={sliderConfig.max}
              step={sliderConfig.step}
              value={demoSliderValue}
              onChange={e => setDemoSliderValue(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#2dd4bf',
                cursor: 'pointer',
              }}
            />
            <p style={{ color: '#4b5563', fontSize: '8px', marginTop: '4px' }}>
              {sliderConfig.description}（storeは変更しない）
            </p>
          </div>
        )}

        {/* Description */}
        <div className="rounded p-2.5" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div
            className="mb-1.5"
            style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            発生メカニズム
          </div>
          <p style={{ color: '#9ca3af', fontSize: '10px', lineHeight: '1.5' }}>
            {model.description}
          </p>
        </div>

        {/* Current params influence */}
        <div className="rounded p-2.5" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <div
            className="mb-1.5"
            style={{ color: '#4b5563', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            現在のパラメータ影響
          </div>
          <InfluenceList artifactId={activeArtifact} params={effectiveParams} />
        </div>

        {/* Diff legend */}
        <div className="rounded p-2" style={{ background: '#0d1520', border: '1px solid #1a2a3a' }}>
          <div className="flex justify-between items-center">
            <span style={{ color: '#60a5fa', fontSize: '8px', textTransform: 'uppercase' }}>差分画像</span>
            <div className="flex items-center gap-1.5">
              <div style={{ width: 30, height: 6, background: 'linear-gradient(to right, #0000ff, #ff0000)', borderRadius: 2 }} />
              <span style={{ color: '#4b5563', fontSize: '8px' }}>低→高</span>
            </div>
          </div>
          <p style={{ color: '#374151', fontSize: '8px', marginTop: 3 }}>
            影響エリア: |アーチファクト − 正常| ×3 で誇張表示
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={onShowArtifactGuide}
          className="w-full py-2 text-xs font-semibold rounded transition-colors"
          style={{
            background: '#1e1200',
            color: '#e88b00',
            border: '1px solid #7c4700',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#2a1a00'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = '#1e1200'
          }}
        >
          対策を確認 →
        </button>
      </div>
    </div>
  )
}
