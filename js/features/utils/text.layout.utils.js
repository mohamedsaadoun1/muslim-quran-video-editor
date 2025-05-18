// js/utils/text.layout.utils.js

/**
 * Wraps text to fit within a maximum width on a canvas, breaking into multiple lines.
 * This is a basic implementation and might need refinement for complex scripts or hyphenation.
 * For Arabic, splitting by space and then by character (if a word is too long) is a simple start.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {string} text - The text string to wrap.
 * @param {number} x - The x-coordinate for the starting point of the text (usually for horizontal centering or left alignment).
 * @param {number} y - The y-coordinate for the baseline of the *first* line of text.
 * @param {number} maxWidth - The maximum width the text should occupy.
 * @param {number} lineHeight - The height of each line (affects spacing between lines).
 * @param {object} [options={}] - Additional options.
 * @param {'center' | 'left' | 'right'} [options.textAlign='center'] - Horizontal alignment of each line.
 * @param {'top' | 'middle' | 'bottom'} [options.verticalAlign='middle'] - Vertical alignment of the entire text block.
 * @returns {Array<string>} An array of strings, where each string is a line of wrapped text. (Does not draw)
 */
export function getTextLinesForWrapping(ctx, text, maxWidth, options = {}) {
  if (!ctx || !text || typeof text !== 'string' || maxWidth <= 0) {
    return [text || '']; // Return original text as a single line if params are invalid
  }

  const lines = [];
  // For Arabic and similar scripts, splitting individual characters might break ligatures.
  // A better approach for complex scripts involves word-level splitting first.
  // This regex tries to split by spaces OR before/after common punctuation for better word boundaries.
  // Or by individual characters if a "word" (non-space sequence) is too long.

  // Let's refine word splitting logic:
  // 1. Split by explicit newlines first.
  const paragraphs = text.split('\n');
  
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/); // Split by one or more spaces
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      let testLine = currentLine ? `${currentLine} ${word}` : word;
      let metrics = ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine !== '') {
        // Current line (without the new word) is ready
        lines.push(currentLine);
        currentLine = word; // Start new line with the current word
        // If this single word is still too long, we need to break it
        metrics = ctx.measureText(currentLine); // Measure the single word
        if (metrics.width > maxWidth) {
          // Character-by-character breaking for a very long word
          let tempWordLine = '';
          for (let j = 0; j < word.length; j++) {
            const char = word[j];
            const testCharLine = tempWordLine + char;
            if (ctx.measureText(testCharLine).width > maxWidth && tempWordLine !== '') {
              lines.push(tempWordLine);
              tempWordLine = char;
            } else {
              tempWordLine = testCharLine;
            }
          }
          currentLine = tempWordLine; // The remainder of the word becomes the new current line
        }
      } else {
        currentLine = testLine; // Add word to current line
      }
    }
    if (currentLine.trim() !== '') {
      lines.push(currentLine);
    }
  }
  return lines.length > 0 ? lines : ['']; // Ensure at least one empty line if text was empty
}


/**
 * Draws wrapped text on the canvas.
 * Uses getTextLinesForWrapping to get the lines first.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {string} text - The text string to wrap and draw.
 * @param {number} x - The x-coordinate (behavior depends on textAlign).
 * @param {number} y - The y-coordinate (behavior depends on verticalAlign for the block, and textBaseline for individual lines).
 * @param {number} maxWidth - The maximum width the text should occupy.
 * @param {number} lineHeight - The height of each line.
 * @param {object} [options={}] - Additional options.
 * @param {string} [options.fillStyle] - Text color (overrides ctx.fillStyle if provided).
 * @param {string} [options.font] - Font string (overrides ctx.font if provided).
 * @param {'center' | 'left' | 'right' | 'start' | 'end'} [options.textAlign='center'] - Horizontal alignment of each line. Default for canvas context is 'start'.
 * @param {'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging' | 'ideographic'} [options.textBaseline='middle'] - Vertical baseline for drawing each line. Default is 'alphabetic'.
 * @param {string} [options.textBlockBgColor] - Optional background color for the entire text block.
 * @param {number} [options.textBlockPadding=0] - Optional padding around the text block if bgColor is used.
 */
