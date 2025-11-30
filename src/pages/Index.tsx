import Header from "@/components/Header";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import SectionDivider from "@/components/SectionDivider";
import WhyChooseUs from "@/components/WhyChooseUs";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <HowItWorks />
      <SectionDivider />
      <WhyChooseUs />
      <SectionDivider />
      <FAQ />
      <Footer />
    </div>
  );
};

export default Index;
