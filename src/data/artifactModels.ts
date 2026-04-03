export type ArtifactType = 'aliasing' | 'motion_ghost' | 'chemical_shift' | 'susceptibility' | 'gibbs'

export interface ArtifactParams {
  fov: number
  matrixFreq: number
  matrixPhase: number
  bandwidth: number
  phaseEncDir: string
  fieldStrength: number
  fatSat: string
  turboFactor: number
  ipatFactor: number
  phaseOversampling: number
  respTrigger: string
}

export interface ArtifactModel {
  id: ArtifactType
  label: string
  description: string
  generate: (params: ArtifactParams, basePhantom: Uint8ClampedArray) => Uint8ClampedArray
  severity: (params: ArtifactParams) => number
  relatedArtifactId: string
}

const SIZE = 128

function isInsideEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = x - cx
  const dy = y - cy
  return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1
}

// 128x128 Shepp-Logan簡易ファントム生成
export function generateBasePhantom(type: 'head' | 'abdomen'): Uint8ClampedArray {
  const data = new Uint8ClampedArray(SIZE * SIZE)
  const cx = SIZE / 2
  const cy = SIZE / 2

  if (type === 'head') {
    // 頭蓋骨外形（楕円）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy, 56, 62)) {
          data[idx] = 40 // 頭蓋骨
        }
      }
    }
    // 脳実質
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy, 48, 54)) {
          data[idx] = 160 // 白質
        }
      }
    }
    // 灰白質（外層）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy, 48, 54) && !isInsideEllipse(x, y, cx, cy, 42, 48)) {
          data[idx] = 180
        }
      }
    }
    // 脳室（CSF - 高信号T2）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx - 8, cy - 2, 8, 12) || isInsideEllipse(x, y, cx + 8, cy - 2, 8, 12)) {
          data[idx] = 220
        }
      }
    }
    // 皮下脂肪（頭皮）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy, 56, 62) && !isInsideEllipse(x, y, cx, cy, 50, 56)) {
          data[idx] = 200 // 脂肪
        }
      }
    }
  } else {
    // 腹部ファントム
    // 体幹外形
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy, 54, 46)) {
          data[idx] = 100 // 筋肉
        }
      }
    }
    // 皮下脂肪リング
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy, 54, 46) && !isInsideEllipse(x, y, cx, cy, 46, 38)) {
          data[idx] = 210 // 脂肪
        }
      }
    }
    // 肝臓
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx - 10, cy - 8, 22, 16)) {
          data[idx] = 140
        }
      }
    }
    // 脾臓
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx + 18, cy - 10, 10, 12)) {
          data[idx] = 150
        }
      }
    }
    // 腎臓（左右）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx - 20, cy + 8, 8, 12) || isInsideEllipse(x, y, cx + 20, cy + 8, 8, 12)) {
          data[idx] = 130
        }
      }
    }
    // 脊椎（後方）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy + 28, 8, 8)) {
          data[idx] = 60
        }
      }
    }
    // 大動脈
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx - 4, cy + 12, 4, 4)) {
          data[idx] = 240
        }
      }
    }
  }

  return data
}

// ファントムの輪郭マスク（体外=true）
function getOuterMask(phantom: Uint8ClampedArray): boolean[] {
  const mask: boolean[] = new Array(SIZE * SIZE).fill(false)
  for (let i = 0; i < SIZE * SIZE; i++) {
    mask[i] = phantom[i] === 0
  }
  return mask
}

// Sinc関数（リンギング用）
function sinc(x: number): number {
  if (Math.abs(x) < 1e-10) return 1
  return Math.sin(Math.PI * x) / (Math.PI * x)
}

// 乱数シード付きシンプル乱数（再現性）
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
}

// -----------------------------------------------------------------------
// ArtifactModel 実装
// -----------------------------------------------------------------------

