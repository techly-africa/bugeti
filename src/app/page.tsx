"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@/store";
import { Logo } from "@/components/shared/Logo";
import { useRouter } from "next/navigation";
import { 
  PlusCircle, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  ChevronRight, 
  CheckCircle2, 
  Smartphone,
  ShieldCheck,
  Zap,
  ArrowRight
} from "lucide-react";
import { 
  IllustrationBudget, 
  IllustrationFamily, 
  IllustrationMomo, 
  IllustrationIkimina 
} from "@/components/landing/LandingIllustration";

// ─── Tiny hook: triggers when element enters viewport ─────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ illustration, title, desc, delay = 0, variant = "green" }: {
  illustration: React.ReactNode; 
  title: string; 
  desc: string; 
  delay?: number;
  variant?: "green" | "yellow" | "blue" | "emerald";
}) {
  const { ref, visible } = useInView();
  const variants = {
    green: "hover:border-green-200 hover:bg-green-50/50",
    yellow: "hover:border-yellow-200 hover:bg-yellow-50/50",
    blue: "hover:border-blue-200 hover:bg-blue-50/50",
    emerald: "hover:border-emerald-200 hover:bg-emerald-50/50",
  };

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: "opacity 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
      className={`group bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col gap-6 transition-all duration-500 ${variants[variant]}`}
    >
      <div className="h-48 w-full flex items-center justify-center bg-gray-50/50 rounded-2xl group-hover:bg-transparent transition-colors duration-500">
        <div className="w-full h-full scale-90 group-hover:scale-100 transition-transform duration-500">
          {illustration}
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="font-black text-gray-900 text-xl tracking-tight">{title}</h3>
        <p className="text-gray-500 text-base leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Step ─────────────────────────────────────────────────────────────────────
function Step({ n, title, desc, delay = 0 }: { n: number; title: string; desc: string; delay?: number }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-24px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}
      className="flex gap-6 items-start group"
    >
      <div className="shrink-0 w-12 h-12 rounded-2xl bg-[#0D5C36] text-white flex items-center justify-center font-black text-xl shadow-lg shadow-green-900/20 group-hover:scale-110 transition-transform">
        {n}
      </div>
      <div className="pt-1">
        <p className="font-bold text-gray-900 text-lg">{title}</p>
        <p className="text-gray-500 text-base mt-1 italic opacity-80">{desc}</p>
      </div>
    </div>
  );
}

