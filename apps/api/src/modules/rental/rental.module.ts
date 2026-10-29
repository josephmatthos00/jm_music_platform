// apps/api/src/modules/rental/rental.module.ts
import { Module } from '@nestjs/common';
import { RentalController } from './rental.controller';
import { RentalService } from './rental.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { EntitlementModule } from '../entitlement/entitlement.module';

@Module({
  imports: [PrismaModule, EntitlementModule],
  controllers: [RentalController],
  providers: [RentalService],
  exports: [RentalService],
})
export class RentalModule {}