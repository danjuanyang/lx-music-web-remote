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
        target: 'https://app.c.nf.migu.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-mg-comment/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1',
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
        target: 'https://app.c.nf.migu.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-mg-search/, ''),
        headers: {
          Referer: 'https://music.migu.cn/',
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