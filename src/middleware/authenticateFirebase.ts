import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { firebaseAuth } from "../config/firebase.js";

export interface AuthenticatedRequest extends Request {
  firebaseUser?: DecodedIdToken;
}

export async function authenticateFirebase(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    req.firebaseUser = await firebaseAuth.verifyIdToken(
      authorization.slice("Bearer ".length)
    );
    return next();
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}
