import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

export interface JWTPayload {
  adminId: string;
  email: string;
  role: string;
}

export const generateToken = (admin: { id: string; email: string; role: string }) => {
  return jwt.sign(
    { adminId: admin.id, email: admin.email, role: admin.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
};

export const authMiddleware = async (authorization: string | undefined) => {
  if (!authorization) {
    throw new Error('Token manquant');
  }

  const token = authorization.replace('Bearer ', '');
  const payload = verifyToken(token);
  
  if (!payload) {
    throw new Error('Token invalide');
  }

  // Vérifier que l'admin existe toujours et est actif
  const admin = await prisma.administrateur.findUnique({
    where: { id: payload.adminId, actif: true }
  });

  if (!admin) {
    throw new Error('Administrateur introuvable ou inactif');
  }

  return { admin, payload };
};

export const requireSuperAdmin = (role: string) => {
  if (role !== 'super_admin') {
    throw new Error('Accès réservé aux super administrateurs');
  }
};