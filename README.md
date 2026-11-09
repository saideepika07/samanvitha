# Samanvitha

> **Tagline 1:** Resources aligned with real needs  
> **Tagline 2:** *Vanarulu avasaralatho samanvayam pondhinappude nijamaina prayojanam*

---

## 1. Overview & Purpose

**Samanvitha** is a need-based community donation network that connects donors with verified orphanages and old-age homes. Rather than overwhelming homes with excess or perishable food while critical supplies remain depleted, Samanvitha algorithmically matches contributions to **actual institutional deficits**, based on current usable stock, urgency, and deadlines.

### Core Principles
- **No Resource Waste**: Quantities are calculated via the strict formula:  
  $$\text{Remaining Need} = \max(0, \text{Required Quantity} - \text{Usable Stock} - \text{Reserved Quantity})$$
- **Fair, Unbiased Matching**: Donors are algorithmically paired using four weighted components:
  - **Need Urgency (35%)**
  - **Unfulfilled Demand (30%)**
  - **Time Sensitivity (20%)**
  - **Delivery Feasibility (15%)**  
  *Matches are never ranked by institutional popularity, celebrity patronage, or donor wealth.*
- **Stable Non-Perishables (v1 Scope)**:
  - Clothes (including sarees)
  - Books and educational supplies
  - Rice and packaged dry essentials  
  *(No fresh or perishable food).*
- **Prototype Review Governance**: Institutional verification demonstrates review workflows and simulated audit procedures without claiming formal legal authenticity.

---

## 2. Technology Stack

- **Framework**: React 19 (JavaScript only, no TypeScript)
- **Tooling & Bundler**: Vite 8
- **Styling**: Tailwind CSS v3.4.17 with PostCSS and Autoprefixer
- **Navigation**: React Router v7 (with `ProtectedRoute` and `RoleRoute`)
- **Data Visualization**: Recharts in a muted natural palette
- **Iconography**: Lucide React
- **Typography**: Google Fonts (`Playfair Display` for serif headings, `Plus Jakarta Sans` for body text)

---

## 3. Quick Start Guide (For Beginners)

