/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class RunequestActorSheet extends ActorSheet {

  /** @override */
	static get defaultOptions() {
	  return mergeObject(super.defaultOptions, {
  	  classes: ["worldbuilding", "sheet", "actor"],
  	  template: "systems/runequest/templates/actor/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description"}]
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    console.log("getData:"+this.actor.name+" / "+this.actor.data.type);
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];

    // Prepare items.
    if (this.actor.data.type == 'character') {
      this._prepareCharacterItems(data);
      //this._prepareCharacterFlags(data);
    }

    return data;
  }
  /**
   * Organize and prepare Flags for Character sheets. For testing purpose may set some flags
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(sheetData) {
    const actorData = sheetData.actor;
    console.log("_prepareCharacterItems");
    console.log(actorData);
    // Initialize containers.
    const gear = [];
    const defense = [];
    const skills = {
      "agility": [],
      "communication": [],
      "knowledge": [],
      "magic": [],
      "manipulation": [],
      "perception": [],
      "stealth": [],
      "meleeweapons": [],
      "missileweapons": [],
      "shields": [],
      "naturalweapons": [],
      "others": []
    };
    const attacks = {
      "melee": [],
      "missile": [],
      "natural":[]
    }
    const spells = {
      "spirit": [],
      "rune": [],
      "sorcery":[]
    }
    const passions = [];
    const cults = [];
    const mpstorage = [];
    var hitlocations =[];
    let totalwounds = 0;
    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    for (let i of sheetData.items) {
      let item = i.data;
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to skills.
      else if (i.type === 'skill') {
        this._prepareSkill(i); // To be removed once fix is found
        if (i.data.skillcategory != undefined) {
          skills[i.data.skillcategory].push(i);
          if(i.data.skillcategory == "shields"){
            defense.push(i);
          }
          if(i.data.name == "Dodge") {
            defense.push(i);
          }
        }
        else {
          skills["others"].push(i);
        }
      }
      else if (i.type === 'meleeattack') {
        attacks["melee"].push(i);
      }
      else if (i.type === 'missileattack') {
        attacks["missile"].push(i);
      }
      else if (i.type === 'naturalattack') {
        attacks["natural"].push(i);
      }
      else if (i.type === 'spiritspell') {
        spells["spirit"].push(i);
      }
      else if (i.type === 'runespell') {
        spells["rune"].push(i);
      }
      else if (i.type === 'sorceryspell') {
        spells["sorcery"].push(i);
      }
      else if (i.type === 'hitlocation') {
        //update hitlocation
        this._preparehitlocation(i,actorData);
        totalwounds+= Number(i.data.wounds);
        hitlocations.push(i);
        console.log("Total Wounds: "+totalwounds);
      }
      else if (i.type === 'passion') {
        this._preparePassion(i);
        passions.push(i);
      }
      else if (i.type === 'cult') {
        cults.push(i);
      }
      else if(i.type === 'mpstorage') {
        mpstorage.push(i);
      }      
    }
    // Assign and return
    actorData.gear = gear;
    actorData.skills = skills;
    actorData.attacks = attacks;
    actorData.spells = spells;
    actorData.hitlocations = hitlocations;
    actorData.passions = passions;
    actorData.cults = cults;
    actorData.defense = defense;
    actorData.mpstorage = mpstorage;
    actorData.data.attributes.hitpoints.value = actorData.data.attributes.hitpoints.max - totalwounds;
  }

  /* -------------------------------------------- */

  /** @override */
	activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Roll Characteristics
    html.find('.characteristic-roll').mousedown(event => {
      event.preventDefault();
      const data = this.getData();
      if(event.button == 0) {}
      else {return;}
      const row= event.target.parentElement.parentElement;
      const characid = row.dataset["characteristic"];
      let charname = game.i18n.localize(data.data.characteristics[characid].label);
      let charvalue= data.data.characteristics[characid].value;
      let difficultymultiplier = 5;
      let dialogOptions = {
        title: "Passion Roll",
        template : "/systems/runequest/templates/chat/char-dialog.html",
        // Prefilled dialog data

        data : {
          "charname": charname,
          "charvalue": charvalue,
          "difficultymultiplier": difficultymultiplier
        },
        callback : (html) => {
          // When dialog confirmed, fill testData dialog information
          // Note that this does not execute until DiceWFRP.prepareTest() has finished and the user confirms the dialog
          charname =    html.find('[name="charname"]').val();
          let testmodifier =   Number(html.find('[name="testmodifier"]').val());
          difficultymultiplier = Number(html.find('[name="difficultymultiplier"]').val());
          charvalue =   Number(html.find('[name="charvalue"]').val());
          const target = (charvalue*difficultymultiplier+testmodifier);
          this.basicRoll(charname,target);              
        }
      };
      renderTemplate(dialogOptions.template, dialogOptions.data).then(dlg =>
        {
          new Dialog(
          {
            title: dialogOptions.title,
            content: dlg,
            buttons:
            {
              rollButton:
              {
                label: game.i18n.localize("Roll"),
                callback: html => dialogOptions.callback(html)
              }
            },
            default: "rollButton"
          }).render(true);
        });
    });
    // Roll for Spirit Spells
    html.find('.spiritspell-roll').mousedown(event => {
      event.preventDefault();
      const data = this.getData();
      if(event.button == 0) {}
      else {return;}      
      const row= event.target.parentElement.parentElement;
      const spellname = row.dataset["spellname"];
      const target = (data.data.characteristics.power.value)*5;
      this.basicRoll(spellname,target);
    });
    // Roll for Passions
    html.find('.passion-roll').mousedown(event => {
      event.preventDefault();
      const data = this.getData();
      if(event.button == 0) {}
      else {return;}      
      const row= event.target.parentElement.parentElement;
      let passionname = row.dataset["passionname"];
      const passionid = row.dataset["itemId"];
      const passion = data.actor.passions.find(function(element) {
        return element._id==passionid;
      });
      let dialogOptions = {
        title: "Passion Roll",
        template : "/systems/runequest/templates/chat/skill-dialog.html",
        // Prefilled dialog data

        data : {
          "skillname": passionname,
          "skillvalue": passion.data.total,
          "catmodifier": 0
        },
        callback : (html) => {
          // When dialog confirmed, fill testData dialog information
          // Note that this does not execute until DiceWFRP.prepareTest() has finished and the user confirms the dialog
          passionname =    html.find('[name="skillname"]').val();
          let testmodifier =   Number(html.find('[name="testmodifier"]').val());
          let catmodifier = Number(html.find('[name="catmodifier"]').val());
          let skillvalue =   Number(html.find('[name="skillvalue"]').val());
          const target = (skillvalue+catmodifier+testmodifier);
          this.basicRoll(passionname,target);              
        }
      };
      renderTemplate(dialogOptions.template, dialogOptions.data).then(dlg =>
        {
          new Dialog(
          {
            title: dialogOptions.title,
            content: dlg,
            buttons:
            {
              rollButton:
              {
                label: game.i18n.localize("Roll"),
                callback: html => dialogOptions.callback(html)
              }
            },
            default: "rollButton"
          }).render(true);
        });
    });

    // Roll for Rune Spells
    html.find('.runespell-roll').mousedown(event => {
      event.preventDefault();
      const data = this.getData();
      if(event.button == 0) {}
      else {return;}
      const row= event.target.parentElement.parentElement;
      console.log(row);
      const runename = row.dataset["rune"];
      console.log(runename);
      const spellname = row.dataset["spellname"]+" ("+runename+")";
      const rune = this._findrune(data,runename);
      const target = rune.value;
      this.basicRoll(spellname,target);
    });

    html.find('.elementalrunes-roll').mousedown(event => {
      event.preventDefault();
      const data = this.getData();
      if(event.button == 0) {}
      else {return;}
      const runerow= event.target.parentElement.parentElement;
      const runeid = runerow.dataset["rune"];
      const charname = game.i18n.localize(data.data.elementalrunes[runeid].label);
      const target = (data.data.elementalrunes[runeid].value);
      this.basicRoll(charname,target);
    });
    html.find('.powerrunes-roll').mousedown(event => {
      event.preventDefault();
      const data = this.getData();
      if(event.button == 0) {}
      else {return;}      
      const runepairrow= event.target.parentElement.parentElement;
      console.log(runepairrow);
      const pairid = runepairrow.dataset["runepair"];
      console.log(pairid);
      const runerow=event.target; //.parentElement;
      console.log(runerow);
      const runeid=runerow.dataset["rune"];
      console.log(runeid);
      const charname = game.i18n.localize(data.data.powerrunes[pairid][runeid].label);
      const target = (data.data.powerrunes[pairid][runeid].value);
      this.basicRoll(charname,target);
    });
    html.find('.skill-roll').mousedown(event => this._onSkillRoll(event));
    html.find('.meleeattack-roll').mousedown(event => {
      event.preventDefault();
      const data = this.getData();
      if(event.button == 0) {}
      else {return;}
      const attackrow = event.target.parentElement.parentElement;
      const categoryid = "meleeweapons";
      const attackid = attackrow.dataset["itemId"];
      const attack = data.actor.attacks["melee"].find(function(element) {
        return element._id==attackid;
      });
      let attackname = attack.name;
      let skillname= attack.data.skillused;
      const skill = data.actor.skills[categoryid].find(function(element) {
        return element.name==skillname;
      });
      let damagebonus = data.data.attributes.damagebonus;
      let catmodifier = data.data.skillcategory[skill.data.skillcategory].modifier;
      let skillvalue = skill.data.total;
      let modifier= attack.data.modifier;
      if(data.actor.flags.runequestspell["bladesharp"]) {
        modifier = modifier+(data.actor.flags.runequestspell["bladesharp"]*5);
      }
      let dialogOptions = {
        title: "Melee Attack Roll",
        template : "/systems/runequest/templates/chat/meleeattack-dialog.html",
        // Prefilled dialog data

        data : {
          "skillname": skillname,
          "skillvalue": skillvalue,
          "catmodifier": catmodifier,
          "damagebonus": damagebonus
        },
        callback : (html) => {
          // When dialog confirmed, fill testData dialog information
          // Note that this does not execute until DiceWFRP.prepareTest() has finished and the user confirms the dialog
          skillname =    html.find('[name="skillname"]').val();
          let testmodifier =   Number(html.find('[name="testmodifier"]').val());
          catmodifier = Number(html.find('[name="catmodifier"]').val());
          skillvalue =   Number(html.find('[name="skillvalue"]').val());
          damagebonus =  html.find('[name="damagebonus"]').val();
          const target = (skillvalue+catmodifier+modifier+testmodifier);
          this.attackRoll(attack,target,damagebonus);
    
        }
      };
      renderTemplate(dialogOptions.template, dialogOptions.data).then(dlg =>
        {
          new Dialog(
          {
            title: dialogOptions.title,
            content: dlg,
            buttons:
            {
              rollButton:
              {
                label: game.i18n.localize("Roll"),
                callback: html => dialogOptions.callback(html)
              }
            },
            default: "rollButton"
          }).render(true);
        });
    });
    html.find('.naturalattack-roll').mousedown(event => {
      event.preventDefault();
      const data = this.getData();
      if(event.button == 0) {}
      else {return;}
      const attackrow = event.target.parentElement.parentElement;
      const categoryid = "naturalweapons";
      const attackid = attackrow.dataset["itemId"];
      const attack = data.actor.attacks["natural"].find(function(element) {
        return element._id==attackid;
      });
      let attackname = attack.name;
      let skillname= attack.data.skillused;
      const skill = data.actor.skills[categoryid].find(function(element) {
        return element.name==skillname;
      });
      let damagebonus = data.data.attributes.damagebonus;
      let catmodifier = data.data.skillcategory[skill.data.skillcategory].modifier;
      let skillvalue = skill.data.total;
      let modifier= attack.data.modifier;
      let dialogOptions = {
        title: "Natural Attack Roll",
        template : "/systems/runequest/templates/chat/meleeattack-dialog.html",
        // Prefilled dialog data

        data : {
          "skillname": skillname,
          "skillvalue": skillvalue,
          "catmodifier": catmodifier,
          "damagebonus": damagebonus
        },
        callback : (html) => {
          // When dialog confirmed, fill testData dialog information
          // Note that this does not execute until DiceWFRP.prepareTest() has finished and the user confirms the dialog
          skillname =    html.find('[name="skillname"]').val();
          let testmodifier =   Number(html.find('[name="testmodifier"]').val());
          catmodifier = Number(html.find('[name="catmodifier"]').val());
          skillvalue =   Number(html.find('[name="skillvalue"]').val());
          damagebonus =  html.find('[name="damagebonus"]').val();
          const target = (skillvalue+catmodifier+modifier+testmodifier);
          this.attackRoll(attack,target,damagebonus);
    
        }
      };
      renderTemplate(dialogOptions.template, dialogOptions.data).then(dlg =>
        {
          new Dialog(
          {
            title: dialogOptions.title,
            content: dlg,
            buttons:
            {
              rollButton:
              {
                label: game.i18n.localize("Roll"),
                callback: html => dialogOptions.callback(html)
              }
            },
            default: "rollButton"
          }).render(true);
        });
    });
    html.find('.missileattack-roll').mousedown(event => {
      event.preventDefault();
      const data = this.getData();
      if(event.button == 0) {}
      else {return;}
      const attackrow = event.target.parentElement.parentElement;
      const categoryid = "missileweapons";
      const attackid = attackrow.dataset["itemId"];
      const attack = data.actor.attacks["missile"].find(function(element) {
        return element._id==attackid;
      });
      let attackname = attack.name;
      let skillname= attack.data.skillused;
      const skill = data.actor.skills[categoryid].find(function(element) {
        return element.name==skillname;
      });
      let damagebonus = data.data.attributes.damagebonus;
      let catmodifier = data.data.skillcategory[skill.data.skillcategory].modifier;
      let skillvalue = skill.data.total;
      let modifier= attack.data.modifier;

      let dialogOptions = {
        title: "Missile Attack Roll",
        template : "/systems/runequest/templates/chat/meleeattack-dialog.html",
        // Prefilled dialog data

        data : {
          "skillname": skillname,
          "skillvalue": skillvalue,
          "catmodifier": catmodifier,
          "damagebonus": damagebonus
        },
        callback : (html) => {
          // When dialog confirmed, fill testData dialog information
          // Note that this does not execute until DiceWFRP.prepareTest() has finished and the user confirms the dialog
          skillname =    html.find('[name="skillname"]').val();
          let testmodifier =   Number(html.find('[name="testmodifier"]').val());
          catmodifier = Number(html.find('[name="catmodifier"]').val());
          skillvalue =   Number(html.find('[name="skillvalue"]').val());
          damagebonus =  html.find('[name="damagebonus"]').val();
          const target = (skillvalue+catmodifier+modifier+testmodifier);
          this.missileattackRoll(attack,target,damagebonus);
        }
      };
      renderTemplate(dialogOptions.template, dialogOptions.data).then(dlg =>
        {
          new Dialog(
          {
            title: dialogOptions.title,
            content: dlg,
            buttons:
            {
              rollButton:
              {
                label: game.i18n.localize("Roll"),
                callback: html => dialogOptions.callback(html)
              }
            },
            default: "rollButton"
          }).render(true);
        });
    });
    html.find('.experiencecheck').mousedown(event => {
      event.preventDefault();
      const data = this.getData();
      if(event.button == 0) {}
      else {return;}
      const skillrow = event.target.parentElement;
      const skillid = skillrow.dataset["itemId"];
      const skillname = skillrow.dataset["skillname"];
      console.log(this.object.getOwnedItem(skillid));
      const skill = this.object.getOwnedItem(skillid);
      console.log(skill);
      if(skill.data.data.experience){
        skill.data.data.experience = false;
      }
      else {
        skill.data.data.experience = true;
      }
    });
    html.find('.summary-skill-roll').mousedown(event => this._onSkillRoll(event));
    html.find('.summary-characteristic-roll').click(event => this._onCharacteristicRoll(event));       
  }
  /* -------------------------------------------- */

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    console.log(itemData);
    return this.actor.createOwnedItem(itemData);
  }

  _onCharacteristicRoll(event) {
    event.preventDefault();
    const characid = event.currentTarget.closest(".characteristic").dataset.characteristicId;
    const data = this.getData();
    if(event.button == 0) {}
    else {return;}
    const row= event.target.parentElement.parentElement;
    let charname = game.i18n.localize(data.data.characteristics[characid].label);
    let charvalue= data.data.characteristics[characid].value;
    let difficultymultiplier = 5;
    let dialogOptions = {
      title: "Characteristic Roll",
      template : "/systems/runequest/templates/chat/char-dialog.html",
      // Prefilled dialog data

      data : {
        "charname": charname,
        "charvalue": charvalue,
        "difficultymultiplier": difficultymultiplier
      },
      callback : (html) => {
        // When dialog confirmed, fill testData dialog information
        // Note that this does not execute until DiceWFRP.prepareTest() has finished and the user confirms the dialog
        charname =    html.find('[name="charname"]').val();
        let testmodifier =   Number(html.find('[name="testmodifier"]').val());
        difficultymultiplier = Number(html.find('[name="difficultymultiplier"]').val());
        charvalue =   Number(html.find('[name="charvalue"]').val());
        const target = (charvalue*difficultymultiplier+testmodifier);
        this.basicRoll(charname,target);              
      }
    };
    renderTemplate(dialogOptions.template, dialogOptions.data).then(dlg =>
      {
        new Dialog(
        {
          title: dialogOptions.title,
          content: dlg,
          buttons:
          {
            rollButton:
            {
              label: game.i18n.localize("Roll"),
              callback: html => dialogOptions.callback(html)
            }
          },
          default: "rollButton"
        }).render(true);
      });

    //return item.roll();    
  }
  _onSkillRoll(event) {
    event.preventDefault();
    const data = this.getData();
    console.log(event);
    if(event.button == 0) {}
    else if(event.button == 2) {
      if(event.altKey == true){
        this.actor.deleteOwnedItem(event.currentTarget.dataset.itemid);
        return;
      }
      const item = this.actor.getOwnedItem(event.currentTarget.dataset.itemid);
      item.sheet.render(true);
      return;
    }
    else {return;}
    //const catrow = event.target.parentElement.parentElement.parentElement;
    console.log(event.currentTarget.dataset);
    const skillid = event.currentTarget.dataset.itemid;
    let skillname = event.currentTarget.dataset.skillname;
    const categoryid= event.currentTarget.dataset.skillcategory;
    console.log(data.actor.skills[categoryid]);
    const skill = data.actor.skills[categoryid].find(function(element) {
      return element._id==skillid;
    });
    let catmodifier = data.data.skillcategory[categoryid].modifier;
    let skillvalue = skill.data.total;
    /*
    const dialogoptions = {
      "skillname": skillname,
      "skillvalue": skillvalue,
      "catmodifier": catmodifier
    }
    */
    let dialogOptions = {
      title: "Skill Roll",
      template : "/systems/runequest/templates/chat/skill-dialog.html",
      // Prefilled dialog data

      data : {
        "skillname": skillname,
        "skillvalue": skillvalue,
        "catmodifier": catmodifier
      },
      callback : (html) => {
        // When dialog confirmed, fill testData dialog information
        // Note that this does not execute until DiceWFRP.prepareTest() has finished and the user confirms the dialog
        skillname =    html.find('[name="skillname"]').val();
        let testmodifier =   Number(html.find('[name="testmodifier"]').val());
        catmodifier = Number(html.find('[name="catmodifier"]').val());
        skillvalue =   Number(html.find('[name="skillvalue"]').val());
        const target = (skillvalue+catmodifier+testmodifier);
        this.basicRoll(skillname,target);              
      }
    };
    renderTemplate(dialogOptions.template, dialogOptions.data).then(dlg =>
      {
        new Dialog(
        {
          title: dialogOptions.title,
          content: dlg,
          buttons:
          {
            rollButton:
            {
              label: game.i18n.localize("Roll"),
              callback: html => dialogOptions.callback(html)
            }
          },
          default: "rollButton"
        }).render(true);
      });
  }
  async basicRoll(charname, target) {
    const critical = Math.max(Math.round(target/20),1);
    const special = Math.round(target/5);
    const fumblerange= Math.round((100-target)/20);
    const fumble = 100-Math.max(fumblerange,0);
    let roll;
    roll = new Roll("1d100").roll();
    let result;

    if((roll.total < 96 && roll.total <= target) || roll.total <= 5) { //This is a success we check type of success
      if(roll.total <= critical) {
        result = "critical";
      }
      else {
        if(roll.total <= special) {
          result= "special";
        }
        else {
          result = "success"
        }
      }
    }
    else {
      if(roll.total >= fumble) {
        result = "fumble"; 
      }
      else {
        result = "failure";
      }
    }
    
    console.log(this.object.data);


    const templateData = {
      actor: this.actor,
      item: this.object.data,
      charname: charname,
      target: target,
      roll: roll,
      result: result
    };
    // Render the chat card template
    
    const template = `systems/runequest/templates/chat/skill-card.html`;
    const html = await renderTemplate(template, templateData);
    
    // Basic chat message data

    const chatData = {
      user: game.user._id,
      content: html,
      speaker: {
        actor: this.actor._id,
        token: this.actor.token,
        alias: this.actor.name
      }
    };


    // Toggle default roll mode
    let rollMode = game.settings.get("core", "rollMode");
    if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    if ( rollMode === "blindroll" ) chatData["blind"] = true;

    // Create the chat message

    ChatMessage.create(chatData);
    return result;
  }

    /**
   * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
   * @private
   */
  _onItemRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.getOwnedItem(itemId);
    return item.roll();
  }

  
  attackRoll(attack, target,damagebonus) {
    const critical = Math.max(Math.round(target/20),1);
    const special = Math.round(target/5);
    const fumblerange= Math.round((100-target)/20);
    const fumble = 100-Math.max(fumblerange,0);
    let roll;
    roll = new Roll("1d100").roll();
    let result;
    console.log(attack);

    if((roll.total < 96 && roll.total <= target) || roll.total <= 5) { //This is a success we check type of success
      if(roll.total <= critical) {
        result = "critical";
      }
      else {
        if(roll.total <= special) {
          result= "special";
        }
        else {
          result = "success"
        }
      }
    }
    else {
      if(roll.total >= fumble) {
        result = "fumble"; 
      }
      else {
        result = "failure";
      }
    }
    this.htmldamageroll(roll,target,result,attack,damagebonus);
  }
  damageroll(roll,target,result,attack,damagebonus) {
    let content;
    console.log(attack);
    let damageroll = new Roll(attack.data.damage);
    let damagebonusroll = new Roll(damagebonus);

    if(result=="fumble" || result == "failure") {
      content = `rolling ${attack.name}: ${roll.toMessage()} vs ${target} - ${result}`;
    }
    else if( result== "success") {
      damageroll.roll();
      damagebonusroll.roll();
      content= `rolling - ${attack.name}: ${roll.toMessage()} vs ${target} - ${result} - Damage: ${damageroll.total+damagebonusroll.total} (${damageroll.result}+${damagebonusroll.result})`
    }
    else {
      let totaldamage;
      switch (attack.data.specialtype) {
        case "I":
        case "S":
          damageroll.alter(0,2);
          damageroll.roll();
          damagebonusroll.roll();
          console.log(damageroll);
          console.log(damagebonusroll);
          if(result=="special") {
            totaldamage=damageroll.total+damagebonusroll.total;
            content= `rolling - ${attack.name}: ${roll.toMessage()} vs ${target} - ${result} - Damage: ${totaldamage} (${damageroll.result}+${damagebonusroll.result})`;
          }
          else {
            totaldamage = Roll.maximize(damageroll.formula).total+damagebonusroll.total;
            content= `rolling - ${attack.name}: ${roll.toMessage()} vs ${target} - ${result} - Damage: ${totaldamage} (${Roll.maximize(damageroll.formula).result}+${damagebonusroll.result})`;
          }
          break;
        case "C":
        default:
          damageroll.roll();
          damagebonusroll.roll();
          if(result=="special") {
            totaldamage=damageroll.total+damagebonusroll.total+Roll.maximize(damagebonusroll.formula).total;
            content= `rolling - ${attack.name}: ${roll.toMessage()} vs ${target} - ${result} - Damage: ${totaldamage} (${damageroll.result}+${damagebonusroll.result}+${Roll.maximize(damagebonusroll.formula).result})`;
          }
          else {
            totaldamage = Roll.maximize(damageroll.formula).total+damagebonusroll.total+Roll.maximize(damagebonusroll.formula).total;
            content= `rolling - ${attack.name}: ${roll.toMessage()} vs ${target} - ${result} - Damage: ${totaldamage} (${Roll.maximize(damageroll.formula).result}+${damagebonusroll.result})+${Roll.maximize(damagebonusroll.formula).result})`;
          }
          break;
      }
    }
    ChatMessage.create({
      user: game.user._id,
      speaker: this.getData(),
      content: content
    });
    let hitlocationtable = RollTables.instance.getName("Hit Location - Humanoid");
    console.log(hitlocationtable);
    let hitlocation = hitlocationtable.roll();
    console.log(hitlocation);
    hitlocationtable.draw(hitlocation,true);
    //hitlocationtable.toMessage(hitlocation.results);
  }  
  missileattackRoll(attack, target,damagebonus) {
    const critical = Math.max(Math.round(target/20),1);
    const special = Math.round(target/5);
    const fumblerange= Math.round((100-target)/20);
    const fumble = 100-Math.max(fumblerange,0);
    let roll;
    roll = new Roll("1d100").roll();
    let result;
    console.log(attack);

    if((roll.total < 96 && roll.total <= target) || roll.total <= 5) { //This is a success we check type of success
      if(roll.total <= critical) {
        result = "critical";
      }
      else {
        if(roll.total <= special) {
          result= "special";
        }
        else {
          result = "success"
        }
      }
    }
    else {
      if(roll.total >= fumble) {
        result = "fumble"; 
      }
      else {
        result = "failure";
      }
    }
    this.missiledamageroll(roll,target,result,attack,damagebonus);
  }
  missiledamageroll(roll,target,result,attack,damagebonus) {
    let content;
    console.log(attack);
    let damageroll = new Roll(attack.data.damage);
    let damagebonusroll;
    if(attack.data.db) {
      damagebonusroll = new Roll(damagebonus);
    }
    else {
      damagebonusroll = new Roll("0");
    }
    console.log(damagebonusroll);
    if(result=="fumble" || result == "failure") {
      content = `rolling ${attack.name}: ${roll.total} vs ${target} - ${result}`;
    }
    else if( result== "success") {
      damageroll.roll();
      damagebonusroll.roll();
      content= `rolling - ${attack.name}: ${roll.total} vs ${target} - ${result} - Damage: ${damageroll.total+Math.ceil(damagebonusroll.total/2)}`
    }
    else {
      let totaldamage;
      switch (attack.data.specialtype) {
        case "I":
        case "S":
          damageroll.alter(0,2);
          damageroll.roll();
          damagebonusroll.roll();
          if(result=="special") {
            totaldamage=damageroll.total+Math.ceil(damagebonusroll.total/2);
            content= `rolling - ${attack.name}: ${roll.total} vs ${target} - ${result} - Damage: ${totaldamage}`;
          }
          else {
            totaldamage = Roll.maximize(damageroll.formula).total+Math.ceil(damagebonusroll.total/2);
            content= `rolling - ${attack.name}: ${roll.total} vs ${target} - ${result} - Damage: ${totaldamage}`;
          }
          break;
        case "C":
        default:
          damageroll.roll();
          damagebonusroll.roll();
          if(result=="special") {
            totaldamage=damageroll.total+Math.ceil(damagebonusroll.total/2)+Math.ceil(Roll.maximize(damagebonusroll.formula).total/2);
            content= `rolling - ${attack.name}: ${roll.total} vs ${target} - ${result} - Damage: ${totaldamage}`;
          }
          else {
            totaldamage = Roll.maximize(damageroll.formula).total+Math.ceil(damagebonusroll.total/2)+Math.ceil(Roll.maximize(damagebonusroll.formula).total/2);
            content= `rolling - ${attack.name}: ${roll.total} vs ${target} - ${result} - Damage: ${totaldamage}`;
          }
          break;
      }
    }
    ChatMessage.create({
      user: game.user._id,
      speaker: this.getData(),
      content: content
    });
    let hitlocationtable = RollTables.instance.getName("Hit Location - Humanoid");
    console.log(hitlocationtable);
    let hitlocation = hitlocationtable.roll();
    console.log(hitlocation);
    hitlocationtable.toMessage(hitlocation.results);
  }
  _findrune(data,runename) {
    if(typeof data.data.elementalrunes[runename] != 'undefined') {
      return data.data.elementalrunes[runename];
    }
    else {
      for (let rp in data.data.powerrunes) {
        if(typeof data.data.powerrunes[rp][runename] != 'undefined') {
          return data.data.powerrunes[rp][runename];
        }        
      }
      console.log("Rune not found - default to air");
      return data.data.elementalrunes.air;  
    }
  }  
  async betterdamageroll(roll,target,result,attack,damagebonus) {
    //const itemData = this.data.data;
    const actorData = this.actor.data.data;
    const flags = this.actor.data.flags || {};
    //console.log(itemData);
    console.log(attack);
    console.log(flags);
    let attackcontent;
    let damagecontent;
    let damageData = this.getdamagedata(attack,damagebonus);
    let totaldamage=0;
    let dmgcontent;
    let dmgbonuscontent;
    let damagechatData = {speaker: ChatMessage.getSpeaker({actor: this.actor}),flavor: "Weapon Damage",rollMode: game.settings.get("core", "rollMode")};
    let damagebonuschatData = {speaker: ChatMessage.getSpeaker({actor: this.actor}),flavor: "Damage Bonus",rollMode: game.settings.get("core", "rollMode")};

    let rollMode = game.settings.get("core", "rollMode");
    if( result== "success") {
      damageData.damage.roll();
      damageData.damagebonus.roll();
      totaldamage = damageData.damage.total+ damageData.damagebonus.total;
      dmgcontent= await damageData.damage.toMessage(damagechatData,rollMode,false);
      dmgbonuscontent= await damageData.damagebonus.toMessage(damagebonuschatData,rollMode,false);
    }
    else if(result=="special") {  
      damageData.specialdamage.roll();
      damageData.damagebonus.roll();
      totaldamage = damageData.specialdamage.total + damageData.damagebonus.total;
      dmgcontent= await damageData.specialdamage.toMessage(damagechatData,rollMode,false);
      dmgbonuscontent= await damageData.damagebonus.toMessage(damagebonuschatData,rollMode,false);
    }
    else if(result=="critical") {
      damageData.damagebonus.roll();
      totaldamage = damageData.criticaldamage.total + damageData.damagebonus.total;
      dmgcontent= await damageData.criticaldamage.toMessage(damagechatData,rollMode,false);
      dmgbonuscontent= await damageData.damagebonus.toMessage(damagebonuschatData,rollMode,false);
    }
    attackcontent = `${attack.name} - skill: ${attack.data.skillused} - ${target}%`;
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: attackcontent,
      rollMode: game.settings.get("core", "rollMode")
    });
    console.log(dmgcontent);
    console.log(dmgbonuscontent);
    if (result != "failure" && result != "fumble") {
      damagecontent = `${attack.name} - ${result}`;
      damagecontent = damagecontent + ` - damage: ${dmgcontent.data.content} + ${dmgbonuscontent.data.content} - total: ${totaldamage}`;
      ChatMessage.create({
        user: game.user._id,
        speaker: this.getData(),
        content: damagecontent
      });  
    }
    let hitlocationtable = RollTables.instance.getName("Hit Location - Humanoid");
    console.log(hitlocationtable);
    let hitlocation = hitlocationtable.roll();
    console.log(hitlocation);
    hitlocationtable.draw(hitlocation,true);
    //hitlocationtable.toMessage(hitlocation.results);
  }  
  getdamagedata(attack,damagebonus) {
    let damageData={
      damagebonus: new Roll(damagebonus),
      damage: new Roll(attack.data.damage)
    }
    switch (attack.data.specialtype) {
      case "I":
      case "S":
        let specialroll= new Roll(damageData.damage.formula);
        specialroll=specialroll.alter(2,0);
        damageData.specialdamage= new Roll(specialroll.formula);
        damageData.criticaldamage = Roll.maximize(damageData.specialdamage.formula);
        break;
      case "C":
      default:
        damageData.specialdamage= new Roll(attack.data.damage+"+"+Roll.maximize(damageData.damagebonus.formula).total);
        damageData.criticaldamage = Roll.maximize(damageData.specialdamage.formula);
        break;
    }
    console.log(damageData);
    return damageData;
  }
  async htmldamageroll(roll,target,result,attack,damagebonus) {
    //const itemData = this.data.data;
    const actorData = this.actor.data.data;
    const flags = this.actor.data.flags || {};
    //console.log(itemData);
    console.log(attack);
    console.log(flags);
    let attackcontent;
    let damagecontent;
    let damageData = this.getdamagedata(attack,damagebonus);

    let rollMode = game.settings.get("core", "rollMode");
    if( result== "success") {
      damageData.damage.roll();
      damageData.damagebonus.roll();
      damageData.totaldamage = damageData.damage.total+ damageData.damagebonus.total;
    }
    else if(result=="special") {  
      damageData.specialdamage.roll();
      damageData.damagebonus.roll();
      damageData.totaldamage = damageData.specialdamage.total + damageData.damagebonus.total;
    }
    else if(result=="critical") {
      damageData.damagebonus.roll();
      damageData.totaldamage = damageData.criticaldamage.total + damageData.damagebonus.total;
    }
    let hitlocationtable = RollTables.instance.getName("Hit Location - Humanoid");
    console.log(hitlocationtable);
    let hitlocation = hitlocationtable.roll();
    console.log(hitlocation);

    const templateData = {
      actor: this.actor,
      item: this.object.data,
      attack: attack,
      target: target,
      roll: roll,
      result: result,
      damageData: damageData,
      hitlocation: hitlocation.results[0].text
    };

    // Render the chat card template
    
    const template = `systems/runequest/templates/chat/attack-card.html`;
    const html = await renderTemplate(template, templateData);
    
    // Basic chat message data

    const chatData = {
      user: game.user._id,
      content: html,
      speaker: {
        actor: this.actor._id,
        token: this.actor.token,
        alias: this.actor.name
      }
    };
    console.log(game.settings);
    // Toggle default roll mode
    //let rollMode = game.settings.get("core", "rollMode");
    //if ( ["gmroll", "blindroll"].includes(rollMode) ) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
    //if ( rollMode === "blindroll" ) chatData["blind"] = true;

    // Create the chat message

    ChatMessage.create(chatData);
  }  

  
  _updateObject(event, formData) {
    const actor = this.getData().actor
    const skills = actor.skillsAndPassions
    const hitLocations = actor.hitLocations
    if (event.target != null) {
      if (event.target.id.includes("_hitloc")) {
        let fieldInfo = event.target.id.split('_')
        let hitLocIndex = fieldInfo[0]
        let hitLoc = this.actor.getOwnedItem(fieldInfo[1])
        let hitLocField = fieldInfo[2]
        let updateField = ''
        let newFieldValue = ''
        if (hitLocField === 'name') {
          updateField = 'name'
          newFieldValue = formData['hl.name'][Number(hitLocIndex)]
        } else {
          updateField = 'data.' + hitLocField
          newFieldValue =
            formData['hl.data.' + hitLocField][Number(hitLocIndex)]
        }
        this.actor.updateEmbeddedEntity('OwnedItem', {
          _id: hitLoc._id,
          [updateField]: newFieldValue
        })
      }
      else if (event.target.id.includes("_skill")) {
        let fieldInfo = event.target.id.split('_')
        console.log(fieldInfo);
        let skillindex = fieldInfo[0]
        let skill = this.actor.getOwnedItem(fieldInfo[1])
        let skillField = fieldInfo[2]
        let updateField = ''
        let newFieldValue = ''
        if (skillField === 'name') {
          updateField = 'name'
          newFieldValue = formData['item.name'][Number(skillIndex)]
        } else {
          updateField = 'data.' + skillField
          console.log("skillField:"+skillField);
          newFieldValue = formData['item.data.' + skillField][Number(skillindex)];
        }
        this.actor.updateEmbeddedEntity('OwnedItem', {
          _id: skill._id,
          [updateField]: newFieldValue
        })
      }

      else {
        super._updateObject(event, formData);
      }
    }  
    return this.actor.update(formData)
  }
  _prepareSkill(skill) {
    skill.data.total=skill.data.base+skill.data.increase;
  }
  _preparePassion(passion) {
    passion.data.total=passion.data.base+passion.data.increase+passion.data.modifier;
  }
  _preparehitlocation(hitlocation, actorData) {
    // Prepare the HitLocations by calculating the Max HP of the location and the remaining HP based on wounds
    console.log("prepare hit locations");
    console.log(actorData);
    let humanoidlocations={
      "RQG.HEAD": 5,
      "RQG.LARM": 4,
      "RQG.RARM": 4,
      "RQG.CHEST": 6,
      "RQG.ABDOMEN": 5,
      "RQG.LLEG": 5,
      "RQG.RLEG": 5
    };
    console.log("Modifier:"+actorData.data.attributes.hpmodifier);
    hitlocation.data.maxhp = humanoidlocations[hitlocation.name] + actorData.data.attributes.hpmodifier;
    hitlocation.data.currenthp = hitlocation.data.maxhp - hitlocation.data.wounds;
    console.log(hitlocation);
  }  
}
