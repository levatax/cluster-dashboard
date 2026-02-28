import type { CatalogApp, CatalogCategory } from "./types";

import { postgresql } from "./apps/postgresql";
import { mysql } from "./apps/mysql";
import { mariadb } from "./apps/mariadb";
import { mongodb } from "./apps/mongodb";
import { redis } from "./apps/redis";
import { memcached } from "./apps/memcached";
import { nginx } from "./apps/nginx";
import { traefik } from "./apps/traefik";
import { ingressNginx } from "./apps/ingress-nginx";
import { prometheus } from "./apps/prometheus";
import { grafana } from "./apps/grafana";
import { metricsServer } from "./apps/metrics-server";
import { rabbitmq } from "./apps/rabbitmq";
import { minio } from "./apps/minio";
import { elasticsearch } from "./apps/elasticsearch";
import { certManager } from "./apps/cert-manager";
import { keycloak } from "./apps/keycloak";
import { wordpress } from "./apps/wordpress";
import { gitea } from "./apps/gitea";
import { harbor } from "./apps/harbor";
import { containerRegistry } from "./apps/container-registry";
import { mongoExpress } from "./apps/mongo-express";

const ALL_APPS: CatalogApp[] = [
  postgresql, mysql, mariadb, mongodb, mongoExpress,
  redis, memcached,
  nginx, wordpress,
  traefik, ingressNginx,
  prometheus, grafana, metricsServer,
  rabbitmq,
  minio,
  elasticsearch,
  certManager, keycloak,
  gitea, harbor,
  containerRegistry,
];

export function getAllCatalogApps(): CatalogApp[] {
  return ALL_APPS;
}

export function getCatalogApp(id: string): CatalogApp | undefined {
  return ALL_APPS.find((a) => a.id === id);
}

export function searchCatalogApps(query: string): CatalogApp[] {
  const q = query.toLowerCase();
  return ALL_APPS.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q)
  );
}

export function getCatalogAppsByCategory(category: CatalogCategory): CatalogApp[] {
  return ALL_APPS.filter((a) => a.category === category);
}

export function getCatalogCategories(): CatalogCategory[] {
  return [...new Set(ALL_APPS.map((a) => a.category))];
}