// ─── Stat ─────────────────────────────────────────────────────────────────────
function Stat({ value, label, icon: Icon }: { value: string; label: string; icon: any }) {
  return (
    <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
      <div className="w-10 h-10 rounded-full bg-[#FFD95A]/20 flex items-center justify-center text-[#FFD95A]">
        <Icon size={20} />
      </div>
      <div className="text-center">
        <span className="block text-2xl font-black text-white">{value}</span>
        <span className="text-xs text-green-200 uppercase tracking-widest font-bold">{label}</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const user = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  if (user) return null;

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-[#FFD95A] selection:text-[#0D5C36]">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo variant="icon" height={42} />
            <span className="font-black text-2xl tracking-tighter text-[#0D5C36]">BUGETI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="hidden sm:block text-sm font-bold text-[#0D5C36] hover:opacity-70 transition-opacity px-4">
              Log in
            </Link>
            <Link href="/auth" className="bg-[#0D5C36] text-white text-sm font-black px-6 py-3 rounded-full hover:shadow-xl hover:shadow-green-900/20 hover:-translate-y-0.5 active:translate-y-0 transition-all">
              Join free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-32 px-6 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] pointer-events-none -z-10">
          <div className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] rounded-full bg-green-50 blur-[120px] opacity-60 animate-pulse" />
          <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-yellow-50 blur-[100px] opacity-60 animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 px-4 py-2 rounded-full mb-8 animate-[fadeInDown_1s_ease_both]">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            <span className="text-xs font-black text-green-700 tracking-wider uppercase">Built for Rwanda 🇷🇼</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.05] mb-8 animate-[fadeInUp_1s_ease_0.2s_both]">
            Budget like a Rwandan.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0D5C36] to-green-600">Save like a champion.</span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12 leading-relaxed animate-[fadeInUp_1s_ease_0.4s_both]">
            The first budgeting app built for Rwandan households. 
            Native RWF support, MoMo tracking, and works 100% offline.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-[fadeInUp_1s_ease_0.6s_both]">
            <Link href="/auth" className="w-full sm:w-auto bg-[#0D5C36] text-white font-black text-lg px-10 py-5 rounded-full hover:shadow-2xl hover:shadow-green-900/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
              Start your free budget <ArrowRight size={20} />
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
              <ShieldCheck size={16} className="text-green-500" /> No credit card needed
            </div>
          </div>
        </div>

        {/* Floating Mockup Preview */}
        <div className="mt-20 max-w-5xl mx-auto relative animate-[fadeInUp_1.2s_ease_0.8s_both]">
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent z-10 h-32 bottom-0" />
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 overflow-hidden aspect-[16/9] md:aspect-[21/9]">
            <div className="w-full h-full bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden">
               <IllustrationBudget />
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-[#0D5C36] py-16 px-6 transform -skew-y-2 origin-left relative z-20">
        <div className="max-w-6xl mx-auto skew-y-2 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Stat icon={Zap} value="RWF" label="Native currency · No conversions" />
          <Stat icon={Smartphone} value="100%" label="Offline-first App · Works anywhere" />
          <Stat icon={CheckCircle2} value="3 MIN" label="To set up your first family budget" />
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 pt-32 pb-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">Everything your family needs</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">Built around how Rwandan households actually manage money.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FeatureCard 
              delay={0}
              variant="green"
              illustration={<IllustrationBudget />}
              title="Native RWF Budgeting"
              desc="Set your monthly income, allocate to groceries, transport, and utilities. Watch your savings grow in real-time."
            />
            <FeatureCard 
              delay={100}
              variant="yellow"
              illustration={<IllustrationFamily />}
              title="Shared Household Budgets"
              desc="Invite family members to manage the kitchen budget while keeping your personal savings private."
            />
            <FeatureCard 
              delay={200}
              variant="blue"
              illustration={<IllustrationMomo />}
              title="Manual MoMo Tracking"
              desc="Tag transactions as MoMo, Airtel, or Cash. See exactly where your mobile pocket is bleeding without connecting your accounts."
            />
            <FeatureCard 
              delay={300}
              variant="emerald"
              illustration={<IllustrationIkimina />}
              title="Ikimina Tracker"
              desc="Track your savings circles. See who contributed this cycle and when the pot comes to you."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-20 items-center">
          <div className="flex-1 space-y-12">
            <div>
              <h2 className="text-4xl font-black text-gray-900 mb-6 tracking-tight">Up and running in 3 minutes</h2>
              <p className="text-lg text-gray-500 italic">No bank connection required. No complex spreadsheets.</p>
            </div>
            <div className="space-y-10">
              <Step n={1} title="Join the family" desc="Sign up with your email. No long forms, no credit cards." />
              <Step n={2} title="Set your income" desc="Tell Bugeti what you're earning this month. We handle the currency." />
              <Step n={3} title="Track & Save" desc="Log spending on the go, even offline. We'll guide you to your goals." />
            </div>
          </div>
          <div className="flex-1 w-full max-w-md bg-green-50 rounded-[40px] p-8 aspect-square flex items-center justify-center relative shadow-inner">
             <div className="w-64 h-64 bg-white rounded-3xl shadow-2xl p-4 flex flex-col gap-3 group hover:-translate-y-4 transition-transform duration-500">
                <div className="h-2 w-12 bg-green-100 rounded-full" />
                <div className="space-y-1">
                   <div className="h-4 w-3/4 bg-gray-100 rounded-md" />
                   <div className="h-4 w-1/2 bg-gray-100 rounded-md" />
                </div>
                <div className="mt-auto flex items-center justify-between">
                   <div className="w-10 h-10 rounded-full bg-[#FFD95A]/20" />
                   <div className="h-6 w-20 bg-green-500 rounded-lg animate-pulse" />
                </div>
             </div>
             <div className="absolute top-10 right-10 w-20 h-20 bg-yellow-400 rounded-full blur-3xl opacity-30" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 pb-20 pt-10">
        <div className="max-w-6xl mx-auto bg-[#0D5C36] rounded-[48px] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl shadow-green-950/40">
           <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-400/10 rounded-full translate-y-1/2 -translate-x-1/2" />
           
           <h2 className="text-4xl md:text-6xl font-black mb-8 relative z-10 leading-tight">
             Kora ingenzi n&apos;amafaranga yawe
           </h2>
           <p className="text-xl text-green-100 mb-12 max-w-xl mx-auto opacity-80 relative z-10">
             Start doing great things with your money today. Join thousands of Rwandans budgeting smarter.
           </p>
           <Link href="/auth" className="inline-flex items-center gap-3 bg-[#FFD95A] text-[#0D5C36] font-black text-xl px-12 py-6 rounded-full hover:bg-yellow-100 hover:scale-105 active:scale-95 transition-all shadow-xl relative z-10">
             Get started for free <ArrowRight size={24} />
           </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex justify-center mb-8">
             <Logo variant="icon" height={48} />
          </div>
          <p className="text-gray-400 text-sm font-medium mb-2">© 2026 BUGETI · BUILT FOR RWANDA 🇷🇼</p>
          <div className="flex gap-6 justify-center text-gray-400 text-xs font-bold uppercase tracking-widest">
            <span className="hover:text-[#0D5C36] cursor-pointer">Privacy</span>
            <span className="hover:text-[#0D5C36] cursor-pointer">Terms</span>
            <span className="hover:text-[#0D5C36] cursor-pointer">Contact</span>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        @keyframes grow-right {
          from { width: 0; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
