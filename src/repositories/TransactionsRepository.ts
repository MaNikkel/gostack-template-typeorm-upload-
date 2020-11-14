import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    const balance: Balance = transactions.reduce(
      (acc: Balance, cur) => {
        if (cur.type === 'income') {
          acc.income += parseFloat(cur.value.toString());
          acc.total += parseFloat(cur.value.toString());
        } else if (cur.type === 'outcome') {
          acc.outcome += parseFloat(cur.value.toString());
          acc.total -= parseFloat(cur.value.toString());
        }
        return acc;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );
    return balance;
  }
}

export default TransactionsRepository;
