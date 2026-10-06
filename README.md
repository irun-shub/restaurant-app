# Restaurant QR Menu + UPI Ordering

Customer: scan QR -> menu -> add items -> order number (#101, #102 ...) -> "Pay now with UPI".
Owner: /admin -> edit menu any time, and confirm payments.

## 1. Create the database (5 min)
1. Create a free project at https://supabase.com
2. SQL Editor: paste all of `supabase/schema.sql` and Run.
3. Authentication > Users > Add user: this email + password is your /admin login.
   Then Authentication > Sign In / Providers > Email: turn OFF "Allow new users to sign up".
4. Project Settings > API: copy the Project URL and the anon public key.

## 2. Configure
```
cp .env.local.example .env.local
```
Fill in the Supabase URL/key, your UPI ID (NEXT_PUBLIC_UPI_ID), and your restaurant name.

## 3. Run
```
npm install
npm run dev
```
- Customers:  http://localhost:3000
- Owner:      http://localhost:3000/admin
(The UPI button only works on a phone with a UPI app installed.)

## 4. Deploy (free)
Push to GitHub, import on https://vercel.com, add the same environment variables, deploy.
Make the QR code from the home-page URL (not /admin). Use a custom domain if possible,
so the printed QR never has to change.

## How payment confirmation works
UPI deep links open the customer's UPI app, but the website is never told whether the payment
succeeded. So: the customer taps "I have paid", the order shows as "Customer says paid" in
/admin > Orders & payments, you check your UPI app history for the matching amount and note
"Order <number>", and tap "Confirm payment". Never confirm from the customer's screen alone.

https://wspuceaseuhubsgtxmyl.supabase.co/rest/v1/
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzcHVjZWFzZXVodWJzZ3R4bXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNDU2NDQsImV4cCI6MjEwNjYyMTY0NH0._nn2Kf0gFIJhzC7irz1f2SUedh7le8HNr4UgvDiqwQE
wspuceaseuhubsgtxmyl