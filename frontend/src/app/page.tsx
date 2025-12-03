import {
  AuthRedirect,
  Navbar,
  HeroSection,
  BentoGridSection,
  Footer,
} from "@/components/landing";

export const dynamic = "force-dynamic";

export default function LandingPage() {
  return (
    <AuthRedirect>
      <main className="min-h-screen bg-background-modal text-foreground selection:bg-brand selection:text-black font-sans overflow-x-hidden">
        <Navbar />
        <HeroSection />
        <BentoGridSection />
        <Footer />
      </main>
    </AuthRedirect>
  );
}
