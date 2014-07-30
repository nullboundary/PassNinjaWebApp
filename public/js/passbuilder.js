var pageBeforeIndex;
var pageAfterIndex;

$(function() {

	var w = 500;
	var h = 600;
	var currentEditTarget; //which text field is being edited
	var targetGroupId;
	var passTemplate; //a json object containing all the pass data for this pass



	//set a default tip
	tip = d3.tip().attr('class', 'd3-tip').offset([-8, 0]).html(function(d) {
		return d3.select('#tip-image').html();
	});

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

	var svg = d3.select("svg");
	//.attr('width', w)
	//.attr('height', h);

	svg.call(tip);

	//hover rect
	//svg.selectAll("rect")
	//	.on("mouseover", onRectOver)
	//	.on("mouseout", onRectOut)

	// click rect
	svg.selectAll("rect").on("click", onRectClick);

	//Click Text Popover Ok 
	$(document).on("click", "#text-pop-btn", onTextSubmit);

	//Click Text Popover Ok 
	$(document).on("click", "#bar-pop-btn", onBarcodeSubmit);

	//Click Image Popover Upload
	$(document).on("click", "#image-pop-btn", onImageUpload);

	//Esc key closes popover
	$(document).on("keyup", onBodyKeyUp);



});

/***********************************************************
 
 
 ***********************************************************/