const aliasingModel: ArtifactModel = {
  id: 'aliasing',
  label: '折り返し',
  description: 'FOVが被写体より小さいと、FOV外の信号が反対側に折り返して重畳する。位相方向にのみ発生。',
  relatedArtifactId: 'aliasing',

  severity(params) {
    const { fov, phaseOversampling } = params
    if (phaseOversampling > 0) {
      // phaseOversamplingで軽減：20%で50%減、50%でほぼ0
      const base = Math.max(0, 80 - fov * 0.25)
      return Math.max(0, Math.round(base * (1 - phaseOversampling / 60)))
    }
    // FOVが小さいほど重症
    const raw = Math.max(0, 100 - fov * 0.28)
    return Math.round(Math.min(raw, 100))
  },

  generate(params, basePhantom) {
    const { fov, phaseEncDir, phaseOversampling } = params
    const result = new Uint8ClampedArray(basePhantom)
    const sev = aliasingModel.severity(params)
    if (sev < 5) return result

    // 位相方向によってシフト軸を決める
    const isVertical = phaseEncDir === 'A>>P' || phaseEncDir === 'P>>A'
    const shiftFraction = Math.max(0, 0.4 - fov / 800)
    const shift = Math.round(SIZE * shiftFraction)
    if (shift < 2) return result

    const alpha = Math.min(0.7, sev / 100) * (1 - phaseOversampling / 80)

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (isVertical) {
          // 折り返しは上端に下端が重なる
          const srcY = (y + SIZE - shift) % SIZE
          const src = basePhantom[srcY * SIZE + x]
          const dst = result[y * SIZE + x]
          result[y * SIZE + x] = Math.min(255, Math.round(dst + src * alpha * 0.5))
        } else {
          // 水平方向折り返し
          const srcX = (x + SIZE - shift) % SIZE
          const src = basePhantom[y * SIZE + srcX]
          const dst = result[y * SIZE + x]
          result[y * SIZE + x] = Math.min(255, Math.round(dst + src * alpha * 0.5))
        }
      }
    }
    return result
  },
}

const motionGhostModel: ArtifactModel = {
  id: 'motion_ghost',
  label: '位相ゴースト',
  description: '呼吸などの周期的運動がk空間全体に影響し、位相方向に等間隔でゴーストが現れる。',
  relatedArtifactId: 'motion_ghost',

  severity(params) {
    const { respTrigger } = params
    if (respTrigger === 'BH' || respTrigger === 'PACE') return 10
    if (respTrigger === 'RT') return 30
    return 85 // Off
  },

  generate(params, basePhantom) {
    const { phaseEncDir, respTrigger } = params
    const result = new Uint8ClampedArray(basePhantom)
    const sev = motionGhostModel.severity(params)
    if (sev < 15) return result

    const alpha = (sev / 100) * 0.45
    const isVertical = phaseEncDir === 'A>>P' || phaseEncDir === 'P>>A'
    const ghostCount = 3
    const ghostSpacing = Math.round(SIZE / (ghostCount + 1))

    for (let g = 1; g <= ghostCount; g++) {
      const offset = ghostSpacing * g
      const decay = Math.pow(0.55, g) // 遠いゴーストほど薄い

      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if (isVertical) {
            const srcY = (y + SIZE - offset) % SIZE
            const src = basePhantom[srcY * SIZE + x]
            if (src > 10) {
              const dst = result[y * SIZE + x]
              result[y * SIZE + x] = Math.min(255, Math.round(dst + src * alpha * decay))
            }
          } else {
            const srcX = (x + SIZE - offset) % SIZE
            const src = basePhantom[y * SIZE + srcX]
            if (src > 10) {
              const dst = result[y * SIZE + x]
              result[y * SIZE + x] = Math.min(255, Math.round(dst + src * alpha * decay))
            }
          }
        }
      }
    }

    // respTrigger === 'Off' のとき追加ブラー
    if (respTrigger === 'Off') {
      for (let y = 1; y < SIZE - 1; y++) {
        for (let x = 1; x < SIZE - 1; x++) {
          if (isVertical) {
            const avg = (result[(y - 1) * SIZE + x] + result[(y + 1) * SIZE + x]) / 2
            result[y * SIZE + x] = Math.min(255, Math.round(result[y * SIZE + x] * 0.85 + avg * 0.15))
          }
        }
      }
    }

    return result
  },
}

