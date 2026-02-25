<template>
  <div class="lyrics-display" ref="lyricsWrapper">
    <!-- Fade masks -->
    <div class="lyrics-mask lyrics-mask-top"></div>
    <div class="lyrics-mask lyrics-mask-bottom"></div>

    <div class="lyrics-scroll" ref="lyricsContainer">
      <div class="lyrics-spacer"></div>

      <div
        v-for="(line, index) in lyrics"
        :key="line.time + '-' + index"
        :ref="el => setLineRef(el, index)"
        :class="['lyric-line', {
          'lyric-active': index === currentLineIndex,
          'lyric-near': Math.abs(index - currentLineIndex) === 1,
          'lyric-far': Math.abs(index - currentLineIndex) > 1
        }]"
        @click="$emit('seekTo', line.time)"
      >
        {{ line.text || '...' }}
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
}

const props = defineProps<Props>()
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

/* Fade masks */
.lyrics-mask {
  position: absolute;
  left: 0;
  right: 0;
  height: 100px;
  z-index: 2;
  pointer-events: none;
}

.lyrics-mask-top {
  top: 0;
  background: linear-gradient(to bottom, var(--mask-bg, rgba(12, 14, 15, 0.9)), transparent);
}

.lyrics-mask-bottom {
  bottom: 0;
  background: linear-gradient(to top, var(--mask-bg, rgba(12, 14, 15, 0.9)), transparent);
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
  color: rgba(255, 255, 255, 0.22);
  text-align: left;
  cursor: pointer;
  transition: all 0.45s cubic-bezier(0.25, 0.1, 0.25, 1);
  font-weight: 500;
}

.lyric-line:hover {
  color: rgba(255, 255, 255, 0.4);
}

.lyric-line.lyric-active {
  color: rgba(255, 255, 255, 0.95);
  font-size: 30px;
  font-weight: 700;
}

.lyric-line.lyric-near {
  color: rgba(255, 255, 255, 0.35);
}

.lyric-line.lyric-far {
  color: rgba(255, 255, 255, 0.18);
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
    padding: 0 20px;
  }

  .lyric-line {
    font-size: 16px;
    padding: 8px 0;
  }

  .lyric-line.lyric-active {
    font-size: 22px;
  }

  .lyrics-mask {
    height: 60px;
  }

  .lyrics-spacer {
    height: 40%;
    min-height: 80px;
  }
}
</style>
