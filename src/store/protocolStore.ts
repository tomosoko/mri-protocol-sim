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

  setParam: <K extends keyof ProtocolParams>(key: K, value: ProtocolParams[K]) => void
  loadPreset: (id: string) => void
  setActiveTab: (tab: string) => void
  setActiveRoutineTab: (tab: 'Part1' | 'Part2' | 'Assistant') => void
  setHighlightedParams: (params: string[]) => void
  setHintParam: (param: string | null) => void
}

export const useProtocolStore = create<ProtocolStore>((set) => ({
  params: presets[0].params,
  activePresetId: presets[0].id,
  activeTab: 'Routine',
  activeRoutineTab: 'Part1',
  highlightedParams: [],
  hintParam: null,

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
}))
