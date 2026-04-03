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
// 高品質ファントム生成
// -----------------------------------------------------------------------

export function generateBasePhantom(type: 'head' | 'abdomen'): Uint8ClampedArray {
  const data = new Uint8ClampedArray(SIZE * SIZE)
  const cx = SIZE / 2
  const cy = SIZE / 2
  const rng = seededRandom(7)

  if (type === 'head') {
    // --- 頭部: Shepp-Logan拡張版 ---

    // 1. 皮下脂肪（最外層: 強度200）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy, 58, 64)) {
          data[idx] = 200
        }
      }
    }

    // 2. 頭蓋骨外板（骨皮質: 強度220）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy, 53, 59) && !isInsideEllipse(x, y, cx, cy, 50, 56)) {
          data[idx] = 220
        }
      }
    }

    // 3. 頭蓋骨内板（骨髄: 少し明るい）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy, 50, 56) && !isInsideEllipse(x, y, cx, cy, 47, 53)) {
          data[idx] = 160
        }
      }
    }

    // 4. 脳実質（白質: 強度140）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy, 47, 53)) {
          data[idx] = 140
        }
      }
    }

    // 5. 灰白質（外層: 強度170）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy, 47, 53) && !isInsideEllipse(x, y, cx, cy, 41, 47)) {
          data[idx] = 170
        }
      }
    }

    // 6. 大脳半球（中央楕円: 強度140）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy, 30, 35)) {
          data[idx] = 140
        }
      }
    }

    // 7. 脳室（CSF: 強度240 - T2で非常に明るい）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        // 側脳室（細長い楕円2個）
        if (isInsideEllipse(x, y, cx - 9, cy - 3, 7, 11) || isInsideEllipse(x, y, cx + 9, cy - 3, 7, 11)) {
          data[idx] = 240
        }
        // 第三脳室（中央細線）
        if (isInsideEllipse(x, y, cx, cy + 4, 2, 6)) {
          data[idx] = 240
        }
      }
    }

    // 8. 副鼻腔（空気腔: 強度10 - 磁化率アーチファクトの起点）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        // 前頭洞
        if (isInsideEllipse(x, y, cx, cy + 46, 8, 5)) {
          data[idx] = 10
        }
        // 篩骨洞（左右）
        if (isInsideEllipse(x, y, cx - 10, cy + 38, 4, 4) || isInsideEllipse(x, y, cx + 10, cy + 38, 4, 4)) {
          data[idx] = 10
        }
      }
    }

    // 9. ガウスノイズ ±5 を体内全体に付加
    for (let i = 0; i < SIZE * SIZE; i++) {
      if (data[i] > 0) {
        const noise = Math.round((rng() - 0.5) * 10)
        data[i] = Math.max(5, Math.min(255, data[i] + noise))
      }
    }
  } else {
    // --- 腹部ファントム改善版 ---

    // 1. 体表輪郭（皮下脂肪: 強度200）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy, 56, 48)) {
          data[idx] = 200
        }
      }
    }

    // 2. 筋肉層（内側）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy, 48, 40)) {
          data[idx] = 100
        }
      }
    }

    // 3. 肝臓（右側大楕円: 強度130）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx - 12, cy - 6, 24, 18)) {
          data[idx] = 130
        }
      }
    }

    // 4. 脾臓（左小楕円: 強度120）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx + 20, cy - 10, 11, 13)) {
          data[idx] = 120
        }
      }
    }

    // 5. 腎臓（左右対称小楕円: 強度110）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx - 22, cy + 6, 8, 13) || isInsideEllipse(x, y, cx + 22, cy + 6, 8, 13)) {
          data[idx] = 110
        }
      }
    }

    // 6. 大動脈（中央小円: 強度60 - 血流は低信号 spin saturation）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx - 4, cy + 10, 4, 4)) {
          data[idx] = 60
        }
      }
    }

    // 7. 脊椎骨（後方楕円: 強度200 - 皮質骨）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const idx = y * SIZE + x
        if (isInsideEllipse(x, y, cx, cy + 30, 9, 9)) {
          data[idx] = 200
        }
        // 椎体（骨髄: やや明るい）
        if (isInsideEllipse(x, y, cx, cy + 30, 6, 6)) {
          data[idx] = 170
        }
      }
    }

    // 8. 腸管ガス（複数の暗点: 強度10）
    const gasSpots = [
      { gx: cx + 8, gy: cy + 2, gr: 3 },
      { gx: cx - 8, gy: cy + 14, gr: 4 },
      { gx: cx + 18, gy: cy + 18, gr: 3 },
      { gx: cx - 16, gy: cy + 8, gr: 3 },
      { gx: cx + 5, gy: cy + 22, gr: 2 },
    ]
    for (const spot of gasSpots) {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          const idx = y * SIZE + x
          if (isInsideEllipse(x, y, spot.gx, spot.gy, spot.gr, spot.gr)) {
            data[idx] = 10
          }
        }
      }
    }

    // 9. ガウスノイズ ±5
    for (let i = 0; i < SIZE * SIZE; i++) {
      if (data[i] > 0) {
        const noise = Math.round((rng() - 0.5) * 10)
        data[i] = Math.max(5, Math.min(255, data[i] + noise))
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

// -----------------------------------------------------------------------
// ArtifactModel 実装
// -----------------------------------------------------------------------

const aliasingModel: ArtifactModel = {
  id: 'aliasing',
  label: '折り返し',
  description: 'FOVが被写体より小さいと、FOV外の信号が反対側に折り返して重畳する。位相方向にのみ発生。A>>P方向では上下に、R>>L方向では左右に体が折り返す。',
  relatedArtifactId: 'aliasing',

  severity(params) {
    const { fov, phaseOversampling } = params
    if (phaseOversampling > 0) {
      const base = Math.max(0, 80 - fov * 0.25)
      return Math.max(0, Math.round(base * (1 - phaseOversampling / 60)))
    }
    const raw = Math.max(0, 100 - fov * 0.28)
    return Math.round(Math.min(raw, 100))
  },

  generate(params, basePhantom) {
    const { fov, phaseEncDir, phaseOversampling } = params
    const result = new Uint8ClampedArray(basePhantom)
    const sev = aliasingModel.severity(params)
    if (sev < 5) return result

    // A>>P または P>>A: 上下方向（垂直）折り返し
    // R>>L または L>>R: 左右方向（水平）折り返し
    const isVertical = phaseEncDir === 'A>>P' || phaseEncDir === 'P>>A'

    // FOVが小さいほどシフト量大（体がFOV外に出る割合）
    const fovFraction = Math.max(0, (350 - fov) / 350)
    const shift = Math.max(4, Math.round(SIZE * fovFraction * 0.55))
    const alpha = Math.min(0.8, sev / 100) * Math.max(0.1, 1 - phaseOversampling / 80)

    // 折り返し: 反対側からもシフトして重畳（双方向）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dst = result[y * SIZE + x]
        if (isVertical) {
          // 上端の body が下端に折り返し
          const srcY1 = (y + shift) % SIZE
          const srcY2 = (y + SIZE - shift) % SIZE
          const src1 = basePhantom[srcY1 * SIZE + x]
          const src2 = basePhantom[srcY2 * SIZE + x]
          // どちらか強い方が折り返して重畳
          const ghostVal = Math.max(src1, src2)
          result[y * SIZE + x] = Math.min(255, Math.round(dst + ghostVal * alpha * 0.6))
        } else {
          const srcX1 = (x + shift) % SIZE
          const srcX2 = (x + SIZE - shift) % SIZE
          const src1 = basePhantom[y * SIZE + srcX1]
          const src2 = basePhantom[y * SIZE + srcX2]
          const ghostVal = Math.max(src1, src2)
          result[y * SIZE + x] = Math.min(255, Math.round(dst + ghostVal * alpha * 0.6))
        }
      }
    }
    return result
  },
}

