(function(passFields, $, undefined) {

	/***********************************************************
 	add text elements and set values and labels for each field
 
 	***********************************************************/
	function setPassFields(fieldArray, fieldType) {

		//if field array exists or not
		if (typeof fieldArray !== "undefined") {

			var fieldPKType = pkFieldType(fieldType); //auxiliaryFields

			for (var index = 0; index < fieldArray.length; ++index) {

				var idIndex = index + 1; //id count starts at 1. 

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
					var valueElem = addText("value", passGroup, fieldType, fieldArray, index);
					//Add Label Element
					var labelElem = addText("label", passGroup, fieldType, fieldArray, index);

				} else if (passType == "storeCard" && fieldType == "primary") {
					//TODO: This seems stupid, must be a better way to make this exception for 2 types of passes. 

					//Add Value Element
					var valueElem = addText("value", passGroup, fieldType, fieldArray, index);
					//Add Label Element
					var labelElem = addText("label", passGroup, fieldType, fieldArray, index);

				} else { //all other fields are label then value

					//Add Label Element
					var labelElem = addText("label", passGroup, fieldType, fieldArray, index);
					//Add Value Element
					var valueElem = addText("value", passGroup, fieldType, fieldArray, index);

				}

				labelElem.text(valueOrDefault(fieldArray[index].label)) //set label text
				setFormatValueField(valueElem, fieldArray[index]); //set value text

				//get group bounding box size
				var el = document.getElementById(fieldType + idIndex);
				var rectBBox = el.getBoundingClientRect();

				console.log(rectBBox.width + " " + rectBBox.height)

				var labelWidth = setTextSize(labelElem, passGroup, fieldArray.length);
				var valueWidth = setTextSize(valueElem, passGroup, fieldArray.length);

				var rectWidth; //rect width is assigned to whichever is wider
				if (labelWidth >= valueWidth) {
					rectWidth = labelWidth;
				} else {
					rectWidth = valueWidth;
				}

				//make rect for hovering - size of group element
				var rect = passGroup.append('rect')
					.attr('class', 'text-btn-rect')
					.attr('data-target', fieldPKType)
					.attr('width', rectWidth)
					.attr('height', rectBBox.height)
					.on("click", onTextRectClick); //add event to new rect

			}

		}
	}

	/***********************************************************
 
 
 	***********************************************************/
	function addText(textType, passGroup, fieldType, fieldArray, fieldIndex) {

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

			console.log("g#" + fieldType + idIndex);
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
 
 	Handler

 	***********************************************************/
	function onTextRectClick() {

		//get the id of the text under the button
		currentEditTarget = d3.select(this).attr("data-target");
		targetGroupId = d3.select(this.parentNode).attr("id");
		var groupIndex = targetGroupId.slice(-1) - 1; //get the group index value, & subtract 1

		var selectClassType = d3.select(this).attr("class");


		//update the legend in popover to display the id of the field
		d3.select("form#pop-text legend")
			.text(currentEditTarget);

		//var targetLabel = d3.select("g#" + targetGroupId + " .label-text." + currentEditTarget).text();
		var targetLabel = passTemplate.keyDoc[passType][currentEditTarget][groupIndex].label;
		console.log(targetLabel);
		//set the input box attributes for the label
		d3.select("#popLabel")
			.on("input", null) //clear the event
		.property('value', targetLabel)
			.attr('disabled', null)
			.on("input", onTextSubmit); //add input event

		var targetValue = passTemplate.keyDoc[passType][currentEditTarget][groupIndex].value;
		//var targetValue = d3.select("g#" + targetGroupId + " .value-text." + currentEditTarget).text();
		//set the input box attributes for the value
		var inputValue = d3.select("#popValue")
			.on("input", null)
			.property('value', targetValue)
			.attr('disabled', null)
			.on("input", onTextSubmit); //add input event

		//add events for selecting value format selector options
		var valueSelect = d3.select("select#value-format")
			.on("input", null)
			.attr('disabled', null)
			.on("input", function() {

				//destroy since we might be switching from other option
				$('#popValue').datetimepicker('destroy');


				//add/remove a second selector as needed
				if (this.value == "Number") {

					d3.select("#currency").style("display", "none");
					d3.select("#timeDate-format").style("display", "none");
					d3.select("#number-format")
						.style("display", "inline")
						.on("input", function() {


						});

				} else if (this.value == "Time") {

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

				} else if (this.value == "Date") {

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

				} else if (this.value == "Currency") {

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

			});
	}


	/***********************************************************
 
 	Handler

 	***********************************************************/
	function onTextSubmit(fieldData) {

		if (fieldData == undefined) {

			var fieldValue = $("input#popValue").val();
			var fieldLabel = $("input#popLabel").val(); //get input box label
			var keyValue = targetGroupId;

			var fieldData = {
				"key": keyValue,
				"label": fieldLabel,
				"value": fieldValue
			};

		}

		console.log(fieldData);

		var groupType = targetGroupId.slice(0, -1); //get the group type: aux
		var groupIndex = targetGroupId.slice(-1) - 1; //get the group index value, & subtract 1

		passTemplate.keyDoc[passType][currentEditTarget][groupIndex] = fieldData //set value into keyDoc 
		setPassFields(passTemplate.keyDoc[passType][currentEditTarget], groupType);

		//set text color
		$(".pass-template .value-text").css("fill", passTemplate.keyDoc.foregroundColor);
		$(".pass-template .label-text").css("fill", passTemplate.keyDoc.labelColor);

		console.log(currentEditTarget);

	}

	/***********************************************************
 
 	Handler

 	***********************************************************/
	function onCurrencySubmit() {

		var fieldValue = Number($("input#popValue").val());
		var currencyCode = $("select#currency").val();
		var fieldLabel = $("input#popLabel").val(); //get input box label

		var keyValue = targetGroupId;
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