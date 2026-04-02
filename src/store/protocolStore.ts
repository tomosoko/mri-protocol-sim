import { create } from 'zustand'
import type { ProtocolParams } from '../data/presets'
import { presets } from '../data/presets'

interface ProtocolStore {
  params: ProtocolParams
  activePresetId: string
  activeTab: string
  activeRoutineTab: 'Part1' | 'Part2' | 'Assistant'
  highlightedParams: string[]
  hintParam: string | null
  // Protocol tree navigation
  activeBodyPartId: string | null
  activeGroupId: string | null
  activeVariantId: string | null
  activeColumnIndex: number
  activeSequenceName: string | null

  setParam: <K extends keyof ProtocolParams>(key: K, value: ProtocolParams[K]) => void
  loadPreset: (id: string) => void
  setActiveTab: (tab: string) => void
  setActiveRoutineTab: (tab: 'Part1' | 'Part2' | 'Assistant') => void
  setHighlightedParams: (params: string[]) => void
  setHintParam: (param: string | null) => void
  setActiveProtocol: (bodyPartId: string, groupId: string, variantId: string, columnIndex?: number) => void
  setActiveSequence: (name: string, presetId?: string) => void
}

export const useProtocolStore = create<ProtocolStore>((set) => ({
  params: presets[0].params,
  activePresetId: presets[0].id,
  activeTab: 'Routine',
  activeRoutineTab: 'Part1',
  highlightedParams: [],
  hintParam: null,
  activeBodyPartId: 'head',
  activeGroupId: 'brain',
  activeVariantId: 'brain_routine_dot',
  activeColumnIndex: 0,
  activeSequenceName: null,

  setParam: (key, value) =>
    set((state) => ({ params: { ...state.params, [key]: value } })),

  loadPreset: (id) => {
    const preset = presets.find((p) => p.id === id)
    if (preset) set({ params: preset.params, activePresetId: id })
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setActiveRoutineTab: (tab) => set({ activeRoutineTab: tab }),
  setHighlightedParams: (params) => set({ highlightedParams: params }),
  setHintParam: (param) => set({ hintParam: param }),
  setActiveProtocol: (bodyPartId, groupId, variantId, columnIndex = 0) =>
    set({ activeBodyPartId: bodyPartId, activeGroupId: groupId, activeVariantId: variantId, activeColumnIndex: columnIndex }),
  setActiveSequence: (name, presetId) => {
    if (presetId) {
      const preset = presets.find(p => p.id === presetId)
      if (preset) {
        set({ activeSequenceName: name, params: preset.params, activePresetId: presetId })
        return
      }
    }
    set({ activeSequenceName: name })
  },
}))
