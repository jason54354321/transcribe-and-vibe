<script setup lang="ts">
import { computed } from 'vue'
import type { ModelInfo, DownloadProgress } from '../composables/useTranscriber'

const props = defineProps<{
  status: string
  modelInfo?: ModelInfo | null
  downloadProgress?: Record<string, DownloadProgress>
}>()

const modelLabel = computed(() => {
  if (!props.modelInfo) return null
  const name = props.modelInfo.model.split('/').pop() ?? props.modelInfo.model
  return `${name} · ${props.modelInfo.dtype}`
})

const downloadFiles = computed(() => {
  const dp = props.downloadProgress
  if (!dp) return []
  return Object.values(dp).filter(f => f.total > 0)
})

const showDownload = computed(() => downloadFiles.value.length > 0)

function formatFileName(file: string) {
  return file.split('/').pop() ?? file
}

function formatSize(dp: DownloadProgress) {
  const loaded = (dp.loaded / 1024 / 1024).toFixed(0)
  const total = (dp.total / 1024 / 1024).toFixed(0)
  return `${loaded} / ${total} MB`
}
</script>

<template>
  <div id="status-container" class="status-container">
    <div v-if="modelLabel" id="model-badge" class="model-badge">{{ modelLabel }}</div>

    <div class="indeterminate-track">
      <div class="indeterminate-bar"></div>
    </div>
    <div id="status-text" class="status-text">{{ status }}</div>

    <div v-if="showDownload" id="download-progress" class="progress-section">
      <div
        v-for="dp in downloadFiles"
        :key="dp.file"
        class="download-item"
        :data-file="formatFileName(dp.file)"
      >
        <div class="progress-label">{{ formatFileName(dp.file) }} — {{ formatSize(dp) }}</div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" :style="{ width: dp.progress + '%' }"></div>
        </div>
        <div class="progress-percent">{{ dp.progress }}%</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.status-container {
  text-align: center;
  margin: calc(var(--spacing-unit) * 3) 0;
}

.model-badge {
  display: inline-block;
  font-size: 12px;
  color: var(--secondary-text);
  background: var(--accent-light);
  padding: 4px 12px;
  border-radius: 12px;
  margin-bottom: 16px;
  font-family: monospace;
}

.indeterminate-track {
  width: 100%;
  max-width: 400px;
  height: 4px;
  background: var(--border-color);
  border-radius: 2px;
  margin: 0 auto 12px;
  overflow: hidden;
  position: relative;
}

.indeterminate-bar {
  position: absolute;
  height: 100%;
  width: 30%;
  background: var(--accent-color);
  border-radius: 2px;
  animation: slide 1.5s ease-in-out infinite;
}

@keyframes slide {
  0% { left: -30%; }
  50% { left: 100%; }
  100% { left: -30%; }
}

.status-text {
  color: var(--secondary-text);
  font-size: 14px;
}

.progress-section {
  margin-top: 16px;
}

.download-item {
  margin-bottom: 12px;
}

.download-item:last-child {
  margin-bottom: 0;
}

.progress-label {
  font-size: 12px;
  color: var(--secondary-text);
  margin-bottom: 6px;
  font-family: monospace;
}

.progress-bar-track {
  width: 100%;
  max-width: 400px;
  height: 6px;
  background: var(--border-color);
  border-radius: 3px;
  margin: 0 auto;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--accent-color);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-percent {
  font-size: 12px;
  color: var(--secondary-text);
  margin-top: 4px;
}
</style>
