import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import { useForm } from "react-hook-form";
import { Calendar, Clock, CheckCircle, Users, User, Briefcase, Star, Link as LinkIcon } from "lucide-react";
import { Link } from "wouter";

const SESSION_TYPES = [
  { id: "discovery", label: "Discovery Call", duration: "30 min", price: "Free", desc: "A no-pressure intro call to explore how Kingdom coaching can help your business.", icon: Star },
  { id: "coaching", label: "1-on-1 Coaching", duration: "60 min", price: "$97", desc: "Deep-dive session with a Cornerstone Directory advisor. Strategy, accountability, and faith-aligned wisdom.", icon: User },
  { id: "group", label: "Group Advisory", duration: "90 min", price: "$49", desc: "Join a facilitated group mastermind with other Kingdom entrepreneurs.", icon: Users },
  { id: "advisory", label: "Executive Advisory", duration: "2 hours", price: "$197", desc: "Comprehensive business review and strategic planning session for established business owners.", icon: Briefcase },
];

const TIME_SLOTS = ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

export default function Booking() {
  const [selectedType, setSelectedType] = useState("");
  const [booked, setBooked] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();

  const booking = useMutation({
    mutationFn: async (data: any) => {
      const userId = user?.id || 0;
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, userId, status: "pending" }),
      });
      if (!res.ok) throw new Error("Booking failed");
      return res.json();
    },
    onSuccess: () => {
      setBooked(true);
      reset();
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  if (booked) return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-24 text-center">
      <div className="w-16 h-16 crimson-gradient rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircle className="w-8 h-8 text-[hsl(38,20%,96%)]" />
      </div>
      <h2 className="text-3xl font-black mb-3">Session Requested!</h2>
      <p className="text-muted-foreground mb-2">Your coaching session request has been submitted. A Cornerstone Directory advisor will reach out to confirm within 24 hours.</p>
      <p className="verse-block text-sm max-w-xs mx-auto mt-4 mb-8">"Where there is no counsel, the people fall; but in the multitude of counselors there is safety." — Proverbs 11:14</p>
      <Button onClick={() => setBooked(false)} variant="outline">Book Another Session</Button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-black mb-3" data-testid="heading-booking">Kingdom Coaching Sessions</h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          Work with a Cornerstone Directory advisor to sharpen your strategy, strengthen your faith, and grow your impact.
        </p>
        <p className="verse-block mt-4 text-sm max-w-sm">
          "For lack of guidance a nation falls, but victory is won through many advisers." — Proverbs 11:14
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Session Type Selection */}
        <div>
          <h2 className="text-lg font-black mb-5">Choose a Session Type</h2>
          <div className="space-y-3">
            {SESSION_TYPES.map(({ id, label, duration, price, desc, icon: Icon }) => (
              <Card
                key={id}
                className={`cursor-pointer transition-all card-hover ${selectedType === id ? "border-primary shadow-md shadow-primary/10" : ""}`}
                onClick={() => { setSelectedType(id); setValue("sessionType", id); }}
                data-testid={`card-session-${id}`}
              >
                <CardContent className="p-4 flex gap-4 items-start">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedType === id ? "crimson-gradient" : "bg-muted"}`}>
                    <Icon className={`w-5 h-5 ${selectedType === id ? "text-[hsl(38,20%,96%)]" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-sm">{label}</h3>
                      <span className="font-black text-primary text-sm">{price}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
                      <Clock className="w-3 h-3" /> {duration}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Booking Form */}
        <div>
          <h2 className="text-lg font-black mb-5">Schedule Your Session</h2>
          {!user && (
            <div className="mb-5 p-4 rounded-lg bg-muted border border-border text-sm text-muted-foreground">
              <Link href="/register"><span className="text-primary underline cursor-pointer font-semibold">Join or sign in</span></Link> to have your info pre-filled. Guest bookings are also accepted.
            </div>
          )}
          <form onSubmit={handleSubmit((d) => booking.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First Name *</Label>
                <Input {...register("firstName", { required: true })} defaultValue={user?.firstName} placeholder="John" data-testid="input-first-name" />
              </div>
              <div>
                <Label>Last Name *</Label>
                <Input {...register("lastName", { required: true })} defaultValue={user?.lastName} placeholder="Smith" data-testid="input-last-name" />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input {...register("email", { required: true })} type="email" defaultValue={user?.email} placeholder="you@example.com" data-testid="input-email" />
            </div>
            <div>
              <Label>Session Type *</Label>
              <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setValue("sessionType", v); }}>
                <SelectTrigger data-testid="select-session-type">
                  <SelectValue placeholder="Select session type" />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map(s => <SelectItem key={s.id} value={s.id}>{s.label} — {s.price}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Preferred Date *</Label>
                <Input {...register("date", { required: true })} type="date" min={new Date().toISOString().split("T")[0]} data-testid="input-date" />
              </div>
              <div>
                <Label>Preferred Time *</Label>
                <Select onValueChange={(v) => setValue("time", v)}>
                  <SelectTrigger data-testid="select-time">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>What would you like to focus on?</Label>
              <Textarea {...register("notes")} rows={3} placeholder="Briefly describe your business, your biggest challenge, or your goal for this session..." data-testid="input-notes" />
            </div>
            <Button
              type="submit"
              className="w-full crimson-gradient text-[hsl(38,20%,96%)] font-black shine-btn h-11"
              disabled={booking.isPending}
              data-testid="btn-submit-booking"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {booking.isPending ? "Booking..." : "Request Coaching Session"}
            </Button>
            <p className="text-xs text-muted-foreground text-center">A Kingdom coach will confirm your session within 24 hours by email.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
