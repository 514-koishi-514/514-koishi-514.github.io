---
title: "博客说明与写作方式"
format: html
---

# 博客说明与写作方式

这个博客用于整理学习记录、课程项目、AI 实验和一些阶段性的想法。页面是纯静态部署，适合 GitHub Pages。

## 如何新增文章

1. 在 `content/posts/` 里新增一个 `.md` 或 `.qmd` 文件。
2. 在 `data/posts.json` 里添加对应索引。
3. 本地预览确认没有问题后，提交并推送到 GitHub。

## 文章索引示例

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

## 支持内容

- Markdown / QMD
- YAML front matter
- 代码块
- 数学公式，例如 $E = mc^2$
- 表格和引用

## 示例代码

```python
def hello(name: str) -> str:
    return f"hello, {name}"

print(hello("GitHub Pages"))
```

> 文字风格保持正常，视觉上保留轻二次元氛围。
