import fs from 'fs';
import path from 'path';
import { deleteFile, buildFilePath } from '../../src/utils/file.util';

jest.mock('fs');

const mockExistsSync = fs.existsSync as jest.Mock;
const mockUnlinkSync = fs.unlinkSync as jest.Mock;

describe('file.util', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('deleteFile', () => {
    it('should delete the file when it exists', () => {
      mockExistsSync.mockReturnValue(true);
      deleteFile('/tmp/photo.jpg');
      expect(mockUnlinkSync).toHaveBeenCalledWith('/tmp/photo.jpg');
    });

    it('should not call unlink when file does not exist', () => {
      mockExistsSync.mockReturnValue(false);
      deleteFile('/tmp/nonexistent.jpg');
      expect(mockUnlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('buildFilePath', () => {
    it('should join folder and filename correctly', () => {
      const result = buildFilePath('uploads/photos', 'avatar.png');
      expect(result).toBe(path.join('uploads/photos', 'avatar.png'));
    });
  });
});
