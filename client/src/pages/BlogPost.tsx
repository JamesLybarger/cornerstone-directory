import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar } from "lucide-react";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["/api/posts", slug],
    queryFn: () => fetch(`/api/posts/${slug}`).then(r => r.json()),
    enabled: !!slug,
  });

  if (isLoading) return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <Skeleton className="h-8 w-24 mb-8" />
      <Skeleton className="h-64 w-full rounded-xl mb-8" />
      <Skeleton className="h-10 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3 mb-2" />
    </div>
  );

  if (!post || post.error) return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
      <p className="text-muted-foreground mb-4">Post not found.</p>
      <Link href="/blog"><Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Blog</Button></Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
      <Link href="/blog">
        <Button variant="ghost" size="sm" className="mb-8 gap-1.5" data-testid="btn-back-blog">
          <ArrowLeft className="w-4 h-4" /> Back to Blog
        </Button>
      </Link>

      {post.imageUrl && (
        <div className="aspect-video rounded-2xl overflow-hidden mb-8">
          <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <Badge variant="outline" className="text-xs">{post.category}</Badge>
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {new Date(post.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </span>
      </div>

      <h1 className="text-3xl font-black text-foreground mb-4 leading-tight" data-testid="heading-post-title">{post.title}</h1>
      <p className="text-muted-foreground text-base leading-relaxed mb-8 border-l-2 border-primary/40 pl-4 italic">{post.excerpt}</p>

      <div
        className="prose prose-invert prose-sm max-w-none text-foreground/90 leading-relaxed [&_h2]:text-lg [&_h2]:font-black [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:mb-4 [&_ul]:space-y-2 [&_li]:ml-4 [&_strong]:text-foreground"
        dangerouslySetInnerHTML={{ __html: post.content }}
        data-testid="post-content"
      />

      <div className="mt-12 p-6 rounded-2xl bg-card border border-primary/20">
        <p className="verse-block text-sm">"Commit to the Lord whatever you do, and he will establish your plans." — Proverbs 16:3</p>
        <div className="mt-4 flex gap-3">
          <Link href="/register">
            <Button className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn" size="sm">Join the Network</Button>
          </Link>
          <Link href="/booking">
            <Button variant="outline" size="sm">Book a Coach</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
