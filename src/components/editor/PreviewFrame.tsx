import React, { useRef, useEffect, useImperativeHandle, useCallback } from 'react';
import { ViewportSize, ElementOverlayData, ElementSelectionData, ContextMenuData } from '../../types';
import { sanitizeHtml, ensureFullDocument } from '../../utils/sanitizer';

// ===== Public Interfaces =====

export interface PreviewFrameCallbacks {
  onElementHover?: (data: ElementOverlayData | null) => void;
  onElementClick?: (data: ElementSelectionData) => void;
  onElementDblClick?: (data: ElementSelectionData) => void;
  onContextMenu?: (data: ContextMenuData) => void;
}

export interface PreviewFrameProps extends PreviewFrameCallbacks {
  html: string;
  scale: number;
  viewport: ViewportSize;
  baseUrl?: string;
  className?: string;
}

export interface PreviewFrameHandle {
  reload: (html: string) => void;
}

// ===== Bridge Script Builder =====
// NOTE: The bridge script runs inside a sandboxed iframe. It reads DOM properties
// (el.innerHTML, el.outerHTML) from user-authored HTML elements to report their
// content back to the parent frame via postMessage. This is read-only introspection,
// not injection of untrusted content. All HTML is sanitized via sanitizeHtml()
// BEFORE being loaded into the iframe.

function buildBridgeScript(originToken: string): string {
  return `
(function() {
  var ORIGIN_TOKEN = '${originToken}';

  function getCssSelector(el) {
    var parts = [];
    var current = el;
    while (current && current !== document.body) {
      var part = current.tagName.toLowerCase();
      if (current.id) {
        part += '#' + current.id;
        parts.unshift(part);
        break;
      }
      var siblings = Array.from(current.parentElement ? current.parentElement.children : [])
        .filter(function(c) { return c.tagName === current.tagName; });
      if (siblings.length > 1) {
        var index = siblings.indexOf(current) + 1;
        part += ':nth-of-type(' + index + ')';
      }
      parts.unshift(part);
      current = current.parentElement;
    }
    return parts.join(' > ') || el.tagName.toLowerCase();
  }

  var STYLE_PROPS = [
    'color','background-color','background','font-family','font-size',
    'font-weight','font-style','line-height','letter-spacing',
    'text-align','text-decoration','margin','margin-top','margin-right',
    'margin-bottom','margin-left','padding','padding-top','padding-right',
    'padding-bottom','padding-left','border','border-radius','width',
    'height','display','flex-direction','align-items','justify-content',
    'position','top','left','right','bottom','z-index','opacity',
    'box-shadow','transform','transition','cursor','overflow',
    'grid-template-columns','grid-template-rows','gap'
  ];

  function getComputedStyleSubset(el) {
    var styles = {};
    var computed = window.getComputedStyle(el);
    for (var i = 0; i < STYLE_PROPS.length; i++) {
      styles[STYLE_PROPS[i]] = computed.getPropertyValue(STYLE_PROPS[i]);
    }
    return styles;
  }

  function getAttributes(el) {
    var attrs = {};
    for (var i = 0; i < el.attributes.length; i++) {
      var attr = el.attributes[i];
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }

  function getCssVariables() {
    var vars = [];
    var sheets = Array.from(document.styleSheets);
    var seen = new Set();
    for (var s = 0; s < sheets.length; s++) {
      try {
        var rules = Array.from(sheets[s].cssRules || []);
        for (var r = 0; r < rules.length; r++) {
          var rule = rules[r];
          if (rule.type === CSSRule.STYLE_RULE && rule.style) {
            for (var i = 0; i < rule.style.length; i++) {
              var prop = rule.style[i];
              if (prop.startsWith('--') && !seen.has(prop)) {
                seen.add(prop);
                vars.push({
                  name: prop,
                  value: rule.style.getPropertyValue(prop).trim(),
                  scope: rule.selectorText || ':root'
                });
              }
            }
          }
        }
      } catch (e) { /* cross-origin sheets */ }
    }
    return vars;
  }

  function sendMessage(type, payload) {
    window.parent.postMessage({
      source: 'html-wizard-bridge',
      token: ORIGIN_TOKEN,
      type: type,
      payload: payload
    }, '*');
  }

  function buildOverlayData(el) {
    var rect = el.getBoundingClientRect();
    return {
      selector: getCssSelector(el),
      tagName: el.tagName.toLowerCase(),
      id: el.id || '',
      classes: Array.from(el.classList),
      rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
    };
  }

  function buildSelectionData(el) {
    var data = buildOverlayData(el);
    data.computedStyles = getComputedStyleSubset(el);
    data.attributes = getAttributes(el);
    // Read DOM element content for reporting to parent (read-only introspection)
    data.innerContent = el.innerHTML;  // eslint-disable-line -- safe: reading from sandboxed DOM
    data.outerContent = el.outerHTML;  // eslint-disable-line -- safe: reading from sandboxed DOM
    data.cssVariables = getCssVariables();
    return data;
  }

  // --- Event Listeners (delegation on document) ---

  document.addEventListener('mouseover', function(e) {
    var el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    sendMessage('hover', buildOverlayData(el));
  }, true);

  document.body.addEventListener('mouseout', function(e) {
    if (!e.relatedTarget || e.relatedTarget === document.documentElement) {
      sendMessage('hover-end', null);
    }
  }, true);

  document.addEventListener('click', function(e) {
    var el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    e.preventDefault();
    e.stopPropagation();
    sendMessage('click', buildSelectionData(el));
  }, true);

  document.addEventListener('dblclick', function(e) {
    var el = e.target;
    if (!el || el === document.body || el === document.documentElement) return;
    e.preventDefault();
    e.stopPropagation();
    sendMessage('dblclick', buildSelectionData(el));
  }, true);

  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    var el = e.target;
    if (!el) return;
    sendMessage('contextmenu', {
      selector: getCssSelector(el),
      position: { x: e.clientX, y: e.clientY },
      elementType: el.tagName.toLowerCase()
    });
  }, true);
})();
`;
}

