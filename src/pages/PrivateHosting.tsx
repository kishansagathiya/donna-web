import { useEffect } from "react";
import "./Pages.css";

export function PrivateHosting() {
  useEffect(() => {
    document.title = "Private — Donna";
  }, []);

  return (
    <div className="doc-page">
      <article className="doc">
        <h1>Private Hosted Donna</h1>
        <p className="doc-updated">Premium · A dedicated instance, just for you</p>

        <p>
          Donna is your AI second brain — which means it holds some of your most
          sensitive material: conversations, memories, notes, links, and
          documents. Private Hosted Donna gives you a dedicated instance of
          Donna: your own server and your own database, isolated from every
          other user.
        </p>

        <h2>Your data, isolated</h2>
        <p>
          On standard Donna, all users share one deployment and your data is
          kept separate by software. With Private Hosted Donna, that separation
          is the infrastructure itself:
        </p>
        <ul>
          <li>
            <strong>Dedicated server.</strong> Your Donna instance runs on
            infrastructure that no other Donna user touches.
          </li>
          <li>
            <strong>Dedicated database.</strong> Your conversations, memories,
            and files live in a database of your own &mdash; never co-located
            with anyone else&apos;s data.
          </li>
          <li>
            <strong>Deletion on request.</strong> Because everything sits on
            your dedicated instance, deleting your data is final and complete.
          </li>
        </ul>
        <p>
          As always: no advertising, no selling your data, no tracking you
          across other apps and websites.
        </p>

        <h2>What&apos;s included</h2>
        <ul>
          <li>A dedicated Donna server instance and dedicated database</li>
          <li>The same Donna experience on iPhone, iPad, and the web</li>
          <li>White-glove onboarding and migration of your existing memories</li>
          <li>Priority support, directly from the team that builds Donna</li>
        </ul>

        <h2>Standard vs. Private Hosted</h2>
        <table>
          <tr>
            <th></th>
            <th>Standard</th>
            <th>Private Hosted</th>
          </tr>
          <tr>
            <td>Infrastructure</td>
            <td>Shared multi-tenant deployment</td>
            <td>Dedicated instance, just for you</td>
          </tr>
          <tr>
            <td>Database</td>
            <td>Shared, logically separated per user</td>
            <td>Dedicated database</td>
          </tr>
          <tr>
            <td>Onboarding</td>
            <td>Self-serve</td>
            <td>White-glove, with migration</td>
          </tr>
          <tr>
            <td>Support</td>
            <td>Standard</td>
            <td>Priority</td>
          </tr>
        </table>

        <h2>Who it&apos;s for</h2>
        <p>
          Private Hosted Donna is built for people whose Donna holds material
          they need the strongest possible guarantee around &mdash; founders in
          live deals, executives working with board material, investors,
          lawyers, doctors, or anyone who simply wants their second brain on
          infrastructure of their own.
        </p>
        <p>
          Want to understand exactly where your data goes? Ask us &mdash;
          we&apos;ll walk you through the full data flow of your instance before
          you commit.
        </p>

        <div className="support-card">
          <h2>Get started</h2>
          <p>
            Private Hosted Donna is a premium plan, set up personally for you.
            Tell us what you need and we&apos;ll walk you through the details,
            migration, and pricing.
          </p>
          <a
            className="support-email"
            href="mailto:kishansagathiya@gmail.com"
          >
            kishansagathiya@gmail.com
          </a>
        </div>
      </article>
    </div>
  );
}
