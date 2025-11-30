import {
  AuthRedirect,
  Navbar,
  HeroSection,
  BentoGridSection,
  Footer,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <AuthRedirect>
      <main className="min-h-screen bg-[#1a1a1a] text-white selection:bg-[#AFC02B] selection:text-black font-sans overflow-x-hidden">
        <Navbar />
        <HeroSection />
        <BentoGridSection />
        <Footer />
      </main>
    </AuthRedirect>
  );
}
