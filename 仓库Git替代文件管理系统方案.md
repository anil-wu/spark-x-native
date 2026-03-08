# 仓库 Git 替代文件管理系统方案

> 基于 OpenCode 工作空间 + Git 命令行 + 本地 Gitea 容器

## 一、架构设计

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     OpenCode Agent 节点                           │
│                                                                  │
│  context.directory = /1/123/          工作空间 (本地 Git 仓库)  │
│  ├── .git/                                                        │
│  ├── src/                                                         │
│  └── ...                                                          │
│                            │                                      │
│                            │ git push/pull                        │
│                            ▼                                      │
└───────────────────────────┼───────────────────────────────────────┘
                             │
                             ▼
┌───────────────────────────────────────────────────────────────────┐
│                  本地 Gitea 容器                                   │
│  (Docker 部署，提供 Web UI + Git 远程仓库)                          │
│                                                                  │
│  仓库 URL: http://gitea:3000/{user}/project.git                  │
└───────────────────────────────────────────────────────────────────┘
```

### 1.2 目录结构

```
┌─────────────────────────────────────────────────────────────────┐
│ OpenCode 工作空间                                                │
│ /1/123/                          ← context.directory           │
│ ├── repo1/                       # Git 仓库 1                   │
│ │   ├── .git/                                              │
│ │   ├── src/                                                │
│ │   └── package.json                                        │
│ ├── repo2/                       # Git 仓库 2                   │
│ │   ├── .git/                                              │
│ │   └── ...                                                 │
│ ├── build/                      构建输出                         │
│ ├── logs/                       日志                            │
│ └── userinfo_1.json            用户信息                         │
└─────────────────────────────────────────────────────────────────┘
                             │
                        git remote
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ Gitea 容器 (本地)                                               │
│ http://gitea:3000/1/project_123.git                            │
│ (用户 1 的 project_123 仓库)                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Gitea Docker 部署

```yaml
# docker-compose.yml
services:
  gitea:
    image: gitea/gitea:1.21
    container_name: sparkx-gitea
    ports:
      - "3000:3000"
      - "2222:22"
    volumes:
      - gitea-data:/data
    environment:
      - USER_UID=1000
      - GITEA__database__DB_TYPE=sqlite3
      - GITEA__server__ROOT_URL=http://localhost:3000
      - GITEA__server__HTTP_PORT=3000
      - GITEA__server__SSH_PORT=2222
      - GITEA__service__DISABLE_REGISTRATION=true

volumes:
  gitea-data:
```

---

## 二、核心工具函数

### 2.1 Git 执行函数

```typescript
import { spawn } from 'node:child_process';

function execGit(args: string[], cwd: string, timeout: number = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('git', args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';
    
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`git command timeout: ${args.join(' ')}`));
    }, timeout);
    
    proc.stdout.on('data', d => stdout += d);
    proc.stderr.on('data', d => stderr += d);
    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr || `git exited with code ${code}`));
    });
  });
}
```

### 2.2 路径解析

```typescript
import { join } from 'node:path';

// context.directory 格式: /{user_id}/{project_id}/
function parseContextDirectory(dir: string): { userId: number; projectId: number } {
  const normalized = dir.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
  const segments = normalized.split('/').filter(Boolean);
  return {
    userId: parseInt(segments[0], 10),
    projectId: parseInt(segments[1], 10)
  };
}

// 获取仓库目录
// context.directory 下可以有多个仓库: repo1/, repo2/, ...
function getRepoDir(contextDir: string, repo?: string): string {
  if (repo) {
    return join(contextDir, repo);
  }
  return contextDir;
}
```

### 2.3 用户信息获取

