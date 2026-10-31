import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { getUserId, HttpError, parseId } from '../lib/http.js';
import { EMPTY_DOC, type NoteRow, type NoteSummary } from '../types.js';

export const notesRouter = Router();

const contentSchema = z.unknown().refine(
  (value) => {
    if (value === undefined) return true;
    try {
      return JSON.stringify(value).length <= 500_000;
    } catch {
      return false;
    }
  },
  { message: 'Rich text content is too large.' },
);

const createNoteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(200).optional(),
  content: contentSchema.optional(),
  contentText: z.string().max(200_000).optional(),
});

const updateNoteSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required.').max(200).optional(),
    content: contentSchema.optional(),
    contentText: z.string().max(200_000).optional(),
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.content !== undefined ||
      value.contentText !== undefined,
    { message: 'Provide a title, content or contentText.' },
  );

/** GET /api/notes — list active note summaries (newest first). */
notesRouter.get('/', async (req, res) => {
  const userId = getUserId(req);

  const { data, error } = await supabaseAdmin
    .from('notes')
    .select('id, title, content_text, status, created_at, updated_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (error) throw new HttpError(500, error.message);

  res.json({ notes: (data ?? []) as NoteSummary[] });
});

/** GET /api/notes/:id — full active note including the rich-text document. */
notesRouter.get('/:id', async (req, res) => {
  const userId = getUserId(req);
  const id = parseId(req.params.id);

  const { data, error } = await supabaseAdmin
    .from('notes')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Note not found.');

  res.json({ note: data as NoteRow });
});

/** POST /api/notes — create a note. */
notesRouter.post('/', async (req, res) => {
  const userId = getUserId(req);
  const body = createNoteSchema.parse(req.body ?? {});

  const { data, error } = await supabaseAdmin
    .from('notes')
    .insert({
      user_id: userId,
      title: body.title ?? 'Untitled note',
      content: body.content ?? EMPTY_DOC,
      content_text: body.contentText ?? '',
    })
    .select('*')
    .single();

  if (error) throw new HttpError(500, error.message);

  res.status(201).json({ note: data as NoteRow });
});

/** PATCH /api/notes/:id — update a note's title and/or content. */
notesRouter.patch('/:id', async (req, res) => {
  const userId = getUserId(req);
  const id = parseId(req.params.id);
  const body = updateNoteSchema.parse(req.body ?? {});

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;
  if (body.contentText !== undefined) updates.content_text = body.contentText;

  const { data, error } = await supabaseAdmin
    .from('notes')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .select('*')
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Note not found.');

  res.json({ note: data as NoteRow });
});

/**
 * DELETE /api/notes/:id — soft-delete a note.
 * The row is kept in the database and its status becomes `archived`.
 */
notesRouter.delete('/:id', async (req, res) => {
  const userId = getUserId(req);
  const id = parseId(req.params.id);

  const { data, error } = await supabaseAdmin
    .from('notes')
    .update({ status: 'archived' })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('status', 'active')
    .select('id')
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Note not found.');

  res.json({ ok: true, id });
});
