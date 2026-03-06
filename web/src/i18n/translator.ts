import type { Messages } from "./messages";

type Values = Record<string, string | number>;

function getMessage(messages: Messages, key: string): unknown {
  return key.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, messages);
}

function format(template: string, values?: Values): string {
  if (!values) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = values[name];
    return value === undefined ? match : String(value);
  });
}

export function createTranslator(messages: Messages) {
  return (key: string, values?: Values): string => {
    const message = getMessage(messages, key);
    if (typeof message !== "string") {
      return key;
    }
    return format(message, values);
  };
}

