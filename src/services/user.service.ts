export class UserService {
  async getUser(id: string) {
    return {
      id,
      name: "Service User",
    };
  }
}
