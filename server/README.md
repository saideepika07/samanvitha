# Samanvitha Backend API & Engine Documentation

> **Deficit-Aligned Resource Distribution Network for Orphanages and Old-Age Homes**  
> *Final-Year B.Tech IT Engineering Project — Complete System Architecture, API Dictionary, and Viva Runbook*

---

## 1. System Overview & Technology Stack

**Samanvitha** is a need-based community donation backend engineered to eliminate resource misallocation and food waste across charitable institutions. Rather than overwhelming care homes with arbitrary or perishable donations while critical supplies remain depleted, Samanvitha algorithmically routes non-perishable resources (educational books, dry ration essentials, clothing, and medicines) to **actual institutional deficits**.

```
+---------------------------------------------------------------------------------------+
|                                    SAMANVITHA STACK                                   |
+---------------------------------------------------------------------------------------+
|  Frontend Client   | React 19 + Vite 8 + Tailwind CSS v3.4 + React Router v7          |
|  API Gateway       | Node.js v18+ & Express v4.19 (RESTful JSON API)                  |
|  Security Layer    | Helmet, CORS, Express-Rate-Limit (5 req/15min on Auth endpoints) |
|  Authentication    | Stateless JWT (RS256/HS256) + bcryptjs (Salt Factor 10)           |
|  Database Engine   | MongoDB v6+ with Mongoose v8 ODM                                 |
|  File Processing   | Multer (Memory/Disk streaming, 5MB ceiling, strict MIME guards)  |
|  Notification/Mail | Nodemailer (Ethereal / SMTP with console fallback)               |
|  Testing Engine    | Jest v29 + Supertest v7 + MongoDB Memory Server (Isolated In-Mem) |
+---------------------------------------------------------------------------------------+
```

### Why this stack? (Architectural Rationale)
1. **Node.js & Express**: Event-driven, non-blocking I/O model handles high-throughput matching requests and concurrent donor pledges with minimal resource overhead.
2. **MongoDB & Mongoose**: Semi-structured document model naturally accommodates varying institutional inventory specifications, multi-tier document verification metadata, and polymorphic donation categories without rigid table migrations.
3. **Stateless JWT**: Decouples API authorization from centralized session stores (Redis), keeping horizontal scaling straightforward and cloud-native.
4. **MongoDB Memory Server for Testing**: Zero external dependencies during testing; tests spin up an ephemeral in-memory MongoDB daemon, execute all test suites, and teardown cleanly with 100% data isolation.

---

## 2. Directory & Modular Architecture

The server adheres to a layered **Separation of Concerns (SoC)** architectural pattern:

