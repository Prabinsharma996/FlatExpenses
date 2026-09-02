import { api } from "./client";
import {
  Book,
  BookDetail,
  Chore,
  ChoreFrequency,
  Expense,
  Flat,
  FlatBalances,
  FlatMember,
  FlatReport,
  GroupType,
  Poll,
  ShoppingItem,
  SplitType,
  Task,
  TaskAssignmentType,
  TaskDifficulty,
  TaskPreference,
  TaskType,
  TaskWorkload,
  User,
} from "../types";

export const AuthApi = {
  register: (name: string, email: string, password: string) =>
    api.post<{ token: string; user: User }>("/auth/register", { name, email, password }),
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>("/auth/login", { email, password }),
  me: () => api.get<{ user: User }>("/auth/me"),
};

export const FlatApi = {
  list: () => api.get<Flat[]>("/flats"),
  create: (name: string, groupType: GroupType = "FLAT") => api.post<Flat>("/flats", { name, groupType }),
  join: (inviteCode: string) => api.post<{ flatId: number; name: string }>("/flats/join", { inviteCode }),
  detail: (flatId: number) => api.get<Flat>(`/flats/${flatId}`),
  report: (flatId: number) => api.get<FlatReport>(`/flats/${flatId}/report`),
  expenses: (flatId: number) => api.get<Expense[]>(`/flats/${flatId}/expenses`),
  balances: (flatId: number) => api.get<FlatBalances>(`/flats/${flatId}/balances`),
  addGuest: (flatId: number, name: string) => api.post<FlatMember>(`/flats/${flatId}/guests`, { name }),
  removeMember: (flatId: number, userId: number) => api.delete(`/flats/${flatId}/members/${userId}`),
};

export const BookApi = {
  list: (flatId: number) => api.get<Book[]>(`/flats/${flatId}/books`),
  create: (flatId: number, name: string) => api.post<Book>(`/flats/${flatId}/books`, { name }),
  detail: (bookId: number) => api.get<BookDetail>(`/books/${bookId}`),
  close: (bookId: number) => api.post(`/books/${bookId}/close`),
  markSettlementPaid: (settlementId: number) => api.patch(`/settlements/${settlementId}/pay`),
};

export type CreateExpensePayload = {
  amount: number;
  category: string;
  remarks?: string;
  paidById?: number;
  splitType: SplitType;
  participants: { userId: number; value?: number }[];
};

export const ExpenseApi = {
  list: (bookId: number) => api.get<Expense[]>(`/books/${bookId}/expenses`),
  create: (bookId: number, payload: CreateExpensePayload) =>
    api.post<Expense>(`/books/${bookId}/expenses`, payload),
  update: (expenseId: number, payload: CreateExpensePayload) =>
    api.put<Expense>(`/expenses/${expenseId}`, payload),
  remove: (expenseId: number) => api.delete(`/expenses/${expenseId}`),
};

export const PollApi = {
  list: (flatId: number) => api.get<Poll[]>(`/flats/${flatId}/polls`),
  create: (flatId: number, question: string, options: string[]) =>
    api.post<Poll>(`/flats/${flatId}/polls`, { question, options }),
  vote: (pollId: number, optionId: number) => api.post<Poll>(`/polls/${pollId}/vote`, { optionId }),
  close: (pollId: number) => api.post<Poll>(`/polls/${pollId}/close`),
};

export type CreateChorePayload = {
  title: string;
  description?: string;
  frequency?: ChoreFrequency;
  assignedUserId?: number | null;
};

export const ChoreApi = {
  list: (flatId: number) => api.get<Chore[]>(`/flats/${flatId}/chores`),
  create: (flatId: number, payload: CreateChorePayload) =>
    api.post<Chore>(`/flats/${flatId}/chores`, payload),
  toggle: (choreId: number) => api.patch<Chore>(`/chores/${choreId}/toggle`),
  rotate: (choreId: number) => api.post<Chore>(`/chores/${choreId}/rotate`),
  remove: (choreId: number) => api.delete(`/chores/${choreId}`),
};

export type CreateTaskPayload = {
  title: string;
  description?: string;
  category: string;
  dueDate?: string;
  dueTime?: string;
  taskType: TaskType;
  repeatInterval?: string;
  difficulty: TaskDifficulty;
  points?: number;
  assignmentType: TaskAssignmentType;
  assignedUserId?: number;
};

export const TaskApi = {
  list: (flatId: number) => api.get<Task[]>(`/flats/${flatId}/tasks`),
  create: (flatId: number, payload: CreateTaskPayload) => api.post<Task>(`/flats/${flatId}/tasks`, payload),
  complete: (taskId: number) => api.patch<Task>(`/tasks/${taskId}/complete`),
  swap: (taskId: number, targetId: number, reason?: string) => api.post(`/tasks/${taskId}/swap`, { targetId, reason }),
  respondSwap: (swapId: number, action: "ACCEPT" | "REJECT") => api.post(`/task-swaps/${swapId}/respond`, { action }),
  skip: (taskId: number, reason?: string, reassign?: boolean) => api.post(`/tasks/${taskId}/skip`, { reason, reassign }),
  workload: (flatId: number) => api.get<TaskWorkload>(`/flats/${flatId}/workload`),
  getPreferences: (flatId: number) => api.get<TaskPreference>(`/flats/${flatId}/task-preferences`),
  updatePreferences: (flatId: number, pref: Partial<TaskPreference>) => api.put<TaskPreference>(`/flats/${flatId}/task-preferences`, pref),
};

export const ShoppingApi = {
  list: (flatId: number) => api.get<ShoppingItem[]>(`/flats/${flatId}/shopping`),
  add: (flatId: number, title: string, quantity?: string) => api.post<ShoppingItem>(`/flats/${flatId}/shopping`, { title, quantity }),
  toggle: (itemId: number) => api.patch<ShoppingItem>(`/shopping/${itemId}/toggle`),
  remove: (itemId: number) => api.delete(`/shopping/${itemId}`),
};
