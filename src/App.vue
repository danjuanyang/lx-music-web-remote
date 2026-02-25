<template>
  <div class="app-container">
    <!-- Connection error overlay -->
    <div v-if="!isConnected && !loading" class="connection-overlay">
      <div class="connection-card">
        <div class="connection-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>
          </svg>
        </div>
        <h2>无法连接到 LX Music</h2>
        <div class="connection-tips">
          <p>请确保:</p>
          <ul>
            <li>LX Music 桌面版已启动</li>
            <li>在设置中开启了"开放API"功能</li>
            <li>API端口设置为 9527</li>
          </ul>
        </div>
        <button class="btn-reconnect" @click="reconnect">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          重新连接
        </button>
      </div>
    </div>

    <!-- Main player interface -->
    <div v-else class="player-layout">
      <!-- Background blur from album art -->
      <div
        class="bg-artwork"
        :style="{ backgroundImage: currentSong.pic ? `url(${currentSong.pic})` : 'none' }"
      ></div>
      <div class="bg-overlay"></div>

      <!-- Content layer -->
      <div class="content-layer">
        <!-- Left panel: Cover + Song info + Progress + Spectrum -->
        <div class="panel-left">
          <div class="left-top">
            <SongInfoComponent
              :song-info="currentSong"
              :is-playing="playerState.isPlaying"
            />
          </div>
          <div class="left-bottom">
            <PlayerControls
              :player-state="playerState"
              @state-changed="handleStateChange"
            />
          </div>
        </div>

        <!-- Right panel: Lyrics only -->
        <div class="panel-right">
          <LyricsDisplay
            :lyrics="lyrics"
            :current-time="playerState.currentTime"
          />
        </div>
      </div>
    </div>

    <!-- Loading overlay -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>连接中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import SongInfoComponent from '@/components/SongInfo.vue'
import LyricsDisplay from '@/components/LyricsDisplay.vue'
import PlayerControls from '@/components/PlayerControls.vue'
import { apiService } from '@/services/api'
import { useWebSocket } from '@/services/websocket'
import type { PlayerState, SongInfo as SongInfoType, LyricLine } from '@/types'

const loading = ref(false)
const { isConnected, on } = useWebSocket()

const playerState = reactive<PlayerState>({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 50,
  playMode: 'order'
})

const currentSong = reactive<SongInfoType>({
  id: '',
  name: '',
  singer: '',
  album: '',
  pic: '',
  duration: 0
})

const lyrics = ref<LyricLine[]>([])

// Debounce timer for song-change fallback refetch
let songChangeTimer: number | null = null

const initializeData = async () => {
  loading.value = true
  try {
    const stateResult = await apiService.getCurrentState()
    if (stateResult.success && stateResult.data) {
      Object.assign(playerState, stateResult.data.player)
      Object.assign(currentSong, stateResult.data.song)
    }
    const lyricsResult = await apiService.getCurrentLyrics()
    if (lyricsResult.success && lyricsResult.data && lyricsResult.data.length > 0) {
      lyrics.value = lyricsResult.data
    }
  } catch (error) {
    console.error('初始化数据失败:', error)
  } finally {
    loading.value = false
  }
}

const handleStateChange = (newState: Partial<PlayerState>) => {
  Object.assign(playerState, newState)
}

const reconnect = () => {
  window.location.reload()
}

/**
 * Debounced fallback: when a song changes, SSE pushes name/singer/albumName
 * separately. We debounce these into a single refetch after all fields settle.
 * This is ONLY a fallback -- the SSE `lyric` event is the primary lyrics source.
 */
const scheduleSongChangeRefetch = () => {
  if (songChangeTimer) clearTimeout(songChangeTimer)
  songChangeTimer = window.setTimeout(async () => {
    // If SSE `lyric` event already provided lyrics, skip
    if (lyrics.value.length > 0) return

    // Fallback: fetch lyrics via HTTP
    try {
      const result = await apiService.getCurrentLyrics()
      if (result.success && result.data && result.data.length > 0) {
        lyrics.value = result.data
      }
    } catch (error) {
      console.error('歌词回退获取失败:', error)
    }
  }, 1500)
}

