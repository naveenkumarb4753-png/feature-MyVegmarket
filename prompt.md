# PROJECT PROMPT: MyVegmarket Mobile App — Unified Multi-Agent Requirements (Updated: 12-08-2026)

## 📌 Executive Orders & Role (Cursor 4.5 Multi-Agent Auto-Mode)

You are operating as a **Unified Multi-Agent Engineering Group** in **STRICT AUTO MODE**.
- You have **100% autonomous permission** to read, write, create, delete, execute, and modify files.
- **DO NOT** halt execution to ask the user for permissions, confirmations, or approvals at any step.
- Proceed independently from start to finish to deliver a **production-ready, error-free deployment**.

---

## 🏗️ Operational Workflow & Agent Delegation Rules

1. **PROMPT FILE SOURCE**: All specialized agents MUST use `prompt.md` as the authoritative source for task requirements.
2. **TAGGED FILES ISOLATION**: Each specialized agent MUST strictly work on and inspect ONLY its designated tagged files listed under its section in the **Multi-Agent Task Allocation Matrix**.
3. **QUALITY CONTROL & MERGE**: Run automated syntax, build, and linter checks to ensure zero errors before generating the final production build.

---

## 🎯 Project Objectives & Scope of Work (UPDATED: 12-08-2026)

### 1. Critical Bug Fixes & Routing Repair
- **Navigation Repair**: Fix the navigation crash error where action `'GO_BACK'` was not handled by any navigator after entering a product card. Audit the routing tree and register proper navigation history context. Ensure the `goBack` / `pop` function reliably returns users to the exact previous screen across ALL application elements globally.
- **Contextual Asset Matching**: Correct all mismatched product images across all sections (e.g. tomato images under onion listings, generic green vegetables populating specific product cards). Search through the local `@products` directory globally, audit the media arrays, and hard-assign the exact matching image source for the correct product item.
- **Main Categories Refactor**: Scan all main page category components. Verify their image paths globally and enforce strict image source hygiene so that only accurate, high-quality, matching category assets are rendered.
- **Empty Card Data Population**: Fix the completely empty Al Aweer cards on the home page. Fetch, map, and inject the missing data models and high-definition imagery directly from the provided local database so these cards render completely with proper info on boot.

### 2. Price Graph Screen Overhaul & Product Insights Card
- **Graph Time-Period Dropdown**: Replace the rigid, fixed-interval price trend graph. Implement a beautiful, interactive dropdown menu allowing users to select custom historical time periods (e.g., 7D, 1M, 3M, 6M, 1Y, ALL). Dynamically recalculate and smoothly re-render the trend graph based on the user's selected time horizon.
- **Screen Component Repair**: Audit the price graph screen entirely. Diagnose and fix all malfunctioning components and layout breakages preventing the price metrics from loading correctly.
- **Insights Card Typography Enhancement**: Modify the Product Insights card layout. Positioned strictly and boldly right after the product image, insert prominent fields for **Current Price** and **Expected Shipment Arrival** using standout visual typography.

### 3. Refocused Shaking Oscillation Loader & The "WOW Factor"
- **Shaking Oscillation Loader**: Completely scrap any jumping or jittery loading animations. Build a perfectly centered, ultra-clean loading canvas on the screen. Sequence multiple vegetable SVGs to render one after another, moving in a tight, fluid shaking oscillation wave until the screen data finishes loading. Below this centered loader, append a dynamic sub-text block serving context-aware, witty, and humorous brand copy to surprise and delight users.
- **Color Profile & Visual Typography**: Saturate and elevate the application color space with rich, vibrant tones that remain highly professional, mimicking premium grocery ecosystems like BigBasket. Inject dramatic visual typography, uncommon layout borders, and subtle micro-interactions (scale-ups, tactile bounces, soft color shifts) when any button, card, toggle, or icon is hovered or tapped.
- **Performance-First Motion Design**: Introduce lightning-fast loading optimizations alongside scroll-driven storytelling techniques (parallax reveals and smooth, non-blocking viewport entry animations). Use WebGL or ultra-lightweight fluid motion assets that scale gracefully without lagging user touch responses.

### 4. Global Navigation, Authentication Walls, & Labels
- **Global Text Changes**: Enforce the name **"Al Aweer Prices"** globally inside the footer navigation tray and across all file systems.
- **Routing Corrections**: Ensure clicking a home page ad card fires the strict authentication check layer immediately, and then routes the user directly into that card's unique product insights view rather than dumping them onto a generic price index page.
- **Inquiry Routing**: Ensure the global notification box component routes users straight to the active **"Inquiry Box"** rather than the historic "View Ads" template.
- **Stateful Wishlist**: Transform the global Cart icon into a **Heart (Wishlist)** icon. Visually hide the Heart icon completely if a user has never logged in; only display it once a user has successfully authenticated at least once.

