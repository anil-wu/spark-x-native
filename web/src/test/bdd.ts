export async function given<T>(
  _description: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  return await fn();
}

export async function when<T>(
  _description: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  return await fn();
}

export async function then<T>(
  _description: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  return await fn();
}