function onBeforeScroll(index) {

	if (pageBeforeIndex != index) { //prevent handler being called twice per scroll.

		pageBeforeIndex = index;
		console.log("before " + index);
		closePopOver(); //remove popovers when you scroll to the next step

		if (index == 2) { //page 1 is get started

			getStartedSubmit();

		} else if (index == 3) { //page 2 is colors

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

		if (index == 3) { //set image popover


			tip.html(function(d) {
				return d3.select('#tip-image').html(); //loads html div from page
			});

		} else if (index == 4) { //set text input popover

			tip.html(function(d) {
				return d3.select('#tip-text').html(); //loads html div from page
			});
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
	var passType = "coupon"; //TODO: make selectable

	var url = "/accounts/template/" + passType + "/" + passId;
	var uri = encodeURI(url);
	console.log(uri);

	var jqxhr = $.getJSON(uri)
		.done(function(data) {

			console.log(data);
			passTemplate = data; //store json pass template object
			passTemplate.keyDoc.description = passDesc;
			passTemplate.keyDoc.organizationName = orgName;

			initNewPass();

		})
		.fail(function(jqXHR) {

			var error = jQuery.parseJSON(jqXHR.responseText); //parse json
			$("textarea#terms").html(error.error());

		})
		.always(function() {

		});
}

/***********************************************************
 
 
 ***********************************************************/
function initNewPass() {

	//passTemplate

	passType = "coupon";

	setPassImages();

	setPassFields(passTemplate.keyDoc[passType].primaryFields, "primary");
	setPassFields(passTemplate.keyDoc[passType].headerFields, "header"); //set header fields
	setPassFields(passTemplate.keyDoc[passType].secondaryFields, "second"); //set secondary fields
	setPassFields(passTemplate.keyDoc[passType].auxiliaryFields, "aux"); //set auxiliary fields 

	//keydoc top level
	$(".pass-template .logo-text").text(passTemplate.keyDoc.logoText);

	//set bg gradiant color
	var bgColor = tinycolor(passTemplate.keyDoc.backgroundColor);
	$(".pass-bg-lite").css("stop-color", bgColor.brighten(20).toRgbString());
	$(".pass-bg").css("stop-color", passTemplate.keyDoc.backgroundColor);
	$(".pass-bg-dark").css("stop-color", bgColor.darken(20).toRgbString());

	//set text color
	$(".pass-template .value-text").css("fill", passTemplate.keyDoc.foregroundColor);
	$(".pass-template .label-text").css("fill", passTemplate.keyDoc.labelColor);



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

		for (var index = 0; index < fieldArray.length; ++index) {

			var idIndex = index + 1; //id count starts at 1. 
			var groupId = 'g#' + fieldType + idIndex; //g#aux1
			var labelId = fieldType + 'Label' + idIndex; //auxLabel1
			var valueId = fieldType + 'Value' + idIndex; //auxValue1
			var fieldPKType = pkFieldType(fieldType); //auxiliaryFields


			var groupLoc = 'translate(0,0)';
			var textX = 0; //the relative position of the text inside the group
			var textY = 0;

			groupLoc = removeTextGroup(fieldType, idIndex);

			//Add pass group
			var passGroup = d3.select("g.pass-group")
				.append('g')
				.attr('transform', groupLoc + 'scale(1)')
				.attr('class', 'text-btn-group')
				.attr('id', fieldType + idIndex);

			//Add Label
			var textLabel = passGroup
				.insert('text', groupId + 'rect.text-btn-rect')
				//.insert('text', 'rect.aux1')
				.attr('id', labelId)
				.classed(JSON.parse('{ "label-text": true,"' + fieldPKType + '": true }')) //add classes label-text and fieldType
				.text(valueOrDefault(fieldArray[index].label)) //set label text
				.attr('text-anchor', pKValueToSVG(fieldArray[index].textAlignment)); //horizontal align

			//Set Label Height
			var labelFontSize = parseInt(textLabel.style('font-size'));
			textLabel.attr('x', textX)
				.attr('y', labelFontSize);


			//Add Value 
			var textValue = d3.select(groupId)
				.insert('text', groupId + 'rect.text-btn-rect')
				.attr('id', valueId)
				.classed(JSON.parse('{ "value-text": true,"' + fieldPKType + '": true }'))
				.attr('text-anchor', pKValueToSVG(fieldArray[index].textAlignment)); //horizontal align

			//Set Value Height
			var valueFontSize = parseInt(textValue.style('font-size'));
			textValue.attr('x', textX)
				.attr('y', labelFontSize + valueFontSize + 2);

			setFormatValueField(textValue, fieldArray[index]);

			//get group bounding box size
			var el = document.getElementById(fieldType + idIndex);
			var rectBBox = el.getBoundingClientRect();

			console.log(rectBBox.width + " " + rectBBox.height)

			//make rect for hovering - size of group element
			passGroup.append('rect')
				.attr('class', 'text-btn-rect')
				.attr('data-target', fieldPKType)
				.attr('width', rectBBox.width + textX)
				.attr('height', rectBBox.height)
				.on("click", onRectClick); //add event to new rect

		}
	}
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

	//remove all images from svg if they are not part of the pass data
	for (var i = 0; i < diff.length; ++i) {
		var imageSelection = d3.select("g.img-btn-group #" + diff[i]);
		if (!imageSelection.empty()) { //remove it if its in the svg
			imageSelection.remove();
		}
	}

	//add or replace images that exist in data
	for (var index = 0; index < passTemplate.images.length; ++index) {

		var imageSelection = d3.select("g.img-btn-group #" + passTemplate.images[index].name);

		if (imageSelection.empty()) { //add image

			var imageGroup = d3.select("g.img-btn-group#" + passTemplate.images[index].name + "-group")

			if (!imageGroup.empty()) {

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

			} else {
				//TODO: some cases group doesn't exist! (eg thumbnail)
			}

		} else { //replace image
			imageSelection.attr('src', passTemplate.images[index].image);
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

	//format and set date if value is a date example: 2013-04-24T10:00-05:00
	var dateFormat = pKDateTojsDate(fieldGroup.dateStyle);
	//format and set date if value is a date example: 2013-04-24T10:00-05:00
	var timeFormat = pKTimeTojsTime(fieldGroup.timeStyle);

	if (dateFormat != "") {
		fdate = new Date(fieldGroup.value);
		fieldElement.text(dateFormat(fdate)); //set value text as date
	} else if (timeFormat != "") {
		fdate = new Date(fieldGroup.value);
		fieldElement.text(timeFormat(fdate)); //set value text as time
	} else {
		fieldElement.text(fieldGroup.value); //set value text as plain text
	}

	//align text in field
	//fieldElement.style('text-anchor', pKValueToCSS(fieldGroup.textAlignment));

}



/***********************************************************
 	convert apple PK constant to css
 
 ***********************************************************/
function pKValueToSVG(val, def) {
	if (def == undefined) def = "inherit";

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
			def;
	}


}
/***********************************************************
 	convert apple PK constant to js date
 
 ***********************************************************/
function pKDateTojsDate(val, def) {

	if (def == undefined) def = "";

	switch (val) {
		case undefined:
			return "";
		case "PKDateStyleNone":
			return "";
		case "PKDateStyleShort":
			return d3.time.format("%_m/%e/%y");
		case "PKDateStyleMedium":
			return d3.time.format("%b %e, %Y");
		case "PKDateStyleLong":
			return d3.time.format("%B %e, %Y");
		case "PKDateStyleFull":
			return d3.time.format("%A, %B %e, %Y AD");
		default:
			def;
	}

}
/***********************************************************
 	convert apple PK constant to js time
 
 ***********************************************************/
function pKTimeTojsTime(val, def) {

	if (def == undefined) def = "";

	switch (val) {
		case undefined:
			return "";
		case "PKDateStyleNone":
			return "";
		case "PKDateStyleShort":
			return d3.time.format("%_I:%M %p");
		case "PKDateStyleMedium":
			return d3.time.format("%_I:%M:%S %p");
		case "PKDateStyleLong":
			return d3.time.format("%_I:%M:%S %p %Z"); //TODO - Implement time zones as text
		case "PKDateStyleFull":
			return d3.time.format("%_I:%M:%S %p %Z");
		default:
			def;
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
			//console.log(color);
			//console.log(tinycolor);


			if (changeClass == ".pass-bg") { //adjust values gradiant in pass background

				$(".pass-bg-lite").css("stop-color", color.tiny.brighten(20).toRgbString());
				$(changeClass).css("stop-color", color.tiny.toRgbString());
				$(".pass-bg-dark").css("stop-color", color.tiny.darken(15).toRgbString());

			} else {
				$(changeClass).css("fill", color.tiny.toRgbString());
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

	bgColor = $(".pass-bg").css("fill");
	labelColor = $(".label-text").css("fill");
	valueColor = $(".value-text").css("fill");



	var passData = {
		"id": "company.passTemplate",
		"keyDoc": {
			"labelColor": labelColor,
			"foregroundColor": valueColor,
			"backgroundColor": bgColor
		}
	};

	postUpdate(passData);
}

/***********************************************************
 
 
 ***********************************************************/
function onTextSubmit(e) {

	e.preventDefault();
	var btn = $(this);
	var fieldLabel = $(".d3-tip #popLabel").val(); //get input box value
	var fieldValue = $(".d3-tip #popValue").val();

	//remove popover
	closePopOver();

	//if (currentEditTarget == "auxiliaryFields") {

	var fieldData = {
		"label": fieldLabel,
		"value": fieldValue
	};

	var groupType = targetGroupId.slice(0, -1); //get the group type
	var groupIndex = targetGroupId.slice(-1) - 1; //get the group index value, & subtract 1

	passTemplate.keyDoc.coupon[currentEditTarget][groupIndex] = fieldData
	setPassFields(passTemplate.keyDoc.coupon[currentEditTarget], groupType);

	console.log(currentEditTarget);

	/*
	var passData = {
		"id": "company.passTemplate",
		"keyDoc": {
			"logoText": fieldValue
		}
	};

	postUpdate(passData);
*/
}

/***********************************************************
 
 
 ***********************************************************/
function onBarcodeSubmit(event) {

	console.log("onBarcode");
	event.preventDefault();

	//get input box values
	var barData = $(".d3-tip #popData").val();
	var barEncode = $(".d3-tip #popEncode").val();
	var barAlt = $(".d3-tip #popAlt").val();

	//remove popover
	closePopOver();

	passTemplate.keyDoc.barcode.message = barData;
	passTemplate.keyDoc.barcode.messageEncoding = barEncode;
	passTemplate.keyDoc.barcode.altText = barAlt;


}

/***********************************************************
 
 
 ***********************************************************/
function onImageUpload(event) {

	console.log("onUpload");
	event.preventDefault();

	//remove popover
	closePopOver();

	if (checkImage()) {

		//get file object
		var file = $('.d3-tip #pop-image-input')[0].files[0];


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
					//select and change the image of the selected field
					//d3.select("#" + currentEditTarget)
					//	.attr('xlink:href', e.target.result);
					/*
					var passData = {
						id: "company.passTemplate",
						images: [{
							image: e.target.result,
							name: currentEditTarget
						}]
					};
					*/
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

		if (!$('.d3-tip #pop-image-input').val()) //check empty input field
		{
			alertDisplay("error", 'no image selected');
			return false
		}

		var file = $('.d3-tip #pop-image-input')[0].files[0]; //get file
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
function onRectClick(event) {

	//get the id of the text under the button
	currentEditTarget = d3.select(this).attr("data-target");
	targetGroupId = d3.select(this.parentNode).attr("id");
	var selectClassType = d3.select(this).attr("class");

	console.log(currentEditTarget);
	//console.log(targetGroupId);
	console.log(selectClassType);


	//TEXT INPUT - only edit place holder if its a text box, not a image file input
	if (selectClassType == "text-btn-rect") {

		var target = d3.select(".label-text." + currentEditTarget).text();
		console.log(target);
		//set the input box attributes for the label
		d3.select("#popLabel")
			.attr('value', target);

		var target = d3.select(".value-text." + currentEditTarget).text();
		//set the input box attributes for the value
		d3.select("#popValue")
			.attr('value', target);

		//show the popover
		tip.attr('class', 'd3-tip animate').show(event);

		//update the legend in popover to display the id of the field
		d3.select(".d3-tip legend")
			.text(currentEditTarget);

		//IMAGE INPUT
	} else if (selectClassType == "img-btn-rect") {

		tip.html(function(d) {
			return d3.select('#tip-image').html(); //loads html div from page
		});

		//set fieldset image ratio warning
		d3.select(".d3-tip fieldset")
			.append("div")
			.style("color", "red")
			.text("Image type must be png with an aspect ratio of 3/2");

		//show the popover
		tip.attr('class', 'd3-tip animate').show(event);

		//update the legend in popover to display the id of the field
		d3.select(".d3-tip legend")
			.text(currentEditTarget + ".png Image");

		//BARCODE
	} else if (selectClassType == "bar-btn-rect") {

		tip.html(function(d) {
			return d3.select('#tip-bar').html(); //loads html div from page
		});

		//show the popover
		tip.attr('class', 'd3-tip animate').show(event);

	}



	//don't propagate this event to the new event handler below
	d3.event.stopPropagation()

	//assign a new event handler to handle when you click outside the popover. 
	$(document).on("click", "body", onBodyClick);

}

/***********************************************************
 
 
 ***********************************************************/
function onBodyClick(event) {

	if (event.isDefaultPrevented())
		return;

	var target = $(event.target);
	if (target.parents(".d3-tip").length)
		return;

	//remove click on body event since the popover is gone
	closePopOver();

}
/***********************************************************
 
 
 ***********************************************************/
function onBodyKeyUp(event) {

	if (event.isDefaultPrevented())
		return;

	if (event.keyCode != 27) // esc
		return;

	closePopOver();
	event.preventDefault();

}

/***********************************************************
 
 
 ***********************************************************/
function closePopOver() {
	console.log("closePopOver");
	$(document).off("click", "body", onBodyClick);
	tip.hide();
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

/***********************************************************
 
 
 ***********************************************************/
function buildPass() {

	var passData = {
		id: "company.passTemplate",
		images: [{
			image: e.target.result,
			name: currentEditTarget
		}],
		"keyDoc": {
			"logoText": fieldValue
		}
	};
}