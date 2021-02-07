/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class RunequestActor extends Actor {

  /** @override */


  static async create(data, options) {
    console.log("Create Actor");
    // If the created actor has items (only applicable to duplicated actors) bypass the new actor creation logic
    if (data.items)
    {
      return super.create(data, options);
    }

    // Initialize empty items
    data.items = [];

    // Iterate through items, allocating to containers
    // let totalWeight = 0;
    const pack = game.packs.find(p => p.collection == "runequest.skills")
    var myskills;
    await pack.getIndex().then(index => myskills = index);
    for (let sk of myskills)
    {
      let skillItem = undefined;
      await pack.getEntity(sk._id).then(skill => skillItem = skill);
      let skilldata = {"name":skillItem.data.name,"type":skillItem.data.type,"data":skillItem.data.data};
      let skill = new Item(skilldata);
      data.items.push(skill);
    }
    return super.create(data, options);
  }

  getRollData() {
    console.log("getRollData");
    const data = super.getRollData();
    const shorthand = game.settings.get("Runequest", "macroShorthand");

    // Re-map all attributes onto the base roll data
    if ( !!shorthand ) {
      for ( let [k, v] of Object.entries(data.attributes) ) {
        if ( !(k in data) ) data[k] = v.value;
      }
      delete data.attributes;
    }
    // Map all items data using their slugified names
    data.items = this.data.items.reduce((obj, i) => {
      let key = i.name.slugify({strict: true});
      let itemData = duplicate(i.data);
      /*
      if ( !!shorthand ) {
        for ( let [k, v] of Object.entries(itemData.attributes) ) {
          if ( !(k in itemData) ) itemData[k] = v.value;
        }
        delete itemData["attributes"];
      }*/
      obj[key] = itemData;
      return obj;
    }, {});
    return data;
  }

  prepareData() {
    super.prepareData();
    console.log("prepareData for: "+this.data.name);
    const  actorData = this.data;
    const  data = actorData.data;
    this._prepareCharacterFlags(actorData);
    for (const [index, charac] of Object.entries(data.characteristics)) {
      const characid=charac.label;
      let modifier= Number(charac.modifier);
      const characvalue=Number(charac.base)+modifier;
      data.characteristics[index].value=characvalue;
      //data.defense.value = Number(attr.agility.value)+Number(attr.dodge.value);    
    }
    this._prepareattributes(data);
    this._prepareskillcategoriesmodifier(data);
  }
/*
  _prepareDerivedData(){
    console.log("prepareDerivedData");
    this._preparehitlocations(data);
  }
*/
  _prepareCharacterFlags(sheetData) {
    sheetData.flags.runequestspell= {
      "bladesharp": 0,
      "trueweapon": false,
      "strength": 0
    };
  }
  prepareItems(){
    console.log("start prepareItems");
    let actorData = duplicate(this.data)
    // These containers are for the various type of items
    const skills = [];
    const passions= [];
    for (let i of actorData.items) 
    {
      try 
      {
        i.img = i.img || DEFAULT_TOKEN;
        // *********** Skills ***********
        if (i.type === "skill") 
        {
          this.prepareSkill(i);
          skills.push(i);
        }
        if (i.type === "passion") 
        {
          this.preparePassion(i);
          passions.push(i);
        }        
      }
      catch (error) 
      {
        console.error("Something went wrong with preparing item " + i.name + ": " + error)
        ui.notifications.error("Something went wrong with preparing item " + i.name + ": " + error)
        ui.notifications.error("Deleting " + i.name);
        this.deleteEmbeddedEntity("OwnedItem", i._id);
      }
    }
    //End of items sorting
    console.log("PrepareItems - logging skills array");
    console.log(skills);
    let preparedData = {
      skills: skills,
      passions: passions
    }
    return preparedData    
  }

  /**
   * Prepares a skill Item.
   * 
   * Preparation of a skill is simply determining the `total` value, base + increases + modifier+ skillcategory mod.
   * 
   * @param   {Object} skill    'skill' type Item 
   * @return  {Object} skill    Processed skill, with total value calculated
   */
  prepareSkill(skill) 
  {
    console.log("PrepareSkill"+skill.name);
    let actorData = this.data
    let catmodifier = actorData.data.skillcategory[skill.data.skillcategory].modifier;
    skill.data.total=skill.data.base+skill.data.increase+skill.data.modifier+catmodifier;
    console.log(skill.data.total);
    return skill;
  }
  preparePassion(passion) 
  {
    console.log("PreparePassion"+passion.name);
    let actorData = this.data
    passion.data.total=passion.data.base+passion.data.increase+passion.data.modifier;
    console.log(passion.data.total);
    return passion;
  }  
  _prepareattributes(data) {
    console.log("prepare attributes in Actor");
    console.log(data);
    //Magic Points
    data.attributes.magicpoints.max = data.characteristics.power.value;
    // Total HP
    data.attributes.hitpoints.max = this._preparehitpointstotal(data);
    //Damage Bonus
    data.attributes.damagebonus= this._preparedamagebonus(data);
    // HP Modifier
    data.attributes.hpmodifier = this._preparehpmodifier(data.attributes.hitpoints.max);
  }
  _preparehitpointstotal(data) {
    let hptotal=data.characteristics.constitution.value;
    if(data.characteristics.size.value < 5) {
      hptotal += -2;
    }
    else if(data.characteristics.size.value < 9) {
      hptotal += -1;
    }
    else if(data.characteristics.size.value >= 13){
      hptotal += 1+Math.ceil((data.characteristics.size.value-13)/4);
    }
    if(data.characteristics.power.value < 5) {
      hptotal += -1;
    }
    else if(data.characteristics.power.value >= 17){
      hptotal += 1+Math.ceil((data.characteristics.power.value-17)/4);
    }
    return hptotal;
  }

  _preparedamagebonus(data) {
    var statvalue=data.characteristics.strength.value+data.characteristics.size.value;
    if(statvalue < 13) {
      return "-1D4";
    }
    else if(statvalue < 25) {
      return "0";
    }
    else if(statvalue < 33) {
      return "1D4";
    }
    else if(statvalue < 41) {
      return "1D6";
    }
    else {
      let damagebonusdice = 1+Math.ceil((statvalue-40)/16);
      return damagebonusdice+"D6";
    }
  }
  _prepareskillcategoriesmodifier(data) {
    console.log("prepareskillcategoriesmodifier");
    for (const [index, category] of Object.entries(data.skillcategory)) {
      let categoryid=index;
      let modifiervalue=0;
      switch (categoryid) {
        case "agility":
          modifiervalue=this._categoryminorpositive(data.characteristics.strength.value)+this._categoryminornegative(data.characteristics.size.value)+this._categorymajorpositive(data.characteristics.dexterity.value)+this._categoryminorpositive(data.characteristics.power.value);
          break;
        case "communication":
          modifiervalue=this._categoryminorpositive(data.characteristics.intelligence.value)+this._categorymajorpositive(data.characteristics.charisma.value)+this._categoryminorpositive(data.characteristics.power.value);
          break;
        case "knowledge":
          modifiervalue=this._categoryminorpositive(data.characteristics.power.value)+this._categorymajorpositive(data.characteristics.intelligence.value);
          break;
        case "magic":
          modifiervalue=this._categoryminorpositive(data.characteristics.charisma.value)+this._categorymajorpositive(data.characteristics.power.value);
          break;
        case "manipulation":
        case "meleeweapons":
        case "missileweapons":
        case "shields":
        case "naturalweapons":
          modifiervalue=this._categoryminorpositive(data.characteristics.strength.value)+this._categoryminorpositive(data.characteristics.power.value)+this._categorymajorpositive(data.characteristics.dexterity.value)+this._categorymajorpositive(data.characteristics.intelligence.value);
          break;
        case "perception":
          modifiervalue=this._categoryminorpositive(data.characteristics.power.value)+this._categorymajorpositive(data.characteristics.intelligence.value);
          break;
        case "stealth":
          modifiervalue=this._categorymajorpositive(data.characteristics.intelligence.value)+this._categorymajornegative(data.characteristics.size.value)+this._categorymajorpositive(data.characteristics.dexterity.value)+this._categoryminornegative(data.characteristics.power.value);
          break;           
        default:
          categoryid="others";
          modifiervalue=0;
          break;
      }
      data.skillcategory[index].modifier=modifiervalue;
    }
  }
  _categoryminorpositive(statvalue){
    var bonus = 0;
    if (statvalue < 5) {
      bonus = -5;
    }else if (statvalue >16 && statvalue < 21){
      bonus = 5;
    }else if (statvalue >20){
      bonus = 5+(Math.ceil((statvalue-20)/4)*5);
    }
    return bonus;
  }
  _categorymajorpositive(statvalue){
    var bonus = 0;
    if (statvalue < 5) {
      bonus = -10;
    }else if(statvalue >= 5 && statvalue <= 8){
      bonus = -5;
    }else if(statvalue >= 13 && statvalue <= 16){
      bonus = 5;
    }else if(statvalue >= 17 && statvalue <= 20){
      bonus = 10;
    }else if (statvalue >20){
      bonus = (10+(Math.ceil((statvalue-20)/4)*5));
    }    
    return bonus;
  }
  _categoryminornegative(statvalue){
    var bonus = 0;
    if (statvalue < 5) {
      bonus = 5;
    } else if(statvalue >16 && statvalue < 21){
      bonus = -5;
    }else if (statvalue >20){
      bonus = -5 - (Math.ceil((statvalue-20)/4)*5);
    }
    return bonus;
  }
  _categorymajornegative(statvalue){
    var bonus= 0;
    if (statvalue < 5) {
      bonus = 10;
    }else if(statvalue >= 5 && statvalue <= 8){
      bonus = 5;
    }else if(statvalue >= 13 && statvalue <= 16){
      bonus = -5;
    }else if(statvalue >= 17 && statvalue <= 20){
      bonus = -10;
    }else if (statvalue >20){
      bonus = bonus - (10+(Math.ceil((statvalue-20)/4)*5));
    }
    return bonus;    
  }
  _preparehpmodifier(hp) {
    //compute Max HP modifier
    let modifier=0;
    if(hp < 13) {
      modifier=Math.ceil((hp-13)/3);
    }
    else if(hp > 15) {
      modifier=Math.ceil((hp-15)/3);
    }
    return modifier;    
  }
}
