import { json, getAccessResponseForRequest } from '../_lib/auth';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const { accessResponse } = await getAccessResponseForRequest(request);
  if (accessResponse.identity.status !== 'authenticated') {
    return json({ message: 'Autenticazione richiesta.' }, { status: 401 });
  }

  return json(
    {
      configured: accessResponse.configured,
      license: accessResponse.license,
      message: accessResponse.message,
    },
    { status: 200 },
  );
}