```typescript
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface SparkxUserInfo {
  userid: number;
  username: string;
  email: string;
  token: string;
}

async function getUserInfo(directory: string, userId: number): Promise<SparkxUserInfo> {
  const userInfoPath = join(directory, `userinfo_${userId}.json`);
  if (existsSync(userInfoPath)) {
    const data = JSON.parse(readFileSync(userInfoPath, 'utf-8'));
    return {
      userid: userId,
      username: data.username || `user_${userId}`,
      email: data.email || `user${userId}@sparkx.local`,
      token: data.token || ''
    };
  }
  return { userid: userId, username: `user_${userId}`, email: `user${userId}@sparkx.local`, token: '' };
}
```

### 2.4 Gitea 远程仓库 URL

```typescript
function getGiteaRepoUrl(userId: number, projectId: number, repo?: string): string {
  const giteaUrl = process.env.GITEA_URL || 'http://gitea:3000';
  const repoName = repo || `project_${projectId}`;
  return `${giteaUrl}/${userId}/${repoName}.git`;
}
```

---

## 三、OpenCode 工具实现

### 3.1 初始化仓库

```typescript
import { mkdirSync, existsSync } from 'node:fs';

export default tool({
  description: "初始化 Git 仓库并配置远程 Gitea",
  args: {
    userid: tool.schema.number().int().positive(),
    projectId: tool.schema.number().int().positive().optional(),
    repo: tool.schema.string().optional().describe("仓库目录名，默认使用 projectId"),
  },
  async execute(args, context) {
    const { userId, projectId } = parseContextDirectory(context.directory);
    const userIdNum = args.userid || userId;
    const projectIdNum = args.projectId || projectId;
    
    const repoDir = context.directory;
    
    if (!existsSync(repoDir)) {
      mkdirSync(repoDir, { recursive: true });
    }
    
    await execGit(['init'], repoDir);
    
    const userInfo = await getUserInfo(context.directory, userIdNum);
    await execGit(['config', 'user.email', userInfo.email], repoDir);
    await execGit(['config', 'user.name', userInfo.username], repoDir);
    
    await execGit(['add', '-A'], repoDir);
    const status = await execGit(['status', '--porcelain'], repoDir);
    let commitHash: string | null = null;
    if (status.trim()) {
      await execGit(['commit', '-m', 'Initial commit'], repoDir);
      commitHash = (await execGit(['rev-parse', 'HEAD'], repoDir)).substring(0, 7);
    }
    
    const giteaUrl = getGiteaRepoUrl(userIdNum, projectIdNum);
    await execGit(['remote', 'add', 'origin', giteaUrl], repoDir);
    
    return {
      success: true,
      repository: {
        userId: userIdNum,
        projectId: projectIdNum,
        path: repoDir,
        remote: 'origin',
        remoteUrl: giteaUrl,
        branch: 'main'
      },
      commit: commitHash
    };
  }
});
```

### 3.2 状态查询

```typescript
export default tool({
  description: "Git 状态",
  args: {
    userid: tool.schema.number().int().positive(),
    projectId: tool.schema.number().int().positive().optional(),
    repo: tool.schema.string().optional(),
  },
  async execute(args, context) {
    const repoDir = getRepoDir(context.directory, args.repo);
    
    const status = await execGit(['status', '--porcelain=v1'], repoDir);
    const branch = await execGit(['branch', '--show-current'], repoDir).catch(() => 'main');
    
    const staged: any[] = [];
    const unstaged: any[] = [];
    const untracked: any[] = [];
    
    for (const line of status.split('\n').filter(Boolean)) {
      const idx = line.substring(0, 2);
      const path = line.substring(3);
      if (idx === '??') untracked.push({ path, status: 'untracked' });
      else if (idx[1] !== ' ') unstaged.push({ path, status: 'modified' });
      else staged.push({ path, status: 'staged' });
    }
    
    return { repo: args.repo, branch, staged, unstaged, untracked };
  }
});
```

### 3.3 提交变更

