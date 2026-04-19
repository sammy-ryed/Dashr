'use client';
import Link from 'next/link';
import Nav from '@/components/Nav';
import MarqueeBar from '@/components/MarqueeBar';

export default function RefundPolicyPage() {
  return (
    <>
      <Nav isLoading={false} />
      <MarqueeBar />
      <div className="legal-page page-enter">
        <h1>Refund &amp; Dispute <span>Policy</span></h1>
        <span className="legal-last-updated">Last updated: April 2026 · Version 1.0</span>

        <h2>1. How Payments Work on DASHR</h2>
        <p>
          DASHR is a peer-to-peer platform. All payments happen <strong>directly between the Customer and the Dasher</strong> at
          the time of delivery. DASHR does not collect, hold, or process payments. There is no payment gateway involved.
        </p>
        <p>
          This means refund disputes are primarily between you and the other party. However, DASHR provides
          a reporting system and moderation team to help resolve issues.
        </p>

        <h2>2. When You Can Raise a Dispute</h2>
        <ul>
          <li>Your order was picked up but never delivered.</li>
          <li>The wrong items were delivered.</li>
          <li>Items were damaged, tampered with, or opened.</li>
          <li>The Dasher charged more than the agreed order value.</li>
          <li>The Customer refused to pay after delivery.</li>
          <li>Any form of scam or fraudulent behavior.</li>
        </ul>

        <h2>3. How to Report a Dispute</h2>
        <ol>
          <li>Go to your completed/cancelled order.</li>
          <li>Click <strong>&quot;Report an Issue&quot;</strong> on the order page.</li>
          <li>Select the reason that best describes the problem.</li>
          <li>Add details about what happened.</li>
          <li>Submit. Our moderation team will review within 1–3 days.</li>
        </ol>

        <h2>4. What Happens After You Report</h2>
        <ul>
          <li><strong>Review:</strong> Our moderation team reviews the report and may contact both parties.</li>
          <li><strong>Action:</strong> Depending on severity — warnings, strikes, temporary suspension, or permanent ban.</li>
          <li><strong>Resolution:</strong> We&apos;ll update you on the outcome via notification.</li>
        </ul>

        <h2>5. Refunds</h2>
        <p>
          Since payments are on-the-spot and peer-to-peer, DASHR cannot issue refunds directly.
          If a dispute is resolved in your favor:
        </p>
        <ul>
          <li>The other party may be asked to make it right (return payment, deliver correct items).</li>
          <li>If they refuse or are unreachable, enforcement action will be taken on their account.</li>
          <li>For significant financial disputes, we recommend resolving through your institution&apos;s student affairs office.</li>
        </ul>

        <h2>6. Cancellations</h2>
        <ul>
          <li><strong>Before acceptance:</strong> Customers can cancel freely with no penalty.</li>
          <li><strong>After acceptance:</strong> Cancellation may result in a strike depending on circumstances.</li>
          <li>Repeated cancellations (3+ in 24 hours) trigger a temporary cooldown on order placement.</li>
        </ul>

        <h2>7. Fraud Protection</h2>
        <p>
          DASHR monitors for patterns of abuse including repeated fake orders, cancel-after-accept patterns,
          and report manipulation. Users engaging in fraud will be permanently banned without appeal eligibility.
        </p>

        <h2>8. Limitations</h2>
        <p>
          DASHR is a student volunteer project. We do our best to mediate disputes fairly, but we cannot
          guarantee financial recovery. We strongly recommend only ordering items you can afford to lose
          and only accepting deliveries you can fulfill.
        </p>

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '0.12rem solid #2a2a2a' }}>
          <div className="nav-legal-links">
            <Link href="/terms">Terms of Service</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/order">Back to DASHR</Link>
          </div>
        </div>
      </div>
    </>
  );
}
