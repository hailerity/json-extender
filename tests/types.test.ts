import { jsonExtend, type JsonExtendable } from '../src/index.js';

describe('JsonExtendable type utilities', () => {
  it('identifies valid object patches', () => {
    interface User {
      name: string;
      profile: {
        age: number;
        tags: string[];
      };
    }

    const user: User = {
      name: 'Ada',
      profile: {
        age: 30,
        tags: ['math'],
      },
    };

    // Valid partial patch
    const patch1: JsonExtendable<User> = {
      profile: {
        age: 31,
      },
    };

    // Valid $extend patch
    const patch2: JsonExtendable<User> = {
      $extend: {
        profile: {
          $extend: {
            tags: { $append: ['physics'] },
          },
        },
      },
    };

    // Valid $override patch
    const patch3: JsonExtendable<User> = {
      profile: {
        $override: {
          age: 32,
          tags: ['computing'],
        },
      },
    };

    // Valid new property (allowed by Record<string, any>)
    const patch4: JsonExtendable<User> = {
      newProp: 'hello',
    };

    // Valid primitive replacement (allowed by union)
    const patch5: JsonExtendable<User> = 'some string' as any; // any needed because User is object?
    // Wait, my type says: (object structures) | string | number ...

    const patch6: JsonExtendable<User> = 123;

    // Use them in jsonExtend to ensure everything stays T
    const result1: User = jsonExtend(user, patch1);
    const result2: User = jsonExtend(user, patch2);
    const result3: User = jsonExtend(user, patch3);
    const result4: User = jsonExtend(user, patch4);

    expect(result1.name).toBe('Ada');
    expect(result1.profile.age).toBe(31);
    expect(result4 as any).toHaveProperty('newProp', 'hello');
  });
});
