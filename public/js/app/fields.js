(function(passFields, $, undefined) {

	var editGroup = {
		'svgId': "", //svg id of group
		'svgType': "", //svg group type: second
		'svgNum': "", //svg group num: 1
		'dataType': "", //keydoc field type: secondaryField
		'dataIndex': "" //keydoc array index value
	};


	/***********************************************************
 	add text elements and set values and labels for each field
 
 	***********************************************************/
	function setPassFields(fieldArray, fieldType) {

		//if field array exists or not
		if (typeof fieldArray !== "undefined") {

			var fieldPKType = pkFieldType(fieldType); //auxiliaryFields

			for (var index = 0; index < fieldArray.length; ++index) {

				var idIndex = index + 1; //id count starts at 1. 

				var originalRect = getRectBBox(fieldType, idIndex); //Sometimes null, but then not needed.
				console.log("--->Orect " + originalRect.width + " " + originalRect.height)

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


				//make rect for hovering - size of group element
				var rect = passGroup.append('rect')
					.attr('class', 'text-btn-rect')
					.attr('data-target', fieldPKType)
					.attr('width', rectWidth)
					.attr('height', rectHeight)
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
		var fieldPKType = pkFieldType(fieldType); //auxiliaryFields
		var textX = 0; //the relative position of the text inside the group
		var textY = 0;

		//Add Text Element
		var textElem = passGroup
			.insert('text', groupId + 'rect.text-btn-rect')
			.attr('id', textId)
			.classed(JSON.parse('{ "' + textType + '-text": true,"' + fieldPKType + '": true }')) //add classes label-text and fieldType
			.attr('text-anchor', pKValueToSVG(fieldArray[fieldIndex].textAlignment)); //horizontal align

		//Set Text Element X & Y
		var elemFontSize = parseInt(textElem.style('font-size'));
		console.log(groupId);
		var firstElemId = d3.select(groupId + ' text').attr('id'); //get the first textElem in the group

		if (firstElemId == textId) { //this is the first text element (usually label)

			textElem.attr('x', textX)
				.attr('y', elemFontSize);

		} else { //this is the second text element (usually value)

			var firstLineSize = parseInt(d3.select(groupId + ' text').style('font-size'));
			textElem.attr('x', textX)
				.attr('y', (firstLineSize + 10) + elemFontSize);
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
			element.style('font-size', function(d) {
				console.log(maxWidth / this.getComputedTextLength() * currentFontSize);
				return (maxWidth / this.getComputedTextLength() * currentFontSize) + "px";
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
			var dateFormat = pKDateTojsDate(fieldGroup.dateStyle);
			fdate = new Date(fieldGroup.value);
			fieldElement.text(dateFormat(fdate)); //set value text as date

		} else if (fieldGroup.timeStyle != undefined) {

			//format and set date if value is a date example: 2013-04-24T10:00-05:00
			var timeFormat = pKTimeTojsTime(fieldGroup.timeStyle);
			fdate = new Date(fieldGroup.value);
			fieldElement.text(timeFormat(fdate)); //set value text as time

		} else if (fieldGroup.numberStyle != undefined) {

			var numberFormat = pKNumberToJs(fieldGroup.numberStyle);
			fieldElement.text(numberFormat(fieldGroup.value)); //set value text as number

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
 	convert apple PK constant to js number format
 
 	***********************************************************/
	function pKNumberToJs(val) {

		switch (val) {
			case undefined:
				return d3.format("");;
			case "None":
				return d3.format("");;
			case "PKNumberStyleDecimal":
				return d3.format(".4r"); //13.00
			case "PKNumberStylePercent":
				return d3.format("%"); //multiply by 100 and suffix with "%"
			case "PKNumberStyleScientific":
				return d3.format(".3n"); //1.33e+5
			case "PKNumberStyleSpellOut":
				return d3.format("%A, %B %e, %Y AD");
			default:
				return d3.format("");;
		}

	}


	/***********************************************************
 	convert apple PK constant to css
 
 	***********************************************************/
	function pKValueToSVG(val) {

		switch (val) {
			case undefined:
				return "inherit";
			case "PKTextAlignmentLeft":
				return "start";
			case "PKTextAlignmentCenter":
				return "middle";
			case "PKTextAlignmentRight":
				return "end";
			case "PKTextAlignmentNatural":
				return "inherit";
			default:
				return "inherit";
		}

	}
	/***********************************************************
 	convert apple PK constant to js date
 
 	***********************************************************/
	function pKDateTojsDate(val) {

		switch (val) {
			case undefined:
				return d3.time.format("");
			case "PKDateStyleNone":
				return d3.time.format("");
			case "PKDateStyleShort":
				return d3.time.format("%_m/%e/%y");
			case "PKDateStyleMedium":
				return d3.time.format("%b %e, %Y");
			case "PKDateStyleLong":
				return d3.time.format("%B %e, %Y");
			case "PKDateStyleFull":
				return d3.time.format("%A, %B %e, %Y AD");
			default:
				return d3.time.format("");
		}

	}
	/***********************************************************
 	convert apple PK constant to js time
 
 	***********************************************************/
	function pKTimeTojsTime(val) {

		switch (val) {
			case undefined:
				return d3.time.format("");
			case "PKDateStyleNone":
				return d3.time.format("");
			case "PKDateStyleShort":
				return d3.time.format("%_I:%M %p");
			case "PKDateStyleMedium":
				return d3.time.format("%_I:%M:%S %p");
			case "PKDateStyleLong":
				return d3.time.format("%_I:%M:%S %p %Z"); //TODO - Implement time zones as text
			case "PKDateStyleFull":
				return d3.time.format("%_I:%M:%S %p %Z");
			default:
				return d3.time.format("");
		}

	}

	/***********************************************************
 
 
	***********************************************************/
	function pkFieldType(fieldType) {

		switch (fieldType) {
			case undefined:
				return "";
			case "aux":
				return "auxiliaryFields";
			case "second":
				return "secondaryFields";
			case "header":
				return "headerFields";
			case "primary":
				return "primaryFields";
			default:
				return "";
		}

	}

	/***********************************************************
 
 
	***********************************************************/
	function configTextInputs() {

		//set to "" if label/value is undefined
		var targetLabel = valueOrDefault(passTemplate.keyDoc[passType][editGroup.dataType][editGroup.dataIndex].label);
		var targetValue = valueOrDefault(passTemplate.keyDoc[passType][editGroup.dataType][editGroup.dataIndex].value);

		//update the legend in popover to display the id of the field
		d3.select("form#pop-text legend")
			.text(editGroup.dataType);

		//set the input box attributes for the label
		var inputLabel = d3.select("#popLabel")
			.on("input", null) //clear the event
			.property('value', targetLabel)
			.attr('disabled', null)
			.on("input", onTextSubmit); //add input event

		//set the input box attributes for the value
		var inputValue = d3.select("#popValue")
			.on("input", null)
			.property('value', targetValue)
			.attr('disabled', null)
			.on("input", onTextSubmit); //add input event

	}

	/***********************************************************
 
 
	***********************************************************/
	function configSelectInputs() {

		//add events for selecting value format selector options
		var valueSelect = d3.select("select#value-format")
			.on("input", null)
			.attr('disabled', null)
			.on("input", onValueFormat);

		//add handler for delete field button
		var delButton = d3.select("button#btn-del-field")
			.attr('disabled', null)
			.on("click", onDelField);

		//add handler for delete field button
		var delButton = d3.select("button#btn-add-field")
			.attr('disabled', null)
			.on("click", onAddField);

	}

	/***********************************************************
 
 	

 	***********************************************************/
	function setEditGroup(selection) {

		console.log(selection);

		//get the svg id and type of the text under the button
		var svgGroupId = d3.select(selection.parentNode).attr("id");
		var svgGroupType = svgGroupId.slice(0, -1); //get the group type: aux
		var svgGroupNum = Number(svgGroupId.slice(-1));

		//get the field type and index for the keydoc
		var datafieldType = d3.select(selection).attr("data-target");
		var dataGroupIndex = Number(svgGroupId.slice(-1)) - 1; //get the group index value, & subtract 1

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

		//currentEditTarget = d3.select(this).attr("data-target");
		//targetGroupId = d3.select(this.parentNode).attr("id");
		//var groupIndex = targetGroupId.slice(-1) - 1; //get the group index value, & subtract 1

		//set and clear select highlight style with "select class"
		d3.selectAll("rect.text-btn-rect").attr("class", "text-btn-rect");
		d3.select(this).attr("class", "text-btn-rect select");

		//setup text and attach handlers for text input controls
		configTextInputs();
		//enable and attach handlers for select and buttons
		configSelectInputs();

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
			d3.select("#" + idLastField + " text.label-text").style("display", "none"); //label
			d3.select("#" + idLastField + " text.value-text").style("display", "none"); //value
		} else {
			//hide this value, but keep it in the svg markup for adding
			d3.select("#" + idLastField).style("display", "none");
		}

		var groupNum = editGroup.svgNum;
		if (editGroup.svgNum > passTemplate.keyDoc[passType][editGroup.dataType].length) {
			groupNum = passTemplate.keyDoc[passType][editGroup.dataType].length;
		}

		var previousField = editGroup.svgType + groupNum;
		console.log("prevField=" + previousField);
		setEditGroup(d3.select('g#' + previousField + ' rect')[0][0]);

		//reset legend after delete
		d3.select("form#pop-text legend")
			.text(editGroup.dataType);

		//disable setting control
		//d3.select("#popLabel").attr('disabled', true).property('value', "");
		//d3.select("#popValue").attr('disabled', true).property('value', "");
		//d3.select("select#value-format").attr('disabled', true);
		//d3.select("button#btn-del-field").attr('disabled', true);

		//passTemplate.keyDoc[passType][currentEditTarget][groupArrayIndex] = fieldData //set value into keyDoc 

		//update text
		setPassFields(passTemplate.keyDoc[passType][editGroup.dataType], editGroup.svgType);

		configTextInputs();

		//set text color, or the field text won't show up
		$(".pass-template .value-text").css("fill", passTemplate.keyDoc.foregroundColor);
		$(".pass-template .label-text").css("fill", passTemplate.keyDoc.labelColor);

		//set and clear select highlight style with "select class"
		d3.selectAll("rect.text-btn-rect").attr("class", "text-btn-rect");
		d3.select('g#' + editGroup.svgId + ' rect').attr("class", "text-btn-rect select");



	}

	/***********************************************************
 
 	Handler

 	***********************************************************/
	function onAddField() {

		d3.event.preventDefault(); //prevent form submit


		var newSvgGroupIndex = editGroup.svgNum + 1; //increment 1
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
		//onTextSubmit(fieldData);

		passTemplate.keyDoc[passType][editGroup.dataType].splice(editGroup.dataIndex, 0, fieldData);

		//passTemplate.keyDoc[passType][editGroup.dataType][editGroup.dataIndex] = fieldData //set value into keyDoc 
		setPassFields(passTemplate.keyDoc[passType][editGroup.dataType], editGroup.svgType);

		//set and clear select highlight style with "select class"
		d3.selectAll("rect.text-btn-rect").attr("class", "text-btn-rect");
		d3.select('g#' + editGroup.svgId + ' rect').attr("class", "text-btn-rect select");

		//set text color
		$(".pass-template .value-text").css("fill", passTemplate.keyDoc.foregroundColor);
		$(".pass-template .label-text").css("fill", passTemplate.keyDoc.labelColor);

		//display the group
		d3.select("#" + keyValue + " text.label-text").style("display", "inline"); //label
		d3.select("#" + keyValue + " text.value-text").style("display", "inline"); //value
		d3.select("#" + keyValue).style("display", "inline");

		//configure controls

		//reset legend
		d3.select("form#pop-text legend")
			.text(editGroup.dataType);

		//enable and clear setting control
		d3.select("#popLabel").attr('disabled', null).property('value', fieldData.label);
		d3.select("#popValue").attr('disabled', null).property('value', fieldData.value);
		//d3.select("select#value-format").attr('disabled', null);
		//d3.select("button#btn-del-field").attr('disabled', null);
		//set and clear select highlight style with "select class"
		//d3.selectAll("rect.text-btn-rect").attr("class", "text-btn-rect");
		//d3.select('g#' + keyValue + ' rect').attr("class", "text-btn-rect select");


		/*
		//currentEditTarget = d3.select(this).attr("data-target");
		console.log("-->AddField " + editGroup.svgGroupId);
		var svgGroupNumber = Number(editGroup.svgGroupId.slice(-1)) + 1; //get the group index value, & add 1
		//var groupType = targetGroupId.slice(0, -1); //get the group type: aux

		targetGroupId = groupType + groupNumber;
		var groupIndex = targetGroupId.slice(-1) - 1; //get the group index value, & subtract 1

		var arrayLength = passTemplate.keyDoc[passType][editGroup.dataType].length + 1;

		//get the index of the last field on the pass before removal of a field 
		var idLastField = groupType + arrayLength;

		if (arrayLength <= 1) { //keep the last rect for adding the field type back.
			d3.select("#" + idLastField + " text.label-text").style("display", "inline"); //label
			d3.select("#" + idLastField + " text.value-text").style("display", "inline"); //value
		} else {
			//hide this value, but keep it in the svg markup for adding
			d3.select("#" + idLastField).style("display", "inline");
		}

		//set text on svg to none
		d3.select("#" + idLastField + " text.label-text").text(""); //label
		d3.select("#" + idLastField + " text.value-text").text(""); //value

		//reset legend
		d3.select("form#pop-text legend")
			.text(currentEditTarget);

		//disable setting control
		d3.select("#popLabel").attr('disabled', null).property('value', "");
		d3.select("#popValue").attr('disabled', null).property('value', "");
		d3.select("select#value-format").attr('disabled', null);
		d3.select("button#btn-del-field").attr('disabled', null);

		var keyValue = targetGroupId;
		var fieldData = {
			"key": keyValue,
			"label": "",
			"value": ""
		};

		onTextSubmit(fieldData);

		//setup text and attach handlers for text input controls
		configTextInputs(groupIndex);
		//setup text and attach handlers for text input controls
		//configInputControls(groupNumber - 1);
		configSelectInputs();

		//passTemplate.keyDoc[passType][currentEditTarget][groupArrayIndex] = fieldData //set value into keyDoc 
		//setPassFields(passTemplate.keyDoc[passType][currentEditTarget], groupType);

		//set text color, or the field text won't show up
		$(".pass-template .value-text").css("fill", passTemplate.keyDoc.foregroundColor);
		$(".pass-template .label-text").css("fill", passTemplate.keyDoc.labelColor);
*/
	}

	/***********************************************************
 
 	Handler

 	***********************************************************/
	function onValueFormat() {

		var valueSelect = d3.select("select#value-format");

		var selectOption = valueSelect.value

		//destroy since we might be switching from other option
		$('#popValue').datetimepicker('destroy');


		//add/remove a second selector as needed
		if (selectOption == "Number") {

			d3.select("#currency").style("display", "none");
			d3.select("#timeDate-format").style("display", "none");
			d3.select("#number-format")
				.style("display", "inline")
				.on("input", function() {


				});

		} else if (selectOption == "Time") {

			d3.select("#currency").style("display", "none");
			d3.select("#number-format").style("display", "none");
			d3.select("#timeDate-format")
				.style("display", "inline")
				.on("input", function() {
					//this.value 

				});

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
				mask: true,
				format: 'Y/m/d',
				onChangeDateTime: onTextSubmit,
			});

			d3.select("#currency").style("display", "none");
			d3.select("#number-format").style("display", "none");
			d3.select("#timeDate-format").style("display", "inline");

		} else if (selectOption == "Currency") {

			d3.select("#number-format").style("display", "none");
			d3.select("#timeDate-format").style("display", "none");

			var url = "/assets/data/currency.html";
			var uri = encodeURI(url);
			console.log(uri);

			//load svg xml + place into document
			d3.html(uri, function(html) {

				d3.select("div#format-control").node().appendChild(html);

				d3.select("#currency")
					.style("display", "inline")
					.on("input", onCurrencySubmit);

			});



		} else {

			d3.select("#timeDate-format").style("display", "none");
			d3.select("#number-format").style("display", "none");
			d3.select("#currency").style("display", "none");
		}


	}


	/***********************************************************
 
 	Handler

 	***********************************************************/
	function onTextSubmit(fieldData) {

		if (fieldData == undefined) {

			var fieldValue = $("input#popValue").val();
			var fieldLabel = $("input#popLabel").val(); //get input box label
			var keyValue = editGroup.svgId;

			var fieldData = {
				"key": keyValue,
				"label": fieldLabel,
				"value": fieldValue
			};

		}

		console.log(fieldData);

		//var groupType = targetGroupId.slice(0, -1); //get the group type: aux
		//var groupIndex = targetGroupId.slice(-1) - 1; //get the group index value, & subtract 1

		passTemplate.keyDoc[passType][editGroup.dataType][editGroup.dataIndex] = fieldData //set value into keyDoc 
		setPassFields(passTemplate.keyDoc[passType][editGroup.dataType], editGroup.svgType);

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
	function onCurrencySubmit() {

		var fieldValue = Number($("input#popValue").val());
		var currencyCode = $("select#currency").val();
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



	//////////////////////////////////////////////////////////////////////////
	//
	// Public Functions
	//
	//
	//////////////////////////////////////////////////////////////////////////

	/* set svg text fields to match pass json data */
	passFields.set = function(fieldArray, fieldType) {
		setPassFields(fieldArray, fieldType);
	};

	/* handler for on rect click */
	passFields.onRectClick = function() {
		onTextRectClick();
	};

	/* handler for on text submit */
	passFields.onSubmit = function() {
		onTextSubmit();
	};

	return passFields; //return the image object

}(passFields = window.passFields || {}, jQuery));