import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Megaphone, Newspaper, Sparkles } from "lucide-react";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import type { NewsPost } from "@/types";

const ALL_CATEGORIES = "all";

export function NewsPage() {
  const [category, setCategory] = useState(ALL_CATEGORIES);

  const { data: posts, isLoading } = useQuery({
    queryKey: queryKeys.news,
    queryFn: api.getNews,
    staleTime: 5 * 60_000,
  });

  const sorted = useMemo(
    () =>
      [...(posts ?? [])].sort((a, b) => {
        return +new Date(getNewsDate(b)) - +new Date(getNewsDate(a));
      }),
    [posts]
  );

  const categories = useMemo(
    () => [...new Set(sorted.flatMap((post) => post.tags ?? []))],
    [sorted]
  );

  const featured = sorted[0];
  const filtered =
    category === ALL_CATEGORIES
      ? sorted
      : sorted.filter((post) => post.tags?.includes(category));

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-launcher-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-launcher-green/20 bg-launcher-green/10 text-launcher-green shadow-glow-sm">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">News & Updates</h1>
            <p className="text-xs text-muted-foreground">
              Announcements, patch notes and modpack releases from CraftersLand
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="mx-auto w-full max-w-6xl space-y-5 p-6">
          {isLoading ? (
            <NewsLoading />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title="No news yet"
              description="There are no announcements right now. Check back soon for patch notes and modpack updates."
            />
          ) : (
            <>
              {featured && <FeaturedNews post={featured} total={sorted.length} />}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Latest Posts
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground/70">
                    {filtered.length} update{filtered.length === 1 ? "" : "s"} shown
                  </p>
                </div>
                {categories.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryButton
                      active={category === ALL_CATEGORIES}
                      onClick={() => setCategory(ALL_CATEGORIES)}
                    >
                      All
                    </CategoryButton>
                    {categories.map((item) => (
                      <CategoryButton
                        key={item}
                        active={category === item}
                        onClick={() => setCategory(item)}
                      >
                        {item}
                      </CategoryButton>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filtered.map((post) => (
                  <NewsCard key={post.id} post={post} />
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function FeaturedNews({
  post,
  total,
}: {
  post: NewsPost;
  total: number;
}) {
  const articlePath = `/news/${post.slug || post.id}`;

  const card = (
    <article className="surface-card group relative overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-0.5 hover:border-launcher-green/30 hover:shadow-elevated">
      {post.imageUrl && (
        <img
          src={post.imageUrl}
          alt={post.title}
          className="absolute inset-0 h-full w-full object-cover opacity-35 transition-transform duration-500 group-hover:scale-[1.03]"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-launcher-bg-card via-launcher-bg-card/92 to-launcher-bg-primary/70" />
      <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-launcher-green/10 blur-3xl" />
      <div className="relative grid gap-5 p-6 lg:grid-cols-[1fr_220px] lg:p-7">
        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {post.tags?.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">
                {tag}
              </Badge>
            ))}
            <span className="text-xs text-muted-foreground">
              {post.author} · {formatDate(getNewsDate(post))}
            </span>
          </div>
          <h2 className="max-w-3xl text-2xl font-semibold tracking-tight text-foreground transition-colors group-hover:text-launcher-green">
            {post.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {getNewsExcerpt(post)}
          </p>
          <Button variant="install" size="sm" className="mt-5" asChild>
            <Link to={articlePath}>
              Read article
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <NewsMetric icon={Megaphone} label="Updates" value={String(total)} />
          <NewsMetric
            icon={Sparkles}
            label="Featured"
            value="Latest"
          />
        </div>
      </div>
    </article>
  );

  return card;
}

function NewsCard({
  post,
}: {
  post: NewsPost;
}) {
  const articlePath = `/news/${post.slug || post.id}`;

  const card = (
    <article className="surface-card group flex h-full overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:border-launcher-green/30 hover:shadow-elevated">
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {post.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              {tag}
            </Badge>
          ))}
          <span className="text-xs text-muted-foreground">
            {formatDate(getNewsDate(post))}
          </span>
        </div>
        <h3 className="line-clamp-2 text-base font-semibold text-foreground transition-colors group-hover:text-launcher-green">
          {post.title}
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {getNewsExcerpt(post)}
        </p>
        <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
          <span className="truncate">{post.author}</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/70 transition-transform group-hover:translate-x-0.5 group-hover:text-launcher-green" />
        </div>
      </div>
      {post.imageUrl && (
        <div className="hidden w-36 shrink-0 overflow-hidden bg-launcher-bg-active sm:block">
          <img
            src={post.imageUrl}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
            onError={(event) => { event.currentTarget.parentElement?.classList.add("hidden"); }}
          />
        </div>
      )}
    </article>
  );

  return (
    <Link to={articlePath} className="block h-full">
      {card}
    </Link>
  );
}

function CategoryButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-all",
        active
          ? "border-launcher-green/40 bg-launcher-green/15 text-launcher-green"
          : "border-launcher-border bg-launcher-bg-card text-muted-foreground hover:bg-launcher-bg-hover hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function NewsMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Megaphone;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-launcher-border bg-launcher-bg-primary/45 p-4">
      <Icon className="mb-3 h-4 w-4 text-launcher-green" />
      <p className="text-lg font-semibold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function NewsLoading() {
  return (
    <div className="space-y-5">
      <div className="surface-card rounded-3xl p-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="mt-5 h-8 w-2/3" />
        <Skeleton className="mt-3 h-4 w-full max-w-3xl" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card rounded-2xl p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-5 w-2/3" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

function getNewsDate(post: NewsPost): string {
  return post.publishedAt ?? post.createdAt;
}

function getNewsExcerpt(post: NewsPost): string {
  return post.excerpt || stripMarkdown(post.body).slice(0, 180);
}

function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`~\[\]()!-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

