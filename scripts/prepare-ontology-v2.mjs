import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Offline editorial definitions. Retrieval evidence is NOT a final classification.
const raw = await readFile("src/data/quran.json", "utf8");
const corpus = JSON.parse(raw);
const source = JSON.parse(await readFile("src/data/source-topics.json", "utf8"));
const version = "2.0.0-proposed.1";
const domains = [
  ["allah", "Allah inancı", "Allah'ın birliği, sıfatları ve insanın Allah ile ilişkisi."],
  ["iman", "İman ve sorumluluk", "İnanç, özgür tercih ve insanın manevi sorumluluğu."],
  ["vahiy", "Kur’an ve vahiy", "Vahyin niteliği, okunması, anlaşılması ve korunması."],
  ["kulluk", "İbadet ve kulluk", "İbadetlerin Kur’an'daki bağlamı ve Allah'a yöneliş."],
  ["ic-dunya", "İç dünya", "Duygular, dayanıklılık ve insanın iç tutumları; klinik kategoriler değildir."],
  ["ahlak", "Ahlak ve karakter", "Dürüstlük, tevazu, özdenetim ve kişisel tutumlar."],
  ["aile", "Aile ve yakın ilişkiler", "Evlilik, ebeveynlik, çocuklar ve yakınların hakları."],
  ["toplum", "Toplumsal ilişkiler", "Birlikte yaşama, iletişim ve karşılıklı sorumluluklar."],
  ["ekonomi", "Mal ve geçim", "Mülkiyet, paylaşım, borç, ticaret ve maddi sorumluluklar."],
  ["adalet", "Adalet ve haklar", "Hak, tanıklık, zarar, yaptırım ve güç kullanımı."],
  ["ahiret", "Ölüm ve ahiret", "Ölüm, diriliş, hesap ve ölüm sonrası hayata dair anlatımlar."],
  ["peygamberler", "Peygamberlik ve tebliğ", "Elçilerin görevleri ve anlatılardan çıkarılan konu bağları."],
  ["yaratilis", "Yaratılış ve düşünme", "Doğa, insanın yaratılışı ve akıl yürütme."],
  ["tarih", "Topluluklar ve tarihsel bağlam", "Kur’an'da topluluklar, tarihsel olaylar ve sosyal süreçler."],
].map(([id, name, description]) => ({ id, name, description, status: "proposed", version }));

