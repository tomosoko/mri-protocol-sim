import type { ProtocolParams } from '../data/presets'
import { calcSARLevel, calcSNR } from '../store/calculators'

export type RuleSeverity = 'error' | 'warning' | 'info'

export interface QuickFix {
  label: string
  apply: (p: ProtocolParams) => Partial<ProtocolParams>
}

export interface ValidationIssue {
  id: string
  severity: RuleSeverity
  category: string
  title: string
  detail: string
  params?: string[]   // 関連パラメータ名（ハイライト用）
  quickFixes?: QuickFix[]
}

type Rule = (p: ProtocolParams) => ValidationIssue | null

// ────────────────────────────────────────────────────────────────────────────
// ルール定義
// ────────────────────────────────────────────────────────────────────────────

const rules: Rule[] = [

  // ── SAR ──────────────────────────────────────────────────────────────────
  p => {
    const sar = calcSARLevel(p)
    if (sar >= 100) return {
      id: 'sar_over', severity: 'error', category: 'SAR',
      title: 'SAR 上限超過',
      detail: `推定SAR ${sar}% で IEC 安全限界を超えています。TR延長・FA低減・ETL短縮を検討してください。`,
      params: ['flipAngle', 'TR', 'turboFactor'],
      quickFixes: [
        { label: 'FA を 120° に下げる', apply: () => ({ flipAngle: 120 }) },
        { label: 'TR を 500ms 延長', apply: (p) => ({ TR: p.TR + 500 }) },
        { label: 'ETL を半分に短縮', apply: (p) => ({ turboFactor: Math.max(1, Math.floor(p.turboFactor / 2)) }) },
      ],
    }
    if (sar >= 80) return {
      id: 'sar_high', severity: 'warning', category: 'SAR',
      title: 'SAR が高い値です',
      detail: `推定SAR ${sar}%。3T + HASTE/TSE + 大FA の組み合わせで特に注意。SAR Assistant を "Advanced" にすることを推奨。`,
      params: ['flipAngle', 'TR', 'turboFactor'],
      quickFixes: [
        { label: 'FA を 130° に下げる', apply: () => ({ flipAngle: 130 }) },
        { label: 'SAR Assistant を Advanced に', apply: () => ({ sarAssistant: 'Advanced' as const }) },
      ],
    }
    return null
  },

  // ── コントラスト: T1強調の確認 ────────────────────────────────────────
  p => {
    if (p.TE > 30 && p.TR < 800) return {
      id: 'contrast_t1_te_long', severity: 'warning', category: 'コントラスト',
      title: 'T1強調なのにTE が長すぎます',
      detail: `TR=${p.TR}ms (T1強調域) に対して TE=${p.TE}ms は長すぎます。T2減衰が加わりコントラストが低下します。TE≤20ms を推奨。`,
      params: ['TE', 'TR'],
    }
    return null
  },

  p => {
    if (p.TR < 2000 && p.TE > 80) return {
      id: 'contrast_t2_tr_short', severity: 'warning', category: 'コントラスト',
      title: 'T2強調なのにTR が短すぎます',
      detail: `TE=${p.TE}ms (T2強調域) に対して TR=${p.TR}ms では T1 飽和効果が強くT2コントラストが損なわれます。TR≥3000ms を推奨。`,
      params: ['TR', 'TE'],
    }
    return null
  },

  // ── STIR 関連 ──────────────────────────────────────────────────────────
  p => {
    if (p.fatSat === 'STIR' && p.fieldStrength === 3.0) return {
      id: 'stir_3t', severity: 'warning', category: '脂肪抑制',
      title: '3T で STIR は非推奨',
      detail: '3T では B1 不均一性が大きくSTIRの脂肪抑制効率が低下します。SPAIR または Dixon に変更することを推奨。',
      params: ['fatSat', 'fieldStrength'],
      quickFixes: [
        { label: 'SPAIR に変更', apply: () => ({ fatSat: 'SPAIR' as const, TI: 0 }) },
        { label: 'Dixon に変更', apply: () => ({ fatSat: 'Dixon' as const, TI: 0 }) },
      ],
    }
    return null
  },

  p => {
    if (p.fatSat === 'STIR' && p.TI === 0) return {
      id: 'stir_no_ti', severity: 'error', category: '脂肪抑制',
      title: 'STIR なのに TI が 0 です',
      detail: 'STIR には脂肪の T1 に合わせた TI 設定が必須です。1.5T では TI≈160ms、3T では TI≈180ms を使用してください。',
      params: ['fatSat', 'TI'],
      quickFixes: [
        { label: `TI を ${p.fieldStrength === 3.0 ? 180 : 160}ms に設定`, apply: (p) => ({ TI: p.fieldStrength === 3.0 ? 180 : 160 }) },
        { label: 'SPAIR に変更（3T推奨）', apply: () => ({ fatSat: 'SPAIR' as const, TI: 0 }) },
      ],
    }
    return null
  },

  // ── FLAIR 関連 ────────────────────────────────────────────────────────
  p => {
    if (p.TI > 1000 && p.TR < 6000) return {
      id: 'flair_tr_short', severity: 'warning', category: 'FLAIR',
      title: 'FLAIR の TR が短すぎます',
      detail: `FLAIR (TI=${p.TI}ms) に対して TR=${p.TR}ms は不十分です。完全な縦磁化回復には TR≥9×TI が目安。TR≥8000ms を推奨。`,
      params: ['TR', 'TI'],
    }
    return null
  },

  // ── DWI 関連 ─────────────────────────────────────────────────────────
  p => {
    if (p.bValues.length > 1 && !p.inlineADC) return {
      id: 'dwi_no_adc', severity: 'info', category: 'DWI',
      title: 'ADC マップが無効です',
      detail: 'DWI (b値複数) が設定されていますが Inline ADC が OFF です。拡散係数の定量評価には Inline → ADC を ON にしてください。',
      params: ['inlineADC'],
      quickFixes: [
        { label: 'Inline ADC を ON に', apply: () => ({ inlineADC: true }) },
      ],
    }
    return null
  },

  p => {
    if (p.turboFactor <= 2 && p.bValues.length > 1 && p.bandwidth < 800) return {
      id: 'dwi_bw_low', severity: 'warning', category: 'DWI',
      title: 'DWI の Bandwidth が低すぎます',
      detail: `EPI系DWIでは Bandwidth=${p.bandwidth}Hz/px は低すぎます。磁化率アーチファクト（幾何学的歪み）が増大します。1500-2000 Hz/px を推奨。`,
      params: ['bandwidth'],
    }
    return null
  },

  // ── PartialFourier 関連 ───────────────────────────────────────────────
  p => {
    if (p.turboFactor >= 100 && p.partialFourier === 'Off') return {
      id: 'haste_no_pf', severity: 'error', category: 'HASTE',
      title: 'HASTE で PartialFourier が OFF です',
      detail: 'Single-shot HASTE には PartialFourier (5/8 または 6/8) が必須です。全ラインを1TRで収集することは SAR/時間的に困難です。',
      params: ['partialFourier', 'turboFactor'],
      quickFixes: [
        { label: 'PF 5/8 に設定（推奨）', apply: () => ({ partialFourier: '5/8' as const }) },
        { label: 'PF 6/8 に設定', apply: () => ({ partialFourier: '6/8' as const }) },
      ],
    }
    return null
  },

  // ── iPAT 関連 ──────────────────────────────────────────────────────────
  p => {
    if (p.ipatMode !== 'Off' && p.ipatFactor >= 3 && p.matrixPhase < 192) return {
      id: 'ipat_matrix_small', severity: 'warning', category: 'iPAT',
      title: 'iPAT AF≥3 でマトリックスが小さい',
      detail: `iPAT factor ${p.ipatFactor} に対してマトリックス${p.matrixPhase} は小さすぎます。ACS ライン数が不足し g-factor が悪化します。マトリックス≥224 を推奨。`,
      params: ['ipatFactor', 'matrixPhase'],
    }
    return null
  },

  p => {
    if (p.ipatMode !== 'Off' && p.ipatFactor === 4 && p.fieldStrength === 1.5) return {
      id: 'ipat_af4_15t', severity: 'warning', category: 'iPAT',
      title: '1.5T で iPAT AF=4 はリスクが高い',
      detail: '1.5T では SNR 余裕が少なく AF=4 は実用的な画質が得られない場合があります。AF=2-3 に下げることを検討してください。',
      params: ['ipatFactor', 'fieldStrength'],
    }
    return null
  },

  // ── 腹部: 呼吸同期 ────────────────────────────────────────────────────
  p => {
    if (p.fov > 320 && p.respTrigger === 'Off' && p.turboFactor < 100 && !p.ecgTrigger) return {
      id: 'abdomen_no_resp', severity: 'warning', category: '生体信号',
      title: '大 FOV で呼吸同期なし',
      detail: `FOV=${p.fov}mm (腹部・胸部と推定)。呼吸同期なしではモーションアーチファクトが生じます。PACE/RT または息止め(BH)を推奨。`,
      params: ['respTrigger', 'fov'],
      quickFixes: [
        { label: 'PACE を有効化', apply: () => ({ respTrigger: 'PACE' as const }) },
        { label: '息止め (BH) に設定', apply: () => ({ respTrigger: 'BH' as const }) },
      ],
    }
    return null
  },

  // ── 生体信号: 矛盾 ────────────────────────────────────────────────────
  p => {
    if (p.respTrigger === 'BH' && p.ecgTrigger) return {
      id: 'bh_ecg_conflict', severity: 'warning', category: '生体信号',
      title: '息止め + ECG トリガーは矛盾',
      detail: '息止め(BH)撮像では呼吸による TR 変動がありません。ECG トリガーは心臓シネMRI などに使用し、通常の息止め撮像では不要です。',
      params: ['respTrigger', 'ecgTrigger'],
    }
    return null
  },

  // ── SNR 警告 ──────────────────────────────────────────────────────────
  p => {
    const snr = calcSNR(p)
    if (snr < 20) return {
      id: 'snr_low', severity: 'warning', category: 'SNR',
      title: 'SNR が非常に低い',
      detail: `推定 SNR=${snr}。画像品質が著しく低下する可能性があります。スライス厚増加・平均回数増加・帯域幅低減を検討してください。`,
      params: ['sliceThickness', 'averages', 'bandwidth'],
    }
    return null
  },

  // ── バンド幅 vs 化学シフト ────────────────────────────────────────────
  p => {
    const cs = Math.round((p.fieldStrength === 3.0 ? 440 : 220) / Math.max(p.bandwidth, 1) * 10) / 10
    if (cs > 3.0) return {
      id: 'chemshift_high', severity: 'warning', category: '化学シフト',
      title: `化学シフト量が大きい (${cs} pixel)`,
      detail: `帯域幅=${p.bandwidth}Hz/px で化学シフト ${cs}px。脂肪-水の境界でのアーチファクトが明確になります。BW増加か脂肪抑制を推奨。`,
      params: ['bandwidth', 'fatSat'],
    }
    return null
  },

  // ── TE vs T2* (高磁場+長TE) ────────────────────────────────────────
  p => {
    if (p.fieldStrength === 3.0 && p.TE > 100 && p.turboFactor <= 2) return {
      id: 'gre_te_long_3t', severity: 'warning', category: 'T2*',
      title: '3T GRE で TE が長い',
      detail: `3T では T2* が短縮されます。GRE/EPI で TE=${p.TE}ms は磁化率アーチファクト（信号脱落）が顕著になります。TE≤60ms を推奨。`,
      params: ['TE', 'fieldStrength'],
    }
    return null
  },

  // ── フリップ角: Ernst 角との乖離 ───────────────────────────────────
  p => {
    if (p.turboFactor <= 2 && p.flipAngle > 15) {
      // GRE 短 TR での過大FA
      const e1 = Math.exp(-p.TR / 1000)
      const ernstDeg = Math.acos(e1) * 180 / Math.PI
      if (p.flipAngle > ernstDeg * 2 && p.TR < 50) return {
        id: 'fa_over_ernst', severity: 'info', category: 'コントラスト',
        title: 'フリップ角が Ernst 角を大幅に超えています',
        detail: `TR=${p.TR}ms での推定 Ernst 角は ${ernstDeg.toFixed(0)}°。FA=${p.flipAngle}° は過飽和を招き SNR が低下します。`,
        params: ['flipAngle', 'TR'],
      }
    }
    return null
  },

  // ── ECG トリガー: triggerDelay ────────────────────────────────────────
  p => {
    if (p.ecgTrigger && p.triggerDelay === 0) return {
      id: 'ecg_no_delay', severity: 'info', category: '生体信号',
      title: 'ECG トリガー遅延が 0ms',
      detail: 'ECG トリガーが有効ですが triggerDelay=0ms です。心筋撮像では拡張末期に合わせた遅延設定（通常 400-700ms）が必要です。',
      params: ['triggerDelay', 'ecgTrigger'],
    }
    return null
  },

  // ── 平均回数: スキャン時間への影響 ────────────────────────────────
  p => {
    if (p.averages >= 4 && p.turboFactor >= 10) return {
      id: 'averages_high', severity: 'info', category: '効率',
      title: '平均回数が多くスキャン時間が延長します',
      detail: `Averages=${p.averages} により SNR は ${(Math.sqrt(p.averages) * 100).toFixed(0)}% に改善しますが、スキャン時間も ${p.averages}倍になります。必要性を再確認してください。`,
      params: ['averages'],
    }
    return null
  },

  // ── スライス間距離: クロストーク ───────────────────────────────────
  p => {
    if (p.sliceGap < 0) return {
      id: 'slice_overlap', severity: 'warning', category: 'Geometry',
      title: 'スライスがオーバーラップしています',
      detail: `Slice Gap=${p.sliceGap}mm (負値) → スライスが重複しクロストーク（隣接スライスからのRF漏れ）が生じます。Gap≥0 を推奨。`,
      params: ['sliceGap'],
    }
    return null
  },

  // ── 3T Dielectric Effect ───────────────────────────────────────────
  p => {
    if (p.fieldStrength === 3.0 && p.fov > 350 && p.fatSat === 'None' && p.shim === 'Auto') return {
      id: 'dielectric_3t', severity: 'info', category: '3T注意',
      title: '3T + 大FOV: Dielectric Effect に注意',
      detail: '3T + 大FOV (腹部・骨盤) では Dielectric Effect により画像中央部の信号増強が生じます。Advanced Shimming または pTx (TrueForm) の使用を推奨。',
      params: ['fieldStrength', 'fov'],
    }
    return null
  },

]

// ────────────────────────────────────────────────────────────────────────────
// バリデーション実行
// ────────────────────────────────────────────────────────────────────────────
export function validateProtocol(p: ProtocolParams): ValidationIssue[] {
  return rules
    .map(rule => rule(p))
    .filter((r): r is ValidationIssue => r !== null)
    .sort((a, b) => {
      const order: Record<RuleSeverity, number> = { error: 0, warning: 1, info: 2 }
      return order[a.severity] - order[b.severity]
    })
}

export function issueCount(issues: ValidationIssue[]) {
  return {
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    infos: issues.filter(i => i.severity === 'info').length,
  }
}
