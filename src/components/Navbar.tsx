"use client";

import Link from "next/link";
import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const normalize = (s: string) => s.trim().toLowerCase();

function useDebouncedValue<T>(value: T, delay = 150) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export type Suggestion = {
  id: string;
  name: string;
  origin: string;
  unit: string;
  category: string;
  image: string;
};

function SearchBox({
  q,
  setQ,
  suggestions,
  onGo,
}: {
  q: string;
  setQ: (v: string) => void;
  suggestions: Suggestion[];
  onGo: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const query = normalize(q);
  const showDropdown = open && query.length >= 2;

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (wrapRef.current && !wrapRef.current.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full">
      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#648770] text-xl">
        search
      </span>

      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onGo(q);
            setOpen(false);
            (e.currentTarget as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            setOpen(false);
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className="w-full bg-white border border-[#e8efe9] rounded-full h-12 pl-12 pr-4
                   focus:ring-2 focus:ring-[#0B5D1E]/30 text-base font-semibold
                   text-[#111713] placeholder:text-[#648770] outline-none"
        placeholder='Search "fruit", "apple", "tomato"...'
        type="search"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        style={{ colorScheme: "light" }}
      />

      {showDropdown && (
        <div className="absolute top-[54px] left-0 right-0 bg-white border border-[#e8efe9] rounded-2xl shadow-xl overflow-hidden z-50">
          {suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#648770]">
              No matches. Try: <b>fruit</b>, <b>vegetables</b>, <b>eggs</b>, <b>apple</b>…
            </div>
          ) : (
            <div className="max-h-[320px] overflow-auto">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-[#f1f5f3] flex items-center gap-3"
                  onMouseDown={(e) => e.preventDefault()}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    window.location.href = `/product/${p.id}`;
                    setOpen(false);
                  }}
                >
                  <div className="h-10 w-10 rounded-xl overflow-hidden bg-[#f1f5f3] flex-shrink-0">
                   <img
  src={
    p.image && p.image.trim()
      ? p.image
      : "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=60"
  }
  alt={p.name}
  className="h-full w-full object-cover"
  loading="lazy"
  onError={(e) => {
    (e.currentTarget as HTMLImageElement).src =
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=200&q=60";
  }}
/>
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-[#111713] truncate">{p.name}</div>
                    <div className="text-xs text-[#648770] truncate">
                      {String(p.category || "").toUpperCase()} • {p.origin} • {p.unit}
                    </div>
                  </div>
                </button>
              ))}

              <button
                type="button"
                className="w-full text-left px-4 py-3 hover:bg-[#f1f5f3] text-sm font-semibold text-[#0B5D1E]"
                onMouseDown={(e) => e.preventDefault()}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  onGo(q);
                  setOpen(false);
                }}
              >
                Search “{q}” →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Navbar({ searchIndex }: { searchIndex: Suggestion[] }) {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  const debouncedQ = useDebouncedValue(q, 150);
  const query = normalize(debouncedQ);

  const suggestions = useMemo(() => {
    if (!query || query.length < 2) return [];
    return searchIndex
      .filter((p) => {
        const name = (p.name || "").toLowerCase();
        const origin = (p.origin || "").toLowerCase();
        return name.includes(query) || origin.includes(query);
      })
      .slice(0, 6);
  }, [query, searchIndex]);

  const go = (text: string) => {
    const t = normalize(text);

    if (["fruit", "fruits"].includes(t)) return router.push("/products/fruits");
    if (["vegetable", "vegetables", "veg", "veggies"].includes(t))
      return router.push("/products/vegetables");
    if (["egg", "eggs"].includes(t)) return router.push("/products/eggs");

    if (suggestions.length > 0) return router.push(`/product/${suggestions[0].id}`);

    router.push("/products/vegetables");
  };

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) setMobileMenu(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenu]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white md:bg-white/95 md:backdrop-blur border-b border-[#e8efe9]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12">
        <div className="py-3 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-3 font-black text-lg sm:text-xl text-[#0B5D1E] shrink-0"
          >
            <div className="w-11 h-11 rounded-full bg-[#0B5D1E] flex items-center justify-center text-white shrink-0">
              <span className="material-symbols-outlined">eco</span>
            </div>
            MyVegmarket
          </Link>

          <div className="w-full md:flex-1 md:min-w-[320px] md:max-w-[620px] order-last md:order-none">
            <SearchBox q={q} setQ={setQ} suggestions={suggestions} onGo={go} />
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <nav className="hidden lg:flex items-center gap-8 font-semibold text-[#111713]">
              <Link href="/al-aweer-prices" className="hover:text-[#1db954]">
                Al Aweer Prices
              </Link>
              <Link href="/bulk-supply" className="hover:text-[#1db954]">
                Get Started
              </Link>
              <Link href="/services" className="hover:text-[#1db954]">
                Services
              </Link>
              <Link href="/containers-listing/list" className="hover:text-[#1db954]">
                Post Your Ad
              </Link>
            </nav>

            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMobileMenu((v) => !v)}
              className="lg:hidden h-11 w-11 rounded-xl border border-[#e8efe9] bg-white grid place-items-center shadow-sm hover:shadow-md transition"
            >
              <span className="material-symbols-outlined text-[#111713]">
                {mobileMenu ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {mobileMenu && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/20" onClick={() => setMobileMenu(false)} />

          <div className="fixed top-[86px] right-4 sm:right-6">
            <div className="w-[min(92vw,320px)] bg-white text-[#111713] rounded-2xl shadow-xl border border-[#e8efe9] overflow-hidden">
              <button
                type="button"
                className="w-full text-left px-5 py-4 font-semibold hover:bg-[#f1f5f3]"
                onClick={() => {
                  setMobileMenu(false);
                  router.push("/al-aweer-prices");
                }}
              >
                Al Aweer Prices
              </button>

              <button
                type="button"
                className="w-full text-left px-5 py-4 font-semibold hover:bg-[#f1f5f3]"
                onClick={() => {
                  setMobileMenu(false);
                  router.push("/bulk-supply");
                }}
              >
                Get Started
              </button>

              <button
                type="button"
                className="w-full text-left px-5 py-4 font-semibold hover:bg-[#f1f5f3]"
                onClick={() => {
                  setMobileMenu(false);
                  router.push("/services");
                }}
              >
                Services
              </button>

              <button
                type="button"
                className="w-full text-left px-5 py-4 font-semibold hover:bg-[#f1f5f3]"
                onClick={() => {
                  setMobileMenu(false);
                  router.push("/containers-listing/list");
                }}
              >
                Containers Listing
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}