// id | domain | name | definition/inclusion | aliases/retrieval phrases | exclusion
const rows = `
tevhid|allah|Tevhid|Allah'ın birliğini ve ortak kabul etmemeyi doğrudan konu eden anlatımlar.|Allah'ın birliği,tek ilah|Her Allah sözcüğü geçişi dahil değildir.
allah-rahmeti|allah|Allah'ın rahmeti|Allah'ın rahmetini ve rahmetten umut kesmemeyi konu eden ifadeler.|rahmet,Allah'ın merhameti|İnsanlar arası merhamet tek başına yeterli değildir.
allah-ilmi|allah|Allah'ın bilgisi|Allah'ın açık ve gizli olanı bilmesi hakkındaki anlatımlar.|Allah bilir,gaybı bilen|İnsan bilgisi ve tahminleri ayrı konudur.
allah-kudreti|allah|Allah'ın kudreti|Yaratma ve hükümranlığın Allah'a ait oluşunu konu eden ifadeler.|her şeye gücü,güç yetiren|Her güç veya yönetici ifadesi dahil değildir.
allah-adaleti|allah|Allah'ın adaleti|Allah'ın kimseye haksızlık etmeyişi ve adil karşılık hakkındaki ifadeler.|Allah haksızlık,zerre kadar|İnsanların yargı uygulamaları ayrı değerlendirilir.
allah-yalan|allah|Allah hakkında yalan uydurmak|Allah'a dayanaksız söz veya hüküm isnadı.|Allah hakkında yalan,Allah'a iftira|Genel yalan ifadesi yeterli değildir.
esma|allah|Allah'ın isimleri|Allah'ın isimleriyle anılması ve açık ilahi sıfatlar.|en güzel isimler,isimleri|Bir 99 isim listesini veya tekrar sayısı vaadini doğrulamaz.
iman|iman|İman|İnanma, imanın gerekleri ve inanç tutumunun açıkça konu edilmesi.|iman,inanan|Her kişi veya topluluk otomatik iman konusu değildir.
inkar|iman|İnkâr|Vahyi veya Allah inancını reddetme tutumu.|inkar,inkâr|Metindeki her itiraz dini inkâr değildir.
sirk|iman|Şirk|Allah'a ortak koşma ve yaratılmışı ilahlaştırma.|ortak koş,şirk|Mecazi gündelik ortaklık dahil değildir.
munafiklik|iman|İkiyüzlülük ve münafıklık|İnanç beyanı ile tutum arasındaki bilinçli çelişki.|münafık,ikiyüzlü|Her hata veya iman zayıflığı münafıklık değildir.
takva|iman|Takva|Allah'a karşı sorumluluk bilinci ve korunma tutumu.|takva,sorumluluk bilinci|Genel korku veya her sakınma yeterli değildir.
hidayet|iman|Hidayet|Doğru yola yönelme ve rehberlik.|doğru yol,hidayet|Fiziksel yolculuk tek başına dahil değildir.
seytan|iman|Şeytan ve vesvese|İblis, şeytan ve yanıltıcı fısıltının açıkça konu edildiği anlatımlar.|şeytan,İblis,vesvese|İnsanların her hatası şeytan etkisi olarak etiketlenmez.
melekler|iman|Melekler|Meleklerin metinde bildirilen görevleri ve insanlarla ilişkileri.|melek,melekler|Her elçi veya haberci melek değildir; görevler bağlamdan doğrulanır.
cinler|iman|Cinler|Cinlerden söz eden anlatımlar ve onların sorumluluğu.|cin,cinler|Sağlık sorunları veya gündelik olaylar cinlere isnat edilmez.
gayb|iman|Gayb|İnsan bilgisinin ötesi ve gayb bilgisinin sınırları.|gayb,görünmeyen|Her gizli görüşme veya bilinmeyen günlük bilgi gayb değildir.
din|iman|Din|Din, kulluk düzeni ve inanç tercihi hakkındaki açık ifadeler.|din,inanç yolu|Sözcüğün hesap/karşılık anlamı bağlamla ayrıştırılır.
din-ozgurlugu|iman|İnançta özgür tercih|İnançta zorlama olmaması ve inanç farklılığına saygı.|dinde zorlama,inançlara saygı|Her savaş ayeti bu başlığa otomatik bağlanmaz.
kisisel-sorumluluk|iman|Kişisel sorumluluk|Kişinin kendi eylemleri ve başkasının yükünü taşımaması.|başkasının günahı,kendi yaptıkları|Maddi borcu üstlenmekle karıştırılmaz.
tevbe|iman|Tövbe|Yanlıştan dönme ve Allah'tan bağışlanma isteme.|tövbe,tevbe,günah sonrası dönüş|Her bağışlama eylemi tövbe değildir.
vahiy|vahiy|Vahiy|Allah'tan gelen bildirim ve vahyin rehberlik niteliği.|vahiy,indirdiğimiz|Her kitap veya yazı vahiy değildir.
kuran-nitelikleri|vahiy|Kur’an'ın nitelikleri|Kur’an'ın rehberlik, açıklık ve uyarı niteliği.|Kur'an,rehber kitap|Genel kitap sözcüğü yeterli değildir.
kuran-okuma|vahiy|Kur’an okumak ve dinlemek|Kur’an'ın okunması, dinlenmesi ve okuma tutumu.|Kur'an okumak,Kur'an dinlemek|Başka metin veya herhangi bir ses dahil değildir.
kuran-anlama|vahiy|Kur’an üzerinde düşünmek|Vahyi anlamak ve üzerinde düşünmek.|ayetleri düşünmek,Kur'an'ı anlamak|Her düşünme ayeti vahiy düşünmesi değildir.
vahyin-korunmasi|vahiy|Vahyin korunması|Vahyin muhafazası ve korunması hakkında açık ifadeler.|koruyucusu,koruyacağız|Bütün korunma ifadeleri kutsal metinle ilgili değildir.
metin-carpitma|vahiy|Vahyi çarpıtmak|Vahyi gizlemek, anlamını veya isnadını bozmak.|ayetleri çarpıtmak,kitabı gizlemek|Sadece ayet/kitap kelimesi eşleşmesi yeterli değildir.
muhkem-mutesabih|vahiy|Muhkem ve müteşabih|Vahyin muhkem/müteşabih niteliği ve anlama bağlamı.|muhkem,müteşabih|Çeviri farklılığı tek başına bu konu değildir.
nesih|vahiy|Nesih ve ayet değişimi tartışması|Ayetin kaldırılması/değişimi olarak yorumlanan ifadeler ve bağlamları.|nesih,unuttur|Tartışmalı yorum kesin hüküm olarak sunulmaz.
tasdik|vahiy|Tasdik|Vahyin önceki bildirimleri doğrulaması.|tasdik,doğrulayan|Gündelik doğrulama ve tanıklık ayrı değerlendirilir.
isr|vahiy|Isr ve yükümlülük bağlamı|Ağır yük veya ahit bağlamındaki isr kavramı.|ısr,ağır yük|Her bedensel yük kavramı dahil değildir; çeviri tartışması incelenir.
dua|kulluk|Dua|Allah'a yöneliş, yakarış ve yardım isteme.|dua,yardım istemek,niyaz|İnsanlardan her yardım talebi dua değildir.
namaz|kulluk|Namaz|Salat/namaz ibadeti ve ona ilişkin sorumluluklar.|namaz,salat|Çeviride salatın bağlamsal anlamı incelenir.
namaz-vakitleri|kulluk|Namaz vakitleri|Namazın zamanına ilişkin ifadeler.|namaz vakitleri,günün iki ucu|Her gece/gündüz ifadesi namaz vakti değildir.
abdest|kulluk|İbadet için temizlik|Namaz öncesi yıkanma, abdest ve teyemmüm.|abdest,teyemmüm|Genel ahlaki arınma aynı şey değildir.
kible|kulluk|Kıble|İbadette yöneliş ve kıble değişimi.|kıble,yüzünü çevir|Her yüz/yön ifadesi dahil değildir.
mescit|kulluk|Mescit|Mescitler ve ibadet mekânlarının sorumluluğu.|mescit,cami|Her bina mescit değildir.
oruc|kulluk|Oruç|Oruç, Ramazan ve oruçla ilişkili yükümlülükler.|oruç,Ramazan,imsak|Her susma veya açlık otomatik oruç değildir.
hac|kulluk|Hac|Hac, umre ve ilgili mekân/ibadet bağlamları.|hac,umre,Kâbe|Her kurban veya yolculuk hac değildir.
kurban|kulluk|Kurban|İbadet bağlamında kurban ve sunu.|kurban,sunu|Genel öldürme ve et tüketimi ayrı konudur.
kadir|kulluk|Kadir gecesi|Kadir gecesinin vahiy bağlamı.|Kadir gecesi|Genel gece veya ilahi kudret ifadesi dahil değildir.
zikir|kulluk|Allah'ı anmak|Allah'ı anma ve hatırlama.|zikir,Allah'ı anmak|Her hatırlama Allah'ı anma değildir.
ibadet-ihlasi|kulluk|Kullukta içtenlik|İbadette samimiyet ve gösterişten kaçınma.|içtenlik,ibadette samimiyet|Genel doğruluk ayrı konudur.
cenaze-baglami|kulluk|Ölüm karşısında dua ve görevler|Ölüler için dua/namaz ifadelerinin tarihsel bağlamları.|ölüler için dua,cenaze namazı|Kur’an'ın ayrıntılı cenaze ritüeli tarif ettiği varsayılmaz.
sabir|ic-dunya|Sabır|Zorluk, görev ve haksızlık karşısında sebat ve sabırlı tutum.|sabır,sabretmek,sebat|Her bekleme veya pasif kabullenme sabır değildir.
tevekkul|ic-dunya|Tevekkül|Çaba ve tercih bağlamında Allah'a dayanma.|tevekkül,Allah'a güvenmek|Sorumluluktan kaçış veya insanlara güvenle eş tutulmaz.
umit|ic-dunya|Ümit ve ümitsizlik|Allah'ın rahmeti ve gelecek karşısında umut/umut kesme.|ümit,umut,ümitsizlik|Klinik depresyon kategorisi veya tedavi iddiası değildir.
korku|ic-dunya|Korku ve güven|Korku, güven ve bunlar karşısında tutum.|korku,güven|Her takva veya siyasi güvenlik ifadesi aynı konu değildir.
ofke|ic-dunya|Öfke ve özdenetim|İnsanın öfkesi ve öfkeyi kontrol etmesi.|öfke,öfkeyi yutmak|Cehennem ateşi veya ilahi gazap insan öfkesi değildir.
huzun|ic-dunya|Hüzün ve teselli|Keder, üzülme ve metinde açık teselli.|üzülme,hüzün,keder|Klinik tedavi vaadi olarak yorumlanmaz.
imtihan|ic-dunya|İmtihan|Nimet ve zorluklarla sınanma.|imtihan,sınanmak,denemek|Deneme sözcüğünün her gündelik kullanımı dahil değildir.
huzur|ic-dunya|İç huzur ve sükûnet|Kalbin yatışması ve metindeki güven/sükûnet bağlamı.|kalpler huzur,sükûnet|Kaygı bozukluğuna tedavi veya garanti değildir.
sukur|ahlak|Şükür|Nimeti tanıma, teşekkür ve nankörlüğün karşıtı.|şükür,şükretmek,nankörlük|Her nimet sözcüğü otomatik şükür değildir.
dogruluk|ahlak|Doğruluk ve dürüstlük|Söz ve davranışta dürüstlük.|dürüstlük,doğru söz,sadık|Her doğru yol, doğru tahmin veya doğru yön ifadesi dahil değildir.
merhamet|ahlak|Merhamet|İnsanların birbirlerine şefkat ve merhamet göstermesi.|merhamet,şefkat|Yalnız ilahi rahmet insan merhameti olarak sınıflanmaz.
affetme|ahlak|Affetmek|İnsanların affetmesi, bağışlaması ve karşılık vermekten vazgeçmesi.|affetmek,bağışlamak|İlahi bağışlama ve tövbe bağımsız konulardır.
tevazu|ahlak|Tevazu|Böbürlenmeme ve alçakgönüllü tutum.|tevazu,alçakgönüllülük|Her eğilme veya bedensel secde tevazu değildir.
kibir|ahlak|Kibir|Üstünlük taslama ve büyüklenme.|kibir,böbürlenme|İlahi yücelik kibir olarak etiketlenmez.
emanet|ahlak|Emanet ve güvenilirlik|Emaneti koruma ve güvenilir davranış.|emanet,güvenilirlik|Her ilahi bilgi veya maddi mülk emanet sayılmaz.
sozlesme|ahlak|Sözünde durmak ve ahit|Verilen söz ve ahit sorumluluğu.|ahit,sözünde durmak|Bütün söz/söyleme fiilleri ahit değildir.
riya|ahlak|Gösteriş|İyi eylemi gösteriş amacıyla yapma.|gösteriş,riya|Her görünür ibadet gösteriş sayılmaz.
ahlaki-ozelestiri|ahlak|Ahlaki öz değerlendirme|Kişinin tutumuyla iyi insan iddiası arasındaki ilişki.|kalbim temiz,kendini temize|Çeviride her temiz sözcüğü ahlaki öz değerlendirme değildir.
israf|ahlak|İsraf|Ölçüsüz harcama/tüketim ve savurganlık.|israf,savurganlık|Her harcama veya bolluk israf değildir.
evlilik|aile|Evlilik|Eş ilişkisi, nikâh ve evliliğe ilişkin haklar.|evlilik,nikâh,eşler|Doğadaki her çift yaratılışı evlilik değildir.
ebeveyn|aile|Anne ve babaya iyilik|Anne/babaya davranış ve hakları.|anne baba,ebeveyne iyilik|Soy anlatısındaki her baba/anne sözcüğü yeterli değildir.
cocuk|aile|Çocuklar ve bakım|Çocukların hakları, bakımı ve ebeveyn sorumluluğu.|çocuk,evlat|Her peygamber soy anlatısı ebeveynlik tavsiyesi değildir.
emzirme|aile|Emzirme ve sütten kesme|Çocuğun emzirilmesi, süt akrabalığı ve sütten kesilmesi.|emzirme,süt annelik,sütten kesme|Her süt içeceği veya mecazi süt ırmağı dahil değildir.
bosanma|aile|Boşanma|Evliliğin sona ermesi ve karşılıklı haklar.|boşanma,talak|Genel ayrılma/terk sözcüğü yeterli değildir.
mahremiyet|aile|Mahremiyet ve izin|Özel alan, eve giriş izni ve kişisel sınırlar.|mahremiyet,izin istemek|Her izin veya gizli bilgi aynı konu değildir.
cinsellik|aile|Cinsellik ve sınırlar|Cinsel ilişkiler ve bunlara ilişkin sınırlar.|cinsellik,cinsel ilişki|Doğadaki her eş/çift ifadesi dahil değildir.
zina|aile|Zina|Zina ve cinsel davranışa dair açık sınırlar.|zina,fuhuş|Her ahlaksızlık veya kötülük sözcüğü zina değildir.
akrabalik|aile|Akrabalık bağları|Yakınlarla ilişki ve bağları gözetmek.|akraba,akrabalık|Yalnız soy bilgisi sorumluluk ilişkisinin kanıtı değildir.
yardimlasma|toplum|Yardımlaşma|İnsanların iyilikte destek olması ve ihtiyaç sahibine yardım.|yardımlaşma,yardım etmek|Allah'tan yardım isteme tek başına insanlar arası yardım değildir.
baris|toplum|Barış ve uzlaşma|Çatışmayı durdurma ve uzlaştırma.|barış,uzlaşma|Her selam veya güven ifadesi siyasi barış değildir.
giybet|toplum|Gıybet ve kötüleme|Arkasından konuşma ve kişiyi karalama.|gıybet,arkasından konuşmak|Haklı tanıklık otomatik gıybet değildir.
alay|toplum|Alay ve aşağılama|İnsanlarla veya inançla alay etme ve küçümseme.|alay,dinle eğlenme|Genel eğlence tek başına dahil değildir.
gizli-gorusme|toplum|Gizli görüşme|Gizli konuşma ve bunun etik bağlamı.|fısıldaşma,gizli görüşme|Her gizli şey veya ilahi gayb bilgisi dahil değildir.
haber-dogrulama|toplum|Haber ve iddia doğrulama|Haber/iddia karşısında kanıt ve doğrulama sorumluluğu.|haber doğrulamak,araştırmak|Her düşünme ayeti haber doğrulama değildir.
zan|toplum|Zan ve çoğunluğu izlemek|Kanıtsız kanaat ve çoğunluğu gerekçe sayma.|zan,çoğunluğa uymak|Her çoğunluk veya sayısal ifade dahil değildir.
esitlik|toplum|İnsan onuru ve eşitlik|Soy/ırk üstünlüğünün reddi ve ortak insanlık.|ırkçılık,insan onuru|Modern hukuki terim metne zorla yüklenmez.
musavere|toplum|Danışma|Kararlarda danışma ve ortak değerlendirme.|şura,danışma|Her soru sormak danışma değildir.
toplumsal-gorevler|toplum|Toplumsal sorumluluk|İyiliği destekleme ve toplumdaki sorumluluklar.|müminlerin görevleri,iyiliği emretmek|Her iman ayeti toplumsal görev değildir.
din-otoritesi|toplum|Dinî otorite ve sorgulama|Dinî otoriteye sorgusuz bağlılık ve delil sorumluluğu.|din adamları,mezhep,tarikat|Güncel grupların tümüne metinden suçlama türetilmez.
yoksulluk|ekonomi|Yoksulluk ve ihtiyaç sahipleri|İhtiyaç sahipleri ve onların maddi hakları.|yoksul,ihtiyaç sahibi|Her sıkıntı maddi yoksulluk değildir.
rizik|ekonomi|Rızık|Geçim, beslenme ve verilen nimetlerin maddi bağlamı.|rızık,geçim|Rızık sözcüğü her durumda yalnız para anlamına gelmez.
zekat|ekonomi|Zekât|Açık zekât yükümlülüğü ve metindeki anlam bağlamı.|zekât,zekât vermek|Genel harcama/sadaka zekâtla özdeş değildir.
infak|ekonomi|İnfak ve sadaka|Paylaşım ve gönüllü/maddi yardım.|infak,sadaka|Allah'tan yardım dileme veya her harcama dahil değildir.
faiz|ekonomi|Faiz|Riba/faiz ve haksız artış bağlamı.|faiz,riba|Her kâr veya artış faiz değildir.
ticaret|ekonomi|Ticaret ve dürüst ölçü|Alışveriş, ölçü/tartı ve adil değişim.|ticaret,tartı,ölçü|İnançla yapılan mecazi alışveriş ayrı değerlendirilir.
borc|ekonomi|Borç|Borç, yazılı kayıt ve ödeme sorumluluğu.|borç,alacak|Her yükümlülük maddi borç değildir.
miras|ekonomi|Miras ve vasiyet|Mirasın paylaşımı, vasiyet ve hak sahipleri.|miras,vasiyet|Peygamberlik mirası maddi pay hükmü değildir.
yetim-hakki|ekonomi|Yetimler ve hakları|Yetimlerin korunması ve mal/hak gözetimi.|yetim,yetim hakkı|Yalnız anlatısal yetim sıfatı hukuki hak hükmü değildir.
helal-gida|ekonomi|Helal gıda|Yiyecek/içecek sınırları ve tüketim.|helal et,helal yiyecek|Her helal ifadesi gıda değildir.
icki|ekonomi|Sarhoş edici içecekler|Sarhoşluk ve içkiye ilişkin açık ifadeler.|içki,sarhoşluk|Ahiret içecekleri bağlamı dünyadaki içki hükmüyle özdeş değildir.
kumar|ekonomi|Kumar|Kumar ve buna ilişkin maddi/sosyal zarar.|kumar|Her şans veya kura dahil değildir.
adalet|adalet|Adalet|İnsanlar arası adil hüküm ve hak gözetimi.|adalet,adil davranmak|Her ilahi karşılık insan yargısı değildir.
zulum|adalet|Zulüm ve haksızlık|Hakkı çiğneme, baskı ve haksızlık.|zulüm,haksızlık|Bağlamdaki şirk/günah kullanımı ayrıca ayrıştırılır.
taniklik|adalet|Tanıklık|Tanıklıkta doğruluk ve adil şahitlik.|tanıklık,şahitlik|Her görme/bilme fiili hukuki tanıklık değildir.
yemin|adalet|Yemin|Yemin, yeminin sorumluluğu ve bozulmasının bağlamı.|yemin,and içmek|Her ahit veya verilmiş söz yemin değildir.
iftira|adalet|İftira|Kişiye asılsız suç/isnat yöneltme.|iftira,asılsız suçlama|Her yalan veya Allah'a isnat aynı alt bağlam değildir.
can-hakki|adalet|Canın korunması|İnsan öldürme, can güvenliği ve öldürmenin reddi.|öldürmek,katil,can hakkı|Hayvan kesimi ve mecazi ölüm dahil değildir.
kisas|adalet|Kısas|Zarar karşılığı kısas ve bağışlama seçenekleri.|kısas|Modern ceza hukuku ayrıntıları metinden türetilmez.
savas|adalet|Savaş ve sınırları|Silahlı çatışma, savunma ve savaşta sınırlar.|savaş,cihad|Cihadın her kullanımı silahlı savaşla özdeş değildir.
ozgurlestirme|adalet|Kölelik bağlamı ve özgürleştirme|Tarihsel kölelik ve özgürleştirmeye ilişkin ifadeler.|köle,özgürleştirme|Tarihsel kurum modern ilişkilerle eş tutulmaz.
yonetim|adalet|Yönetim ve yetki|Yetki sahipleri, itaat ve adil yönetim.|Ulul-Emr,yetki sahipleri|Her güncel yönetim için sınırsız itaat hükmü çıkarılmaz.
olum|ahiret|Ölüm|Ölüm, fanilik ve insanın ölüm karşısındaki tutumu.|ölüm,ecel|Mecazi ölüm ve öldürme hukuku ayrı incelenir.
ahiret|ahiret|Ahiret inancı|Ölüm sonrası hayat ve Ahiret Günü inancının açıkça konu edilmesi.|ahiret,Ahiret Günü,ölüm sonrası|Her inanan sözcüğü veya dünyadaki karşılık ölüm sonrası bağlamı kurmaz; ayrıntılı anlatılar ilgili daha belirli konularla değerlendirilir.
dirilis|ahiret|Diriliş|Ölümden sonra yeniden dirilme.|diriliş,diriltilecek|Bitkinin canlanması doğrudan ahiret eşlemesi değildir.
kiyamet|ahiret|Kıyamet|Son saat, zamanı ve kıyamet anlatımları.|kıyamet,son saat|Her azap/ceza veya ahiret ifadesi kıyametin zamanı değildir.
hesap|ahiret|Hesap ve karşılık|Ahiret hesabı ve eylemlerin karşılığı.|hesap günü,karşılık|Ticari hesap veya dünyadaki maaş ayrı konudur.
cennet|ahiret|Cennet|Ahiret ödül yurdu ve onun betimlemeleri.|cennet,ödül yurdu|Dünyadaki her bahçe cennet değildir.
cehennem|ahiret|Cehennem|Ahiret azap yurdu ve onun betimlemeleri.|cehennem,ateş azabı|Dünyadaki ateş veya insan öfkesi dahil değildir.
sefaat|ahiret|Şefaat|Şefaatin şartları, sınırları ve yetki bağlamı.|şefaat,aracılık|Her yardım veya vekillik şefaat değildir.
amel-kaydi|ahiret|Amellerin kaydı|Eylemlerin yazılması ve hesapta kayıtların sunulması.|amel defteri,yazıcı melekler|Her kitap veya melek sözcüğü dahil değildir.
dunya-hayati|ahiret|Dünya hayatının geçiciliği|Dünya hayatı/ahiret karşılaştırması ve geçicilik.|dünya hayatı,geçici hayat|Dünyada geçen her olay bu konu değildir.
peygamberlik|peygamberler|Peygamberlik|Elçilerin seçimi ve vahiy ile görevleri.|peygamber,elçi|Melek elçileri ve sıradan haberciler ayrıştırılır.
teblig|peygamberler|Tebliğ ve davet|Elçinin bildirmesi ve hikmetle inanca davet.|İslama davet,peygamberin görevi|Her çağrı veya davet dini tebliğ değildir.
peygamber-anlatilari|peygamberler|Peygamber anlatıları|Peygamberlerin anlatılarının bağlamları ve açık temaları.|Musa,İbrahim,Yusuf|İsim geçişi tek başına ahlaki ders eşlemesi değildir.
mucize|peygamberler|Elçilere verilen işaretler|Elçilerin doğrulanması bağlamındaki işaretler.|mucize,delil|Doğadaki bütün işaretler peygamber mucizesi değildir.
yaratilis|yaratilis|Yaratılışın işaretleri|Doğa ve yaratılışın düşünmeye davet eden işaretleri.|Allah'ın yarattığı ayetler,gökler ve yer|Her yer/gece ifadesi yaratılış delili değildir.
akil|yaratilis|Akıl ve düşünme|Akletme, düşünme ve ibret alma çağrıları.|aklını kullanmak,düşünmek,tefekkür|Her doğru ifade veya bilgi otomatik akletme değildir.
bilgi|yaratilis|Bilgi ve delil|Bilme, öğrenme ve delile dayanma.|bilgi,delil|Sadece ilahi ilim insan öğrenmesi değildir.
insan-yaratilisi|yaratilis|İnsanın yaratılışı|İnsanın başlangıcı, gelişimi ve yaratılışı.|insanın yaratılışı,balçık|Modern biyomedikal kesinlikler metne yüklenmez.
dogal-duzen|yaratilis|Doğadaki düzen|Doğadaki ölçü, döngüler ve düzen.|evrenin kanunları,doğanın düzeni|Ayetler modern fizik yasalarının ders kitabı değildir.
hayvanlar|yaratilis|Hayvanlar ve canlılık|Canlılar ve insanla ilişkileri hakkındaki açık anlatımlar.|hayvanlar,canlılar|Mecazi hayvan benzetmesi doğal tarih sayılmaz.
ehli-kitap|tarih|Ehl-i kitap|Önceki vahiy topluluklarına hitap, farklı tutumlar ve inananları.|Ehl-i kitap,kitap ehli|Genel inanan sözcüğü Ehl-i kitap için yeterli değildir.
topluluk-akibeti|tarih|Toplulukların tutumu ve akıbeti|Toplulukların davranışları ve anlatılan sosyal sonuçlar.|ümmet,kavim|Günümüz toplumları hakkında doğrudan ilahi teşhis türetilmez.
sunnetullah|tarih|Sünnetullah|Topluluklar ve tarih bağlamında Allah'ın değişmeyen tutumu.|sünnetullah,Allah'ın yasası|Modern doğa kanunlarıyla otomatik eş tutulmaz.
hicret|tarih|Hicret|İnanç ve baskı bağlamında yer değiştirme.|hicret,göç eden|Her yolculuk hicret değildir.
allah-yolunda-olum|tarih|Allah yolunda ölüm|Allah yolunda öldürülenlerin metindeki bağlamı.|şehitlik,Allah yolunda ölmek|Her ölüm veya güncel siyasi olay şehitlik diye sınıflanmaz.
`.trim().split("\n").map(line => line.split("|"));
const normalize = value => value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i");
const slugify = value => normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// Explicit name correspondence, NOT automatic transfer of source verse mappings.
const sourceCorrespondence = {
  "012": "abdest", "036": "ahiret", "2049": "akil", "1036": "allah-yalan", "2047": "yaratilis", "2037": "ebeveyn",
  "1030": "vahyin-korunmasi", "1034": "kisisel-sorumluluk", "1024": "mescit", "1033": "cenaze-baglami", "037": "cennet", "026": "cinsellik",
  "2057": "din", "1028": "din-ozgurlugu", "020": "alay", "023": "dua", "2042": "ehli-kitap", "1031": "ehli-kitap", "027": "evlilik",
  "2044": "dogal-duzen", "025": "faiz", "024": "gizli-gorusme", "016": "hac", "015": "helal-gida", "022": "icki", "034": "iftira",
  "1035": "din-ozgurlugu", "2054": "esitlik", "2040": "teblig", "2059": "isr", "017": "kadir", "2036": "ahlaki-ozelestiri",
  "1029": "kible", "2039": "kisas", "1026": "kiyamet", "2051": "ozgurlestirme", "1027": "kuran-okuma", "2038": "metin-carpitma",
  "2045": "kuran-nitelikleri", "019": "kurban", "2050": "muhkem-mutesabih", "039": "toplumsal-gorevler", "2043": "topluluk-akibeti",
  "014": "namaz", "2048": "namaz-vakitleri", "2060": "nesih", "028": "can-hakki", "1037": "teblig", "1032": "sefaat",
  "018": "oruc", "038": "sabir", "029": "savas", "035": "allah-yolunda-olum", "2053": "sunnetullah", "030": "emzirme",
  "2041": "din-otoritesi", "2058": "tasdik", "2052": "yonetim", "033": "miras", "031": "infak", "2055": "amel-kaydi",
  "2056": "amel-kaydi", "021": "yemin", "2046": "zan", "013": "zekat", "032": "zina",
};
const ambiguous = new Set(["nesih", "isr", "din-otoritesi", "cenaze-baglami", "ehli-kitap", "topluluk-akibeti", "sunnetullah", "ozgurlestirme", "yonetim", "savas", "sefaat", "ahlaki-ozelestiri"]);
const topics = rows.map(([rawId, domainId, name, inclusion, aliasText, exclusion]) => {
  const id = slugify(rawId);
  const associated = source.filter(entry => sourceCorrespondence[entry.id] === id);
  return { id, slug: id, name, description: inclusion, domainId, parentTopicId: null,
    aliases: [...new Set(aliasText.split(","))], everydayIntents: [], relatedTopicIds: [], sourceTopicNames: associated.map(entry => entry.name),
    status: "proposed", reviewNotes: ["Editorial proposal; semantic definition, aliases and evidence require human review.", ...(ambiguous.has(id) ? ["Interpretation-sensitive: compare passage context and translator notes; do not infer a settled theological ruling."] : [])],
    version, inclusion, exclusion, provenance: { origin: "editorial-proposal", sourceTopicIds: associated.map(entry => entry.id) } };
});
const topicMap = new Map(topics.map(topic => [topic.id, topic]));
const subtopicRows = [
  ["sabir", "Musibet karşısında sabır"], ["sabir", "Sorumlulukta sebat"], ["sabir", "Haksızlık karşısında sabır"],
  ["dua", "Yardım ve bağışlanma dilemek"], ["dua", "Peygamberlerin duaları"], ["dua", "Dua ve yakınlık"],
  ["namaz", "Namaza devam etmek"], ["namaz", "Namaz ve toplumsal sorumluluk"],
  ["oruc", "Ramazan orucu"], ["oruc", "Telafi ve kefaret bağlamı"], ["hac", "Hac ve umre"], ["hac", "Hacda sınırlar"],
  ["evlilik", "Eşlerin karşılıklı hakları"], ["evlilik", "Nikâhın sınırları"], ["bosanma", "Bekleme süresi"], ["bosanma", "Ayrılıkta adil davranmak"],
  ["infak", "İhtiyaç sahibine paylaşım"], ["infak", "Gösterişsiz yardım"], ["miras", "Miras payları"], ["miras", "Vasiyet sorumluluğu"],
  ["yetim-hakki", "Yetim malının korunması"], ["ticaret", "Ölçü ve tartı"], ["borc", "Borcun kayda alınması"],
  ["savas", "Savaşta sınır ve barış"], ["can-hakki", "Haksız yere öldürme"],
  ["ehli-kitap", "Ehl-i kitap içinde inananlar"], ["ehli-kitap", "Ehl-i kitaba yönelik eleştirilerin bağlamı"],
  ["kiyamet", "Son saatin bilinmezliği"], ["hesap", "Eylemlerin karşılığı"], ["amel-kaydi", "Eylemleri kaydeden melekler"],
  ["amel-kaydi", "Hesapta sunulan kayıt"], ["akil", "Yaratılış üzerinde düşünmek"], ["akil", "Vahiy üzerinde düşünmek"],
  ["teblig", "Elçinin bildirme görevi"], ["teblig", "Hikmetli davet"], ["merhamet", "İnsanlara şefkat"],
];
const subtopics = subtopicRows.map(([parentTopicId, name]) => ({
  id: `${parentTopicId}--${slugify(name)}`, slug: `${parentTopicId}--${slugify(name)}`, name,
  description: `${topicMap.get(parentTopicId).name} konusunun inceleme alt başlığı: ${name}.`, domainId: topicMap.get(parentTopicId).domainId,
  parentTopicId, aliases: [], everydayIntents: [], relatedTopicIds: [], sourceTopicNames: [], status: "proposed", version,
  inclusion: `${topicMap.get(parentTopicId).inclusion} Alt başlıktaki bağlam ayrıca bulunmalı.`, exclusion: topicMap.get(parentTopicId).exclusion,
  reviewNotes: ["Not an independent assignment; verify parent definition and contextual distinction."], provenance: { origin: "editorial-proposal", sourceTopicIds: [] },
}));
const intentRows = [
  ["Biraz huzur arıyorum", ["huzur", "dua"]], ["Sabretmekte zorlanıyorum", ["sabir", "imtihan"]],
  ["Gelecek konusunda kaygılıyım", ["korku", "tevekkul", "umit"]], ["Bir karar vermem gerekiyor", ["musavere", "akil", "tevekkul"]],
  ["Kendimi yalnız hissediyorum", ["dua", "yardimlasma"]], ["Affetmekte zorlanıyorum", ["affetme", "merhamet"]],
  ["Şükretmek istiyorum", ["sukur"]], ["Maddi sıkıntı yaşıyorum", ["rizik", "yoksulluk", "borc"]],
  ["Öfkeliyim", ["ofke", "sabir"]], ["Umudumu kaybediyorum", ["umit", "allah-rahmeti"]],
  ["Ailemle ilgili zorlanıyorum", ["evlilik", "ebeveyn", "akrabalik"]], ["Haksızlığa uğradım", ["adalet", "zulum", "sabir"]],
  ["Doğru haberi nasıl ayırt ederim?", ["haber-dogrulama", "zan", "bilgi"]], ["Birine yardım etmek istiyorum", ["infak", "yardimlasma"]],
  ["Hata yaptım, dönmek istiyorum", ["tevbe", "kisisel-sorumluluk"]], ["Yakınımı kaybettim", ["olum", "huzun", "sabir"]],
];
const everydayIntents = intentRows.map(([label, topicIds]) => ({ id: slugify(label), label, topicIds, status: "proposed", kind: "discovery-query", reviewNotes: "Navigation proposal, not a clinical diagnosis, treatment, life-advice generation or religious promise." }));
for (const intent of everydayIntents) for (const id of intent.topicIds) topicMap.get(id).everydayIntents.push(intent.id);
const relatedSets = [["sabir", "imtihan", "tevekkul", "umit"], ["dua", "tevbe", "allah-rahmeti"], ["namaz", "abdest", "kible", "mescit"], ["infak", "zekat", "yoksulluk", "yetim-hakki"], ["evlilik", "bosanma", "cinsellik", "akrabalik"], ["adalet", "taniklik", "iftira", "can-hakki"], ["kiyamet", "hesap", "dirilis", "amel-kaydi"], ["vahiy", "kuran-anlama", "metin-carpitma"], ["akil", "yaratilis", "bilgi", "dogal-duzen"]];
for (const set of relatedSets) for (const id of set) topicMap.get(id).relatedTopicIds = set.filter(other => other !== id);

