(function (passFields, $, undefined) {

  var editGroup = {
      'svgId': "", //svg id of group
      'svgType': "", //svg group type: second
      'svgNum': "", //svg group num: 1
      'dataType': "", //keydoc field type: secondaryField
      'dataIndex': "" //keydoc array index value
    },

    pKTimeTojsTime = { //convert apple PK constant to js time

      "PKDateStyleNone": function () {
        return d3.time.format("");
      },
      "PKDateStyleShort": function () {
        return d3.time.format("%_I:%M %p");
      },
      "PKDateStyleMedium": function () {
        return d3.time.format("%_I:%M:%S %p");
      },
      "PKDateStyleLong": function () {
        return d3.time.format("%_I:%M:%S %p %Z"); //TODO - Implement time zones as text
      },
      "PKDateStyleFull": function () {
        return d3.time.format("%_I:%M:%S %p %Z");
      }
    },

    pKDateTojsDate = { //convert apple PK constant to js date

      "PKDateStyleNone": function () {
        return d3.time.format("");
      },
      "PKDateStyleShort": function () {
        return d3.time.format("%_m/%e/%y");
      },
      "PKDateStyleMedium": function () {
        return d3.time.format("%b %e, %Y");
      },
      "PKDateStyleLong": function () {
        return d3.time.format("%B %e, %Y");
      },
      "PKDateStyleFull": function () {
        return d3.time.format("%A, %B %e, %Y AD");
      }
    },

    pKNumberToJs = { //convert apple PK constant to js number format

      "None": function () {
        return d3.format("");
      },
      "PKNumberStyleDecimal": function () {
        return d3.format(".4r"); //13.00
      },
      "PKNumberStylePercent": function () {
        return d3.format("%"); //multiply by 100 and suffix with "%"
      },
      "PKNumberStyleScientific": function () {
        return d3.format(".3n"); //1.33e+5
      },
      "PKNumberStyleSpellOut": function () {
        return; //TODO: implement spell out function
      }
    },
    selectToPKNumber = { //convert select options to apple PK constant
      "None": "None",
      "Decimal": "PKNumberStyleDecimal",
      "Percent": "PKNumberStylePercent",
      "Scientific": "PKNumberStyleScientific",
      "Spell Out": "PKNumberStyleSpellOut"
    },

    pKValueToSVG = { //convert apple PK constant to css
      "PKTextAlignmentLeft": "start",
      "PKTextAlignmentCenter": "middle",
      "PKTextAlignmentRight": "end",
      "PKTextAlignmentNatural": "inherit",
      "default": "inherit"
    },

    pkFieldType = { //convert svg field class to pass field types
      "aux": "auxiliaryFields",
      "second": "secondaryFields",
      "header": "headerFields",
      "primary": "primaryFields",
      "default": ""
    };



  /***********************************************************

		setup all event handlers for text settings

 	***********************************************************/
  function init() {

    //set the input box handler for the label
    d3.select("#popLabel")
      .on("input", onTextSubmit);

    //set the input box handler for the value
    d3.select("#popValue")
      .on("input", onTextSubmit);

    //add events for selecting value format selector options
    d3.select("select#value-format")
      .on("input", onValueFormat);

    //add handler for delete field button
    d3.select("button#btn-del-field")
      .on("click", onDelField);

    //add handler for add field button
    d3.select("button#btn-add-field")
      .on("click", onAddField);

    //add handler for number format selector
    d3.select("#number-format")
      .on("input", function () {
        onNumberStyle(this.value);
      });

    //add handler for date-time selector
    d3.select("#timeDate-format")
      .on("input", function () {});



  }


  /***********************************************************
 	add text elements and set values and labels for each field

 	***********************************************************/
  function setPassFields(fieldArray, fieldType) {

    //if field array exists or not
    if (typeof fieldArray !== "undefined") {

      var fieldPKType = pkFieldType[fieldType]; //auxiliaryFields

      for (var index = 0; index < fieldArray.length; ++index) {

        var idIndex = index + 1; //id count starts at 1.

        var originalRect = getRectBBox(fieldType, idIndex); //Sometimes null, but then not needed.
        console.log("--->Orect " + originalRect.width + " " + originalRect.height);

        //remove groups that already exist - get old group x&Y loc
        var groupLoc = removeTextGroup(fieldType, idIndex);

        //Add pass group
        var passGroup = d3.select("g.pass-group")
          .append('g')
          .attr('transform', groupLoc)
          .attr('class', 'text-btn-group')
          .attr('id', fieldType + idIndex);

        if (passType == "coupon" && fieldType == "primary") { //primary fields have value then label

          //Add Value Element
          var valueElem = addTextElem("value", passGroup, fieldType, fieldArray, index);
          //Add Label Element
          var labelElem = addTextElem("label", passGroup, fieldType, fieldArray, index);

        } else if (passType == "storeCard" && fieldType == "primary") {
          //TODO: This seems stupid, must be a better way to make this exception for 2 types of passes.

          //Add Value Element
          var valueElem = addTextElem("value", passGroup, fieldType, fieldArray, index);
          //Add Label Element
          var labelElem = addTextElem("label", passGroup, fieldType, fieldArray, index);

        } else { //all other fields are label then value

          //Add Label Element
          var labelElem = addTextElem("label", passGroup, fieldType, fieldArray, index);
          //Add Value Element
          var valueElem = addTextElem("value", passGroup, fieldType, fieldArray, index);

        }

        labelElem.text(valueOrDefault(fieldArray[index].label)) //set label text
        setFormatValueField(valueElem, fieldArray[index]); //set value text

        //get group bounding box size
        var el = document.getElementById(fieldType + idIndex);
        var rectBBox = el.getBoundingClientRect();

        console.log(rectBBox.width + " " + rectBBox.height)

        var labelWidth = setTextSize(labelElem, passGroup, fieldArray.length);
        var valueWidth = setTextSize(valueElem, passGroup, fieldArray.length);

        var rectWidth, rectHeight; //rect width is assigned to whichever is wider
        if (labelWidth >= valueWidth) {
          rectWidth = labelWidth;
        } else {
          rectWidth = valueWidth;
        }
        rectHeight = rectBBox.height;

        //no text but a rect, set an empty box
        if (rectWidth == 0 || rectHeight == 0) {
          rectWidth = originalRect.width;
          rectHeight = originalRect.height;
        }

        var padding = 4;
        var radius = 3;
        rectWidth = rectWidth + padding;
        rectHeight = rectHeight + padding;


        //make rect for hovering - size of group element
        var rect = passGroup.append('rect')
          .attr('class', 'text-btn-rect')
          .attr('data-target', fieldPKType)
          .attr('width', rectWidth)
          .attr('height', rectHeight)
          .attr('x', -(padding / 2))
          .attr('y', -(padding / 2))
          .attr('rx', radius)
          .attr('ry', radius)
          .attr('shape-rendering', 'crispEdges')
          //.attr('stroke-dasharray', "1,2") //dashed line. 1 pixel - 2 pixel space
          .on("click", onTextRectClick); //add event to new rect

      }

    }
  }

  /***********************************************************


 	***********************************************************/
  function addTextElem(textType, passGroup, fieldType, fieldArray, fieldIndex) {

    var idIndex = fieldIndex + 1; //id count starts at 1.
    var groupId = 'g#' + fieldType + idIndex; //g#aux1
    var textId = fieldType + "-" + textType + idIndex; //aux-label1
    var fieldPKType = pkFieldType[fieldType]; //auxiliaryFields
    var textX = 0; //the relative position of the text inside the group
    var textY = 0;

    //Add Text Element
    var textElem = passGroup
      .insert('text', groupId + 'rect.text-btn-rect')
      .attr('id', textId)
      .classed(JSON.parse('{ "' + textType + '-text": true,"' + fieldPKType + '": true }')) //add classes label-text and fieldType
      .attr('text-anchor', pKValueToSVG[valueOrDefault(fieldArray[fieldIndex].textAlignment, "default")]); //horizontal align

    //Set Text Element X & Y -- Text 0,0 is lower right corner!
    var elemFontSize = parseInt(textElem.style('font-size'));
    console.log(groupId);
    var firstElemId = d3.select(groupId + ' text').attr('id'); //get the first textElem in the group

    if (firstElemId == textId) { //this is the first text element (usually label)

      textElem.attr('x', textX)
        .attr('y', elemFontSize);

    } else { //this is the second text element (usually value)

      var firstLineSize = parseInt(d3.select(groupId + ' text').style(
        'font-size'));
      textElem.attr('x', textX)
        .attr('y', (firstLineSize + 3) + elemFontSize);
    }

    return textElem;
  }

  /***********************************************************


 	***********************************************************/
  function setTextSize(element, passGroup, numOfField) {

    console.log(element.attr('id'));
    var translate = d3.transform(passGroup.attr("transform")).translate;
    var textMargin = translate[0] * 2; //TODO fix

    if (numOfField > 1) { //re-adjust the margin for multi-field values
      textMargin = 17;
    }

    var maxWidth = (315 / numOfField) - textMargin;
    var currentFontSize = parseInt(element.style('font-size'));
    var textLength = 0;
    var groupBBox = passGroup.node().getBoundingClientRect();
    var textWidth = element.node().getComputedTextLength();

    if (textWidth >= maxWidth) {
      console.log("maxField:" + maxWidth + " box too big: " + textWidth);
      element.style('font-size', function (d) {
        console.log(maxWidth / this.getComputedTextLength() *
          currentFontSize);
        return (maxWidth / this.getComputedTextLength() * currentFontSize) +
          "px";
      });

      textLength = element.node().getComputedTextLength();
      console.log("textLength " + textLength);

    } else { //Not bigger then maxWidth
      element.style('font-size', null);
      textLength = textWidth;
    }

    return textLength;

  }

  /***********************************************************
 	get the existing text group location, then remove it.

 	***********************************************************/
  function removeTextGroup(fieldType, idIndex) {

    //remove group if it already exists
    var textGroup = d3.select("g#" + fieldType + idIndex);
    var groupLoc = 'translate(0,0)';

    if (!textGroup.empty()) {

      //get the existing group location
      groupLoc = textGroup.attr('transform');
      textGroup.remove(); //remove the group

      console.log("remove: g#" + fieldType + idIndex);
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
      fdate = new Date(fieldGroup.value);
      fieldElement.text(dateFormat(fdate)); //set value text as date

    } else if (fieldGroup.timeStyle != undefined) {

      //format and set date if value is a date example: 2013-04-24T10:00-05:00
      var timeFormat = pKTimeTojsTime[fieldGroup.timeStyle]();
      fdate = new Date(fieldGroup.value);
      fieldElement.text(timeFormat(fdate)); //set value text as time

    } else if (fieldGroup.numberStyle != undefined) {

      var numberFormat = pKNumberToJs[fieldGroup.numberStyle]();
      fieldElement.text(numberFormat(Number(fieldGroup.value))); //set value text as number

    } else if (fieldGroup.currencyCode != undefined) {

      props = {
        style: "currency",
        currency: fieldGroup.currencyCode
      };

      var fieldNumber = Number(fieldGroup.value);
      //display output
      var currencyValue = fieldNumber.toLocaleString("en", props);
      console.log("---------->" + currencyValue);

      fieldElement.text(currencyValue); //set value text as currency


    } else {

      fieldElement.text(fieldGroup.value); //set value text as plain text
    }

    //align text in field
    //fieldElement.style('text-anchor', pKValueToCSS(fieldGroup.textAlignment));

  }

  /***********************************************************
 	 Get the rectangle bbox before the text update. Sometimes null

 	***********************************************************/
  function getRectBBox(fieldType, idIndex) {

    var width = 0;
    var height = 0;
    var rect = d3.select("g#" + fieldType + idIndex + " rect");
    if (!rect.empty()) {

      width = Number(rect.attr('width'));
      height = Number(rect.attr('height'));

    }

    var bBox = {
      "width": width,
      "height": height
    };

    return bBox;


  }

  /***********************************************************
 	Tests whether a json field is undefined and if it is not
 	sets it to "" or to a default.

 	***********************************************************/
  function valueOrDefault(val, def) {
    if (def == undefined) def = "";
    return val == undefined ? def : val;
  }

  /***********************************************************



***********************************************************/
  function show() {
    for (var i = 0; i < arguments.length; i++) {
      arguments[i].style("display", "inline");
    }
  }

  /***********************************************************



***********************************************************/
  function hide() {
    for (var i = 0; i < arguments.length; i++) {
      arguments[i].style("display", "none");
    }
  }

  /***********************************************************



***********************************************************/
  function enable() {
    for (var i = 0; i < arguments.length; i++) {
      arguments[i].attr('disabled', null);
    }
  }

  /***********************************************************



***********************************************************/
  function disable() {
    for (var i = 0; i < arguments.length; i++) {
      arguments[i].attr('disabled', true);
    }
  }


  /***********************************************************


	***********************************************************/
  function configTextInputs() {

    console.log(editGroup);
    console.log(passTemplate.keyDoc[passType][editGroup.dataType]);

    //set to "" if label/value is undefined
    var targetLabel = valueOrDefault(passTemplate.keyDoc[passType][editGroup.dataType][editGroup.dataIndex].label);
    var targetValue = valueOrDefault(passTemplate.keyDoc[passType][editGroup.dataType][editGroup.dataIndex].value);

    //update the legend in popover to display the id of the field
    d3.select("div#legend-header")
      .text(editGroup.dataType);

    //set the input box attributes for the label
    var inputLabel = d3.select("#popLabel")
      .property('value', targetLabel)
      .call(enable);

    //set the input box attributes for the value
    var inputValue = d3.select("#popValue")
      .property('value', targetValue)
      .call(enable);

  }

  /***********************************************************



 	***********************************************************/
  function setEditGroup(selection) {

    console.log(selection);

    //get the svg id and type of the text under the button
    var svgGroupId = d3.select(selection.parentNode).attr("id");
    var svgGroupType = svgGroupId.slice(0, -1); //get the group type: aux
    var svgGroupNum = parseInt(svgGroupId.slice(-1));

    //get the field type and index for the keydoc
    var datafieldType = d3.select(selection).attr("data-target");
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

    //set and clear select highlight style with "select class"
    d3.selectAll("rect.text-btn-rect").attr("class", "text-btn-rect");
    d3.select(this).attr("class", "text-btn-rect select");

    if (passTemplate.keyDoc[passType][editGroup.dataType].length) {
      //setup text and attach handlers for text input controls
      configTextInputs();
    }
    //enable select inputs and buttons
    enable(d3.select("#value-format"), d3.select("#btn-del-field"), d3.select(
      "#btn-add-field"));

    //disable the add button if there are 4 fields
    if (passTemplate.keyDoc[passType][editGroup.dataType].length >= 4) {
      d3.select("button#btn-add-field").call(disable);
    } else if (passTemplate.keyDoc[passType][editGroup.dataType].length <= 0) { //disable the delete button if there are 0 fields
      d3.select("button#btn-del-field").call(disable);
    }

  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onDelField() {

    d3.event.preventDefault();

    //get array length before removal of data field
    var arrayLength = passTemplate.keyDoc[passType][editGroup.dataType].length;
    //remove this field data from the keyDoc
    passTemplate.keyDoc[passType][editGroup.dataType].splice(editGroup.dataIndex, 1);

    //hide last field on svg
    var idLastField = editGroup.svgType + arrayLength; //get the index of the last field on the pass
    if (arrayLength <= 1) { //keep the last rect for adding the field type back.

      hide(d3.select("#" + idLastField + " text.label-text"), d3.select("#" +
        idLastField + " text.value-text"));

    } else {
      //hide this value, but keep it in the svg markup for adding
      hide(d3.select("#" + idLastField));
    }

    //set group num
    var groupNum = editGroup.svgNum;
    if (editGroup.svgNum > passTemplate.keyDoc[passType][editGroup.dataType].length) {
      groupNum = passTemplate.keyDoc[passType][editGroup.dataType].length;
    }

    //select the previous field on the pass, if there are more then 0
    var previousField = editGroup.svgType + groupNum;
    console.log("prevField=" + previousField);
    if (groupNum > 0) {

      //set select group to the previous rectangle
      setEditGroup(d3.select('g#' + previousField + ' rect')[0][0]);

      //reset legend after delete
      d3.select("div#legend-header")
        .text(editGroup.dataType);

      //update svg text
      setPassFields(passTemplate.keyDoc[passType][editGroup.dataType], editGroup.svgType);

      configTextInputs();

      //set text color, or the field text won't show up
      $(".pass-template .value-text").css("fill", passTemplate.keyDoc.foregroundColor);
      $(".pass-template .label-text").css("fill", passTemplate.keyDoc.labelColor);

      //set and clear select highlight style with "select class"
      d3.selectAll("rect.text-btn-rect")
        .attr("class", "text-btn-rect");

      d3.select('g#' + editGroup.svgId + ' rect')
        .attr("class", "text-btn-rect select");

      //enable all buttons
      enable(d3.select("button#btn-del-field"), d3.select("button#btn-add-field"));

    } else {

      //disable setting control
      d3.select("#popLabel").call(disable).property('value', "");
      d3.select("#popValue").call(disable).property('value', "");
      d3.select("select#value-format").call(disable);
      d3.select("button#btn-del-field").call(disable);
    }

  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onAddField() {

    d3.event.preventDefault(); //prevent form submit

    //set new field index
    var newSvgGroupIndex = editGroup.svgNum; //only increment if field data exists
    if (passTemplate.keyDoc[passType][editGroup.dataType].length) {
      var newSvgGroupIndex = editGroup.svgNum + 1;
    }

    var keyValue = editGroup.svgType + newSvgGroupIndex; //example: aux4
    console.log("addField:Keyvalue=" + keyValue);

    //set select group to the new rectangle
    setEditGroup(d3.select('g#' + keyValue + ' rect')[0][0]); //http://bost.ocks.org/mike/selection/#subclass

    //1 add empty data to keydoc (with filler text?)
    var fieldData = {
      "key": keyValue,
      "label": "LABEL", //placeholder text for a new field
      "value": "value"
    };

    //update the text for the "new" svg group
    passTemplate.keyDoc[passType][editGroup.dataType].splice(editGroup.dataIndex, 0, fieldData);

    //passTemplate.keyDoc[passType][editGroup.dataType][editGroup.dataIndex] = fieldData //set value into keyDoc
    setPassFields(passTemplate.keyDoc[passType][editGroup.dataType], editGroup.svgType);

    //set and clear select highlight style with "select class"
    d3.selectAll("rect.text-btn-rect").attr("class", "text-btn-rect");
    d3.select('g#' + editGroup.svgId + ' rect').attr("class",
      "text-btn-rect select");

    //set text color
    $(".pass-template .value-text").css("fill", passTemplate.keyDoc.foregroundColor);
    $(".pass-template .label-text").css("fill", passTemplate.keyDoc.labelColor);

    //display the group
    var valueText = d3.select("#" + keyValue + " text.value-text"),
      labelText = d3.select("#" + keyValue + " text.label-text"),
      valueElem = d3.select("#" + keyValue);

    show(valueText, labelText, valueElem);

    //configure controls

    //reset legend
    d3.select("div#legend-header")
      .text(editGroup.dataType);

    //enable and clear setting control
    d3.select("#popLabel").call(enable).property('value', fieldData.label);
    d3.select("#popValue").call(enable).property('value', fieldData.value);

    //enable all buttons
    enable(d3.select("button#btn-del-field"), d3.select("button#btn-add-field"));

    //disable the add button if there are 4 fields
    if (passTemplate.keyDoc[passType][editGroup.dataType].length >= 4) {
      d3.select("button#btn-add-field").call(disable);
    }


  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onValueFormat() {

    //var valueSelect = d3.select("select#value-format");

    var selectOption = this.value;

    //destroy since we might be switching from other option
    $('#popValue').datetimepicker('destroy');

    console.log("--->" + selectOption);
    //add/remove a second selector as needed
    if (selectOption == "Number") {

      hide(d3.select("#currency"), d3.select("#timeDate-format"));
      show(d3.select("#number-format"));


    } else if (selectOption == "Time") {

      hide(d3.select("#currency"), d3.select("#number-format"));
      show(d3.select("#timeDate-format"));

      //setup time picker
      $('#popValue').datetimepicker({
        datepicker: false,
        format: 'g:i A',
        formatTimeScroller: 'g:i A' /*uppercase AM/PM now*/ ,
        step: 15,
        onChangeDateTime: onTextSubmit,
      });

    } else if (selectOption == "Date") {

      //setup date picker
      $('#popValue').datetimepicker({
        timepicker: false,
        format: 'Y/m/d',
        onChangeDateTime: onTextSubmit,
      });

      hide(d3.select("#currency"), d3.select("#number-format"));
      show(d3.select("#timeDate-format"));

    } else if (selectOption == "Currency") {

      hide(d3.select("#timeDate-format"), d3.select("#number-format"));

      var url = "/assets/data/currency.html";
      var uri = encodeURI(url);
      console.log(uri);

      //load svg xml + place into document
      d3.html(uri, function (html) {

        d3.select("div#format-control").node().appendChild(html);
        //add handler for currency selector
        d3.select("#currency")
          .call(show)
          .on("input", function () {
            onCurrencyStyle(this.value);
          });

        //set the value to a default currency (USD)
        onCurrencyStyle($("#currency").val());


      });



    } else {
      hide(d3.select("#currency"), d3.select("#number-format"), d3.select(
        "#timeDate-format"));

    }


  }


  /***********************************************************

 	Handler

 	***********************************************************/
  function onTextSubmit(fieldData) {

    if (fieldData == undefined) {

      var fieldValue = $("input#popValue").val();
      var fieldLabel = $("input#popLabel").val().toUpperCase(); //get input box label
      var keyValue = editGroup.svgId;

      var fieldData = {
        "key": keyValue,
        "label": fieldLabel,
        "value": fieldValue
      };

    }

    console.log(fieldData);

    passTemplate.keyDoc[passType][editGroup.dataType][editGroup.dataIndex] = fieldData; //set value into keyDoc
    setPassFields(passTemplate.keyDoc[passType][editGroup.dataType], editGroup.svgType); //update svg fields

    //set and clear select highlight style with "select class"
    d3.selectAll("rect.text-btn-rect").attr("class", "text-btn-rect");
    d3.select('g#' + editGroup.svgId + ' rect').attr("class", "text-btn-rect select");

    //set text color
    $(".pass-template .value-text").css("fill", passTemplate.keyDoc.foregroundColor);
    $(".pass-template .label-text").css("fill", passTemplate.keyDoc.labelColor);

    console.log(editGroup.dataType);

  }

  /***********************************************************

 	Handler

 	***********************************************************/
  function onCurrencyStyle(value) {

    var fieldValue = Number($("input#popValue").val());
    var currencyCode = value;
    var fieldLabel = $("input#popLabel").val(); //get input box label

    var keyValue = editGroup.svgId;
    //console.log(currencyCode);

    //props = {
    //	style: "currency",
    //	currency: currencyCode
    //};

    //display output
    //var currencyText = fieldValue.toLocaleString("en", props);
    //console.log(currencyText);

    var fieldData = {
      "key": keyValue,
      "currencyCode": currencyCode,
      "label": fieldLabel,
      "value": fieldValue
    };

    onTextSubmit(fieldData);

  }

  /***********************************************************

 Handler

 ***********************************************************/
  function onNumberStyle(value) {

    var numberFormat = value;
    var pkNumStyle = selectToPKNumber[numberFormat]

    var fieldValue = Number($("input#popValue").val());
    var fieldLabel = $("input#popLabel").val(); //get input box label

    var keyValue = editGroup.svgId;

    var fieldData = {
      "key": keyValue,
      "numberStyle": pkNumStyle,
      "label": fieldLabel,
      "value": fieldValue
    };

    onTextSubmit(fieldData);

  }



  //////////////////////////////////////////////////////////////////////////
  //
  // Public Functions
  //
  //
  //////////////////////////////////////////////////////////////////////////

  /* setup and configure text input handlers */
  passFields.init = function () {
    init();
  };

  /* set svg text fields to match pass json data */
  passFields.set = function (fieldArray, fieldType) {
    setPassFields(fieldArray, fieldType);
  };

  /* handler for on rect click */
  passFields.onRectClick = function () {
    onTextRectClick();
  };

  /* handler for on text submit */
  passFields.onSubmit = function () {
    onTextSubmit();
  };

  return passFields; //return the image object

}(passFields = window.passFields || {}, jQuery));