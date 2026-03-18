import { CssVariable } from '../types';

/**
 * Parses raw CSS text and extracts all custom properties (--name: value).
 */
export function parseCssVariables(cssText: string): CssVariable[] {
  const vars: CssVariable[] = [];
  const blockRegex = /([^{]+)\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(cssText)) !== null) {
    const selector = match[1].trim();
    const body = match[2];
    const varRegex = /(--[\w-]+)\s*:\s*([^;]+)/g;
    let varMatch: RegExpExecArray | null;
    while ((varMatch = varRegex.exec(body)) !== null) {
      vars.push({
        name: varMatch[1].trim(),
        value: varMatch[2].trim(),
        scope: selector,
      });
    }
  }
  return vars;
}

/**
 * Resolves var(--name) and var(--name, fallback) references in a CSS value string.
 * Iterates up to 10 times to handle nested var() references.
 */
export function resolveVarReferences(value: string, allVars: CssVariable[]): string {
  const varLookup = new Map(allVars.map(v => [v.name, v.value]));
  let result = value;
  let maxIterations = 10;
  while (result.includes('var(') && maxIterations-- > 0) {
    result = result.replace(
      /var\(\s*(--[\w-]+)(?:\s*,\s*([^)]+))?\s*\)/g,
      (_, varName, fallback) => {
        return varLookup.get(varName) ?? fallback ?? varName;
      }
    );
  }
  return result;
}

/**
 * Groups CSS variables by their scope selector.
 */
export function groupVarsByScope(vars: CssVariable[]): Map<string, CssVariable[]> {
  const grouped = new Map<string, CssVariable[]>();
  for (const v of vars) {
    const existing = grouped.get(v.scope);
    if (existing) {
      existing.push(v);
    } else {
      grouped.set(v.scope, [v]);
    }
  }
  return grouped;
}
