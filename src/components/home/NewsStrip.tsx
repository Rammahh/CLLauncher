import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import type { NewsPost } from "@/types";

export function NewsStrip({ posts }: { posts: NewsPost[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {posts.map((post) => {
        const articlePath = `/news/${post.slug || post.id}`;
        const card = (
          <article
            key={post.id}
            className="group surface-card rounded-xl overflow-hidden h-full flex flex-col transition-all hover:-translate-y-0.5 hover:border-launcher-green/30 animate-fade-up"
          >
            {post.imageUrl && (
              <div className="h-24 bg-launcher-bg-active overflow-hidden shrink-0">
                <img
                  src={post.imageUrl}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).parentElement!.style.display =
                      "none";
                  }}
                />
              </div>
            )}
            <div className="p-3 flex-1 flex flex-col">
              <div className="flex items-center gap-1.5 mb-1">
                {post.tags?.slice(0, 1).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
              <h3 className="text-sm font-semibold text-foreground line-clamp-1 group-hover:text-launcher-green transition-colors">
                {post.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1 flex-1">
                {getNewsExcerpt(post)}
              </p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground/60">
                  {formatDate(post.publishedAt ?? post.createdAt)}
                </span>
                <ArrowRight className="w-3 h-3 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-launcher-green" />
              </div>
            </div>
          </article>
        );

        return (
          <Link key={post.id} to={articlePath} className="block h-full">
            {card}
          </Link>
        );
      })}
    </div>
  );
}

function getNewsExcerpt(post: NewsPost): string {
  return (post.excerpt || post.body || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#>*_`~\[\]()!-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

export function NewsStripSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="surface-card rounded-xl overflow-hidden"
        >
          <Skeleton className="h-24 w-full" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
