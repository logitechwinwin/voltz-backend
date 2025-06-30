import { ConfigProps } from "./config.interface";

export const config = (): ConfigProps => {
  return {
    appName: process.env.APP_NAME,
    nodeEnv: process.env.NODE_ENV,
    port: parseInt(process.env.PORT) || 3000,
    api: {
      version: process.env.API_VERSION,
    },
    database: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      dbName: process.env.DB_DATABASE,
      synchronize: Boolean(process.env.DB_SYNCHRONIZE === "true"),
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
    email: {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 25,
      username: process.env.EMAIL_USERNAME,
      password: process.env.EMAIL_PASSWORD,
      contactUsEmail: process.env.CONTACT_US_EMAIL,
    },
    aws: {
      s3: {
        accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
        region: process.env.AWS_S3_REGION,
        bucketName: process.env.AWS_S3_BUCKET_NAME,
      },
    },
    urls: {
      createPasswordPath: process.env.CREATE_PASSWORD_PATH,
      frontendPanelBaseUrl: process.env.FRONTEND_PANEL_BASE_URL,
    },
    socialAuth: {
      facebook: {
        appId: process.env.FACEBOOK_APP_ID,
        appSecret: process.env.FACEBOOK_APP_SECRET,
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
      },
      apple: {
        clientId: process.env.APPLE_CLIENT_ID,
      },
    },
    cxPay: {
      apiKey: process.env.CXPAY_API_KEY,
    },
    oneVoltzEqaulTo: +process.env.ONE_VOLTZ_EQAUL_TO,
    firebase: {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC/v/+0lcyRvLel\nlWKzQhyK+fuxzAI5Il09Be8vm92gHpZXiK+vz1BudfY969vscxIvPlEleUqtKbwV\npOQ/1rwU/RV0a1lsCdXvjcAfG72g26Wpj0xROVebkr/FbcLsfv9YQHpkntHyHsAa\nV0mbHT25m/V6Nzv74EIBS6eY/QOTzM6sbOWG9YZqCLUCeaGBxrpKhdmrXhEDH/Ln\n/+ucTb73rwCqDjcVeDgyPGahDZ+eRZKWqxRhDdWro0Xy6SlrEbg7Pc9q601VXiy9\nnPo34rlTU7ndRJ47ALA01dW1llYHggX99Ct19RzR3MvmFhmftASbembfnd2nzrpz\nEsbshU3XAgMBAAECggEAAooEf6aDf3iMHAK25wsckqXjHy8a5m5zOqAjUzI8BJHz\nHrSeKEoAACkgD3YvQtnL51lAEirMLNqCdZeUjYMxRBE34VickLGD+43uedr7BLAe\nk6Nko3y1Zsd83PHqT18Set+GX2JlAvuaQp8I8qdio7G81eyjpt8I22MzlHM2mBSW\nc4KC/piApYLpPHAoKeDgCQFcjK3T20lQes9RIUzINb1i8ma+nWnGW0OnryDM0SfM\nmjjtYiGuRVK4xsEZl6iqFkecec0GIxOuW6kpzFjyVS9pV5JN216Y8hVDJEPKMxqJ\njdQFeXSy67Ih1Oyd9khFnndF49k2+ja/SEa4DyLmlQKBgQD/M1t8FjJDkghYBo6k\naQfjN640M4oRhkIn7iBSNVpVGAgSH2hDff8e4mVUM5zHtuIKcV3GlxBacOsNoJtw\nGfsLsfxuqL2mdV4rcSEorOjxNRK9fDlqvVdRuJ2o8eY4u33DKmqUZHJxdbPx9vRn\n95X9QofFCKwIyX2RnS8xsogl2wKBgQDAWcLYeLpwN/QlhY+o9zQsHUu1MFR0XhaM\nc4R3P1mfs9Fnc2LWSs8Orkgqb0O5+cqNyxOBGXhr8COdgl+21NK0hG2M+8AIfHI7\nzVZ3LNoEdBKEbCk2cE1jM3GU/D9XZEiBDybgbb3AoVGNK+oGJrI9aFGpIRpk/aq9\nD1AWq56+tQKBgDsaX9OrKFTx2zDXw+1bzdHXsWaxkQZh+6xXv/CKHrOabzQTRghr\ng8xZTnJjyamPN2aHvtohXk4z3Jw5WAZsXfHldLsEJXgJspeJCc7rzL8gNYjg3kNU\nOobYpNrdux3kfknW5vwbD04rnlMpiI0TkA8pe1wsl/so/wXcS3PNDy8FAoGAKzrB\nMLeJZzkcFOa8j8PnJNb8sd8HzBNtS+mWZtqFAQB/2pkzKGgtuuXucCMLfJuoK0/t\ntUENMG0LBBZN/qA8Lrfoixv1X7LgVZJjkWsyIHgZxUstw/9fVSE1sL80WSa/qMnH\n+f6P++AFnQ22jeVaf7SXTcST0wizu8PaQw4VIlUCgYA1MChGCo7Obi3s1eCXNwKx\nbA7Ndl+SzxnBqkRVlf8mlDOY1kHPpP7PLVM4q4HFQqJ8JjG1QXH6s/5Tv6fze/bn\nPPgCJ3/t1UYz82pP6ugQ5dy576tq145Z7A5sGKEhF/tXjqUsL9kueKYn5eWv/Q/1\nlOt6wGF7U79WP2fUPeRrdw==\n-----END PRIVATE KEY-----\n`, // Handle newlines in the key
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
    },
    domains: {
      backend: process.env.BACKEND_URL,
    },
    redis: {
      host: process.env.REDIS_HOST,
      port: +process.env.REDIS_PORT,
    },
  };
};
