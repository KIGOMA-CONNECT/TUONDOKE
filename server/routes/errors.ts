import { Router, Request, Response } from 'express';
import logger from '../logger.js';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  try {
    const { message, stack, component, url, userId } = req.body;
    logger.error({ message, stack, component, url, userId }, 'Client error');
    res.json({ message: 'Error logged' });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
