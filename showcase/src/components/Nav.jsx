import { useEffect, useState } from 'react';
import { scrollToSection } from '../lib/scrollToSection.js';

const LINKS = [
  { id: 'product', label: '产品' },
  { id: 'tracks', label: '双赛道' },
  { id: 'payment', label: '402 链路' },
  { id: 'store', label: '门店闭环' },
  { id: 'buy', label: '购买次数' },
  { id: 'live', label: '实机跑通' },
  { id: 'loss', label: '降损层' },
  { id: 'stack', label: '底座' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('product');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 12);
      const probe = window.scrollY + window.innerHeight * 0.32;
      let current = LINKS[0].id;
      for (const link of LINKS) {
        const el = document.getElementById(link.id);
        if (el && el.offsetTop <= probe) current = link.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`nav-shell ${scrolled ? 'scrolled' : ''}`}>
      <div className="wrap flex items-center justify-between h-[64px]">
        <a
          href="#top"
          onClick={(e) => scrollToSection(e, 'top')}
          className="flex items-center gap-3 group"
          aria-label="回到顶部"
        >
          <span className="relative grid h-8 w-8 place-items-center border border-[#2b3a3f] bg-[#0b1114]">
            <span className="h-2.5 w-2.5 bg-[var(--signal)] transition-transform duration-300 group-hover:rotate-45" />
            <span className="absolute inset-x-1 bottom-1 h-px bg-[var(--line)]" />
          </span>
          <span className="whitespace-nowrap font-mono text-[13px] font-bold tracking-[0.04em]">
            api-relay
            <span className="ml-2 hidden text-[10px] font-normal tracking-[0.16em] text-[var(--muted)] sm:inline">
              PAYATHON 2026
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="主导航">
          {LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => scrollToSection(e, link.id)}
              className={`nav-link ${active === link.id ? 'active' : ''}`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="https://github.com/lizehao521/payathon-2026"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost hidden h-9 min-h-0 px-3 text-[11px] sm:inline-flex"
          >
            GitHub
            <span aria-hidden="true">↗</span>
          </a>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center border border-[var(--line)] lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? '关闭菜单' : '打开菜单'}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative block h-3 w-5">
              <span
                className={`absolute left-0 top-0 h-px w-5 bg-[var(--text)] transition-transform ${open ? 'translate-y-[6px] rotate-45' : ''}`}
              />
              <span
                className={`absolute left-0 top-[6px] h-px w-5 bg-[var(--text)] transition-opacity ${open ? 'opacity-0' : ''}`}
              />
              <span
                className={`absolute left-0 top-[12px] h-px w-5 bg-[var(--text)] transition-transform ${open ? '-translate-y-[6px] -rotate-45' : ''}`}
              />
            </span>
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-[var(--line)] bg-[var(--ink)] lg:hidden">
          <nav className="wrap grid grid-cols-2 gap-px py-3" aria-label="移动端导航">
            {LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(e) => {
                  scrollToSection(e, link.id);
                  setOpen(false);
                }}
                className="py-3 font-mono text-[12px] text-[var(--muted)] hover:text-[var(--text)]"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}