export function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, options = {}) {
  if (!ctx || !text || typeof text !== 'string' || maxWidth <= 0 || lineHeight <= 0) {
    return;
  }

  const originalFillStyle = ctx.fillStyle;
  const originalFont = ctx.font;
  const originalTextAlign = ctx.textAlign;
  const originalTextBaseline = ctx.textBaseline;

  if (options.font) ctx.font = options.font;
  if (options.fillStyle) ctx.fillStyle = options.fillStyle;
  
  // Set textAlign and textBaseline for the drawing operations.
  // Canvas default textAlign is 'start', default textBaseline is 'alphabetic'.
  ctx.textAlign = options.textAlign || 'center';
  ctx.textBaseline = options.textBaseline || 'middle';


  const lines = getTextLinesForWrapping(ctx, text, maxWidth, options);
  const totalTextBlockHeight = lines.length * lineHeight;
  
  let startY;
  // Adjust startY based on desired vertical alignment of the whole text block.
  // `y` parameter is treated as the reference point for this alignment.
  switch (options.verticalAlign) {
    case 'top':
      startY = y;
      break;
    case 'bottom':
      startY = y - totalTextBlockHeight + lineHeight; // Adjust so last baseline is at y
      break;
    case 'middle':
    default:
      startY = y - totalTextBlockHeight / 2 + lineHeight / 2; // Center the block around y
      break;
  }

  // Optional: Draw background for the entire text block
  if (options.textBlockBgColor && options.textBlockBgColor !== 'transparent') {
    // Calculate bounding box of all lines for the background
    let maxLineWidth = 0;
    lines.forEach(line => {
      maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
    });

    const padding = options.textBlockPadding || 0;
    let bgX = x;
    if (ctx.textAlign === 'center') {
      bgX = x - (maxLineWidth / 2) - padding;
    } else if (ctx.textAlign === 'right' || ctx.textAlign === 'end') {
      bgX = x - maxLineWidth - padding;
    } else { // left or start
      bgX = x - padding;
    }
    // Adjust bgY based on verticalAlign and textBaseline for accurate positioning.
    // This is a simplified Y for background:
    let bgY = startY - (ctx.textBaseline === 'middle' ? lineHeight / 2 : (ctx.textBaseline === 'bottom' ? lineHeight : 0)) - padding;
    if (options.verticalAlign === 'middle') {
      bgY = y - (totalTextBlockHeight / 2) - padding;
    } else if (options.verticalAlign === 'top') {
        bgY = y - padding;
        if (ctx.textBaseline === 'middle') bgY += lineHeight/2 - (lineHeight * (1 - 0.8) / 2) // Approx adjustment for middle baseline visual center
        // Complex adjustments for other baselines are tricky. For simplicity, using `alphabetic` as ref is often easier.
    } else if (options.verticalAlign === 'bottom') {
        bgY = y - totalTextBlockHeight - padding;
         if (ctx.textBaseline === 'middle') bgY += lineHeight/2 + (lineHeight * (1-0.8) / 2)
    }


    const bgWidth = maxLineWidth + (padding * 2);
    const bgHeight = totalTextBlockHeight + (padding * 2);

    const prevFill = ctx.fillStyle;
    ctx.fillStyle = options.textBlockBgColor;
    ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
    ctx.fillStyle = options.fillStyle || originalFillStyle; // Restore text fillStyle
  }


  // Draw each line
  let currentY = startY;
  lines.forEach(line => {
    let lineX = x; // Default for 'start', 'left', or 'center' (where x is the center point)
    if (ctx.textAlign === 'right' || ctx.textAlign === 'end') {
        // If right aligned, x is the right-most point.
        // fillText for 'right' or 'end' uses x as the right boundary.
        lineX = x;
    } else if (ctx.textAlign === 'left' || ctx.textAlign === 'start') {
        // x is the left-most point.
        lineX = x;
    } else if (ctx.textAlign === 'center') {
        // x is the center point.
        lineX = x;
    }
    ctx.fillText(line, lineX, currentY);
    currentY += lineHeight;
  });

  // Restore original context state
  ctx.fillStyle = originalFillStyle;
  ctx.font = originalFont;
  ctx.textAlign = originalTextAlign;
  ctx.textBaseline = originalTextBaseline;
}


/**
 * Measures the dimensions of a text string if it were rendered with the current
 * canvas context settings (or specified font).
 * Note: For multiline text, this measures a single, unbroken line of that text.
 * To get dimensions of wrapped text, use `getTextLinesForWrapping` then measure each line or the total block.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {string} text - The text string to measure.
 * @param {string} [fontStyle] - Optional. CSS font string (e.g., "20px Arial"). If provided, it's temporarily set on context.
 * @returns {TextMetrics | {width:number, height:number}} TextMetrics object or a simple width/height for older compatibility.
 *          TextMetrics includes: width, actualBoundingBoxAscent, actualBoundingBoxDescent, etc.
 *          Height is approximated if detailed metrics are not available.
 */
export function measureTextOnCanvas(ctx, text, fontStyle) {
  if (!ctx || !text) return { width: 0, height: 0, actualBoundingBoxAscent:0, actualBoundingBoxDescent:0 };

  const originalFont = ctx.font;
  if (fontStyle) {
    ctx.font = fontStyle;
  }

  const metrics = ctx.measureText(text);

  // Approximate height based on font size if detailed metrics are missing
  // 'actualBoundingBoxAscent' and 'actualBoundingBoxDescent' are more accurate for height.
  let approximateHeight = 0;
  if (metrics.actualBoundingBoxAscent && metrics.actualBoundingBoxDescent) {
      approximateHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  } else if (metrics.fontBoundingBoxAscent && metrics.fontBoundingBoxDescent) { // Fallback
      approximateHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
  } else {
      // Very rough approximation if no bounding box metrics: try to parse font size
      const fontSizeMatch = ctx.font.match(/(\d+)(px|pt|em|rem)/);
      if (fontSizeMatch && fontSizeMatch[1]) {
          approximateHeight = parseInt(fontSizeMatch[1], 10) * 1.2; // Assume 1.2 line height factor
      } else {
          approximateHeight = 12 * 1.2; // Default fallback if cannot parse
      }
  }
  
  // Restore original font if it was changed
  if (fontStyle) {
    ctx.font = originalFont;
  }

  return {
      width: metrics.width,
      height: approximateHeight, // This is an approximation
      actualBoundingBoxAscent: metrics.actualBoundingBoxAscent || approximateHeight * 0.8, // approx
      actualBoundingBoxDescent: metrics.actualBoundingBoxDescent || approximateHeight * 0.2, // approx
      // You can expose other metrics if needed
      // fontBoundingBoxAscent: metrics.fontBoundingBoxAscent,
      // fontBoundingBoxDescent: metrics.fontBoundingBoxDescent,
  };
}


// This module exports utility functions directly.
// No `initialize...` function needed from moduleBootstrap.
