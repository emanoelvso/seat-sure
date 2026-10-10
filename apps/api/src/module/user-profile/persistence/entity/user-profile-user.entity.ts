import { DefaultEntity } from '@sharedModules/persistence/typeorm/entity/default.entity';
import { Column, Entity } from 'typeorm';

// The profile row for an Identity user (ADR not shared: id is always supplied
// by the caller as the Identity user's id; no FK across modules).
@Entity('UserProfileUser')
export class UserProfileUser extends DefaultEntity<UserProfileUser> {
  @Column({ type: 'varchar', length: 50 })
  firstName: string;

  @Column({ type: 'varchar', length: 50 })
  lastName: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  state?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  city?: string | null;

  // A calendar date has no time zone: a `date` column read back as the
  // 'YYYY-MM-DD' string it was written as.
  @Column({ type: 'date', nullable: true })
  birthDate?: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true })
  phoneCountryCode?: string | null;

  @Column({ type: 'varchar', length: 14, nullable: true })
  phoneNumber?: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  zipCode?: string | null;

  @Column({ type: 'boolean', default: false })
  eventReminders: boolean;

  @Column({ type: 'boolean', default: true })
  exclusiveOffers: boolean;

  @Column({ type: 'boolean', default: false })
  ticketAvailability: boolean;

  @Column({ type: 'boolean', default: true })
  emailNotifications: boolean;

  @Column({ type: 'boolean', default: false })
  pushNotifications: boolean;

  @Column({ type: 'varchar', length: 5, default: 'en' })
  language: 'en' | 'pt-BR';
}
