import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Users, ShieldAlert, RefreshCw } from "lucide-react";

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [wiped, setWiped] = useState(false);

  if (!user || user.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  const { data: members = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/members"],
    queryFn: () => apiRequest("GET", "/api/members").then(r => r.json()),
  });

  const wipeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/wipe-test-users", {}),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({ title: "Done", description: data.message, duration: 6000 });
      setWiped(true);
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const tierColor = (tier: string) => {
    if (tier === "founding") return "bg-yellow-600 text-white";
    if (tier === "annual") return "bg-blue-600 text-white";
    return "bg-gray-600 text-white";
  };

  return (
    <div className="min-h-screen bg-background p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <ShieldAlert className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-black text-foreground">Admin Panel</h1>
      </div>

      {/* Wipe Test Users */}
      <Card className="mb-8 border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" /> Wipe Test Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Deletes all accounts except admin (ID 1) and LyMade Crafts (ID 2). Use this to clean up test signups before or after launch.
          </p>
          {wiped ? (
            <p className="text-green-500 font-semibold">✅ Test users deleted.</p>
          ) : (
            <Button
              variant="destructive"
              onClick={() => wipeMutation.mutate()}
              disabled={wipeMutation.isPending}
              data-testid="btn-wipe-test-users"
            >
              {wipeMutation.isPending ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Deleting...</> : "Delete All Test Users"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Member List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" /> All Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : (
            <div className="space-y-2">
              {members.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <Badge className={`text-xs ${tierColor(m.membershipTier)}`}>
                    {m.membershipTier}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
