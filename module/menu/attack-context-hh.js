import { RQGTools } from '../tools/rqgtools.js';
import { RunequestActorSheet } from '../actor/runequestactor-sheet.js';
export const attackMenuOptionsHH = actor => [
  {
    name: 'Roll',
    icon: '<i class="fas fa-dice-d20"></i>',
    condition: () => true,
    callback: async el => {
      try {
        const targetDefense = 0;
        const itemId = RQGTools.findItemId(el);
        const item = actor.items.get(itemId);
        if (!item || !item.sheet) throw new Error('item not found');
        item.roll({'targetdefense': targetDefense});
      } catch {
        const msg = `Couldn't find itemId "${itemId}" on actor "${actor.name}"
          to perform a roll from the attack context menu`;
        ui.notifications?.error(msg);
        throw new Error(msg, el);
      }
    }
  },
  {
    name: 'Edit',
    icon: '<i class="fas fa-edit"></i>',
    condition: () => true,
    callback: el => {
      try {
        const itemId = RQGTools.findItemId(el);
        const item = actor.items.get(itemId);
        if (!item || !item.sheet) throw new Error('item not found');
        item.sheet.render(true);
      } catch {
        const msg = `Couldn't find itemId "${itemId}" on actor "${actor.name}"
          to edit the attack item from the attack context menu`;
        ui.notifications?.error(msg);
        throw new Error(msg, el);
      }
    }
  },
  {
    name: 'Delete',
    icon: '<i class="fas fa-trash"></i>',
    condition: () => true,
    callback: el => {
      try {
        const itemId = RQGTools.findItemId(el);
        RunequestActorSheet.confirmItemDelete(actor, itemId);
      } catch {
        const msg = `Couldn't find itemId "${itemId}" on actor "${actor.name}"
        to delete the attack item from the attack context menu`;
        ui.notifications?.error(msg);
        throw new Error(msg, el);
      }
    }
  }
];
