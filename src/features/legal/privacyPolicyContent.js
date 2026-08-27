/**
 * In-app copy of the privacy policy.
 *
 * Play Store wants the policy reachable from inside the app as well as at a
 * public URL. Kept as structured data rather than a WebView so it renders
 * offline and needs no network permission.
 *
 * KEEP IN SYNC with PRIVACY_POLICY.md in the backend repo, and replace the
 * placeholders in both before publishing.
 */
export const PRIVACY_POLICY_URL = 'https://example.com/privacy';

export const PRIVACY_LAST_UPDATED = '27 August 2026';

export const PRIVACY_SECTIONS = [
  {
    title: 'Who this covers',
    body:
      'Shop owners sign in and hold an account. Customers do not — their details are entered by the shop owner. If you are a shop owner, you are responsible for the customer information you record, and you should tell your customers you keep a record of their purchases and balances.',
  },
  {
    title: 'What we collect',
    bullets: [
      'Your account: name, email, phone, and a bcrypt hash of your password — never the password itself.',
      'Your business details: name, address, contact email and numbers, registration number. These print on the bills you give customers.',
      'Your customers: name and phone number.',
      'Your bills: item, quantity, rate, total, amount paid, outstanding balance, and payment method.',
      'Proof of payment: transaction reference or cheque number, and any screenshot or cheque image you attach.',
    ],
  },
  {
    title: 'What we do NOT collect',
    bullets: [
      'No analytics, advertising SDKs, or tracking libraries.',
      'No location, contacts, calendar, or microphone access.',
      'No scanning of your photo library — only the single image you pick.',
    ],
  },
  {
    title: 'Camera and photos',
    body:
      'The camera is used only when you tap "Take photo", and the photo library only when you tap "Choose from gallery". Both are requested at that moment, never on launch. Declining leaves the rest of the app fully usable — you just cannot attach an image.',
  },
  {
    title: 'How it is protected',
    bullets: [
      'Passwords are hashed with bcrypt and cannot be read by anyone, including us.',
      'Your session token is held in the device secure store (iOS Keychain / Android Keystore).',
      'Payment images are served only through an authenticated endpoint that checks you own the bill.',
      'Each shop owner is isolated — no owner can read another owner’s customers, bills, or images.',
    ],
  },
  {
    title: 'Who we share it with',
    body:
      'We do not sell your data, share it with advertisers, or share it with data brokers. It reaches only our hosting provider, anyone you personally send a bill or PDF to, and law enforcement where legally required.',
  },
  {
    title: 'Your rights',
    body:
      'You can ask us to access, correct, export, or delete your data, including your whole account. We aim to respond within 30 days. Bills are business records and are not deleted automatically, since many jurisdictions require them to be retained.',
  },
];
