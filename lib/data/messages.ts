export interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar?: string;
}

export const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    name: "Ahmet Usta",
    lastMessage: "Yarın saat 10'da gelirim, uygun mu?",
    time: "14:30",
    unread: 2,
  },
  {
    id: "2",
    name: "Yıldız Nakliyat",
    lastMessage: "Asansör var mı binada?",
    time: "12:15",
    unread: 0,
  },
  {
    id: "3",
    name: "MoveAI Asistan",
    lastMessage: "Size nasıl yardımcı olabilirim?",
    time: "Dün",
    unread: 0,
  },
  {
    id: "4",
    name: "Mehmet Tesisatçı",
    lastMessage: "İş tamamlandı, iyi günler!",
    time: "1 Ağu",
    unread: 0,
  },
];
