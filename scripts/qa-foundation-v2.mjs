import { createServer } from "node:http";
import { readFile, stat, mkdir, writeFile, mkdtemp } from "node:fs/promises";
import { resolve, extname, sep, join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";

// Optional Windows QA harness. Tests the real static export, not Next dev mode.
const root = resolve("out");
const edgePath = process.env.AYET_QA_BROWSER ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const contentTypes = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".txt": "text/plain" };
const server = createServer(async (request, response) => {
  try {
    let path = resolve(root, `.${decodeURIComponent(new URL(request.url, "http://localhost").pathname)}`);
    if (path !== root && !path.startsWith(root + sep)) throw Error("Invalid path");
    if ((await stat(path)).isDirectory()) path = join(path, "index.html");
    response.writeHead(200, { "Content-Type": contentTypes[extname(path)] ?? "application/octet-stream" }); response.end(await readFile(path));
  } catch { response.writeHead(404); response.end("Not found"); }
});
await new Promise(resolve => server.listen(3050, "127.0.0.1", resolve));
const profile = await mkdtemp(join(tmpdir(), "ayet-v2-qa-"));
const edge = spawn(edgePath, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=9354", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(expression) { for (let i = 0; i < 50; i++) { if (await evaluate(expression)) return true; await sleep(100); } return false; }
let socket; const callbacks = new Map(); let messageId = 0; const runtimeErrors = [];
const command = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++messageId; const timer = setTimeout(() => { callbacks.delete(id); reject(Error(`CDP timeout ${method}`)); }, 20000);
  callbacks.set(id, message => { clearTimeout(timer); if (message.error) reject(Error(JSON.stringify(message.error))); else resolve(message.result); });
  socket.send(JSON.stringify({ id, method, params }));
});
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw Error(result.exceptionDetails.text + " " + (result.exceptionDetails.exception?.description ?? ""));
  return result.result.value;
}
async function navigate(path) {
  await command("Page.navigate", { url: `http://127.0.0.1:3050${path}` });
  for (let attempt = 0; attempt < 60; attempt++) {
    await sleep(80);
    if (await evaluate(`location.pathname === ${JSON.stringify(path.split(/[?#]/)[0])} && document.readyState === 'complete' && !!document.querySelector('main')`)) break;
  }
  await evaluate("document.fonts.ready"); await sleep(250);
}
const findings = []; const assertions = [];
async function screenshot(name) {
  await mkdir("data/generated/qa-v2", { recursive: true });
  const shot = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(`data/generated/qa-v2/${name}.png`, Buffer.from(shot.data, "base64"));
}
const assert = (name, passed, detail) => assertions.push({ name, passed: Boolean(passed), detail });
try {
  let tabs;
  for (let attempt = 0; attempt < 100; attempt++) { try { tabs = await (await fetch("http://127.0.0.1:9354/json/list")).json(); if (tabs.length) break; } catch {} await sleep(80); }
  if (!tabs?.length) throw Error("Headless Edge unavailable");
  socket = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
  await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
  socket.addEventListener("message", event => { const message = JSON.parse(event.data); if (message.id) { callbacks.get(message.id)?.(message); callbacks.delete(message.id); } else if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text); });
  await command("Page.enable"); await command("Runtime.enable");
  const routes = ["/", "/kesfet/", "/kuran/", "/konu/sab-r/", "/sure/2/", "/ayet/2/282/", "/esma/", "/esma/inceleme/", "/kitapligim/"];
  for (const width of process.argv.includes("--quick") ? [320] : [320, 360, 375, 390, 430]) {
    await command("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: true });
    for (const path of routes) {
      await navigate(path);
      for (const theme of ["light", "dark"]) {
        await evaluate(`document.documentElement.dataset.theme = '${theme}'`);
        const metrics = await evaluate(`(() => {const main=document.querySelector('main');const nav=document.querySelector('.bottom-nav');const style=getComputedStyle(main);return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,navItems:nav.querySelectorAll('a').length,active:nav.querySelector('[aria-current]')?.textContent.trim(),bottomPadding:parseFloat(style.paddingBottom),navHeight:nav.getBoundingClientRect().height,background:getComputedStyle(document.querySelector('.app-frame')).backgroundColor,verseCount:document.querySelectorAll('.verse-card').length,clippedText:[...document.querySelectorAll('.verse-text')].some(p=>{const s=getComputedStyle(p);return (['hidden','clip'].includes(s.overflowX) && p.scrollWidth>p.clientWidth+1) || (['hidden','clip'].includes(s.overflowY) && p.scrollHeight>p.clientHeight+1)})};})()`);
        findings.push({ path, width, theme, ...metrics });
        assert(`${path} ${width} ${theme} viewport`, metrics.scrollWidth <= width && !metrics.clippedText && metrics.navItems === 5 && metrics.bottomPadding > metrics.navHeight, metrics);
        if (path === "/" && theme === "light") await screenshot(`home-${width}`);
        if (width === 375 && theme === "dark" && ["/esma/", "/kitapligim/", "/konu/sab-r/"].includes(path)) await screenshot(`dark-${path.split('/').filter(Boolean).join('-')}`);
      }
    }
    await navigate("/ayet/2/2/");
    await evaluate("document.querySelector('.footnote-marker').click()"); await sleep(100);
    const footnote = await evaluate("(() => {const p=document.querySelector('.footnote-sheet');const m=document.querySelector('.footnote-marker');return {open:!!p,text:p?.querySelector('.footnote-sheet-body')?.textContent,hit:m.getBoundingClientRect().width,circle:m.firstElementChild.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth,focused:p?.contains(document.activeElement),locked:document.body.style.position==='fixed'};})()");
    const canonical = JSON.parse(await readFile("src/data/quran.json", "utf8")).find(verse => verse.id === "2:2");
    assert(`footnote ${width}`, footnote.open && footnote.text === canonical.footnotes[0].text && footnote.hit === 42 && footnote.circle === 28 && !footnote.overflow && footnote.focused && footnote.locked, footnote);
    if (width === 320) {
      await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab" }); await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab" });
      assert("footnote keyboard focus remains in dialog", await evaluate("document.querySelector('.footnote-sheet').contains(document.activeElement)"));
    }
    await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" }); await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
    await sleep(50); assert(`footnote Escape/focus ${width}`, await evaluate("!document.querySelector('.footnote-sheet') && document.activeElement.className === 'footnote-marker'"));
    await navigate("/ayet/24/31/");
    await evaluate("[...document.querySelectorAll('.footnote-marker')].find(button=>button.textContent.trim()==='5').click()"); await sleep(100);
    const longNote = await evaluate("({text:document.querySelector('.footnote-sheet-body')?.textContent,scrollable:document.querySelector('.footnote-sheet')?.scrollHeight > document.querySelector('.footnote-sheet')?.clientHeight,overflow:document.documentElement.scrollWidth>innerWidth})");
    const originalNote = JSON.parse(await readFile("src/data/quran.json", "utf8")).find(verse => verse.id === "24:31").footnotes.find(note => note.marker === "5");
    assert(`long footnote ${width} exact and scrollable`, longNote.text === originalNote.text && longNote.scrollable && !longNote.overflow, { length: longNote.text?.length, scrollable: longNote.scrollable });
    if (width === 375) await screenshot("long-footnote-375");
    await navigate("/ayet/2/282/");
    await evaluate("[...document.querySelectorAll('.verse-actions button')].find(b=>b.textContent==='Paylaş').click()"); await sleep(100);
    const share = await evaluate("(() => {const p=document.querySelector('.share-panel');return {open:!!p,overflow:document.documentElement.scrollWidth>innerWidth,themes:document.querySelectorAll('.share-theme-row button').length,buttons:[...document.querySelectorAll('.share-actions button')].map(b=>b.textContent),focused:p.contains(document.activeElement),text:document.querySelector('.share-preview p').textContent};})()");
    const longVerse = JSON.parse(await readFile("src/data/quran.json", "utf8")).find(verse => verse.id === "2:282");
    assert(`long share ${width}`, share.open && !share.overflow && share.themes === 4 && share.buttons.length === 2 && share.focused && share.text === longVerse.segments.map(segment => segment.type === "text" ? segment.value : segment.marker).join(""), { ...share, text: `${share.text.length} chars` });
    if (width === 320) {
      await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", modifiers: 8 }); await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab" });
      assert("share reverse keyboard focus wraps", await evaluate("document.activeElement.classList.contains('share-secondary')"));
      await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab" }); await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab" });
      assert("share keyboard focus wraps to close", await evaluate("document.querySelector('.share-header').contains(document.activeElement)"));
    }
    await evaluate("[...document.querySelectorAll('.share-theme-row button')].find(b=>b.textContent==='Gece').click()");
    assert(`share theme ${width}`, await evaluate("document.querySelector('.share-theme-row .selected').textContent === 'Gece'"));
    if (width === 320) await screenshot("long-share-320");
    if (width === 320) {
      await evaluate("window.__qaDraw=[];window.__qaFill=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,x,y){window.__qaDraw.push({text,x,y,font:this.font});return window.__qaFill.call(this,text,x,y)};document.querySelector('.share-primary').click()");
      await sleep(250);
      const drawing = await evaluate("window.__qaDraw");
      const translation = drawing.filter(item => item.y >= 280 && item.y < 1134);
      assert("long share canvas retains all text within reading area", translation.map(item => item.text).join(' ').replace(/\s+/g, ' ') === longVerse.segments.map(segment => segment.type === 'text' ? segment.value : segment.marker).join('').replace(/\s+/g, ' ') && translation.every(item => item.y <= 1060), { translationLines: translation.length, finalBaseline: translation.at(-1)?.y });
      await evaluate("CanvasRenderingContext2D.prototype.fillText=window.__qaFill");
    }
    await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" }); await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
    await sleep(50); assert(`share focus return ${width}`, await evaluate("!document.querySelector('.share-panel') && document.activeElement.textContent === 'Paylaş'"));
    console.log(`Mobile ${width}px: pages, dark mode, footnote and long share checked`);
  }
  await command("Emulation.setDeviceMetricsOverride", { width: 1000, height: 900, deviceScaleFactor: 1, mobile: false });
  await navigate("/ayet/2/2/"); await evaluate("document.querySelector('.footnote-marker').click()"); await sleep(100);
  assert("desktop footnote", await evaluate("!!document.querySelector('.footnote-popover') && !document.querySelector('.footnote-sheet') && document.documentElement.scrollWidth<=innerWidth && document.body.style.position !== 'fixed'"));
  await navigate("/ayet/2/282/"); await evaluate("[...document.querySelectorAll('.verse-actions button')].find(b=>b.textContent==='Paylaş').click()"); await sleep(80);
  assert("desktop share centered", await evaluate("getComputedStyle(document.querySelector('.share-layer')).alignItems==='center'"));
  await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  assert("reduced motion disables sheet animation", await evaluate("getComputedStyle(document.querySelector('.share-panel')).animationName === 'none'"));
  await command("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
  await navigate("/esma/"); await evaluate("delete document.documentElement.dataset.theme");
  assert("system dark reading theme", await evaluate("getComputedStyle(document.querySelector('.app-frame')).backgroundColor === 'rgb(34, 41, 35)'"));
  await command("Emulation.setEmulatedMedia", { features: [] });
  await navigate("/ayet/114/1/");
  assert("fallback verse translator is visible", await evaluate("document.querySelector('.verse-reference small').textContent.includes('Yaşar Nuri Öztürk') && document.querySelector('.topic-header').textContent.includes('Yaşar Nuri Öztürk')"));
  // Verify local bookmarks, topic following, lazy corpus resolution and manual theme.
  await navigate("/ayet/2/153/"); await evaluate("[...document.querySelectorAll('.verse-actions button')].find(b=>b.textContent==='Kaydet').click()");
  await navigate("/konu/sab-r/"); await evaluate("document.querySelector('.topic-header .text-button').click()");
  await navigate("/kitapligim/");
  const libraryLoaded = await waitFor("!!document.querySelector('[data-verse-id=\"2:153\"]') && !!document.querySelector('.library-topic a[href=\"/konu/sab-r/\"]')");
  assert("saved verse and followed topic in library", libraryLoaded, await evaluate("({state:localStorage.getItem('ayet-rehberi:library:v1'),verses:[...document.querySelectorAll('[data-verse-id]')].map(n=>n.dataset.verseId),topics:[...document.querySelectorAll('.library-topic a')].map(n=>n.getAttribute('href')),status:[...document.querySelectorAll('[role=status]')].map(n=>n.textContent)})"));
  await evaluate("(()=>{const s=document.querySelector('.theme-control select');s.value='dark';s.dispatchEvent(new Event('change',{bubbles:true}));})()");
  assert("manual theme persistence", await evaluate("localStorage.getItem('ayet-rehberi:theme:v1')==='dark' && document.documentElement.dataset.theme==='dark'"));
  await navigate("/esma/"); assert("manual theme restored before render", await evaluate("document.documentElement.dataset.theme==='dark'"));
  // Migration and restoration: choose a late verse from an existing large topic.
  const topic = JSON.parse(await readFile("src/data/topics-reviewed.json", "utf8")).find(topic => topic.slug === "ahiret"); const targetId = topic.verseIds[65];
  await evaluate(`localStorage.removeItem('ayet-rehberi:reading-progress:v2');localStorage.setItem('ayet-rehberi:reading-progress:v1',JSON.stringify({version:1,topicProgress:{ahiret:{verseId:${JSON.stringify(targetId)},page:4,updatedAt:12345}},surahProgress:{},lastReading:{type:'topic',slug:'ahiret',verseId:${JSON.stringify(targetId)},page:4,updatedAt:12345}}))`);
  await navigate("/konu/ahiret/"); await sleep(150);
  const resume = await evaluate(`(() => {const node=document.querySelector('[data-verse-id="${targetId}"]');return {present:!!node,top:node?.getBoundingClientRect().top,count:document.querySelectorAll('.verse-card').length};})()`);
  assert("v1 memory migration, batch and position restoration", resume.present && Math.abs(resume.top) <= 24 && resume.count >= 80, resume);
  await sleep(550); assert("v2 memory persists observed topic position", await evaluate("(()=>{const p=JSON.parse(localStorage.getItem('ayet-rehberi:reading-progress:v2'));return p?.version===2 && !!p.topicProgress.ahiret.verseId && p.recent.length>0;})()"));
  const explicitId = topic.verseIds[2];
  await navigate(`/konu/ahiret/#ayet-${explicitId.replace(":", "-")}`);
  assert("explicit verse anchor wins over memory", await evaluate(`Math.abs(document.querySelector('[data-verse-id="${explicitId}"]').getBoundingClientRect().top)<=24`));
  const initial = await evaluate("document.querySelectorAll('.verse-card').length"); await evaluate("document.querySelector('.load-more button').click()");
  assert("progressive reading adds a batch", await evaluate(`document.querySelectorAll('.verse-card').length>=${initial + 20}`));
  await navigate("/kesfet/");
  await evaluate("(()=>{const i=document.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'sabretmek');i.dispatchEvent(new Event('input',{bubbles:true}));})()"); await sleep(300);
  assert("alias search finds Sabır", await evaluate("[...document.querySelectorAll('.search-results a')].some(a=>a.textContent.includes('Sabır'))"));
  await evaluate("(()=>{const i=document.querySelector('input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'2:153');i.dispatchEvent(new Event('input',{bubbles:true}));})()"); await sleep(300);
  const searched = await waitFor("!!document.querySelector('.search-results a[href=\"/ayet/2/153/\"]')");
  assert("lazy canonical verse search", searched, await evaluate("({query:document.querySelector('input').value,results:[...document.querySelectorAll('.search-results a')].map(n=>n.textContent),statuses:[...document.querySelectorAll('[role=status]')].map(n=>n.textContent)})"));
  const injection = await command("Page.addScriptToEvaluateOnNewDocument", { source: "Storage.prototype.getItem=function(){throw Error('disabled')};Storage.prototype.setItem=function(){throw Error('disabled')};" });
  await navigate("/kitapligim/"); assert("storage disabled reading/library survives", await evaluate("!!document.querySelector('main h1') && document.querySelector('main h1').textContent==='Kitaplığım'"));
  await navigate("/sure/114/"); assert("storage disabled Quran renderer survives", await evaluate("document.querySelectorAll('.verse-card').length===6"));
  await command("Page.removeScriptToEvaluateOnNewDocument", { identifier: injection.identifier });
  assert("no uncaught runtime errors", runtimeErrors.length === 0, runtimeErrors);
  await mkdir("data/generated", { recursive: true });
  await writeFile("data/generated/ayet-rehberi-2-mobile-qa.json", JSON.stringify({ findings, assertions, runtimeErrors, result: assertions.every(assertion => assertion.passed) ? "PASS" : "FAIL" }, null, 2));
  const failed = assertions.filter(assertion => !assertion.passed); console.log(JSON.stringify({ checks: assertions.length, failed, result: failed.length ? "FAIL" : "PASS" }, null, 2)); process.exitCode = failed.length ? 1 : 0;
} finally { socket?.close(); edge.kill(); await new Promise(resolve => server.close(resolve)); }
