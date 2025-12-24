import { describe, it, expect, beforeEach } from 'vitest';
import { resetCounters, incrementCpanelFailure, getCpanelFailures } from '../monitoring';

describe('monitoring counters', () => {
  beforeEach(() => resetCounters());

  it('increments cPanel failure counter', () => {
    expect(getCpanelFailures()).toBe(0);
    incrementCpanelFailure();
    expect(getCpanelFailures()).toBe(1);
    incrementCpanelFailure();
    expect(getCpanelFailures()).toBe(2);
  });

  it('emits a warning when threshold is reached', () => {
    // set threshold to 3 for this test
    process.env.CPANEL_FAILURE_THRESHOLD = '3';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    incrementCpanelFailure();
    incrementCpanelFailure();
    expect(warnSpy).not.toHaveBeenCalled();
    incrementCpanelFailure();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('cPanel failure threshold reached'));
    warnSpy.mockRestore();
    delete process.env.CPANEL_FAILURE_THRESHOLD;
  });
});
