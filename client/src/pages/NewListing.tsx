import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, CheckCircle, Loader2, Lock, FileText, X } from "lucide-react";

const CATEGORIES = [
  "Digital Books",
  "Business Templates",
  "Construction & Project Plans",
  "Faith Resources",
  "Craft Patterns",
  "Bible Study",
  "Other",
];

const listingSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(20, "Description must be at least 20 characters").max(1000),
  price: z.coerce.number().min(0.99, "Minimum price is $0.99").max(999, "Maximum price is $999"),
  category: z.string().min(1, "Select a category"),
  imageUrl: z.string().url().or(z.literal("")).optional(),
});
type FormValues = z.infer<typeof listingSchema>;

export default function NewListing() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadedFile, setUploadedFile] = useState<{ fileKey: string; fileName: string; fileSize: number } | null>(null);
  const [uploading, setUploading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: { title: "", description: "", price: 9.99, category: "", imageUrl: "" },
  });
  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 50MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        const res = await fetch("/api/marketplace/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": String(user!.id) },
          body: JSON.stringify({ fileName: file.name, fileData: base64, mimeType: file.type }),
        });
        const data = await res.json();
        if (data.fileKey) {
          setUploadedFile(data);
          toast({ title: "File uploaded!", description: `${file.name} is ready.` });
        } else {
          toast({ title: "Upload failed", description: data.error, variant: "destructive" });
        }
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
      setUploading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await fetch("/api/marketplace/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": String(user!.id) },
        body: JSON.stringify({
          ...values,
          fileName: uploadedFile?.fileName,
          fileKey: uploadedFile?.fileKey,
          fileSize: uploadedFile?.fileSize,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/marketplace/listings"] });
      toast({
        title: "Listing submitted!",
        description: user?.role === "admin"
          ? "Your product is live in the marketplace."
          : "Your listing has been submitted for admin approval.",
      });
      setLocation("/seller/dashboard");
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  if (!user) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 text-center">
      <div>
        <Lock className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-black mb-2">Sign in required</h2>
        <Link href="/login"><Button className="crimson-gradient text-[hsl(38,20%,96%)] font-bold">Sign In</Button></Link>
      </div>
    </div>
  );

  if (user.membershipTier === "free") return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 text-center">
      <div>
        <Lock className="w-10 h-10 text-primary mx-auto mb-4" />
        <h2 className="text-xl font-black mb-2">Paid membership required</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">Upgrade to start selling in the marketplace.</p>
        <Link href="/register"><Button className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn">Become a Member</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <Link href="/seller/dashboard">
        <Button variant="ghost" size="sm" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to My Store
        </Button>
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 crimson-gradient rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-[hsl(38,20%,96%)]" />
        </div>
        <div>
          <h1 className="text-2xl font-black leading-none">New Product Listing</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {user.role === "admin" ? "Products go live immediately" : "Submitted for admin review — usually approved within 24 hours"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="font-black text-base">Product Details</CardTitle>
          <CardDescription className="text-xs">You keep 94% of every sale. Platform fee: 6%.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(v => mutation.mutate(v))} className="space-y-5">

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Title <span className="text-primary">*</span></Label>
              <Input {...register("title")} placeholder="e.g. Faith Business Blueprint" data-testid="input-title" className={errors.title ? "border-destructive" : ""} />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Category <span className="text-primary">*</span></Label>
              <Select value={watch("category")} onValueChange={v => setValue("category", v, { shouldValidate: true })}>
                <SelectTrigger data-testid="select-category" className={errors.category ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Description <span className="text-primary">*</span></Label>
              <Textarea {...register("description")} rows={4} placeholder="Describe what's included, who it's for, and why it's valuable…" data-testid="input-description" className={errors.description ? "border-destructive" : ""} />
              {errors.description
                ? <p className="text-xs text-destructive">{errors.description.message}</p>
                : <p className="text-xs text-muted-foreground">{watch("description")?.length ?? 0} / 1000</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Price (USD) <span className="text-primary">*</span></Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input {...register("price")} type="number" step="0.01" min="0.99" max="999" className={`pl-7 ${errors.price ? "border-destructive" : ""}`} data-testid="input-price" />
              </div>
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
              {!errors.price && watch("price") > 0 && (
                <p className="text-xs text-muted-foreground">
                  You receive: <strong className="text-foreground">${(watch("price") * 0.94).toFixed(2)}</strong> per sale (after 6% platform fee)
                </p>
              )}
            </div>

            {/* Digital file upload */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Digital File <span className="text-primary">*</span></Label>
              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${uploadedFile ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/40"}`}
                onClick={() => fileInputRef.current?.click()}
                data-testid="file-upload-zone"
              >
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect}
                  accept=".pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.epub,.mp4,.mp3,.png,.jpg,.jpeg" />
                {uploading ? (
                  <><Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" /><p className="text-sm text-muted-foreground">Uploading…</p></>
                ) : uploadedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-6 h-6 text-primary" />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground">{uploadedFile.fileName}</p>
                      <p className="text-xs text-muted-foreground">{(uploadedFile.fileSize / 1024).toFixed(0)} KB</p>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); setUploadedFile(null); }} className="ml-2 text-muted-foreground hover:text-destructive">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm font-semibold mb-1">Click to upload your file</p>
                    <p className="text-xs text-muted-foreground">PDF, ZIP, DOC, EPUB, MP4, and more · Max 50MB</p>
                  </>
                )}
              </div>
            </div>

            {/* Optional cover image URL */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Cover Image URL <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
              <Input {...register("imageUrl")} placeholder="https://..." data-testid="input-image-url" className={errors.imageUrl ? "border-destructive" : ""} />
              {errors.imageUrl && <p className="text-xs text-destructive">Enter a valid URL or leave blank</p>}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn flex-1"
                disabled={mutation.isPending || !uploadedFile}
                data-testid="btn-submit-listing"
              >
                {mutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                  : <><CheckCircle className="w-4 h-4 mr-2" /> {user.role === "admin" ? "Publish Product" : "Submit for Approval"}</>
                }
              </Button>
              <Link href="/seller/dashboard">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
