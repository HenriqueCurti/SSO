import jwt, { SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";

export interface TokenPayload {
  userId: string;
  email: string;
  tokenId?: string;
}

export interface AccessTokenPayload extends TokenPayload {
  type: "access";
}

export interface RefreshTokenPayload extends TokenPayload {
  type: "refresh";
}

const refreshExpiresIn: string = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
const accessExpiresIn: string = process.env.JWT_ACCESS_EXPIRES_IN || "15m";

export function generateAccessToken(payload: TokenPayload): string {
  const tokenPayload: AccessTokenPayload = {
    ...payload,
    type: "access",
  };

  return jwt.sign(tokenPayload, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: accessExpiresIn,
  } as SignOptions);
}

export function generateRefreshToken(payload: TokenPayload): string {
  const tokenPayload: RefreshTokenPayload = {
    ...payload,
    type: "refresh",
    tokenId: randomUUID(),
  };

  return jwt.sign(tokenPayload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: refreshExpiresIn,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET!
    ) as AccessTokenPayload;

    if (decoded.type !== "access") {
      throw new Error("Token inválido");
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expirado");
    }
    throw new Error("Token inválido");
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET!
    ) as RefreshTokenPayload;

    if (decoded.type !== "refresh") {
      throw new Error("Token inválido");
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Token expirado");
    }
    throw new Error("Token inválido");
  }
}

export function generateEmailVerificationToken(): string {
  return randomUUID();
}
