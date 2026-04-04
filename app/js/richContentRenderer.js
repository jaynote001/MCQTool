// richContentRenderer.js — Render Content block arrays and inline Markdown+LaTeX

/**
 * Render an array of Content blocks into an HTML container element.
 * @param {object[]} blocks - Array of { type, value, alt?, language? }
 * @param {object|null} assetLoader - AssetLoader instance for resolving image paths
 * @returns {HTMLElement} A div containing all rendered blocks
 */
export function renderContentBlocks(blocks, assetLoader = null) {
    const container = document.createElement('div');
    container.className = 'content-blocks';
    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) return container;

    for (const block of blocks) {
        const el = renderSingleBlock(block, assetLoader);
        if (el) container.appendChild(el);
    }
    return container;
}

function renderSingleBlock(block, assetLoader) {
    switch (block.type) {
        case 'text':
            return renderTextBlock(block.value);
        case 'markdown':
            return renderMarkdownBlock(block.value);
        case 'latex':
            return renderLatexBlock(block.value);
        case 'image':
            return renderImage(block.value, block.alt, assetLoader);
        case 'code':
            return renderCodeBlock(block.value, block.language);
        default:
            return renderTextBlock(block.value || '');
    }
}

function renderTextBlock(text) {
    const div = document.createElement('div');
    div.className = 'content-block content-text';
    div.textContent = text;
    return div;
}

function renderMarkdownBlock(markdown) {
    const div = document.createElement('div');
    div.className = 'content-block content-markdown';
    div.innerHTML = parseMarkdownWithLatex(markdown);
    renderLatexInElement(div);
    return div;
}

function renderLatexBlock(latex) {
    const div = document.createElement('div');
    div.className = 'content-block content-latex';
    if (typeof katex !== 'undefined') {
        try {
            katex.render(latex, div, { displayMode: true, throwOnError: false });
        } catch {
            div.textContent = latex;
        }
    } else {
        div.textContent = latex;
    }
    return div;
}

function renderCodeBlock(code, language) {
    const wrapper = document.createElement('div');
    wrapper.className = 'content-block content-code-block';
    if (language) {
        const langLabel = document.createElement('div');
        langLabel.className = 'code-language-label';
        langLabel.textContent = language;
        wrapper.appendChild(langLabel);
    }
    const pre = document.createElement('pre');
    const codeEl = document.createElement('code');
    codeEl.textContent = code;
    if (language) codeEl.className = `language-${language}`;
    pre.appendChild(codeEl);
    wrapper.appendChild(pre);
    return wrapper;
}

function renderImage(src, alt, assetLoader) {
    const wrapper = document.createElement('div');
    wrapper.className = 'content-block content-image';

    const img = document.createElement('img');
    // Resolve image source: check assetLoader first, then use raw src
    if (assetLoader && assetLoader.resolve(src)) {
        img.src = assetLoader.resolve(src);
    } else if (src.startsWith('data:')) {
        img.src = src;
    } else {
        img.src = src;
    }
    img.alt = alt || '';
    img.loading = 'lazy';
    img.addEventListener('error', () => {
        img.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = 'image-fallback';
        fallback.textContent = `Image not available: ${alt || src}`;
        wrapper.appendChild(fallback);
    });
    wrapper.appendChild(img);

    if (alt) {
        const caption = document.createElement('div');
        caption.className = 'image-caption';
        caption.textContent = alt;
        wrapper.appendChild(caption);
    }

    return wrapper;
}

/**
 * Render inline rich text: Markdown + LaTeX.
 * Returns an HTML string suitable for innerHTML.
 * @param {string} text - Raw text possibly containing Markdown and $...$ or $$...$$ LaTeX
 * @returns {string} Rendered HTML string
 */
export function renderInlineRichText(text) {
    if (!text) return '';
    return parseMarkdownWithLatex(text);
}

/**
 * After setting innerHTML with renderInlineRichText, call this to activate KaTeX rendering.
 * @param {HTMLElement} element - DOM element to process
 */