const sourceRepresentation = source.map(entry => ({ sourceTopicId: entry.id, sourceName: entry.name, topicId: sourceCorrespondence[entry.id], represented: topicMap.has(sourceCorrespondence[entry.id]),
  note: ["2042", "1031", "2055", "2056"].includes(entry.id) ? "Consolidated under a canonical topic with explicit subtopics; source name and original mappings retained independently." : entry.id === "036" ? "General afterlife belief is distinguished from diriliş, kıyamet, hesap, cennet and cehennem; source mappings are not transferred." : ambiguous.has(sourceCorrespondence[entry.id]) ? "Represented for review, not endorsement of the source's question or implied conclusion." : "Name correspondence only; source mappings remain untouched." }));
if (sourceRepresentation.some(entry => !entry.represented)) throw new Error("Unrepresented source name");

// All corpus texts considered by deterministic lexical retrieval. This produces
// inspectable coverage/evidence hints, never assignments or review approval.
const normalized = corpus.map(verse => ({ verse, text: normalize(verse.plainTranslation) }));
const passageHints = {
  "kuran-nitelikleri": ["2:2", "17:9"], "kuran-okuma": ["7:204", "73:20"], "kuran-anlama": ["4:82", "38:29"],
  "metin-carpitma": ["3:78", "4:46"], "namaz-vakitleri": ["11:114", "17:78"], "cenaze-baglami": ["9:84"],
  "tevazu": ["25:63", "31:18"], "ahlaki-ozelestiri": ["53:32"], "ebeveyn": ["17:23", "31:14"],
  "mahremiyet": ["24:27", "24:58"], "cinsellik": ["2:187"], "haber-dogrulama": ["49:6"], "esitlik": ["49:13"],
  "toplumsal-gorevler": ["3:104"], "din-otoritesi": ["9:31"], "helal-gida": ["5:3"], "yonetim": ["4:59"],
  "teblig": ["16:125", "5:99"], "dogal-duzen": ["36:40", "55:7"], "sunnetullah": ["33:62"],
  "allah-yolunda-olum": ["3:169"],
};
const corpusEvidence = topics.map(topic => {
  const terms = [topic.name, ...topic.aliases].map(normalize);
  const matches = normalized.filter(({ text }) => terms.some(term => text.includes(term)));
  return { topicId: topic.id, retrievalMethod: "lexical-review-hints-only", lexicalCandidateCount: matches.length,
    examples: [...new Map([...(passageHints[topic.id] ?? []).map(id => ({ verse: corpus.find(verse => verse.id === id) })), ...matches].filter(({ verse }) => verse).map(({ verse }) => [verse.id, verse])).values()].slice(0, 3).map(verse => ({ verseId: verse.id, canonicalText: verse.plainTranslation, translator: verse.translator, origin: (passageHints[topic.id] ?? []).includes(verse.id) ? "editorial-passage-review-hint" : "lexical-review-hint", reviewStatus: "proposed" })),
    limitation: "No semantic approval. Misses paraphrases and can retrieve false positives; zero lexical matches do not imply topic absence." };
});
const consolidation = [
  { canonical: "sabir", aliases: ["sabretmek", "sabırlı olmak", "sabırlılık"], subtopic: "Musibet karşısında sabır" },
  { canonical: "umit", aliases: ["umut", "ümitsizlik", "umudum kalmadı"] },
  { canonical: "infak", sourceIds: ["031"], distinctFrom: "zekat", note: "Zekât stays separate; neither is expanded using generic yardım hits." },
  { canonical: "ehli-kitap", sourceIds: ["2042", "1031"], subtopics: ["inananlar", "eleştirilerin bağlamı"] },
  { canonical: "din-ozgurlugu", sourceIds: ["1028", "1035"], note: "Two source names retained; review whether subtopics should be split." },
  { canonical: "teblig", sourceIds: ["2040", "1037"], subtopics: ["elçinin görevi", "hikmetli davet"] },
  { canonical: "amel-kaydi", sourceIds: ["2055", "2056"], subtopics: ["kaydedenler", "hesapta sunulan kayıt"] },
];
const proposal = { version, status: "proposed", provenance: { origin: "editorial-proposal", corpusSha256: createHash("sha256").update(raw).digest("hex"), corpusVersesConsidered: corpus.length, source: "source-topics.json name references only", finalClassificationExecuted: false }, domains, topics, subtopics, everydayIntents };
const report = { version, counts: { domains: domains.length, canonicalTopics: topics.length, subtopics: subtopics.length, aliases: topics.reduce((sum, topic) => sum + topic.aliases.length, 0), everydayIntents: everydayIntents.length, sourceTopics: source.length, representedSourceTopics: sourceRepresentation.filter(entry => entry.represented).length, finalVerseMappings: 0 }, sourceRepresentation, unrepresentedSourceTopics: [], consolidation,
  newProposedTopics: topics.filter(topic => !topic.sourceTopicNames.length).map(({ id, name }) => ({ id, name })),
  requiresHumanReview: topics.filter(topic => ambiguous.has(topic.id)).map(({ id, name, reviewNotes }) => ({ id, name, reviewNotes })), corpusEvidence,
  limitations: ["No expensive final 6,236-verse classification executed.", "Lexical corpus evidence is retrieval assistance only, not a quality score or semantic coverage proof.", "All domains, definitions, aliases, intents, consolidation and examples require human review.", "Existing production labels were written by heuristic automation; their human review is not independently established."] };
await mkdir("data/generated", { recursive: true });
await writeFile("data/generated/topic-ontology-v2.proposed.json", JSON.stringify(proposal, null, 2) + "\n");
await writeFile("data/generated/topic-ontology-v2.report.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report.counts, null, 2));
