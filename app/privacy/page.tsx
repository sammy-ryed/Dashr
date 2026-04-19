'use client';
import Link from 'next/link';
import Nav from '@/components/Nav';
import MarqueeBar from '@/components/MarqueeBar';

export default function PrivacyPage() {
  return (
    <>
      <Nav isLoading={false} />
      <MarqueeBar />
      <div className="legal-page page-enter">
        <h1>Privacy <span>Policy</span></h1>
        <span className="legal-last-updated">Last updated: April 2026 · Version 1.0</span>

        <h2>1. What We Collect</h2>
        <p>When you use DASHR, we collect the following information:</p>
        <ul>
          <li><strong>Account info:</strong> Name, email address, phone number.</li>
          <li><strong>Dasher verification:</strong> SRM registration ID, ID card photo (for identity verification).</li>
          <li><strong>Order data:</strong> Item descriptions, pickup/delivery locations, order values, commissions.</li>
          <li><strong>Ratings &amp; reports:</strong> Ratings you give and receive, report submissions.</li>
          <li><strong>Usage data:</strong> Login timestamps, session activity, online/offline status.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li><strong>Provide the service:</strong> Match orders with Dashers, facilitate delivery coordination.</li>
          <li><strong>Communication:</strong> Send order updates, notifications, and verification emails.</li>
          <li><strong>Safety:</strong> Verify identities, detect fraud, enforce community guidelines.</li>
          <li><strong>Improvement:</strong> Analyze usage patterns to improve the platform (anonymized).</li>
        </ul>

        <h2>3. Phone Number Sharing</h2>
        <p>
          When a Dasher accepts your order, your phone number is shared with them so they can contact you
          directly about the delivery. This enables fast, personal coordination — no waiting for messages to
          relay through a system.
        </p>
        <p>
          Similarly, the Dasher&apos;s phone number may be visible to you for order coordination.
          Phone numbers should only be used for order-related communication. Misuse is a violation of our
          terms and will result in account action.
        </p>

        <h2>4. Data Storage &amp; Security</h2>
        <ul>
          <li>Data is stored securely using <strong>Supabase</strong> (hosted on AWS infrastructure).</li>
          <li>All data transmission is encrypted via HTTPS/TLS.</li>
          <li>Passwords are hashed and never stored in plaintext.</li>
          <li>ID card images are stored in a private bucket with restricted access.</li>
          <li>Report evidence is stored in a separate, admin-only-access bucket.</li>
        </ul>

        <h2>5. Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul>
          <li><strong>Supabase:</strong> Database, authentication, file storage.</li>
          <li><strong>Brevo (Sendinblue):</strong> Transactional emails (OTP codes, order notifications).</li>
          <li><strong>Vercel:</strong> Application hosting and deployment.</li>
        </ul>
        <p>These services have their own privacy policies and data handling practices.</p>

        <h2>6. Data Retention</h2>
        <ul>
          <li>Account data is retained as long as your account is active.</li>
          <li>Order history is retained for 12 months after completion.</li>
          <li>Deleted accounts: personal data is removed within 30 days; anonymized analytics may persist.</li>
          <li>Moderation records (reports, bans) are retained for safety purposes.</li>
        </ul>

        <h2>7. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you.</li>
          <li>Request correction of inaccurate data.</li>
          <li>Request deletion of your account and associated data.</li>
          <li>Opt out of non-essential emails.</li>
        </ul>
        <p>To exercise these rights, contact the DASHR admin team through the platform.</p>

        <h2>8. Cookies &amp; Local Storage</h2>
        <p>
          DASHR uses browser local storage (not cookies) to manage your session and preferences.
          This includes session timestamps and activity tracking for auto-logout functionality.
          No third-party tracking cookies are used.
        </p>

        <h2>9. Changes to This Policy</h2>
        <p>
          We may update this privacy policy periodically. The version number and date at the top indicate
          the latest revision. Continued use of DASHR after changes constitutes acceptance.
        </p>

        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '0.12rem solid #2a2a2a' }}>
          <div className="nav-legal-links">
            <Link href="/terms">Terms of Service</Link>
            <Link href="/refund-policy">Refund Policy</Link>
            <Link href="/order">Back to DASHR</Link>
          </div>
        </div>
      </div>
    </>
  );
}
