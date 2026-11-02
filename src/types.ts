export type IdeaStatus =
  | 'planned'
  | 'in_progress'
  | 'feature_request'
  | 'completed';

export const IDEA_STATUSES: IdeaStatus[] = [
  'planned',
  'in_progress',
  'feature_request',
  'completed',
];

export type ProfileStatus = 'failed' | 'active' | 'inactive' | 'archived';

export type NoteStatus = 'active' | 'archived';

/** Tiptap/ProseMirror JSON document. */
export type RichTextDoc = {
  type: 'doc';
  content?: unknown[];
  [key: string]: unknown;
};

export interface ProfileRow {
  id: number;
  user_id: string;
  email: string;
  full_name: string | null;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
}

export interface NoteRow {
  id: number;
  user_id: string;
  title: string;
  content: RichTextDoc;
  content_text: string;
  status: NoteStatus;
  created_at: string;
  updated_at: string;
}

export interface NoteSummary {
  id: number;
  title: string;
  content_text: string;
  status: NoteStatus;
  created_at: string;
  updated_at: string;
}

export interface IdeaRow {
  id: number;
  user_id: string;
  title: string;
  description: RichTextDoc;
  description_text: string;
  status: IdeaStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

export const EMPTY_DOC: RichTextDoc = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};