```typescript
export default tool({
  description: "Git 提交",
  args: {
    userid: tool.schema.number().int().positive(),
    projectId: tool.schema.number().int().positive().optional(),
    repo: tool.schema.string().optional(),
    message: tool.schema.string(),
  },
  async execute(args, context) {
    const { userId } = parseContextDirectory(context.directory);
    const repoDir = getRepoDir(context.directory, args.repo);
    
    const userInfo = await getUserInfo(context.directory, args.userid || userId);
    await execGit(['config', 'user.email', userInfo.email], repoDir);
    await execGit(['config', 'user.name', userInfo.username], repoDir);
    
    await execGit(['add', '-A'], repoDir);
    const status = await execGit(['status', '--porcelain'], repoDir);
    if (!status.trim()) {
      return { success: false, message: 'No changes to commit' };
    }
    
    await execGit(['commit', '-m', args.message], repoDir);
    const commitHash = (await execGit(['rev-parse', 'HEAD'], repoDir)).substring(0, 7);
    
    return { success: true, repo: args.repo, commit: { hash: commitHash, message: args.message } };
  }
});
```

### 3.4 分支操作

```typescript
export default tool({
  description: "Git 分支管理",
  args: {
    userid: tool.schema.number().int().positive(),
    projectId: tool.schema.number().int().positive().optional(),
    operation: tool.schema.enum(["list", "create", "switch", "delete"]),
    branchName: tool.schema.string(),
    baseBranch: tool.schema.string().optional(),
  },
  async execute(args, context) {
    const repoDir = getRepoDir(context.directory, args.repo);
    
    switch (args.operation) {
      case 'list': {
        const output = await execGit(['branch', '-a'], repoDir);
        return { 
          branches: output.split('\n').filter(Boolean).map(b => ({
            name: b.replace(/^\*?\s*/, '').trim(),
            isCurrent: b.includes('*')
          }))
        };
      }
      case 'create': {
        const base = args.baseBranch || 'main';
        await execGit(['checkout', '-b', args.branchName, base], repoDir);
        return { success: true, branch: args.branchName, base };
      }
      case 'switch': {
        await execGit(['checkout', args.branchName], repoDir);
        const hash = await execGit(['rev-parse', 'HEAD'], repoDir);
        return { success: true, branch: args.branchName, commit: hash.substring(0, 7) };
      }
      case 'delete': {
        await execGit(['branch', '-D', args.branchName], repoDir);
        return { success: true, branch: args.branchName, deleted: true };
      }
    }
  }
});
```

### 3.5 推送

```typescript
export default tool({
  description: "Git 推送到远程 Gitea",
  args: {
    userid: tool.schema.number().int().positive(),
    projectId: tool.schema.number().int().positive().optional(),
    repo: tool.schema.string().optional(),
    remote: tool.schema.string().default("origin"),
    branch: tool.schema.string().optional(),
    force: tool.schema.boolean().default(false),
  },
  async execute(args, context) {
    const repoDir = getRepoDir(context.directory, args.repo);
    const branch = args.branch || 'main';
    
    const pushArgs = ['push', args.remote, branch];
    if (args.force) pushArgs.push('--force');
    
    await execGit(pushArgs, repoDir);
    
    return { success: true, repo: args.repo, operation: 'push', remote: args.remote, branch };
  }
});
```

### 3.6 拉取

```typescript
export default tool({
  description: "Git 从远程 Gitea 拉取",
  args: {
    userid: tool.schema.number().int().positive(),
    projectId: tool.schema.number().int().positive().optional(),
    repo: tool.schema.string().optional(),
    remote: tool.schema.string().default("origin"),
    branch: tool.schema.string().optional(),
    rebase: tool.schema.boolean().default(false),
  },
  async execute(args, context) {
    const repoDir = getRepoDir(context.directory, args.repo);
    const branch = args.branch || 'main';
    
    const pullArgs = args.rebase 
      ? ['pull', '--rebase', args.remote, branch]
      : ['pull', args.remote, branch];
    
    await execGit(pullArgs, repoDir);
    const newHead = (await execGit(['rev-parse', 'HEAD'], repoDir)).substring(0, 7);
    
    return { success: true, repo: args.repo, operation: 'pull', remote: args.remote, branch, newHead };
  }
});
```

