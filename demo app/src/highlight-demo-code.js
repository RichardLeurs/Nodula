import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import xml from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('css', css);

const supportedLanguages = ['javascript', 'html', 'css'];
const candidateSelector = '.guide-code pre code, .addon-card code[data-highlight]';

function highlightCodeElement(element) {
  if (element.dataset.highlighted === 'yes') return;
  const codeText = element.textContent ?? '';
  if (!codeText.trim()) return;

  const explicitLanguage = element.dataset.language
    ?? [...element.classList].find((name) => name.startsWith('language-'))?.slice('language-'.length);
  if (explicitLanguage && !supportedLanguages.includes(explicitLanguage.toLowerCase())) return;

  const result = explicitLanguage
    ? hljs.highlight(codeText, { language: explicitLanguage.toLowerCase(), ignoreIllegals: true })
    : hljs.highlightAuto(codeText, supportedLanguages);
  element.innerHTML = result.value;
  element.classList.add('hljs');
  element.dataset.highlighted = 'yes';
  if (result.language) element.dataset.highlightLanguage = result.language;
}

function highlightWithin(root) {
  if (root instanceof Element && root.matches(candidateSelector)) highlightCodeElement(root);
  root.querySelectorAll?.(candidateSelector).forEach(highlightCodeElement);
}

export function installDemoCodeHighlighting(root = document.querySelector('.app')) {
  if (!root) return () => {};

  highlightWithin(root);
  const observer = new MutationObserver((records) => {
    if (records.length) highlightWithin(root);
  });
  observer.observe(root, { childList: true, characterData: true, subtree: true });
  return () => observer.disconnect();
}