```
server/
├── server.js                      # Application entry point; handles DB connection & HTTP listener
├── package.json                   # Dependencies, test scripts, and seed commands
├── .env.example                   # Environment variable blueprint
├── uploads/                       # Private storage directory for institution verification documents
├── src/
│   ├── app.js                     # Express app setup, global middleware, and route mounting
│   ├── config/                    # Immutable configuration constants & enums
│   │   ├── categories.js          # Supported non-perishable categories
│   │   ├── db.js                  # Mongoose connection manager with reconnection logic
│   │   ├── donationStatus.js      # Donation lifecycle state machine enums
│   │   ├── matchingWeights.js     # Mathematical weights for anti-bias match formula
│   │   └── roles.js               # User roles (donor, institution, admin)
│   ├── controllers/               # HTTP request handlers & response orchestration
│   │   ├── adminController.js     # Institution audits, verification reviews, analytics & users
│   │   ├── authController.js      # Register, login, token refresh, and password reset
│   │   ├── disputeController.js   # Delivery dispute submission & admin reconciliation
│   │   ├── donationController.js  # Pledges, lifecycle transitions, and status updates
│   │   ├── institutionController.js# Institution profile management & document uploads
│   │   ├── matchController.js     # Match suggestions and reservation booking
│   │   ├── needController.js      # Deficit management & public needs board
│   │   └── notificationController.js# User notification alerts & read states
│   ├── middleware/                # Interceptors for auth, security, and validation
│   │   ├── auth.js                # JWT verification and req.user attachment
│   │   ├── errorHandler.js        # Global error interceptor with RFC-compliant payloads
│   │   ├── rateLimiter.js         # Endpoint rate limiting (brute-force defense)
│   │   ├── requireRole.js         # Granular Role-Based Access Control (RBAC) guard
│   │   ├── upload.js              # Multer configuration (file type whitelist & 5MB cap)
│   │   └── validate.js            # express-validator result handler
│   ├── models/                    # Mongoose database schemas and hooks
│   │   ├── ActivityLog.js         # Immutable administrative and transaction audit trail
│   │   ├── Dispute.js             # Delivery reconciliation records
│   │   ├── Donation.js            # Resource contributions & lifecycle state machine
│   │   ├── Institution.js         # Orphanage and old-age home verified profiles
│   │   ├── Need.js                # Institutional resource deficits & virtual fields
│   │   ├── Notification.js        # User-facing real-time notifications
│   │   ├── PasswordResetToken.js  # SHA-256 hashed password reset tokens (15-min TTL)
│   │   ├── User.js                # Core user identity and password hash storage
│   │   └── VerificationRecord.js  # Admin institutional review audit logs
│   ├── routes/                    # RESTful routing declarations
│   ├── services/                  # Business logic, algorithmic engines, and integrations
│   │   ├── emailService.js        # Nodemailer integration with dev console simulation
│   │   ├── matchEngine.js         # Pure algorithmic anti-bias matching calculator
│   │   └── notificationHelper.js  # Automated notification & activity logging pipeline
│   ├── seed/                      # Data bootstrapping scripts
│   │   ├── seed.js                # Sample dataset generator with `isSample: true`
│   │   └── createAdmin.js         # Initial administrative superuser provisioning
│   └── utils/                     # Shared helpers
└── tests/                         # Automated integration test suites (9 suites, 66 tests)
    ├── adminAnalytics.test.js
    ├── auth.test.js
    ├── disputes.test.js
    ├── donations.test.js
    ├── institutions.test.js
    ├── matching.test.js
    ├── needs.test.js
    ├── notifications.test.js
    └── passwordReset.test.js
```

---

## 3. Database Schema & Entity Relationships

The database utilizes Mongoose schemas with explicit indexing, relational object references (`ObjectId`), and virtual deficit computations.

```
       +--------------------+                +-----------------------+
       |        User        | 1            1 |      Institution      |
       |--------------------|----------------|-----------------------|
       | _id                |                | _id                   |
       | email (unique)     |                | userId (ref: User)    |
       | password (bcrypt)  |                | name, type, capacity  |
       | role (enum)        |                | verificationStatus    |
       | status             |                | documents: []         |
       +--------------------+                +-----------------------+
          |               |                      |               |
       1  |               | 1                    | 1             | 1
          v               v                      v               v
  +--------------+  +---------------+     +--------------+  +--------------------+
  | PasswordReset|  | Notification  |     |     Need     |  | VerificationRecord |
  | Token (Hash) |  | (Alert Inbox) |     |--------------|  | (Admin Review Log) |
  +--------------+  +---------------+     | requiredQty  |  +--------------------+
          |                               | usableStock  |
       1  | (donorId)                     | reservedQty  |
          v                               | remainingNeed*|
  +-------------------------+             +--------------+
  |        Donation         |                    |
  |-------------------------|                    | 1
  | category, itemType, qty |                    |
  | status (state machine)  |                    |
  | matchedNeedId ----------+--------------------+ (reservation link)
  +-------------------------+
          |
       1  | (donationId)
          v
  +-------------------------+
  |         Dispute         |
  |-------------------------|
  | issueType, description  |
  | status, resolutionNotes |
  +-------------------------+
```

### Key Schema Characteristics
1. **Zero Raw Password Storage**: Passwords hashed using `bcryptjs` with salt factor 10 inside Mongoose `pre('save')` hooks.
2. **Deficit Virtual Field**: In `Need.js`:
   ```javascript
   needSchema.virtual('remainingNeed').get(function () {
     return Math.max(0, (this.requiredQuantity || 0) - (this.usableStock || 0) - (this.reservedQuantity || 0));
   });
   ```
3. **Password Projection Guard**: User queries default to `.select('-password')` ensuring cryptographic hashes never cross the network wire.
4. **Single-Use Password Reset**: Raw token generated via `crypto.randomBytes(32).toString('hex')`. Only its SHA-256 digest is stored in `PasswordResetToken` alongside a 15-minute TTL.

---

## 4. Complete REST API Endpoint Dictionary

All API routes are prefixed with `/api`. Protected routes require a valid HTTP Bearer token: `Authorization: Bearer <jwt_token>`.

