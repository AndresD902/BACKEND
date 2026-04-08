import { User } from "entities/user.entity";

export class UserRepository {
    private users: any[] = [];
    
    public findByEmail(email: string) {
        return this.users.find(user => user.email.toLowerCase() === email.toLowerCase());
    }

    public findbyId(id: string) {
        return this.users.find(user => user.id === id);
    }

    public create(user: User) {
        this.users.push(user);
        return user;
    }

    public findAll() {
        return this.users;
    }
}

export const userRepository = new UserRepository();