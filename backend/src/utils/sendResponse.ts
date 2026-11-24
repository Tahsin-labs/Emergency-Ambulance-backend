import { Response } from 'express';

export interface IApiResponse<T> {
  statusCode?: number;
  success: boolean;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  data: T;
}

export const sendResponse = <T>(res: Response, data: IApiResponse<T>): void => {
  res.status(data.statusCode || 200).json({
    success: data.success,
    message: data.message || 'Operation successful',
    meta: data.meta,
    data: data.data,
  });
};
