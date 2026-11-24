import { User, Role } from '@prisma/client';

export type UserWithoutSensitiveInfo = Omit<User, 'passwordHash' | 'refreshTokenHash'>;

export interface ILoginResponse {
  user: UserWithoutSensitiveInfo;
  accessToken: string;
  refreshToken: string;
}

export interface IRegisterDriverInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
  licenseNumber: string;
  licenseImageBuffer?: Buffer;
}
