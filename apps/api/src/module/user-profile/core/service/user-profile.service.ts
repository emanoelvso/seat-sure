import { Injectable } from '@nestjs/common';
import { UserProfileSummary } from '@sharedModules/integration/interface/user-profile-integration.interface';
import { ConfigService } from '@sharedModules/config/service/config.service';
import { UserProfileException } from '@userProfileModule/core/exception/user-profile.exception';
import {
  UpdateProfileInput,
  validateProfileUpdate,
} from '@userProfileModule/core/model/profile-rules.model';
import { UserProfileModel } from '@userProfileModule/core/model/user-profile.model';
import { UserProfileUserRepository } from '@userProfileModule/persistence/repository/user-profile-user.repository';
import { UserProfileUser } from '@userProfileModule/persistence/entity/user-profile-user.entity';
import { Transactional } from 'typeorm-transactional';
import {
  AccountSettingsModel,
  settingsPatchSchema,
} from '@userProfileModule/core/model/account-settings.model';

@Injectable()
export class UserProfileService {
  constructor(
    private readonly userProfileUserRepository: UserProfileUserRepository,
    private readonly configService: ConfigService,
  ) {}

  @Transactional({ connectionName: 'user-profile' })
  async createProfile(input: {
    userId: string;
    firstName: string;
    lastName: string;
  }): Promise<void> {
    await this.userProfileUserRepository.create({
      id: input.userId,
      firstName: input.firstName,
      lastName: input.lastName,
    });
  }

  async findProfile(userId: string): Promise<UserProfileSummary | null> {
    const user = await this.userProfileUserRepository.findOneById(userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  async findMyProfile(userId: string): Promise<UserProfileModel> {
    const user = await this.userProfileUserRepository.findOneById(userId);
    if (!user) {
      throw new UserProfileException('PROFILE_NOT_FOUND', 'Profile not found.');
    }

    return this.toModel(user);
  }

  async findMySettings(userId: string): Promise<AccountSettingsModel> {
    const user = await this.userProfileUserRepository.findOneById(userId);
    if (!user) {
      throw new UserProfileException('PROFILE_NOT_FOUND', 'Profile not found.');
    }
    return {
      eventReminders: user.eventReminders,
      exclusiveOffers: user.exclusiveOffers,
      ticketAvailability: user.ticketAvailability,
      emailNotifications: user.emailNotifications,
      pushNotifications: user.pushNotifications,
      language: user.language,
    };
  }

  @Transactional({ connectionName: 'user-profile' })
  async updateMySettings(
    userId: string,
    input: unknown,
  ): Promise<AccountSettingsModel> {
    const parsed = settingsPatchSchema.safeParse(input);
    if (!parsed.success) {
      throw new UserProfileException(
        'INVALID_INPUT',
        'Choose one valid setting.',
      );
    }
    const updated = await this.userProfileUserRepository.updateSettings(
      userId,
      parsed.data,
    );
    if (!updated) {
      throw new UserProfileException('PROFILE_NOT_FOUND', 'Profile not found.');
    }
    return this.findMySettings(userId);
  }

  // Full replacement of the editable fields, so saving the same input twice
  // stores the same profile. `now` is a parameter so the "today" bound for the
  // birth date never depends on the process clock.
  @Transactional({ connectionName: 'user-profile' })
  async updateMyProfile(
    userId: string,
    input: UpdateProfileInput,
    now: Date,
  ): Promise<UserProfileModel> {
    const today = this.formatToday(now);
    const { value, fields } = validateProfileUpdate(input, today);
    if (!value) {
      throw new UserProfileException(
        'INVALID_INPUT',
        'Invalid profile.',
        fields,
      );
    }

    const updated = await this.userProfileUserRepository.updateProfile(
      userId,
      value,
    );
    if (!updated) {
      throw new UserProfileException('PROFILE_NOT_FOUND', 'Profile not found.');
    }

    return this.findMyProfile(userId);
  }

  // The calendar date of `now` in the app time zone, as 'YYYY-MM-DD'
  // ('en-CA' formats dates that way).
  private formatToday(now: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.configService.get('app.timeZone'),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  }

  private toModel(user: UserProfileUser): UserProfileModel {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl ?? null,
      state: user.state ?? null,
      city: user.city ?? null,
      birthDate: user.birthDate ?? null,
      phoneCountryCode: user.phoneCountryCode ?? null,
      phoneNumber: user.phoneNumber ?? null,
      zipCode: user.zipCode ?? null,
    };
  }
}
