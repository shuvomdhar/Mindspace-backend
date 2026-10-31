import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabase.js';
import { getUserId, HttpError } from '../lib/http.js';
import type { ProfileRow } from '../types.js';

export const profileRouter = Router();

// Never select `password_hash` here: it must never leave the database.
const PROFILE_COLUMNS =
  'id, user_id, email, full_name, status, created_at, updated_at';

const updateProfileSchema = z
  .object({
    // Users may only change their full name.
    fullName: z.string().trim().max(120).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Nothing to update.',
  });

async function getOrCreateProfile(
  userId: string,
  email: string | null,
  fullName: string | null,
): Promise<ProfileRow> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (data) return data as ProfileRow;

  const { data: created, error: insertError } = await supabaseAdmin
    .from('profiles')
    .insert({
      user_id: userId,
      email: email ?? '',
      full_name: fullName,
    })
    .select(PROFILE_COLUMNS)
    .single();

  if (insertError) throw new HttpError(500, insertError.message);
  return created as ProfileRow;
}

async function markActive(profile: ProfileRow): Promise<ProfileRow> {
  if (profile.status !== 'failed' && profile.status !== 'inactive') {
    return profile;
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ status: 'active' })
    .eq('user_id', profile.user_id)
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Profile not found.');
  return data as ProfileRow;
}

/**
 * GET /api/profile — current user's profile.
 * A successful authenticated request means the user has signed in, so a
 * `failed` profile becomes `active` here.
 */
profileRouter.get('/', async (req, res) => {
  const userId = getUserId(req);
  const user = req.user!;
  const profile = await getOrCreateProfile(userId, user.email, user.fullName);

  if (profile.status === 'archived') {
    throw new HttpError(403, 'This account has been archived.');
  }

  res.json({ profile: await markActive(profile) });
});

/** PATCH /api/profile — update the full name only. */
profileRouter.patch('/', async (req, res) => {
  const userId = getUserId(req);
  const body = updateProfileSchema.parse(req.body ?? {});
  const user = req.user!;

  const profile = await getOrCreateProfile(userId, user.email, user.fullName);
  if (profile.status === 'archived') {
    throw new HttpError(403, 'This account has been archived.');
  }

  const updates: Record<string, unknown> = {};
  if (body.fullName !== undefined) updates.full_name = body.fullName;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Profile not found.');

  res.json({ profile: data as ProfileRow });
});

/** POST /api/profile/logout — mark the profile inactive on sign out. */
profileRouter.post('/logout', async (req, res) => {
  const userId = getUserId(req);
  const user = req.user!;
  const profile = await getOrCreateProfile(userId, user.email, user.fullName);

  // Never overwrite an archived account on logout.
  if (profile.status === 'archived') {
    res.json({ ok: true });
    return;
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ status: 'inactive' })
    .eq('user_id', userId);

  if (error) throw new HttpError(500, error.message);

  res.json({ ok: true });
});

/**
 * DELETE /api/profile — soft-delete the account.
 * The profile row and all user data are retained; only the status changes.
 */
profileRouter.delete('/', async (req, res) => {
  const userId = getUserId(req);
  const user = req.user!;

  await getOrCreateProfile(userId, user.email, user.fullName);

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ status: 'archived' })
    .eq('user_id', userId)
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  if (error) throw new HttpError(500, error.message);
  if (!data) throw new HttpError(404, 'Profile not found.');

  res.json({ ok: true, profile: data as ProfileRow });
});
