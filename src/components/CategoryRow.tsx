"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";

type Item = {
  key: string;
  title: string;
  subtitle?: string;
  href: string;
  img: string;
   fallbackImg?: string;
};

export default function CategoryRow({ items }: { items: Item[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;

    const max = el.scrollWidth - el.clientWidth;
    const left = el.scrollLeft;

    setCanLeft(left > 2);
    setCanRight(left < max - 2);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;

    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });

    // update on resize too
    const onResize = () => updateArrows();
    window.addEventListener("resize", onResize);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const scrollByCard = (dir: "left" | "right") => {
    const el = scrollerRef.current;
    if (!el) return;

    // scroll roughly one card width (card ~ 320-340 + gap 32)
    const amount = Math.min(420, el.clientWidth * 0.8);
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {/* Left arrow */}
      <button
        type="button"
        onClick={() => scrollByCard("left")}
        disabled={!canLeft}
        aria-label="Scroll left"
        className={`absolute -left-3 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full border shadow-sm grid place-items-center transition
          ${
            canLeft
              ? "bg-white border-[#e0e8e3] hover:bg-[#f6f8f7]"
              : "bg-white/60 border-[#e0e8e3] opacity-40 cursor-not-allowed"
          }`}
      >
        <span className="material-symbols-outlined text-[22px] text-[#111713]">
          chevron_left
        </span>
      </button>

      {/* Right arrow */}
      <button
        type="button"
        onClick={() => scrollByCard("right")}
        disabled={!canRight}
        aria-label="Scroll right"
        className={`absolute -right-3 top-1/2 -translate-y-1/2 z-20 h-11 w-11 rounded-full border shadow-sm grid place-items-center transition
          ${
            canRight
              ? "bg-white border-[#e0e8e3] hover:bg-[#f6f8f7]"
              : "bg-white/60 border-[#e0e8e3] opacity-40 cursor-not-allowed"
          }`}
      >
        <span className="material-symbols-outlined text-[22px] text-[#111713]">
          chevron_right
        </span>
      </button>

      {/* Scroller */}
      <div
        ref={scrollerRef}
        className="categories-scroll flex gap-8 overflow-x-auto pb-4 px-2 scroll-smooth snap-x snap-mandatory"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {items.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className="group relative overflow-hidden rounded-[2.5rem] cursor-pointer snap-start shrink-0 w-[280px] sm:w-[320px] md:w-[340px] aspect-[4/5]"
            draggable={false}
          >
            <img
              src={c.img}
              alt={c.title}
              className="absolute inset-0 w-full h-full object-cover scale-[1.02] group-hover:scale-[1.08] transition-transform duration-700"
              loading="lazy"
              draggable={false}
              onError={(e) => {
  const imgEl = e.currentTarget as HTMLImageElement;
  if (c.fallbackImg && imgEl.src !== c.fallbackImg) {
    imgEl.src = c.fallbackImg; // ✅ per category fallback
  } else {
    imgEl.src =
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80";
  }
}}

            />

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
            <div className="pointer-events-none absolute inset-0 border-4 border-transparent group-hover:border-[#C8A951] transition-all duration-500 rounded-[2.5rem]" />

            <div className="pointer-events-none absolute bottom-10 left-10 right-10">
              <h3 className="text-white text-2xl font-bold mb-2">{c.title}</h3>
              {c.subtitle ? (
                <p className="text-white/75 text-sm font-medium">{c.subtitle}</p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>

      {/* Hide scrollbar */}
      <style jsx>{`
        .categories-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .categories-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
