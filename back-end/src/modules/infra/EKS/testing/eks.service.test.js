const eksService = require('../eks.service');

describe('eks.service exports', () => {
  it('exports the helpers used by Terraform apply flow', () => {
    expect(typeof eksService.getOwnedCluster).toBe('function');
    expect(typeof eksService.markApplying).toBe('function');
    expect(typeof eksService.markApplied).toBe('function');
    expect(typeof eksService.markFailed).toBe('function');
  });
});