### 3.7 标签操作

```typescript
export default tool({
  description: "Git 标签管理",
  args: {
    userid: tool.schema.number().int().positive(),
    projectId: tool.schema.number().int().positive().optional(),
    operation: tool.schema.enum(["create", "list", "delete"]),
    tagName: tool.schema.string(),
    message: tool.schema.string().optional(),
  },
  async execute(args, context) {
    const repoDir = context.directory;
    
    switch (args.operation) {
      case 'create': {
        const tagArgs = ['tag', args.tagName];
        if (args.message) tagArgs.push('-m', args.message);
        await execGit(tagArgs, repoDir);
        const hash = await execGit(['rev-parse', 'HEAD'], repoDir);
        return { success: true, tag: args.tagName, commit: hash.substring(0, 7) };
      }
      case 'list': {
        const output = await execGit(['tag', '-l'], repoDir);
        return { tags: output.split('\n').filter(Boolean) };
      }
      case 'delete': {
        await execGit(['tag', '-d', args.tagName], repoDir);
        return { success: true, tag: args.tagName, deleted: true };
      }
    }
  }
});
```

### 3.8 历史记录

```typescript
export default tool({
  description: "Git 日志",
  args: {
    userid: tool.schema.number().int().positive(),
    projectId: tool.schema.number().int().positive().optional(),
    maxCount: tool.schema.number().int().positive().default(20),
  },
  async execute(args, context) {
    const repoDir = context.directory;
    
    const output = await execGit([
      'log', `--max-count=${args.maxCount}`,
      '--format=%H|%h|%s|%an|%ae|%ai'
    ], repoDir);
    
    return {
      commits: output.split('\n').filter(Boolean).map(line => {
        const [hash, shortHash, message, author, email, date] = line.split('|');
        return { hash, shortHash, message, author, email, date };
      })
    };
  }
});
```

### 3.9 差异比对

```typescript
export default tool({
  description: "Git 差异",
  args: {
    userid: tool.schema.number().int().positive(),
    projectId: tool.schema.number().int().positive().optional(),
    base: tool.schema.string(),
    target: tool.schema.string().optional(),
  },
  async execute(args, context) {
    const repoDir = context.directory;
    const base = args.base;
    const target = args.target || 'HEAD';
    
    const stat = await execGit(['diff', '--stat', `${base}...${target}`], repoDir);
    const diff = await execGit(['diff', `${base}...${target}`], repoDir);
    
    const summary = { filesChanged: 0, insertions: 0, deletions: 0 };
    const m1 = stat.match(/(\d+) files? changed/);
    if (m1) summary.filesChanged = parseInt(m1[1]);
    const m2 = stat.match(/(\d+) insertions?/);
    if (m2) summary.insertions = parseInt(m2[1]);
    const m3 = stat.match(/(\d+) deletions?/);
    if (m3) summary.deletions = parseInt(m3[1]);
    
    return { base, target, summary, diff };
  }
});
```

### 3.10 文件内容

```typescript
export default tool({
  description: "Git 查看文件",
  args: {
    userid: tool.schema.number().int().positive(),
    projectId: tool.schema.number().int().positive().optional(),
    path: tool.schema.string(),
    revision: tool.schema.string().optional(),
  },
  async execute(args, context) {
    const repoDir = context.directory;
    const ref = args.revision || 'HEAD';
    
    const content = await execGit(['show', `${ref}:${args.path}`], repoDir)
      .catch(() => null);
    
    if (!content) throw new Error(`File not found: ${args.path} at ${ref}`);
    
    return { path: args.path, revision: ref, content, size: content.length };
  }
});
```

### 3.11 远程仓库管理