// ===== HTML Injection =====

function injectBridgeScript(html: string, originToken: string, baseUrl?: string): string {
  const sanitized = sanitizeHtml(html);
  const fullDoc = ensureFullDocument(sanitized);
  const bridgeTag = `<script>${buildBridgeScript(originToken)}<\/script>`;

  let result = fullDoc;

  // Inject <base> tag for relative path resolution (images, CSS, JS)
  if (baseUrl) {
    const baseTag = `<base href="${baseUrl}/">`;
    const headMatch = result.match(/<head[^>]*>/i);
    if (headMatch && headMatch.index !== undefined) {
      const insertPos = headMatch.index + headMatch[0].length;
      result = result.slice(0, insertPos) + '\n' + baseTag + '\n' + result.slice(insertPos);
    }
  }

  // Insert bridge script before </body>
  const bodyCloseMatch = result.match(/<\/body>/i);
  if (bodyCloseMatch && bodyCloseMatch.index !== undefined) {
    return (
      result.slice(0, bodyCloseMatch.index) +
      bridgeTag +
      result.slice(bodyCloseMatch.index)
    );
  }

  // Fallback: append at end
  return result + bridgeTag;
}

// ===== Component =====

const PreviewFrame = React.forwardRef<PreviewFrameHandle, PreviewFrameProps>(
  function PreviewFrame(
    { html, scale, viewport, baseUrl, className, onElementHover, onElementClick, onElementDblClick, onContextMenu },
    ref
  ) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const originToken = useRef(crypto.randomUUID());

    const getInjectedHtml = useCallback(
      (source: string) => injectBridgeScript(source, originToken.current, baseUrl),
      [baseUrl]
    );

    // Expose imperative reload
    useImperativeHandle(ref, () => ({
      reload: (newHtml: string) => {
        if (iframeRef.current) {
          iframeRef.current.srcdoc = getInjectedHtml(newHtml);
        }
      },
    }), [getInjectedHtml]);

    // PostMessage listener
    useEffect(() => {
      function handleMessage(event: MessageEvent) {
        const data = event.data;
        if (!data || data.source !== 'html-wizard-bridge' || data.token !== originToken.current) {
          return;
        }

        const { type, payload } = data;

        // Translate iframe-relative coordinates to parent-frame coordinates
        const translateRect = (rect: { top: number; left: number; width: number; height: number }) => {
          const iframeEl = iframeRef.current;
          if (!iframeEl) return rect;
          const iframeRect = iframeEl.getBoundingClientRect();
          return {
            top: iframeRect.top + rect.top * scale,
            left: iframeRect.left + rect.left * scale,
            width: rect.width * scale,
            height: rect.height * scale,
          };
        };

        // Map bridge field names to TypeScript interface fields
        const mapSelectionData = (p: Record<string, unknown>): ElementSelectionData => ({
          selector: p.selector as string,
          tagName: p.tagName as string,
          id: p.id as string,
          classes: p.classes as string[],
          rect: translateRect(p.rect as { top: number; left: number; width: number; height: number }),
          scale,
          computedStyles: p.computedStyles as Record<string, string>,
          attributes: p.attributes as Record<string, string>,
          innerHTML: (p.innerContent as string) ?? '',
          outerHTML: (p.outerContent as string) ?? '',
          cssVariables: p.cssVariables as ElementSelectionData['cssVariables'],
        });

        switch (type) {
          case 'hover':
            if (payload && onElementHover) {
              onElementHover({
                selector: payload.selector,
                tagName: payload.tagName,
                id: payload.id,
                classes: payload.classes,
                rect: translateRect(payload.rect),
                scale,
              });
            }
            break;

          case 'hover-end':
            onElementHover?.(null);
            break;

          case 'click':
            if (payload && onElementClick) {
              onElementClick(mapSelectionData(payload));
            }
            break;

          case 'dblclick':
            if (payload && onElementDblClick) {
              onElementDblClick(mapSelectionData(payload));
            }
            break;

          case 'contextmenu':
            if (payload && onContextMenu) {
              onContextMenu(payload);
            }
            break;
        }
      }

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [scale, onElementHover, onElementClick, onElementDblClick, onContextMenu]);

    const injectedHtml = getInjectedHtml(html);

    return (
      <div
        style={{
          width: viewport.width * scale,
          height: viewport.height * scale,
          overflow: 'hidden',
          position: 'relative',
        }}
        className={className}
      >
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          title="HTML Preview"
          srcDoc={injectedHtml}
          style={{
            width: viewport.width,
            height: viewport.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            border: 'none',
            display: 'block',
            background: 'white',
          }}
        />
      </div>
    );
  }
);

export default PreviewFrame;
