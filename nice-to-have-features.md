# Feature Gaps & Nice-to-Have Features

> Ordered by Priority: High > Medium > Low


## HIGH PRIORITY

### 2. Deployment Restart and Rollback
**Priority:** High | **Complexity:** Small (restart) / Medium (rollback)

Scale exists but no restart (patch `spec.template.metadata.annotations` with `restartedAt`) and no rollback (list ReplicaSets, apply previous revision). Critical day-2 operations.

**Builds on:** `kubernetes.ts` `AppsV1Api`, `scaleDeploymentAction`

---

### 3. Cluster Kubeconfig Update / Refresh
**Priority:** High | **Complexity:** Small

Once imported, kubeconfig cannot be changed. When certificates rotate (common every 90 days), must delete and re-import, losing all alert configs, app installs, and history.

**Builds on:** `ClusterModel`, `db.ts`

---

### 4. Pod Delete / Force Delete
**Priority:** High | **Complexity:** Small

No visible "Delete Pod" button in the Pod detail sheet. Operators routinely need to delete stuck/failed pods.

**Builds on:** `deleteResourceAction` already exists — just needs UI wiring.

---

### 5. StatefulSet and DaemonSet Management
**Priority:** High | **Complexity:** Medium

Only Deployments have dedicated listing/management. StatefulSets and DaemonSets are common in production. Pods from them appear but workloads can't be managed.

**Builds on:** `AppsV1Api` (`listStatefulSetForAllNamespaces`, `listDaemonSetForAllNamespaces`)

---

### 6. Terminal Server Not Auto-Started
**Priority:** High | **Complexity:** Small

`terminal-server.ts` exists but needs separate manual startup. Terminal resize events not sent to exec session.

**Note:** `instrumentation.ts` does call `startTerminalServer()` — verify this actually works.

---

### 7. Alert System — Server-Side Evaluation + Notifications
**Priority:** High | **Complexity:** Medium

Alerts are only evaluated client-side in the browser on polling. No webhook, email, or Slack delivery. No background job. Only supports CPU/memory thresholds.

**Builds on:** `src/lib/models/alert-config.ts`, `src/app/actions/alerts.ts`, `src/hooks/use-alert-evaluation.ts`

---

### 8. Helm Upgrade / Rollback / View Values
**Priority:** High | **Complexity:** Medium

`helm.ts` supports list, install, uninstall. Missing: upgrade, rollback, history, view-values. `helmStatus` is implemented but never exposed via action or UI.

**Builds on:** `src/lib/helm.ts`

---

### 9. Real-Time Updates (Watch API / WebSocket)
**Priority:** High | **Complexity:** Large

All data polled on 30-second interval. A pod crash between polls is invisible. Kubernetes Watch API not used. `ws` package already installed.

**Builds on:** `@kubernetes/client-node` `Watch`, existing SSE infrastructure

---

### 10. Slack/Email/Webhook Alert Delivery
**Priority:** High | **Complexity:** Medium

When alerts fire, only visible as a banner if someone is watching the dashboard. No external delivery.

**Builds on:** `AlertConfig` model (needs `channels`/`webhookUrl` fields)

---

## MEDIUM PRIORITY

### 11. CronJob and Job Management
**Priority:** Medium | **Complexity:** Medium

`BatchV1Api` used internally for Kaniko builds but never exposed. Users can't see CronJobs, manually trigger them, or view Job history.

**Builds on:** `kubernetes.ts` `BatchV1Api`, CronJob template schema exists

---

### 12. Multi-User / RBAC
**Priority:** Medium | **Complexity:** Large

Single admin user only. No way to add users, no per-cluster access control, no read-only viewer role.

**Builds on:** `src/lib/auth.ts`, `src/lib/models/user.ts`

---

### 13. Metrics History / Time-Series Charts
**Priority:** Medium | **Complexity:** Large (storage) / Medium (Prometheus integration)

Only point-in-time metrics. No historical CPU/memory charts. `recharts` already installed.

**Builds on:** `monitoring-tab.tsx`, `recharts`, metrics actions

---

### 14. Namespace Delete
**Priority:** Medium | **Complexity:** Small

Can create and list namespaces but not delete them.

**Builds on:** `deleteResourceAction` exists — needs UI button.

---

### 15. Deployment History for Direct Mutations
**Priority:** Medium | **Complexity:** Small

History entries only written for GitHub/AppStore deploys. Direct YAML apply, scale, delete, cordon/drain write no audit entries.

**Fix:** Add `insertDeploymentHistory` calls to all mutating actions.

---

### 16. Dockerhub Auto-Redeploy on New Tags
**Priority:** Medium | **Complexity:** Medium

One-shot deploy only. No watching for new tags, no webhook for re-deploy.

---

### 17. Template Apply-to-Cluster Integration
**Priority:** Medium | **Complexity:** Small

Templates page is a standalone editor. No "apply to cluster" button that directly sends through `applyResourceYamlAction`.

---

### 18. Cloud Provider Import (GKE, EKS, Hetzner)
**Priority:** Medium | **Complexity:** Large

Import requires raw kubeconfig paste. No provider-specific import flow using API credentials.

---

### 19. Port Forwarding
**Priority:** Medium | **Complexity:** Medium

`@kubernetes/client-node` provides `PortForward` class. Would let users access internal services without external exposure.

---

### 20. Audit Log for All Mutations
**Priority:** Medium | **Complexity:** Small

`DeploymentHistory` only covers deploy flows. YAML edits, scale, cordon, create ingress, etc. write no entries.

---

### 21. GitOps / Continuous Sync
**Priority:** Medium | **Complexity:** Large

GitHub deploy is one-shot. No polling for new commits. `last_commit_sha` field suggests this was planned.

**Builds on:** `src/lib/models/github-deployment.ts` (`last_commit_sha`), `src/lib/github.ts` (`getLatestCommitSha`)

---

## LOW PRIORITY

### 22. Cluster Rename
**Priority:** Low | **Complexity:** Small

No PATCH/UPDATE for the `name` field.

---

### 23. Onboarding Wizard Not Wired
**Priority:** Low | **Complexity:** Small

`src/components/onboarding-wizard.tsx` exists as a component but is never imported or rendered anywhere.

---

### 24. Full Cluster Config Export (YAML Bundle)
**Priority:** Low | **Complexity:** Medium

Per-table CSV/JSON export exists. No "export all resources as YAML bundle" for backup/migration.

---

### 25. ResourceQuota and LimitRange Management
**Priority:** Low | **Complexity:** Small

No listing for resource governance objects. Important for multi-tenant clusters.

---

### 26. Cost Analysis
**Priority:** Low | **Complexity:** Large

No cost estimation. Could integrate with OpenCost or simple node-cost calculations.
