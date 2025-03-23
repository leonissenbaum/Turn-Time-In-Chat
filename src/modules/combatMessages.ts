import { formatTime, updateCombatFlag } from "./util.ts";

export function postTurnMessage(combat: Combat) {
  let skipPost = false
  const disabled = combat.getFlag("turn-time-in-chat", 'timerDisabled');
  const disabledSetting = (game.settings as any).get('turn-time-in-chat' as any, "postTurnLength" as any) as boolean;
  if (disabled === true || disabledSetting === false) {
    skipPost = true
  }

  const lastTurn = combat.getFlag("turn-time-in-chat", 'lastTurnTime');
  if (!lastTurn) return;
  
  const now = Date.now();
  const turnDuration = now - lastTurn;

  // Get minimum turn length setting in seconds
  const minimumTurnLength = (game.settings as any).get('turn-time-in-chat' as any, "minimumTurnLength" as any) as number;
  // Convert turnDuration from ms to seconds for comparison
  const turnDurationSecs = turnDuration / 1000;
  
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

  let skipRegularPost = skipPost

  // Skip if turn duration is less than minimum
  if (minimumTurnLength > turnDurationSecs) {
    skipRegularPost = true
  }
  
  else if (combatant.isNPC) {
    const hideNonPlayerTurns = (game.settings as any).get('turn-time-in-chat' as any, "hideNonPlayerTurns" as any) as boolean;
    const hideNonPlayerNames = (game.settings as any).get('turn-time-in-chat' as any, "hideNonPlayerNames" as any) as boolean;
    if (hideNonPlayerTurns) {
      skipRegularPost = true
    }
    else if (!skipPost && hideNonPlayerNames) {
      ChatMessage.create({
        content: `
          <div class="turn-time-message">
            <p>The creature's turn took ${formattedTurnTime}.</p>
          </div>
        `,
        speaker: ChatMessage.getSpeaker({actor: combatant.actor, scene: combat.scene, token: combatant.token, alias: 'Turn Length'}),
        type: CONST.CHAT_MESSAGE_STYLES.OTHER
      } as any);
      skipRegularPost = true
    }
  }
  
  if (!skipRegularPost) {
    // Post turn time info to chat
    ChatMessage.create({
      content: `
        <div class="turn-time-message">
          <p>${combatant.name}'s turn took ${formattedTurnTime}.</p>
        </div>
      `,
      speaker: ChatMessage.getSpeaker({actor: combatant.actor, scene: combat.scene, token: combatant.token, alias: combatant.actor?.name ?? "Turn Length"}),
      type: CONST.CHAT_MESSAGE_STYLES.OTHER
    } as any);
  }

  // Update last turn time
  updateCombatFlag(combat, 'lastTurnTime', now)

  if (combatant.actor && combatant.actor.id) {
    const currentTurnLengths: Record<string, {name: string, turnLengthMS: number}> = (combat as Combat).getFlag("turn-time-in-chat", 'turnLengths') || {};
    
    let actorId = combatant.actor.id
    let actorName = combatant.actor.name

    if (combatant.isNPC) {
      actorId = '0'
      actorName = 'Gamemaster'
    }

    currentTurnLengths[actorId] = {
      name: actorName,
      turnLengthMS: turnDuration + (currentTurnLengths[actorId]?.turnLengthMS || 0)
    };
    updateCombatFlag(combat, 'turnLengths', currentTurnLengths)
  }
}

export function postCombatRoundMessage(combat: Combat) {
  const disabled = combat.getFlag("turn-time-in-chat", 'timerDisabled');
  const disabledSetting = (game.settings as any).get('turn-time-in-chat' as any, "postRoundLength" as any) as boolean;
  let skipPost = false
  if (disabled === true || disabledSetting === false) {
    skipPost = true
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
  
  if (!skipPost) {
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
  }
  
  // Reset round timer
  updateCombatFlag(combat, 'roundStartTime', now)
}

export function postEndCombatMessage(combat: Combat) {
  const disabled = combat.getFlag("turn-time-in-chat", 'timerDisabled');
  const disabledSetting = (game.settings as any).get('turn-time-in-chat' as any, "postCombatLength" as any) as boolean;
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

  const postCharacterTurns = (game.settings as any).get('turn-time-in-chat' as any, "postTotalTurns" as any) as boolean;

  if (!postCharacterTurns) {
    return ChatMessage.create({
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
  
  // Get turn lengths data
  const turnLengths: Record<string, {name: string, turnLengthMS: number}> = combat.getFlag("turn-time-in-chat", 'turnLengths') || {};
  
  // Convert to array and sort by turn length (largest to smallest)
  const sortedTurnLengths = Object.values(turnLengths)
    .sort((a, b) => b.turnLengthMS - a.turnLengthMS);
  
  // Create table HTML for turn lengths
  let turnLengthsTable = '';
  if (sortedTurnLengths.length > 0) {
    turnLengthsTable = `
      <table class="turn-time-table">
        <thead>
          <tr>
            <th style="text-align: center;">Character</th>
            <th style="text-align: center;">Total Turn Time</th>
          </tr>
        </thead>
        <tbody>
          ${sortedTurnLengths.map(entry => `
            <tr>
              <td>${entry.name}</td>
              <td>${formatTime(entry.turnLengthMS)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
  
  // Post combat end time info to chat with turn lengths table
  ChatMessage.create({
    content: `
      <div class="turn-time-message">
        <h3>Encounter ended</h3>
        <p>Total length of encounter: ${formattedTotalTime}.</p>
        ${sortedTurnLengths.length > 0 ? `
        ${turnLengthsTable}
        ` : ''}
      </div>
    `,
    speaker: {alias: 'Turn Length'},
    type: CONST.CHAT_MESSAGE_STYLES.OTHER
  } as any);
}