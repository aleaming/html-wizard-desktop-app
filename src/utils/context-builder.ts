import { ElementSelectionData, ElementContext, CssVariable } from '../types';
import { parseCssVariables } from './css-variables';

/**
 * Builds the ElementContext object used by the AI system
 * when a user asks about the selected element.
 */
export function buildElementContext(
  data: ElementSelectionData,
  activeFilePath: string,
  cssText: string
): ElementContext {
  const relevantStyles: string[] = [];
  const priorityProps = [
    'color', 'background-color', 'font-family', 'font-size', 'font-weight',
    'display', 'width', 'height', 'margin', 'padding', 'border', 'border-radius',
    'position', 'flex-direction', 'align-items', 'justify-content',
  ];
  for (const prop of priorityProps) {
    if (data.computedStyles[prop]) {
      relevantStyles.push(prop + ': ' + data.computedStyles[prop] + ';');
    }
  }

  const cssVariables: CssVariable[] = data.cssVariables.length > 0
    ? data.cssVariables
    : parseCssVariables(cssText);

  return {
    html: data.outerHTML,
    css: relevantStyles,
    parentHtml: undefined,
    cssVariables,
    filePath: activeFilePath,
  };
}
