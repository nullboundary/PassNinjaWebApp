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
		passColors.init();

		//setup barcode selection
		passBarcode.init();

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
		//$(document).on("click", "#bar-pop-btn", onBarcodeSubmit);

		//Select PassType
		$(document).on("click", ".pass-thumb-select", onSelectType);

		//Click Next Page Button
		$(document).on("click", "#next-button", onNextPage);



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

				passColors.save();
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

		passImages.set();

		passFields.set(passTemplate.keyDoc[passType].primaryFields, "primary");
		passFields.set(passTemplate.keyDoc[passType].headerFields, "header"); //set header fields
		passFields.set(passTemplate.keyDoc[passType].secondaryFields, "second"); //set secondary fields
		passFields.set(passTemplate.keyDoc[passType].auxiliaryFields, "aux"); //set auxiliary fields 

		//keydoc top level
		$("text.logo-text").text(passTemplate.keyDoc.logoText);

		//set color sliders to match keydoc
		passColors.updateSliders();

		//set bg gradiant color
		passColors.updateBg();

		//set text color
		passColors.updateText();

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
		$("div.spinner").show(); //show spinner

		var jqxhr = $.getJSON(uri)
			.done(function(data) {

				console.log(data);
				passTemplate = data; //store json pass template object
				loadSVG(passType);
				$("div.spinner").hide(); //show spinner
				$("#next-button").show(); //show next arrow

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

	passBuilder.alertDisplay = function(alertType, alertMessage) {
		alertDisplay(alertType, alertMessage);
	};

	return passBuilder; //return the app object

}(passBuilder = window.passBuilder || {}, jQuery));

//seperate this out into a seperate file? 
console.log(passBuilder);
passBuilder.init();