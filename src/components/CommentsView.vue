<template>
  <!-- Comment trigger button -->
  <div class="comment-trigger" @click="openComments">
    <button class="comment-btn" title="查看评论">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <!-- <span>评论</span> -->
    </button>
  </div>

  <!-- Comments overlay -->
  <div v-if="showComments" class="comments-overlay" @click.self="closeComments">
    <div class="comments-panel">
      <div class="comments-header">
        <div class="header-left">
          <h3 class="header-title">歌曲评论</h3>
          <span class="song-match-info" v-if="matchedSongName">
            {{ matchedSongName }} - {{ matchedSingerName }}
          </span>
        </div>
        <button class="comments-close" @click="closeComments" title="关闭">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Platform selector tabs -->
      <div class="platform-tabs">
        <button
          v-for="src in PLATFORMS"
          :key="src"
          :class="['platform-tab', { active: activeSource === src }]"
          @click="switchPlatform(src)"
        >
          {{ sourceLabel(src) }}
        </button>
      </div>

      <!-- Hot/Latest toggle tabs (Desktop style) -->
      <div class="type-tabs" v-if="!searching && hasSongId()">
        <button 
          :class="['type-tab', { active: showHotOnly }]" 
          @click="switchTab('hot')"
        >
          热门 {{ hotTotal > 0 ? `(${formatCount(hotTotal)})` : '' }}
        </button>
        <button 
          :class="['type-tab', { active: !showHotOnly }]" 
          @click="switchTab('latest')"
        >
          最新 {{ newTotal > 0 ? `(${formatCount(newTotal)})` : '' }}
        </button>
      </div>

      <div class="comments-content-area" ref="scrollContainer">
        <!-- Searching -->
        <div v-if="searching" class="comments-loading">
          <div class="loading-spinner"></div>
          <span>匹配歌曲中...</span>
        </div>

        <!-- Song not found on platform -->
        <div v-else-if="!hasSongId() && !loading && !searching" class="no-comments">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p>该平台未找到匹配歌曲</p>
          <button class="retry-btn" style="margin-top: 10px" @click="retryOtherPlatforms">搜索其他平台</button>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="comments-error">
          <span>{{ error }}</span>
          <div class="error-actions">
            <button class="retry-btn" @click="fetchComments">重试</button>
          </div>
        </div>

        <!-- Loading comments -->
        <div v-else-if="loading && comments.length === 0" class="comments-loading">
          <div class="loading-spinner"></div>
          <span>加载评论中...</span>
        </div>

        <!-- No comments -->
        <div v-else-if="comments.length === 0 && !loading" class="no-comments">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <p>暂无评论</p>
        </div>

        <!-- Comment list -->
        <div v-else class="comments-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <div class="comment-avatar-container">
              <img v-if="comment.avatar" class="comment-avatar" :src="comment.avatar" :alt="comment.userName" @error="onAvatarError" loading="lazy" />
              <div v-else class="comment-avatar comment-avatar-placeholder">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" opacity="0.4">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            </div>

            <div class="comment-body">
              <div class="comment-header-info">
                <span class="comment-username">{{ comment.userName || '匿名用户' }}</span>
                <div v-if="comment.likedCount > 0" class="comment-likes">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                  </svg>
                  <span>{{ formatCount(comment.likedCount) }}</span>
                </div>
              </div>
              <div class="comment-time" v-if="comment.timeStr">{{ comment.timeStr }}</div>
              
              <div class="comment-text">{{ comment.text }}</div>

              <!-- Comment Images -->
              <div v-if="Array.isArray(comment.images) && comment.images.length > 0" class="comment-images">
                <img v-for="(img, idx) in comment.images" :key="idx" :src="img" class="comment-img" loading="lazy" />
              </div>

              <!-- Reply comments -->
              <div v-if="comment.reply && comment.reply.length > 0" class="comment-replies">
                <div v-for="reply in getVisibleReplies(comment)" :key="reply.id" class="reply-item">
                  <div class="reply-body">
                    <span class="reply-username">{{ reply.userName }}</span>
                    <span class="reply-text">: {{ reply.text }}</span>
                    <div class="reply-meta" v-if="reply.timeStr">
                      <span class="comment-time">{{ reply.timeStr }}</span>
                    </div>
                  </div>
                </div>
                <button v-if="comment.reply.length > 2 && !expandedComments.has(String(comment.id))" 
                        class="show-more-replies" @click="toggleReplyExpand(String(comment.id))">
                  共 {{ comment.reply.length }} 条回复 >
                </button>
              </div>
            </div>
          </div>

          <!-- Load more -->
          <div v-if="currentPage < maxPage" class="load-more">
            <button class="load-more-btn" @click="loadMore" :disabled="loadingMore">
              {{ loadingMore ? '加载中...' : '加载更多' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { commentService, type CommentItem, type CommentSource, type SongSearchResult } from '@/services/comment'

const PLATFORMS: CommentSource[] = ['kw', 'wy', 'tx', 'kg', 'mg']

const SOURCE_LABEL: Record<CommentSource, string> = {
  kw: '酷我',
  wy: '网易云',
  tx: 'QQ音乐',
  kg: '酷狗',
  mg: '咪咕',
}

interface Props {
  songId?: string
  songName: string
  singer: string
}

const props = defineProps<Props>()

function sourceLabel(source: CommentSource): string {
  return SOURCE_LABEL[source] || source
}

// UI state
const showComments = ref(false)
const showHotOnly = ref(true)
const searching = ref(false)
const loading = ref(false)
const error = ref('')
const loadingMore = ref(false)
const scrollContainer = ref<HTMLElement | null>(null)

// Comment data
const activeSource = ref<CommentSource>('kw')
const searchResult = ref<SongSearchResult | null>(null)
const comments = ref<CommentItem[]>([])
const currentPage = ref(1)
const hotTotal = ref(0)
const newTotal = ref(0)
const maxPage = ref(1)
const expandedComments = ref<Set<string>>(new Set())

// Matched song info from current platform's search
const matchedSongName = ref('')
const matchedSingerName = ref('')

const totalComments = () => showHotOnly.value ? hotTotal.value : newTotal.value

function switchTab(tab: 'hot' | 'latest') {
  if ((tab === 'hot' && showHotOnly.value) || (tab === 'latest' && !showHotOnly.value)) return
  showHotOnly.value = tab === 'hot'
  resetCommentState()
  fetchComments()
}

async function switchPlatform(source: CommentSource) {
  if (source === activeSource.value) return
  activeSource.value = source
  resetCommentState()
  
  // If we don't have ID for this platform yet, try to search it
  if (!commentService.getPlatformSongId(source, searchResult.value)) {
    searching.value = true
    try {
      const keyword = `${props.songName} ${props.singer}`.trim()
      // Single platform search to be faster
      const result = await commentService.searchAllPlatforms(props.songName, props.singer)
      searchResult.value = result
    } finally {
      searching.value = false
    }
  }
  
  if (hasSongId()) {
    updateMatchedInfo()
    await fetchComments()
  }
}

async function retryOtherPlatforms() {
  searching.value = true
  try {
    searchResult.value = await commentService.searchAllPlatforms(props.songName, props.singer)
    // Find first available platform
    for (const src of PLATFORMS) {
      if (commentService.getPlatformSongId(src, searchResult.value)) {
        activeSource.value = src
        updateMatchedInfo()
        break
      }
    }
  } finally {
    searching.value = false
    if (hasSongId()) fetchComments()
  }
}

function resetCommentState() {
  comments.value = []
  error.value = ''
  currentPage.value = 1
  maxPage.value = 1
  expandedComments.value = new Set()
  if (scrollContainer.value) scrollContainer.value.scrollTop = 0
}

function updateMatchedInfo() {
  const info = searchResult.value?.[activeSource.value]
  if (info) {
    matchedSongName.value = info.name
    matchedSingerName.value = info.singer
  } else {
    matchedSongName.value = props.songName
    matchedSingerName.value = props.singer
  }
}

function hasSongId(): boolean {
  return !!commentService.getPlatformSongId(activeSource.value, searchResult.value)
}

async function openComments() {
  showComments.value = true
  resetCommentState()
  showHotOnly.value = true
  
  // Try to parse source from songId
  const parsed = props.songId ? commentService.parseLxId(props.songId) : null
  if (parsed) {
    activeSource.value = parsed.source
    // If we have an ID directly from LX Music, we can initialize searchResult partially
    if (!searchResult.value) {
      searchResult.value = { kw: null, wy: null, tx: null, kg: null, mg: null }
      const key = parsed.source as keyof SongSearchResult
      // @ts-ignore: dynamic assignment
      searchResult.value[key] = { songmid: parsed.id, name: props.songName, singer: props.singer }
      // Special case for other platforms IDs
      if (parsed.source === 'wy') searchResult.value.wy = { songId: parsed.id, name: props.songName, singer: props.singer }
      if (parsed.source === 'tx') searchResult.value.tx = { songMid: parsed.id, songId: '', name: props.songName, singer: props.singer }
      if (parsed.source === 'kg') searchResult.value.kg = { hash: parsed.id, name: props.songName, singer: props.singer }
      if (parsed.source === 'mg') searchResult.value.mg = { copyrightId: parsed.id, name: props.songName, singer: props.singer }
    }
  } else {
    activeSource.value = 'kw'
  }

  updateMatchedInfo()

  // Start by fetching current platform
  if (hasSongId()) {
    fetchComments()
  } else {
    // Search if no ID available
    retryOtherPlatforms()
  }
}

async function fetchComments() {
  const songId = commentService.getPlatformSongId(activeSource.value, searchResult.value)
  if (!songId) return

  loading.value = true
  error.value = ''

  try {
    const result = showHotOnly.value
      ? await commentService.getHotComments(activeSource.value, songId, 1, 20)
      : await commentService.getComments(activeSource.value, songId, 1, 20)

    comments.value = result.list
    if (showHotOnly.value) hotTotal.value = result.total
    else newTotal.value = result.total
    
    maxPage.value = result.total > 0 ? Math.ceil(result.total / 20) : 1
    currentPage.value = 1
  } catch (e: any) {
    error.value = e?.message || '获取评论失败'
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || currentPage.value >= maxPage.value) return
  loadingMore.value = true
  try {
    const songId = commentService.getPlatformSongId(activeSource.value, searchResult.value)
    const nextPage = currentPage.value + 1
    const result = showHotOnly.value
      ? await commentService.getHotComments(activeSource.value, songId!, nextPage, 20)
      : await commentService.getComments(activeSource.value, songId!, nextPage, 20)
    comments.value = [...comments.value, ...result.list]
    currentPage.value = nextPage
  } catch {
    error.value = '加载更多评论失败'
  } finally {
    loadingMore.value = false
  }
}

function getVisibleReplies(comment: CommentItem) {
  if (!comment.reply) return []
  if (expandedComments.value.has(String(comment.id))) return comment.reply
  return comment.reply.slice(0, 2)
}

const toggleReplyExpand = (commentId: string) => {
  expandedComments.value.add(commentId)
}

function closeComments() {
  showComments.value = false
  searching.value = false
  resetCommentState()
}

const formatCount = (count: number): string => {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return String(count)
}

const onAvatarError = (e: Event) => {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
  const parent = img.parentElement
  if (parent) {
    const svg = document.createElement('div')
    svg.className = 'comment-avatar-placeholder'
    svg.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" opacity="0.4"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`
    parent.appendChild(svg)
  }
}

// Reset state when song changes
watch([() => props.songName, () => props.singer], () => {
  searchResult.value = null
  matchedSongName.value = ''
  matchedSingerName.value = ''
  if (showComments.value) {
    resetCommentState()
    openComments()
  }
})
</script>

<style scoped>
.comment-trigger {
  display: inline-flex;
  align-items: center;
}

.comment-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.comment-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.9);
  border-color: rgba(255, 255, 255, 0.2);
}

