import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { PmsModule } from './modules/pms/pms.module';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module';
import { BookingModule } from './modules/booking/booking.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ThreeCxModule } from './modules/threecx/threecx.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PmsModule,
    HousekeepingModule,
    BookingModule,
    PaymentsModule,
    ThreeCxModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