const chemShiftModel: ArtifactModel = {
  id: 'chemical_shift',
  label: '化学シフト',
  description: '水と脂肪の共鳴周波数差により、読取方向に脂肪領域がずれて表示される。帯域幅↓・磁場強度↑で増悪。',
  relatedArtifactId: 'chemical_shift',

  severity(params) {
    const { bandwidth, fieldStrength, fatSat } = params
    if (fatSat !== 'None') return 8
    const freqDiff = fieldStrength === 3.0 ? 440 : 220
    const shiftPx = freqDiff / Math.max(bandwidth, 1)
    // shiftPx: 0.5-5px程度 → 0-100スコア
    const raw = Math.min(100, shiftPx * 20)
    return Math.round(raw)
  },

  generate(params, basePhantom) {
    const { bandwidth, fieldStrength, fatSat } = params
    const result = new Uint8ClampedArray(basePhantom)
    const sev = chemShiftModel.severity(params)
    if (sev < 5) return result

    const freqDiff = fieldStrength === 3.0 ? 440 : 220
    const shiftPx = Math.round(freqDiff / Math.max(bandwidth, 1))
    if (shiftPx < 1) return result

    // 脂肪組織（高輝度 >190）を読取方向（水平）にシフトしてダークバンド+ブライトバンド
    const fatAlpha = fatSat !== 'None' ? 0.1 : 1.0

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const src = basePhantom[y * SIZE + x]
        if (src > 185) {
          // 脂肪ピクセル → シフト先に加算、シフト元を暗くする
          const dstX = Math.min(SIZE - 1, x + shiftPx)
          const darkX = Math.max(0, x - 1)
          result[y * SIZE + dstX] = Math.min(255, Math.round(result[y * SIZE + dstX] + src * 0.5 * fatAlpha))
          result[y * SIZE + darkX] = Math.max(0, Math.round(result[y * SIZE + darkX] * (1 - 0.4 * fatAlpha)))
        }
      }
    }
    return result
  },
}

const susceptibilityModel: ArtifactModel = {
  id: 'susceptibility',
  label: '磁化率歪み',
  description: '組織の磁化率差（空気-軟部組織境界）でB0が局所的に不均一になり、信号消失と歪みが生じる。3Tで増悪。',
  relatedArtifactId: 'susceptibility',

  severity(params) {
    const { fieldStrength, bandwidth, turboFactor } = params
    let base = fieldStrength === 3.0 ? 75 : 40
    // 帯域幅↑で軽減
    if (bandwidth > 300) base = Math.round(base * 0.6)
    else if (bandwidth > 200) base = Math.round(base * 0.8)
    // EPIではturboFactor低い（≤1相当）→ 歪み大
    if (turboFactor <= 2) base = Math.min(100, Math.round(base * 1.4))
    return base
  },

  generate(params, basePhantom) {
    const { fieldStrength, bandwidth } = params
    const result = new Uint8ClampedArray(basePhantom)
    const sev = susceptibilityModel.severity(params)
    if (sev < 10) return result

    const rng = seededRandom(42)
    const distortionStrength = sev / 100
    const bwFactor = Math.max(0.3, 1 - bandwidth / 600)
    const fieldFactor = fieldStrength === 3.0 ? 1.5 : 1.0

    // 楕円外縁付近に歪み・信号消失を追加
    const cx = SIZE / 2
    const cy = SIZE / 2

    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const src = basePhantom[y * SIZE + x]
        if (src === 0) continue

        const dx = x - cx
        const dy = y - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const edgeDist = Math.abs(dist - 52) // 距離52付近が境界

        if (edgeDist < 8) {
          // 境界付近：ランダムな歪み + 暗部
          const noise = rng() * distortionStrength * bwFactor * fieldFactor
          const dark = Math.round(src * (1 - noise * 0.8))
          // 歪み：隣接ピクセルへ信号移動
          const jitter = Math.round((rng() - 0.5) * 4 * distortionStrength)
          const nx = Math.max(0, Math.min(SIZE - 1, x + jitter))
          result[y * SIZE + x] = Math.max(0, dark)
          if (noise > 0.4) result[y * SIZE + nx] = Math.min(255, result[y * SIZE + nx] + 30)
        }
      }
    }

    // 空気界面（頭部：前頭洞・副鼻腔）に信号消失スポット
    const hotspots = [
      { x: Math.round(cx), y: Math.round(cy + 40), r: 6 },
      { x: Math.round(cx - 20), y: Math.round(cy + 30), r: 4 },
      { x: Math.round(cx + 20), y: Math.round(cy + 30), r: 4 },
    ]
    for (const hs of hotspots) {
      for (let y = hs.y - hs.r; y <= hs.y + hs.r; y++) {
        for (let x = hs.x - hs.r; x <= hs.x + hs.r; x++) {
          if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) continue
          const d = Math.sqrt((x - hs.x) ** 2 + (y - hs.y) ** 2)
          if (d <= hs.r) {
            const fade = (1 - d / hs.r) * distortionStrength * fieldFactor
            result[y * SIZE + x] = Math.max(0, Math.round(result[y * SIZE + x] * (1 - fade * 0.9)))
          }
        }
      }
    }

    return result
  },
}

