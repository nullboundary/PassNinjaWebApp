(function(passBuilder, $, undefined) {

	var pageBeforeIndex,
		pageAfterIndex;

	/***********************************************************
 
 
 	***********************************************************/
	var init = function init() {

		var w = 500,
			h = 600,
			passType = "coupon",
			svg = d3.select("svg"),
			currentEditTarget, //which text field is being edited
			targetGroupId,
			passTemplate; //a json object containing all the pass data for this pass


		//init all color sliders for page 2
		configColorSlider(".rgb-label", ".label-text");
		configColorSlider(".rgb-value", ".value-text");
		configColorSlider(".rgb-background", ".pass-bg");

		//setup one page scroll
		$(".main").onepage_scroll({
			sectionContainer: "section",
			updateURL: true,
			responsiveFallback: false,
			pagination: true,
			keyboard: true,
			direction: "vertical",
			loop: false,
			beforeMove: onBeforeScroll,
			afterMove: onAfterScroll
		});

		//don't submit form for popover tip selection buttons
		$(document).on("click", ".select-button", function(e) {
			e.preventDefault();
			//var btn = $(this);
			//if (btn.val())
		});

		//Click Text Popover Ok 
		$(document).on("click", "#bar-pop-btn", onBarcodeSubmit);

		//Select PassType
		$(document).on("click", ".pass-thumb-select", onSelectType);

		//Click Next Page Button
		$(document).on("click", "#next-button", onNextPage);

		d3.select('select#barcode-format')
			.on('input', onBarcodeSelect);



	}

	/***********************************************************
 
 
 	***********************************************************/
	function onBeforeScroll(index) {

		if (pageBeforeIndex != index) { //prevent handler being called twice per scroll.

			pageBeforeIndex = index;
			console.log("before " + index);
			if (index == 3) { //page 2 is get started

				getStartedSubmit();

			} else if (index == 4) { //page 3 is colors

				onColorSave();
			}
		}
	}
	/***********************************************************
 
 
 	***********************************************************/
	function onAfterScroll(index) {

		if (pageAfterIndex != index) { //prevent handler being called twice per scroll.
			pageAfterIndex = index;
			console.log("after " + index);

			if (index == 3) { //color adjust page

			} else if (index == 6) { //set image popover


			} else if (index == 8) { //set text input popover

			}

		}
	}
	/***********************************************************
 
 
 	***********************************************************/
	function getStartedSubmit() {

		var orgName = $("#org-name").val();
		orgStr = orgName.replace(/\s|\./g, '').toLowerCase();
		var passName = $("#pass-name").val().replace(/\s|\./g, '').toLowerCase();
		var passDesc = $("#pass-desc").val();

		var passId = orgStr + "." + passName;


		passTemplate.id = "pass.ninja." + passId + "." + passType;
		passTemplate.keyDoc.description = passDesc;
		passTemplate.keyDoc.organizationName = orgName;


	}

	/***********************************************************
 		Build a new SVG pass representation from the data
 
 	***********************************************************/
	function initNewPass() {

		//passTemplate
		console.log("passType " + passType);

		setPassImages();

		setPassFields(passTemplate.keyDoc[passType].primaryFields, "primary");
		setPassFields(passTemplate.keyDoc[passType].headerFields, "header"); //set header fields
		setPassFields(passTemplate.keyDoc[passType].secondaryFields, "second"); //set secondary fields
		setPassFields(passTemplate.keyDoc[passType].auxiliaryFields, "aux"); //set auxiliary fields 

		//keydoc top level
		$("text.logo-text").text(passTemplate.keyDoc.logoText);

		//set color sliders to match keydoc
		$(".rgb-label").trigger("colorpickersliders.updateColor", passTemplate.keyDoc.labelColor);
		$(".rgb-value").trigger("colorpickersliders.updateColor", passTemplate.keyDoc.foregroundColor);
		$(".rgb-background").trigger("colorpickersliders.updateColor", passTemplate.keyDoc.backgroundColor);

		//set bg gradiant color
		var bgColor = tinycolor(passTemplate.keyDoc.backgroundColor);

		d3.select(".pass-bg-lite").style("stop-color", bgColor.brighten(15).toRgbString());
		d3.select(".pass-bg").style("stop-color", bgColor.toRgbString());
		d3.select(".pass-bg-dark").style("stop-color", bgColor.darken(15).toRgbString());

		//set text color
		console.log(d3.select(".value-text").style("fill"));
		d3.selectAll(".value-text").style("fill", passTemplate.keyDoc.foregroundColor);
		d3.selectAll(".label-text").style("fill", passTemplate.keyDoc.labelColor);

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

	function maxFieldWidth(element) {
		/*
	var elemClass = element.attr('class').split(" ");
	var fieldType = elemClass[1]; //primaryFields

	switch (fieldType) {
		case undefined:

			return 315;

		case "primaryFields":

			return 315; //passwidth

		case "headerFields":

			passTemplate.
			return "auxiliaryFields";

		case "secondaryFields":
			return "end";

		case "auxiliaryFields":

			return "inherit";

		default:
			def;
	}
	*/
	}

	/***********************************************************
 
 
 	***********************************************************/
	function setPassImages() {

		//- if image is not in the passTemplate data 

		//- remove image from the svg template
		//- leave the group rectangle

		//- if image does exist in passTemplate data
		//- replace or add image to svg template

		var imageTypes = ["logo", "icon", "strip", "background", "footer", "thumbnail"];

		//diff contains what was in imageTypes[] that is not in passTemplate.images[]
		var diff = $(imageTypes).not(passTemplate.images).get();

		//remove all images from svg if they are part of the pass data
		for (var i = 0; i < diff.length; ++i) {
			var imageSelection = d3.select("g.img-btn-group #" + diff[i]);
			if (!imageSelection.empty()) { //remove it if its in the svg
				imageSelection.remove();
			}
		}

		if (passTemplate.images != null) {
			//add or replace images that exist in data
			for (var index = 0; index < passTemplate.images.length; ++index) {

				//select the image id. Example: g.img-btn-group #logo  
				var imageSelection = d3.select("g.img-btn-group #" + passTemplate.images[index].name);

				if (imageSelection.empty()) { //if group has no image, add image. svg images were removed above!

					//select th imageGroup specific to that image. Example: g.img-btn-group#logo-group
					var imageGroup = d3.select("g.img-btn-group#" + passTemplate.images[index].name + "-group")

					if (!imageGroup.empty()) { //image group exists

						var rectWidth = imageGroup.select('rect.img-btn-rect').attr('width');
						var rectHeight = imageGroup.select('rect.img-btn-rect').attr('height');
						var rectX = imageGroup.select('rect.img-btn-rect').attr('x');
						var rectY = imageGroup.select('rect.img-btn-rect').attr('y');

						imageGroup
							.insert('image', 'rect.img-btn-rect')
							.attr('id', passTemplate.images[index].name)
							.attr('xlink:href', passTemplate.images[index].image)
							.attr('width', rectWidth)
							.attr('height', rectHeight)
							.attr('x', rectX)
							.attr('y', rectY);

						imageGroup.select('rect.img-btn-rect').on("click", onImageRectClick); //add event to rect

					} else {
						//TODO: some cases group doesn't exist! (eg thumbnail)
					}

				} else { //replace image

					//this doesn't seem to happen, not sure when it should?
					imageSelection.attr('xlink:href', passTemplate.images[index].image);
					d3.select(imageSelection.parentNode + ' rect.img-btn-rect').on("click", onImageRectClick);
				}


			}
		}
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

			//TODO: create a currency lookup and formatting function
			fieldElement.text("$" + fieldGroup.value); //set value text as currency

		} else {

			fieldElement.text(fieldGroup.value); //set value text as plain text
		}

		//align text in field
		//fieldElement.style('text-anchor', pKValueToCSS(fieldGroup.textAlignment));

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
	function configColorSlider(sliderClass, changeClass) {

		var colorValue = $(changeClass).css("fill");

		$(sliderClass).ColorPickerSliders({
			flat: true,
			swatches: false,
			color: colorValue,
			order: {
				rgb: 1,
				preview: 2
			},
			onchange: function(container, color) {

				if (changeClass == ".pass-bg") { //adjust values gradiant in pass background

					d3.select(".pass-bg-lite").style("stop-color", color.tiny.brighten(15).toRgbString());
					d3.select(changeClass).style("stop-color", color.tiny.toRgbString());
					d3.select(".pass-bg-dark").style("stop-color", color.tiny.darken(15).toRgbString());

				} else { //adjust values of all the other classes
					d3.selectAll(changeClass).style("fill", color.tiny.toRgbString());
				}

			},
			labels: {
				rgbred: 'Red',
				rgbgreen: 'Green',
				rgbblue: 'Blue'
			}
		});
	}
	/***********************************************************
 
 
 	***********************************************************/
	function onColorSave() {

		var bgColor = $(".pass-bg").css("stop-color");
		var labelColor = $(".label-text").css("fill");
		var valueColor = $(".value-text").css("fill");

		//set colors in keyDoc
		passTemplate.keyDoc.foregroundColor = valueColor;
		passTemplate.keyDoc.labelColor = labelColor;
		passTemplate.keyDoc.backgroundColor = bgColor;

		/*
		var passData = {
			"id": passTemplate.id,
			"keyDoc": {
				"labelColor": labelColor,
				"foregroundColor": valueColor,
				"backgroundColor": bgColor
			}
		};

		postUpdate(passData);
		*/
	}

	/***********************************************************
 
 
 	***********************************************************/
	function onTextSubmit() {

		//e.preventDefault();
		//var btn = $(this);

		var fieldLabel = $("input#popLabel").val(); //get input box value
		var fieldValue = $("input#popValue").val();

		var keyValue = fieldLabel + groupType + groupIndex //dateaux1 (must be unique per pass)

		var fieldData = {
			"key": keyValue,
			"label": fieldLabel,
			"value": fieldValue
		};

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
 
 
 	***********************************************************/
	function onBarcodeSubmit() {

		console.log("onBarcode");
		d3.event.preventDefault();

		//get input box values
		var barData = $("#popData").val();
		var barEncode = $("#popEncode").val();
		var barAlt = $("#popAlt").val();

		passTemplate.keyDoc.barcode.message = barData;
		passTemplate.keyDoc.barcode.messageEncoding = barEncode;
		passTemplate.keyDoc.barcode.altText = barAlt;


	}

	/***********************************************************
 
 
 	***********************************************************/
	function onImageUpload() {

		console.log("onUpload");
		d3.event.preventDefault();

		if (checkImage()) {

			//get file object
			var file = $('#pop-image-input')[0].files[0];


			var img;
			var wURL = window.URL || window.webkitURL;
			img = new Image();
			var ratio = 0;
			img.onload = function() {

				var errorMessage = checkImageSize(currentEditTarget, this.width, this.height);

				if (errorMessage != "") {

					alertDisplay("error", errorMessage);

				} else { //--------------success

					// create reader
					var reader = new FileReader();
					reader.readAsDataURL(file); //data encoded url

					reader.onload = function(e) {

						var isReplace = false;
						for (var i = 0; i < passTemplate.images.length; i++) {
							if (passTemplate.images[i].name == currentEditTarget) {

								passTemplate.images[i].image = e.target.result;
								isReplace = true;
							}
						}

						//if the image is not found, add a new image to the array
						if (!isReplace) {

							var imageData = {
								image: e.target.result,
								name: currentEditTarget
							};

							passTemplate.images.push(imageData);
						}

						setPassImages();
						//postUpdate(passData);

					};
				}



			};

			img.src = wURL.createObjectURL(file);

		}

	}

	/***********************************************************
 
 
 	***********************************************************/
	function checkImage() {

		//check whether browser fully supports all File API
		if (window.File && window.FileReader && window.FileList && window.Blob) {

			if (!$('#pop-image-input').val()) //check empty input field
			{
				alertDisplay("error", 'no image selected');
				return false
			}

			var file = $('#pop-image-input')[0].files[0]; //get file
			var fsize = file.size; //get file size
			var ftype = file.type; // get file type


			//Allowed file size is less than 1 MB (1048576)
			if (fsize > 1048576) {

				alertDisplay("error", 'Image file should be less than 1MB!');
				return false
			}

			return true; //success

		} else {

			//Output error to older unsupported browsers that doesn't support HTML5 File API
			alertDisplay("error", 'Please upgrade your browser!');
			return false;
		}
	}

	/***********************************************************
 
 
 	***********************************************************/
	function checkImageSize(imageName, imageWidth, imageHeight) {

		var ratio = imageWidth / imageHeight;

		switch (imageName) {
			case "logo":

				if (imageWidth > 320 || imageHeight > 100) {
					return "Logo image should be 320px x 100px or less ";
				} else {
					return ""
				}

			case "icon":

				if (imageWidth > 152 || imageHeight > 152) {
					return "Icon image should be 152px x 152px or less ";
				} else {
					return ""
				}

			case "strip": //TODO: the are some variations based on passtype

				if (imageWidth > 640 || imageHeight > 246) {
					return "Strip image should be 640 x 246 or less ";
				} else {
					return ""
				}

			case "background":

				if (imageWidth > 360 || imageHeight > 440) {
					return "Background image should be 360px x 440px or less ";
				} else {
					return ""
				}

			case "footer":

				if (imageWidth > 572 || imageHeight > 30) {
					return "Footer image should be 572px x 30px or less ";
				} else {
					return ""
				}

			case "thumbnail":

				if (imageWidth > 180 || imageHeight > 180) {
					return "Thumbnail image should be 180px x 180px or less ";
				} else if (ratio > 1.5 || ratio < 0.67) { //thumbnail = 3/2 or 2/3 ratio
					return "Thumbnail aspect ratio should be 3:2 or 2:3. " + ratio;
				} else {
					return ""
				}

			default:
				return "Image file name invalid for pass type";
		}

	}
	/***********************************************************
 
 
 	***********************************************************/
	function postUpdate(jsonData) {

		//save pass data on server for each field update
		var jqxhr = $.post("/accounts/save", JSON.stringify(jsonData))
			.done(function() {

				alertDisplay("saved", "All changes have been successfully saved.");

			})
			.fail(function(jqXHR) {

				var error = jQuery.parseJSON(jqXHR.responseText); //parse json
				alertDisplay("error", error.error);

			})
			.always(function() {

			});
	}
	/***********************************************************
 
 
 	***********************************************************/
	function onTextRectClick() {

		//get the id of the text under the button
		currentEditTarget = d3.select(this).attr("data-target");
		targetGroupId = d3.select(this.parentNode).attr("id");
		var selectClassType = d3.select(this).attr("class");


		//update the legend in popover to display the id of the field
		d3.select("form#pop-text legend")
			.text(currentEditTarget);

		var targetLabel = d3.select("g#" + targetGroupId + " .label-text." + currentEditTarget).text();
		console.log(targetLabel);
		//set the input box attributes for the label
		d3.select("#popLabel")
			.on("input", null) //clear the event
		.property('value', targetLabel)
			.attr('disabled', null)
			.on("input", onTextSubmit); //add input event

		var targetValue = d3.select("g#" + targetGroupId + " .value-text." + currentEditTarget).text();
		//set the input box attributes for the value
		d3.select("#popValue")
			.on("input", null)
			.property('value', targetValue)
			.attr('disabled', null)
			.on("input", onTextSubmit); //add input event


		//add events for selecting value format selector options
		var valueSelect = d3.select("select#value-format")
			.on("input", null)
			.attr('disabled', null)
			.on("input", function() {

				//add/remove a second selector as needed
				if (this.value == "Number") {

					d3.select("#timeDate-format").style("display", "none");
					d3.select("#number-format").style("display", "inline");

				} else if (this.value == "Time" || this.value == "Date") {

					d3.select("#number-format").style("display", "none");
					d3.select("#timeDate-format").style("display", "inline");

				} else {

					d3.select("#timeDate-format").style("display", "none");
					d3.select("#number-format").style("display", "none");
				}

			});
	}
	/***********************************************************
 
 
 	***********************************************************/
	function onImageRectClick() {

		currentEditTarget = d3.select(this).attr("data-target");

		//update the legend in popover to display the id of the field
		d3.select("form#pop-image legend")
			.text(currentEditTarget + ".png Image");

		d3.select("#pop-image-input")
			.attr('disabled', null);

		d3.select("button#image-pop-btn")
			.on("click", null)
			.attr('disabled', null)
			.on("click", onImageUpload);

	}

	/***********************************************************
 
 
 	***********************************************************/
	function onBarcodeSelect() {

		switch (this.value) {
			case "PDF417":
				break;
			case "Aztec":
				break;
			case "QR":
				break;
			case "No Barcode":

				d3.select("g#barcode-group").style("display", "none");

			default:
				break;
		}

	}

	/***********************************************************
 
 
 	***********************************************************/
	function onNextPage(event) {
		$(".main").moveDown();
	}

	/***********************************************************
 
 
 	***********************************************************/
	function onSelectType(event) {

		console.log("selectpass");

		var id = $(event.target).attr('id');
		console.log(id);
		passType = id;

		var svgObj = d3.select("svg");
		if (!svgObj.empty()) {
			console.log("clear pass");
			passTemplate = null; //clear data
			d3.select("svg").remove();
		}

		var url = "/accounts/template/" + passType;
		var uri = encodeURI(url);
		console.log(uri);

		var jqxhr = $.getJSON(uri)
			.done(function(data) {

				console.log(data);
				passTemplate = data; //store json pass template object
				loadSVG(passType);
				$("a.next").show(); //show next arrow

			})
			.fail(function(jqXHR) {

				var error = jQuery.parseJSON(jqXHR.responseText); //parse json
				alertDisplay("error", error.error());

			})
			.always(function() {

			});
	}

	/***********************************************************
 
 
 	***********************************************************/
	function loadSVG(passType) {
		console.log("loadSVG");

		var url = "/assets/svg/" + passType + ".svg";
		var uri = encodeURI(url);
		console.log(uri);

		//load svg xml + place into document
		d3.xml(uri, function(xml) {

			d3.select("div.fake-content").node().appendChild(xml.documentElement);
			initNewPass(); //setup template pass

		});

	}
	/***********************************************************
 
 
 	***********************************************************/
	function alertDisplay(alertType, alertMessage) {

		//how long an alert is displayed
		var alertTimeout = 2500;
		var outHtml = '';
		var alertClass = 'alert-info';

		if (alertType == "error") {
			alertClass = 'alert-error'; //red
			outHtml = '<i class="fa fa-frown-o"></i></i><strong>&nbsp; Error! &nbsp;</strong>'; //error style
		} else if (alertType == "saved") {
			alertClass = 'alert-success'; //green
			outHtml = '<i class="fa fa-check-square-o"></i><strong>&nbsp; Saved! &nbsp;</strong>' //saved style
		}

		$(".alert")
			.attr('class', 'alert alert-dismissable ' + alertClass)
			.html(outHtml + alertMessage)
			.css('display', 'visible');

		setTimeout(function() {
			$(".alert").css('display', 'none');
		}, alertTimeout);
	}

	//////////////////////////////////////////////////////////////////////////
	//
	// Public Functions
	//
	//
	//////////////////////////////////////////////////////////////////////////

	/* Initialize the pass builder App */
	passBuilder.init = function() {
		init();
	};

	return passBuilder; //return the app object

}(passBuilder = window.passBuilder || {}, jQuery));

//seperate this out into a seperate file? 
console.log(passBuilder);
passBuilder.init();