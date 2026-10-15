'use client';

import { memo } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Star, Eye } from 'lucide-react';

export interface StorylineServer {
  id: string;
  name: string;
  description: string;
  coverImage?: string | null;
  iconImage?: string | null;
  bannerUrl?: string | null;
  iconUrl?: string | null;
  genre: string;
  category?: string; // API uses this instead of genre
  tags: string;
  memberCount: number;
  rating: number;
  reviewCount: number;
  createdAt?: string;
  longDescription?: string | null;
  isPublic?: boolean;
  isAdult?: boolean; // Adult-only storyline
  owner?: {
    id: string;
    name?: string | null;
    username?: string | null;
    avatar?: string | null;
    avatarUrl?: string | null;
  };
  _count?: {
    members?: number;
    memberships?: number;
    reviews?: number;
  };
  isMember?: boolean;
  members?: Array<{ userId: string }>;
}

interface StorylineServerCardProps {
  server: StorylineServer;
  onClick?: () => void;
}

// Genre badges — quiet cyan/teal accents, with category variation kept subtle
const genreColors: Record<string, string> = {
  Fantasy: 'bg-primary/15 text-primary border-primary/30',
  'Sci-Fi': 'bg-primary/15 text-primary border-primary/30',
  Horror: 'bg-red-500/15 text-red-300 border-red-500/30',
  Romance: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  Mystery: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Adventure: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Drama: 'bg-primary/15 text-primary border-primary/30',
  Gothic: 'bg-muted text-muted-foreground border-border',
};

const defaultCovers: Record<string, string> = {
  Fantasy: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=200&fit=crop',
  'Sci-Fi': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=200&fit=crop',
  Horror: 'https://images.unsplash.com/photo-1509248961725-9d3c0c7a8f5b?w=400&h=200&fit=crop',
  Romance: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=200&fit=crop',
  Mystery: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop',
  Adventure: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=200&fit=crop',
  Drama: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&h=200&fit=crop',
  Gothic: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=200&fit=crop',
};

export const StorylineServerCard = memo(function StorylineServerCard({ server, onClick }: StorylineServerCardProps) {
  const displayGenre = server.genre || server.category || 'Fantasy';
  const genreColor = genreColors[displayGenre] || genreColors.Fantasy;
  const coverImage = server.coverImage || server.bannerUrl || defaultCovers[displayGenre] || defaultCovers.Fantasy;
  const memberCount = server._count?.memberships || server._count?.members || server.memberCount || 0;
  const reviewCount = server._count?.reviews || server.reviewCount || 0;
  const iconImage = server.iconImage || server.iconUrl;

  return (
    <Card
      className="group cursor-pointer overflow-hidden border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-lg hover:shadow-black/30"
      onClick={onClick}
    >
      {/* Cover Image */}
      <div className="relative h-32 w-full overflow-hidden">
        <img
          src={coverImage}
          alt={server.name}
          width={400}
          height={128}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />

        {/* Genre Badge */}
        <Badge
          className={`absolute top-3 left-3 ${genreColor} border font-medium`}
        >
          {displayGenre}
        </Badge>

        {/* Adult 18+ Badge */}
        {server.isAdult && (
          <Badge className="absolute top-3 right-3 bg-red-500/20 text-red-300 border-red-500/40 border font-bold">
            18+
          </Badge>
        )}

        {/* Icon/Logo */}
        {iconImage && (
          <div className="absolute -bottom-6 left-4 z-10">
            <Avatar className="h-12 w-12 border-2 border-card shadow-md">
              <AvatarImage src={iconImage} alt={server.name} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {server.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      <CardHeader className="pb-2 pt-8">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base leading-tight truncate text-foreground">{server.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {server.description}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Tags */}
        {server.tags && (
          <div className="flex flex-wrap gap-1">
            {server.tags.split(',').slice(0, 3).map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs px-2 py-0.5 font-normal"
              >
                {tag.trim()}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 border-t border-border">
        <div className="flex w-full items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5" title="Total members">
              <Users className="h-3.5 w-3.5" />
              <span className="tabular-nums">{memberCount}</span>
            </span>
            <span className="flex items-center gap-1.5" title="Rating">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="tabular-nums">{server.rating > 0 ? server.rating.toFixed(1) : 'N/A'}</span>
            </span>
            {reviewCount > 0 && (
              <span className="text-xs opacity-70 hidden sm:inline">{reviewCount} reviews</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs font-medium opacity-70 group-hover:opacity-100 group-hover:text-primary transition-all">
            <Eye className="h-3 w-3" />
            <span>View</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
})