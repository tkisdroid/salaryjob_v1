export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ko-KR").format(amount) + "원"
}

export function formatPayRange(min?: number | null, max?: number | null, unit?: string | null): string {
  if (!min && !max) return "협의"
  const unitLabel = getPayUnitLabel(unit)
  if (min && max && min !== max) return `${formatMoney(min)}~${formatMoney(max)} ${unitLabel}`
  return `${formatMoney(min || max || 0)} ${unitLabel}`
}

function getPayUnitLabel(unit?: string | null): string {
  const labels: Record<string, string> = {
    hourly: "/시간", daily: "/일", weekly: "/주", monthly: "/월",
    per_task: "/건", total: "총액", negotiable: "협의", volunteer: "봉사",
  }
  return labels[unit || "negotiable"] || ""
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const target = new Date(date)
  const diff = now.getTime() - target.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "방금"
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return target.toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
}

export function formatTimeRange(start: string, end: string): string {
  return `${start.slice(0, 5)}~${end.slice(0, 5)}`
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  })
}
