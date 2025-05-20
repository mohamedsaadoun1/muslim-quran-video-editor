// js/utils/text.layout.utils.js

/**
 * @typedef {Object} TextLayoutOptions
 * @property {string} [font] - Font string (e.g., '16px Arial').
 * @property {string} [fillStyle='black'] - Fill color for text.
 * @property {string} [strokeStyle='transparent'] - Stroke color for text.
 * @property {number} [lineWidth=1] - Stroke line width.
 * @property {'center'|'left'|'right'|'start'|'end'} [textAlign='start'] - Horizontal alignment of text.
 *           Note: For RTL, 'start' aligns right, 'end' aligns left.
 * @property {'top'|'middle'|'bottom'|'alphabetic'|'hanging'|'ideographic'} [textBaseline='alphabetic'] - Vertical baseline for drawing text.
 * @property {'top'|'middle'|'bottom'} [verticalAlign='middle'] - Vertical alignment of the entire text block.
 * @property {string} [textBlockBgColor='transparent'] - Background color for the text block.
 * @property {number} [textBlockPadding=0] - Padding around the text block.
 * @property {number} [cornerRadius=0] - Corner radius for the text block background (if supported by ctx.roundRect).
 * @property {boolean} [rtl=false] - Whether text rendering should be right-to-left.
 * @property {number} [maxCharWidthFallback=0] - Fallback for character width if measureText is not precise, used for RTL character-by-character wrapping.
 * @property {number} [lineHeight] - Explicit line height. If not provided, it's calculated.
 */

/**
 * @typedef {Object} TextMetricsResult
 * @property {number} width - Text width in pixels.
 * @property {number} height - Text height in pixels (based on font metrics or calculated line height).
 * @property {number} actualBoundingBoxAscent - Font ascent from the baseline.
 * @property {number} actualBoundingBoxDescent - Font descent from the baseline.
 * @property {number} [fontBoundingBoxAscent] - Fallback ascent if actual is not available.
 * @property {number} [fontBoundingBoxDescent] - Fallback descent if actual is not available.
 * @property {number} fontSize - Detected or default font size in pixels.
 * @property {number} calculatedLineHeight - The line height used or calculated.
 */

/**
 * @typedef {Object} WrappedTextResult
 * @property {string[]} lines - Array of wrapped text lines.
 * @property {number} width - Maximum width of any single line.
 * @property {number} height - Total height of the wrapped text block (lines.length * lineHeight).
 * @property {number} lineHeight - The line height used for wrapping.
 * @property {Object} [boundingBox] - Optional bounding box of the drawn text block if padding/background is applied.
 * @property {number} boundingBox.x
 * @property {number} boundingBox.y
 * @property {number} boundingBox.width
 * @property {number} boundingBox.height
 */


/**
 * Calculates an estimated line height based on font metrics.
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context.
 * @param {string} [sampleText='Mg'] - Sample text for measurement (contains ascenders and descenders).
 * @returns {number} Estimated line height.
 * @private
 */
function _calculateLineHeight(ctx, sampleText = 'Mgي') {
    const metrics = ctx.measureText(sampleText);
    let height = 0;
    if (metrics.actualBoundingBoxAscent && metrics.actualBoundingBoxDescent) {
        height = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    } else if (metrics.fontBoundingBoxAscent && metrics.fontBoundingBoxDescent) {
        height = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    } else {
        const fontSizeMatch = ctx.font.match(/(\d+)(px|pt|em|rem)/);
        const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1], 10) : 16; // Default to 16px if not found
        height = fontSize * 1.2; // Common fallback multiplier
    }
    return Math.max(height, 1); // Ensure positive line height
}

/**
 * Measures text dimensions using the current canvas context settings.
 * Provides more detailed metrics including calculated line height.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context.
 * @param {string} text - Text to measure.
 * @param {TextLayoutOptions} [options={}] - Optional layout options (font, rtl can be set).
 * @returns {TextMetricsResult} Object with text dimensions.
 * @throws {Error} If inputs are invalid.
 */
