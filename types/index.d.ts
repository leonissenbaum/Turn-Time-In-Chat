declare global {
  interface FlagConfig {
    Combat: {
      'turn-time-in-chat': {
        combatStartTime: number;
        roundStartTime: number;
        lastTurnTime: number;
        timerDisabled: boolean | undefined;
        /*
        turnLengths key is actor ID, however for all NPC actors, we'll put that at 0 so that we can
        track the GM as a whole instead of each individual creature the GM plays. accordingly, for
        all the NPCs, we'll name them all "Gamemaster".
        */
        turnLengths: Record<string, {name: string, turnLengthMS: number}>;
      }
    }
  }
}

export {};