export const revalidate = 86400; // 1 day

export default function PrivacyPage() {
  const effectiveDate = "April 5, 2026";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4f8f5_0%,#eef5f0_45%,#f8fbf9_100%)] px-6 pb-24 pt-10 lg:px-20">
      <div className="mx-auto max-w-[980px]">
        <div className="overflow-hidden rounded-[32px] border border-[#dbe7df] bg-white shadow-[0_20px_70px_rgba(17,23,19,0.08)]">
          <div className="border-b border-[#e4ece7] bg-[linear-gradient(135deg,#f7fbf8_0%,#eef7f1_55%,#e8f4ec_100%)] px-8 py-10 sm:px-10">
            <div className="inline-flex items-center rounded-full border border-[#dbe7df] bg-white/80 px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.18em] text-[#3d6b52]">
              MyVegMarket
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight text-[#111713] sm:text-5xl">
              Privacy Policy
            </h1>

            <p className="mt-4 max-w-3xl text-[15px] font-medium leading-7 text-[#5f7d69] sm:text-base">
              This Privacy Policy explains how MyVegMarket collects, uses, stores,
              and protects information when you use our website and mobile application.
            </p>

            <div className="mt-5 inline-flex items-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[#4f6f5b] shadow-sm ring-1 ring-[#e4ece7]">
              Effective Date: {effectiveDate}
            </div>
          </div>

          <div className="px-8 py-8 sm:px-10 sm:py-10">
            <div className="space-y-6">
              <PolicySection
                number="1"
                title="Information We Collect"
                content={[
                  "We may collect personal and business information that you voluntarily provide to us, including your name, email address, phone number, company name, trade-related details, and other contact information.",
                  "We may also collect user-submitted content such as container listings, product details, pricing submissions, inquiry information, and general usage data required to improve the service.",
                ]}
              />

              <PolicySection
                number="2"
                title="How We Use Information"
                content={[
                  "We use the information we collect to operate and improve MyVegMarket, provide market updates, manage container listings, respond to inquiries, improve platform reliability, and communicate service-related information.",
                  "We may also use the information to enhance user experience, maintain account-related functionality, and support business operations connected with the platform.",
                ]}
              />

             <PolicySection
  number="3"
  title="Market Price Disclaimer"
  content={[
    "The prices displayed on MyVegMarket are based on market observations, submitted updates, and average estimates intended to provide users with a practical reference for prevailing market trends.",
    "Because wholesale market prices can change based on factors such as quantity, quality, grade, packaging, origin, and daily availability, the actual transaction price may vary slightly from the displayed average price. MyVegMarket aims to keep the information as timely and useful as possible, but does not guarantee that every listed price will always exactly match every live market transaction.",
  ]}
/>

              <PolicySection
                number="4"
                title="Sharing of Information"
                content={[
                  "We do not sell your personal data. We may share information only when reasonably necessary to provide our services, fulfill a user request, work with trusted operational partners, or comply with applicable legal obligations.",
                  "Information may also be processed by third-party service providers that help us operate the platform, such as hosting, database, storage, analytics, and communication tools.",
                ]}
              />

              <PolicySection
                number="5"
                title="Cookies and Similar Technologies"
                content={[
                  "We may use cookies or similar technologies for essential functionality, analytics, performance monitoring, and improving the overall user experience across our website and related services.",
                ]}
              />

              <PolicySection
                number="6"
                title="Data Security"
                content={[
                  "We take reasonable technical and organizational measures to protect your information from unauthorized access, misuse, disclosure, or loss. However, no method of transmission over the internet or electronic storage is completely secure, and absolute security cannot be guaranteed.",
                ]}
              />

              <PolicySection
                number="7"
                title="Your Choices and Rights"
                content={[
                  "You may request correction, update, or deletion of the personal information you have submitted to us, subject to legal and operational requirements. You may also unsubscribe from non-essential communications where applicable.",
                ]}
              />

              <PolicySection
                number="8"
                title="Children's Privacy"
                content={[
                  "MyVegMarket is not intended for children under the age of 13, and we do not knowingly collect personal information from children.",
                ]}
              />

              <PolicySection
                number="9"
                title="Changes to This Privacy Policy"
                content={[
                  "We may update this Privacy Policy from time to time to reflect platform changes, legal requirements, or operational improvements. Any updated version will be posted on this page with the revised effective date.",
                ]}
              />

              <section className="rounded-[28px] border border-[#e7eeea] bg-[#fcfdfc] px-6 py-6 transition-all">
  <div className="flex items-start gap-4">
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf4ed] text-base font-black text-[#2f6b49]">
      10
    </div>

    <div className="min-w-0 flex-1">
      <h2 className="text-xl font-black tracking-tight text-[#111713] sm:text-[22px]">
        Contact Us
      </h2>

      <div className="mt-3 space-y-3">
        <p className="text-[15px] font-medium leading-7 text-[#648770] sm:text-base">
          If you have any questions, requests, or concerns regarding this Privacy
          Policy, please contact us at{" "}
          <a
            href="mailto:support@myvegmarket.com"
            className="font-semibold text-[#2f6b49] underline underline-offset-4 hover:text-[#24563a]"
          >
            support@myvegmarket.com
          </a>
          .
        </p>
      </div>
    </div>
  </div>
</section>
            </div>

            <div className="mt-10 rounded-[28px] border border-[#e2ebe5] bg-[linear-gradient(135deg,#f8fbf9_0%,#f1f7f3_100%)] px-6 py-5">
              <p className="text-sm font-semibold leading-7 text-[#4f6f5b] sm:text-[15px]">
                By using MyVegMarket, you acknowledge that you have read, understood,
                and agreed to this Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function PolicySection({
  number,
  title,
  content,
  highlight = false,
}: {
  number: string;
  title: string;
  content: string[];
  highlight?: boolean;
}) {
  return (
    <section
      className={[
        "rounded-[28px] border px-6 py-6 transition-all",
        highlight
          ? "border-[#d7e8db] bg-[linear-gradient(135deg,#f7fbf8_0%,#eef8f1_100%)] shadow-sm"
          : "border-[#e7eeea] bg-[#fcfdfc]",
      ].join(" ")}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf4ed] text-base font-black text-[#2f6b49]">
          {number}
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black tracking-tight text-[#111713] sm:text-[22px]">
            {title}
          </h2>

          <div className="mt-3 space-y-3">
            {content.map((paragraph, index) => (
              <p
                key={`${number}-${index}`}
                className="text-[15px] font-medium leading-7 text-[#648770] sm:text-base"
              >
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}