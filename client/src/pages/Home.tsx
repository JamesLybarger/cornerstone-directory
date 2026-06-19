import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight, Users, BookOpen, Star, Shield, Globe, Gift,
  Check, X, DollarSign, TrendingUp, Award, Heart
} from "lucide-react";

export default function Home() {
  const { data: stats } = useQuery({ queryKey: ["/api/stats"], queryFn: () => fetch("/api/stats").then(r => r.json()) });
  const { data: founding } = useQuery({ queryKey: ["/api/founding-spots"], queryFn: () => fetch("/api/founding-spots").then(r => r.json()) });
  const { data: featuredPost } = useQuery({ queryKey: ["/api/posts/featured"], queryFn: () => fetch("/api/posts/featured").then(r => r.json()) });
  const { data: featuredProducts = [] } = useQuery({ queryKey: ["/api/products/featured"], queryFn: () => fetch("/api/products/featured").then(r => r.json()) });
  const { data: featuredBiz = [] } = useQuery({ queryKey: ["/api/businesses/featured"], queryFn: () => fetch("/api/businesses/featured").then(r => r.json()) });

  const spotsLeft = founding?.remaining ?? "…";
  const isFull = founding?.isFull ?? false;

  return (
    <div className="overflow-hidden">

      {/* ── HERO ── */}
      <section className="hero-gradient section-glow relative py-24 lg:py-36 px-4 sm:px-6 text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-primary/8 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto">
          <Badge className="crimson-gradient text-[hsl(38,20%,96%)] font-bold mb-6 px-4 py-1.5 text-xs tracking-widest uppercase">
            ✝ Faith · Business · Community
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black text-foreground mb-6 leading-tight" data-testid="heading-hero">
            The Christian Business<br />
            <span className="gold-text font-display italic">Directory Built for You</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-4 leading-relaxed">
            Find and support Christian-owned businesses across America — or get your business in front of customers who share your faith.
          </p>
          <p className="verse-block text-sm max-w-md mx-auto mb-10">
            "The stone the builders rejected has become the cornerstone." — Psalm 118:22
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href="/register">
              <Button size="lg" className="crimson-gradient text-[hsl(38,20%,96%)] font-black text-base px-8 h-12 shine-btn" data-testid="btn-hero-join">
                List My Business <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/directory">
              <Button size="lg" variant="outline" className="font-semibold text-base px-8 h-12">
                Browse Directory
              </Button>
            </Link>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            {[
              { label: "Members", value: stats?.memberCount || 0, icon: Users },
              { label: "Resources", value: stats?.productCount || 0, icon: BookOpen },
              { label: "Blog Posts", value: stats?.postCount || 0, icon: Star },
              { label: "Businesses", value: stats?.businessCount || 0, icon: Globe },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="text-center" data-testid={`stat-${label.toLowerCase()}`}>
                <Icon className="w-5 h-5 text-primary mx-auto mb-1.5 opacity-80" />
                <div className="text-2xl font-black text-foreground">{value}+</div>
                <div className="text-xs text-muted-foreground font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MEMBERSHIP TIERS ── */}
      <section className="py-20 px-4 sm:px-6 bg-card">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black text-foreground mb-3">Membership Plans</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Paid members unlock the full platform — business listing, resources, and the member network.
              Free access lets anyone browse the directory and read our content.
            </p>
          </div>

          {!isFull && (
            <div className="mb-8 p-4 rounded-2xl border border-primary/40 bg-primary/5 text-center">
              <p className="text-sm font-semibold">
                <span className="gold-text font-black text-base">{spotsLeft}</span>
                <span className="text-foreground"> Founding Member spots remaining</span>
                <span className="text-muted-foreground"> — lock in lifetime access at $59.99. Never pay again.</span>
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Founding Member",
                price: "$59.99",
                period: "one-time lifetime",
                badgeClass: "badge-founding",
                desc: isFull ? "Founding spots are full." : `Only ${spotsLeft} spots left. Pay once — access forever.`,
                features: [
                  "Business directory listing",
                  "Full platform access",
                  "Blog & resources library",
                  "Full member network access",
                  "$4.99 referral credit per referral",
                  "Lifetime — no renewals ever",
                ],
                cta: isFull ? "Spots Full" : "Claim Founding Spot",
                highlight: !isFull,
                disabled: isFull,
              },
              {
                name: "Annual Member",
                price: "$59.99",
                period: "per year",
                badgeClass: "badge-annual",
                desc: "Full platform access, renewed each year. Same $4.99 referral credit applied to your renewal.",
                features: [
                  "Business directory listing",
                  "Full platform access",
                  "Blog & resources library",
                  "Full member network access",
                  "$4.99 referral credit per referral",
                  "Credit applied to renewal",
                ],
                cta: "Join Annual",
                highlight: isFull,
                disabled: false,
              },
              {
                name: "Free Access",
                price: "Free",
                period: "always free",
                badgeClass: "badge-free",
                desc: "Browse the Christian business directory and read blog content — no account required.",
                features: [
                  "Browse business directory",
                  "Read blog & devotionals",
                  "Public resources",
                  "No business listing",
                  "No member network access",
                ],
                cta: "Browse Free",
                highlight: false,
                disabled: false,
                freeLink: "/directory",
              },
            ].map((tier) => (
              <Card key={tier.name} className={`card-hover relative flex flex-col ${tier.highlight ? "border-primary/50 shadow-lg shadow-primary/10" : ""}`} data-testid={`card-tier-${tier.name.toLowerCase().replace(/\s/g, '-')}`}>
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="crimson-gradient text-[hsl(38,20%,96%)] text-xs font-black px-4 py-1 rounded-full">BEST VALUE</span>
                  </div>
                )}
                <CardContent className="p-6 flex flex-col flex-1">
                  <span className={`badge-tier ${tier.badgeClass} mb-3`}>{tier.name}</span>
                  <div className="flex items-end gap-1 my-3">
                    <span className="text-3xl font-black text-foreground">{tier.price}</span>
                    <span className="text-muted-foreground text-sm mb-1">/{tier.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{tier.desc}</p>
                  <ul className="space-y-2 mb-6 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-foreground/80">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={(tier as any).freeLink || "/register"}>
                    <Button
                      className={`w-full font-bold ${tier.highlight ? "crimson-gradient text-[hsl(38,20%,96%)] shine-btn" : ""}`}
                      variant={tier.highlight ? "default" : "outline"}
                      disabled={tier.disabled}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Referral callout */}
          <div className="mt-8 p-5 rounded-2xl border border-dashed border-primary/30 bg-primary/5 flex items-start gap-4">
            <div className="w-10 h-10 crimson-gradient rounded-xl flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-[hsl(38,20%,96%)]" />
            </div>
            <div>
              <p className="font-bold text-sm mb-1">Earn $4.99 for every member you refer</p>
              <p className="text-sm text-muted-foreground">
                Both Founding and Annual members receive a <strong className="text-foreground">$4.99 referral credit</strong> for each new annual member who joins using their link.
                Credits are applied directly toward your next annual renewal — reducing your $59.99 fee automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY LIST WITH US ── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="crimson-gradient text-[hsl(38,20%,96%)] font-bold mb-4 px-4 py-1.5 text-xs tracking-widest uppercase">
              Why List With Us?
            </Badge>
            <h2 className="text-3xl font-black mb-3">What's In It for Your Business?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Other Christian directories charge hundreds of dollars for a basic name and phone number.
              Cornerstone Directory gives your business a real presence — at a fraction of the cost.
            </p>
          </div>

          {/* 6 value prop cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
            {[
              {
                icon: Heart,
                title: "Warm, Ready-to-Buy Audience",
                desc: "Every visitor already believes what you believe. These aren't cold leads — they're fellow Christians actively looking to support businesses like yours.",
              },
              {
                icon: DollarSign,
                title: "Radically Affordable",
                desc: "Competitors like Christian Blue charge $399–$699/year. Founding members here pay $59.99 once — and never again. Annual members pay $59.99/year. That's it.",
              },
              {
                icon: Globe,
                title: "National + Local Reach",
                desc: "Get found by Christians in your city, your state, or anywhere in the US. Visitors filter by location, category, and keyword — your business shows up where it matters.",
              },
              {
                icon: TrendingUp,
                title: "More Than a Listing",
                desc: "Your membership includes access to a digital store, resource library, blog content, and a growing member network — all tools to help your business grow.",
              },
              {
                icon: Gift,
                title: "Earn While You Refer",
                desc: "Share your referral link. Every new annual member who signs up earns you a $4.99 credit toward your renewal. The more you share, the less you pay.",
              },
              {
                icon: Award,
                title: "Founding Member Legacy",
                desc: "The first 500 members are the foundation of this directory. Claim your spot now and your $59.99 is locked in for life — no price increases, no renewals, ever.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="p-6 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors card-hover">
                <div className="w-11 h-11 crimson-gradient rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-[hsl(38,20%,96%)]" />
                </div>
                <h3 className="font-bold text-sm mb-2 text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="bg-card px-6 py-4 border-b border-border">
              <h3 className="font-black text-base text-foreground">How We Compare</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Cornerstone Directory vs. the industry average</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-6 py-3 text-muted-foreground font-semibold text-xs uppercase tracking-wide w-1/2">Feature</th>
                    <th className="px-6 py-3 text-center font-black text-xs uppercase tracking-wide w-1/4">
                      <span className="crimson-text">Cornerstone</span>
                      <div className="text-[10px] font-normal text-muted-foreground mt-0.5">From $59.99</div>
                    </th>
                    <th className="px-6 py-3 text-center text-muted-foreground font-semibold text-xs uppercase tracking-wide w-1/4">
                      Others
                      <div className="text-[10px] font-normal mt-0.5">$399–$699/yr avg</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Business Directory Listing",         true,      true],
                    ["National + Local Search Filters",    true,      "Partial"],
                    ["Digital Store Access",               true,      false],
                    ["Blog & Resource Library",            true,      false],
                    ["Referral Rewards Program",           true,      false],
                    ["Lifetime Founding Member Option",    true,      false],
                    ["Member Dashboard",                   true,      "Partial"],
                    ["Price Under $100/year",              true,      false],
                  ].map(([feature, cornerstone, others]) => (
                    <tr key={feature as string} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3.5 text-foreground/80 text-xs font-medium">{feature as string}</td>
                      <td className="px-6 py-3.5 text-center">
                        {cornerstone === true ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/15">
                            <Check className="w-3.5 h-3.5 text-primary" />
                          </span>
                        ) : cornerstone === false ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted">
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">{cornerstone as string}</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        {others === true ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted">
                            <Check className="w-3.5 h-3.5 text-muted-foreground" />
                          </span>
                        ) : others === false ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted">
                            <X className="w-3.5 h-3.5 text-muted-foreground/50" />
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium">{others as string}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 bg-primary/5 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Pricing compared to <span className="text-foreground font-semibold">Christian Blue ($399–$699/yr)</span> and the <span className="text-foreground font-semibold">US Christian Chamber ($348–$1,548/yr)</span>.
              </p>
              <Link href="/register">
                <Button size="sm" className="crimson-gradient text-[hsl(38,20%,96%)] font-bold shine-btn whitespace-nowrap">
                  List My Business <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURED BLOG ── */}
      {featuredPost && !featuredPost.error && (
        <section className="py-20 px-4 sm:px-6 bg-card">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black">Featured Insight</h2>
              <Link href="/blog"><span className="text-sm text-primary hover:underline cursor-pointer flex items-center gap-1">All posts <ArrowRight className="w-3.5 h-3.5" /></span></Link>
            </div>
            <Link href={`/blog/${featuredPost.slug}`}>
              <div className="group rounded-2xl overflow-hidden border border-border hover:border-primary/40 transition-colors cursor-pointer" data-testid="card-featured-post">
                <div className="md:flex">
                  {featuredPost.imageUrl && (
                    <div className="md:w-2/5 h-48 md:h-auto overflow-hidden">
                      <img src={featuredPost.imageUrl} alt={featuredPost.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                  <div className="p-8 md:w-3/5 flex flex-col justify-center">
                    <Badge variant="outline" className="w-fit mb-3 text-xs">{featuredPost.category}</Badge>
                    <h3 className="text-xl font-black text-foreground mb-3 group-hover:text-primary transition-colors leading-snug">{featuredPost.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-4">{featuredPost.excerpt}</p>
                    <span className="text-primary text-sm font-semibold flex items-center gap-1">Read more <ArrowRight className="w-3.5 h-3.5" /></span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ── FEATURED PRODUCTS ── */}
      {featuredProducts.length > 0 && (
        <section className="py-20 px-4 sm:px-6">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black">Resources & Tools</h2>
              <Link href="/store"><span className="text-sm text-primary hover:underline cursor-pointer flex items-center gap-1">View all <ArrowRight className="w-3.5 h-3.5" /></span></Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredProducts.slice(0, 3).map((p: any) => (
                <Link key={p.id} href="/store">
                  <Card className="card-hover cursor-pointer h-full" data-testid={`card-product-${p.id}`}>
                    {p.imageUrl && (
                      <div className="aspect-video overflow-hidden rounded-t-lg">
                        <img src={p.imageUrl} alt={p.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardContent className="p-4">
                      <Badge variant="outline" className="text-xs mb-2">{p.category}</Badge>
                      <h3 className="font-bold text-sm text-foreground mb-1 leading-snug">{p.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{p.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-primary text-base">${p.price.toFixed(2)}</span>
                        <Button size="sm" variant="outline" className="text-xs h-7">View</Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FEATURED DIRECTORY ── */}
      {featuredBiz.length > 0 && (
        <section className="py-20 px-4 sm:px-6 bg-card">
          <div className="max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black">Featured Faith-Based Businesses</h2>
              <Link href="/directory"><span className="text-sm text-primary hover:underline cursor-pointer flex items-center gap-1">Browse all <ArrowRight className="w-3.5 h-3.5" /></span></Link>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {featuredBiz.slice(0, 3).map((b: any) => (
                <Card key={b.id} className="card-hover" data-testid={`card-business-${b.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 crimson-gradient rounded-lg flex items-center justify-center text-sm font-black text-[hsl(38,20%,96%)] flex-shrink-0">
                        {b.businessName[0]}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm leading-snug">{b.businessName}</h3>
                        <span className="text-xs text-muted-foreground">{b.city ? `${b.city}, ` : ""}{b.state}{b.isNationwide ? " · Nationwide" : ""}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs mb-2">{b.category}</Badge>
                    <p className="text-xs text-muted-foreground line-clamp-2">{b.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── WHY THIS EXISTS ── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-3">Built on a Simple Idea</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Christians should support each other. When believers choose to do business with fellow believers, everyone grows — spiritually and financially.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, title: "Trusted Businesses", desc: "Faith-aligned business owners you can trust, refer, and confidently recommend to your church and community." },
              { icon: Users, title: "Find & Be Found", desc: "Customers searching for a Christian contractor, accountant, or consultant will find you — not a secular directory." },
              { icon: BookOpen, title: "Rooted in Scripture", desc: "Content, resources, and community built on Biblical principles for the marketplace." },
              { icon: Gift, title: "Referrals That Pay", desc: "Every member you bring in earns you $4.99 off your next renewal. Share your link — it pays." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center p-6 rounded-xl border border-border hover:border-primary/30 transition-colors">
                <div className="w-12 h-12 crimson-gradient rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-5 h-5 text-[hsl(38,20%,96%)]" />
                </div>
                <h3 className="font-bold text-sm mb-2">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="py-20 px-4 sm:px-6 bg-card">
        <div className="max-w-3xl mx-auto text-center">
          <div className="p-10 rounded-3xl border border-primary/20 bg-background relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <div className="relative">
              <h2 className="text-3xl font-black mb-4">Ready to Build Your Legacy?</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                Join a growing community of Christian entrepreneurs building businesses that honor God and serve their communities.
              </p>
              {!isFull && (
                <p className="text-sm text-primary font-semibold mb-4">
                  {spotsLeft} Founding Member spots left at $59.99 — lifetime access
                </p>
              )}
              <Link href="/register">
                <Button size="lg" className="crimson-gradient text-[hsl(38,20%,96%)] font-black text-base px-10 h-12 shine-btn" data-testid="btn-cta-join">
                  Join Now <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
