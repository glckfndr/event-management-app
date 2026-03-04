import 'dotenv/config';
import { DataSource } from 'typeorm';
import ormconfig from './ormconfig';

const AppDataSource = new DataSource(ormconfig);

export default AppDataSource;