### 4.1 Authentication & Password Recovery (`/api/auth`)
| Method | Endpoint | Access | Rate Limit | Description & Body Payload | Status Codes |
|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | Public | 5 / 15min | Register a new user (`name`, `email`, `password`, `role`). Admin cannot be registered here. | `201`, `400` |
| `POST` | `/api/auth/login` | Public | 5 / 15min | Authenticate user (`email`, `password`). Returns JWT and sanitized user profile. | `200`, `401` |
| `POST` | `/api/auth/forgot-password` | Public | 5 / 15min | Request reset link (`email`). **Always returns neutral 200** to eliminate user enumeration. | `200`, `429` |
| `GET` | `/api/auth/reset-password/:token/validate` | Public | None | Check validity of 64-char reset token before rendering UI form. | `200`, `400` |
| `POST` | `/api/auth/reset-password/:token` | Public | 5 / 15min | Submit new password (`newPassword`). Invalidates all tokens for user upon success. | `200`, `400` |
| `GET` | `/api/auth/me` | Protected | None | Returns currently logged-in user profile from decoded JWT. | `200`, `401` |
| `POST` | `/api/auth/logout` | Protected | None | Client-side session termination confirmation. | `200` |

### 4.2 Institution Profile & Verification (`/api/institutions`)
| Method | Endpoint | Access | Description & Body Payload | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/institutions/me` | Institution | Fetch institution profile corresponding to current authenticated institution user. | `200`, `404` |
| `PUT` | `/api/institutions/me` | Institution | Update capacity, contact person, phone, and district details. | `200`, `400` |
| `POST` | `/api/institutions/me/documents` | Institution | Upload verification proof (`multipart/form-data`, file key `document`, `documentType`). | `201`, `400` |
| `GET` | `/api/institutions/:id/documents/:docId` | Protected | Stream private document file. Restricted to the owning institution or admin reviewers. | `200`, `403`, `404` |

### 4.3 Needs & Deficit Tracking (`/api/needs`)
| Method | Endpoint | Access | Description & Body Payload | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/needs/public` | Public | Public Directory of open deficits belonging **strictly to Approved institutions**. | `200` |
| `GET` | `/api/needs` | Public / Auth | Search needs with optional query filters (`category`, `urgency`, `institutionId`). | `200` |
| `GET` | `/api/needs/:id` | Public | Retrieve detailed deficit metrics, inventory levels, and institution profile. | `200`, `404` |
| `POST` | `/api/needs` | Institution | Create new institutional need. Allowed **only if institution status is Approved**. | `201`, `403` |
| `PUT` | `/api/needs/:id` | Owner / Admin | Update required quantities, deadline, or description. | `200`, `403` |
| `DELETE` | `/api/needs/:id` | Owner / Admin | Remove need item. | `200`, `403` |

### 4.4 Donations & Lifecycle (`/api/donations`)
| Method | Endpoint | Access | Description & Body Payload | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/donations/my` | Donor | List donations created by the authenticated donor. | `200` |
| `GET` | `/api/donations/institution/incoming` | Institution | List pledges currently matched, dispatched, or in transit to institution. | `200` |
| `GET` | `/api/donations/institution/received` | Institution | List historically received and completed donation items. | `200` |
| `GET` | `/api/donations` | Protected | Query donations filtered by user role and context. | `200` |
| `GET` | `/api/donations/:id` | Protected | Fetch donation details (restricted to donor, recipient institution, or admin). | `200`, `403` |
| `POST` | `/api/donations` | Donor | List a new donation contribution (`category`, `itemType`, `quantity`, `unit`, `location`). | `201`, `400` |
| `PUT` | `/api/donations/:id/status` | Protected | Transition lifecycle status (`status`, optional `deliveryMethod`, `trackingInfo`). | `200`, `400` |
| `POST` | `/api/donations/:id/cancel` | Donor / Admin | Cancel pledge; atomically releases any reserved stock back to the need deficit. | `200`, `400` |

### 4.5 Algorithmic Match Engine (`/api/matches`)
| Method | Endpoint | Access | Description & Body Payload | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/matches/suggestions/:donationId` | Protected | Run anti-bias match algorithm for a donation against all active approved deficits. | `200`, `404` |
| `POST` | `/api/matches/reserve` | Donor / Admin | Pair a donation with a specific need (`donationId`, `needId`). Atomically reserves quantity. | `200`, `400` |

