// Turn Time In Chat - A FoundryVTT module to track combat round duration

import { postTurnMessage, postCombatRoundMessage, postEndCombatMessage } from "./modules/combatMessages.ts";
import { CombatTimerApp } from "./modules/combatTimerApp.ts";
import { sendChatMessage, updateCombatFlag } from "./modules/util.ts";

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

  game.settings.register(MODULE_ID as any, "compactMessages" as any, {
    name: "Compact Messages",
    hint: "When enabled, the messages in chat are made far more compact.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  } as any);

  game.settings.register(MODULE_ID as any, "minimumTurnLength" as any, {
      name: "Minimum Time To Track (seconds)",
      hint: "Doesn't track turns shorter than this. Set to 0 to track all turns.",
      scope: "world",
      config: true,
      type: Number,
      default: 5,
  } as any);

  game.settings.register(MODULE_ID as any, "postInChat" as any, {
    name: "Post Messages In Chat",
    hint: "When enabled, posts messages in chat. If disabled, you can still enable it per-encounter.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  } as any);

  game.settings.register(MODULE_ID as any, "messagesGMOnly" as any, {
    name: "Make all messages GM only",
    hint: "When enabled, all messages will be sent to the DM alone, and players won't be able to see any chat messages.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  } as any);

  game.settings.register(MODULE_ID as any, "playersSeeTimerButton" as any, {
    name: "Let players see the Encounter Timer Button",
    hint: "When disabled, players can't see the encounter timer button (in the encounter tab, to the left of the rounds display, when an encounter is active).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
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

  game.settings.register(MODULE_ID as any, "postTurnLength" as any, {
      name: "Post Turn Length",
      hint: "When enabled, posts the length of turns.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
  } as any);

  game.settings.register(MODULE_ID as any, "postRoundLength" as any, {
      name: "Post Round Length",
      hint: "When enabled, posts the length of rounds.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
  } as any);

  game.settings.register(MODULE_ID as any, "postCombatLength" as any, {
      name: "Post Encounter Length",
      hint: "When enabled, posts the length of encounters.",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
  } as any);

  game.settings.register(MODULE_ID as any, "postTotalTurns" as any, {
    name: "Post Total Character Turns",
    hint: "When enabled, posts the total length of character's turns throughout the entire encounter at the end of encounter.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
} as any);


  $(document).on('click', '.disable-combat-timer', function(event) {
      if (ui.notifications) {
          if (!game.combats) {
              ui.notifications.error("Failed to find the combat");
          } else {
            const combatId = event.currentTarget.dataset.combatId;
            const combat = game.combats.get(combatId);
            
            if (combat) {
              updateCombatFlag(combat as Combat, 'timerDisabled', true);
              ui.notifications.info("Timer Messages Disabled");
              $(event.currentTarget).prop('disabled', true).text('Timer Messages Disabled');
            } else {
              ui.notifications.error("Failed to find the combat");
            }
          }
      }
  });

  $(document).on('click', '.enable-combat-timer', function(event) {
    if (ui.notifications) {
        if (!game.combats) {
            ui.notifications.error("Failed to find the combat");
        } else {
            const combatId = event.currentTarget.dataset.combatId;
            const combat = game.combats.get(combatId);
            
            if (combat) {
                updateCombatFlag(combat as Combat, 'timerDisabled', false);
                ui.notifications.info("Timer Messages Enabled");
                $(event.currentTarget).prop('disabled', true).text('Timer Messages Enabled');
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
      updateCombatFlag(combat as Combat, 'roundStartTime', now);
    }
    
    // Check and set lastTurnTime if needed
    if (combat.started && !combat.getFlag(MODULE_ID, 'lastTurnTime')) {
      updateCombatFlag(combat as Combat, 'lastTurnTime', now);
    }
    
    // Check and set combatStartTime if needed
    if (combat.started && !combat.getFlag(MODULE_ID, 'combatStartTime')) {
      updateCombatFlag(combat as Combat, 'combatStartTime', now);
    }

    // Check and set turnLengths if needed
    if (combat.started && !combat.getFlag(MODULE_ID, 'turnLengths')) {
      updateCombatFlag(combat as Combat, 'turnLengths', {});
    }
    
  });
  game.socket?.on(`module.${MODULE_ID}`, async (data) => {
    if (!game.users?.activeGM?.isSelf) return;

    if (data.action === 'updateCombatFlag') {
      const combat = game.combats?.get(data.combatId);
      if (combat) {
        try {
        await (combat as any).setFlag(MODULE_ID, data.flag, data.value);
        } catch {}
      }
    } 
    
    else if (data.action === 'sendPrivateMessage') {
      sendChatMessage(JSON.parse(data.message))
    }
  })
});

// When combat starts, begin tracking
Hooks.on('combatStart', (combat: Combat) => {
  const now = Date.now();
  
  const chatEnabled = (game.settings as any).get(MODULE_ID as any, "postInChat" as any) as boolean;
  updateCombatFlag(combat as Combat, 'roundStartTime', now);
  updateCombatFlag(combat as Combat, 'lastTurnTime', now);
  updateCombatFlag(combat as Combat, 'combatStartTime', now);
  updateCombatFlag(combat as Combat, 'timerDisabled', !chatEnabled);
  updateCombatFlag(combat as Combat, 'turnLengths', {});
  
  // Announce combat start - whispered to GM only with confirmation button
  if (chatEnabled) {
    sendChatMessage({message: 
      `<h3>Combat Started</h3>
        <p>Sending messages for this encounter.</p>
        <button type="button" class="disable-combat-timer" data-combat-id="${combat.id}">Disable Timer Messages For This Encounter</button>`
      , options: {
          speaker: {alias: 'Turn Length'},
          type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      }, isPrivate: true})
  } else {
    sendChatMessage({message: 
      `<h3>Combat Started</h3>
        <p>Not sending messages for this encounter.</p>
        <button type="button" class="enable-combat-timer" data-combat-id="${combat.id}">Enable Timer Messages For This Encounter</button>`
      , options: {
          speaker: {alias: 'Turn Length'},
          type: CONST.CHAT_MESSAGE_STYLES.OTHER,
      }, isPrivate: true})
  }
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
  if (!game.users?.activeGM?.isSelf) return;
  postTurnMessage(combat)
  postCombatRoundMessage(combat)
  postEndCombatMessage(combat)
});

Hooks.on('renderCombatTracker', (app: Application, html: JQuery, data: any) => {
  // Only show button if there's an active combat
  if (!game.combat?.started) return;

  // don't show to players if it's disabled
  const timerEnabled = (game.settings as any).get(MODULE_ID as any, "playersSeeTimerButton" as any) as boolean;
  if (!timerEnabled && !game.user?.isGM) return;
  
  // Create the button to match other combat controls
  const button = $(`<a class="combat-button combat-control" aria-label="Encounter Timer" role="button" data-tooltip="Encounter Timer">
    <i class="fas fa-clock"></i>
  </a>`);
  
  // Find the encounter title to insert before it
  const encounterTitle = html.find('.encounter-title');
  encounterTitle.before(button);
  
  // Fix the centering of the encounter title by adding margin-right
  encounterTitle.css('margin-right', 'var(--control-width)');
  
  // Add click handler
  button.on('click', ev => {
    ev.preventDefault();
    new CombatTimerApp({combatId: data?.combat?.id}).render(true);
  });
});

// Portions of the code below based on health-monitor 
// Copyright (c) 2021 jessev14
// https://github.com/jessev14/health-monitor
// Licensed under the MIT License
// Open source is the best!

// Apply custom CSS to chat messages
Hooks.on("renderChatMessage", (app: Application, html: JQuery, data: any) => {
  const message = html.find(`.turn-time-message-compact`);
  if (!message.length) return;

  html.css("text-align", "center");
  html.css("margin", "2px");
  html.css("padding", "2px");
  html.find(".message-sender").text("");
  html.find(".message-metadata")[0].style.display = "none";
  html.find(".whisper-to")[0].style.display = "none";
  
  // add trash icon
  // this was super annoying to do properly btw, i should learn frontend at some point
  if (game.user?.isGM) {
    const messageDiv = html.find(`div.turn-time-message-compact`);
    messageDiv.css("position", "relative");
    
    // First wrap the content in a div that keeps centering
    const content = messageDiv.html();
    messageDiv.html(`<div class="centered-content">${content}</div>`);
    
    // Add the trash icon
    messageDiv.append(`<span><a class="button message-header message-delete"><i class="fas fa-trash"></i></a></span>`);
    
    // Position the trash icon
    html.find(`a.message-delete`).closest(`span`).css({
        "position": "absolute",
        "right": "4px",
        "top": "0px",
        "font-size": "var(--font-size-12)"
    });
    
    // Apply styles to prevent overlap without affecting centering
    messageDiv.find(".centered-content").css({
        "display": "inline-block",
        "max-width": "calc(100% - 20px)",
        "text-align": "center"
    });
  }
});
  