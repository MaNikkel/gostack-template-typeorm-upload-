import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface RequestDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: RequestDTO): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);
    const balance = await transactionsRepository.getBalance();
    if (type === 'outcome' && value > balance.total) {
      throw new AppError('Your outcome value is greatest than your total');
    }
    let persistedCategory = await categoryRepository.findOne({
      where: { title: category },
    });
    if (!persistedCategory) {
      persistedCategory = categoryRepository.create({
        title: category,
      });
      await categoryRepository.save(persistedCategory);
    }
    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category_id: persistedCategory.id,
    });
    await transactionsRepository.save(transaction);
    return transaction;
  }
}

export default CreateTransactionService;