### 5. Role-Based Dashboards & Privacy Controls
- **Profile Refactor**: Link the main Account Profile page directly to the state-driven role dashboard framework. Redesign the layout entirely, hide "Buyer" or "Seller" UI tags from the client frontend view (keep this strictly inside the backend database), and add a premium "Support" panel at the bottom.

#### System 1: Admin Dashboard (Accessible ONLY when verified Admin)
- **Metrics & Visuals**: Total Users, Buyers, Sellers, Currently Online, Paid Users, Total/Active Listings, Subscriptions Revenue tracking, Monthly download trend timeline graphs, a 12-hour format auto-updating "Most Viewed Ad" module, and "Most Searched Product" metric arrays.
- **Features**: Interactive dynamic calendar ledger showing new listings, providing an analytical breakdown of exactly which user posted which ad on that specific day. An automated FAQ pipeline fed directly by user inquiry inputs.
- **Data Seclusion Protocol**: Lock down all seller/exporter personal data. Completely strip out and remove the "Contact Person" section from view ads cards and all other structural layouts (Search globally for keywords like "contact" and "connect" to erase these leaks).

#### System 2: Seller Dashboard (Unlocked ONLY after identity is matched as a Seller)
- **Features**: Grid view of ads with status badges, inline edit tools, a "Relist / Renew Old Ad" option, total views trackers, and a Google Reviews-style scrollable inquiry details feed. Integrate clear plan indicators with direct upgrade call-to-actions.

#### System 3: Buyer Dashboard (Default post-login canvas until upgraded to Seller)
- **Features**: Top-right wishlisted products mini-cart widget, real-time inquiry status updates, and an active Inquiry Box.
- **Subscription Flow**: Default to a free tier workspace initially. Clicking "Upgrade" opens a beautiful tiered subscription mock landing page (client-side only; do not link to database). Wishlisting an item must instantly push a background notification packet to the Admin Panel detailing user and product info while setting the buyer item state to "Approval Pending".

### 6. Environment & DevOps Fixes
- **Price Calendar Time Matrix**: Lock the Al Aweer Prices calendar state matrix to strictly initialize starting from January 2026 and connect it fully to the database schemas.
- **Push Notification Fixed Workaround**: Implement an alternate standalone native configuration or native push credentials pipeline to bypass current Expo Go limitations for temporary testing stability.
- **Terminal Kill Remediation**: Audit all file system watchers, background child processes, and listening ports to patch the terminal hang issue. Ensure that firing an explicit kill signal (`Ctrl + C`) immediately terminates all development environment processes on demand without freeze locks.

---

## 🤖 Multi-Agent Task Allocation & Tagged Files Matrix

```mermaid
graph TD
    subgraph Wave 1: Core Navigation & Auth Guard
        A1[Agent 1: Navigation & Routing Repair]
        A2[Agent 2: Asset Matching & Empty Card Data]
    end

    subgraph Wave 2: Screen, Graph & Motion Design
        A3[Agent 3: Price Graph & Product Insights Card]
        A4[Agent 4: Shaking Loader & Visual Wow Factor]
        A5[Agent 5: Stateful Wishlist & Auth Wall]
        A6[Agent 6: Role Dashboards & Privacy Seclusion]
    end

    subgraph Wave 3: DevOps, Integration & Build
        A7[Agent 7: DevOps, Calendar Matrix & Terminal Fix]
        A8[Agent 8: Master Integration & Production Build]
    end

    A1 --> A3
    A1 --> A4
    A2 --> A5
    A2 --> A6
    A3 --> A7
    A4 --> A7
    A5 --> A8
    A6 --> A8
    A7 --> A8
```

### Agent Detailed Task Assignments & Tagged Files Whitelist

#### 🔹 Agent 1: Navigation & Routing Repair Agent
- **Responsibilities**: Fix `GO_BACK` navigation crash, audit routing stack history, ensure `goBack`/`pop` works globally, rename "Prices" $\rightarrow$ "Al Aweer Prices" in bottom nav and tabs, fix home page ad card navigation post-auth, reroute global notification box to Inquiry Box.
- **Tagged Files (Agent 1 Whitelist)**:
  - `app/(tabs)/_layout.tsx`
  - `app/_layout.tsx`
  - `app/(tabs)/index.tsx`
  - `app/(tabs)/prices.tsx`
  - `app/product-insight.tsx`
  - `app/inquiry-box.tsx`
  - `screens/ProductInsightScreen.tsx`
  - `screens/InquiryBoxScreen.tsx`

#### 🔹 Agent 2: Contextual Asset Matching & Empty Card Data Agent
- **Responsibilities**: Correct mismatched product images (tomatoes vs onions, green veggies), audit `@products` media arrays, hard-assign accurate local product assets, fix empty Al Aweer cards on home page by injecting missing data models and HD imagery from local database, refactor main category components image paths.
- **Tagged Files (Agent 2 Whitelist)**:
  - `lib/produceUi.ts`
  - `components/ProduceImage.tsx`
  - `screens/CategoriesScreen.tsx`
  - `screens/ContainersScreen.tsx`
  - `screens/PricesScreen.tsx`
  - `app/(tabs)/index.tsx`