```typescript
export default tool({
  description: "Git 远程仓库管理",
  args: {
    userid: tool.schema.number().int().positive(),
    projectId: tool.schema.number().int().positive().optional(),
    operation: tool.schema.enum(["list", "add", "remove"]),
    name: tool.schema.string().default("origin"),
    url: tool.schema.string().optional(),
  },
  async execute(args, context) {
    const repoDir = context.directory;
    
    switch (args.operation) {
      case 'list': {
        const output = await execGit(['remote', '-v'], repoDir);
        return { remotes: output.split('\n').filter(Boolean) };
      }
      case 'add': {
        if (!args.url) throw new Error('URL is required');
        await execGit(['remote', 'add', args.name, args.url], repoDir);
        return { success: true, name: args.name, url: args.url };
      }
      case 'remove': {
        await execGit(['remote', 'remove', args.name], repoDir);
        return { success: true, name: args.name };
      }
    }
  }
});
```

### 3.12 克隆仓库

```typescript
export default tool({
  description: "Git 克隆：从远程仓库克隆到本地",
  args: {
    userid: tool.schema.number().int().positive(),
    projectId: tool.schema.number().int().positive().optional(),
    url: tool.schema.string(),
    branch: tool.schema.string().optional(),
    depth: tool.schema.number().int().positive().optional(),
  },
  async execute(args, context) {
    const { userId } = parseContextDirectory(context.directory);
    const targetDir = context.directory;
    
    const cloneArgs = ['clone'];
    if (args.depth) cloneArgs.push('--depth', String(args.depth));
    if (args.branch) cloneArgs.push('--branch', args.branch);
    cloneArgs.push(args.url, targetDir);
    
    await execGit(cloneArgs, require('path').dirname(targetDir));
    
    const userInfo = await getUserInfo(context.directory, userId);
    await execGit(['config', 'user.email', userInfo.email], targetDir);
    await execGit(['config', 'user.name', userInfo.username], targetDir);
    
    return {
      success: true,
      operation: 'clone',
      url: args.url,
      branch: args.branch || 'default',
      path: targetDir
    };
  }
});
```

---

## 四、工具列表

| 工具 | 描述 |
|-----|------|
| `sparkx_git_init` | 初始化仓库 + 配置远程 Gitea |
| `sparkx_git_status` | 查看状态 |
| `sparkx_git_commit` | 提交变更 |
| `sparkx_git_branch` | 分支管理 |
| `sparkx_git_push` | 推送到 Gitea |
| `sparkx_git_pull` | 从 Gitea 拉取 |
| `sparkx_git_tag` | 标签管理 |
| `sparkx_git_log` | 查看历史 |
| `sparkx_git_diff` | 差异比对 |
| `sparkx_git_cat` | 查看文件 |
| `sparkx_git_remote` | 远程管理 |
| `sparkx_git_clone` | 克隆仓库 |

---

## 五、环境变量

```bash
# Gitea 地址
GITEA_URL=http://gitea:3000
```

---

## 六、与现有系统映射

| 旧系统 | Git 方式 |
|-------|---------|
| `softwares` 表 | Gitea 仓库 |
| `software_manifests` | Git commit |
| `file_versions` | Git blob |
| 版本号 | Git tag |

---

## 七、用户账号映射

### 7.1 用户信息文件

```json
// userinfo_{userid}.json
{
  "userid": 1,
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "token": "sparkx_token_xxx"
}
```

### 7.2 Git 用户配置

```typescript
await execGit(['config', 'user.email', userInfo.email], repoDir);
await execGit(['config', 'user.name', userInfo.username], repoDir);
```

---

## 八、SparkX 与 Gitea 映射

### 8.1 目录对应

```
SparkX 工作空间                         Gitea 仓库
────────────────────────────────────────────────────────────────
/1/123/                            →  http://gitea:3000/1/project_123.git
/1/123/repo1/                      →  http://gitea:3000/1/repo1.git
/2/456/client/                     →  http://gitea:3000/2/client.git
```

### 8.2 映射规则

| SparkX | Gitea | 说明 |
|--------|-------|------|
| user_id=1 | `/1/` | Gitea 用户目录 |
| repo="repo1" | `repo1.git` | 仓库名 = 目录名 |
| project_id | - | 不直接参与命名 |

