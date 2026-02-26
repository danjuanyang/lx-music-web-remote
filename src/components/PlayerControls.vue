<template>
  <div class="player-controls">
    <!-- Playback buttons -->
    <div class="control-buttons">
      <button class="ctrl-btn" @click="previousSong" :disabled="loading" title="上一曲">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
        </svg>
      </button>

      <button class="ctrl-btn ctrl-btn-play" @click="togglePlayPause" :disabled="loading" title="播放/暂停">
        <svg v-if="!playerState.isPlaying" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
        <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      </button>

      <button class="ctrl-btn" @click="nextSong" :disabled="loading" title="下一曲">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
        </svg>
      </button>
    </div>

    <!-- Progress bar -->
    <div class="progress-section">
      <div
        class="progress-track"
        @mousedown="startProgressDrag"
        @click="seekToPosition"
        ref="progressBar"
      >
        <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
        <div class="progress-thumb" :style="{ left: progressPercentage + '%' }"></div>
      </div>
      <div class="time-row">
        <span class="time-label">{{ formatTime(playerState.currentTime) }}</span>
        <span class="time-label">-{{ formatTime(remainingTime) }}</span>
      </div>
    </div>

    <!-- Audio spectrum visualizer -->
    <div class="spectrum-section">
      <canvas ref="spectrumCanvas" class="spectrum-canvas"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { apiService } from '@/services/api'
import type { PlayerState } from '@/types'

interface Props {
  playerState: PlayerState
}

const props = defineProps<Props>()

const emit = defineEmits<{
  stateChanged: [state: Partial<PlayerState>]
}>()

const loading = ref(false)
const progressBar = ref<HTMLDivElement>()
const spectrumCanvas = ref<HTMLCanvasElement>()
const isDragging = ref(false)
let animFrameId: number | null = null
let spectrumBars: number[] = []

const progressPercentage = computed(() => {
  if (props.playerState.duration === 0) return 0
  return (props.playerState.currentTime / props.playerState.duration) * 100
})

const remainingTime = computed(() => {
  return Math.max(0, props.playerState.duration - props.playerState.currentTime)
})

// ---------- Playback controls ----------
const togglePlayPause = async () => {
  loading.value = true
  try {
    const result = await apiService.togglePlayPause()
    if (result.success) {
      emit('stateChanged', { isPlaying: !props.playerState.isPlaying })
    }
  } finally {
    loading.value = false
  }
}

const nextSong = async () => {
  loading.value = true
  try {
    await apiService.nextSong()
  } finally {
    loading.value = false
  }
}

const previousSong = async () => {
  loading.value = true
  try {
    await apiService.previousSong()
  } finally {
    loading.value = false
  }
}

// ---------- Progress drag ----------
const seekToPosition = (event: MouseEvent) => {
  if (!progressBar.value || isDragging.value) return
  const rect = progressBar.value.getBoundingClientRect()
  const percentage = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const seekTime = percentage * props.playerState.duration
  apiService.seekTo(seekTime)
  emit('stateChanged', { currentTime: seekTime })
}

const startProgressDrag = (event: MouseEvent) => {
  if (!progressBar.value) return
  event.preventDefault()
  isDragging.value = true
  document.addEventListener('mousemove', handleProgressDrag)
  document.addEventListener('mouseup', endProgressDrag)
}

const handleProgressDrag = (event: MouseEvent) => {
  if (!isDragging.value || !progressBar.value) return
  const rect = progressBar.value.getBoundingClientRect()
  const percentage = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  emit('stateChanged', { currentTime: percentage * props.playerState.duration })
}

const endProgressDrag = (event: MouseEvent) => {
  if (!isDragging.value || !progressBar.value) return
  const rect = progressBar.value.getBoundingClientRect()
  const percentage = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const seekTime = percentage * props.playerState.duration
  apiService.seekTo(seekTime)
  emit('stateChanged', { currentTime: seekTime })
  isDragging.value = false
  document.removeEventListener('mousemove', handleProgressDrag)
  document.removeEventListener('mouseup', endProgressDrag)
}

// ---------- Spectrum visualizer ----------
const TOTAL_BARS = 64

const initSpectrum = () => {
  spectrumBars = Array.from({ length: TOTAL_BARS }, () => Math.random() * 0.15)
}

const drawSpectrum = () => {
  const canvas = spectrumCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const w = rect.width
  const h = rect.height
  ctx.clearRect(0, 0, w, h)

  const isPlaying = props.playerState.isPlaying
  const barW = w / TOTAL_BARS
  const gap = 1.5

  for (let i = 0; i < TOTAL_BARS; i++) {
    if (isPlaying) {
      const target = 0.1 + Math.random() * 0.85
      spectrumBars[i] += (target - spectrumBars[i]) * 0.18
    } else {
      spectrumBars[i] += (0.05 - spectrumBars[i]) * 0.08
    }

    const barH = Math.max(2, spectrumBars[i] * h)
    const x = i * barW + gap / 2
    const barWidth = barW - gap

    const progress = props.playerState.duration > 0
      ? props.playerState.currentTime / props.playerState.duration
      : 0
    const barProgress = i / TOTAL_BARS

    if (barProgress <= progress) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
    }

    const y = (h - barH) / 2
    ctx.beginPath()
    ctx.roundRect(x, y, barWidth, barH, 1)
    ctx.fill()
  }

  animFrameId = requestAnimationFrame(drawSpectrum)
}

onMounted(() => {
  initSpectrum()
  drawSpectrum()
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
})

// ---------- Helpers ----------
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped>
.player-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ---------- Control Buttons ---------- */
.control-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.ctrl-btn:active {
  transform: scale(0.9);
}

.ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.ctrl-btn-play {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.ctrl-btn-play:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.ctrl-btn-play:active {
  transform: scale(0.93);
}

/* ---------- Progress ---------- */
.progress-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
  user-select: none;
  transition: height 0.15s ease;
}

.progress-track:hover {
  height: 6px;
}

.progress-fill {
  height: 100%;
  background: rgba(255, 255, 255, 0.65);
  border-radius: 2px;
  transition: width 0.15s linear;
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0);
  cursor: grab;
  transition: transform 0.15s ease;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}

.progress-track:hover .progress-thumb {
  transform: translate(-50%, -50%) scale(1);
}

.progress-thumb:active {
  cursor: grabbing;
  transform: translate(-50%, -50%) scale(1.2);
}

.time-row {
  display: flex;
  justify-content: space-between;
}

.time-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.35);
  font-variant-numeric: tabular-nums;
}

/* ---------- Spectrum ---------- */
.spectrum-section {
  height: 40px;
}

.spectrum-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* ---------- Mobile ---------- */
@media (max-width: 768px) {
  .player-controls {
    gap: 6px;
  }

  .control-buttons {
    gap: 18px;
  }

  .ctrl-btn {
    width: 32px;
    height: 32px;
  }

  .ctrl-btn-play {
    width: 40px;
    height: 40px;
  }

  .spectrum-section {
    height: 24px;
  }

  .progress-section {
    gap: 4px;
  }

  .time-label {
    font-size: 10px;
  }
}
</style>
