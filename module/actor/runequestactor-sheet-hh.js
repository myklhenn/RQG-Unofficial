import { RQG } from '../config.js';
import { RQGTools } from '../tools/rqgtools.js';
import { skillMenuOptionsHH } from '../menu/skill-context-hh.js';
import { attackMenuOptionsHH } from '../menu/attack-context-hh.js';
import ActiveEffectRunequest from '../active-effect.js';
import { RunequestBaseActorSheet } from './rqg-baseactor-sheet.js';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class RunequestActorHarharlHomebrewSheet extends RunequestBaseActorSheet {
  /**
   * @override
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['sheet', 'actor', 'rqghh'],
      template: 'systems/runequest/templates/actor/hh/hh-actor-sheet.html',
      width: 1000,
      height: 700,
      dragDrop: [{ dragSelector: null, dropSelector: null }],
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'summary',
        }
      ],
    });
  }

  static confirmItemDelete(actor, itemId) {
    actor.deleteEmbeddedDocuments('Item', [itemId]);
  }

  /**
   * @override
   * @returns The data structure from the base sheet
   */
  getData() {
    const context = super.getData();
    // console.log(context);
    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   * @param {Object} context The actor to prepare.
   * @return {undefined}
   */

  _prepareCharacterData(context) {}

  /**
   * Organize and classify Items for Character sheets.
   * @param {Object} context The actor to prepare.
   * @return {undefined}
   */
  _prepareItems(context) {}

  /**
   * @override
   * Setup callbacks for events fired when interacting with actor sheet
   * @param {Object} html DOM object to select parts of and add listeners to
   */
  activateListeners(html) {
    super.activateListeners(html);

    // everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // (un)lock character sheet
    html.find('.unlock-character-sheet').click(() => this._onFlagToggle('locked'));

    // roll characteristics
    html.find('.characteristic-roll').click(e => this._onCharacteristicRoll(e));

    // roll elemental runes
    html.find('.elemental-rune-roll').click(e => this._onElementalRuneRoll(e));

    // roll power runes
    html.find('.power-rune-roll').click(e => this._onPowerRuneRoll(e));

    // roll passions (with right-click context menu)
    html.find('.passion-roll').click(e => this._onPassionRoll(e));
    new ContextMenu(html, '.passion-roll', skillMenuOptionsHH(this.actor));

    // add inventory item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // update inventory item
    html.find('.item-edit').click(e => {
      const itemId = RQGTools.findItemId(e);
      const item = this.actor.getEmbeddedDocument('Item', itemId);
      item.sheet.render(true);
    });

    // delete inventory item
    html.find('.item-delete').click(e => {
      const itemId = RQGTools.findItemId(e);
      this.actor.deleteEmbeddedDocuments('Item', [itemId]);
      // const item = e.currentTarget.closest('.item');
      // this.actor.deleteEmbeddedDocuments('Item', [item.dataset['itemId']]);
      // item.slideUp(200, () => this.render(false));
    });

    // toggle inclusion of skill category modifier in skill total column
    html.find('.toggle-sum-skill-cat-modifier').click(
      () => this._onFlagToggle('sumskillcatmodifier')
    );

    // roll skills (with right-click context menu)
    html.find('.skill-roll').click(e => this._onSkillRoll(e));
    new ContextMenu(html, '.skill-roll', skillMenuOptionsHH(this.actor));

    // roll rune spells
    html.find('.rune-spell-roll').click(e => this._onRuneSpellRoll(e));

    // roll spirit spells
    html.find('.spirit-spell-roll').click(e => this._onSpiritSpellRoll(e));

    // handle toggling of spell effects
    html.find('.spell-toggle').click(this._onSpellToggle.bind(this));

    // roll attacks (with right-click context menu)
    html.find('.attack-roll').click(e => this._onAttackRoll(e));
    new ContextMenu(html, '.attack-roll', attackMenuOptionsHH(this.actor));

    // handle dragging and dropping of items
    html.find('.item').on('dragstart', e => RQGTools._onDragItem(e, this.actor));

    html.find('.effect-control').click(e =>
      ActiveEffectRunequest.onManageActiveEffect(e, this.actor)
    );

    if (game.user.isGM) {
      // enable UI functionality only available to GM users
      html.find('.export-items').click(this._onExportItems.bind(this));
    }
  }

  async _onFlagToggle(flag) {
    this.actor.toggleActorFlag(flag);
  }

  /**
   * Creating a new Owned Item for the actor using initial data defined in the
   * HTML dataset
   * @param {Event} event The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const eventData = event.currentTarget.dataset;
    const itemData = {
      name: `New ${eventData.type.capitalize()}`, // an initial default name
      type: eventData.type,
      data: duplicate(eventData),
    };
    delete itemData.data['type']; // remove since it was copied to itemData.type
    return this.actor.createEmbeddedDocuments('Item', [itemData]);
  }

  /**
   * Perform a characteristic roll
   * @param {Event} event The originating click event
   * @private
   */
  _onCharacteristicRoll(event) {
    event.preventDefault();
    const charId = RQGTools.findItemId(event, '.characteristic-item', 'characteristic');
    const charData = this.getData().data.characteristics[charId];
    renderTemplate('/systems/runequest/templates/chat/char-dialog.html', {
      // pre-filled dialog data
      charname: game.i18n.localize(charData.label),
      charvalue: charData.value,
      difficultymultiplier: 5,
    }).then(dialogContent => new Dialog({
      title: 'Passion Roll',
      content: dialogContent,
      buttons: {
        rollButton: {
          label: game.i18n.localize('Roll'),
          callback: html => {
            // note that this does not execute until DiceWFRP.prepareTest() has
            // finished and the user confirms the dialog
            const charName = html.find('[name="charname"]').val();
            const charValue = Number(html.find('[name="charvalue"]').val());
            const testMod = Number(html.find('[name="testmodifier"]').val());
            const diffMult = Number(html.find('[name="difficultymultiplier"]').val());
            const rollTarget = (charValue * diffMult) + testMod;
            this.basicRoll(charName, rollTarget);
          }
        }
      },
      default: 'rollButton'
    }).render(true));
  }

  /**
   * Perform an elemental rune roll
   * @param {Event} event The originating click event
   * @private
   */
  _onElementalRuneRoll(event) {
    event.preventDefault();
    const runeId = RQGTools.findItemId(event, '.rune-item', 'rune');
    const runeData = this.getData().data.elementalrunes[runeId];
    const runeName = game.i18n.localize(runeData.label);
    const rollTarget = runeData.value;
    this.basicRoll(runeName, rollTarget);
  }

  /**
   * Perform a power rune roll
   * @param {Event} event The originating click event
   * @private
   */
  _onPowerRuneRoll(event) {
    event.preventDefault();
    const runePairId = RQGTools.findItemId(event, '.power-rune-pair', 'runePair');
    const runeId = RQGTools.findItemId(event, '.rune-item', 'rune');
    const runeData = this.getData().data.powerrunes[runePairId][runeId];
    const runeName = game.i18n.localize(runeData.label);
    const rollTarget = runeData.value;
    this.basicRoll(runeName, rollTarget);
  }

  /**
   * Perform a passion roll
   * @param {Event} event The originating click event
   * @private
   */
  _onPassionRoll(event) {
    event.preventDefault();
    const passionId = RQGTools.findItemId(event);
    const passion = this.actor.getEmbeddedDocument('Item', passionId);
    const passionName = passion.data.name;
    const rollTarget = passion.data.data.total;
    this.basicRoll(passionName, rollTarget);

    // if (event.button == 0) {
    //   if (event.ctrlKey == true) {
    //     // perform gain roll
    //     const passionid = event.currentTarget.dataset.itemId;
    //     let passion = this.actor.getEmbeddedDocument('Item', passionid);
    //     passion.gainroll();
    //     return;
    //   }
    // } else if (event.button == 2) {
    //   if (event.altKey == true) {
    //     // delete item
    //     this.actor.deleteEmbeddedDocuments('Item', [
    //       event.currentTarget.dataset.itemid,
    //     ]);
    //     return;
    //   }
    //   // edit item
    //   const item = this.actor.getEmbeddedDocument(
    //     'Item',
    //     event.currentTarget.dataset.itemid
    //   );
    //   item.sheet.render(true);
    //   return;
    // } else {
    //   // do nothing
    //   return;
    // }

    // event.preventDefault();
    // const data = this.getData();
    // if (event.button == 0) {
    // } else {
    //   return;
    // }
    // const row = event.target.parentElement.parentElement;
    // //(row);
    // let passionname = row.dataset['passionname'];
    // const passionid = row.dataset['itemId'];
    // //('passionname:'+passionname+' - passionid:'+passionid);
    // const passion = this.actor.getEmbeddedDocument('Item', passionid);
    // //(passion);
    // let dialogOptions = {
    //   title: 'Passion Roll',
    //   template: '/systems/runequest/templates/chat/skill-dialog.html',
    //   "z-index": 100,
    //   // Prefilled dialog data

    //   data: {
    //     skillname: passionname,
    //     skillvalue: passion.data.data.total,
    //     catmodifier: 0,
    //   },
    //   callback: (html) => {
    //     // When dialog confirmed, fill testData dialog information
    //     // Note that this does not execute until DiceWFRP.prepareTest() has finished and the user confirms the dialog
    //     passionname = html.find('[name="skillname"]').val();
    //     let testmodifier = Number(html.find('[name="testmodifier"]').val());
    //     let catmodifier = Number(html.find('[name="catmodifier"]').val());
    //     let skillvalue = Number(html.find('[name="skillvalue"]').val());
    //     const target = skillvalue + catmodifier + testmodifier;
    //     this.basicRoll(passionname, target);
    //   },
    // };
    // renderTemplate(dialogOptions.template, dialogOptions.data).then((dlg) => {
    //   new Dialog({
    //     title: dialogOptions.title,
    //     content: dlg,
    //     buttons: {
    //       rollButton: {
    //         label: game.i18n.localize('Roll'),
    //         callback: (html) => dialogOptions.callback(html),
    //       },
    //     },
    //     default: 'rollButton',
    //   }).render(true);
    // });
  }

  /**
   * Perform a skill roll
   * @param {Event} event The originating click event
   * @private
   */
  _onSkillRoll(event) {
    event.preventDefault();
    const skillId = RQGTools.findItemId(event);
    const skill = this.actor.getEmbeddedDocument('Item', skillId);
    skill.roll();

    // if (e.button == 0) {
    //   if (e.ctrlKey == true) {
    //     let skill = this.actor.getEmbeddedDocument('Item', skillId);
    //     //(skill)
    //     skill.gainroll();
    //     return;
    //   }
    // } else {
    //   /*
    //   else if(e.button == 2) {
    //     if(e.altKey == true){
    //       this.actor.deleteEmbeddedDocuments('Item',[skillId]);
    //       return;
    //     }
    //     const item = this.actor.getEmbeddedDocument('Item',skillId);
    //     item.sheet.render(true);
    //     return;
    //   }
    //   */
    //   return;
    // }
  }

  /**
   * Perform a rune spell roll
   * @param {Event} event The originating click event
   * @private
   */
  _onRuneSpellRoll(event) {
    event.preventDefault();
    const actorData = this.getData().data;
    const runeSpellId = RQGTools.findItemId(event);
    const runeSpell = this.actor.getEmbeddedDocument('Item', runeSpellId);
    renderTemplate('/systems/runequest/templates/chat/runespell-dialog.html', {
      // pre-filled dialog data
      runespell: runeSpell,
      spellname: runeSpell.name,
      data: actorData,
      config: RQG,
    }).then(dialogContent => new Dialog({
      title: 'Runespell Casting',
      content: dialogContent,
      buttons: {
        rollButton: {
          label: game.i18n.localize('RQG.Roll'),
          callback: html => {
            // note that this does not execute until DiceWFRP.prepareTest() has
            // finished and the user confirms the dialog
            const spellName = html.find('[name="spellname"]').val();
            const runeUsed = html.find('[name="runeused"]').val();
            const rollTarget = this._findRuneData(actorData, runeUsed).value;
            this.basicRoll(spellName, rollTarget);
          }
        }
      },
      default: 'rollButton'
    }).render(true));

    // if (e.button == 0) {
    // } else {
    //   return;
    // }
    // /*
    //   const row= e.target.parentElement.parentElement;
    //   const runename = row.dataset['rune'];
    //   //(runename);
    //   const spellname = `${row.dataset['spellname']} (${runename})`;
    //   const rune = this._findrune(data,runename);
    //   const target = rune.value;
    // */
  }

  /**
   * Perform a spirit spell roll
   * @param {Event} event The originating click event
   * @private
   */
  _onSpiritSpellRoll(event) {
    event.preventDefault();
    const spellId = RQGTools.findItemId(event);
    const spell = this.actor.getEmbeddedDocument('Item', spellId);
    spell.roll();
  }

  /**
   * Find rune data in the actor's data structure
   * @param actorData A copy of the actor sheet's data structure
   * @param {String} runeName The rune to be found in the actor data
   * @returns Rune data corresponding to `runeName`
   * @private
   */
  _findRuneData(actorData, runeName) {
    if (typeof actorData.elementalrunes[runeName] != 'undefined') {
      return actorData.elementalrunes[runeName];
    } else {
      for (let runePair in actorData.powerrunes) {
        if (typeof actorData.powerrunes[runePair][runeName] != 'undefined') {
          return actorData.powerrunes[runePair][runeName];
        }
      }
      return actorData.elementalrunes['air'];
    }
  }

  /**
   * Perform an attack roll
   * @param {Event} event The originating click event
   * @private
   */
  _onAttackRoll(event) {
    event.preventDefault();
    const actorData = this.getData().data;
    const targetDefense = 0;
    const attackId = RQGTools.findItemId(event);

    if (game.user.targets.size > 0) {
      const targets = Array.from(game.user.targets);
      targetDefense = targets[0].actor.data.data.defense[0]
        ? targets[0].actor.data.data.defense[0]
        : null;
    }

    if (!attackId) {
      renderTemplate('/systems/runequest/templates/chat/attack-dialog.html', {
        // pre-filled dialog data
        attacks: actorData.attacks,
        data: actorData,
        targetdefense: targetDefense,
      }).then(dialogContent => new Dialog({
        title: 'Attack Roll',
        content: dialogContent,
        buttons: {
          rollButton: {
            label: game.i18n.localize('RQG.Roll'),
            callback: html => {
              // note that this does not execute until DiceWFRP.prepareTest()
              // has finished and the user confirms the dialog
              const attackId = html.find('[name="attackname"]').val();
              const attack = this.actor.getEmbeddedDocument("Item", attackId);
              const testModifier = Number(html.find('[name="testmodifier"]').val());
              const testData = { testmodifier: testModifier };
              attack.roll(testData);
            }
          }
        },
        default: 'rollButton'
      }).render(true));
    } else {
      const attack = this.actor.getEmbeddedDocument('Item', attackId);
      attack.roll({ targetdefense: targetDefense });
    }
  }

  /**
   * Perform a basic roll against a target success value
   * @param {String} charName Actor name to display in chat message
   * @param {Number} rollTarget Number to roll below
   * @returns {String} Success result
   */
  async basicRoll(charName, rollTarget) {
    // perform roll
    const roll = await new Roll('1d100').roll();
    const result = this._getRollResult(roll.total, rollTarget);

    // render the chat card template
    const template = 'systems/runequest/templates/chat/skill-card.html';
    const html = await renderTemplate(template, {
      actor: this.actor,
      item: this.object.data,
      charname: charName,
      target: rollTarget,
      roll: roll,
      result: result,
    });

    // "whisper" blind rolls to GM
    let chatWhisper = null;
    const rollMode = game.settings.get('core', 'rollMode');
    if (['gmroll', 'blindroll'].includes(rollMode)) {
      chatWhisper = ChatMessage.getWhisperRecipients('GM');
    }

    // send rendered chat card to chat log
    ChatMessage.create({
      user: game.user.id,
      content: html,
      speaker: {
        actor: this.actor.id,
        token: this.actor.token,
        alias: this.actor.name,
      },
      whisper: chatWhisper,
      blind: (rollMode === 'blindroll')
    });

    return result;
  }

  /**
   * Perform a gain roll against a target success value
   * @param {String} charName Actor name to display in chat message
   * @param {Number} rollTarget Number to roll above
   * @returns {String} Success result
   */
  async gainRoll(charName, rollTarget) {
    // perform roll
    const roll = await new Roll('1d100').roll();
    const result = this._getRollResult(roll.total, rollTarget);

    // render the chat card template
    const template = 'systems/runequest/templates/chat/skill-card.html';
    const html = await renderTemplate(template, {
      actor: this.actor,
      item: this.object.data,
      charname: charName,
      target: rollTarget,
      roll: roll,
      result: result,
    });

    // "whisper" blind rolls to GM
    let chatWhisper = null;
    const rollMode = game.settings.get('core', 'rollMode');
    if (['gmroll', 'blindroll'].includes(rollMode)) {
      chatWhisper = ChatMessage.getWhisperRecipients('GM');
    }

    // send rendered chat card to chat log
    ChatMessage.create({
      user: game.user.id,
      content: html,
      speaker: {
        actor: this.actor.id,
        token: this.actor.token,
        alias: this.actor.name,
      },
      whisper: chatWhisper,
      blind: (rollMode === 'blindroll')
    });

    return result;
  }

  /**
   * Handle rolling of an item from the Actor sheet, obtaining the Item
   * instance and dispatching to it's roll method
   * @param {Event} event The originating click event
   * @private
   */
  _onItemRoll(event) {
    event.preventDefault();
    const itemId = RQGTools.findItemId(event);
    const item = this.actor.getEmbeddedDocument('Item', itemId);
    return item.roll();
  }

  // async genericAttackRoll(attack) {
  //   const data = this.getData();
  //   const categoryId = attack.data.data.attacktype + 'weapons';
  //   const skillName = game.i18n.localize(
  //     RQG.weaponskills[attack.data.data.skillused]
  //   );
  //   const damageBonus = attack.options.actor.data.data.attributes.damagebonus;
  //   const skillUsed = data.actor.skills[categoryId].find(skill => skill.name == skillName);
  //   const categoryModifier =
  //     attack.options.actor.data.data.skillcategory[categoryId].modifier;
  //   const rollTarget = skillUsed.data.total + categoryModifier;

  //   const roll = await new Roll('1d100').roll();
  //   const result = this._getRollResult(roll.total, rollTarget);

  //   this.htmldamageroll(roll, rollTarget, result, attack, damageBonus);
  // }

  /**
   * Update the actor data structure with values from the provided
   * `formData` object
   * @param {Event} event The event that triggered the form update/submission
   * @param formData Data structure containing form data from the actor sheet
   * @returns The `update` callback attached to this class instance
   */
  async _updateObject(event, formData) {
    const target = event?.currentTarget;
    if (target?.classList?.contains('power-rune-input')) {
      if (Number(target.value)) {
        const runePairId = RQGTools.findItemId(event, '.power-rune-pair', 'runePair');
        const runeId = RQGTools.findItemId(event, '.rune-item', 'rune');
        const otherRuneId = this._getOtherRuneInPair(runePairId, runeId);
        if (otherRuneId) {
          const formDataId = `data.powerrunes.${runePairId}.${otherRuneId}.value`;
          formData[formDataId] = 100 - parseInt(target.value);
        }
      }
    }
    if (target?.classList?.contains('hitlocation-wounds')) {
      const hitLocation = this.actor.items.get(RQGTools.findItemId(event));
      const value = Number(target.value) ? parseInt(target.value) : 0;
      await hitLocation?.update({ [target.name]: value });
    }
    if (target?.classList?.contains('hitlocation-armor')) {
      const hitLocation = this.actor.items.get(RQGTools.findItemId(event));
      const value = Number(target.value) ? parseInt(target.value) : 0;
      await hitLocation?.update({ [target.name]: value });
    }
    if (target?.classList?.contains('runepoints-current')) {
      const cult = this.actor.items.get(RQGTools.findItemId(event));
      const value = Number(target.value) ? parseInt(target.value) : 0;
      await cult?.update({ [target.name]: value });
    }
    if (target?.classList?.contains('mpstorage-current')) {
      const mpStorage = this.actor.items.get(RQGTools.findItemId(event));
      const value = Number(target.value) ? parseInt(target.value) : 0;
      await mpStorage?.update({ [target.name]: value });
    }
    if (target?.classList?.contains('mpstorage-equiped')) {
      const mpStorage = this.actor.items.get(RQGTools.findItemId(event));
      await mpStorage?.update({ [target.name]: target.checked });
    }
    if (target?.classList?.contains('skill-experience')) {
      const skill = this.actor.items.get(RQGTools.findItemId(event));
      await skill?.update({ [target.name]: target.checked });
    }
    if (target?.classList?.contains('passion-experience')) {
      const passion = this.actor.items.get(RQGTools.findItemId(event));
      await passion?.update({ [target.name]: target.checked });
    }
    // if (target?.classList?.contains('attacks')) {
    //   const attack = this.actor.items.get(RQGTools.findItemId(event));
    //   if (attack) {
    //     let value = null;
    //     if (target.dataset.dtype === 'Number') {
    //       value = target.value
    //         ? parseInt(target.value)
    //         : null;
    //     } else {
    //       value = target.value;
    //     }
    //     if (target.name !== 'data.name') {
    //       if (!target.value) {
    //         await attack.update({ [target.name]: null });
    //       } else {
    //         await attack.update({ [target.name]: value });
    //       }
    //     } else {
    //       if (!target.value) {
    //         await attack.update({ ['name']: null });
    //       } else {
    //         await attack.update({ ['name']: value });
    //       }
    //     }
    //   }
    // }
    if (target?.classList?.contains('attacks-db')) {
      const attack = this.actor.items.get(RQGTools.findItemId(event));
      await attack?.update({ [target.name]: target.checked });
    }
    return this.object.update(formData);
  }

  _getOtherRuneInPair(runePair, rune) {
    const runePairFirstPart = runePair.substring(0, rune.length);
    const runePairLastPart = runePair.substring(
      runePair.length - rune.length, runePair.length
    );
    if (runePairFirstPart == rune) {
      return runePair.substring(rune.length, runePair.length);
    } else if (runePairLastPart == rune) {
      return runePair.substring(0, runePair.length - rune.length);
    } else {
      return null;
    }
  }

  _getRollResult(roll, rollTarget) {
    const criticalThreshold = Math.max(Math.round(rollTarget / 20), 1);
    const specialThreshold = Math.round(rollTarget / 5);
    const fumbleRange = Math.round((100 - rollTarget) / 20);
    const fumbleThreshold = 100 - Math.max(fumbleRange, 0);
    let result;

    // check roll result
    if ((roll < 96 && roll <= rollTarget) || roll <= 5) {
      // success
      if (roll <= criticalThreshold) {
        result = 'critical';
      } else if (roll <= specialThreshold) {
        result = 'special';
      } else {
        result = 'success';
      }
    } else {
      // failure
      if (roll >= fumbleThreshold) {
        result = 'fumble';
      } else {
        result = 'failure';
      }
    }

    return result;
  }

  _prepareSkill(skill) {
    // calculate total skill value
    skill.data.total = skill.data.base + skill.data.increase;
  }
  _preparePassion(passion) {
    // calculate total passion value
    const { base, increase, modifier } = passion.data;
    passion.data.total = base + increase + modifier;
  }
  _preparehitlocation(hitlocation, actorData) {
    const { basehp, wounds } = hitlocation.data.data;
    // calculate max HP of the location
    hitlocation.data.data.maxhp = basehp + actorData.data.attributes.hpmodifier;
    // calculate remaining HP of the location based on wounds
    hitlocation.data.data.currenthp = hitlocation.data.data.maxhp - wounds;
  }

  async _onSpellToggle(event) {
    const spellid = RQGTools.findItemId(event);
    const spell = this.actor.items.get(spellid);
    const effects = this.actor.effects;
    const spellEffects = effects.filter(effect =>
      effect.data.origin.endsWith(spellid)
    );
    if (spellEffects.length == 0) return; // no spell effects found
    const spellStatus = !spell.data.data.active;
    for (const effect of spellEffects) {
      await effect.update({ disabled: !spellStatus });
    }
    return spell.update({ 'data.active': spellStatus });
  }

  async _onExportItems(event) {
    // This function will export Actor Owned items to a new directory in the Items Directory.
    // To be improved with more features as we go.

    //First we create the compendium
    let timestamp = Date.now();
    let label = `${this.actor.data.name}-${timestamp}`;
    const itemCompendium = await game.packs
      .get('runequest.character-items-export')
      .duplicateCompendium({ label: label });
    console.log(itemCompendium);
    for (let i of this.actor.items) {
      itemCompendium.importDocument(i);
    }
    return;
  }
}
