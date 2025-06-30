interface ApiConfigProps {
  version: string;
}

interface DatabaseConfigProps {
  host: string;
  port: number;
  username: string;
  password: string;
  dbName: string;
  synchronize: boolean;
}

interface JwtConfigProps {
  secret: string;
  expiresIn: string;
}

export interface EmailConfigProps {
  host: string;
  port: number;
  username: string;
  password: string;
  contactUsEmail: string;
}

interface UrlsProps {
  createPasswordPath: string;
  frontendPanelBaseUrl: string;
}

interface SocialAuth {
  facebook: {
    appId: string;
    appSecret: string;
  };
  google: {
    clientId: string;
  };
  apple: {
    clientId: string;
  };
}

interface AwsS3ConfigProps {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
}

interface AwsConfigProps {
  s3: AwsS3ConfigProps;
}

interface CxPayProps {
  apiKey: string;
}

interface FirebaseConfigProps {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain: string;
}

interface DomainsProps {
  backend: string;
}

interface RedisProps {
  host: string;
  port: number;
}

export interface ConfigProps {
  appName: string;
  nodeEnv: string;
  port: number;
  api: ApiConfigProps;
  database: DatabaseConfigProps;
  jwt: JwtConfigProps;
  email: EmailConfigProps;
  urls: UrlsProps;
  socialAuth: SocialAuth;
  aws: AwsConfigProps;
  cxPay: CxPayProps;
  oneVoltzEqaulTo: number;
  firebase: FirebaseConfigProps;
  domains: DomainsProps;
  redis: RedisProps;
}
