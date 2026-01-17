import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PersonalNotesService } from './personal-notes.service';
import { PersonalNotesController } from './personal-notes.controller';
import { PersonalNote, PersonalNoteSchema } from './schemas/personal-note.schema';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PersonalNote.name, schema: PersonalNoteSchema },
    ]),
    FeatureFlagModule,
  ],
  controllers: [PersonalNotesController],
  providers: [PersonalNotesService],
  exports: [PersonalNotesService],
})
export class PersonalNotesModule {}