const motionGhostModel: ArtifactModel = {
  id: 'motion_ghost',
  label: '位相ゴースト',
  description: '呼吸などの周期的運動がk空間全体に影響し、位相方向に等間隔でゴーストが現れる。呼吸周期の高調波に相当する1/2・1/4 FOV間隔で複数のゴーストが出現。',
  relatedArtifactId: 'motion_ghost',

  severity(params) {
    const { respTrigger } = params
    if (respTrigger === 'BH' || respTrigger === 'PACE') return 8
    if (respTrigger === 'RT') return 38
    return 88 // Off
  },

  generate(params, basePhantom) {
    const { phaseEncDir, respTrigger } = params
    const result = new Uint8ClampedArray(basePhantom)
    const sev = motionGhostModel.severity(params)
    if (sev < 12) return result

    // respTriggerによる強度係数
    const triggerFactor = respTrigger === 'Off' ? 1.0
      : respTrigger === 'RT' ? 0.5
      : 0.1 // BH / PACE

    // 呼吸周期の高調波: 1/2 FOV, 1/4 FOV, 1/6 FOV, 1/8 FOV, 1/3 FOV
    // ゴーストオフセット（ピクセル）: FOVの分数倍
    const ghostOffsets = [
      SIZE / 2,     // 1/2 FOV
      SIZE / 4,     // 1/4 FOV
      SIZE * 3 / 4, // 3/4 FOV
      SIZE / 3,     // 1/3 FOV
      SIZE * 2 / 3, // 2/3 FOV
    ]
    // 各ゴーストの強度: 15-30%、遠いほど減衰
    const ghostAlphas = [0.28, 0.20, 0.20, 0.15, 0.15]

    const isVertical = phaseEncDir === 'A>>P' || phaseEncDir === 'P>>A'

    for (let g = 0; g < ghostOffsets.length; g++) {
      const offset = Math.round(ghostOffsets[g])
      const alpha = ghostAlphas[g] * triggerFactor

      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if (isVertical) {
            const srcY = (y + SIZE - offset) % SIZE
            const src = basePhantom[srcY * SIZE + x]
            if (src > 8) {
              const dst = result[y * SIZE + x]
              result[y * SIZE + x] = Math.min(255, Math.round(dst + src * alpha))
            }
          } else {
            const srcX = (x + SIZE - offset) % SIZE
            const src = basePhantom[y * SIZE + srcX]
            if (src > 8) {
              const dst = result[y * SIZE + x]
              result[y * SIZE + x] = Math.min(255, Math.round(dst + src * alpha))
            }
          }
        }
      }
    }

    // respTrigger === 'Off' のとき追加ブラー（位相方向に拡散）
    if (respTrigger === 'Off') {
      const blurred = new Uint8ClampedArray(result)
      for (let y = 2; y < SIZE - 2; y++) {
        for (let x = 2; x < SIZE - 2; x++) {
          if (isVertical) {
            const avg = (
              result[(y - 2) * SIZE + x] * 0.1 +
              result[(y - 1) * SIZE + x] * 0.2 +
              result[y * SIZE + x] * 0.4 +
              result[(y + 1) * SIZE + x] * 0.2 +
              result[(y + 2) * SIZE + x] * 0.1
            )
            blurred[y * SIZE + x] = Math.min(255, Math.round(avg))
          } else {
            const avg = (
              result[y * SIZE + x - 2] * 0.1 +
              result[y * SIZE + x - 1] * 0.2 +
              result[y * SIZE + x] * 0.4 +
              result[y * SIZE + x + 1] * 0.2 +
              result[y * SIZE + x + 2] * 0.1
            )
            blurred[y * SIZE + x] = Math.min(255, Math.round(avg))
          }
        }
      }
      return blurred
    }

    return result
  },
}

