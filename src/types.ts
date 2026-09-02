export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  promoPrice?: number;
  unit: string;
  description: string;
  imageUrl: string;
  cookedImageUrl?: string;
  packagingImageUrl?: string;
  isPopular?: boolean;
  isNew?: boolean;
  inStock: boolean;
  halalCertified: boolean;
  weight?: string;
  storageInfo?: string;
}

export interface PromoItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  originalPrice?: number;
  promoPrice?: number;
  status: string;
  unit?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count?: number;
  badge?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export interface CustomerOrderInfo {
  name: string;
  phone: string;
  address: string;
  deliveryType: 'penghantaran' | 'ambil_sendiri';
  notes: string;
}

export interface StoreConfig {
  name: string;
  tagline: string;
  whatsappNumber: string;
  location: string;
  operatingHours: string;
  deliveryNotice: string;
  heroBannerUrl?: string;
  googleSheetConnected?: boolean;
  totalProducts?: number;
  lastUpdated?: string;
}

export type ScheduleStatus = 'sedang_bergerak' | 'akan_datang' | 'selesai' | 'dibatalkan' | 'Sedang Bergerak' | 'Akan Datang' | 'Selesai';

export interface ScheduleItem {
  id: string;
  teamName: string;
  driverName?: string;
  date: string;
  timeSlot: string;
  locations: string;
  notes?: string;
  status: ScheduleStatus;
  lastUpdated?: string;
}

export interface PushSubscriptionRecord {
  id?: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  subscribedAt: string;
}

export type UserRole = 'admin' | 'team' | 'customer';

export interface AuthUser {
  email: string;
  name: string;
  picture?: string;
  role: UserRole;
  token?: string;
}

export interface RolesConfig {
  adminEmails: string[];
  teamEmails: string[];
  lastModified?: string;
}
