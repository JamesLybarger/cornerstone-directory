import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ArrowRight } from "lucide-react";

export default function Blog() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["/api/posts"],
    queryFn: () => apiRequest("GET", "/api/posts").then(r => r.json()),
  });

  const categories = ["All", ...Array.from(new Set(posts.map((p: any) => p.category)))];
  
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-black mb-3" data-testid="heading-blog">Kingdom Insights</h1>
        <p className="text-muted-foreground text-lg max-w-xl">
          Biblical wisdom, entrepreneurial strategy, and faith-fueled leadership content from the Cornerstone Directory.
        </p>
        <p className="verse-block mt-4 text-sm max-w-sm">
          "Plans succeed through good counsel; don't go to war without wise advice." — Proverbs 20:18
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6">
          {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-6">
          {posts.map((post: any, i: number) => (
            <Link key={post.id} href={`/blog/${post.slug}`}>
              <Card className={`card-hover cursor-pointer ${i === 0 ? "border-primary/30" : ""}`} data-testid={`card-post-${post.id}`}>
                <div className="md:flex">
                  {post.imageUrl && (
                    <div className="md:w-64 h-40 md:h-auto overflow-hidden rounded-t-lg md:rounded-l-lg md:rounded-tr-none flex-shrink-0">
                      <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <CardContent className="p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{post.category}</Badge>
                        {i === 0 && <Badge className="crimson-gradient text-[hsl(38,20%,96%)] text-xs">Featured</Badge>}
                      </div>
                      <h2 className="text-lg font-black text-foreground mb-2 leading-snug hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{post.excerpt}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                      <span className="text-primary text-sm font-semibold flex items-center gap-1">
                        Read <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 && !isLoading && (
        <div className="text-center py-20 text-muted-foreground">No posts published yet.</div>
      )}
    </div>
  );
}
