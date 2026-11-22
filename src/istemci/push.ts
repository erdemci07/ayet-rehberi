"use client";
import type { Durum, Hatirlatmalar } from "@/cekirdek/durum";

const ENDPOINT = "https://us-central1-ayet-rehberi.cloudfunctions.net/ayetPushApi";
const DEVICE_KEY = "ayet-rehberi:push-device:v1";
const ENABLED_KEY = "ayet-rehberi:push-enabled:v1";

type Device = { deviceId: string; deviceSecret: string };
type ResponseData = { ok?: boolean; vapidPublicKey?: string; error?: string };

export function supportsPush() {
  return typeof window !== "undefined" && window.isSecureContext &&
    "Notification" in window && "PushManager" in window &&
    "serviceWorker" in navigator;
}

export function isIosOutsidePwa() {
  if (typeof window === "undefined") return false;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  return ios && !standalone;
}

export function hasPushConsent() {
  try { return localStorage.getItem(ENABLED_KEY) === "true"; }
  catch { return false; }
}

function device(): Device {
  try {
    const existing = JSON.parse(localStorage.getItem(DEVICE_KEY) || "null") as Device | null;
    if (existing && /^[a-zA-Z0-9_-]{20,100}$/.test(existing.deviceId) &&
      /^[0-9a-f]{64}$/.test(existing.deviceSecret)) return existing;
  } catch {}
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const created = { deviceId: "device_" + crypto.randomUUID().replace(/-/g, ""),
    deviceSecret: Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("") };
  localStorage.setItem(DEVICE_KEY, JSON.stringify(created));
  return created;
}

function localDay(date: Date, timeZone: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date).filter(x => x.type !== "literal").map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function summary(d: Durum) {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul";
  let lastReadDay: string | null = null;
  if (d.okuma?.zaman) {
    const date = new Date(d.okuma.zaman);
    if (!Number.isNaN(date.getTime())) lastReadDay = localDay(date, timeZone);
  }
  return {
    prefs: d.ayarlar.hatirlatmalar as Hatirlatmalar,
    timeZone,
    lastOpenDay: d.gunler.at(-1) || null,
    lastReadDay,
    lastReadSure: d.okuma?.sure ?? null,
    lastReadPart: d.okuma?.bolum ?? null,
  };
}

async function request(body: Record<string, unknown>, method: "POST" | "GET" = "POST"): Promise<ResponseData> {
  let result: Response;
  try {
    result = await fetch(ENDPOINT, method === "GET" ? { method, cache: "no-store" } : {
      method, headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body), cache: "no-store",
    });
  } catch {
    throw new Error("Bildirim sunucusuna ulaşılamadı. Google Cloud kurulumu veya bağlantıyı kontrol edin.");
  }
  const data = await result.json().catch(() => ({})) as ResponseData;
  if (!result.ok) throw new Error(data.error || `Bildirim sunucusu: ${result.status}`);
  return data;
}

function decodeKey(encoded: string): Uint8Array<ArrayBuffer> {
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  const key = new Uint8Array(new ArrayBuffer(bytes.length));
  for (let i = 0; i < bytes.length; i++) key[i] = bytes.charCodeAt(i);
  return key;
}

export async function enablePush(d: Durum): Promise<void> {
  if (!supportsPush()) throw new Error("Bu cihaz Web Push bildirimlerini desteklemiyor.");
  if (isIosOutsidePwa()) throw new Error("iPhone'da önce Safari'den Paylaş → Ana Ekrana Ekle, ardından uygulama ikonundan aç.");
  // Request permission from the user's direct click before awaiting any network call.
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Bildirim izni verilmedi. Cihaz bildirim ayarlarını kontrol et.");
  const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  const config = await request({}, "GET");
  if (!config.vapidPublicKey) throw new Error("Web Push anahtarı henüz kurulu değil.");
  const vapid = decodeKey(config.vapidPublicKey);
  let subscription = await registration.pushManager.getSubscription();
  const current = subscription?.options.applicationServerKey;
  if (subscription && current &&
    Array.from(new Uint8Array(current)).join(",") !== Array.from(vapid).join(",")) {
    await subscription.unsubscribe();
    subscription = null;
  }
  if (!subscription) subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true, applicationServerKey: vapid,
  });
  const sub = subscription.toJSON();
  await request({ action: "subscribe", ...device(), ...summary(d), subscription: sub });
  localStorage.setItem(ENABLED_KEY, "true");
}

export async function disablePush(): Promise<void> {
  const d = device();
  await request({ action: "unsubscribe", ...d });
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    await subscription?.unsubscribe();
  }
  localStorage.removeItem(ENABLED_KEY);
}

export async function testPush(): Promise<void> {
  if (!hasPushConsent()) throw new Error("Önce bildirimleri etkinleştir.");
  await request({ action: "test", ...device() });
}

export async function syncPush(d: Durum): Promise<void> {
  if (!hasPushConsent() || !supportsPush() || Notification.permission !== "granted") return;
  await request({ action: "sync", ...device(), ...summary(d) });
}
