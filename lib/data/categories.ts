export interface ServiceCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  subcategories: string[];
  pricingType?: "fixed" | "km_based" | "hourly";
  kmRate?: number; // TL per km
  basePrice?: number; // Base price in TL
}

export const CATEGORIES: ServiceCategory[] = [
  {
    id: "cleaning",
    name: "Temizlik",
    icon: "🧹",
    color: "#10B981",
    subcategories: ["Ev Temizliği", "Ofis Temizliği", "Derin Temizlik", "Cam Temizliği"],
  },
  {
    id: "plumbing",
    name: "Su Tesisatı",
    icon: "🔧",
    color: "#3B82F6",
    subcategories: ["Tıkanıklık Açma", "Musluk Tamiri", "Sızdırma Onarım", "Boru Döşeme"],
  },
  {
    id: "electrical",
    name: "Elektrik",
    icon: "⚡",
    color: "#F59E0B",
    subcategories: ["Priz/Anahtar", "Aydınlatma", "Sigorta", "Kablo Döşeme"],
  },
  {
    id: "painting",
    name: "Boya & Badana",
    icon: "🎨",
    color: "#8B5CF6",
    subcategories: ["İç Cephe Boya", "Dış Cephe Boya", "Dekoratif Boya", "Alçı İşleri"],
  },
  {
    id: "ac",
    name: "Klima",
    icon: "❄️",
    color: "#06B6D4",
    subcategories: ["Klima Montajı", "Klima Bakımı", "Klima Tamiri", "Klima Temizliği"],
  },
  {
    id: "heating",
    name: "Kombi & Isıtma",
    icon: "🔥",
    color: "#EF4444",
    subcategories: ["Kombi Montajı", "Kombi Bakımı", "Kombi Tamiri", "Kalorifer Tamiri"],
  },
  {
    id: "moving",
    name: "Nakliyat",
    icon: "🚚",
    color: "#F97316",
    subcategories: ["Ev Taşıma", "Ofis Taşıma", "Eşya Taşıma", "Şehirler Arası"],
  },
  {
    id: "locksmith",
    name: "Çilingir",
    icon: "🔑",
    color: "#6366F1",
    subcategories: ["Kapı Açma", "Kilit Değişimi", "Anahtar Kopyalama", "Çelik Kapı"],
  },
  {
    id: "furniture",
    name: "Mobilya Montaj",
    icon: "🪑",
    color: "#A855F7",
    subcategories: ["Dolap Montajı", "Mutfak Montajı", "Raf Montajı", "Demontaj"],
  },
  {
    id: "car",
    name: "Araç Hizmetleri",
    icon: "🚗",
    color: "#64748B",
    subcategories: ["Lastik Değişimi", "Akü Takviye", "Oto Tamiri"],
    pricingType: "fixed",
  },
  {
    id: "garden",
    name: "Bahçe",
    icon: "🌿",
    color: "#22C55E",
    subcategories: ["Bahçe Düzenleme", "Çim Biçme", "Ağaç Budama", "Peyzaj"],
  },
  {
    id: "petcare",
    name: "Evcil Hayvan",
    icon: "🐾",
    color: "#EC4899",
    subcategories: ["Bakım", "Gezdirme", "Veteriner", "Eğitim"],
  },
  {
    id: "courier",
    name: "Kurye & Evrak",
    icon: "📦",
    color: "#0EA5E9",
    subcategories: ["Evrak Teslim", "Paket Gönderimi", "Moto Kurye", "Araçlı Kurye"],
    pricingType: "km_based",
    kmRate: 12,
    basePrice: 50,
  },
  {
    id: "tow_truck",
    name: "Çekici",
    icon: "🚛",
    color: "#DC2626",
    subcategories: ["Şehir İçi Çekici", "Şehirler Arası Çekici", "Ağır Vasıta Çekici", "Motosiklet Çekici"],
    pricingType: "km_based",
    kmRate: 25,
    basePrice: 200,
  },
  {
    id: "roadside",
    name: "Yol Yardım",
    icon: "🚨",
    color: "#B91C1C",
    subcategories: ["Akü Takviye", "Lastik Değişimi", "Yakıt İkmali", "Kilit Açma", "Arıza Çekici"],
    pricingType: "km_based",
    kmRate: 18,
    basePrice: 100,
  },
];