---

## 九、数据表设计

### 9.1 表结构

```sql
-- SparkX 项目与 Gitea 仓库映射表
CREATE TABLE IF NOT EXISTS project_git_repos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  project_id BIGINT UNSIGNED NOT NULL COMMENT 'SparkX 项目 ID',
  user_id BIGINT UNSIGNED NOT NULL COMMENT 'SparkX 用户 ID',
  repo_name VARCHAR(128) NOT NULL COMMENT '仓库目录名',
  gitea_repo_url VARCHAR(512) NOT NULL COMMENT 'Gitea 仓库 URL',
  gitea_repo_path VARCHAR(256) NOT NULL COMMENT 'Gitea 仓库路径',
  default_branch VARCHAR(64) DEFAULT 'main',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY `uk_project_repo` (project_id, repo_name),
  KEY idx_user_repos (user_id),
  KEY idx_gitea_path (gitea_repo_path)
);

-- Gitea 用户配置表
CREATE TABLE IF NOT EXISTS gitea_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL COMMENT 'SparkX 用户 ID',
  gitea_username VARCHAR(128) NOT NULL COMMENT 'Gitea 用户名',
  gitea_token VARCHAR(512) COMMENT 'Gitea Personal Access Token',
  gitea_email VARCHAR(256) COMMENT 'Gitea 邮箱',
  is_default BOOLEAN DEFAULT FALSE COMMENT '是否为默认账号',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY `uk_user` (user_id)
);
```

### 9.2 创建/更新时机

#### gitea_users 表

| 操作 | 触发时机 | 说明 |
|-----|---------|------|
| 创建 | 用户首次配置 Gitea | 用户在 SparkX 中绑定 Gitea 账号时 |
| 更新 | 用户修改 Gitea 信息 | token 过期更换、用户名变更等 |
| 查询 | 每次 Git 操作前 | 获取用户 Gitea 凭证用于认证 |

```typescript
// 用户首次配置 Gitea 账号
async function createGiteaUser(userId: number, giteaUsername: string, giteaToken: string, email: string) {
  await db.insert('gitea_users').values({
    user_id: userId,
    gitea_username: giteaUsername,
    gitea_token: giteaToken,
    gitea_email: email,
    is_default: true
  });
}

// 用户更新 Gitea token
async function updateGiteaToken(userId: number, newToken: string) {
  await db.update('gitea_users')
    .set({ gitea_token: newToken, updated_at: new Date() })
    .where(eq('gitea_users.user_id', userId));
}
```

#### project_git_repos 表

| 操作 | 触发时机 | 说明 |
|-----|---------|------|
| 创建 | 执行 `sparkx_git_init` 时 | 首次初始化 Git 仓库 |
| 创建 | 用户添加新仓库到项目 | 项目下新增 Git 仓库 |
| 更新 | 仓库设置变更 | 默认分支、远程 URL 变更 |
| 查询 | 执行 push/pull 前 | 获取仓库 Gitea 路径 |

```typescript
// 初始化仓库时创建记录
async function createProjectRepo(userId: number, projectId: number, repoName: string) {
  const giteaUrl = getGiteaRepoUrl(userId, projectId, repoName);
  
  await db.insert('project_git_repos').values({
    project_id: projectId,
    user_id: userId,
    repo_name: repoName,
    gitea_repo_url: giteaUrl,
    gitea_repo_path: `${userId}/${repoName}`,
    default_branch: 'main',
    is_active: true
  });
}

// 检查仓库是否已存在
async function getProjectRepo(projectId: number, repoName: string) {
  return await db.query('project_git_repos')
    .where(and(
      eq('project_git_repos.project_id', projectId),
      eq('project_git_repos.repo_name', repoName)
    ))
    .execute();
}
```

### 9.3 业务流程