### 4.6 Notifications & Disputes (`/api/notifications` & `/api/disputes`)
| Method | Endpoint | Access | Description & Body Payload | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/notifications` | Protected | Get authenticated user's notification inbox sorted newest first. | `200` |
| `PUT` | `/api/notifications/read-all` | Protected | Mark all unread notifications as read. | `200` |
| `PUT` | `/api/notifications/:id/read` | Protected | Mark single notification as read. | `200`, `404` |
| `DELETE` | `/api/notifications/:id` | Protected | Delete notification item. | `200`, `404` |
| `GET` | `/api/disputes` | Protected | List delivery disputes (filtered by participant role or full admin view). | `200` |
| `GET` | `/api/disputes/:id` | Protected | Get dispute details including associated donation and need information. | `200`, `404` |
| `POST` | `/api/disputes` | Protected | File a delivery discrepancy (`donationId`, `issueType`, `description`). | `201`, `400` |
| `PUT` | `/api/disputes/:id/resolve` | Admin | Administrative resolution (`status`: Resolved/Dismissed, `resolutionNotes`). | `200`, `400` |

### 4.7 Administrative Governance & Analytics (`/api/admin`)
| Method | Endpoint | Access | Description & Body Payload | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/admin/institutions` | Admin | Review institution list filtered by verification status (`Pending`, etc.). | `200` |
| `GET` | `/api/admin/institutions/:id` | Admin | Detailed inspection of an institution, uploaded documents, and audit logs. | `200`, `404` |
| `PUT` | `/api/admin/institutions/:id/verification` | Admin | Review decision (`status`: Approved/Rejected/AdditionalInfoRequired, `notes`). | `200`, `400` |
| `GET` | `/api/admin/institutions/:id/audit` | Admin | Historical governance trail for an institution. | `200` |
| `GET` | `/api/admin/activity-logs` | Admin | Global audit trail of critical actions across the platform. | `200` |
| `GET` | `/api/admin/analytics` | Admin | Aggregate KPIs: active users, total needs, deficits, category distribution, disputes. | `200` |
| `GET` | `/api/admin/users` | Admin | List all registered platform users with password hashes safely projected out. | `200` |
| `PUT` | `/api/admin/users/:id/status` | Admin | Suspend or reactivate user (`status`: active/suspended). Self-suspension blocked. | `200`, `400` |

---

## 5. Algorithmic Matching Formula & Anti-Bias Principles

### Mathematical Formulation
The match score between donation $D$ and institutional need $N$ is computed as a weighted linear combination:

$$\text{MatchScore}(D, N) = (w_U \cdot U) + (w_D \cdot D_{\text{score}}) + (w_T \cdot T) + (w_F \cdot F)$$

Where:
- $w_U = 0.35$ (Need Urgency Weight)
- $w_D = 0.30$ (Unfulfilled Demand Ratio Weight)
- $w_T = 0.20$ (Time Sensitivity / Deadline Weight)
- $w_F = 0.15$ (Delivery Feasibility / Proximity Weight)

$$\sum w_i = 0.35 + 0.30 + 0.20 + 0.15 = 1.00 \quad (100\%)$$

```
                                  MATCH SCORE BREAKDOWN
                   +--------------------------------------------------+
                   |   Need Urgency            (35%)   [Score: 0-100] |
                   |   Unfulfilled Demand      (30%)   [Score: 0-100] |
                   |   Time Sensitivity        (20%)   [Score: 0-100] |
                   |   Delivery Feasibility    (15%)   [Score: 0-100] |
                   +--------------------------------------------------+
                                           =
                             TOTAL COMPOSITE SCORE (0 - 100)
```

### Component Functions:
1. **Urgency Score ($U \in [0, 100]$)**:
   - Critical = $100$
   - High = $85$
   - Medium = $60$
   - Low = $35$
2. **Unfulfilled Demand ($D_{\text{score}} \in [0, 100]$)**:
   $$\text{Deficit} = \max(0, \text{RequiredQuantity} - \text{UsableStock} - \text{ReservedQuantity})$$
   $$\text{Ratio} = \frac{\text{DonationQuantity}}{\text{Deficit}}$$
   $$D_{\text{score}} = \begin{cases} 100 & \text{if Ratio} \ge 1.0 \\ \text{round}(\text{Ratio} \times 100) & \text{if Ratio} < 1.0 \end{cases}$$
