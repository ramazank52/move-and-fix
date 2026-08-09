-- Phase 31: additive, idempotent service catalog expansion.
-- Existing MoveOS-managed records are never overwritten on rerun.
INSERT IGNORE INTO `service_categories` (`name`, `slug`, `icon`, `color`, `pricingType`, `isActive`, `sortOrder`)
VALUES
  ('Ev Onarım', 'home-repair', '🛠️', '#0EA5E9', 'fixed', 1, 100),
  ('Otomotiv', 'automotive', '🚗', '#64748B', 'fixed', 1, 110),
  ('Teknoloji', 'technology', '💻', '#2563EB', 'fixed', 1, 120),
  ('Kişisel Bakım', 'personal-care', '✨', '#DB2777', 'fixed', 1, 130);

INSERT IGNORE INTO `service_subcategories` (`categoryId`, `name`, `slug`, `description`, `isActive`, `sortOrder`)
SELECT categoryRow.`id`, seed.`name`, seed.`slug`, seed.`description`, 1, seed.`sortOrder`
FROM (
  SELECT 'plumbing' AS categorySlug, 'Su Kaçağı Onarımı' AS name, 'leak-repair' AS slug, 'Su ve tesisat kaçaklarının tespiti ile onarımı' AS description, 10 AS sortOrder
  UNION ALL SELECT 'plumbing', 'Tıkanıklık Açma', 'clogged-drain', 'Lavabo, gider ve kanal tıkanıklığı açma', 20
  UNION ALL SELECT 'plumbing', 'Musluk ve Batarya', 'faucet-installation', 'Musluk, batarya ve armatür montajı', 30
  UNION ALL SELECT 'plumbing', 'Kombi ve Tesisat', 'boiler-piping', 'Kombi bağlantısı ve su tesisatı işleri', 40

  UNION ALL SELECT 'electrical', 'Elektrik Arızası', 'fault-repair', 'Sigorta, priz, hat ve genel elektrik arızaları', 10
  UNION ALL SELECT 'electrical', 'Aydınlatma Montajı', 'fixture-installation', 'Avize, aplik ve aydınlatma montajı', 20
  UNION ALL SELECT 'electrical', 'Pano Yenileme', 'panel-renewal', 'Elektrik panosu ve sigorta yenileme', 30
  UNION ALL SELECT 'electrical', 'Akıllı Ev Elektriği', 'smart-home-electrical', 'Sensör, röle ve akıllı ev elektrik kurulumu', 40

  UNION ALL SELECT 'cleaning', 'Ev Temizliği', 'home-cleaning', 'Düzenli veya tek seferlik ev temizliği', 10
  UNION ALL SELECT 'cleaning', 'Ofis Temizliği', 'office-cleaning', 'Ofis ve iş yeri temizliği', 20
  UNION ALL SELECT 'cleaning', 'Taşınma Temizliği', 'move-cleaning', 'Taşınma öncesi ve sonrası detaylı temizlik', 30
  UNION ALL SELECT 'cleaning', 'Derin Temizlik', 'deep-cleaning', 'Detaylı yüzey ve alan temizliği', 40

  UNION ALL SELECT 'hvac', 'Klima Montajı', 'ac-installation', 'Klima montajı ve devreye alma', 10
  UNION ALL SELECT 'hvac', 'Klima Bakımı', 'ac-maintenance', 'Klima temizlik ve periyodik bakımı', 20
  UNION ALL SELECT 'hvac', 'Kombi Bakımı', 'boiler-maintenance', 'Kombi bakım ve arıza servisi', 30
  UNION ALL SELECT 'hvac', 'Petek ve Isıtma', 'radiator-heating', 'Petek temizliği ve ısıtma sistemi işleri', 40

  UNION ALL SELECT 'locksmith', 'Kapı Açma', 'door-opening', 'Hasarsız kapı açma hizmeti', 10
  UNION ALL SELECT 'locksmith', 'Kilit Değişimi', 'lock-replacement', 'Kapı kilidi ve göbek değişimi', 20
  UNION ALL SELECT 'locksmith', 'Oto Çilingir', 'car-locksmith', 'Araç kapısı ve anahtar hizmetleri', 30

  UNION ALL SELECT 'painting', 'İç Cephe Boya', 'interior-painting', 'İç mekân boya ve badana işleri', 10
  UNION ALL SELECT 'painting', 'Dış Cephe Boya', 'exterior-painting', 'Dış cephe boya uygulaması', 20
  UNION ALL SELECT 'painting', 'Duvar Kâğıdı', 'wallpaper', 'Duvar kâğıdı uygulama ve sökme', 30
  UNION ALL SELECT 'painting', 'Alçı ve Sıva', 'plastering', 'Alçı, sıva ve yüzey hazırlığı', 40

  UNION ALL SELECT 'gardening', 'Bahçe Bakımı', 'garden-maintenance', 'Periyodik bahçe bakım hizmeti', 10
  UNION ALL SELECT 'gardening', 'Peyzaj', 'landscaping', 'Peyzaj tasarım ve uygulaması', 20
  UNION ALL SELECT 'gardening', 'Budama', 'pruning', 'Ağaç ve bitki budama', 30
  UNION ALL SELECT 'gardening', 'Sulama Sistemi', 'irrigation', 'Bahçe sulama sistemi kurulumu', 40

  UNION ALL SELECT 'moving', 'Evden Eve Nakliyat', 'house-moving', 'Ev eşyalarının paketli taşınması', 10
  UNION ALL SELECT 'moving', 'Ofis Taşıma', 'office-moving', 'Ofis ve iş yeri taşıma', 20
  UNION ALL SELECT 'moving', 'Tek Parça Taşıma', 'single-item-moving', 'Tek veya az sayıda eşya taşıma', 30
  UNION ALL SELECT 'moving', 'Şehirlerarası Nakliyat', 'intercity-moving', 'Şehirlerarası eşya taşıma', 40

  UNION ALL SELECT 'appliance', 'Çamaşır Makinesi', 'washing-machine', 'Çamaşır makinesi bakım ve onarımı', 10
  UNION ALL SELECT 'appliance', 'Bulaşık Makinesi', 'dishwasher', 'Bulaşık makinesi bakım ve onarımı', 20
  UNION ALL SELECT 'appliance', 'Buzdolabı', 'refrigerator', 'Buzdolabı bakım ve onarımı', 30
  UNION ALL SELECT 'appliance', 'Fırın ve Ocak', 'oven-cooker', 'Fırın ve ocak bakım ve onarımı', 40

  UNION ALL SELECT 'towing', 'Arıza Çekici', 'breakdown-tow', 'Arızalı araç çekme hizmeti', 10
  UNION ALL SELECT 'towing', 'Kaza Çekici', 'accident-tow', 'Kaza sonrası araç çekme hizmeti', 20
  UNION ALL SELECT 'towing', 'Araç Taşıma', 'vehicle-transport', 'Çalışır veya çalışmaz araç taşıma', 30

  UNION ALL SELECT 'courier', 'Evrak Kurye', 'document-courier', 'Evrak ve sözleşme teslimatı', 10
  UNION ALL SELECT 'courier', 'Paket Kurye', 'parcel-courier', 'Küçük ve orta boy paket teslimatı', 20
  UNION ALL SELECT 'courier', 'Moto Kurye', 'moto-courier', 'Hızlı motosikletli teslimat', 30
  UNION ALL SELECT 'courier', 'Planlı Teslimat', 'scheduled-delivery', 'Belirlenen tarih ve saatte teslimat', 40

  UNION ALL SELECT 'roadside', 'Akü Takviyesi', 'battery-jump', 'Akü takviye ve yerinde destek', 10
  UNION ALL SELECT 'roadside', 'Lastik Değişimi', 'tire-change', 'Yerinde lastik değişimi', 20
  UNION ALL SELECT 'roadside', 'Yakıt Desteği', 'fuel-delivery', 'Yolda kalan araca yakıt ulaştırma', 30
  UNION ALL SELECT 'roadside', 'Yerinde Küçük Onarım', 'minor-repair', 'Yolda çözülebilen küçük mekanik arızalar', 40

  UNION ALL SELECT 'home-repair', 'Mobilya Montajı', 'furniture-assembly', 'Mobilya kurulum ve montajı', 10
  UNION ALL SELECT 'home-repair', 'Alçıpan ve Duvar', 'drywall-repair', 'Alçıpan, duvar ve küçük yüzey onarımı', 20
  UNION ALL SELECT 'home-repair', 'Kapı ve Pencere', 'door-window-repair', 'Kapı, pencere ve menteşe onarımı', 30
  UNION ALL SELECT 'home-repair', 'Genel Usta', 'general-handyman', 'Çeşitli küçük ev onarım işleri', 40

  UNION ALL SELECT 'automotive', 'Periyodik Bakım', 'vehicle-maintenance', 'Araç periyodik bakım hizmetleri', 10
  UNION ALL SELECT 'automotive', 'Arıza Tespiti', 'vehicle-diagnostics', 'Elektronik ve mekanik arıza tespiti', 20
  UNION ALL SELECT 'automotive', 'Lastik Hizmeti', 'tire-service', 'Lastik değişim, tamir ve balans', 30
  UNION ALL SELECT 'automotive', 'Oto Detaylı Temizlik', 'auto-detailing', 'İç ve dış detaylı araç temizliği', 40

  UNION ALL SELECT 'technology', 'Bilgisayar Teknik Servis', 'computer-service', 'Masaüstü ve dizüstü bilgisayar desteği', 10
  UNION ALL SELECT 'technology', 'Telefon ve Tablet', 'mobile-device-service', 'Telefon ve tablet teknik desteği', 20
  UNION ALL SELECT 'technology', 'Ağ ve İnternet', 'network-setup', 'Modem, Wi-Fi ve yerel ağ kurulumu', 30
  UNION ALL SELECT 'technology', 'Akıllı Ev Kurulumu', 'smart-home-setup', 'Akıllı ev cihazlarının kurulumu', 40

  UNION ALL SELECT 'personal-care', 'Saç Bakımı', 'hair-care', 'Evde saç kesim ve bakım hizmetleri', 10
  UNION ALL SELECT 'personal-care', 'Makyaj', 'makeup', 'Profesyonel makyaj hizmeti', 20
  UNION ALL SELECT 'personal-care', 'Tırnak Bakımı', 'nail-care', 'Manikür, pedikür ve tırnak bakımı', 30
  UNION ALL SELECT 'personal-care', 'Masaj', 'massage', 'Evde profesyonel masaj hizmeti', 40
) AS seed
INNER JOIN `service_categories` AS categoryRow
  ON categoryRow.`slug` COLLATE utf8mb4_unicode_ci = seed.`categorySlug` COLLATE utf8mb4_unicode_ci;
