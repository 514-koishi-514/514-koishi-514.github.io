// =========================
// 基础状态
// 以后加文章时，优先修改 data/posts.json 和 content/posts/。
// =========================
const state = {
  posts: [],
  activeTag: "all",
  query: "",
  studioSource: "",
  studioLoaded: false
};

const views = document.querySelectorAll(".view");
const navLinks = document.querySelectorAll(".nav a");
const progress = document.querySelector("#read-progress");

const latestPosts = document.querySelector("#latest-posts");
const postList = document.querySelector("#post-list");
const homeTags = document.querySelector("#home-tags");
const tagFilter = document.querySelector("#tag-filter");
const archiveList = document.querySelector("#archive-list");
const searchInput = document.querySelector("#search-input");

const postTitle = document.querySelector("#post-title");
const postSummary = document.querySelector("#post-summary");
const postFormat = document.querySelector("#post-format");
const postTags = document.querySelector("#post-tags");
const postContent = document.querySelector("#post-content");
const postToc = document.querySelector("#post-toc");

const themeButton = document.querySelector("#theme-button");
const codeThemeButton = document.querySelector("#code-theme-button");
const hljsThemeDark = document.querySelector("#hljs-theme-dark");
const hljsThemeLight = document.querySelector("#hljs-theme-light");
const fileInput = document.querySelector("#file-input");
const copyButton = document.querySelector("#copy-button");
const dropZone = document.querySelector("#drop-zone");
const studioTitle = document.querySelector("#studio-title");
const studioPreview = document.querySelector("#studio-preview");
const sampleButtons = document.querySelectorAll("[data-sample]");

// =========================
// 工具函数
// =========================
const formatDate = (dateString) => {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(dateString));
};

const slugify = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
};

const escapeHtml = (value) => {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const renderInlineMarkdown = (source) => {
  return escapeHtml(source)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)(?:\{[^}]+\})?/g, '<img src="$2" alt="$1" />')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
};

