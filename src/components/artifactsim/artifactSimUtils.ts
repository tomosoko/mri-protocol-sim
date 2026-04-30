import type { ArtifactType } from '../../data/artifactModels'

export const CANVAS_SIZE = 240
export const IMG_SIZE = 128

// ---------------------------------------------------------------------------
// Canvas drawing utilities
// ---------------------------------------------------------------------------

export function drawPhantomToCanvas(
  canvas: HTMLCanvasElement,
  data: Uint8ClampedArray,
): void {
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

export function drawDiffToCanvas(
  canvas: HTMLCanvasElement,
  normal: Uint8ClampedArray,
  artifact: Uint8ClampedArray,
  amplify = 3,
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const imageData = ctx.createImageData(IMG_SIZE, IMG_SIZE)
  for (let i = 0; i < IMG_SIZE * IMG_SIZE; i++) {
    const diff = Math.min(255, Math.abs(artifact[i] - normal[i]) * amplify)
    // 差分を疑似カラー: 低→青、高→赤
    const r = Math.min(255, Math.round(diff * 1.5))
    const g = Math.min(255, Math.round(diff * 0.6))
    const b = Math.min(255, Math.round(255 - diff * 2))
    imageData.data[i * 4 + 0] = r
    imageData.data[i * 4 + 1] = g
    imageData.data[i * 4 + 2] = Math.max(0, b)
    imageData.data[i * 4 + 3] = 255
  }

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

// ---------------------------------------------------------------------------
// Demo slider configuration
// ---------------------------------------------------------------------------

export interface SliderConfig {
  label: string
  unit: string
  min: number
  max: number
  step: number
  defaultValue: number
  paramKey: string
  description: string
}

export function getSliderConfig(artifactId: ArtifactType): SliderConfig | null {
  switch (artifactId) {
    case 'aliasing':
      return {
        label: 'デモFOV',
        unit: 'mm',
        min: 150,
        max: 400,
        step: 10,
        defaultValue: 250,
        paramKey: 'fov',
        description: 'FOVを下げると折り返しが強くなる',
      }
    case 'motion_ghost':
      return {
        label: 'ゴースト強度',
        unit: '%',
        min: 0,
        max: 100,
        step: 5,
        defaultValue: 88,
        paramKey: 'ghostIntensity',
        description: '呼吸同期なし相当の強度を直接調整',
      }
    case 'chemical_shift':
      return {
        label: 'デモBW',
        unit: 'Hz/px',
        min: 50,
        max: 500,
        step: 10,
        defaultValue: 130,
        paramKey: 'bandwidth',
        description: '帯域幅を下げると化学シフト増大',
      }
    case 'susceptibility':
      return {
        label: 'デモBW',
        unit: 'Hz/px',
        min: 50,
        max: 500,
        step: 10,
        defaultValue: 150,
        paramKey: 'bandwidth',
        description: '帯域幅を上げると歪みが軽減',
      }
    case 'gibbs':
      return {
        label: 'デモMatrix',
        unit: '',
        min: 64,
        max: 320,
        step: 16,
        defaultValue: 128,
        paramKey: 'matrixPhase',
        description: 'Matrixを下げるとリンギングが強くなる',
      }
    case 'zipper':
      return {
        label: 'ETL（TurboFactor）',
        unit: '',
        min: 1,
        max: 32,
        step: 1,
        defaultValue: 16,
        paramKey: 'turboFactor',
        description: 'ETL↑でジッパー影響を受けるエコーが増える',
      }
    case 'gfactor_noise':
      return {
        label: 'デモIPAT',
        unit: '',
        min: 1,
        max: 4,
        step: 1,
        defaultValue: 2,
        paramKey: 'ipatFactor',
        description: '加速係数↑でg-factorノイズが増大する',
      }
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Influence list logic
// ---------------------------------------------------------------------------

export type InfluenceLevel = 'good' | 'warn' | 'bad'

export interface InfluenceItem {
  label: string
  value: string
  level: InfluenceLevel
}

export interface InfluenceParams {
  fov: number
  matrixFreq: number
  matrixPhase: number
  bandwidth: number
  phaseOversampling: number
  phaseEncDir: string
  respTrigger: string
  fieldStrength: number
  fatSat: string
  turboFactor: number
  ipatFactor: number
}

export function getInfluenceItems(
  id: ArtifactType,
  p: InfluenceParams,
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
        {
          label: '位相方向',
          value: p.phaseEncDir,
          level: 'warn',
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
        {
          label: 'ゴースト間隔',
          value: '1/2・1/4 FOV',
          level: 'warn',
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
        {
          label: '副鼻腔周囲',
          value: '信号消失+歪み',
          level: 'bad',
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
    case 'zipper':
      return [
        {
          label: '磁場強度',
          value: `${p.fieldStrength}T`,
          level: p.fieldStrength >= 2.5 ? 'bad' : 'warn',
        },
        {
          label: 'TurboFactor (ETL)',
          value: `${p.turboFactor}`,
          level: p.turboFactor >= 16 ? 'bad' : p.turboFactor >= 8 ? 'warn' : 'good',
        },
        {
          label: 'EMIシールド',
          value: 'ファラデーケージ確認',
          level: 'warn',
        },
      ]
    case 'standing_wave':
      return [
        {
          label: '磁場強度',
          value: `${p.fieldStrength}T`,
          level: p.fieldStrength >= 2.5 ? 'bad' : 'good',
        },
        {
          label: '3T対策',
          value: 'TrueForm/TIAMO推奨',
          level: p.fieldStrength >= 2.5 ? 'warn' : 'good',
        },
        {
          label: 'ゲルパッド',
          value: '局所B1補正に有効',
          level: 'warn',
        },
      ]
    case 'gfactor_noise':
      return [
        {
          label: 'IPAT/GRAPPA',
          value: `AF=${p.ipatFactor}`,
          level: p.ipatFactor <= 1 ? 'good' : p.ipatFactor === 2 ? 'warn' : 'bad',
        },
        {
          label: 'コイルch数',
          value: p.ipatFactor >= 3 ? '多ch推奨' : '適切',
          level: p.ipatFactor >= 3 ? 'warn' : 'good',
        },
        {
          label: 'SNR影響',
          value: `×1/√${p.ipatFactor} ×g`,
          level: p.ipatFactor <= 2 ? 'warn' : 'bad',
        },
      ]
  }
}
