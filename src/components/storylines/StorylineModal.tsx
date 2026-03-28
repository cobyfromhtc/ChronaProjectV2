'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  VisuallyHidden,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  Star,
  Calendar,
  UserPlus,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Sparkles,
  Globe,
  Lock,
  Crown,
} from 'lucide-react';
import type { StorylineServer } from './StorylineServerCard';

interface Review {
  id: string;
  rating: number;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    avatar?: string | null;
  };
}

interface StorylineModalProps {
  server: StorylineServer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId?: string;
  onEnterStoryline?: (storylineId: string) => void;
}

const genreConfig: Record<string, { color: string; bg: string; border: string; gradient: string }> = {
  Fantasy: { color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40', gradient: 'from-purple-600/30 to-fuchsia-600/20' },
  'Sci-Fi': { color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', gradient: 'from-cyan-600/30 to-blue-600/20' },
  Horror: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/40', gradient: 'from-red-600/30 to-rose-600/20' },
  Romance: { color: 'text-pink-400', bg: 'bg-pink-500/20', border: 'border-pink-500/40', gradient: 'from-pink-600/30 to-rose-600/20' },
  Mystery: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40', gradient: 'from-amber-600/30 to-orange-600/20' },
  Adventure: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', gradient: 'from-emerald-600/30 to-teal-600/20' },
  Drama: { color: 'text-violet-400', bg: 'bg-violet-500/20', border: 'border-violet-500/40', gradient: 'from-violet-600/30 to-purple-600/20' },
  'Slice of Life': { color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/40', gradient: 'from-rose-600/30 to-pink-600/20' },
  Comedy: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', gradient: 'from-yellow-600/30 to-amber-600/20' },
  Action: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/40', gradient: 'from-orange-600/30 to-red-600/20' },
  Thriller: { color: 'text-slate-400', bg: 'bg-slate-500/20', border: 'border-slate-500/40', gradient: 'from-slate-600/30 to-gray-600/20' },
  Supernatural: { color: 'text-indigo-400', bg: 'bg-indigo-500/20', border: 'border-indigo-500/40', gradient: 'from-indigo-600/30 to-violet-600/20' },
  Historical: { color: 'text-stone-400', bg: 'bg-stone-500/20', border: 'border-stone-500/40', gradient: 'from-stone-600/30 to-amber-600/20' },
  Other: { color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/40', gradient: 'from-gray-600/30 to-slate-600/20' },
};

const defaultCovers: Record<string, string> = {
  Fantasy: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=400&fit=crop',
  'Sci-Fi': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop',
  Horror: 'https://images.unsplash.com/photo-1509248961725-9d3c0c7a8f5b?w=800&h=400&fit=crop',
  Romance: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&h=400&fit=crop',
  Mystery: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
  Adventure: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=400&fit=crop',
  Drama: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&h=400&fit=crop',
};

export function StorylineModal({
  server,
  open,
  onOpenChange,
  currentUserId = 'demo-user',
  onEnterStoryline,
}: StorylineModalProps) {
  const [isJoining, setIsJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [serverDetails, setServerDetails] = useState<typeof server & {
    longDescription?: string | null;
    reviews?: Review[];
    owner?: {
      id: string;
      name?: string | null;
      username?: string | null;
      avatar?: string | null;
      bio?: string | null;
    };
    isPublic?: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [newReview, setNewReview] = useState({ rating: 5, content: '' });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (server && open) {
      fetchServerDetails();
    }
  }, [server, open]);

  const fetchServerDetails = async () => {
    if (!server) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/storylines/${server.id}`);
      if (response.ok) {
        const data = await response.json();
        const storylineData = data.storyline || data;
        setServerDetails(storylineData);
        setReviews(storylineData.reviews || []);
        
        const isMember = storylineData.members?.some(
          (m: { userId: string }) => m.userId === currentUserId
        ) || storylineData.isMember;
        setIsJoined(isMember);
      }
    } catch (error) {
      console.error('Failed to fetch server details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!server || isJoined) return;
    setIsJoining(true);
    try {
      const response = await fetch(`/api/storylines/${server.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });

      if (response.ok) {
        setIsJoined(true);
        fetchServerDetails();
      }
    } catch (error) {
      console.error('Failed to join server:', error);
    } finally {
      setIsJoining(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!server || !newReview.content.trim()) return;
    setIsSubmittingReview(true);
    try {
      const response = await fetch(`/api/storylines/${server.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUserId,
          rating: newReview.rating,
          content: newReview.content,
        }),
      });

      if (response.ok) {
        const review = await response.json();
        setReviews([review, ...reviews]);
        setNewReview({ rating: 5, content: '' });
        fetchServerDetails();
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (!server) return null;

  const mappedServerDetails = serverDetails ? {
    ...serverDetails,
    genre: serverDetails.genre || serverDetails.category,
    coverImage: serverDetails.coverImage || serverDetails.bannerUrl,
    iconImage: serverDetails.iconImage || serverDetails.iconUrl,
    memberCount: serverDetails.memberCount || serverDetails._count?.members || 0,
  } : null;

  const displayServer = mappedServerDetails || {
    ...server,
    genre: server.genre || server.category,
    coverImage: server.coverImage || server.bannerUrl,
    iconImage: server.iconImage || server.iconUrl,
    isPublic: server.isPublic ?? true, // Default to true if not specified
  };
  
  const displayName = displayServer.name || 'Untitled Storyline';
  const displayGenre = displayServer.genre || 'Fantasy';
  const displayDescription = displayServer.description || '';
  const genreStyle = genreConfig[displayGenre] || genreConfig.Fantasy;
  const coverImage = displayServer.coverImage || defaultCovers[displayGenre] || defaultCovers.Fantasy;
  const memberCount = displayServer.memberCount || 0;
  const reviewCount = displayServer.reviewCount || reviews.length || 0;
  const isPublic = displayServer.isPublic ?? true; // Extract with default

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[92vh] p-0 gap-0 overflow-hidden 
                   bg-gradient-to-b from-[#1e1435] to-[#150d26] 
                   border border-purple-500/20 shadow-2xl shadow-purple-900/30"
        showCloseButton={false}
      >
        {/* Visually hidden title for accessibility */}
        <VisuallyHidden>
          <DialogTitle>{displayName} - Storyline Details</DialogTitle>
        </VisuallyHidden>
        
        {/* Cover Image Section */}
        <div className="relative h-44 w-full overflow-hidden">
          <img
            src={coverImage}
            alt={displayName}
            className="h-full w-full object-cover"
          />
          {/* Multi-layer gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t from-[#150d26] via-[#150d26]/70 to-transparent`} />
          <div className={`absolute inset-0 bg-gradient-to-r ${genreStyle.gradient}`} />
          
          {/* Decorative top accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-500" />
          
          {/* Server Icon - Positioned better */}
          <div className="absolute -bottom-10 left-6 z-10">
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-[#150d26] shadow-xl shadow-purple-900/50 ring-2 ring-purple-500/30">
                <AvatarImage src={displayServer.iconImage || undefined} alt={displayName} />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white text-2xl font-bold">
                  {displayName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {/* Online indicator */}
              {isJoined && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#150d26] flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              )}
            </div>
          </div>
          
          {/* Public/Private badge */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5
                            ${isPublic 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              {isPublic ? (
                <><Globe className="w-3 h-3" /> Public</>
              ) : (
                <><Lock className="w-3 h-3" /> Private</>
              )}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="pt-14 pb-4">
          {/* Title & Description */}
          <div className="px-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-2xl font-bold text-white tracking-tight">{displayName}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${genreStyle.bg} ${genreStyle.color} ${genreStyle.border} border`}>
                    {displayGenre}
                  </span>
                </div>
                {displayDescription && (
                  <p className="mt-2 text-sm text-purple-200/70 line-clamp-2 leading-relaxed">
                    {displayDescription}
                  </p>
                )}
              </div>
            </div>

            {/* Stats Bar - Improved */}
            <div className="flex flex-wrap items-center gap-4 mt-4 py-3 px-4 rounded-xl bg-purple-500/5 border border-purple-500/10">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">{memberCount}</p>
                  <p className="text-xs text-purple-400/70">members</p>
                </div>
              </div>
              
              <div className="w-px h-8 bg-purple-500/20" />
              
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">
                    {displayServer.rating > 0 ? displayServer.rating.toFixed(1) : 'N/A'}
                  </p>
                  <p className="text-xs text-purple-400/70">{reviewCount} reviews</p>
                </div>
              </div>
              
              <div className="w-px h-8 bg-purple-500/20" />
              
              <div className="flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-xs">
                    {displayServer.createdAt ? new Date(displayServer.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}
                  </p>
                  <p className="text-xs text-purple-400/70">created</p>
                </div>
              </div>
            </div>

            {/* Owner Info */}
            {displayServer.owner && (
              <div className="flex items-center gap-3 mt-3 text-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/5 border border-purple-500/10">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-purple-400/70">Created by</span>
                  <Avatar className="h-5 w-5 ring-1 ring-purple-500/30">
                    <AvatarImage src={displayServer.owner.avatar || undefined} />
                    <AvatarFallback className="text-xs bg-purple-600/50">
                      {displayServer.owner.name?.charAt(0) || displayServer.owner.username?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-purple-100">
                    {displayServer.owner.name || displayServer.owner.username || 'Unknown'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-6 pb-4">
            {isJoined ? (
              <button
                onClick={() => onEnterStoryline?.(displayServer.id)}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm
                           bg-gradient-to-r from-emerald-600 to-teal-600 
                           hover:from-emerald-500 hover:to-teal-500
                           text-white shadow-lg shadow-emerald-900/30
                           transition-all duration-200 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                Enter Storyline
              </button>
            ) : (
              <button
                onClick={handleJoin}
                disabled={isJoining}
                className="w-full py-3 px-4 rounded-xl font-semibold text-sm
                           bg-gradient-to-r from-purple-600 to-fuchsia-600 
                           hover:from-purple-500 hover:to-fuchsia-500
                           text-white shadow-lg shadow-purple-900/30
                           transition-all duration-200 flex items-center justify-center gap-2
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isJoining ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Join Storyline
                  </>
                )}
              </button>
            )}
          </div>

          {/* Tabs - Custom styled */}
          <div className="px-6">
            <div className="flex gap-1 p-1 bg-purple-500/5 rounded-xl">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200
                           flex items-center justify-center gap-2
                           ${activeTab === 'details' 
                             ? 'bg-purple-500/20 text-purple-100 shadow-sm' 
                             : 'text-purple-400/70 hover:text-purple-200 hover:bg-purple-500/5'}`}
              >
                <Sparkles className="w-4 h-4" />
                Details
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200
                           flex items-center justify-center gap-2
                           ${activeTab === 'reviews' 
                             ? 'bg-purple-500/20 text-purple-100 shadow-sm' 
                             : 'text-purple-400/70 hover:text-purple-200 hover:bg-purple-500/5'}`}
              >
                <MessageSquare className="w-4 h-4" />
                Reviews ({reviewCount})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <ScrollArea className="h-[240px] px-6 py-4">
            {activeTab === 'details' && (
              <div className="space-y-5">
                {/* About Section */}
                <div>
                  <h4 className="text-sm font-semibold text-purple-200 mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 bg-gradient-to-b from-purple-500 to-fuchsia-500 rounded-full" />
                    About
                  </h4>
                  <p className="text-sm text-purple-300/80 leading-relaxed pl-3">
                    {displayServer.longDescription || displayServer.description || 'No description provided.'}
                  </p>
                </div>

                {/* Tags */}
                {displayServer.tags && (
                  <div>
                    <h4 className="text-sm font-semibold text-purple-200 mb-2 flex items-center gap-2">
                      <div className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full" />
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-2 pl-3">
                      {displayServer.tags.split(',').map((tag, index) => (
                        <span 
                          key={index} 
                          className="px-2.5 py-1 rounded-lg text-xs font-medium
                                     bg-purple-500/10 text-purple-300 border border-purple-500/20"
                        >
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rules */}
                <div>
                  <h4 className="text-sm font-semibold text-purple-200 mb-2 flex items-center gap-2">
                    <div className="w-1 h-4 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full" />
                    Community Guidelines
                  </h4>
                  <ul className="text-sm text-purple-300/70 space-y-2 pl-3">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded bg-purple-500/10 flex items-center justify-center text-xs text-purple-400 flex-shrink-0 mt-0.5">1</span>
                      Be respectful to all members
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded bg-purple-500/10 flex items-center justify-center text-xs text-purple-400 flex-shrink-0 mt-0.5">2</span>
                      Stay in character during roleplay sessions
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded bg-purple-500/10 flex items-center justify-center text-xs text-purple-400 flex-shrink-0 mt-0.5">3</span>
                      No god-modding or power playing
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded bg-purple-500/10 flex items-center justify-center text-xs text-purple-400 flex-shrink-0 mt-0.5">4</span>
                      Follow the community guidelines
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded bg-purple-500/10 flex items-center justify-center text-xs text-purple-400 flex-shrink-0 mt-0.5">5</span>
                      Have fun and be creative!
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {/* Write Review */}
                {isJoined && (
                  <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15">
                    <h4 className="text-sm font-semibold text-purple-200 mb-3">Write a Review</h4>
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setNewReview({ ...newReview, rating: star })}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`w-5 h-5 transition-colors ${
                              star <= newReview.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-purple-500/30 hover:text-amber-400/50'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-purple-400/70">
                        {newReview.rating}/5
                      </span>
                    </div>
                    <Textarea
                      placeholder="Share your experience..."
                      value={newReview.content}
                      onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
                      rows={2}
                      className="bg-purple-500/5 border-purple-500/20 text-purple-100 placeholder:text-purple-500/50 resize-none text-sm"
                    />
                    <button
                      onClick={handleSubmitReview}
                      disabled={!newReview.content.trim() || isSubmittingReview}
                      className="mt-3 px-4 py-2 rounded-lg text-sm font-medium
                                 bg-purple-500/20 text-purple-300 border border-purple-500/30
                                 hover:bg-purple-500/30 transition-colors
                                 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                )}

                {/* Reviews List */}
                {reviews.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-purple-400/50" />
                    </div>
                    <p className="text-purple-400/70 text-sm">No reviews yet</p>
                    <p className="text-purple-500/50 text-xs mt-1">Be the first to share your experience!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8 ring-1 ring-purple-500/20">
                              <AvatarImage src={review.user.avatar || undefined} />
                              <AvatarFallback className="bg-purple-600/50 text-xs">
                                {review.user.name?.charAt(0) || review.user.username?.charAt(0) || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm text-purple-100">
                                {review.user.name || review.user.username || 'Anonymous'}
                              </p>
                              <p className="text-xs text-purple-500/60">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= review.rating
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-purple-500/20'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-purple-300/70 leading-relaxed">{review.content}</p>
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-purple-500/10">
                          <button className="flex items-center gap-1.5 text-xs text-purple-400/60 hover:text-purple-300 transition-colors">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>Helpful</span>
                          </button>
                          <button className="flex items-center gap-1.5 text-xs text-purple-400/60 hover:text-purple-300 transition-colors">
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                          <button className="flex items-center gap-1.5 text-xs text-purple-400/60 hover:text-red-400 transition-colors ml-auto">
                            <Flag className="w-3.5 h-3.5" />
                            <span>Report</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
