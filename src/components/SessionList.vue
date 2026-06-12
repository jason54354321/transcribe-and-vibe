<script setup lang="ts">
import { ref } from 'vue'

type Session = {
  id: string
  name: string
  createdAt: number
  durationSec: number
}

defineProps<{
  sessions: Session[]
  activeSessionId: string | null
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'delete', id: string): void
  (e: 'new-session'): void
}>()

const isOpen = ref(false)

function toggleSidebar() {
  isOpen.value = !isOpen.value
}

function closeSidebar() {
  isOpen.value = false
}

function handleDelete(id: string, event: Event) {
  event.stopPropagation()
  if (window.confirm('Are you sure you want to delete this session?')) {
    emit('delete', id)
  }
}

function handleSelect(id: string) {
  emit('select', id)
  closeSidebar()
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}
</script>

<template>
  <button class="mobile-toggle" @click="toggleSidebar" aria-label="Toggle session sidebar">
    ☰
  </button>

  <div v-if="isOpen" class="sidebar-backdrop" @click="closeSidebar"></div>

  <aside
    id="session-sidebar"
    class="sidebar"
    :class="{ 'is-open': isOpen }"
    role="navigation"
    aria-label="Session history"
  >
    <div class="sidebar-header">
      <h1 class="app-title"><span class="brand-mark" aria-hidden="true"></span>Vibe</h1>
      <button class="new-btn" @click="emit('new-session')">
        <span class="new-btn-glyph" aria-hidden="true">+</span> New
      </button>
    </div>

    <div class="session-list">
      <div v-if="sessions.length === 0" class="empty-state">
        <span class="empty-glyph" aria-hidden="true">◴</span>
        <span class="empty-title">No sessions yet</span>
        <span class="empty-hint">Upload audio to start transcribing</span>
      </div>

      <div
        v-else
        v-for="session in sessions"
        :key="session.id"
        class="session-item"
        :class="{ 'is-active': session.id === activeSessionId }"
        role="button"
        tabindex="0"
        @click="handleSelect(session.id)"
        @keydown.enter="handleSelect(session.id)"
        @keydown.space.prevent="handleSelect(session.id)"
      >
        <div class="session-info">
          <div class="session-name" :title="session.name">{{ session.name }}</div>
          <div class="session-meta">
            <span>{{ formatRelativeTime(session.createdAt) }}</span>
            <span>&middot;</span>
            <span>{{ formatDuration(session.durationSec) }}</span>
          </div>
        </div>
        <button
          class="delete-btn"
          aria-label="Delete session"
          @click="handleDelete(session.id, $event)"
        >
          &times;
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.mobile-toggle {
  display: none;
  position: fixed;
  top: var(--spacing-unit);
  left: var(--spacing-unit);
  z-index: 100;
  background: var(--sticky-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  width: 40px;
  height: 40px;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--text-color);
  box-shadow: var(--shadow-md);
}

.sidebar-backdrop {
  display: none;
}

.sidebar {
  width: 264px;
  height: 100vh;
  position: sticky;
  top: 0;
  background: var(--panel-bg);
  border-right: 1px solid var(--divider-color);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-header {
  padding: calc(var(--spacing-unit) * 1.25) var(--spacing-unit);
  border-bottom: 1px solid var(--divider-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.app-title {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-color);
}

.brand-mark {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--accent-color);
  box-shadow: 0 0 0 4px var(--accent-light);
}

.new-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--accent-color);
  color: var(--accent-contrast);
  border: none;
  border-radius: var(--radius-pill);
  padding: 7px 14px 7px 11px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition:
    background 0.15s ease,
    transform 0.12s ease;
}

.new-btn:hover {
  background: var(--accent-strong);
}

.new-btn:active {
  transform: translateY(1px);
}

.new-btn-glyph {
  font-size: 1rem;
  line-height: 1;
  font-weight: 500;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: calc(var(--spacing-unit) * 0.5) 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  text-align: center;
  color: var(--secondary-text);
  padding: calc(var(--spacing-unit) * 2.5) var(--spacing-unit);
}

.empty-glyph {
  font-size: 1.6rem;
  opacity: 0.55;
  margin-bottom: 2px;
}

.empty-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-color);
}

.empty-hint {
  font-size: 0.78rem;
  opacity: 0.8;
  max-width: 18ch;
  line-height: 1.45;
}

.session-item {
  padding: 9px 11px;
  border-radius: var(--radius-sm);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  position: relative;
  transition:
    background 0.14s ease,
    box-shadow 0.14s ease;
}

.session-item:hover {
  background: var(--hover-bg);
}

.session-item.is-active {
  background: var(--accent-light);
}

.session-item.is-active::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 22px;
  border-radius: 0 var(--radius-pill) var(--radius-pill) 0;
  background: var(--accent-color);
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-name {
  font-weight: 550;
  font-size: 0.88rem;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 3px;
}

.session-item.is-active .session-name {
  color: var(--accent-strong);
}

.session-meta {
  font-size: 0.74rem;
  color: var(--secondary-text);
  display: flex;
  align-items: center;
  gap: 5px;
  font-variant-numeric: tabular-nums;
}

.delete-btn {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--secondary-text);
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.14s ease,
    background 0.14s ease,
    color 0.14s ease;
}

.session-item:hover .delete-btn,
.session-item:focus-within .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: var(--error-bg);
  color: var(--error-color);
}

.session-item:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: -2px;
}

@media (max-width: 600px) {
  .mobile-toggle {
    display: flex;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 101;
    transform: translateX(-100%);
    box-shadow: var(--shadow-md);
  }

  .sidebar.is-open {
    transform: translateX(0);
  }

  .sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    z-index: 100;
  }
}
</style>
