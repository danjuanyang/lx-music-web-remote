// 封面服务 - 简化版，仅使用本地数据和默认封面
interface CoverSearchResult {
  success: boolean
  coverUrl?: string
  error?: string
}

class CoverService {
  private cache = new Map<string, string>()

  // 生成缓存key
  private getCacheKey(artist: string, album: string): string {
    return `${artist.toLowerCase()}-${album.toLowerCase()}`.replace(/\s+/g, '')
  }

  // 从缓存获取封面
  private getCachedCover(artist: string, album: string): string | null {
    const key = this.getCacheKey(artist, album)
    return this.cache.get(key) || null
  }

  // 缓存封面URL
  private setCachedCover(artist: string, album: string, url: string): void {
    const key = this.getCacheKey(artist, album)
    this.cache.set(key, url)
  }

  // 简化的封面搜索 - 仅使用传入的数据，不进行网络请求
  async searchCover(artist: string, album: string, songName?: string, providedCoverUrl?: string): Promise<CoverSearchResult> {
    if (!artist || !album) {
      return { success: false, error: '缺少艺术家或专辑信息' }
    }

    // 检查缓存
    const cached = this.getCachedCover(artist, album)
    if (cached) {
      return { success: true, coverUrl: cached }
    }

    // 如果提供了封面URL，直接使用
    if (providedCoverUrl) {
      this.setCachedCover(artist, album, providedCoverUrl)
      return { success: true, coverUrl: providedCoverUrl }
    }

    // 生成默认封面（使用艺术家和专辑名称生成色彩）
    const defaultCoverUrl = this.generateDefaultCover(artist, album)
    this.setCachedCover(artist, album, defaultCoverUrl)

    return { success: true, coverUrl: defaultCoverUrl }
  }

  // 生成基于艺术家和专辑的默认封面
  private generateDefaultCover(artist: string, album: string): string {
    // 基于艺术家和专辑名生成颜色
    const text = (artist + album).toLowerCase()
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash)
    }

    const hue = Math.abs(hash) % 360
    const saturation = 70 + (Math.abs(hash >> 8) % 30) // 70-100%
    const lightness = 45 + (Math.abs(hash >> 16) % 20) // 45-65%

    // 生成SVG封面
    const svgContent = `
      <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:hsl(${hue}, ${saturation}%, ${lightness}%);stop-opacity:1" />
            <stop offset="100%" style="stop-color:hsl(${(hue + 60) % 360}, ${saturation}%, ${lightness - 10}%);stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="200" height="200" fill="url(#grad)"/>
        <circle cx="100" cy="100" r="60" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="2"/>
        <circle cx="100" cy="100" r="20" fill="rgba(255,255,255,0.2)"/>
        <text x="100" y="160" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial" font-size="12" font-weight="bold">
          ${artist.slice(0, 8)}
        </text>
        <text x="100" y="175" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-family="Arial" font-size="10">
          ${album.slice(0, 10)}
        </text>
      </svg>
    `

    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgContent)))}`
  }

  // 清除缓存
  clearCache(): void {
    this.cache.clear()
  }

  // 获取缓存大小
  getCacheSize(): number {
    return this.cache.size
  }
}

export const coverService = new CoverService()