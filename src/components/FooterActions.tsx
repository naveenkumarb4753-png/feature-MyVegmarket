"use client";

export default function FooterActions() {
  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        className="hover:text-[#1db954]"
        aria-label="Share"
        onClick={async () => {
          const url = window.location.origin;

          try {
            // @ts-ignore
            if (navigator.share) {
              // @ts-ignore
              await navigator.share({ title: "MyVegMarket", url });
              return;
            }
          } catch {}

          try {
            await navigator.clipboard.writeText(url);
          } catch {}
        }}
      >
        <span className="material-symbols-outlined">share</span>
      </button>

      <button type="button" className="hover:text-[#1db954]" aria-label="Language">
        <span className="material-symbols-outlined">language</span>
      </button>
    </div>
  );
}