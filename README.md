# IELTS Learning Centre

Browser-based IELTS preparation website with a React learner interface, Express API, PostgreSQL database, AI-assisted practice assessment, and editable subscription plans.

## Deployment

This repository includes a Render Blueprint (`render.yaml`). The application source is packaged in `ielts-app.zip`; Render extracts it during the build. The Blueprint provisions a Node web service and managed PostgreSQL database.

Before launch, configure the OpenAI and Flutterwave server-side secrets in Render, apply `ielts-standard-app/server/db/schema.sql` to the database, create an administrator account, and test payments with Flutterwave test credentials.

This is an IELTS preparation platform, not an official IELTS examination product. AI bands are practice estimates. See the application README for current feature limitations and setup details.
