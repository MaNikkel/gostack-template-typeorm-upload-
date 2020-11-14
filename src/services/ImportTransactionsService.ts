import csvParse from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { getCustomRepository, getRepository, In } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';
import csvConfig from '../config/csv';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface RequestDTO {
  fileName: string;
}

interface TransactionCSV {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}
class ImportTransactionsService {
  async execute({ fileName }: RequestDTO): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);
    const transactions: TransactionCSV[] = [];
    const categories: string[] = [];
    const csvPath = path.join(csvConfig.directory, fileName);
    const readCSVStream = fs.createReadStream(csvPath);
    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);
    parseCSV.on('data', async line => {
      const [title, type, value, category] = line;
      if (!title || !type || !value) return;
      transactions.push({ title, type, value, category });
      categories.push(category);
    });
    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });
    await fs.promises.unlink(csvPath);
    const existentCategories = await categoryRepository.find({
      where: {
        title: In(categories),
      },
    });
    const existentCategoriesTitles = existentCategories.map(cat => cat.title);
    const addCategoryTitles = categories
      .filter(cat => !existentCategoriesTitles.includes(cat))
      .filter((value, index, self) => self.indexOf(value) === index);
    const newCategories = categoryRepository.create(
      addCategoryTitles.map(title => ({ title })),
    );
    await categoryRepository.save(newCategories);
    const savedCategories = [...newCategories, ...existentCategories];
    const createdTransactions = transactionsRepository.create(
      transactions.map(t => ({
        category: savedCategories.find(c => c.title === t.category),
        title: t.title,
        type: t.type,
        value: t.value,
      })),
    );
    await transactionsRepository.save(createdTransactions);
    return createdTransactions;
  }
}

export default ImportTransactionsService;
