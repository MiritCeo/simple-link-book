import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  user?: { userId: string; salonId?: string | null; role: "SUPER_ADMIN" | "OWNER" | "STAFF" };
}

export default function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Brak autoryzacji" });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev") as { userId: string; salonId?: string | null; role: "SUPER_ADMIN" | "OWNER" | "STAFF" };
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Nieprawidłowy token" });
  }
}

