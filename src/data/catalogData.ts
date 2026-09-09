import { Product, Category } from "../types";
import { extractGoogleDriveFileId, formatImageUrl, getCategoryFallbackImage } from "../utils/googleDrive";

export const RAW_CATALOG_CSV = `ID,PRODUK,KATEGORI,HARGA,HARGA PROMO,GAMBAR SIAP MASAK,GAMBAR PACKAGING,PENERANGAN,STATUS
FB001,Pau Mini Kacang Merah,Pau,RM 15,,https://drive.google.com/file/d/15bXjrNxiC5quFRZVPPjdbLAUhPdOcJH5/view?usp=drivesdk,https://drive.google.com/file/d/1vmyXwtK_o-zwUrR5dYAo-5GY5MdQ0dgx/view?usp=drivesdk,,
FB002,Pau Mini Kaya,Pau,RM 15,,https://drive.google.com/file/d/1QzkfwOSa1vjD6mIqVCwiQko2aDXK9mCh/view?usp=drivesdk,https://drive.google.com/file/d/1fSnQTTzTrQHe9XU8TVTHn8k1Unknn1Yj/view?usp=drivesdk,,
FB003,Pau Mini Coklat,Pau,RM 15,,https://drive.google.com/file/d/1vmyXwtK_o-zwUrR5dYAo-5GY5MdQ0dgx/view?usp=drivesdk,https://drive.google.com/file/d/1dX3KeHKbTIEfCclZ2KaLDu8PqkyuYjkb/view?usp=drivesdk,,
FB004,Pau Mini Kelapa,Pau,RM 15,,https://drive.google.com/file/d/1fSnQTTzTrQHe9XU8TVTHn8k1Unknn1Yj/view?usp=drivesdk,https://drive.google.com/file/d/1HH8mmV-EZ6mIyIOJ6uELHRtoDE8s-0gD/view?usp=drivesdk,,
FB005,Pau Gebu Kacang Merah,Pau,RM 15,,https://drive.google.com/file/d/1dX3KeHKbTIEfCclZ2KaLDu8PqkyuYjkb/view?usp=drivesdk,https://drive.google.com/file/d/1hg5Utg_CfohG8tJCp2SyZGPTXTjgIAI2/view?usp=drivesdk,,
FB006,Pau Gebu Kaya,Pau,RM 15,,https://drive.google.com/file/d/1HH8mmV-EZ6mIyIOJ6uELHRtoDE8s-0gD/view?usp=drivesdk,https://drive.google.com/file/d/1dII4pym0Gm017ItwUZENew_vmvIvK9cC/view?usp=drivesdk,,
FB007,Pau Gebu Coklat,Pau,RM 15,,https://drive.google.com/file/d/1hg5Utg_CfohG8tJCp2SyZGPTXTjgIAI2/view?usp=drivesdk,https://drive.google.com/file/d/1dII4pym0Gm017ItwUZENew_vmvIvK9cC/view?usp=drivesdk,,
FB008,Pau Gebu Kelapa,Pau,RM 15,,https://drive.google.com/file/d/1dII4pym0Gm017ItwUZENew_vmvIvK9cC/view?usp=drivesdk,,,`;

export function parseCSVLines(csvText: string): string[][] {
  if (!csvText) return [];
  const lines = String(csvText).split(/\r?\n/);
  return lines
    .map(line => {
      const trimmed = String(line || '').trim();
      if (!trimmed) return [];
      return String(trimmed)
        .split(',')
        .map(cell => String(cell || '').trim().replace(/^"|"$/g, ''));
    })
    .filter(row => row.length > 0 && row.some(cell => cell !== ''));
}

export function parseCatalogData(csvText: string): Product[] {
  const rows = parseCSVLines(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => String(h || '').trim().toUpperCase());
  
  const idIdx = headers.findIndex(h => h.includes('ID'));
  const nameIdx = headers.findIndex(h => h.includes('PRODUK') || h.includes('NAMA'));
  const catIdx = headers.findIndex(h => h.includes('KATEGORI'));
  const priceIdx = headers.findIndex(h => h.includes('HARGA') && !h.includes('PROMO'));
  const promoIdx = headers.findIndex(h => h.includes('PROMO'));
  const imgCookedIdx = headers.findIndex(h => h.includes('SIAP MASAK') || h.includes('MASAK'));
  const imgPackIdx = headers.findIndex(h => h.includes('PACKAGING') || h.includes('BUNGKUS'));
  const descIdx = headers.findIndex(h => h.includes('PENERANGAN') || h.includes('DESKRIPSI'));
  const statusIdx = headers.findIndex(h => h.includes('STATUS'));

  return rows.slice(1).map((row, index) => {
    const getValue = (idx: number) => {
      if (idx === -1 || !row[idx]) return '';
      return String(row[idx] || '').trim();
    };

    const id = getValue(idIdx) || `PROD-${index + 1}`;
    const name = getValue(nameIdx) || `Produk ${index + 1}`;
    const category = (getValue(catIdx) || 'Lain-lain') as Category;
    
    const rawPrice = getValue(priceIdx).replace(/[^0-9.]/g, '');
    const price = parseFloat(rawPrice) || 0;

    const rawPromo = getValue(promoIdx).replace(/[^0-9.]/g, '');
    const promoPrice = rawPromo ? parseFloat(rawPromo) : undefined;

    const cookedRaw = getValue(imgCookedIdx);
    const packRaw = getValue(imgPackIdx);

    const cookedId = extractGoogleDriveFileId(cookedRaw);
    const packId = extractGoogleDriveFileId(packRaw);

    const fallbackImg = getCategoryFallbackImage(category);

    return {
      id,
      name,
      category,
      price,
      promoPrice,
      imageCooked: cookedId ? formatImageUrl(cookedId) : fallbackImg,
      imagePackaging: packId ? formatImageUrl(packId) : undefined,
      description: getValue(descIdx) || undefined,
      status: getValue(statusIdx) || 'Available'
    };
  });
}

export const INITIAL_PRODUCTS: Product[] = parseCatalogData(RAW_CATALOG_CSV);
