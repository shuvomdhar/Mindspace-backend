import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { getUserId, HttpError, parseId } from '../lib/http.js';
import {
  EMPTY_DOC,
  IDEA_STATUSES,
  type IdeaRow,
  type IdeaStatus,
} from '../types.js';

export const ideasRouter = Router();

const statusSchema = z.enum([
  'planned',
  'in_progress',
  'feature_request',
  'completed',
]);

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

const createIdeaSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(200),
  description: contentSchema.optional(),
  descriptionText: z.string().max(200_000).optional(),
  status: statusSchema.optional(),
  position: z.number().int().min(0).optional(),
});

const updateIdeaSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: contentSchema.optional(),
    descriptionText: z.string().max(200_000).optional(),
    status: statusSchema.optional(),
    position: z.number().int().min(0).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Nothing to update.',
  });

const moveIdeaSchema = z.object({
  status: statusSchema,
  position: z.number().int().min(0).optional(),
});

async function nextPosition(
  userId: string,
  status: IdeaStatus,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('ideas')
    .select('position')
    .eq('user_id', userId)
    .eq('status', status)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  return ((data as { position?: number } | null)?.position ?? 0) + 1;
}

async function findIdea(userId: string, id: number): Promise<IdeaRow> {
  const { data, error } = await supabaseAdmin
    .from('ideas')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Idea not found.');
  return data as IdeaRow;
}

/** GET /api/ideas?status=planned — list ideas ordered by board position. */
ideasRouter.get('/', async (req, res) => {
  const userId = getUserId(req);
  const statusFilter = req.query.status;

  let query = supabaseAdmin
    .from('ideas')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (typeof statusFilter === 'string' && statusFilter.length > 0) {
    if (!IDEA_STATUSES.includes(statusFilter as IdeaStatus)) {
      throw new HttpError(400, 'Invalid status filter.');
    }
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) throw new HttpError(500, error.message);

  res.json({ ideas: (data ?? []) as IdeaRow[] });
});

/** GET /api/ideas/:id */
ideasRouter.get('/:id', async (req, res) => {
  const userId = getUserId(req);
  const id = parseId(req.params.id);
  res.json({ idea: await findIdea(userId, id) });
});

/** POST /api/ideas */
ideasRouter.post('/', async (req, res) => {
  const userId = getUserId(req);
  const body = createIdeaSchema.parse(req.body ?? {});
  const status: IdeaStatus = body.status ?? 'planned';
  const position = body.position ?? (await nextPosition(userId, status));

  const { data, error } = await supabaseAdmin
    .from('ideas')
    .insert({
      user_id: userId,
      title: body.title,
      description: body.description ?? EMPTY_DOC,
      description_text: body.descriptionText ?? '',
      status,
      position,
    })
    .select('*')
    .single();

  if (error) throw new HttpError(500, error.message);

  res.status(201).json({ idea: data as IdeaRow });
});

/** PATCH /api/ideas/:id — update title, description, status or position. */
ideasRouter.patch('/:id', async (req, res) => {
  const userId = getUserId(req);
  const id = parseId(req.params.id);
  const body = updateIdeaSchema.parse(req.body ?? {});
  const existing = await findIdea(userId, id);

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.descriptionText !== undefined) {
    updates.description_text = body.descriptionText;
  }
  if (body.position !== undefined) updates.position = body.position;

  if (body.status !== undefined) {
    updates.status = body.status;
    if (body.status !== existing.status && body.position === undefined) {
      updates.position = await nextPosition(userId, body.status);
    }
  }

  const { data, error } = await supabaseAdmin
    .from('ideas')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Idea not found.');

  res.json({ idea: data as IdeaRow });
});

/** PATCH /api/ideas/:id/status — used by the kanban drag & drop. */
ideasRouter.patch('/:id/status', async (req, res) => {
  const userId = getUserId(req);
  const id = parseId(req.params.id);
  const body = moveIdeaSchema.parse(req.body ?? {});
  const existing = await findIdea(userId, id);

  const position =
    body.position ??
    (body.status === existing.status
      ? existing.position
      : await nextPosition(userId, body.status));

  const { data, error } = await supabaseAdmin
    .from('ideas')
    .update({ status: body.status, position })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Idea not found.');

  res.json({ idea: data as IdeaRow });
});

/** DELETE /api/ideas/:id */
ideasRouter.delete('/:id', async (req, res) => {
  const userId = getUserId(req);
  const id = parseId(req.params.id);
  await findIdea(userId, id);

  const { error } = await supabaseAdmin
    .from('ideas')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new HttpError(500, error.message);

  res.json({ ok: true, id });
});
