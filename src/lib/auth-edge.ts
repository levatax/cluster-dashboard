import { jwtVerify } from "jose";

const ISSUER = "k8s-dashboard";
const AUDIENCE = "k8s-dashboard";

export async function verifyAccessTokenEdge(token: string) {
  const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET);
  const { payload } = await jwtVerify(token, secret, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  return payload as { sub: string; username: string; iat: number; exp: number };
}