const chemShiftModel: ArtifactModel = {
  id: 'chemical_shift',
  label: '化学シフト',
  description: '水と脂肪の共鳴周波数差により、読取方向に脂肪領域がずれて表示される。脂肪-水界面に黒バンド（信号空白）と白バンド（信号重複）が現れる。帯域幅↓・磁場強度↑で増悪。',
  relatedArtifactId: 'chemical_shift',

  severity(params) {
    const { bandwidth, fieldStrength, fatSat } = params
    if (fatSat !== 'None') return 8
    const freqDiff = fieldStrength === 3.0 ? 440 : 220
    const shiftPx = freqDiff / Math.max(bandwidth, 1)
    const raw = Math.min(100, shiftPx * 20)
    return Math.round(raw)
  },

  generate(params, basePhantom) {
    const { bandwidth, fieldStrength, fatSat } = params
    const result = new Uint8ClampedArray(basePhantom)
    const sev = chemShiftModel.severity(params)
    if (sev < 5) return result

    const freqDiff = fieldStrength === 3.0 ? 440 : 220
    const shiftPx = Math.max(1, Math.round(freqDiff / Math.max(bandwidth, 1)))
    const fatAlpha = fatSat !== 'None' ? 0.1 : 1.0

    // 脂肪マスクを生成（高輝度 >185 のピクセル = 皮下脂肪）
    const fatMask = new Uint8ClampedArray(SIZE * SIZE)
    for (let i = 0; i < SIZE * SIZE; i++) {
      fatMask[i] = basePhantom[i] > 185 ? basePhantom[i] : 0
    }

    // 化学シフト: 脂肪をX方向にシフトして重畳
    // シフト先（白バンド）: 脂肪 + shiftPx
    // シフト元（黒バンド）: 脂肪 - 1px（界面を暗くする）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const fatVal = fatMask[y * SIZE + x]
        if (fatVal === 0) continue

        // 白バンド（シフト先: 脂肪が水領域に重複）
        const brightX = Math.min(SIZE - 1, x + shiftPx)
        const brightX2 = Math.min(SIZE - 1, x + shiftPx + 1)
        result[y * SIZE + brightX] = Math.min(255,
          Math.round(result[y * SIZE + brightX] + fatVal * 0.7 * fatAlpha))
        if (brightX2 < SIZE) {
          result[y * SIZE + brightX2] = Math.min(255,
            Math.round(result[y * SIZE + brightX2] + fatVal * 0.35 * fatAlpha))
        }

        // 黒バンド（シフト元界面: 信号空白）
        // 脂肪と水の境界（脂肪右端）に暗部を作る
        const rightNeighbor = x + 1 < SIZE ? basePhantom[y * SIZE + x + 1] : 255
        if (rightNeighbor < 150) {
          // 水-脂肪境界の右側を暗くする
          for (let dx = 0; dx < shiftPx && x + dx < SIZE; dx++) {
            const bx = x + dx
            result[y * SIZE + bx] = Math.max(0,
              Math.round(result[y * SIZE + bx] * (1 - 0.6 * fatAlpha * (1 - dx / shiftPx))))
          }
        }
      }
    }
    return result
  },
}

