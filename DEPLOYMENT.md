# Samanvitha Deployment & Production Data Safety Guide

This guide documents environment configuration, database isolation, administrator provisioning, and data safety utilities for deploying Samanvitha into production (e.g., Render, Railway, AWS, or Docker).

---

## 1. Database Isolation: Production vs. Development

To ensure strict separation of concerns and avoid contamination of real institutional records by demo or automated test runs, **production must use an isolated database name**.

### MongoDB URI Configuration

The target database name is defined directly at the end of the connection string in `MONGODB_URI`:

```
mongodb+srv://<username>:<password>@<cluster-address>/<DATABASE_NAME>?retryWrites=true&w=majority
```

| Environment | Database Name | Example `MONGODB_URI` | Purpose |
| :--- | :--- | :--- | :--- |
| **Local Development** | `samanvitha` | `mongodb://127.0.0.1:27017/samanvitha` | Local prototype development and testing. **Keeps sample and test data.** |
| **Automated Tests** | `mongodb-memory-server` (or `samanvitha_test`) | Managed dynamically by Jest in-memory runner | Fully isolated test runner. Never modifies persistent databases. |
| **Production** | `samanvitha_prod` | `mongodb+srv://<user>:<pwd>@cluster.mongodb.net/samanvitha_prod?retryWrites=true&w=majority` | **Production database.** Contains only verified production records and active community donations. |

> [!IMPORTANT]
> **Data Safety Guarantee:**  
> Changing the database name in `MONGODB_URI` to `samanvitha_prod` creates a clean, independent database namespace. The current local database (`samanvitha`) preserves all existing prototype records and developer test data without touching production.

---

## 2. Production Seeding & Admin Provisioning

In production, never seed mock users, simulated orphanages, or dummy donations.

### Production Admin Account Bootstrap

To provision or update the administrator account in production, configure the following variables in your production environment settings (e.g. Render Environment Variables):

```ini
ADMIN_EMAIL=admin@samanvitha.org
ADMIN_PASSWORD=A_Very_Strong_64_Character_Password_Here!
ADMIN_NAME="Platform Administrator"
```

Then run the standard seed command:

```bash
cd server
npm run seed
```

### Seeding Rules & Behaviors

1. **Default Production Seed (`npm run seed`)**:
   - Creates or updates **ONLY** the single admin user defined in environment variables.
   - Flags the admin account with `isSample: false` and `role: 'admin'`.
   - **Skips all sample data**, demo accounts, mock orphanages, and prototype donations.
   - Outputs:  
     `Sample demo users and prototype records skipped. Pass --with-sample flag to seed demo data.`
     `Database disconnected. Production admin setup complete.`

2. **Sample / Demo Data Seed (`npm run seed:sample` or `--with-sample`)**:
   - Seeds sample test accounts (`isSample: true`) for developer demonstration.
   - **Never run with `--with-sample` in production.**

---

## 3. Test Data Cleanup Utility (`cleanupTestData.js`)

The backend includes a safety utility located at `server/scripts/cleanupTestData.js` to prune prototype records (`isSample: true`) and test accounts without risking production data.

### Core Safety Safeguards

1. **Dry-Run by Default**:
   Running the script without `--confirm` **only inspects and prints** what records match the criteria. Zero records are modified or removed.
2. **Explicit Confirmation Required**:
   Records are only permanently deleted when `--confirm` is provided.
3. **Production Shielding**:
   If `NODE_ENV=production`, the script will immediately abort with exit code 1 unless `--force-production` is also explicitly supplied.
4. **Administrator Protection**:
   The administrator account (`role: 'admin'` or matching `ADMIN_EMAIL`) is **strictly protected** and will **never be deleted or altered**, even if explicitly targeted in the allowlist.

### CLI Usage Examples

```bash
# 1. Preview deletion of all sample prototype records (DRY RUN):
node server/scripts/cleanupTestData.js

# 2. Preview deletion of sample records AND specific test email accounts (DRY RUN):
node server/scripts/cleanupTestData.js --emails=tester1@example.com,tester2@example.com

# 3. Permanently remove sample records from development database:
node server/scripts/cleanupTestData.js --confirm

# 4. Permanently remove sample records and named test emails from development database:
node server/scripts/cleanupTestData.js --confirm --emails=tester1@example.com

# 5. Production execution (Requires both flags):
node server/scripts/cleanupTestData.js --force-production --confirm
```

---

## 4. Production Storage on Render (Cloudinary)

Render web services run on ephemeral file systems. Files saved to the local disk (`server/uploads/`) disappear whenever the container sleeps, restarts, or deploys a new commit.

1. **Mandatory Production Driver**:
   Set `STORAGE_DRIVER=cloudinary` in production. The server will refuse to start in `NODE_ENV=production` if `STORAGE_DRIVER=local`.
