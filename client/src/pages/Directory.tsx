import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import { useForm } from "react-hook-form";
import { Search, MapPin, Globe, Plus, Building2 } from "lucide-react";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const BIZ_CATEGORIES = ["Financial Services","Marketing","Real Estate","Legal","Technology","Healthcare","Education","Construction","Retail","Food & Beverage","Consulting","Nonprofit","Ministry","Other"];

export default function Directory() {
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("all");
  const [listOpen, setListOpen] = useState(false);
  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ["/api/businesses"],
    queryFn: () => fetch("/api/businesses").then(r => r.json()),
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { register, handleSubmit, reset, setValue } = useForm();

  const addBusiness = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/businesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, userId: user?.id || 1 }),
      });
      if (!res.ok) throw new Error("Failed to list business");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/businesses"] });
      toast({ title: "Business listed!", description: "Your business is now visible in the Kingdom Directory." });
      reset();
      setListOpen(false);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filtered = businesses.filter((b: any) => {
    const matchSearch = !search || b.businessName.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase());
    const matchState = selectedState === "all" || b.state === selectedState || b.isNationwide;
    return matchSearch && matchState;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black mb-2" data-testid="heading-directory">Christian Business Directory</h1>
          <p className="text-muted-foreground max-w-lg">
            Find and support faith-based businesses across the United States. Browse free — <strong className="text-foreground">paid members</strong> can list their business.
          </p>
          <p className="verse-block mt-3 text-sm max-w-sm">
            "Let your light shine before others" — Matthew 5:16
          </p>
        </div>
        <Dialog open={listOpen} onOpenChange={setListOpen}>
          <DialogTrigger asChild>
            {user && user.membershipTier !== "free" ? (
              <Button className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn flex-shrink-0" data-testid="btn-list-business">
                <Plus className="w-4 h-4 mr-1.5" /> List My Business
              </Button>
            ) : (
              <Link href="/register">
                <Button className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn flex-shrink-0" data-testid="btn-list-cta">
                  <Plus className="w-4 h-4 mr-1.5" /> Join to List My Business
                </Button>
              </Link>
            )}
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-black">List Your Business</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit((d) => addBusiness.mutate(d))} className="space-y-4">
              <div>
                <Label>Business Name *</Label>
                <Input {...register("businessName", { required: true })} placeholder="Your business name" data-testid="input-business-name" />
              </div>
              <div>
                <Label>Category *</Label>
                <Select onValueChange={(v) => setValue("category", v)}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {BIZ_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description *</Label>
                <Textarea {...register("description", { required: true })} placeholder="What do you do?" rows={3} data-testid="input-description" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>City</Label>
                  <Input {...register("city")} placeholder="City" data-testid="input-city" />
                </div>
                <div>
                  <Label>State *</Label>
                  <Select onValueChange={(v) => setValue("state", v)}>
                    <SelectTrigger data-testid="select-state">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Website</Label>
                <Input {...register("website")} placeholder="https://yoursite.com" data-testid="input-website" />
              </div>
              <div>
                <Label>Email</Label>
                <Input {...register("email")} type="email" placeholder="contact@business.com" data-testid="input-email" />
              </div>
              <Button type="submit" className="w-full crimson-gradient text-[hsl(38,20%,96%)] font-bold" disabled={addBusiness.isPending} data-testid="btn-submit-business">
                {addBusiness.isPending ? "Listing..." : "List My Business — Free"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-8 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search businesses, categories..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <Select value={selectedState} onValueChange={setSelectedState}>
          <SelectTrigger className="sm:w-40" data-testid="select-filter-state">
            <SelectValue placeholder="All States" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground mb-5">{filtered.length} business{filtered.length !== 1 ? "es" : ""} found</p>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((b: any) => (
            <Card key={b.id} className="card-hover" data-testid={`card-biz-${b.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-11 h-11 crimson-gradient rounded-xl flex items-center justify-center text-base font-black text-[hsl(38,20%,96%)] flex-shrink-0">
                    {b.businessName[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm leading-snug truncate">{b.businessName}</h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      {b.isNationwide ? <Globe className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                      {b.city ? `${b.city}, ` : ""}{b.state}
                      {b.isNationwide ? " · Nationwide" : ""}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs mb-2">{b.category}</Badge>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{b.description}</p>
                {(b.website || b.email) && (
                  <div className="mt-3 pt-3 border-t border-border flex gap-2">
                    {b.website && <a href={b.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Website</a>}
                    {b.email && <a href={`mailto:${b.email}`} className="text-xs text-primary hover:underline">Contact</a>}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-20">
          <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No businesses match your search. Try different filters or be the first to list in your area!</p>
        </div>
      )}
    </div>
  );
}
