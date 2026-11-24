import jwt, { Secret, SignOptions } from 'jsonwebtoken';

export const createToken = (
  payload: Record<string, any>,
  secret: Secret,
  expireTime: string,
): string => {
  return jwt.sign(payload, secret, {
    expiresIn: expireTime,
  } as SignOptions);
};

export const verifyToken = (token: string, secret: Secret): any => {
  return jwt.verify(token, secret);
};
