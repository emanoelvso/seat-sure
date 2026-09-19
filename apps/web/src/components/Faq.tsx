import { QuestionAccordion } from "./QuestionAccordion";

export default function Faq() {
  return (
    <section aria-label="FAQ" className="flex flex-col items-center w-full">
      <div className="mt-34 text-center max-w-xl">
        <h2 className="text-3xl font-bold mb-2">
          Frequently Asked <span className="text-tint-400">Questions</span>
        </h2>
        <p className="text-neutral-200">
          Explore the most common questions and detailed answers about our
          events ot concerts, and security to help guide your journey in the
          EVENJO.
        </p>
      </div>

      <div className="w-full max-w-3xl mt-10 mb-34 px-4">
        <QuestionAccordion
          items={[
            {
              value: "q1",
              question:
                "When Exclusive Private Market for Event ticket sale Opportunities?",
              answer:
                "Our exclusive private market opens periodically for verified members. Sign up to receive early access notifications and be the first to grab limited ticket opportunities.",
            },
            {
              value: "q2",
              question: "How do refundable tickets work?",
              answer:
                "Refundable tickets can be returned up to 48 hours before the event for a full refund. Simply go to your order history and select the refund option.",
            },
            {
              value: "q3",
              question: "Can I split my payment into installments?",
              answer:
                "Yes! With Smart Deals you can split your ticket cost into 2 installments over a fixed period. No hidden fees — start for free.",
            },
            {
              value: "q4",
              question: "How do I find events near me?",
              answer:
                "Use the search box on the home page and filter by location. You can also browse by category to discover events you didn't know were happening nearby.",
            },
            {
              value: "q5",
              question: "Is my payment information secure?",
              answer:
                "Absolutely. All transactions are encrypted with industry-standard SSL and we never store your full card details on our servers.",
            },
          ]}
        />
      </div>
    </section>
  );
}