export function activateLatex(element) {
    renderLatexInElement(element);
}

// ---- Internal helpers ----

function parseMarkdownWithLatex(text) {
    if (!text) return '';
    if (typeof marked === 'undefined') return escapeHtmlInternal(text);

    // Protect LaTeX from Markdown parser:
    // Replace $$...$$ and $...$ with placeholders, then restore after Markdown
    const latexBlocks = [];
    let processed = text;

    // Protect display math $$...$$
    processed = processed.replace(/\$\$([^$]+?)\$\$/g, (_, latex) => {
        const idx = latexBlocks.length;
        latexBlocks.push({ display: true, latex });
        return `%%LATEX_BLOCK_${idx}%%`;
    });

    // Protect inline math $...$  (not preceded/followed by space+$)
    processed = processed.replace(/\$([^$\n]+?)\$/g, (_, latex) => {
        const idx = latexBlocks.length;
        latexBlocks.push({ display: false, latex });
        return `%%LATEX_BLOCK_${idx}%%`;
    });

    // Parse Markdown
    const html = marked.parse(processed, { breaks: true });

    // Restore LaTeX placeholders with KaTeX-renderable spans
    let result = html;
    latexBlocks.forEach((block, idx) => {
        const placeholder = `%%LATEX_BLOCK_${idx}%%`;
        if (block.display) {
            result = result.replace(placeholder, `<span class="katex-display-placeholder" data-latex="${escapeAttr(block.latex)}"></span>`);
        } else {
            result = result.replace(placeholder, `<span class="katex-inline-placeholder" data-latex="${escapeAttr(block.latex)}"></span>`);
        }
    });

    return result;
}

function renderLatexInElement(element) {
    if (typeof katex === 'undefined') return;

    element.querySelectorAll('.katex-display-placeholder').forEach(el => {
        try {
            katex.render(el.dataset.latex, el, { displayMode: true, throwOnError: false });
            el.className = '';
        } catch { /* leave text */ }
    });
    element.querySelectorAll('.katex-inline-placeholder').forEach(el => {
        try {
            katex.render(el.dataset.latex, el, { displayMode: false, throwOnError: false });
            el.className = '';
        } catch { /* leave text */ }
    });
}

function escapeHtmlInternal(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeAttr(text) {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Render a context group block for display in the practice/review screen.
 * @param {object} contextGroup - The Context_Group object { Group_ID, Title, Content }
 * @param {boolean} isFirst - Whether this is the first problem in the group
 * @param {object|null} assetLoader
 * @returns {HTMLElement} The context group DOM element
 */
export function renderContextGroup(contextGroup, isFirst, assetLoader = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'context-group-block';

    const header = document.createElement('div');
    header.className = 'context-group-header';
    header.innerHTML = `<span class="context-group-label">Context</span> <span class="context-group-title">${escapeHtmlInternal(contextGroup.Title)}</span>`;
    wrapper.appendChild(header);

    const contentEl = renderContentBlocks(contextGroup.Content, assetLoader);
    contentEl.classList.add('context-group-content');
    wrapper.appendChild(contentEl);

    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'btn btn-outline btn-sm context-toggle-btn context-collapse-btn';
    collapseBtn.textContent = 'Collapse Context';
    wrapper.appendChild(collapseBtn);

    const expandBtn = document.createElement('button');
    expandBtn.className = 'btn btn-outline btn-sm context-toggle-btn context-expand-btn';
    expandBtn.textContent = 'Expand Context';
    expandBtn.style.display = 'none';
    wrapper.appendChild(expandBtn);

    collapseBtn.addEventListener('click', () => {
        contentEl.style.display = 'none';
        collapseBtn.style.display = 'none';
        expandBtn.style.display = '';
    });
    expandBtn.addEventListener('click', () => {
        contentEl.style.display = '';
        collapseBtn.style.display = '';
        expandBtn.style.display = 'none';
    });

    return wrapper;
}
