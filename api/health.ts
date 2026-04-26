import { json } from './_lib/auth.js';

export const config = {
  runtime: 'edge',
};

export default function handler() {
  return json(
    {
      status: 'ok',
      service: 'ponteggio-trainer-api',
      timestamp: new Date().toISOString(),
    },
    { status: 200 },
  );
}
