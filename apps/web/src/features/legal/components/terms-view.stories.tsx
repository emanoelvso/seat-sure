import { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { TermsView } from "./terms-view";

const meta: Meta<typeof TermsView> = {
  title: "Features/Legal/TermsView",
  component: TermsView,
} satisfies Meta<typeof TermsView>;

export default meta;

type Story = StoryObj<typeof TermsView>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Terms & Privacy Policy" }),
    ).toBeVisible();
    await expect(
      canvas.getByText(/^Welcome to SeatSure! We are committed/),
    ).toBeVisible();

    const sections = canvas.getAllByRole("heading", { level: 2 });
    await expect(sections.map((heading) => heading.textContent)).toEqual([
      "1. Terms of Use",
      "2. Ticket Refund Policy",
      "3. Privacy Policy",
      "4. Changes to This Policy",
    ]);

    const lists = canvas.getAllByRole("list");
    await expect(lists).toHaveLength(3);
    await expect(
      lists.map((list) =>
        within(list)
          .getAllByRole("listitem")
          .map((item) => item.textContent),
      ),
    ).toEqual([
      [
        "Eligibility: You must be at least 18 years old or have the consent of a legal guardian to use our services.",
        "Account Responsibility: You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.",
        "Prohibited Activities: You may not use our site for any illegal or unauthorized purpose, including but not limited to fraud, reselling tickets without authorization, or violating intellectual property rights.",
        "Event Changes: SeatSure is not responsible for changes or cancellations made by event organizers. We will, however, notify you of any significant changes to your booked events.",
      ],
      [
        "Refund Eligibility: Refunds are available only if an event is canceled or postponed. In such cases, we will notify you and provide instructions on how to request a refund.",
        "No Refunds for Personal Reasons: Unfortunately, we cannot offer refunds for changes in personal plans, missed events, or incorrect ticket purchases.",
        "Processing Time: Refunds may take up to 10 business days to process, depending on your payment method.",
        "Contact Us: For refund inquiries, please contact our customer support team at support@seatsure.com.",
      ],
      [
        "Information We Collect: We collect information such as your name, email address, payment details, and event preferences when you create an account or purchase tickets.",
        "How We Use Your Information: Your information is used to process transactions, send event updates, and improve our services. We do not sell or share your data with third parties for marketing purposes.",
        "Data Security: We use industry-standard encryption and security measures to protect your data from unauthorized access or breaches.",
        "Cookies: Our website uses cookies to enhance your browsing experience. You can disable cookies in your browser settings, but this may affect site functionality.",
        "Third-Party Links: Our site may contain links to third-party websites. We are not responsible for the privacy practices or content of these sites.",
      ],
    ]);

    await expect(
      canvas.getByRole("link", { name: "support@seatsure.com" }),
    ).toHaveAttribute("href", "mailto:support@seatsure.com");

    await expect(canvas.queryByText(/Evenjo/)).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /accept/i }),
    ).not.toBeInTheDocument();
    await expect(
      canvas.queryByRole("button", { name: /decline/i }),
    ).not.toBeInTheDocument();
  },
} satisfies Story;
