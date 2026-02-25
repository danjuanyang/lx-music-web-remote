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

    <!-- Song name + artist + more button -->
    <div class="song-meta">
      <div class="song-text">
        <div class="song-name">{{ songInfo.name || '未知歌曲' }}</div>
        <div class="artist-name">{{ songInfo.singer || '未知歌手' }}</div>
      </div>
      <button class="more-btn" title="更多">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="19" r="2"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SongInfo } from '@/types'
import { coverService } from '@/services/cover'

interface Props {
  songInfo: SongInfo
  isPlaying?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPlaying: false
})

const coverUrl = ref<string>('')
const coverLoading = ref(false)

const defaultCover = ref('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiMxYTFhMmUiLz48Y2lyY2xlIGN4PSIyMDAiIGN5PSIxODAiIHI9IjYwIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjIwMCIgY3k9IjE4MCIgcj0iMjUiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PHRleHQgeD0iMjAwIiB5PSIyODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM0NDQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiI+Tm8gQ292ZXI8L3RleHQ+PC9zdmc+')

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
</script>

<style scoped>
.song-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
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
}

.song-text {
  min-width: 0;
  flex: 1;
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

/* ---------- More button ---------- */
.more-btn {
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

.more-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.8);
}

/* ---------- Mobile ---------- */
@media (max-width: 768px) {
  .song-info {
    flex-direction: row;
    align-items: center;
    gap: 14px;
  }

  .cover-container {
    width: 64px;
    max-width: 64px;
    flex-shrink: 0;
    border-radius: 8px;
  }

  .song-meta {
    flex: 1;
    min-width: 0;
  }

  .more-btn {
    width: 32px;
    height: 32px;
  }
}
</style>
