import type { ReactNode } from "react";

const SUPPORT_EMAIL = "support@seatsure.com";

function PolicySection({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-xl leading-tight font-bold">{title}</h2>
      <div>
        {intro && <p>{intro}</p>}
        {children}
      </div>
    </section>
  );
}

function PolicyList({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-7">{children}</ul>;
}

export function TermsView() {
  return (
    <div className="flex flex-col gap-18 px-27 pt-21 pb-25 text-lg leading-tight">
      <h1 className="text-4xl font-bold">Terms &amp; Privacy Policy</h1>

      <p>
        Welcome to SeatSure! We are committed to protecting your privacy and
        ensuring a safe and enjoyable experience for all our users. This page
        outlines our policies regarding the use of our website, ticket refunds,
        and the protection of your personal information. By using SeatSure, you
        agree to the terms outlined below.
      </p>

      <PolicySection
        title="1. Terms of Use"
        intro="By accessing and using SeatSure, you agree to comply with the following terms and conditions:"
      >
        <PolicyList>
          <li>
            Eligibility: You must be at least 18 years old or have the consent
            of a legal guardian to use our services.
          </li>
          <li>
            Account Responsibility: You are responsible for maintaining the
            confidentiality of your account information and for all activities
            that occur under your account.
          </li>
          <li>
            Prohibited Activities: You may not use our site for any illegal or
            unauthorized purpose, including but not limited to fraud, reselling
            tickets without authorization, or violating intellectual property
            rights.
          </li>
          <li>
            Event Changes: SeatSure is not responsible for changes or
            cancellations made by event organizers. We will, however, notify you
            of any significant changes to your booked events.
          </li>
        </PolicyList>
      </PolicySection>

      <PolicySection
        title="2. Ticket Refund Policy"
        intro="At SeatSure, we strive to make your ticket-buying experience as seamless as possible. Please review our refund policy below:"
      >
        <PolicyList>
          <li>
            Refund Eligibility: Refunds are available only if an event is
            canceled or postponed. In such cases, we will notify you and provide
            instructions on how to request a refund.
          </li>
          <li>
            No Refunds for Personal Reasons: Unfortunately, we cannot offer
            refunds for changes in personal plans, missed events, or incorrect
            ticket purchases.
          </li>
          <li>
            Processing Time: Refunds may take up to 10 business days to process,
            depending on your payment method.
          </li>
          <li>
            Contact Us: For refund inquiries, please contact our customer
            support team at{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-tint-500 hover:text-tint-400"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </li>
        </PolicyList>
      </PolicySection>

      <PolicySection
        title="3. Privacy Policy"
        intro="Your privacy is important to us. This section explains how we collect, use, and protect your personal information:"
      >
        <PolicyList>
          <li>
            Information We Collect: We collect information such as your name,
            email address, payment details, and event preferences when you
            create an account or purchase tickets.
          </li>
          <li>
            How We Use Your Information: Your information is used to process
            transactions, send event updates, and improve our services. We do
            not sell or share your data with third parties for marketing
            purposes.
          </li>
          <li>
            Data Security: We use industry-standard encryption and security
            measures to protect your data from unauthorized access or breaches.
          </li>
          <li>
            Cookies: Our website uses cookies to enhance your browsing
            experience. You can disable cookies in your browser settings, but
            this may affect site functionality.
          </li>
          <li>
            Third-Party Links: Our site may contain links to third-party
            websites. We are not responsible for the privacy practices or
            content of these sites.
          </li>
        </PolicyList>
      </PolicySection>

      <PolicySection
        title="4. Changes to This Policy"
        intro="We may update our Privacy Policy and Terms of Use from time to time. Any changes will be posted on this page, and we encourage you to review them periodically. Your continued use of SeatSure after any changes constitutes your acceptance of the updated terms."
      />
    </div>
  );
}
