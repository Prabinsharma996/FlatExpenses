export type User = {
  id: number;
  name: string;
  email: string;
  isGuest?: boolean;
};

export type FlatMember = {
  id: number;
  userId: number;
  user: User;
};

export type GroupType = "FLAT" | "TRIP" | "PARTY" | "OFFICE";

export type Flat = {
  id: number;
  name: string;
  inviteCode: string;
  adminId: number;
  groupType: GroupType;
  members: FlatMember[];
  books?: Book[];
};

export type BookStatus = "OPEN" | "CLOSED";

export type Book = {
  id: number;
  flatId: number;
  name: string;
  status: BookStatus;
  createdBy: number;
  createdAt: string;
  closedAt: string | null;
};

export type ExpenseSplit = {
  id: number;
  userId: number;
  shareAmount: string;
  user: { id: number; name: string };
};

export type Expense = {
  id: number;
  bookId: number;
  paidById: number;
  addedById: number;
  amount: string;
  category: string;
  remarks: string | null;
  createdAt: string;
  paidBy: { id: number; name: string };
  addedBy: { id: number; name: string };
  splits: ExpenseSplit[];
  book?: { id: number; name: string; status: BookStatus };
};

export type SettlementStatus = "PENDING" | "PAID";

export type Settlement = {
  id?: number;
  bookId?: number;
  fromUserId: number;
  toUserId: number;
  amount: string | number;
  status?: SettlementStatus;
  fromUser?: { id: number; name: string };
  toUser?: { id: number; name: string };
};

export type NetBalance = { userId: number; name: string; net: number };

export type LiveBalances = { transactions: Settlement[]; netByUser: NetBalance[] };

export type FlatBalances = { netByUser: NetBalance[]; transactions: Settlement[] };

export type BookDetail = {
  book: Book;
  expenses: Expense[];
  balances: Settlement[] | LiveBalances;
};

export type SplitType = "EQUAL" | "EXACT" | "PERCENTAGE";

export type FlatReport = {
  total: number;
  expenseCount: number;
  byCategory: { category: string; amount: number }[];
  byMember: { userId: number; name: string; amount: number }[];
};

export type PollOption = {
  id: number;
  label: string;
  votes: number;
};

export type Poll = {
  id: number;
  flatId: number;
  question: string;
  createdBy: number;
  createdAt: string;
  closedAt: string | null;
  totalVotes: number;
  options: PollOption[];
  myOptionId: number | null;
};
