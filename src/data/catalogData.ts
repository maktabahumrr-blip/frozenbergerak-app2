import { Product, Category, PromoItem } from "../types";
import { extractGoogleDriveFileId, formatImageUrl, getCategoryFallbackImage } from "../utils/googleDrive";
import { GOOGLE_APPS_SCRIPT_WEB_APP_URL } from "../config/googleSheets";

export const DEFAULT_FROZEN_BERGERAK_SHEET_ID = "1c4gL_FAsy5nuw_LQWq4djNA58kGpY1kQoVhDoT3w2Fw";

export function readCachedPromos(storageKey: "cached_all_time_promos" | "cached_seasonal_promos"): PromoItem[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) return [];
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function parseJsonIfValid(res: Response | null): Promise<any | null> {
  if (!res || !res.ok) return null;
  try {
    const contentType = res.headers.get("content-type") || "";
    const text = (await res.text()).trim();
    if (!text || text.startsWith("<") || text.toLowerCase().includes("<!doctype html") || text.toLowerCase().includes("<html")) {
      return null;
    }
    if (contentType && contentType.includes("text/html")) {
      return null;
    }
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function normalizePromoItem(raw: any, idx: number, prefix: string): PromoItem {
  const title = String(raw?.title || raw?.name || "Promosi Istimewa").trim();
  const originalPriceNum = raw?.originalPrice !== undefined && raw?.originalPrice !== null ? parsePrice(raw.originalPrice) : 0;
  const promoPriceNum = raw?.promoPrice !== undefined && raw?.promoPrice !== null ? parsePrice(raw.promoPrice) : 0;
  const fallbackPrice = raw?.price !== undefined && raw?.price !== null ? parsePrice(raw.price) : 0;
  const rawImg = raw?.imageUrl || raw?.cookedImageUrl || raw?.packagingImageUrl;
  const parsedImg = typeof rawImg === "string" && rawImg.trim() ? (parseGoogleDriveDirectUrl(rawImg) || rawImg.trim()) : undefined;

  return {
    id: String(raw?.id || `${prefix}-${String(idx + 1).padStart(2, "0")}`).trim(),
    title,
    description: String(raw?.description || "Promosi istimewa daripada FrozenBergerak.").trim(),
    imageUrl: parsedImg || getCategoryFallbackImage("promo", title),
    originalPrice: originalPriceNum > 0 ? originalPriceNum : undefined,
    promoPrice: promoPriceNum > 0 ? promoPriceNum : (fallbackPrice > 0 ? fallbackPrice : (originalPriceNum > 0 ? originalPriceNum : undefined)),
    status: String(raw?.status || (raw?.inStock === false ? "Habis" : "Aktif")).trim(),
    unit: String(raw?.unit || "1 pek").trim()
  };
}

function isPromoActiveStatus(status: any): boolean {
  const s = String(status || "").trim().toLowerCase();
  if (!s) return true;
  const inactive =
    s.includes("tidak") ||
    s.includes("inactive") ||
    s.includes("habis") ||
    s.includes("out") ||
    s.includes("tamat") ||
    s.includes("expired") ||
    s.includes("batal") ||
    s === "off" ||
    s === "no" ||
    s === "false" ||
    s === "0";
  return !inactive;
}

export const RAW_CATALOG_CSV = `ID,PRODUK,KATEGORI,HARGA,HARGA PROMO,GAMBAR SIAP MASAK,GAMBAR PACKAGING,PENERANGAN,STATUS
FB001,Pau Mini Kacang Merah,Pau,RM 15,,https://drive.google.com/file/d/15bXjrNxiC5quFRZVPPjdbLAUhPdOcJH5/view?usp=drivesdk,https://drive.google.com/file/d/1naFQ3aOaPHVSeY-xmFtkveQ1yyShvilI/view?usp=drivesdk,1 pek 12 biji. Hanya  perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB002,Pau Mini Kaya,Pau,RM 15,,https://drive.google.com/file/d/1Qzkfw0Sa1vjD6mIqVCwiQko2aDXK9Mch/view?usp=drivesdk,https://drive.google.com/file/d/1naFQ3aOaPHVSeY-xmFtkveQ1yyShvilI/view?usp=drivesdk,1 pek 12 biji. Hanya  perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB003,Pau Mini Coklat,Pau,RM 15,,https://drive.google.com/file/d/1vmYXwTk_o-zwuRr5dYAo-5GY5MdQ0dgx/view?usp=drivesdk,https://drive.google.com/file/d/1naFQ3aOaPHVSeY-xmFtkveQ1yyShvilI/view?usp=drivesdk,1 pek 12 biji. Hanya  perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB004,Pau Mini Kelapa,Pau,RM 15,,https://drive.google.com/file/d/1fSnQTTzTrQHe9XU8TVThN8klUnknn1Yj/view?usp=drivesdk,https://drive.google.com/file/d/1naFQ3aOaPHVSeY-xmFtkveQ1yyShvilI/view?usp=drivesdk,1 pek 12 biji. Hanya  perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB005,Pau Gebu Kacang Merah,Pau,RM 15,,https://drive.google.com/file/d/1dX3KeHkBtiEfcClz2KaLDu8PqkyuYjkb/view?usp=drivesdk,https://drive.google.com/file/d/1Pxhk3uHHwTO8DhUb5PC-M6U1fvCyk3bk/view?usp=drivesdk,1 pek 6 biji. Hanya  perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB006,Pau Gebu Kaya,Pau,RM 15,,https://drive.google.com/file/d/1HH8mmv-EZ6mIyIOj6uELHRtoDE8s-0gD/view?usp=drivesdk,https://drive.google.com/file/d/1Pxhk3uHHwTO8DhUb5PC-M6U1fvCyk3bk/view?usp=drivesdk,1 pek 6 biji. Hanya  perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB007,Pau Gebu Coklat,Pau,RM 15,,https://drive.google.com/file/d/1hg5Utg_cfohG8tJCp2SyZGPTXTjgIAI2/view?usp=drivesdk,https://drive.google.com/file/d/1Pxhk3uHHwTO8DhUb5PC-M6U1fvCyk3bk/view?usp=drivesdk,1 pek 6 biji. Hanya  perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB008,Pau Gebu Kelapa,Pau,RM 15,,https://drive.google.com/file/d/1dII4pym0Gm017I_twUZENew_vmyivK9c/view?usp=drivesdk,https://drive.google.com/file/d/1Pxhk3uHHwTO8DhUb5PC-M6U1fvCyk3bk/view?usp=drivesdk,1 pek 6 biji. Hanya  perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB009,Pau Gebu Kari Ayam,Pau,RM 17,,https://drive.google.com/file/d/1rvl0v1E2HzGtjRQyeWS2a3eGkGRlsnmM/view?usp=drivesdk,https://drive.google.com/file/d/1Pxhk3uHHwTO8DhUb5PC-M6U1fvCyk3bk/view?usp=drivesdk,1 pek 6 biji. Hanya  perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB010,Pau Gebu Rendang Ayam,Pau,RM 17,,https://drive.google.com/file/d/169W5_jJf8ngZaYfeTd9s9ycDh5Dw1MHo/view?usp=drivesdk,https://drive.google.com/file/d/1Pxhk3uHHwTO8DhUb5PC-M6U1fvCyk3bk/view?usp=drivesdk,1 pek 6 biji. Hanya  perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB011,Pau Gebu Rendang Daging,Pau,RM 17,,https://drive.google.com/file/d/1BVK70wnykWdOQ19rWw1vRLHc7kCWeTTe/view?usp=drivesdk,https://drive.google.com/file/d/1Pxhk3uHHwTO8DhUb5PC-M6U1fvCyk3bk/view?usp=drivesdk,1 pek 6 biji. Hanya  perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB012,Pau Gebu BBQ Ayam,Pau,RM 17,,https://drive.google.com/file/d/1YZICZN3b1JwWoym8qt-DXnHCyOOQ67xZ/view?usp=drivesdk,https://drive.google.com/file/d/1Pxhk3uHHwTO8DhUb5PC-M6U1fvCyk3bk/view?usp=drivesdk,1 pek 6 biji. Hanya  perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB013,Dimsum Ayam Original,Dimsum,RM 20,,https://drive.google.com/file/d/1opmwCQgnhPjWw6_P8Wbolt3bjT654qZE/view?usp=drivesdk,https://drive.google.com/file/d/1P4ZHD0HfexyYGV79mUXMdP9SEMQQIDLB/view?usp=drivesdk,1 pek 15 biji. Hanya perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB014,Dimsum Ayam Lada Hitam,Dimsum,RM 20,,https://drive.google.com/file/d/1opmwCQgnhPjWw6_P8Wbolt3bjT654qZE/view?usp=drivesdk,https://drive.google.com/file/d/1mVcbBSKKAeCPidfluG70NrSG6k5JM84Q/view?usp=drivesdk,1 pek 15 biji. Hanya perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB015,Dimsum Ayam Jejari Ketam,Dimsum,RM 20,,https://drive.google.com/file/d/1opmwCQgnhPjWw6_P8Wbolt3bjT654qZE/view?usp=drivesdk,https://drive.google.com/file/d/16h3GGf3Km9dUmfyDwrV7TXdfL_FLUKqu/view?usp=drivesdk,1 pek 15 biji. Hanya perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB016,Dimsum Ayam Telur Asin,Dimsum,RM 20,,https://drive.google.com/file/d/1opmwCQgnhPjWw6_P8Wbolt3bjT654qZE/view?usp=drivesdk,https://drive.google.com/file/d/1PBvffZ6AHpLt_YPZ4WMFqKlEri5Qdfrn/view?usp=drivesdk,1 pek 15 biji. Hanya perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB017,Dimsum Ayam Cendawan Shitake,Dimsum,RM 20,,https://drive.google.com/file/d/1opmwCQgnhPjWw6_P8Wbolt3bjT654qZE/view?usp=drivesdk,https://drive.google.com/file/d/1viA_97_1-saqh0zcSzovbivGcvN0bfqT/view?usp=drivesdk,1 pek 15 biji. Hanya perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB018,Dimsum Ayam Tomyam,Dimsum,RM 20,,https://drive.google.com/file/d/1opmwCQgnhPjWw6_P8Wbolt3bjT654qZE/view?usp=drivesdk,https://drive.google.com/file/d/1jSL9YyDLYrp7YgJJcgpZ0hTzgQvf_QQZ/view?usp=drivesdk,1 pek 15 biji. Hanya perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB019,Dimsum Ayam Sosej,Dimsum,RM 20,,https://drive.google.com/file/d/1opmwCQgnhPjWw6_P8Wbolt3bjT654qZE/view?usp=drivesdk,https://drive.google.com/file/d/1DZSLR1ZWpAnGc68qvu_Op77QtIxv9zag/view?usp=drivesdk,1 pek 15 biji. Hanya perlu dikukus selama 15 minit - 20 minit setelah air mendidih. Sedia untuk dihidang.,AVAILABLE
FB020,Muffin Coklat,Muffin,RM 20,,https://drive.google.com/file/d/1aZkfeUFapfXwHv6DUQUC-XF5kUgdr8sg/view?usp=drivesdk,https://drive.google.com/file/d/1L8-3rnbvgcbBbsBUYsO23aX1r8x6a7VJ/view?usp=drivesdk,1 pek 12 biji. Boleh dinyahbekukan pada suhu bilik selama 20 minit atau dikukus selama 15–20 minit selepas air mendidih. Sedia untuk dihidang.,AVAILABLE
FB021,Muffin Oren,Muffin,RM 20,,https://drive.google.com/file/d/1JC8hpi2aXIB5RFzOpfCdgKWpeLa3hHop/view?usp=drivesdk,https://drive.google.com/file/d/1NGp0OwtcJieJQpHWkQnLWOS-iHPwK061/view?usp=drivesdk,1 pek 12 biji. Boleh dinyahbekukan pada suhu bilik selama 20 minit atau dikukus selama 15–20 minit selepas air mendidih. Sedia untuk dihidang.,AVAILABLE
FB022,Muffin Vanila,Muffin,RM 20,,https://drive.google.com/file/d/17t6qZPEAY2z4mi9LliV-tc1kf6B4FKwx/view?usp=drivesdk,https://drive.google.com/file/d/1hs73RkEOju4iuNrhv8RhyTIFkjOcprdG/view?usp=drivesdk,1 pek 12 biji. Boleh dinyahbekukan pada suhu bilik selama 20 minit atau dikukus selama 15–20 minit selepas air mendidih. Sedia untuk dihidang.,AVAILABLE
FB023,Muffin Pandan,Muffin,RM 20,,https://drive.google.com/file/d/1_gjaE57Ak5_hwaxLjfdDHRuOIsO0CK9n/view?usp=drivesdk,https://drive.google.com/file/d/1SfCfmyRuL6797A7hT9i_3ae3hCVexPCv/view?usp=drivesdk,1 pek 12 biji. Boleh dinyahbekukan pada suhu bilik selama 20 minit atau dikukus selama 15–20 minit selepas air mendidih. Sedia untuk dihidang.,AVAILABLE
FB024,Corndough Jumbo Sosej Cheese,Corndough,RM 30,,https://drive.google.com/file/d/1S9KB9wajjeZufveDwI6C-QeclWqpeWik/view?usp=drivesdk,https://drive.google.com/file/d/1s73EWSXCvgydBHkvReihglcKN82rYPH5/view?usp=drivesdk,"1 pek 5 batang. Penyediaan Corndough Frozen

Goreng: Nyah beku dahulu, kemudian goreng dalam minyak yang telah dipanaskan sehingga keemasan dan masak sekata.

Air Fryer: Masak terus daripada keadaan beku pada suhu 180°C selama 10–15 minit atau sehingga keemasan. Masa mungkin berbeza mengikut jenis air fryer.

Sedia untuk dihidang.",AVAILABLE
FB025,Corndough Jumbo Fully Cheese,Corndough,RM 32,,https://drive.google.com/file/d/1Pum-oNtiOFoYSwzmgM1KrFzO4uEbFA20/view?usp=drivesdk,https://drive.google.com/file/d/1s73EWSXCvgydBHkvReihglcKN82rYPH5/view?usp=drivesdk,"1 pek 5 batang. Penyediaan Corndough Frozen

Goreng: Nyah beku dahulu, kemudian goreng dalam minyak yang telah dipanaskan sehingga keemasan dan masak sekata.

Air Fryer: Masak terus daripada keadaan beku pada suhu 180°C selama 10–15 minit atau sehingga keemasan. Masa mungkin berbeza mengikut jenis air fryer.

Sedia untuk dihidang.",AVAILABLE
FB026,Baby Corndough,Corndough,RM 25,,https://drive.google.com/file/d/1eYMcKE8S8n6SNz28gR--LjuVpnVOaCIC/view?usp=drivesdk,https://drive.google.com/file/d/1Z3BouSVMkQ7vVbvxQS_Il7HXHtxcVKD9/view?usp=drivesdk,"1 pek 12 batang. Penyediaan Corndough Frozen

Goreng: Nyah beku dahulu, kemudian goreng dalam minyak yang telah dipanaskan sehingga keemasan dan masak sekata.

Air Fryer: Masak terus daripada keadaan beku pada suhu 180°C selama 10–15 minit atau sehingga keemasan. Masa mungkin berbeza mengikut jenis air fryer.

Sedia untuk dihidang.",AVAILABLE
FB027,Karipap Pusing Kentang Ayam,Kuih,RM 14,,https://drive.google.com/file/d/1ruoQZ_aVgGZ-1KgJH4FY02wP2df39CcP/view?usp=drivesdk,https://drive.google.com/file/d/1C0fXAL3Uk4QqDBL-TwNVsi9Fj9FCFyRG/view?usp=drivesdk,"1 pek 10 biji. Penyediaan Karipap Frozen

Goreng: Nyah beku dahulu, kemudian goreng dalam minyak yang telah dipanaskan sehingga keemasan dan masak sekata.

Air Fryer: Masak terus daripada keadaan beku pada suhu 180°C selama 10–15 minit atau sehingga keemasan. Masa mungkin berbeza mengikut jenis air fryer.

Sedia untuk dihidang.",AVAILABLE
FB028,Karipap Pusing Kentang Daging,Kuih,RM 14,,https://drive.google.com/file/d/1z-Oj2BVmS_7tX9BelF9w-L2M3z7a_zQf/view?usp=drivesdk,https://drive.google.com/file/d/1C0fXAL3Uk4QqDBL-TwNVsi9Fj9FCFyRG/view?usp=drivesdk,"1 pek 10 biji. Penyediaan Karipap Frozen

Goreng: Nyah beku dahulu, kemudian goreng dalam minyak yang telah dipanaskan sehingga keemasan dan masak sekata.

Air Fryer: Masak terus daripada keadaan beku pada suhu 180°C selama 10–15 minit atau sehingga keemasan. Masa mungkin berbeza mengikut jenis air fryer.

Sedia untuk dihidang.",AVAILABLE
FB029,Karipap Pusing Sardin,Kuih,RM 14,,https://drive.google.com/file/d/1LhhDm5eUCtobu2LNcGCRdIvqx60koanN/view?usp=drivesdk,https://drive.google.com/file/d/1C0fXAL3Uk4QqDBL-TwNVsi9Fj9FCFyRG/view?usp=drivesdk,"1 pek 10 biji. Penyediaan Karipap Frozen

Goreng: Nyah beku dahulu, kemudian goreng dalam minyak yang telah dipanaskan sehingga keemasan dan masak sekata.

Air Fryer: Masak terus daripada keadaan beku pada suhu 180°C selama 10–15 minit atau sehingga keemasan. Masa mungkin berbeza mengikut jenis air fryer.

Sedia untuk dihidang.",AVAILABLE
FB030,Kuih Cucur Badak,Kuih,RM 13,,https://drive.google.com/file/d/1j8mpHVB8dQn6nd39lDi7tJTRLrPNUJ92/view?usp=drivesdk,https://drive.google.com/file/d/10PMcIrtnQbg0I1iXRofdbHKpFJKmpfAL/view?usp=drivesdk,"1 pek 10 biji. Penyediaan Karipap Frozen

Goreng: Nyah beku dahulu, kemudian goreng dalam minyak yang telah dipanaskan sehingga keemasan dan masak sekata.

Air Fryer: Masak terus daripada keadaan beku pada suhu 180°C selama 10–15 minit atau sehingga keemasan. Masa mungkin berbeza mengikut jenis air fryer.

Sedia untuk dihidang.",AVAILABLE
FB031,Kuih Kasturi / Kuih Kacang Hijau,Kuih,RM 13,,https://drive.google.com/file/d/1xN-eW4HBn47RcaULlja2bdMslJMZHbEW/view?usp=drivesdk,https://drive.google.com/file/d/1OH_Jp15HzuBkv3-Acs4XJ3qmRdYF1eeN/view?usp=drivesdk,"1 pek 10 biji. Penyediaan Karipap Frozen

Goreng: Nyah beku dahulu, kemudian goreng dalam minyak yang telah dipanaskan sehingga keemasan dan masak sekata.

Air Fryer: Masak terus daripada keadaan beku pada suhu 180°C selama 10–15 minit atau sehingga keemasan. Masa mungkin berbeza mengikut jenis air fryer.

Sedia untuk dihidang.",AVAILABLE
FB032,Kuih Koci (Inti Kelapa),Kuih,RM 13,,https://drive.google.com/file/d/169Cig8bzvDqS-NfvE-IA6jGI1djUfBWJ/view?usp=drivesdk,https://drive.google.com/file/d/1N4embzG0ShaRc6YSl06p2uHXDEVvJu57/view?usp=drivesdk,1 pek 9 biji. Hanya perlu dikukus selamat 10 minit setelah air mendidih. Sedia untuk dihidang,AVAILABLE
FB033,Kuih Vadai / Masalodeh,Kuih,RM 13,,https://drive.google.com/file/d/1ePUUSRLer-rH4WnI6gYuFUak1wFXlzkY/view?usp=drivesdk,https://drive.google.com/file/d/1sNbAn6-YZ8MVGyB7LGsTGPppMzvVSSNZ/view?usp=drivesdk,"1 pek 10 biji. Penyediaan Karipap Frozen

Goreng: Nyah beku dahulu, kemudian goreng dalam minyak yang telah dipanaskan sehingga keemasan dan masak sekata.

Air Fryer: Masak terus daripada keadaan beku pada suhu 180°C selama 10–15 minit atau sehingga keemasan. Masa mungkin berbeza mengikut jenis air fryer.

Sedia untuk dihidang.",AVAILABLE
FB034,Pulut Panggang (Inti Kelapa),Kuih,RM 17,,https://drive.google.com/file/d/1jjXW2YLgbSM6coTBOt1-xS2E-31kJnQb/view?usp=drivesdk,https://drive.google.com/file/d/1sNbAn6-YZ8MVGyB7LGsTGPppMzvVSSNZ/view?usp=drivesdk,"1 pek 10 biji. Penyediaan Pulut Panggang Frozen

Pan/ Goreng: Nyah beku dahulu, kemudian panaskan di atas kuali dengan api sederhana tanpa minyak/sedikit minyak sehingga panas sekata.

Air Fryer: Masak terus daripada keadaan beku pada suhu 180°C selama 10–15 minit atau sehingga keemasan. Masa mungkin berbeza mengikut jenis air fryer.

Sedia untuk dihidang.",AVAILABLE
FB035,Kuih Samosa Kentang Daging,Kuih,RM 17,,https://drive.google.com/file/d/1TnCM6FrCEappMSBj5WTmkbva1b76V7zi/view?usp=drivesdk,https://drive.google.com/file/d/1VJIdKuVjFrQf1fEbxM-J97Yquqi56vTw/view?usp=drivesdk,"1 pek 10 biji. Penyediaan Samosa Frozen

Goreng: Nyah beku dahulu, kemudian goreng dalam minyak yang telah dipanaskan sehingga keemasan dan masak sekata.

Air Fryer: Masak terus daripada keadaan beku pada suhu 180°C selama 10–15 minit atau sehingga keemasan. Masa mungkin berbeza mengikut jenis air fryer.

Sedia untuk dihidang.",AVAILABLE
FB036,Mini Murtabak Ayam,Kuih,RM 21,,https://drive.google.com/file/d/1ZeQP80NWkVoJZzlseXy_Tym3VbVOFQIQ/view?usp=drivesdk,https://drive.google.com/file/d/1Fkjx7HkOUyw-O10Hd-uUxWY_AWrjgGbP/view?usp=drivesdk,"1 pek 12 biji. Penyediaan Murtabak Frozen

Goreng: Nyah beku dahulu, kemudian goreng dalam minyak yang telah dipanaskan sehingga keemasan dan masak sekata.

Air Fryer: Masak terus daripada keadaan beku pada suhu 180°C selama 10–15 minit atau sehingga keemasan. Masa mungkin berbeza mengikut jenis air fryer.

Sedia untuk dihidang.",AVAILABLE
FB037,Mini Murtabak Daging,Kuih,RM 21,,https://drive.google.com/file/d/1Op5ZaU9qFVq_OEXrut06QrHqd_t6HfEe/view?usp=drivesdk,https://drive.google.com/file/d/1Fkjx7HkOUyw-O10Hd-uUxWY_AWrjgGbP/view?usp=drivesdk,"1 pek 12 biji. Penyediaan Murtabak Frozen

Goreng: Nyah beku dahulu, kemudian goreng dalam minyak yang telah dipanaskan sehingga keemasan dan masak sekata.

Air Fryer: Masak terus daripada keadaan beku pada suhu 180°C selama 10–15 minit atau sehingga keemasan. Masa mungkin berbeza mengikut jenis air fryer.

Sedia untuk dihidang.",AVAILABLE
FB038,Popia Carbonara Original,Popia,RM 17,,https://drive.google.com/file/d/1F9-a4hktsn_si-Ov_5dyEa0js8-R6Bga/view?usp=drivesdk,https://drive.google.com/file/d/13gSZMEOnHaCR8uZriO9Ia6zrhHkglEnq/view?usp=drivesdk,"1 pek 8 keping. Tidak perlu nyahbeku, terus goreng dalam minyak masak yang telah dipanaskan sehingga keemasan dan masak sekata.",AVAILABLE
FB039,Popia Carbonara Daging,Popia,RM 17,,https://drive.google.com/file/d/1q8m4Bec_TklsArrb3GBOVGrRQru873m8/view?usp=drivesdk,https://drive.google.com/file/d/13gSZMEOnHaCR8uZriO9Ia6zrhHkglEnq/view?usp=drivesdk,"1 pek 8 keping. Tidak perlu nyahbeku, terus goreng dalam minyak masak yang telah dipanaskan sehingga keemasan dan masak sekata.",AVAILABLE
FB040,Popia Jejari Ketam Berkeju,Popia,RM 17,,https://drive.google.com/file/d/1r_czEBs9wnhkEPo9QSPm_Osyj3LXawEJ/view?usp=drivesdk,https://drive.google.com/file/d/13gSZMEOnHaCR8uZriO9Ia6zrhHkglEnq/view?usp=drivesdk,"1 pek 8 keping. Tidak perlu nyahbeku, terus goreng dalam minyak masak yang telah dipanaskan sehingga keemasan dan masak sekata.",AVAILABLE
FB041,Popia Sayuran Berkeju,Popia,RM 17,,https://drive.google.com/file/d/1_Vwy1AAFkJSctgtnupjTNIINi4WkRDlq/view?usp=drivesdk,https://drive.google.com/file/d/13gSZMEOnHaCR8uZriO9Ia6zrhHkglEnq/view?usp=drivesdk,"1 pek 8 keping. Tidak perlu nyahbeku, terus goreng dalam minyak masak yang telah dipanaskan sehingga keemasan dan masak sekata.",AVAILABLE`;

export function extractSheetId(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  const pubMatch = trimmed.match(/\/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
  if (pubMatch && pubMatch[1]) {
    return pubMatch[1];
  }
  return trimmed;
}

export function parseCSVLines(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function parsePrice(val: any): number {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const str = String(val || "").trim();
  if (!str || str === "-" || str.toLowerCase() === "n/a" || str.toLowerCase() === "tiada") {
    return 0;
  }
  if (str.includes("http") || str.includes("drive.google") || str.includes(".com") || str.includes("/")) {
    return 0;
  }
  const cleaned = String(str || "").replace(/[^0-9.,]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseGoogleDriveDirectUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return undefined;
  const str = String(rawUrl).trim();
  if (!str || str === "-" || str.toLowerCase() === "n/a" || str.toLowerCase() === "tiada") {
    return undefined;
  }
  const driveId = extractGoogleDriveFileId(str);
  if (driveId) {
    return `https://lh3.googleusercontent.com/d/${driveId}`;
  }
  if (str.startsWith("http://") || str.startsWith("https://")) {
    return str;
  }
  return undefined;
}

export function parseCatalogCSV(csvText: string): Product[] {
  return parseTabCsvSafely(csvText, "produk");
}

export function parseTabCsvSafely(
  csvText: string,
  tabType: "produk" | "alltimepromo" | "seasonal"
): Product[] {
  try {
    if (!csvText || typeof csvText !== "string") return [];
    const rows = parseCSVLines(csvText);
    if (rows.length === 0) return [];
    return parseTabRowsSafely(rows, tabType);
  } catch (error) {
    console.error(`Error in parseTabCsvSafely (${tabType}), falling back to empty array:`, error);
    return [];
  }
}

/**
 * Safely parses rows from any tab using flexible column matching with index fallback:
 * Column A (index 0) = ID / Code
 * Column B (index 1) = Name / Title
 * Column C (index 2) = Category / Promo
 * Column D (index 3) = Price
 * Column E (index 4) = Image
 */
export function parseTabRowsSafely(
  rows: string[][],
  tabType: "produk" | "alltimepromo" | "seasonal"
): Product[] {
  try {
    if (!rows || rows.length === 0) return [];

    // Scan first 5 rows for the true header row (some tabs like Alltimepromo have a title/divider row above headers)
    let headerRowIdx = -1;
    const scanLimit = Math.min(rows.length, 5);
    for (let r = 0; r < scanLimit; r++) {
      const candidate = (rows[r] || []).map((h) => (h || "").trim().toUpperCase());
      const matchesHeader = candidate.some((h) =>
        /^(id|id produk|id promo|kod|code|no|produk|nama produk|nama|name|item|tajuk|tajuk promo|nama promo|title|kategori|category|jenis|harga|harga asal|price|gambar|gambar promo|image|foto|photo|status|stok|promo)$/i.test(h)
      );
      if (matchesHeader) {
        headerRowIdx = r;
        break;
      }
    }

    const isHeaderRow = headerRowIdx !== -1;
    const headerRow = (isHeaderRow ? rows[headerRowIdx] : rows[0]).map((h) => (h || "").trim().toUpperCase());

    // Helper for flexible header matching
    const findIdx = (possibleNames: string[], excludeWords: string[] = []): number => {
      for (const name of possibleNames) {
        const idx = headerRow.findIndex((h) => h === name.toUpperCase());
        if (idx !== -1) return idx;
      }
      for (const name of possibleNames) {
        const idx = headerRow.findIndex(
          (h) =>
            h.includes(name.toUpperCase()) &&
            !excludeWords.some((ex) => h.includes(ex.toUpperCase()))
        );
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const startRow = isHeaderRow ? headerRowIdx + 1 : 0;

    // Flexible column matching with Column Index Fallback:
    // Column A = ID/Code, Column B = Name, Column C = Category/Promo, Column D = Price, Column E = Image
    let idIdx = isHeaderRow ? findIdx(["ID", "KOD", "CODE", "NO", "ITEM ID", "PROMO ID", "ID PROMO", "ID PRODUK", "KOD PRODUK", "SKU"]) : -1;
    if (idIdx === -1) idIdx = 0; // Fallback to Column A

    let nameIdx = isHeaderRow ? findIdx(["PRODUK", "NAMA PRODUK", "NAMA", "PRODUCT", "PRODUCT NAME", "ITEM", "ITEM NAME", "TAJUK", "TITLE", "TAJUK PROMO", "NAMA PROMO"]) : -1;
    if (nameIdx === -1) nameIdx = 1; // Fallback to Column B

    let catIdx = isHeaderRow ? findIdx(["KATEGORI", "CATEGORY", "JENIS", "KUMPULAN", "SEGMEN", "TYPE", "TAG", "SEASONAL"]) : -1;
    if (catIdx === -1 && tabType === "produk") catIdx = 2; // Fallback to Column C only on Produk tab

    let priceIdx = isHeaderRow ? findIdx(["HARGA ASAL", "HARGA BIASA", "HARGA", "PRICE", "HARGA (RM)", "HARGA RM", "RATE"], ["PROMO", "DISKAUN", "TAWARAN"]) : -1;
    if (priceIdx === -1) priceIdx = 3; // Fallback to Column D

    const promoPriceIdx = isHeaderRow ? findIdx(["HARGA PROMO", "PROMO PRICE", "HARGA DISKAUN", "DISKAUN", "HARGA TAWARAN"]) : -1;

    let imageIdx = isHeaderRow ? findIdx(["GAMBAR", "GAMBAR PROMO", "IMAGE", "GAMBAR SIAP MASAK", "GAMBAR PACKAGING", "GAMBAR MASAK", "COOKED IMAGE", "PACKAGING IMAGE", "FOTO", "PHOTO", "PICTURE", "URL", "LINK", "LINK GAMBAR", "URL GAMBAR"]) : -1;
    if (imageIdx === -1) imageIdx = 4; // Fallback to Column E

    const cookedImgIdx = isHeaderRow ? findIdx(["GAMBAR SIAP MASAK", "GAMBAR MASAK", "COOKED IMAGE", "GAMBAR 1"]) : -1;
    const packImgIdx = isHeaderRow ? findIdx(["GAMBAR PACKAGING", "GAMBAR PACK", "PACKAGING IMAGE", "GAMBAR 2"]) : -1;

    let descIdx = isHeaderRow ? findIdx(["PENERANGAN", "DESCRIPTION", "DESKRIPSI", "NOTA", "CARA MASAK", "MAKLUMAT", "INFO", "DETAILS"]) : -1;
    if (descIdx === -1 && headerRow.length > 5) descIdx = 5; // Column F fallback if available

    let statusIdx = isHeaderRow ? findIdx(["STATUS", "AVAILABILITY", "STOK", "STOCK", "STATE", "KEADAAN"]) : -1;
    if (statusIdx === -1 && headerRow.length > 6) statusIdx = 6; // Column G fallback if available

    const products: Product[] = [];

    for (let r = startRow; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row) || row.length === 0 || row.every((c) => !String(c || "").trim())) continue;

      // Extract rawName
      let rawName = (nameIdx !== -1 && row[nameIdx]) ? String(row[nameIdx]).trim() : "";
      if (!rawName && row[1]) {
        rawName = String(row[1]).trim();
      }
      if (!rawName) continue;

      // Skip repeated header words
      if (["PRODUK", "PRODUCT", "NAMA", "NAME", "TAJUK", "TITLE", "ITEM", "TAJUK PROMO", "NAMA PROMO"].includes(rawName.toUpperCase())) {
        continue;
      }

      // Extract ID
      let rawId = (idIdx !== -1 && row[idIdx]) ? String(row[idIdx]).trim() : (row[0] ? String(row[0]).trim() : "");
      if (!rawId || ["ID", "KOD", "CODE", "NO", "ID PROMO", "ID PRODUK"].includes(rawId.toUpperCase())) {
        const prefix = tabType === "seasonal" ? "SEA" : tabType === "alltimepromo" ? "ATP" : "FB";
        rawId = `${prefix}-${String(r).padStart(3, "0")}`;
      }

      // Extract Category
      let rawCategory = (catIdx !== -1 && row[catIdx]) ? String(row[catIdx]).trim() : "";
      if (!rawCategory || ["KATEGORI", "CATEGORY", "JENIS"].includes(rawCategory.toUpperCase())) {
        if (tabType === "alltimepromo") {
          rawCategory = "All Time Promo";
        } else if (tabType === "seasonal") {
          rawCategory = "PROMOSI BERMUSIM";
        } else {
          rawCategory = "Lain-lain";
        }
      }

      // Extract Prices
      const rawPriceVal = (priceIdx !== -1 && row[priceIdx]) ? parsePrice(row[priceIdx]) : (row[3] ? parsePrice(row[3]) : 0);
      const rawPromoPriceVal = (promoPriceIdx !== -1 && row[promoPriceIdx]) ? parsePrice(row[promoPriceIdx]) : 0;

      let finalPrice = rawPriceVal;
      let origPrice: number | undefined = undefined;
      let promPrice: number | undefined = undefined;

      if (rawPromoPriceVal > 0 && rawPriceVal > 0 && rawPromoPriceVal < rawPriceVal) {
        finalPrice = rawPromoPriceVal;
        origPrice = rawPriceVal;
        promPrice = rawPromoPriceVal;
      } else if (tabType === "alltimepromo" || tabType === "seasonal") {
        finalPrice = rawPriceVal;
        promPrice = rawPriceVal;
      }

      // Extract Images
      const rawCookedImage = cookedImgIdx !== -1 ? parseGoogleDriveDirectUrl(row[cookedImgIdx]) : undefined;
      const rawPackagingImage = packImgIdx !== -1 ? parseGoogleDriveDirectUrl(row[packImgIdx]) : undefined;
      const rawGeneralImage = imageIdx !== -1 ? parseGoogleDriveDirectUrl(row[imageIdx]) : (row[4] ? parseGoogleDriveDirectUrl(row[4]) : undefined);

      const fallbackImage = getCategoryFallbackImage(rawCategory, rawName);
      const primaryImage = rawCookedImage || rawGeneralImage || rawPackagingImage || fallbackImage;

      // Description
      const rawDesc = (descIdx !== -1 && row[descIdx]) ? String(row[descIdx]).trim() : (row[5] ? String(row[5]).trim() : "");
      const defaultDesc = tabType === "seasonal"
        ? "Promosi bermusim istimewa daripada FrozenBergerak. Sedia ditempah terus ke WhatsApp!"
        : tabType === "alltimepromo"
        ? "Tawaran harga istimewa All Time Promo berkualiti tinggi daripada FrozenBergerak."
        : "Makanan sejuk beku berkualiti tinggi daripada FrozenBergerak. Sedia untuk dimasak panas dan dinikmati bersama seisi keluarga.";

      // Status / In Stock
      const rawStatus = (statusIdx !== -1 && row[statusIdx]) ? String(row[statusIdx]).trim().toLowerCase() : (row[6] ? String(row[6]).trim().toLowerCase() : "available");
      const inStock =
        rawStatus === "" ||
        rawStatus.includes("avail") ||
        rawStatus.includes("ada") ||
        rawStatus.includes("ready") ||
        rawStatus.includes("aktif") ||
        rawStatus.includes("active") ||
        rawStatus === "1" ||
        rawStatus === "ya" ||
        rawStatus === "yes" ||
        (!rawStatus.includes("habis") && !rawStatus.includes("out") && !rawStatus.includes("tidak") && !rawStatus.includes("inactive") && !rawStatus.includes("tamat") && !rawStatus.includes("batal"));

      products.push({
        id: rawId,
        name: rawName,
        category: rawCategory,
        price: finalPrice,
        originalPrice: origPrice,
        promoPrice: promPrice,
        unit: rawName.toLowerCase().includes("pek") ? "" : "1 pek",
        description: rawDesc || defaultDesc,
        imageUrl: primaryImage,
        cookedImageUrl: rawCookedImage,
        packagingImageUrl: rawPackagingImage,
        isPopular: tabType !== "produk" || promPrice !== undefined || r <= 4,
        isNew: tabType === "seasonal" || r === 1,
        inStock,
        halalCertified: true,
        storageInfo: "Simpan pada suhu sejuk beku (-18°C). Nyahbeku sebelum memasak mengikut arahan penyediaan.",
        hidePrice: tabType === "seasonal"
      });
    }

    return products;
  } catch (error) {
    console.error(`Error in parseTabRowsSafely (${tabType}):`, error);
    return [];
  }
}

/**
 * Merges products from Produk, Alltimepromo, and Seasonal tabs safely into a unified catalog
 */
export function mergeTabProducts(
  produkList: Product[],
  alltimeList: Product[],
  seasonalList: Product[]
): Product[] {
  const merged: Product[] = [...produkList];

  const addOrUpdate = (item: Product, defaultCategory: string) => {
    const existingIdx = merged.findIndex(
      (m) =>
        (m.id && item.id && m.id.toLowerCase() === item.id.toLowerCase()) ||
        (m.name && item.name && m.name.trim().toLowerCase() === item.name.trim().toLowerCase())
    );

    if (existingIdx !== -1) {
      // Update existing item with promo pricing/tags
      const current = merged[existingIdx];
      merged[existingIdx] = {
        ...current,
        promoPrice: item.promoPrice || current.promoPrice || item.price,
        originalPrice: current.originalPrice || current.price,
        price: item.promoPrice || item.price || current.price,
        isPopular: true,
        hidePrice: Boolean(current.hidePrice || item.hidePrice),
        imageUrl: current.imageUrl || item.imageUrl,
        cookedImageUrl: current.cookedImageUrl || item.cookedImageUrl,
        packagingImageUrl: current.packagingImageUrl || item.packagingImageUrl
      };
    } else {
      // Add as new catalog product
      merged.push({
        ...item,
        category: item.category || defaultCategory,
        isPopular: true
      });
    }
  };

  alltimeList.forEach((it) => addOrUpdate(it, "All Time Promo"));
  seasonalList.forEach((it) => addOrUpdate({ ...it, hidePrice: true }, "PROMOSI BERMUSIM"));

  return merged;
}

export function buildCategoriesFromProducts(products: Product[]): Category[] {
  const categoryMap = new Map<string, { displayName: string; count: number }>();
  products.forEach((p) => {
    const rawCat = String(p.category || "Lain-lain").replace(/\s+/g, " ").trim() || "Lain-lain";
    const key = rawCat.toLowerCase();
    const existing = categoryMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      categoryMap.set(key, { displayName: rawCat, count: 1 });
    }
  });

  const categories: Category[] = [
    { id: "all", name: "Semua Produk", icon: "Grid", count: products.length },
    ...Array.from(categoryMap.values()).map(({ displayName, count }) => {
      let icon = "Grid";
      const lower = displayName.toLowerCase();
      if (lower.includes("pau") || lower.includes("dimsum") || lower.includes("dim sum")) icon = "Soup";
      else if (lower.includes("muffin") || lower.includes("kuih") || lower.includes("karipap")) icon = "Cookie";
      else if (lower.includes("corndough") || lower.includes("popia") || lower.includes("snek")) icon = "Utensils";
      else if (lower.includes("ayam") || lower.includes("daging")) icon = "Flame";
      else if (lower.includes("laut") || lower.includes("ikan") || lower.includes("udang")) icon = "Fish";

      return {
        id: displayName,
        name: displayName,
        icon,
        count
      };
    })
  ];

  return categories;
}

// Generate the 41 pre-parsed products
export const DEFAULT_CATALOG_PRODUCTS: Product[] = (() => {
  try {
    const prods = parseCatalogCSV(RAW_CATALOG_CSV);
    return Array.isArray(prods) ? prods : [];
  } catch (err) {
    console.error("Error parsing default catalog products:", err);
    return [];
  }
})();

export const DEFAULT_CATALOG_CATEGORIES: Category[] = (() => {
  try {
    return buildCategoriesFromProducts(DEFAULT_CATALOG_PRODUCTS);
  } catch (err) {
    console.error("Error building default catalog categories:", err);
    return [{ id: "all", name: "Semua Produk", icon: "Grid", count: 0 }];
  }
})();

export function getSheetCsvEndpoints(sheetUrlOrId: string): string[] {
  try {
    if (!sheetUrlOrId || typeof sheetUrlOrId !== "string") return [];
    const trimmed = sheetUrlOrId.trim();
    if (!trimmed) return [];

    // If it's already a full CSV url
    if (trimmed.includes("output=csv") || trimmed.includes("export?format=csv") || trimmed.includes("tqx=out:csv")) {
      return [trimmed];
    }

    const sheetId = extractSheetId(trimmed);
    if (!sheetId) return [];

    return [
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`,
      `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv`
    ];
  } catch (e) {
    console.warn("Error getting sheet CSV endpoints:", e);
    return [];
  }
}

export async function fetchSheetTabCsv(
  sheetId: string,
  tabAliases: string[],
  allowDefaultSheet = false
): Promise<string | null> {
  const urls: string[] = [];

  for (const alias of tabAliases) {
    const enc = encodeURIComponent(alias);
    urls.push(
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${enc}`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=${enc}`,
      `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv&sheet=${enc}`
    );
  }

  if (allowDefaultSheet) {
    urls.push(
      `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`,
      `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`,
      `https://docs.google.com/spreadsheets/d/e/${sheetId}/pub?output=csv`
    );
  }

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "text/csv, text/plain, */*"
        }
      });
      if (res.ok) {
        const text = await res.text();
        if (text && !text.includes("<!DOCTYPE html") && !text.includes("<html") && text.trim().length > 10) {
          return text;
        }
      }
    } catch {
      // Continue to next endpoint URL
    }
  }

  return null;
}

