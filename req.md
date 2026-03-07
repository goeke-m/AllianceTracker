This refined logic for the **Marshall Visualizer** is critical because it prioritizes the "Damage Buff" units (R4s/R5) while optimizing for travel time.

I have updated the technical plan to include these specific spatial constraints and the logic for the automated "Blue" assignments.

---

### **Updated Technical Brief: Marshall Visualizer Logic**

#### **1. The "Damage Buff" & Role Logic**

The developer agent must implement a ranking system that treats R4/R5 members as a "High Priority" class regardless of their raw damage, while still sorting them relative to each other.

* **Role Mapping:**
* **Blue Slots (R4/R5):** 11 total. These members are automatically flagged for the most central positions to maximize their damage buff and minimize travel time.
* **Grey/Standard Slots (R1-R3):** Filled strictly by **Weighted Average Damage (WAD)**.



#### **2. Spatial Positioning Algorithm (The "Rings")**

The visualizer component should render a grid based on these specific rules:

* **The Center (0,0):** The Marshall.
* **Ring 1 (Immediate Adjacent):** * **Capacity:** 8 Slots.
* **Occupancy:** Highest WAD R4/R5 members.


* **Ring 2 (Inner Circle):**
* **Strategic Core (3 slots closest to Marshall):** The remaining 3 R4/R5 members (completing the 11-person leadership group).
* **The Outer Core:** Remaining slots in Ring 2 are filled by the **Top WAD R1-R3 members**.


* **Ring 3+:** Remaining members sorted by WAD in descending order.

---

### **3. Infrastructure as Code (IaC) & Deployment**

To make this easy to deploy and maintain, we will use **Pulumi** or **Terraform** to manage the Supabase environment.

* **Database Schema (SQL via IaC):**
* `members`: includes `rank` (R1-R5) and `is_leadership` (boolean).
* `marshall_logs`: stores raw damage numbers from your Gemini JSON uploads.
* `marshall_positions`: A view that joins members and logs to calculate WAD and assign a `ring_level` and `position_index`.



#### **4. Admin "Screenshot-to-Map" Workflow**

1. **Capture:** You take screenshots of the in-game mail.
2. **Translate:** Gemini converts screenshots → JSON.
3. **Import:** You paste JSON into the App's "Event Log" tool.
4. **Generate:** The App instantly recalculates WAD and updates the **Visual Layout**.
5. **Distribute:** You hit "Export Image" or "Share Link" so the alliance knows where to move their bases.

---

### **Final Revised Prompt for the Developer Agent:**

> "Build a mobile-first React App with Supabase using Infrastructure as Code (Supabase CLI/Migrations).
> **Core Requirement: Marshall Visualizer**
> 1. **Data Model:** Create a `members` table (Name, Rank R1-R5). Create a `damage_logs` table.
> 2. **Ranking Logic:** >    - Calculate **Weighted Average Damage (WAD)**: (Latest * 0.6) + (Prev * 0.25) + (Older * 0.15).
> * **Leadership Buff:** Identify the 11 R4/R5 members.
> 
> 
> 3. **The Grid Component:** >    - Marshall is at $(0,0)$.
> * **Ring 1 (8 slots):** Reserved for top 8 R4/R5s.
> * **Ring 2:** >        - 3 slots (closest to center) reserved for the remaining 3 R4/R5s.
> * All other slots filled by R1-R3 members with highest WAD.
> 
> 
> * **Ring 3+:** Remaining members by WAD.
> 
> 
> 4. **Input:** Create a simple text-area for the Admin to paste JSON data for bulk damage updates.
> 5. **Permissions:** Use Supabase RLS. Admin (You) has full control. R1-R3 can only view the 'Marshall Map' and 'Train Schedule'.
> 
> 
> **Deployment:** Provide a GitHub Action to deploy the frontend to Vercel and apply SQL migrations to Supabase."

**How to use this with Gemini:**
Once the developer agent finishes the code, you can use the **VS Pts Tracker.csv** and **Marshall Layout.csv** to seed the database so the app starts with all your current history.