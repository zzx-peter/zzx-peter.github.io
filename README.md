# Zhixia Zhang — Academic Homepage

个人学术主页：<https://zzx-peter.github.io/>。纯静态 HTML/CSS，无需安装 npm 依赖。

## 本地预览与维护

```powershell
node scripts/build.mjs
node scripts/preview.mjs
```

访问 <http://localhost:4173>；关闭预览服务时按 Ctrl+C。

- `data/profile.json`：姓名、简介、邮箱、Scholar 和 GitHub 链接。
- `data/publications.json`：论文标题、作者、月份、公开平台链接及主图缩略图。
- `assets/style.css`：深色主题、字号和手机适配。
- `assets/portrait.jpg`：个人照片。
- `assets/figures/`：用于主页展示的论文主图截图。
- `scripts/build.mjs`：生成 `index.html`，保留论文月份倒序。

## 论文文件与链接约束

**原始论文 PDF 只保留在本地，不得提交到公开仓库或上传到网站。**

- `My Paper/`、临时目录和本地核对笔记已在 `.gitignore` 中排除。
- 未公开论文只有标题、作者、简介和主图，不提供文稿链接。
- 已公开论文只提供 arXiv、Zenodo、SSRN 等公开平台及相关 GitHub 资源链接。
- 主图截图独立存放，不能链接回原始 PDF。
- 构建脚本拒绝公开数据中的 `pdf` 字段，并校验外链平台。
- 本地预览服务也不提供 PDF 文件。

## 日期

已录用论文采用录用月份，其他公开论文采用首次发布月份，未发布工作采用作者确认的完成月份。同月优先已录用论文，之后是预印本、文稿；同类别按标题排序。无法确认的日期保留待定，置于列表末尾。

## 发布

在 `zzx-peter.github.io` 仓库的 **Settings → Pages** 选择 `main` 分支、`/(root)`，保留 `.nojekyll` 文件。

公开内容仅为生成的页面、样式、照片、授权主图、公开论文元数据与维护脚本。上传前检查目录与 Git 历史中均不含原始 PDF。
