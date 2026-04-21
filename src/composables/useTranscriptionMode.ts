import { computed, ref, watch } from 'vue'
import { DEFAULT_DTYPE } from '../models'
import { useBackendTranscriber } from './useBackendTranscriber'
import { useTranscriber } from './useTranscriber'
import {
  getBackendModelOptions,
  getNormalizedModelForMode,
  getVisibleModelOptions,
  resolveBackendModel,
} from '../utils/modelMode'

export function useTranscriptionMode() {
  const workerTranscriber = useTranscriber()
  const backendTranscriber = useBackendTranscriber()
  const useBackend = ref(false)
  const selectedModel = ref(getNormalizedModelForMode('', false, null))
  const selectedDtype = ref(DEFAULT_DTYPE)
  const useVad = ref(true)
  const backendChecked = ref(false)
  const backendAvailable = ref(false)

  const activeTranscriber = computed(() =>
    useBackend.value ? backendTranscriber : workerTranscriber,
  )
  const backendModelOptions = computed(() =>
    getBackendModelOptions(backendTranscriber.backendInfo.value),
  )
  const visibleModelOptions = computed(() =>
    getVisibleModelOptions(useBackend.value, backendModelOptions.value),
  )
  const showPrecisionSelector = computed(() => !useBackend.value)
  const canUseBackend = computed(
    () => backendAvailable.value && backendTranscriber.backendInfo.value !== null,
  )
  const resolvedBackendModel = computed(() =>
    resolveBackendModel(selectedModel.value, backendTranscriber.backendInfo.value),
  )

  const status = computed(() => activeTranscriber.value.status.value)
  const result = computed({
    get: () => activeTranscriber.value.result.value,
    set: (value) => {
      activeTranscriber.value.result.value = value
    },
  })
  const error = computed({
    get: () => activeTranscriber.value.error.value,
    set: (value) => {
      activeTranscriber.value.error.value = value
    },
  })
  const isProcessing = computed({
    get: () => activeTranscriber.value.isProcessing.value,
    set: (value) => {
      activeTranscriber.value.isProcessing.value = value
    },
  })
  const modelInfo = computed(() => activeTranscriber.value.modelInfo.value)
  const downloadProgress = computed(() => activeTranscriber.value.downloadProgress.value)
  const transcriptionTimeSec = computed(() => activeTranscriber.value.transcriptionTimeSec.value)
  const transcriptionProgress = computed(() => activeTranscriber.value.transcriptionProgress.value)
  const resetError = () => activeTranscriber.value.resetError()

  const ensureSelectedModelMatchesMode = () => {
    selectedModel.value = getNormalizedModelForMode(
      selectedModel.value,
      useBackend.value,
      backendTranscriber.backendInfo.value,
    )
  }

  const checkBackend = async () => {
    const detected = await backendTranscriber.checkBackend()
    backendChecked.value = true
    backendAvailable.value = detected
    if (detected) {
      useBackend.value = true
      ensureSelectedModelMatchesMode()
    }
    return detected
  }

  watch(
    [useBackend, () => backendTranscriber.backendInfo.value],
    () => {
      ensureSelectedModelMatchesMode()
    },
    { immediate: true },
  )

  return {
    workerTranscriber,
    backendTranscriber,
    useBackend,
    selectedModel,
    selectedDtype,
    useVad,
    backendChecked,
    backendAvailable,
    activeTranscriber,
    backendModelOptions,
    visibleModelOptions,
    showPrecisionSelector,
    canUseBackend,
    resolvedBackendModel,
    status,
    result,
    error,
    isProcessing,
    modelInfo,
    downloadProgress,
    transcriptionTimeSec,
    transcriptionProgress,
    resetError,
    ensureSelectedModelMatchesMode,
    checkBackend,
  }
}
