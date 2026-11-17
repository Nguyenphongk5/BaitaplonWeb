const articleGrid = document.querySelector("[data-article-grid]");
const articleStatus = document.querySelector("[data-article-status]");
const articleSearch = document.querySelector("[data-article-search]");
const articleCategory = document.querySelector("[data-article-category]");
const articlePagination = document.querySelector("[data-article-pagination]");
let articlePage = 1;
let searchTimer;

function displayArticleDate(value) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(value)) : "";
}

function renderArticleCards(items) {
  articleGrid.replaceChildren(...items.map((article) => {
    const card = document.createElement("article");
    card.className = "public-article-card";
    const imageLink = document.createElement("a");
    imageLink.className = "public-article-image";
    imageLink.href = `/article.html?slug=${encodeURIComponent(article.slug)}`;
    imageLink.setAttribute("aria-label", `Đọc bài viết ${article.title}`);
    if (article.thumbnailUrl) {
      const image = document.createElement("img");
      image.src = article.thumbnailUrl;
      image.alt = article.title;
      image.loading = "lazy";
      imageLink.append(image);
    } else {
      imageLink.classList.add("is-empty");
      imageLink.textContent = "AUTHENTIC STORIES";
    }
    const copy = document.createElement("div");
    copy.className = "public-article-copy";
    const meta = document.createElement("p");
    meta.textContent = `${displayArticleDate(article.publishedAt)} · ${article.category}`;
    const title = document.createElement("h2");
    const titleLink = document.createElement("a");
    titleLink.href = `/article.html?slug=${encodeURIComponent(article.slug)}`;
    titleLink.textContent = article.title;
    title.append(titleLink);
    const summary = document.createElement("p");
    summary.textContent = article.summary;
    const author = document.createElement("span");
    author.textContent = article.authorName;
    copy.append(meta, title, summary, author);
    card.append(imageLink, copy);
    return card;
  }));
}

function renderArticlePages(page, pageCount) {
  const controls = [];
  if (page > 1) {
    const previous = document.createElement("button");
    previous.type = "button";
    previous.textContent = "‹ Bài mới hơn";
    previous.addEventListener("click", () => { articlePage -= 1; loadArticles(); });
    controls.push(previous);
  }
  const current = document.createElement("span");
  current.textContent = `${page} / ${pageCount}`;
  controls.push(current);
  if (page < pageCount) {
    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "Bài cũ hơn ›";
    next.addEventListener("click", () => { articlePage += 1; loadArticles(); });
    controls.push(next);
  }
  articlePagination.replaceChildren(...controls);
}

async function loadCategories() {
  const response = await fetch("/api/articles/categories");
  if (!response.ok) throw new Error("Không thể tải danh mục bài viết.");
  const categories = await response.json();
  articleCategory.replaceChildren(new Option("Tất cả danh mục", ""), ...categories.map((category) => new Option(category, category)));
}

async function loadArticles() {
  articleStatus.textContent = "Đang tải bài viết…";
  const query = new URLSearchParams({ page: String(articlePage) });
  if (articleSearch.value.trim()) query.set("q", articleSearch.value.trim());
  if (articleCategory.value) query.set("category", articleCategory.value);
  try {
    const response = await fetch(`/api/articles?${query}`);
    if (!response.ok) throw new Error("Không thể tải bài viết. Vui lòng thử lại.");
    const result = await response.json();
    renderArticleCards(result.items);
    articleStatus.textContent = result.total ? `Tìm thấy ${result.total} bài viết.` : "Chưa có bài viết được xuất bản.";
    renderArticlePages(result.page, Math.max(1, Math.ceil(result.total / result.pageSize)));
  } catch (error) {
    articleGrid.replaceChildren();
    articlePagination.replaceChildren();
    articleStatus.textContent = error.message;
  }
}

articleSearch.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => { articlePage = 1; loadArticles(); }, 250);
});
articleCategory.addEventListener("change", () => { articlePage = 1; loadArticles(); });
loadCategories().then(loadArticles).catch(() => loadArticles());