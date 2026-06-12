<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'file-selected', file: File): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = () => {
  isDragOver.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false

  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    emit('file-selected', files[0])
  }
}

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    emit('file-selected', target.files[0])
  }
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}
</script>

<template>
  <div
    id="drop-zone"
    class="drop-zone"
    :class="{ 'drag-over': isDragOver }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="triggerFileInput"
  >
    <div class="drop-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 16V4" />
        <path d="M7 9l5-5 5 5" />
        <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
    </div>
    <p>
      Drag & drop audio file here<br /><span class="drop-hint"
        >mp3, wav, m4a, ogg • Max 100MB</span
      >
    </p>
    <div class="btn">Select File</div>
    <input
      type="file"
      id="file-input"
      ref="fileInput"
      hidden
      accept="audio/mpeg,audio/wav,audio/x-m4a,audio/ogg,audio/mp4"
      @change="handleFileChange"
    />
  </div>
</template>

<style scoped>
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  border: 1.5px dashed var(--border-color);
  border-radius: var(--radius-lg);
  padding: calc(var(--spacing-unit) * 3.25) var(--spacing-unit);
  text-align: center;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
  cursor: pointer;
  background: var(--panel-bg);
  box-shadow: var(--shadow-sm);
}

.drop-zone:hover {
  border-color: var(--accent-soft-border);
  background: var(--hover-bg);
}

.drop-zone:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 3px;
}

.drop-zone.drag-over {
  border-color: var(--accent-color);
  border-style: solid;
  background-color: var(--accent-light);
  box-shadow: var(--shadow-md);
  transform: scale(1.005);
}

.drop-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  color: var(--accent-color);
  background: var(--accent-light);
  border: 1px solid var(--accent-soft-border);
  transition:
    transform 0.2s ease,
    background 0.2s ease;
}

.drop-zone:hover .drop-icon,
.drop-zone.drag-over .drop-icon {
  transform: translateY(-2px);
  background: var(--accent-soft);
}

.drop-zone p {
  margin: 0;
  color: var(--text-color);
  font-size: 15px;
  font-weight: 550;
  line-height: 1.6;
}

.drop-hint {
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  font-weight: 400;
  color: var(--secondary-text);
  letter-spacing: 0.01em;
}

.btn {
  display: inline-block;
  background-color: var(--button-bg);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  padding: 9px 18px;
  border-radius: var(--radius);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    transform 0.12s ease;
}

.btn:hover {
  background-color: var(--button-hover-bg);
  border-color: var(--accent-soft-border);
}

.btn:active {
  transform: translateY(1px);
}
</style>
