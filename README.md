# BLR Home Hunt

## What it includes

- Host, seeker, and combined accounts with persistent sessions.
- Approximate-location property map and commute-distance search, without exposing an exact address.
- Listings with availability dates, complete monthly costs, descriptions, and media.
- A request-and-approval flow that unlocks contact details only after acceptance.
- AES-256-GCM encryption for names, emails, and phone numbers in MongoDB.
- Encrypted local email/password login with JWT-backed, persistent cookie sessions.
- Cloudinary-hosted property photos and videos; MongoDB stores the verified HTTPS delivery URL and Cloudinary public ID.

See [SOCIAL_LAUNCH.md](D:\xzx\Buildathon\SOCIAL_LAUNCH.md) for launch copy, feedback questions, and improvement ideas.

Privacy-first MERN app for local flatmate matching. The request lifecycle is `Pending → Accepted/Rejected`; the only endpoint that decrypts PII is `GET /api/requests/:id/contact`, after authorization and acceptance checks.

## Run

Copy `.env.example` to `.env`, supply high-entropy secrets and a running MongoDB URI, then install and run in two terminals:

```powershell
npm install
npm run server
```

```powershell
npm --prefix frontend install
npm run client
```

Open `http://127.0.0.1:5173`. Vite reads the backend `PORT` from the root `.env` and proxies browser API calls there.

## API flow

- `POST /api/auth/register`, `POST /api/auth/login` create/login a profile. Email has a keyed one-way lookup hash; name, email and phone are AES-256-GCM ciphertext in MongoDB.
- `GET/POST /api/listings` lists safe listing/host data and lets a Host post.
- `GET/PUT /api/seeker-profile` manages a Seeker's matching profile.
- `POST /api/requests`, `GET /api/requests/host`, `PATCH /api/requests/:id/respond` drive the request queue.
- `GET /api/requests/:id/contact` requires an Accepted request and one of its two participants.

Authentication expects a Bearer JWT with a `sub` equal to the Mongo user id. Keep `encrypted*` fields excluded from all public queries. To create users safely, use `User.createWithPII({ name, email, phone, role, ...profile })`; plaintext fields are virtuals and the pre-validation hook encrypts them before Mongo persistence.

Run `npm test` for encryption and credential-security tests, and `npm --prefix frontend run build` to compile-check the UI.

## Deploy to Vercel

The repository includes [vercel.json](D:\xzx\Buildathon\vercel.json), a Vercel serverless entry point, and a cached MongoDB connection. Import the repository into Vercel with the **Root Directory** set to the repository root (`.`), not `frontend`. Configure `MONGODB_URI`, `JWT_SECRET`, `PII_ENCRYPTION_KEY`, `PII_LOOKUP_KEY`, and optionally `GEOCODER_USER_AGENT` from `.env.example`. Use a URL-encoded Atlas connection string and allow Vercel to access the Atlas cluster in MongoDB Network Access.

Property media uploads go directly from the browser to Cloudinary using a short-lived signature created after Express verifies listing ownership. This bypasses Vercel's request-size limit. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in Vercel; never expose the API secret to the frontend.
