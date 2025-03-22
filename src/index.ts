// Turn Time In Chat - A FoundryVTT module to track combat round duration

import { postTurnMessage, postCombatRoundMessage, postEndCombatMessage } from "./modules/combatMessages.ts";

// Define module ID constant
const MODULE_ID = 'turn-time-in-chat';

// Store timing information
interface TurnTimeData {
  roundStartTime: number;
  lastTurnTime: number;
}

Hooks.once('init', () => {
  console.log(`${MODULE_ID} | Initializing Turn Time In Chat`);
    if (!game.settings) return;

    // Register module settings
    game.settings.register(MODULE_ID as any, "minimumTurnLength" as any, {
        name: "Minimum Time To Post (seconds)",
        hint: "Doesn't post turns shorter than this (in seconds). Set to 0 to post all turns.",
        scope: "world",
        config: true,
        type: Number,
        default: 5,
    } as any);

    game.settings.register(MODULE_ID as any, "hideNonPlayerTurns" as any, {
        name: "Hide Non-Player Turn Lengths",
        hint: "When enabled, doesn't post turn lengths for non-player characters.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    } as any);
    
    game.settings.register(MODULE_ID as any, "hideNonPlayerNames" as any, {
        name: "Hide Non-Player Names",
        hint: "When enabled, doesn't post the names of non-player characters.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    } as any);

    game.settings.register(MODULE_ID as any, "trackDeadCreatures" as any, {
        name: "Track Dead Creatures",
        hint: "When enabled, dead creature turns are tracked.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
    } as any);

    game.settings.register(MODULE_ID as any, "trackTurnLength" as any, {
        name: "Track Turn Length",
        hint: "When enabled, tracks the length of turns.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    } as any);

    game.settings.register(MODULE_ID as any, "trackRoundLength" as any, {
        name: "Track Round Length",
        hint: "When enabled, tracks the length of rounds.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    } as any);

    game.settings.register(MODULE_ID as any, "trackCombatLength" as any, {
        name: "Track Combat Length",
        hint: "When enabled, tracks the length of encounters.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true,
    } as any);

    // Add a single delegated event listener for the confirmation button
    $(document).on('click', '.confirm-combat-timer', function(event) {
        if (ui.notifications) {
            if (!game.combats) {
                ui.notifications.error("Failed to find the combat");
            } else {
                const combatId = event.currentTarget.dataset.combatId;
                const combat = game.combats.get(combatId);
                
                if (combat) {
                    (combat as any).setFlag(MODULE_ID, 'timerDisabled', true);
                    ui.notifications.info("Timer Disabled");
                    $(event.currentTarget).prop('disabled', true).text('Timer Disabled');
                } else {
                    ui.notifications.error("Failed to find the combat");
                }
            }
        }
  });
});

// When Foundry is ready, check for existing combats and initialize them
Hooks.once('ready', () => {
    // Get all active combats and initialize their timers
    game.combats?.forEach((combat: Combat | any) => {
      const now = Date.now();
      
      // Check and set roundStartTime if needed
      if (combat.started && !combat.getFlag(MODULE_ID, 'roundStartTime')) {
        combat.setFlag(MODULE_ID, 'roundStartTime', now);
      }
      
      // Check and set lastTurnTime if needed
      if (combat.started && !combat.getFlag(MODULE_ID, 'lastTurnTime')) {
        combat.setFlag(MODULE_ID, 'lastTurnTime', now);
      }
      
      // Check and set combatStartTime if needed
      if (combat.started && !combat.getFlag(MODULE_ID, 'combatStartTime')) {
        combat.setFlag(MODULE_ID, 'combatStartTime', now);
      }
    });
  });

// When combat starts, begin tracking
Hooks.on('combatStart', (combat: Combat) => {
  const now = Date.now();
  
  // Store timestamps in flags for persistence
  combat.setFlag(MODULE_ID, 'roundStartTime', now);
  combat.setFlag(MODULE_ID, 'lastTurnTime', now);
  combat.setFlag(MODULE_ID, 'combatStartTime', now);
  
  // Announce combat start - whispered to GM only with confirmation button
  ChatMessage.create({
    content: `
      <h3>Combat Started</h3>
      <p>Timer has started for this encounter.</p>
      <button type="button" class="confirm-combat-timer" data-combat-id="${combat.id}">Disable Timer For This Encounter</button>
    `,
    speaker: {alias: 'Turn Length'},
    type: CONST.CHAT_MESSAGE_STYLES.OTHER,
    whisper: ChatMessage.getWhisperRecipients('GM')
  } as any);
});

// When a combat turn changes, post time elapsed
Hooks.on('combatTurn', (combat: Combat, updateData: any, updateOptions: any) => {
    postTurnMessage(combat)
});

// When a combat round changes, post round time
Hooks.on('combatRound', (combat: Combat, updateData: any, updateOptions: any) => {
    postTurnMessage(combat)
    postCombatRoundMessage(combat)
});

// When combat ends, post total time and clean up
Hooks.on('deleteCombat', (combat: Combat) => {
    postTurnMessage(combat)
    postCombatRoundMessage(combat)
    postEndCombatMessage(combat)
});