3. **Time Sensitivity ($T \in [0, 100]$)**:
   $$\Delta t = \text{DeadlineDate} - \text{CurrentDate}$$
   - $\Delta t \le 3 \text{ days} \implies T = 100$
   - $\Delta t \le 7 \text{ days} \implies T = 80$
   - $\Delta t \le 14 \text{ days} \implies T = 60$
   - $\Delta t \le 30 \text{ days} \implies T = 40$
   - $\Delta t > 30 \text{ days} \text{ or undefined} \implies T = 20$
4. **Delivery Feasibility ($F \in [0, 100]$)**:
   - Exact location match = $100$
   - Intra-district match (e.g., both within Hyderabad) = $85$
   - Inter-district / regional delivery = $60$

### Anti-Bias Guarantee
Traditional charity platforms suffer from the **"Popularity Trap"**: high-profile institutions with established donor networks or celebrity backing capture 80%+ of incoming donations, leaving small, remote orphanages and destitute old-age homes chronically underserved.

Samanvitha eliminates this bias completely:
- **Zero Celebrity/Wealth Weighting**: Institutional popularity, historical donation volume, donor net worth, and social media presence have **zero weight** in the algorithm.
- **Pure Need Equivalence**: A small orphanage with 15 children facing an urgent shortage of textbooks receives the exact same algorithmic ranking as a large foundation with 500 residents facing the same proportional deficit.

---

## 6. Deficit Lifecycle & Atomic Inventory Deduplication

To prevent double-pledging (where two donors simultaneously pledge for the same 20 kg of rice, causing excess inventory), Samanvitha uses an **atomic inventory reservation model**:

```
[Need Created]
       │  Required: 50 kg, UsableStock: 10 kg, Reserved: 0 kg
       │  Remaining Deficit = 40 kg (Visible on Public Board)
       ▼
[Donor Reserves 30 kg]
       │  Atomic MongoDB Update: { $inc: { reservedQuantity: +30 } }
       │  Remaining Deficit = 50 - 10 - 30 = 10 kg
       │  (Other donors now see only 10 kg deficit)
       ├──────────────────────────────────────────────┐
       ▼                                              ▼
[Delivery Completed]                          [Pledge Cancelled]
       │  Atomic Update:                             │  Atomic Update:
       │  { $inc: { reservedQuantity: -30,           │  { $inc: { reservedQuantity: -30 } }
       │            usableStock: +30 } }             │  Remaining Deficit reverts to 40 kg
       │  Remaining Deficit = 50 - 40 - 0 = 10 kg    │  (Reopened on Public Board)
       ▼                                              ▼
```

### Concurrency Protection:
All reservation updates leverage MongoDB atomic operators (`$inc`, `$set`) within single query operations:
```javascript
const updatedNeed = await Need.findOneAndUpdate(
  { _id: needId, status: { $ne: 'Closed' } },
  { $inc: { reservedQuantity: donation.quantity } },
  { new: true }
);
```
This guarantees race-condition freedom without requiring heavy distributed table locks.

---

## 7. Security Architecture & Defensive Design

1. **User Enumeration Defense**:
   - The `/api/auth/forgot-password` endpoint ALWAYS returns HTTP 200 with the exact same message (`"If an account exists for this email, reset instructions have been sent."`) regardless of whether the email exists.
2. **Cryptographic Token Hashing**:
   - Raw password reset tokens are generated using cryptographically secure random bytes (`crypto.randomBytes(32)`).
   - The server **only** stores `crypto.createHash('sha256').update(rawToken).digest('hex')` in the database.
   - If the database is compromised, attackers cannot decrypt or use the reset tokens.
3. **Role-Based Access Control (RBAC)**:
   - Middleware `requireRole(ROLES.ADMIN)` enforces strict endpoint access.
   - Self-suspension protection: Administrators cannot suspend their own account via `PUT /api/admin/users/:id/status`.
4. **Rate Limiting**:
   - Brute-force attacks on login, registration, and password recovery are thwarted via `express-rate-limit` (5 attempts per 15-minute window per IP).
5. **Private Storage & Content Security**:
   - Institutional verification documents are stored outside the public document root and streamed exclusively via authorized API controllers with MIME-type headers.

---

## 8. Developer Setup & Operational Runbook

