/**
 * 站内跳转：hash 路由下直接写 href="#section" 会被当成路由路径而命中 404，
 * 因此统一改为阻止默认跳转并手动滚动，同时保持路由停在首页。
 */
export function scrollToSection(event, id) {
  if (event) event.preventDefault();
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}