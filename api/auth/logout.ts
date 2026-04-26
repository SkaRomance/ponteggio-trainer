import { clearSessionCookie, json } from '../_lib/auth';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return json({ message: 'Metodo non consentito.' }, { status: 405 });
  }

  return json(
    { message: 'Sessione chiusa.' },
    {
      status: 200,
      headers: {
        'Set-Cookie': clearSessionCookie(),
      },
    },
  );
}
