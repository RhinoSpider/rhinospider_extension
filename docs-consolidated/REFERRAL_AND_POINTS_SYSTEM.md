### Referral and Points System Overview

This document outlines the functionality and integration of the RhinoSpider extension's referral and points system. The system is designed to incentivize user participation in data scraping by rewarding them with points, and to encourage user growth through a referral program.

---

#### 1. Referral System

**Purpose:** To encourage existing users to invite new users to the RhinoSpider platform.

**How it Works:**

*   **Unique Referral Codes:** Each user is assigned a unique referral code. This code is generated dynamically by the `referral` canister when a user first requests it (e.g., by visiting the referral page in the extension).
    *   **Code Generation Logic:** Codes are generated based on a combination of random data (`Random.blob()`) and the current timestamp (`Time.now()`) to ensure uniqueness. The canister handles checking for and resolving any potential collisions during generation.

*   **Using Referral Codes:** New users can enter a referral code when they join or interact with the referral system for the first time.
    *   **Validation:** The system validates the entered code to ensure it's legitimate and that the user is not attempting to refer themselves or re-refer.
    *   **Referrer Credit:** Upon successful referral, the referrer (the user whose code was used) is credited with points based on a tiered system (see "Points System" below).

**Key Canister Functions:**

*   `getReferralCode()`: Retrieves the caller's unique referral code. Generates one if it doesn't exist.
*   `useReferralCode(code: Text)`: Processes a new user's attempt to use a referral code, validating it and crediting the referrer.

---

#### 2. Points System

**Purpose:** To reward users for contributing bandwidth and data through the extension's scraping activities.

**How it Works:**

*   **Point Trigger:** Points are awarded for each *successful* data scrape performed by the extension.

*   **Point Calculation (Tier-Based):** Points are calculated based on the `contentLength` (character count) of the scraped data. The current tiers are:
    *   **0 - 10,000 characters (0-10KB):** 1 point
    *   **10,001 - 50,000 characters (10KB-50KB):** 5 points
    *   **50,001 - 200,000 characters (50KB-200KB):** 10 points
    *   **200,001+ characters (200KB+):** 20 points
    *(Note: These tiers are configurable within the `referral` canister's code and can be adjusted if needed.)*

*   **Point Storage:** Each user's total points and total data scraped are stored persistently within their `UserData` record in the `referral` canister.

**Key Canister Function:**

*   `awardPoints(principal: Principal, contentLength: Nat)`: Awards points to a specified principal based on the provided content length.

---

#### 3. Integration Details

**Backend (Referral Canister):**

*   **Location:** `canisters/referral/main.mo`
*   **Persistence:** Utilizes `stableUsers` and `stableReferralCodes` (arrays of tuples) in `preupgrade()` and `postupgrade()` functions to ensure `HashMap` data persists across canister upgrades.
*   **Authentication:** All update calls to the `referral` canister require the caller's `Principal` for authentication and attribution.

**Frontend (Extension):**

*   **Authentication:** The extension integrates with Internet Identity (`apps/extension/src/auth.js`) to securely obtain the user's `Principal` ID. This real `Principal` is used for all canister interactions.
*   **UI Pages:**
    *   `apps/extension/pages/popup.html`: The main extension popup now includes login/logout buttons and a direct link to the referral program page.
    *   `apps/extension/pages/referral.html`: A dedicated page within the extension to display the user's referral code, current points, referral count, and total data scraped. It also provides an input for new users to enter a referral code.
*   **Service Worker Adapter:** `apps/extension/service-worker-adapter.js` acts as the bridge between the extension's JavaScript and the deployed `referral` canister. It contains the client-side logic to call the canister functions.
*   **Scraping Integration:** `apps/extension/src/scraper.js` is updated to call the `awardPoints` function in the `referral` canister after each successful data scrape, passing the user's `Principal` and the `contentLength`.

---

#### 4. Future Enhancements

*   **Leaderboard:** The `referral` canister includes a placeholder for a `getLeaderboard()` function, which can be implemented to display top referrers or data contributors.
*   **Admin Controls:** Implement admin functions to dynamically adjust referral tiers and other program parameters without requiring code changes and redeployments.
*   **Anti-Fraud Measures:** Further enhance abuse prevention mechanisms beyond basic checks.

This system provides a robust foundation for user engagement and growth within the RhinoSpider ecosystem.