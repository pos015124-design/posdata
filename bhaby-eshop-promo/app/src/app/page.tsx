import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import Preview from "@/components/Preview";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

async function getDownloadCount(): Promise<number> {
  try {
    // Use dynamic import to avoid build-time execution
    const { getDb } = await import("@/lib/db");
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) as count FROM download_events").get() as { count: number };
    return row.count;
  } catch {
    return 0;
  }
}

export default async function Home() {
  const initialCount = await getDownloadCount();

  return (
    <main className="flex flex-col min-h-screen">
      <Navbar />
      <Hero initialCount={initialCount} />
      <Features />
      <HowItWorks />
      <Preview />
      <Footer />
    </main>
  );
}
