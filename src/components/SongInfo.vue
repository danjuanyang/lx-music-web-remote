<template>
  <div class="song-info">
    <!-- Large album cover -->
    <div class="cover-container">
      <img
        class="cover-img"
        :src="coverUrl || defaultCover"
        :alt="songInfo.name"
        @error="handleImageError"
      />
    </div>

    <!-- Song name + artist + font settings button -->
    <div class="song-meta">
      <div class="song-text">
        <div class="song-name">{{ songInfo.name || '未知歌曲' }}</div>
        <div class="artist-name">{{ songInfo.singer || '未知歌手' }}</div>
      </div>
      <button class="font-btn" title="歌词字体" @click="toggleFontPicker">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="4 7 4 4 20 4 20 7"/>
          <line x1="9" y1="20" x2="15" y2="20"/>
          <line x1="12" y1="4" x2="12" y2="20"/>
        </svg>
      </button>
    </div>

    <!-- Font picker dropdown -->
    <div v-if="showFontPicker" class="font-picker-overlay" @click.self="showFontPicker = false">
      <div class="font-picker">
        <div class="font-picker-header">
          <span>歌词字体</span>
          <button class="font-picker-close" @click="showFontPicker = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="font-list">
          <div
            v-for="font in allFonts"
            :key="font.value"
            :class="['font-item', { active: selectedFont === font.value }]"
            :style="{ fontFamily: font.value || 'inherit' }"
            @click="selectFont(font.value)"
          >
            <span class="font-item-name">{{ font.label }}</span>
            <span class="font-item-preview">歌词预览 Lyrics</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { SongInfo } from '@/types'
import { coverService } from '@/services/cover'

interface FontOption {
  label: string
  value: string
}

interface Props {
  songInfo: SongInfo
  isPlaying?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPlaying: false
})

const emit = defineEmits<{
  fontChanged: [fontFamily: string]
}>()

const coverUrl = ref<string>('')
const coverLoading = ref(false)
const showFontPicker = ref(false)
const selectedFont = ref('')
const customFonts = ref<FontOption[]>([])

const defaultCover = ref('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiMxYTFhMmUiLz48Y2lyY2xlIGN4PSIyMDAiIGN5PSIxODAiIHI9IjYwIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE4MCIgcj0iMjUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PHRleHQgeD0iMjAwIiB5PSIyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM0NDQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiI+Tm8gQ292ZXI8L3RleHQ+PC9zdmc+')

// System fonts commonly available
const systemFonts: FontOption[] = [
  { label: '默认字体', value: '' },
  { label: '微软雅黑', value: '"Microsoft YaHei"' },
  { label: '苹方', value: '"PingFang SC"' },
  { label: '思源黑体', value: '"Source Han Sans SC", "Noto Sans SC"' },
  { label: '思源宋体', value: '"Source Han Serif SC", "Noto Serif SC"' },
  { label: '黑体', value: 'SimHei' },
  { label: '宋体', value: 'SimSun' },
  { label: '楷体', value: 'KaiTi' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Helvetica', value: 'Helvetica, Arial' },
  { label: 'Times New Roman', value: '"Times New Roman"' },
]

const allFonts = ref<FontOption[]>([...systemFonts])

// Try to load custom fonts from /fonts/ directory
const loadCustomFonts = async () => {
  try {
    const resp = await fetch('/fonts/fonts.json')
    if (resp.ok) {
      const fonts: Array<{ name: string; file: string }> = await resp.json()
      for (const f of fonts) {
        const fontFace = new FontFace(f.name, `url(/fonts/${f.file})`)
        await fontFace.load()
        document.fonts.add(fontFace)
        customFonts.value.push({ label: f.name, value: `"${f.name}"` })
      }
      allFonts.value = [...customFonts.value, ...systemFonts]
    }
  } catch {
    // No custom fonts available, use system fonts only
  }
}

const toggleFontPicker = () => {
  showFontPicker.value = !showFontPicker.value
}

const selectFont = (fontValue: string) => {
  selectedFont.value = fontValue
  emit('fontChanged', fontValue)
  localStorage.setItem('lx-lyric-font', fontValue)
  showFontPicker.value = false
}

// Cover logic
const searchCover = async () => {
  if (!props.songInfo.singer || !props.songInfo.album || coverLoading.value) return
  coverLoading.value = true
  try {
    const result = await coverService.searchCover(
      props.songInfo.singer,
      props.songInfo.album,
      props.songInfo.name,
      props.songInfo.pic
    )
    if (result.success && result.coverUrl) {
      coverUrl.value = result.coverUrl
    } else {
      coverUrl.value = defaultCover.value
    }
  } catch {
    coverUrl.value = defaultCover.value
  } finally {
    coverLoading.value = false
  }
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.src = defaultCover.value
  coverUrl.value = defaultCover.value
}

watch(
  () => [props.songInfo.singer, props.songInfo.album, props.songInfo.name, props.songInfo.pic],
  () => {
    if (props.songInfo.pic) {
      coverUrl.value = props.songInfo.pic
    } else {
      coverUrl.value = defaultCover.value
      searchCover()
    }
  },
  { immediate: true }
)

onMounted(() => {
  // Restore saved font
  const saved = localStorage.getItem('lx-lyric-font')
  if (saved) {
    selectedFont.value = saved
    emit('fontChanged', saved)
  }
  loadCustomFonts()
})
</script>

<style scoped>
.song-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  position: relative;
}

/* ---------- Album cover ---------- */
.cover-container {
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 340px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  background: rgba(255, 255, 255, 0.03);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}

.cover-container:hover .cover-img {
  transform: scale(1.03);
}

/* ---------- Song meta row ---------- */
.song-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.song-text {
  min-width: 0;
  flex: 1;
  text-align: center;
}

.song-name {
  font-size: 16px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.artist-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---------- Font settings button ---------- */
.font-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s ease;
}

.font-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.8);
}

/* ---------- Font picker ---------- */
.font-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.font-picker {
  width: 340px;
  max-height: 480px;
  background: rgba(28, 28, 36, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(20px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.font-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.font-picker-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s;
}

.font-picker-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.font-list {
  overflow-y: auto;
  padding: 8px;
  flex: 1;
}

.font-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}

.font-item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.font-item.active {
  background: rgba(100, 140, 255, 0.15);
}

.font-item-name {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  font-family: inherit !important;
}

.font-item-preview {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.4;
}

.font-item.active .font-item-name {
  color: #8ab4ff;
}

/* ---------- Mobile ---------- */
@media (max-width: 768px) {
  .song-info {
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  .cover-container {
    width: 56px;
    max-width: 56px;
    flex-shrink: 0;
    border-radius: 8px;
  }

  .song-meta {
    flex: 1;
    min-width: 0;
  }

  .song-text {
    text-align: left;
  }

  .song-name {
    font-size: 14px;
  }

  .artist-name {
    font-size: 12px;
  }

  .font-btn {
    width: 30px;
    height: 30px;
  }

  .font-picker {
    width: 90vw;
    max-height: 60vh;
  }
}
</style>
