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

## Still to build
- Learner registration, secure sign-in, account dashboard and subscription entitlements.
- Full IELTS exam flows with timers, navigation, autosave, audio player and validated answer keys.
- Speaking audio capture and assessment.
- Flutterwave checkout and signed webhook verification.
- Admin dashboard UI for creating/editing packages and reviewing learners.
- Automated tests, production monitoring and security review.
