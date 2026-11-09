# IELTS Guru

An independent IELTS preparation website built with React, Vite, Express and PostgreSQL.

## Current foundation
- Responsive learner-facing website with Listening, Reading, Writing and Speaking practice areas.
- AI-assisted feedback endpoint for written/text responses when an OpenAI API key is configured.
- PostgreSQL tables for editable subscription plans and practice attempts.
- Admin plan-update API protected by the `ADMIN_SECRET` environment variable.
- Render Blueprint for a web service and managed PostgreSQL database.

## Run locally
1. Install Node.js 20 or newer.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and add your keys.
4. Run `npm run dev` for the frontend. Run `npm start` for the Express server after building with `npm run build`.

## Deploy to Render
1. In Render, choose **New → Blueprint** and select this repository.
2. Review the resources and costs before applying. The current Blueprint uses Free plans for initial testing.
3. Add `OPENAI_API_KEY` and any required secrets in the Render environment settings.
4. Deploy and check `/api/health`.

**Database warning:** Render Free Postgres expires 30 days after creation and has no backups. It is for testing only; upgrade to a paid database before storing real learner or payment data. Free web services may spin down when idle.

## Important product and safety notes
- IELTS Guru is an independent preparation platform, not an official IELTS examination service.
- AI-generated bands are practice estimates, not official IELTS scores.
- Text-only speaking feedback cannot reliably assess pronunciation or spoken fluency.
- Listening and Reading need properly authored questions, audio, answer keys and validated scoring before they can simulate a full exam.
- Do not collect real payments or sensitive learner data until authentication, payment verification/webhooks, privacy controls, security review and backups are implemented.

## Remaining product work
- Full IELTS exam flows with timers, navigation, autosave, audio player and validated answer keys.
- Speaking audio capture and assessment.
- Automated tests, production monitoring and security review.


## Required production environment variables
- `RESEND_API_KEY`: Resend API key for account verification email.
- `MAIL_FROM`: sender address on a domain verified with Resend.
- `APP_URL`: public website origin, exactly `https://ielts-guru.onrender.com` for the current site (no trailing slash).

### Set up email verification with Resend
1. Create/sign in to a Resend account and add a domain you control.
2. Add the DNS records Resend provides to your domain provider, then wait until Resend marks the domain as verified. A sender address on an unverified domain will be rejected.
3. Create a Resend API key and add it to Render as `RESEND_API_KEY`.
4. Set `MAIL_FROM` to a sender on that verified domain, for example `IELTS Guru <no-reply@mail.yourdomain.com>`; replace the example with your own verified domain.
5. Set `APP_URL` to `https://ielts-guru.onrender.com` (no trailing slash), then save the environment changes and redeploy the web service.
6. Test registration with an email address you can access. Check Inbox and Spam. Verification links expire after 30 minutes; use **Resend verification email** to request another link.

Registration now keeps a newly created account in an unverified state if email delivery is temporarily unavailable, instead of deleting the account. Learners still cannot sign in or start the trial until they verify their email. This avoids weakening account security; the administrator must still configure a working verified sender before verification emails can be delivered.
- `FLW_SECRET_KEY`: Flutterwave secret key (use test credentials before going live).
- `FLW_WEBHOOK_HASH`: webhook secret hash configured in the Flutterwave dashboard.
- `ADMIN_SECRET`: long random secret for administrator plan management.

Flutterwave webhook URL: `https://ielts-guru.onrender.com/api/payments/webhook`. Set its webhook secret hash to the same value as `FLW_WEBHOOK_HASH`. Checkout currently charges in NGN. Membership activation requires server-side transaction verification.
