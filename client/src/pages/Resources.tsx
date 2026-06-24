import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "wouter";
import { Lock, BookOpen, Video, FileText, Compass, Heart, ExternalLink, Clock } from "lucide-react";

const TYPE_ICONS: Record<string, any> = {
  devotional: Heart,
  template: FileText,
  video: Video,
  guide: Compass,
  tool: BookOpen,
};

export default function Resources() {
  const { user } = useAuth();
  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["/api/resources", user?.id],
    queryFn: () => apiRequest("GET", `/api/resources/${user?.id || "public"}`).then(r => r.json()),
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-10">
        <h1 className="text-4xl font-black mb-3" data-testid="heading-resources">Cornerstone Resource Library</h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          Devotionals, tools, templates, and guides — all rooted in Biblical wisdom to help you grow your business.
        </p>
        {/* Coming Soon Banner */}
        <div className="mt-6 p-5 rounded-xl border border-primary/40 bg-primary/5 flex items-start gap-4">
          <div className="w-10 h-10 crimson-gradient rounded-full flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-[hsl(38,20%,96%)]" />
          </div>
          <div>
            <p className="font-black text-foreground text-base mb-1">Resources Coming Soon</p>
            <p className="text-sm text-muted-foreground">We're building a library of devotionals, business templates, and faith-aligned guides exclusively for Cornerstone members. Check back soon.</p>
          </div>
        </div>
        <p className="verse-block mt-4 text-sm max-w-sm">
          "The beginning of wisdom is this: Get wisdom, and whatever you get, get insight." — Proverbs 4:7
        </p>
      </div>

      {!user && (
        <div className="mb-8 p-5 rounded-2xl border border-primary/30 bg-card flex items-start gap-4">
          <div className="w-10 h-10 crimson-gradient rounded-xl flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-[hsl(38,20%,96%)]" />
          </div>
          <div>
            <h3 className="font-bold text-sm mb-1">Members-Only Resources</h3>
            <p className="text-sm text-muted-foreground mb-3">Some resources are exclusively for Cornerstone Directory members. Join today to unlock the full library.</p>
            <div className="flex gap-2">
              <Link href="/register"><Button size="sm" className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn">Join Now</Button></Link>
              <Link href="/login"><Button size="sm" variant="outline">Sign In</Button></Link>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {resources.map((r: any) => {
            const Icon = TYPE_ICONS[r.type] || BookOpen;
            const locked = r.membersOnly && !user;
            return (
              <Card key={r.id} className={`card-hover ${locked ? "opacity-70" : ""}`} data-testid={`card-resource-${r.id}`}>
                {r.imageUrl && !locked && (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover" />
                  </div>
                )}
                {locked && (
                  <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                    <Lock className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="text-xs capitalize">{r.type}</Badge>
                    {r.membersOnly && (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <Lock className="w-3 h-3" /> Members
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-2 mb-2">
                    <Icon className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <h3 className="font-bold text-sm leading-snug">{r.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">{r.description}</p>
                  {locked ? (
                    <Link href="/register">
                      <Button size="sm" variant="outline" className="w-full text-xs" data-testid={`btn-unlock-${r.id}`}>
                        <Lock className="w-3.5 h-3.5 mr-1.5" /> Unlock — Join Now
                      </Button>
                    </Link>
                  ) : (
                    <Button size="sm" className="w-full crimson-gradient text-[hsl(38,20%,96%)] font-bold" data-testid={`btn-access-${r.id}`}>
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Access Resource
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
