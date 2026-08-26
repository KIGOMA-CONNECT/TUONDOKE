import { Router, Request, Response } from 'express';
import db from '../db.js';
import { auth } from '../middleware.js';
import logger from '../logger.js';

const router = Router();

const AI_RESPONSES: Record<string, string> = {
  help: 'I can help you with ride booking, wallet management, trip history, and more. What would you like to do?',
  fare: 'Fare estimates depend on distance and vehicle type. Use the book ride feature for accurate estimates.',
  safety: 'Your safety is our priority. You can set up emergency contacts, use the SOS feature, and share your trip.',
  wallet: 'You can deposit, withdraw, and transfer funds from your wallet. Check your balance anytime.',
  default: 'I\'m TUONDOKE AI assistant. How can I help you today? You can ask about fares, safety, wallet, or ride booking.'
};

router.post('/chat', auth, (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) { res.status(400).json({ error: 'Message required' }); return; }

    const lowerMsg = message.toLowerCase();
    let response = AI_RESPONSES.default;

    if (lowerMsg.includes('help')) response = AI_RESPONSES.help;
    else if (lowerMsg.includes('fare') || lowerMsg.includes('price') || lowerMsg.includes('cost')) response = AI_RESPONSES.fare;
    else if (lowerMsg.includes('safe') || lowerMsg.includes('sos') || lowerMsg.includes('emergency')) response = AI_RESPONSES.safety;
    else if (lowerMsg.includes('wallet') || lowerMsg.includes('balance') || lowerMsg.includes('money')) response = AI_RESPONSES.wallet;
    else if (lowerMsg.includes('ride') || lowerMsg.includes('trip') || lowerMsg.includes('book')) {
      response = 'To book a ride, go to the Ride tab and enter your pickup and destination. You can choose between boda, bajaji, pickup, and more.';
    }

    res.json({ response, timestamp: new Date().toISOString() });
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

router.get('/insights', auth, (req: Request, res: Response) => {
  try {
    const trips = db.prepare(`SELECT status, COUNT(*) as count, AVG(final_fare) as avg_fare
      FROM trips WHERE passenger_id = ? GROUP BY status`).all(req.user!.id) as any[];

    const wallet = db.prepare('SELECT balance FROM wallets WHERE user_id = ?').get(req.user!.id) as any;

    const insights = {
      total_trips: trips.reduce((sum: number, t: any) => sum + t.count, 0),
      completed_trips: trips.find((t: any) => t.status === 'completed')?.count || 0,
      avg_fare: trips.find((t: any) => t.status === 'completed')?.avg_fare || 0,
      wallet_balance: wallet?.balance || 0,
      suggestions: [] as string[]
    };

    if (insights.completed_trips > 10) insights.suggestions.push('You\'re a frequent rider! Consider our membership plans for cashback.');
    if (insights.wallet_balance < 100) insights.suggestions.push('Your wallet balance is low. Top up to enjoy seamless payments.');

    res.json(insights);
  } catch (err: any) { res.status(500).json({ error: 'Failed' }); }
});

export default router;
