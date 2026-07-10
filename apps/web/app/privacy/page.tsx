import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";

type LegalSection = {
  title: string;
  body: string[];
};

const metadata: Metadata = {
  title: "Privacy Policy | DRE Cal",
  description: "How DRE Systems LLC collects, uses, and protects information for DRE Cal.",
};

const sections: LegalSection[] = [
  {
    title: "Information We Collect",
    body: [
      "We collect information you provide directly, including your name, email address, profile details, scheduling preferences, booking information, calendar connection settings, and communications with support.",
      "When you connect a calendar, conferencing, or other integration, we process the information needed to provide scheduling features, such as availability, event metadata, attendee details, and integration identifiers. We do not use connected calendar data for advertising.",
      "We automatically collect usage and device information such as IP address, browser type, pages viewed, timestamps, diagnostic data, and similar information used to operate, secure, and improve DRE Cal.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "We use information to provide and maintain DRE Cal, create and manage bookings, synchronize calendar events, send transactional notifications, provide support, secure the service, troubleshoot issues, improve product performance, and comply with legal obligations.",
      "We may send administrative, security, and service-related messages. We may also send product or marketing communications where permitted by law, and you may opt out of marketing messages.",
    ],
  },
  {
    title: "Analytics and Advertising",
    body: [
      "We use PostHog to understand product usage, diagnose issues, and improve DRE Cal. PostHog may process usage, device, and event information on our behalf.",
      "We may use advertising platforms such as Google Ads, Meta, and LinkedIn to measure campaigns, reach people who may be interested in DRE Cal, and avoid irrelevant or repetitive ads. DRE Cal does not sell personal information. You may opt out of advertising-related sharing by contacting support@cal.dre.app.",
    ],
  },
  {
    title: "Service Providers",
    body: [
      "We use vendors and subprocessors to operate DRE Cal, including infrastructure, database, email delivery, analytics, security, support, and integration providers. Postmark is used for transactional email. We only share information with service providers as needed for them to provide services to us.",
      "If we add paid subscriptions, payment providers may process payment information. If crypto payments are supported, blockchain transaction details such as wallet addresses and transaction hashes may be public and outside DRE Systems LLC's control.",
    ],
  },
  {
    title: "Data Sharing",
    body: [
      "We may disclose information to service providers, integration providers you authorize, calendar attendees and organizers as needed to complete bookings, affiliates, professional advisors, authorities when required by law, and parties involved in a merger, financing, acquisition, or similar business transaction.",
      "We may also disclose information when we believe it is necessary to protect the rights, property, safety, or security of DRE Systems LLC, DRE Cal, our users, or others.",
    ],
  },
  {
    title: "Data Retention and Security",
    body: [
      "We retain personal information for as long as needed to provide DRE Cal, comply with legal obligations, resolve disputes, enforce agreements, maintain security, and support legitimate business purposes.",
      "We use reasonable administrative, technical, and organizational measures to protect information. No method of transmission or storage is completely secure, so we cannot guarantee absolute security.",
    ],
  },
  {
    title: "International Transfers",
    body: [
      "DRE Systems LLC is a Delaware limited liability company. Your information may be processed in the United States and other countries where we or our service providers operate. Those countries may have data protection laws different from your location.",
    ],
  },
  {
    title: "Your Rights",
    body: [
      "Depending on where you live, you may have rights to access, correct, delete, export, restrict, or object to certain processing of your personal information. You may also have the right to withdraw consent where processing is based on consent.",
      "To make a privacy request, contact support@cal.dre.app. We may need to verify your identity before completing a request.",
    ],
  },
  {
    title: "Children",
    body: [
      "DRE Cal is not intended for children under 18. We do not knowingly collect personal information from children under 18.",
    ],
  },
  {
    title: "Changes",
    body: [
      "We may update this Privacy Policy from time to time. Changes are effective when posted on this page, unless a later effective date is stated.",
    ],
  },
];

function PrivacyPage(): ReactElement {
  return (
    <main className="min-h-screen bg-default px-6 py-12 text-emphasis sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-subtle hover:text-emphasis">
          DRE Cal
        </Link>
        <header className="mt-8 border-subtle border-b pb-8">
          <h1 className="font-cal text-4xl text-emphasis">Privacy Policy</h1>
          <p className="mt-3 text-sm text-subtle">Last updated: July 10, 2026</p>
          <p className="mt-6 text-base text-default leading-7">
            This Privacy Policy explains how DRE Systems LLC collects, uses, shares, and protects information
            when you use DRE Cal at cal.dre.app and related services.
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
              If you have questions about this Privacy Policy or want to exercise privacy rights, contact us
              at{" "}
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

export { metadata, PrivacyPage as default };