### Prerequisites
Make sure [Node.js](https://nodejs.org/) (version 18 or newer) is installed on your computer.

### Step 1: Open Terminal
Open PowerShell or your preferred command line prompt and navigate to the project directory:

```bash
cd "c:\Users\Tanguturi Saideepika\OneDrive\Documents\Samanvitha\client"
```

### Step 2: Install Dependencies
Run the install command to install all required packages:

```bash
npm install
```

### Step 3: Run the Development Server
Start the local Vite development server:

```bash
npm run dev
```

### Step 4: Open in Your Browser
Open your browser and navigate to:  
👉 **`http://localhost:5173/`**

### Step 5: Build for Production (Optional)
To verify or compile the production bundle:

```bash
npm run build
```

---

## 4. Prototype Demo Logins

The application includes sample seed data pre-configured with the visible `[Sample Data]` badge. On the [`/login`](http://localhost:5173/login) screen, you can use the 1-click **Prototype Demo Logins** preset buttons or enter credentials manually:

| Role | Email | Password | Persona / Account Type |
|---|---|---|---|
| **Donor** | `donor@samanvitha.org` | `DemoPassword123!` | Sravani V. (Individual Donor, Madhapur) |
| **Donor (Business)** | `retailer@samanvitha.org` | `DemoPassword123!` | Sri Krishna Books & Stationers (Local Shop, Koti) |
| **Institution** | `institution@samanvitha.org` | `DemoPassword123!` | Sample Orphanage 1 (Approved Care Facility) |
| **Institution (Old-Age)** | `oldage@samanvitha.org` | `DemoPassword123!` | Sample Old-Age Home 1 (Pending Review) |
| **Admin** | `admin@samanvitha.org` | `DemoPassword123!` | Platform Auditor & Reviewer |

> [!NOTE]
> *Security Notice*: Mock credentials authenticate against a local browser storage service (`client/src/services/authService.js`). In production, this layer is replaced by secure JWT session tokens and backend database password hashing.

---

## 5. Application Architecture & Folder Structure

```
Samanvitha/
├── client/
│   ├── public/
│   │   ├── favicon.png                # Official Samanvitha emblem favicon
│   │   └── robots.txt
│   ├── src/
│   │   ├── assets/
│   │   │   └── logo.png               # Official brand logo
│   │   ├── components/
│   │   │   ├── common/                # Button, Input, Select, ImageUpload, StatusBadge, Skeleton, EmptyState, ErrorBoundary
│   │   │   ├── navigation/            # Navbar, Sidebar
│   │   │   └── cards/                 # NeedCard, MatchScoreBreakdown
│   │   ├── config/
│   │   │   ├── brand.js               # Immutable brand constants (name, taglines, 96px gap)
│   │   │   ├── categories.js          # Allowed v1 non-perishable categories & units
│   │   │   ├── matching.js            # Algorithmic component weights (Urgency 35%, Demand 30%, etc.)
│   │   │   ├── donationStatus.js      # 8-stage donation lifecycle definitions
│   │   │   └── roles.js               # Role definitions (donor, institution, admin)
│   │   ├── data/sample/               # Seed data flagged with isSample: true (fictional names)
│   │   ├── hooks/                     # AuthContext, useAuth, useToast
│   │   ├── layouts/                   # PublicLayout, AuthLayout, DashboardLayout
│   │   ├── pages/
│   │   │   ├── public/                # LandingPage, RegisterPage, LoginPage, PublicNeedsBoard, NotFoundPage
│   │   │   ├── donor/                 # DonorDashboard, CreateDonation, MyDonations, MatchSuggestions, Notifications, Profile
│   │   │   ├── institution/           # InstitutionDashboard, CreateEditNeed, MyNeeds, IncomingRequests, ReceivedDonations, VerificationStatus, Profile, Notifications
│   │   │   └── admin/                 # AdminDashboard, InstitutionVerificationReview, VerificationDetail, UsersList, DisputesList
│   │   ├── routes/                    # AppRoutes, ProtectedRoute, RoleRoute
│   │   ├── services/                  # authService, needService, donationService, matchService, notificationService, verificationService
│   │   └── utils/                     # Pure matching calculation function (matching.js)
│   ├── index.html
│   ├── tailwind.config.js             # Muted natural palette theme tokens
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## 6. Key Business Logic

### 1. Remaining Need Formula
$$\text{Remaining Deficit} = \max(0, \text{Required Quantity} - \text{Usable Stock} - \text{Reserved Quantity})$$
Displayed on every need card, directory table, and institutional stock ledger.

### 2. Multi-Attribute Matching Function (`client/src/utils/matching.js`)
$$\text{Total Score} = (S_{\text{urgency}} \times 0.35) + (S_{\text{demand}} \times 0.30) + (S_{\text{time}} \times 0.20) + (S_{\text{feasibility}} \times 0.15)$$
- Implemented as a pure, side-effect-free JavaScript function ready for unit testing and direct migration to backend microservices.

### 3. 8-Stage Donation Lifecycle Flow
$$\text{Listed} \to \text{Matched} \to \text{Reserved} \to \text{Ready for delivery} \to \text{Delivered} \to \text{Received} \to \text{Completed}$$
*(Or $\text{Cancelled}$ if released before delivery).*

---

## 7. Milestones Completed

- [x] **F0**: Architectural Plan & Specification (Plan only).
- [x] **F1**: Project setup, Tailwind theme, brand config, landing page (Logo, Name, Tagline 1, 96px gap, Tagline 2, How it works, Why, Roadmap), Register, Login, AuthContext, Protected Routes, empty role dashboards.
- [x] **F2**: Public Needs Board with live search and category/urgency filtering; complete Donor Portal (Create Donation with live image validation, My Donations with status badges and lifecycle stepper, Donor Profile).
- [x] **F3**: Institution Portal (Create/Edit Need with dynamic usable stock, My Needs, Incoming Requests & Reservations, Received Donations ledger, Verification Status with Prototype Review notice); Admin Verification Review suite (directory, detailed audit with structured rejection, users roster, disputes manager).
- [x] **F4**: Match Suggestions engine with 4-component score breakdown visualizer, notifications center, Recharts analytics dashboards styled in the muted natural palette, Skeleton loaders, Empty states, and React Error Boundary.
- [x] **F5**: Responsive & accessibility pass, contrast audit, keyboard navigation, focus outlines, ARIA attributes, `prefers-reduced-motion` compliance, and beginner README documentation.
- [x] **B0**: Backend Architecture Blueprint & System Plan (schemas, endpoints, RBAC, atomic transactions, security mitigations).
- [x] **B1**: Express backend setup, MongoDB Atlas connection, JWT authentication, bcrypt password hashing, rate limiting, and real Nodemailer password reset flow with SHA-256 token hashing.

---

## 8. Backend Setup & Email Configuration (B1)

### 8.1. Running the Server Locally

```bash
# 1. Navigate to the server folder
cd server

# 2. Install dependencies (if not already installed)
npm install

# 3. Create .env from template
cp .env.example .env

# 4. Provision initial administrator account
npm run create-admin

# 5. Run automated test suites (Jest + Supertest)
npm test

# 6. Start development server (runs on port 5000)
npm run dev
```

### 8.2. Setting Up Email (SMTP) & Free-Tier Limitations

In development, if SMTP credentials are left empty in `.env`, the server automatically logs the password reset link directly to the terminal console marked **`[DEV ONLY]`**, allowing you to test the complete flow without needing an email server.

To send real emails to your inbox using a free Gmail App Password:
1. Go to your **Google Account** -> **Security**.
2. Ensure **2-Step Verification** is enabled.
3. Search for or navigate to **App passwords**.
4. Generate a new App Password (name it `Samanvitha Dev`).
5. Copy the 16-character generated password (without spaces).
6. Fill in your `server/.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your.email@gmail.com
   SMTP_PASS=your-16-char-app-password
   MAIL_FROM="Samanvitha Support" <your.email@gmail.com>
   ```

> [!NOTE]
> **Free Email Limits Notice:**
> Free Gmail accounts have a sending limit of **500 emails per day**, and Google may temporarily throttle automated traffic. For higher delivery volumes or staging environments, use dedicated transactional email providers (e.g., Brevo's free tier with 300 emails/day, or Mailtrap/Ethereal for mock testing).

### 8.3. Backend Environment Variables Reference

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | HTTP port Express listens on | `5000` |
| `NODE_ENV` | Application environment | `development` / `production` / `test` |
| `CLIENT_URL` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `MONGODB_URI` | MongoDB Atlas or local connection string | `mongodb://127.0.0.1:27017/samanvitha` |
| `JWT_SECRET` | Secret key used to sign access tokens | *64-character random string* |
| `JWT_EXPIRES_IN`| Token lifespan | `7d` |
| `SMTP_HOST` | Transactional email SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (587 for TLS, 465 for SSL) | `587` |
| `SMTP_USER` | SMTP username / email address | `your.email@gmail.com` |
| `SMTP_PASS` | SMTP password / App password | *16-character app password* |
| `MAIL_FROM` | Sender header on dispatched emails | `"Samanvitha Support" <no-reply@samanvitha.org>` |
| `ADMIN_EMAIL` | Default administrator seed email | `admin@samanvitha.org` |
| `ADMIN_PASSWORD`| Default administrator seed password | `DemoPassword123!` |
| `ADMIN_NAME` | Default administrator display name | `Admin Reviewer` |

### 8.4. Free-Tier Hosting Limitations & Cold-Start Resilience

In live demonstrations hosted on free cloud tiers (e.g., Render free web service tier):
- **15-Minute Inactivity Sleep**: The free backend instance automatically spins down into an inactive sleep state after 15 minutes of zero traffic.
- **Spin-Up Latency (Cold Start)**: The first request to a sleeping instance takes between 50 to 60 seconds while the container boots and establishes the MongoDB Atlas connection.
- **Client-Side Resilience Architecture**:
  1. **Wake-Up Ping**: On initial application load, the frontend silently dispatches a single background `GET /api/health` request once per page load (with zero polling and no persistent timers) to wake up the sleeping instance ahead of user interactions.
  2. **Extended Timeout (70,000 ms)**: Default Axios timeout is set to 70,000 ms across all endpoints, providing adequate headroom for the full container spin-up cycle.
  3. **Calm Waiting Indicator**: Any request taking longer than 5 seconds displays a calm notice (*"The server is waking up (free hosting). This can take up to a minute, please wait."*) in the toast area and next to the active form action button. The notice automatically dismisses upon request completion.
  4. **Duplicate Submission Guard**: Form action buttons remain disabled in a spinning loading state during submission to prevent duplicate clicks while the server initializes.
  5. **Safe Retry Semantics**: Safe, idempotent `GET` requests automatically retry once upon timeout or network failure. Non-idempotent `POST` requests (registration, match reservation, receipt acknowledgment, donation creation) are never automatically retried to prevent duplicate database records.
  6. **Friendly Timeout Messages**: If a registration or mutation request times out, users receive reassuring contextual guidance (e.g., *"The request took too long. Your account may have been created. Try logging in with the same email, or register again after a minute."*) rather than raw technical error text.

---

## 9. Comprehensive Backend Documentation & Viva Runbook

For in-depth backend architecture, entity relationships, the mathematical anti-bias matching algorithm, the complete REST API dictionary, and a **10-question final-year B.Tech IT viva guide**, refer to:

👉 **[server/README.md](file:///c:/Users/Tanguturi%20Saideepika/OneDrive/Documents/Samanvitha/server/README.md)**

