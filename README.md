# 514-koishi-514.github.io

轻二次元视觉风格的个人博客，支持 Markdown / QMD 文章、标签、归档、项目展示和本地文件预览工作台。

## 文件结构

- `index.html`：页面结构和各个视图入口。
- `styles.css`：整体视觉、响应式布局和动画效果。
- `script.js`：路由、文章渲染、搜索筛选、归档、工作台交互。
- `data/posts.json`：文章索引。新增文章时主要改这里。
- `content/posts/`：Markdown / QMD 文章内容。

## 新增文章

1. 在 `content/posts/` 新增 `.md` 或 `.qmd` 文件。
2. 在 `data/posts.json` 添加文章信息。
3. 本地预览无误后提交并推送。

```json
{
  "slug": "my-note",
  "title": "文章标题",
  "date": "2026-05-29",
  "format": "MD",
  "tags": ["AI", "Notes"],
  "summary": "一句话摘要",
  "file": "content/posts/my-note.md"
}
```

## 本地预览

```bash
python3 -m http.server 4173
```

然后打开 `http://127.0.0.1:4173/`。