2. **Cloudinary Configuration**:
   ```ini
   STORAGE_DRIVER=cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
3. **Document Privacy**:
   Verification documents uploaded by institutions are saved as `authenticated`/`private` assets on Cloudinary and are only served via signed URLs to authorized administrators and the owning institution.

---

## 5. Production Environment Checklist

Before deploying, verify the following environment settings:

| Variable | Recommended Production Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizations, strict error sanitization, and security rules. |
| `MONGODB_URI` | `.../samanvitha_prod?...` | Points to dedicated production MongoDB instance/database. |
| `JWT_SECRET` | *Random 64+ char string* | Used for cryptographic signature of user authentication tokens. |
| `JWT_EXPIRES_IN` | `7d` | Token expiration period. |
| `STORAGE_DRIVER` | `cloudinary` | Mandatory for persistent photo and verification document storage. |
| `CLOUDINARY_*` | *Production credentials* | From Cloudinary Console. |
| `CLIENT_URL` | `https://samanvitha.onrender.com` | Production origin for CORS and password reset redirection. |
| `ADMIN_EMAIL` | `admin@samanvitha.org` | Official platform administrator email. |
| `ADMIN_PASSWORD` | *Strong unique password* | Used for initial administrative provisioning. |
| `SMTP_HOST` & credentials | Real SMTP credentials | Required for delivering password reset emails. |
| `RESERVATION_EXPIRY_HOURS` | `72` | Automatically releases unfulfilled reservations after 72 hours. |
| `VITE_MAP_TILE_URL` | *Custom tile URL (Optional)* | Custom raster/vector tile URL (e.g. MapTiler, Stadia Maps) for high production traffic. |

---

## 6. Map Tile & Geocoding Service Configuration (OSM & Nominatim Limits)

The application includes map viewing and place search features via `LocationPicker` and `NeedsBoardMap`. In development and standard deployments, it connects directly to community-provided OpenStreetMap tile servers and the public Nominatim search API.

### Public Service Limitations:
- **Light & Development Use Only**: The standard OpenStreetMap and Nominatim endpoints are provided on volunteer infrastructure and intended strictly for lightweight prototype and testing workloads.
- **Rate Limits & Fair-Use Policy**:
  - Nominatim enforces a strict cap of **1 request per second**, prohibits batch geocoding, and requires descriptive identification.
  - Heavy concurrent tile requests from production web users will result in HTTP 429/403 throttling or IP bans by the OpenStreetMap Operations team.

### Production Recommendations:
For live production deployments with continuous traffic:
1. Register for a dedicated map tile provider offering generous free tiers with API keys:
   - **MapTiler** (100,000 free tile requests/month)
   - **Stadia Maps** (200,000 free tile requests/month)
2. Configure the tile endpoint in your client deployment settings (e.g., Vercel environment variables):
   ```ini
   VITE_MAP_TILE_URL=https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=YOUR_MAPTILER_API_KEY
   ```
3. When `VITE_MAP_TILE_URL` is configured, both `LocationPicker` and `NeedsBoardMap` will stream tiles from your authenticated production provider. When omitted, they seamlessly fall back to standard OpenStreetMap tiles with `maxZoom: 19` and retina support.

---

## 7. Render Free-Tier Cold Starts & Client Resilience Architecture

When deploying the backend on Render's free tier (`https://samanvitha.onrender.com`), instances automatically spin down after 15 minutes of inactivity. When a new user request arrives, Render initiates a container cold start taking ~50–60 seconds while starting Node.js and connecting to MongoDB Atlas.

### Client-Side Mitigation Rules Implemented in `client/src/services/api.js`:

1. **Wake-Up Ping (`GET /api/health`)**:
   - Dispatched strictly once per page load on client initialization (`pingServerHealth()` in `client/src/App.jsx`).
   - Runs in the background, completely silent (result ignored).
   - Never polls or runs recurring intervals, avoiding unnecessary resource usage.
2. **70-Second Global Timeout**:
   - Axios client `timeout` is raised from 15,000 ms to `70000` ms, accommodating the full cold-start boot sequence.
3. **5-Second Dynamic Waiting Notice**:
   - If an in-flight API call takes longer than 5 seconds, a gentle notice is shown in the toast area and form actions:  
     `"The server is waking up (free hosting). This can take up to a minute, please wait."`
   - Automatically unmounts as soon as the response is received or an error is thrown.
4. **Non-Idempotent Mutation Protection**:
   - Automatic retry is **strictly limited to GET requests** (`!config._retry && method === 'get'`).
   - Mutations (`POST /auth/register`, `POST /matches/reserve`, `POST /donations/:id/cancel`, `PUT /donations/:id/status`, etc.) are never retried automatically to prevent duplicate side effects.
5. **No Raw Timeout Errors**:
   - Raw technical errors like `"timeout of 15000ms exceeded"` are intercepted and transformed into user-friendly guidance.
   - For user registration: `"The request took too long. Your account may have been created. Try logging in with the same email, or register again after a minute."`

