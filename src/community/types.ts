export interface CommunityPost {
  id: string;
  owner: string;
  object_id: string;
  caption: string;
  equipment: string;
  kind: 'capture' | 'processed' | 'creative';
  status: string;
  created_at: string;
}
export interface CommunityComment {
  id: string;
  owner: string;
  body: string;
  post_id: string;
  status: string;
  created_at: string;
}
export interface CommunityMember {
  id: string;
  name: string;
  suspended: boolean;
}
export interface CommunityCase {
  id: string;
  owner: string;
  post_id: string | null;
  comment_id: string | null;
  reason: string;
  created_at: string;
  resolved: boolean;
}
export interface CloudBackup {
  id: string;
  size: number;
  created_at: string;
  ready: boolean;
}
