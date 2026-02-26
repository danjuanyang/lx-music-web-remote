<template>
  <div class="lyrics-display" ref="lyricsWrapper">
    <div class="lyrics-scroll" ref="lyricsContainer">
      <div class="lyrics-spacer"></div>

      <div
        v-for="(line, index) in lyrics"
        :key="line.time + '-' + index"
        :ref="el => setLineRef(el, index)"
        class="lyric-line"
        :class="{ 'lyric-active': index === currentLineIndex }"
        :style="getLineStyle(index)"
        @click="$emit('seekTo', line.time)"
      >
        <span class="lyric-text">{{ line.text || '...' }}</span>
        <span v-if="line.translation" class="lyric-translation">{{ line.translation }}</span>
      </div>

      <div class="lyrics-spacer"></div>

      <!-- No lyrics -->
      <div v-if="lyrics.length === 0" class="no-lyrics">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
          <path d="M9 18V5l12-2v13"/>
          <circle cx="6" cy="18" r="3"/>
          <circle cx="18" cy="16" r="3"/>
        </svg>
        <p>暂无歌词</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import type { LyricLine } from '@/types'

interface Props {
  lyrics: LyricLine[]
  currentTime: number
  fontFamily?: string
}

const props = withDefaults(defineProps<Props>(), {
  fontFamily: ''
})
defineEmits<{ seekTo: [time: number] }>()

const lyricsWrapper = ref<HTMLDivElement>()
const lyricsContainer = ref<HTMLDivElement>()
const lineRefs = ref<Map<number, HTMLElement>>(new Map())

const setLineRef = (el: any, index: number) => {
  if (el) {
    lineRefs.value.set(index, el as HTMLElement)
  }
}

const currentLineIndex = computed(() => {
  if (props.lyrics.length === 0) return -1
  let index = -1
  for (let i = 0; i < props.lyrics.length; i++) {
    if (props.lyrics[i].time <= props.currentTime) {
      index = i
    } else {
      break
    }
  }
  return index
})

/**
 * Compute per-line style: blur + opacity based on distance from active line.
 * distance 0 = active: sharp, full white
 * distance 1: very slight blur
 * distance 2+: increasing blur, decreasing opacity
 */
const getLineStyle = (index: number) => {
  const dist = Math.abs(index - currentLineIndex.value)
  let blur = 0
  let opacity = 1

  if (dist === 0) {
    blur = 0
    opacity = 1
  } else if (dist === 1) {
    blur = 0.5
    opacity = 0.6
  } else if (dist === 2) {
    blur = 1.5
    opacity = 0.4
  } else if (dist === 3) {
    blur = 2.5
    opacity = 0.3
  } else if (dist === 4) {
    blur = 3.5
    opacity = 0.22
  } else {
    blur = Math.min(dist * 1, 6)
    opacity = Math.max(0.12, 0.3 - dist * 0.04)
  }

  const style: Record<string, string> = {
    filter: `blur(${blur}px)`,
    opacity: String(opacity),
  }

  if (props.fontFamily) {
    style.fontFamily = props.fontFamily
  }

  return style
}

const scrollToActive = () => {
  const el = lineRefs.value.get(currentLineIndex.value)
  if (!el || !lyricsContainer.value) return

  el.scrollIntoView({
    behavior: 'smooth',
    block: 'center'
  })
}

watch(currentLineIndex, () => {
  nextTick(scrollToActive)
})

watch(() => props.lyrics, () => {
  nextTick(() => {
    if (lyricsContainer.value) {
      lyricsContainer.value.scrollTop = 0
    }
    setTimeout(scrollToActive, 100)
  })
}, { deep: true })

onMounted(() => {
  nextTick(scrollToActive)
})
</script>

<style scoped>
.lyrics-display {
  flex: 1;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

.lyrics-scroll {
  height: 100%;
  overflow-y: auto;
  padding: 0 40px;
  scroll-behavior: smooth;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.lyrics-scroll::-webkit-scrollbar {
  display: none;
}

.lyrics-spacer {
  height: 45%;
  min-height: 140px;
}

/* ---------- Lyric lines ---------- */
.lyric-line {
  padding: 12px 0;
  font-size: 22px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.75);
  text-align: center;
  cursor: pointer;
  transition: all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
  font-weight: 500;
  will-change: filter, opacity;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.lyric-text {
  display: block;
}

.lyric-translation {
  display: block;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 4px;
  font-weight: 400;
}

.lyric-active .lyric-translation {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.6);
}

.lyric-line:hover {
  opacity: 0.9 !important;
  filter: blur(0px) !important;
}

.lyric-line.lyric-active {
  color: #fff;
  font-size: 30px;
  font-weight: 700;
}

/* ---------- No lyrics ---------- */
.no-lyrics {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: rgba(255, 255, 255, 0.25);
}

.no-lyrics p {
  font-size: 14px;
  margin: 0;
}

/* ---------- Mobile ---------- */
@media (max-width: 768px) {
  .lyrics-scroll {
    padding: 0 16px;
  }

  .lyric-line {
    font-size: 16px;
    padding: 6px 0;
  }

  .lyric-line.lyric-active {
    font-size: 20px;
  }

  .lyric-translation {
    font-size: 12px;
  }

  .lyric-active .lyric-translation {
    font-size: 13px;
  }

  .lyrics-spacer {
    height: 30%;
    min-height: 60px;
  }
}
</style>
