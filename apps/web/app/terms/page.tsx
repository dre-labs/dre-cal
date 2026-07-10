import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";

type LegalSection = {
  title: string;
  body: string[];
};

const metadata: Metadata = {
  title: "Terms of Service | DRE Cal",
  description: "Terms governing access to and use of DRE Cal.",
};

const sections: LegalSection[] = [
  {
    title: "Using DRE Cal",
    body: [
      "You may use DRE Cal only in compliance with these Terms and applicable law. You are responsible for the accuracy of information you provide and for activity under your account.",
      "You must keep your account credentials secure and notify us promptly if you believe your account has been compromised.",
    ],
  },
  {
    title: "Scheduling and Integrations",
    body: [
      "DRE Cal helps users create, manage, reschedule, and cancel bookings. When you connect calendars, conferencing tools, or other integrations, you authorize us to access and process the information needed to provide those features.",
      "Third-party services are governed by their own terms and privacy policies. We are not responsible for third-party services that you choose to connect or use.",
    ],
  },
  {
    title: "Billing and Subscriptions",
    body: [
      "DRE Cal does not currently provide paid subscriptions through the service. If we introduce subscriptions, paid plans, or usage-based fees, the applicable pricing, billing cycle, payment method, cancellation terms, and refund terms will be presented before purchase or in an updated agreement.",
      "If crypto payments are supported, you are responsible for ensuring that payment details are accurate. Blockchain transactions may be irreversible, public, and subject to network fees or volatility. We may use third-party providers to facilitate payment processing.",
    ],
  },
  {
    title: "Acceptable Use",
    body: [
      "You may not misuse DRE Cal, interfere with the service, attempt unauthorized access, upload malicious code, violate the rights of others, use the service for unlawful activity, send spam, or use automated systems to abuse or overload the service.",
      "We may suspend or terminate access if we believe your use violates these Terms, creates risk, or may harm DRE Cal, users, or third parties.",
    ],
  },
  {
    title: "User Content",
    body: [
      "You retain ownership of content you submit to DRE Cal, such as profile information, booking descriptions, form responses, and uploaded materials.",
      "You grant DRE Systems LLC the rights needed to host, process, transmit, display, and otherwise use your content solely to provide, secure, support, and improve DRE Cal.",
    ],
  },
  {
    title: "Intellectual Property",
    body: [
      "DRE Cal, including its software, design, branding, and service content, is owned by DRE Systems LLC or its licensors and is protected by intellectual property laws.",
      "These Terms do not grant you ownership of DRE Cal or permission to use DRE Systems LLC names, logos, or branding except as expressly allowed by us.",
    ],
  },
  {
    title: "Feedback",
    body: [
      "If you provide feedback, suggestions, or ideas, you grant DRE Systems LLC permission to use them without restriction or compensation.",
    ],
  },
  {
    title: "Privacy",
    body: [
      "Our Privacy Policy explains how we collect, use, and protect information. By using DRE Cal, you also agree to the Privacy Policy.",
    ],
  },
  {
    title: "Disclaimers",
    body: [
      "DRE Cal is provided on an as-is and as-available basis. To the fullest extent permitted by law, DRE Systems LLC disclaims warranties of merchantability, fitness for a particular purpose, non-infringement, availability, accuracy, and uninterrupted or error-free operation.",
    ],
  },
  {
    title: "Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, DRE Systems LLC and its officers, employees, contractors, agents, affiliates, and licensors will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenues, data, goodwill, or business opportunities.",
      "To the fullest extent permitted by law, DRE Systems LLC's total liability for claims relating to DRE Cal will not exceed the amount you paid to DRE Systems LLC for DRE Cal in the twelve months before the claim, or one hundred U.S. dollars if you paid nothing.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update these Terms from time to time. Changes are effective when posted on this page, unless a later effective date is stated. Continued use of DRE Cal after changes become effective means you accept the updated Terms.",
    ],
  },
  {
    title: "Governing Law",
    body: [
      "These Terms are governed by the laws of the State of Delaware, without regard to conflict of law rules.",
    ],
  },
];

function TermsPage(): ReactElement {
  return (
    <main className="min-h-screen bg-default px-6 py-12 text-emphasis sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-subtle hover:text-emphasis">
          DRE Cal
        </Link>
        <header className="mt-8 border-subtle border-b pb-8">
          <h1 className="font-cal text-4xl text-emphasis">Terms of Service</h1>
          <p className="mt-3 text-sm text-subtle">Last updated: July 10, 2026</p>
          <p className="mt-6 text-base text-default leading-7">
            These Terms of Service govern your access to and use of DRE Cal, operated by DRE Systems LLC. If
            you do not agree to these Terms, do not use DRE Cal.
          </p>
        </header>

        <div className="space-y-10 py-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-semibold text-emphasis text-xl">{section.title}</h2>
              <div className="mt-4 space-y-4">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-default text-sm leading-7">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 className="font-semibold text-emphasis text-xl">Contact</h2>
            <p className="mt-4 text-default text-sm leading-7">
              If you have questions about these Terms, contact us at{" "}
              <a className="text-emphasis underline" href="mailto:support@cal.dre.app">
                support@cal.dre.app
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}

export { metadata, TermsPage as default };
