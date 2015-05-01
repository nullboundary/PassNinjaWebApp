(function(app, tk, pb, $, undefined) {

  'use strict';


  var editGroup = {
    'svgId': '', //svg id of group
    'svgType': '', //svg group type: second
    'svgNum': '', //svg group num: 1
    'dataType': '', //keydoc field type: secondaryField
    'dataIndex': '' //keydoc array index value
  };

  /***********************************************************

		setup all event handlers for text settings

 	***********************************************************/
  function init() {

    //set the input box handler for the label
    d3.select('#popLabel')
      .on('input', onTextSubmit);

    //set the input box handler for the value
    d3.select('#popValue')
      .on('input', onTextSubmit);

    //add events for selecting value format selector options
    d3.select('select#value-format')
      .on('input', onValueFormat);

    //add handler for delete field button
    d3.select('button#btn-del-field')
      .on('click', onDelField);

    //add handler for add field button
    d3.select('button#btn-add-field')
      .on('click', onAddField);

    //add handler for number format selector
    d3.select('#number-format')
      .on('input', function() {
        onNumberStyle(this.value);
      });

    d3.select('#align-format')
      .on('input', function() {
        onAlignStyle(this.value);
      });

    //add handler for date-time selector
    d3.select('#timeDate-format')
      .on('input', function() {
        onDateTimeStyle(this.value);
      });

    //add handler for checking the api variable field box
    d3.select('#var-field')
      .on('change', onVarSelect);

    pb.svg().selectAll('rect.text-btn-rect')
      .on('click', onTextRectClick); //add event to new rect

    pb.svg().select('g.logo rect')
      .on('click', onLogoRectClick);

  }

  /***********************************************************


  ***********************************************************/
  function setHighLight(selectID) {
    //set and clear select highlight style with 'select class'
    var pass = pb.svg();
    pass.select('rect.select')
      .attr('class', 'text-btn-rect'); //clear all

    pass.select('g#' + selectID + ' rect')
      .attr('class', 'text-btn-rect select'); //highlight
  }

  /***********************************************************


	***********************************************************/
  function configTextInputs() {

    var groupType = pb.template().keyDoc[pb.passType()][editGroup.dataType]; //example: aux

    console.log(editGroup);
    console.log(groupType);

    //set to '' if label/value is undefined
    var targetLabel = tk.valueOrDefault(groupType[editGroup.dataIndex].label);
    var targetValue = tk.valueOrDefault(groupType[editGroup.dataIndex].value);

    //update the legend in settings form to display the id of the field
    var type = editGroup.dataType.slice(0, -6);
    var legend = type + " field " + editGroup.svgNum;
    d3.select('div#legend-header')
      .text(legend);

    //set the input box attributes for the label
    var inputLabel = d3.select('#popLabel')
      .property('value', targetLabel)
      .on('input', onTextSubmit) //could be removed by logo. add again
      .call(tk.enable);

    //set the input box attributes for the value
    var inputValue = d3.select('#popValue')
      .property('value', targetValue)
      .call(tk.enable);

    //set the check box based on if the item is already in the list or not
    if (pb.template().mutatelist) {
      var keyValue = editGroup.data.key; //editGroup.svgId; //editGroup.svgType + (editGroup.dataIndex + 1); //example: aux4
      var index = pb.template().mutatelist.indexOf(keyValue); //find the value in the list
      console.log(index + " " + keyValue);
      if (index > -1) { //found
        d3.select('#var-field').property('checked', true);
        tk.disable('#popValue');
      } else { //not found
        d3.select('#var-field').property('checked', false);
        tk.enable('#popValue');
      }
    }


  }

  /***********************************************************
  setEditGroup essentially moves the "cursor" or updates the editGroup
  object with the values of the current selected group.

 	***********************************************************/
  function setEditGroup(selection) {

    console.log(selection);

    //get the svg id and type of the text under the button
    var svgGroupId = d3.select(selection.parentNode).attr('id');
    var svgGroupType = svgGroupId.slice(0, -1); //get the group type: aux
    var svgGroupNum = parseInt(svgGroupId.slice(-1));

    //get the field type and index for the keydoc
    var datafieldType = d3.select(selection).attr('data-target');
    var dataGroupIndex = parseInt(svgGroupId.slice(-1)) - 1; //get the group index value, & subtract 1

    var fieldData = {};
    d3.select(selection).each(function(d) {
      fieldData = d;
    });

    editGroup = {
      'svgId': svgGroupId, //svg id of group
      'svgType': svgGroupType, //svg group type: second
      'svgNum': svgGroupNum, //svg group num: 1
      'dataType': datafieldType, //field type: secondaryField
      'dataIndex': dataGroupIndex, //keydoc array index value
      'data': fieldData
    };


  }

  /***********************************************************
  updateFieldControls updates svg text fields and input fields
  during add or del of fields.

  ***********************************************************/
  function updateFieldControls(groupID) {

      var fieldData = pb.template().keyDoc[pb.passType()];
      var pass = pb.svg();
      ////rebuilds all the text field rects of svgType
      app.passBuilder.fields.set(fieldData[editGroup.dataType], editGroup.svgType);

      //Add the event back.
      pass.selectAll('rect.text-btn-rect')
        .on('click', onTextRectClick); //add event to new rect

      //set select group to the next or previous rectangle
      setEditGroup(pass.select('g#' + groupID + ' rect')[0][0]);

      configTextInputs();

      //highlight selected group
      setHighLight(editGroup.svgId);

      //enable all buttons
      tk.enable('button#btn-del-field', 'button#btn-add-field');


    }
    /***********************************************************


    ***********************************************************/
  function delMutateItem(keyValue, groupType, groupIndex) {

      if (pb.template().mutatelist == undefined) return; //no mutatelist items, don't bother

      var index = pb.template().mutatelist.indexOf(keyValue); //find the value in the list
      if (index > -1) { //found
        console.log('remove:' + keyValue);
        pb.template().mutatelist.splice(index, 1); //remove it from the list
      }

/*
      for (var i = groupIndex; i < 5; i++) { //loop all fields deleted and higher
        var groupID = groupType + i;
        var index = pb.template().mutatelist.indexOf(keyValue); //find the value in the list
        if (index > -1) { //found
          console.log('remove:' + groupID);
          pb.template().mutatelist.splice(index, 1); //remove it from the list
          if (i > groupIndex) { //items above deleted item
            pb.template().mutatelist.push(groupType + (i - 1)); //add it back with -1 index.
          }
        }
      }
*/

    }
    /***********************************************************
      deprecated

    ***********************************************************/
  function shiftMutateItem(keyValue, groupType, groupIndex) {

      if (pb.template().mutatelist == undefined) return; //no mutatelist items, don't bother

      var groupID = groupType + groupIndex;
      //editGroup.data.key
      var index = pb.template().mutatelist.indexOf(groupID); //find the value in the list
      if (index > -1) { //found
        pb.template().mutatelist.splice(index, 1); //remove old value
        pb.template().mutatelist.push(groupType + (groupIndex + 1)); //add it back with +1 index.
        console.log('replace:' + groupID + " with:" + (groupIndex + 1));

      }
    }
    /***********************************************************


    ***********************************************************/
  function loadCurrency() {

    if (d3.select('#currency').empty()) {

      var url = '/assets/data/currency.html';
      var uri = encodeURI(url);
      console.log(uri);

      //load svg xml + place into document
      d3.html(uri, function(html) {

        d3.select('div#sub-format-control').node().appendChild(html);
        //add handler for currency selector
        d3.select('#currency')
          .call(tk.hide)
          .on('input', function() {
            onCurrencyStyle(this.value);
          });

      });
    }

  }

  /***********************************************************

  Handler

  ***********************************************************/
  function onLogoRectClick() {

    var targetLabel = tk.valueOrDefault(pb.template().keyDoc.logoText);

    //diable select inputs and buttons
    tk.disable('#value-format', '#align-format', '#btn-del-field', '#btn-add-field', '#popValue');

    //hide them if their not already
    tk.hide('#currency', '#timeDate-format');
    tk.disable('#number-format');
    tk.show('#number-format');


    //update the legend in settings form to display the id of the field
    d3.select('div#legend-header')
      .text("Logo");

    //set the input box attributes for the label
    var inputLabel = d3.select('#popLabel')
      .property('value', targetLabel)
      .on('input', onLogoSubmit)
      .call(tk.enable);

    //set and clear select highlight style with 'select class'
    var pass = pb.svg();
    pass.select('rect.select').attr('class', 'text-btn-rect');
    pass.select('g.logo rect')
      .attr('class', 'text-btn-rect select')
      .on('click', onLogoRectClick);

  }


  /***********************************************************

 	Handler

 	***********************************************************/
  function onTextRectClick() {

    //set the group id of the text under the rectangle
    setEditGroup(this);
    var fieldGroup = pb.template().keyDoc[pb.passType()][editGroup.dataType];

    if (fieldGroup.length) {
      //setup text and attach handlers for text input controls
      configTextInputs();
    }
    //enable select inputs and buttons
    tk.enable('#value-format', '#align-format', '#btn-del-field', '#btn-add-field');

    //disable add or delete button
    if (editGroup.svgType == "header") { //disable the add button for header. (only 1 field allowed)
      d3.select('button#btn-add-field').call(tk.disable);
    } else if (editGroup.svgType == "primary" && fieldGroup.length >= 2) { //2 max for primary
      d3.select('button#btn-add-field').call(tk.disable);
    } else if (editGroup.svgType == "primary") { //primary has no alignment value
      d3.select('select#align-format').call(tk.disable);
    } else if (fieldGroup.length >= 4) { //disable the add button if there are 4 fields
      d3.select('button#btn-add-field').call(tk.disable);
    } else if (fieldGroup.length <= 0) { //disable the delete button if there are 0 fields
      d3.select('button#btn-del-field').call(tk.disable);
    }

    var valueSelect = d3.select('select#value-format');
    tk.hide('#currency', '#number-format', '#timeDate-format');

    var dataGroup = d3.select(this.parentNode);
    var dataSet = dataGroup.data()[0]; //get bound __data__ from DOM

    $('#popValue').datetimepicker('destroy');

    if (dataSet.dateStyle) {
      console.log(dataSet.dateStyle);
      valueSelect.node().value = 'Date';
      var timeDateSelect = d3.select('#timeDate-format');
      timeDateSelect.node().value = dataSet.dateStyle;

      //setup date picker
      $('#popValue').datetimepicker({
        timepicker: false,
        format: 'Y/m/d',
        onChangeDateTime: onDateSubmit,
      });

      tk.show(timeDateSelect);


    } else if (dataSet.timeStyle) {
      console.log(dataSet.timeStyle);

      valueSelect.node().value = 'Time';
      var timeDateSelect = d3.select('#timeDate-format');
      timeDateSelect.node().value = dataSet.timeStyle;

      //setup time picker
      $('#popValue').datetimepicker({
        datepicker: false,
        format: 'g:i A',
        formatTimeScroller: 'g:i A' /*uppercase AM/PM now*/ ,
        step: 15,
        onChangeDateTime: onTimeSubmit,
      });


      tk.show(timeDateSelect);

    } else if (dataSet.numberStyle) {

      valueSelect.node().value = 'Number';
      var numberSelect = d3.select('#number-format');

      numberSelect.node().value = dataSet.numberStyle;
      tk.show(numberSelect);


    } else if (dataSet.currencyCode) {

      valueSelect.node().value = 'Currency';
      var currencySelect = d3.select('#currency');
      currencySelect.node().value = dataSet.currencyCode;
      tk.show(currencySelect);

    } else { //set defaults
      valueSelect.node().value = 'Text';
      tk.show('#number-format');

    }

    if (dataSet.textAlignment) {

      var alignSelect = d3.select('#align-format');
      alignSelect.node().value = dataSet.textAlignment;
      tk.enable(alignSelect);

    } else {
      d3.select('#align-format').node().value = 'PKTextAlignmentNatural';
    }

    //set and clear select highlight style with 'select class'
    pb.svg().select('rect.select').attr('class', 'text-btn-rect');
    d3.select(this).attr('class', 'text-btn-rect select');

  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onDelField() {

    d3.event.preventDefault();
    var pass = pb.svg();
    var fieldData = pb.template().keyDoc[pb.passType()];
    var arrayLength = fieldData[editGroup.dataType].length; //get array length before removal of data field

    fieldData[editGroup.dataType].splice(editGroup.dataIndex, 1); //remove this field data from the keyDoc
    delMutateItem(editGroup.data.key, editGroup.svgType, editGroup.svgNum); //remove this item from mutate list

    var idLastField = editGroup.svgType + arrayLength; //get the index of the last field on the pass
    if (arrayLength <= 1) { //keep the last rect for adding the field type back.

      tk.hide(pass.select('#' + idLastField + ' text.label-text'), pass.select('#' +
        idLastField + ' text.value-text'));

    } else {
      //hide this value, but keep it in the svg markup for adding
      tk.hide(pass.select('#' + idLastField));
    }

    //set group num
    var groupNum = editGroup.svgNum;
    if (editGroup.svgNum > fieldData[editGroup.dataType].length) {
      groupNum = fieldData[editGroup.dataType].length;
    }

    //select the previous field on the pass, if there are more then 0
    var previousField = editGroup.svgType + groupNum;
    console.log('prevField=' + previousField);

    if (groupNum > 0) {
      //update svg text fields and input fields
      updateFieldControls(previousField);

    } else {

      //disable setting control
      d3.select('#popLabel').call(tk.disable).property('value', '');
      d3.select('#popValue').call(tk.disable).property('value', '');
      d3.select('select#value-format').call(tk.disable);
      d3.select('select#align-format').call(tk.disable);
      d3.select('button#btn-del-field').call(tk.disable);
    }

  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onAddField() {

    d3.event.preventDefault(); //prevent form submit

    var fieldData = pb.template().keyDoc[pb.passType()];

    //set new field index
    var newSvgGroupIndex = editGroup.svgNum; //only increment if field data type (aux) exists
    if (fieldData[editGroup.dataType].length) {
      var newSvgGroupIndex = editGroup.svgNum + 1;
    }

    var groupId = editGroup.svgType + newSvgGroupIndex; //example: aux4
    var keyValue = groupId + "-" + tk.gUID();

    //1 add empty data to keydoc (with filler text?)
    var fieldObject = {
      'key': keyValue,
      'label': 'LABEL', //placeholder text for a new field
      'value': 'value'
    };

    //update the text for the 'new' svg group
    fieldData[editGroup.dataType].splice(editGroup.svgNum, 0, fieldObject);
    //shiftMutateItem(editGroup.svgType, newSvgGroupIndex);

    console.log('addField:Keyvalue=' + keyValue);

    //update svg text fields and input fields
    updateFieldControls(groupId);

    //display the group
    var pass = pb.svg();
    var gElem = pass.select('#' + groupId);
    var valueText = gElem.select('.value-text');
    var labelText = gElem.select('.label-text');

    tk.show(valueText, labelText, gElem);


    if (editGroup.svgType == "primary" && fieldData[editGroup.dataType].length >= 2) { //2 max for primary
      d3.select('button#btn-add-field').call(tk.disable);
    } else if (fieldData[editGroup.dataType].length >= 4) { //disable the add button if there are 4 fields
      d3.select('button#btn-add-field').call(tk.disable);
    }


  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onValueFormat() {

    //var valueSelect = d3.select('select#value-format');

    var selectOption = this.value;

    //destroy since we might be switching from other option
    $('#popValue').datetimepicker('destroy');
    clearStyle();

    console.log('--->' + selectOption);
    //add/remove a second selector as needed
    switch (selectOption) {

      case 'Number': //----------------------------------------------

        tk.hide('#currency', '#timeDate-format');
        tk.enable('#number-format');
        tk.show('#number-format');
        break;

      case 'Time': //----------------------------------------------

        tk.hide('#currency', '#number-format');
        tk.show('#timeDate-format');

        //setup time picker
        $('#popValue').datetimepicker({
          datepicker: false,
          format: 'g:i A',
          formatTimeScroller: 'g:i A' /*uppercase AM/PM now*/ ,
          step: 15,
          onChangeDateTime: onTimeSubmit,
        });
        break;

      case 'Date': //----------------------------------------------

        //setup date picker
        $('#popValue').datetimepicker({
          timepicker: false,
          format: 'Y/m/d',
          onChangeDateTime: onDateSubmit,
        });

        tk.hide('#currency', '#number-format');
        tk.show('#timeDate-format');
        break;

      case 'Currency': //----------------------------------------------

        tk.hide('#timeDate-format', '#number-format');
        tk.show('#currency');
        break;

      default: //----------------------------------------------
        tk.disable('#number-format');
        tk.show('#number-format');
        tk.hide('#currency', '#timeDate-format');
    }



  }

  /***********************************************************


  ***********************************************************/
  function clearStyle() {

    for (var key in editGroup.data) {
      if (!editGroup.data.hasOwnProperty(key)) {
        //The current property is not a direct property of p
        continue;
      }
      //don't delete key, label, or value.
      if (key == 'key') {
        continue;
      } else if (key == 'label') {
        continue;
      } else if (key == 'value') {
        continue;
      }
      delete editGroup.data[key]; //delete the style property
    }
  }


  /***********************************************************

 	Handler

 	***********************************************************/
  function onTextSubmit(valueIsSet) {

      editGroup.data.label = d3.select('input#popLabel').node().value.toUpperCase(); //get input box label

      if (!valueIsSet) {
        if (editGroup.data.numberStyle || editGroup.data.currencyCode) {
          editGroup.data.value = Number(d3.select('input#popValue').node().value);
        } else {
          editGroup.data.value = d3.select('input#popValue').node().value;
        }

      }

      console.log(editGroup.data);

      var fieldArray = pb.template().keyDoc[pb.passType()][editGroup.dataType];

      fieldArray[editGroup.dataIndex] = editGroup.data; //set value into keyDoc
      app.passBuilder.fields.set(fieldArray, editGroup.svgType); //update svg fields

      //highlight selected group
      setHighLight(editGroup.svgId);

      //submitting text rebuilds all the text field rects. Add the event back.
      var pass = pb.svg();
      pass.selectAll('rect.text-btn-rect')
        .on('click', onTextRectClick); //add event to new rect

      pass.select('g.logo rect') //logo too.
        .on('click', onLogoRectClick);


    }
    /***********************************************************

    Handler

    ***********************************************************/
  function onDateSubmit(e) {

    editGroup.data.value = e;

    var dateStyle = d3.select('#timeDate-format').node().value;
    if (dateStyle != 'None') {
      editGroup.data.dateStyle = dateStyle;
    }

    onTextSubmit(true);

  }

  /***********************************************************

  Handler

  ***********************************************************/
  function onTimeSubmit(e) {

    editGroup.data.value = e;

    var timeStyle = d3.select('#timeDate-format').node().value;
    if (timeStyle != 'None') {
      editGroup.data.timeStyle = timeStyle;
    }

    onTextSubmit(true);

  }

  /***********************************************************

  Handler

  ***********************************************************/
  function onLogoSubmit() {

    var fieldLabel = d3.select('input#popLabel').node().value; //get input box label

    pb.template().keyDoc.logoText = fieldLabel; //set value into keyDoc
    app.passBuilder.fields.setLogo(); //update logo

    //set and clear select highlight style with 'select class'
    var pass = pb.svg();
    pass.select('rect.select').attr('class', 'text-btn-rect');
    pass.select('g.logo rect')
      .attr('class', 'text-btn-rect select')
      .on('click', onLogoRectClick);

  }

  /***********************************************************

  Handler

  ***********************************************************/
  function onDateTimeStyle(value) {

    var dateTimeStyle = value;
    var format = d3.select('#value-format').node().value;

    if (format == 'Date') {
      editGroup.data.dateStyle = dateTimeStyle;
    } else {
      editGroup.data.timeStyle = dateTimeStyle;
    }

    onTextSubmit();

  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onCurrencyStyle(value) {

    editGroup.data.currencyCode = value;
    editGroup.data.value = Number($('input#popValue').val());

    onTextSubmit(true);

  }

  /***********************************************************

 Handler

 ***********************************************************/
  function onNumberStyle(value) {

    editGroup.data.numberStyle = value;
    editGroup.data.value = Number($('input#popValue').val());

    onTextSubmit(true);
  }

  /***********************************************************

  Handler

  ***********************************************************/
  function onAlignStyle(value) {

    editGroup.data.textAlignment = value;
    onTextSubmit();

  }

  /***********************************************************

  Handler

  ***********************************************************/
  function onVarSelect() {

    d3.event.preventDefault();
    console.log("onVarSelect");

    //read date/time string
    var isVar = this.checked;
    var keyValue = editGroup.data.key;

    if (pb.template().mutatelist == undefined) { //create list if undefined
      pb.template().mutatelist = [];
    }

    var index = pb.template().mutatelist.indexOf(keyValue); //find the value in the list

    if (isVar) { //--------checked

      var fieldValue = "$var"; //set field as default filler value
      if (index == -1) { //not found
        console.log("push:" + keyValue);
        pb.template().mutatelist.push(keyValue); //add the key to the mutate list if not found
      }
      tk.disable(d3.select('input#popValue')); //disable field

    } else { //---------unchecked

      var fieldValue = "value"; //set field as default filler value
      if (index > -1) {
        console.log("splice:" + keyValue);
        pb.template().mutatelist.splice(index, 1); //delete it from the mutatelist
      }
      tk.enable(d3.select('input#popValue')); //enable input field

    }
    console.log(pb.template().mutatelist);
    editGroup.data.value = fieldValue;

    onTextSubmit(true);

  }

  /***********************************************************


  ***********************************************************/
  function onFieldsSave() {

    console.log(pb.template().keyDoc[pb.passType()]);

    var passKey = pb.template().keyDoc[pb.passType()];
    var passData = {
      'name': pb.template().name,
      'status': pb.status(pb.fields.index()),
      'keyDoc': {}
    };

    //submit the api mutate variable list if it exists.
    if (pb.template().mutatelist && pb.template().mutatelist.length) {
      passData.mutatelist = pb.template().mutatelist;
    }

    if (pb.template().keyDoc.logoText) { //submit the logo
      passData.keyDoc.logoText = pb.template().keyDoc.logoText;
    }

    passData.keyDoc[pb.passType()] = {
      'auxiliaryFields': passKey.auxiliaryFields,
      'headerFields': passKey.headerFields,
      'primaryFields': passKey.primaryFields,
      'secondaryFields': passKey.secondaryFields
    };

    console.log(passData);

    pb.update(pb.template().id, passData);


  }


  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  pb.fields = {

    /* setup and configure text input handlers */
    init: function() {
      init();
    },
    /* handler for on rect click */
    onRectClick: function() {
      onTextRectClick();
    },
    /* handler for on text submit */
    onSubmit: function() {
      onTextSubmit();
    },
    save: function() {
      onFieldsSave();
    },
    xray: function() {
      pb.location.xray(false);
    },
    stroke: function() {
      passEditor.colors.updateRectStroke('rect.text-btn-rect');
    },
    handler: function() {
      loadCurrency(); //load currency selectors
      passEditor.backFields.addHandlers();
    },
    name: function() {
      return 'infoField';
    },
    index: function() {
      return 8;
    }

  };

}(window.passNinja, passNinja.toolkit, passEditor = passNinja.passEditor || {}, jQuery));
