import Link from "next/link";

export default function BulkSupplyPage() {
  const features = [
    {
      title: "Al Aweer Daily Rates",
      desc: "Latest market prices with update time and price range per product.",
      icon: "query_stats",
    },
    {
      title: "View Containers",
      desc: "Browse container listings by product and origin to track available shipments.",
      icon: "inventory_2",
    },
    {
      title: "Post Your Listing",
      desc: "Exporters can post container listings to share shipment availability with buyers.",
      icon: "post_add",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Open Al Aweer Prices",
      icon: "analytics",
      desc: "Check today’s approved reference rates.",
    },
    {
      step: "02",
      title: "Search & Filter",
      icon: "manage_search",
      desc: "Filter by category, origin, and date to find what you need.",
    },
    {
      step: "03",
      title: "View Containers",
      icon: "open_in_new",
      desc: "Open a product to view container listings and shipment details.",
    },
    {
      step: "04",
      title: "Post Container Listing",
      icon: "publish",
      desc: "Exporters can post listings to update availability.",
    },
  ];

  return (
    <main className="bg-[#f6f8f7] min-h-screen px-6 lg:px-20 pt-10 pb-24">
      <div className="max-w-[1200px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#648770] mb-6 font-medium">
          <Link className="hover:text-[#1db954]" href="/">
            Home
          </Link>
          <span className="material-symbols-outlined text-base">chevron_right</span>
          <span className="text-[#111713] font-bold">Get Started</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div className="max-w-2xl">
            <h1 className="text-5xl font-black tracking-tight text-[#111713]">
              Al Aweer Prices & Container Listings
            </h1>
            <p className="text-lg text-[#648770] font-medium mt-3 leading-8">
              Track approved Al Aweer reference rates and browse container listings by product, origin, and shipment mode.
            </p>
          </div>

          {/* Primary CTA */}
          <Link
            href="/al-aweer-prices"
            className="h-12 px-7 rounded-full bg-[#1db954] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90 shadow-lg shadow-[#1db954]/20"
          >
            <span className="material-symbols-outlined">query_stats</span>
            View Al Aweer Prices
          </Link>
        </div>

        {/* 3 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {features.map((x) => (
            <div
              key={x.title}
              className="bg-white rounded-3xl border border-[#e0e8e3] shadow-sm p-7"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#1db954]/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[#1db954]">
                  {x.icon}
                </span>
              </div>
              <h3 className="text-xl font-black text-[#111713]">{x.title}</h3>
              <p className="text-[#648770] font-medium mt-2 leading-7">
                {x.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Process */}
        <div className="bg-white border border-[#e0e8e3] rounded-3xl shadow-sm p-8">
          <h2 className="text-2xl font-black text-[#111713] mb-2">How It Works</h2>
          <p className="text-[#648770] font-medium mb-8">
            Simple 4-step flow for buyers and exporters using MyVegmarket.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            {steps.map((s) => (
              <div
                key={s.step}
                className="rounded-2xl bg-[#f0f4f2] border border-[#e0e8e3] p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-black text-[#1db954]">
                    {s.step}
                  </span>
                  <span className="material-symbols-outlined text-[#648770]">
                    {s.icon}
                  </span>
                </div>
                <p className="text-lg font-black text-[#111713]">{s.title}</p>
                <p className="text-[#648770] font-medium mt-2 text-sm leading-6">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
         {/* CTA */}
<div className="mt-10 flex flex-col sm:flex-row gap-4">
  <Link
    href="/products/vegetables"
    className="flex-1 h-12 rounded-full bg-[#0B5D1E] text-white font-bold flex items-center justify-center gap-2 hover:opacity-90"
  >
    <span className="material-symbols-outlined">inventory_2</span>
    View Container Listings
  </Link>

  <Link
    href="/containers-listing/list"
    className="flex-1 h-12 rounded-full bg-white border border-[#1db954] text-[#1db954] font-bold flex items-center justify-center gap-2 hover:bg-[#1db954]/5"
  >
    <span className="material-symbols-outlined">post_add</span>
    Post Your Listing
  </Link>
</div>

          <p className="mt-6 text-xs text-[#648770] font-medium">
            Note: MyVegmarket provides reference rates and listing access. Final pricing and transactions happen outside the platform.
          </p>
        </div>
      </div>
    </main>
  );
}