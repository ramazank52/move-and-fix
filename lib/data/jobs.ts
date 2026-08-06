export interface Job {
  id: string;
  title: string;
  category: string;
  status: "active" | "pending" | "completed" | "cancelled";
  providerName: string;
  date: string;
  price: string;
  location: string;
  description: string;
}

export const SAMPLE_JOBS: Job[] = [
  {
    id: "1",
    title: "Klima Bakımı",
    category: "ac",
    status: "active",
    providerName: "Ahmet Usta",
    date: "6 Ağustos 2026",
    price: "₺850",
    location: "Kadıköy, İstanbul",
    description: "3 adet split klima bakım ve temizliği",
  },
  {
    id: "2",
    title: "Ev Taşıma",
    category: "moving",
    status: "pending",
    providerName: "Yıldız Nakliyat",
    date: "10 Ağustos 2026",
    price: "₺4.500",
    location: "Beşiktaş → Ataşehir",
    description: "3+1 daire ev taşıma, 3. kat asansörlü",
  },
  {
    id: "3",
    title: "Su Tesisatı Tamiri",
    category: "plumbing",
    status: "completed",
    providerName: "Mehmet Tesisatçı",
    date: "1 Ağustos 2026",
    price: "₺600",
    location: "Üsküdar, İstanbul",
    description: "Mutfak musluğu değişimi ve boru tamiri",
  },
  {
    id: "4",
    title: "Boya Badana",
    category: "painting",
    status: "completed",
    providerName: "Ali Boyacı",
    date: "25 Temmuz 2026",
    price: "₺3.200",
    location: "Maltepe, İstanbul",
    description: "2 oda 1 salon iç cephe boya",
  },
  {
    id: "5",
    title: "Çilingir",
    category: "locksmith",
    status: "cancelled",
    providerName: "Hızlı Çilingir",
    date: "20 Temmuz 2026",
    price: "₺350",
    location: "Şişli, İstanbul",
    description: "Kapı kilidi değişimi",
  },
];
