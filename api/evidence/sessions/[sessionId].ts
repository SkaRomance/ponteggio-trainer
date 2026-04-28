import { getAccessResponseForRequest, json } from '../../_lib/auth.js';
import { getSessionDetailByPersistedId, isDatabaseConfigured } from '../../_lib/db.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return json({ message: 'Metodo non consentito.' }, { status: 405 });
  }

  if (!isDatabaseConfigured()) {
    return json({ message: 'Persistence backend non configurato.' }, { status: 501 });
  }

  const sessionId = new URL(request.url).pathname.split('/').pop();
  if (!sessionId) {
    return json({ message: 'Sessione non specificata.' }, { status: 400 });
  }

  const { accessResponse } = await getAccessResponseForRequest(request);
  if (accessResponse.identity.status !== 'authenticated') {
    return json({ message: 'Autenticazione richiesta.' }, { status: 401 });
  }

  const detail = await getSessionDetailByPersistedId(sessionId);
  if (!detail) {
    return json({ message: 'Sessione non trovata.' }, { status: 404 });
  }

  if (
    accessResponse.identity.role !== 'admin' &&
    detail.session.organizationId !== accessResponse.identity.organizationId
  ) {
    return json({ message: 'Sessione non accessibile per l organizzazione corrente.' }, { status: 403 });
  }
  if (
    accessResponse.identity.role === 'customer' &&
    accessResponse.identity.userId &&
    detail.session.userId !== accessResponse.identity.userId
  ) {
    return json({ message: 'Sessione non accessibile per il profilo cliente corrente.' }, { status: 403 });
  }

  return json(detail, { status: 200 });
}
