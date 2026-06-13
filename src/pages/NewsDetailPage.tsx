import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, CalendarDays, Newspaper, User } from "lucide-react";
import { api } from "@/api/endpoints";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export function NewsDetailPage() {
  const { articleId } = useParams();
  const id = articleId ?? "";

  const {
    data: post,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.newsPost(id),
    queryFn: () => api.getNewsPost(id),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-launcher-border px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="icon-sm" asChild>
              <Link to="/news" aria-label="Back to news">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-launcher-green/20 bg-launcher-green/10 text-launcher-green shadow-glow-sm">
              <Newspaper className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold leading-tight">
                {post?.title ?? "News article"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Read the full CraftersLand announcement.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="mx-auto w-full max-w-4xl p-6">
          {isLoading ? (
            <ArticleLoading />
          ) : isError || !post ? (
            <EmptyState
              icon={Newspaper}
              title="News article not found"
              description={
                (error as Error | undefined)?.message ||
                "This post may have been unpublished or removed."
              }
              action={
                <Button variant="secondary" asChild>
                  <Link to="/news">
                    <ArrowLeft className="h-4 w-4" />
                    Back to news
                  </Link>
                </Button>
              }
            />
          ) : (
            <article className="surface-card overflow-hidden rounded-3xl">
              {post.imageUrl && (
                <div className="relative h-72 overflow-hidden bg-launcher-bg-active">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.parentElement?.classList.add("hidden");
                    }}
                  />
                  <div className="absolute inset-0 bg-hero-fade" />
                </div>
              )}

              <div className="p-6 lg:p-8">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px]">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                  {post.title}
                </h2>

                {post.excerpt && (
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    {post.excerpt}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-4 border-b border-launcher-border pb-5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {post.author}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(post.publishedAt ?? post.createdAt, "MMMM d, yyyy")}
                  </span>
                </div>

                {post.body?.trim() ? (
                  <div className="prose mt-6">
                    <ReactMarkdown>{post.body}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-launcher-border bg-launcher-bg-primary/45 p-5 text-sm text-muted-foreground">
                    This article does not have any readable body content yet.
                  </div>
                )}
              </div>
            </article>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ArticleLoading() {
  return (
    <div className="surface-card overflow-hidden rounded-3xl">
      <Skeleton className="h-72 w-full" />
      <div className="space-y-4 p-6 lg:p-8">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="pt-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
        </div>
      </div>
    </div>
  );
}
