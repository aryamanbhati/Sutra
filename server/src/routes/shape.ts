import type { User } from '../models/User.js';

type UserInstance = InstanceType<typeof User>;

/** Public projection of a user — never leaks passwordHash. */
export function publicUser(user: UserInstance) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    birthData: user.birthData ?? null,
    natalChart: user.natalChart ?? null,
    hasChart: Boolean(user.natalChart),
    streak: user.streak,
    createdAt: user.createdAt,
  };
}