/**
 * Fetches and parses live product catalog data directly from Google Sheet CSV export link
 * Independently fetches Produk, Alltimepromo, and Seasonal tabs with flexible column matching
 * and column index fallback (A=ID, B=Name, C=Category, D=Price, E=Image), merging them safely.
 */
export async function fetchLiveCatalog(
  sheetUrlOrId?: string,
  forceRefresh = false
): Promise<{ products: Product[]; categories: Category[]; source: string }> {
  try {
    let targetSheet = "";
    try {
      targetSheet = sheetUrlOrId?.trim() || (typeof window !== "undefined" && window.localStorage ? (localStorage.getItem("custom_google_sheet_url") || "") : "");
    } catch {
      targetSheet = sheetUrlOrId?.trim() || "";
    }

    // 1. If custom sheet URL/ID is provided, attempt client-side independent multi-tab fetch
    if (targetSheet) {
      const sheetId = extractSheetId(targetSheet);
      if (sheetId) {
        let produkItems: Product[] = [];
        let alltimeItems: Product[] = [];
        let seasonalItems: Product[] = [];

        // Fetch Produk tab independently
        try {
          const csvText = await fetchSheetTabCsv(
            sheetId,
            ["Produk", "PRODUK", "produk", "Products", "Sheet1", "Catalog", "Katalog"],
            true
          );
          if (csvText) {
            produkItems = parseTabCsvSafely(csvText, "produk");
          }
        } catch (err) {
          console.warn("Client fetch Produk tab error (handled safely):", err);
          produkItems = [];
        }

        // Fetch Alltimepromo tab independently
        try {
          const csvText = await fetchSheetTabCsv(sheetId, [
            "Alltimepromo",
            "All Time Promo",
            "ALL TIME PROMO",
            "alltimepromo",
            "ALLTIMEPROMO",
            "AllTimePromo",
            "Alltime Promo",
            "All-Time Promo",
            "All_Time_Promo",
            "Promo",
            "PROMO",
            "Promosi"
          ]);
          if (csvText) {
            alltimeItems = parseTabCsvSafely(csvText, "alltimepromo");
          }
        } catch (err) {
          console.warn("Client fetch Alltimepromo tab error (handled safely):", err);
          alltimeItems = [];
        }

        // Fetch Seasonal tab independently
        try {
          const csvText = await fetchSheetTabCsv(sheetId, [
            "Seasonal",
            "SEASONAL",
            "seasonal",
            "Seasonalpromo",
            "Seasonal Promo",
            "SEASONAL PROMO",
            "seasonalpromo",
            "SEASONALPROMO",
            "SeasonalPromo",
            "Promosi Musiman",
            "PROMOSI MUSIMAN",
            "Musiman",
            "MUSIMAN"
          ]);
          if (csvText) {
            seasonalItems = parseTabCsvSafely(csvText, "seasonal");
          }
        } catch (err) {
          console.warn("Client fetch Seasonal tab error (handled safely):", err);
          seasonalItems = [];
        }

        // Merge all valid items from all tabs into the main catalog display
        const merged = mergeTabProducts(produkItems, alltimeItems, seasonalItems);
        if (merged.length > 0) {
          const cats = buildCategoriesFromProducts(merged);
          try {
            if (typeof window !== "undefined" && window.localStorage) {
              localStorage.setItem("cached_catalog_products", JSON.stringify(merged));
              localStorage.setItem("cached_catalog_categories", JSON.stringify(cats));
            }
          } catch {}
          return { products: merged, categories: cats, source: "google_sheet_direct_csv" };
        }
      }
    }

    // 2. Try backend /api/products with no-store cache busting
    try {
      const params = new URLSearchParams();
      if (forceRefresh) params.set("refresh", "true");
      if (targetSheet) params.set("sheetUrl", targetSheet);
      params.set("_t", String(Date.now()));

      const apiRes = await fetch(`/api/products?${params.toString()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
      const data = await parseJsonIfValid(apiRes);
      if (data && Array.isArray(data.products) && data.products.length > 0) {
        const cats = buildCategoriesFromProducts(data.products);
        try {
          if (typeof window !== "undefined" && window.localStorage) {
            localStorage.setItem("cached_catalog_products", JSON.stringify(data.products));
            localStorage.setItem("cached_catalog_categories", JSON.stringify(cats));
          }
        } catch {}
        return { products: data.products, categories: cats, source: data.source || "server_google_sheet" };
      }
    } catch (err) {
      console.warn("Server /api/products fetch error:", err);
    }

    // 2b. Direct Google Apps Script Web App fallback (?action=getProducts)
    if (GOOGLE_APPS_SCRIPT_WEB_APP_URL) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const gasRes = await fetch(`${GOOGLE_APPS_SCRIPT_WEB_APP_URL}?action=getProducts&_t=${Date.now()}`, {
            cache: "no-store",
            redirect: "follow",
            signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined
          });
          const gasData = await parseJsonIfValid(gasRes);
          const rawProducts = Array.isArray(gasData?.products) ? gasData.products : Array.isArray(gasData) ? gasData : [];
          if (rawProducts.length > 0) {
            const normalized: Product[] = rawProducts.map((p: any, idx: number) => {
              const cat = String(p.category || "Lain-lain").trim();
              const cooked = p.cookedImageUrl ? parseGoogleDriveDirectUrl(p.cookedImageUrl) : undefined;
              const pack = p.packagingImageUrl ? parseGoogleDriveDirectUrl(p.packagingImageUrl) : undefined;
              const img = p.imageUrl ? parseGoogleDriveDirectUrl(p.imageUrl) : undefined;
              return {
                id: String(p.id || `FB-${idx + 1}`),
                name: String(p.name || p.title || "Produk"),
                category: cat,
                price: Number(p.price) || 0,
                originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
                promoPrice: p.promoPrice ? Number(p.promoPrice) : undefined,
                unit: String(p.unit || "1 pek"),
                description: String(p.description || ""),
                imageUrl: cooked || img || pack || getCategoryFallbackImage(cat, String(p.name || "")),
                cookedImageUrl: cooked,
                packagingImageUrl: pack,
                inStock: p.inStock !== false,
                halalCertified: true
              };
            });
            const cats = buildCategoriesFromProducts(normalized);
            try {
              if (typeof window !== "undefined" && window.localStorage) {
                localStorage.setItem("cached_catalog_products", JSON.stringify(normalized));
                localStorage.setItem("cached_catalog_categories", JSON.stringify(cats));
              }
            } catch {}
            return { products: normalized, categories: cats, source: "google_apps_script_direct" };
          }
        } catch (gasErr) {
          console.warn("Direct Apps Script getProducts fallback notice:", gasErr);
        }
      }
    }

    // 3. Fallback to cached products in localStorage
    try {
      const cachedStr = typeof window !== "undefined" && window.localStorage ? localStorage.getItem("cached_catalog_products") : null;
      if (cachedStr) {
        const parsed = JSON.parse(cachedStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return {
            products: parsed,
            categories: buildCategoriesFromProducts(parsed),
            source: "local_cache"
          };
        }
      }
    } catch {}

    // 4. Fallback to default catalog (the 41 products provided by user) or empty array
    if (Array.isArray(DEFAULT_CATALOG_PRODUCTS) && DEFAULT_CATALOG_PRODUCTS.length > 0) {
      return {
        products: DEFAULT_CATALOG_PRODUCTS,
        categories: Array.isArray(DEFAULT_CATALOG_CATEGORIES) ? DEFAULT_CATALOG_CATEGORIES : [],
        source: "default_catalog"
      };
    }

    return {
      products: [],
      categories: [{ id: "all", name: "Semua Produk", icon: "Grid", count: 0 }],
      source: "empty_fallback"
    };
  } catch (error) {
    console.error("Error in fetchLiveCatalog Google Sheets CSV fetch logic, falling back to empty array:", error);
    return {
      products: [],
      categories: [{ id: "all", name: "Semua Produk", icon: "Grid", count: 0 }],
      source: "error_fallback"
    };
  }
}

async function fetchPromosViaDirectGas(
  action: "getPromos" | "getSeasonalPromos",
  prefix: "PROMO" | "SEA"
): Promise<{ promos: PromoItem[]; confirmedEmpty: boolean; ok: boolean }> {
  if (!GOOGLE_APPS_SCRIPT_WEB_APP_URL) {
    return { promos: [], confirmedEmpty: false, ok: false };
  }

  const actionsToTry = [action, "getAll"] as const;

  for (const act of actionsToTry) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${GOOGLE_APPS_SCRIPT_WEB_APP_URL}?action=${act}&_t=${Date.now()}`, {
          cache: "no-store",
          redirect: "follow",
          signal: typeof AbortSignal !== "undefined" && AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined
        });
        const data = await parseJsonIfValid(res);
        if (!data || typeof data !== "object") continue;

        const list =
          action === "getSeasonalPromos"
            ? (Array.isArray(data.seasonalPromos) ? data.seasonalPromos : Array.isArray(data.promos) && act === "getSeasonalPromos" ? data.promos : null)
            : (Array.isArray(data.promos) ? data.promos : null);

        if (Array.isArray(list)) {
          const normalized = list
            .map((item: any, i: number) => normalizePromoItem(item, i, prefix))
            .filter((item: PromoItem) => Boolean(item.title) && isPromoActiveStatus(item.status));

          if (normalized.length > 0) {
            return { promos: normalized, confirmedEmpty: false, ok: true };
          }
          if (data.success === true) {
            return { promos: [], confirmedEmpty: true, ok: true };
          }
        }
      } catch {
        // Retry or move to fallback action
      }
    }
  }

  return { promos: [], confirmedEmpty: false, ok: false };
}

