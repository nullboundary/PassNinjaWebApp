$(function() {

	tip = d3.tip().attr('class', 'd3-tip').offset([-8, 0]).html(function(d) {
		return "<form class='pure-form'><legend>title</legend><fieldset><input id='popInput'></input><button class='pure-button' id='popBtn'>Ok</button></fieldset></form>";
	});

	var w = 500;
	var h = 600;


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

	$(".main").onepage_scroll({
		sectionContainer: "section",
		//easing: "ease-in-out",
		//animationTime: 500,
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
	svg.selectAll("rect")
		.on("mouseover", onRectOver)
		.on("mouseout", onRectOut)

	// click rect
	svg.selectAll("rect").on("click", onRectClick);

	//Click Popover Ok 
	$(document).on("click", "#popBtn", onPopoverSubmit);

	//Esc key closes popover
	$(document).on("keyup", onBodyKeyUp);

});
/***********************************************************
 
 
 ***********************************************************/
function onPopoverSubmit(e) {

	//how long an alert is displayed
	var alertTimeout = 1000;

	e.preventDefault();
	var btn = $(this);
	var input = $(".d3-tip #popInput");
	var fieldValue = input.val();

	//remove popover
	$(document).off("click", "body", onBodyClick);
	tip.hide();

	//select and change the text of the selected field
	d3.select("#" + currentEditTarget)
	//.attr("class", "title")
	.text(fieldValue);

	//save pass data on server for each field update
	var jqxhr = $.post("/accounts/save", JSON.stringify({
			"id": "company.passTemplate",
			"keyDoc": {
				"logoText": fieldValue
			}
		}))
		.done(function() {
			$(".alert")
				.attr('class', 'alert alert-dismissable alert-success')
				.css('display', 'visible');
		})
		.fail(function() {
			$(".alert").attr('class', 'alert alert-dismissable alert-error')
				.css('display', 'visible');
		})
		.always(function() {

			setTimeout(function() {
				$(".alert").css('display', 'none');
			}, alertTimeout);
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
	$(document).off("click", "body", onBodyClick);
	tip.hide();

}
/***********************************************************
 
 
 ***********************************************************/
function onBodyKeyUp(event) {

	if (event.isDefaultPrevented())
		return;

	if (event.keyCode != 27) // esc
		return;

	$(document).off("click", "body", onBodyClick);
	tip.hide();
	event.preventDefault();

}