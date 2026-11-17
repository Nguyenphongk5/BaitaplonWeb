const articleStatus = document.querySelector("[data-article-status]");
const articleSlug = new URLSearchParams(window.location.search).get("slug");

function displayArticleDate(value) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" }).format(new Date(value)) : "";
}

async function loadArticle() {
  if (!articleSlug) {
    articleStatus.textContent = "Không tìm thấy bài viết.";
    return;
  }

  try {
    const response = await fetch(`/api/articles/${encodeURIComponent(articleSlug)}`);
    if (!response.ok) {
      articleStatus.textContent = response.status === 404 ? "Bài viết không tồn tại hoặc chưa được xuất bản." : "Không thể tải bài viết. Vui lòng thử lại.";
      return;
    }
    const article = await response.json();
    document.title = `${article.title} | Authentic Shoes`;
    document.querySelector('meta[name="description"]').content = article.summary || "Bài viết từ Authentic Shoes.";
    document.querySelector("[data-article-category]").textContent = article.category;
    document.querySelector("[data-article-title]").textContent = article.title;
    document.querySelector("[data-article-summary]").textContent = article.summary;
    document.querySelector("[data-article-meta]").textContent = `${article.authorName} · ${displayArticleDate(article.publishedAt)}`;
    const image = document.querySelector("[data-article-image]");
    if (article.thumbnailUrl) {
      image.src = article.thumbnailUrl;
      image.alt = article.title;
      image.hidden = false;
    }
    document.querySelector("[data-article-content]").textContent = article.content;
    document.querySelector("[data-article-detail]").hidden = false;
    articleStatus.hidden = true;
  } catch {
    articleStatus.textContent = "Không thể kết nối để tải bài viết. Vui lòng thử lại.";
  }
}

loadArticle();