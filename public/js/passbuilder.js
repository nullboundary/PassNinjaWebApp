$(function() {

	var w = 500;
	var h = 600;

	//set a default tip
	tip = d3.tip().attr('class', 'd3-tip').offset([-8, 0]).html(function(d) {
		return "<form class='pure-form'><legend>image</legend><fieldset><input id='popInput'></input><button class='pure-button' id='popBtn'>Ok</button></fieldset></form>";
	});

	var currentEditTarget; //which text field is being edited
	var passTemplate; //a json object containing all the pass data for this pass

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

	//Click Popover Ok 
	$(document).on("click", "#popBtn", onPopoverSubmit);

	//Click Image Popover Upload
	$(document).on("click", "#image-pop-btn", onImageUpload);

	//Esc key closes popover
	$(document).on("keyup", onBodyKeyUp);



});

/***********************************************************
 
 
 ***********************************************************/
function onBeforeScroll(index) {

	console.log(index);
	closePopOver(); //remove popovers when you scroll to the next step

	if (index == 2) { //page 1 is get started
		console.log(index);
		getStartedSubmit();

	} else if (index == 3) { //page 2 is colors
		console.log(index);
		onColorSave();
	}
}
/***********************************************************
 
 
 ***********************************************************/
function onAfterScroll(index) {

	if (index == 3) { //set image popover
		console.log(index);

		tip.html(function(d) {
			return "<form class='pure-form'><legend>image</legend><fieldset><input id='pop-image-input' type='file' accept='image/png'></input><button class='pure-button' id='image-pop-btn'>Upload</button></fieldset></form>";
		});

	} else if (index == 4) { //set text input popover
		console.log(index);
		tip.html(function(d) {
			return "<form class='pure-form'><legend>title</legend><fieldset><input id='popInput' type='text'></input><button class='pure-button' id='popBtn'>Ok</button></fieldset></form>";
		});
	}
}

/***********************************************************
 
 
 ***********************************************************/
function getStartedSubmit() {

	var orgName = $("#org-name").val();
	var passName = $("#pass-name").val();
	var passId = orgName + "." + passName;
	var passType = "coupon";

	url = "/accounts/template/" + passType + "/" + passId;

	console.log(url);

	var jqxhr = $.getJSON(url)
		.done(function(data) {

			console.log(data);
			passTemplate = data; //store json pass template object
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

	//images
	$(".pass-template .logo-text").text(passTemplate.images[0].image);


	//keydoc
	$(".pass-template .logo-text").text(passTemplate.keyDoc.logoText);

	$(".pass-template .pass-bg").css("fill", passTemplate.keyDoc.backgroundColor);
	$(".pass-template .value-text").css("fill", passTemplate.keyDoc.foregroundColor);
	$(".pass-template .label-text").css("fill", passTemplate.keyDoc.labelColor);


}


/***********************************************************
 
 
 ***********************************************************/
function configColorSlider(sliderClass, changeClass) {

	$(sliderClass).ColorPickerSliders({
		flat: true,
		swatches: false,
		order: {
			rgb: 1,
			preview: 2
		},
		onchange: function(container, color) {
			$(changeClass).css("fill", color.tiny.toRgbString())
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
function onPopoverSubmit(e) {

	e.preventDefault();
	var btn = $(this);
	var input = $(".d3-tip #popInput");
	var fieldValue = input.val();

	//remove popover
	closePopOver();

	//select and change the text of the selected field
	d3.select("#" + currentEditTarget)
	//.attr("class", "title")
	.text(fieldValue);

	var passData = {
		"id": "company.passTemplate",
		"keyDoc": {
			"logoText": fieldValue
		}
	};

	postUpdate(passData);

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
		var file = $('#pop-image-input')[0].files[0];


		var img;
		var wURL = window.URL || window.webkitURL;
		img = new Image();
		var ratio = 0;
		img.onload = function() {

			var ratio = this.width / this.height;

			if (ratio > 1.5 || ratio < 0.67) { //thumbnail = 3/2 or 2/3 ratio

				alertDisplay("error", "Aspect ratio should be 3:2 or 2:3. " + ratio);

			} else { //--------------success

				// create reader
				var reader = new FileReader();
				reader.readAsDataURL(file); //data encoded url

				reader.onload = function(e) {
					//select and change the image of the selected field
					d3.select("#" + currentEditTarget)
						.attr('xlink:href', e.target.result);

					var passData = {
						id: "company.passTemplate",
						images: [{
							image: e.target.result,
							name: currentEditTarget
						}]
					};

					postUpdate(passData);

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

		if (!$('#pop-image-input').val()) //check empty input filed
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

	//show the popover
	tip.attr('class', 'd3-tip animate').show(event)

	//update the legend in popover to display the id of the field
	d3.select(".d3-tip legend")
		.text(currentEditTarget);

	//only edit place holder if its a text box, not a file input
	if (d3.select("#popInput")) {

		var target = d3.select("#" + currentEditTarget).text();

		//set the input box attributes
		d3.select("#popInput")
			.attr('placeholder', target);
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