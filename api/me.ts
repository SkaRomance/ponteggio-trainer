import { getAccessResponseForRequest, json } from './_lib/auth.js';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const { accessResponse } = await getAccessResponseForRequest(request);
  return json(accessResponse, { status: 200 });
}
