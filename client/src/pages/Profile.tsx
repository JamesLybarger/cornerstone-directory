import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Building2, Lock, Save, Eye, EyeOff } from "lucide-react";

export default function Profile() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
    city: user?.city || "",
    state: user?.state || "",
    businessName: user?.businessName || "",
    bio: user?.bio || "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const profileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const res = await apiRequest("PUT", `/api/users/${user?.id}`, data);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: (updated) => {
      toast({ title: "Profile updated", description: "Your changes have been saved." });
      // Update auth context with new user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async () => {
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error("New passwords do not match");
      }
      if (passwordForm.newPassword.length < 8) {
        throw new Error("New password must be at least 8 characters");
      }

      // Step 1: verify current password
      const checkRes = await apiRequest("POST", "/api/auth/login", {
        email: user?.email,
        password: passwordForm.currentPassword,
      });
      const checkData = await checkRes.json();
      if (!checkRes.ok || checkData.error) {
        throw new Error("Current password is incorrect — please try again");
      }

      // Step 2: save new password
      const saveRes = await apiRequest("PUT", `/api/users/${user?.id}`, {
        password: passwordForm.newPassword,
      });
      const saveData = await saveRes.json();
      if (!saveRes.ok || saveData.error) {
        throw new Error(saveData.error || "Failed to save new password");
      }

      return { email: user?.email };
    },
    onSuccess: ({ email }) => {
      toast({
        title: "Password updated ✅",
        description: `Log back in with: ${email}`,
        duration: 8000,
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => {
        logout();
        setLocation("/login");
      }, 4000);
    },
    onError: (err: any) => {
      toast({ title: "Password change failed", description: err.message, variant: "destructive", duration: 8000 });
    },
  });

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-card/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/dashboard")}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Edit Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Update your personal info, business details, and password</p>
        </div>

        {/* Personal & Business Info */}
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  data-testid="input-firstName"
                  value={profileForm.firstName}
                  onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  data-testid="input-lastName"
                  value={profileForm.lastName}
                  onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                data-testid="input-email"
                value={profileForm.email}
                onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                data-testid="input-phone"
                value={profileForm.phone}
                onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(435) 555-0100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  data-testid="input-city"
                  value={profileForm.city}
                  onChange={e => setProfileForm(f => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  data-testid="input-state"
                  value={profileForm.state}
                  onChange={e => setProfileForm(f => ({ ...f, state: e.target.value }))}
                  placeholder="UT"
                  maxLength={2}
                />
              </div>
            </div>

            <Separator className="bg-border/40" />

            <div className="flex items-center gap-2 pt-1">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Business Information</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                data-testid="input-businessName"
                value={profileForm.businessName}
                onChange={e => setProfileForm(f => ({ ...f, businessName: e.target.value }))}
                placeholder="Your business name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Business Description / Bio (optional)</Label>
              <textarea
                id="bio"
                data-testid="input-bio"
                value={profileForm.bio}
                onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Tell the community about your business..."
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              />
            </div>

            <Button
              onClick={() => profileMutation.mutate(profileForm)}
              disabled={profileMutation.isPending}
              className="w-full bg-primary hover:bg-primary/90"
              data-testid="button-save-profile"
            >
              <Save className="w-4 h-4 mr-2" />
              {profileMutation.isPending ? "Saving..." : "Save Profile"}
            </Button>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="border-border/40 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription className="text-xs">
              You'll be logged out after changing your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  data-testid="input-currentPassword"
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPasswords(s => ({ ...s, current: !s.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  data-testid="input-newPassword"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Minimum 8 characters"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPasswords(s => ({ ...s, new: !s.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  data-testid="input-confirmPassword"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPasswords(s => ({ ...s, confirm: !s.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={() => passwordMutation.mutate()}
              disabled={passwordMutation.isPending || !passwordForm.currentPassword || !passwordForm.newPassword}
              variant="outline"
              className="w-full border-primary/40 text-primary hover:bg-primary/10"
              data-testid="button-change-password"
            >
              <Lock className="w-4 h-4 mr-2" />
              {passwordMutation.isPending ? "Updating..." : "Change Password"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