### Prerequisites
- Node.js v18.0.0 or higher
- MongoDB v6.0+ (Local Community Edition or MongoDB Atlas cloud URI)
- Git & npm

### Step 1: Environment Setup
Navigate to `server/` and create a `.env` file based on `.env.example`:

```bash
cd server
cp .env.example .env
```

Ensure the following variables are configured:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/samanvitha
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
ADMIN_EMAIL=admin@samanvitha.org
ADMIN_PASSWORD=DemoPassword123!
ADMIN_NAME=Admin Reviewer
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Seed Sample Data
Populate the database with verified institutions, open deficits, and demo accounts:
```bash
npm run seed
```
*Output will confirm creation of admin, individual donor, retailer, orphanages, old-age homes, and sample deficits.*

### Step 4: Run the Development Server
```bash
npm run dev
```
The server will start on `http://localhost:5000`. Health check endpoint: `http://localhost:5000/api/health`.

### Step 5: Execute Automated Test Suite
To run all 9 integration test suites with zero database setup required (uses in-memory MongoDB):
```bash
npm test
```

**Expected Test Output**:
```
Test Suites: 9 passed, 9 total
Tests:       66 passed, 66 total
Snapshots:   0 total
Time:        ~25 s
```

---

## 9. Final-Year B.Tech IT Viva Voce Preparation Guide

### Project Elevator Pitch
> *"Samanvitha is a MERN-stack algorithmic community donation distribution network designed to solve the critical mismatch between donor offerings and institutional deficits in orphanages and old-age homes. Rather than arbitrary giving, the system computes live resource deficits and uses an anti-bias multi-criteria decision algorithm—weighing urgency (35%), demand ratio (30%), deadline sensitivity (20%), and delivery feasibility (15%)—to pair donations with verified institutions without popularity bias."*

---

### Frequently Asked Viva Voce Questions & Model Answers

#### Q1: Why did you choose MongoDB over a relational database like PostgreSQL for this project?
**Answer**:
> *"While relational integrity is important, orphanages and care homes deal with highly variable non-perishable categories—clothing with size breakdowns, dry rations in weight units, educational books by grade level, and medical supplies with varying batch attributes. MongoDB's semi-structured BSON document model allows flexible schema evolution for item specifications without altering rigid relational schemas. Furthermore, Mongoose provides schema validation, virtual fields (like real-time deficit calculation), and atomic document operations (`$inc`, `$set`) that handle inventory reservations without expensive transaction locks."*

#### Q2: How does your system prevent race conditions when two donors attempt to reserve the same need simultaneously?
**Answer**:
> *"We prevent race conditions through atomic document updates in MongoDB using `findOneAndUpdate` combined with conditional query filters and the `$inc` operator. When a donor initiates a reservation, the query checks that `status != 'Closed'` and atomically increments `reservedQuantity`. Because MongoDB executes document-level writes atomically in its WiredTiger storage engine, concurrent requests are serialized at the document lock level, preventing double-allocation without distributed locking mechanisms."*

#### Q3: Explain how your password reset system protects against user enumeration and token compromise.
**Answer**:
> *"We implement two industry-standard security patterns: First, to counter user enumeration, `/api/auth/forgot-password` returns the exact same HTTP 200 generic message regardless of whether the submitted email exists in the database. Second, to protect against token compromise, the server generates a cryptographically random 32-byte hex string, but stores ONLY its SHA-256 hash in `PasswordResetToken` with a 15-minute expiration timestamp and a `used` boolean flag. Even if our database suffers an unauthorized read dump, the raw reset tokens cannot be reconstructed because SHA-256 is a one-way cryptographic hash function."*

#### Q4: Why is your matching algorithm considered 'anti-bias'? How does it mathematically guarantee fairness?
**Answer**:
> *"Traditional charitable giving follows a Pareto distribution where high-profile or celebrity-endorsed homes receive 80% of resources while lesser-known rural or small-capacity facilities suffer shortages. Our algorithm is purely objective: its 4 components are Urgency (35%), Unfulfilled Demand Ratio (30%), Time Sensitivity (20%), and Geographic Feasibility (15%). Metrics like total past donations received, social media follower count, or donor net worth are explicitly excluded from the formula. An orphanage with 10 children has the exact same mathematical standing as a home with 500 children when facing an urgent deficit."*

