import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ClassBooking {
  id: number;
  userId: number;
  classId: number;
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  bookingDate: string; // "YYYY-MM-DD"
  status: "confirmed" | "cancelled";
  createdAt: string;
}

async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Request failed");
  return body;
}

export function useMyBookings(userId?: number) {
  return useQuery<{ bookings: ClassBooking[]; total: number }>({
    queryKey: ["bookings", userId],
    queryFn: () => fetchJson(`/api/bookings?userId=${userId}`),
    enabled: !!userId,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { classId: number; bookingDate: string }) =>
      fetchJson("/api/bookings", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bookingId: number) =>
      fetchJson(`/api/bookings/${bookingId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  });
}

/** Returns the next N dates (from tomorrow) matching a day name e.g. "Monday" */
export function getNextDatesForDay(dayName: string, count = 7): string[] {
  const dayIndex = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].indexOf(dayName);
  if (dayIndex === -1) return [];
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1);
  cursor.setHours(0, 0, 0, 0);
  while (dates.length < count) {
    if (cursor.getDay() === dayIndex) {
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, "0");
      const dd = String(cursor.getDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** Format "YYYY-MM-DD" to "Mon, 16 Mar" */
export function formatBookingDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}
