# Logic Improvements & Code Quality Issues


### N+1 Kubernetes API Calls on Cluster Detail Page
**File:** `src/lib/kubernetes.ts:596-673`

`getClusterHealthSummary` fetches nodes, pods, deployments, events, and metrics separately. The page also calls `fetchClusterInfo` (which calls `getNodes` again) and `fetchNodes` (another `getNodes` call). Result: `listNode` is called **3 times** per page load.

**Fix:** Combine health+info into one action, or cache k8s API calls with a short TTL (2-5 seconds).


### Hardcoded `--insecure --skip-tls-verify` in Kaniko Build Jobs
**File:** `src/lib/kubernetes.ts:860-865`

TLS verification disabled with no configuration option. Security risk in production.

**Fix:** Make configurable via cluster settings.
