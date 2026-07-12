export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppStackParamList = {
  Flats: undefined;
  CreateFlat: { initialTab?: "create" | "join" } | undefined;
  FlatDetail: { flatId: number; flatName: string };
  CreateBook: { flatId: number };
  BookDetail: { bookId: number; bookName: string; flatId: number };
  AddExpense: { bookId: number; flatId: number };
  Profile: undefined;
};


export type FlatTabParamList = {
  Home: undefined;
  Expenses: undefined;
  Balances: undefined;
  Members: undefined;
  Books: undefined;
  Voting: undefined;
};
