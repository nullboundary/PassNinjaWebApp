(function (tk, pb, $, undefined) {

  'use strict';


  var editGroup = {
    'svgId': '', //svg id of group
    'svgType': '', //svg group type: second
    'svgNum': '', //svg group num: 1
    'dataType': '', //keydoc field type: secondaryField
    'dataIndex': '' //keydoc array index value
  };

  var pKTimeTojsTime = { //convert apple PK constant to js time

    'PKDateStyleNone': function () {
      return d3.time.format.iso;
    },
    'PKDateStyleShort': function () {
      return d3.time.format('%_I:%M %p');
    },
    'PKDateStyleMedium': function () {
      return d3.time.format('%_I:%M:%S %p');
    },
    'PKDateStyleLong': function () {
      return d3.time.format('%_I:%M:%S %p %Z'); //TODO - Implement time zones as text
    },
    'PKDateStyleFull': function () {
      return d3.time.format('%_I:%M:%S %p %Z');
    }
  };

  var pKDateTojsDate = { //convert apple PK constant to js date

    'PKDateStyleNone': function () {
      return d3.time.format('');
    },
    'PKDateStyleShort': function () {
      return d3.time.format('%_m/%e/%y');
    },
    'PKDateStyleMedium': function () {
      return d3.time.format('%b %e, %Y');
    },
    'PKDateStyleLong': function () {
      return d3.time.format('%B %e, %Y');
    },
    'PKDateStyleFull': function () {
      return d3.time.format('%A, %B %e, %Y AD');
    }
  };

  var pKNumberToJs = { //convert apple PK constant to js number format

    'None': function () {
      return d3.format('');
    },
    'PKNumberStyleDecimal': function () {
      return d3.format('.4r'); //13.00
    },
    'PKNumberStylePercent': function () {
      return d3.format('%'); //multiply by 100 and suffix with '%'
    },
    'PKNumberStyleScientific': function () {
      return d3.format('.3n'); //1.33e+5
    },
    'PKNumberStyleSpellOut': function () {
      return; //TODO: implement spell out function
    }
  };
  var selectToPKNumber = { //convert select options to apple PK constant
    'None': 'None',
    'Decimal': 'PKNumberStyleDecimal',
    'Percent': 'PKNumberStylePercent',
    'Scientific': 'PKNumberStyleScientific',
    'Spell Out': 'PKNumberStyleSpellOut'
  };

  var pKValueToSVG = { //convert apple PK constant to css
    'PKTextAlignmentLeft': 'start',
    'PKTextAlignmentCenter': 'middle',
    'PKTextAlignmentRight': 'end',
    'PKTextAlignmentNatural': 'inherit',
    'default': 'inherit'
  };

  var pkFieldType = { //convert svg field class to pass field types
    'aux': 'auxiliaryFields',
    'second': 'secondaryFields',
    'header': 'headerFields',
    'primary': 'primaryFields',
    'default': ''
  };

  var fieldMargin = 15; //the space between pass fields = 7.5
  var passWidth = 315 - 15;
  var passEdgeMargin = 10; //the space between a field and the edge of the pass



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
      .on('input', function () {
        onNumberStyle(this.value);
      });

    //add handler for date-time selector
    d3.select('#timeDate-format')
      .on('input', function () {
        onDateTimeStyle(this.value);
      });

    //add handler for checking the api variable field box
    d3.select('#var-field')
      .on('change', onVarSelect);



  }

  /***********************************************************
   setPassFields add text elements and set values and labels
   for each field.

   ***********************************************************/
  function setPassFields(fieldArray, fieldType) {

    if (typeof fieldArray !== 'undefined') {
      var passGroup = pb.svg().select('g.pass-group');
      console.log("svg " + pb.svg() + " " + passGroup);
      var removeGroups = passGroup.selectAll('.' + fieldType);
      var groupLoc = removeGroups.attr('transform'); //get the translate of the first field group

      removeGroups.remove();

      //select the textGroups (that dont yet exist) and bind the data
      var textGroups = passGroup.selectAll('.' + fieldType).data(fieldArray);

      textGroups
        .enter()
        .append('g')
        .attr('transform', groupLoc) //the x gets adjusted in setFieldSizes()
        .attr('class', 'text-btn-group ' + fieldType)
        .attr('id', function (d, i) {
          var idIndex = i + 1;
          return fieldType + idIndex;
        });

      //add label & value text elems in the correct order
      var elemList = ['label', 'value']; //usually label over value
      if (fieldType == 'primary') {
        //primary fields for these types are value over label
        if (pb.passType() == 'coupon' || pb.passType() == 'storeCard') {
          elemList = ['value', 'label'];
        }
      }
      addTextElem(textGroups, fieldType, elemList);

      //set label text
      textGroups.select('.label-text')
        .text(function (d) {
          return valueOrDefault(d.label);
        });

      //set value text
      textGroups.select('.value-text')
        .each(function (d, i) {
          setFormatValueField(d3.select(this), d); //set value text
        });

      setFieldSizes(textGroups, fieldType);


    }
  }

  /***********************************************************
    addTextElem takes a list of field elements and adds an empty
    label or value text element to them.

   ***********************************************************/
  function addTextElem(textGroups, fieldType, elemList) {

    var firstLineSize = 0; //font size of the first line (label or value)
    var fieldPKType = pkFieldType[fieldType]; //example: auxiliaryFields
    var textY = 0;
    var textX = 0;

    //loop through array of label and value
    var len = elemList.length;
    for (var index = 0; index < len; ++index) {

      var textElem = textGroups
        .insert('text', d3.select(this) + 'rect.text-btn-rect') //insert the text before the rect
        .attr('id', function (d, i) {
          var idIndex = i + 1; //field id start counting at 1
          return fieldType + '-' + elemList[index] + idIndex; //example: aux-value3
        })
        .attr('dominant-baseline', 'hanging') //set text top-baseline 0,0 for most browsers
        .attr('class', function (d) {
          return elemList[index] + '-text ' + fieldPKType; //example: "value-text auxiliaryFields"
        });

      if (index == 0) { //first element in the list
        firstLineSize = parseFloat(textGroups.select('text').style('font-size'));
      } else {
        textY = firstLineSize + 5; //second element, usually value. Set the Y to be under first line.
        console.log("textY:" + textY);
      }

      //set x and y values for text element
      textElem.attr('x', function (d) {
          return textX;
        })
        .attr('y', function (d) {
          return textY;
        })
        .attr('text-anchor', function (d) { //horizontal align
          return pKValueToSVG[valueOrDefault(d.textAlignment, 'default')]; //pass alignment to svg alignment.
        });

    }
  }

  /***********************************************************
   getTotalWidth calculates the total width of all the fields
   of a particular field type.

   ***********************************************************/
  function getTotalWidth(textGroups, fieldType) {

      var totalWidth = 0;

      textGroups.each(function (d, i) {

        updateRectSize(d3.select(this), fieldType); //readjust the rect in case text size changed
        totalWidth = totalWidth + (this.getBBox().width + fieldMargin); //field group width + space between
        alignFieldLeft(d3.select(this), fieldType, i);
      });

      return totalWidth;

    }
    /***********************************************************
      updateRectSize removes the old rect elem and replaces it
      with a new rect that matches the current text size.

     ***********************************************************/
  function updateRectSize(groupElem, fieldType) {

      var fieldPKType = pkFieldType[fieldType]; //example: auxiliaryFields
      groupElem.select('rect').remove();

      //add/update the rectangle around the field to match the text size
      setFieldRect(groupElem)
        .attr('data-target', fieldPKType);

    }
    /***********************************************************
     alignFieldLeft adjusts each field to align to the previous
     leftward field. Except for primary 1 which aligns right.

     ***********************************************************/
  function alignFieldLeft(groupElem, fieldType, index) {
    //adjust X loc to left side
    var groupLoc = d3.transform(groupElem.attr('transform')).translate;

    if (index == 0) { //do nothing its all the way to the left already

    } else if (fieldType == 'primary' && index == 1) { //align right for 2nd primary field

      var groupWidth = groupElem.node().getBBox().width;
      var xLoc = passWidth - (groupWidth + passEdgeMargin); //10 is pass edge margin
      groupElem.attr('transform', 'translate(' + xLoc + ',' + groupLoc[1] + ')');

    } else { //all other fields align to previous left side field

      var prevElem = pb.svg().select('#' + fieldType + index);
      var prevLoc = d3.transform(prevElem.attr('transform')).translate;
      var prevWidth = prevElem.node().getBBox().width;
      var xLoc = prevLoc[0] + prevWidth + fieldMargin;
      groupElem.attr('transform', 'translate(' + xLoc + ',' + groupLoc[1] + ')');

    }
  }

  /***********************************************************


   ***********************************************************/
  function setFieldSizes(textGroups, fieldType) {

    var minFontSize = 11;
    var totalWidth = 0,
      longestElem;


    totalWidth = getTotalWidth(textGroups, fieldType);
    console.log("totalWidth1:" + totalWidth);
    var remainWidth = passWidth - totalWidth; //find the remaining free width on the pass

    //scale down value text font
    textGroups
      .select('text.value-text')
      .style('font-size', function (d, i) {

        var fontSize = parseFloat(d3.select(this).style('font-size')),
          multiplier = Math.min((passWidth - 17) / totalWidth, 1.0),
          newFontSize = parseFloat((fontSize * (multiplier - 0.1)));

        console.log("newFont " + newFontSize);
        if (newFontSize <= minFontSize) {
          newFontSize = minFontSize;
        }
        return newFontSize + 'px';

      });


    totalWidth = getTotalWidth(textGroups, fieldType);
    console.log("totalWidth2:" + totalWidth);
    var remainWidth = passWidth - totalWidth;

    //truncate text
    while (remainWidth < 0) {
      textGroups
        .each(function (d, i) {
          console.log("height:" + this.getBBox().height);
          longestElem = findLongElem(d3.select(this), longestElem);
        });

      longestElem.call(function (d, i) {
        var fontSize = parseFloat(this.style('font-size'));
        truncateText(this);
        var parent = this.node().parentNode;
        console.log(parent.getBBox().height);
      });

      totalWidth = getTotalWidth(textGroups, fieldType);
      console.log("totalWidth3:" + totalWidth);
      var remainWidth = passWidth - totalWidth;
    }

  }

  /***********************************************************
    truncateText replaces text in the svg that extends
    beyond the limit with a "..."

   ***********************************************************/
  function truncateText(longElem) {

    if (longElem != undefined) {
      console.log('longElem:' + longElem.text());
      var longText = longElem.text();
      longElem.text(longText.replace('...', '')); //remove the '...' from the end
      var valText = longElem.text();
      longElem.text(valText.slice(0, -1) + '...'); //slice off the last 2 characters add '...'

    }

  }

  /***********************************************************


   ***********************************************************/
  function findLongElem(groupElem, longElem) {

    //find longest text subelement
    var cElem;
    var valueElem = groupElem.select('.value-text');
    var labelElem = groupElem.select('.label-text');

    if (valueElem.node().getBBox().width >= labelElem.node().getBBox().width) {
      cElem = valueElem;
    } else {
      cElem = labelElem;
    }

    //use that text element for a comparison for the row.
    if (longElem == undefined) {
      longElem = cElem;
    } else if (cElem.node().getBBox().width > longElem.node().getBBox().width) {
      longElem = cElem;
    }
    return longElem;
  }

  /***********************************************************
    getGroupLoc gets the existing text group location.

 	***********************************************************/
  function getGroupLoc(selection) {

    var groupLoc = 'translate(0,0)';

    if (!selection.empty()) {

      //get the existing group location
      groupLoc = selection.attr('transform');
      console.log(groupLoc);
    }

    return groupLoc;
  }


  /***********************************************************
    setFormatValueField sets a field value and format the text
    to match the json data fields.

 	***********************************************************/
  function setFormatValueField(fieldElement, fieldGroup) {

    if (fieldGroup.dateStyle != undefined) {

      //format and set date if value is a date example: 2013-04-24T10:00-05:00
      var dateFormat = pKDateTojsDate[fieldGroup.dateStyle]();
      var fdate = new Date(fieldGroup.value);
      fieldElement.text(dateFormat(fdate)); //set value text as date

    } else if (fieldGroup.timeStyle != undefined) {

      //format and set date if value is a date example: 2013-04-24T10:00-05:00
      var timeFormat = pKTimeTojsTime[fieldGroup.timeStyle]();
      var fdate = new Date(fieldGroup.value);
      fieldElement.text(timeFormat(fdate)); //set value text as time

    } else if (fieldGroup.numberStyle != undefined) {

      var numberFormat = pKNumberToJs[fieldGroup.numberStyle]();
      fieldElement.text(numberFormat(Number(fieldGroup.value))); //set value text as number

    } else if (fieldGroup.currencyCode != undefined) {

      var props = {
        style: 'currency',
        currency: fieldGroup.currencyCode
      };

      var fieldNumber = Number(fieldGroup.value);
      //display output
      var currencyValue = fieldNumber.toLocaleString('en', props);
      console.log('---------->' + currencyValue);

      fieldElement.text(currencyValue); //set value text as currency


    } else {

      fieldElement.text(fieldGroup.value); //set value text as plain text
    }

    //align text in field
    fieldElement.attr('text-anchor', function (d) { //horizontal align
      return pKValueToSVG[valueOrDefault(fieldGroup.textAlignment, 'default')];
    });

  }

  /***********************************************************
    setFieldRect adds a new rect element, and sets the width,height
    and relative location.

  ***********************************************************/
  function setFieldRect(passGroup) {

    //get group bounding box size
    var rectWidth, rectHeight;
    var padding = 6;
    var groupBBox = passGroup.node().getBBox();
    var rectWidth = groupBBox.width + padding;
    var rectHeight = groupBBox.height + padding;

    //make rect for hovering - size of group element
    var rect = passGroup.append('rect')
      .attr('class', 'text-btn-rect')
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('x', -(padding / 2))
      .attr('y', -(padding / 2))
      //.attr('shape-rendering', 'crispEdges')
      .on('click', onTextRectClick); //add event to new rect

    return rect;

  }

  /***********************************************************


  ***********************************************************/
  function setLogo() {
    var logoGroup = pb.svg().select('g.logo');
    logoGroup.select('text')
      .text(pb.template().keyDoc.logoText);

    //update rectangle size
    logoGroup.select('rect').remove();
    //add/update the rectangle around the field to match the text size
    setFieldRect(logoGroup)
      .attr('data-target', "logo");

  }


  /***********************************************************
 	Tests whether a json field is undefined and if it is not
 	sets it to '' or to a default.

 	***********************************************************/
  function valueOrDefault(val, def) {
    if (def == undefined) def = '';
    return val == undefined ? def : val;
  }

  /***********************************************************


	***********************************************************/
  function configTextInputs() {

    var groupType = pb.template().keyDoc[pb.passType()][editGroup.dataType]; //example: aux

    console.log(editGroup);
    console.log(groupType);

    //set to '' if label/value is undefined
    var targetLabel = valueOrDefault(groupType[editGroup.dataIndex].label);
    var targetValue = valueOrDefault(groupType[editGroup.dataIndex].value);

    //set the check box based on if the item is already in the list or not
    if (pb.template().mutatelist != undefined) {
      var keyValue = editGroup.svgId; //editGroup.svgType + (editGroup.dataIndex + 1); //example: aux4
      var index = pb.template().mutatelist.indexOf(keyValue); //find the value in the list
      console.log(index + " " + keyValue);
      if (index > -1) { //found
        d3.select('#var-field').property('checked', true);
      } else { //not found
        d3.select('#var-field').property('checked', false);
      }
    }

    //update the legend in settings form to display the id of the field
    d3.select('div#legend-header')
      .text(editGroup.dataType);

    //set the input box attributes for the label
    var inputLabel = d3.select('#popLabel')
      .property('value', targetLabel)
      .call(tk.enable);

    //set the input box attributes for the value
    var inputValue = d3.select('#popValue')
      .property('value', targetValue)
      .call(tk.enable);

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

    editGroup = {
      'svgId': svgGroupId, //svg id of group
      'svgType': svgGroupType, //svg group type: second
      'svgNum': svgGroupNum, //svg group num: 1
      'dataType': datafieldType, //field type: secondaryField
      'dataIndex': dataGroupIndex //keydoc array index value
    };


  }

  /***********************************************************
  updateFieldControls updates svg text fields and input fields
  during add or del of fields.

  ***********************************************************/
  function updateFieldControls(groupID) {

    var fieldData = pb.template().keyDoc[pb.passType()];

    setPassFields(fieldData[editGroup.dataType], editGroup.svgType);

    //set select group to the next or previous rectangle
    setEditGroup(pb.svg().select('g#' + groupID + ' rect')[0][0]);

    configTextInputs();

    //set text color, or the field text won't show up
    $('.pass-template .value-text').css('fill', pb.template().keyDoc.foregroundColor);
    $('.pass-template .label-text').css('fill', pb.template().keyDoc.labelColor);

    //set and clear select highlight style with 'select class'
    pb.svg().selectAll('rect.text-btn-rect') //clear all
      .attr('class', 'text-btn-rect');

    pb.svg().select('g#' + editGroup.svgId + ' rect') //set highlight
      .attr('class', 'text-btn-rect select');

    //enable all buttons
    tk.enable(d3.select('button#btn-del-field'), d3.select('button#btn-add-field'));


  }

  function delMutateItem(groupType, groupIndex) {

    for (var i = groupIndex; i < 5; i++) { //loop all fields deleted and higher
      var groupID = groupType + i;
      var index = pb.template().mutatelist.indexOf(groupID); //find the value in the list
      if (index > -1) { //found
        console.log('remove:' + groupID);
        pb.template().mutatelist.splice(index, 1); //remove it from the list
        if (i > groupIndex) { //except deleted item
          pb.template().mutatelist.push(groupType + (i - 1)); //add it back with -1 index.
        }
      }
    }


  }

  function shiftMutateItem(groupType, groupIndex) {

    var groupID = groupType + groupIndex;
    var index = pb.template().mutatelist.indexOf(groupID); //find the value in the list
    if (index > -1) { //found
      pb.template().mutatelist.splice(index, 1); //remove old value
      pb.template().mutatelist.push(groupType + (groupIndex + 1)); //add it back with +1 index.
      console.log('replace:' + groupID + " with:" + (groupIndex + 1));

    }
  }


  /***********************************************************

 	Handler

 	***********************************************************/
  function onTextRectClick() {

    //set the group id of the text under the rectangle
    setEditGroup(this);
    var fieldGroup = pb.template().keyDoc[pb.passType()][editGroup.dataType];

    //set and clear select highlight style with 'select class'
    pb.svg().selectAll('rect.text-btn-rect').attr('class', 'text-btn-rect');
    d3.select(this).attr('class', 'text-btn-rect select');

    if (fieldGroup.length) {
      //setup text and attach handlers for text input controls
      configTextInputs();
    }
    //enable select inputs and buttons
    tk.enable(d3.select('#value-format'), d3.select('#btn-del-field'), d3.select(
      '#btn-add-field'));

    //disable add or delete button
    if (editGroup.svgType == "header") { //disable the add button for header. (only 1 field allowed)
      d3.select('button#btn-add-field').call(tk.disable);
    } else if (editGroup.svgType == "primary" && fieldGroup.length >= 2) { //2 max for primary
      d3.select('button#btn-add-field').call(tk.disable);
    } else if (fieldGroup.length >= 4) { //disable the add button if there are 4 fields
      d3.select('button#btn-add-field').call(tk.disable);
    } else if (fieldGroup.length <= 0) { //disable the delete button if there are 0 fields
      d3.select('button#btn-del-field').call(tk.disable);
    }

    var valueSelect = d3.select('select#value-format');
    tk.hide(d3.select('#currency'), d3.select('#number-format'), d3.select('#timeDate-format'));

    var dataGroup = d3.select(this.parentNode);
    var dataSet = dataGroup.data()[0]; //get bound __data__ from DOM

    console.log(dataSet);
    if (dataSet.dateStyle != undefined) {
      console.log(dataSet.dateStyle);
      valueSelect.node().value = 'Date';
      var timeDateSelect = d3.select('#timeDate-format');
      timeDateSelect.node().value = dataSet.dateStyle;

      tk.show(timeDateSelect);


    } else if (dataSet.timeStyle != undefined) {
      console.log(dataSet.timeStyle);

      valueSelect.node().value = 'Time';
      var timeDateSelect = d3.select('#timeDate-format');
      timeDateSelect.node().value = dataSet.timeStyle;

      tk.show(timeDateSelect);

    } else if (dataSet.numberStyle != undefined) {

      valueSelect.node().value = 'Number';
      var numberSelect = d3.select('#number-format');

      numberSelect.node().value = dataSet.numberStyle;
      tk.show(numberSelect);


    } else if (dataSet.currencyCode != undefined) {

      valueSelect.node().value = 'Currency';
      var currencySelect = d3.select('#currency');
      currencySelect.node().value = dataSet.currencyCode;
      tk.show(currencySelect);

    } else {
      valueSelect.node().value = 'Text';

    }

  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onDelField() {

    d3.event.preventDefault();

    var fieldData = pb.template().keyDoc[pb.passType()],
      arrayLength = fieldData[editGroup.dataType].length; //get array length before removal of data field

    fieldData[editGroup.dataType].splice(editGroup.dataIndex, 1); //remove this field data from the keyDoc
    delMutateItem(editGroup.svgType, editGroup.svgNum); //remove this item from mutate list

    var idLastField = editGroup.svgType + arrayLength; //get the index of the last field on the pass
    if (arrayLength <= 1) { //keep the last rect for adding the field type back.

      tk.hide(pb.svg().select('#' + idLastField + ' text.label-text'), pb.svg().select('#' +
        idLastField + ' text.value-text'));

    } else {
      //hide this value, but keep it in the svg markup for adding
      tk.hide(pb.svg().select('#' + idLastField));
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

      updateFieldControls(previousField);

    } else {

      //disable setting control
      d3.select('#popLabel').call(tk.disable).property('value', '');
      d3.select('#popValue').call(tk.disable).property('value', '');
      d3.select('select#value-format').call(tk.disable);
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
    var newSvgGroupIndex = editGroup.svgNum; //only increment if field data exists
    if (fieldData[editGroup.dataType].length) {
      var newSvgGroupIndex = editGroup.svgNum + 1;
    }

    //1 add empty data to keydoc (with filler text?)
    var fieldObject = {
      'key': keyValue,
      'label': 'LABEL', //placeholder text for a new field
      'value': 'value'
    };

    //update the text for the 'new' svg group
    fieldData[editGroup.dataType].splice(editGroup.svgNum, 0, fieldObject);
    shiftMutateItem(editGroup.svgType, newSvgGroupIndex);

    var keyValue = editGroup.svgType + newSvgGroupIndex; //example: aux4

    console.log('addField:Keyvalue=' + keyValue);

    updateFieldControls(keyValue);

    //display the group
    var valueText = pb.svg().select('#' + keyValue + ' text.value-text'),
      labelText = pb.svg().select('#' + keyValue + ' text.label-text'),
      valueElem = pb.svg().select('#' + keyValue);

    tk.show(valueText, labelText, valueElem);


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

    console.log('--->' + selectOption);
    //add/remove a second selector as needed
    switch (selectOption) {

    case 'Number': //----------------------------------------------

      tk.hide(d3.select('#currency'), d3.select('#timeDate-format'));
      tk.show(d3.select('#number-format'));
      break;

    case 'Time': //----------------------------------------------

      tk.hide(d3.select('#currency'), d3.select('#number-format'));
      tk.show(d3.select('#timeDate-format'));

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

      tk.hide(d3.select('#currency'), d3.select('#number-format'));
      tk.show(d3.select('#timeDate-format'));
      break;

    case 'Currency': //----------------------------------------------

      tk.hide(d3.select('#timeDate-format'), d3.select('#number-format'));

      var url = '/assets/data/currency.html';
      var uri = encodeURI(url);
      console.log(uri);

      //load svg xml + place into document
      d3.html(uri, function (html) {

        d3.select('div#format-control').node().appendChild(html);
        //add handler for currency selector
        d3.select('#currency')
          .call(tk.show)
          .on('input', function () {
            onCurrencyStyle(this.value);
          });

        //set the value to a default currency (USD)
        onCurrencyStyle($('#currency').val());
      });
      break;

    default: //----------------------------------------------
      tk.hide(d3.select('#currency'), d3.select('#number-format'), d3.select(
        '#timeDate-format'));
    }



  }


  /***********************************************************

 	Handler

 	***********************************************************/
  function onTextSubmit(fieldData) {

      if (fieldData == undefined) {

        var fieldValue = $('input#popValue').val();
        var fieldLabel = $('input#popLabel').val().toUpperCase(); //get input box label
        var keyValue = editGroup.svgId;

        var fieldData = {
          'key': keyValue,
          'label': fieldLabel,
          'value': fieldValue
        };

      }

      console.log(fieldData);

      pb.template().keyDoc[pb.passType()][editGroup.dataType][editGroup.dataIndex] = fieldData; //set value into keyDoc
      setPassFields(pb.template().keyDoc[pb.passType()][editGroup.dataType], editGroup.svgType); //update svg fields

      //set and clear select highlight style with 'select class'
      pb.svg().selectAll('rect.text-btn-rect').attr('class', 'text-btn-rect');
      pb.svg().select('g#' + editGroup.svgId + ' rect').attr('class', 'text-btn-rect select');

      //set text color
      pb.svg().select('.pass-template .value-text').style('fill', pb.template().keyDoc.foregroundColor);
      pb.svg().select('.pass-template .label-text').style('fill', pb.template().keyDoc.labelColor);

      console.log(editGroup.dataType);

    }
    /***********************************************************

    Handler

    ***********************************************************/
  function onDateSubmit(e) {

    var fieldValue = e;
    var dateStyle = d3.select('#timeDate-format').node().value;
    var fieldLabel = $('input#popLabel').val().toUpperCase();; //get input box label
    var keyValue = editGroup.svgId;


    var fieldData = {
      'key': keyValue,
      'label': fieldLabel,
      'value': fieldValue
    };

    if (dateStyle != 'None') {
      fieldData.dateStyle = dateStyle;
    }

    onTextSubmit(fieldData);

  }

  /***********************************************************

  Handler

  ***********************************************************/
  function onTimeSubmit(e) {

    var fieldValue = e;
    var timeStyle = d3.select('#timeDate-format').node().value;
    var fieldLabel = $('input#popLabel').val().toUpperCase();; //get input box label
    var keyValue = editGroup.svgId;


    var fieldData = {
      'key': keyValue,
      'label': fieldLabel,
      'value': fieldValue
    };

    if (timeStyle != 'None') {
      fieldData.timeStyle = timeStyle;
    }

    onTextSubmit(fieldData);

  }

  /***********************************************************

  Handler

  ***********************************************************/
  function onDateTimeStyle(value) {

    var fieldValue = $('input#popValue').val();
    var dateTimeStyle = value;
    var fieldLabel = $('input#popLabel').val(); //get input box label
    var format = $('#value-format').val();

    var keyValue = editGroup.svgId;

    var fieldData = {
      'key': keyValue,
      'label': fieldLabel,
      'value': fieldValue
    };

    if (format == 'Date') {
      fieldData.dateStyle = dateTimeStyle;
    } else {
      fieldData.timeStyle = dateTimeStyle;
    }

    onTextSubmit(fieldData);

  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onCurrencyStyle(value) {

    var fieldValue = Number($('input#popValue').val());
    var currencyCode = value;
    var fieldLabel = $('input#popLabel').val(); //get input box label
    var keyValue = editGroup.svgId;
    //console.log(currencyCode);

    //props = {
    //	style: 'currency',
    //	currency: currencyCode
    //};

    //display output
    //var currencyText = fieldValue.toLocaleString('en', props);
    //console.log(currencyText);

    var fieldData = {
      'key': keyValue,
      'currencyCode': currencyCode,
      'label': fieldLabel,
      'value': fieldValue
    };

    onTextSubmit(fieldData);

  }

  /***********************************************************

 Handler

 ***********************************************************/
  function onNumberStyle(value) {

    var pkNumStyle = value;
    var fieldValue = Number($('input#popValue').val());
    var fieldLabel = $('input#popLabel').val(); //get input box label
    var keyValue = editGroup.svgId;
    var fieldData = {
      'key': keyValue,
      'numberStyle': pkNumStyle,
      'label': fieldLabel,
      'value': fieldValue
    };

    onTextSubmit(fieldData);

  }

  /***********************************************************

  Handler

  ***********************************************************/
  function onVarSelect() {

    d3.event.preventDefault();
    console.log("onVarSelect");

    //read date/time string
    var isVar = this.checked;
    var fieldLabel = d3.select('input#popLabel').node().value; //get input box label
    var keyValue = editGroup.svgId;
    if (pb.template().mutatelist == undefined) { //create list if undefined
      pb.template().mutatelist = [];
    }
    var index = pb.template().mutatelist.indexOf(keyValue); //find the value in the list


    if (isVar) { //checked

      var fieldValue = "-"; //set field as default filler value
      if (index == -1) { //not found
        console.log("push:" + keyValue);
        pb.template().mutatelist.push(keyValue); //add the key to the mutate list if not found
      }
      pb.disable(d3.select('input#popValue')); //disable field

    } else {

      if (index > -1) {
        console.log("splice:" + keyValue);
        pb.template().mutatelist.splice(index, 1); //delete it from the mutatelist
      }
      tk.enable(d3.select('input#popValue')); //enable input field

    }

    var fieldData = {
      'key': keyValue,
      'label': fieldLabel,
      'value': fieldValue
    };

    onTextSubmit(fieldData);

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

    console.log(pb.template().mutatelist);
    if (pb.template().mutatelist && pb.template().mutatelist.length > 0) { //submit the api mutate variable list if it exists.
      passData.mutatelist = pb.template().mutatelist;
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
    init: function () {
      init();
    },

    /* set svg text fields to match pass json data */
    set: function (fieldArray, fieldType) {
      setPassFields(fieldArray, fieldType);
    },
    /* set svg logo to match pass json data */
    setLogo: function () {
      setLogo();
    },
    /* handler for on rect click */
    onRectClick: function () {
      onTextRectClick();
    },

    /* handler for on text submit */
    onSubmit: function () {
      onTextSubmit();
    },
    save: function () {
      onFieldsSave();
    },
    xray: function () {
      pb.location.xray(false);
    },
    stroke: function () {
      passBuilder.colors.updateRectStroke('rect.text-btn-rect');
    },
    handler: function () {
      passBuilder.backFields.addHandlers();
    },
    name: function () {
      return 'infoField';
    },
    index: function () {
      return 8;
    }

  };

}(passNinja.toolkit, passBuilder = passNinja.passBuilder || {}, jQuery));
