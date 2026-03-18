import { useState, useEffect } from 'react';
import { ElementContext, CssVariable } from '../types';

export function useElementContext(
  iframeRef: React.RefObject<HTMLIFrameElement>,
  selector: string | null
): ElementContext | null {
  const [context, setContext] = useState<ElementContext | null>(null);

  useEffect(() => {
    if (!selector || !iframeRef.current) {
      setContext(null);
      return;
    }

    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      setContext(null);
      return;
    }

    try {
      const element = doc.querySelector(selector) as HTMLElement | null;
      if (!element) {
        setContext(null);
        return;
      }

      // Get outerHTML
      const html = element.outerHTML;

      // Get parent HTML (one level up, capped at 500 chars for context window efficiency)
      const parentEl = element.parentElement;
      const parentHtml = parentEl
        ? parentEl.outerHTML.slice(0, 500)
        : undefined;

      // Collect applied CSS rules from all stylesheets
      const cssRules: string[] = [];
      try {
        const sheets = Array.from(doc.styleSheets);
        for (const sheet of sheets) {
          try {
            const rules = Array.from(sheet.cssRules || []);
            for (const rule of rules) {
              if (rule instanceof CSSStyleRule) {
                try {
                  if (element.matches(rule.selectorText)) {
                    cssRules.push(rule.cssText);
                  }
                } catch {
                  // Selector may not be valid in this context
                }
              }
            }
          } catch {
            // Cross-origin stylesheet — skip
          }
        }
      } catch {
        // Stylesheet access denied
      }

      // Extract CSS variables from :root and element's own computed style
      const cssVariables: CssVariable[] = [];
      const computedStyle = doc.defaultView?.getComputedStyle(element);
      const rootComputedStyle = doc.defaultView?.getComputedStyle(doc.documentElement);

      if (rootComputedStyle) {
        // Extract --variables from :root computed style
        const allProps = Array.from(rootComputedStyle);
        for (const prop of allProps) {
          if (prop.startsWith('--')) {
            const value = rootComputedStyle.getPropertyValue(prop).trim();
            if (value) {
              cssVariables.push({ name: prop, value, scope: ':root' });
            }
          }
        }
      }

      if (computedStyle) {
        // Extract --variables declared on the element itself
        const allProps = Array.from(computedStyle);
        for (const prop of allProps) {
          if (prop.startsWith('--')) {
            const value = computedStyle.getPropertyValue(prop).trim();
            const alreadyExists = cssVariables.some(v => v.name === prop && v.scope === ':root');
            if (value && !alreadyExists) {
              cssVariables.push({ name: prop, value, scope: selector });
            }
          }
        }
      }

      // Get the current file path from the iframe src
      const filePath = iframe.src || '';

      setContext({
        html,
        css: cssRules,
        parentHtml,
        cssVariables,
        filePath,
      });
    } catch (err) {
      console.warn('useElementContext: failed to extract context', err);
      setContext(null);
    }
  }, [selector, iframeRef]);

  return context;
}
