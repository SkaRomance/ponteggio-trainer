import { canViewAllSessions } from '../../src/models/accessControl.js';
import { getAccessResponseForRequest, json } from '../_lib/auth.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'GET') {
    return json({ message: 'Metodo non consentito.' }, { status: 405 });
  }

  const { accessResponse } = await getAccessResponseForRequest(request);
  const authorized = canViewAllSessions(accessResponse.identity, accessResponse.license);

  if (!authorized) {
    return json({ message: 'Permessi insufficienti per l archivio globale delle sessioni.' }, { status: 403 });
  }

  return json(
    {
      sessions: [],
      message:
        'Archivio sessioni globale autorizzato ma non ancora collegato a un database persistente. Integrare Neon o Postgres server-side.',
      status: accessResponse.sessionsArchiveStatus,
    },
    { status: 501 },
  );
}
