# JSON Formatter Electron

一个基于 Electron 的桌面 JSON 格式化工具，支持：

- JSON 格式化（可配置缩进）
- JSON 压缩（去除空白）
- JSON 校验（错误提示）
- 一键复制结果
- 打包产物：Windows（`exe`/`portable`）、macOS（`Intel x64` + `Apple Silicon arm64` 的 `dmg/zip`）

## 本地开发

```bash
npm install
npm run start
```

## 本地打包

```bash
# 仅打包目录，不生成安装包
npm run pack

# 生成安装包
npm run dist
```

## GitHub Release 自动发布

仓库已包含 `.github/workflows/release.yml`，在你推送 `v*` tag（如 `v1.0.0`）后会：

1. 构建 Windows 安装包（exe）
2. 构建 macOS Intel（x64）安装包（dmg/zip）
3. 构建 macOS Apple Silicon（arm64）安装包（dmg/zip）
4. 自动创建/更新 GitHub Release 并上传产物

### 使用步骤

1. 在 GitHub 仓库设置 `GITHUB_TOKEN`（默认 Actions 自带 token 即可）。
2. 更新 `package.json` 的版本号（可选）。
3. 打 tag 并推送：

```bash
git tag v1.0.0
git push origin v1.0.0
```

之后在 GitHub Releases 页面可看到安装包。
