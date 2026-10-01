// Split [data-split] elements into masked words so the timeline can slide
// each word up. Inline <em> survives (italic grey words stay italic grey).
// The original sentence goes to aria-label so screen readers read it whole.
export function splitWords(root = document) {
  root.querySelectorAll('[data-split]').forEach((el) => {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    const pieces = [];
    el.childNodes.forEach((node) => {
      const em = node.nodeType === 1 && node.tagName === 'EM';
      node.textContent.split(/(\s+)/).forEach((w) => pieces.push({ w, em }));
    });
    el.textContent = '';
    pieces.forEach(({ w, em }) => {
      if (!w) return;
      if (/^\s+$/.test(w)) { el.append(' '); return; }
      const mask = document.createElement('span');
      mask.className = 'w';
      mask.setAttribute('aria-hidden', 'true');
      const inner = document.createElement(em ? 'em' : 'span');
      inner.textContent = w;
      mask.append(inner);
      el.append(mask);
    });
  });
}
