export function formatCpuMillicores(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} cores`;
  return `${Math.round(m)}m`;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} Gi`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(0)} Mi`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} Ki`;
  return `${bytes} B`;
}
