# 🚀 NodePass WebUI

![Version](https://img.shields.io/badge/version-1.1.1-blue.svg)

一个现代化的 NodePass 管理界面，基于 Next.js 14、HeroUI 和 TypeScript 构建。提供实时隧道监控、流量统计和端点管理功能。

## ✨ 主要特性

- 🎯 **实时监控**: 通过 Server-Sent Events (SSE) 实现实时隧道状态更新
- 📊 **流量统计**: 可视化显示隧道流量数据和性能指标
- 🔧 **端点管理**: 完整的端点 CRUD 操作和状态监控
- 🎨 **现代UI**: 基于 HeroUI 的响应式设计，支持深色/浅色主题
- 📱 **移动适配**: 完整的移动端响应式布局，支持各种设备访问
- 🐳 **Docker化**: 开箱即用的 Docker 部署方案
- 🔒 **SSL 自签名证书支持**：自动兼容 HTTPS 自签名证书

## 📸 界面预览

| | | |
|---|---|---|
| ![截图0](00.png) | ![截图1](01.png) | ![截图2](02.png) |
| ![截图3](03.png) | ![截图4](04.png) | ![截图5](05.png) |

## 🔒 SSL 自签名证书支持

本系统已内置对 SSL 自签名证书的支持，当连接到使用自签名证书的 HTTPS NodePass 端点时：

### 自动处理的场景
- ✅ 创建、启动、停止、删除隧道实例
- ✅ SSE 事件流连接和监听
- ✅ 端点连接测试和验证
- ✅ 实时日志和状态更新

### 技术实现
- 服务器端 API 调用使用自定义 HTTPS Agent，设置 `rejectUnauthorized: false`
- SSE 服务连接自动检测 HTTPS 并跳过 SSL 证书验证
- 所有 NodePass API 调用都支持自签名证书


### 安全说明
- 自签名证书支持仅在服务器端 API 调用中启用
- 浏览器端连接仍受浏览器安全策略限制
- 建议在生产环境中使用有效的 SSL 证书

## 🏗️ 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI 组件库**: HeroUI (NextUI v2)
- **样式框架**: Tailwind CSS
- **动画库**: Framer Motion
- **数据库**: PostgreSQL + Prisma ORM
- **实时通信**: Server-Sent Events (SSE)
- **类型安全**: TypeScript + Zod 验证
- **包管理器**: pnpm

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

我们提供了完整的 Docker 部署方案，支持：
- 🐳 预构建镜像快速部署
- 📦 本地构建部署
- 🔧 独立容器部署
- 🛡️ 生产环境部署

> ⚠️ **重要提醒：首次部署说明**
> 
> 系统首次部署时会自动初始化并创建管理员账户。请在部署后立即查看日志获取登录信息：
> ```bash
> # 如果使用 Docker Plugin
> docker compose logs
> # 或使用独立安装的 docker-compose
> docker-compose logs
> 
> # 你将看到如下信息：
> ================================
> 🚀 NodePass 系统初始化完成！
> ================================
> 管理员账户信息：
> 用户名: nodepass
> 密码: xxxxxxxxxx
> ================================
> ⚠️  请妥善保存这些信息！
> ================================
> ```

> 📚 查看 [Docker 完整部署文档](DOCKER.md) 了解详细信息

### 方式二：本地开发

#### 前提条件

- Node.js 18+
- pnpm
- PostgreSQL 数据库

#### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/Mecozea/nodepass-webui.git
cd nodepass-webui

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，设置数据库连接等配置

# 4. 初始化数据库
pnpm db:generate
pnpm db:migrate

# 5. 启动开发服务
pnpm dev:all
```

访问：
- 前端界面: http://localhost:3000
- 后端 SSE 服务: http://localhost:3001

## 🛠️ 开发指南

### 项目结构

```
nodepass-webui/
├── app/                    # Next.js App Router 页面
├── components/             # React 组件
├── lib/                   # 工具库和配置
├── prisma/                # 数据库模式和迁移
├── scripts/               # 构建和部署脚本
└── types/                 # TypeScript 类型定义
```

### 数据库配置

项目使用 PostgreSQL 作为主数据库，通过 Prisma ORM 进行管理：

```bash
# 创建新迁移
pnpm exec prisma migrate dev --name your_migration_name

# 重置数据库
pnpm exec prisma migrate reset

# 查看数据库
pnpm exec prisma studio
```

## 🚦 系统要求

### 最低要求
- CPU: 1 核心
- 内存: 512MB
- 存储: 1GB

### 推荐配置
- CPU: 2+ 核心
- 内存: 1GB+
- 存储: 5GB+

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 [MIT 许可证](LICENSE) 开源。

## 📞 支持

- 🐛 问题报告: [GitHub Issues](https://github.com/mecozea/nodepass-webui/issues)
- 📖 文档: [项目 Wiki](https://github.com/mecozea/nodepass-webui/wiki)
- 💬 社区讨论: [GitHub Discussions](https://github.com/mecozea/nodepass-webui/discussions)
- 🐳 Docker 部署: [Docker 指南](DOCKER.md)

---

⭐ 如果这个项目对你有帮助，请给我们一个 Star！
