import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// THIS IS THE NEW, CORRECT WAY TO MOCK ESM MODULES
jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  },
}));

// We will import the modules dynamically *after* the mocks are set up.
let User;
let getAllUsers;

describe('Admin Controller - White Box (getAllUsers)', () => {
  let mockReq, mockRes;

  // BEFORE EACH TEST: Dynamically import the modules.
  beforeEach(async () => {
    // Dynamically import the mocked User module
    User = (await import('../../models/User.js')).default;

    // Dynamically import the controller function to test
    getAllUsers = (await import('../../controllers/adminController.js')).getAllUsers;

    // Reset mocks and set up req/res objects
    jest.clearAllMocks();
    mockReq = { query: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it('should fetch all users with default pagination', async () => {
    const fakeUsers = [{ name: 'Test User', email: 'test@user.com' }];

    // This object simulates the chainable Mongoose query methods
    const mockMongooseQuery = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockResolvedValue(fakeUsers),
    };

    // NOW, THE MOCKS ARE REAL JEST MOCKS AND THIS WILL WORK
    User.find.mockReturnValue(mockMongooseQuery);
    User.countDocuments.mockResolvedValue(1);
    User.aggregate.mockResolvedValue([{ totalUsers: 1, activeUsers: 1 }]);

    await getAllUsers(mockReq, mockRes);

    expect(User.find).toHaveBeenCalledWith({});
    expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        users: fakeUsers,
      }),
    }));
  });

  it('should handle search and filter queries correctly', async () => {
    mockReq.query = { search: 'test', status: 'active' };

    const mockMongooseQuery = {
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockResolvedValue([]), // Return empty array for simplicity
    };

    User.find.mockReturnValue(mockMongooseQuery);
    User.countDocuments.mockResolvedValue(0);
    User.aggregate.mockResolvedValue([]);

    await getAllUsers(mockReq, mockRes);

    // Verify that the query object passed to `find` is correct
    expect(User.find).toHaveBeenCalledWith({
      $or: [
        { name: { $regex: 'test', $options: 'i' } },
        { email: { $regex: 'test', $options: 'i' } },
        { username: { $regex: 'test', $options: 'i' } },
      ],
      status: 'active',
    });
  });
});