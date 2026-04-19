'use client';
import Link from 'next/link';
import Nav from '@/components/Nav';
import MarqueeBar from '@/components/MarqueeBar';

export default function TermsPage() {
  return (
    <>
      <Nav isLoading={false} />
      <MarqueeBar />
      <div className="legal-page page-enter">
        <h1>Terms of <span>Service</span></h1>
        <span className="legal-last-updated">Last updated: April 2026 · Version 1.0</span>

        <h2>1. About DASHR</h2>
        <p>
          DASHR is a peer-to-peer campus delivery platform operated by students of SRM Institute of Science and Technology.
          DASHR connects students who need items picked up and delivered (&quot;Customers&quot;) with fellow students who fulfill
          those deliveries (&quot;Dashers&quot;). DASHR is not a delivery company — we&apos;re a platform that facilitates connections.
        </p>

        <h2>2. Eligibility</h2>
        <ul>
          <li>You must be a currently enrolled student or staff member at SRM IST.</li>
          <li>You must be at least 18 years old.</li>
          <li>You must provide accurate information during registration.</li>
          <li>Dashers must complete identity verification before accepting deliveries.</li>
        </ul>

        <h2>3. Account Responsibilities</h2>
        <p>
          You are responsible for your account credentials and all activity under your account.
          You must not share your login with others. If you suspect unauthorized access, contact us immediately.
        </p>

        <h2>4. Payments &amp; Commissions</h2>
        <ul>
          <li>All payments between Customers and Dashers happen on-the-spot at delivery.</li>
          <li>DASHR does not handle, hold, or process payments directly.</li>
          <li>Commission amounts are set by the Customer at the time of order creation.</li>
          <li>Minimum commission floors exist per delivery zone and cannot be bypassed.</li>
          <li>Disputes about payment should first be resolved between the parties involved.</li>
        </ul>

        <h2>5. Dasher Responsibilities</h2>
        <ul>
          <li>Handle items with care during pickup and delivery.</li>
          <li>Deliver to the correct location within a reasonable time.</li>
          <li>Do not tamper with, consume, or open ordered items.</li>
          <li>Go offline when you are not available to accept deliveries.</li>
          <li>Maintain professional and respectful communication at all times.</li>
        </ul>

        <h2>6. Customer Responsibilities</h2>
        <ul>
          <li>Provide accurate delivery location and contact information.</li>
          <li>Be available at the delivery location when the Dasher arrives.</li>
          <li>Pay the agreed amount on delivery.</li>
          <li>Rate your experience honestly after delivery.</li>
        </ul>

        <h2>7. Prohibited Conduct</h2>
        <p>The following will result in strikes, suspension, or permanent ban:</p>
        <ul>
          <li>Placing fake orders or deliberately wasting a Dasher&apos;s time.</li>
          <li>Harassment, threats, or abusive behavior toward any user.</li>
          <li>Fraud, scams, or attempting to manipulate the payment system.</li>
          <li>Requesting delivery of prohibited or illegal items.</li>
          <li>Creating multiple accounts to evade a ban.</li>
          <li>Sharing another user&apos;s personal information without consent.</li>
        </ul>

        <h2>8. Account Suspension &amp; Bans</h2>
        <p>
          DASHR reserves the right to temporarily or permanently suspend accounts that violate these terms.
          Suspended users can submit one appeal per ban, which will be reviewed by our moderation team.
          Decisions on appeals are final.
        </p>

        <h2>9. Limitation of Liability</h2>
        <p>
          DASHR is a student-run platform. We provide the platform &quot;as is&quot; without warranties.
          We are not liable for lost, damaged, or incorrect orders. We are not responsible for interactions
          between users outside the platform. Use DASHR at your own risk.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We may update these terms from time to time. Continued use of DASHR after changes constitutes
          acceptance of the updated terms. Major changes will be communicated via notification.
        </p>

        <h2>11. Contact</h2>
        <p>Questions about these terms? Reach out to the DASHR admin team through the platform.</p>

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '0.12rem solid #2a2a2a' }}>
          <div className="nav-legal-links">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/refund-policy">Refund Policy</Link>
            <Link href="/order">Back to DASHR</Link>
          </div>
        </div>
      </div>
    </>
  );
}
