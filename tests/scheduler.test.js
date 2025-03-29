const { createClient } = require('@supabase/supabase-js');
const { publishToPlatform } = require('../services/makeService');
const scheduledTask = require('../utils/scheduler');

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      then: jest.fn((callback) => callback({ data: [], error: null })),
    })),
  })),
}));

// Mock publishToPlatform
jest.mock('../services/makeService', () => ({
  publishToPlatform: jest.fn(),
}));

describe('Scheduler Task', () => {
  afterAll(() => {
    scheduledTask.stop(); // Stop the cron job after tests
  });

  it('should fetch scheduled content and publish it', async () => {
    const mockContent = [
      {
        id: 1,
        content: 'Test content',
        platforms: ['facebook', 'twitter'],
        status: 'scheduled',
        schedule_time: new Date().toISOString(),
      },
    ];

    // Mock Supabase response
    createClient().from().select().eq().lte.mockResolvedValueOnce({ data: mockContent, error: null });

    // Mock publishToPlatform
    publishToPlatform.mockResolvedValueOnce({ success: true });

    // Trigger the scheduled task
    await scheduledTask._task();

    // Verify publishToPlatform was called
    expect(publishToPlatform).toHaveBeenCalledWith('facebook', 'Test content', 1);
    expect(publishToPlatform).toHaveBeenCalledWith('twitter', 'Test content', 1);

    // Verify Supabase update was called
    expect(createClient().from().update).toHaveBeenCalledWith({ status: 'published' });
  });

  it('should handle errors gracefully', async () => {
    // Mock Supabase error
    createClient().from().select().eq().lte.mockResolvedValueOnce({ data: null, error: 'Error fetching data' });

    // Trigger the scheduled task
    await scheduledTask._task();

    // Verify publishToPlatform was not called
    expect(publishToPlatform).not.toHaveBeenCalled();
  });
});