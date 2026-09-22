# 智能体开发平台（原型系统）

> 高级软件工程综合大作业 · 第 3 组
> 选题：某公司「AI模型与智能体统一研发平台软件采购项目」之子项目——**智能体开发平台**

## 项目简介

本仓库为智能体开发平台的**原型系统**，用于大作业「原型系统及演示视频」部分。
目前已完成的页面：

| 页面 | 状态 | 说明 |
| ---- | ---- | ---- |
| 登录页 | ✅ 已完成 | 账号/密码登录 + 图形验证码 + 记住我，响应式布局 |
| 工作台首页 | ✅ 已完成（占位） | 登录后的平台首页框架，含功能模块入口占位 |
| 智能体管理 / 知识库 / 工作流 / 对话调试 / 模型市场 / 发布集成 | 🔨 待开发 | 后续迭代 |

## 技术栈

- **Vue 3**（Composition API + `<script setup>`）
- **Vite 7** 构建工具
- **Element Plus** 组件库
- **Vue Router 4**（hash 模式路由）
- **Pinia** 状态管理

登录接口目前为**前端 Mock 实现**（[src/api/auth.js](src/api/auth.js)），后续接入真实后端时仅需替换该文件。

## 快速开始

环境要求：Node.js ≥ 20.19

```bash
# 1. 安装依赖（首次）
npm install

# 2. 启动开发服务器
npm run dev
# 浏览器访问 http://localhost:5173

# 3. 打包生产版本（用于部署/演示）
npm run build && npm run preview
```

### 演示账号

| 账号 | 密码 | 角色 |
| ---- | ---- | ---- |
| `admin` | `admin123` | 管理员 |
| `user` | `user123` | 普通用户 |

## 目录结构

```
test1/
├── index.html                 # 入口 HTML
├── vite.config.js             # Vite 配置
├── public/                    # 静态资源（favicon 等）
└── src/
    ├── main.js                # 应用入口
    ├── App.vue                # 根组件
    ├── router/index.js        # 路由 + 登录守卫
    ├── stores/auth.js         # Pinia 登录状态管理
    ├── api/auth.js            # 登录接口（Mock）
    ├── components/            # 公共组件（Logo、验证码等）
    ├── views/                 # 页面
    │   ├── Login.vue          # 登录页
    │   └── Home.vue           # 工作台首页
    └── assets/styles/         # 全局样式
```

## GitHub 协作规范

### 分支模型

- `main`：主分支，只接受经过审查的合并（设置为保护分支）
- `feature/<模块名>`：功能分支，如 `feature/login`、`feature/agent-list`
- `fix/<问题描述>`：修复分支

### 提交规范（Conventional Commits）

```
feat: 新增登录页面
fix: 修复验证码刷新失败问题
docs: 更新 README
style: 调整登录页样式
refactor: 重构认证状态管理
```

### 协作流程

1. 每次开发前：`git pull` 拉取最新代码
2. 新建分支：`git checkout -b feature/你的模块`
3. 开发并提交（小步提交，一个提交只做一件事）
4. 推送分支：`git push -u origin feature/你的模块`
5. 在 GitHub 上发起 **Pull Request**，由组员 Code Review 后合并到 `main`
6. **禁止直接 push 到 `main`**

### 合并冲突处理

提交前先 `git pull origin main` 并解决冲突；拿不准时在群里沟通，不要强制覆盖（`git push -f` 禁用）。

## 团队成员分工

| 姓名 | 学号 | 角色 | 负责内容 | 权重 |
| ---- | ---- | ---- | ---- | ---- |
| （待填写） | | | | |

> 后续在技术建议书、实施方案、答辩 PPT、演示视频等材料中，需标注各部分完成成员。
