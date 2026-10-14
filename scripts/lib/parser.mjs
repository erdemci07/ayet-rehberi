const decode = (html) => html.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&[a-z]+;/gi, " ");
const text = (html) => decode(html.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, "")).replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim();
const superscript = {"¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","⁰":"0"};
const marker = (value) => [...value].map(char => superscript[char] ?? char).join("");
export function parseTranslationHtml(html, metadata, translator="Erhan Aktaş") {
  const rowMatch = html.match(new RegExp(`<tr[^>]*>[\\s\\S]*?<a\\s+title="${translator}"[\\s\\S]*?<span[^>]*lblMeal[^>]*>([\\s\\S]*?)<\\/span>[\\s\\S]*?<\\/tr>`,"i"));
  if (!rowMatch) return { warning: `${translator} row not found` };
  const body = rowMatch[1].replace(/<font[^>]*vertical-align\s*:\s*super[^>]*>(\d+)<\/font>/gi, "@@FN:$1@@");
  const lines = text(body).split("\n").filter(Boolean);
  const translation = lines.shift() ?? "";
  const footnotes = []; const noteByMarker = new Map(); const notesSource=lines.join("\n");
  const starts=[...notesSource.matchAll(/(?:^|\s)(\d+|[¹²³⁴⁵⁶⁷⁸⁹⁰]+)\s*[-–.]\s*/g)];
  for(let index=0;index<starts.length;index++){const match=starts[index];const key=marker(match[1]);const start=(match.index??0)+match[0].length;const end=index+1<starts.length?(starts[index+1].index??notesSource.length):notesSource.length;const value=notesSource.slice(start,end).trim();if(value){const item={id:`${metadata.id}:fn-${key}`,marker:key,text:value};footnotes.push(item);noteByMarker.set(key,item)}}
  const segments=[]; let offset=0; const re=/@@FN:(\d+)@@/g; let found;
  while ((found=re.exec(translation))) { if(found.index>offset) segments.push({type:"text",value:translation.slice(offset,found.index)}); const key=found[1]; segments.push({type:"footnote",id:`${metadata.id}:fn-${key}`,marker:key}); offset=re.lastIndex; }
  if(offset<translation.length) segments.push({type:"text",value:translation.slice(offset)});
  const plainTranslation=translation.replace(/@@FN:\d+@@/g,"");
  const missing=segments.filter(s=>s.type==="footnote"&&!noteByMarker.has(s.marker)).map(s=>s.marker);
  const orphaned=footnotes.filter(n=>!segments.some(s=>s.type==="footnote"&&s.marker===n.marker)).map(n=>n.marker);
  return {verse:{...metadata,translator,plainTranslation,segments,footnotes},warning:[...missing.map(x=>`missing note ${x}`),...orphaned.map(x=>`orphan note ${x}`)].join(", ")||undefined};
}
export const parseErhanHtml=(html,metadata)=>parseTranslationHtml(html,metadata,"Erhan Aktaş");
