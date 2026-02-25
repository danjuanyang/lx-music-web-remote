# LX Music Web Remote

LX Music 桌面版的Web端远程控制器

## 功能特性

- 🎵 实时歌词显示
- 🎮 播放控制（播放/暂停、上一曲/下一曲）
- 🔊 音量控制
- ⏱️ 播放进度控制
- 📱 响应式设计，支持手机和平板
- 🔄 实时状态同步
- 🌐 WebSocket连接，断线自动重连

## 技术栈

- Vue 3 + TypeScript
- Vite
- WebSocket 实时通信
- RESTful API

## 快速开始

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 预览构建结果
```bash
npm run preview
```

## 使用说明

1. 确保LX Music桌面版已开启Web远程控制功能
2. 在浏览器中访问 `http://localhost:9527/remote`
3. 等待连接成功后即可远程控制播放器

## 项目结构

```
src/
├── components/           # Vue组件
│   ├── SongInfo.vue     # 歌曲信息显示
│   ├── LyricsDisplay.vue # 歌词显示
│   └── PlayerControls.vue # 播放控制
├── services/            # 服务层
│   ├── api.ts          # API服务
│   └── websocket.ts    # WebSocket服务
├── types/              # TypeScript类型定义
├── assets/             # 静态资源
└── App.vue             # 主应用组件
```

## API 接口

### HTTP API
- `GET /api/current` - 获取当前播放状态和歌曲信息
- `POST /api/play-pause` - 播放/暂停控制
- `POST /api/next` - 下一曲
- `POST /api/previous` - 上一曲
- `POST /api/volume/:level` - 设置音量
- `POST /api/seek/:time` - 跳转播放位置
- `GET /api/lyrics` - 获取当前歌词

### WebSocket 事件
- `player-state` - 播放状态变化
- `song-change` - 歌曲切换
- `progress-update` - 播放进度更新
- `lyric-update` - 歌词更新

## 开发计划

- [x] 基础项目结构
- [x] 播放控制界面
- [x] 歌词显示功能
- [x] 实时状态同步
- [ ] 桌面端API实现
- [ ] 错误处理优化
- [ ] 界面美化
- [ ] 移动端优化

## 贡献

欢迎提交Issue和Pull Request!