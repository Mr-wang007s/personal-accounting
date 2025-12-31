import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { PrismaModule } from './prisma/prisma.module'
import { CacheModule } from './cache/cache.module'
import { DiscoveryModule } from './discovery/discovery.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './users/users.module'
import { RecordsModule } from './records/records.module'
import { SyncModule } from './sync/sync.module'
import { join } from 'path'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(__dirname, '..', '.env.local'),
        join(__dirname, '..', '.env'),
        '.env.local',
        '.env',
      ],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    CacheModule,
    DiscoveryModule,
    AuthModule,
    UsersModule,
    RecordsModule,
    SyncModule,
  ],
})
export class AppModule {}
