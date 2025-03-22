import { formatTime } from "./util.ts";

export function postTurnMessage(combat: Combat) {
    const disabled = combat.getFlag("turn-time-in-chat", 'timerDisabled');
    const disabledSetting = (game.settings as any).get('turn-time-in-chat' as any, "trackTurnLength" as any) as boolean;
    if (disabled === true || disabledSetting === false) {
      return
    }

    const lastTurn = combat.getFlag("turn-time-in-chat", 'lastTurnTime');
    if (!lastTurn) return;
    
    const now = Date.now();
    const turnDuration = now - lastTurn;

    // Get minimum turn length setting in seconds
    const minimumTurnLength = (game.settings as any).get('turn-time-in-chat' as any, "minimumTurnLength" as any) as number;
    // Convert turnDuration from ms to seconds for comparison
    const turnDurationSecs = turnDuration / 1000;
    // Skip if turn duration is less than minimum
    if (minimumTurnLength > turnDurationSecs) {
      return combat.setFlag("turn-time-in-chat", 'lastTurnTime', now);
    }
    
    const formattedTurnTime = formatTime(turnDuration);
    
    // Get the current combatant
    const combatant = combat.combatant;
    if (!combatant) return;
    if (combatant.isDefeated) {
      const trackDeadCreatures = (game.settings as any).get('turn-time-in-chat' as any, "trackDeadCreatures" as any) as boolean;
      if (!trackDeadCreatures) {
          return
      }
    }
    if (combatant.isNPC) {
      const hideNonPlayerTurns = (game.settings as any).get('turn-time-in-chat' as any, "hideNonPlayerTurns" as any) as boolean;
      if (hideNonPlayerTurns) {
        return combat.setFlag("turn-time-in-chat", 'lastTurnTime', now);
      }

      const hideNonPlayerNames = (game.settings as any).get('turn-time-in-chat' as any, "hideNonPlayerNames" as any) as boolean;
      if (hideNonPlayerNames) {
        ChatMessage.create({
          content: `
            <div class="turn-time-message">
              <p>The creature's turn took ${formattedTurnTime}.</p>
            </div>
          `,
          speaker: ChatMessage.getSpeaker({actor: combatant.actor, scene: combat.scene, token: combatant.token, alias: 'Turn Length'}),
          type: CONST.CHAT_MESSAGE_STYLES.OTHER
        } as any);

        return combat.setFlag("turn-time-in-chat", 'lastTurnTime', now);
      }
    }
    
    // Post turn time info to chat
    ChatMessage.create({
      content: `
        <div class="turn-time-message">
          <p>${combatant.name}'s turn took ${formattedTurnTime}.</p>
        </div>
      `,
      speaker: ChatMessage.getSpeaker({actor: combatant.actor, scene: combat.scene, token: combatant.token, alias: 'Turn Length'}),
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    } as any);
    
    // Update last turn time
    combat.setFlag("turn-time-in-chat", 'lastTurnTime', now);
}

export function postCombatRoundMessage(combat: Combat) {
    const disabled = combat.getFlag("turn-time-in-chat", 'timerDisabled');
    const disabledSetting = (game.settings as any).get('turn-time-in-chat' as any, "trackRoundLength" as any) as boolean;
    if (disabled === true || disabledSetting === false) {
      return
    }


    const roundStart = combat.getFlag("turn-time-in-chat", 'roundStartTime');
    if (!roundStart) return;
    
    const now = Date.now();
    const roundDuration = now - roundStart;
    // Get minimum turn length setting in seconds
    const minimumTurnLength = (game.settings as any).get('turn-time-in-chat' as any, "minimumTurnLength" as any) as number;
    // Convert roundDuration from ms to seconds for comparison
    const turnDurationSecs = roundDuration / 1000;
    // Skip if round duration is less than minimum
    if (minimumTurnLength > turnDurationSecs) return;
    
    const formattedRoundTime = formatTime(roundDuration);
    
    // Post round time info to chat
    ChatMessage.create({
      content: `
        <div class="turn-time-message">
          <h3>Round ${combat.round} completed</h3>
          <p>Round duration: ${formattedRoundTime}.</p>
        </div>
      `,
      speaker: {alias: 'Turn Length'},
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    } as any);
    
    // Reset round timer
    combat.setFlag("turn-time-in-chat", 'roundStartTime', now);
}

export function postEndCombatMessage(combat: Combat) {
    const disabled = combat.getFlag("turn-time-in-chat", 'timerDisabled');
    const disabledSetting = (game.settings as any).get('turn-time-in-chat' as any, "trackCombatLength" as any) as boolean;
    if (disabled === true || disabledSetting === false) {
      return
    }

    const combatStart = combat.getFlag("turn-time-in-chat", 'combatStartTime');
    if (!combatStart) return;
    
    const totalTime = Date.now() - combatStart;
    // Get minimum turn length setting in seconds
    const minimumTurnLength = (game.settings as any).get('turn-time-in-chat' as any, "minimumTurnLength" as any) as number;
    // Convert totalTime from ms to seconds for comparison
    const turnDurationSecs = totalTime / 1000;
    // Skip if round duration is less than minimum
    if (minimumTurnLength > turnDurationSecs) return;
    
    const formattedTotalTime = formatTime(totalTime);
    
    // Post combat end time info to chat
    ChatMessage.create({
      content: `
        <div class="turn-time-message">
          <h3>Encounter ended</h3>
          <p>Total length of encounter: ${formattedTotalTime}.</p>
        </div>
      `,
      speaker: {alias: 'Turn Length'},
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    } as any);
}