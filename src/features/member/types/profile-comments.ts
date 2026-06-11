export interface ProfileCommentAuthor {
  memberId: string;
  slug: string;
  displayName: string;
  discordUsername: string;
  avatarUrl: string | null;
  avatarInitials: string;
}

export interface ProfileCommentReply {
  id: string;
  body: string;
  createdAt: string;
}

export interface ProfileComment {
  id: string;
  profileMemberId: string;
  author: ProfileCommentAuthor;
  body: string;
  isHidden: boolean;
  createdAt: string;
  reply: ProfileCommentReply | null;
}