export function measureText(ctx, text, options = {}) {
    if (!ctx || !(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('measureText requires a valid CanvasRenderingContext2D');
    }
    if (typeof text !== 'string') {
        throw new Error('measureText requires text to be a string');
    }

    const settings = { ...options };
    const originalFont = ctx.font;
    const originalDirection = ctx.direction;

    if (settings.font) ctx.font = settings.font;
    if (settings.rtl) ctx.direction = 'rtl';
    else if (settings.rtl === false) ctx.direction = 'ltr'; // Explicitly set LTR if false

    const metrics = ctx.measureText(text);
    const fontSizeMatch = ctx.font.match(/(\d+)(px|pt|em|rem)/);
    const fontSize = fontSizeMatch ? parseInt(fontSizeMatch[1], 10) : 16;
    const calculatedLineHeight = settings.lineHeight || _calculateLineHeight(ctx, text);

    // Restore context
    ctx.font = originalFont;
    ctx.direction = originalDirection;

    return {
        width: metrics.width,
        height: calculatedLineHeight, // Use calculated line height for single line text height
        actualBoundingBoxAscent: metrics.actualBoundingBoxAscent || (calculatedLineHeight * 0.75), // Estimate if not available
        actualBoundingBoxDescent: metrics.actualBoundingBoxDescent || (calculatedLineHeight * 0.25), // Estimate if not available
        fontBoundingBoxAscent: metrics.fontBoundingBoxAscent,
        fontBoundingBoxDescent: metrics.fontBoundingBoxDescent,
        fontSize: fontSize,
        calculatedLineHeight: calculatedLineHeight
    };
}


/**
 * Wraps text to fit within a maximum width on a canvas.
 * Handles basic RTL by splitting words, for more complex scripts use with caution or specific logic.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context.
 * @param {string} text - Text to wrap.
 * @param {number} maxWidth - Maximum width for each line.
 * @param {TextLayoutOptions} [options={}] - Additional wrapping options (rtl, font).
 * @returns {string[]} Array of wrapped text lines.
 * @throws {Error} If inputs are invalid.
 */
export function getTextLinesForWrapping(ctx, text, maxWidth, options = {}) {
    if (!ctx || !(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('getTextLinesForWrapping requires a valid CanvasRenderingContext2D');
    }
    if (typeof text !== 'string') {
        throw new Error('getTextLinesForWrapping requires text to be a string');
    }
    if (typeof maxWidth !== 'number' || maxWidth <= 0) {
        throw new Error('getTextLinesForWrapping requires a positive maxWidth');
    }

    const settings = { rtl: false, maxCharWidthFallback: 0, ...options };
    const originalFont = ctx.font;
    const originalDirection = ctx.direction;

    if (settings.font) ctx.font = settings.font;
    if (settings.rtl) ctx.direction = 'rtl';
    else if (settings.rtl === false) ctx.direction = 'ltr';


    const lines = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
        if (isEmptyOrWhitespace(paragraph)) {
            lines.push('');
            continue;
        }

        // For RTL, if maxCharWidthFallback is set, try char-by-char for words that overflow.
        // Otherwise, basic word splitting.
        const words = settings.rtl ? paragraph.split(/(\s+)/).filter(w => w.trim().length > 0) : paragraph.split(/\s+/);
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            if (!word) continue;

            const testLine = currentLine ? (settings.rtl ? `${word} ${currentLine}` : `${currentLine} ${word}`) : word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine.length > 0) {
                // Word itself is too long, attempt character wrapping if RTL and fallback is enabled
                if (settings.rtl && settings.maxCharWidthFallback > 0 && ctx.measureText(word).width > maxWidth) {
                    lines.push(currentLine); // Push previous line
                    currentLine = ''; // Reset current line
                    let tempWordLine = '';
                    for (const char of word) {
                        const testCharLine = tempWordLine + char;
                        if (ctx.measureText(testCharLine).width > maxWidth && tempWordLine) {
                            lines.push(tempWordLine);
                            tempWordLine = char;
                        } else {
                            tempWordLine = testCharLine;
                        }
                    }
                    if (tempWordLine) lines.push(tempWordLine); // Push remaining part of the word
                    continue; // Move to next word
                } else if (ctx.measureText(word).width > maxWidth) { // LTR or RTL without char wrap for long word
                     lines.push(currentLine); // Push the line before the long word
                     // For very long words in LTR, break them by character
                     let charLine = '';
                     for (const char of word) {
                         const testCharLine = charLine + char;
                         if (ctx.measureText(testCharLine).width > maxWidth && charLine.length > 0) {
                             lines.push(charLine);
                             charLine = char;
                         } else {
                             charLine = testCharLine;
                         }
                     }
                     currentLine = charLine; // The remainder of the long word becomes the new current line
                } else { // Normal case: line overflows, start new line with current word
                    lines.push(currentLine);
                    currentLine = word;
                }
            } else {
                currentLine = testLine;
            }
        }
        if (!isEmptyOrWhitespace(currentLine)) {
            lines.push(currentLine);
        }
    }

    ctx.font = originalFont;
    ctx.direction = originalDirection;
    return lines.length > 0 ? lines : [''];
}

