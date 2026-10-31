import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        'Copy backend/.env.example to backend/.env and fill it in.',
    );
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  frontendUrls: (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
} as const;
