type SeoInput = {
  title: string;
  description: string;
  path: string;
  robots?: string;
  imageUrl?: string;
};

function upsertMeta(name: string, content: string, isProperty = false) {
  const selector = isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let tag = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    if (isProperty) {
      tag.setAttribute("property", name);
    } else {
      tag.setAttribute("name", name);
    }
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

function upsertCanonical(url: string) {
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

export function applySeo(input: SeoInput) {
  if (typeof document === "undefined") return;

  const absoluteUrl = new URL(input.path, window.location.origin).toString();
  const imageUrl = input.imageUrl ?? `${window.location.origin}/icons/pwa-512.png`;
  const robots = input.robots ?? "index, follow";

  document.title = input.title;
  upsertMeta("description", input.description);
  upsertMeta("robots", robots);

  upsertMeta("og:title", input.title, true);
  upsertMeta("og:description", input.description, true);
  upsertMeta("og:url", absoluteUrl, true);
  upsertMeta("og:type", "website", true);
  upsertMeta("og:image", imageUrl, true);

  upsertMeta("twitter:title", input.title);
  upsertMeta("twitter:description", input.description);
  upsertMeta("twitter:image", imageUrl);

  upsertCanonical(absoluteUrl);
}
