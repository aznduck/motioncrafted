import Header from "@/components/Header";
import Hero from "@/components/Hero";
import EmotionalValue from "@/components/EmotionalValue";
import HolidayGift from "@/components/HolidayGift";
import WhyChooseUs from "@/components/WhyChooseUs";
import HowItWorks from "@/components/HowItWorks";
import SectionDivider from "@/components/SectionDivider";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <EmotionalValue />
      <SectionDivider />
      <HolidayGift />
      <SectionDivider />
      <WhyChooseUs />
      <SectionDivider />
      <HowItWorks />
      <SectionDivider />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Index;
