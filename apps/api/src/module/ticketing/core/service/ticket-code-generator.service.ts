import { randomInt } from 'crypto';
import { Injectable } from '@nestjs/common';

// No 0, 1, I or O, so a code read aloud or typed can't be mistaken
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LENGTH = 12;

@Injectable()
export class TicketCodeGenerator {
  generate(): string {
    let code = '';
    for (let i = 0; i < LENGTH; i++) {
      code += ALPHABET[randomInt(ALPHABET.length)];
    }
    return code;
  }
}
