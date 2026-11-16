import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildSslOptions } from './ssl-options';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: buildSslOptions(
    process.env.DATABASE_SSL === 'true',
    process.env.DATABASE_CA_CERT,
  ),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