const gibbsModel: ArtifactModel = {
  id: 'gibbs',
  label: 'ギブス',
  description: 'k空間の打ち切り（Truncation）により高コントラスト境界にsinc状のリンギングが発生する。Matrix低下で増悪。',
  relatedArtifactId: 'gibbs',

  severity(params) {
    const { matrixFreq, matrixPhase } = params
    const minMatrix = Math.min(matrixFreq, matrixPhase)
    if (minMatrix >= 320) return 8
    if (minMatrix >= 256) return 25
    if (minMatrix >= 192) return 55
    return 85
  },

  generate(params, basePhantom) {
    const sev = gibbsModel.severity(params)
    if (sev < 15) return new Uint8ClampedArray(basePhantom)

    const result = new Uint8ClampedArray(basePhantom)
    const outerMask = getOuterMask(basePhantom)
    const amplitude = (sev / 100) * 35
    const ringCount = Math.max(2, Math.round(sev / 20))

    // エッジ検出：隣接ピクセルとの輝度差が大きい境界ピクセルを検出
    const edges: { x: number; y: number; contrast: number }[] = []
    for (let y = 1; y < SIZE - 1; y++) {
      for (let x = 1; x < SIZE - 1; x++) {
        const center = basePhantom[y * SIZE + x]
        const right = basePhantom[y * SIZE + x + 1]
        const below = basePhantom[(y + 1) * SIZE + x]
        const contrastH = Math.abs(center - right)
        const contrastV = Math.abs(center - below)
        const contrast = Math.max(contrastH, contrastV)
        if (contrast > 50) {
          edges.push({ x, y, contrast })
        }
      }
    }

    // 各エッジからsinc状のリンギングを放射
    for (const edge of edges) {
      const weight = Math.min(1, (edge.contrast - 50) / 150)
      for (let r = 1; r <= ringCount * 4; r++) {
        const ringAmp = amplitude * weight * sinc(r / 3) * 0.5
        if (Math.abs(ringAmp) < 0.5) continue

        // 水平方向リンギング
        for (let dx = -r; dx <= r; dx++) {
          const nx = edge.x + dx
          if (nx < 0 || nx >= SIZE) continue
          if (outerMask[edge.y * SIZE + nx]) continue
          result[edge.y * SIZE + nx] = Math.max(0, Math.min(255,
            Math.round(result[edge.y * SIZE + nx] + ringAmp * Math.cos(dx * 0.8))
          ))
        }
        // 垂直方向リンギング
        for (let dy = -r; dy <= r; dy++) {
          const ny = edge.y + dy
          if (ny < 0 || ny >= SIZE) continue
          if (outerMask[ny * SIZE + edge.x]) continue
          result[ny * SIZE + edge.x] = Math.max(0, Math.min(255,
            Math.round(result[ny * SIZE + edge.x] + ringAmp * Math.cos(dy * 0.8))
          ))
        }
      }
    }

    return result
  },
}

export const artifactModels: ArtifactModel[] = [
  aliasingModel,
  motionGhostModel,
  chemShiftModel,
  susceptibilityModel,
  gibbsModel,
]
