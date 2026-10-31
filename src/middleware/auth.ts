import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { HttpError } from '../lib/http.js';

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Verifies the Supabase access token sent as `Authorization: Bearer <jwt>`.
 * The token is validated against Supabase Auth, so forged tokens are rejected.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Missing bearer token.');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new HttpError(401, 'Missing bearer token.');
    }

    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      throw new HttpError(401, 'Invalid or expired session.');
    }

    // Archived accounts are soft-deleted: the auth user still exists, but the
    // API must refuse every request until the profile is restored.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('status')
      .eq('user_id', data.user.id)
      .maybeSingle();

    if (profileError) {
      throw new HttpError(500, profileError.message);
    }
    if (profile?.status === 'archived') {
      throw new HttpError(403, 'This account has been archived.');
    }

    const metadata = data.user.user_metadata ?? {};
    req.user = {
      id: data.user.id,
      email: data.user.email ?? null,
      fullName:
        (metadata.full_name as string | undefined) ??
        (metadata.name as string | undefined) ??
        null,
    };

    next();
  } catch (error) {
    next(error);
  }
}
