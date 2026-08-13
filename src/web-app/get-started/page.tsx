"use client";

import { useState } from "react";
import Link from "next/link";

export default function GetStartedPage() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    requirement: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.name || !form.phone || !form.requirement) {
      alert("Please fill Name, Phone and Requirement ✅");
      return;
    }

    alert("✅ Request Submitted! Our team will contact you soon.");
    setForm({ name: "", company: "", phone: "", email: "", requirement: "" });
  }

  return (
    <main className="bg-[#f6f8f7] min-h-screen px-6 lg:px-20 pt-10 pb-24">
      <div className="max-w-[1100px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#648770] mb-6 font-medium">
          <Link className="hover:text-[#1db954]" href="/">
            Home
          </Link>
          <span className="material-symbols-outlined text-base">chevron_right</span>
          <span className="text-[#111713] font-bold">Get Started</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Info */}
          <div className="lg:col-span-5">
            <h1 className="text-5xl font-black text-[#111713] leading-tight">
              Let’s Source Smarter 🚀
            </h1>
            <p className="text-[#648770] font-medium text-lg mt-4 leading-8">
              Tell us your requirement and we will send a custom bulk quote and delivery plan.
            </p>

            <div className="mt-8 space-y-4">
              {[
                { icon: "schedule", title: "Fast Response", desc: "Quote shared within 30–60 mins." },
                { icon: "verified", title: "Verified Suppliers", desc: "Only trusted wholesale vendors." },
                { icon: "local_shipping", title: "UAE Delivery", desc: "Reliable supply chain logistics." },
              ].map((i) => (
                <div
                  key={i.title}
                  className="bg-white border border-[#e0e8e3] rounded-2xl p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#1db954]/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#1db954]">
                        {i.icon}
                      </span>
                    </div>
                    <div>
                      <p className="font-black text-[#111713]">{i.title}</p>
                      <p className="text-[#648770] font-medium text-sm mt-1">
                        {i.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Form */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-[#e0e8e3] rounded-3xl p-8 shadow-sm">
              <h2 className="text-2xl font-black text-[#111713]">
                Request Bulk Quote
              </h2>
              <p className="text-[#648770] font-medium mt-2">
                We’ll contact you via WhatsApp / Call.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Full Name *"
                    className="h-12 px-5 rounded-full bg-[#f0f4f2] outline-none font-semibold"
                  />
                  <input
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    placeholder="Company / Restaurant"
                    className="h-12 px-5 rounded-full bg-[#f0f4f2] outline-none font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Phone Number *"
                    className="h-12 px-5 rounded-full bg-[#f0f4f2] outline-none font-semibold"
                  />
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email (optional)"
                    className="h-12 px-5 rounded-full bg-[#f0f4f2] outline-none font-semibold"
                  />
                </div>

                <textarea
                  name="requirement"
                  value={form.requirement}
                  onChange={handleChange}
                  placeholder="Your Requirement * (ex: 50kg tomatoes weekly, delivery to Dubai Marina)"
                  className="min-h-[120px] w-full px-6 py-4 rounded-3xl bg-[#f0f4f2] outline-none font-semibold resize-none"
                />

                <button
                  type="submit"
                  className="w-full h-12 rounded-full bg-[#1db954] text-white font-bold hover:opacity-90 shadow-lg shadow-[#1db954]/20"
                >
                  Submit Request
                </button>

                <p className="text-xs text-[#648770] font-medium text-center">
                  By submitting, you agree to be contacted by MyVegMarket team.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
