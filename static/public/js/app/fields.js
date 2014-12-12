(function (pb, $, undefined) {

  'use strict';


  var editGroup = {
      'svgId': '', //svg id of group
      'svgType': '', //svg group type: second
      'svgNum': '', //svg group num: 1
      'dataType': '', //keydoc field type: secondaryField
      'dataIndex': '' //keydoc array index value
    },

    pKTimeTojsTime = { //convert apple PK constant to js time

      'PKDateStyleNone': function () {
        return d3.time.format('');
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
    },

    pKDateTojsDate = { //convert apple PK constant to js date

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
    },

    pKNumberToJs = { //convert apple PK constant to js number format

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
    },
    selectToPKNumber = { //convert select options to apple PK constant
      'None': 'None',
      'Decimal': 'PKNumberStyleDecimal',
      'Percent': 'PKNumberStylePercent',
      'Scientific': 'PKNumberStyleScientific',
      'Spell Out': 'PKNumberStyleSpellOut'
    },

    pKValueToSVG = { //convert apple PK constant to css
      'PKTextAlignmentLeft': 'start',
      'PKTextAlignmentCenter': 'middle',
      'PKTextAlignmentRight': 'end',
      'PKTextAlignmentNatural': 'inherit',
      'default': 'inherit'
    },

    pkFieldType = { //convert svg field class to pass field types
      'aux': 'auxiliaryFields',
      'second': 'secondaryFields',
      'header': 'headerFields',
      'primary': 'primaryFields',
      'default': ''
    };

  var fieldMargin = 15; //the space between pass fields = 7.5
  var passWidth = 315 - 15;



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
      .on('input', function () {});



  }

  /***********************************************************
   add text elements and set values and labels for each field

   ***********************************************************/
  function setPassFields(fieldArray, fieldType) {

    if (typeof fieldArray !== 'undefined') {

      var passGroup = d3.select('g.pass-group'),
        removeGroups = passGroup.selectAll('.' + fieldType),
        groupLoc = removeGroups.attr('transform'); //get the translate of the first field group

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
      var elemList = ['label', 'value'];
      if (fieldType == 'primary') {
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


   ***********************************************************/
  function addTextElem(textGroups, fieldType, elemList) {

    var firstLineSize = 0;
    var fieldPKType = pkFieldType[fieldType]; //auxiliaryFields
    var textY = 0;
    var textX = 0;

    //loop through array of label and value
    var len = elemList.length;
    for (var index = 0; index < len; ++index) {

      var textElem = textGroups
        .insert('text', d3.select(this) + 'rect.text-btn-rect')
        .attr('id', function (d, i) {
          var idIndex = i + 1;
          return fieldType + '-' + elemList[index] + idIndex;
        })
        .attr('dominant-baseline', 'hanging') //set text top-baseline 0,0 for most browsers
        .attr('class', function (d) {
          return elemList[index] + '-text ' + fieldPKType;
        });

      if (index == 0) {
        firstLineSize = parseFloat(textGroups.select('text').style('font-size'));
      } else {
        textY = firstLineSize + 5;
        console.log("textY:" + textY);
      }

      textElem.attr('x', function (d) {
          return textX;
        })
        .attr('y', function (d) {
          return textY;
        })
        .attr('text-anchor', function (d) { //horizontal align
          return pKValueToSVG[valueOrDefault(d.textAlignment, 'default')];
        });

    }
  }

  /***********************************************************


   ***********************************************************/
  function getTotalWidth(textGroups, fieldType) {

      var totalWidth = 0;

      textGroups.each(function (d, i) {

        updateRectSize(d3.select(this), fieldType); //readjust the rect in case text size changed
        totalWidth = totalWidth + (this.getBBox().width + fieldMargin);
        alignFieldLeft(d3.select(this), fieldType, i);
      });

      return totalWidth;

    }
    /***********************************************************


     ***********************************************************/
  function updateRectSize(groupElem, fieldType) {

      //update rectangle size
      var removedRect = groupElem.select('rect').remove();
      var fieldPKType = pkFieldType[fieldType]; //auxiliaryFields
      //add/update the rectangle around the field to match the text size
      setFieldRect(groupElem, removedRect)
        .attr('data-target', fieldPKType);

    }
    /***********************************************************


     ***********************************************************/
  function alignFieldLeft(groupElem, fieldType, index) {
    //adjust X loc to left side
    var groupLoc = d3.transform(groupElem.attr('transform')).translate;

    if (index == 0) {
      //do nothing its all the way to the left already
    } else if (fieldType == 'primary' && index == 1) {
      var groupWidth = groupElem.node().getBBox().width;
      var xLoc = passWidth - (groupWidth + 10); //10 is pass edge margin
      groupElem.attr('transform', 'translate(' + xLoc + ',' + groupLoc[1] + ')');

    } else {
      var prevElem = d3.select('#' + fieldType + index);
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
    var remainWidth = passWidth - totalWidth;

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
    var cElem,
      valueElem = groupElem.select('.value-text'),
      labelElem = groupElem.select('.label-text');

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
 	get the existing text group location

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
 	set a field value and format the text to match the json data fields

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



  ***********************************************************/
  function setFieldRect(passGroup) {

    //get group bounding box size
    var rectWidth, rectHeight,
      padding = 6,
      radius = 3,
      groupBBox = passGroup.node().getBBox(),
      rectWidth = groupBBox.width + padding,
      rectHeight = groupBBox.height + padding;

    //make rect for hovering - size of group element
    var rect = passGroup.append('rect')
      .attr('class', 'text-btn-rect')
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('x', -(padding / 2))
      .attr('y', -(padding / 2))
      //.attr('rx', radius)
      //.attr('ry', radius)
      //.attr('shape-rendering', 'crispEdges')
      //.attr('stroke-dasharray', '1,2') //dashed line. 1 pixel - 2 pixel space
      .on('click', onTextRectClick); //add event to new rect

    return rect;

  }

  /***********************************************************


  ***********************************************************/
  function setLogo() {
    var logoGroup = d3.select('g.logo');
    logoGroup.select('text')
      .text(pb.template().keyDoc.logoText);

    //update rectangle size
    var removedRect = logoGroup.select('rect').remove();
    //add/update the rectangle around the field to match the text size
    setFieldRect(logoGroup, removedRect)
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


    console.log(editGroup);
    console.log(pb.template().keyDoc[pb.passType()][editGroup.dataType]);

    //set to '' if label/value is undefined
    var targetLabel = valueOrDefault(pb.template().keyDoc[pb.passType()][editGroup.dataType][editGroup.dataIndex]
      .label);
    var targetValue = valueOrDefault(pb.template().keyDoc[pb.passType()][editGroup.dataType][editGroup.dataIndex]
      .value);

    //update the legend in popover to display the id of the field
    d3.select('div#legend-header')
      .text(editGroup.dataType);

    //set the input box attributes for the label
    var inputLabel = d3.select('#popLabel')
      .property('value', targetLabel)
      .call(pb.enable);

    //set the input box attributes for the value
    var inputValue = d3.select('#popValue')
      .property('value', targetValue)
      .call(pb.enable);

  }

  /***********************************************************



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

 	Handler

 	***********************************************************/
  function onTextRectClick() {

    //set the group id of the text under the rectangle
    setEditGroup(this);

    //set and clear select highlight style with 'select class'
    d3.selectAll('rect.text-btn-rect').attr('class', 'text-btn-rect');
    d3.select(this).attr('class', 'text-btn-rect select');

    if (pb.template().keyDoc[pb.passType()][editGroup.dataType].length) {
      //setup text and attach handlers for text input controls
      configTextInputs();
    }
    //enable select inputs and buttons
    pb.enable(d3.select('#value-format'), d3.select('#btn-del-field'), d3.select(
      '#btn-add-field'));

    //disable the add button if there are 4 fields
    //TODO: Some passes fields can only have a max of 2
    if (pb.template().keyDoc[pb.passType()][editGroup.dataType].length >= 4) {
      d3.select('button#btn-add-field').call(pb.disable);
    } else if (pb.template().keyDoc[pb.passType()][editGroup.dataType].length <= 0) { //disable the delete button if there are 0 fields
      d3.select('button#btn-del-field').call(pb.disable);
    }

  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onDelField() {

    d3.event.preventDefault();

    var fieldData = pb.template().keyDoc[pb.passType()];
    //get array length before removal of data field
    var arrayLength = fieldData[editGroup.dataType].length;
    //remove this field data from the keyDoc
    fieldData[editGroup.dataType].splice(editGroup.dataIndex, 1);

    //hide last field on svg
    var idLastField = editGroup.svgType + arrayLength; //get the index of the last field on the pass
    if (arrayLength <= 1) { //keep the last rect for adding the field type back.

      pb.hide(d3.select('#' + idLastField + ' text.label-text'), d3.select('#' +
        idLastField + ' text.value-text'));

    } else {
      //hide this value, but keep it in the svg markup for adding
      pb.hide(d3.select('#' + idLastField));
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

      //set select group to the previous rectangle
      setEditGroup(d3.select('g#' + previousField + ' rect')[0][0]);

      //reset legend after delete
      d3.select('div#legend-header')
        .text(editGroup.dataType);

      //update svg text
      setPassFields(fieldData[editGroup.dataType], editGroup.svgType);

      configTextInputs();

      //set text color, or the field text won't show up
      $('.pass-template .value-text').css('fill', pb.template().keyDoc.foregroundColor);
      $('.pass-template .label-text').css('fill', pb.template().keyDoc.labelColor);

      //set and clear select highlight style with 'select class'
      d3.selectAll('rect.text-btn-rect')
        .attr('class', 'text-btn-rect');

      d3.select('g#' + editGroup.svgId + ' rect')
        .attr('class', 'text-btn-rect select');

      //enable all buttons
      pb.enable(d3.select('button#btn-del-field'), d3.select('button#btn-add-field'));

    } else {

      //disable setting control
      d3.select('#popLabel').call(pb.disable).property('value', '');
      d3.select('#popValue').call(pb.disable).property('value', '');
      d3.select('select#value-format').call(pb.disable);
      d3.select('button#btn-del-field').call(pb.disable);
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
    fieldData[editGroup.dataType].splice(newSvgGroupIndex, 0, fieldObject);

    //pb.template().keyDoc[pb.passType()][editGroup.dataType][editGroup.dataIndex] = fieldData //set value into keyDoc
    setPassFields(fieldData[editGroup.dataType], editGroup.svgType);

    var keyValue = editGroup.svgType + newSvgGroupIndex; //example: aux4
    console.log('addField:Keyvalue=' + keyValue);

    //set select group to the new rectangle
    setEditGroup(d3.select('g#' + keyValue + ' rect')[0][0]); //http://bost.ocks.org/mike/selection/#subclass

    //set and clear select highlight style with 'select class'
    d3.selectAll('rect.text-btn-rect').attr('class', 'text-btn-rect');
    d3.select('g#' + editGroup.svgId + ' rect').attr('class',
      'text-btn-rect select');

    //set text color
    $('.pass-template .value-text').css('fill', pb.template().keyDoc.foregroundColor);
    $('.pass-template .label-text').css('fill', pb.template().keyDoc.labelColor);

    //display the group
    var valueText = d3.select('#' + keyValue + ' text.value-text'),
      labelText = d3.select('#' + keyValue + ' text.label-text'),
      valueElem = d3.select('#' + keyValue);

    pb.show(valueText, labelText, valueElem);

    //configure controls

    //reset legend
    d3.select('div#legend-header')
      .text(editGroup.dataType);

    //enable and clear setting control
    d3.select('#popLabel').call(pb.enable).property('value', fieldObject.label);
    d3.select('#popValue').call(pb.enable).property('value', fieldObject.value);

    //enable all buttons
    pb.enable(d3.select('button#btn-del-field'), d3.select('button#btn-add-field'));

    //disable the add button if there are 4 fields
    if (fieldData[editGroup.dataType].length >= 4) {
      d3.select('button#btn-add-field').call(pb.disable);
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
    if (selectOption == 'Number') {

      pb.hide(d3.select('#currency'), d3.select('#timeDate-format'));
      pb.show(d3.select('#number-format'));


    } else if (selectOption == 'Time') {

      pb.hide(d3.select('#currency'), d3.select('#number-format'));
      pb.show(d3.select('#timeDate-format'));

      //setup time picker
      $('#popValue').datetimepicker({
        datepicker: false,
        format: 'g:i A',
        formatTimeScroller: 'g:i A' /*uppercase AM/PM now*/ ,
        step: 15,
        onChangeDateTime: onTextSubmit,
      });

    } else if (selectOption == 'Date') {

      //setup date picker
      $('#popValue').datetimepicker({
        timepicker: false,
        format: 'Y/m/d',
        onChangeDateTime: onTextSubmit,
      });

      pb.hide(d3.select('#currency'), d3.select('#number-format'));
      pb.show(d3.select('#timeDate-format'));

    } else if (selectOption == 'Currency') {

      pb.hide(d3.select('#timeDate-format'), d3.select('#number-format'));

      var url = '/accounts/assets/data/currency.html';
      var uri = encodeURI(url);
      console.log(uri);

      //load svg xml + place into document
      d3.html(uri, function (html) {

        d3.select('div#format-control').node().appendChild(html);
        //add handler for currency selector
        d3.select('#currency')
          .call(pb.show)
          .on('input', function () {
            onCurrencyStyle(this.value);
          });

        //set the value to a default currency (USD)
        onCurrencyStyle($('#currency').val());


      });



    } else {
      pb.hide(d3.select('#currency'), d3.select('#number-format'), d3.select(
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
    d3.selectAll('rect.text-btn-rect').attr('class', 'text-btn-rect');
    d3.select('g#' + editGroup.svgId + ' rect').attr('class', 'text-btn-rect select');

    //set text color
    $('.pass-template .value-text').css('fill', pb.template().keyDoc.foregroundColor);
    $('.pass-template .label-text').css('fill', pb.template().keyDoc.labelColor);

    console.log(editGroup.dataType);

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

    var numberFormat = value;
    var pkNumStyle = selectToPKNumber[numberFormat]

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


  ***********************************************************/
  function onFieldsSave() {

    console.log(pb.template().keyDoc[pb.passType()]);

    var passKey = pb.template().keyDoc[pb.passType()];

    var passData = {
      'name': pb.template().name,
      'status': pb.status(pb.fields.index()),
      'keyDoc': {}
    };

    passData.keyDoc[pb.passType()] = {
      'auxiliaryFields': passKey.auxiliaryFields,
      'headerFields': passKey.headerFields,
      'primaryFields': passKey.primaryFields,
      'secondaryFields': passKey.secondaryFields
    };

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
  //return passFields; //return the fields object

}(passBuilder = window.passBuilder || {}, jQuery));
