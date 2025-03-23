import { formatTime } from "./util.ts";

export class CombatTimerApp extends Application {
  private _updateInterval: number | null = null;
  private _options: any;
  private _combatId: string | null = null

  constructor(options = {}) {
    super(options);
    this._options = options;
  }

  static get defaultOptions() {
      return {
        ...super.defaultOptions,
        id: 'combat-timer-app',
        title: 'Encounter Timer',
        template: 'modules/turn-time-in-chat/templates/combat-timer.html',
        width: 400,
        height: "auto" as const, 
        resizable: true,
        closeOnSubmit: false,
        popOut: true
      };
  }

  getData() {
    // Get combat data to display in your custom screen
    const combatId = this._options.combatId;
    const combat = game.combats?.get(combatId) as Combat || game.combat;
    
    if (!combat) return { hasActiveCombat: false };

    this._combatId = combat.id
    
    const lastTurn = combat.getFlag("turn-time-in-chat", 'lastTurnTime');
    const roundStartTime = combat.getFlag('turn-time-in-chat', 'roundStartTime');
    const combatStartTime = combat.getFlag('turn-time-in-chat', 'combatStartTime');
    const chatMessagesDisabled = combat.getFlag("turn-time-in-chat", 'timerDisabled') ?? false;
    const now = Date.now();
    
    return {
      hasActiveCombat: true,
      combat: combat,
      currentRound: combat.round,
      currentTurn: combat.turn,
      currentCombatant: combat.combatant,
      turnElapsed: formatTime(now - lastTurn),
      roundElapsed: formatTime(now - roundStartTime),
      combatElapsed: formatTime(now - combatStartTime),
      turns: this._getTurnData(combat),
      messagesDisabled: chatMessagesDisabled,
      isGM: game.user?.isGM
    };
  }
    
  // Get formatted turn data
  _getTurnData(combat: Combat) {
    const turns = combat.getFlag("turn-time-in-chat", "turnLengths") || {};
    
    // Get current turn time elapsed
    const lastTurn = combat.getFlag("turn-time-in-chat", 'lastTurnTime');
    const now = Date.now();
    const currentTurnElapsed = now - lastTurn;
      
    // Get current combatant
    const currentCombatant = combat.combatant;
    let actorId = currentCombatant?.actor?.id ?? '0'
    let actorName = currentCombatant?.actor?.name ?? 'Gamemaster'
  
    if (currentCombatant?.isNPC) {
      actorId = '0'
      actorName = 'Gamemaster'
    }
  
    // Create a copy of the turns object to avoid modifying the original
    const displayTurns = {...turns};
    
    // For the current combatant, show the current elapsed time + their stored time
    displayTurns[actorId] = {
      name: actorName,
      turnLengthMS: currentTurnElapsed + (turns[actorId]?.turnLengthMS || 0)
    };
    
    // Convert object to array for sorting
    const turnsArray = Object.entries(displayTurns).map(([id, data]) => ({
      name: data.name,
      turnLengthMS: data.turnLengthMS,
      turnLength: formatTime(data.turnLengthMS)
    }));
    
    // Sort by turnLengthMS in descending order (longest to shortest)
    return turnsArray.sort((a, b) => b.turnLengthMS - a.turnLengthMS);
    }
  
  activateListeners(html: JQuery) {
    super.activateListeners(html);
    
    html.find('.enable-messages').on('click', async () => {
      const combat = this._combatId ? game.combats?.get(this._combatId) as Combat : game.combat;
      if (combat) {
        await combat.setFlag("turn-time-in-chat", 'timerDisabled', false);
        ui.notifications?.info("Timer Messages Enabled");
        this.render();
      } else {
        ui.notifications?.error("Failed to find the combat");
        this.render();
      }
    });

    html.find('.disable-messages').on('click', async () => {
      const combat = this._combatId ? game.combats?.get(this._combatId) as Combat : game.combat;
      if (combat) {
        await combat.setFlag("turn-time-in-chat", 'timerDisabled', true);
        ui.notifications?.info("Timer Messages Disabled");
        this.render();
      } else {
        ui.notifications?.error("Failed to find the combat");
        this.render();
      }
    });
    
    // Start the auto-refresh interval
    this._startAutoRefresh();
  }
  
  _startAutoRefresh() {
    // Clear any existing interval first
    this._clearAutoRefresh();
    
    // Set a new interval to update every second
    this._updateInterval = window.setInterval(() => {
      // Check if combat still exists and is active
      if (!game.combat?.started && (this._combatId && !game.combats?.get(this._combatId))) {
        // If combat has ended, make sure it doesn't update
        this._clearAutoRefresh();
        return;
      }
      
      this.render(false); // false to avoid focusing the window on updates
    }, 1000);
  }
  
  _clearAutoRefresh() {
    if (this._updateInterval) {
      window.clearInterval(this._updateInterval);
      this._updateInterval = null;
    }
  }
  
  close(options={}) {
    // Clean up the interval when the app is closed
    this._clearAutoRefresh();
    return super.close(options);
  }
}