const setupWebSocketListeners = () => {
  // 播放状态变化
  on('player-state', (data: Partial<PlayerState>) => {
    Object.assign(playerState, data)
  })

  // 歌曲切换 (name/singer/albumName 各自触发一次)
  // 不在这里获取歌词，靠 SSE lyric 事件推送
  on('song-change', (data: any) => {
    // Map albumName -> album for our data model
    if (data.albumName !== undefined) {
      currentSong.album = data.albumName
    }
    if (data.name !== undefined) {
      currentSong.name = data.name
    }
    if (data.singer !== undefined) {
      currentSong.singer = data.singer
    }

    // Reset lyrics so "暂无歌词" shows while waiting for SSE lyric event
    lyrics.value = []

    // Schedule a debounced fallback refetch in case SSE lyric event doesn't arrive
    scheduleSongChangeRefetch()
  })

  // 封面图更新
  on('pic-update', (picUrl: string) => {
    if (picUrl) {
      currentSong.pic = picUrl
    }
  })

  // 进度更新
  on('progress-update', (data: { currentTime?: number; duration?: number }) => {
    if (data.currentTime !== null && data.currentTime !== undefined) {
      playerState.currentTime = data.currentTime
    }
    if (data.duration !== null && data.duration !== undefined) {
      playerState.duration = data.duration
    }
  })

  // 歌词更新 (SSE 推送完整歌词 -- 主要歌词来源)
  on('lyric-update', (data: LyricLine[]) => {
    lyrics.value = data
    // Cancel the debounced fallback if lyrics arrived via SSE
    if (songChangeTimer) {
      clearTimeout(songChangeTimer)
      songChangeTimer = null
    }
  })
}

// 手动切歌 (上一曲/下一曲按钮) 触发的事件
const handleSongChange = async () => {
  try {
    const stateResult = await apiService.getCurrentState()
    if (stateResult.success && stateResult.data) {
      Object.assign(playerState, stateResult.data.player)
      Object.assign(currentSong, stateResult.data.song)
    }
    const lyricsResult = await apiService.getCurrentLyrics()
    if (lyricsResult.success && lyricsResult.data && lyricsResult.data.length > 0) {
      lyrics.value = lyricsResult.data
    }
  } catch (error) {
    console.error('歌曲切换后更新失败:', error)
  }
}

onMounted(() => {
  setupWebSocketListeners()
  window.addEventListener('songChanged', handleSongChange)
  setTimeout(() => {
    if (isConnected.value) {
      initializeData()
    }
  }, 1000)
})

onUnmounted(() => {
  window.removeEventListener('songChanged', handleSongChange)
  if (songChangeTimer) clearTimeout(songChangeTimer)
})
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background: #0c0e0f;
}

/* ---------- Background artwork blur ---------- */
.bg-artwork {
  position: absolute;
  inset: -60px;
  background-size: cover;
  background-position: center;
  filter: blur(80px) saturate(1.6) brightness(0.35);
  z-index: 0;
  transition: background-image 1.2s ease;
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1;
}

/* ---------- Main layout ---------- */
.player-layout {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.content-layer {
  position: relative;
  z-index: 2;
  display: flex;
  width: 100%;
  height: 100%;
}

/* ---------- Left panel ---------- */
.panel-left {
  width: 420px;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  padding: 48px 40px 36px;
}

.left-top {
  flex: 1;
  display: flex;
  align-items: center;
}

.left-bottom {
  flex-shrink: 0;
}

/* ---------- Right panel ---------- */
.panel-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  padding-top: 24px;
}

/* ---------- Connection overlay ---------- */
.connection-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(ellipse at center, #12121a, #0a0a0f);
  z-index: 10;
}

.connection-card {
  text-align: center;
  padding: 48px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  max-width: 400px;
  color: rgba(255, 255, 255, 0.8);
}

.connection-icon {
  margin-bottom: 20px;
  color: rgba(255, 255, 255, 0.4);
}

.connection-card h2 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 24px;
  color: rgba(255, 255, 255, 0.9);
}

.connection-tips {
  text-align: left;
  background: rgba(255, 255, 255, 0.04);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  font-size: 14px;
}

.connection-tips p {
  margin: 0 0 10px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.6);
}

.connection-tips ul {
  margin: 0;
  padding-left: 20px;
}

.connection-tips li {
  margin-bottom: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
}

.btn-reconnect {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: rgba(100, 140, 255, 0.2);
  color: #8ab4ff;
  border: 1px solid rgba(100, 140, 255, 0.3);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-reconnect:hover {
  background: rgba(100, 140, 255, 0.3);
  transform: translateY(-1px);
}

/* ---------- Loading ---------- */
.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10, 10, 15, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.7);
  z-index: 1000;
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top: 2px solid rgba(100, 140, 255, 0.8);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---------- Mobile responsive ---------- */
@media (max-width: 768px) {
  .content-layer {
    flex-direction: column;
  }

  .panel-left {
    width: 100%;
    min-width: unset;
    padding: 20px 20px 12px;
    flex: 0 0 auto;
  }

  .left-top {
    flex: 0 0 auto;
  }

  .panel-right {
    flex: 1;
    min-height: 0;
    padding-top: 0;
  }
}
</style>
