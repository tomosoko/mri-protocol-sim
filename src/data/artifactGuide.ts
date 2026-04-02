export interface ArtifactInfo {
  id: string
  name: string
  cause: string
  params: string[]   // which param keys to highlight
  solutions: { param: string; action: string; detail: string }[]
  example: string
}

export const artifacts: ArtifactInfo[] = [
  {
    id: 'aliasing',
    name: 'エイリアシング（折り返し）',
    cause: 'FOVが被写体より小さく、FOV外の信号が反対側に折り返して現れる。位相方向にのみ発生。',
    params: ['phaseEncDir', 'phaseOversampling', 'FOV'],
    solutions: [
      { param: 'phaseOversampling', action: '20-50%に増加', detail: 'FOV外をカバーする過剰サンプリング。最も確実な対策。' },
      { param: 'FOV', action: '拡大', detail: '被写体全体がFOV内に収まるよう拡大。分解能は低下。' },
      { param: 'phaseEncDir', action: '方向変更', detail: '被写体の短辺方向を位相方向にするとFOV効率↑。' },
    ],
    example: '頭部Tra: 頭の前後幅よりFOVが小さいと後頭部が前額部に重なる。',
  },
  {
    id: 'gibbs',
    name: 'ギブスアーチファクト（リンギング）',
    cause: 'k空間を打ち切ること（Truncation）による信号の振動。高コントラスト境界部に縞状アーチファクト。',
    params: ['matrixFreq', 'matrixPhase', 'partialFourier'],
    solutions: [
      { param: 'matrixFreq', action: 'Matrix増加（256→512）', detail: 'k空間のサンプル数を増やし打ち切り誤差を減らす。' },
      { param: 'partialFourier', action: 'フルサンプリングへ', detail: 'Partial Fourierを使うとリンギングが増悪しやすい。' },
      { param: 'phaseResolution', action: '100%に設定', detail: '位相分解能を落とすとリンギングが増える。' },
    ],
    example: '脊髄: 椎体-椎間板の高コントラスト境界で脊髄に縞が入って見える（偽病変）。',
  },
  {
    id: 'chemical_shift',
    name: '化学シフトアーチファクト（1次）',
    cause: '水と脂肪のプロトンの共鳴周波数差（1.5T: 220Hz, 3T: 440Hz）により、読み取り方向にずれて表示。',
    params: ['bandwidth', 'fatSat'],
    solutions: [
      { param: 'bandwidth', action: '帯域幅を増加', detail: 'BW↑でピクセルあたりの周波数幅↑→ずれ量↓。BW200→400で化学シフト半減。' },
      { param: 'fatSat', action: 'CHESS/SPAIR追加', detail: '脂肪信号そのものを抑制し根本解決。' },
    ],
    example: '腹部: 腎臓の上下縁に明暗の縞。3Tでは特に顕著（1.5Tの2倍）。',
  },
  {
    id: 'motion_ghost',
    name: '動きアーチファクト（ゴースト）',
    cause: '撮像中の周期的な動き（呼吸・心拍・血流）がk空間全体に影響し、位相方向にゴーストが現れる。',
    params: ['phaseEncDir', 'satBands', 'respTrigger', 'averages'],
    solutions: [
      { param: 'phaseEncDir', action: '方向変更（A>>P等）', detail: '診断上重要でない方向にアーチファクトを向ける。' },
      { param: 'satBands', action: 'Sat Band追加', detail: '動く構造（心臓・腹部血管）の上流にサチュレーションバンドを配置。' },
      { param: 'respTrigger', action: 'BH/RT/PACEに変更', detail: '呼吸同期で呼吸ゴースト解消。' },
      { param: 'averages', action: '加算回数を増加', detail: 'ランダムな動きをアベレージで平滑化（周期的動きには無効）。' },
    ],
    example: '腹部T2: 呼吸非同期だと肝臓が前後方向に複数個ゴーストとして現れる。',
  },
  {
    id: 'susceptibility',
    name: '磁化率アーチファクト',
    cause: '組織や金属の磁化率差によるB0局所不均一。信号消失・歪みとして現れる。EPIで最も顕著。',
    params: ['bandwidth', 'ipatMode', 'turboFactor'],
    solutions: [
      { param: 'bandwidth', action: 'BW大幅増加', detail: 'EPI/DWIでBW 1500→2000+ Hz/Pxに。TE短縮も有効。' },
      { param: 'ipatMode', action: 'GRAPPA AF=2設定', detail: 'EPIエコートレイン短縮→磁化率アーチファクト・歪み大幅減。' },
      { param: 'turboFactor', action: 'EPI Factor低下', detail: 'EPI Factor（エコートレイン数）を下げると歪み低減。撮像時間↑。' },
    ],
    example: 'DWI: 頭蓋底・副鼻腔・術後金属クリップ周囲の信号消失・歪み。',
  },
  {
    id: 'n2_ghost',
    name: 'N/2ゴースト（EPI特有）',
    cause: 'EPIの奇数・偶数エコーの位相ずれにより、画像の1/2FOV離れた位置にゴーストが出現。',
    params: ['bandwidth', 'ipatMode'],
    solutions: [
      { param: 'bandwidth', action: 'BW最大化', detail: 'BW増加でエコーシフト量を低減。' },
      { param: 'ipatMode', action: 'GRAPPA適用', detail: 'エコートレイン短縮でN/2ゴーストが目立ちにくくなる。' },
    ],
    example: 'DWI頭部: 脳の上方向1/2FOV離れた位置に脳が薄く重なって見える。',
  },
  {
    id: 'dielectric',
    name: 'Dielectric Effect（3T特有）',
    cause: '3TではB1波長が体内で短くなり（≈27cm）、体中央部でB1が増強、周辺部で減弱する不均一パターン。',
    params: ['flipAngle', 'bandwidth'],
    solutions: [
      { param: 'flipAngle', action: 'B1補正パッドの使用', detail: 'Siemens Tim+Trio等ではゲルパッドで局所B1補正。' },
      { param: 'bandwidth', action: '3T用プロトコルに変更', detail: 'Flip Angle・TI等を3T向けに最適化する。' },
    ],
    example: '3T腹部T1: 肝臓中央が明るく周辺が暗い信号むら。',
  },
]
