import { handleEmailRequest } from '../server/emailHandler';

export default async function handler(req: any, res: any) {
  const result = await handleEmailRequest({
    method: req.method,
    rawBody: req.body,
    env: process.env,
    headers: req.headers,
  });

  res.status(result.status).json(result.body);
}
