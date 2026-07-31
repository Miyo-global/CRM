
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function substituteVariables(
  htmlContent: string,
  variables: Record<string, string>
): { result: string; missing: string[] } {
  const tokenRegex = /\{\{([^}]+)\}\}/g;
  const missing: string[] = [];
  const result = htmlContent.replace(tokenRegex, (_match, key: string) => {
    const trimmed = key.trim();
    const val = variables[trimmed];
    if (!val) {
      missing.push(trimmed);
      return _match;
    }
    return escapeHtml(val);
  });
  return { result, missing };
}


export function mergeVariableDefaults(
  sampleVars: Record<string, string>,
  registry: { slug: string; defaultValue: string }[],
): Record<string, string> {
  const merged = { ...sampleVars };
  for (const entry of registry) {
    if (entry.defaultValue.trim()) {
      merged[entry.slug] = entry.defaultValue;
    }
  }
  return merged;
}

export function registryDefaultsMap(
  registry: { slug: string; defaultValue: string }[],
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of registry) {
    if (entry.defaultValue.trim()) {
      map[entry.slug] = entry.defaultValue;
    }
  }
  return map;
}

export function extractVariables(htmlContent: string): string[] {
  const tokenRegex = /\{\{([^}]+)\}\}/g;
  const vars: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(htmlContent)) !== null) {
    const trimmed = m[1].trim();
    if (!vars.includes(trimmed)) vars.push(trimmed);
  }
  return vars;
}
