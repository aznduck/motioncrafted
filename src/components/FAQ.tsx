import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How long does it take to receive my video?",
    answer: "Most projects are completed within 48 hours of receiving your photos.",
  },
  {
    question: "What photo formats do you accept?",
    answer: "We accept all common image formats including JPG, PNG, HEIC, and TIFF. You can upload photos from your phone, computer, or even scanned physical prints.",
  },
  {
    question: "How do you ensure my photos remain private?",
    answer: "Your privacy is our top priority. All uploads are encrypted, and your photos are only accessed by our team to create your video. We never share or use your images for any other purpose.",
  },
  {
    question: "Can I choose the order of photos in my video?",
    answer: "Yes! After uploading, you'll have the option to arrange your photos in any order you prefer. Our team will also provide professional suggestions if needed.",
  },
  {
    question: "What if I'm not satisfied with the final video?",
    answer: "We offer one round of revisions at no extra cost to ensure you're completely happy with your animated video. Your satisfaction is guaranteed.",
  },
  {
    question: "Can I add custom music to my video?",
    answer: "Yes! You can choose from our curated library of warm, sentimental soundtracks or provide your own music to personalize your video.",
  },
  {
    question: "Do you offer rush delivery?",
    answer: "Yes! Contact us at motioncrafted@gmail.com for rush delivery options. We can often accommodate 24-hour turnaround for an additional fee.",
  },
  {
    question: "What video format will I receive?",
    answer: "Your final video will be delivered in high-quality MP4 format, compatible with all devices and easy to share with family and friends.",
  },
];

const FAQ = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about Motion Crafted
          </p>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card border border-border rounded-lg px-6 shadow-soft"
              >
                <AccordionTrigger className="text-left font-display text-lg hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
