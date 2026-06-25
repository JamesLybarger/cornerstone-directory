import { useForm } from "react-hook-form";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function Login() {
  const { register, handleSubmit } = useForm();
  const { login, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: any) => {
    try {
      await login(data.email, data.password);
      setLocation("/dashboard");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 crimson-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-6 h-6 text-[hsl(38,20%,96%)]" />
          </div>
          <h1 className="text-2xl font-black mb-1">Welcome Back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your Kingdom Business account</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label>Email *</Label>
                <Input {...register("email", { required: true })} type="email" placeholder="you@example.com" data-testid="input-login-email" />
              </div>
              <div>
                <Label>Password *</Label>
                <div className="relative">
                  <Input {...register("password", { required: true })} type={showPassword ? "text" : "password"} placeholder="••••••••" data-testid="input-login-password" className="pr-10" />
                  <button type="button" onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full crimson-gradient text-[hsl(38,20%,96%)] font-black shine-btn" disabled={isLoading} data-testid="btn-submit-login">
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register"><span className="text-primary hover:underline cursor-pointer font-semibold">Join Now</span></Link>
            </div>
            <div className="mt-3 p-3 rounded-lg bg-muted text-xs text-muted-foreground">
              <strong>Demo admin:</strong> admin@cornerstonedirectory.com / admin123
            </div>
          </CardContent>
        </Card>

        <p className="verse-block text-xs text-center mt-6 mx-auto max-w-xs">
          "Come to me, all who labor and are heavy laden, and I will give you rest." — Matthew 11:28
        </p>
      </div>
    </div>
  );
}
