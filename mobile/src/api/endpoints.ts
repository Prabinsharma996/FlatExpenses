import { api } from "./client";
import { Book, BookDetail, Expense, Flat, FlatBalances, FlatMember, FlatReport, GroupType, Poll, SplitType, User } from "../types";

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
  remove: (expenseId: number) => api.delete(`/expenses/${expenseId}`),
};

export const PollApi = {
  list: (flatId: number) => api.get<Poll[]>(`/flats/${flatId}/polls`),
  create: (flatId: number, question: string, options: string[]) =>
    api.post<Poll>(`/flats/${flatId}/polls`, { question, options }),
  vote: (pollId: number, optionId: number) => api.post<Poll>(`/polls/${pollId}/vote`, { optionId }),
  close: (pollId: number) => api.post<Poll>(`/polls/${pollId}/close`),
};
