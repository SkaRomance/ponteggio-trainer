import { authenticateCredentials, json } from '../_lib/auth';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return json({ message: 'Metodo non consentito.' }, { status: 405 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return json({ message: 'Payload non valido.' }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password ?? '';
  if (!email || !password) {
    return json({ message: 'Email e password sono obbligatorie.' }, { status: 400 });
  }

  const result = await authenticateCredentials(email, password);
  return json(
    { message: result.message },
    {
      status: result.status,
      headers: result.cookie ? { 'Set-Cookie': result.cookie } : undefined,
    },
  );
}