/* ---------- Overlay ---------- */
.comments-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.comments-panel {
  width: 520px;
  height: 80vh;
  max-height: 800px;
  background: #1a1a24;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
}

/* ---------- Header ---------- */
.comments-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 24px 12px;
  flex-shrink: 0;
}

.header-left {
  flex: 1;
  min-width: 0;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  margin: 0 0 4px;
}

.song-match-info {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.comments-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: all 0.2s;
}

.comments-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

/* ---------- Platform tabs ---------- */
.platform-tabs {
  display: flex;
  gap: 8px;
  padding: 0 24px 16px;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}

.platform-tabs::-webkit-scrollbar {
  display: none;
}

.platform-tab {
  padding: 6px 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.platform-tab.active {
  background: rgba(100, 140, 255, 0.15);
  border-color: rgba(100, 140, 255, 0.3);
  color: #8ab4ff;
}

/* ---------- Type tabs (Hot/Latest) ---------- */
.type-tabs {
  display: flex;
  gap: 24px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.type-tab {
  padding: 10px 0;
  border: none;
  background: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.type-tab.active {
  color: #8ab4ff;
}

.type-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: #8ab4ff;
  border-radius: 2px;
}

/* ---------- Content Area ---------- */
.comments-content-area {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

/* ---------- Loading / Error ---------- */
.comments-loading,
.comments-error,
.no-comments {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px 20px;
  gap: 16px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top: 2px solid #8ab4ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.retry-btn {
  padding: 8px 24px;
  background: rgba(100, 140, 255, 0.15);
  border: 1px solid rgba(100, 140, 255, 0.2);
  border-radius: 12px;
  color: #8ab4ff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: rgba(100, 140, 255, 0.25);
}

/* ---------- Comments list ---------- */
.comments-list {
  padding: 12px 0;
}

.comment-item {
  display: flex;
  gap: 14px;
  padding: 16px 24px;
  transition: background 0.2s;
}

.comment-item:hover {
  background: rgba(255, 255, 255, 0.02);
}

.comment-avatar-container {
  flex-shrink: 0;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.comment-avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-header-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.comment-username {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.comment-likes {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
}

.comment-time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
  margin-bottom: 8px;
}

.comment-text {
  font-size: 14px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
  white-space: pre-wrap;
  word-break: break-all;
}

.comment-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.comment-img {
  max-width: 120px;
  max-height: 120px;
  border-radius: 8px;
  object-fit: cover;
  cursor: zoom-in;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

/* ---------- Replies ---------- */
.comment-replies {
  margin-top: 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 10px 14px;
}

.reply-item {
  padding: 4px 0;
}

.reply-username {
  font-size: 13px;
  font-weight: 500;
  color: #8ab4ff;
}

.reply-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
}

.reply-meta {
  margin-top: 2px;
}

.show-more-replies {
  background: none;
  border: none;
  color: #8ab4ff;
  font-size: 12px;
  cursor: pointer;
  padding: 6px 0 2px;
  opacity: 0.8;
}

.show-more-replies:hover {
  opacity: 1;
}

/* ---------- Load more ---------- */
.load-more {
  padding: 24px;
  display: flex;
  justify-content: center;
}

.load-more-btn {
  padding: 10px 32px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 100px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.load-more-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ---------- Mobile ---------- */
@media (max-width: 768px) {
  .comments-panel {
    width: 100%;
    height: 90vh;
    border-radius: 20px 20px 0 0;
    position: fixed;
    bottom: 0;
  }

  .comment-item {
    padding: 12px 16px;
  }
}
</style>
