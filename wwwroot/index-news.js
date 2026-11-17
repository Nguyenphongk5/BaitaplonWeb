const homeArticleGrid = document.querySelector("[data-home-articles]");
const homeArticleStatus = document.querySelector("[data-home-articles-status]");

function renderHomeArticles(articles) {
  homeArticleGrid.replaceChildren(...articles.slice(0, 3).map((article, index) => {
    const card = document.createElement("article");
    card.className = "news-card";
    const imageLink = document.createElement("a");
    imageLink.className = `news-image news-image-${["one", "two", "three"][index]}`;
    imageLink.href = `/article.html?slug=${encodeURIComponent(article.slug)}`;
    if (article.thumbnailUrl) {
      const image = document.createElement("img");
      image.src = article.thumbnailUrl;
      image.alt = article.title;
      image.loading = "lazy";
      imageLink.append(image);
    } else {
      imageLink.textContent = "AUTHENTIC STORIES";
    }
    const info = document.createElement("div");
    info.className = "news-info";
    const meta = document.createElement("p");
    const published = article.publishedAt
      ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(article.publishedAt))
      : "";
    meta.textContent = `${published} · ${article.category}`;
    const title = document.createElement("h3");
    title.textContent = article.title;
    const link = document.createElement("a");
    link.href = `/article.html?slug=${encodeURIComponent(article.slug)}`;
    link.append(document.createTextNode("Đọc bài viết "));
    const arrow = document.createElement("span");
    arrow.textContent = "→";
    link.append(arrow);
    info.append(meta, title, link);
    card.append(imageLink, info);
    return card;
  }));
  homeArticleStatus.hidden = articles.length > 0;
  homeArticleStatus.textContent = "Chưa có bài viết được xuất bản.";
}

fetch("/api/articles?page=1")
  .then((response) => {
    if (!response.ok) throw new Error("Không thể tải tin tức.");
    return response.json();
  })
  .then((result) => renderHomeArticles(result.items))
  .catch(() => {
    homeArticleStatus.textContent = "Chưa thể tải tin tức. Vui lòng thử lại sau.";
  });