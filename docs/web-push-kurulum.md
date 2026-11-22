# Ayet Rehberi – iOS PWA Web Push kurulum ve dağıtım

Bu dosya yalnızca `ayet-rehberi` Firebase projesi içindir. Başka projenin
Cloud Functions kaynak koduna veya Firebase Hosting içeriğine dokunmaz.

## 0. Güvenli varsayılanlar

- Canlı `main` değiştirilmeden PR üzerinde lint, test ve build çalışır.
- `ENABLE_AYET_PUSH_DEPLOY` **true** olmadıkça yalnızca Hosting dağıtılır.
- Bildirimler kullanıcı `Bildirimleri etkinleştir` düğmesine basmadan açılmaz.
- Sunucu yalnızca cihaz aboneliği, tercih/saat, son ziyaret ve son okuma özetini görür.
  Ruh hâli geçmişi, favori ayetler ve ayet metinleri sunucuya gönderilmez.
- Eklenen tek zamanlayıcı 15 dakikada bir çalışır. Her cihaz için günlük azami 2 bildirim.

## 1. Firebase / Google Cloud konsolunda yapılacaklar

1. [Firebase Console](https://console.firebase.google.com/project/ayet-rehberi/overview)
   üzerinden projenin gerçekten `ayet-rehberi` olduğunu doğrula.
2. Billing → **Blaze**: Cloud Functions v2 ve Cloud Scheduler için
   etkin bir faturalandırma hesabı gerekir. Bu işlem hesap sahibi tarafından
   yapılmalıdır. [Google Cloud Billing](https://console.cloud.google.com/billing?project=ayet-rehberi)
3. Firestore Database → Create database. Bölgeyi bilinçli seç; var olan
   veritabanı varsa **yenisini oluşturma**. Firestore'u Native mode kullan.
   Bu sürümde Firestore'a yalnızca Admin SDK erişir; istemciye açık kural ekleme.
4. [APIs & Services](https://console.cloud.google.com/apis/library?project=ayet-rehberi):
   Cloud Functions, Cloud Build, Cloud Run, Artifact Registry, Secret Manager,
   Cloud Scheduler ve Firestore API servislerinin etkin olduğundan emin ol.
5. [Google Cloud Budgets](https://console.cloud.google.com/billing) ekranından
   kullanım bildirimleri tanımla. Bütçe bildirimi harcamayı otomatik durdurmaz.

CLI ile gerekli API'leri etkinleştirmek için (yetkili hesapla):

```bash
gcloud auth login
gcloud config set project ayet-rehberi
gcloud services enable cloudfunctions.googleapis.com cloudbuild.googleapis.com \
  run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com \
  cloudscheduler.googleapis.com firestore.googleapis.com
```

## 2. VAPID anahtarı – yalnızca bir defa

```bash
npx --yes web-push generate-vapid-keys
```

Çıktıdaki **public** ve **private** anahtar aynı çifte ait olmalı. Özel
anahtarı **GitHub'a, sohbete veya kaynak koduna yazma**.

Aşağıdaki komutlarda <PUBLIC_KEY> ve <PRIVATE_KEY> alanlarını kendi terminalinde
değiştir; anahtarları bir metin dosyasına koyup commitleme:

```bash
printf %s '<PUBLIC_KEY>' | gcloud secrets create AYET_PUSH_VAPID_PUBLIC --data-file=- --replication-policy=automatic
printf %s '<PRIVATE_KEY>' | gcloud secrets create AYET_PUSH_VAPID_PRIVATE --data-file=- --replication-policy=automatic
```

Secret zaten varsa `gcloud secrets versions add SECRET_ADI --data-file=-`
ile **mevcut anahtar çiftinin** yeni sürümünü yükle. VAPID anahtarını
değiştirmek mevcut abonelikleri yenileme gerektirebilir.

Functions runtime service account'unun bu iki Secret için Secret Manager
Secret Accessor yetkisi bulunmalı. Firebase CLI çoğu projede bunu kurabilir;
yetki hatası alınırsa konsoldan yalnızca iki Secret için erişim ver.

## 3. GitHub Actions servis hesabı ve dağıtım

Repo Settings → Secrets and variables → Actions altında mevcut Hosting secret'ı
`FIREBASE_SERVICE_ACCOUNT_AYET_REHBERI` korunur. İçindeki servis
hesabının Cloud Functions v2, Cloud Build, Cloud Run ve Cloud Scheduler
deploy yetkileri de olmalıdır. IAM'de yalnızca ihtiyaç duyulan yetkileri ver.

ÖNCE PR kontrolleri yeşil olmalı. Bulut ayarları tamamlandıktan sonra:

1. GitHub → Settings → Secrets and variables → Actions → Variables
2. Repository variable: `ENABLE_AYET_PUSH_DEPLOY` = `true`
3. PR'ı main'e merge et (veya main'deki Verify web build and deploy workflow'unu
   yeniden çalıştır). Push backend, ardından Hosting deploy edilir.
4. Başarılı run'da `functions:ayet-push` ve Hosting adımlarını ayrı doğrula.

Backend'in yayında olduğunu doğrula:

```bash
curl -sS https://us-central1-ayet-rehberi.cloudfunctions.net/ayetPushApi
```

Başarılı yanıt `vapidPublicKey` alanını içerir; **private** anahtarı içermez.

## 4. iPhone'da uçtan uca test

1. iOS 16.4 veya yenisi, Safari'de Ayet Rehberi'ni aç.
2. Paylaş → Ana Ekrana Ekle.
3. Ana ekrandaki **Ayet Rehberi** ikonundan uygulamayı başlat.
4. **Bende → Hatırlatmalar → Bildirimleri etkinleştir**, iOS iznine onay ver.
5. **Sunucudan deneme gönder**: bu gerçek sunucu push'udur; uygulamayı
   arka plana alıp kilit ekranında tekrar dene.
6. Sabah 08.30 ve akşam 20.30 tercihlerini doğrula. Uygulamayı o gün açmış
   kullanıcıya tekrar hatırlatma gönderilmez. En fazla iki hatırlatma/gün;
   iOS teslim zamanı cihazın bildirim ayarlarına bağlıdır.
7. **Bildirimleri kapat**: Firestore cihaz kaydı ve gönderim geçmişi silinir.
8. **Beni nasıl tanıyorsun? → Her şeyi sil** işlemi de varsa push aboneliğini kaldırır.

## 5. Sorun giderme

- `403`: Origin izni. Varsayılan iki alan adı `ayet-rehberi.web.app` ve
  `ayet-rehberi.firebaseapp.com`. Özel domain kullanılıyorsa `functions/index.mjs`
  `ALLOWED_ORIGINS` listesine birebir HTTPS origin ekle.
- `404`: Functions henüz dağıtılmamış veya URL/region uyuşmuyor.
- `500` / `secret`: Secret Manager yetkileri / VAPID çifti kontrolü.
- Browser deniyor ama iOS izin göstermiyorsa: PWA'nın ana ekrandan açıldığından,
  bildirim izninin kullanıcı tıklamasıyla istendiğinden emin ol.
- Server test başarılı ama görünmüyor: iOS Ayarlar → Bildirimler → Ayet Rehberi,
  Focus/Odak modu ve internet bağlantısını kontrol et.
- `npm run lint -- --max-warnings=0`, `npm test`, `npm run build`,
  `node --test functions/rules.test.mjs` tamamlanmadan dağıtıma geçme.

## Kapsam sınırı

Bu sürümde bildirim metinleri sabittir, son seçilen ruh hâli dışarı aktarılmaz.
Şahsî ruh hâline dayalı bildirimler için ayrı, açık rıza ve sunucu veri modeli
gerekecektir. iOS PWA'ya teslimat, cihaz ve işletim sistemi nedeniyle yüzde yüz
garanti edilemez.
