# Veri iskeleti v3 — çalışma notları

Amaç: uygulamanın üç veri katmanını Kur'an'ın tamamını okuyarak baştan kurmak. Eski eşleştirmeler
(`src/data/topics-reviewed.json`) kelime benzerliğine dayandığı için kullanılmıyor.

## Katmanlar
1. **Bölümler** (okuma ekranı): her ayet tam bir bölüme ait; sıralı, kesintisiz.
2. **Konular** (keşfet): `data/v3/konular.json` (84 başlık, 10 grup). Ayet 0, 1 ya da birkaç konuya girer. `*` = konunun ana ayeti.
3. **Hâller** (Bugün ekranı): `data/v3/haller.json` (36 başlık). Ayetlerin çoğu hiçbir hâle girmez. `!` = güçlü aday.

## Yöntem
- Tek okuma: `python3 scripts/v3/oku.py SURE [BAS-SON] [--not]` ile metin okunur, `data/v3/sureler/NNN.txt` yazılır,
  `python3 scripts/v3/kontrol.py [--say]` ile denetlenir. Biçim `kontrol.py` başında.
- Tarama bitince: hâl listesi düzeltilir (az karşılığı olan birleşir, `?` ile not edilen yeni hâller eklenir),
  sonra her hâl için adaylardan 10–20 ayet gerekçesiyle seçilir (örnek: `taslak-01.json` içindeki "kaygili" havuzu).

## Kurallar
- Bölüm sınırı anlam geçişine göre; sabit uzunluk yok. Kıssa ortasından kesilmez. Kısa sure (yaklaşık 12 ayete kadar) bölünmez.
  Tek başına anılan ayet (Âyetü'l-Kürsî, Bakara 177) kendi bölümü olabilir.
- Başlıklar sade Türkçe; gerekirse yerleşik terim parantez içinde. Özet tek cümle.
- Konu etiketi ancak ayet o konuyu gerçekten işliyorsa verilir; kelime geçmesi yetmez.
- Hâl adayı ölçütü: o hâldeki biri ayeti TEK BAŞINA okuduğunda teselli, yön ya da ferahlık bulur mu?
  Azap, savaş ve hüküm ayetleri hâl adayı olmaz. Bağlamından kopunca yanlış anlaşılacak ayet olmaz.
  Ayet kesilmez: ya tamamı gösterilir ya hiç (ör. Bakara 216 bu yüzden aday değil).
  Kıssa içinde belirli kişilere söylenen ama anlamı genel sözler aday olabilir (kullanıcı son kararı verecek).
- "korku" hâli hem somut tehlikeyi hem adı konamayan korkuyu kapsar (kullanıcı kararı, 2026-11-11).

## Kullanıcı kararları (bekleyen)
- Ayet kesilmez kuralı, kıssa içi sözler ve başlık dili için açık onay henüz gelmedi; yukarıdaki varsayılanlarla ilerleniyor.

## İlerleme
- 2026-11-11: taslak-01 (listeler + Bakara/Duha/Kevser bölümleme + "kaygili" havuzu). Sure taraması başladı.
- 2026-11-11: sure 1-39 tamam (4133 ayet). Sıradaki: 40 Mü'min (Ğâfir).
- Model notu: 1-16. sureler Fable 5.2, 17'den itibaren Opus 5.5 ile yapıldı. Başka model devam ederse bitmiş sure dosyalarını (özellikle 006, 010, 012) üslup örneği olarak okusun: bölüm başlıkları sade, özet tek cümle, etiketler cimri, hâl adayı ancak ayet tek başına teselli/yön veriyorsa. 'kitapehli' konusu eklendi (İnanç grubu).

## Tarama sırasında gözlemler
- Hüküm ağırlıklı surelerde (Bakara, Nisa) hâl adayı az: yaklaşık her 12 ayette bir.
- Okuma çıktısı uzun olduğu için sure 70-100 ayetlik parçalarla, satır başına ~230 karakter kesilerek okunuyor; uzun ayetlerin sonu gerekirse `oku.py SURE A-B` ile tam okunur.
