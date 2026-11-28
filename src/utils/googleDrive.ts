export type ImageSizePreset = "thumb" | "card" | "medium" | "full";

const SIZE_WIDTH_MAP: Record<ImageSizePreset, number> = {
  thumb: 240,
  card: 480,
  medium: 720,
  full: 1200,
};

export function extractGoogleDriveFileId(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;
  const str = String(rawUrl).trim();
  if (!str) return null;

  // Patterns:
  // 1. /file/d/FILE_ID
  const matchFileD = str.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
  if (matchFileD && matchFileD[1]) return matchFileD[1];

  // 2. /d/FILE_ID
  const matchD = str.match(/\/d\/([a-zA-Z0-9_-]{15,})/);
  if (matchD && matchD[1]) return matchD[1];

  // 3. ?id=FILE_ID or &id=FILE_ID
  const matchId = str.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (matchId && matchId[1]) return matchId[1];

  // 4. open?id=FILE_ID
  const matchOpenId = str.match(/id=([a-zA-Z0-9_-]{15,})/);
  if (matchOpenId && matchOpenId[1]) return matchOpenId[1];

  // 5. Bare ID
  if (/^[a-zA-Z0-9_-]{25,60}$/.test(str)) {
    return str;
  }

  return null;
}

export function resolveBannerImageUrl(rawUrl?: string): string {
  const str = String(rawUrl || "").trim();
  if (!str) return "";

  const driveId = extractGoogleDriveFileId(str);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  if (str.startsWith("http://") || str.startsWith("https://")) {
    return str;
  }

  return "";
}

export function formatImageUrl(
  url: any,
  category: string = "",
  name: string = "",
  size: ImageSizePreset = "card"
): string {
  const width = SIZE_WIDTH_MAP[size] || 480;
  const str = String(url || "").trim();
  if (!str) {
    return getCategoryFallbackImage(category, name, size);
  }

  const driveId = extractGoogleDriveFileId(str);
  if (driveId) {
    // Google CDN server-side resize + automatic WebP compression (-rw)
    return `https://lh3.googleusercontent.com/d/${driveId}=w${width}-rw`;
  }

  if (str.includes("images.unsplash.com")) {
    try {
      const parsed = new URL(str);
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", "crop");
      parsed.searchParams.set("w", String(width));
      parsed.searchParams.set("q", size === "full" ? "80" : "75");
      parsed.searchParams.set("fm", "webp");
      return parsed.toString();
    } catch {
      return str;
    }
  }

  if (str.startsWith("http://") || str.startsWith("https://")) {
    return str;
  }

  return getCategoryFallbackImage(category, name, size);
}

/**
 * Progressive image error handler:
 * 1) If WebP Drive CDN (=w...-rw) fails, fallback to resized JPEG Drive CDN (=w...)
 * 2) Otherwise fallback to lightweight WebP category placeholder
 */
export function handleOptimizedImageError(
  imgEl: HTMLImageElement,
  category: string = "",
  name: string = "",
  size: ImageSizePreset = "card"
) {
  const currentSrc = imgEl.getAttribute("src") || "";
  if (currentSrc.includes("lh3.googleusercontent.com/d/") && currentSrc.includes("-rw") && !imgEl.dataset.retriedStd) {
    imgEl.dataset.retriedStd = "1";
    imgEl.src = currentSrc.replace(/-rw$/, "");
    return;
  }
  const fallback = getCategoryFallbackImage(category, name, size);
  if (currentSrc !== fallback) {
    imgEl.src = fallback;
  }
}

export function getCategoryFallbackImage(
  category: string = "",
  name: string = "",
  size: ImageSizePreset = "card"
): string {
  const width = SIZE_WIDTH_MAP[size] || 480;
  const quality = size === "full" ? 80 : 75;
  const params = `auto=format&fit=crop&w=${width}&q=${quality}&fm=webp`;

  const text = `${category} ${name}`.toLowerCase();
  if (text.includes("karipap") || text.includes("pastri") || text.includes("kuih") || text.includes("samosa") || text.includes("popia")) {
    return `https://images.unsplash.com/photo-1601050690597-df0568f70950?${params}`;
  }
  if (text.includes("kambing") || text.includes("daging") || text.includes("perap") || text.includes("bbq") || text.includes("steak")) {
    return `https://images.unsplash.com/photo-1544025162-d76694265947?${params}`;
  }
  if (text.includes("ayam") || text.includes("chicken") || text.includes("nugget") || text.includes("wing")) {
    return `https://images.unsplash.com/photo-1562967914-608f82629710?${params}`;
  }
  if (text.includes("dim sum") || text.includes("pau") || text.includes("dumpling") || text.includes("sup")) {
    return `https://images.unsplash.com/photo-1496116218417-1a781c1c416c?${params}`;
  }
  if (text.includes("udang") || text.includes("ikan") || text.includes("sotong") || text.includes("laut") || text.includes("seafood")) {
    return `https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?${params}`;
  }
  if (text.includes("roti") || text.includes("canai") || text.includes("donut") || text.includes("waffle")) {
    return `https://images.unsplash.com/photo-1589301760014-d929f3979dbc?${params}`;
  }
  return `https://images.unsplash.com/photo-1504674900247-0877df9cc836?${params}`;
}
