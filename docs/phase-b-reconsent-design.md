# Phase B Yeniden Onay Akışı

Sürümlü zorunlu yasal belgeler için kullanıcı tarafında serbest metin veya istemci tarafından sağlanan sürüm kabul edilmez. Sunucu, merkezi belge kataloğundaki yürürlükteki sürümü belirler ve kullanıcının immutable consent event geçmişinde bu sürüm için `granted` olayı bulunup bulunmadığını değerlendirir.

Belge sürümü değiştiğinde kullanıcıya yalnız eksik veya güncel olmayan zorunlu yasal onaylar sunulur. Onay kaydı yeni bir immutable `granted` olayı yaratır; geçmiş kanıtlar silinmez veya güncellenmez. İsteğe bağlı pazarlama tercihi yasal yeniden-onaydan ayrıdır ve varsayılan olarak kapalı kalır.

Bu akış, gerçek hukuk incelemesi ya da yayınlanmış metinlerin geçerliliği için bir teyit değildir. Yeni belge sürümleri yayınlanmadan önce yetkili hukuk incelemesi gereklidir.
