import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useListInstructors, useListCenters, useListEnrollments } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Clock, User, Building2, Calendar, CheckCircle2, Dumbbell, Star, ChevronRight, Lock, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";

function apiCall(method: string, path: string, body?: any) {
  const token = localStorage.getItem("yoga_token");
  return fetch(`/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

function getNextDays(n = 14): { label: string; value: string }[] {
  const days = [];
  const today = new Date();
  const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().split("T")[0];
    const label = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
    days.push({ label, value });
  }
  return days;
}

interface Availability {
  available: boolean;
  message?: string;
  dayOfWeek?: string;
  workStart?: string;
  workEnd?: string;
  slots30?: string[];
  slots60?: string[];
  busyBlocks?: Array<{ start: string; end: string; type: string }>;
  totalWorkMinutes?: number;
  bookedMinutes?: number;
}

export default function PersonalTrainingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: instructorsData } = useListInstructors({});
  const { data: centersData } = useListCenters();
  const { data: enrollmentsData } = useListEnrollments(
    { userId: user?.id },
    { query: { enabled: !!user } }
  );

  const [selectedCenter, setSelectedCenter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(getNextDays(14)[0].value);
  const [availability, setAvailability] = useState<Record<string, Availability>>({});
  const [loadingAvail, setLoadingAvail] = useState<Record<string, boolean>>({});
  const [myBookings, setMyBookings] = useState<any[]>([]);

  // Booking modal state
  const [bookModal, setBookModal] = useState<{
    instructor: any; centerId: number; centerName: string;
    date: string; time: string; duration: 30 | 60;
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);

  const hasPtAccess = user && (enrollmentsData?.enrollments || []).some((e: any) =>
    e.status === "active" && (e.membershipType === "personal_training" || e.membershipType === "both")
  );

  const instructors = (instructorsData?.instructors || []).filter(i =>
    selectedCenter === "all" || i.centerId === Number(selectedCenter)
  );
  const centers = centersData?.centers || [];
  const nextDays = getNextDays(14);

  const fetchAvailability = async (instructorId: number, centerId: number) => {
    const key = `${instructorId}-${centerId}`;
    setLoadingAvail(prev => ({ ...prev, [key]: true }));
    try {
      const res = await apiCall("GET", `/teacher-availability/${instructorId}?date=${selectedDate}&centerId=${centerId}`);
      setAvailability(prev => ({ ...prev, [key]: res }));
    } finally {
      setLoadingAvail(prev => ({ ...prev, [key]: false }));
    }
  };

  const fetchMyBookings = async () => {
    if (!user) return;
    const res = await apiCall("GET", `/pt-bookings?userId=${user.id}`);
    setMyBookings((res.bookings || []).filter((b: any) => b.status !== "cancelled"));
  };

  useEffect(() => {
    if (user) fetchMyBookings();
  }, [user]);

  useEffect(() => {
    setAvailability({});
    for (const instr of instructors) {
      fetchAvailability(instr.id, instr.centerId);
    }
  }, [selectedDate, selectedCenter, instructorsData]);

  const handleBook = async () => {
    if (!bookModal || !user) return;
    setBooking(true);
    try {
      const res = await apiCall("POST", "/pt-bookings", {
        instructorId: bookModal.instructor.id,
        centerId: bookModal.centerId,
        bookingDate: bookModal.date,
        startTime: bookModal.time,
        durationMinutes: bookModal.duration,
        notes: notes || undefined,
      });
      if (res.error) throw new Error(res.error);
      toast({ title: "Personal training booked!", description: `${bookModal.instructor.fullName} · ${bookModal.time} · ${bookModal.duration} min` });
      setBookModal(null);
      setNotes("");
      fetchMyBookings();
      // Refresh availability
      fetchAvailability(bookModal.instructor.id, bookModal.centerId);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Booking failed", description: err.message });
    } finally {
      setBooking(false);
    }
  };

  const handleCancelBooking = async (id: number) => {
    if (!confirm("Cancel this session?")) return;
    await apiCall("DELETE", `/pt-bookings/${id}`);
    toast({ title: "Session cancelled" });
    fetchMyBookings();
    setAvailability({});
    for (const instr of instructors) fetchAvailability(instr.id, instr.centerId);
  };

  const upcomingBookings = myBookings
    .filter(b => b.bookingDate >= selectedDate.slice(0, 10))
    .sort((a, b) => (a.bookingDate + a.startTime).localeCompare(b.bookingDate + b.startTime))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest mb-3 bg-primary/8 px-4 py-1.5 rounded-full border border-primary/15">
              <Dumbbell className="w-3.5 h-3.5" />
              1-on-1 Sessions
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">Personal Training</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Book private sessions with our certified yoga instructors. Choose your teacher, date, and preferred duration.
            </p>
          </div>

          {/* Access Gate */}
          {!user && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="mb-10 p-8 rounded-2xl bg-primary/5 border border-primary/15 text-center">
              <Lock className="w-10 h-10 text-primary/50 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-xl mb-2">Sign in to Book Sessions</h3>
              <p className="text-muted-foreground mb-5">Create an account and get a membership that includes personal training to book private sessions.</p>
              <div className="flex gap-3 justify-center">
                <Link href="/login"><Button>Sign In</Button></Link>
                <Link href="/register"><Button variant="outline">Create Account</Button></Link>
              </div>
            </motion.div>
          )}

          {user && !hasPtAccess && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="mb-10 p-8 rounded-2xl bg-amber-50 border border-amber-200 text-center">
              <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="font-serif font-bold text-xl mb-2">Personal Training Access Required</h3>
              <p className="text-muted-foreground mb-2">Your current membership doesn't include personal training sessions.</p>
              <p className="text-sm text-amber-700 mb-5">Upgrade to a <strong>Personal Training</strong> or <strong>Both</strong> plan to unlock 1-on-1 bookings.</p>
              <Link href="/memberships"><Button className="gap-2">View Plans <ArrowRight className="w-4 h-4" /></Button></Link>
            </motion.div>
          )}

          {/* My Upcoming PT Bookings */}
          {upcomingBookings.length > 0 && (
            <div className="mb-8 p-5 rounded-2xl bg-green-50 border border-green-100">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h3 className="font-serif font-semibold text-base">My Upcoming Sessions</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {upcomingBookings.map(b => (
                  <div key={b.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-green-100">
                    <div>
                      <p className="font-semibold text-sm">{b.instructorName}</p>
                      <p className="text-xs text-muted-foreground">{b.bookingDate} · {b.startTime}–{b.endTime}</p>
                      <p className="text-xs text-green-600 font-medium">{b.durationMinutes} min · {b.centerName}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive text-xs" onClick={() => handleCancelBooking(b.id)}>
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Select value={selectedCenter} onValueChange={v => setSelectedCenter(v)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="All Centers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Centers</SelectItem>
                {centers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedDate} onValueChange={setSelectedDate}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Select date" />
              </SelectTrigger>
              <SelectContent>
                {nextDays.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Teachers Grid */}
          {instructors.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">No instructors found at this center.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {instructors.map((instr, idx) => {
                const key = `${instr.id}-${instr.centerId}`;
                const avail = availability[key];
                const isLoadingAvail = loadingAvail[key];
                const centerName = centers.find(c => c.id === instr.centerId)?.name || "";
                const specialties = (() => { try { return JSON.parse(instr.specialties || "[]"); } catch { return []; } })();

                return (
                  <motion.div key={instr.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}>
                    <Card className="border-none premium-shadow h-full flex flex-col">
                      <CardContent className="p-5 flex-1 flex flex-col">
                        {/* Teacher Header */}
                        <div className="flex items-start gap-3 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0 overflow-hidden">
                            {instr.imageUrl ? (
                              <img src={instr.imageUrl} alt={instr.fullName} className="w-full h-full object-cover" />
                            ) : instr.fullName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-serif font-semibold leading-tight">{instr.fullName}</h3>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Building2 className="w-3 h-3" />
                              <span className="truncate">{centerName}</span>
                            </div>
                            {instr.experience && (
                              <p className="text-xs text-primary font-medium mt-0.5">{instr.experience}</p>
                            )}
                          </div>
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-300 shrink-0" />
                        </div>

                        {/* Specialties */}
                        {specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {specialties.slice(0, 3).map((s: string, i: number) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">{s}</span>
                            ))}
                          </div>
                        )}

                        {/* Availability */}
                        <div className="flex-1">
                          {isLoadingAvail ? (
                            <div className="space-y-2">
                              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                              <div className="h-8 bg-muted rounded animate-pulse" />
                            </div>
                          ) : !avail ? null : !avail.available ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-xl p-3">
                              <Clock className="w-4 h-4 shrink-0" />
                              <span>Not working this day</span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Work time + utilization */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {avail.workStart}–{avail.workEnd}
                                </span>
                                <span className={`font-medium ${(avail.slots30?.length || 0) > 0 ? "text-green-600" : "text-red-500"}`}>
                                  {(avail.slots30?.length || 0) > 0 ? `${avail.slots30?.length} slots free` : "Fully booked"}
                                </span>
                              </div>

                              {/* Busy blocks mini timeline */}
                              {avail.busyBlocks && avail.busyBlocks.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {avail.busyBlocks.map((b, i) => (
                                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full border ${b.type === "class" ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-blue-100 text-blue-700 border-blue-200"}`}>
                                      {b.type === "class" ? "Class" : "PT"} {b.start}–{b.end}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Available slots */}
                              {(avail.slots30?.length || 0) > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">Available 30-min slots:</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(avail.slots30 || []).slice(0, 8).map(slot => (
                                      <Button
                                        key={slot}
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs px-2.5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                                        disabled={!hasPtAccess}
                                        onClick={() => setBookModal({ instructor: instr, centerId: instr.centerId, centerName, date: selectedDate, time: slot, duration: 30 })}
                                      >
                                        {slot}
                                      </Button>
                                    ))}
                                    {(avail.slots30?.length || 0) > 8 && (
                                      <span className="text-xs text-muted-foreground self-center">+{(avail.slots30?.length || 0) - 8} more</span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {(avail.slots60?.length || 0) > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1.5 font-medium">Available 60-min slots:</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(avail.slots60 || []).slice(0, 6).map(slot => (
                                      <Button
                                        key={slot}
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs px-2.5 border-violet-300 text-violet-600 hover:bg-violet-500 hover:text-white"
                                        disabled={!hasPtAccess}
                                        onClick={() => setBookModal({ instructor: instr, centerId: instr.centerId, centerName, date: selectedDate, time: slot, duration: 60 })}
                                      >
                                        {slot}
                                      </Button>
                                    ))}
                                    {(avail.slots60?.length || 0) > 6 && (
                                      <span className="text-xs text-muted-foreground self-center">+{(avail.slots60?.length || 0) - 6} more</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {!hasPtAccess && user && (
                          <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Personal training plan required to book
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      <Dialog open={!!bookModal} onOpenChange={open => { if (!open) { setBookModal(null); setNotes(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-serif">Confirm Booking</DialogTitle>
            <DialogDescription>Review your session details before confirming.</DialogDescription>
          </DialogHeader>
          {bookModal && (
            <div className="space-y-4 pt-1">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span className="font-semibold">{bookModal.instructor.fullName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{bookModal.date}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{bookModal.time} · <strong className={bookModal.duration === 30 ? "text-primary" : "text-violet-600"}>{bookModal.duration} minutes</strong></span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span>{bookModal.centerName}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Notes for your instructor <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  placeholder="Any injuries, focus areas, or goals…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="resize-none text-sm"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => { setBookModal(null); setNotes(""); }}>Cancel</Button>
                <Button className="flex-1" disabled={booking} onClick={handleBook}>
                  {booking ? "Booking…" : "Confirm Session"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
