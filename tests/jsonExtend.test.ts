import { jsonExtend } from '../src/index.js';

describe('jsonExtend', () => {
  it('replaces primitive properties (basic merge)', () => {
    const result = jsonExtend({ name: 'Old' }, { name: 'New' });

    expect(result).toEqual({ name: 'New' });
  });

  it('extends nested objects via $extend', () => {
    const result = jsonExtend(
      { config: { a: 1 } },
      { config: { $extend: { b: 2 } } }
    );

    expect(result).toEqual({ config: { a: 1, b: 2 } });
  });

  it('extends nested objects by default without $extend', () => {
    const result = jsonExtend(
      {
        name: 'example',
        profile: {
          avatar: 'default.png',
          settings: {
            notifications: true,
          },
        },
      },
      {
        profile: {
          settings: {
            zone: 'UTC',
          }
        }
      }
    );

    expect(result).toEqual({
      name: 'example',
      profile: {
        avatar: 'default.png',
        settings: {
          notifications: true,
          zone: 'UTC',
        },
      }
    });
  });

  it('overrides objects with $override', () => {
    const result = jsonExtend(
      {
        name: 'example',
        profile: {
          avatar: 'default.png',
          settings: {
            notifications: true,
          },
        },
      },
      {
        profile: {
          $override: {
            settings: {
              zone: 'UTC',
            }
          }
        }
      }
    );

    expect(result).toEqual({
      name: 'example',
      profile: {
        settings: {
          notifications: true,
          zone: 'UTC',
        },
      }
    });
  });

  it('clears all properties when $override is an empty object', () => {
    const result = jsonExtend(
      { a: 1, b: { c: 2 } },
      { $override: {} }
    );

    expect(result).toEqual({});
  });

  it('works when target is not a plain object', () => {
    const result = jsonExtend(
      "some string",
      { $override: { newKey: 'value' } }
    );

    expect(result).toEqual({ newKey: 'value' });
  });

  it('handles deeply nested $override operators', () => {
    const result = jsonExtend(
      {
        a: { b: 1, c: 2 },
        d: { e: 3, f: 4 }
      },
      {
        a: { $override: { b: 10 } },
        d: { $extend: { g: 5 } }
      }
    );

    expect(result).toEqual({
      a: { b: 10 }, // 'c' is removed
      d: { e: 3, f: 4, g: 5 } // 'e' and 'f' are kept
    });
  });

  it('throws when $override is not a plain object', () => {
    expect(() =>
      jsonExtend(
        { a: 1 },
        { $override: 123 } as any
      )
    ).toThrow('$override expects a plain object');
  });

  it('merges peer properties after applying $override', () => {
    const result = jsonExtend(
      { a: 1, b: 2 },
      {
        $override: { c: 3 },
        d: 4
      }
    );

    expect(result).toEqual({ c: 3, d: 4 }); // 'a' and 'b' are removed by $override, then 'd' is added
  });

  it('supports $prepend and $append for arrays', () => {
    const result = jsonExtend(
      { list: [2, 3] },
      { list: { $prepend: [1], $append: [4] } }
    );

    expect(result).toEqual({ list: [1, 2, 3, 4] });
  });

  it('removes items using $remove', () => {
    const result = jsonExtend(
      { list: [1, 2, 3, 4] },
      { list: { $remove: (n: number) => n % 2 === 0 } }
    );

    expect(result).toEqual({ list: [1, 3] });
  });

  it('replaces items using $replace', () => {
    const result = jsonExtend(
      { tags: ['red', 'green', 'blue'] },
      {
        tags: {
          $replace: [
            {
              filter: (tag: string) => tag === 'green',
              replacement: 'lime'
            }
          ]
        }
      }
    );

    expect(result).toEqual({ tags: ['red', 'lime', 'blue'] });
  });

  it('allows $replace to emit multiple items', () => {
    const result = jsonExtend(
      { items: [2, 3, 4] },
      {
        items: {
          $replace: [
            {
              filter: (n: number) => n === 3,
              replacement: (n: number) => [n * 10, n * 10 + 1]
            }
          ]
        }
      }
    );

    expect(result).toEqual({ items: [2, 30, 31, 4] });
  });

  it('composes multiple operators together', () => {
    const result = jsonExtend(
      { a: 1, list: [1, 2], config: { a: 1 } },
      {
        a: 2,
        list: { $append: [3], $prepend: [0] },
        config: { $extend: { b: 2 } }
      }
    );

    expect(result).toEqual({ a: 2, list: [0, 1, 2, 3], config: { a: 1, b: 2 } });
  });

  it('returns cloned primitive when patch is primitive', () => {
    const result = jsonExtend({ name: 'Old' }, 'newValue');

    expect(result).toBe('newValue');
  });

  it('creates object when target is primitive and patch is object', () => {
    const result = jsonExtend('primitive', { name: 'New' });

    expect(result).toEqual({ name: 'New' });
  });

  it('treats missing target arrays as empty', () => {
    const result = jsonExtend({}, { list: { $append: [1, 2] } });

    expect(result).toEqual({ list: [1, 2] });
  });

  it('throws when $extend is not a plain object', () => {
    expect(() =>
      jsonExtend(
        { config: { a: 1 } },
        { config: { $extend: 123 } as unknown as Record<string, unknown> }
      )
    ).toThrow('$extend expects a plain object');
  });

  it('invokes predicates supplied to $remove', () => {
    const predicate = jest.fn(() => true);

    const result = jsonExtend(
      { items: [1] },
      {
        items: {
          $remove: predicate
        }
      }
    );

    expect(result.items).toEqual([]);
    expect(predicate).toHaveBeenCalled();
  });

  it('invokes replacement functions supplied to $replace', () => {
    const filter = jest.fn((value: number) => value === 1);
    const replacement = jest.fn((value: number) => value * 10);

    const result = jsonExtend(
      { items: [1] },
      {
        items: {
          $replace: [{ filter, replacement }]
        }
      }
    );

    expect(result.items).toEqual([10]);
    expect(filter).toHaveBeenCalled();
    expect(replacement).toHaveBeenCalled();
  });

  it('does not mutate the original target object', () => {
    const target = { nested: { list: [1, 2] } };
    const result = jsonExtend(target, { nested: { $extend: { flag: true } } });

    expect(result).toEqual({ nested: { list: [1, 2], flag: true } });
    expect(target).toEqual({ nested: { list: [1, 2] } });
    expect(result.nested).not.toBe(target.nested);
  });

  it('mutates the original object when mutate option is enabled', () => {
    const target = { nested: { list: [1, 2] } };
    const result = jsonExtend(
      target,
      { nested: { $extend: { flag: true } } },
      { mutate: true }
    );

    expect(result).toBe(target);
    expect(target).toEqual({ nested: { list: [1, 2], flag: true } });
    expect(target.nested.list).toBe(result.nested.list);
  });

  it('mutates arrays in place when mutate option is enabled', () => {
    const list = [1, 2];
    const target = { list };

    jsonExtend(target, { list: { $append: [3] } }, { mutate: true });

    expect(target.list).toBe(list);
    expect(target.list).toEqual([1, 2, 3]);
  });
});

