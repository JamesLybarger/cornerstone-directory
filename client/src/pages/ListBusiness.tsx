import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation } from "wouter";
import { useAuth } from "../contexts/AuthContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Lock, Building2, CheckCircle, Loader2, ArrowLeft } from "lucide-react";

const CATEGORIES = [
  "Arts & Crafts",
  "Automotive",
  "Cleaning & Maintenance",
  "Construction & Trades",
  "Consulting & Coaching",
  "Education & Tutoring",
  "Event Services",
  "Financial Services",
  "Food & Beverage",
  "Health & Wellness",
  "Home Services",
  "IT & Technology",
  "Legal Services",
  "Marketing & Design",
  "Ministry & Nonprofit",
  "Photography & Video",
  "Professional Services",
  "Real Estate",
  "Retail & E-Commerce",
  "Transportation & Logistics",
  "Other",
];

const listingSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  description: z.string().min(20, "Description must be at least 20 characters").max(500, "Keep description under 500 characters"),
  category: z.string().min(1, "Please select a category"),
  website: z.string().url("Enter a valid URL (include https://)").or(z.literal("")).optional(),
  phone: z.string().min(7, "Enter a valid phone number").or(z.literal("")).optional(),
  city: z.string().min(2, "Enter your city").optional().or(z.literal("")),
  state: z.string().min(2, "Enter your state").optional().or(z.literal("")),
  isNationwide: z.boolean().default(false),
});

type ListingFormValues = z.infer<typeof listingSchema>;