/**
 * Draws wrapped text on the canvas with layout options.
 *
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context.
 * @param {string} text - Text to draw.
 * @param {number} x - X coordinate for the text block's reference point.
 * @param {number} y - Y coordinate for the text block's reference point.
 * @param {number} maxWidth - Maximum width for each text line.
 * @param {TextLayoutOptions} [options={}] - Additional drawing options.
 * @returns {WrappedTextResult} Object containing dimensions of the drawn text block.
 * @throws {Error} If inputs are invalid.
 */
export function drawWrappedText(ctx, text, x, y, maxWidth, options = {}) {
    if (!ctx || !(ctx instanceof CanvasRenderingContext2D)) {
        throw new Error('drawWrappedText requires a valid CanvasRenderingContext2D');
    }
    if (typeof text !== 'string') {
        throw new Error('drawWrappedText requires text to be a string');
    }
    if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('drawWrappedText requires x and y to be numbers');
    }
    if (typeof maxWidth !== 'number' || maxWidth <= 0) {
        throw new Error('drawWrappedText requires a positive maxWidth');
    }

    const settings = {
        font: ctx.font, // Default to current context font
        fillStyle: ctx.fillStyle,
        strokeStyle: ctx.strokeStyle,
        lineWidth: ctx.lineWidth,
        textAlign: 'start', // Canvas default, maps to left/right based on direction
        textBaseline: 'alphabetic',
        verticalAlign: 'middle',
        textBlockBgColor: 'transparent',
        textBlockPadding: 0,
        cornerRadius: 0,
        rtl: false,
        ...options
    };

    ctx.save();

    // Apply context settings
    ctx.font = settings.font;
    ctx.fillStyle = settings.fillStyle;
    ctx.strokeStyle = settings.strokeStyle;
    ctx.lineWidth = settings.lineWidth;
    ctx.textAlign = settings.textAlign;
    ctx.textBaseline = settings.textBaseline;
    if (settings.rtl) ctx.direction = 'rtl';
    else if (settings.rtl === false) ctx.direction = 'ltr';


    const lineHeight = settings.lineHeight || _calculateLineHeight(ctx, text.substring(0, 100)); // Use sample for calculation
    const lines = getTextLinesForWrapping(ctx, text, maxWidth, settings);
    const lineCount = lines.length;
    const padding = settings.textBlockPadding;

    let maxLineWidth = 0;
    if (lineCount > 0) {
        for (const line of lines) {
            maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
        }
    } else { // Handle empty text case
        maxLineWidth = 0;
    }


    const totalTextHeight = (lineCount > 0 ? (lineCount -1) * lineHeight : 0) + (lineCount > 0 ? _calculateLineHeight(ctx, lines[0] || 'M') : 0);


    // Determine text block's top-left corner (actualX, actualY) for background and text positioning
    let actualX = x;
    let actualY = y; // This 'y' is the reference point for verticalAlign

    // Adjust actualX based on textAlign and RTL
    if (settings.textAlign === 'center') {
        actualX = x - (maxLineWidth / 2);
    } else if (settings.textAlign === 'right' || (settings.textAlign === 'end' && settings.rtl) || (settings.textAlign === 'start' && !settings.rtl && ctx.direction === 'rtl')) {
        actualX = x - maxLineWidth;
    } else { // left, start (LTR), end (LTR)
        actualX = x;
    }


    // Adjust actualY based on verticalAlign
    if (settings.verticalAlign === 'top') {
        actualY = y;
    } else if (settings.verticalAlign === 'bottom') {
        actualY = y - totalTextHeight;
    } else { // middle
        actualY = y - totalTextHeight / 2;
    }

    const blockX = actualX - padding;
    const blockY = actualY - padding;
    const blockWidth = maxLineWidth + padding * 2;
    const blockHeight = totalTextHeight + padding * 2;

    // Draw background
    if (settings.textBlockBgColor && settings.textBlockBgColor !== 'transparent') {
        ctx.fillStyle = settings.textBlockBgColor;
        if (ctx.roundRect && settings.cornerRadius > 0) {
            ctx.beginPath();
            ctx.roundRect(blockX, blockY, blockWidth, blockHeight, settings.cornerRadius);
            ctx.fill();
        } else {
            ctx.fillRect(blockX, blockY, blockWidth, blockHeight);
        }
        ctx.fillStyle = settings.fillStyle; // Restore text fillStyle
    }

    // Draw text lines
    // Text drawing X position needs to align with the block's content area start
    let textDrawX = actualX;
     if (settings.textAlign === 'center') {
        textDrawX = x; // textAlign handles centering relative to this x
    } else if (settings.textAlign === 'right' || (settings.textAlign === 'end' && settings.rtl) || (settings.textAlign === 'start' && !settings.rtl && ctx.direction === 'rtl')) {
        textDrawX = x; // textAlign handles right/end alignment relative to this x
    } else { // left, start (LTR), end (LTR)
        textDrawX = actualX;
    }


    let currentYOffset = 0;
    // Adjust for textBaseline when drawing
    if (settings.textBaseline === 'top' || settings.textBaseline === 'hanging') {
        currentYOffset = 0;
    } else if (settings.textBaseline === 'middle') {
        currentYOffset = lineHeight / 2;
    } else if (settings.textBaseline === 'bottom' || settings.textBaseline === 'ideographic') {
        currentYOffset = lineHeight;
    } else { // alphabetic (default)
        // For alphabetic, the drawing Y is the baseline.
        // If actualY is the top of the text block, we need to add ascent.
        // This is complex. Simpler: assume actualY is where the first line's baseline should effectively start for block alignment.
        const firstLineMetrics = measureText(ctx, lines[0] || "M", settings);
        currentYOffset = firstLineMetrics.actualBoundingBoxAscent;
    }


    for (let i = 0; i < lineCount; i++) {
        const line = lines[i];
        const lineYPos = actualY + currentYOffset + (i * lineHeight);
        ctx.fillText(line, textDrawX, lineYPos);
        if (settings.strokeStyle && settings.strokeStyle !== 'transparent' && settings.lineWidth > 0) {
            ctx.strokeText(line, textDrawX, lineYPos);
        }
    }

    ctx.restore();

    return {
        lines: lines,
        width: maxLineWidth,
        height: totalTextHeight,
        lineHeight: lineHeight,
        boundingBox: {
            x: blockX,
            y: blockY,
            width: blockWidth,
            height: blockHeight,
        }
    };
}

/**
 * Helper function to check if a string is empty or contains only whitespace.
 * @param {string} str - The string to check.
 * @returns {boolean} True if the string is empty or all whitespace.
 * @private
 */
function isEmptyOrWhitespace(str) {
    return str == null || str.trim() === '';
}
