$(function() {

	var w = 500;
	var h = 600;

	//set a default tip
	tip = d3.tip().attr('class', 'd3-tip').offset([-8, 0]).html(function(d) {
		return "<form class='pure-form'><legend>image</legend><fieldset><input id='popInput'></input><button class='pure-button' id='popBtn'>Ok</button></fieldset></form>";
	});

	var currentEditTarget;

	$(".rgb").ColorPickerSliders({
		flat: true,
		swatches: false,
		order: {
			rgb: 1,
			opacity: 2
		},
		labels: {
			rgbred: 'Red',
			rgbgreen: 'Green',
			rgbblue: 'Blue'
		}
	});

	//setup one page scroll
	$(".main").onepage_scroll({
		sectionContainer: "section",
		updateURL: false,
		responsiveFallback: false,
		pagination: true,
		keyboard: true,
		direction: "vertical",
		loop: false
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

	//remove popovers when you scroll to the next step
	$(".main").onepage_scroll({
		beforeMove: function(index) {
			closePopOver();
		},
		afterMove: function(index) {
			if (index == 3) {
				console.log(index);
				tip.html(function(d) {
					return "<form class='pure-form'><legend>image</legend><fieldset><input id='pop-image-input' type='file' accept='image/png'></input><button class='pure-button' id='image-pop-btn'>Upload</button></fieldset></form>";
				});

			} else if (index == 4) {
				console.log(index);
				tip.html(function(d) {
					return "<form class='pure-form'><legend>title</legend><fieldset><input id='popInput' type='text'></input><button class='pure-button' id='popBtn'>Ok</button></fieldset></form>";
				});
			}


		}
	});


});
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

		var fsize = $('#pop-image-input')[0].files[0].size; //get file size
		var ftype = $('#pop-image-input')[0].files[0].type; // get file type

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
function onRectOut(event) {

	d3.select(this)
		.transition()
		.duration(125)
		.attr("stroke", "#fff");

}

/***********************************************************
 
 
 ***********************************************************/
function onRectOver(event) {

	d3.select(this)
		.style("cursor", "pointer")
		.transition()
		.duration(125)
		.attr("stroke", "red");

}

/***********************************************************
 
 
 ***********************************************************/
function onRectClick(event) {

	//get the id of the text under the button
	currentEditTarget = d3.select(this).attr("data-target");

	//show the popover
	tip.attr('class', 'd3-tip animate').show(event)

	//set the input box attributes
	d3.select("popInput")
		.attr('type', 'text')

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