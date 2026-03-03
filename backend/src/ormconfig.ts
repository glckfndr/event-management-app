import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

import 'dotenv/config';

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() === 'true';
};

const dbPassword = process.env.DB_PASSWORD;
if (!dbPassword) {
  throw new Error(
    'DB_PASSWORD environment variable is required but was not provided.',
  );
}

const ormconfig: PostgresConnectionOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: toNumber(process.env.DB_PORT, 5432),
  username: process.env.DB_USERNAME ?? 'event_user',
  password: dbPassword,
  database: process.env.DB_DATABASE ?? 'event_management',
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: toBoolean(process.env.DB_SYNCHRONIZE, false),
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
};
export default ormconfig;
