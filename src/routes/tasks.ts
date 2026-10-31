import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { getUserId, HttpError, parseId } from '../lib/http.js';
import {
  EMPTY_DOC,
  TASK_STATUSES,
  type TaskRow,
  type TaskStatus,
} from '../types.js';

export const tasksRouter = Router();

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

const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(200),
  description: contentSchema.optional(),
  descriptionText: z.string().max(200_000).optional(),
  status: statusSchema.optional(),
  position: z.number().int().min(0).optional(),
});

const updateTaskSchema = z
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

const moveTaskSchema = z.object({
  status: statusSchema,
  position: z.number().int().min(0).optional(),
});

async function nextPosition(
  userId: string,
  status: TaskStatus,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('position')
    .eq('user_id', userId)
    .eq('status', status)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  return ((data as { position?: number } | null)?.position ?? 0) + 1;
}

async function findTask(userId: string, id: number): Promise<TaskRow> {
  const { data, error } = await supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Task not found.');
  return data as TaskRow;
}

/** GET /api/tasks?status=planned — list tasks ordered by board position. */
tasksRouter.get('/', async (req, res) => {
  const userId = getUserId(req);
  const statusFilter = req.query.status;

  let query = supabaseAdmin
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (typeof statusFilter === 'string' && statusFilter.length > 0) {
    if (!TASK_STATUSES.includes(statusFilter as TaskStatus)) {
      throw new HttpError(400, 'Invalid status filter.');
    }
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) throw new HttpError(500, error.message);

  res.json({ tasks: (data ?? []) as TaskRow[] });
});

/** GET /api/tasks/:id */
tasksRouter.get('/:id', async (req, res) => {
  const userId = getUserId(req);
  const id = parseId(req.params.id);
  res.json({ task: await findTask(userId, id) });
});

/** POST /api/tasks */
tasksRouter.post('/', async (req, res) => {
  const userId = getUserId(req);
  const body = createTaskSchema.parse(req.body ?? {});
  const status: TaskStatus = body.status ?? 'planned';
  const position = body.position ?? (await nextPosition(userId, status));

  const { data, error } = await supabaseAdmin
    .from('tasks')
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

  res.status(201).json({ task: data as TaskRow });
});

/** PATCH /api/tasks/:id — update title, description, status or position. */
tasksRouter.patch('/:id', async (req, res) => {
  const userId = getUserId(req);
  const id = parseId(req.params.id);
  const body = updateTaskSchema.parse(req.body ?? {});
  const existing = await findTask(userId, id);

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.descriptionText !== undefined) {
    updates.description_text = body.descriptionText;
  }
  if (body.position !== undefined) updates.position = body.position;

  if (body.status !== undefined) {
    updates.status = body.status;
    if (
      body.status !== existing.status &&
      body.position === undefined
    ) {
      updates.position = await nextPosition(userId, body.status);
    }
  }

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Task not found.');

  res.json({ task: data as TaskRow });
});

/** PATCH /api/tasks/:id/status — used by the kanban drag & drop. */
tasksRouter.patch('/:id/status', async (req, res) => {
  const userId = getUserId(req);
  const id = parseId(req.params.id);
  const body = moveTaskSchema.parse(req.body ?? {});
  const existing = await findTask(userId, id);

  const position =
    body.position ??
    (body.status === existing.status
      ? existing.position
      : await nextPosition(userId, body.status));

  const { data, error } = await supabaseAdmin
    .from('tasks')
    .update({ status: body.status, position })
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Task not found.');

  res.json({ task: data as TaskRow });
});

/** DELETE /api/tasks/:id */
tasksRouter.delete('/:id', async (req, res) => {
  const userId = getUserId(req);
  const id = parseId(req.params.id);
  await findTask(userId, id);

  const { error } = await supabaseAdmin
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new HttpError(500, error.message);

  res.json({ ok: true, id });
});
