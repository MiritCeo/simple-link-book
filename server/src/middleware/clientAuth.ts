import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface ClientAuthRequest extends Request {
  client?: { clientId: string; salonId: string };
}

export default function clientAuth(req: ClientAuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Brak autoryzacji" });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev") as { clientId: string; salonId: string; role: "CLIENT" };
    if (payload.role !== "CLIENT") {
      return res.status(401).json({ error: "Nieprawidłowy token" });
    }
    req.client = { clientId: payload.clientId, salonId: payload.salonId };
    return next();
  } catch {
    return res.status(401).json({ error: "Nieprawidłowy token" });
  }
}

