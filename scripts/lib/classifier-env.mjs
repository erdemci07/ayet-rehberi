import { readFile } from "node:fs/promises";

// Read only the explicitly authorized local .env file. Never evaluate PowerShell,
// interpolate variables, print values, or override the caller's environment.
export function parseClassifierEnv(text) {
  const parsed = {};
  for (const line of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:\$env:|export\s+)?(OPENAI_API_KEY|AYET_CLASSIFIER_MODEL)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    let value = match[2];
    const quoted = value.match(/^(["'])([^"']*)\1\s*(?:#.*)?$/);
    if (quoted) value = quoted[2];
    else value = value.replace(/\s+#.*$/, "").trim();
    if (value && !/^[a-zA-Z0-9._:-]+$/.test(value)) throw new Error(".env classifier variables must be literal values; commands/interpolation are not supported.");
    parsed[match[1]] = value;
  }
  return parsed;
}

export async function loadClassifierEnv(env = process.env) {
  let text;
  try { text = await readFile(".env", "utf8"); } catch (error) { if (error.code === "ENOENT") return; throw new Error("Cannot read local classifier .env configuration."); }
  const parsed = parseClassifierEnv(text);
  for (const name of ["OPENAI_API_KEY", "AYET_CLASSIFIER_MODEL"]) if (!env[name] && parsed[name]) env[name] = parsed[name];
}
