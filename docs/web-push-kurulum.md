# Ayet Rehberi — Paralel Okuma gibi ZümreNet Cloud Web Push

## Repo ve dağıtım ayrımı

**Ayet Rehberi** (bu repo) sadece Next.js statik web sitesi / Firebase Hosting.
iOS PWA service worker, bildirim izin ekranı ve telefonun abonelik kaydı burada.

**ZümreNet** (`erdemci07/zumre_net`) gerçek bildirim backend'ini barındırır:
`ayet_notifications/` kodu ve `firebase.ayet-notifications.json` konfigürasyonu.
Proje `zumrenet-657e1`, HTTPS endpoint:
`https://us-central1-zumrenet-657e1.cloudfunctions.net/ayetPushApi`

Paralel Okuma'nın `paralelNotifications` fonksiyonu ve secret'ları **değiştirilmez**.
Ayet Rehberi'nde Firebase Functions / Firestore / faturalandırma etkinleştirmeye
gerek yok; push abonelikleri ve gönderim durumları ZümreNet'in **ayrı** Firestore
koleksiyonlarında kayıtlıdır.

## Sıralama

1. ZümreNet repo'daki `ayet_notifications/README.md` ile runtime service account,
   Secret Manager, VAPID anahtarları ve IAM yetkilerini hazırla.
2. ZümreNet Actions variable `ENABLE_AYET_NOTIFICATIONS_DEPLOY=true` yap.
3. `Deploy Ayet Rehberi Notifications` workflow'unu çalıştır; testlerin ve
   iki Cloud Function'ın dağıtıldığını kontrol et.
4. GET endpoint'i doğrula:
   `curl -sS https://us-central1-zumrenet-657e1.cloudfunctions.net/ayetPushApi`
   Yanıtta **yalnızca public VAPID anahtarı** döner.
5. Bu repo PR #3 web lint, test ve build başarılıysa main'e birleştir;
   normal `Verify web build and deploy` workflow'u yalnızca Ayet Hosting'i dağıtır.
6. iOS 16.4+ cihazda Safari → Paylaş → Ana Ekrana Ekle;
   **Bende → Hatırlatmalar → Bildirimleri etkinleştir → Sunucudan deneme gönder**
   yoluyla **gerçek sunucu push** testi yap.
7. Uygulamayı kapalıyken, ekran kilitliyken ve bildirime dokunarak açılışta dene.

## Ürün güvenliği

- Açık rıza yoksa push aboneliği gönderilmez.
- Ruh hâli geçmişi, okunan ayet metinleri, kaydedilen ayetler yerel kalır.
- Sunucuda cihaz aboneliği, tercih/saat, son ziyaret ve son okuma özeti tutulur.
- Sessiz saat 23.00–07.00 ve cihaz başına günlük en fazla iki hatırlatma.
- Daha önce o gün ziyaret eden kullanıcıya hatırlatma gönderilmez.
- `Beni nasıl tanıyorsun? → Her şeyi sil` işlemi uzaktaki aboneliği de silmeye çalışır.
- Halihazırda hesap açılmadığından sunucu, cihaz anahtarıyla sahipliği kontrol
  eder ve yeni cihazlara IP başına günlük sınır uygular. Bu tam kullanıcı
  doğrulaması değildir; ileride anonim Firebase Auth / App Check ile güçlendirilmeli.
- iOS push teslimatı Apple'ın sistemine ve cihaz ayarlarına bağlıdır.
