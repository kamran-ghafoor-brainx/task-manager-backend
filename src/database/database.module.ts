import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildSslOptions } from './ssl-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        logging:
          String(config.get('DATABASE_LOGGING')) === 'true'
            ? ['query', 'error']
            : ['error'],
        ssl: buildSslOptions(
          String(config.get('DATABASE_SSL')) === 'true',
          config.get<string>('DATABASE_CA_CERT'),
        ),
        extra: { max: 10 },
      }),
    }),
  ],
})
export class DatabaseModule {}
