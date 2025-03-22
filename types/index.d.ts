declare global {
  interface FlagConfig {
    Combat: {
      'turn-time-in-chat': {
        combatStartTime: number;
        roundStartTime: number;
        lastTurnTime: number;
        timerDisabled: boolean;
      }
    }
  }
}

export {};