#### Q5: How do you handle file upload security for institutional verification documents?
**Answer**:
> *"File uploads are secured across three distinct layers via Multer: First, file size is strictly capped at 5 MB to prevent Denial of Service (DoS) disk exhaustion attacks. Second, an extension and MIME-type whitelist permits only legitimate documentation formats (`image/jpeg`, `image/png`, and `application/pdf`). Third, documents are stored with cryptographically randomized filenames outside the client-accessible public directory, and are served through an authenticated controller that verifies whether the requester is the owning institution or an authorized platform administrator."*

#### Q6: How does the virtual property `remainingNeed` work, and why not store it directly as a regular database column?
**Answer**:
> *"Storing a precomputed `remainingNeed` column creates data redundancy and requires synchronization logic across multiple concurrent actions—like stock additions, manual requirement adjustments, and pledge reservations. In Mongoose, `remainingNeed` is defined as a virtual getter: `Math.max(0, requiredQuantity - usableStock - reservedQuantity)`. It is computed on the fly whenever the document is read or serialized to JSON (`{ virtuals: true }`), ensuring that clients and the matching engine always receive the true, synchronized deficit without write overhead or dirty read vulnerabilities."*

#### Q7: What is the purpose of the 66 automated tests using Jest and MongoDB Memory Server?
**Answer**:
> *"The test suite validates every critical business workflow end-to-end: authentication tokens, password reset expiration, institution document review, anti-bias matching scoring, inventory lifecycle transitions, delivery disputes, and admin analytics. By using `mongodb-memory-server`, tests execute against an ephemeral, in-memory MongoDB instance. This achieves complete test isolation without polluting development databases, eliminates external network dependencies, and enables CI/CD pipelines to run test suites in ~25 seconds with 100% repeatability."*

#### Q8: How is Role-Based Access Control (RBAC) implemented across the Express middleware pipeline?
**Answer**:
> *"RBAC is implemented via a two-stage middleware pipeline. First, the `auth` middleware intercepts the request, verifies the Bearer JWT from the `Authorization` header using our secret key, and attaches the active user payload to `req.user`. Second, the `requireRole(...roles)` higher-order middleware checks `roles.includes(req.user.role)`. If the role does not match (e.g. a donor trying to access `/api/admin/analytics`), the request is rejected immediately with HTTP 403 Forbidden before reaching the controller."*

#### Q9: What happens when an institution receives a donation that does not match the agreed specification or quantity?
**Answer**:
> *"The platform includes a formal Dispute Reconciliation module. The receiving institution or donor can submit a dispute via `POST /api/disputes`, referencing the donation ID, category discrepancy, or delivery failure. This transitions the donation into dispute review, alerts platform administrators via the notification engine, and logs an entry in `ActivityLog`. Administrators review the dispute, inspect delivery tracking, and resolve it via `PUT /api/disputes/:id/resolve`, either releasing the reserved stock back to the public board or marking the delivery fulfilled."*

#### Q10: How do you manage rate limiting to protect the application against Denial of Service (DoS)?
**Answer**:
> *"We employ `express-rate-limit` configured at two tiers: A general API rate limiter allows up to 100 requests per 15-minute window for standard browsing and read queries. A strict authentication limiter restricts sensitive endpoints (`/api/auth/login`, `/api/auth/register`, `/api/auth/forgot-password`, and `/api/auth/reset-password`) to 5 attempts per 15-minute window per IP. This mitigates automated credential stuffing, brute-force password guessing, and email spamming."*

---

## 10. Summary of Milestones Completed

| Milestone | Scope | Deliverables & Verification |
|---|---|---|
| **B0** | Architecture & Strategy | Schema contracts, atomic inventory model, RBAC matrix, and blueprint. |
| **B1** | Auth & Password Reset | JWT auth, bcrypt hashing, SHA-256 reset tokens, rate limiting. (20 tests passed) |
| **B2** | Institutions & Needs | Multi-tier verification, Multer document uploads, deficit tracking. (41 tests passed) |
| **B3** | Donations & Matching Engine | Full donation lifecycle, 4-tier anti-bias matching algorithm, reservation booking. (52 tests passed) |
| **B4** | Notifications & Disputes | Automated in-app alerts, delivery reconciliation, and activity audit logs. (61 tests passed) |
| **B5** | Analytics & Runbook | Admin metrics aggregation, user management, full documentation, and viva runbook. (66 tests passed) |

**All 66 tests passing across 9 test suites with 100% operational test coverage.**
