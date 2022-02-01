import { RQGTools } from '../tools/rqgtools.js';
import { RunequestActorSheet } from '../actor/runequestactor-sheet.js';
export const skillMenuOptions = (actor, token) => [
    {
      name: "Roll",
      icon: '<i class="fas fa-dice-d20"></i>',
      condition: () => true,
      callback: async (el) => {
        const itemId = RQGTools.getDataset(el, "itemid");
        const item = actor.items.get(itemId);
        if (!item || !item.sheet) {
          const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit the skill item from the skill context menu`;
          ui.notifications?.error(msg);
          throw new Error(msg, el);
        }
        item.roll();
      }
    },
    {
        name: "Gain",
        icon: '<i class="fas fa-dice-d6"></i>',
        condition: () => true,
        callback: async (el) => {
          const itemId = RQGTools.getDataset(el, "itemid");
          const item = actor.items.get(itemId);
          if (!item || !item.sheet) {
            const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit the skill item from the skill context menu`;
            ui.notifications?.error(msg);
            throw new Error(msg, el);
          }
          item.gainroll();
        }
      },    
    {
      name: "Edit",
      icon: '<i class="fas fa-edit"></i>',
      condition: () => true,
      callback: (el) => {
        const itemId = RQGTools.getDataset(el, "itemid");
        const item = actor.items.get(itemId);
        if (!item || !item.sheet) {
          const msg = `Couldn't find itemId [${itemId}] on actor ${actor.name} to edit the skill item from the skill context menu`;
          ui.notifications?.error(msg);
          throw new Error(msg, el);
        }
        item.sheet.render(true);
      }
    },
    {
      name: "Delete",
      icon: '<i class="fas fa-trash"></i>',
      condition: () => true,
      callback: (el) => {
        const itemId = RQGTools.getDataset(el, "itemid");
        RunequestActorSheet.confirmItemDelete(actor, itemId);
      }
    }
  ];
  