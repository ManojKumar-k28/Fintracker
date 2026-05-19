// server/tests/userModel.test.js
import User from "../models/User.js";

describe("User Model", () => {
  it("should create user with valid fields", () => {
    const user = new User({ username: "John", email: "john@mail.com" });
    expect(user.username).toBe("John");
    expect(user.email).toBe("john@mail.com");
  });
});
