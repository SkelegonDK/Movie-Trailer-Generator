# Improvement Plan: Building a Modern SaaS with Clerk & Cloudflare

This document outlines a strategic plan to evolve the **Stupid Trailer Generator** from its current client-side prototype into a robust, scalable, and monetizable Software-as-a-Service (SaaS) application using a modern, highly-integrated technology stack.

The core of this transition involves moving all sensitive operations and AI logic to a secure backend, introducing user accounts with Clerk, and building a framework for billing with Stripe, all supported by Cloudflare's infrastructure.

---

## Phase 1: Foundational Backend & Security

**Objective:** Move all AI generation logic to the backend. This is the most critical step to protect API keys, control costs, and secure proprietary logic.

1.  **Transition to Backend API Routes:**
    -   Create dedicated Next.js API endpoints within `app/api/` for each core function:
        -   `POST /api/generate-title`
        -   `POST /api/generate-script`
        -   `POST /api/generate-poster-prompt`
        -   `POST /api/generate-poster-image`
        -   `POST /api/generate-voiceover`
    -   These endpoints will be responsible for calling the external services (OpenRouter, OpenAI, ElevenLabs).

2.  **Secure API Key Management:**
    -   Remove all API key handling from the client-side (`/keys` page, `sessionStorage`).
    -   Store all API keys securely as server-side environment variables (e.g., in `.env.local` for development and using Vercel/Netlify/Cloudflare environment variable management for production).

3.  **Refactor Frontend Logic:**
    -   Update the `lib/api-client.ts` and UI components to call our new internal API endpoints instead of the external services directly.
    -   The frontend will no longer need to know about the external API keys. It will simply send requests to our backend and receive the results.

---

## Phase 2: User Accounts & Persistence with Clerk & Cloudflare

**Objective:** Introduce user authentication and a database to store user data and their generated content, creating a persistent and personalized experience.

1.  **Integrate Authentication with Clerk:**
    -   Implement a full authentication solution using **Clerk**. It provides beautiful, pre-built UI components (`<SignInButton>`, `<UserProfile>`), handles multi-factor authentication, and offers a superior developer experience.
    -   Protect the backend API routes created in Phase 1, requiring users to be authenticated via Clerk to use them.

2.  **Set Up Database and Media Storage with Cloudflare:**
    -   **Database:** Use **Cloudflare D1**, a serverless SQL database, for storing user data and trailer metadata.
    -   **Media Storage:** Use **Cloudflare R2** for storing all generated media (posters, audio files). Its zero egress fees provide a significant cost advantage over alternatives like AWS S3.
    -   **ORM:** Integrate **Prisma** as the ORM for type-safe database access to Cloudflare D1.

3.  **Create Data Models:**
    -   Define initial data models in `prisma/schema.prisma`:
        -   `User`: To store user information (Clerk will manage the core profile).
        -   `Trailer`: To store the generated title, parameters, script, and URLs to the poster and audio files stored in Cloudflare R2.

4.  **Build a User Dashboard:**
    -   Create a new page (e.g., `/dashboard`) where authenticated users can view, manage, and re-download their previously generated trailers.

---

## Phase 3: Monetization & Billing with Stripe & Clerk

**Objective:** Implement a subscription model to turn the application into a revenue-generating service.

1.  **Integrate Stripe for Payments:**
    -   Use **Stripe** to define products (e.g., Free Tier, Pro Tier) and handle all payment processing and subscriptions.

2.  **Connect Stripe to Clerk for Access Control:**
    -   Integrate Stripe with Clerk. Clerk will sync the user's subscription status from Stripe and attach it to their session token.
    -   This makes it trivial to protect features and API routes based on the user's current plan (e.g., `if (user.publicMetadata.plan === 'pro') { ... }`).

3.  **Define Subscription Tiers & Usage Limits:**
    -   **Free Tier:** Limited number of trailer generations per month, standard quality, includes a watermark.
    -   **Pro Tier:** Unlimited generations, higher quality output, no watermark, access to premium voices or models.
    -   Implement a credit-based system or simple monthly limits, enforced by checking the user's plan in the backend before executing a generation task.

4.  **Build Billing Management Page:**
    -   Embed the **Stripe Customer Portal** into the application. This allows users to easily upgrade, downgrade, cancel their subscription, and view their billing history without requiring custom UI.

---

## Phase 4: Advanced Features & Scalability

**Objective:** Enhance the product offering and ensure the architecture can handle long-running tasks and future growth.

1.  **Implement Actual Video Generation:**
    -   The ultimate feature: combine the generated poster and audio into a simple video file.
    -   This requires a server-side tool like **`ffmpeg`**. This process is resource-intensive and must not be run on the same serverless function that handles API requests.

2.  **Asynchronous Job Queue for Heavy Tasks:**
    -   For video generation and potentially audio mixing, use a background job queue.
    -   **Tools:** Consider [Inngest](https://www.inngest.com/) (built for serverless and works well with Cloudflare Workers) or a Redis-based queue like BullMQ.
    -   **Flow:** The user's API request adds a job to the queue. The API responds immediately with a "processing" status. A separate worker process picks up the job, generates the file, uploads it to R2, and updates the database. The frontend can poll for the result or be notified via WebSockets.

3.  **Analytics & Monitoring:**
    -   Integrate tools like Vercel Analytics, PostHog, or Plausible to understand user behavior.
    -   Set up logging and error monitoring (e.g., Sentry) to quickly identify and fix issues in production.
