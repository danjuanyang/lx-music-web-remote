# LX Music Web Remote

基于 [LX Music 桌面版](https://github.com/lyswhut/lx-music-desktop) 开放 API 的 Web 端远程控制与歌词展示界面。

## 功能特性

- **实时歌词滚动**：当前行高亮，非活动行高斯模糊渐变效果
- **多平台评论**：支持查看酷我、网易云、QQ音乐、酷狗、咪咕等平台的热门/最新评论
- **播放控制**：播放 / 暂停、上一曲 / 下一曲、进度拖拽跳转
- **专辑封面展示**：背景模糊跟随封面颜色
- **音频频谱动画**：Canvas 实时可视化
- **字体自定义**：支持系统字体切换及自定义字体加载
- **SSE 实时同步**：Server-Sent Events 实时状态同步，断线自动重连
- **响应式布局**：适配桌面横屏和移动端竖屏
- **快捷键支持**：空格键控制播放/暂停，ESC 键关闭弹窗

## 界面预览

- **桌面横屏模式**：左侧显示专辑封面、歌曲信息、播放控件和频谱；右侧为歌词滚动区域。
- **移动竖屏模式**：上方紧凑展示封面与控件，下方歌词区域最大化。
- **评论面板**：点击评论按钮唤起悬浮面板，支持多平台标签切换及热门/最新评论筛选。

## 技术栈

- Vue 3 + Composition API + TypeScript
- Vite 5
- SSE（Server-Sent Events）实时通信
- LX Music Open API（HTTP REST + SSE）
- Canvas 频谱动画
- FontFace API 自定义字体加载

## 前置条件

- [LX Music 桌面版](https://github.com/lyswhut/lx-music-desktop) 已安装并运行
- 在 LX Music 设置中开启 **「开放API」** 功能（默认端口 `9527`）
- Node.js >= 18
-  (可选) Nginx：用于生产环境部署及第三方音乐平台 API 代理

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:2222）
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```



**注意**：开发服务器会自动将 `/lx-api` 路径代理到 `http://localhost:9527`。如果 LX Music 的 API 端口不是 `9527`，请修改 [vite.config.ts](javascript:void(0)) 中 `proxy.target`。



### 生产部署 (Nginx)

项目根目录提供了 [nginx.conf](nginx.conf) 配置文件，适用于生产环境部署。该配置包含：

1. **静态资源服务**：开启 Gzip 压缩，设置长期缓存策略。
2. **LX Music API 代理**：将 `/lx-api` 请求转发至本地 LX Music 服务，并优化了 SSE 长连接配置。
3. **第三方音乐平台代理**：内置了酷我、网易云、QQ音乐、酷狗、咪咕等平台的搜索与评论 API 反向代理，解决跨域问题。

**部署步骤：**

1. 执行 `npm run build` 生成 [dist](javascript:void(0)) 目录。
2. 将 [dist](javascript:void(0)) 目录下的文件复制到 Nginx 的 [html](javascript:void(0)) 目录（或配置中的 `root` 路径）。
3. 将根目录下的 [nginx.conf](javascript:void(0)) 替换 Nginx 的主配置文件，或将其内容合并到你的 Nginx 配置中。
4. 重启 Nginx。

## 项目结构

```
src/
├── App.vue                  # 主应用组件，状态管理与 SSE 事件监听
├── main.ts                  # 入口文件
├── style.css                # 全局样式
├── components/
│   ├── SongInfo.vue         # 专辑封面 + 歌曲名/歌手 + 字体设置
│   ├── LyricsDisplay.vue    # 歌词滚动展示（高斯模糊效果）
│   ├── PlayerControls.vue   # 播放按钮 + 进度条 + 频谱可视化
│   └── CommentsView.vue     # 多平台评论查看组件
├── services/
│   ├── api.ts               # HTTP API 封装（状态/歌词/播控/进度跳转）
│   ├── websocket.ts         # SSE 连接与事件分发
│   ├── cover.ts             # 封面获取服务
│   └── comment/             # 第三方音乐平台评论服务
│       ├── index.ts         # 评论服务统一入口
│       ├── kw.ts            # 酷我音乐
│       ├── wy.ts            # 网易云音乐
│       ├── tx.ts            # QQ音乐
│       ├── kg.ts            # 酷狗音乐
│       ├── mg.ts            # 咪咕音乐
│       ├── types.ts         # 类型定义
│       └── utils.ts         # 工具函数
└── types/
    └── index.ts             # TypeScript 接口定义
public/
└── fonts/                   # 自定义字体目录
    └── fonts.json           # 字体配置文件
```

## API 对接

本项目对接 LX Music 桌面版的 [开放 API](https://lxmusic.toside.cn/desktop/open-api)。

### HTTP 接口（通过 Vite/Nginx 代理 `/lx-api` → `localhost:9527`）

| 接口 | 方法 | 说明 |
|------|------|------|
| `/status?filter=...` | GET | 获取当前播放状态和歌曲信息 |
| `/lyric` | GET | 获取当前歌曲 LRC 歌词 |
| `/play` | POST | 播放 |
| `/pause` | POST | 暂停 |
| `/skip-next` | POST | 下一曲 |
| `/skip-prev` | POST | 上一曲 |
| `/seek?offset=` | GET | 跳转播放进度（秒） |

### SSE 实时事件（`/subscribe-player-status`）

| 事件名 | 说明 |
|--------|------|
| `status` | 播放/暂停状态变化 |
| `name` | 歌曲名变化（切歌信号） |
| `singer` | 歌手名变化 |
| `albumName` | 专辑名变化 |
| `picUrl` | 封面图 URL 变化 |
| `progress` | 播放进度更新（秒） |
| `duration` | 歌曲时长更新（秒） |

> 注意：`picUrl` 不在 SSE 默认订阅字段中，需通过 `filter` 参数显式指定。

## 自定义歌词字体

将字体文件（`.woff2`、`.ttf`、`.otf` 等）放入 `public/fonts/` 目录，并编辑 `public/fonts/fonts.json`：

```json
[
  { "name": "My Font", "file": "MyFont.woff2" },
  { "name": "Another Font", "file": "AnotherFont.ttf" }
]
```

字体会在页面加载时通过 FontFace API 注册，之后可在歌词字体设置中选择。

## 许可证

MIT