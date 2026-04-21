import { handleEmailRequest } from '../server/emailHandler';

export default async function handler(req: any, res: any) {
  try {
    const result = await handleEmailRequest({
      method: req.method,
      rawBody: req.body,
      env: process.env,
      headers: req.headers,
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('API send-email route failed:', error);

    const message =
      error instanceof Error && error.message.trim()
        ? error.message
        : 'Email API crashed before a response could be returned.';

    res.status(500).json({
      ok: false,
      message,
    });
  }
}
