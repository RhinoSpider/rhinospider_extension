### Task Routing Layer for Data Scraping

This document describes the introduction of a new "router layer" to enhance the control and efficiency of data scraping task assignments within the RhinoSpider network.

---

#### Current Task Assignment Process

Currently, when a new scraping or indexing task is created in the admin panel, it is uploaded to the **Admin Canister**. The **Consumer Canister**, which hosts the extension (acting as a node in the network), periodically sends requests to the Admin Canister to check for newly assigned tasks. Since all nodes send the same request parameters to the same central point, they all receive and execute the *same* tasks in parallel.

---

#### Proposed Upgrade: Introducing the Router Layer

With this proposed upgrade, we are introducing a **"router layer"** that provides more granular control over task assignment. This allows administrators to define specific parameters for tasks, ensuring that only a relevant subset of available nodes picks up and executes a given task.

**How the Router Layer Works:**

1.  **Task Definition with Parameters:** When defining a new task in the admin panel, administrators will be able to add specific routing parameters. These parameters can include:
    *   **Geolocation:** To target nodes within a defined geographical range (e.g., only nodes with IP addresses within a certain country or region).
    *   **Percentage of Total Available Nodes:** To assign a task to only a specific percentage of the overall network's nodes.
    *   **Randomization Mode:** To introduce randomness in task assignment among eligible nodes.
    *   **Other similar values:** Any other criteria that can be used to filter or select nodes.

2.  **On-Chain Routing Logic:** This routing occurs **fully on-chain**.
    *   The administrator uploads the task definition (including routing parameters) to the **Admin Canister**.
    *   When a **Consumer Canister** (node) pings the Admin Canister for task assignments, the Admin Canister (now incorporating the router layer logic) evaluates the node's characteristics (e.g., its IP address for geolocation) against the task's defined parameters.
    *   Only if a node meets the specified criteria will it be assigned the suitable and relevant task.

3.  **Task Execution and Data Storage:**
    *   Nodes that are assigned a task will proceed to execute it, which involves indexing and scraping data as defined by the task.
    *   The scraped data is then pushed for on-chain storage on the **Storage Canister**.

**Benefits of the Router Layer:**

*   **Targeted Scraping:** Enables precise targeting of data sources based on geographical location or other node-specific attributes.
*   **Resource Optimization:** Prevents all nodes from executing the same task unnecessarily, optimizing network resource usage.
*   **Scalability:** Allows for more efficient distribution of diverse tasks across a large network of nodes.
*   **Flexibility:** Provides administrators with powerful tools to customize task assignment strategies.

---

This upgrade significantly enhances the control and efficiency of our data scraping operations, moving towards a more intelligent and adaptable network.