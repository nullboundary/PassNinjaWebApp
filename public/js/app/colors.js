(function(passColors, $, undefined) {

	/***********************************************************
 
 
 	***********************************************************/
	function init() {

		//setup all color sliders
		configColorSlider(".rgb-label", ".label-text");
		configColorSlider(".rgb-value", ".value-text");
		configColorSlider(".rgb-background", ".pass-bg");
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
 
 	set color sliders to match keydoc
 	***********************************************************/
	function updateSliders() {

		$(".rgb-label").trigger("colorpickersliders.updateColor", passTemplate.keyDoc.labelColor);
		$(".rgb-value").trigger("colorpickersliders.updateColor", passTemplate.keyDoc.foregroundColor);
		$(".rgb-background").trigger("colorpickersliders.updateColor", passTemplate.keyDoc.backgroundColor);

	}

	/***********************************************************
 
 	set bg gradiant color of svg
 	***********************************************************/
	function updateBg() {

		//set bg gradiant color
		var bgColor = tinycolor(passTemplate.keyDoc.backgroundColor);

		d3.select(".pass-bg-lite").style("stop-color", bgColor.brighten(15).toRgbString());
		d3.select(".pass-bg").style("stop-color", bgColor.toRgbString());
		d3.select(".pass-bg-dark").style("stop-color", bgColor.darken(15).toRgbString());



	}

	/***********************************************************
 
 	set text color
 	***********************************************************/
	function updateText() {

		console.log(d3.select(".value-text").style("fill"));
		d3.selectAll(".value-text").style("fill", passTemplate.keyDoc.foregroundColor);
		d3.selectAll(".label-text").style("fill", passTemplate.keyDoc.labelColor);
	}


	/***********************************************************
 
 
 	***********************************************************/
	function updateRectStroke(selection) {

		//set rect stroke color
		var bgColor = tinycolor(passTemplate.keyDoc.backgroundColor);

		if (bgColor.isDark()) {
			d3.selectAll(selection).style("stroke", "#fff");
		} else {
			d3.selectAll(selection).style("stroke", "#000");

		}

		//d3.selectAll(selection).style("stroke", bgColor.complement().greyscale().toHexString());

	}

	function resetRectStroke() {

		//reset text rect stroke color
		d3.selectAll("rect.text-btn-rect").style("stroke", null);
		//reset image rect stroke color
		d3.selectAll("rect.img-btn-rect").style("stroke", null);
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

	//////////////////////////////////////////////////////////////////////////
	//
	// Public Functions
	//
	//
	//////////////////////////////////////////////////////////////////////////

	/* setup and configure color sliders */
	passColors.init = function() {
		init();
	};

	/* update sliders match pass colors */
	passColors.updateSliders = function() {
		updateSliders();
	};

	/* update background gradiant match pass json data */
	passColors.updateBg = function() {
		updateBg();
	};

	/* update text color match pass json data */
	passColors.updateText = function() {
		updateText();
	};

	passColors.updateRectStroke = function(selection) {
		updateRectStroke(selection);
	}

	passColors.resetRectStroke = function() {
		resetRectStroke();
	}

	/* save color data to server */
	passColors.save = function() {
		onColorSave();
	};

	return passColors; //return the image object

}(passColors = window.passColors || {}, jQuery));