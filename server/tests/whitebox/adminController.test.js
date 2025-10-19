import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// THIS IS THE NEW, CORRECT WAY TO MOCK ESM MODULES
// We define the mock at the top level of the test file.
// The second argument is a factory function that returns the mock's implementation.
jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign: jest.fn(),
  },
}));

// We will import the modules dynamically *after* the mocks are set up.
let User;
let jwt;
let adminLogin;

describe('Admin Controller - White Box Tests', () => {
  let mockReq, mockRes;

  // BEFORE EACH TEST: Dynamically import the modules.
  // This ensures that the mocks are in place BEFORE the controller code runs.
  beforeEach(async () => {
    // Dynamically import the mocked modules
    User = (await import('../../models/User.js')).default;
    jwt = (await import('jsonwebtoken')).default;

    // Dynamically import the controller function we want to test
    adminLogin = (await import('../../controllers/adminController.js')).adminLogin;

    // Reset mocks and set up req/res objects
    jest.clearAllMocks();
    mockReq = { body: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('adminLogin', () => {
    it('should login an admin successfully and return a token', async () => {
      mockReq.body = { email: 'admin@test.com', password: 'password123' };

      const mockAdminInstance = {
        _id: 'adminUserId',
        role: 'admin',
        status: 'active',
        comparePassword: jest.fn().mockResolvedValue(true),
      };

      // NOW, THE MOCKS ARE REAL JEST MOCKS AND THIS WILL WORK
      User.findOne.mockResolvedValue(mockAdminInstance);
      jwt.sign.mockReturnValue('fake-jwt-token');

      await adminLogin(mockReq, mockRes);

      expect(User.findOne).toHaveBeenCalledWith({ email: 'admin@test.com', role: 'admin' });
      expect(mockAdminInstance.comparePassword).toHaveBeenCalledWith('password123');
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        token: 'fake-jwt-token',
      }));
    });

    it('should return 401 for invalid credentials', async () => {
      mockReq.body = { email: 'admin@test.com', password: 'wrongpassword' };

      const mockAdminInstance = {
        comparePassword: jest.fn().mockResolvedValue(false), // Password check fails
      };
      User.findOne.mockResolvedValue(mockAdminInstance);

      await adminLogin(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid credentials',
      });
    });
  });
});