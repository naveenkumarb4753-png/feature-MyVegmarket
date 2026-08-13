export const revalidate = 86400; // 1 day

export default function TermsPage() {
  return (
    <main className="bg-[#f6f8f7] min-h-screen px-6 lg:px-20 pt-10 pb-24">
      <div className="max-w-[900px] mx-auto bg-white border border-[#e0e8e3] rounded-3xl p-8 sm:p-10 shadow-sm">
        <h1 className="text-4xl font-black text-[#111713]">Terms of Service</h1>
        <p className="mt-3 text-[#648770] font-medium">
          Effective date: {new Date().toISOString().slice(0, 10)}
        </p>

        <div className="mt-8 space-y-6 text-[#111713]">
          <section>
            <h2 className="text-xl font-black">1) About MyVegmarket</h2>
            <p className="mt-2 text-[#648770] font-medium leading-7">
              MyVegmarket provides market-reference information (including approved Al Aweer
              reference rates) and supports bulk sourcing enquiries for UAE businesses and exporters.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black">2) Reference Rates Disclaimer</h2>
            <p className="mt-2 text-[#648770] font-medium leading-7">
              Prices shown are reference rates and may vary by quality, grade, packaging, timing,
              supplier availability, and delivery conditions. MyVegmarket does not guarantee that
              displayed rates will match final transaction prices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black">3) Orders & Quotes</h2>
            <p className="mt-2 text-[#648770] font-medium leading-7">
              Any quote provided through MyVegmarket is subject to confirmation, availability,
              quality checks, and logistics. Final pricing may include delivery and service charges
              depending on requirements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black">4) Acceptable Use</h2>
            <p className="mt-2 text-[#648770] font-medium leading-7">
              You agree not to misuse the platform, attempt unauthorized access, scrape data at scale,
              or use the service for unlawful activity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black">5) Limitation of Liability</h2>
            <p className="mt-2 text-[#648770] font-medium leading-7">
              MyVegmarket is not liable for indirect or consequential losses resulting from use of
              reference information, delays, market changes, or third-party supplier actions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black">6) Contact</h2>
            <p className="mt-2 text-[#648770] font-medium leading-7">
              For questions about these Terms, contact us via WhatsApp or phone listed in the footer.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}