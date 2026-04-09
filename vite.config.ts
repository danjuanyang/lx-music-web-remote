import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 2222,
    host: true,
    proxy: {
      // 代理LX Music API请求
      '/lx-api': {
        target: 'http://localhost:9527',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lx-api/, ''),
      },
      // 代理酷我评论API请求，解决CORS问题
      '/api-comment/kw': {
        target: 'http://ncomment.kuwo.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-comment/, ''),
        headers: {
          'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 9;)',
        },
      },
      // 代理酷我搜索API请求，用于通过歌曲名+歌手获取songmid
      '/api-search': {
        target: 'http://search.kuwo.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-search/, ''),
      },
      // 代理网易云评论和搜索API
      '/api-wy-comment': {
        target: 'https://music.163.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-wy-comment/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
          Referer: 'https://music.163.com/',
          Origin: 'https://music.163.com',
        },
      },
      // 代理腾讯/QQ音乐评论和搜索API
      '/api-tx-comment': {
        target: 'https://u.y.qq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-tx-comment/, ''),
        headers: {
          Referer: 'https://y.qq.com/',
          Origin: 'https://y.qq.com',
        },
      },
      // 代理腾讯/QQ音乐最新评论API (c.y.qq.com)
      '/api-tx-newcomment': {
        target: 'http://c.y.qq.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-tx-newcomment/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; WOW64; Trident/5.0)',
        },
      },
      // 代理酷狗评论API（签名在客户端计算）
      '/api-kg-comment': {
        target: 'http://m.comment.service.kugou.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-kg-comment/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36 Edg/107.0.1418.24',
        },
      },
      // 代理咪咕评论API
      '/api-mg-comment': {
        target: 'https://music.migu.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-mg-comment/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/86.0.4195.1 Safari/537.36',
          Referer: 'https://music.migu.cn',
        },
      },
      // 代理网易云搜索API
      '/api-wy-search': {
        target: 'https://music.163.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-wy-search/, ''),
        headers: {
          Referer: 'https://music.163.com/',
        },
      },
      // 代理酷狗搜索API
      '/api-kg-search': {
        target: 'https://songsearch.kugou.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-kg-search/, ''),
        headers: {
          Referer: 'https://www.kugou.com/',
        },
      },
      // 代理咪咕搜索API
      '/api-mg-search': {
        target: 'https://jadeite.migu.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-mg-search/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; U; Android 11.0.0; zh-cn; MI 11 Build/OPR1.170623.032) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
        },
      },
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})