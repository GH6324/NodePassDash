# 🚀 NodePassDash

![Version](https://img.shields.io/badge/version-2.0.1-blue.svg)

NodePassDash是一个现代化的 NodePass 管理界面，基于 Go 后端 + Next.js 14、HeroUI 和 TypeScript 构建。提供实时隧道监控、流量统计和端点管理功能。

> **⚠️ 重大版本升级通知**  
> **v2.0.0 是一个重大的架构迁移版本！** 从 Node.js 后端完全重构为 Go 后端，带来了更高的性能和稳定性。 
> 
> ***升级前请务必备份好你的数据！*** 新版本支持数据迁移，但建议在安全的环境中先进行测试。

## ✨ 主要特性

- 🚀 **高性能 Go 后端**: 完全重构的 Go 后端，性能提升 300%+，内存占用降低 60%
- 🎯 **实时监控**: 通过 Server-Sent Events (SSE) 实现实时隧道状态更新
- 📊 **流量统计**: 可视化显示隧道流量数据和性能指标
- 🎨 **现代UI**: 基于 HeroUI 的响应式设计，支持深色/浅色主题
- 📱 **移动适配**: 完整的移动端响应式布局，支持各种设备访问
- 🐳 **容器化**: 开箱即用的 Docker 部署方案
- 🔧 **命令行工具**: 支持密码重置和自定义端口等管理功能

## 📸 界面预览

| | | |
|---|---|---|
| ![截图0](docs/00.png) | ![截图1](docs/01.png) | ![截图2](docs/02.png) |
| ![截图3](docs/03.png) | ![截图4](docs/04.png) | ![截图5](docs/05.png) |

## 📂 目录结构（简化）
```text
├─ app/                 前端页面 (Next.js App Router)
│  ├─ ...
├─ internal/            Go 业务代码
│  ├─ api/              HTTP 处理器 / 路由
│  ├─ sse/              SSE Manager & Service
│  └─ ...
├─ cmd/server/          Go 入口 (`main.go`)
├─ public/              SQLite 数据库 / 静态资源
├─ dist/                ⚙️ 前端构建产物（由 `pnpm build` 生成）
├─ Dockerfile           多阶段镜像构建
└─ scripts/             构建辅助脚本
```

## ⚡️ 快速开始

<div style="display: flex; align-items: center; gap: 12px;">
  <a href="https://dash.nodepass.eu/">
    <img src="https://img.shields.io/badge/点击体验_Demo-000?style=for-the-badge&logo=heroui&logoColor=white&labelColor=000" alt="Deploy to NodePassDash">
  </a>
  <span><strong>演示账号：</strong> <code>nodepass</code> / <code>np123456</code></span>
</div>

> ⚠️ **重要提醒：演示环境，请勿更改密码，请勿填写任何敏感信息**

我们提供三种部署方式，请根据你的需求选择：

### 🐳 方式一：Docker 部署（推荐）

> 适合生产环境，开箱即用，自动处理依赖和环境配置。

📚 查看 [Docker 完整部署文档](docs/DOCKER.md) 了解详细配置

### 📦 方式二：二进制部署

> 适合 VPS/服务器环境，性能最优，支持 systemd 服务管理。

📚 查看 [二进制部署文档](docs/BINARY.md) 了解详细配置

### 🛠️ 方式三：开发环境

> 适合开发者本地开发和调试。

📚 查看 [开发环境文档](docs/DEVELOPMENT.md) 了解完整开发流程

## 🔧 命令行工具

NodePassDash v2.0.0 提供了命令行参数来管理和配置应用：

### 基本参数

```bash
# 指定端口启动（默认 3000）
./nodepassdash --port 8080

# 显示帮助信息
./nodepassdash --help

# 显示版本信息
./nodepassdash --version
```

### 管理工具

```bash
# 重置管理员密码
./nodepassdash --reset-pwd
# 系统会提示输入新的用户名和密码

# 数据库维护（检查和修复）
./nodepassdash --db-check

# 清理日志文件（保留最近30天）
./nodepassdash --clean-logs
```

### Docker 环境下使用

```bash
# 在运行中的容器内重置密码
docker exec -it nodepassdash ./nodepassdash --reset-pwd

# 使用自定义端口启动容器
docker run -d \
  --name nodepassdash \
  -p 8080:8080 \
  ghcr.io/nodepassproject/nodepassdash:latest \
  ./nodepassdash --port 8080
```

### 配置文件位置

- 数据库文件: `./public/sqlite.db`
- 日志文件: `./logs/`
- 配置目录: `./public/`

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b features/amazing-features`)
3. 提交更改 (`git commit -m 'Add some amazing features'`)
4. 推送到分支 (`git push origin features/samazing-features`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 [BSD-3-Clause 许可证](LICENSE) 开源。

## 📞 支持

- 🐛 问题报告: [GitHub Issues](https://github.com/NodePassProject/NodePassDash/issues)
- 🐳 Docker 部署: [Docker 指南](docs/DOCKER.md)
- 💬 社区讨论: [Telegram 群组](https://t.me/NodePassGroup)
- 📢 频道: [Telegram 频道](https://t.me/NodePassChannel)

---

⭐ 如果这个项目对你有帮助，请给我们一个 Star！
