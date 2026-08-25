import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

export default function AdminRecovery() {
  const [, navigate] = useLocation();
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setWorking(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await apiRequest("POST", "/api/auth/admin-recovery", {
        email: form.get("email"),
        recoveryToken: form.get("recoveryToken"),
        newPassword: form.get("newPassword"),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || "Recovery failed");
      }
      navigate("/dashboard");
      window.location.reload();
    } catch (e: any) {
      setError(e.message || "Recovery failed");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Card>
        <CardHeader><CardTitle>Administrator Account Recovery</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Input name="email" type="email" placeholder="Administrator email" required />
            <Input name="recoveryToken" type="password" placeholder="Temporary recovery code" required />
            <Input name="newPassword" type="password" minLength={12} placeholder="New password (12+ characters)" required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={working}>{working ? "Recovering…" : "Recover Administrator Account"}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