#### 🔹 Agent 3: Price Graph Screen Overhaul & Product Insights Card Agent
- **Responsibilities**: Implement interactive historical time-period dropdown (7D, 1M, 3M, 6M, 1Y, ALL) on price graph, dynamically recalculate & re-render graph, audit and repair broken graph screen components, modify Product Insights card layout with bold standout typography for Current Price and Expected Shipment Arrival directly below product image.
- **Tagged Files (Agent 3 Whitelist)**:
  - `screens/PricesScreen.tsx`
  - `screens/ProductInsightScreen.tsx`
  - `lib/productInsights.ts`
  - `app/product-insight.tsx`
  - `app/prices.tsx`

#### 🔹 Agent 4: Shaking Oscillation Loader & Visual Wow Factor Agent
- **Responsibilities**: Build centered shaking oscillation vegetable SVG loader sequence with fluid wave motion and dynamic humorous sub-text brand copy. Elevate color profile to deep saturated professional tones (BigBasket style), inject bold visual typography, uncommon layout borders, micro-interactions (hover/tap scale-up, tactile bounce, soft color shift), and smooth scroll-driven/parallax motion design.
- **Tagged Files (Agent 4 Whitelist)**:
  - `components/VegLoader.tsx`
  - `components/EmptyState.tsx`
  - `components/AnimatedPressable.tsx`
  - `constants/colors.ts`
  - `constants/theme.ts`
  - `components/parallax-scroll-view.tsx`

#### 🔹 Agent 5: Stateful Wishlist & Strict Auth Wall Guard Agent
- **Responsibilities**: Transform Cart icon to Heart (Wishlist) icon globally, hide Heart icon completely until user authenticates, fix strict global blocking auth guard before opening Container Cards, View Ads cards insights, or Al Aweer card insights.
- **Tagged Files (Agent 5 Whitelist)**:
  - `lib/appSession.tsx`
  - `screens/ExporterAuthScreen.tsx`
  - `app/(tabs)/_layout.tsx`
  - `screens/ContainersScreen.tsx`
  - `screens/ContainerDetailScreen.tsx`
  - `screens/PricesScreen.tsx`

#### 🔹 Agent 6: Role-Based Dashboards & Privacy Seclusion Agent
- **Responsibilities**: Redesign Account Profile page (luxury theme, hidden Buyer/Seller role tags in client UI, add Support module at bottom). Build Admin Dashboard (metrics, download trend graph, 12h format "Most Viewed Ad", "Most Searched Product", listing calendar ledger by date, automated FAQ pipeline, strict data seclusion removing "Contact Person" / "contact" / "connect" keywords globally). Build Seller Dashboard (master ad grid, status badges, inline edit, Relist/Renew workflow, Google Reviews style inquiry feed, subscription plans + upgrade CTA). Build Buyer Dashboard (top-right wishlisted products mini-cart widget, inquiry status monitor, Inquiry Box, client-side tiered subscription page, background wishlist push notification to Admin Panel setting state to "Approval Pending").
- **Tagged Files (Agent 6 Whitelist)**:
  - `screens/dashboards/AdminDashboard.tsx`
  - `screens/dashboards/SellerDashboard.tsx`
  - `screens/dashboards/BuyerDashboard.tsx`
  - `app/(tabs)/account.tsx`
  - `screens/UpgradeScreen.tsx`
  - `lib/inquiries.ts`

#### 🔹 Agent 7: DevOps, Calendar Time Matrix & Terminal Freeze Fix Agent
- **Responsibilities**: Lock Al Aweer Prices calendar state matrix starting strictly Jan 2026 connected to database schema. Implement standalone native push credentials/config fallback for Expo Go limitations. Audit file system watchers, child processes, listening ports to fix terminal hang issue on Ctrl+C.
- **Tagged Files (Agent 7 Whitelist)**:
  - `screens/PricesScreen.tsx`
  - `lib/pushNotifications.ts`
  - `app.json`
  - `package.json`

#### 🔹 Agent 8: Master Integration, Quality Control & Build Agent
- **Responsibilities**: Perform unified integration across all backend paths, database schemas, navigation engines, and styles. Auto-resolve all compilation errors, linter complaints, or rendering issues, and produce production-ready build.
- **Tagged Files (Agent 8 Whitelist)**:
  - `tsconfig.json`
  - `package.json`
  - `app/_layout.tsx`

---

## ✅ Closing Criteria

- Perform a complete, unified integration across all backend routes, storage schemas, navigation pipelines, and styles.
- Auto-resolve all compilation errors, linter complaints, or rendering issues.
- Leave the application in an entirely flawless, production-ready operational state. Begin auto-mode execution now.
