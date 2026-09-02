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

export function formatImageUrl(url: string | undefined, category: string = "", name: string = ""): string {
  if (!url || !url.trim()) {
    return getCategoryFallbackImage(category, name);
  }

  const trimmed = url.trim();
  const driveId = extractGoogleDriveFileId(trimmed);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return getCategoryFallbackImage(category, name);
}

export function getCategoryFallbackImage(category: string = "", name: string = ""): string {
  const text = `${category} ${name}`.toLowerCase();
  if (text.includes("karipap") || text.includes("pastri") || text.includes("kuih") || text.includes("samosa") || text.includes("popia")) {
    return "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80";
  }
  if (text.includes("kambing") || text.includes("daging") || text.includes("perap") || text.includes("bbq") || text.includes("steak")) {
    return "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80";
  }
  if (text.includes("ayam") || text.includes("chicken") || text.includes("nugget") || text.includes("wing")) {
    return "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80";
  }
  if (text.includes("dim sum") || text.includes("pau") || text.includes("dumpling") || text.includes("sup")) {
    return "https://images.unsplash.com/photo-1496116218417-1a781c1c416c?auto=format&fit=crop&w=800&q=80";
  }
  if (text.includes("udang") || text.includes("ikan") || text.includes("sotong") || text.includes("laut") || text.includes("seafood")) {
    return "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=800&q=80";
  }
  if (text.includes("roti") || text.includes("canai") || text.includes("donut") || text.includes("waffle")) {
    return "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80";
  }
  return "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80";
}
