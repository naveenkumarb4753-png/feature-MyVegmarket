import CategoryRow from "@/components/CategoryRow";
import Link from "next/link";

export const revalidate = 300;

export default function Home() {
  return (
    <div className="bg-white text-[#111713] antialiased overflow-x-hidden">
      <main>
        {/* HERO */}
        <section className="px-4 sm:px-6 lg:px-12 py-6 sm:py-8">
          <div className="max-w-[1440px] mx-auto">
            <div
              className="relative overflow-hidden min-h-[520px] sm:min-h-[600px] lg:min-h-[640px]
                         flex items-center justify-center bg-cover bg-center text-center
                         p-6 sm:p-10 lg:p-12 rounded-[2.5rem] sm:rounded-[3.5rem] lg:rounded-[4rem]"
              style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.40), rgba(0,0,0,0.65)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuC_wduGMsWWK2Cs9zmK44CJUyITM2jUadlmqvIxxLN5vVs3iv1LB2iI2rxlUmvooWzNdDWsdrA3Vo6kLROi-nf1C7Un9dedtvgWahFScIZFx1L89pnmuY9y4eSV39afm6CsGz5oJohxOxTlkAGFkqVg_U7Wp4KbeFIBx4rwGDggf__xrXSeaTaoURJ32zR2FLeorIN3WCiTjmbOAivHATMlByyF9UpR67x8wkwjhjx7TaN-IhVbQoyWZ_dSkEJoD3mQJKTpnRMoG5Y")`,
              }}
            >
              <div className="max-w-4xl flex flex-col items-center gap-6 sm:gap-8 px-2">
                <span className="bg-[#C8A951] text-white text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full">
                  UAE Price Intelligence Platform
                </span>

                <h1 className="text-white font-extrabold leading-[1.05] tracking-tight text-balance
                               text-5xl sm:text-6xl md:text-7xl lg:text-8xl">
                  Make Smarter <br className="hidden sm:block" />Trade Decisions
                </h1>

                <p className="text-white/90 font-medium leading-relaxed text-balance
                              text-base sm:text-lg md:text-xl max-w-2xl">
                  Daily Al Aweer wholesale rates with trends-trusted by exporters and bulk buyers aross the UAE.
                </p>

                <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mt-2 sm:mt-4 w-full sm:w-auto justify-center">
                  <Link
                    href="/al-aweer-prices"
                    className="bg-[#1db954] text-white text-sm font-bold h-12 px-8 rounded-full
                               flex items-center justify-center gap-2 hover:scale-105 transition-transform
                               w-full sm:w-auto"
                  >
                    📈 View Al Aweer Prices
                  </Link>

                  <Link
                    href="/bulk-supply"
                    className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-bold
                               h-12 px-8 rounded-full hover:bg-white/20 transition-all flex items-center justify-center
                               w-full sm:w-auto"
                  >
                    Get Bulk Quote
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section className="px-4 sm:px-6 lg:px-20 py-16 sm:py-20 lg:py-24">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-10 sm:mb-12 px-1 sm:px-2">
              <div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#0B5D1E]">
                  Categories
                </h2>
              </div>

              <Link
                href="/products/vegetables"
                className="text-[#1db954] text-sm font-bold flex items-center gap-1 hover:underline underline-offset-4"
              >
                Browse all →
              </Link>
            </div>

            <CategoryRow
              items={[
                {
                  key: "vegetables",
                  title: "Vegetables",
                  subtitle: "",
                  href: "/products/vegetables",
                  img: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1400&q=80",
                  fallbackImg:
                    "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80",
                },
                {
                  key: "fruits",
                  title: "Fruits",
                  subtitle: "",
                  href: "/products/fruits",
                  img: "https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=1400&q=80",
                  fallbackImg:
                    "https://images.unsplash.com/photo-1573246123716-6b1782bfc499?auto=format&fit=crop&w=1400&q=80",
                },
                {
                  key: "spices",
                  title: "Spices",
                  subtitle: "",
                  href: "/products/spices",
                  img: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1400&q=80",
                  fallbackImg:
                    "https://images.unsplash.com/photo-1615485737651-580c9159c89a?auto=format&fit=crop&w=1400&q=80",
                },
                {
                  key: "nuts",
                  title: "Nuts",
                  subtitle: "",
                  href: "/products/nuts",
                  img: "https://images.unsplash.com/photo-1633168850968-76be3bb0a2fc?auto=format&fit=crop&w=1400&q=80",
                  fallbackImg:
                    "https://images.unsplash.com/photo-1603046891288-5ae31f3e1dae?auto=format&fit=crop&w=1400&q=1400&q=80",
                },
                {
                  key: "eggs",
                  title: "Eggs",
                  subtitle: "",
                  href: "/products/eggs",
                  img: "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&w=1400&q=80",
                  fallbackImg:
                    "https://images.unsplash.com/photo-1587486913049-53fc88980cfc?auto=format&fit=crop&w=1400&q=80",
                },
                {
                  key: "oils",
                  title: "Oils",
                  subtitle: "",
                  href: "/products/oils",
                  img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=1400&q=80",
                  fallbackImg:
                    "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=1400&q=80",
                },
              ]}
            />

            <p className="text-[#648770] text-sm font-medium mt-3 px-1 sm:px-2">
              Click arrows to explore all categories →
            </p>
          </div>
        </section>

        {/* SERVICES */}
        <section className="bg-white py-14 sm:py-16 lg:py-20">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
              <div className="lg:col-span-4">
                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#0B5D1E] leading-[1]">
                  Our Services
                </h2>
              </div>

              <div className="lg:col-span-8">
                <p className="text-[#648770] text-base sm:text-lg lg:text-xl font-medium leading-relaxed max-w-3xl">
               MyVegMarket helps UAE buyers and sellers stay updated with daily wholesale market rates and real container availability. 
               Compare prices across categories, spot changes early, and plan your purchase or sale with confidence. 
               Post your container listing to reach the right buyers, and browse available containers to source faster.
                </p>
                <p className="text-[#6f8f7c] text-sm sm:text-base font-semibold mt-5 sm:mt-6">
                  Built for exporters • wholesalers • supermarkets • hotels • cloud kitchens • caterers
                </p>

                <div className="mt-8 sm:mt-10">
                  <Link
                    href="/services"
                    className="inline-flex items-center justify-center bg-[#1db954] text-white font-extrabold text-sm h-12 px-10 rounded-full hover:opacity-95 transition-opacity w-full sm:w-auto"
                  >
                    View Services
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA SUBSCRIBE */}
        <section className="px-4 sm:px-6 lg:px-20 py-16 sm:py-20 lg:py-24">
          <div className="max-w-[1440px] mx-auto bg-[#0B5D1E] rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 lg:p-16 relative overflow-hidden">
            <div
              className="absolute top-0 right-0 w-1/3 h-full opacity-10 pointer-events-none hidden sm:block"
              style={{
                backgroundImage: "radial-gradient(circle, #C8A951 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-12">
              <div className="max-w-xl">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-3 sm:mb-6">
                  Get daily Al Aweer market updates
                </h2>
                <p className="text-white/80 text-base sm:text-lg md:text-xl font-medium">
                  Approved rate updates, category movement, and sourcing signals for UAE buyers & exporters.
                </p>
              </div>

              <div className="w-full md:w-auto">
                <div className="flex flex-col sm:flex-row w-full gap-3 sm:gap-4 bg-[#144921] p-2 rounded-2xl sm:rounded-full border border-white/10">
                  <input
                    className="bg-transparent border-none text-white placeholder:text-white/40 rounded-xl sm:rounded-full h-12 px-4 sm:px-6 w-full sm:w-72 focus:ring-0 outline-none"
                    placeholder="Enter business email"
                    type="email"
                  />
                  <button className="bg-[#c4a654] text-[#0b1a0e] font-extrabold h-12 px-8 sm:px-10 rounded-xl sm:rounded-full hover:bg-white transition-all whitespace-nowrap text-sm w-full sm:w-auto">
                    Get Daily Rates
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}