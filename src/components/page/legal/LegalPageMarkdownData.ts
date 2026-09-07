export const TERMS_OF_SERVICE = `
## 1. Eligibility & Prohibition of Use (CRITICAL)
**BY USING THIS SERVICE, YOU REPRESENT THAT YOU ARE NOT A RESIDENT OF THE REPUBLIC OF KOREA.**
Access to TailorAd is strictly prohibited for users located in or strictly subject to the laws of the Republic of Korea. If you access the Service from Korea via VPN or other means, you do so in violation of these Terms, and we assume no liability for compliance with Korean local laws.

## 2. Use of Services
You agree to use our services only for lawful purposes. You represent and warrant that you will not use the service to:
- Generate deepfakes, sexually explicit content, or hate speech.
- Infringe upon the intellectual property or privacy rights of others.
- Reverse engineer, scrape, or exploit our API and resources.

## 3. User Representations & Data Restrictions
**Prohibition on Sensitive Data:** You agree NOT to input, upload, or process any sensitive personal information (including but not limited to financial data, health records, social security numbers, or private contact details) into the AI generation prompts or script fields.
**Unsolicited Data Disclaimer:** The "Generate Script with AI" feature is designed solely for creative content generation. If you voluntarily input any personally identifiable information (PII) into these fields, **you acknowledge that such data is processed at your own risk**, and TailorAd disclaims any liability for the privacy or security of such unsolicited PII.

## 4. Intellectual Property
**Your Content:** You retain ownership of the videos you create. You represent that you have the necessary rights to the input media you provide.
**Our Rights:** You grant us a non-exclusive, worldwide license to use your generated content solely for the purpose of operating, improving, and debugging our services.

## 5. Payment, Fees & No Refunds (EU Waiver)
**Immediate Performance:** By clicking "Subscribe" or "Generate", you expressly request that the Service begins immediately.
**Waiver of Withdrawal Right:** IF YOU ARE A CONSUMER IN THE EU/UK, YOU ACKNOWLEDGE THAT YOU LOSE YOUR RIGHT OF WITHDRAWAL (14-DAY COOLING-OFF PERIOD) ONCE THE SERVICE HAS STARTED (I.E., THE GENERATION PROCESS BEGINS).
**No Refunds:** Due to the resource-intensive nature of AI video generation (GPU costs incurred immediately via API key usage initiated via your own credentials for Fal.ai), **we strictly do not offer refunds** once credits have been used or a subscription period has started.
**BYOK (Bring Your Own Key) Responsibility:** If you configure and use your own Fal.ai API key (BYOK), all charges, usage limits, and billing disputes related to that API key are solely your responsibility. TailorAd disclaims any liability for financial damages, unexpected costs, or service disruptions arising from the use of your own API key.

## 6. Disclaimer of Warranties
The service is provided "AS IS" without warranties of any kind. We do not guarantee that AI-generated content will be accurate, unique, or suitable for your specific needs.
**Free AI Features:** The "Generate Script with AI" feature is provided as a free, beta-test functionality. We reserve the right to modify, limit, or discontinue this feature at any time without liability. **We explicitly disclaim any responsibility for the confidentiality of data entered into this free feature.**

## 7. Limitation of Liability & Indemnification
**Limitation:** To the maximum extent permitted by law, TailorAd shall not be liable for any indirect, incidental, or consequential damages (including loss of data or profits).
**Indemnification:** You agree to indemnify and hold harmless TailorAd and its operators from any claims, damages, or legal fees arising from **your use of the generated content** or your violation of these Terms.

## 8. Termination
We reserve the right to **suspend or terminate your account and access** to the service immediately, without prior notice or liability, **for breach of these Terms, fraud, or legal requirement**.
Upon termination, your right to use the service will immediately cease.

## 9. Modifications to Service
We reserve the right to modify, suspend, or discontinue the service (or any part thereof) at any time with or without notice.

## 10. Force Majeure
We shall not be held responsible for any delay or failure in performance caused by events beyond our reasonable control, including but not limited to acts of God, war, strikes, or **infrastructure and upstream API outages (for example, [Cloudflare](https://www.cloudflare.com/) downtime)**.

## 11. Governing Law & Jurisdiction
**Governing Law:** These Terms shall be governed by and construed in accordance with the laws of the **State of Delaware, United States**, without regard to its conflict of law principles.
**Jurisdiction:** Any legal suit, action, or proceeding arising out of, or related to, these Terms or the Service shall be instituted exclusively in the federal or state courts located in the **State of Delaware**. You waive any and all objections to the exercise of jurisdiction over you by such courts and to venue in such courts.
**Arbitration:** At our sole discretion, we may require you to submit any disputes arising from the use of these Terms or the Service, including disputes arising from or concerning their interpretation, violation, invalidity, non-performance, or termination, to final and binding arbitration under the Rules of Arbitration of the American Arbitration Association applying Delaware law.
`;