```
┌─────────────┐                    ┌─────────────┐
│  用户操作   │                    │  数据库     │
└──────┬──────┘                    └──────┬──────┘
       │                                  │
       │ 1. 绑定 Gitea 账号               │
       │─────────────────────────────────►│ 创建 gitea_users
       │                                  │
       │ 2. 初始化 Git 仓库               │
       │─────────────────────────────────►│ 创建 project_git_repos
       │                                  │
       │ 3. Git push/pull                 │
       │─────────────────────────────────►│ 查询仓库信息
       │                                  │
       │ 4. 修改 Gitea token              │
       │─────────────────────────────────►│ 更新 gitea_users
       │                                  │
       │ 5. 添加新仓库                    │
       │─────────────────────────────────►│ 创建新 project_git_repos
       │                                  │
```

### 9.4 Agent 操作与表的关系

| Agent 工具 | gitea_users | project_git_repos | 说明 |
|-----------|-------------|-------------------|------|
| `sparkx_git_init` | 查询 | **创建** | 初始化时记录仓库信息 |
| `sparkx_git_status` | - | - | 纯本地 Git 操作 |
| `sparkx_git_commit` | - | - | 纯本地 Git 操作 |
| `sparkx_git_branch` | - | - | 纯本地 Git 操作 |
| `sparkx_git_push` | **查询** | **查询** | 获取远程仓库信息和认证凭证 |
| `sparkx_git_pull` | **查询** | **查询** | 获取远程仓库信息和认证凭证 |
| `sparkx_git_tag` | - | - | 纯本地 Git 操作 |
| `sparkx_git_log` | - | - | 纯本地 Git 操作 |
| `sparkx_git_diff` | - | - | 纯本地 Git 操作 |
| `sparkx_git_cat` | - | - | 纯本地 Git 操作 |
| `sparkx_git_remote` | - | **查询** | 查询已配置的远程仓库 |
| `sparkx_git_clone` | - | **创建** | 克隆后记录仓库信息 |

#### 需要查询 gitea_users 的场景

```typescript
// Push/Pull 前获取 Gitea 认证信息
async function getGiteaAuth(userId: number) {
  const user = await db.query('gitea_users')
    .where(eq('gitea_users.user_id', userId))
    .execute();
  
  if (!user) {
    throw new Error('用户未绑定 Gitea 账号，请先在设置中绑定');
  }
  
  return {
    username: user.gitea_username,
    token: user.gitea_token,
    email: user.gitea_email
  };
}
```

#### 需要查询 project_git_repos 的场景

```typescript
// Push/Pull 前获取仓库远程 URL
async function getRepoRemoteUrl(projectId: number, repoName: string) {
  const repo = await db.query('project_git_repos')
    .where(and(
      eq('project_git_repos.project_id', projectId),
      eq('project_git_repos.repo_name', repoName),
      eq('project_git_repos.is_active', true)
    ))
    .execute();
  
  if (!repo) {
    throw new Error(`仓库 ${repoName} 未初始化，请先运行 sparkx_git_init`);
  }
  
  return repo.gitea_repo_url;
}
```

---

## 十、Agent 工作流

```typescript
// 1. 初始化仓库
await sparkx_git_init({ userid: 1, projectId: 123 });

// 2. 开发代码...

// 3. 查看状态
const status = await sparkx_git_status({ userid: 1, projectId: 123 });

// 4. 提交变更
await sparkx_git_commit({
  userid: 1,
  projectId: 123,
  message: "feat: add payment module"
});

// 5. 推送到 Gitea
await sparkx_git_push({ userid: 1, projectId: 123 });

// 6. 创建版本标签
await sparkx_git_tag({
  userid: 1,
  projectId: 123,
  operation: "create",
  tagName: "v1.0.0"
});
```

---

## 十一、实施优先级

1. **Phase 1**：init, status, commit - 基础版本控制
2. **Phase 2**：branch, log, tag - 分支和标签管理
3. **Phase 3**：diff, cat, push, pull - 差异、文件、远程同步
