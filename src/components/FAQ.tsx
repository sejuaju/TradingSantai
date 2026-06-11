const faqs = [
  {
    question: "What is Trading Santai Hub?",
    answer:
      "Trading Santai Hub is a dynamic online community dedicated to teaching and conducting market reviews in the financial markets, focusing on forex and cryptocurrency. We provide a collaborative space for traders of all levels to learn, share insights, and engage in live market analysis sessions.",
  },
  {
    question: "How can I benefit from Trading Santai Hub?",
    answer:
      "By joining Trading Santai Hub, you gain access to live market analysis by experienced experts, comprehensive educational resources, and an interactive trading community. Our goal is to empower you with knowledge, refine your trading skills, and keep you informed about the latest market trends.",
  },
  {
    question: "How do I join Trading Santai Hub?",
    answer:
      "Joining Trading Santai Hub is easy! Simply click on the 'Join Now' button on our homepage, and you'll be guided through a straightforward registration process. Once you're a member, you can immediately start benefiting from our community's resources and insights.",
  },
  {
    question: "Can I contribute to Trading Santai Hub's community?",
    answer:
      "Yes, we encourage active participation! Whether you want to share your experiences, insights, or even contribute to our blog, Trading Santai Hub is a community that values the input of its members. Your unique perspective enriches the collective knowledge of the community.",
  },
  {
    question: "How can I get in touch with Trading Santai Hub for further assistance?",
    answer:
      "If you have any questions or need assistance, feel free to reach out through our official WhatsApp (bitly.) We're here to help and ensure that your experience with Trading Santai Hub is both enriching and supportive.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="py-24 bg-[#0f0f0f]">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-8 lg:px-10">
        {/* Section Header */}
        <div className="text-center max-w-5xl mx-auto mb-12">
          <p className="text-sm font-medium text-accent/70 uppercase tracking-widest mb-4">
            QUESTIONS AND ANSWERS
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-normal tracking-tight leading-tight text-white">
            You have questions, we&apos;ve got answers
          </h2>
        </div>

        {/* All FAQ items in ONE card */}
        <div className="max-w-5xl mx-auto rounded-2xl bg-[#161627] border border-white/8 overflow-hidden">
          {faqs.map((faq, index) => (
            <div key={index}>
              {index > 0 && <div className="border-t border-white/8 mx-6" />}
              <div className="px-6 py-8">
                <h3 className="text-sm sm:text-base font-bold text-white mb-2">
                  {faq.question}
                </h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
