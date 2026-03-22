import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Przed utworzeniem klienta — cwd przy starcie z folderu `server/`
// Najpierw server/.env, potem simple-link-book/.env z override, żeby wspólny plik (np. DATABASE_URL=purebook) nie przegrywał ze starym server/.env (np. honly)
dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({ path: path.join(process.cwd(), "..", ".env"), override: true });

const prisma = new PrismaClient();

export default prisma;
