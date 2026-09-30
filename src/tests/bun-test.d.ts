declare module 'bun:test' {
  type TestCallback = () => void | Promise<void>;
  type Suite = (name: string, callback: TestCallback) => void;

  export const describe: Suite & { skip: Suite };
  export const afterAll: (callback: TestCallback) => void;
  export const test: (name: string, callback: TestCallback, timeout?: number) => void;
  export const expect: (value: unknown) => {
    toBe(expected: unknown): void;
  };
}
