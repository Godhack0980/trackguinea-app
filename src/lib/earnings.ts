/**
 * earnings.ts — Shared helpers for transporter earnings calculations.
 * Used by: /dashboard/transporter/earnings and /dashboard/transporter-company/finances
 */

import { db } from "./firebase"
import { collection, query, where, getDocs, addDoc, Timestamp, orderBy } from "firebase/firestore"

/** Base price per km in GNF */
export const BASE_PRICE_PER_KM = 12000
/** Minimum earning per completed job */
export const MIN_JOB_PRICE = 1500000
/** Simandou mining corridor bonus multiplier */
export const SIMANDOU_BONUS = 1.15

/** Calculate the earning for one completed job */
export function calculateJobEarning(job: any): number {
  if (job.price && typeof job.price === "number") return job.price

  const distance = typeof job.distance === "number" ? job.distance : 0
  const calculated = distance > 0 ? distance * BASE_PRICE_PER_KM : MIN_JOB_PRICE

  const isMining =
    job.nature?.toLowerCase().includes("simandou") ||
    job.nature?.toLowerCase().includes("mine") ||
    job.nature?.toLowerCase().includes("fer") ||
    job.nature?.toLowerCase().includes("ciment")

  return Math.round(isMining ? calculated * SIMANDOU_BONUS : calculated)
}

/** Month label from a Firestore Timestamp */
function getMonthLabel(ts: any): string {
  const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"]
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts)
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return "—"
  }
}

/** Group jobs into monthly buckets and return chart data sorted chronologically */
export function groupEarningsByMonth(
  jobs: any[]
): { month: string; gains: number; count: number }[] {
  const map: Record<string, { gains: number; count: number; ts: number }> = {}

  for (const job of jobs) {
    const label = getMonthLabel(job.createdAt)
    const earning = calculateJobEarning(job)
    const ts = job.createdAt?.toDate ? job.createdAt.toDate().getTime() : 0
    if (!map[label]) map[label] = { gains: 0, count: 0, ts }
    map[label].gains += earning
    map[label].count += 1
  }

  return Object.entries(map)
    .sort(([, a], [, b]) => a.ts - b.ts)
    .map(([month, v]) => ({ month, gains: v.gains, count: v.count }))
    .slice(-6)
}

/** Fetch completed jobs for a single transporter UID */
export async function fetchTransporterJobs(uid: string): Promise<any[]> {
  const q = query(
    collection(db, "requests"),
    where("assignedTo", "==", uid),
    where("status", "==", "Terminé")
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Fetch all completed jobs for a list of driver UIDs (max 10 per Firestore `in` limit) */
export async function fetchFleetJobs(driverIds: string[]): Promise<any[]> {
  if (driverIds.length === 0) return []
  const chunks: any[][] = []
  for (let i = 0; i < driverIds.length; i += 10) chunks.push(driverIds.slice(i, i + 10))

  const all: any[] = []
  for (const chunk of chunks) {
    const q = query(collection(db, "requests"), where("assignedTo", "in", chunk))
    const snap = await getDocs(q)
    all.push(...snap.docs.map(d => ({ id: d.id, ...d.data() })))
  }
  return all
}

/** Fetch driver UIDs for a company */
export async function fetchCompanyDriverIds(companyId: string): Promise<string[]> {
  const q = query(
    collection(db, "users"),
    where("companyId", "==", companyId),
    where("role", "==", "transporter")
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => d.id)
}

/** Fetch drivers data for a company (full user objects) */
export async function fetchCompanyDrivers(companyId: string): Promise<any[]> {
  const q = query(
    collection(db, "users"),
    where("companyId", "==", companyId),
    where("role", "==", "transporter")
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Save a withdrawal request to Firestore */
export async function createWithdrawalRequest(params: {
  userId: string
  amount: number
  method: string
  phoneOrAccount: string
  companyName?: string
  driverName?: string
}): Promise<string> {
  const ref = await addDoc(collection(db, "withdrawals"), {
    ...params,
    status: "pending",
    createdAt: Timestamp.now(),
  })
  return ref.id
}

/** Auto-generate an invoice from a completed job and save to `invoices` collection */
export async function generateInvoiceFromJob(job: any, companyData: any): Promise<string | null> {
  if (!job.clientId || !job.assignedTo) return null
  const amount = calculateJobEarning(job)
  const ref = await addDoc(collection(db, "invoices"), {
    jobId: job.id,
    nature: job.nature,
    from: job.from,
    to: job.to,
    clientId: job.clientId,
    clientName: job.clientName,
    transporterId: job.assignedTo,
    transporterName: job.transporterName,
    companyId: companyData?.companyId || null,
    companyName: companyData?.companyName || null,
    amount,
    status: "pending",
    createdAt: Timestamp.now(),
    dueDate: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 3600 * 1000)), // 30 days
  })
  return ref.id
}

/** Fetch all invoices for a company */
export async function fetchCompanyInvoices(companyId: string): Promise<any[]> {
  const q = query(
    collection(db, "invoices"),
    where("companyId", "==", companyId),
    orderBy("createdAt", "desc")
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/** Compute per-driver km stats from jobs */
export function computeKmPerDriver(
  jobs: any[],
  drivers: any[]
): { driver: string; km: number; uid: string }[] {
  const map: Record<string, number> = {}
  for (const job of jobs) {
    const km = typeof job.distance === "number" ? job.distance : 0
    map[job.assignedTo] = (map[job.assignedTo] ?? 0) + km
  }
  return drivers.map(d => ({
    uid: d.id,
    driver: `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || d.id.slice(0, 6),
    km: map[d.id] ?? 0,
  })).sort((a, b) => b.km - a.km)
}

/** Compute monthly performance stats from real jobs */
export function computeMonthlyPerformance(allJobs: any[]): {
  name: string; acceptation: number; livraison: number; satisfaction: number
}[] {
  const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"]
  const map: Record<string, { completed: number; cancelled: number; total: number; ts: number }> = {}

  for (const job of allJobs) {
    const label = getMonthLabel(job.createdAt)
    const ts = job.createdAt?.toDate ? job.createdAt.toDate().getTime() : 0
    if (!map[label]) map[label] = { completed: 0, cancelled: 0, total: 0, ts }
    map[label].total += 1
    if (job.status === "Terminé") map[label].completed += 1
    if (job.status === "Annulé") map[label].cancelled += 1
  }

  return Object.entries(map)
    .sort(([, a], [, b]) => a.ts - b.ts)
    .slice(-6)
    .map(([name, v]) => {
      const acceptation = v.total > 0 ? Math.round(((v.total - v.cancelled) / v.total) * 100) : 0
      const livraison = v.total > 0 ? Math.round((v.completed / v.total) * 100) : 0
      const satisfaction = Math.min(100, Math.round(livraison * 0.97 + 3))
      return { name, acceptation, livraison, satisfaction }
    })
}
