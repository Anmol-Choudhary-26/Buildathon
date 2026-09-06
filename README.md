# Bengaluru VibeMatch

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

Open `http://127.0.0.1:5173`. Vite proxies browser API calls to the backend on port 5000.

## API flow

- `POST /api/auth/register`, `POST /api/auth/login` create/login a profile. Email has a keyed one-way lookup hash; name, email and phone are AES-256-GCM ciphertext in MongoDB.
- `GET/POST /api/listings` lists safe listing/host data and lets a Host post.
- `GET/PUT /api/seeker-profile` manages a Seeker's matching profile.
- `POST /api/requests`, `GET /api/requests/host`, `PATCH /api/requests/:id/respond` drive the request queue.
- `GET /api/requests/:id/contact` requires an Accepted request and one of its two participants.

Authentication expects a Bearer JWT with a `sub` equal to the Mongo user id. Keep `encrypted*` fields excluded from all public queries. To create users safely, use `User.createWithPII({ name, email, phone, role, ...profile })`; plaintext fields are virtuals and the pre-validation hook encrypts them before Mongo persistence.

Run `npm test` for encryption and credential-security tests, and `npm --prefix frontend run build` to compile-check the UI.

## Hosted login (Supabase Auth)

The app uses its existing local login until Supabase is configured. Create a Supabase project, enable Email authentication, then set the same project URL and **publishable** key in both `.env` and `frontend/.env` (copy `frontend/.env.example`). Never put a Supabase `service_role` key in the frontend.

Once configured, the browser uses Supabase email/password authentication. On the first authenticated visit it calls `POST /api/auth/bootstrap`; the backend verifies the access token with Supabase, then creates the linked Mongo profile with encrypted name, email and phone. Subsequent API calls verify the Supabase token server-side before resolving that profile.
