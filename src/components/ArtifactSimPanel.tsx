import { useEffect, useRef, useState } from 'react'
import { useProtocolStore } from '../store/protocolStore'
import {
  artifactModels,
  generateBasePhantom,
  type ArtifactType,
} from '../data/artifactModels'

const CANVAS_SIZE = 112
const IMG_SIZE = 128

interface ArtifactSimPanelProps {
  onShowArtifactGuide?: () => void
}

function drawPhantomToCanvas(
  canvas: HTMLCanvasElement,
  data: Uint8ClampedArray,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const imageData = ctx.createImageData(IMG_SIZE, IMG_SIZE)
  for (let i = 0; i < IMG_SIZE * IMG_SIZE; i++) {
    const v = data[i]
    imageData.data[i * 4 + 0] = v
    imageData.data[i * 4 + 1] = v
    imageData.data[i * 4 + 2] = v
    imageData.data[i * 4 + 3] = 255
  }

  // オフスクリーンCanvasに128x128で描いてから112x112にスケール
  const offscreen = document.createElement('canvas')
  offscreen.width = IMG_SIZE
  offscreen.height = IMG_SIZE
  const octx = offscreen.getContext('2d')
  if (!octx) return
  octx.putImageData(imageData, 0, 0)

  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  ctx.drawImage(offscreen, 0, 0, IMG_SIZE, IMG_SIZE, 0, 0, CANVAS_SIZE, CANVAS_SIZE)
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

export function ArtifactSimPanel({ onShowArtifactGuide }: ArtifactSimPanelProps) {
  const { params } = useProtocolStore()
  const [activeArtifact, setActiveArtifact] = useState<ArtifactType>('aliasing')
  const [phantomType, setPhantomType] = useState<'head' | 'abdomen'>('head')

  const normalCanvasRef = useRef<HTMLCanvasElement>(null)
  const artifactCanvasRef = useRef<HTMLCanvasElement>(null)

  const model = artifactModels.find(m => m.id === activeArtifact)!

  const artifactParams = {
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

  const severity = model.severity(artifactParams)

  useEffect(() => {
    const basePhantom = generateBasePhantom(phantomType)
    const artifactPhantom = model.generate(artifactParams, basePhantom)

    if (normalCanvasRef.current) {
      drawPhantomToCanvas(normalCanvasRef.current, basePhantom)
    }
    if (artifactCanvasRef.current) {
      drawPhantomToCanvas(artifactCanvasRef.current, artifactPhantom)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, activeArtifact, phantomType])

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
        {(['head', 'abdomen'] as const).map(t => (
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
            {t === 'head' ? '頭部' : '腹部'}
          </button>
        ))}
      </div>

      {/* Canvas pair */}
      <div
        className="shrink-0 flex justify-around items-end px-2 py-3"
        style={{ background: '#0a0a0a', borderBottom: '1px solid #252525' }}
      >
        <div className="flex flex-col items-center gap-1">
          <canvas
            ref={normalCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ display: 'block', border: '1px solid #252525' }}
          />
          <span style={{ color: '#4b5563', fontSize: '9px' }}>正常</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <canvas
            ref={artifactCanvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            style={{ display: 'block', border: '1px solid #3d2200' }}
          />
          <span style={{ color: '#e88b00', fontSize: '9px' }}>アーチファクト</span>
        </div>
      </div>

      {/* Info area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Severity */}
        <div className="rounded p-2.5" style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
          <SeverityBar value={severity} />
        </div>

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
          <InfluenceList artifactId={activeArtifact} params={artifactParams} />
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

// パラメータごとの影響表示
interface InfluenceListProps {
  artifactId: ArtifactType
  params: {
    fov: number
    matrixFreq: number
    matrixPhase: number
    bandwidth: number
    phaseOversampling: number
    respTrigger: string
    fieldStrength: number
    fatSat: string
    turboFactor: number
  }
}

function InfluenceList({ artifactId, params }: InfluenceListProps) {
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

type InfluenceLevel = 'good' | 'warn' | 'bad'
interface InfluenceItem {
  label: string
  value: string
  level: InfluenceLevel
}

function getInfluenceItems(
  id: ArtifactType,
  p: InfluenceListProps['params'],
): InfluenceItem[] {
  switch (id) {
    case 'aliasing':
      return [
        {
          label: 'FOV',
          value: `${p.fov} mm`,
          level: p.fov >= 300 ? 'good' : p.fov >= 220 ? 'warn' : 'bad',
        },
        {
          label: 'PhaseOversampling',
          value: `${p.phaseOversampling}%`,
          level: p.phaseOversampling >= 20 ? 'good' : p.phaseOversampling > 0 ? 'warn' : 'bad',
        },
      ]
    case 'motion_ghost':
      return [
        {
          label: '呼吸同期',
          value: p.respTrigger,
          level: p.respTrigger === 'BH' || p.respTrigger === 'PACE' ? 'good'
            : p.respTrigger === 'RT' ? 'warn' : 'bad',
        },
      ]
    case 'chemical_shift': {
      const shift = Math.round((p.fieldStrength === 3.0 ? 440 : 220) / Math.max(p.bandwidth, 1) * 10) / 10
      return [
        {
          label: '帯域幅 (BW)',
          value: `${p.bandwidth} Hz/px`,
          level: p.bandwidth >= 300 ? 'good' : p.bandwidth >= 200 ? 'warn' : 'bad',
        },
        {
          label: '磁場強度',
          value: `${p.fieldStrength}T`,
          level: p.fieldStrength === 1.5 ? 'good' : 'warn',
        },
        {
          label: 'シフト量',
          value: `${shift} px`,
          level: shift < 1.5 ? 'good' : shift < 3 ? 'warn' : 'bad',
        },
        {
          label: '脂肪抑制',
          value: p.fatSat !== 'None' ? p.fatSat : 'なし',
          level: p.fatSat !== 'None' ? 'good' : 'warn',
        },
      ]
    }
    case 'susceptibility':
      return [
        {
          label: '磁場強度',
          value: `${p.fieldStrength}T`,
          level: p.fieldStrength === 1.5 ? 'good' : 'bad',
        },
        {
          label: '帯域幅 (BW)',
          value: `${p.bandwidth} Hz/px`,
          level: p.bandwidth >= 300 ? 'good' : p.bandwidth >= 200 ? 'warn' : 'bad',
        },
        {
          label: 'TurboFactor',
          value: `${p.turboFactor}`,
          level: p.turboFactor >= 8 ? 'good' : p.turboFactor >= 3 ? 'warn' : 'bad',
        },
      ]
    case 'gibbs': {
      const minM = Math.min(p.matrixFreq, p.matrixPhase)
      return [
        {
          label: 'Matrix (Freq)',
          value: `${p.matrixFreq}`,
          level: p.matrixFreq >= 256 ? 'good' : p.matrixFreq >= 192 ? 'warn' : 'bad',
        },
        {
          label: 'Matrix (Phase)',
          value: `${p.matrixPhase}`,
          level: p.matrixPhase >= 256 ? 'good' : p.matrixPhase >= 192 ? 'warn' : 'bad',
        },
        {
          label: '最小Matrix',
          value: `${minM}`,
          level: minM >= 256 ? 'good' : minM >= 192 ? 'warn' : 'bad',
        },
      ]
    }
  }
}
