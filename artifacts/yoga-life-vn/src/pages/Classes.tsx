import { useListClasses, useListCenters, useListEnrollments } from "@workspace/api-client-react";
import { Navbar } from "@/components/layout/Navbar";
import { useLang } from "@/lib/lang-context";
import { useAuth } from "@/lib/auth-context";
import { MembershipUpgradeModal } from "@/components/MembershipUpgradeModal";
import { useState } from "react";
import {
  useMyBookings, useCreateBooking, useCancelBooking,
  getNextDatesForDay, formatBookingDate, type ClassBooking,
} from "@/lib/bookings-api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Calendar, CheckCircle2, X, AlertCircle, Star, BookOpen, User } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const levelColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-700 border-green-200",
  intermediate: "bg-blue-100 text-blue-700 border-blue-200",
  advanced: "bg-purple-100 text-purple-700 border-purple-200",
  all_levels: "bg-orange-100 text-orange-700 border-orange-200",
};

const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

interface BookingModalProps {
  cls: { id: number; name: string; dayOfWeek: string; startTime: string; endTime: string; level: string; centerName: string };
  myBookings: ClassBooking[];
  onClose: () => void;
}

function BookingModal({ cls, myBookings, onClose }: BookingModalProps) {
  const { toast } = useToast();
  const createBooking = useCreateBooking();
  const cancelBooking = useCancelBooking();
  const [confirmCancel, setConfirmCancel] = useState<ClassBooking | null>(null);

  const nextDates = getNextDatesForDay(cls.dayOfWeek, 7);

  const getBookingForDate = (date: string) =>
    myBookings.find(b => b.classId === cls.id && b.bookingDate === date && b.status === "confirmed");

  const handleBook = async (date: string) => {
    try {
      await createBooking.mutateAsync({ classId: cls.id, bookingDate: date });
      toast({ title: "Class booked!", description: `${cls.name} on ${formatBookingDate(date)}` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Booking failed", description: err.message });
    }
  };

  const handleCancel = async (booking: ClassBooking) => {
    try {
      await cancelBooking.mutateAsync(booking.id);
      toast({ title: "Booking cancelled", description: `${booking.className} on ${formatBookingDate(booking.bookingDate)}` });
      setConfirmCancel(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Cannot cancel", description: err.message });
      setConfirmCancel(null);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 pb-4">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="font-serif text-lg leading-tight">{cls.name}</DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  {cls.dayOfWeek}s · {cls.startTime} – {cls.endTime} · {cls.centerName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="flex items-center gap-2 mt-4">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <p className="text-xs text-amber-700 font-medium">Booking opens 1 day before · Cancel up to 1 hour before</p>
          </div>
        </div>

        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">Select a date</p>
          {nextDates.map(date => {
            const existing = getBookingForDate(date);
            return (
              <div key={date} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                existing ? "border-primary/30 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/50"
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex flex-col items-center justify-center text-center leading-none">
                    <span className="text-[10px] text-muted-foreground uppercase">{new Date(date + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short" })}</span>
                    <span className="text-sm font-bold">{new Date(date + "T00:00:00").getDate()}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(date + "T00:00:00").toLocaleDateString("en-GB", { month: "short" })}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{formatBookingDate(date)}</p>
                    <p className="text-xs text-muted-foreground">{cls.startTime} – {cls.endTime}</p>
                  </div>
                </div>
                {existing ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-primary text-xs font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      Booked
                    </div>
                    <button onClick={() => setConfirmCancel(existing)}
                      className="w-6 h-6 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors">
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                ) : (
                  <Button size="sm" className="h-8 px-4 text-xs"
                    disabled={createBooking.isPending}
                    onClick={() => handleBook(date)}>
                    Book
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Confirm cancel dialog */}
        {confirmCancel && (
          <div className="p-4 border-t border-border bg-destructive/5">
            <p className="text-sm font-medium text-destructive mb-1">Cancel this booking?</p>
            <p className="text-xs text-muted-foreground mb-3">{confirmCancel.className} · {formatBookingDate(confirmCancel.bookingDate)}</p>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm" className="flex-1"
                disabled={cancelBooking.isPending}
                onClick={() => handleCancel(confirmCancel)}>
                Yes, cancel
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setConfirmCancel(null)}>
                Keep it
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ClassesPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: centersData } = useListCenters();
  const [selectedCenter, setSelectedCenter] = useState("all");
  const [bookingClass, setBookingClass] = useState<any | null>(null);
  const [showMembershipModal, setShowMembershipModal] = useState(false);

  const centerId = selectedCenter !== "all" ? Number(selectedCenter) : undefined;
  const { data, isLoading } = useListClasses({ centerId });
  const { data: bookingsData } = useMyBookings(user?.id);
  const myBookings = bookingsData?.bookings ?? [];

  const { data: enrollmentsData } = useListEnrollments(
    { userId: user?.id },
    { query: { enabled: !!user } }
  );
  const hasOfflineAccess = (enrollmentsData?.enrollments || []).some((e: any) =>
    e.status === "active" && (e.membershipType === "offline" || e.membershipType === "both" || e.membershipType === "drop_in")
  );

  const classes = (data?.classes || []).filter(c => c.isActive);
  const byDay = days.reduce((acc, day) => {
    acc[day] = classes.filter(c => c.dayOfWeek === day);
    return acc;
  }, {} as Record<string, typeof classes>);

  const isPremiumCenter = (name: string) => name.toLowerCase().includes("premium");
  const selectedCenterObj = centersData?.centers?.find(c => String(c.id) === selectedCenter);
  const showBooking = selectedCenterObj ? isPremiumCenter(selectedCenterObj.name) : (selectedCenter === "all" && classes.some(c => isPremiumCenter(c.centerName)));

  const levelLabel = (level: string) => {
    const map: Record<string, string> = {
      beginner: t.online.levels.beginner,
      intermediate: t.online.levels.intermediate,
      advanced: t.online.levels.advanced,
      all_levels: t.online.levels.all_levels,
    };
    return map[level] || level;
  };

  const getActiveBookingsCount = (classId: number) =>
    myBookings.filter(b => b.classId === classId && b.status === "confirmed").length;

  const handleBookClick = (cls: any) => {
    if (!user) {
      setShowMembershipModal(true);
      return;
    }
    if (!hasOfflineAccess) {
      setShowMembershipModal(true);
      return;
    }
    setBookingClass(cls);
  };

  // My upcoming bookings (next 14 days)
  const today = new Date().toISOString().split("T")[0];
  const upcoming = myBookings
    .filter(b => b.status === "confirmed" && b.bookingDate >= today)
    .sort((a, b) => a.bookingDate.localeCompare(b.bookingDate))
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">{t.classes.title}</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.classes.subtitle}</p>
          </div>

          {/* My Upcoming Bookings */}
          {upcoming.length > 0 && (
            <div className="mb-8 p-5 rounded-2xl bg-primary/5 border border-primary/15">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h3 className="font-serif font-semibold text-base">My Upcoming Bookings</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {upcoming.map(b => (
                  <div key={b.id} className="flex items-center gap-2 bg-background rounded-xl px-3 py-2 border border-border text-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="font-medium">{b.className}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground text-xs">{formatBookingDate(b.bookingDate)} · {b.startTime}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-8 flex justify-center">
            <Select value={selectedCenter} onValueChange={setSelectedCenter}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder={t.classes.filterByCenter} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.classes.allCenters}</SelectItem>
                {(centersData?.centers || []).map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                    {isPremiumCenter(c.name) && " ⭐"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PREMIUM badge */}
          {selectedCenterObj && isPremiumCenter(selectedCenterObj.name) && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border border-primary/20 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                <Star className="w-6 h-6 text-primary fill-primary/30" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg">{selectedCenterObj.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedCenterObj.description}</p>
                <p className="text-xs text-primary font-medium mt-1">
                  Classes open for booking 1 day in advance · Cancellation allowed up to 1 hour before
                </p>
              </div>
            </motion.div>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-card rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-8">
              {days.map(day => {
                const dayClasses = byDay[day];
                if (dayClasses.length === 0) return null;
                return (
                  <div key={day}>
                    <h2 className="text-xl font-serif font-semibold mb-4 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center font-bold">{day.charAt(0)}</span>
                      {day}
                      <span className="text-sm text-muted-foreground font-normal">{dayClasses.length} classes</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {dayClasses.map((cls, idx) => {
                        const premium = isPremiumCenter(cls.centerName);
                        const bookedCount = getActiveBookingsCount(cls.id);
                        return (
                          <motion.div key={cls.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}>
                            <Card className={`border-none premium-shadow hover:shadow-lg transition-all duration-200 group ${premium ? "ring-1 ring-primary/20" : ""}`}>
                              <CardContent className="p-4">
                                {premium && (
                                  <div className="flex items-center gap-1 text-xs text-primary font-medium mb-2">
                                    <Star className="w-3 h-3 fill-primary/40" />
                                    PREMIUM
                                  </div>
                                )}
                                <div className="flex items-start justify-between mb-2">
                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold font-serif leading-snug">{cls.name}</h3>
                                    {cls.instructorName ? (
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                          <User className="w-3 h-3 text-primary" />
                                        </div>
                                        <span className="text-xs font-medium text-primary">{cls.instructorName}</span>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground mt-0.5">{cls.centerName}</p>
                                    )}
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ml-2 ${levelColors[cls.level]}`}>
                                    {levelLabel(cls.level)}
                                  </span>
                                </div>
                                {cls.instructorName && (
                                  <p className="text-xs text-muted-foreground mb-2">{cls.centerName}</p>
                                )}
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-primary" />
                                    <span>{cls.startTime} – {cls.endTime}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5 text-primary" />
                                    <span>{cls.capacity} {t.classes.spots}</span>
                                  </div>
                                </div>
                                {premium && (
                                  <div className="pt-3 border-t border-border">
                                    <Button
                                      size="sm"
                                      className={`w-full h-8 text-xs ${bookedCount > 0 ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30" : ""}`}
                                      variant={bookedCount > 0 ? "outline" : "default"}
                                      onClick={() => handleBookClick(cls)}
                                    >
                                      {bookedCount > 0 ? (
                                        <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Booked ({bookedCount})</>
                                      ) : (
                                        <><Calendar className="w-3.5 h-3.5 mr-1.5" />Book Class</>
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {classes.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">{t.classes.noClasses}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Booking Modal */}
      {bookingClass && (
        <BookingModal
          cls={bookingClass}
          myBookings={myBookings}
          onClose={() => setBookingClass(null)}
        />
      )}

      {/* Membership Upgrade Modal */}
      <MembershipUpgradeModal
        open={showMembershipModal}
        onClose={() => setShowMembershipModal(false)}
        reason="offline"
      />
    </div>
  );
}
