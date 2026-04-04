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

  // ── T1 TSE: ETL 長すぎ ────────────────────────────────────────────
  p => {
    if (p.TR < 1000 && p.turboFactor > 10) return {
      id: 't1_tse_etl_long', severity: 'warning', category: 'コントラスト',
      title: 'T1強調 TSE で ETL が長い',
      detail: `TR=${p.TR}ms (T1強調域) で ETL=${p.turboFactor} は過大です。T2 ぼけが生じ T1コントラストが損なわれます。ETL≤5 を推奨。`,
      params: ['turboFactor', 'TR'],
      quickFixes: [
        { label: 'ETL を 5 に設定', apply: () => ({ turboFactor: 5 }) },
      ],
    }
    return null
  },

  // ── TR < ETL × ES (TRが足りない) ─────────────────────────────────
  p => {
    const minTR = p.turboFactor * p.echoSpacing + 50
    if (p.turboFactor > 1 && p.TR < minTR) return {
      id: 'tr_too_short_for_etl', severity: 'error', category: 'Sequence',
      title: 'TR がエコートレインを収容できません',
      detail: `ETL=${p.turboFactor} × ES=${p.echoSpacing}ms = ${(p.turboFactor * p.echoSpacing).toFixed(0)}ms。TR=${p.TR}ms では全エコーを収容できません。TR≥${Math.ceil(minTR)}ms が必要です。`,
      params: ['TR', 'turboFactor', 'echoSpacing'],
      quickFixes: [
        { label: `TR を ${Math.ceil(minTR)}ms に延長`, apply: () => ({ TR: Math.ceil(minTR) }) },
        { label: 'ETL を短縮', apply: (p) => ({ turboFactor: Math.max(1, Math.floor((p.TR - 50) / p.echoSpacing)) }) },
      ],
    }
    return null
  },

  // ── Phase Resolution 低い → 異方性ボクセル ────────────────────────
  p => {
    if (p.phaseResolution < 60) return {
      id: 'phase_res_low', severity: 'info', category: 'Resolution',
      title: '位相分解能が低く異方性ボクセルになります',
      detail: `phaseResolution=${p.phaseResolution}% → 位相方向ボクセルは読取方向の ${(100 / p.phaseResolution * 100).toFixed(0)}% 大きい。脊椎・神経など長軸方向以外では歪みが目立ちます。`,
      params: ['phaseResolution'],
    }
    return null
  },

  // ── MT + STIR は競合 ─────────────────────────────────────────────
  p => {
    if (p.mt && p.fatSat === 'STIR') return {
      id: 'mt_stir_conflict', severity: 'warning', category: 'コントラスト',
      title: 'MT と STIR は競合します',
      detail: 'MT（磁化移動）と STIR を同時に使用すると組織信号が過剰に抑制されます。通常は MT を Off にしてください。',
      params: ['mt', 'fatSat'],
      quickFixes: [
        { label: 'MT を Off に', apply: () => ({ mt: false }) },
      ],
    }
    return null
  },

  // ── 息止め撮像: スキャン時間>25s ─────────────────────────────────
  p => {
    const t = Math.round((p.TR * p.matrixPhase * (p.phaseResolution / 100) * p.averages) /
      p.turboFactor / Math.max(p.ipatMode !== 'Off' ? p.ipatFactor : 1, 1) / 1000)
    if (p.respTrigger === 'BH' && t > 25) return {
      id: 'bh_too_long', severity: 'warning', category: '生体信号',
      title: '息止め時間が長すぎます',
      detail: `推定スキャン時間 ${t}s。息止め耐容時間は通常 15-20s です。ETL短縮・iPAT増加・PF設定を検討してください。`,
      params: ['respTrigger', 'turboFactor', 'ipatFactor'],
      quickFixes: [
        { label: 'iPAT GRAPPA×2 を有効化', apply: () => ({ ipatMode: 'GRAPPA' as const, ipatFactor: 2 }) },
      ],
    }
    return null
  },

  // ── Knee コイル + FOV 大 ──────────────────────────────────────────
  p => {
    if ((p.coilType === 'Knee' || p.coilType === 'Shoulder') && p.fov > 250) return {
      id: 'knee_fov_large', severity: 'info', category: 'コイル',
      title: '小部位コイルなのに FOV が大きい',
      detail: `${p.coilType} コイルはFOV ${p.fov}mm ではコイル感度域外となりSNRが低下します。FOV≤200mm を推奨。`,
      params: ['fov', 'coilType'],
      quickFixes: [
        { label: 'FOV を 180mm に設定', apply: () => ({ fov: 180 }) },
      ],
    }
    return null
  },

  // ── DWI: b値が少なく ADC精度不足 ─────────────────────────────────
  p => {
    if (p.turboFactor <= 2 && p.bValues.length === 2 && Math.max(...p.bValues) < 800) return {
      id: 'dwi_b_low', severity: 'info', category: 'DWI',
      title: 'b値最大値が低い',
      detail: `最大 b値=${Math.max(...p.bValues)} s/mm² は通常の拡散強調に不十分です。脳・前立腺では b≥800-1000 s/mm² を推奨します。`,
      params: ['bValues'],
    }
    return null
  },

  // ── DWI: 脂肪抑制なし ─────────────────────────────────────────────
  p => {
    if (p.turboFactor <= 2 && p.bValues.length > 1 && p.fatSat === 'None') return {
      id: 'dwi_no_fatsat', severity: 'warning', category: 'DWI',
      title: 'DWI で脂肪抑制がオフです',
      detail: 'EPI-DWI では位相エンコード方向に脂肪のケミカルシフトゴーストが生じます。SPAIR または CHESS を使用してください。',
      params: ['fatSat', 'bValues'],
      quickFixes: [
        { label: 'SPAIR 脂肪抑制を追加', apply: () => ({ fatSat: 'SPAIR' as const }) },
        { label: 'CHESS 脂肪抑制を追加', apply: () => ({ fatSat: 'CHESS' as const }) },
      ],
    }
    return null
  },

  // ── VIBE/3D GRE: FA が高い ────────────────────────────────────────
  p => {
    const isVIBE = p.turboFactor <= 2 && p.flipAngle >= 6 && p.flipAngle <= 30 && p.TR < 15
    if (isVIBE && p.flipAngle > 25) return {
      id: 'vibe_fa_high', severity: 'info', category: 'コントラスト',
      title: 'VIBE/3D GRE で FA が高すぎます',
      detail: `VIBE (TR=${p.TR}ms) で FA=${p.flipAngle}° は T1 飽和が強くなります。一般的な VIBE では FA=5-15° を使用します。`,
      params: ['flipAngle', 'TR'],
      quickFixes: [
        { label: 'FA を 12° に設定', apply: () => ({ flipAngle: 12 }) },
      ],
    }
    return null
  },

  // ── ECG + 心臓: LGE に TI が必要 ─────────────────────────────────
  p => {
    if (p.ecgTrigger && p.TR < 15 && p.flipAngle > 15 && p.TI === 0) return {
      id: 'lge_no_ti', severity: 'warning', category: '心臓',
      title: 'LGE/心臓 GRE で TI が設定されていません',
      detail: `ECG同期 GRE (TR=${p.TR}ms, FA=${p.flipAngle}°) は LGE 遅延造影と推定されます。正常心筋を抑制するための TI (通常 250-350ms) の設定が必要です。`,
      params: ['TI', 'ecgTrigger'],
      quickFixes: [
        { label: 'TI を 300ms (LGE標準) に設定', apply: () => ({ TI: 300 }) },
      ],
    }
    return null
  },

  // ── スライス数 vs TR: マルチスライス制限 ─────────────────────────
  p => {
    // 1TRで収容できる最大スライス数 ≈ TR / (RF_dur + readout_dur) ≈ TR / 30ms
    const maxSlicesPerTR = Math.floor(p.TR / 30)
    if (p.turboFactor <= 2 && p.slices > maxSlicesPerTR * 1.2 && p.TR < 2000) return {
      id: 'slices_exceed_tr', severity: 'warning', category: 'Routine',
      title: 'TR に対してスライス数が多すぎる可能性があります',
      detail: `TR=${p.TR}ms で ${p.slices} スライスは収容困難な場合があります。目安: TR/30ms ≈ ${maxSlicesPerTR}スライス。TR 延長またはスライス数削減を検討してください。`,
      params: ['slices', 'TR'],
    }
    return null
  },

  // ── 3D 高分解能: スライス厚が厚い ────────────────────────────────
  p => {
    if (p.turboFactor >= 100 && p.sliceThickness > 4) return {
      id: 'haste_thick_slice', severity: 'info', category: 'Resolution',
      title: 'HASTE でスライス厚が厚い',
      detail: `HASTE (単発取得) で sliceThickness=${p.sliceThickness}mm。部分容積効果が生じます。消化管・胆管では 4mm 以下を推奨します。`,
      params: ['sliceThickness', 'turboFactor'],
    }
    return null
  },

  // ── iPAT 有効時: 参照ライン確認 ──────────────────────────────────
  p => {
    if (p.ipatMode !== 'Off' && p.ipatFactor >= 2 && p.matrixPhase >= 256 && p.averages === 1) return null
    if (p.ipatMode !== 'Off' && p.ipatFactor >= 3 && p.averages === 1) return {
      id: 'ipat_low_avg', severity: 'info', category: 'iPAT',
      title: 'iPAT AF≥3 + NEX=1: SNR が低下します',
      detail: `iPAT factor ${p.ipatFactor} × g-factor によって SNR が著しく低下します。加算回数の増加 (NEX≥2) を検討してください。`,
      params: ['ipatFactor', 'averages'],
      quickFixes: [
        { label: 'NEX を 2 に増加', apply: () => ({ averages: 2 }) },
      ],
    }
    return null
  },

  // ── ECG トリガー + 高TR: 非効率 ───────────────────────────────────
  p => {
    if (p.ecgTrigger && p.TR > 3000) return {
      id: 'ecg_high_tr', severity: 'info', category: 'Physio',
      title: 'ECG同期でTRが長すぎます',
      detail: `ECG同期時のTRはRR間隔（通常600-1000ms）に依存します。TR=${p.TR}ms は心周期を超えており非効率です。TR を RR 間隔(800ms目安)に合わせてください。`,
      params: ['TR', 'ecgTrigger'],
      quickFixes: [
        { label: 'TR を 800ms に設定', apply: () => ({ TR: 800 }) },
        { label: 'TR を 1000ms に設定', apply: () => ({ TR: 1000 }) },
      ],
    }
    return null
  },

  // ── TOF MRA: 脂肪抑制なし ─────────────────────────────────────────
  p => {
    const isTOF = p.turboFactor <= 2 && p.TR < 40 && p.flipAngle >= 15 && p.flipAngle <= 35
    if (isTOF && p.fatSat === 'None') return {
      id: 'tof_no_fatsat', severity: 'info', category: 'Contrast',
      title: 'TOF-MRA で脂肪抑制なし',
      detail: '頭蓋底などの脂肪組織が血管信号に重なり描出が困難になります。SPAIRまたはMTCの追加を推奨します。',
      params: ['fatSat'],
      quickFixes: [
        { label: 'SPAIR を追加', apply: () => ({ fatSat: 'SPAIR' as const }) },
        { label: 'MT を追加', apply: () => ({ mt: true }) },
      ],
    }
    return null
  },

  // ── 3D VIBE/GRE: 呼吸同期なし（腹部FOV） ────────────────────────
  p => {
    const isVIBE = p.turboFactor <= 2 && p.TR < 15
    const isAbdomen = p.fov >= 300 && p.slices >= 40
    if (isVIBE && isAbdomen && p.respTrigger === 'Off' && p.ecgTrigger === false) return {
      id: 'vibe_no_resp', severity: 'info', category: 'Physio',
      title: '腹部VIBE で呼吸制御なし',
      detail: '腹部の3D収集では呼吸によるモーションアーチファクトが生じます。息止め（BH）または PACE 同期を推奨します。',
      params: ['respTrigger'],
      quickFixes: [
        { label: '息止め (BH) に設定', apply: () => ({ respTrigger: 'BH' as const }) },
        { label: 'PACE 同期に設定', apply: () => ({ respTrigger: 'PACE' as const }) },
      ],
    }
    return null
  },

  // ── 非常に短いTE: GRE で化学シフト位相 ───────────────────────────
  p => {
    const isGRE = p.turboFactor <= 2 && p.TR < 200
    if (isGRE && p.fieldStrength === 3.0) {
      // 3T: in-phase TE = 2.3, 4.6, 6.9ms / opposed = 1.15, 3.45, 5.75ms
      const oppTE = [1.15, 3.45, 5.75, 8.05]
      const nearOpp   = oppTE.some(t => Math.abs(p.TE - t) < 0.3)
      if (nearOpp) return {
        id: 'gre_opposed_phase_3t', severity: 'info', category: 'Contrast',
        title: `TE≈${p.TE}ms は 3T opposed-phase 付近です`,
        detail: `3T でのopposed-phase TE は約 1.15, 3.45, 5.75ms です。現在のTE${p.TE}ms は水脂肪の opposed-phase に近く、境界部に信号低下が生じます。Dixon や in-phase TE (2.3, 4.6ms) への変更を検討してください。`,
        params: ['TE'],
      }
    }
    return null
  },

  // ── MRCP/HASTE + 造影剤 ───────────────────────────────────────────
  p => {
    const isHASTE = p.turboFactor >= 80
    // STIR fat sat + HASTE は矛盾（STIR の TI が HASTE の長い TE に影響）
    if (isHASTE && p.fatSat === 'STIR') return {
      id: 'haste_stir', severity: 'warning', category: 'Contrast',
      title: 'HASTE + STIR の組み合わせは非推奨',
      detail: 'HASTEの長いエコートレインとSTIRの反転回復パルスの組み合わせはSAR増大とコントラスト劣化を招きます。脂肪抑制が必要な場合はSPAIRを使用してください。',
      params: ['fatSat', 'turboFactor'],
      quickFixes: [
        { label: 'SPAIR に変更', apply: () => ({ fatSat: 'SPAIR' as const, TI: 0 }) },
        { label: '脂肪抑制なしに変更', apply: () => ({ fatSat: 'None' as const, TI: 0 }) },
      ],
    }
    return null
  },

  // ── 高分解能 3D + partial Fourier なし: 収集時間過大 ──────────────
  p => {
    const is3D = p.turboFactor >= 30 && p.slices >= 60
    const longScan = p.slices * p.matrixPhase / (p.turboFactor * Math.max(p.ipatFactor, 1)) > 600
    if (is3D && longScan && p.partialFourier === 'Off') return {
      id: '3d_no_pf', severity: 'info', category: 'Sequence',
      title: '3D高分解能収集: Partial Fourier の適用を検討',
      detail: 'スライス数・マトリックスに対してETLが少なく収集効率が低くなっています。Partial Fourier (6/8) の適用でスキャン時間を短縮できます。',
      params: ['partialFourier', 'turboFactor'],
      quickFixes: [
        { label: 'Partial Fourier 6/8 を適用', apply: () => ({ partialFourier: '6/8' as const }) },
      ],
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
