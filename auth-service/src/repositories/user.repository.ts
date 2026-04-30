import { pool } from '../config/database';
import { User } from '../entities/user.entity';
import { RoleName } from '../entities/role.entity';
import { IUserRepository, CreateUserData } from './interfaces/user-repository.interface';

function mapRowToUser(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    role: row.role as RoleName,
    isActive: row.is_active as boolean,
    lastLogin: row.last_login as Date | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

export class UserRepository implements IUserRepository {
  public async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
  }

  public async findById(id: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
  }

  public async create(data: CreateUserData): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.firstName, data.lastName, data.email.toLowerCase(), data.passwordHash, data.role, data.isActive ?? true],
    );
    return mapRowToUser(result.rows[0]);
  }

  public async findAll(): Promise<User[]> {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows.map(mapRowToUser);
  }

  public async updateLastLogin(id: string): Promise<void> {
    await pool.query('UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1', [id]);
  }

  public async updateStatus(id: string, isActive: boolean): Promise<User | null> {
    const result = await pool.query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [isActive, id],
    );
    return result.rows[0] ? mapRowToUser(result.rows[0]) : null;
  }
}

export const userRepository = new UserRepository();
