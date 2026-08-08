import "dotenv/config";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);

  // 1. Service Categories — matches actual DB schema
  const categories: Array<[number, string, string, string, string, "fixed" | "km_based", number | null, number | null]> = [
    [1, "Su Tesisatı", "plumbing", "🔧", "#3B82F6", "fixed", 200, null],
    [2, "Elektrik", "electrical", "⚡", "#F59E0B", "fixed", 150, null],
    [3, "Temizlik", "cleaning", "🧹", "#10B981", "fixed", 100, null],
    [4, "Klima/Isıtma", "hvac", "❄️", "#06B6D4", "fixed", 600, null],
    [5, "Çilingir", "locksmith", "🔑", "#8B5CF6", "fixed", 150, null],
    [6, "Boyacı", "painting", "🎨", "#EC4899", "fixed", 300, null],
    [7, "Bahçe", "gardening", "🌳", "#22C55E", "fixed", 200, null],
    [8, "Nakliyat", "moving", "📦", "#F97316", "fixed", 500, null],
    [9, "Beyaz Eşya", "appliance", "🔌", "#6366F1", "fixed", 200, null],
    [13, "Çekici", "towing", "🚚", "#EF4444", "km_based", 200, 25],
    [14, "Kurye", "courier", "🏍️", "#84CC16", "km_based", 50, 12],
    [15, "Yol Yardımı", "roadside", "🛠️", "#A855F7", "km_based", 100, 18],
  ];

  for (const [id, name, slug, icon, color, pricingType, basePrice, kmRate] of categories) {
    await conn.execute(
      `INSERT INTO service_categories (id, name, slug, icon, color, pricingType, basePrice, kmRate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), color=VALUES(color),
       pricingType=VALUES(pricingType), basePrice=VALUES(basePrice), kmRate=VALUES(kmRate)`,
      [id, name, slug, icon, color, pricingType, basePrice, kmRate],
    );
  }
  console.log("✅ Service categories seeded:", categories.length);

  // 2. Test users (customer + provider + admin)
  // Note: DB role enum only supports 'user' and 'admin'. Providers are identified via providers table.
  const testUsers: Array<[string, string, string, string]> = [
    ["test-customer-open-id", "Ahmet Müşteri", "customer@movefix.test", "user"],
    ["test-provider-open-id", "Mehmet Usta", "provider@movefix.test", "user"],
    ["test-admin-open-id", "Admin Yönetici", "admin@movefix.test", "admin"],
  ];

  for (const [openId, name, email, role] of testUsers) {
    await conn.execute(
      `INSERT INTO users (openId, name, email, role, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())
       ON DUPLICATE KEY UPDATE name=VALUES(name), email=VALUES(email), role=VALUES(role)`,
      [openId, name, email, role],
    );
  }
  console.log("✅ Test users seeded:", testUsers.length);

  // 3. Provider profile
  const [userRows] = await conn.execute(
    "SELECT id FROM users WHERE openId = ?",
    ["test-provider-open-id"],
  );
  const providerUserId = (userRows as any)[0]?.id;
  if (providerUserId) {
    await conn.execute(
      `INSERT INTO providers (userId, displayName, bio, categoryId, rating, completedJobs, isVerified, isPremium, latitude, longitude)
       VALUES (?, 'Mehmet Usta', '10 yıllık deneyimli su tesisatçısı', 1, 5, 145, 1, 1, '41.0082', '28.9784')
       ON DUPLICATE KEY UPDATE bio=VALUES(bio), isVerified=VALUES(isVerified), rating=VALUES(rating), isPremium=VALUES(isPremium)`,
      [providerUserId],
    );
    console.log("✅ Provider profile seeded");
  }

  // Verify
  const [catCount] = await conn.execute("SELECT COUNT(*) as count FROM service_categories");
  const [userCount] = await conn.execute("SELECT COUNT(*) as count FROM users");
  const [provCount] = await conn.execute("SELECT COUNT(*) as count FROM providers");
  console.log("\n=== SEED VERIFICATION ===");
  console.log("Categories:", (catCount as any)[0].count);
  console.log("Users:", (userCount as any)[0].count);
  console.log("Providers:", (provCount as any)[0].count);

  await conn.end();
}

main().catch(console.error);