const susceptibilityModel: ArtifactModel = {
  id: 'susceptibility',
  label: '磁化率歪み',
  description: '組織の磁化率差（空気-軟部組織境界）でB0が局所的に不均一になり、信号消失と歪みが生じる。副鼻腔・前頭洞周囲に顕著。3Tで増悪し、広帯域幅で軽減。',
  relatedArtifactId: 'susceptibility',

  severity(params) {
    const { fieldStrength, bandwidth, turboFactor } = params
    let base = fieldStrength === 3.0 ? 78 : 42
    if (bandwidth > 300) base = Math.round(base * 0.55)
    else if (bandwidth > 200) base = Math.round(base * 0.75)
    if (turboFactor <= 2) base = Math.min(100, Math.round(base * 1.4))
    return base
  },

  generate(params, basePhantom) {
    const { fieldStrength, bandwidth } = params
    const result = new Uint8ClampedArray(basePhantom)
    const sev = susceptibilityModel.severity(params)
    if (sev < 10) return result

    const distortionStrength = sev / 100
    const bwFactor = Math.max(0.25, 1 - bandwidth / 500)
    const fieldFactor = fieldStrength === 3.0 ? 1.8 : 1.0
    const rng = seededRandom(42)

    // 副鼻腔・前頭洞（空気腔）の位置に歪み・信号消失を発生
    // 頭部ファントムの副鼻腔位置に対応
    const cx = SIZE / 2
    const cy = SIZE / 2
    const airCavities = [
      { x: Math.round(cx), y: Math.round(cy + 46), r: 12, strength: 1.0 },    // 前頭洞（大）
      { x: Math.round(cx - 10), y: Math.round(cy + 38), r: 8, strength: 0.8 }, // 篩骨洞左
      { x: Math.round(cx + 10), y: Math.round(cy + 38), r: 8, strength: 0.8 }, // 篩骨洞右
    ]

    for (const cavity of airCavities) {
      const effectR = cavity.r + Math.round(10 * distortionStrength * fieldFactor * bwFactor)
      for (let y = cavity.y - effectR; y <= cavity.y + effectR; y++) {
        for (let x = cavity.x - effectR; x <= cavity.x + effectR; x++) {
          if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) continue
          const d = Math.sqrt((x - cavity.x) ** 2 + (y - cavity.y) ** 2)
          if (d > effectR) continue

          // 信号消失: 空気腔から近いほど強い
          const falloff = Math.max(0, 1 - (d - cavity.r) / (effectR - cavity.r + 1))
          const fade = falloff * distortionStrength * fieldFactor * bwFactor * cavity.strength

          // 歪み（バレル変形）: 位相方向にピクセルをシフト
          const jitter = Math.round((rng() - 0.5) * 8 * falloff * fieldFactor * bwFactor)
          const nx = Math.max(0, Math.min(SIZE - 1, x + jitter))
          const origVal = result[y * SIZE + x]

          if (fade > 0.1) {
            // 信号消失スポット
            result[y * SIZE + x] = Math.max(0, Math.round(origVal * (1 - fade * 0.95)))
            // 隣接ピクセルへ信号集積（過集積=明るいバンド）
            if (rng() > 0.6 && nx !== x) {
              result[y * SIZE + nx] = Math.min(255, Math.round(result[y * SIZE + nx] + origVal * 0.4 * falloff))
            }
          }
        }
      }
    }

    // 体輪郭の磁化率歪み（楕円変形: バレル歪み）
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const src = basePhantom[y * SIZE + x]
        if (src === 0) continue

        const dx = x - cx
        const dy = y - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const edgeDist = Math.abs(dist - 54)

        if (edgeDist < 6) {
          const noise = rng() * distortionStrength * bwFactor * fieldFactor * 0.6
          result[y * SIZE + x] = Math.max(0, Math.round(result[y * SIZE + x] * (1 - noise)))
        }
      }
    }

    return result
  },
}

