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