export default function ListBusiness() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Fetch existing business listing for this user
  const { data: existingBusiness, isLoading: loadingBusiness } = useQuery({
    queryKey: ["/api/businesses/my", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/businesses/my/${user?.id}`);
      if (res.status === 404) return null;
      const data = await res.json();
      return data ?? null;
    },
    enabled: !!user && user.membershipTier !== "free",
    retry: false,
  });

  const isEdit = !!existingBusiness;

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      businessName: "",
      description: "",
      category: "",
      website: "",
      phone: "",
      city: "",
      state: "",
      isNationwide: false,
    },
  });

  // Populate form when existing listing loads
  useEffect(() => {
    if (existingBusiness) {
      form.reset({
        businessName: existingBusiness.businessName ?? "",
        description: existingBusiness.description ?? "",
        category: existingBusiness.category ?? "",
        website: existingBusiness.website ?? "",
        phone: existingBusiness.phone ?? "",
        city: existingBusiness.city ?? "",
        state: existingBusiness.state ?? "",
        isNationwide: existingBusiness.isNationwide ?? false,
      });
    }
  }, [existingBusiness]);

  const mutation = useMutation({
    mutationFn: async (values: ListingFormValues) => {
      if (isEdit) {
        const res = await apiRequest("PUT", `/api/businesses/${existingBusiness.id}`, values, {
          "x-user-id": String(user!.id),
        });
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/businesses", values, {
          "x-user-id": String(user!.id),
        });
        return res.json();
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/businesses"] });
      qc.invalidateQueries({ queryKey: ["/api/businesses/my", user?.id] });
      toast({
        title: isEdit ? "Listing updated!" : "Business listed!",
        description: isEdit
          ? "Your directory listing has been updated."
          : "Your business is now live in the Cornerstone Directory.",
      });
      setLocation("/dashboard");
    },
    onError: (err: any) => {
      toast({
        title: "Something went wrong",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  // --- Access control ---
  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 text-center">
        <div>
          <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-black mb-2">Sign in required</h2>
          <p className="text-muted-foreground mb-6 text-sm">You must be logged in to list a business.</p>
          <Link href="/login"><Button className="crimson-gradient text-[hsl(38,20%,96%)] font-bold">Sign In</Button></Link>
        </div>
      </div>
    );
  }

  if (user.membershipTier === "free") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 text-center">
        <div>
          <Lock className="w-10 h-10 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-black mb-2">Paid membership required</h2>
          <p className="text-muted-foreground mb-6 text-sm max-w-sm mx-auto">
            Business listings are available to Founding and Annual members. Join today and get listed in the Cornerstone Directory.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/register"><Button className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn">Become a Member</Button></Link>
            <Link href="/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  if (loadingBusiness) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = form;
  const isNationwide = watch("isNationwide");

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      {/* Header */}
      <div className="mb-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground hover:text-foreground" data-testid="btn-back-dashboard">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 crimson-gradient rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[hsl(38,20%,96%)]" />
          </div>
          <div>
            <h1 className="text-2xl font-black leading-none" data-testid="heading-list-business">
              {isEdit ? "Edit Your Listing" : "List Your Business"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEdit ? "Update your Cornerstone Directory listing" : "Get discovered by Christian customers and partners"}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="font-black text-base">Business Information</CardTitle>
          <CardDescription className="text-xs">
            All fields help customers find and connect with your business. Only your business name and category are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-5">

            {/* Business Name */}
            <div className="space-y-1.5">
              <Label htmlFor="businessName" className="text-sm font-semibold">
                Business Name <span className="text-primary">*</span>
              </Label>
              <Input
                id="businessName"
                placeholder="e.g. LyMade Crafts"
                {...register("businessName")}
                data-testid="input-businessName"
                className={errors.businessName ? "border-destructive" : ""}
              />
              {errors.businessName && <p className="text-xs text-destructive">{errors.businessName.message}</p>}
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">
                Category <span className="text-primary">*</span>
              </Label>
              <Select
                value={watch("category")}
                onValueChange={(val) => setValue("category", val, { shouldValidate: true })}
              >
                <SelectTrigger data-testid="select-category" className={errors.category ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-semibold">
                Description <span className="text-primary">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Tell Christian customers what makes your business special, what you offer, and how your faith drives your work…"
                rows={4}
                {...register("description")}
                data-testid="input-description"
                className={errors.description ? "border-destructive" : ""}
              />
              {errors.description
                ? <p className="text-xs text-destructive">{errors.description.message}</p>
                : <p className="text-xs text-muted-foreground">{watch("description")?.length ?? 0} / 500 characters</p>
              }
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <Label htmlFor="website" className="text-sm font-semibold">Website</Label>
              <Input
                id="website"
                placeholder="https://www.yourbusiness.com"
                {...register("website")}
                data-testid="input-website"
                className={errors.website ? "border-destructive" : ""}
              />
              {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-sm font-semibold">Phone Number</Label>
              <Input
                id="phone"
                placeholder="(555) 555-5555"
                {...register("phone")}
                data-testid="input-phone"
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
            </div>

            {/* City / State */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-sm font-semibold">City</Label>
                <Input
                  id="city"
                  placeholder="Big Water"
                  {...register("city")}
                  data-testid="input-city"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state" className="text-sm font-semibold">State</Label>
                <Input
                  id="state"
                  placeholder="UT"
                  {...register("state")}
                  data-testid="input-state"
                />
              </div>
            </div>

            {/* Nationwide toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
              <div>
                <p className="text-sm font-semibold">Ships / Serves Nationwide</p>
                <p className="text-xs text-muted-foreground mt-0.5">Turn on if you serve customers across the US, not just locally</p>
              </div>
              <Switch
                checked={isNationwide}
                onCheckedChange={(val) => setValue("isNationwide", val)}
                data-testid="switch-nationwide"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn flex-1"
                disabled={mutation.isPending || isSubmitting}
                data-testid="btn-submit-listing"
              >
                {mutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isEdit ? "Saving…" : "Listing…"}</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> {isEdit ? "Save Changes" : "List My Business"}</>
                )}
              </Button>
              <Link href="/dashboard">
                <Button type="button" variant="outline" data-testid="btn-cancel-listing">Cancel</Button>
              </Link>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
