export const TERMS_OF_SERVICE = `
## 1. Eligibility & Accounts
You must be at least 18 years old (or the age of majority in your jurisdiction) to use TailoredAd.
You are responsible for activity under your account and for keeping your credentials confidential.

## 2. Acceptable Use
You agree to use the Service only for lawful purposes. You will not:
- Generate or attempt to generate sexually explicit content, hate speech, or violent extremist material.
- Create face swaps, deepfakes, or any likeness of a real person other than yourself.
- Upload photos you do not own or do not have the rights to use for AI generation.
- Infringe intellectual property, privacy, or publicity rights of others.
- Reverse engineer, scrape, resell, or abuse our APIs, or circumvent usage limits.

We may suspend or terminate accounts that violate these rules, without prior notice.

## 3. Your Content & Generated Images
**Your inputs:** You retain ownership of the photos and notes you upload. You represent that you
own them or hold the rights to use them for AI ad generation, and that no other person's likeness,
trademark, or copyrighted work is included without permission.
**Generated images:** You own the finished ad images generated for your account and may use them
commercially, including in paid advertising.
**Our license:** You grant us a non-exclusive, worldwide license to store and process your content
solely to operate, improve, debug, and protect the Service (including abuse and NSFW filtering).

## 4. Credits, Subscriptions & Billing
- **Image credits:** You pay for finished images, not downloads. Failed or retried generations are free.
  Unused images never expire and remain usable after cancellation.
- **Free trial:** 10 images, once per user, no card required. Trial images carry no cash value.
- **Subscriptions:** Plans renew monthly. You may cancel anytime; cancellation takes effect at the end
  of the current billing cycle and your remaining images stay usable.
- **Prices:** Shown at checkout in USD. Payments are processed by our merchant of record, named at checkout.
- **Refunds:** See our [Refund Policy](/legal/refunds). Refunded images are revoked from your balance.

## 5. Disclaimer of Warranties
The Service is provided "AS IS" without warranties of any kind. We do not guarantee that AI-generated
content will be accurate, unique, or suitable for any particular purpose. We may modify, limit, or
discontinue features at any time.

## 6. Limitation of Liability & Indemnification
**Limitation:** To the maximum extent permitted by law, TailoredAd shall not be liable for any indirect,
incidental, or consequential damages (including loss of data or profits).
**Indemnification:** You agree to indemnify and hold harmless TailoredAd and its operators from claims,
damages, or legal fees arising from your uploaded content, your use of generated images, or your
violation of these Terms.

## 7. Termination
We may suspend or terminate your account and access immediately, without prior notice or liability,
for breach of these Terms, fraud, abuse, or legal requirement. Upon termination, your right to use
the Service ceases. Unused image rights for paid cycles are handled under the Refund Policy.

## 8. Modifications to Service
We may modify, suspend, or discontinue the Service (or any part thereof) at any time, with or without notice.

## 9. Force Majeure
We are not responsible for delays or failures caused by events beyond our reasonable control, including
natural disasters, war, strikes, or infrastructure and upstream API outages.

## 10. Governing Law & Jurisdiction
These Terms are governed by the laws of the **Republic of Korea**, without regard to
conflict of law principles. Suits arising from these Terms or the Service shall be brought exclusively
in the **Seoul Central District Court**. Mandatory consumer protections of your country of residence,
where applicable, remain unaffected.
`;

