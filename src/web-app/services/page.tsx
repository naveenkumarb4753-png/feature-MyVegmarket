import Link from "next/link";

export default function ServicesPage() {
  return (
    <main className="bg-[#f6f8f7] min-h-screen px-6 lg:px-20 pt-10 pb-24">
      <div className="max-w-[1200px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#648770] mb-6 font-medium">
          <Link className="hover:text-[#1db954]" href="/">
            Home
          </Link>
          <span className="material-symbols-outlined text-base">chevron_right</span>
          <span className="text-[#111713] font-bold">Services</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-5xl font-black text-[#111713]">Our Services</h1>
          <p className="text-[#648770] text-lg font-medium mt-3 max-w-2xl leading-8">
            Built for exporters, wholesalers, restaurants and retailers across the UAE.
          </p>
        </div>

        {/* Service Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              icon: "query_stats",
              title: "Approved Al Aweer Prices",
              desc: "View approved daily market reference rates with min/max, latest rate (AED) and update time.",
              points: ["Approved daily list", "Filter by date & origin", "Download PDF report"],
              href: "/al-aweer-prices",
            },
            {
              icon: "category",
              title: "Browse Products",
              desc: "Explore products by category and open container view for each item.",
              points: ["Vegetables, fruits, spices and more", "Fast search & filters", "Open containers per product"],
              href: "/products/vegetables",
            },
            {
              icon: "post_add",
              title: "Post Your Ad",
              desc: "Exporters can post and manage container listings to share availability.",
              points: ["Create a listing", "Update availability anytime", "Show shipment details clearly"],
              href: "/containers-listing/list",
            },
            {
              icon: "support_agent",
              title: "WhatsApp Support",
              desc: "Get help using Al Aweer prices and container listings.",
              points: ["Platform help", "Listing help for exporters", "Report issues / corrections"],
              href: "https://wa.me/917010220771?text=Hi%20MyVegMarket%2C%20I%20need%20help%20using%20Al%20Aweer%20Prices%20and%20Container%20Listings.",
              external: true,
            },
          ].map((s) => (
            <div
              key={s.title}
              className="bg-white rounded-3xl border border-[#e0e8e3] shadow-sm p-8"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#1db954]/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[#1db954]">
                  {s.icon}
                </span>
              </div>

              <h3 className="text-2xl font-black text-[#111713]">{s.title}</h3>
              <p className="text-[#648770] font-medium mt-3 leading-7">{s.desc}</p>

              <div className="mt-5 space-y-2">
                {s.points.map((p) => (
                  <div
                    key={p}
                    className="flex items-center gap-2 text-sm font-semibold text-[#111713]"
                  >
                    <span className="material-symbols-outlined text-[#1db954] text-base">
                      check_circle
                    </span>
                    {p}
                  </div>
                ))}
              </div>

              {s.external ? (
                <a
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-7 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-[#f0f4f2] border border-[#e0e8e3] font-bold text-[#111713] hover:bg-[#e6efe9]"
                >
                  Explore
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </a>
              ) : (
                <Link
                  href={s.href}
                  className="mt-7 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-[#f0f4f2] border border-[#e0e8e3] font-bold text-[#111713] hover:bg-[#e6efe9]"
                >
                  Explore
                  <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}