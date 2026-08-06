export interface Provider {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  distance: string;
  price: string;
  verified: boolean;
  premium: boolean;
  responseTime: string;
  description: string;
  services: string[];
  location: string;
}

export const SAMPLE_PROVIDERS: Provider[] = [
  {
    id: "1",
    name: "Ahmet Yılmaz",
    category: "ac",
    rating: 4.9,
    reviewCount: 127,
    completedJobs: 245,
    distance: "1.2 km",
    price: "₺250-800",
    verified: true,
    premium: true,
    responseTime: "~15 dk",
    description: "10 yıllık tecrübe ile klima montaj, bakım ve tamir hizmeti",
    services: ["Klima Montajı", "Klima Bakımı", "Klima Tamiri"],
    location: "Kadıköy, İstanbul",
  },
  {
    id: "2",
    name: "Yıldız Nakliyat",
    category: "moving",
    rating: 4.7,
    reviewCount: 89,
    completedJobs: 312,
    distance: "3.5 km",
    price: "₺2.000-8.000",
    verified: true,
    premium: false,
    responseTime: "~30 dk",
    description: "Profesyonel ev ve ofis taşıma hizmeti, sigortalı",
    services: ["Ev Taşıma", "Ofis Taşıma", "Eşya Depolama"],
    location: "Ataşehir, İstanbul",
  },
  {
    id: "3",
    name: "Mehmet Demir",
    category: "plumbing",
    rating: 4.8,
    reviewCount: 203,
    completedJobs: 456,
    distance: "0.8 km",
    price: "₺150-500",
    verified: true,
    premium: true,
    responseTime: "~10 dk",
    description: "Acil su tesisatı hizmeti, 7/24 ulaşılabilir",
    services: ["Tıkanıklık Açma", "Musluk Tamiri", "Sızdırma Onarım"],
    location: "Üsküdar, İstanbul",
  },
  {
    id: "4",
    name: "Elif Temizlik",
    category: "cleaning",
    rating: 4.6,
    reviewCount: 156,
    completedJobs: 520,
    distance: "2.1 km",
    price: "₺500-1.500",
    verified: true,
    premium: false,
    responseTime: "~20 dk",
    description: "Detaylı ev ve ofis temizliği, güvenilir ekip",
    services: ["Ev Temizliği", "Ofis Temizliği", "Derin Temizlik"],
    location: "Beşiktaş, İstanbul",
  },
  {
    id: "5",
    name: "Hasan Elektrik",
    category: "electrical",
    rating: 4.9,
    reviewCount: 98,
    completedJobs: 189,
    distance: "1.8 km",
    price: "₺200-600",
    verified: true,
    premium: true,
    responseTime: "~12 dk",
    description: "Elektrik tesisat, aydınlatma ve sigorta işleri",
    services: ["Priz/Anahtar", "Aydınlatma", "Sigorta", "Kablo Döşeme"],
    location: "Şişli, İstanbul",
  },
];

