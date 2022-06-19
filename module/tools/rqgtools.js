export class RQGTools {
  static async getcompendiumdata(cp) {
    // Extract the content of the compendium given as a parameter
    return await cp.getcontent();
  }

  static async itemRollMacro(itemid, event, options = {}) {
    event.preventDefault();
    const speaker = ChatMessage.getSpeaker();
    let actor;
    if (speaker.token) actor = game.actors.tokens[speaker.token];
    if (!actor) actor = game.actors.get(speaker.actor); // No need to fill actor token

    if (!actor) {
      ui.notifications.warn(game.i18n.localize('No actor found'));
      return;
    }
    let item = await actor.getEmbeddedDocument('Item', itemid);
    if (item) {
      item.roll();
    }
  }

  static _onDragItem(event, actor) {
    const a = event.currentTarget;
    const data = duplicate(a.dataset);
    data.type = 'Item';
    data.actorid = actor.id;
    event.originalEvent.dataTransfer.setData(
      'text/plain',
      JSON.stringify(data)
    );
  }

  static async createMacro(bar, data, slot) {
    if (data.type !== 'Item') return;
    if (!data.actorid) return;
    const actor = game.actors.get(data.actorid);
    const item = actor.getEmbeddedDocument('Item', data.itemId);

    // command = `game.CoC7.macros.weaponCheck({name:'${item.name}', id:'${item.id}', origin:'${origin}', pack: '${packName}'}, event);`
    const command = `game.Runequest.macros.itemRoll('${data.itemId}', event);`;

    // Create the macro command
    let macro = game.macros.contents.find(
      m => m.name === item.name && m.command === command
    );
    if (!macro) {
      macro = await Macro.create({
        name: item.name,
        type: 'script',
        img: item.img,
        command: command,
      });
    }
    game.user.assignHotbarMacro(macro, slot);
    return false;
  }

  static getDataset(el, dataset) {
    const elem = el.target ? el.target : el[0];
    const element = elem?.closest(`[data-${dataset}]`);
    return element?.dataset[dataset];
  }

  static findItemId(event, itemClass = '.item', itemProp = 'itemId') {
    // (assumes `event` originates from the child of an element with class
    // `itemClass` that has property `data-item-prop`)
    const el = event.target ? event.target : event[0];
    const itemId = el?.closest(itemClass)?.dataset?.[itemProp];
    if (itemId == undefined) throw new Error(`${itemProp} not found`);
    return itemId;
  }
}
