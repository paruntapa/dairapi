import bs58 from 'bs58';
import prisma from './lib/prisma';
import type { NextFunction, Request, Response } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export const walletAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing token.' });
  }
  if (!SECRET) {
    return res.status(500).json({ error: 'Server error.' });
  }

  try {
    const decodedToken: string | JwtPayload = jwt.verify(token, SECRET);
    const userId = (decodedToken as JwtPayload).userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Internal auth error.' });
  }
};