const gibbsModel: ArtifactModel = {
  id: 'gibbs',
  label: 'ギブス',
  description: 'k空間の打ち切り（Truncation）により高コントラスト境界にsinc状のリンギングが発生する。体輪郭・脳室から3-4本の明暗バンドが描かれる。Matrix低下で増悪。',
  relatedArtifactId: 'gibbs',

  severity(params) {
    const { matrixFreq, matrixPhase } = params
    const minMatrix = Math.min(matrixFreq, matrixPhase)
    if (minMatrix >= 320) return 8
    if (minMatrix >= 256) return 25
    if (minMatrix >= 192) return 58
    return 88
  },

  generate(params, basePhantom) {
    const { matrixFreq, matrixPhase } = params
    const sev = gibbsModel.severity(params)
    if (sev < 15) return new Uint8ClampedArray(basePhantom)

    const result = new Uint8ClampedArray(basePhantom)
    const outerMask = getOuterMask(basePhantom)
    const amplitude = (sev / 100) * 42

    // Matrixが小さいほどリング間隔が広い
    const minMatrix = Math.min(matrixFreq, matrixPhase)
    const ringSpacing = Math.max(2, Math.round(256 / Math.max(minMatrix, 64)))
    const ringCount = 4

    // エッジ検出: 高コントラスト境界（体輪郭・脳室壁）
    const edges: { x: number; y: number; contrast: number; dirH: number; dirV: number }[] = []
    for (let y = 1; y < SIZE - 1; y++) {
      for (let x = 1; x < SIZE - 1; x++) {
        const center = basePhantom[y * SIZE + x]
        const right = basePhantom[y * SIZE + x + 1]
        const below = basePhantom[(y + 1) * SIZE + x]
        const left = basePhantom[y * SIZE + x - 1]
        const above = basePhantom[(y - 1) * SIZE + x]
        const contrastH = Math.abs(center - right) + Math.abs(center - left)
        const contrastV = Math.abs(center - below) + Math.abs(center - above)
        const contrast = Math.max(contrastH / 2, contrastV / 2)
        if (contrast > 55) {
          edges.push({
            x, y, contrast,
            dirH: Math.abs(center - right) + Math.abs(center - left),
            dirV: Math.abs(center - below) + Math.abs(center - above),
          })
        }
      }
    }

    // 各エッジからsinc状のリンギングバンドを描画
    // バンドは体輪郭に沿って水平・垂直方向に発生
    for (const edge of edges) {
      const weight = Math.min(1, (edge.contrast - 55) / 160)

      // 水平方向リング（主にフレックエンコード）
      if (edge.dirH > edge.dirV * 0.5) {
        for (let ring = 1; ring <= ringCount; ring++) {
          const dist = ring * ringSpacing
          const ringAmp = amplitude * weight * sinc(ring * 0.7) * 0.8

          for (let dx = -dist; dx <= dist; dx++) {
            const nx = edge.x + dx
            if (nx < 0 || nx >= SIZE) continue
            if (outerMask[edge.y * SIZE + nx]) continue
            const phase = (Math.abs(dx) / ringSpacing) * Math.PI
            const contribution = ringAmp * Math.cos(phase)
            result[edge.y * SIZE + nx] = Math.max(0, Math.min(255,
              Math.round(result[edge.y * SIZE + nx] + contribution)
            ))
          }
        }
      }

      // 垂直方向リング
      if (edge.dirV > edge.dirH * 0.5) {
        for (let ring = 1; ring <= ringCount; ring++) {
          const dist = ring * ringSpacing
          const ringAmp = amplitude * weight * sinc(ring * 0.7) * 0.8

          for (let dy = -dist; dy <= dist; dy++) {
            const ny = edge.y + dy
            if (ny < 0 || ny >= SIZE) continue
            if (outerMask[ny * SIZE + edge.x]) continue
            const phase = (Math.abs(dy) / ringSpacing) * Math.PI
            const contribution = ringAmp * Math.cos(phase)
            result[ny * SIZE + edge.x] = Math.max(0, Math.min(255,
              Math.round(result[ny * SIZE + edge.x] + contribution)
            ))
          }
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