export const PRIVACY_POLICY = `
## 1. Introduction
TailoredAd ("we", "us", or "our") respects your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our website and AI ad-generation service.

## 2. Information We Collect
- **Account Data:** Email address, name, and profile picture (via OAuth providers).
- **Uploaded Photos & Notes:** Product and portrait photos you upload, plus the text notes you attach to them.
  These are processed to generate your ad images. Do not upload photos of other people, and avoid entering
  sensitive personal information (financial data, health records, ID numbers) into note fields.
- **Usage Data:** Generation history, interaction logs, and image counts. Technical data such as IP address
  and browser type is collected automatically by our infrastructure for security purposes.
- **Payment Data:** We do not store credit card details. All payments are processed by our merchant of record,
  named at checkout.

## 3. How We Use Your Information
- To provide and operate the Service (including generating your ad images).
- To detect and prevent fraud or abuse (including NSFW and prohibited-content filtering).
- To manage credits, subscriptions, and billing status.
- To communicate with you regarding updates, support, and invoices.

## 4. Data Sharing & Third-Party Sub-processors
- **Image generation:** [Replicate](https://replicate.com/) (USA) — your uploaded photos and generation prompts
  are sent to Replicate-hosted models. OAuth account data (email, name, profile picture) is never sent there.
- **Text AI:** [OpenRouter LLC](https://openrouter.ai/) (USA) — creative copy and prompt text only. No photos,
  no account data.
- **Hosting & database:** [Cloudflare](https://www.cloudflare.com/), [Supabase](https://supabase.com/).
- **Payments:** our merchant of record, named at checkout. Card data never touches our servers.

**International Transfers:** By using the Service, you acknowledge that your data may be transferred to and
processed in the **United States**. We rely on standard contractual clauses (SCCs) or adequacy decisions
where applicable.

## 5. Cookies and Tracking Technologies
We use cookies and similar technologies to keep you signed in and to understand aggregate usage.
You can instruct your browser to refuse cookies, but parts of the Service may stop working.

## 6. Data Security
We use industry-standard measures (TLS encryption, access-controlled databases) to protect your information.
No method of Internet transmission is 100% secure.

## 7. Data Retention & Deletion
We retain your account data, uploads, and generated images while your account is active. You may request
deletion of your personal data at any time (see §8); we delete it within 30 days unless retention is
required by law (e.g., tax records) or needed to resolve disputes.

## 8. User Rights (GDPR & CCPA)
Depending on your location, you may have rights to access, rectify, or delete your personal data.
To exercise them, contact [support@tailoredad.com](mailto:support@tailoredad.com). We respond within 30 days.

## 9. Children's Privacy
Our Service is not intended for children under 16 (or 13 where applicable). We do not knowingly collect
their personal information. Accounts found to belong to children will be removed.

## 10. Changes to This Privacy Policy
We may update this policy from time to time by posting the new version on this page. Material changes
will be announced in advance where required by law.

## 11. Contact Us
Questions about this policy: [support@tailoredad.com](mailto:support@tailoredad.com)
`;

export const REFUND_POLICY = `
## 1. Cancel Anytime
You may cancel your subscription at any time from your Profile page. Cancellation takes effect at the end
of the current billing cycle. Your remaining images stay usable after cancellation — they never expire.

## 2. Pro-Rata Refunds (7 Days, Unused Images Only)
Within 7 days of a cycle charge, you may request a refund for the unused portion of that cycle:
- **Refund amount** = (unused images, capped at the cycle grant) / (cycle grant) x cycle price.
  Example: Pro ($99 / 1,000 images), 500 used → 500 unused → $49.50 refunded.
- **Used images are non-refundable.** Only images you have not generated count.
- **Oldest images count as used first.** If you carry rolled-over balance, usage is attributed to the
  oldest grants first; the current cycle is refunded last.
- **Free trial images carry no cash value** and are never refundable.
- After 7 days from the charge, that cycle is non-refundable.

## 3. Effect of a Refund
Refunded images are revoked from your balance immediately when the refund is issued. If revocation would
drive your balance below zero (images already spent), no additional charge applies — the refund is simply
limited to the unused portion above.

## 4. Method & Timing
Refunds go to the original payment method via our payment provider and can take up to 10 business days
to appear on your statement. Partial refunds are supported: you receive exactly the computed amount.

## 5. How to Request
Email [support@tailoredad.com](mailto:support@tailoredad.com) from your account email with the subject
"Refund request". Include the charge date if you have it. We process valid requests within 5 business days.

## 6. Chargebacks & Abuse
Contact us first — most billing issues are resolved faster that way. Chargebacks filed while a valid refund
request is pending, or repeated refund-then-repurchase patterns, may lead to account suspension.

## 7. Statutory Rights
Nothing in this policy limits consumer rights granted by applicable law.
`;
