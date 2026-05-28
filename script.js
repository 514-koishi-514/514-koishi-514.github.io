const preview = document.querySelector("#preview");
const title = document.querySelector("#document-title");
const dropZone = document.querySelector("#drop-zone");
const fileInput = document.querySelector("#file-input");
const copyButton = document.querySelector("#copy-button");
const themeButton = document.querySelector("#theme-button");
const sampleButtons = document.querySelectorAll("[data-sample]");

let currentSource = "";

const fallbackMarkdown = (source) => {
  const escaped = source
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .split(/\n{2,}/)
    .map((chunk) => (/^<h[1-3]/.test(chunk) ? chunk : `<p>${chunk.replace(/\n/g, "<br>")}</p>`))
    .join("");
};

const normalizeSource = (source) => {
  return source
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/^```{[^}\n]+}[\s\S]*?^```\s*/gm, (block) => {
      const language = block.match(/^```{([^}\n]+)}/)?.[1] || "";
      const firstLineEnd = block.indexOf("\n");
      return `\`\`\`${language}\n${block.slice(firstLineEnd + 1)}`;
    })
    .trim();
};

const render = async (source, name = "untitled.md") => {
  currentSource = source;
  title.textContent = name;

  const normalized = normalizeSource(source);
  const html = window.marked
    ? window.marked.parse(normalized, { gfm: true, breaks: false })
    : fallbackMarkdown(normalized);

  preview.innerHTML = window.DOMPurify ? window.DOMPurify.sanitize(html) : html;

  if (window.MathJax?.typesetPromise) {
    await window.MathJax.typesetPromise([preview]);
  }

  preview.scrollTo({ top: 0, behavior: "smooth" });
};

const loadSample = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Cannot load ${path}`);
  }
  const source = await response.text();
  await render(source, path.split("/").pop());
};

const readFile = async (file) => {
  const source = await file.text();
  await render(source, file.name);
  sampleButtons.forEach((button) => button.classList.remove("is-active"));
};

sampleButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    sampleButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    await loadSample(button.dataset.sample);
  });
});

fileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (file) {
    await readFile(file);
  }
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("is-dragging");
});

dropZone.addEventListener("drop", async (event) => {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");
  const [file] = event.dataTransfer.files;
  if (file) {
    await readFile(file);
  }
});

copyButton.addEventListener("click", async () => {
  if (!currentSource) return;
  await navigator.clipboard.writeText(currentSource);
  copyButton.classList.add("is-copied");
  setTimeout(() => copyButton.classList.remove("is-copied"), 900);
});

themeButton.addEventListener("click", () => {
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  { threshold: 0.16 }
);

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

document.addEventListener("pointermove", (event) => {
  const x = (event.clientX / window.innerWidth - 0.5) * 14;
  const y = (event.clientY / window.innerHeight - 0.5) * 14;
  document.documentElement.style.setProperty("--pointer-x", `${x}px`);
  document.documentElement.style.setProperty("--pointer-y", `${y}px`);
});

if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light");
}

window.addEventListener("DOMContentLoaded", async () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
  await loadSample("content/welcome.md");
});
