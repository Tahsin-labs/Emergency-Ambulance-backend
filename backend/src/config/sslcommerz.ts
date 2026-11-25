import { env } from './env';

export const sslcommerzConfig = {
  storeId: env.SSL_STORE_ID || 'testbox',
  storePassword: env.SSL_STORE_PASSWORD || 'qwerty',
  isLive: env.SSL_IS_LIVE,
  baseUrl: env.SSL_IS_LIVE
    ? 'https://securepay.sslcommerz.com'
    : 'https://sandbox.sslcommerz.com',
  initUrl: `${env.SSL_IS_LIVE ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com'}/gwprocess/v4/api.php`,
  validationUrl: `${env.SSL_IS_LIVE ? 'https://securepay.sslcommerz.com' : 'https://sandbox.sslcommerz.com'}/validator/api/validationserverAPI.php`,
  backendUrl: env.BACKEND_URL.replace(/\/$/, ''),
  clientSuccessUrl: env.CLIENT_SUCCESS_URL,
  clientFailUrl: env.CLIENT_FAIL_URL,
  clientCancelUrl: env.CLIENT_CANCEL_URL,
};
