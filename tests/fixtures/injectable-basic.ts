import { Injectable } from '@angular/core';

/** User management service. */
@Injectable({ providedIn: 'root' })
export class UserService {
  /** Get user by ID. */
  getUser(id: string): Promise<User> { return Promise.resolve({ name: '' }); }

  /** Current user count. */
  readonly count: number = 0;
}

interface User { name: string; }

/** Basic logging service without providedIn. */
@Injectable()
export class LogService {
  /** Log a message. */
  log(message: string): void {}
}