export async function fetchLivePromos(
  sheetUrlOrId?: string,
  forceRefresh = false
): Promise<{ promos: PromoItem[]; source: string; confirmedEmpty: boolean }> {
  const CACHE_KEY = "cached_all_time_promos";
  const saveCache = (items: PromoItem[]) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(items));
      }
    } catch {}
  };
  const clearCache = () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(CACHE_KEY);
      }
    } catch {}
  };

  try {
    let targetSheet = "";
    try {
      targetSheet = sheetUrlOrId?.trim() || (typeof window !== "undefined" && window.localStorage ? (localStorage.getItem("custom_google_sheet_url") || "") : "");
    } catch {
      targetSheet = sheetUrlOrId?.trim() || "";
    }

    // 1. Try Express backend /api/promos (ignored cleanly on Netlify static HTML responses)
    if (!targetSheet) {
      try {
        const params = new URLSearchParams();
        if (forceRefresh) params.set("refresh", "true");
        params.set("_t", String(Date.now()));
        const apiRes = await fetch(`/api/promos?${params.toString()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        });
        const apiData = await parseJsonIfValid(apiRes);
        if (apiData && Array.isArray(apiData.promos)) {
          const normalized = apiData.promos
            .map((p: any, i: number) => normalizePromoItem(p, i, "PROMO"))
            .filter((p: PromoItem) => Boolean(p.title) && isPromoActiveStatus(p.status));

          if (normalized.length > 0) {
            saveCache(normalized);
            return { promos: normalized, source: apiData.source || "server_api", confirmedEmpty: false };
          }
          if (apiData.source === "google_apps_script_empty" || apiData.source === "alltimepromo_sheet") {
            clearCache();
            return { promos: [], source: apiData.source, confirmedEmpty: true };
          }
        }
      } catch {
        // Proceed directly to Apps Script & CSV fallbacks
      }
    }

    // 2. Direct Google Apps Script Web App (?action=getPromos, then ?action=getAll)
    if (!targetSheet) {
      const gasResult = await fetchPromosViaDirectGas("getPromos", "PROMO");
      if (gasResult.ok) {
        if (gasResult.promos.length > 0) {
          saveCache(gasResult.promos);
          return { promos: gasResult.promos, source: "google_apps_script_direct", confirmedEmpty: false };
        }
        if (gasResult.confirmedEmpty) {
          clearCache();
          return { promos: [], source: "google_apps_script_empty", confirmedEmpty: true };
        }
      }
    }

    // 3. Direct Google Sheet CSV fallback for Alltimepromo tab
    const sheetId = extractSheetId(targetSheet) || DEFAULT_FROZEN_BERGERAK_SHEET_ID;
    if (sheetId) {
      try {
        const csvText = await fetchSheetTabCsv(sheetId, [
          "Alltimepromo",
          "All Time Promo",
          "ALL TIME PROMO",
          "alltimepromo",
          "ALLTIMEPROMO",
          "AllTimePromo",
          "Alltime Promo",
          "All-Time Promo",
          "All_Time_Promo",
          "Promo",
          "PROMO",
          "Promosi"
        ]);
        if (csvText) {
          const rows = parseCSVLines(csvText);
          const headerText = (rows[0] || []).join(" ").toUpperCase();
          const isMainCatalogFallback = headerText.includes("GAMBAR SIAP MASAK") || headerText.includes("GAMBAR PACKAGING");
          if (rows.length >= 2 && !isMainCatalogFallback) {
            const parsedProducts = parseTabRowsSafely(rows, "alltimepromo");
            const activePromos = parsedProducts
              .filter((p) => p.inStock)
              .map((p, i) => normalizePromoItem({
                id: p.id,
                title: p.name,
                description: p.description,
                imageUrl: p.imageUrl,
                originalPrice: p.originalPrice,
                promoPrice: p.promoPrice || p.price,
                status: p.inStock ? "Aktif" : "Habis",
                unit: p.unit
              }, i, "PROMO"));

            if (activePromos.length > 0) {
              saveCache(activePromos);
              return { promos: activePromos, source: "google_sheet_direct_csv", confirmedEmpty: false };
            }
            clearCache();
            return { promos: [], source: "google_sheet_csv_empty", confirmedEmpty: true };
          }
        }
      } catch {
        // Fallback to cache
      }
    }

    // 4. Preserve cached promos on transient network outage
    const cached = readCachedPromos(CACHE_KEY);
    if (cached.length > 0) {
      return { promos: cached, source: "local_cache", confirmedEmpty: false };
    }

    return { promos: [], source: "unavailable", confirmedEmpty: false };
  } catch (err) {
    console.warn("fetchLivePromos fallback:", err);
    const cached = readCachedPromos(CACHE_KEY);
    return { promos: cached, source: cached.length > 0 ? "local_cache" : "error", confirmedEmpty: false };
  }
}

export async function fetchLiveSeasonalPromos(
  sheetUrlOrId?: string,
  forceRefresh = false
): Promise<{ promos: PromoItem[]; source: string; confirmedEmpty: boolean }> {
  const CACHE_KEY = "cached_seasonal_promos";
  const saveCache = (items: PromoItem[]) => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(items));
      }
    } catch {}
  };
  const clearCache = () => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(CACHE_KEY);
      }
    } catch {}
  };

  try {
    let targetSheet = "";
    try {
      targetSheet = sheetUrlOrId?.trim() || (typeof window !== "undefined" && window.localStorage ? (localStorage.getItem("custom_google_sheet_url") || "") : "");
    } catch {
      targetSheet = sheetUrlOrId?.trim() || "";
    }

    // 1. Try Express backend /api/seasonal-promos
    if (!targetSheet) {
      try {
        const params = new URLSearchParams();
        if (forceRefresh) params.set("refresh", "true");
        params.set("_t", String(Date.now()));
        const apiRes = await fetch(`/api/seasonal-promos?${params.toString()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        });
        const apiData = await parseJsonIfValid(apiRes);
        const apiList = Array.isArray(apiData?.promos)
          ? apiData.promos
          : Array.isArray(apiData?.seasonalPromos)
          ? apiData.seasonalPromos
          : null;

        if (apiData && Array.isArray(apiList)) {
          const normalized = apiList
            .map((p: any, i: number) => normalizePromoItem(p, i, "SEA"))
            .filter((p: PromoItem) => Boolean(p.title) && isPromoActiveStatus(p.status));

          if (normalized.length > 0) {
            saveCache(normalized);
            return { promos: normalized, source: apiData.source || "server_api", confirmedEmpty: false };
          }
          if (apiData.source === "google_apps_script_empty" || apiData.source === "seasonalpromo_sheet" || apiData.source === "empty") {
            clearCache();
            return { promos: [], source: apiData.source, confirmedEmpty: true };
          }
        }
      } catch {
        // Proceed to Apps Script fallback
      }
    }

    // 2. Direct Google Apps Script Web App
    if (!targetSheet) {
      const gasResult = await fetchPromosViaDirectGas("getSeasonalPromos", "SEA");
      if (gasResult.ok) {
        if (gasResult.promos.length > 0) {
          saveCache(gasResult.promos);
          return { promos: gasResult.promos, source: "google_apps_script_direct", confirmedEmpty: false };
        }
        if (gasResult.confirmedEmpty) {
          clearCache();
          return { promos: [], source: "google_apps_script_empty", confirmedEmpty: true };
        }
      }
    }

    // 3. Direct CSV fallback for Seasonal tab
    const sheetId = extractSheetId(targetSheet) || DEFAULT_FROZEN_BERGERAK_SHEET_ID;
    if (sheetId) {
      try {
        const csvText = await fetchSheetTabCsv(sheetId, [
          "Seasonalpromo",
          "Seasonal Promo",
          "SEASONAL PROMO",
          "seasonalpromo",
          "SEASONALPROMO",
          "SeasonalPromo",
          "Seasonal",
          "SEASONAL",
          "seasonal",
          "Promosi Musiman",
          "PROMOSI MUSIMAN"
        ]);
        if (csvText) {
          const rows = parseCSVLines(csvText);
          const headerText = (rows[0] || []).join(" ").toUpperCase();
          const isMainCatalogFallback = headerText.includes("GAMBAR SIAP MASAK") || headerText.includes("GAMBAR PACKAGING");
          if (rows.length >= 2 && !isMainCatalogFallback) {
            const parsedProducts = parseTabRowsSafely(rows, "seasonal");
            const activePromos = parsedProducts
              .filter((p) => p.inStock)
              .map((p, i) => normalizePromoItem({
                id: p.id,
                title: p.name,
                description: p.description,
                imageUrl: p.imageUrl,
                originalPrice: p.originalPrice,
                promoPrice: p.promoPrice || p.price,
                status: p.inStock ? "Aktif" : "Habis",
                unit: p.unit
              }, i, "SEA"));

            if (activePromos.length > 0) {
              saveCache(activePromos);
              return { promos: activePromos, source: "google_sheet_direct_csv", confirmedEmpty: false };
            }
            clearCache();
            return { promos: [], source: "google_sheet_csv_empty", confirmedEmpty: true };
          }
        }
      } catch {}
    }

    const cached = readCachedPromos(CACHE_KEY);
    if (cached.length > 0) {
      return { promos: cached, source: "local_cache", confirmedEmpty: false };
    }

    return { promos: [], source: "unavailable", confirmedEmpty: false };
  } catch (err) {
    console.warn("fetchLiveSeasonalPromos fallback:", err);
    const cached = readCachedPromos(CACHE_KEY);
    return { promos: cached, source: cached.length > 0 ? "local_cache" : "error", confirmedEmpty: false };
  }
}
