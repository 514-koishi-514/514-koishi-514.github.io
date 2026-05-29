// =========================
// 基础状态
// 以后加文章时，优先修改 data/posts.json 和 content/posts/。
// =========================
const state = {
  posts: [],
  activeTag: "all",
  query: "",
  studioSource: ""
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

// QMD 的 YAML front matter 和 ```{python} 代码块需要转成普通 Markdown。
const normalizeMarkdown = (source) => {
  return source
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/^```{[^}\n]+}[\s\S]*?^```\s*/gm, (block) => {
      const language = block.match(/^```{([^}\n]+)}/)?.[1] || "";
      const firstLineEnd = block.indexOf("\n");
      return `\`\`\`${language}\n${block.slice(firstLineEnd + 1)}`;
    })
    .trim();
};

const markdownToHtml = (source) => {
  const normalized = normalizeMarkdown(source);
  const html = window.marked
    ? window.marked.parse(normalized, { gfm: true, breaks: false })
    : `<pre>${normalized.replace(/</g, "&lt;")}</pre>`;

  return window.DOMPurify ? window.DOMPurify.sanitize(html) : html;
};

const renderMath = async (container) => {
  if (window.MathJax?.typesetPromise) {
    await window.MathJax.typesetPromise([container]);
  }
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

  const response = await fetch(post.file);
  const source = await response.text();
  postContent.innerHTML = markdownToHtml(source);

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
  await renderMath(studioPreview);
  studioPreview.scrollTo({ top: 0, behavior: "smooth" });
};

const loadStudioSample = async (path) => {
  const response = await fetch(path);
  const source = await response.text();
  await renderStudio(source, path.split("/").pop());
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
  const normalizedRoute = route === "post" ? "post" : route;

  views.forEach((view) => view.classList.toggle("is-active", view.dataset.view === normalizedRoute));
  navLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.route === route));

  if (route === "posts") {
    state.activeTag = params.get("tag") || state.activeTag || "all";
    renderFilters();
    renderPostList();
  }

  if (route === "post") {
    await renderPost(slug);
    if (anchor) {
      requestAnimationFrame(() => document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  // 有目录锚点时保留目标位置；普通切页时回到顶部。
  if (!(route === "post" && anchor)) {
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

  const response = await fetch("data/posts.json");
  state.posts = (await response.json()).sort((a, b) => new Date(b.date) - new Date(a.date));

  renderHome();
  renderFilters();
  renderPostList();
  renderArchive();
  await loadStudioSample("content/posts/welcome.md");
  await showView();

  refreshReveal();
  if (window.lucide) window.lucide.createIcons();
};

window.addEventListener("DOMContentLoaded", init);