// 本地 Markdown 渲染器：当 marked CDN 加载失败时使用，保证文章不会显示成一整段源码。
const basicMarkdownToHtml = (source) => {
  const lines = source.split("\n");
  const html = [];
  let index = 0;
  let inList = false;
  let listType = "ul";
  const calloutStack = [];

  const closeList = () => {
    if (inList) {
      html.push(`</${listType}>`);
      inList = false;
      listType = "ul";
    }
  };

  const calloutTitle = (type) => {
    const labels = {
      note: "Note",
      tip: "Tip",
      warning: "Warning",
      important: "Important",
      caution: "Caution"
    };
    return labels[type] || type;
  };

  const openCallout = (type) => {
    closeList();
    calloutStack.push(type);
    html.push(
      `<aside class="callout callout-${escapeHtml(type)}" data-callout="${escapeHtml(type)}"><div class="callout-label"><span class="callout-icon"></span><span>${calloutTitle(type)}</span></div><div class="callout-content">`
    );
  };

  const closeCallout = () => {
    closeList();
    if (calloutStack.length) {
      calloutStack.pop();
      html.push("</div></aside>");
    }
  };

  while (index < lines.length) {
    const line = lines[index];

    const calloutStart = line.match(/^:::\s*\{\.callout-([a-z-]+).*}$/);
    if (calloutStart) {
      openCallout(calloutStart[1]);
    } else if (/^:::\s*$/.test(line)) {
      closeCallout();
    } else if (/^---+$/.test(line.trim())) {
      closeList();
      html.push("<hr />");
    } else if (/^```/.test(line)) {
      closeList();
      const language = line.replace(/^```/, "").trim();
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      html.push(`<pre><code class="language-${escapeHtml(language)}">${escapeHtml(code.join("\n"))}</code></pre>`);
    } else if (/^\|.+\|$/.test(line) && /^\|[\s:-]+\|/.test(lines[index + 1] || "")) {
      closeList();
      const headers = line.split("|").slice(1, -1).map((cell) => cell.trim());
      index += 2;
      const rows = [];
      while (index < lines.length && /^\|.+\|$/.test(lines[index])) {
        rows.push(lines[index].split("|").slice(1, -1).map((cell) => cell.trim()));
        index += 1;
      }
      html.push(
        `<table><thead><tr>${headers.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table>`
      );
      continue;
    } else if (/^#{1,6}\s+/.test(line)) {
      closeList();
      const level = line.match(/^#+/)?.[0].length || 2;
      html.push(`<h${level}>${renderInlineMarkdown(line.replace(/^#{1,6}\s+/, ""))}</h${level}>`);
    } else if (/^>\s?/.test(line)) {
      closeList();
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote>${quote.map((item) => (item ? `<p>${renderInlineMarkdown(item)}</p>` : "")).join("")}</blockquote>`);
      continue;
    } else if (/^[-*]\s+/.test(line)) {
      if (!inList || listType !== "ul") {
        closeList();
        html.push("<ul>");
        inList = true;
        listType = "ul";
      }
      html.push(`<li>${renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</li>`);
    } else if (/^\d+\.\s+/.test(line)) {
      if (!inList || listType !== "ol") {
        closeList();
        html.push("<ol>");
        inList = true;
        listType = "ol";
      }
      html.push(`<li>${renderInlineMarkdown(line.replace(/^\d+\.\s+/, ""))}</li>`);
    } else if (line.trim()) {
      closeList();
      html.push(`<p>${renderInlineMarkdown(line)}</p>`);
    } else {
      closeList();
    }

    index += 1;
  }

  closeList();
  while (calloutStack.length) {
    closeCallout();
  }
  return html.join("\n");
};

// QMD 的 YAML front matter、代码块和 chunk options 需要转成普通 Markdown；callout 由本地渲染器栈式处理。
const normalizeMarkdown = (source) => {
  return source
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/^```{([^}\n]+)}\s*$/gm, (_, info) => {
      const language = info.split(/[,\s]+/)[0].replace(/^[.#]/, "") || "text";
      return `\`\`\`${language}`;
    })
    .replace(/^#\|\s?.*$/gm, "")
    .trim();
};

const protectMath = (source) => {
  const math = [];
  const text = source.replace(/\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^$\n]+\$|\\\([^)]*\\\)/g, (match) => {
    const token = `@@MATH_${math.length}@@`;
    const display = match.startsWith("$$") || match.startsWith("\\[");
    const body = match.startsWith("$$") ? match.slice(2, -2).trim() : match;
    math.push({
      display,
      value: display && match.startsWith("$$") ? `\\[${body}\\]` : match
    });
    return token;
  });
  return { text, math };
};

const restoreMath = (html, math) => {
  return math.reduce((result, item, index) => {
    const token = `@@MATH_${index}@@`;
    const value = item.display ? `<div class="math-block">${item.value}</div>` : item.value;
    return result.replaceAll(`<p>${token}</p>`, value).replaceAll(token, value);
  }, html);
};

const markdownToHtml = (source) => {
  const normalized = normalizeMarkdown(source);
  const { text, math } = protectMath(normalized);
  const html = basicMarkdownToHtml(text);

  const restored = restoreMath(html, math);
  return window.DOMPurify ? window.DOMPurify.sanitize(restored) : restored;
};

const renderMath = async (container) => {
  if (window.MathJax?.typesetPromise && document.body.classList.contains("math-ready")) {
    try {
      await window.MathJax.typesetPromise([container]);
    } catch (error) {
      console.warn("MathJax render skipped:", error);
    }
  }
};

const languageLabel = (language) => {
  const labels = {
    js: "JavaScript",
    javascript: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    py: "Python",
    python: "Python",
    cpp: "C++",
    c: "C",
    bash: "Shell",
    sh: "Shell",
    yaml: "YAML",
    yml: "YAML",
    json: "JSON",
    text: "Text",
    markdown: "Markdown",
    mermaid: "Mermaid"
  };
  return labels[language] || language || "Code";
};

const languageIcon = (language) => {
  const icons = {
    python: "Py",
    py: "Py",
    cpp: "C++",
    c: "C",
    javascript: "JS",
    js: "JS",
    typescript: "TS",
    ts: "TS",
    yaml: "YML",
    yml: "YML",
    json: "{}",
    mermaid: "M",
    markdown: "MD",
    bash: "$",
    sh: "$"
  };
  return icons[language] || "&lt;/&gt;";
};

const fallbackHighlight = (code, language) => {
  const source = code.textContent;
  let html = escapeHtml(source);

  const stash = [];
  const keep = (className) => (match) => {
    const token = `@@HL_${"x".repeat(stash.length + 1)}@@`;
    stash.push(`<span class="${className}">${match}</span>`);
    return token;
  };

  html = html.replace(/(&quot;.*?&quot;|'.*?'|`.*?`)/g, keep("hljs-string"));
  html = html.replace(/(\/\/.*$|#.*$)/gm, keep("hljs-comment"));

  const keywordMap = {
    python: /\b(def|return|if|else|elif|for|while|import|from|as|in|class|print|True|False|None|and|or|not)\b/g,
    py: /\b(def|return|if|else|elif|for|while|import|from|as|in|class|print|True|False|None|and|or|not)\b/g,
    cpp: /\b(int|return|using|namespace|include|iostream|std|cout|endl|if|else|for|while|class|public|private|void|auto|const)\b/g,
    c: /\b(int|return|include|stdio|if|else|for|while|void|char|float|double|const)\b/g,
    javascript: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|true|false|null)\b/g,
    js: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|true|false|null)\b/g,
    yaml: /^(\s*[\w-]+)(:)/gm,
    yml: /^(\s*[\w-]+)(:)/gm
  };

  if (keywordMap[language]) {
    if (language === "yaml" || language === "yml") {
      html = html.replace(keywordMap[language], '<span class="hljs-attr">$1</span>$2');
    } else {
      html = html.replace(keywordMap[language], '<span class="hljs-keyword">$1</span>');
    }
  }

  html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="hljs-number">$1</span>');
  html = stash.reduce((result, value, index) => result.replaceAll(`@@HL_${index}@@`, value), html);
  html = stash.reduce((result, value, index) => result.replaceAll(`@@HL_${"x".repeat(index + 1)}@@`, value), html);
  code.innerHTML = html;
  code.classList.add("hljs");
};

const getCodeLanguage = (code) => {
  const languageClass = [...code.classList].find((className) => className.startsWith("language-"));
  return languageClass?.replace("language-", "").toLowerCase() || "text";
};

// 代码块增强：加 Atom One 高亮、语言标题条，以及更明显的语言标识。
const enhanceCodeBlocks = (container) => {
  container.querySelectorAll("pre > code").forEach((code) => {
    const pre = code.parentElement;
    if (!pre || pre.closest(".code-shell")) return;

    const language = getCodeLanguage(code);
    if (window.hljs && language !== "mermaid") {
      window.hljs.highlightElement(code);
    } else {
      fallbackHighlight(code, language);
    }

    const shell = document.createElement("figure");
    shell.className = "code-shell";
    shell.dataset.language = language;
    shell.innerHTML = `
      <figcaption class="code-caption">
        <span class="code-language">
          <span class="code-language-icon">${languageIcon(language)}</span>
          <span>${languageLabel(language)}</span>
        </span>
      </figcaption>
    `;

    pre.replaceWith(shell);
    shell.append(pre);
  });
};

const applyCodeTheme = (theme) => {
  const isLight = theme === "light";
  document.body.classList.toggle("code-theme-light", isLight);
  document.body.classList.toggle("code-theme-dark", !isLight);
  if (hljsThemeDark && hljsThemeLight) {
    hljsThemeDark.disabled = isLight;
    hljsThemeLight.disabled = !isLight;
  }
  localStorage.setItem("code-theme", isLight ? "light" : "dark");
};

const getAllTags = () => {
  return [...new Set(state.posts.flatMap((post) => post.tags))].sort((a, b) => a.localeCompare(b));
};

// =========================
// 渲染文章卡片、标签和归档
// =========================
const createPostCard = (post) => {
  return `
    <a class="post-card" href="#post/${post.slug}">
      <div class="meta-row">
        <span>${formatDate(post.date)}</span>
        <span class="format-chip">${post.format}</span>
      </div>
      <h3>${post.title}</h3>
      <p>${post.summary}</p>
      <div class="card-tags">
        ${post.tags.map((tag) => `<span class="badge">${tag}</span>`).join("")}
      </div>
    </a>
  `;
};

const renderHome = () => {
  latestPosts.innerHTML = state.posts.slice(0, 3).map(createPostCard).join("");
  homeTags.innerHTML = getAllTags()
    .map((tag) => `<a class="tag" href="#posts?tag=${encodeURIComponent(tag)}">${tag}</a>`)
    .join("");
};

const renderFilters = () => {
  const tags = ["all", ...getAllTags()];
  tagFilter.innerHTML = tags
    .map((tag) => {
      const label = tag === "all" ? "全部" : tag;
      return `<button class="tag ${state.activeTag === tag ? "is-active" : ""}" type="button" data-tag="${tag}">${label}</button>`;
    })
    .join("");
};

const renderPostList = () => {
  const query = state.query.trim().toLowerCase();
  const posts = state.posts.filter((post) => {
    const matchTag = state.activeTag === "all" || post.tags.includes(state.activeTag);
    const haystack = `${post.title} ${post.summary} ${post.tags.join(" ")}`.toLowerCase();
    return matchTag && haystack.includes(query);
  });

  postList.innerHTML = posts.length
    ? posts.map(createPostCard).join("")
    : `<div class="content-band"><p>没有找到匹配的文章。</p></div>`;
};

const renderArchive = () => {
  const groups = state.posts.reduce((acc, post) => {
    const year = new Date(post.date).getFullYear();
    acc[year] ||= [];
    acc[year].push(post);
    return acc;
  }, {});

  archiveList.innerHTML = Object.keys(groups)
    .sort((a, b) => b - a)
    .map((year) => {
      const items = groups[year]
        .map(
          (post) => `
            <a class="archive-item" href="#post/${post.slug}">
              <time>${formatDate(post.date)}</time>
              <strong>${post.title}</strong>
              <span class="format-chip">${post.format}</span>
            </a>
          `
        )
        .join("");
      return `<section class="year-group"><h2>${year}</h2>${items}</section>`;
    })
    .join("");
};

// =========================
// 文章详情
// =========================
const renderPost = async (slug) => {
  const post = state.posts.find((item) => item.slug === slug) || state.posts[0];
  if (!post) return;

  postTitle.textContent = post.title;
  postSummary.textContent = post.summary;
  postFormat.textContent = `${post.format} · ${formatDate(post.date)}`;
  postTags.innerHTML = post.tags.map((tag) => `<span class="badge">${tag}</span>`).join("");

  try {
    const response = await fetch(post.file);
    if (!response.ok) throw new Error(`Cannot load ${post.file}`);
    const source = await response.text();
    postContent.innerHTML = markdownToHtml(source);
    enhanceCodeBlocks(postContent);
  } catch (error) {
    postContent.innerHTML = `<p>文章加载失败，请检查 <code>${post.file}</code> 是否存在。</p>`;
    console.error(error);
    return;
  }

  // 给标题生成锚点和目录。
  const headings = [...postContent.querySelectorAll("h2, h3")];
  headings.forEach((heading) => {
    heading.id ||= slugify(heading.textContent);
  });
  postToc.innerHTML = headings
    .map((heading) => `<a href="#post/${post.slug}/${heading.id}">${heading.textContent}</a>`)
    .join("");

  await renderMath(postContent);
};

// =========================
// 工作台：本地 Markdown/QMD 预览
// =========================
const renderStudio = async (source, name = "untitled.md") => {
  state.studioSource = source;
  studioTitle.textContent = name;
  studioPreview.innerHTML = markdownToHtml(source);
  enhanceCodeBlocks(studioPreview);
  await renderMath(studioPreview);
  studioPreview.scrollTo({ top: 0, behavior: "smooth" });
};

const loadStudioSample = async (path) => {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Cannot load ${path}`);
    const source = await response.text();
    await renderStudio(source, path.split("/").pop());
    state.studioLoaded = true;
  } catch (error) {
    studioPreview.innerHTML = `<p>示例文件加载失败，请检查 <code>${path}</code> 是否存在。</p>`;
    console.error(error);
  }
};

const readLocalFile = async (file) => {
  const source = await file.text();
  await renderStudio(source, file.name);
};

// =========================
// 路由：使用 hash，适合 GitHub Pages 静态部署。
// =========================
const parseRoute = () => {
  const hash = window.location.hash.replace(/^#/, "") || "home";
  const [path, queryString = ""] = hash.split("?");
  const [route, slug, anchor] = path.split("/");
  const params = new URLSearchParams(queryString);
  return { route, slug, anchor, params };
};

const showView = async () => {
  const { route, slug, anchor, params } = parseRoute();
  const knownRoutes = new Set(["home", "posts", "archive", "projects", "studio", "about", "post"]);
  const safeRoute = knownRoutes.has(route) ? route : "home";
  const normalizedRoute = safeRoute === "post" ? "post" : safeRoute;

  views.forEach((view) => view.classList.toggle("is-active", view.dataset.view === normalizedRoute));
  navLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.route === safeRoute));

  if (safeRoute === "posts") {
    state.activeTag = params.get("tag") || state.activeTag || "all";
    renderFilters();
    renderPostList();
  }

  if (safeRoute === "post") {
    await renderPost(slug);
    if (anchor) {
      requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  if (safeRoute === "studio" && !state.studioLoaded) {
    await loadStudioSample("content/posts/welcome.md");
  }

  // 有目录锚点时保留目标位置；普通切页时回到顶部。
  if (!(safeRoute === "post" && anchor)) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  refreshReveal();
  if (window.lucide) window.lucide.createIcons();
};

// =========================
// 交互绑定
// =========================
searchInput.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderPostList();
});

tagFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-tag]");
  if (!button) return;
  state.activeTag = button.dataset.tag;
  renderFilters();
  renderPostList();
});

themeButton.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("blog-theme", document.body.classList.contains("dark") ? "dark" : "light");
});

codeThemeButton.addEventListener("click", () => {
  applyCodeTheme(document.body.classList.contains("code-theme-light") ? "dark" : "light");
});

fileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (file) await readLocalFile(file);
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
});

dropZone.addEventListener("dragleave", () => dropZone.classList.remove("is-dragging"));

dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");
  const [file] = event.dataTransfer.files;
  if (file) await readLocalFile(file);
});

copyButton.addEventListener("click", async () => {
  if (state.studioSource) await navigator.clipboard.writeText(state.studioSource);
});

sampleButtons.forEach((button) => {
  button.addEventListener("click", () => loadStudioSample(button.dataset.sample));
});

window.addEventListener("hashchange", showView);

window.addEventListener("scroll", () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
});

// =========================
// 页面进入动画
// =========================
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("is-visible");
    });
  },
  { threshold: 0.12 }
);

const refreshReveal = () => {
  document.querySelectorAll(".reveal").forEach((element) => {
    revealObserver.observe(element);
    if (element.getBoundingClientRect().top < window.innerHeight) {
      element.classList.add("is-visible");
    }
  });
};

// =========================
// 启动
// =========================
const init = async () => {
  if (localStorage.getItem("blog-theme") === "dark") {
    document.body.classList.add("dark");
  }
  applyCodeTheme(localStorage.getItem("code-theme") || "dark");

  try {
    const response = await fetch("data/posts.json");
    if (!response.ok) throw new Error("Cannot load data/posts.json");
    state.posts = (await response.json()).sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error(error);
    state.posts = [];
  }

  renderHome();
  renderFilters();
  renderPostList();
  renderArchive();
  await showView();

  refreshReveal();
  if (window.lucide) window.lucide.createIcons();
};

window.addEventListener("DOMContentLoaded", init);

window.addEventListener("load", async () => {
  document.body.classList.add("math-ready");
  const activeMarkdown = document.querySelector(".view.is-active .markdown-body");
  if (activeMarkdown) await renderMath(activeMarkdown);
});