export const PRIVACY_POLICY = `
## 1. Introduction
TailorAd ("we", "us", or "our") respects your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you visit our website.

## 2. Information We Collect
- **Account Data:** Email address, name, and profile picture (via OAuth providers).
- **Usage Data:** User-provided prompts (text entered directly by you into script or generation fields, not derived from your OAuth account data), generated video metadata, and interaction logs. Technical data such as IP address and browser type is automatically collected by our infrastructure providers for security and analytics purposes.
- **User-Provided API Keys (BYOK):** If you opt to use your own Fal.ai API key, we securely store your encrypted API key for the sole purpose of proxying and authenticating your generation requests to Fal.ai.
- **Payment Data:** We do not store credit card details. All financial transactions are processed by our secure payment provider, Polar (or Stripe).

## 3. How We Use Your Information
- To provide, operate, and maintain our AI video generation services.
- To improve, personalize, and expand our website.
- To detect and prevent fraud or abuse (e.g., NSFW content filtering).
- To communicate with you regarding updates, support, and invoices.

## 4. Data Sharing & Third-Party Sub-processors
We utilize industry-leading AI infrastructure providers to generate content. Your input data is processed by the following entities:
- **AI Infrastructure (Platform-provided)**
  - **Text** (for script generation & LLM routing)
    - [OpenRouter LLC](https://openrouter.ai/) (USA) — Only user-provided script content entered directly into generation fields is transmitted. Account data obtained via OAuth (such as email address, name, or profile picture) is never sent to OpenRouter or any other AI infrastructure provider.
- **AI Infrastructure (User-directed / BYOK)**
  - **Video/Image** (for media generation)
    - [fal.ai](https://fal.ai) (USA) — Processed using user-provided API keys (BYOK). When utilizing Fal.ai models, you are executing generations using your own API credentials, and TailorAd acts as a proxy for these requests.
- **Infrastructure** (for hosting and database)
  - [Vercel](https://vercel.com/home)
  - [Cloudflare](https://www.cloudflare.com/)
  - [Supabase](https://supabase.com/)
- **Payments** (for processing payments)
  - [Polar](https://polar.sh/)
  - [Stripe](https://stripe.com/)

**International Transfers:** By using the Service, you acknowledge that your data may be transferred to and processed in the **United States**. We rely on standard contractual clauses (SCCs) or adequacy decisions where applicable to ensure data protection.

## 5. Cookies and Tracking Technologies
We use cookies and similar tracking technologies to track the activity on our service and hold certain information. You can instruct your browser to refuse all cookies.

## 6. Data Security
We implement industry-standard security measures (SSL encryption, secure databases) to protect your personal information. However, no method of transmission over the Internet is 100% secure.

## 7. User Rights (GDPR & CCPA)
Depending on your location, you may have rights to Access, Rectification, or Deletion of your personal data. To exercise these rights, please contact us at [support@tailoredad.com]. We will respond to your request within 30 days.

## 8. Children's Privacy
Our service is not intended for use by children under the age of **16 (or 13 where applicable)**. We do not knowingly collect personal information from children.

## 9. Changes to This Privacy Policy
We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.

## 10. Contact Us
If you have any questions about this Privacy Policy, please contact us at:
- **Email:** [support@tailoredad.com](mailto:support@tailoredad.com)
`;
