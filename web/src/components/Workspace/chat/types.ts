"use client";

export interface ChatPanelProps {
  isCollapsed: boolean;
  togglePanel: () => void;
  projectId?: string;
  userId?: number;
  userToken?: string;
}

export interface MessageTokens {
  input: number;
  output: number;
  cache?: { read: number; write: number };
  total?: number;
}

export interface MessageTime {
  created: number;
  completed?: number;
  started?: number;
  compacted?: number;
}

export interface MessageInfo {
  id: string;
  sessionID: string;
  role: "user" | "assistant";
  parentID?: string;
  time: MessageTime;
  agent: string;
  model?: {
    providerID: string;
    modelID: string;
  };
  tokens?: MessageTokens;
  cost?: number;
  error?: {
    name: string;
    message: string;
  };
  abort?: boolean;
  finish?: "stop" | "tool-calls";
  summary?: {
    title?: string;
    body?: string;
  };
}

export interface BasePart {
  id: string;
  messageID: string;
  sessionID: string;
}

export interface TextPart extends BasePart {
  type: "text";
  text: string;
  state?: {
    status: "pending" | "generating" | "completed";
    text: string;
    time?: { started?: number; completed?: number };
  };
}

export interface ToolPart extends BasePart {
  type: "tool";
  tool: string;
  state?: {
    status: "pending" | "executing" | "running" | "completed" | "failed" | "error";
    title?: string;
    input?: object;
    output?: string | object;
    error?: string;
    attachments?: Array<{ filename: string; url?: string }>;
    time?: { started?: number; completed?: number };
  };
}

export interface ReasoningPart extends BasePart {
  type: "reasoning";
  text: string;
  time?: {
    start?: number;
    end?: number;
  };
  state?: {
    status: "pending" | "generating" | "completed";
    text: string;
    time?: { started?: number; completed?: number };
  };
}

export interface FilePart extends BasePart {
  type: "file";
  url: string;
  filename?: string;
  mime?: string;
}

export interface OutputPart extends BasePart {
  type: "output";
  format: string;
  content: string;
}

export interface QuestionOptionUI {
  label: string;
  description?: string;
}

export interface QuestionInfoUI {
  header?: string;
  question: string;
  options: Array<QuestionOptionUI>;
  multiple?: boolean;
  custom?: boolean;
}

export interface QuestionPart extends BasePart {
  type: "question";
  requestID: string;
  questions: Array<QuestionInfoUI>;
  tool?: {
    messageID: string;
    callID: string;
  };
  state?: {
    status: "pending" | "replied" | "rejected";
    answers?: Array<Array<string>>;
  };
}

export type Part = TextPart | ToolPart | ReasoningPart | FilePart | OutputPart | QuestionPart;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  parts?: Part[];
  info?: Partial<MessageInfo>;
}

export interface TodoItem {
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled" | string;
  priority: "high" | "medium" | "low" | string;
}

export interface RenderPartHandlers {
  onReplyQuestion: (requestID: string, answers: Array<Array<string>>) => Promise<void>;
  onRejectQuestion: (requestID: string) => Promise<void>;
}

