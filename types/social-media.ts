export type SocialMediaPlatform = "instagram" | "twitter" | "linkedin" | "facebook" | "youtube";

export interface SocialMediaStats {
  id: number;
  orgId: string;
  platform: SocialMediaPlatform;
  date: string;
  postsPublished: number;
  storiesReels: number;
  followersTotal: number;
  engagementRate: string | null;
  impressions: number;
  reach: number;
  linkClicks: number;
  profileVisits: number;
  enteredBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SocialMediaLatestEntry {
  latest: SocialMediaStats | null;
  previous: SocialMediaStats | null;
}

export type SocialMediaLatest = Record<SocialMediaPlatform, SocialMediaLatestEntry>;
